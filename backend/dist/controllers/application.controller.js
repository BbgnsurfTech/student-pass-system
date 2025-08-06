"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationController = void 0;
const zod_1 = require("zod");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
// Validation schemas
const createApplicationSchema = zod_1.z.object({
    studentId: zod_1.z.string().min(1, 'Student ID is required'),
    email: zod_1.z.string().email('Invalid email format'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    middleName: zod_1.z.string().optional(),
    dateOfBirth: zod_1.z.string().transform((str) => new Date(str)).optional(),
    gender: zod_1.z.enum(['Male', 'Female', 'Other']).optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    emergencyContactName: zod_1.z.string().optional(),
    emergencyContactPhone: zod_1.z.string().optional(),
    schoolId: zod_1.z.string().uuid('Invalid school ID'),
    departmentId: zod_1.z.string().uuid('Invalid department ID').optional(),
    program: zod_1.z.string().optional(),
    yearOfStudy: zod_1.z.number().int().min(1).max(7).optional(),
    enrollmentDate: zod_1.z.string().transform((str) => new Date(str)).optional(),
    graduationDate: zod_1.z.string().transform((str) => new Date(str)).optional(),
});
const reviewApplicationSchema = zod_1.z.object({
    status: zod_1.z.enum(['approved', 'rejected', 'under_review'], {
        required_error: 'Status is required',
    }),
    reviewComments: zod_1.z.string().optional(),
});
const paginationSchema = zod_1.z.object({
    page: zod_1.z.string().transform(Number).refine(n => n > 0).optional(),
    limit: zod_1.z.string().transform(Number).refine(n => n > 0 && n <= 100).optional(),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['pending', 'approved', 'rejected', 'under_review']).optional(),
    school: zod_1.z.string().uuid().optional(),
    department: zod_1.z.string().uuid().optional(),
});
class ApplicationController {
    async getApplications(req, res) {
        try {
            const query = paginationSchema.parse(req.query);
            const page = query.page || 1;
            const limit = query.limit || 20;
            const skip = (page - 1) * limit;
            // Build where clause
            const where = {};
            if (query.search) {
                where.OR = [
                    { firstName: { contains: query.search, mode: 'insensitive' } },
                    { lastName: { contains: query.search, mode: 'insensitive' } },
                    { email: { contains: query.search, mode: 'insensitive' } },
                    { studentId: { contains: query.search, mode: 'insensitive' } },
                ];
            }
            if (query.status) {
                where.status = query.status;
            }
            if (query.school) {
                where.schoolId = query.school;
            }
            if (query.department) {
                where.departmentId = query.department;
            }
            // Restrict school admin to their school only
            if (req.user?.role?.name === 'school_admin' && req.user.schoolId) {
                where.schoolId = req.user.schoolId;
            }
            // Get applications with pagination
            const [applications, totalCount] = await Promise.all([
                database_1.default.studentApplication.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        school: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                        department: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                        reviewedBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        documents: {
                            select: {
                                id: true,
                                documentType: true,
                                fileName: true,
                                createdAt: true,
                            },
                        },
                    },
                    orderBy: { appliedAt: 'desc' },
                }),
                database_1.default.studentApplication.count({ where }),
            ]);
            const totalPages = Math.ceil(totalCount / limit);
            res.json({
                success: true,
                data: applications,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            else {
                logger_1.logger.error('Get applications error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get applications',
                });
            }
        }
    }
    async getApplicationById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError('Application ID is required', 400);
            }
            const application = await database_1.default.studentApplication.findUnique({
                where: { id },
                include: {
                    school: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            address: true,
                        },
                    },
                    department: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            headName: true,
                        },
                    },
                    reviewedBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    documents: {
                        select: {
                            id: true,
                            documentType: true,
                            fileName: true,
                            filePath: true,
                            fileSize: true,
                            mimeType: true,
                            createdAt: true,
                        },
                    },
                    student: {
                        select: {
                            id: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                },
            });
            if (!application) {
                throw new errors_1.AppError('Application not found', 404);
            }
            // Check access permissions
            const canAccessAnyApplication = ['super_admin', 'school_admin', 'staff'].includes(req.user?.role?.name || '');
            const isOwnApplication = req.user?.email === application.email;
            const isSameSchool = req.user?.schoolId === application.schoolId;
            if (!canAccessAnyApplication && !isOwnApplication) {
                throw new errors_1.AppError('Access denied', 403);
            }
            // School admin can only access applications from their school
            if (req.user?.role?.name === 'school_admin' && !isSameSchool) {
                throw new errors_1.AppError('Access denied', 403);
            }
            res.json({
                success: true,
                data: application,
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Get application by ID error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get application',
                });
            }
        }
    }
    async createApplication(req, res) {
        try {
            const validatedData = createApplicationSchema.parse(req.body);
            // Check if application with same student ID already exists
            const existingApplication = await database_1.default.studentApplication.findFirst({
                where: {
                    studentId: validatedData.studentId,
                    schoolId: validatedData.schoolId,
                },
            });
            if (existingApplication) {
                throw new errors_1.AppError('Application with this student ID already exists for this school', 409);
            }
            // Verify school exists
            const school = await database_1.default.school.findUnique({
                where: { id: validatedData.schoolId },
            });
            if (!school) {
                throw new errors_1.AppError('Invalid school ID', 400);
            }
            // Verify department exists if provided
            if (validatedData.departmentId) {
                const department = await database_1.default.department.findUnique({
                    where: { id: validatedData.departmentId },
                });
                if (!department) {
                    throw new errors_1.AppError('Invalid department ID', 400);
                }
                if (department.schoolId !== validatedData.schoolId) {
                    throw new errors_1.AppError('Department does not belong to the specified school', 400);
                }
            }
            // Create application
            const application = await database_1.default.studentApplication.create({
                data: {
                    ...validatedData,
                    status: 'pending',
                },
                include: {
                    school: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                    department: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
            });
            logger_1.logger.info(`Application created: ${application.studentId} for ${school.name}`);
            res.status(201).json({
                success: true,
                message: 'Application submitted successfully',
                data: application,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            else if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Create application error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to create application',
                });
            }
        }
    }
    async updateApplication(req, res) {
        try {
            const { id } = req.params;
            const validatedData = createApplicationSchema.partial().parse(req.body);
            if (!id) {
                throw new errors_1.AppError('Application ID is required', 400);
            }
            // Check if application exists
            const existingApplication = await database_1.default.studentApplication.findUnique({
                where: { id },
            });
            if (!existingApplication) {
                throw new errors_1.AppError('Application not found', 404);
            }
            // Check access permissions
            const canUpdateAnyApplication = ['super_admin', 'school_admin', 'staff'].includes(req.user?.role?.name || '');
            const isOwnApplication = req.user?.email === existingApplication.email;
            const isSameSchool = req.user?.schoolId === existingApplication.schoolId;
            if (!canUpdateAnyApplication && !isOwnApplication) {
                throw new errors_1.AppError('Access denied', 403);
            }
            // School admin can only update applications from their school
            if (req.user?.role?.name === 'school_admin' && !isSameSchool) {
                throw new errors_1.AppError('Access denied', 403);
            }
            // Students can only update pending applications
            if (req.user?.role?.name === 'student' && existingApplication.status !== 'pending') {
                throw new errors_1.AppError('You can only update pending applications', 400);
            }
            // Update application
            const updatedApplication = await database_1.default.studentApplication.update({
                where: { id },
                data: validatedData,
                include: {
                    school: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                    department: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
            });
            logger_1.logger.info(`Application updated: ${updatedApplication.studentId} by ${req.user?.email}`);
            res.json({
                success: true,
                message: 'Application updated successfully',
                data: updatedApplication,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            else if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Update application error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update application',
                });
            }
        }
    }
    async deleteApplication(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError('Application ID is required', 400);
            }
            // Check if application exists
            const existingApplication = await database_1.default.studentApplication.findUnique({
                where: { id },
            });
            if (!existingApplication) {
                throw new errors_1.AppError('Application not found', 404);
            }
            // Check access permissions
            const canDeleteAnyApplication = ['super_admin', 'school_admin'].includes(req.user?.role?.name || '');
            const isOwnApplication = req.user?.email === existingApplication.email;
            if (!canDeleteAnyApplication && !isOwnApplication) {
                throw new errors_1.AppError('Access denied', 403);
            }
            // Students can only delete pending applications
            if (req.user?.role?.name === 'student' && existingApplication.status !== 'pending') {
                throw new errors_1.AppError('You can only delete pending applications', 400);
            }
            // Cannot delete approved applications that have created students
            if (existingApplication.status === 'approved') {
                const student = await database_1.default.student.findUnique({
                    where: { applicationId: id },
                });
                if (student) {
                    throw new errors_1.AppError('Cannot delete approved application with existing student record', 400);
                }
            }
            // Delete application (this will cascade delete documents)
            await database_1.default.studentApplication.delete({
                where: { id },
            });
            logger_1.logger.info(`Application deleted: ${existingApplication.studentId} by ${req.user?.email}`);
            res.json({
                success: true,
                message: 'Application deleted successfully',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Delete application error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete application',
                });
            }
        }
    }
    async reviewApplication(req, res) {
        try {
            const { id } = req.params;
            const validatedData = reviewApplicationSchema.parse(req.body);
            if (!id) {
                throw new errors_1.AppError('Application ID is required', 400);
            }
            // Check if application exists
            const existingApplication = await database_1.default.studentApplication.findUnique({
                where: { id },
            });
            if (!existingApplication) {
                throw new errors_1.AppError('Application not found', 404);
            }
            // School admin can only review applications from their school
            if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== existingApplication.schoolId) {
                throw new errors_1.AppError('You can only review applications from your school', 403);
            }
            // Update application with review
            const reviewedApplication = await database_1.default.studentApplication.update({
                where: { id },
                data: {
                    status: validatedData.status,
                    reviewComments: validatedData.reviewComments,
                    reviewedAt: new Date(),
                    reviewedById: req.user.id,
                },
                include: {
                    school: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                    department: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                    reviewedBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });
            logger_1.logger.info(`Application reviewed: ${reviewedApplication.studentId} -> ${validatedData.status} by ${req.user?.email}`);
            res.json({
                success: true,
                message: 'Application reviewed successfully',
                data: reviewedApplication,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            else if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Review application error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to review application',
                });
            }
        }
    }
    async approveApplication(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError('Application ID is required', 400);
            }
            const result = await database_1.default.$transaction(async (tx) => {
                // Get application
                const application = await tx.studentApplication.findUnique({
                    where: { id },
                });
                if (!application) {
                    throw new errors_1.AppError('Application not found', 404);
                }
                if (application.status === 'approved') {
                    throw new errors_1.AppError('Application is already approved', 400);
                }
                // School admin can only approve applications from their school
                if (req.user?.role?.name === 'school_admin' && req.user.schoolId !== application.schoolId) {
                    throw new errors_1.AppError('You can only approve applications from your school', 403);
                }
                // Check if student record already exists
                const existingStudent = await tx.student.findFirst({
                    where: {
                        studentId: application.studentId,
                        schoolId: application.schoolId,
                    },
                });
                if (existingStudent) {
                    throw new errors_1.AppError('Student record already exists', 409);
                }
                // Update application status
                const updatedApplication = await tx.studentApplication.update({
                    where: { id },
                    data: {
                        status: 'approved',
                        reviewedAt: new Date(),
                        reviewedById: req.user.id,
                    },
                });
                // Create student record
                const student = await tx.student.create({
                    data: {
                        applicationId: application.id,
                        studentId: application.studentId,
                        email: application.email,
                        firstName: application.firstName,
                        lastName: application.lastName,
                        middleName: application.middleName,
                        dateOfBirth: application.dateOfBirth,
                        gender: application.gender,
                        phone: application.phone,
                        address: application.address,
                        emergencyContactName: application.emergencyContactName,
                        emergencyContactPhone: application.emergencyContactPhone,
                        schoolId: application.schoolId,
                        departmentId: application.departmentId,
                        program: application.program,
                        yearOfStudy: application.yearOfStudy,
                        enrollmentDate: application.enrollmentDate || new Date(),
                        graduationDate: application.graduationDate,
                        photoUrl: application.photoUrl,
                        status: 'active',
                    },
                });
                return { application: updatedApplication, student };
            });
            logger_1.logger.info(`Application approved and student created: ${result.student.studentId} by ${req.user?.email}`);
            res.json({
                success: true,
                message: 'Application approved and student record created successfully',
                data: {
                    application: result.application,
                    student: result.student,
                },
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Approve application error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to approve application',
                });
            }
        }
    }
    async rejectApplication(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            if (!id) {
                throw new errors_1.AppError('Application ID is required', 400);
            }
            await this.reviewApplication(req, res);
        }
        catch (error) {
            // Error handling is done in reviewApplication
            throw error;
        }
    }
    async getApplicationDocuments(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError('Application ID is required', 400);
            }
            // Check if application exists and user has access
            const application = await database_1.default.studentApplication.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    schoolId: true,
                },
            });
            if (!application) {
                throw new errors_1.AppError('Application not found', 404);
            }
            // Check access permissions
            const canAccessAnyApplication = ['super_admin', 'school_admin', 'staff'].includes(req.user?.role?.name || '');
            const isOwnApplication = req.user?.email === application.email;
            const isSameSchool = req.user?.schoolId === application.schoolId;
            if (!canAccessAnyApplication && !isOwnApplication) {
                throw new errors_1.AppError('Access denied', 403);
            }
            // School admin can only access applications from their school
            if (req.user?.role?.name === 'school_admin' && !isSameSchool) {
                throw new errors_1.AppError('Access denied', 403);
            }
            const documents = await database_1.default.applicationDocument.findMany({
                where: { applicationId: id },
                select: {
                    id: true,
                    documentType: true,
                    fileName: true,
                    filePath: true,
                    fileSize: true,
                    mimeType: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            });
            res.json({
                success: true,
                data: documents,
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            else {
                logger_1.logger.error('Get application documents error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get application documents',
                });
            }
        }
    }
}
exports.ApplicationController = ApplicationController;
//# sourceMappingURL=application.controller.js.map