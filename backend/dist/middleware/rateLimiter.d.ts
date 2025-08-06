import { Request, Response } from 'express';
export declare const rateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const authRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const passwordResetRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const uploadRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const accessRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const applicationRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const searchRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const createUserRateLimiter: (keyGenerator: (req: Request) => string, options: {
    windowMs: number;
    max: number;
    message: string;
}) => import("express-rate-limit").RateLimitRequestHandler;
export declare const userSpecificRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const roleBasedRateLimiter: (req: Request, res: Response, next: any) => void;
export default rateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map