import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import slowDown from 'express-slow-down';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { getAuditService } from '../services/audit.service';

interface RateLimitRule {
  name: string;
  keyGenerator: (req: Request) => string;
  points: number;
  duration: number;
  blockDuration: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface UserTier {
  role: string;
  multiplier: number;
  customRules?: Partial<RateLimitRule>[];
}

export class AdvancedRateLimiter {
  private redis: Redis;
  private limiters: Map<string, RateLimiterRedis> = new Map();
  private auditService = getAuditService();

  // User tier configurations
  private userTiers: UserTier[] = [
    {
      role: 'super_admin',
      multiplier: 10, // 10x higher limits
      customRules: [
        {
          name: 'bulk_operations',
          points: 100,
          duration: 3600, // 1 hour
          blockDuration: 300 // 5 minutes
        }
      ]
    },
    {
      role: 'admin',
      multiplier: 5, // 5x higher limits
      customRules: [
        {
          name: 'bulk_operations',
          points: 50,
          duration: 3600,
          blockDuration: 600 // 10 minutes
        }
      ]
    },
    {
      role: 'staff',
      multiplier: 2, // 2x higher limits
    },
    {
      role: 'student',
      multiplier: 1, // Base limits
      customRules: [
        {
          name: 'application_submission',
          points: 5, // 5 applications per day
          duration: 86400, // 24 hours
          blockDuration: 3600 // 1 hour block
        }
      ]
    }
  ];

  // Base rate limiting rules
  private baseRules: RateLimitRule[] = [
    {
      name: 'general_api',
      keyGenerator: (req) => this.getClientKey(req),
      points: 1000, // requests
      duration: 60, // per minute
      blockDuration: 60 // block for 1 minute
    },
    {
      name: 'auth_attempts',
      keyGenerator: (req) => `auth:${req.ip}`,
      points: 10, // login attempts
      duration: 900, // per 15 minutes
      blockDuration: 1800, // block for 30 minutes
      skipSuccessfulRequests: true
    },
    {
      name: 'password_reset',
      keyGenerator: (req) => `pwd_reset:${req.ip}`,
      points: 5, // reset attempts
      duration: 3600, // per hour
      blockDuration: 3600 // block for 1 hour
    },
    {
      name: 'file_upload',
      keyGenerator: (req) => `upload:${this.getClientKey(req)}`,
      points: 100, // uploads
      duration: 3600, // per hour
      blockDuration: 300 // block for 5 minutes
    },
    {
      name: 'search_queries',
      keyGenerator: (req) => `search:${this.getClientKey(req)}`,
      points: 200, // searches
      duration: 60, // per minute
      blockDuration: 60 // block for 1 minute
    },
    {
      name: 'bulk_operations',
      keyGenerator: (req) => `bulk:${this.getClientKey(req)}`,
      points: 10, // bulk operations
      duration: 3600, // per hour
      blockDuration: 900 // block for 15 minutes
    },
    {
      name: 'report_generation',
      keyGenerator: (req) => `report:${this.getClientKey(req)}`,
      points: 20, // reports
      duration: 3600, // per hour
      blockDuration: 300 // block for 5 minutes
    },
    {
      name: 'notification_send',
      keyGenerator: (req) => `notify:${this.getClientKey(req)}`,
      points: 50, // notifications
      duration: 300, // per 5 minutes
      blockDuration: 300 // block for 5 minutes
    }
  ];

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    this.initializeLimiters();
    this.setupCleanup();
  }

