export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
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

// Specific error classes for different scenarios
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string = 'Unprocessable entity') {
    super(message, 422);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
  }
}

export class BadGatewayError extends AppError {
  constructor(message: string = 'Bad gateway') {
    super(message, 502);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable') {
    super(message, 503);
  }
}

export class GatewayTimeoutError extends AppError {
  constructor(message: string = 'Gateway timeout') {
    super(message, 504);
  }
}

// Error factory functions
export const createError = {
  validation: (message?: string) => new ValidationError(message),
  authentication: (message?: string) => new AuthenticationError(message),
  authorization: (message?: string) => new AuthorizationError(message),
  notFound: (message?: string) => new NotFoundError(message),
  conflict: (message?: string) => new ConflictError(message),
  unprocessableEntity: (message?: string) => new UnprocessableEntityError(message),
  tooManyRequests: (message?: string) => new TooManyRequestsError(message),
  internalServer: (message?: string) => new InternalServerError(message),
  badGateway: (message?: string) => new BadGatewayError(message),
  serviceUnavailable: (message?: string) => new ServiceUnavailableError(message),
  gatewayTimeout: (message?: string) => new GatewayTimeoutError(message),
};

// Type guard to check if error is operational
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

// Error response interface
export interface ErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  errors?: any[];
  stack?: string;
  timestamp: string;
  path: string;
  method: string;
}

// Create standardized error response
export const createErrorResponse = (
  error: AppError | Error,
  path: string,
  method: string
): ErrorResponse => {
  const response: ErrorResponse = {
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