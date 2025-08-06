import { RedisClientType } from 'redis';
export declare const setupRedis: () => Promise<RedisClientType>;
export declare const getRedisClient: () => RedisClientType | null;
export declare const disconnectRedis: () => Promise<void>;
export declare class CacheService {
    private static instance;
    private client;
    private constructor();
    static getInstance(): CacheService;
    initialize(): Promise<void>;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlSeconds?: number): Promise<boolean>;
    del(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    flush(): Promise<boolean>;
    keys(pattern: string): Promise<string[]>;
    increment(key: string, increment?: number): Promise<number>;
    expire(key: string, ttlSeconds: number): Promise<boolean>;
}
export declare const cacheService: CacheService;
//# sourceMappingURL=redis.d.ts.map