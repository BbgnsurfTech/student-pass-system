import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Different rate limits for different AI operations
const rateLimiters = {
  // High-cost operations (LLM calls, complex CV processing)
  premium: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'ai_premium',
    points: 50, // Number of requests
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour if exceeded
  }),

  // Medium-cost operations (predictions, analysis)
  standard: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'ai_standard',
    points: 200, // Number of requests
    duration: 3600, // Per hour
    blockDuration: 1800, // Block for 30 minutes if exceeded
  }),

  // Low-cost operations (simple classifications, validations)
  basic: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'ai_basic',
    points: 500, // Number of requests
    duration: 3600, // Per hour
    blockDuration: 600, // Block for 10 minutes if exceeded
  }),

  // Real-time operations (fraud detection, chat)
  realtime: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'ai_realtime',
    points: 1000, // Number of requests
    duration: 3600, // Per hour
    blockDuration: 300, // Block for 5 minutes if exceeded
  })
};

// Cost mapping for different endpoints
const endpointCosts = {
  // Premium tier - High computational cost
  '/completion': 'premium',
  '/chat-completion': 'premium',
  '/embeddings': 'premium',
  '/cv/verify-document': 'premium',
  '/cv/recognize-face': 'premium',
  '/cv/enhance-image': 'premium',
  '/models/*/train': 'premium',

  // Standard tier - Medium computational cost
  '/approval/predict': 'standard',
  '/analytics/peak-periods': 'standard',
  '/analytics/system-usage': 'standard',
  '/analytics/capacity-needs': 'standard',
  '/analytics/security-risks': 'standard',
  '/analytics/dropout-risk': 'standard',
  '/analytics/anomalies': 'standard',
  '/analytics/insights': 'standard',
  '/nlp/classify-ticket': 'standard',
  '/nlp/extract-document': 'standard',
  '/cv/analyze-qr': 'standard',
  '/cv/validate-photo': 'standard',
  '/cv/assess-damage': 'standard',
  '/recommendations/*/personalized': 'standard',
  '/recommendations/*/hybrid': 'standard',
  '/fraud/analyze': 'standard',
  '/fraud/*/behavior': 'standard',
  '/fraud/*/network': 'standard',
  '/fraud/coordinated-attacks': 'standard',

  // Basic tier - Low computational cost
  '/nlp/sentiment': 'basic',
  '/nlp/detect-language': 'basic',
  '/recommendations/*/collaborative': 'basic',
  '/recommendations/*/content-based': 'basic',
  '/recommendations/*/optimal-time': 'basic',
  '/recommendations/*/security': 'basic',
  '/recommendations/*/workflow': 'basic',
  '/recommendations/*/dashboard': 'basic',
  '/models/*/performance': 'basic',
  '/fraud/insights': 'basic',

  // Real-time tier - Frequent but lightweight operations
  '/nlp/chat': 'realtime',
  '/recommendations/*/feedback': 'realtime'
};

export const rateLimitAI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || req.ip;
    const endpoint = req.route?.path || req.path;
    
    // Determine cost tier for the endpoint
    let tier = 'basic';
    for (const [pattern, cost] of Object.entries(endpointCosts)) {
      const regex = new RegExp(pattern.replace(/\*/g, '[^/]+'));
      if (regex.test(endpoint)) {
        tier = cost;
        break;
      }
    }

    const rateLimiter = rateLimiters[tier as keyof typeof rateLimiters];
    
    try {
      await rateLimiter.consume(userId);
      
      // Add rate limit info to response headers
      const resRateLimiter = await rateLimiter.get(userId);
      if (resRateLimiter) {
        res.set({
          'X-RateLimit-Limit': rateLimiter.points.toString(),
          'X-RateLimit-Remaining': resRateLimiter.remainingPoints?.toString() || '0',
          'X-RateLimit-Reset': new Date(Date.now() + (resRateLimiter.msBeforeNext || 0)).toISOString(),
          'X-RateLimit-Tier': tier.toUpperCase()
        });
      }

      next();
    } catch (rejRes) {
      // Rate limit exceeded
      const secs = Math.round((rejRes as any).msBeforeNext / 1000) || 1;
      
      res.set({
        'Retry-After': secs.toString(),
        'X-RateLimit-Limit': rateLimiter.points.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + (rejRes as any).msBeforeNext).toISOString(),
        'X-RateLimit-Tier': tier.toUpperCase()
      });

      logger.warn(`AI rate limit exceeded for user ${userId} on ${endpoint} (tier: ${tier})`);

      res.status(429).json({
        error: 'Too Many AI Requests',
        message: `Rate limit exceeded for ${tier} tier operations. Please try again in ${secs} seconds.`,
        retryAfter: secs,
        tier: tier.toUpperCase(),
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Rate limiting error:', error);
    // Continue without rate limiting on error
    next();
  }
};

// Per-endpoint rate limiting for critical operations
export const createAIEndpointLimiter = (requests: number, windowMs: number, message?: string) => {
  return rateLimit({
    windowMs,
    max: requests,
    message: message || {
      error: 'Too Many Requests',
      message: `Too many requests, please try again later.`,
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if available, otherwise fall back to IP
      return (req as any).user?.id || req.ip;
    },
    skip: (req: Request) => {
      // Skip rate limiting for admin users in development
      return process.env.NODE_ENV === 'development' && (req as any).user?.role === 'admin';
    },
    onLimitReached: (req: Request) => {
      logger.warn(`Rate limit reached for ${req.ip} on ${req.path}`);
    }
  });
};

