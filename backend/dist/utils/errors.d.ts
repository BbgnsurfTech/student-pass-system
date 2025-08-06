export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
export declare class ValidationError extends AppError {
    constructor(message?: string);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
export declare class UnprocessableEntityError extends AppError {
    constructor(message?: string);
}
export declare class TooManyRequestsError extends AppError {
    constructor(message?: string);
}
export declare class InternalServerError extends AppError {
    constructor(message?: string);
}
export declare class BadGatewayError extends AppError {
    constructor(message?: string);
}
export declare class ServiceUnavailableError extends AppError {
    constructor(message?: string);
}
export declare class GatewayTimeoutError extends AppError {
    constructor(message?: string);
}
export declare const createError: {
    validation: (message?: string) => ValidationError;
    authentication: (message?: string) => AuthenticationError;
    authorization: (message?: string) => AuthorizationError;
    notFound: (message?: string) => NotFoundError;
    conflict: (message?: string) => ConflictError;
    unprocessableEntity: (message?: string) => UnprocessableEntityError;
    tooManyRequests: (message?: string) => TooManyRequestsError;
    internalServer: (message?: string) => InternalServerError;
    badGateway: (message?: string) => BadGatewayError;
    serviceUnavailable: (message?: string) => ServiceUnavailableError;
    gatewayTimeout: (message?: string) => GatewayTimeoutError;
};
export declare const isOperationalError: (error: Error) => boolean;
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
export declare const createErrorResponse: (error: AppError | Error, path: string, method: string) => ErrorResponse;
//# sourceMappingURL=errors.d.ts.map