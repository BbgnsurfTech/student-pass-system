"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTokenBlacklisted = exports.blacklistToken = exports.verifyRefreshToken = exports.generateRefreshToken = exports.generateToken = exports.requireAuth = exports.requireSameSchool = exports.requirePermission = exports.requireRole = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
const redis_1 = require("../config/redis");
const errors_1 = require("../utils/errors");
const cacheService = redis_1.CacheService.getInstance();
// JWT payload validation schema
const jwtPayloadSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    iat: zod_1.z.number(),
    exp: zod_1.z.number(),
});
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            throw new errors_1.AppError('Access token required', 401);
        }
        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new errors_1.AppError('JWT secret not configured', 500);
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errors_1.AppError('Token has expired', 401);
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errors_1.AppError('Invalid token', 401);
            }
            throw new errors_1.AppError('Token verification failed', 401);
        }
        // Validate JWT payload
        const validatedPayload = jwtPayloadSchema.parse(decoded);
        // Check if user exists in cache first
        const cacheKey = `user:${validatedPayload.userId}`;
        let user = await cacheService.get(cacheKey);
        if (!user) {
            // Fetch user from database with role and permissions
            user = await database_1.default.user.findUnique({
                where: { id: validatedPayload.userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    schoolId: true,
                    isActive: true,
                    role: {
                        select: {
                            id: true,
                            name: true,
                            permissions: {
                                select: {
                                    permission: {
                                        select: {
                                            name: true,
                                            resource: true,
                                            action: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            if (!user) {
                throw new errors_1.AppError('User not found', 401);
            }
            if (!user.isActive) {
                throw new errors_1.AppError('User account is inactive', 401);
            }
            // Cache user for 15 minutes
            await cacheService.set(cacheKey, user, 900);
        }
        // Attach user to request
        req.user = user;
        // Log authentication
        logger_1.logger.debug(`User ${user.email} authenticated successfully`);
        next();
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        else {
            logger_1.logger.error('Authentication error:', error);
            res.status(500).json({
                success: false,
                message: 'Authentication failed',
            });
        }
    }
};
exports.authenticateToken = authenticateToken;
// Optional auth middleware - doesn't throw error if no token
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            // If token exists, validate it
            await (0, exports.authenticateToken)(req, res, next);
        }
        else {
            // No token, continue without user
            next();
        }
    }
    catch (error) {
        // Log error but continue
        logger_1.logger.debug('Optional auth failed, continuing without user:', error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Role-based authorization
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new errors_1.AppError('Authentication required', 401);
            }
            const userRole = req.user.role?.name;
            if (!userRole || !allowedRoles.includes(userRole)) {
                throw new errors_1.AppError(`Access denied. Required roles: ${allowedRoles.join(', ')}`, 403);
            }
            next();
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Role authorization error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Authorization failed',
                });
            }
        }
    };
};
exports.requireRole = requireRole;
// Permission-based authorization
const requirePermission = (resource, action) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new errors_1.AppError('Authentication required', 401);
            }
            const userPermissions = req.user.role?.permissions || [];
            const hasPermission = userPermissions.some((rp) => rp.permission.resource === resource && rp.permission.action === action);
            if (!hasPermission) {
                throw new errors_1.AppError(`Access denied. Required permission: ${action} on ${resource}`, 403);
            }
            next();
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Permission authorization error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Authorization failed',
                });
            }
        }
    };
};
exports.requirePermission = requirePermission;
// School-based authorization (user can only access their school's data)
const requireSameSchool = (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError('Authentication required', 401);
        }
        // Super admin can access all schools
        if (req.user.role?.name === 'super_admin') {
            return next();
        }
        const userSchoolId = req.user.schoolId;
        if (!userSchoolId) {
            throw new errors_1.AppError('User is not associated with any school', 403);
        }
        // Check if the resource being accessed belongs to the same school
        const schoolIdFromParams = req.params.schoolId || req.body.schoolId || req.query.schoolId;
        if (schoolIdFromParams && schoolIdFromParams !== userSchoolId) {
            throw new errors_1.AppError('Access denied. You can only access your school data', 403);
        }
        next();
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        else {
            logger_1.logger.error('School authorization error:', error);
            res.status(500).json({
                success: false,
                message: 'Authorization failed',
            });
        }
    }
};
exports.requireSameSchool = requireSameSchool;
// Combine multiple auth middlewares
const requireAuth = (options = {}) => {
    return [
        exports.authenticateToken,
        ...(options.roles ? [(0, exports.requireRole)(options.roles)] : []),
        ...(options.permissions ? options.permissions.map(p => (0, exports.requirePermission)(p.resource, p.action)) : []),
        ...(options.sameSchool ? [exports.requireSameSchool] : []),
    ];
};
exports.requireAuth = requireAuth;
// Generate JWT token
const generateToken = (payload) => {
    const jwtSecret = process.env.JWT_SECRET;
    const expirationTime = process.env.JWT_EXPIRATION_TIME || '15m';
    if (!jwtSecret) {
        throw new errors_1.AppError('JWT secret not configured', 500);
    }
    return jsonwebtoken_1.default.sign(payload, jwtSecret, {
        expiresIn: expirationTime,
        issuer: 'student-pass-system',
        audience: 'student-pass-api',
    });
};
exports.generateToken = generateToken;
// Generate refresh token
const generateRefreshToken = (payload) => {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const expirationTime = process.env.JWT_REFRESH_EXPIRATION_TIME || '7d';
    if (!refreshSecret) {
        throw new errors_1.AppError('JWT refresh secret not configured', 500);
    }
    return jsonwebtoken_1.default.sign(payload, refreshSecret, {
        expiresIn: expirationTime,
        issuer: 'student-pass-system',
        audience: 'student-pass-api',
    });
};
exports.generateRefreshToken = generateRefreshToken;
// Verify refresh token
const verifyRefreshToken = (token) => {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
        throw new errors_1.AppError('JWT refresh secret not configured', 500);
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, refreshSecret);
        return jwtPayloadSchema.parse(decoded);
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new errors_1.AppError('Refresh token has expired', 401);
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new errors_1.AppError('Invalid refresh token', 401);
        }
        throw new errors_1.AppError('Refresh token verification failed', 401);
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
// Blacklist token (for logout)
const blacklistToken = async (token) => {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        if (decoded && decoded.exp) {
            const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
            if (remainingTime > 0) {
                await cacheService.set(`blacklist:${token}`, true, remainingTime);
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Error blacklisting token:', error);
    }
};
exports.blacklistToken = blacklistToken;
// Check if token is blacklisted
const isTokenBlacklisted = async (token) => {
    try {
        return await cacheService.exists(`blacklist:${token}`);
    }
    catch (error) {
        logger_1.logger.error('Error checking token blacklist:', error);
        return false;
    }
};
exports.isTokenBlacklisted = isTokenBlacklisted;
//# sourceMappingURL=auth.js.map