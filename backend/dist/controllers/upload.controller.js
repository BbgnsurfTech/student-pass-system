"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const path_1 = __importDefault(require("path"));
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const upload_1 = require("../middleware/upload");
class UploadController {
    async uploadDocument(req, res) {
        try {
            const file = req.file;
            if (!file) {
                throw new errors_1.AppError('No document file uploaded', 400);
            }
            (0, upload_1.validateUploadedFile)(file);
            // Save file info to database if needed
            // For now, just return file info
            res.status(201).json({
                success: true,
                message: 'Document uploaded successfully',
                data: {
                    filename: file.filename,
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    path: file.path,
                    url: `/uploads/${file.filename}`,
                },
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Document upload error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Document upload failed',
                });
            }
        }
    }
    async uploadPhoto(req, res) {
        try {
            const file = req.file;
            if (!file) {
                throw new errors_1.AppError('No photo file uploaded', 400);
            }
            (0, upload_1.validateUploadedFile)(file);
            res.status(201).json({
                success: true,
                message: 'Photo uploaded successfully',
                data: {
                    filename: file.filename,
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    path: file.path,
                    url: `/uploads/${file.filename}`,
                },
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Photo upload error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Photo upload failed',
                });
            }
        }
    }
    async uploadMultiple(req, res) {
        try {
            const files = req.files;
            if (!files || files.length === 0) {
                throw new errors_1.AppError('No files uploaded', 400);
            }
            const uploadedFiles = [];
            for (const file of files) {
                try {
                    (0, upload_1.validateUploadedFile)(file);
                    uploadedFiles.push({
                        filename: file.filename,
                        originalname: file.originalname,
                        mimetype: file.mimetype,
                        size: file.size,
                        path: file.path,
                        url: `/uploads/${file.filename}`,
                    });
                }
                catch (error) {
                    // Clean up file if validation fails
                    await (0, upload_1.deleteFile)(file.path).catch(() => { });
                    logger_1.logger.warn(`File validation failed for ${file.originalname}:`, error);
                }
            }
            if (uploadedFiles.length === 0) {
                throw new errors_1.AppError('No valid files were uploaded', 400);
            }
            res.status(201).json({
                success: true,
                message: `${uploadedFiles.length} files uploaded successfully`,
                data: uploadedFiles,
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Multiple files upload error:', error);
                res.status(500).json({
                    success: false,
                    message: 'File upload failed',
                });
            }
        }
    }
    async getFile(req, res) {
        try {
            const { filename } = req.params;
            if (!filename) {
                throw new errors_1.AppError('Filename is required', 400);
            }
            // Security check - prevent directory traversal
            if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                throw new errors_1.AppError('Invalid filename', 400);
            }
            // Look for file in subdirectories
            const possiblePaths = [
                path_1.default.join('uploads', filename),
                path_1.default.join('uploads', 'photos', filename),
                path_1.default.join('uploads', 'documents', filename),
                path_1.default.join('uploads', 'misc', filename),
            ];
            let filePath = null;
            for (const possiblePath of possiblePaths) {
                if ((0, upload_1.fileExists)(possiblePath)) {
                    filePath = possiblePath;
                    break;
                }
            }
            if (!filePath) {
                throw new errors_1.AppError('File not found', 404);
            }
            const stats = (0, upload_1.getFileStats)(filePath);
            const ext = path_1.default.extname(filename).toLowerCase();
            // Set appropriate content type
            let contentType = 'application/octet-stream';
            switch (ext) {
                case '.pdf':
                    contentType = 'application/pdf';
                    break;
                case '.jpg':
                case '.jpeg':
                    contentType = 'image/jpeg';
                    break;
                case '.png':
                    contentType = 'image/png';
                    break;
                case '.webp':
                    contentType = 'image/webp';
                    break;
            }
            // Set headers
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            // Stream file
            const fileStream = require('fs').createReadStream(filePath);
            fileStream.pipe(res);
            // Log file access
            logger_1.logger.debug(`File accessed: ${filename} by ${req.user?.email || 'anonymous'}`);
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Get file error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get file',
                });
            }
        }
    }
    async deleteFile(req, res) {
        try {
            const { filename } = req.params;
            if (!filename) {
                throw new errors_1.AppError('Filename is required', 400);
            }
            // Security check - prevent directory traversal
            if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                throw new errors_1.AppError('Invalid filename', 400);
            }
            // Look for file in subdirectories
            const possiblePaths = [
                path_1.default.join('uploads', filename),
                path_1.default.join('uploads', 'photos', filename),
                path_1.default.join('uploads', 'documents', filename),
                path_1.default.join('uploads', 'misc', filename),
            ];
            let filePath = null;
            for (const possiblePath of possiblePaths) {
                if ((0, upload_1.fileExists)(possiblePath)) {
                    filePath = possiblePath;
                    break;
                }
            }
            if (!filePath) {
                throw new errors_1.AppError('File not found', 404);
            }
            // Delete file
            await (0, upload_1.deleteFile)(filePath);
            logger_1.logger.info(`File deleted: ${filename} by ${req.user?.email}`);
            res.json({
                success: true,
                message: 'File deleted successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Delete file error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete file',
                });
            }
        }
    }
}
exports.UploadController = UploadController;
//# sourceMappingURL=upload.controller.js.map