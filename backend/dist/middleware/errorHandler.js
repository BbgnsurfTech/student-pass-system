"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGracefulShutdown = exports.handleProcessWarning = exports.handleUnhandledRejection = exports.handleUncaughtException = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const multer_1 = require("multer");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const errorHandler = (error, req, res, next) => {
    const requestId = req.headers['x-request-id'] || 'unknown';
    logger_1.logger.error('Error occurred:', {
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
    let errors;
    // Handle specific error types
    if (error instanceof errors_1.AppError) {
        // Custom application errors
        statusCode = error.statusCode;
        message = error.message;
    }
    else if (error instanceof zod_1.ZodError) {
        // Zod validation errors
        statusCode = 400;
        message = 'Validation error';
        errors = error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
        }));
    }
    else if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        // Prisma database errors
        statusCode = 400;
        switch (error.code) {
            case 'P2002':
                // Unique constraint violation
                const field = error.meta?.target?.join(', ') || 'field';
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
    }
    else if (error instanceof client_1.Prisma.PrismaClientUnknownRequestError) {
        // Unknown Prisma errors
        statusCode = 500;
        message = 'Database connection error';
    }
    else if (error instanceof client_1.Prisma.PrismaClientRustPanicError) {
        // Prisma engine panic
        statusCode = 500;
        message = 'Database engine error';
    }
    else if (error instanceof client_1.Prisma.PrismaClientInitializationError) {
        // Prisma initialization error
        statusCode = 500;
        message = 'Database initialization error';
    }
    else if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        // Prisma validation error
        statusCode = 400;
        message = 'Database query validation error';
    }
    else if (error instanceof multer_1.MulterError) {
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
    }
    else if (error.name === 'JsonWebTokenError') {
        // JWT errors
        statusCode = 401;
        message = 'Invalid token';
    }
    else if (error.name === 'TokenExpiredError') {
        // JWT expiration
        statusCode = 401;
        message = 'Token expired';
    }
    else if (error.name === 'NotBeforeError') {
        // JWT not active yet
        statusCode = 401;
        message = 'Token not active';
    }
    else if (error.name === 'SyntaxError' && 'body' in error) {
        // JSON parsing errors
        statusCode = 400;
        message = 'Invalid JSON in request body';
    }
    else if (error.name === 'ValidationError') {
        // Express-validator errors
        statusCode = 400;
        message = 'Validation error';
    }
    else if (error.message.includes('ENOTFOUND')) {
        // Network errors
        statusCode = 502;
        message = 'External service unavailable';
    }
    else if (error.message.includes('ECONNREFUSED')) {
        // Connection refused
        statusCode = 503;
        message = 'Service temporarily unavailable';
    }
    else if (error.message.includes('timeout')) {
        // Timeout errors
        statusCode = 504;
        message = 'Request timeout';
    }
    const errorResponse = {
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
exports.errorHandler = errorHandler;
// Handle 404 errors for unmatched routes
const notFoundHandler = (req, res, next) => {
    const error = new errors_1.AppError(`Route ${req.method} ${req.originalUrl} not found`, 404);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// Async error wrapper for route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Global uncaught exception handler
const handleUncaughtException = (error) => {
    logger_1.logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
};
exports.handleUncaughtException = handleUncaughtException;
// Global unhandled rejection handler
const handleUnhandledRejection = (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection:', {
        reason,
        promise: promise.toString(),
    });
    process.exit(1);
};
exports.handleUnhandledRejection = handleUnhandledRejection;
// Process warning handler
const handleProcessWarning = (warning) => {
    logger_1.logger.warn('Process Warning:', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
    });
};
exports.handleProcessWarning = handleProcessWarning;
// Graceful shutdown handler
const handleGracefulShutdown = (signal) => {
    logger_1.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    // Close database connections, stop servers, etc.
    process.exit(0);
};
exports.handleGracefulShutdown = handleGracefulShutdown;
//# sourceMappingURL=errorHandler.js.map