// Load environment variables first
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' }); // Load from root .env

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import Redis from 'ioredis';
import { createAuthRouter } from './routes/auth';
import { authenticateToken, AuthRequest } from './middleware/auth';
import { graph, initNeo4j } from './database/neo4j';

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Database connections - handle both URL and individual config
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  DB_HOST: process.env.DB_HOST || '[NOT SET]'
});

let pgPool: Pool;

if (process.env.DATABASE_URL) {
  console.log('PostgreSQL configured with DATABASE_URL');
  pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
} else if (process.env.DB_HOST) {
  console.log('PostgreSQL configured with individual settings');
  pgPool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'zigzag_db',
    user: process.env.DB_USER || 'zigzag_user',
    password: process.env.DB_PASSWORD
  });
} else if (process.env.NODE_ENV === 'development') {
  console.log('PostgreSQL configured for development');
  pgPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'zigzag_db',
    user: 'zigzag_user',
    password: 'zigzag_password'
  });
} else {
  console.error('❌ No PostgreSQL configuration found!');
  console.error('Expected DATABASE_URL or DB_HOST environment variable');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DB') || k.includes('DATABASE')));
  
  // Try to continue without database in case it's set later
  console.warn('⚠️ Starting without database - health checks will fail');
  pgPool = new Pool({
    host: 'nonexistent',
    port: 1,
    database: 'none',
    user: 'none',
    password: 'none',
    max: 0 // Don't create any connections
  });
}

// Neo4j connection - optional for production
let neo4jDriver: Driver | null = null;

try {
  if (process.env.NEO4J_URI && (process.env.NEO4J_USER || process.env.NEO4J_USERNAME) && process.env.NEO4J_PASSWORD) {
    const neo4jUser = process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j';
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(neo4jUser, process.env.NEO4J_PASSWORD)
    );
    console.log('Neo4j configured with provided credentials');
  } else if (process.env.NODE_ENV === 'development') {
    neo4jDriver = neo4j.driver(
      'bolt://localhost:7687',
      neo4j.auth.basic('neo4j', 'zigzag_password')
    );
    console.log('Neo4j configured for development');
  } else {
    console.warn('Neo4j not configured - graph features disabled');
  }
} catch (error) {
  console.warn('Neo4j initialization failed:', error);
  neo4jDriver = null;
}

// Redis connection - handle both URL and host/port config with error handling
let redis: Redis | null = null;

