"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleBasedRateLimiter = exports.userSpecificRateLimiter = exports.createUserRateLimiter = exports.searchRateLimiter = exports.applicationRateLimiter = exports.accessRateLimiter = exports.uploadRateLimiter = exports.passwordResetRateLimiter = exports.authRateLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("../utils/logger");
// Default rate limiting configuration
const createRateLimiter = (options) => {
    return (0, express_rate_limit_1.default)({
        windowMs: options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        max: options.max || parseInt(process.env.RATE_LIMIT_MAX || '100'), // limit each IP to 100 requests per windowMs
        message: {
            success: false,
            message: options.message || 'Too many requests from this IP, please try again later',
            retryAfter: Math.ceil((options.windowMs || 900000) / 1000),
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        skipSuccessfulRequests: options.skipSuccessfulRequests || false,
        skipFailedRequests: options.skipFailedRequests || false,
        handler: (req, res) => {
            logger_1.logger.warn('Rate limit exceeded:', {
                ip: req.ip,
                method: req.method,
                url: req.originalUrl,
                userAgent: req.get('User-Agent'),
            });
            res.status(429).json({
                success: false,
                message: options.message || 'Too many requests from this IP, please try again later',
                retryAfter: Math.ceil((options.windowMs || 900000) / 1000),
            });
        },
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/health';
        },
    });
};
// General API rate limiter
exports.rateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
// Strict rate limiter for authentication endpoints
exports.authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 login attempts per windowMs
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true, // Don't count successful requests
});
// Rate limiter for password reset attempts
exports.passwordResetRateLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 password reset attempts per hour
    message: 'Too many password reset attempts, please try again later',
});
// Rate limiter for file uploads
exports.uploadRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 uploads per windowMs
    message: 'Too many file uploads, please try again later',
});
// Rate limiter for QR code scanning/access verification
exports.accessRateLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 access attempts per minute
    message: 'Too many access verification attempts, please try again later',
});
// Rate limiter for application submissions
exports.applicationRateLimiter = createRateLimiter({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // limit each IP to 5 applications per day
    message: 'Too many application submissions, please try again tomorrow',
});
// Rate limiter for search and listing endpoints
exports.searchRateLimiter = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 search requests per minute
    message: 'Too many search requests, please try again later',
});
// Create a user-specific rate limiter using Redis
const createUserRateLimiter = (keyGenerator, options) => {
    return (0, express_rate_limit_1.default)({
        ...options,
        keyGenerator,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger_1.logger.warn('User rate limit exceeded:', {
                key: keyGenerator(req),
                ip: req.ip,
                method: req.method,
                url: req.originalUrl,
                userAgent: req.get('User-Agent'),
            });
            res.status(429).json({
                success: false,
                message: options.message,
                retryAfter: Math.ceil(options.windowMs / 1000),
            });
        },
    });
};
exports.createUserRateLimiter = createUserRateLimiter;
// Rate limiter for specific users (requires authentication)
exports.userSpecificRateLimiter = (0, exports.createUserRateLimiter)((req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    return req.user?.id || req.ip;
}, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Higher limit for authenticated users
    message: 'Rate limit exceeded for your account, please try again later',
});
// Dynamic rate limiter based on user role
const roleBasedRateLimiter = (req, res, next) => {
    if (!req.user) {
        return (0, exports.rateLimiter)(req, res, next);
    }
    const userRole = req.user.role?.name;
    let maxRequests = 100;
    switch (userRole) {
        case 'super_admin':
            maxRequests = 1000;
            break;
        case 'school_admin':
            maxRequests = 500;
            break;
        case 'staff':
            maxRequests = 200;
            break;
        case 'student':
            maxRequests = 100;
            break;
        default:
            maxRequests = 50;
            break;
    }
    const dynamicLimiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: maxRequests,
        message: `Rate limit exceeded for ${userRole} role, please try again later`,
    });
    return dynamicLimiter(req, res, next);
};
exports.roleBasedRateLimiter = roleBasedRateLimiter;
// Export default rate limiter
exports.default = exports.rateLimiter;
//# sourceMappingURL=rateLimiter.js.map