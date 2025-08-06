import { Request, Response } from 'express';
export declare class PassController {
    getPasses(req: Request, res: Response): Promise<void>;
    getPassById(req: Request, res: Response): Promise<void>;
    issuePass(req: Request, res: Response): Promise<void>;
    updatePass(req: Request, res: Response): Promise<void>;
    deletePass(req: Request, res: Response): Promise<void>;
    revokePass(req: Request, res: Response): Promise<void>;
    reactivatePass(req: Request, res: Response): Promise<void>;
    getPassQRCode(req: Request, res: Response): Promise<void>;
    getPassesByStudent(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=pass.controller.d.ts.map