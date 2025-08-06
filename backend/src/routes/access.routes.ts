import { Router } from 'express';
import { AccessController } from '../controllers/access.controller';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { accessRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const accessController = new AccessController();

// POST /api/v1/access/verify - Verify QR code for access (rate limited for scanning devices)
router.post('/verify', accessRateLimiter, optionalAuth, accessController.verifyAccess);

// POST /api/v1/access/log - Log access attempt (for scanning devices)
router.post('/log', accessRateLimiter, accessController.logAccess);

// GET /api/v1/access/logs - Get access logs (paginated)
router.get('/logs', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), accessController.getAccessLogs);

// GET /api/v1/access/logs/:id - Get specific access log
router.get('/logs/:id', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), accessController.getAccessLogById);

// GET /api/v1/access/logs/student/:studentId - Get access logs for specific student
router.get('/logs/student/:studentId', requireAuth(), accessController.getAccessLogsByStudent);

// GET /api/v1/access/logs/pass/:passId - Get access logs for specific pass
router.get('/logs/pass/:passId', requireAuth(), accessController.getAccessLogsByPass);

// GET /api/v1/access/points - Get access points
router.get('/points', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), accessController.getAccessPoints);

// POST /api/v1/access/points - Create access point
router.post('/points', requireAuth({ roles: ['super_admin', 'school_admin'] }), accessController.createAccessPoint);

// PUT /api/v1/access/points/:id - Update access point
router.put('/points/:id', requireAuth({ roles: ['super_admin', 'school_admin'] }), accessController.updateAccessPoint);

// DELETE /api/v1/access/points/:id - Delete access point
router.delete('/points/:id', requireAuth({ roles: ['super_admin', 'school_admin'] }), accessController.deleteAccessPoint);

export default router;