// Specific limiters for high-cost operations
export const trainModelLimiter = createAIEndpointLimiter(
  5, // 5 requests
  24 * 60 * 60 * 1000, // per 24 hours
  {
    error: 'Model Training Rate Limit',
    message: 'Model training is limited to 5 requests per 24 hours. Please try again later.',
    timestamp: new Date().toISOString()
  }
);

export const documentVerificationLimiter = createAIEndpointLimiter(
  100, // 100 requests
  60 * 60 * 1000, // per hour
  {
    error: 'Document Verification Rate Limit',
    message: 'Document verification is limited to 100 requests per hour.',
    timestamp: new Date().toISOString()
  }
);

export const chatCompletionLimiter = createAIEndpointLimiter(
  1000, // 1000 requests
  60 * 60 * 1000, // per hour
  {
    error: 'Chat Completion Rate Limit',
    message: 'Chat completions are limited to 1000 requests per hour.',
    timestamp: new Date().toISOString()
  }
);

// User tier-based rate limiting
export const getTierMultiplier = (userTier: string): number => {
  const multipliers = {
    'basic': 1,
    'premium': 3,
    'enterprise': 10,
    'admin': 100
  };
  
  return multipliers[userTier as keyof typeof multipliers] || 1;
};

// Adaptive rate limiting based on system load
export const adaptiveRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get current system metrics
    const systemLoad = await getCurrentSystemLoad();
    const userId = (req as any).user?.id || req.ip;
    const userTier = (req as any).user?.tier || 'basic';
    
    // Adjust rate limits based on system load
    let loadMultiplier = 1;
    if (systemLoad > 0.8) loadMultiplier = 0.3; // Reduce limits by 70% under high load
    else if (systemLoad > 0.6) loadMultiplier = 0.5; // Reduce limits by 50% under medium load
    else if (systemLoad > 0.4) loadMultiplier = 0.7; // Reduce limits by 30% under moderate load
    
    const tierMultiplier = getTierMultiplier(userTier);
    const effectiveLimit = Math.round(100 * loadMultiplier * tierMultiplier);
    
    // Create dynamic rate limiter
    const dynamicLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `adaptive_${userId}`,
      points: effectiveLimit,
      duration: 3600, // Per hour
      blockDuration: Math.round(1800 / tierMultiplier), // Block duration inversely proportional to tier
    });
    
    try {
      await dynamicLimiter.consume(userId);
      
      // Add adaptive rate limit info to headers
      res.set({
        'X-Adaptive-Limit': effectiveLimit.toString(),
        'X-System-Load': systemLoad.toString(),
        'X-User-Tier': userTier.toUpperCase(),
        'X-Load-Multiplier': loadMultiplier.toString()
      });
      
      next();
    } catch (rejRes) {
      const secs = Math.round((rejRes as any).msBeforeNext / 1000) || 1;
      
      res.status(429).json({
        error: 'Adaptive Rate Limit Exceeded',
        message: `System is under ${systemLoad > 0.8 ? 'high' : 'medium'} load. Rate limit adjusted to ${effectiveLimit} requests per hour.`,
        retryAfter: secs,
        systemLoad,
        userTier: userTier.toUpperCase(),
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Adaptive rate limiting error:', error);
    next();
  }
};

// Cost-based rate limiting for different AI operations
export const costBasedRateLimit = (costPoints: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id || req.ip;
      const userTier = (req as any).user?.tier || 'basic';
      
      // Calculate user's cost budget based on tier
      const budgets = {
        'basic': 1000,
        'premium': 5000,
        'enterprise': 25000,
        'admin': 100000
      };
      
      const dailyBudget = budgets[userTier as keyof typeof budgets] || 1000;
      
      // Create cost-based limiter
      const costLimiter = new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `cost_${userId}`,
        points: dailyBudget,
        duration: 24 * 3600, // Per day
        blockDuration: 3600, // Block for 1 hour if exceeded
      });
      
      try {
        await costLimiter.consume(userId, costPoints);
        
        const remainingBudget = await costLimiter.get(userId);
        res.set({
          'X-Cost-Points': costPoints.toString(),
          'X-Daily-Budget': dailyBudget.toString(),
          'X-Remaining-Budget': remainingBudget?.remainingPoints?.toString() || '0',
          'X-Budget-Reset': new Date(Date.now() + (remainingBudget?.msBeforeNext || 0)).toISOString()
        });
        
        next();
      } catch (rejRes) {
        const hours = Math.round((rejRes as any).msBeforeNext / (1000 * 3600)) || 1;
        
        res.status(429).json({
          error: 'Daily Cost Budget Exceeded',
          message: `You have exceeded your daily AI cost budget of ${dailyBudget} points. Budget resets in ${hours} hours.`,
          costPoints,
          dailyBudget,
          userTier: userTier.toUpperCase(),
          resetIn: `${hours} hours`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Cost-based rate limiting error:', error);
      next();
    }
  };
};

// Helper function to get system load (placeholder implementation)
async function getCurrentSystemLoad(): Promise<number> {
  try {
    // In production, this would check actual system metrics
    // For now, return a simulated load based on current time
    const hour = new Date().getHours();
    
    // Simulate higher load during business hours
    if (hour >= 9 && hour <= 17) {
      return 0.6 + Math.random() * 0.3; // 0.6-0.9 load
    } else if (hour >= 18 && hour <= 22) {
      return 0.3 + Math.random() * 0.3; // 0.3-0.6 load
    } else {
      return Math.random() * 0.3; // 0-0.3 load
    }
  } catch (error) {
    logger.error('Failed to get system load:', error);
    return 0.5; // Default to moderate load
  }
}