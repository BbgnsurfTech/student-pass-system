"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
// All user routes require authentication
router.use((0, auth_1.requireAuth)());
// GET /api/v1/users - Get all users (paginated)
router.get('/', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin'] }), userController.getUsers);
// GET /api/v1/users/:id - Get user by ID
router.get('/:id', userController.getUserById);
// POST /api/v1/users - Create new user
router.post('/', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin'] }), userController.createUser);
// PUT /api/v1/users/:id - Update user
router.put('/:id', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin'] }), userController.updateUser);
// DELETE /api/v1/users/:id - Delete user (soft delete)
router.delete('/:id', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin'] }), userController.deleteUser);
// PATCH /api/v1/users/:id/activate - Activate user account
router.patch('/:id/activate', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin'] }), userController.activateUser);
// PATCH /api/v1/users/:id/deactivate - Deactivate user account
router.patch('/:id/deactivate', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin'] }), userController.deactivateUser);
// GET /api/v1/users/:id/permissions - Get user permissions
router.get('/:id/permissions', userController.getUserPermissions);
exports.default = router;
//# sourceMappingURL=user.routes.js.map