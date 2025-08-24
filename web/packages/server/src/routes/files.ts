import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getPool, withTransaction } from '../database/postgres';
import { graph } from '../database/neo4j';
import { logger } from '../utils/logger';
import { ZZSpace, Cell, GZZConnection } from '@zigzag/core';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept .gz, .json, and directory uploads
    const allowedExtensions = ['.gz', '.json', '.zigzag', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext) || file.mimetype === 'application/x-directory') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Accepted: .gz, .json, .zigzag, .txt'));
    }
  },
});

// Import ZigZag directory/file into a space
router.post('/import/:spaceId', 
  upload.single('file'),
  async (req, res) => {
    const userId = (req as any).user.id;
    const spaceId = req.params.spaceId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No file uploaded',
      });
    }

    try {
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
        await fs.unlink(file.path);
        return res.status(404).json({
          error: 'Not Found',
          message: 'Space not found',
        });
      }

      if (!accessCheck.rows[0].can_write) {
        await fs.unlink(file.path);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have write access to this space',
        });
      }

      // Create import job
      const jobId = uuidv4();
      await getPool().query(
        `INSERT INTO import_export_jobs (id, space_id, user_id, type, status, file_path, started_at)
         VALUES ($1, $2, $3, 'import', 'processing', $4, NOW())`,
        [jobId, spaceId, userId, file.path]
      );

      // Process the import asynchronously
      processImport(jobId, spaceId, file.path, userId).catch(error => {
        logger.error(`Import job ${jobId} failed:`, error);
      });

      res.status(202).json({
        message: 'Import started',
        jobId,
        status: 'processing',
      });
    } catch (error) {
      logger.error('Import error:', error);
      if (file) await fs.unlink(file.path).catch(() => {});
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to start import',
      });
    }
  }
);

// Export space to ZigZag format
router.get('/export/:spaceId', async (req, res) => {
  const userId = (req as any).user.id;
  const spaceId = req.params.spaceId;
  const format = req.query.format || 'json'; // json, zigzag, or gz

  try {
    // Check read access
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

    // Get space data
    const spaceData = await getPool().query(
      'SELECT * FROM spaces WHERE id = $1',
      [spaceId]
    );

    // Get cells
    const cells = await getPool().query(
      'SELECT * FROM cells WHERE space_id = $1 ORDER BY created_at',
      [spaceId]
    );

    // Get dimensions
    const dimensions = await getPool().query(
      'SELECT * FROM dimensions WHERE space_id = $1',
      [spaceId]
    );

    // Get connections from Neo4j
    const graphData = await graph.getSpaceGraph(spaceId);

    // Build export data
    const exportData = {
      version: '3.0.0',
      format: 'zigzag-web',
      exported_at: new Date().toISOString(),
      space: {
        id: spaceData.rows[0].id,
        name: spaceData.rows[0].name,
        description: spaceData.rows[0].description,
        settings: spaceData.rows[0].settings,
      },
      dimensions: dimensions.rows.map(dim => ({
        name: dim.name,
        color: dim.color,
        description: dim.description,
      })),
      cells: cells.rows.map(cell => ({
        id: cell.id,
        content: cell.text_content,
        metadata: cell.metadata,
        version: cell.version,
        connections: graphData[cell.id] || [],
      })),
    };

    // Format response based on requested format
    if (format === 'zigzag') {
      // Convert to original ZigZag format
      const zigzagFormat = await convertToZigZagFormat(exportData);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${spaceData.rows[0].name}.zigzag"`);
      res.send(zigzagFormat);
    } else if (format === 'gz') {
      // Compress JSON with gzip
      const zlib = await import('zlib');
      const jsonStr = JSON.stringify(exportData, null, 2);
      const compressed = await new Promise<Buffer>((resolve, reject) => {
        zlib.gzip(Buffer.from(jsonStr), (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="${spaceData.rows[0].name}.json.gz"`);
      res.send(compressed);
    } else {
      // Default JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${spaceData.rows[0].name}.json"`);
      res.json(exportData);
    }

    logger.info(`Space ${spaceId} exported by user ${userId}`);
  } catch (error) {
    logger.error('Export error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export space',
    });
  }
});

// Get import/export job status
router.get('/jobs/:jobId', async (req, res) => {
  const userId = (req as any).user.id;
  const jobId = req.params.jobId;

  try {
    const job = await getPool().query(
      `SELECT j.*, s.name as space_name
       FROM import_export_jobs j
       JOIN spaces s ON j.space_id = s.id
       WHERE j.id = $1 AND j.user_id = $2`,
      [jobId, userId]
    );

    if (job.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found',
      });
    }

    const jobData = job.rows[0];
    res.json({
      id: jobData.id,
      type: jobData.type,
      status: jobData.status,
      spaceName: jobData.space_name,
      errorMessage: jobData.error_message,
      startedAt: jobData.started_at,
      completedAt: jobData.completed_at,
      createdAt: jobData.created_at,
    });
  } catch (error) {
    logger.error('Get job status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get job status',
    });
  }
});

