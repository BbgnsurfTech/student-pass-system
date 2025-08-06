import { Request, Response } from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { validateUploadedFile, deleteFile, fileExists, getFileStats } from '../middleware/upload';

export class UploadController {
  async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;

      if (!file) {
        throw new AppError('No document file uploaded', 400);
      }

      validateUploadedFile(file);

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
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Document upload error:', error);
        res.status(500).json({
          success: false,
          message: 'Document upload failed',
        });
      }
    }
  }

  async uploadPhoto(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;

      if (!file) {
        throw new AppError('No photo file uploaded', 400);
      }

      validateUploadedFile(file);

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
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Photo upload error:', error);
        res.status(500).json({
          success: false,
          message: 'Photo upload failed',
        });
      }
    }
  }

  async uploadMultiple(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError('No files uploaded', 400);
      }

      const uploadedFiles = [];

      for (const file of files) {
        try {
          validateUploadedFile(file);
          uploadedFiles.push({
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            url: `/uploads/${file.filename}`,
          });
        } catch (error) {
          // Clean up file if validation fails
          await deleteFile(file.path).catch(() => {});
          logger.warn(`File validation failed for ${file.originalname}:`, error);
        }
      }

      if (uploadedFiles.length === 0) {
        throw new AppError('No valid files were uploaded', 400);
      }

      res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} files uploaded successfully`,
        data: uploadedFiles,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Multiple files upload error:', error);
        res.status(500).json({
          success: false,
          message: 'File upload failed',
        });
      }
    }
  }

  async getFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;

      if (!filename) {
        throw new AppError('Filename is required', 400);
      }

      // Security check - prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new AppError('Invalid filename', 400);
      }

      // Look for file in subdirectories
      const possiblePaths = [
        path.join('uploads', filename),
        path.join('uploads', 'photos', filename),
        path.join('uploads', 'documents', filename),
        path.join('uploads', 'misc', filename),
      ];

      let filePath: string | null = null;
      
      for (const possiblePath of possiblePaths) {
        if (fileExists(possiblePath)) {
          filePath = possiblePath;
          break;
        }
      }

      if (!filePath) {
        throw new AppError('File not found', 404);
      }

      const stats = getFileStats(filePath);
      const ext = path.extname(filename).toLowerCase();

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
      logger.debug(`File accessed: ${filename} by ${req.user?.email || 'anonymous'}`);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Get file error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get file',
        });
      }
    }
  }

  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;

      if (!filename) {
        throw new AppError('Filename is required', 400);
      }

      // Security check - prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new AppError('Invalid filename', 400);
      }

      // Look for file in subdirectories
      const possiblePaths = [
        path.join('uploads', filename),
        path.join('uploads', 'photos', filename),
        path.join('uploads', 'documents', filename),
        path.join('uploads', 'misc', filename),
      ];

      let filePath: string | null = null;
      
      for (const possiblePath of possiblePaths) {
        if (fileExists(possiblePath)) {
          filePath = possiblePath;
          break;
        }
      }

      if (!filePath) {
        throw new AppError('File not found', 404);
      }

      // Delete file
      await deleteFile(filePath);

      logger.info(`File deleted: ${filename} by ${req.user?.email}`);

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error('Delete file error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to delete file',
        });
      }
    }
  }
}