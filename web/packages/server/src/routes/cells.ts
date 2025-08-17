import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { queries, getPool, withTransaction } from '../database/postgres';
import { graph } from '../database/neo4j';
import { logger } from '../utils/logger';
import { spaceCache } from '../database/redis';

const router = Router();

// Validation middleware
const validateCellId = [
  param('id').isUUID(),
];

const validateCellUpdate = [
  body('content').optional().isString(),
  body('metadata').optional().isObject(),
];

// Get cell by ID
router.get('/:id', validateCellId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user.id;
    const cellId = req.params.id;

    // Get cell with access check
    const result = await getPool().query(
      `SELECT c.*, s.is_public,
              (s.owner_id = $2 OR EXISTS(
                SELECT 1 FROM space_collaborators 
                WHERE space_id = s.id AND user_id = $2
              )) as has_access
       FROM cells c
       JOIN spaces s ON c.space_id = s.id
       WHERE c.id = $1`,
      [cellId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Cell not found',
      });
    }

    const cell = result.rows[0];
    if (!cell.is_public && !cell.has_access) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this cell',
      });
    }

    // Get connections from Neo4j
    const connections = await graph.getAllCellConnections(cellId);

    res.json({
      id: cell.id,
      spaceId: cell.space_id,
      content: cell.text_content,
      metadata: cell.metadata,
      version: cell.version,
      connections,
      createdBy: cell.created_by,
      createdAt: cell.created_at,
      updatedAt: cell.updated_at,
    });
  } catch (error) {
    logger.error('Error getting cell:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get cell',
    });
  }
});

// Update cell
router.put('/:id', 
  [...validateCellId, ...validateCellUpdate],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const cellId = req.params.id;
      const { content, metadata } = req.body;

      // Check write access
      const accessCheck = await getPool().query(
        `SELECT c.*, 
                (s.owner_id = $2 OR EXISTS(
                  SELECT 1 FROM space_collaborators 
                  WHERE space_id = s.id AND user_id = $2 AND role IN ('editor', 'admin')
                )) as can_write
         FROM cells c
         JOIN spaces s ON c.space_id = s.id
         WHERE c.id = $1`,
        [cellId, userId]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Cell not found',
        });
      }

      if (!accessCheck.rows[0].can_write) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have write access to this cell',
        });
      }

      const cell = accessCheck.rows[0];
      let updatedCell;

      // Update cell in transaction
      await withTransaction(async (client) => {
        // Save to history
        await client.query(
          `INSERT INTO cell_history (cell_id, text_content, metadata, version, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [cellId, cell.text_content, cell.metadata, cell.version, userId]
        );

        // Update cell
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (content !== undefined) {
          updates.push(`text_content = $${paramCount++}`);
          values.push(content);
        }

        if (metadata !== undefined) {
          updates.push(`metadata = $${paramCount++}`);
          values.push(JSON.stringify(metadata));
        }

        updates.push(`version = version + 1`);
        updates.push(`updated_at = NOW()`);

        values.push(cellId);

        const updateQuery = `
          UPDATE cells 
          SET ${updates.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const result = await client.query(updateQuery, values);
        updatedCell = result.rows[0];
      });

      // Invalidate cache
      await spaceCache.invalidate(cell.space_id);

      logger.info(`Cell updated: ${cellId} by user ${userId}`);

      res.json({
        message: 'Cell updated successfully',
        cell: {
          id: updatedCell.id,
          content: updatedCell.text_content,
          metadata: updatedCell.metadata,
          version: updatedCell.version,
          updatedAt: updatedCell.updated_at,
        },
      });
    } catch (error) {
      logger.error('Error updating cell:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update cell',
      });
    }
  }
);

// Delete cell
router.delete('/:id', validateCellId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user.id;
    const cellId = req.params.id;

    // Check write access
    const accessCheck = await getPool().query(
      `SELECT c.space_id,
              (s.owner_id = $2 OR EXISTS(
                SELECT 1 FROM space_collaborators 
                WHERE space_id = s.id AND user_id = $2 AND role IN ('editor', 'admin')
              )) as can_write
       FROM cells c
       JOIN spaces s ON c.space_id = s.id
       WHERE c.id = $1`,
      [cellId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Cell not found',
      });
    }

    if (!accessCheck.rows[0].can_write) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have write access to this cell',
      });
    }

    const spaceId = accessCheck.rows[0].space_id;

    // Delete from Neo4j first (removes connections)
    await graph.deleteCellNode(cellId);

    // Delete from PostgreSQL (cascades to history)
    await getPool().query('DELETE FROM cells WHERE id = $1', [cellId]);

    // Invalidate cache
    await spaceCache.invalidate(spaceId);

    logger.info(`Cell deleted: ${cellId} by user ${userId}`);

    res.json({
      message: 'Cell deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting cell:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete cell',
    });
  }
});

