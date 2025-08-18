import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000'], credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import database connections
import('./database/postgres').then(({ initPostgres }) => initPostgres()).catch(console.error);
import('./database/neo4j').then(({ initNeo4j }) => initNeo4j()).catch(console.error);
import('./database/redis').then(({ initRedis }) => initRedis()).catch(console.error);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', environment: NODE_ENV, timestamp: new Date().toISOString() });
});

// Basic API info
app.get('/api', (req, res) => {
  res.json({
    message: 'ZigZag API',
    version: '1.0.0',
    endpoints: ['/health', '/api/auth', '/api/spaces', '/api/cells']
  });
});

// Import routes (after they exist)
setTimeout(() => {
  import('./routes/auth').then(module => app.use('/api/auth', module.default)).catch(() => {});
  import('./routes/spaces').then(module => app.use('/api/spaces', module.default)).catch(() => {});
  import('./routes/cells').then(module => app.use('/api/cells', module.default)).catch(() => {});
}, 1000);

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 ZigZag Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
});

// WebSocket handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    ws.send(JSON.stringify({ type: 'echo', data: message.toString() }));
  });
  ws.on('close', () => console.log('WebSocket client disconnected'));
});
