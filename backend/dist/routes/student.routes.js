"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const student_controller_1 = require("../controllers/student.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const studentController = new student_controller_1.StudentController();
// All student routes require authentication
router.use((0, auth_1.requireAuth)());
// GET /api/v1/students - Get all students (paginated)
router.get('/', studentController.getStudents);
// GET /api/v1/students/:id - Get student by ID
router.get('/:id', studentController.getStudentById);
// POST /api/v1/students - Create new student
router.post('/', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), studentController.createStudent);
// PUT /api/v1/students/:id - Update student
router.put('/:id', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), studentController.updateStudent);
// DELETE /api/v1/students/:id - Delete student (soft delete)
router.delete('/:id', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin'] }), studentController.deleteStudent);
// GET /api/v1/students/:id/passes - Get student passes
router.get('/:id/passes', studentController.getStudentPasses);
// GET /api/v1/students/:id/access-logs - Get student access logs
router.get('/:id/access-logs', studentController.getStudentAccessLogs);
// PATCH /api/v1/students/:id/status - Update student status
router.patch('/:id/status', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), studentController.updateStudentStatus);
exports.default = router;
//# sourceMappingURL=student.routes.js.map