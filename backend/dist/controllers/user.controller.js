"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const redis_1 = require("../config/redis");
const cacheService = redis_1.CacheService.getInstance();
// Validation schemas
const createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    roleId: zod_1.z.string().uuid('Invalid role ID'),
    schoolId: zod_1.z.string().uuid('Invalid school ID').optional(),
});
const updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format').optional(),
    firstName: zod_1.z.string().min(1, 'First name is required').optional(),
    lastName: zod_1.z.string().min(1, 'Last name is required').optional(),
    roleId: zod_1.z.string().uuid('Invalid role ID').optional(),
    schoolId: zod_1.z.string().uuid('Invalid school ID').optional(),
    isActive: zod_1.z.boolean().optional(),
});
const paginationSchema = zod_1.z.object({
    page: zod_1.z.string().transform(Number).refine(n => n > 0, 'Page must be positive').optional(),
    limit: zod_1.z.string().transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
    search: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    school: zod_1.z.string().uuid().optional(),
    active: zod_1.z.string().transform(val => val === 'true').optional(),
});
class UserController {
    async getUsers(req, res) {
        try {
            const query = paginationSchema.parse(req.query);
            const page = query.page || 1;
            const limit = query.limit || 20;
            const skip = (page - 1) * limit;
            // Build where clause
            const where = {};
            if (query.search) {
                where.OR = [
                    { firstName: { contains: query.search, mode: 'insensitive' } },
                    { lastName: { contains: query.search, mode: 'insensitive' } },
                    { email: { contains: query.search, mode: 'insensitive' } },
                ];
            }
            if (query.role) {
                where.role = { name: query.role };
            }
            if (query.school) {
                where.schoolId = query.school;
            }
            if (query.active !== undefined) {
                where.isActive = query.active;
            }
            // Restrict school admin to their school only
            if (req.user?.role?.name === 'school_admin' && req.user.schoolId) {
                where.schoolId = req.user.schoolId;
            }
            // Get users with pagination
            const [users, totalCount] = await Promise.all([
                database_1.default.user.findMany({
                    where,
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        isActive: true,
                        lastLoginAt: true,
                        createdAt: true,
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
                    orderBy: { createdAt: 'desc' },
                }),
                database_1.default.user.count({ where }),
            ]);
            const totalPages = Math.ceil(totalCount / limit);
            res.json({
                success: true,
                data: users,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
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
            else {
                logger_1.logger.error('Get users error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get users',
                });
            }
        }
    }
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError('User ID is required', 400);
            }
            // Check if user can access this user's data
            const canAccessAnyUser = ['super_admin', 'school_admin'].includes(req.user?.role?.name || '');
            const isOwnProfile = req.user?.id === id;
            if (!canAccessAnyUser && !isOwnProfile) {
                throw new errors_1.AppError('Access denied', 403);
            }
            const user = await database_1.default.user.findUnique({
                where: { id },
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
                            permissions: {
                                select: {
                                    permission: {
                                        select: {
                                            name: true,
                                            description: true,
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
                            code: true,
                            address: true,
                        },
                    },
                },
            });
            if (!user) {
                throw new errors_1.AppError('User not found', 404);
            }
            // School admin can only access users from their school
            if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== user.school?.id) {
                throw new errors_1.AppError('Access denied', 403);
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
                logger_1.logger.error('Get user by ID error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get user',
                });
            }
        }
    }
    async createUser(req, res) {
        try {
            const validatedData = createUserSchema.parse(req.body);
            // Check if user already exists
            const existingUser = await database_1.default.user.findUnique({
                where: { email: validatedData.email },
            });
            if (existingUser) {
                throw new errors_1.AppError('User with this email already exists', 409);
            }
            // Verify role exists
            const role = await database_1.default.role.findUnique({
                where: { id: validatedData.roleId },
            });
            if (!role) {
                throw new errors_1.AppError('Invalid role ID', 400);
            }
            // Verify school exists if provided
            if (validatedData.schoolId) {
                const school = await database_1.default.school.findUnique({
                    where: { id: validatedData.schoolId },
                });
                if (!school) {
                    throw new errors_1.AppError('Invalid school ID', 400);
                }
                // School admin can only create users for their school
                if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== validatedData.schoolId) {
                    throw new errors_1.AppError('You can only create users for your school', 403);
                }
            }
            // Hash password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
            const passwordHash = await bcryptjs_1.default.hash(validatedData.password, saltRounds);
            // Create user
            const user = await database_1.default.user.create({
                data: {
                    email: validatedData.email,
                    passwordHash,
                    firstName: validatedData.firstName,
                    lastName: validatedData.lastName,
                    roleId: validatedData.roleId,
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
            logger_1.logger.info(`User created successfully: ${user.email} by ${req.user?.email}`);
            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: user,
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
                logger_1.logger.error('Create user error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to create user',
                });
            }
        }
    }
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const validatedData = updateUserSchema.parse(req.body);
            if (!id) {
                throw new errors_1.AppError('User ID is required', 400);
            }
            // Check if user exists
            const existingUser = await database_1.default.user.findUnique({
                where: { id },
                include: { school: true },
            });
            if (!existingUser) {
                throw new errors_1.AppError('User not found', 404);
            }
            // School admin can only update users from their school
            if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== existingUser.schoolId) {
                throw new errors_1.AppError('You can only update users from your school', 403);
            }
            // Check email uniqueness if email is being updated
            if (validatedData.email && validatedData.email !== existingUser.email) {
                const emailExists = await database_1.default.user.findUnique({
                    where: { email: validatedData.email },
                });
                if (emailExists) {
                    throw new errors_1.AppError('Email already exists', 409);
                }
            }
            // Verify role exists if being updated
            if (validatedData.roleId) {
                const role = await database_1.default.role.findUnique({
                    where: { id: validatedData.roleId },
                });
                if (!role) {
                    throw new errors_1.AppError('Invalid role ID', 400);
                }
            }
            // Verify school exists if being updated
            if (validatedData.schoolId) {
                const school = await database_1.default.school.findUnique({
                    where: { id: validatedData.schoolId },
                });
                if (!school) {
                    throw new errors_1.AppError('Invalid school ID', 400);
                }
                // School admin can only assign users to their school
                if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== validatedData.schoolId) {
                    throw new errors_1.AppError('You can only assign users to your school', 403);
                }
            }
            // Update user
            const updatedUser = await database_1.default.user.update({
                where: { id },
                data: validatedData,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
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
            // Clear user cache
            const cacheKey = `user:${id}`;
            await cacheService.del(cacheKey);
            logger_1.logger.info(`User updated successfully: ${updatedUser.email} by ${req.user?.email}`);
            res.json({
                success: true,
                message: 'User updated successfully',
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
            else if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Update user error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update user',
                });
            }
        }
    }
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError('User ID is required', 400);
            }
            // Prevent users from deleting themselves
            if (req.user?.id === id) {
                throw new errors_1.AppError('You cannot delete your own account', 400);
            }
            // Check if user exists
            const existingUser = await database_1.default.user.findUnique({
                where: { id },
                include: { school: true },
            });
            if (!existingUser) {
                throw new errors_1.AppError('User not found', 404);
            }
            // School admin can only delete users from their school
            if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== existingUser.schoolId) {
                throw new errors_1.AppError('You can only delete users from your school', 403);
            }
            // Soft delete user (deactivate)
            await database_1.default.user.update({
                where: { id },
                data: { isActive: false },
            });
            // Clear user cache
            const cacheKey = `user:${id}`;
            await cacheService.del(cacheKey);
            logger_1.logger.info(`User deleted (deactivated): ${existingUser.email} by ${req.user?.email}`);
            res.json({
                success: true,
                message: 'User deleted successfully',
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
                logger_1.logger.error('Delete user error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete user',
                });
            }
        }
    }
    async activateUser(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError('User ID is required', 400);
            }
            const user = await database_1.default.user.update({
                where: { id },
                data: { isActive: true },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                },
            });
            // Clear user cache
            const cacheKey = `user:${id}`;
            await cacheService.del(cacheKey);
            logger_1.logger.info(`User activated: ${user.email} by ${req.user?.email}`);
            res.json({
                success: true,
                message: 'User activated successfully',
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
                logger_1.logger.error('Activate user error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to activate user',
                });
            }
        }
    }
    async deactivateUser(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError('User ID is required', 400);
            }
            // Prevent users from deactivating themselves
            if (req.user?.id === id) {
                throw new errors_1.AppError('You cannot deactivate your own account', 400);
            }
            const user = await database_1.default.user.update({
                where: { id },
                data: { isActive: false },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                },
            });
            // Clear user cache
            const cacheKey = `user:${id}`;
            await cacheService.del(cacheKey);
            logger_1.logger.info(`User deactivated: ${user.email} by ${req.user?.email}`);
            res.json({
                success: true,
                message: 'User deactivated successfully',
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
                logger_1.logger.error('Deactivate user error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to deactivate user',
                });
            }
        }
    }
    async getUserPermissions(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError('User ID is required', 400);
            }
            // Check access permissions
            const canAccessAnyUser = ['super_admin', 'school_admin'].includes(req.user?.role?.name || '');
            const isOwnProfile = req.user?.id === id;
            if (!canAccessAnyUser && !isOwnProfile) {
                throw new errors_1.AppError('Access denied', 403);
            }
            const user = await database_1.default.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    role: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            permissions: {
                                select: {
                                    permission: {
                                        select: {
                                            id: true,
                                            name: true,
                                            description: true,
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
                throw new errors_1.AppError('User not found', 404);
            }
            const permissions = user.role?.permissions.map(rp => rp.permission) || [];
            res.json({
                success: true,
                data: {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    permissions,
                },
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
                logger_1.logger.error('Get user permissions error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get user permissions',
                });
            }
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map