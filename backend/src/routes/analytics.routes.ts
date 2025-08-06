import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for analytics endpoints
const analyticsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many analytics requests from this IP, please try again later.'
});

// Apply rate limiting to all analytics routes
router.use(analyticsRateLimit);

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/analytics/metrics:
 *   get:
 *     summary: Get key metrics dashboard data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: Filter by school ID
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y, week, month]
 *         description: Date range for metrics
 *     responses:
 *       200:
 *         description: Key metrics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalApplications:
 *                       type: number
 *                     totalStudents:
 *                       type: number
 *                     totalPasses:
 *                       type: number
 *                     totalAccessLogs:
 *                       type: number
 *                 trends:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/metrics', analyticsController.getKeyMetrics.bind(analyticsController));

/**
 * @swagger
 * /api/analytics/applications:
 *   get:
 *     summary: Get application analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y, week, month]
 *     responses:
 *       200:
 *         description: Application analytics data
 */
router.get('/applications', 
  authorize(['admin', 'school_admin', 'department_staff']),
  analyticsController.getApplicationAnalytics.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/access:
 *   get:
 *     summary: Get access control analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *       - in: query
 *         name: accessPointId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y, week, month]
 *     responses:
 *       200:
 *         description: Access control analytics data
 */
router.get('/access',
  authorize(['admin', 'school_admin', 'security']),
  analyticsController.getAccessAnalytics.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/users:
 *   get:
 *     summary: Get user engagement analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y, week, month]
 *     responses:
 *       200:
 *         description: User engagement analytics data
 */
router.get('/users',
  authorize(['admin', 'school_admin']),
  analyticsController.getUserEngagement.bind(analyticsController)
);

/**
 * @swagger
 * /api/analytics/realtime:
 *   get:
 *     summary: Get real-time system status
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time system status data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 realTime:
 *                   type: object
 *                   properties:
 *                     activeUsers:
 *                       type: number
 *                     recentApplications:
 *                       type: number
 *                     recentAccess:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 systemHealth:
 *                   type: object
 *                 alerts:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/realtime', analyticsController.getSystemStatus.bind(analyticsController));

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics report
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [comprehensive, applications, access, users]
 *         description: Type of report to export
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Export format
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y, week, month]
 *     responses:
 *       200:
 *         description: Exported report data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export',
  authorize(['admin', 'school_admin']),
  analyticsController.exportReport.bind(analyticsController)
);

export default router;