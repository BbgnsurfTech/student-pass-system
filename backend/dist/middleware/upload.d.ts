import multer from 'multer';
export declare const upload: multer.Multer;
export declare const handleUploadError: (error: any, req: any, res: any, next: any) => any;
export declare const deleteFile: (filePath: string) => Promise<void>;
export declare const fileExists: (filePath: string) => boolean;
export declare const getFileStats: (filePath: string) => any;
export declare const generateFileName: (originalName: string, prefix?: string) => string;
export declare const validateUploadedFile: (file: Express.Multer.File) => boolean;
//# sourceMappingURL=upload.d.ts.map