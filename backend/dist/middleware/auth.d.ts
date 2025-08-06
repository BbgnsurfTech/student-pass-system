import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: {
                    id: string;
                    name: string;
                    permissions: {
                        permission: {
                            name: string;
                            resource: string;
                            action: string;
                        };
                    }[];
                };
                schoolId?: string;
            };
        }
    }
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requirePermission: (resource: string, action: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireSameSchool: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAuth: (options?: {
    roles?: string[];
    permissions?: {
        resource: string;
        action: string;
    }[];
    sameSchool?: boolean;
}) => ((req: Request, res: Response, next: NextFunction) => void)[];
export declare const generateToken: (payload: {
    userId: string;
    email: string;
}) => string;
export declare const generateRefreshToken: (payload: {
    userId: string;
    email: string;
}) => string;
export declare const verifyRefreshToken: (token: string) => {
    userId: string;
    email: string;
};
export declare const blacklistToken: (token: string) => Promise<void>;
export declare const isTokenBlacklisted: (token: string) => Promise<boolean>;
//# sourceMappingURL=auth.d.ts.map