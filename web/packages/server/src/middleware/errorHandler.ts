import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  logger.error('Error handler caught:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: (req as any).user?.id,
  });

  // Default to 500 if no status code
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Prepare error response
  const errorResponse: any = {
    error: getErrorType(statusCode),
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Add details in development
  if (!isProduction) {
    errorResponse.stack = err.stack;
    errorResponse.code = err.code;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.error = 'Validation Error';
    errorResponse.details = parseValidationErrors(err);
    res.status(400).json(errorResponse);
    return;
  }

  if (err.name === 'CastError') {
    errorResponse.error = 'Invalid ID';
    errorResponse.message = 'The provided ID is invalid';
    res.status(400).json(errorResponse);
    return;
  }

  if (err.code === '23505') {
    // PostgreSQL unique violation
    errorResponse.error = 'Duplicate Entry';
    errorResponse.message = 'A resource with this value already exists';
    res.status(409).json(errorResponse);
    return;
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    errorResponse.error = 'Reference Error';
    errorResponse.message = 'Referenced resource does not exist';
    res.status(400).json(errorResponse);
    return;
  }

  if (err.code === '23502') {
    // PostgreSQL not null violation
    errorResponse.error = 'Missing Required Field';
    errorResponse.message = 'A required field is missing';
    res.status(400).json(errorResponse);
    return;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

function getErrorType(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 429:
      return 'Too Many Requests';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    default:
      return 'Error';
  }
}

function parseValidationErrors(err: any): any[] {
  if (!err.errors) return [];
  
  return Object.keys(err.errors).map(field => ({
    field,
    message: err.errors[field].message,
    value: err.errors[field].value,
  }));
}

// Async error wrapper for route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Create custom error
export function createError(statusCode: number, message: string, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  error.code = code;
  return error;
}

// Not found handler (404)
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
}

// Request validation error formatter
export function validationErrorFormatter(errors: any[]): AppError {
  const message = errors
    .map(err => `${err.param}: ${err.msg}`)
    .join(', ');
  
  const error = createError(400, message);
  (error as any).validation = errors;
  return error;
}