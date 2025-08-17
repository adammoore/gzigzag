import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { queries, getPool, withTransaction } from '../database/postgres';
import { graph } from '../database/neo4j';
import { logger } from '../utils/logger';
import { ZigZagSpace } from '@zigzag/core';

const router = Router();

// Validation middleware
const validateSpaceCreation = [
  body('name').isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().isLength({ max: 1000 }).trim(),
  body('isPublic').optional().isBoolean(),
];

const validateSpaceId = [
  param('id').isUUID(),
];

// List user's spaces
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const spaces = await queries.getSpacesByUser(userId);

    res.json({
      spaces: spaces.map(space => ({
        id: space.id,
        name: space.name,
        description: space.description,
        isPublic: space.is_public,
        isOwner: space.owner_id === userId,
        createdAt: space.created_at,
        updatedAt: space.updated_at,
      })),
      total: spaces.length,
    });
  } catch (error) {
    logger.error('Error listing spaces:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list spaces',
    });
  }
});

// Create new space
router.post('/', validateSpaceCreation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user.id;
    const { name, description, isPublic = false } = req.body;

    // Create space in PostgreSQL
    const space = await queries.createSpace(name, userId, description);

    // Update public setting if needed
    if (isPublic) {
      await getPool().query(
        'UPDATE spaces SET is_public = true WHERE id = $1',
        [space.id]
      );
    }

    // Create default dimensions
    const defaultDimensions = ['d.1', 'd.2', 'd.3'];
    for (const dim of defaultDimensions) {
      await getPool().query(
        'INSERT INTO dimensions (space_id, name) VALUES ($1, $2)',
        [space.id, dim]
      );
    }

    logger.info(`Space created: ${space.id} by user ${userId}`);

    res.status(201).json({
      message: 'Space created successfully',
      space: {
        id: space.id,
        name: space.name,
        description: space.description,
        isPublic: space.is_public,
        createdAt: space.created_at,
      },
    });
  } catch (error) {
    logger.error('Error creating space:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create space',
    });
  }
});

// Get space details
router.get('/:id', validateSpaceId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user.id;
    const spaceId = req.params.id;

    // Get space from database
    const result = await getPool().query(
      `SELECT s.*, 
              (s.owner_id = $2 OR EXISTS(
                SELECT 1 FROM space_collaborators 
                WHERE space_id = s.id AND user_id = $2
              )) as has_access
       FROM spaces s 
       WHERE s.id = $1`,
      [spaceId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Space not found',
      });
    }

    const space = result.rows[0];

    // Check access
    if (!space.is_public && !space.has_access) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this space',
      });
    }

    // Get cells
    const cells = await queries.getCellsBySpace(spaceId);

    // Get graph structure from Neo4j
    const graphData = await graph.getSpaceGraph(spaceId);

    // Get dimensions
    const dimensions = await getPool().query(
      'SELECT * FROM dimensions WHERE space_id = $1 ORDER BY name',
      [spaceId]
    );

    res.json({
      space: {
        id: space.id,
        name: space.name,
        description: space.description,
        isPublic: space.is_public,
        isOwner: space.owner_id === userId,
        settings: space.settings,
        createdAt: space.created_at,
        updatedAt: space.updated_at,
      },
      cells: cells.map(cell => ({
        id: cell.id,
        content: cell.text_content,
        metadata: cell.metadata,
        version: cell.version,
        createdAt: cell.created_at,
        updatedAt: cell.updated_at,
      })),
      connections: graphData,
      dimensions: dimensions.rows.map(dim => ({
        id: dim.id,
        name: dim.name,
        color: dim.color,
        description: dim.description,
      })),
    });
  } catch (error) {
    logger.error('Error getting space:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get space details',
    });
  }
});

