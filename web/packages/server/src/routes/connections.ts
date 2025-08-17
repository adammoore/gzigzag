import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { graph } from '../database/neo4j';
import { getPool } from '../database/postgres';
import { logger } from '../utils/logger';
import { spaceCache } from '../database/redis';

const router = Router();

// Validation middleware
const validateConnection = [
  body('fromCellId').isUUID(),
  body('toCellId').isUUID(),
  body('dimension').isLength({ min: 1, max: 50 }).trim(),
  body('direction').optional().isIn(['positive', 'negative']),
];

const validateCellId = [
  param('cellId').isUUID(),
];

// Connect two cells
router.post('/connect', validateConnection, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user.id;
    const { fromCellId, toCellId, dimension, direction = 'positive' } = req.body;

    // Verify both cells exist and user has access
    const cellCheck = await getPool().query(
      `SELECT c.id, c.space_id, 
              (s.owner_id = $3 OR EXISTS(
                SELECT 1 FROM space_collaborators 
                WHERE space_id = s.id AND user_id = $3 AND role IN ('editor', 'admin')
              )) as can_write
       FROM cells c
       JOIN spaces s ON c.space_id = s.id
       WHERE c.id IN ($1, $2)`,
      [fromCellId, toCellId, userId]
    );

    if (cellCheck.rows.length !== 2) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'One or both cells not found',
      });
    }

    // Check if cells are in the same space
    const spaceIds = cellCheck.rows.map(row => row.space_id);
    if (spaceIds[0] !== spaceIds[1]) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cells must be in the same space',
      });
    }

    // Check write permission
    if (!cellCheck.rows[0].can_write) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have write access to this space',
      });
    }

    // Create connection in Neo4j
    await graph.connectCells(fromCellId, toCellId, dimension, direction);

    // Invalidate cache
    await spaceCache.invalidate(spaceIds[0]);

    logger.info(`Cells connected: ${fromCellId} -> ${toCellId} in dimension ${dimension}`);

    res.json({
      message: 'Cells connected successfully',
      connection: {
        from: fromCellId,
        to: toCellId,
        dimension,
        direction,
      },
    });
  } catch (error) {
    logger.error('Error connecting cells:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to connect cells',
    });
  }
});

// Disconnect two cells
router.delete('/disconnect', validateConnection, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user.id;
    const { fromCellId, toCellId, dimension } = req.body;

    // Verify cells and permissions (same as connect)
    const cellCheck = await getPool().query(
      `SELECT c.id, c.space_id, 
              (s.owner_id = $3 OR EXISTS(
                SELECT 1 FROM space_collaborators 
                WHERE space_id = s.id AND user_id = $3 AND role IN ('editor', 'admin')
              )) as can_write
       FROM cells c
       JOIN spaces s ON c.space_id = s.id
       WHERE c.id IN ($1, $2)`,
      [fromCellId, toCellId, userId]
    );

    if (cellCheck.rows.length !== 2) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'One or both cells not found',
      });
    }

    if (!cellCheck.rows[0].can_write) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have write access to this space',
      });
    }

    // Remove connection in Neo4j
    await graph.disconnectCells(fromCellId, toCellId, dimension);

    // Invalidate cache
    await spaceCache.invalidate(cellCheck.rows[0].space_id);

    logger.info(`Cells disconnected: ${fromCellId} -> ${toCellId} in dimension ${dimension}`);

    res.json({
      message: 'Cells disconnected successfully',
    });
  } catch (error) {
    logger.error('Error disconnecting cells:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to disconnect cells',
    });
  }
});

