import { Request, Response } from 'express';
export declare class UserController {
    getUsers(req: Request, res: Response): Promise<void>;
    getUserById(req: Request, res: Response): Promise<void>;
    createUser(req: Request, res: Response): Promise<void>;
    updateUser(req: Request, res: Response): Promise<void>;
    deleteUser(req: Request, res: Response): Promise<void>;
    activateUser(req: Request, res: Response): Promise<void>;
    deactivateUser(req: Request, res: Response): Promise<void>;
    getUserPermissions(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=user.controller.d.ts.map