// Duplicate cell
router.post('/:id/duplicate', validateCellId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user.id;
    const cellId = req.params.id;

    // Get original cell with access check
    const cellCheck = await getPool().query(
      `SELECT c.*, 
              (s.owner_id = $2 OR EXISTS(
                SELECT 1 FROM space_collaborators 
                WHERE space_id = s.id AND user_id = $2 AND role IN ('editor', 'admin')
              )) as can_write
       FROM cells c
       JOIN spaces s ON c.space_id = s.id
       WHERE c.id = $1`,
      [cellId, userId]
    );

    if (cellCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Cell not found',
      });
    }

    if (!cellCheck.rows[0].can_write) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have write access to this space',
      });
    }

    const originalCell = cellCheck.rows[0];
    const newCellId = uuidv4();

    // Create duplicate in PostgreSQL
    const newCell = await getPool().query(
      `INSERT INTO cells (id, space_id, text_content, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        newCellId,
        originalCell.space_id,
        originalCell.text_content,
        originalCell.metadata,
        userId,
      ]
    );

    // Clone connections in Neo4j
    await graph.cloneConnections(cellId, newCellId, originalCell.space_id);

    // Invalidate cache
    await spaceCache.invalidate(originalCell.space_id);

    logger.info(`Cell duplicated: ${cellId} -> ${newCellId} by user ${userId}`);

    res.status(201).json({
      message: 'Cell duplicated successfully',
      original: cellId,
      duplicate: {
        id: newCell.rows[0].id,
        content: newCell.rows[0].text_content,
        metadata: newCell.rows[0].metadata,
        createdAt: newCell.rows[0].created_at,
      },
    });
  } catch (error) {
    logger.error('Error duplicating cell:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to duplicate cell',
    });
  }
});

// Get cell history
router.get('/:id/history', validateCellId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user.id;
    const cellId = req.params.id;

    // Check access
    const accessCheck = await getPool().query(
      `SELECT c.id, s.is_public,
              (s.owner_id = $2 OR EXISTS(
                SELECT 1 FROM space_collaborators 
                WHERE space_id = s.id AND user_id = $2
              )) as has_access
       FROM cells c
       JOIN spaces s ON c.space_id = s.id
       WHERE c.id = $1`,
      [cellId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Cell not found',
      });
    }

    const cell = accessCheck.rows[0];
    if (!cell.is_public && !cell.has_access) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this cell',
      });
    }

    // Get history
    const history = await getPool().query(
      `SELECT h.*, u.username as changed_by_username
       FROM cell_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.cell_id = $1
       ORDER BY h.version DESC
       LIMIT 50`,
      [cellId]
    );

    res.json({
      cellId,
      history: history.rows.map(h => ({
        id: h.id,
        content: h.text_content,
        metadata: h.metadata,
        version: h.version,
        changedBy: h.changed_by_username,
        changedAt: h.changed_at,
      })),
      total: history.rows.length,
    });
  } catch (error) {
    logger.error('Error getting cell history:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get cell history',
    });
  }
});

// Restore cell to previous version
router.post('/:id/restore/:historyId', 
  [
    param('id').isUUID(),
    param('historyId').isUUID(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const cellId = req.params.id;
      const historyId = req.params.historyId;

      // Check write access
      const accessCheck = await getPool().query(
        `SELECT c.space_id,
                (s.owner_id = $2 OR EXISTS(
                  SELECT 1 FROM space_collaborators 
                  WHERE space_id = s.id AND user_id = $2 AND role IN ('editor', 'admin')
                )) as can_write
         FROM cells c
         JOIN spaces s ON c.space_id = s.id
         WHERE c.id = $1`,
        [cellId, userId]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Cell not found',
        });
      }

      if (!accessCheck.rows[0].can_write) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have write access to this cell',
        });
      }

      // Get history record
      const historyRecord = await getPool().query(
        'SELECT * FROM cell_history WHERE id = $1 AND cell_id = $2',
        [historyId, cellId]
      );

      if (historyRecord.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'History record not found',
        });
      }

      const history = historyRecord.rows[0];

      // Restore cell
      const restoredCell = await queries.updateCell(
        cellId,
        history.text_content,
        userId
      );

      // Update metadata if present
      if (history.metadata) {
        await getPool().query(
          'UPDATE cells SET metadata = $1 WHERE id = $2',
          [history.metadata, cellId]
        );
      }

      // Invalidate cache
      await spaceCache.invalidate(accessCheck.rows[0].space_id);

      logger.info(`Cell restored: ${cellId} to version ${history.version} by user ${userId}`);

      res.json({
        message: 'Cell restored successfully',
        cell: {
          id: restoredCell.id,
          content: restoredCell.text_content,
          metadata: history.metadata,
          version: restoredCell.version,
          restoredFrom: history.version,
        },
      });
    } catch (error) {
      logger.error('Error restoring cell:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to restore cell',
      });
    }
  }
);

export default router;