// Get connections for a cell
router.get('/cell/:cellId', validateCellId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = (req as any).user.id;
    const cellId = req.params.cellId;
    const dimension = req.query.dimension as string | undefined;

    // Verify cell exists and user has access
    const cellCheck = await getPool().query(
      `SELECT c.id, c.space_id, s.is_public,
              (s.owner_id = $2 OR EXISTS(
                SELECT 1 FROM space_collaborators 
                WHERE space_id = s.id AND user_id = $2
              )) as has_access
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

    const cell = cellCheck.rows[0];
    if (!cell.is_public && !cell.has_access) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this cell',
      });
    }

    // Get connections from Neo4j
    let connections;
    if (dimension) {
      connections = await graph.getCellConnections(cellId, dimension);
    } else {
      connections = await graph.getAllCellConnections(cellId);
    }

    res.json({
      cellId,
      connections,
      total: connections.length,
    });
  } catch (error) {
    logger.error('Error getting cell connections:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get cell connections',
    });
  }
});

// Traverse dimension from a starting cell
router.get('/traverse/:cellId', 
  [
    ...validateCellId,
    query('dimension').isLength({ min: 1, max: 50 }),
    query('direction').isIn(['positive', 'negative']),
    query('maxSteps').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const cellId = req.params.cellId;
      const dimension = req.query.dimension as string;
      const direction = req.query.direction as 'positive' | 'negative';
      const maxSteps = parseInt(req.query.maxSteps as string) || 10;

      // Verify access
      const cellCheck = await getPool().query(
        `SELECT c.id, c.space_id, s.is_public,
                (s.owner_id = $2 OR EXISTS(
                  SELECT 1 FROM space_collaborators 
                  WHERE space_id = s.id AND user_id = $2
                )) as has_access
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

      const cell = cellCheck.rows[0];
      if (!cell.is_public && !cell.has_access) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this cell',
        });
      }

      // Traverse dimension
      const path = await graph.traverseDimension(cellId, dimension, direction, maxSteps);

      // Get cell details for the path
      const cells = await getPool().query(
        'SELECT id, text_content, metadata FROM cells WHERE id = ANY($1)',
        [path]
      );

      // Order cells according to path
      const cellMap = new Map(cells.rows.map(c => [c.id, c]));
      const orderedCells = path.map(id => cellMap.get(id)).filter(Boolean);

      res.json({
        startCell: cellId,
        dimension,
        direction,
        path,
        cells: orderedCells,
        length: path.length,
      });
    } catch (error) {
      logger.error('Error traversing dimension:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to traverse dimension',
      });
    }
  }
);

// Find paths between two cells
router.get('/path', 
  [
    query('from').isUUID(),
    query('to').isUUID(),
    query('maxLength').optional().isInt({ min: 1, max: 10 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const fromCellId = req.query.from as string;
      const toCellId = req.query.to as string;
      const maxLength = parseInt(req.query.maxLength as string) || 5;

      // Verify both cells exist and user has access
      const cellCheck = await getPool().query(
        `SELECT c.id, c.space_id, s.is_public,
                (s.owner_id = $3 OR EXISTS(
                  SELECT 1 FROM space_collaborators 
                  WHERE space_id = s.id AND user_id = $3
                )) as has_access
         FROM cells c
         JOIN spaces s ON c.space_id = s.id
         WHERE c.id IN ($1, $2)`,
        [fromCellId, toCellId, userId]
      );

      if (cellCheck.rows.length !== 2) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'One or both cells not found',
        });
      }

      // Check if cells are in the same space
      const spaceIds = cellCheck.rows.map(row => row.space_id);
      if (spaceIds[0] !== spaceIds[1]) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Cells must be in the same space',
        });
      }

      // Check access
      const hasAccess = cellCheck.rows[0].is_public || cellCheck.rows[0].has_access;
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to these cells',
        });
      }

      // Find paths
      const paths = await graph.findPath(fromCellId, toCellId, maxLength);

      res.json({
        from: fromCellId,
        to: toCellId,
        paths,
        total: paths.length,
      });
    } catch (error) {
      logger.error('Error finding path:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to find path between cells',
      });
    }
  }
);

// Get dimension statistics for a space
router.get('/space/:spaceId/stats', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const spaceId = req.params.spaceId;

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

    // Get dimension statistics
    const stats = await graph.getDimensionStats(spaceId);

    res.json({
      spaceId,
      dimensions: stats,
      totalDimensions: stats.length,
    });
  } catch (error) {
    logger.error('Error getting dimension stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get dimension statistics',
    });
  }
});

export default router;