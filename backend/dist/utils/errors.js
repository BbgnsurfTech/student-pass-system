"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorResponse = exports.isOperationalError = exports.createError = exports.GatewayTimeoutError = exports.ServiceUnavailableError = exports.BadGatewayError = exports.InternalServerError = exports.TooManyRequestsError = exports.UnprocessableEntityError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
        this.name = this.constructor.name;
    }
}
exports.AppError = AppError;
// Specific error classes for different scenarios
class ValidationError extends AppError {
    constructor(message = 'Validation failed') {
        super(message, 400);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409);
    }
}
exports.ConflictError = ConflictError;
class UnprocessableEntityError extends AppError {
    constructor(message = 'Unprocessable entity') {
        super(message, 422);
    }
}
exports.UnprocessableEntityError = UnprocessableEntityError;
class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429);
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500);
    }
}
exports.InternalServerError = InternalServerError;
class BadGatewayError extends AppError {
    constructor(message = 'Bad gateway') {
        super(message, 502);
    }
}
exports.BadGatewayError = BadGatewayError;
class ServiceUnavailableError extends AppError {
    constructor(message = 'Service unavailable') {
        super(message, 503);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
class GatewayTimeoutError extends AppError {
    constructor(message = 'Gateway timeout') {
        super(message, 504);
    }
}
exports.GatewayTimeoutError = GatewayTimeoutError;
// Error factory functions
exports.createError = {
    validation: (message) => new ValidationError(message),
    authentication: (message) => new AuthenticationError(message),
    authorization: (message) => new AuthorizationError(message),
    notFound: (message) => new NotFoundError(message),
    conflict: (message) => new ConflictError(message),
    unprocessableEntity: (message) => new UnprocessableEntityError(message),
    tooManyRequests: (message) => new TooManyRequestsError(message),
    internalServer: (message) => new InternalServerError(message),
    badGateway: (message) => new BadGatewayError(message),
    serviceUnavailable: (message) => new ServiceUnavailableError(message),
    gatewayTimeout: (message) => new GatewayTimeoutError(message),
};
// Type guard to check if error is operational
const isOperationalError = (error) => {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
};
exports.isOperationalError = isOperationalError;
// Create standardized error response
const createErrorResponse = (error, path, method) => {
    const response = {
        success: false,
        message: error.message,
        statusCode: error instanceof AppError ? error.statusCode : 500,
        timestamp: new Date().toISOString(),
        path,
        method,
    };
    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = error.stack;
    }
    return response;
};
exports.createErrorResponse = createErrorResponse;
//# sourceMappingURL=errors.js.map