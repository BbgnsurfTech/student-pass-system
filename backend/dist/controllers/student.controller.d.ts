import { Request, Response } from 'express';
export declare class StudentController {
    getStudents(req: Request, res: Response): Promise<void>;
    getStudentById(req: Request, res: Response): Promise<void>;
    createStudent(req: Request, res: Response): Promise<void>;
    updateStudent(req: Request, res: Response): Promise<void>;
    deleteStudent(req: Request, res: Response): Promise<void>;
    getStudentPasses(req: Request, res: Response): Promise<void>;
    getStudentAccessLogs(req: Request, res: Response): Promise<void>;
    updateStudentStatus(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=student.controller.d.ts.map