import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { auth, requireRole } from '../middleware/auth';
import { getBulkService } from '../services/bulk.service';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'bulk'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.json'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, Excel, and JSON files are allowed.'));
    }
  }
});

// Apply authentication to all routes
router.use(auth);

// Get bulk operations for current user
router.get('/operations',
  [
    query('type').optional().isIn(['import', 'export', 'generate_passes', 'update_status', 'delete']),
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors: errors.array()
        });
      }

      const bulkService = getBulkService();
      
      // Users can only see their own operations unless admin
      const userId = ['admin', 'super_admin'].includes(req.user.role) 
        ? req.query.userId 
        : req.user.id;

      const operations = await bulkService.getUserJobs(userId);
      
      // Apply filters
      let filteredOps = operations;
      if (req.query.type) {
        filteredOps = filteredOps.filter(op => op.type === req.query.type);
      }
      if (req.query.status) {
        filteredOps = filteredOps.filter(op => op.status === req.query.status);
      }

      // Apply pagination
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedOps = filteredOps.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          operations: paginatedOps,
          total: filteredOps.length,
          page,
          totalPages: Math.ceil(filteredOps.length / limit)
        }
      });
    } catch (error) {
      logger.error('Failed to get bulk operations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get bulk operations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get specific bulk operation status
router.get('/operations/:id',
  async (req: any, res) => {
    try {
      const bulkService = getBulkService();
      const operation = await bulkService.getJobStatus(req.params.id);

      if (!operation) {
        return res.status(404).json({
          success: false,
          message: 'Bulk operation not found'
        });
      }

      // Check if user can access this operation
      if (operation.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: operation
      });
    } catch (error) {
      logger.error('Failed to get bulk operation status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get bulk operation status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Import users (admin only)
router.post('/import/users',
  requireRole(['admin', 'super_admin']),
  upload.single('file'),
  [
    body('skipDuplicates').optional().isBoolean().toBoolean(),
    body('updateExisting').optional().isBoolean().toBoolean(),
    body('validateData').optional().isBoolean().toBoolean(),
    body('chunkSize').optional().isInt({ min: 10, max: 1000 }).toInt()
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const bulkService = getBulkService();
      const options = {
        skipDuplicates: req.body.skipDuplicates ?? true,
        updateExisting: req.body.updateExisting ?? false,
        validateData: req.body.validateData ?? true,
        chunkSize: req.body.chunkSize ?? 100
      };

      const jobId = await bulkService.importUsers(
        req.file.path,
        req.user.id,
        req.user.institutionId,
        options
      );

      res.json({
        success: true,
        message: 'User import job started',
        data: { jobId }
      });
    } catch (error) {
      logger.error('Failed to start user import:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start user import',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Export users (admin only)
router.post('/export/users',
  requireRole(['admin', 'super_admin']),
  [
    body('format').optional().isIn(['csv', 'json', 'xlsx']),
    body('includeDeleted').optional().isBoolean().toBoolean(),
    body('dateRange').optional().isObject(),
    body('dateRange.start').optional().isISO8601().toDate(),
    body('dateRange.end').optional().isISO8601().toDate()
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors: errors.array()
        });
      }

      const bulkService = getBulkService();
      const options = {
        format: req.body.format || 'csv',
        includeDeleted: req.body.includeDeleted ?? false,
        dateRange: req.body.dateRange
      };

      const jobId = await bulkService.exportUsers(
        req.user.id,
        req.user.institutionId,
        options
      );

      res.json({
        success: true,
        message: 'User export job started',
        data: { jobId }
      });
    } catch (error) {
      logger.error('Failed to start user export:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start user export',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Generate passes in bulk (admin only)
router.post('/generate-passes',
  requireRole(['admin', 'super_admin']),
  [
    body('applicationIds').isArray().isLength({ min: 1, max: 1000 }),
    body('applicationIds.*').isUUID()
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid application IDs',
          errors: errors.array()
        });
      }

      const bulkService = getBulkService();
      const jobId = await bulkService.generatePassesBulk(
        req.body.applicationIds,
        req.user.id,
        req.user.institutionId
      );

      res.json({
        success: true,
        message: 'Bulk pass generation job started',
        data: { 
          jobId,
          applicationCount: req.body.applicationIds.length 
        }
      });
    } catch (error) {
      logger.error('Failed to start bulk pass generation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start bulk pass generation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update status in bulk (admin only)
router.post('/update-status',
  requireRole(['admin', 'super_admin']),
  [
    body('entityType').isIn(['application', 'pass', 'user']),
    body('entityIds').isArray().isLength({ min: 1, max: 1000 }),
    body('entityIds.*').isUUID(),
    body('status').isString().isLength({ min: 1, max: 50 })
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors: errors.array()
        });
      }

      const bulkService = getBulkService();
      const jobId = await bulkService.updateStatusBulk(
        req.body.entityType,
        req.body.entityIds,
        req.body.status,
        req.user.id,
        req.user.institutionId
      );

      res.json({
        success: true,
        message: 'Bulk status update job started',
        data: { 
          jobId,
          entityCount: req.body.entityIds.length 
        }
      });
    } catch (error) {
      logger.error('Failed to start bulk status update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start bulk status update',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Schedule cleanup operation (admin only)
router.post('/cleanup',
  requireRole(['admin', 'super_admin']),
  [
    body('type').isIn(['expired_passes', 'old_notifications', 'inactive_users'])
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cleanup type',
          errors: errors.array()
        });
      }

      const bulkService = getBulkService();
      const jobId = await bulkService.scheduleCleanup(req.body.type, req.user.id);

      res.json({
        success: true,
        message: 'Cleanup job scheduled',
        data: { jobId }
      });
    } catch (error) {
      logger.error('Failed to schedule cleanup:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule cleanup',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Cancel bulk operation
router.post('/operations/:id/cancel',
  async (req: any, res) => {
    try {
      const bulkService = getBulkService();
      const operation = await bulkService.getJobStatus(req.params.id);

      if (!operation) {
        return res.status(404).json({
          success: false,
          message: 'Bulk operation not found'
        });
      }

      // Check if user can cancel this operation
      if (operation.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const cancelled = await bulkService.cancelJob(req.params.id);

      res.json({
        success: cancelled,
        message: cancelled ? 'Bulk operation cancelled' : 'Failed to cancel bulk operation'
      });
    } catch (error) {
      logger.error('Failed to cancel bulk operation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel bulk operation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get queue statistics (admin only)
router.get('/stats',
  requireRole(['admin', 'super_admin']),
  async (req: any, res) => {
    try {
      const bulkService = getBulkService();
      const stats = await bulkService.getQueueStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get bulk operation stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get bulk operation statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Download bulk operation result
router.get('/operations/:id/download',
  async (req: any, res) => {
    try {
      const bulkService = getBulkService();
      const operation = await bulkService.getJobStatus(req.params.id);

      if (!operation) {
        return res.status(404).json({
          success: false,
          message: 'Bulk operation not found'
        });
      }

      // Check if user can access this operation
      if (operation.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (operation.status !== 'completed' || !operation.result?.filePath) {
        return res.status(400).json({
          success: false,
          message: 'No downloadable result available'
        });
      }

      // Send file
      res.download(operation.result.filePath, operation.result.fileName, (err) => {
        if (err) {
          logger.error('Failed to download bulk operation result:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to download file'
          });
        }
      });
    } catch (error) {
      logger.error('Failed to download bulk operation result:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download bulk operation result',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;