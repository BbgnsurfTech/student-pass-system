import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { auth, requireRole } from '../middleware/auth';
import { getAuditService } from '../services/audit.service';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(auth);

// Get audit logs (admin only)
router.get('/logs',
  requireRole(['admin', 'super_admin']),
  [
    query('userId').optional().isUUID(),
    query('action').optional().isString(),
    query('entityType').optional().isString(),
    query('entityId').optional().isString(),
    query('category').optional().isIn(['auth', 'data', 'system', 'security', 'compliance']),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('success').optional().isBoolean().toBoolean(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
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

      const auditService = getAuditService();
      
      // Build audit query
      const auditQuery: any = {
        page: req.query.page || 1,
        limit: req.query.limit || 50
      };

      // Add filters
      if (req.query.userId) auditQuery.userId = req.query.userId;
      if (req.query.action) auditQuery.action = req.query.action;
      if (req.query.entityType) auditQuery.entityType = req.query.entityType;
      if (req.query.entityId) auditQuery.entityId = req.query.entityId;
      if (req.query.category) auditQuery.category = req.query.category;
      if (req.query.severity) auditQuery.severity = req.query.severity;
      if (req.query.success !== undefined) auditQuery.success = req.query.success;

      // Date range filter
      if (req.query.startDate || req.query.endDate) {
        auditQuery.dateRange = {};
        if (req.query.startDate) auditQuery.dateRange.start = req.query.startDate;
        if (req.query.endDate) auditQuery.dateRange.end = req.query.endDate;
      }

      // Restrict to institution if not super admin
      if (req.user.role !== 'super_admin') {
        auditQuery.institutionId = req.user.institutionId;
      }

      const result = await auditService.getAuditLogs(auditQuery);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get audit statistics (admin only)
router.get('/stats',
  requireRole(['admin', 'super_admin']),
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
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

      const auditService = getAuditService();
      
      // Restrict to institution if not super admin
      const institutionId = req.user.role === 'super_admin' ? undefined : req.user.institutionId;
      
      // Date range
      const dateRange = (req.query.startDate || req.query.endDate) ? {
        start: req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to 30 days ago
        end: req.query.endDate || new Date()
      } : undefined;

      const stats = await auditService.getAuditStats(institutionId, dateRange);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get audit stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Generate compliance report (admin only)
router.get('/compliance-report',
  requireRole(['admin', 'super_admin']),
  [
    query('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly'])
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

      const auditService = getAuditService();
      
      // Restrict to institution if not super admin
      const institutionId = req.user.role === 'super_admin' ? undefined : req.user.institutionId;
      const period = req.query.period || 'monthly';

      const report = await auditService.generateComplianceReport(institutionId, period);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate compliance report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Export audit logs (admin only)
router.get('/export',
  requireRole(['admin', 'super_admin']),
  [
    query('format').optional().isIn(['csv', 'json']),
    query('userId').optional().isUUID(),
    query('action').optional().isString(),
    query('entityType').optional().isString(),
    query('entityId').optional().isString(),
    query('category').optional().isIn(['auth', 'data', 'system', 'security', 'compliance']),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('success').optional().isBoolean().toBoolean(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
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

      const auditService = getAuditService();
      
      // Build audit query
      const auditQuery: any = {
        limit: 10000 // Maximum export limit
      };

      // Add filters
      if (req.query.userId) auditQuery.userId = req.query.userId;
      if (req.query.action) auditQuery.action = req.query.action;
      if (req.query.entityType) auditQuery.entityType = req.query.entityType;
      if (req.query.entityId) auditQuery.entityId = req.query.entityId;
      if (req.query.category) auditQuery.category = req.query.category;
      if (req.query.severity) auditQuery.severity = req.query.severity;
      if (req.query.success !== undefined) auditQuery.success = req.query.success;

      // Date range filter
      if (req.query.startDate || req.query.endDate) {
        auditQuery.dateRange = {};
        if (req.query.startDate) auditQuery.dateRange.start = req.query.startDate;
        if (req.query.endDate) auditQuery.dateRange.end = req.query.endDate;
      }

      // Restrict to institution if not super admin
      if (req.user.role !== 'super_admin') {
        auditQuery.institutionId = req.user.institutionId;
      }

      const format = req.query.format || 'csv';
      const filePath = await auditService.exportAuditLogs(auditQuery, format);
      
      // Send file as download
      const fileName = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      
      res.download(filePath, fileName, (err) => {
        if (err) {
          logger.error('Failed to send audit export file:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to download audit logs'
          });
        } else {
          // Cleanup file after sending
          const fs = require('fs');
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              logger.error('Failed to cleanup audit export file:', unlinkErr);
            }
          });
        }
      });
    } catch (error) {
      logger.error('Failed to export audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get audit log details (admin only)
router.get('/logs/:id',
  requireRole(['admin', 'super_admin']),
  async (req: any, res) => {
    try {
      // This would require implementing getAuditLogById method in audit service
      res.status(501).json({
        success: false,
        message: 'Feature not yet implemented'
      });
    } catch (error) {
      logger.error('Failed to get audit log details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get audit log details',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Search audit logs (admin only)
router.get('/search',
  requireRole(['admin', 'super_admin']),
  [
    query('q').isString().isLength({ min: 1, max: 200 }),
    query('category').optional().isIn(['auth', 'data', 'system', 'security', 'compliance']),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid search parameters',
          errors: errors.array()
        });
      }

      // This would require implementing search functionality in audit service
      // For now, return basic filtered results
      const auditService = getAuditService();
      
      const auditQuery: any = {
        page: req.query.page || 1,
        limit: req.query.limit || 50
      };

      // Add search filters (basic implementation)
      if (req.query.category) auditQuery.category = req.query.category;
      if (req.query.severity) auditQuery.severity = req.query.severity;
      
      // Restrict to institution if not super admin
      if (req.user.role !== 'super_admin') {
        auditQuery.institutionId = req.user.institutionId;
      }

      const result = await auditService.getAuditLogs(auditQuery);

      // Filter results by search query (basic text matching)
      const searchQuery = req.query.q.toLowerCase();
      const filteredLogs = result.logs.filter(log => 
        log.action.toLowerCase().includes(searchQuery) ||
        log.entityType.toLowerCase().includes(searchQuery) ||
        (log.errorMessage && log.errorMessage.toLowerCase().includes(searchQuery))
      );

      res.json({
        success: true,
        data: {
          ...result,
          logs: filteredLogs,
          total: filteredLogs.length
        }
      });
    } catch (error) {
      logger.error('Failed to search audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Cleanup old audit logs (super admin only)
router.post('/cleanup',
  requireRole(['super_admin']),
  async (req: any, res) => {
    try {
      const auditService = getAuditService();
      const deletedCount = await auditService.cleanupOldLogs();

      res.json({
        success: true,
        message: 'Audit log cleanup completed',
        data: { deletedCount }
      });
    } catch (error) {
      logger.error('Failed to cleanup audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;