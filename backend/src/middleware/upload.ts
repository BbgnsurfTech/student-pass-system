import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// File size limits
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880'); // 5MB
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB for images
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB for documents

// Allowed file types
const ALLOWED_IMAGE_TYPES = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
const ALLOWED_DOCUMENT_TYPES = (process.env.ALLOWED_DOCUMENT_TYPES || 'application/pdf,image/jpeg,image/png').split(',');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = 'uploads/';
    
    // Organize files by type
    if (file.fieldname === 'photo' || ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      uploadDir += 'photos/';
    } else if (file.fieldname === 'document' || ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      uploadDir += 'documents/';
    } else {
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
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    
    cb(null, `${safeBaseName}_${uniqueSuffix}${extension}`);
  },
});

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Check file type based on field name
    let allowedTypes: string[] = [];
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
      logger.warn(`File upload rejected - invalid type: ${file.mimetype}`, {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
      });
      return cb(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400));
    }

    // Additional security checks
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    
    if (!allowedExtensions.includes(extension)) {
      logger.warn(`File upload rejected - invalid extension: ${extension}`, {
        fieldname: file.fieldname,
        originalname: file.originalname,
        extension,
      });
      return cb(new AppError(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`, 400));
    }

    // Store max size in request for later validation
    req.maxFileSize = maxSize;

    cb(null, true);
  } catch (error) {
    logger.error('File filter error:', error);
    cb(new AppError('File validation failed', 400));
  }
};

// Create multer instance
export const upload = multer({
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
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
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

    logger.warn('Multer upload error:', {
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

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
};

// Utility functions for file operations
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    fs.unlink(filePath, (err: any) => {
      if (err) {
        logger.error('File deletion error:', err);
        reject(err);
      } else {
        logger.info(`File deleted: ${filePath}`);
        resolve();
      }
    });
  });
};

export const fileExists = (filePath: string): boolean => {
  const fs = require('fs');
  return fs.existsSync(filePath);
};

export const getFileStats = (filePath: string) => {
  const fs = require('fs');
  return fs.statSync(filePath);
};

export const generateFileName = (originalName: string, prefix?: string): string => {
  const uniqueSuffix = uuidv4();
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension);
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  
  return `${prefix ? prefix + '_' : ''}${safeBaseName}_${uniqueSuffix}${extension}`;
};

// Validate uploaded file
export const validateUploadedFile = (file: Express.Multer.File) => {
  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  // Additional validation after upload
  const stats = getFileStats(file.path);
  
  // Double-check file size
  if (stats.size > MAX_FILE_SIZE) {
    // Clean up the uploaded file
    deleteFile(file.path).catch(() => {});
    throw new AppError('File too large', 400);
  }

  // Log successful upload
  logger.info('File uploaded successfully:', {
    originalname: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: stats.size,
    path: file.path,
  });

  return true;
};