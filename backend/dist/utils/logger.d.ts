import winston from 'winston';
export declare const logger: winston.Logger;
export declare const loggerStream: {
    write: (message: string) => void;
};
export declare const logError: (error: Error, context?: Record<string, any>) => void;
export declare const logInfo: (message: string, meta?: Record<string, any>) => void;
export declare const logWarn: (message: string, meta?: Record<string, any>) => void;
export declare const logDebug: (message: string, meta?: Record<string, any>) => void;
export declare const logHttp: (message: string, meta?: Record<string, any>) => void;
export declare const logQuery: (query: string, duration: number, params?: any[]) => void;
export declare const logRequest: (req: any, res: any, duration: number) => void;
export declare const logAuth: (event: string, userId?: string, details?: Record<string, any>) => void;
export declare const logBusiness: (event: string, data?: Record<string, any>) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map