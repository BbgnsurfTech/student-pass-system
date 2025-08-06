"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const application_controller_1 = require("../controllers/application.controller");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
const applicationController = new application_controller_1.ApplicationController();
// GET /api/v1/applications - Get all applications (paginated)
router.get('/', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), applicationController.getApplications);
// GET /api/v1/applications/:id - Get application by ID
router.get('/:id', (0, auth_1.requireAuth)(), applicationController.getApplicationById);
// POST /api/v1/applications - Submit new application
router.post('/', rateLimiter_1.applicationRateLimiter, applicationController.createApplication);
// PUT /api/v1/applications/:id - Update application
router.put('/:id', (0, auth_1.requireAuth)(), applicationController.updateApplication);
// DELETE /api/v1/applications/:id - Delete application
router.delete('/:id', (0, auth_1.requireAuth)(), applicationController.deleteApplication);
// PATCH /api/v1/applications/:id/review - Review application
router.patch('/:id/review', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), applicationController.reviewApplication);
// POST /api/v1/applications/:id/approve - Approve application
router.post('/:id/approve', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), applicationController.approveApplication);
// POST /api/v1/applications/:id/reject - Reject application
router.post('/:id/reject', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), applicationController.rejectApplication);
// GET /api/v1/applications/:id/documents - Get application documents
router.get('/:id/documents', (0, auth_1.requireAuth)(), applicationController.getApplicationDocuments);
exports.default = router;
//# sourceMappingURL=application.routes.js.map