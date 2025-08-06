import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { auth, requireRole } from '../middleware/auth';
import { getSearchService } from '../services/search.service';
import { getAuditService } from '../services/audit.service';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(auth);

// Search endpoint
router.get('/',
  [
    query('q').isString().isLength({ min: 1, max: 500 }),
    query('type').optional().isIn(['user', 'student', 'application', 'pass']),
    query('filters').optional().isJSON(),
    query('sort').optional().isJSON(),
    query('size').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('from').optional().isInt({ min: 0 }).toInt()
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

      const searchService = getSearchService();
      const auditService = getAuditService();

      const searchQuery = {
        query: req.query.q,
        filters: req.query.filters ? JSON.parse(req.query.filters) : {},
        sort: req.query.sort ? JSON.parse(req.query.sort) : [],
        size: req.query.size || 20,
        from: req.query.from || 0,
        includeTypes: req.query.type ? [req.query.type] : undefined
      };

      // Add institution filter for non-super-admins
      if (req.user.role !== 'super_admin' && req.user.institutionId) {
        searchQuery.filters.institutionId = req.user.institutionId;
      }

      const results = await searchService.search(searchQuery);

      // Log search query for analytics
      await auditService.logSystemEvent(
        'search_query',
        'search',
        'query',
        {
          query: req.query.q,
          resultCount: results.total,
          searchTime: results.took
        },
        'low',
        true,
        req.user.id
      );

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Search query failed:', error);
      res.status(500).json({
        success: false,
        message: 'Search query failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Search suggestions endpoint
router.get('/suggestions',
  [
    query('q').isString().isLength({ min: 1, max: 100 }),
    query('size').optional().isInt({ min: 1, max: 10 }).toInt()
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

      const searchService = getSearchService();
      const suggestions = await searchService.suggest(req.query.q, req.query.size || 5);

      res.json({
        success: true,
        data: { suggestions }
      });
    } catch (error) {
      logger.error('Search suggestions failed:', error);
      res.status(500).json({
        success: false,
        message: 'Search suggestions failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Reindex endpoint (admin only)
router.post('/reindex',
  requireRole(['admin', 'super_admin']),
  [
    body('institutionId').optional().isUUID()
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

      const searchService = getSearchService();
      const auditService = getAuditService();

      // Only super admins can reindex all institutions
      const institutionId = req.user.role === 'super_admin' 
        ? req.body.institutionId 
        : req.user.institutionId;

      const result = await searchService.reindexAll(institutionId);

      // Log reindex operation
      await auditService.logSystemEvent(
        'search_reindex',
        'search',
        'reindex',
        {
          institutionId,
          totalDocuments: result.total,
          indexedDocuments: result.indexed
        },
        'medium',
        true,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Reindex completed',
        data: result
      });
    } catch (error) {
      logger.error('Search reindex failed:', error);
      res.status(500).json({
        success: false,
        message: 'Search reindex failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Search health check (admin only)
router.get('/health',
  requireRole(['admin', 'super_admin']),
  async (req: any, res) => {
    try {
      const searchService = getSearchService();
      const health = await searchService.healthCheck();

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Search health check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Search health check failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Search statistics (admin only)
router.get('/stats',
  requireRole(['admin', 'super_admin']),
  async (req: any, res) => {
    try {
      const searchService = getSearchService();
      const stats = await searchService.getIndexStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get search stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get search statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;