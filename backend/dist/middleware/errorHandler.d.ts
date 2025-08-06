import { Request, Response, NextFunction } from 'express';
export declare const errorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => void;
export declare const handleUncaughtException: (error: Error) => void;
export declare const handleUnhandledRejection: (reason: any, promise: Promise<any>) => void;
export declare const handleProcessWarning: (warning: any) => void;
export declare const handleGracefulShutdown: (signal: string) => never;
//# sourceMappingURL=errorHandler.d.ts.map