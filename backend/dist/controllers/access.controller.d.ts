import { Request, Response } from 'express';
export declare class AccessController {
    verifyAccess(req: Request, res: Response): Promise<void>;
    logAccess(req: Request, res: Response): Promise<void>;
    getAccessLogs(req: Request, res: Response): Promise<void>;
    getAccessLogById(req: Request, res: Response): Promise<void>;
    getAccessLogsByStudent(req: Request, res: Response): Promise<void>;
    getAccessLogsByPass(req: Request, res: Response): Promise<void>;
    getAccessPoints(req: Request, res: Response): Promise<void>;
    createAccessPoint(req: Request, res: Response): Promise<void>;
    updateAccessPoint(req: Request, res: Response): Promise<void>;
    deleteAccessPoint(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=access.controller.d.ts.map