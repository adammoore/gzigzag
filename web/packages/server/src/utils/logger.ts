import winston from 'winston';
import path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logs directory
const logsDir = path.join(process.cwd(), 'logs');

// Define transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
    level: isDevelopment ? 'debug' : 'info',
  }),
];

// Add file transports in production
if (isProduction) {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  levels,
  transports,
  exitOnError: false,
});

// Add stream for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logError = (message: string, error: Error, meta?: any) => {
  logger.error(message, {
    error: error.message,
    stack: error.stack,
    ...meta,
  });
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: any) => {
  logger.http(message, meta);
};

// Performance logging
export const logPerformance = (operation: string, duration: number, meta?: any) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger[level](`Performance: ${operation} took ${duration}ms`, {
    operation,
    duration,
    ...meta,
  });
};

// Database query logging
export const logQuery = (query: string, duration: number, params?: any[]) => {
  if (isDevelopment) {
    logger.debug(`Database query (${duration}ms)`, {
      query: query.substring(0, 500), // Truncate long queries
      duration,
      params: params?.slice(0, 10), // Limit params logged
    });
  } else if (duration > 1000) {
    logger.warn(`Slow query detected (${duration}ms)`, {
      query: query.substring(0, 200),
      duration,
    });
  }
};

// Request logging
export const logRequest = (req: any, res: any, duration: number) => {
  const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
  
  const meta = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  };

  if (res.statusCode >= 500) {
    logger.error(message, meta);
  } else if (res.statusCode >= 400) {
    logger.warn(message, meta);
  } else {
    logger.http(message, meta);
  }
};

// Audit logging for important actions
export const auditLog = (action: string, userId: string, details: any) => {
  logger.info(`AUDIT: ${action}`, {
    action,
    userId,
    timestamp: new Date().toISOString(),
    details,
  });
};

// Security event logging
export const securityLog = (event: string, details: any) => {
  logger.warn(`SECURITY: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// Export winston for advanced use cases
export default logger;