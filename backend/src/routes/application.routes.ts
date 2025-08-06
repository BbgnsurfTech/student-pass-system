import { Router } from 'express';
import { ApplicationController } from '../controllers/application.controller';
import { requireAuth } from '../middleware/auth';
import { applicationRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const applicationController = new ApplicationController();

// GET /api/v1/applications - Get all applications (paginated)
router.get('/', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), applicationController.getApplications);

// GET /api/v1/applications/:id - Get application by ID
router.get('/:id', requireAuth(), applicationController.getApplicationById);

// POST /api/v1/applications - Submit new application
router.post('/', applicationRateLimiter, applicationController.createApplication);

// PUT /api/v1/applications/:id - Update application
router.put('/:id', requireAuth(), applicationController.updateApplication);

// DELETE /api/v1/applications/:id - Delete application
router.delete('/:id', requireAuth(), applicationController.deleteApplication);

// PATCH /api/v1/applications/:id/review - Review application
router.patch('/:id/review', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), applicationController.reviewApplication);

// POST /api/v1/applications/:id/approve - Approve application
router.post('/:id/approve', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), applicationController.approveApplication);

// POST /api/v1/applications/:id/reject - Reject application
router.post('/:id/reject', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), applicationController.rejectApplication);

// GET /api/v1/applications/:id/documents - Get application documents
router.get('/:id/documents', requireAuth(), applicationController.getApplicationDocuments);

export default router;