import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

export const setupRedis = async (): Promise<RedisClientType> => {
  try {
    if (redisClient) {
      return redisClient;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Too many Redis reconnection attempts, giving up');
            return new Error('Too many retries');
          }
          return Math.min(retries * 50, 1000);
        }
      }
    });

    // Error handling
    redisClient.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected');
    });

    redisClient.on('disconnect', () => {
      logger.warn('⚠️ Redis disconnected');
    });

    redisClient.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });

    await redisClient.connect();
    
    // Test the connection
    await redisClient.ping();
    logger.info('✅ Redis connection established and tested');

    return redisClient;
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType | null => {
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('✅ Redis disconnected');
    }
  } catch (error) {
    logger.error('❌ Redis disconnection failed:', error);
    throw error;
  }
};

// Cache utilities
export class CacheService {
  private static instance: CacheService;
  private client: RedisClientType | null = null;

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public async initialize(): Promise<void> {
    this.client = await setupRedis();
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client) return null;
      
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  public async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.client) return false;

      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }

  public async flush(): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  public async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.client) return [];
      
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  public async increment(key: string, increment: number = 1): Promise<number> {
    try {
      if (!this.client) return 0;
      
      return await this.client.incrBy(key, increment);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      await this.client.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }
}

export const cacheService = CacheService.getInstance();