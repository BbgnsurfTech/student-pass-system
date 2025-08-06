"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = exports.disconnectRedis = exports.getRedisClient = exports.setupRedis = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
let redisClient = null;
const setupRedis = async () => {
    try {
        if (redisClient) {
            return redisClient;
        }
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        redisClient = (0, redis_1.createClient)({
            url: redisUrl,
            password: process.env.REDIS_PASSWORD || undefined,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger_1.logger.error('Too many Redis reconnection attempts, giving up');
                        return new Error('Too many retries');
                    }
                    return Math.min(retries * 50, 1000);
                }
            }
        });
        // Error handling
        redisClient.on('error', (error) => {
            logger_1.logger.error('Redis error:', error);
        });
        redisClient.on('connect', () => {
            logger_1.logger.info('✅ Redis connected');
        });
        redisClient.on('disconnect', () => {
            logger_1.logger.warn('⚠️ Redis disconnected');
        });
        redisClient.on('reconnecting', () => {
            logger_1.logger.info('🔄 Redis reconnecting...');
        });
        await redisClient.connect();
        // Test the connection
        await redisClient.ping();
        logger_1.logger.info('✅ Redis connection established and tested');
        return redisClient;
    }
    catch (error) {
        logger_1.logger.error('❌ Redis connection failed:', error);
        throw error;
    }
};
exports.setupRedis = setupRedis;
const getRedisClient = () => {
    return redisClient;
};
exports.getRedisClient = getRedisClient;
const disconnectRedis = async () => {
    try {
        if (redisClient) {
            await redisClient.quit();
            redisClient = null;
            logger_1.logger.info('✅ Redis disconnected');
        }
    }
    catch (error) {
        logger_1.logger.error('❌ Redis disconnection failed:', error);
        throw error;
    }
};
exports.disconnectRedis = disconnectRedis;
// Cache utilities
class CacheService {
    constructor() {
        this.client = null;
    }
    static getInstance() {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }
    async initialize() {
        this.client = await (0, exports.setupRedis)();
    }
    async get(key) {
        try {
            if (!this.client)
                return null;
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            logger_1.logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            if (!this.client)
                return false;
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await this.client.setEx(key, ttlSeconds, serialized);
            }
            else {
                await this.client.set(key, serialized);
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Cache set error for key ${key}:`, error);
            return false;
        }
    }
    async del(key) {
        try {
            if (!this.client)
                return false;
            await this.client.del(key);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Cache delete error for key ${key}:`, error);
            return false;
        }
    }
    async exists(key) {
        try {
            if (!this.client)
                return false;
            const exists = await this.client.exists(key);
            return exists === 1;
        }
        catch (error) {
            logger_1.logger.error(`Cache exists check error for key ${key}:`, error);
            return false;
        }
    }
    async flush() {
        try {
            if (!this.client)
                return false;
            await this.client.flushAll();
            return true;
        }
        catch (error) {
            logger_1.logger.error('Cache flush error:', error);
            return false;
        }
    }
    async keys(pattern) {
        try {
            if (!this.client)
                return [];
            return await this.client.keys(pattern);
        }
        catch (error) {
            logger_1.logger.error(`Cache keys error for pattern ${pattern}:`, error);
            return [];
        }
    }
    async increment(key, increment = 1) {
        try {
            if (!this.client)
                return 0;
            return await this.client.incrBy(key, increment);
        }
        catch (error) {
            logger_1.logger.error(`Cache increment error for key ${key}:`, error);
            return 0;
        }
    }
    async expire(key, ttlSeconds) {
        try {
            if (!this.client)
                return false;
            await this.client.expire(key, ttlSeconds);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Cache expire error for key ${key}:`, error);
            return false;
        }
    }
}
exports.CacheService = CacheService;
exports.cacheService = CacheService.getInstance();
//# sourceMappingURL=redis.js.map