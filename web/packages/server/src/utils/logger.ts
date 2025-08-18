import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      )
    })
  ]
});

export { logger };
export const logInfo = (msg: string, meta?: any) => logger.info(msg, meta);
export const logError = (msg: string, error: any, meta?: any) => {
  logger.error(msg, { error: error?.message || error, stack: error?.stack, ...meta });
};
export const logWarn = (msg: string, meta?: any) => logger.warn(msg, meta);
export const logDebug = (msg: string, meta?: any) => logger.debug(msg, meta);