  private initializeLimiters(): void {
    this.baseRules.forEach(rule => {
      const limiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: `rl_${rule.name}`,
        points: rule.points,
        duration: rule.duration,
        blockDuration: rule.blockDuration,
        skipSuccessfulRequests: rule.skipSuccessfulRequests,
        skipFailedRequests: rule.skipFailedRequests
      });

      this.limiters.set(rule.name, limiter);
    });

    logger.info(`Initialized ${this.limiters.size} rate limiters`);
  }

  private getClientKey(req: Request): string {
    // Prefer user ID if authenticated, fallback to IP
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    return `ip:${req.ip}`;
  }

  private getUserTier(req: Request): UserTier | null {
    if (!req.user) return null;
    return this.userTiers.find(tier => tier.role === req.user.role) || null;
  }

  private getAdjustedLimits(rule: RateLimitRule, userTier: UserTier | null): RateLimitRule {
    if (!userTier) return rule;

    // Check for custom rules first
    const customRule = userTier.customRules?.find(cr => cr.name === rule.name);
    if (customRule) {
      return {
        ...rule,
        ...customRule
      };
    }

    // Apply multiplier to base rule
    return {
      ...rule,
      points: Math.floor(rule.points * userTier.multiplier)
    };
  }

  public createMiddleware(ruleName: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rule = this.baseRules.find(r => r.name === ruleName);
        if (!rule) {
          logger.warn(`Rate limit rule '${ruleName}' not found`);
          return next();
        }

        const userTier = this.getUserTier(req);
        const adjustedRule = this.getAdjustedLimits(rule, userTier);
        
        const limiter = this.limiters.get(ruleName);
        if (!limiter) {
          return next();
        }

        const key = adjustedRule.keyGenerator(req);
        
        try {
          const resRateLimit = await limiter.consume(key, 1);
          
          // Add rate limit headers
          res.set({
            'X-RateLimit-Limit': adjustedRule.points.toString(),
            'X-RateLimit-Remaining': resRateLimit.remainingHits?.toString() || '0',
            'X-RateLimit-Reset': new Date(Date.now() + resRateLimit.msBeforeNext).toISOString()
          });

          next();
        } catch (rejRes) {
          // Rate limit exceeded
          const secs = Math.round((rejRes as RateLimiterRes).msBeforeNext / 1000) || 1;
          
          res.set({
            'X-RateLimit-Limit': adjustedRule.points.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + (rejRes as RateLimiterRes).msBeforeNext).toISOString(),
            'Retry-After': secs.toString()
          });

          // Log rate limit violation
          await this.logRateLimitViolation(req, ruleName, key);

          res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded for ${ruleName}. Try again in ${secs} seconds.`,
            retryAfter: secs
          });
        }
      } catch (error) {
        logger.error(`Rate limiter error for rule ${ruleName}:`, error);
        next(); // Continue on error to avoid blocking legitimate requests
      }
    };
  }

  public createSlowDown(ruleName: string, delayAfter?: number, delayMs?: number) {
    return slowDown({
      windowMs: 60 * 1000, // 1 minute
      delayAfter: delayAfter || 50, // allow 50 requests per window without delay
      delayMs: delayMs || 500, // add 500ms delay per request after delayAfter
      maxDelayMs: 20000, // max delay of 20 seconds
      keyGenerator: (req) => this.getClientKey(req),
      skip: (req) => {
        // Skip for super admins
        return req.user?.role === 'super_admin';
      },
      onLimitReached: async (req) => {
        await this.logSlowDownActivated(req, ruleName);
      }
    });
  }

  public async checkCustomLimit(
    key: string,
    points: number,
    duration: number,
    blockDuration?: number
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    try {
      const limiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: 'custom_limit',
        points,
        duration,
        blockDuration: blockDuration || duration
      });

      await limiter.consume(key);
      return { allowed: true };
    } catch (rejRes) {
      const retryAfter = Math.round((rejRes as RateLimiterRes).msBeforeNext / 1000) || 1;
      return { allowed: false, retryAfter };
    }
  }

  // Distributed rate limiting for API endpoints
  public createDistributedLimit(config: {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  }) {
    const limiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'distributed_limit',
      points: config.max,
      duration: config.windowMs / 1000,
      skipSuccessfulRequests: config.skipSuccessfulRequests,
      skipFailedRequests: config.skipFailedRequests
    });

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = config.keyGenerator ? config.keyGenerator(req) : this.getClientKey(req);
        const resRateLimit = await limiter.consume(key);

        res.set({
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': resRateLimit.remainingHits?.toString() || '0',
          'X-RateLimit-Reset': new Date(Date.now() + resRateLimit.msBeforeNext).toISOString()
        });

        next();
      } catch (rejRes) {
        const secs = Math.round((rejRes as RateLimiterRes).msBeforeNext / 1000) || 1;
        
        res.set({
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + (rejRes as RateLimiterRes).msBeforeNext).toISOString(),
          'Retry-After': secs.toString()
        });

        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${secs} seconds.`,
          retryAfter: secs
        });
      }
    };
  }

  // Progressive delay based on user behavior
  public createProgressiveDelay() {
    const baseDelay = 1000; // 1 second base delay
    const maxDelay = 30000; // 30 seconds max delay

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = `progressive:${this.getClientKey(req)}`;
        const violations = await this.redis.get(key);
        const violationCount = parseInt(violations || '0');

        if (violationCount > 0) {
          const delay = Math.min(baseDelay * Math.pow(2, violationCount - 1), maxDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        next();
      } catch (error) {
        logger.error('Progressive delay error:', error);
        next();
      }
    };
  }

  // Whitelist/Blacklist functionality
  public createWhitelistMiddleware(whitelist: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientKey = this.getClientKey(req);
      
      // Check if IP or user is whitelisted
      const isWhitelisted = whitelist.some(item => 
        clientKey.includes(item) || req.ip === item
      );

      if (isWhitelisted) {
        return next();
      }

      // Apply normal rate limiting
      next();
    };
  }

  public createBlacklistMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const clientKey = this.getClientKey(req);
        const isBlacklisted = await this.redis.sismember('blacklist', clientKey) || 
                             await this.redis.sismember('blacklist', req.ip);

        if (isBlacklisted) {
          res.status(403).json({
            error: 'Forbidden',
            message: 'Your access has been restricted'
          });
          return;
        }

        next();
      } catch (error) {
        logger.error('Blacklist check error:', error);
        next();
      }
    };
  }

  // Dynamic rate limiting based on server load
  public createAdaptiveLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Get current server metrics
        const cpuUsage = process.cpuUsage();
        const memoryUsage = process.memoryUsage();
        const load = cpuUsage.user / 1000000; // Convert to seconds

        // Adjust rate limits based on server load
        let multiplier = 1;
        if (load > 80) { // High load
          multiplier = 0.5; // Reduce limits by 50%
        } else if (load > 60) { // Medium load
          multiplier = 0.7; // Reduce limits by 30%
        } else if (load < 20) { // Low load
          multiplier = 1.5; // Increase limits by 50%
        }

        req.rateLimitMultiplier = multiplier;
        next();
      } catch (error) {
        logger.error('Adaptive rate limit error:', error);
        req.rateLimitMultiplier = 1;
        next();
      }
    };
  }

  private async logRateLimitViolation(req: Request, ruleName: string, key: string): Promise<void> {
    try {
      await this.auditService.logSecurityEvent(
        req.user?.id || 'anonymous',
        'rate_limit_exceeded',
        'request',
        key,
        {
          rule: ruleName,
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          clientKey: key
        },
        'medium'
      );

      // Increment violation count for progressive delay
      const violationKey = `progressive:${key}`;
      const violationCount = await this.redis.incr(violationKey);
      await this.redis.expire(violationKey, 3600); // Expire after 1 hour

      // Auto-blacklist after too many violations
      if (violationCount >= 100) { // 100 violations in an hour
        await this.redis.sadd('blacklist', key);
        await this.redis.expire(`blacklist:${key}`, 86400); // Blacklist for 24 hours
        
        logger.warn(`Auto-blacklisted ${key} for excessive rate limit violations`);
      }
    } catch (error) {
      logger.error('Failed to log rate limit violation:', error);
    }
  }

  private async logSlowDownActivated(req: Request, ruleName: string): Promise<void> {
    try {
      await this.auditService.logSystemEvent(
        'slow_down_activated',
        'rate_limit',
        ruleName,
        {
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          clientKey: this.getClientKey(req)
        },
        'low',
        true,
        req.user?.id
      );
    } catch (error) {
      logger.error('Failed to log slow down activation:', error);
    }
  }

  private setupCleanup(): void {
    // Clean up expired blacklist entries every hour
    setInterval(async () => {
      try {
        const blacklistKeys = await this.redis.smembers('blacklist');
        for (const key of blacklistKeys) {
          const ttl = await this.redis.ttl(`blacklist:${key}`);
          if (ttl <= 0) {
            await this.redis.srem('blacklist', key);
          }
        }
      } catch (error) {
        logger.error('Failed to cleanup blacklist:', error);
      }
    }, 3600000); // Every hour
  }

  public async getStats(): Promise<any> {
    try {
      const stats: any = {};
      
      for (const [name, limiter] of this.limiters) {
        // This would require additional implementation to get stats from rate limiter
        stats[name] = {
          // Implementation depends on rate-limiter-flexible version
        };
      }

      const blacklistCount = await this.redis.scard('blacklist');
      stats.blacklisted_clients = blacklistCount;

      return stats;
    } catch (error) {
      logger.error('Failed to get rate limiter stats:', error);
      return {};
    }
  }

  public async removeFromBlacklist(key: string): Promise<boolean> {
    try {
      await this.redis.srem('blacklist', key);
      await this.redis.del(`blacklist:${key}`);
      return true;
    } catch (error) {
      logger.error('Failed to remove from blacklist:', error);
      return false;
    }
  }

  public async addToBlacklist(key: string, durationSeconds = 86400): Promise<boolean> {
    try {
      await this.redis.sadd('blacklist', key);
      await this.redis.expire(`blacklist:${key}`, durationSeconds);
      return true;
    } catch (error) {
      logger.error('Failed to add to blacklist:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.redis.quit();
    logger.info('Advanced rate limiter closed');
  }
}

// Create singleton instance
let rateLimiter: AdvancedRateLimiter | null = null;

export const getAdvancedRateLimiter = (): AdvancedRateLimiter => {
  if (!rateLimiter) {
    rateLimiter = new AdvancedRateLimiter();
  }
  return rateLimiter;
};

// Export middleware functions
export const authRateLimit = () => getAdvancedRateLimiter().createMiddleware('auth_attempts');
export const generalRateLimit = () => getAdvancedRateLimiter().createMiddleware('general_api');
export const uploadRateLimit = () => getAdvancedRateLimiter().createMiddleware('file_upload');
export const searchRateLimit = () => getAdvancedRateLimiter().createMiddleware('search_queries');
export const bulkRateLimit = () => getAdvancedRateLimiter().createMiddleware('bulk_operations');
export const reportRateLimit = () => getAdvancedRateLimiter().createMiddleware('report_generation');
export const notificationRateLimit = () => getAdvancedRateLimiter().createMiddleware('notification_send');

// Slow down middleware
export const generalSlowDown = () => getAdvancedRateLimiter().createSlowDown('general_api');
export const searchSlowDown = () => getAdvancedRateLimiter().createSlowDown('search_queries', 100, 200);

// Advanced middleware
export const progressiveDelay = () => getAdvancedRateLimiter().createProgressiveDelay();
export const adaptiveLimit = () => getAdvancedRateLimiter().createAdaptiveLimit();
export const blacklistCheck = () => getAdvancedRateLimiter().createBlacklistMiddleware();