// Update space
router.put('/:id', 
  [...validateSpaceId, ...validateSpaceCreation],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const spaceId = req.params.id;
      const { name, description, isPublic } = req.body;

      // Check ownership
      const ownerCheck = await getPool().query(
        'SELECT owner_id FROM spaces WHERE id = $1',
        [spaceId]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Space not found',
        });
      }

      if (ownerCheck.rows[0].owner_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only the owner can update this space',
        });
      }

      // Update space
      const result = await getPool().query(
        `UPDATE spaces 
         SET name = $1, description = $2, is_public = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [name, description, isPublic, spaceId]
      );

      logger.info(`Space updated: ${spaceId} by user ${userId}`);

      res.json({
        message: 'Space updated successfully',
        space: {
          id: result.rows[0].id,
          name: result.rows[0].name,
          description: result.rows[0].description,
          isPublic: result.rows[0].is_public,
          updatedAt: result.rows[0].updated_at,
        },
      });
    } catch (error) {
      logger.error('Error updating space:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update space',
      });
    }
  }
);

// Delete space
router.delete('/:id', validateSpaceId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user.id;
    const spaceId = req.params.id;

    // Check ownership
    const ownerCheck = await getPool().query(
      'SELECT owner_id FROM spaces WHERE id = $1',
      [spaceId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Space not found',
      });
    }

    if (ownerCheck.rows[0].owner_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the owner can delete this space',
      });
    }

    // Delete all cells from Neo4j first
    const cells = await queries.getCellsBySpace(spaceId);
    for (const cell of cells) {
      await graph.deleteCellNode(cell.id);
    }

    // Delete space from PostgreSQL (cascades to cells, dimensions, etc.)
    await getPool().query('DELETE FROM spaces WHERE id = $1', [spaceId]);

    logger.info(`Space deleted: ${spaceId} by user ${userId}`);

    res.json({
      message: 'Space deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting space:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete space',
    });
  }
});

// Get cells in a space
router.get('/:id/cells', validateSpaceId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user.id;
    const spaceId = req.params.id;

    // Check access
    const accessCheck = await getPool().query(
      `SELECT s.is_public,
              (s.owner_id = $2 OR EXISTS(
                SELECT 1 FROM space_collaborators 
                WHERE space_id = s.id AND user_id = $2
              )) as has_access
       FROM spaces s 
       WHERE s.id = $1`,
      [spaceId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Space not found',
      });
    }

    const space = accessCheck.rows[0];
    if (!space.is_public && !space.has_access) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this space',
      });
    }

    // Get cells with their connections
    const cells = await queries.getCellsBySpace(spaceId);
    const cellsWithConnections = await Promise.all(
      cells.map(async (cell) => {
        const connections = await graph.getAllCellConnections(cell.id);
        return {
          id: cell.id,
          content: cell.text_content,
          metadata: cell.metadata,
          version: cell.version,
          connections,
          createdAt: cell.created_at,
          updatedAt: cell.updated_at,
        };
      })
    );

    res.json({
      cells: cellsWithConnections,
      total: cellsWithConnections.length,
    });
  } catch (error) {
    logger.error('Error getting cells:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get cells',
    });
  }
});

// Create cell in space
router.post('/:id/cells',
  [
    ...validateSpaceId,
    body('content').optional().isString(),
    body('metadata').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const spaceId = req.params.id;
      const { content = '', metadata = {} } = req.body;

      // Check write access
      const accessCheck = await getPool().query(
        `SELECT s.owner_id = $2 OR EXISTS(
          SELECT 1 FROM space_collaborators 
          WHERE space_id = s.id AND user_id = $2 AND role IN ('editor', 'admin')
        ) as can_write
        FROM spaces s 
        WHERE s.id = $1`,
        [spaceId, userId]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Space not found',
        });
      }

      if (!accessCheck.rows[0].can_write) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have write access to this space',
        });
      }

      // Create cell in PostgreSQL
      const cell = await queries.createCell(spaceId, content, userId);

      // Update metadata if provided
      if (Object.keys(metadata).length > 0) {
        await getPool().query(
          'UPDATE cells SET metadata = $1 WHERE id = $2',
          [JSON.stringify(metadata), cell.id]
        );
      }

      // Create cell node in Neo4j
      await graph.createCellNode(cell.id, spaceId);

      logger.info(`Cell created: ${cell.id} in space ${spaceId}`);

      res.status(201).json({
        message: 'Cell created successfully',
        cell: {
          id: cell.id,
          content: cell.text_content,
          metadata: cell.metadata,
          version: cell.version,
          createdAt: cell.created_at,
        },
      });
    } catch (error) {
      logger.error('Error creating cell:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create cell',
      });
    }
  }
);

// Add collaborator to space
router.post('/:id/collaborators',
  [
    ...validateSpaceId,
    body('userId').isUUID(),
    body('role').isIn(['viewer', 'editor', 'admin']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const requesterId = (req as any).user.id;
      const spaceId = req.params.id;
      const { userId, role } = req.body;

      // Check ownership
      const ownerCheck = await getPool().query(
        'SELECT owner_id FROM spaces WHERE id = $1',
        [spaceId]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Space not found',
        });
      }

      if (ownerCheck.rows[0].owner_id !== requesterId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only the owner can add collaborators',
        });
      }

      // Add collaborator
      await getPool().query(
        `INSERT INTO space_collaborators (space_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (space_id, user_id) 
         DO UPDATE SET role = $3`,
        [spaceId, userId, role]
      );

      logger.info(`Collaborator added: ${userId} to space ${spaceId} with role ${role}`);

      res.json({
        message: 'Collaborator added successfully',
      });
    } catch (error) {
      logger.error('Error adding collaborator:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to add collaborator',
      });
    }
  }
);

export default router;