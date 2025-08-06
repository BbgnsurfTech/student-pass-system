import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

interface ErrorResponse {
  success: false;
  message: string;
  errors?: any[];
  stack?: string;
  requestId?: string;
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId,
  });

  let statusCode = 500;
  let message = 'Internal server error';
  let errors: any[] | undefined;

  // Handle specific error types
  if (error instanceof AppError) {
    // Custom application errors
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof ZodError) {
    // Zod validation errors
    statusCode = 400;
    message = 'Validation error';
    errors = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Prisma database errors
    statusCode = 400;
    
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = (error.meta?.target as string[])?.join(', ') || 'field';
        message = `${field} already exists`;
        break;
      case 'P2025':
        // Record not found
        message = 'Record not found';
        statusCode = 404;
        break;
      case 'P2003':
        // Foreign key constraint violation
        message = 'Related record not found';
        break;
      case 'P2014':
        // Required relation missing
        message = 'Required relation is missing';
        break;
      case 'P2016':
        // Query interpretation error
        message = 'Query interpretation error';
        break;
      case 'P2021':
        // Table not found
        message = 'Table does not exist';
        statusCode = 500;
        break;
      case 'P2022':
        // Column not found
        message = 'Column does not exist';
        statusCode = 500;
        break;
      default:
        message = 'Database operation failed';
        break;
    }
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    // Unknown Prisma errors
    statusCode = 500;
    message = 'Database connection error';
  } else if (error instanceof Prisma.PrismaClientRustPanicError) {
    // Prisma engine panic
    statusCode = 500;
    message = 'Database engine error';
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    // Prisma initialization error
    statusCode = 500;
    message = 'Database initialization error';
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    // Prisma validation error
    statusCode = 400;
    message = 'Database query validation error';
  } else if (error instanceof MulterError) {
    // File upload errors
    statusCode = 400;
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      case 'MISSING_FIELD_NAME':
        message = 'Missing field name';
        break;
      default:
        message = 'File upload error';
        break;
    }
  } else if (error.name === 'JsonWebTokenError') {
    // JWT errors
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    // JWT expiration
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'NotBeforeError') {
    // JWT not active yet
    statusCode = 401;
    message = 'Token not active';
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    // JSON parsing errors
    statusCode = 400;
    message = 'Invalid JSON in request body';
  } else if (error.name === 'ValidationError') {
    // Express-validator errors
    statusCode = 400;
    message = 'Validation error';
  } else if (error.message.includes('ENOTFOUND')) {
    // Network errors
    statusCode = 502;
    message = 'External service unavailable';
  } else if (error.message.includes('ECONNREFUSED')) {
    // Connection refused
    statusCode = 503;
    message = 'Service temporarily unavailable';
  } else if (error.message.includes('timeout')) {
    // Timeout errors
    statusCode = 504;
    message = 'Request timeout';
  }

  const errorResponse: ErrorResponse = {
    success: false,
    message,
    requestId,
  };

  // Add validation errors if present
  if (errors) {
    errorResponse.errors = errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  // Set security headers for error responses
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  });

  res.status(statusCode).json(errorResponse);
};

// Handle 404 errors for unmatched routes
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404);
  next(error);
};

// Async error wrapper for route handlers
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global uncaught exception handler
export const handleUncaughtException = (error: Error): void => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  
  process.exit(1);
};

// Global unhandled rejection handler
export const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  logger.error('Unhandled Rejection:', {
    reason,
    promise: promise.toString(),
  });
  
  process.exit(1);
};

// Process warning handler
export const handleProcessWarning = (warning: any): void => {
  logger.warn('Process Warning:', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
  });
};

// Graceful shutdown handler
export const handleGracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Close database connections, stop servers, etc.
  process.exit(0);
};