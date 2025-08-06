import { Router } from 'express';
import { PassController } from '../controllers/pass.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
const passController = new PassController();

// All pass routes require authentication
router.use(requireAuth());

// GET /api/v1/passes - Get all passes (paginated)
router.get('/', passController.getPasses);

// GET /api/v1/passes/:id - Get pass by ID
router.get('/:id', passController.getPassById);

// POST /api/v1/passes - Issue new pass
router.post('/', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), passController.issuePass);

// PUT /api/v1/passes/:id - Update pass
router.put('/:id', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), passController.updatePass);

// DELETE /api/v1/passes/:id - Delete pass
router.delete('/:id', requireAuth({ roles: ['super_admin', 'school_admin'] }), passController.deletePass);

// POST /api/v1/passes/:id/revoke - Revoke pass
router.post('/:id/revoke', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), passController.revokePass);

// POST /api/v1/passes/:id/reactivate - Reactivate pass
router.post('/:id/reactivate', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), passController.reactivatePass);

// GET /api/v1/passes/:id/qr - Get pass QR code
router.get('/:id/qr', passController.getPassQRCode);

// GET /api/v1/passes/student/:studentId - Get passes for specific student
router.get('/student/:studentId', passController.getPassesByStudent);

export default router;