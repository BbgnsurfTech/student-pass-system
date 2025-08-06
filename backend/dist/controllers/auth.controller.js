"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const auth_1 = require("../middleware/auth");
const redis_1 = require("../config/redis");
const cacheService = redis_1.CacheService.getInstance();
// Validation schemas
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    roleId: zod_1.z.string().uuid('Invalid role ID').optional(),
    schoolId: zod_1.z.string().uuid('Invalid school ID').optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
const forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
});
const resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z.string().min(8, 'New password must be at least 8 characters'),
});
const updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'First name is required').optional(),
    lastName: zod_1.z.string().min(1, 'Last name is required').optional(),
});
class AuthController {
    async register(req, res) {
        try {
            const validatedData = registerSchema.parse(req.body);
            // Check if user already exists
            const existingUser = await database_1.default.user.findUnique({
                where: { email: validatedData.email },
            });
            if (existingUser) {
                throw new errors_1.AppError('User with this email already exists', 409);
            }
            // Hash password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
            const passwordHash = await bcryptjs_1.default.hash(validatedData.password, saltRounds);
            // Get default role if not provided
            let roleId = validatedData.roleId;
            if (!roleId) {
                const defaultRole = await database_1.default.role.findFirst({
                    where: { name: 'student' },
                });
                roleId = defaultRole?.id;
            }
            // Create user
            const user = await database_1.default.user.create({
                data: {
                    email: validatedData.email,
                    passwordHash,
                    firstName: validatedData.firstName,
                    lastName: validatedData.lastName,
                    roleId,
                    schoolId: validatedData.schoolId,
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                    createdAt: true,
                    role: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    school: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            // Generate tokens
            const accessToken = (0, auth_1.generateToken)({ userId: user.id, email: user.email });
            const refreshToken = (0, auth_1.generateRefreshToken)({ userId: user.id, email: user.email });
            logger_1.logger.info(`User registered successfully: ${user.email}`);
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user,
                    tokens: {
                        accessToken,
                        refreshToken,
                    },
                },
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            else if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Registration error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Registration failed',
                });
            }
        }
    }
    async login(req, res) {
        try {
            const validatedData = loginSchema.parse(req.body);
            // Find user with role and permissions
            const user = await database_1.default.user.findUnique({
                where: { email: validatedData.email },
                select: {
                    id: true,
                    email: true,
                    passwordHash: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                    lastLoginAt: true,
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
                    school: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            if (!user) {
                throw new errors_1.AppError('Invalid email or password', 401);
            }
            if (!user.isActive) {
                throw new errors_1.AppError('Account is inactive', 401);
            }
            // Verify password
            const isPasswordValid = await bcryptjs_1.default.compare(validatedData.password, user.passwordHash);
            if (!isPasswordValid) {
                throw new errors_1.AppError('Invalid email or password', 401);
            }
            // Update last login
            await database_1.default.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            });
            // Generate tokens
            const accessToken = (0, auth_1.generateToken)({ userId: user.id, email: user.email });
            const refreshToken = (0, auth_1.generateRefreshToken)({ userId: user.id, email: user.email });
            // Cache user data
            const cacheKey = `user:${user.id}`;
            await cacheService.set(cacheKey, user, 900); // 15 minutes
            // Remove password from response
            const { passwordHash, ...userWithoutPassword } = user;
            logger_1.logger.info(`User logged in successfully: ${user.email}`);
            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: userWithoutPassword,
                    tokens: {
                        accessToken,
                        refreshToken,
                    },
                },
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            else if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Login error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Login failed',
                });
            }
        }
    }
    async refreshToken(req, res) {
        try {
            const validatedData = refreshTokenSchema.parse(req.body);
            // Verify refresh token
            const decoded = (0, auth_1.verifyRefreshToken)(validatedData.refreshToken);
            // Check if user still exists and is active
            const user = await database_1.default.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, isActive: true },
            });
            if (!user || !user.isActive) {
                throw new errors_1.AppError('Invalid refresh token', 401);
            }
            // Generate new access token
            const accessToken = (0, auth_1.generateToken)({ userId: user.id, email: user.email });
            res.json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    accessToken,
                },
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            else if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Token refresh error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Token refresh failed',
                });
            }
        }
    }
    async logout(req, res) {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];
            if (token) {
                // Blacklist the token
                await (0, auth_1.blacklistToken)(token);
                // Clear user cache
                if (req.user) {
                    const cacheKey = `user:${req.user.id}`;
                    await cacheService.del(cacheKey);
                }
            }
            logger_1.logger.info(`User logged out: ${req.user?.email}`);
            res.json({
                success: true,
                message: 'Logout successful',
            });
        }
        catch (error) {
            logger_1.logger.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed',
            });
        }
    }
    async forgotPassword(req, res) {
        try {
            const validatedData = forgotPasswordSchema.parse(req.body);
            const user = await database_1.default.user.findUnique({
                where: { email: validatedData.email },
                select: { id: true, email: true, firstName: true, isActive: true },
            });
            // Always return success for security (don't reveal if email exists)
            if (!user || !user.isActive) {
                return res.json({
                    success: true,
                    message: 'If an account with that email exists, we sent a password reset link',
                });
            }
            // TODO: Generate reset token and send email
            // For now, just log the action
            logger_1.logger.info(`Password reset requested for: ${user.email}`);
            res.json({
                success: true,
                message: 'If an account with that email exists, we sent a password reset link',
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            else {
                logger_1.logger.error('Forgot password error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Password reset request failed',
                });
            }
        }
    }
    async resetPassword(req, res) {
        try {
            const validatedData = resetPasswordSchema.parse(req.body);
            // TODO: Verify reset token
            // For now, just return error
            throw new errors_1.AppError('Password reset not implemented yet', 501);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            else if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Reset password error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Password reset failed',
                });
            }
        }
    }
    async changePassword(req, res) {
        try {
            const validatedData = changePasswordSchema.parse(req.body);
            const userId = req.user.id;
            // Get current user with password
            const user = await database_1.default.user.findUnique({
                where: { id: userId },
                select: { id: true, passwordHash: true },
            });
            if (!user) {
                throw new errors_1.AppError('User not found', 404);
            }
            // Verify current password
            const isCurrentPasswordValid = await bcryptjs_1.default.compare(validatedData.currentPassword, user.passwordHash);
            if (!isCurrentPasswordValid) {
                throw new errors_1.AppError('Current password is incorrect', 400);
            }
            // Hash new password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
            const newPasswordHash = await bcryptjs_1.default.hash(validatedData.newPassword, saltRounds);
            // Update password
            await database_1.default.user.update({
                where: { id: userId },
                data: { passwordHash: newPasswordHash },
            });
            logger_1.logger.info(`Password changed for user: ${req.user.email}`);
            res.json({
                success: true,
                message: 'Password changed successfully',
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            else if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Change password error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Password change failed',
                });
            }
        }
    }
    async getProfile(req, res) {
        try {
            const userId = req.user.id;
            const user = await database_1.default.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                    emailVerifiedAt: true,
                    lastLoginAt: true,
                    createdAt: true,
                    updatedAt: true,
                    role: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                        },
                    },
                    school: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
            });
            if (!user) {
                throw new errors_1.AppError('User not found', 404);
            }
            res.json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Get profile error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get profile',
                });
            }
        }
    }
    async updateProfile(req, res) {
        try {
            const validatedData = updateProfileSchema.parse(req.body);
            const userId = req.user.id;
            const updatedUser = await database_1.default.user.update({
                where: { id: userId },
                data: validatedData,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    updatedAt: true,
                },
            });
            // Clear user cache
            const cacheKey = `user:${userId}`;
            await cacheService.del(cacheKey);
            logger_1.logger.info(`Profile updated for user: ${req.user.email}`);
            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedUser,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            else {
                logger_1.logger.error('Update profile error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Profile update failed',
                });
            }
        }
    }
    async verifyEmail(req, res) {
        try {
            // TODO: Implement email verification
            throw new errors_1.AppError('Email verification not implemented yet', 501);
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Email verification error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Email verification failed',
                });
            }
        }
    }
    async resendVerification(req, res) {
        try {
            // TODO: Implement resend verification
            throw new errors_1.AppError('Resend verification not implemented yet', 501);
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Resend verification error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Resend verification failed',
                });
            }
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map