try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
    console.log('Redis configured with URL');
  } else if (process.env.REDIS_HOST) {
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    console.log('Redis configured with host/port');
  } else if (process.env.NODE_ENV === 'development') {
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    console.log('Redis configured for development');
  } else {
    console.warn('Redis not configured - caching disabled');
  }
  
  if (redis) {
    redis.on('error', (error) => {
      console.warn('Redis connection error:', error.message);
      console.warn('Continuing without Redis - caching disabled');
      redis = null;
    });
    
    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
  }
} catch (error) {
  console.warn('Redis initialization failed:', error);
  console.warn('Continuing without Redis - caching disabled');
  redis = null;
}

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'GzigZag API Server',
    version: '4.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      spaces: '/api/spaces/*',
      docs: 'https://github.com/adammoore/gzigzag'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      postgres: false,
      neo4j: false,
      redis: false
    }
  };

  try {
    await pgPool.query('SELECT 1');
    health.services.postgres = true;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
  }

  try {
    if (neo4jDriver) {
      const session = neo4jDriver.session();
      await session.run('RETURN 1');
      await session.close();
      health.services.neo4j = true;
    } else {
      // Neo4j is optional, mark as true if not configured
      health.services.neo4j = true;
    }
  } catch (error) {
    console.error('Neo4j health check failed:', error);
  }

  try {
    if (redis) {
      await redis.ping();
      health.services.redis = true;
    } else {
      // Redis is optional, mark as true if not configured
      health.services.redis = true;
    }
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  const allHealthy = Object.values(health.services).every(v => v);
  res.status(allHealthy ? 200 : 503).json(health);
});

// API Routes
app.use('/api/auth', createAuthRouter(pgPool));

// Spaces routes
app.get('/api/spaces', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await pgPool.query(
      'SELECT s.*, u.name as owner_name FROM spaces s JOIN users u ON s.owner_id = u.id WHERE s.owner_id = \$1 OR s.id IN (SELECT space_id FROM permissions WHERE user_id = \$1)',
      [req.user?.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    res.status(500).json({ error: 'Failed to fetch spaces' });
  }
});

app.post('/api/spaces', authenticateToken, async (req: AuthRequest, res) => {
  const { name, description } = req.body;
  
  try {
    const result = await pgPool.query(
      'INSERT INTO spaces (name, description, owner_id) VALUES (\$1, \$2, \$3) RETURNING *',
      [name, description, req.user?.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating space:', error);
    res.status(500).json({ error: 'Failed to create space' });
  }
});

// Sync space structure to Neo4j (open for all spaces - no auth required)
app.post('/api/spaces/:spaceId/sync-neo4j', async (req, res) => {
  const spaceId = req.params.spaceId;
  const { spaceData } = req.body;
  
  try {
    console.log(`Syncing space ${spaceId} to Neo4j Aura...`);

    // Sync to Neo4j Aura (your dedicated instance)
    await graph.syncSpaceToNeo4j(spaceId, spaceData);

    res.json({ 
      success: true, 
      message: 'Space synced to Neo4j Aura successfully',
      cellCount: Object.keys(spaceData.cells || {}).length,
      dimensionCount: (spaceData.dimensions || []).length,
      spaceId: spaceId
    });
  } catch (error) {
    console.error('Error syncing space to Neo4j:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to sync space to Neo4j', details: errorMessage });
  }
});

// Test endpoint to verify Neo4j data (no auth required for testing)
app.get('/api/neo4j-test/:spaceId', async (req, res) => {
  const spaceId = req.params.spaceId;
  
  try {
    const data = await graph.getSpaceVisualization(spaceId);
    res.json({
      spaceId,
      nodeCount: data.nodes?.length || 0,
      edgeCount: data.edges?.length || 0,
      nodes: data.nodes,
      edges: data.edges,
      metadata: data.metadata
    });
  } catch (error) {
    console.error('Error querying Neo4j:', error);
    res.status(500).json({ error: 'Failed to query Neo4j', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Set production space (replaces all data in Neo4j with single space)
app.post('/api/neo4j/set-production-space', async (req, res) => {
  const { spaceId, spaceData } = req.body;
  
  if (!spaceId || !spaceData) {
    return res.status(400).json({ error: 'Missing spaceId or spaceData' });
  }
  
  try {
    console.log(`Setting ${spaceId} as production space in Neo4j Aura (clearing all other data)...`);
    
    // Clear ALL data from Neo4j first
    await graph.clearAllData();
    console.log('✅ Cleared all existing Neo4j data');
    
    // Sync the new production space
    await graph.syncSpaceToNeo4j(spaceId, spaceData);
    console.log(`✅ ${spaceId} is now the sole production space in Neo4j Aura`);

    res.json({ 
      success: true, 
      message: `${spaceId} set as production space`,
      cellCount: Object.keys(spaceData.cells || {}).length,
      dimensionCount: (spaceData.dimensions || []).length,
      spaceId: spaceId
    });
  } catch (error) {
    console.error('Error setting production space:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to set production space', details: errorMessage });
  }
});

// Clear all Neo4j data
app.post('/api/neo4j/clear-all', async (req, res) => {
  try {
    await graph.clearAllData();
    res.json({ success: true, message: 'All Neo4j data cleared' });
  } catch (error) {
    console.error('Error clearing Neo4j data:', error);
    res.status(500).json({ error: 'Failed to clear Neo4j data' });
  }
});

// Get Neo4j visualization for a space
app.get('/api/spaces/:spaceId/neo4j-visualization', authenticateToken, async (req: AuthRequest, res) => {
  const spaceId = req.params.spaceId;
  
  try {
    // Verify user has access to this space
    const spaceResult = await pgPool.query(
      'SELECT * FROM spaces WHERE id = $1 AND (owner_id = $2 OR id IN (SELECT space_id FROM space_permissions WHERE user_id = $2))',
      [spaceId, req.user?.id]
    );

    if (spaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Space not found or access denied' });
    }

    // Get visualization data from Neo4j
    const visualization = await graph.getSpaceVisualization(spaceId);

    res.json(visualization);
  } catch (error) {
    console.error('Error getting Neo4j visualization:', error);
    res.status(500).json({ error: 'Failed to get Neo4j visualization' });
  }
});

// Export space as ZigZag format
app.get('/api/spaces/:spaceId/export', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Get space info
    const spaceResult = await pgPool.query(
      'SELECT * FROM spaces WHERE id = \$1 AND (owner_id = \$2 OR id IN (SELECT space_id FROM permissions WHERE user_id = \$2))',
      [req.params.spaceId, req.user?.id]
    );
    
    if (spaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Space not found or access denied' });
    }
    
    const space = spaceResult.rows[0];
    
    // Get all cells
    const cellsResult = await pgPool.query(
      'SELECT * FROM cells WHERE space_id = \$1',
      [req.params.spaceId]
    );
    
    // Get all connections
    const connectionsResult = await pgPool.query(
      'SELECT * FROM connections WHERE space_id = \$1',
      [req.params.spaceId]
    );
    
    // Format as ZigZag export
    const exportData = {
      name: space.name,
      cells: cellsResult.rows.map(cell => ({
        id: cell.id,
        text: cell.content || '',
        metadata: cell.metadata || {}
      })),
      connections: connectionsResult.rows.map(conn => ({
        from: conn.from_cell_id,
        to: conn.to_cell_id,
        dimension: conn.dimension || 'd.1',
        metadata: conn.metadata || {}
      })),
      dimensions: ['d.1', 'd.2', 'd.3'],
      homeCell: cellsResult.rows[0]?.id,
      timestamp: new Date().toISOString(),
      version: '4.0.0'
    };
    
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting space:', error);
    res.status(500).json({ error: 'Failed to export space' });
  }
});

// Cells routes
app.get('/api/spaces/:spaceId/cells', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await pgPool.query(
      'SELECT * FROM cells WHERE space_id = \$1',
      [req.params.spaceId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cells:', error);
    res.status(500).json({ error: 'Failed to fetch cells' });
  }
});

app.post('/api/spaces/:spaceId/cells', authenticateToken, async (req: AuthRequest, res) => {
  const { content, metadata, position } = req.body;
  
  try {
    const result = await pgPool.query(
      'INSERT INTO cells (space_id, content, metadata, position, created_by) VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING *',
      [req.params.spaceId, content, metadata || {}, position || {}, req.user?.id]
    );
    
    // Emit WebSocket event for real-time updates
    io.to(req.params.spaceId).emit('cell:created', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cell:', error);
    res.status(500).json({ error: 'Failed to create cell' });
  }
});

// Connections routes
app.get('/api/spaces/:spaceId/connections', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await pgPool.query(
      'SELECT * FROM connections WHERE space_id = \$1',
      [req.params.spaceId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

app.post('/api/spaces/:spaceId/connections', authenticateToken, async (req: AuthRequest, res) => {
  const { from_cell_id, to_cell_id, dimension, metadata } = req.body;
  
  try {
    const result = await pgPool.query(
      'INSERT INTO connections (space_id, from_cell_id, to_cell_id, dimension, metadata) VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING *',
      [req.params.spaceId, from_cell_id, to_cell_id, dimension, metadata || {}]
    );
    
    // Also store in Neo4j for graph operations (if available)
    if (neo4jDriver) {
      try {
        const session = neo4jDriver.session();
        await session.run(
          'MATCH (from:Cell {id: \$from_id}), (to:Cell {id: \$to_id}) CREATE (from)-[:CONNECTED {dimension: \$dimension}]->(to)',
          { from_id: from_cell_id, to_id: to_cell_id, dimension }
        );
        await session.close();
      } catch (error) {
        console.warn('Neo4j connection creation failed:', error);
      }
    }
    
    // Emit WebSocket event
    io.to(req.params.spaceId).emit('connection:created', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join:space', (spaceId: string) => {
    socket.join(spaceId);
    console.log('Socket', socket.id, 'joined space:', spaceId);
  });
  
  socket.on('leave:space', (spaceId: string) => {
    socket.leave(spaceId);
    console.log('Socket', socket.id, 'left space:', spaceId);
  });
  
  socket.on('cell:update', async (data) => {
    const { spaceId, cellId, content, metadata } = data;
    
    try {
      await pgPool.query(
        'UPDATE cells SET content = \$1, metadata = \$2 WHERE id = \$3 AND space_id = \$4',
        [content, metadata, cellId, spaceId]
      );
      
      socket.to(spaceId).emit('cell:updated', data);
    } catch (error) {
      console.error('Error updating cell:', error);
      socket.emit('error', { message: 'Failed to update cell' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, async () => {
  console.log('🚀 ZigZag server running on port', PORT);
  console.log('📝 Health check: http://localhost:' + PORT + '/health');
  
  // Initialize Neo4j connection
  try {
    await initNeo4j();
    console.log('✅ Neo4j initialization completed');
  } catch (error) {
    console.error('❌ Neo4j initialization failed:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pgPool.end();
  if (neo4jDriver) {
    await neo4jDriver.close();
  }
  if (redis) {
    redis.disconnect();
  }
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
