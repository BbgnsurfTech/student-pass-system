"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUploadedFile = exports.generateFileName = exports.getFileStats = exports.fileExists = exports.deleteFile = exports.handleUploadError = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
// File size limits
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880'); // 5MB
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB for images
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB for documents
// Allowed file types
const ALLOWED_IMAGE_TYPES = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
const ALLOWED_DOCUMENT_TYPES = (process.env.ALLOWED_DOCUMENT_TYPES || 'application/pdf,image/jpeg,image/png').split(',');
// Storage configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        let uploadDir = 'uploads/';
        // Organize files by type
        if (file.fieldname === 'photo' || ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            uploadDir += 'photos/';
        }
        else if (file.fieldname === 'document' || ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
            uploadDir += 'documents/';
        }
        else {
            uploadDir += 'misc/';
        }
        // Ensure directory exists
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = (0, uuid_1.v4)();
        const extension = path_1.default.extname(file.originalname);
        const baseName = path_1.default.basename(file.originalname, extension);
        const safeBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        cb(null, `${safeBaseName}_${uniqueSuffix}${extension}`);
    },
});
// File filter function
const fileFilter = (req, file, cb) => {
    try {
        // Check file type based on field name
        let allowedTypes = [];
        let maxSize = MAX_FILE_SIZE;
        switch (file.fieldname) {
            case 'photo':
                allowedTypes = ALLOWED_IMAGE_TYPES;
                maxSize = MAX_IMAGE_SIZE;
                break;
            case 'document':
                allowedTypes = ALLOWED_DOCUMENT_TYPES;
                maxSize = MAX_DOCUMENT_SIZE;
                break;
            case 'files':
                // For multiple file uploads, allow both images and documents
                allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
                maxSize = MAX_FILE_SIZE;
                break;
            default:
                allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
                maxSize = MAX_FILE_SIZE;
                break;
        }
        // Check MIME type
        if (!allowedTypes.includes(file.mimetype)) {
            logger_1.logger.warn(`File upload rejected - invalid type: ${file.mimetype}`, {
                fieldname: file.fieldname,
                originalname: file.originalname,
                mimetype: file.mimetype,
            });
            return cb(new errors_1.AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400));
        }
        // Additional security checks
        const extension = path_1.default.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
        if (!allowedExtensions.includes(extension)) {
            logger_1.logger.warn(`File upload rejected - invalid extension: ${extension}`, {
                fieldname: file.fieldname,
                originalname: file.originalname,
                extension,
            });
            return cb(new errors_1.AppError(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`, 400));
        }
        // Store max size in request for later validation
        req.maxFileSize = maxSize;
        cb(null, true);
    }
    catch (error) {
        logger_1.logger.error('File filter error:', error);
        cb(new errors_1.AppError('File validation failed', 400));
    }
};
// Create multer instance
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 10, // Maximum number of files
        fields: 20, // Maximum number of non-file fields
        fieldNameSize: 100, // Maximum field name size
        fieldSize: 1024 * 1024, // Maximum field value size (1MB)
    },
});
// Middleware to handle multer errors
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        let message = 'File upload error';
        let statusCode = 400;
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                message = `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`;
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files. Maximum is 10 files';
                break;
            case 'LIMIT_FIELD_KEY':
                message = 'Field name too long';
                break;
            case 'LIMIT_FIELD_VALUE':
                message = 'Field value too long';
                break;
            case 'LIMIT_FIELD_COUNT':
                message = 'Too many fields';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected file field';
                break;
            case 'MISSING_FIELD_NAME':
                message = 'Missing field name';
                break;
        }
        logger_1.logger.warn('Multer upload error:', {
            code: error.code,
            message: error.message,
            field: error.field,
        });
        return res.status(statusCode).json({
            success: false,
            message,
            error: error.code,
        });
    }
    if (error instanceof errors_1.AppError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
    }
    next(error);
};
exports.handleUploadError = handleUploadError;
// Utility functions for file operations
const deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const fs = require('fs');
        fs.unlink(filePath, (err) => {
            if (err) {
                logger_1.logger.error('File deletion error:', err);
                reject(err);
            }
            else {
                logger_1.logger.info(`File deleted: ${filePath}`);
                resolve();
            }
        });
    });
};
exports.deleteFile = deleteFile;
const fileExists = (filePath) => {
    const fs = require('fs');
    return fs.existsSync(filePath);
};
exports.fileExists = fileExists;
const getFileStats = (filePath) => {
    const fs = require('fs');
    return fs.statSync(filePath);
};
exports.getFileStats = getFileStats;
const generateFileName = (originalName, prefix) => {
    const uniqueSuffix = (0, uuid_1.v4)();
    const extension = path_1.default.extname(originalName);
    const baseName = path_1.default.basename(originalName, extension);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    return `${prefix ? prefix + '_' : ''}${safeBaseName}_${uniqueSuffix}${extension}`;
};
exports.generateFileName = generateFileName;
// Validate uploaded file
const validateUploadedFile = (file) => {
    if (!file) {
        throw new errors_1.AppError('No file uploaded', 400);
    }
    // Additional validation after upload
    const stats = (0, exports.getFileStats)(file.path);
    // Double-check file size
    if (stats.size > MAX_FILE_SIZE) {
        // Clean up the uploaded file
        (0, exports.deleteFile)(file.path).catch(() => { });
        throw new errors_1.AppError('File too large', 400);
    }
    // Log successful upload
    logger_1.logger.info('File uploaded successfully:', {
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: stats.size,
        path: file.path,
    });
    return true;
};
exports.validateUploadedFile = validateUploadedFile;
//# sourceMappingURL=upload.js.map