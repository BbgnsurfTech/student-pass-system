"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pass_controller_1 = require("../controllers/pass.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const passController = new pass_controller_1.PassController();
// All pass routes require authentication
router.use((0, auth_1.requireAuth)());
// GET /api/v1/passes - Get all passes (paginated)
router.get('/', passController.getPasses);
// GET /api/v1/passes/:id - Get pass by ID
router.get('/:id', passController.getPassById);
// POST /api/v1/passes - Issue new pass
router.post('/', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), passController.issuePass);
// PUT /api/v1/passes/:id - Update pass
router.put('/:id', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), passController.updatePass);
// DELETE /api/v1/passes/:id - Delete pass
router.delete('/:id', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin'] }), passController.deletePass);
// POST /api/v1/passes/:id/revoke - Revoke pass
router.post('/:id/revoke', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), passController.revokePass);
// POST /api/v1/passes/:id/reactivate - Reactivate pass
router.post('/:id/reactivate', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), passController.reactivatePass);
// GET /api/v1/passes/:id/qr - Get pass QR code
router.get('/:id/qr', passController.getPassQRCode);
// GET /api/v1/passes/student/:studentId - Get passes for specific student
router.get('/student/:studentId', passController.getPassesByStudent);
exports.default = router;
//# sourceMappingURL=pass.routes.js.map