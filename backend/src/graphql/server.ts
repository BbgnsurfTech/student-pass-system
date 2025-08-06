import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { applyMiddleware } from 'graphql-middleware';
import { shield, rule, and, or, not } from 'graphql-shield';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { Application } from 'express';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';

import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { getCacheService } from '../services/cache.service';
import { getAuditService } from '../services/audit.service';

// Rate limiter for GraphQL requests
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'graphql_rate_limit',
  points: 1000, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60 // Block for 60 seconds if limit exceeded
});

// Authentication rules
const isAuthenticated = rule({ cache: 'contextual' })(
  async (parent, args, context) => {
    return context.user !== null;
  }
);

const isAdmin = rule({ cache: 'contextual' })(
  async (parent, args, context) => {
    return context.user && ['admin', 'super_admin'].includes(context.user.role);
  }
);

const isSuperAdmin = rule({ cache: 'contextual' })(
  async (parent, args, context) => {
    return context.user && context.user.role === 'super_admin';
  }
);

const isStudent = rule({ cache: 'contextual' })(
  async (parent, args, context) => {
    return context.user && context.user.role === 'student';
  }
);

const isOwnerOrAdmin = rule({ cache: 'contextual' })(
  async (parent, args, context) => {
    if (!context.user) return false;
    if (['admin', 'super_admin'].includes(context.user.role)) return true;
    return args.id === context.user.id || args.userId === context.user.id;
  }
);

// Rate limiting rule
const rateLimit = rule({ cache: 'contextual' })(
  async (parent, args, context) => {
    const key = context.user ? context.user.id : context.req.ip;
    
    try {
      await rateLimiter.consume(key);
      return true;
    } catch (rejRes) {
      context.res.set('Retry-After', Math.round(rejRes.msBeforeNext / 1000) || 1);
      return new Error('Rate limit exceeded');
    }
  }
);

// GraphQL Shield permissions
const permissions = shield({
  Query: {
    '*': and(rateLimit, isAuthenticated),
    me: and(rateLimit, isAuthenticated),
    users: and(rateLimit, isAdmin),
    auditLogs: and(rateLimit, isAdmin),
    auditStats: and(rateLimit, isAdmin),
    complianceReport: and(rateLimit, isAdmin),
    bulkOperations: and(rateLimit, isAuthenticated),
    dashboardStats: and(rateLimit, isAdmin)
  },
  Mutation: {
    '*': and(rateLimit, isAuthenticated),
    login: rateLimit,
    createUser: and(rateLimit, isAdmin),
    updateUser: and(rateLimit, or(isOwnerOrAdmin)),
    deleteUser: and(rateLimit, isAdmin),
    reviewApplication: and(rateLimit, isAdmin),
    generatePass: and(rateLimit, isAdmin),
    importUsers: and(rateLimit, isAdmin),
    exportUsers: and(rateLimit, isAdmin),
    generatePassesBulk: and(rateLimit, isAdmin),
    updateStatusBulk: and(rateLimit, isAdmin),
    reindexSearch: and(rateLimit, isSuperAdmin),
    clearCache: and(rateLimit, isSuperAdmin)
  },
  Subscription: {
    '*': isAuthenticated,
    systemAlert: isAdmin,
    bulkOperationProgress: isAuthenticated
  }
}, {
  allowExternalErrors: true,
  fallbackError: 'Access denied'
});

