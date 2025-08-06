import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { CacheService } from '../config/redis';

const cacheService = CacheService.getInstance();

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  roleId: z.string().uuid('Invalid role ID'),
  schoolId: z.string().uuid('Invalid school ID').optional(),
});

const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  roleId: z.string().uuid('Invalid role ID').optional(),
  schoolId: z.string().uuid('Invalid school ID').optional(),
  isActive: z.boolean().optional(),
});

const paginationSchema = z.object({
  page: z.string().transform(Number).refine(n => n > 0, 'Page must be positive').optional(),
  limit: z.string().transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
  search: z.string().optional(),
  role: z.string().optional(),
  school: z.string().uuid().optional(),
  active: z.string().transform(val => val === 'true').optional(),
});

export class UserController {
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const query = paginationSchema.parse(req.query);
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

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
        prisma.user.findMany({
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
        prisma.user.count({ where }),
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        logger.error('Get users error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get users',
        });
      }
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('User ID is required', 400);
      }

      // Check if user can access this user's data
      const canAccessAnyUser = ['super_admin', 'school_admin'].includes(req.user?.role?.name || '');
      const isOwnProfile = req.user?.id === id;

      if (!canAccessAnyUser && !isOwnProfile) {
        throw new AppError('Access denied', 403);
      }

      const user = await prisma.user.findUnique({
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
        throw new AppError('User not found', 404);
      }

      // School admin can only access users from their school
      if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== user.school?.id) {
        throw new AppError('Access denied', 403);
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Get user by ID error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get user',
        });
      }
    }
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }

      // Verify role exists
      const role = await prisma.role.findUnique({
        where: { id: validatedData.roleId },
      });

      if (!role) {
        throw new AppError('Invalid role ID', 400);
      }

      // Verify school exists if provided
      if (validatedData.schoolId) {
        const school = await prisma.school.findUnique({
          where: { id: validatedData.schoolId },
        });

        if (!school) {
          throw new AppError('Invalid school ID', 400);
        }

        // School admin can only create users for their school
        if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== validatedData.schoolId) {
          throw new AppError('You can only create users for your school', 403);
        }
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

      // Create user
      const user = await prisma.user.create({
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

      logger.info(`User created successfully: ${user.email} by ${req.user?.email}`);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      } else if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Create user error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create user',
        });
      }
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updateUserSchema.parse(req.body);

      if (!id) {
        throw new AppError('User ID is required', 400);
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
        include: { school: true },
      });

      if (!existingUser) {
        throw new AppError('User not found', 404);
      }

      // School admin can only update users from their school
      if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== existingUser.schoolId) {
        throw new AppError('You can only update users from your school', 403);
      }

      // Check email uniqueness if email is being updated
      if (validatedData.email && validatedData.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: validatedData.email },
        });

        if (emailExists) {
          throw new AppError('Email already exists', 409);
        }
      }

      // Verify role exists if being updated
      if (validatedData.roleId) {
        const role = await prisma.role.findUnique({
          where: { id: validatedData.roleId },
        });

        if (!role) {
          throw new AppError('Invalid role ID', 400);
        }
      }

      // Verify school exists if being updated
      if (validatedData.schoolId) {
        const school = await prisma.school.findUnique({
          where: { id: validatedData.schoolId },
        });

        if (!school) {
          throw new AppError('Invalid school ID', 400);
        }

        // School admin can only assign users to their school
        if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== validatedData.schoolId) {
          throw new AppError('You can only assign users to your school', 403);
        }
      }

      // Update user
      const updatedUser = await prisma.user.update({
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

      logger.info(`User updated successfully: ${updatedUser.email} by ${req.user?.email}`);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      } else if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Update user error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update user',
        });
      }
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('User ID is required', 400);
      }

      // Prevent users from deleting themselves
      if (req.user?.id === id) {
        throw new AppError('You cannot delete your own account', 400);
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
        include: { school: true },
      });

      if (!existingUser) {
        throw new AppError('User not found', 404);
      }

      // School admin can only delete users from their school
      if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== existingUser.schoolId) {
        throw new AppError('You can only delete users from your school', 403);
      }

      // Soft delete user (deactivate)
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      // Clear user cache
      const cacheKey = `user:${id}`;
      await cacheService.del(cacheKey);

      logger.info(`User deleted (deactivated): ${existingUser.email} by ${req.user?.email}`);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Delete user error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to delete user',
        });
      }
    }
  }

  async activateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('User ID is required', 400);
      }

      const user = await prisma.user.update({
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

      logger.info(`User activated: ${user.email} by ${req.user?.email}`);

      res.json({
        success: true,
        message: 'User activated successfully',
        data: user,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Activate user error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to activate user',
        });
      }
    }
  }

  async deactivateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('User ID is required', 400);
      }

      // Prevent users from deactivating themselves
      if (req.user?.id === id) {
        throw new AppError('You cannot deactivate your own account', 400);
      }

      const user = await prisma.user.update({
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

      logger.info(`User deactivated: ${user.email} by ${req.user?.email}`);

      res.json({
        success: true,
        message: 'User deactivated successfully',
        data: user,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Deactivate user error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to deactivate user',
        });
      }
    }
  }

  async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('User ID is required', 400);
      }

      // Check access permissions
      const canAccessAnyUser = ['super_admin', 'school_admin'].includes(req.user?.role?.name || '');
      const isOwnProfile = req.user?.id === id;

      if (!canAccessAnyUser && !isOwnProfile) {
        throw new AppError('Access denied', 403);
      }

      const user = await prisma.user.findUnique({
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
        throw new AppError('User not found', 404);
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
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Get user permissions error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get user permissions',
        });
      }
    }
  }
}