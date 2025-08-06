import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { getCacheService } from './cache.service';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { createHash } from 'crypto';
import * as jwt from 'jsonwebtoken';

export interface ApiKeyContext {
  id: string;
  tenantId: string;
  name: string;
  permissions: string[];
  rateLimitTier: string;
  isActive: boolean;
  expiresAt?: Date;
}

export interface RateLimitConfig {
  tier: string;
  windowMs: number;
  max: number;
  blockDuration: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

export interface ApiUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
  errorRate: number;
  rateLimitHits: number;
}

export class ApiGatewayService {
  private cacheService = getCacheService();
  private rateLimiters: Map<string, RateLimiterRedis | RateLimiterMemory> = new Map();
  private redisClient: any;

  // Rate limit configurations by tier
  private rateLimitConfigs: Record<string, RateLimitConfig> = {
    basic: {
      tier: 'basic',
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      blockDuration: 60 * 1000, // Block for 1 minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },
    standard: {
      tier: 'standard',
      windowMs: 60 * 1000, // 1 minute
      max: 500, // 500 requests per minute
      blockDuration: 60 * 1000, // Block for 1 minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },
    premium: {
      tier: 'premium',
      windowMs: 60 * 1000, // 1 minute
      max: 2000, // 2000 requests per minute
      blockDuration: 30 * 1000, // Block for 30 seconds
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },
    enterprise: {
      tier: 'enterprise',
      windowMs: 60 * 1000, // 1 minute
      max: 10000, // 10000 requests per minute
      blockDuration: 15 * 1000, // Block for 15 seconds
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    }
  };

  constructor() {
    this.setupRateLimiters();
  }

  private setupRateLimiters(): void {
    try {
      // Try to use Redis if available
      const Redis = require('ioredis');
      this.redisClient = new Redis(process.env.REDIS_URL);

      Object.values(this.rateLimitConfigs).forEach(config => {
        const limiter = new RateLimiterRedis({
          storeClient: this.redisClient,
          keyPrefix: `api_rate_limit_${config.tier}`,
          points: config.max,
          duration: Math.floor(config.windowMs / 1000),
          blockDuration: Math.floor(config.blockDuration / 1000)
        });

        this.rateLimiters.set(config.tier, limiter);
      });

      logger.info('API Gateway: Redis rate limiters initialized');
    } catch (error) {
      // Fallback to memory rate limiters
      logger.warn('API Gateway: Falling back to memory rate limiters');

      Object.values(this.rateLimitConfigs).forEach(config => {
        const limiter = new RateLimiterMemory({
          keyPrefix: `api_rate_limit_${config.tier}`,
          points: config.max,
          duration: Math.floor(config.windowMs / 1000),
          blockDuration: Math.floor(config.blockDuration / 1000)
        });

        this.rateLimiters.set(config.tier, limiter);
      });
    }
  }

  /**
   * Authenticate API key and extract context
   */
  async authenticateApiKey(apiKey: string, db: PrismaClient): Promise<ApiKeyContext | null> {
    const cacheKey = `api_key:${createHash('sha256').update(apiKey).digest('hex')}`; 
    
    try {
      // Check cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        const context = JSON.parse(cached);
        // Check if still active and not expired
        if (context.isActive && (!context.expiresAt || new Date(context.expiresAt) > new Date())) {
          return context;
        }
      }

      // Query database
      const keyHash = createHash('sha256').update(apiKey).digest('hex');
      const apiKeyRecord = await db.tenantApiKey.findUnique({
        where: { keyHash },
        include: {
          tenant: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });

      if (!apiKeyRecord || !apiKeyRecord.isActive || apiKeyRecord.tenant.status !== 'ACTIVE') {
        return null;
      }

      // Check expiration
      if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
        return null;
      }

      const context: ApiKeyContext = {
        id: apiKeyRecord.id,
        tenantId: apiKeyRecord.tenantId,
        name: apiKeyRecord.name,
        permissions: apiKeyRecord.permissions,
        rateLimitTier: apiKeyRecord.rateLimitTier,
        isActive: apiKeyRecord.isActive,
        expiresAt: apiKeyRecord.expiresAt || undefined
      };

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, JSON.stringify(context), 300);

      // Update last used timestamp
      await db.tenantApiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() }
      });

      return context;

    } catch (error) {
      logger.error('API key authentication failed:', error);
      return null;
    }
  }

  /**
   * Check permissions for API key
   */
  hasPermission(apiKeyContext: ApiKeyContext, resource: string, action: string): boolean {
    const permission = `${resource}:${action}`;
    const wildcardPermission = `${resource}:*`;
    const globalPermission = '*:*';

    return apiKeyContext.permissions.includes(permission) ||
           apiKeyContext.permissions.includes(wildcardPermission) ||
           apiKeyContext.permissions.includes(globalPermission);
  }

  /**
   * Apply rate limiting based on API key tier
   */
  async applyRateLimit(
    apiKeyContext: ApiKeyContext, 
    req: Request, 
    res: Response
  ): Promise<boolean> {
    try {
      const limiter = this.rateLimiters.get(apiKeyContext.rateLimitTier);
      if (!limiter) {
        logger.warn(`Rate limiter not found for tier: ${apiKeyContext.rateLimitTier}`);
        return true;
      }

      const key = `${apiKeyContext.tenantId}:${apiKeyContext.id}`;
      const rateLimitRes = await limiter.consume(key);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': this.rateLimitConfigs[apiKeyContext.rateLimitTier].max.toString(),
        'X-RateLimit-Remaining': rateLimitRes.remainingHits?.toString() || '0',
        'X-RateLimit-Reset': new Date(Date.now() + (rateLimitRes.msBeforeNext || 0)).toISOString()
      });

      return true;

    } catch (rateLimitError: any) {
      // Rate limit exceeded
      const config = this.rateLimitConfigs[apiKeyContext.rateLimitTier];
      const retryAfter = Math.round(rateLimitError.msBeforeNext / 1000);

      res.set({
        'X-RateLimit-Limit': config.max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + rateLimitError.msBeforeNext).toISOString(),
        'Retry-After': retryAfter.toString()
      });

      logger.warn(`Rate limit exceeded for API key ${apiKeyContext.id} (tenant: ${apiKeyContext.tenantId})`);
      return false;
    }
  }

  /**
   * Log API usage for analytics
   */
  async logApiUsage(
    apiKeyContext: ApiKeyContext,
    req: Request,
    res: Response,
    responseTime: number
  ): Promise<void> {
    try {
      const db = new PrismaClient(); // Would be injected in real implementation
      
      await db.apiUsageLog.create({
        data: {
          apiKeyId: apiKeyContext.id,
          tenantId: apiKeyContext.tenantId,
          endpoint: `${req.method} ${req.route?.path || req.path}`,
          method: req.method,
          statusCode: res.statusCode,
          responseTime: Math.round(responseTime),
          requestSize: req.get('content-length') ? parseInt(req.get('content-length')!) : 0,
          responseSize: res.get('content-length') ? parseInt(res.get('content-length')!) : 0,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          timestamp: new Date()
        }
      });

      await db.$disconnect();
    } catch (error) {
      logger.error('Failed to log API usage:', error);
    }
  }

  /**
   * Get API usage statistics for tenant
   */
  async getUsageStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    db: PrismaClient
  ): Promise<ApiUsageStats> {
    try {
      const logs = await db.apiUsageLog.findMany({
        where: {
          tenantId,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const totalRequests = logs.length;
      const successfulRequests = logs.filter(log => log.statusCode >= 200 && log.statusCode < 400).length;
      const failedRequests = totalRequests - successfulRequests;
      const averageResponseTime = logs.reduce((sum, log) => sum + log.responseTime, 0) / totalRequests || 0;

      // Count requests by endpoint
      const endpointCounts: Record<string, number> = {};
      logs.forEach(log => {
        endpointCounts[log.endpoint] = (endpointCounts[log.endpoint] || 0) + 1;
      });

      const topEndpoints = Object.entries(endpointCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count }));

      const rateLimitHits = logs.filter(log => log.statusCode === 429).length;

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime: Math.round(averageResponseTime),
        topEndpoints,
        errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
        rateLimitHits
      };

    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      throw error;
    }
  }

  /**
   * Generate new API key for tenant
   */
  async generateApiKey(
    tenantId: string,
    name: string,
    permissions: string[],
    rateLimitTier: string = 'standard',
    expiresIn?: number, // days
    db: PrismaClient
  ): Promise<{ apiKey: string; keyRecord: any }> {
    try {
      // Generate cryptographically secure API key
      const apiKey = `sps_${createHash('sha256')
        .update(`${tenantId}${Date.now()}${Math.random()}`)
        .digest('hex')
        .substring(0, 32)}`;

      const keyHash = createHash('sha256').update(apiKey).digest('hex');

      const keyRecord = await db.tenantApiKey.create({
        data: {
          tenantId,
          name,
          keyHash,
          permissions,
          rateLimitTier,
          isActive: true,
          expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null
        }
      });

      logger.info(`Generated API key for tenant ${tenantId}: ${name}`);
      return { apiKey, keyRecord };

    } catch (error) {
      logger.error('Failed to generate API key:', error);
      throw error;
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKeyId: string, tenantId: string, db: PrismaClient): Promise<void> {
    try {
      await db.tenantApiKey.updateMany({
        where: { 
          id: apiKeyId,
          tenantId 
        },
        data: { isActive: false }
      });

      // Clear from cache
      const apiKeyRecord = await db.tenantApiKey.findUnique({ where: { id: apiKeyId } });
      if (apiKeyRecord) {
        const cacheKey = `api_key:${apiKeyRecord.keyHash}`;
        await this.cacheService.delete(cacheKey);
      }

      logger.info(`Revoked API key ${apiKeyId} for tenant ${tenantId}`);

    } catch (error) {
      logger.error('Failed to revoke API key:', error);
      throw error;
    }
  }

  /**
   * Validate JWT token for federated authentication
   */
  async validateJwtToken(token: string, tenantId: string): Promise<any> {
    try {
      // Get tenant-specific JWT secret or use default
      const secret = process.env.JWT_SECRET || 'default-secret';
      
      const decoded = jwt.verify(token, secret) as any;
      
      // Validate tenant context
      if (decoded.tenantId !== tenantId) {
        throw new AppError('Invalid tenant context in token', 403);
      }

      return decoded;

    } catch (error) {
      logger.error('JWT token validation failed:', error);
      throw new AppError('Invalid or expired token', 401);
    }
  }

  /**
   * Get API documentation for tenant
   */
  async getApiDocumentation(tenantId: string): Promise<any> {
    // Generate OpenAPI specification based on tenant's enabled features
    return {
      openapi: '3.0.0',
      info: {
        title: 'Student Pass System API',
        version: '1.0.0',
        description: 'Multi-tenant Student Pass Management System API'
      },
      servers: [
        {
          url: `https://${process.env.API_BASE_URL || 'api.studentpass.com'}/v1`,
          description: 'Production server'
        }
      ],
      security: [
        {
          ApiKeyAuth: []
        },
        {
          BearerAuth: []
        }
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          },
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      paths: {
        '/students': {
          get: {
            summary: 'List students',
            security: [{ ApiKeyAuth: [] }],
            parameters: [
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', default: 50, maximum: 1000 }
              },
              {
                name: 'offset',
                in: 'query',
                schema: { type: 'integer', default: 0 }
              }
            ],
            responses: {
              200: {
                description: 'List of students',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Student' }
                        },
                        pagination: { $ref: '#/components/schemas/Pagination' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.disconnect();
    }
    this.rateLimiters.clear();
  }
}

/**
 * Middleware to authenticate API requests
 */
export const apiAuthMiddleware = (gatewayService: ApiGatewayService) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = req.header('X-API-Key');
      const authHeader = req.header('Authorization');

      if (!apiKey && !authHeader) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Provide either X-API-Key header or Authorization header',
          code: 'AUTH_REQUIRED'
        });
      }

      // Handle API key authentication
      if (apiKey) {
        const db = new PrismaClient(); // Would be injected in real implementation
        const apiKeyContext = await gatewayService.authenticateApiKey(apiKey, db);
        await db.$disconnect();

        if (!apiKeyContext) {
          return res.status(401).json({
            error: 'Invalid API key',
            code: 'INVALID_API_KEY'
          });
        }

        // Apply rate limiting
        const rateLimitPassed = await gatewayService.applyRateLimit(apiKeyContext, req, res);
        if (!rateLimitPassed) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: `Too many requests for ${apiKeyContext.rateLimitTier} tier`,
            code: 'RATE_LIMIT_EXCEEDED'
          });
        }

        // Add API key context to request
        (req as any).apiKey = apiKeyContext;
      }

      // Handle JWT authentication
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const tenantId = (req as any).tenant?.id;

        if (!tenantId) {
          return res.status(400).json({
            error: 'Tenant context required for JWT authentication',
            code: 'NO_TENANT_CONTEXT'
          });
        }

        try {
          const jwtPayload = await gatewayService.validateJwtToken(token, tenantId);
          (req as any).jwtPayload = jwtPayload;
        } catch (error) {
          return res.status(401).json({
            error: 'Invalid JWT token',
            code: 'INVALID_JWT'
          });
        }
      }

      next();

    } catch (error) {
      logger.error('API authentication error:', error);
      next(error);
    }
  };
};

/**
 * Middleware to check API permissions
 */
export const requireApiPermission = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKeyContext = (req as any).apiKey;

    if (!apiKeyContext) {
      return res.status(401).json({
        error: 'API key authentication required',
        code: 'API_KEY_REQUIRED'
      });
    }

    const gatewayService = new ApiGatewayService();
    if (!gatewayService.hasPermission(apiKeyContext, resource, action)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required permission: ${resource}:${action}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Singleton instance
let apiGatewayService: ApiGatewayService;

export const getApiGatewayService = (): ApiGatewayService => {
  if (!apiGatewayService) {
    apiGatewayService = new ApiGatewayService();
  }
  return apiGatewayService;
};