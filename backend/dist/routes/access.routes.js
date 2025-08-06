"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const access_controller_1 = require("../controllers/access.controller");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
const accessController = new access_controller_1.AccessController();
// POST /api/v1/access/verify - Verify QR code for access (rate limited for scanning devices)
router.post('/verify', rateLimiter_1.accessRateLimiter, auth_1.optionalAuth, accessController.verifyAccess);
// POST /api/v1/access/log - Log access attempt (for scanning devices)
router.post('/log', rateLimiter_1.accessRateLimiter, accessController.logAccess);
// GET /api/v1/access/logs - Get access logs (paginated)
router.get('/logs', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), accessController.getAccessLogs);
// GET /api/v1/access/logs/:id - Get specific access log
router.get('/logs/:id', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), accessController.getAccessLogById);
// GET /api/v1/access/logs/student/:studentId - Get access logs for specific student
router.get('/logs/student/:studentId', (0, auth_1.requireAuth)(), accessController.getAccessLogsByStudent);
// GET /api/v1/access/logs/pass/:passId - Get access logs for specific pass
router.get('/logs/pass/:passId', (0, auth_1.requireAuth)(), accessController.getAccessLogsByPass);
// GET /api/v1/access/points - Get access points
router.get('/points', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), accessController.getAccessPoints);
// POST /api/v1/access/points - Create access point
router.post('/points', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin'] }), accessController.createAccessPoint);
// PUT /api/v1/access/points/:id - Update access point
router.put('/points/:id', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin'] }), accessController.updateAccessPoint);
// DELETE /api/v1/access/points/:id - Delete access point
router.delete('/points/:id', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin'] }), accessController.deleteAccessPoint);
exports.default = router;
//# sourceMappingURL=access.routes.js.map