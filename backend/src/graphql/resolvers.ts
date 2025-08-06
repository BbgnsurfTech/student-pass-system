import { GraphQLScalarType, Kind } from 'graphql';
import { PubSub, withFilter } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { prisma } from '../config/database';
import { getSearchService } from '../services/search.service';
import { getNotificationService } from '../services/notification.service';
import { getBulkService } from '../services/bulk.service';
import { getAuditService } from '../services/audit.service';
import { getCacheService } from '../services/cache.service';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Initialize PubSub with Redis
const pubsub = new RedisPubSub({
  publisher: new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }),
  subscriber: new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  })
});

// Custom scalar types
const dateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : null;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: any) {
    return value;
  },
  parseValue(value: any) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT:
        return ast.fields.reduce((acc: any, field: any) => {
          acc[field.name.value] = field.value;
          return acc;
        }, {});
      case Kind.LIST:
        return ast.values.map((v: any) => v.value);
      default:
        return null;
    }
  },
});

// Helper functions
const requireAuth = (context: any) => {
  if (!context.user) {
    throw new AuthenticationError('Authentication required');
  }
  return context.user;
};

const requireRole = (context: any, roles: string[]) => {
  const user = requireAuth(context);
  if (!roles.includes(user.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  return user;
};

const createConnection = (edges: any[], pageInfo: any, totalCount: number) => ({
  edges,
  pageInfo,
  totalCount
});

const createPageInfo = (hasNext: boolean, hasPrev: boolean, startCursor?: string, endCursor?: string) => ({
  hasNextPage: hasNext,
  hasPreviousPage: hasPrev,
  startCursor,
  endCursor
});

export const resolvers = {
  Date: dateScalar,
  JSON: jsonScalar,

  Query: {
    // Authentication
    me: async (_: any, __: any, context: any) => {
      const user = requireAuth(context);
      return await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          institution: true,
          student: true
        }
      });
    },

    // User queries
    user: async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context);
      return await prisma.user.findUnique({
        where: { id },
        include: {
          institution: true,
          student: true
        }
      });
    },

    users: async (_: any, args: any, context: any) => {
      const user = requireRole(context, ['admin', 'super_admin']);
      const { page = 1, limit = 20, search, ...filters } = args;
      
      const whereClause: any = {
        ...filters,
        ...(user.role !== 'super_admin' && { institutionId: user.institutionId })
      };

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          include: {
            institution: true,
            student: true
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.user.count({ where: whereClause })
      ]);

      const edges = users.map((user, index) => ({
        node: user,
        cursor: Buffer.from(`${page}_${index}`).toString('base64')
      }));

      const pageInfo = createPageInfo(
        page * limit < totalCount,
        page > 1,
        edges[0]?.cursor,
        edges[edges.length - 1]?.cursor
      );

      return createConnection(edges, pageInfo, totalCount);
    },

    // Student queries
    student: async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context);
      return await prisma.student.findUnique({
        where: { id },
        include: {
          user: { include: { institution: true } },
          institution: true,
          applications: { orderBy: { createdAt: 'desc' } },
          passes: { orderBy: { createdAt: 'desc' } }
        }
      });
    },

    students: async (_: any, args: any, context: any) => {
      const user = requireRole(context, ['admin', 'super_admin']);
      const { page = 1, limit = 20, search, ...filters } = args;
      
      const whereClause: any = {
        ...filters,
        ...(user.role !== 'super_admin' && { institutionId: user.institutionId })
      };

      if (search) {
        whereClause.OR = [
          { studentId: { contains: search, mode: 'insensitive' } },
          { user: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }}
        ];
      }

      const [students, totalCount] = await Promise.all([
        prisma.student.findMany({
          where: whereClause,
          include: {
            user: { include: { institution: true } },
            institution: true
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.student.count({ where: whereClause })
      ]);

      const edges = students.map((student, index) => ({
        node: student,
        cursor: Buffer.from(`${page}_${index}`).toString('base64')
      }));

      const pageInfo = createPageInfo(
        page * limit < totalCount,
        page > 1,
        edges[0]?.cursor,
        edges[edges.length - 1]?.cursor
      );

      return createConnection(edges, pageInfo, totalCount);
    },

    // Application queries
    application: async (_: any, { id }: { id: string }, context: any) => {
      requireAuth(context);
      return await prisma.application.findUnique({
        where: { id },
        include: {
          student: { include: { user: true } },
          institution: true,
          pass: true,
          reviewedBy: true
        }
      });
    },

    applications: async (_: any, args: any, context: any) => {
      const user = requireAuth(context);
      const { page = 1, limit = 20, search, ...filters } = args;
      
      const whereClause: any = {
        ...filters,
        ...(user.role === 'student' && { student: { userId: user.id } }),
        ...(user.role === 'admin' && { institutionId: user.institutionId })
      };

      if (search) {
        whereClause.OR = [
          { applicationNumber: { contains: search, mode: 'insensitive' } },
          { student: {
            user: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
              ]
            }
          }}
        ];
      }

      const [applications, totalCount] = await Promise.all([
        prisma.application.findMany({
          where: whereClause,
          include: {
            student: { include: { user: true } },
            institution: true,
            pass: true,
            reviewedBy: true
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.application.count({ where: whereClause })
      ]);

      const edges = applications.map((application, index) => ({
        node: application,
        cursor: Buffer.from(`${page}_${index}`).toString('base64')
      }));

      const pageInfo = createPageInfo(
        page * limit < totalCount,
        page > 1,
        edges[0]?.cursor,
        edges[edges.length - 1]?.cursor
      );

      return createConnection(edges, pageInfo, totalCount);
    },

    // Pass queries
    passes: async (_: any, args: any, context: any) => {
      const user = requireAuth(context);
      const { page = 1, limit = 20, search, ...filters } = args;
      
      const whereClause: any = {
        ...filters,
        ...(user.role === 'student' && { student: { userId: user.id } }),
        ...(user.role === 'admin' && { institutionId: user.institutionId })
      };

      if (search) {
        whereClause.OR = [
          { id: { contains: search, mode: 'insensitive' } },
          { student: {
            OR: [
              { studentId: { contains: search, mode: 'insensitive' } },
              { user: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } }
                ]
              }}
            ]
          }}
        ];
      }

      const [passes, totalCount] = await Promise.all([
        prisma.pass.findMany({
          where: whereClause,
          include: {
            student: { include: { user: true } },
            application: true,
            institution: true,
            accessLogs: { orderBy: { accessTime: 'desc' }, take: 10 }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.pass.count({ where: whereClause })
      ]);

      const edges = passes.map((pass, index) => ({
        node: pass,
        cursor: Buffer.from(`${page}_${index}`).toString('base64')
      }));

      const pageInfo = createPageInfo(
        page * limit < totalCount,
        page > 1,
        edges[0]?.cursor,
        edges[edges.length - 1]?.cursor
      );

      return createConnection(edges, pageInfo, totalCount);
    },

    // Statistics
    dashboardStats: async (_: any, { institutionId }: { institutionId?: string }, context: any) => {
      const user = requireAuth(context);
      const targetInstitutionId = user.role === 'super_admin' ? institutionId : user.institutionId;
      
      const cacheKey = `dashboard_stats:${targetInstitutionId || 'all'}`;
      const cacheService = getCacheService();
      
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const whereClause = targetInstitutionId ? { institutionId: targetInstitutionId } : {};

      const [
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalPasses,
        activePasses,
        expiredPasses,
        totalUsers,
        activeUsers,
        recentApplications,
        recentPasses
      ] = await Promise.all([
        prisma.application.count({ where: whereClause }),
        prisma.application.count({ where: { ...whereClause, status: 'pending' } }),
        prisma.application.count({ where: { ...whereClause, status: 'approved' } }),
        prisma.application.count({ where: { ...whereClause, status: 'rejected' } }),
        prisma.pass.count({ where: whereClause }),
        prisma.pass.count({ where: { ...whereClause, status: 'active' } }),
        prisma.pass.count({ where: { ...whereClause, status: 'expired' } }),
        prisma.user.count({ where: whereClause }),
        prisma.user.count({ where: { ...whereClause, isActive: true } }),
        prisma.application.findMany({
          where: whereClause,
          include: {
            student: { include: { user: true } },
            institution: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.pass.findMany({
          where: whereClause,
          include: {
            student: { include: { user: true } },
            institution: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      const stats = {
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalPasses,
        activePasses,
        expiredPasses,
        totalUsers,
        activeUsers,
        onlineUsers: 0, // This would come from WebSocket service
        recentApplications,
        recentPasses,
        applicationsByStatus: [
          { status: 'pending', count: pendingApplications },
          { status: 'approved', count: approvedApplications },
          { status: 'rejected', count: rejectedApplications }
        ],
        passesStats: [
          { status: 'active', count: activePasses },
          { status: 'expired', count: expiredPasses }
        ],
        monthlyStats: [] // This would be calculated from historical data
      };

      await cacheService.set(cacheKey, stats, { ttl: 300 }); // Cache for 5 minutes
      return stats;
    },

    // Search
    search: async (_: any, { input }: { input: any }, context: any) => {
      requireAuth(context);
      const searchService = getSearchService();
      return await searchService.search(input);
    },

    suggestions: async (_: any, { query, size = 5 }: { query: string; size?: number }, context: any) => {
      requireAuth(context);
      const searchService = getSearchService();
      return await searchService.suggest(query, size);
    },

    // Notifications
    notifications: async (_: any, args: any, context: any) => {
      const user = requireAuth(context);
      const notificationService = getNotificationService();
      const { page = 1, limit = 20, unreadOnly = false } = args;
      
      const result = await notificationService.getUserNotifications(user.id, page, limit, unreadOnly);
      
      const edges = result.notifications.map((notification, index) => ({
        node: {
          ...notification,
          user // Add user to notification
        },
        cursor: Buffer.from(`${page}_${index}`).toString('base64')
      }));

      const pageInfo = createPageInfo(
        page * limit < result.total,
        page > 1,
        edges[0]?.cursor,
        edges[edges.length - 1]?.cursor
      );

      return createConnection(edges, pageInfo, result.total);
    },

    // Audit logs
    auditLogs: async (_: any, { filter }: { filter: any }, context: any) => {
      const user = requireRole(context, ['admin', 'super_admin']);
      const auditService = getAuditService();
      
      // Restrict to institution if not super admin
      if (user.role !== 'super_admin') {
        filter.institutionId = user.institutionId;
      }
      
      const result = await auditService.getAuditLogs(filter);
      
      const edges = result.logs.map((log, index) => ({
        node: log,
        cursor: Buffer.from(`${filter.page || 1}_${index}`).toString('base64')
      }));

      const pageInfo = createPageInfo(
        result.page < result.totalPages,
        result.page > 1,
        edges[0]?.cursor,
        edges[edges.length - 1]?.cursor
      );

      return createConnection(edges, pageInfo, result.total);
    },

    // Bulk operations
    bulkOperations: async (_: any, args: any, context: any) => {
      const user = requireAuth(context);
      const bulkService = getBulkService();
      
      // Users can only see their own bulk operations unless admin
      const userId = ['admin', 'super_admin'].includes(user.role) ? args.userId : user.id;
      
      const jobs = await bulkService.getUserJobs(userId);
      const filteredJobs = jobs.filter(job => {
        if (args.type && job.type !== args.type) return false;
        if (args.status && job.status !== args.status) return false;
        return true;
      });

      const page = args.page || 1;
      const limit = args.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

      const edges = paginatedJobs.map((job, index) => ({
        node: {
          ...job,
          user // Add user info
        },
        cursor: Buffer.from(`${page}_${index}`).toString('base64')
      }));

      const pageInfo = createPageInfo(
        endIndex < filteredJobs.length,
        page > 1,
        edges[0]?.cursor,
        edges[edges.length - 1]?.cursor
      );

      return createConnection(edges, pageInfo, filteredJobs.length);
    }
  },

  Mutation: {
    // Authentication
    login: async (_: any, { email, password }: { email: string; password: string }, context: any) => {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { institution: true, student: true }
      });

      if (!user || !user.isActive) {
        throw new AuthenticationError('Invalid credentials');
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        // Log failed login attempt
        const auditService = getAuditService();
        await auditService.logAuthentication(
          user.id,
          'failed_login',
          false,
          { email },
          context.req.ip,
          context.req.get('User-Agent')
        );
        throw new AuthenticationError('Invalid credentials');
      }

      // Update last seen
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSeen: new Date(), isOnline: true }
      });

      // Generate tokens
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Log successful login
      const auditService = getAuditService();
      await auditService.logAuthentication(
        user.id,
        'login',
        true,
        { email },
        context.req.ip,
        context.req.get('User-Agent')
      );

      return {
        token,
        refreshToken,
        user,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      };
    },

    // User mutations
    createUser: async (_: any, { input }: { input: any }, context: any) => {
      requireRole(context, ['admin', 'super_admin']);
      
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email }
      });

      if (existingUser) {
        throw new UserInputError('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash('defaultPassword123', 12);
      
      const user = await prisma.user.create({
        data: {
          ...input,
          password: hashedPassword,
          emailVerified: false,
          isActive: true
        },
        include: {
          institution: true,
          student: true
        }
      });

      // Log user creation
      const auditService = getAuditService();
      await auditService.logDataAccess(
        context.user.id,
        'user',
        user.id,
        'create',
        undefined,
        { email: user.email, name: user.name, role: user.role },
        user.institutionId
      );

      // Index in search
      const searchService = getSearchService();
      await searchService.indexUser(user.id);

      return user;
    },

    // Application mutations
    createApplication: async (_: any, { input }: { input: any }, context: any) => {
      const user = requireAuth(context);
      
      // Students can only create applications for themselves
      if (user.role === 'student') {
        const student = await prisma.student.findUnique({
          where: { userId: user.id }
        });
        if (!student || student.id !== input.studentId) {
          throw new ForbiddenError('Can only create applications for yourself');
        }
      }

      // Generate application number
      const applicationCount = await prisma.application.count({
        where: { institutionId: input.institutionId }
      });
      const applicationNumber = `APP-${new Date().getFullYear()}-${String(applicationCount + 1).padStart(6, '0')}`;

      const application = await prisma.application.create({
        data: {
          ...input,
          applicationNumber,
          status: 'pending',
          submittedAt: new Date()
        },
        include: {
          student: { include: { user: true } },
          institution: true
        }
      });

      // Log application creation
      const auditService = getAuditService();
      await auditService.logDataAccess(
        user.id,
        'application',
        application.id,
        'create',
        undefined,
        { status: application.status, studentId: input.studentId },
        input.institutionId
      );

      // Index in search
      const searchService = getSearchService();
      await searchService.indexApplication(application.id);

      // Publish subscription
      pubsub.publish('APPLICATION_CREATED', { 
        applicationCreated: application,
        institutionId: input.institutionId
      });

      return application;
    },

    reviewApplication: async (_: any, { id, status, notes }: { id: string; status: string; notes?: string }, context: any) => {
      const user = requireRole(context, ['admin', 'super_admin']);
      
      const application = await prisma.application.findUnique({
        where: { id },
        include: {
          student: { include: { user: true } },
          institution: true
        }
      });

      if (!application) {
        throw new UserInputError('Application not found');
      }

      // Check institution access
      if (user.role !== 'super_admin' && application.institutionId !== user.institutionId) {
        throw new ForbiddenError('Cannot review applications from other institutions');
      }

      const oldValues = { status: application.status };
      
      const updatedApplication = await prisma.application.update({
        where: { id },
        data: {
          status,
          notes,
          reviewedAt: new Date(),
          reviewedById: user.id,
          ...(status === 'approved' && { approvedAt: new Date() }),
          ...(status === 'rejected' && { rejectedAt: new Date() })
        },
        include: {
          student: { include: { user: true } },
          institution: true,
          reviewedBy: true
        }
      });

      // Log review
      const auditService = getAuditService();
      await auditService.logDataAccess(
        user.id,
        'application',
        id,
        'update',
        oldValues,
        { status, notes },
        application.institutionId
      );

      // Send notification
      const notificationService = getNotificationService();
      await notificationService.sendApplicationStatusNotification(id, status, notes);

      // Update search index
      const searchService = getSearchService();
      await searchService.indexApplication(id);

      // Publish subscription
      pubsub.publish('APPLICATION_UPDATED', { 
        applicationUpdated: updatedApplication,
        institutionId: application.institutionId
      });

      return updatedApplication;
    },

    // Pass mutations
    generatePass: async (_: any, { applicationId }: { applicationId: string }, context: any) => {
      const user = requireRole(context, ['admin', 'super_admin']);
      
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          student: { include: { user: true } },
          institution: true
        }
      });

      if (!application) {
        throw new UserInputError('Application not found');
      }

      if (application.status !== 'approved') {
        throw new UserInputError('Application must be approved to generate pass');
      }

      // Check if pass already exists
      const existingPass = await prisma.pass.findUnique({
        where: { applicationId }
      });

      if (existingPass) {
        throw new UserInputError('Pass already generated for this application');
      }

      // Generate QR code data
      const qrData = JSON.stringify({
        passId: applicationId,
        studentId: application.studentId,
        institutionId: application.institutionId,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      });

      const pass = await prisma.pass.create({
        data: {
          studentId: application.studentId,
          applicationId,
          institutionId: application.institutionId,
          qrCode: qrData,
          status: 'active',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          downloadCount: 0
        },
        include: {
          student: { include: { user: true } },
          application: true,
          institution: true
        }
      });

      // Log pass generation
      const auditService = getAuditService();
      await auditService.logDataAccess(
        user.id,
        'pass',
        pass.id,
        'create',
        undefined,
        { status: pass.status, studentId: application.studentId },
        application.institutionId
      );

      // Send notification
      const notificationService = getNotificationService();
      await notificationService.sendPassGeneratedNotification(pass.id);

      // Index in search
      const searchService = getSearchService();
      await searchService.indexPass(pass.id);

      // Publish subscription
      pubsub.publish('PASS_GENERATED', { 
        passGenerated: pass,
        studentId: application.studentId
      });

      return pass;
    },

    // Notification mutations
    markNotificationRead: async (_: any, { id }: { id: string }, context: any) => {
      const user = requireAuth(context);
      const notificationService = getNotificationService();
      
      await notificationService.markNotificationAsRead(id, user.id);
      
      return await prisma.notification.findUnique({
        where: { id },
        include: { user: true }
      });
    },

    markAllNotificationsRead: async (_: any, __: any, context: any) => {
      const user = requireAuth(context);
      const notificationService = getNotificationService();
      
      await notificationService.markAllNotificationsAsRead(user.id);
      return true;
    },

    // Bulk operations
    importUsers: async (_: any, { file, options }: { file: string; options: any }, context: any) => {
      const user = requireRole(context, ['admin', 'super_admin']);
      const bulkService = getBulkService();
      
      const jobId = await bulkService.importUsers(file, user.id, user.institutionId, options);
      return await bulkService.getJobStatus(jobId);
    },

    generatePassesBulk: async (_: any, { applicationIds }: { applicationIds: string[] }, context: any) => {
      const user = requireRole(context, ['admin', 'super_admin']);
      const bulkService = getBulkService();
      
      const jobId = await bulkService.generatePassesBulk(applicationIds, user.id, user.institutionId);
      return await bulkService.getJobStatus(jobId);
    }
  },

  Subscription: {
    applicationUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['APPLICATION_UPDATED']),
        (payload, variables) => {
          return !variables.institutionId || payload.institutionId === variables.institutionId;
        }
      )
    },

    applicationCreated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['APPLICATION_CREATED']),
        (payload, variables) => {
          return !variables.institutionId || payload.institutionId === variables.institutionId;
        }
      )
    },

    passGenerated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['PASS_GENERATED']),
        (payload, variables) => {
          return !variables.studentId || payload.studentId === variables.studentId;
        }
      )
    },

    notificationReceived: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['NOTIFICATION_RECEIVED']),
        (payload, variables) => {
          return payload.userId === variables.userId;
        }
      )
    }
  },

  // Type resolvers
  User: {
    institution: async (parent: any) => {
      if (parent.institution) return parent.institution;
      return await prisma.institution.findUnique({
        where: { id: parent.institutionId }
      });
    },

    student: async (parent: any) => {
      if (parent.student) return parent.student;
      return await prisma.student.findUnique({
        where: { userId: parent.id }
      });
    },

    notifications: async (parent: any, args: any) => {
      const notificationService = getNotificationService();
      const result = await notificationService.getUserNotifications(
        parent.id,
        args.page || 1,
        args.limit || 20
      );
      return result.notifications;
    }
  },

  Institution: {
    stats: async (parent: any) => {
      const cacheService = getCacheService();
      const cacheKey = `institution_stats:${parent.id}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const [
        totalUsers,
        activeUsers,
        totalStudents,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalPasses,
        activePasses,
        expiredPasses
      ] = await Promise.all([
        prisma.user.count({ where: { institutionId: parent.id } }),
        prisma.user.count({ where: { institutionId: parent.id, isActive: true } }),
        prisma.student.count({ where: { institutionId: parent.id } }),
        prisma.application.count({ where: { institutionId: parent.id } }),
        prisma.application.count({ where: { institutionId: parent.id, status: 'pending' } }),
        prisma.application.count({ where: { institutionId: parent.id, status: 'approved' } }),
        prisma.application.count({ where: { institutionId: parent.id, status: 'rejected' } }),
        prisma.pass.count({ where: { institutionId: parent.id } }),
        prisma.pass.count({ where: { institutionId: parent.id, status: 'active' } }),
        prisma.pass.count({ where: { institutionId: parent.id, status: 'expired' } })
      ]);

      const stats = {
        totalUsers,
        activeUsers,
        totalStudents,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalPasses,
        activePasses,
        expiredPasses,
        onlineUsers: 0 // Would come from WebSocket service
      };

      await cacheService.set(cacheKey, stats, { ttl: 300 });
      return stats;
    }
  },

  Pass: {
    downloadUrl: (parent: any) => {
      return `/api/v1/passes/${parent.id}/download`;
    }
  }
};