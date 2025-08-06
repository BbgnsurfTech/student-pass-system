import { Request, Response } from 'express';
export declare class UploadController {
    uploadDocument(req: Request, res: Response): Promise<void>;
    uploadPhoto(req: Request, res: Response): Promise<void>;
    uploadMultiple(req: Request, res: Response): Promise<void>;
    getFile(req: Request, res: Response): Promise<void>;
    deleteFile(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=upload.controller.d.ts.map