import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
const studentController = new StudentController();

// All student routes require authentication
router.use(requireAuth());

// GET /api/v1/students - Get all students (paginated)
router.get('/', studentController.getStudents);

// GET /api/v1/students/:id - Get student by ID
router.get('/:id', studentController.getStudentById);

// POST /api/v1/students - Create new student
router.post('/', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), studentController.createStudent);

// PUT /api/v1/students/:id - Update student
router.put('/:id', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), studentController.updateStudent);

// DELETE /api/v1/students/:id - Delete student (soft delete)
router.delete('/:id', requireAuth({ roles: ['super_admin', 'school_admin'] }), studentController.deleteStudent);

// GET /api/v1/students/:id/passes - Get student passes
router.get('/:id/passes', studentController.getStudentPasses);

// GET /api/v1/students/:id/access-logs - Get student access logs
router.get('/:id/access-logs', studentController.getStudentAccessLogs);

// PATCH /api/v1/students/:id/status - Update student status
router.patch('/:id/status', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), studentController.updateStudentStatus);

export default router;