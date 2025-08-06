import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// All user routes require authentication
router.use(requireAuth());

// GET /api/v1/users - Get all users (paginated)
router.get('/', requireAuth({ roles: ['super_admin', 'school_admin'] }), userController.getUsers);

// GET /api/v1/users/:id - Get user by ID
router.get('/:id', userController.getUserById);

// POST /api/v1/users - Create new user
router.post('/', requireAuth({ roles: ['super_admin', 'school_admin'] }), userController.createUser);

// PUT /api/v1/users/:id - Update user
router.put('/:id', requireAuth({ roles: ['super_admin', 'school_admin'] }), userController.updateUser);

// DELETE /api/v1/users/:id - Delete user (soft delete)
router.delete('/:id', requireAuth({ roles: ['super_admin', 'school_admin'] }), userController.deleteUser);

// PATCH /api/v1/users/:id/activate - Activate user account
router.patch('/:id/activate', requireAuth({ roles: ['super_admin', 'school_admin'] }), userController.activateUser);

// PATCH /api/v1/users/:id/deactivate - Deactivate user account
router.patch('/:id/deactivate', requireAuth({ roles: ['super_admin', 'school_admin'] }), userController.deactivateUser);

// GET /api/v1/users/:id/permissions - Get user permissions
router.get('/:id/permissions', userController.getUserPermissions);

export default router;