// Process import job (async)
async function processImport(
  jobId: string,
  spaceId: string,
  filePath: string,
  userId: string
): Promise<void> {
  try {
    // Read and parse file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    let data: any;

    try {
      // Try parsing as JSON
      data = JSON.parse(fileContent);
    } catch {
      // Try parsing as original ZigZag format
      data = await parseZigZagFormat(fileContent);
    }

    // Validate data structure
    if (!data.cells && !data.space) {
      throw new Error('Invalid file format: missing required fields');
    }

    // Clear existing data in transaction
    await withTransaction(async (client) => {
      // Get existing cells
      const existingCells = await client.query(
        'SELECT id FROM cells WHERE space_id = $1',
        [spaceId]
      );

      // Delete from Neo4j
      for (const cell of existingCells.rows) {
        await graph.deleteCellNode(cell.id);
      }

      // Delete from PostgreSQL
      await client.query('DELETE FROM cells WHERE space_id = $1', [spaceId]);
      await client.query('DELETE FROM dimensions WHERE space_id = $1', [spaceId]);

      // Import dimensions
      if (data.dimensions) {
        for (const dim of data.dimensions) {
          await client.query(
            'INSERT INTO dimensions (space_id, name, color, description) VALUES ($1, $2, $3, $4)',
            [spaceId, dim.name, dim.color, dim.description]
          );
        }
      }

      // Import cells
      const cellIdMap = new Map<string, string>(); // Old ID -> New ID mapping
      
      if (data.cells) {
        for (const cellData of data.cells) {
          const newCellId = uuidv4();
          cellIdMap.set(cellData.id || uuidv4(), newCellId);
          
          await client.query(
            `INSERT INTO cells (id, space_id, text_content, metadata, created_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [newCellId, spaceId, cellData.content || '', cellData.metadata || {}, userId]
          );

          // Create node in Neo4j
          await graph.createCellNode(newCellId, spaceId);
        }
      }

      // Import connections
      if (data.cells) {
        for (const cellData of data.cells) {
          if (cellData.connections) {
            const fromCellId = cellIdMap.get(cellData.id);
            if (!fromCellId) continue;

            for (const conn of cellData.connections) {
              const toCellId = cellIdMap.get(conn.id);
              if (!toCellId) continue;

              await graph.connectCells(
                fromCellId,
                toCellId,
                conn.dimension,
                conn.direction || 'positive'
              );
            }
          }
        }
      }
    });

    // Update job status
    await getPool().query(
      `UPDATE import_export_jobs 
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1`,
      [jobId]
    );

    // Clean up uploaded file
    await fs.unlink(filePath).catch(() => {});

    logger.info(`Import job ${jobId} completed successfully`);
  } catch (error: any) {
    logger.error(`Import job ${jobId} failed:`, error);

    // Update job status with error
    await getPool().query(
      `UPDATE import_export_jobs 
       SET status = 'failed', error_message = $1, completed_at = NOW()
       WHERE id = $2`,
      [error.message, jobId]
    );

    // Clean up uploaded file
    await fs.unlink(filePath).catch(() => {});
  }
}

// Convert export data to original ZigZag format
async function convertToZigZagFormat(exportData: any): Promise<Buffer> {
  // This would implement the original ZigZag file format
  // For now, return JSON as a buffer
  return Buffer.from(JSON.stringify(exportData, null, 2));
}

// Parse original ZigZag format
async function parseZigZagFormat(content: string): Promise<any> {
  // This would parse the original ZigZag file format
  // For now, try to parse as JSON
  try {
    return JSON.parse(content);
  } catch {
    // Fallback: create a basic structure
    return {
      cells: [{
        id: uuidv4(),
        content: content,
        metadata: {},
        connections: [],
      }],
      dimensions: [
        { name: 'd.1', color: '#ff0000' },
        { name: 'd.2', color: '#00ff00' },
        { name: 'd.3', color: '#0000ff' },
      ],
    };
  }
}

export default router;