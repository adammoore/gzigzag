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

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Database connections
const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'zigzag_db',
  user: process.env.DB_USER || 'zigzag_user',
  password: process.env.DB_PASSWORD || 'zigzag_password'
});

const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'zigzag_password'
  )
);

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

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
    const session = neo4jDriver.session();
    await session.run('RETURN 1');
    await session.close();
    health.services.neo4j = true;
  } catch (error) {
    console.error('Neo4j health check failed:', error);
  }

  try {
    await redis.ping();
    health.services.redis = true;
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
    
    // Also store in Neo4j for graph operations
    const session = neo4jDriver.session();
    await session.run(
      'MATCH (from:Cell {id: \$from_id}), (to:Cell {id: \$to_id}) CREATE (from)-[:CONNECTED {dimension: \$dimension}]->(to)',
      { from_id: from_cell_id, to_id: to_cell_id, dimension }
    );
    await session.close();
    
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
httpServer.listen(PORT, () => {
  console.log('🚀 ZigZag server running on port', PORT);
  console.log('📝 Health check: http://localhost:' + PORT + '/health');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pgPool.end();
  await neo4jDriver.close();
  redis.disconnect();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
