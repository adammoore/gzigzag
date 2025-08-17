import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { initPostgres } from './database/postgres';
import { initNeo4j } from './database/neo4j';
import { initRedis } from './database/redis';

// Routes
import authRoutes from './routes/auth';
import spacesRoutes from './routes/spaces';
import cellsRoutes from './routes/cells';
import filesRoutes from './routes/files';
import connectionsRoutes from './routes/connections';

// WebSocket handlers
import { setupWebSocket } from './websocket/handler';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      imgSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [FRONTEND_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 auth attempts per 15 minutes
  skipSuccessfulRequests: true,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/spaces', authMiddleware, spacesRoutes);
app.use('/api/cells', authMiddleware, cellsRoutes);
app.use('/api/connections', authMiddleware, connectionsRoutes);
app.use('/api/files', authMiddleware, filesRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
  });
});

// Initialize databases and start server
async function startServer() {
  try {
    // Initialize database connections
    logger.info('Initializing database connections...');
    await initPostgres();
    await initNeo4j();
    await initRedis();
    
    // Setup WebSocket handling
    setupWebSocket(wss);
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 ZigZag Server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`🌐 Frontend URL: ${FRONTEND_URL}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close database connections
  const { closePostgres } = await import('./database/postgres');
  const { closeNeo4j } = await import('./database/neo4j');
  const { closeRedis } = await import('./database/redis');
  
  await Promise.all([
    closePostgres(),
    closeNeo4j(),
    closeRedis(),
  ]);
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();