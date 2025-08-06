import Redis from 'ioredis';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

export class CacheService {
  private redis: Redis | null = null;
  private nodeCache: NodeCache;
  private useRedis: boolean = false;

  constructor() {
    this.nodeCache = new NodeCache({
      stdTTL: 3600,
      checkperiod: 600,
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 10000
    });

    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        this.redis.on('connect', () => {
          this.useRedis = true;
          logger.info('Redis cache connected');
        });
        this.redis.on('error', () => {
          this.useRedis = false;
        });
        await this.redis.ping();
      }
    } catch (error) {
      this.useRedis = false;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        const value = this.nodeCache.get<string>(key);
        return value ? JSON.parse(value) : null;
      }
    } catch (error) {
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    try {
      const stringValue = JSON.stringify(value);
      if (this.useRedis && this.redis) {
        const result = await this.redis.setex(key, ttl, stringValue);
        return result === 'OK';
      } else {
        return this.nodeCache.set(key, stringValue, ttl);
      }
    } catch (error) {
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (this.useRedis && this.redis) {
        const result = await this.redis.del(key);
        return result > 0;
      } else {
        return this.nodeCache.del(key) > 0;
      }
    } catch (error) {
      return false;
    }
  }
}

export const cacheService = new CacheService();