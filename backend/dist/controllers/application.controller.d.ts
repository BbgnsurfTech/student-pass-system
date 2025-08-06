import { Request, Response } from 'express';
export declare class ApplicationController {
    getApplications(req: Request, res: Response): Promise<void>;
    getApplicationById(req: Request, res: Response): Promise<void>;
    createApplication(req: Request, res: Response): Promise<void>;
    updateApplication(req: Request, res: Response): Promise<void>;
    deleteApplication(req: Request, res: Response): Promise<void>;
    reviewApplication(req: Request, res: Response): Promise<void>;
    approveApplication(req: Request, res: Response): Promise<void>;
    rejectApplication(req: Request, res: Response): Promise<void>;
    getApplicationDocuments(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=application.controller.d.ts.map