// Logging middleware
const loggingMiddleware = {
  Query: {
    '*': async (resolve: any, parent: any, args: any, context: any, info: any) => {
      const start = Date.now();
      const result = await resolve(parent, args, context, info);
      const duration = Date.now() - start;
      
      logger.info(`GraphQL Query ${info.fieldName} completed in ${duration}ms`, {
        operation: info.fieldName,
        duration,
        userId: context.user?.id,
        variables: args
      });
      
      return result;
    }
  },
  Mutation: {
    '*': async (resolve: any, parent: any, args: any, context: any, info: any) => {
      const start = Date.now();
      
      try {
        const result = await resolve(parent, args, context, info);
        const duration = Date.now() - start;
        
        // Log successful mutation
        if (context.user) {
          const auditService = getAuditService();
          await auditService.logSystemEvent(
            `graphql_${info.fieldName}`,
            'mutation',
            info.fieldName,
            {
              args: JSON.stringify(args),
              duration,
              userAgent: context.req.get('User-Agent')
            },
            'low',
            true,
            context.user.id
          );
        }
        
        logger.info(`GraphQL Mutation ${info.fieldName} completed in ${duration}ms`, {
          operation: info.fieldName,
          duration,
          userId: context.user?.id,
          success: true
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        // Log failed mutation
        if (context.user) {
          const auditService = getAuditService();
          await auditService.logSystemEvent(
            `graphql_${info.fieldName}`,
            'mutation',
            info.fieldName,
            {
              args: JSON.stringify(args),
              duration,
              error: error.message,
              userAgent: context.req.get('User-Agent')
            },
            'medium',
            false,
            context.user.id
          );
        }
        
        logger.error(`GraphQL Mutation ${info.fieldName} failed in ${duration}ms`, {
          operation: info.fieldName,
          duration,
          userId: context.user?.id,
          error: error.message,
          success: false
        });
        
        throw error;
      }
    }
  }
};

// Caching middleware
const cachingMiddleware = {
  Query: {
    dashboardStats: async (resolve: any, parent: any, args: any, context: any, info: any) => {
      const cacheKey = `graphql:dashboardStats:${args.institutionId || 'all'}:${context.user?.id}`;
      const cacheService = getCacheService();
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for ${info.fieldName}`);
        return cached;
      }
      
      const result = await resolve(parent, args, context, info);
      await cacheService.set(cacheKey, result, { ttl: 300 }); // Cache for 5 minutes
      
      logger.debug(`Cache miss for ${info.fieldName}, cached result`);
      return result;
    },
    
    user: async (resolve: any, parent: any, args: any, context: any, info: any) => {
      const cacheKey = `graphql:user:${args.id}`;
      const cacheService = getCacheService();
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      const result = await resolve(parent, args, context, info);
      await cacheService.set(cacheKey, result, { ttl: 600 }); // Cache for 10 minutes
      
      return result;
    }
  }
};

// Create executable schema with middleware
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

const schemaWithMiddleware = applyMiddleware(
  schema,
  permissions,
  loggingMiddleware,
  cachingMiddleware
);

// Context function
const createContext = async ({ req, res, connection }: any) => {
  // WebSocket connection (subscriptions)
  if (connection) {
    return {
      ...connection.context,
      req: connection.context.request,
      res: connection.context.response
    };
  }

  // HTTP request
  let user = null;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          institutionId: true,
          isActive: true
        }
      });
      
      if (!user || !user.isActive) {
        user = null;
      }
    } catch (error) {
      // Invalid token - user remains null
    }
  }

  return {
    req,
    res,
    user,
    prisma
  };
};

// WebSocket authentication for subscriptions
const onConnect = async (connectionParams: any, webSocket: any, context: any) => {
  const token = connectionParams.authToken || connectionParams.Authorization;
  
  if (!token) {
    throw new Error('Missing auth token');
  }

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET!) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        institutionId: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid user');
    }

    return {
      user,
      request: context.request,
      response: context.response
    };
  } catch (error) {
    throw new Error('Invalid auth token');
  }
};

export const createApolloServer = () => {
  return new ApolloServer({
    schema: schemaWithMiddleware,
    context: createContext,
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production',
    subscriptions: {
      onConnect,
      keepAlive: 30000
    },
    formatError: (error) => {
      // Log errors
      logger.error('GraphQL Error:', {
        message: error.message,
        locations: error.locations,
        path: error.path,
        extensions: error.extensions
      });

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production' && !error.message.startsWith('Access denied')) {
        return new Error('Internal server error');
      }

      return error;
    },
    plugins: [
      {
        requestDidStart() {
          return {
            didResolveOperation(requestContext) {
              logger.debug('GraphQL Operation:', {
                operationName: requestContext.request.operationName,
                query: requestContext.request.query,
                variables: requestContext.request.variables
              });
            },
            didEncounterErrors(requestContext) {
              logger.error('GraphQL Request Errors:', {
                operationName: requestContext.request.operationName,
                errors: requestContext.errors
              });
            }
          };
        }
      }
    ]
  });
};

export const setupGraphQLServer = async (app: Application) => {
  try {
    const server = createApolloServer();
    await server.start();
    
    // Apply middleware to Express app
    server.applyMiddleware({ 
      app, 
      path: '/graphql',
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      }
    });

    // Create HTTP server for subscriptions
    const httpServer = createServer(app);
    
    // Setup subscription server
    const subscriptionServer = SubscriptionServer.create({
      schema: schemaWithMiddleware,
      execute,
      subscribe,
      onConnect,
      onDisconnect: (webSocket, context) => {
        logger.info('GraphQL subscription client disconnected');
      }
    }, {
      server: httpServer,
      path: server.graphqlPath
    });

    // Shutdown subscription server on app termination
    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, () => {
        subscriptionServer.close();
      });
    });

    logger.info(`🚀 GraphQL server ready at http://localhost:${process.env.PORT || 3000}${server.graphqlPath}`);
    logger.info(`🚀 GraphQL subscriptions ready at ws://localhost:${process.env.PORT || 3000}${server.graphqlPath}`);
    
    return { server, httpServer, subscriptionServer };
  } catch (error) {
    logger.error('Failed to setup GraphQL server:', error);
    throw error;
  }
};

export { schema: graphqlSchema, schemaWithMiddleware };