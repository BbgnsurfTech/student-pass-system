"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const file_upload_service_1 = require("../files/file-upload.service");
const email_service_1 = require("../notifications/email.service");
const audit_log_service_1 = require("../audit/audit-log.service");
const student_application_dto_1 = require("../students/dto/student-application.dto");
let ApplicationsService = class ApplicationsService {
    constructor(prisma, fileUploadService, emailService, auditLogService) {
        this.prisma = prisma;
        this.fileUploadService = fileUploadService;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
    }
    async create(createApplicationDto) {
        // Check if student ID already exists
        const existingApplication = await this.prisma.studentApplication.findUnique({
            where: { studentId: createApplicationDto.studentId },
        });
        if (existingApplication) {
            throw new common_1.ConflictException('An application with this student ID already exists');
        }
        // Verify school exists
        const school = await this.prisma.school.findUnique({
            where: { id: createApplicationDto.schoolId },
        });
        if (!school || !school.isActive) {
            throw new common_1.BadRequestException('Invalid or inactive school');
        }
        // Verify department exists (if provided)
        if (createApplicationDto.departmentId) {
            const department = await this.prisma.department.findUnique({
                where: { id: createApplicationDto.departmentId },
            });
            if (!department || department.schoolId !== createApplicationDto.schoolId) {
                throw new common_1.BadRequestException('Invalid department for the selected school');
            }
        }
        try {
            const application = await this.prisma.studentApplication.create({
                data: {
                    ...createApplicationDto,
                    dateOfBirth: createApplicationDto.dateOfBirth
                        ? new Date(createApplicationDto.dateOfBirth)
                        : null,
                    enrollmentDate: createApplicationDto.enrollmentDate
                        ? new Date(createApplicationDto.enrollmentDate)
                        : null,
                    graduationDate: createApplicationDto.graduationDate
                        ? new Date(createApplicationDto.graduationDate)
                        : null,
                },
                include: {
                    school: {
                        select: { name: true, code: true },
                    },
                    department: {
                        select: { name: true, code: true },
                    },
                },
            });
            // Send confirmation email
            await this.emailService.sendApplicationConfirmation({
                email: application.email,
                studentName: `${application.firstName} ${application.lastName}`,
                studentId: application.studentId,
                applicationId: application.id,
                schoolName: application.school.name,
            });
            // Log the application submission
            await this.auditLogService.create({
                action: 'APPLICATION_SUBMITTED',
                resourceType: 'StudentApplication',
                resourceId: application.id,
                newValues: { studentId: application.studentId },
                ipAddress: null, // Will be captured from request context
            });
            return this.mapToResponseDto(application);
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.ConflictException('Student ID already exists');
            }
            throw error;
        }
    }
    async uploadDocuments(applicationId, files, documentTypes) {
        const application = await this.prisma.studentApplication.findUnique({
            where: { id: applicationId },
        });
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        if (application.status !== student_application_dto_1.ApplicationStatus.PENDING) {
            throw new common_1.BadRequestException('Cannot upload documents for non-pending applications');
        }
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No files provided');
        }
        if (files.length !== documentTypes.length) {
            throw new common_1.BadRequestException('Number of files must match number of document types');
        }
        const uploadedDocuments = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const documentType = documentTypes[i];
            // Validate file
            await this.fileUploadService.validateFile(file, 'document');
            // Upload file
            const filePath = await this.fileUploadService.uploadApplicationDocument(applicationId, file, documentType);
            // Save document record
            const document = await this.prisma.applicationDocument.create({
                data: {
                    applicationId,
                    documentType,
                    fileName: file.originalname,
                    filePath,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                },
            });
            uploadedDocuments.push(document);
        }
        // Update application status to under review if documents are uploaded
        await this.prisma.studentApplication.update({
            where: { id: applicationId },
            data: { status: student_application_dto_1.ApplicationStatus.UNDER_REVIEW },
        });
        return {
            message: 'Documents uploaded successfully',
            documents: uploadedDocuments,
        };
    }
    async findAll(query, user) {
        const { page = 1, limit = 10, status, schoolId, search, fromDate, toDate, } = query;
        const offset = (page - 1) * limit;
        // Build where clause based on user role and permissions
        const where = {};
        // Role-based filtering
        if (user.role.name === 'school_admin' || user.role.name === 'staff') {
            where.schoolId = user.schoolId;
        }
        else if (schoolId) {
            where.schoolId = schoolId;
        }
        // Status filter
        if (status) {
            where.status = status;
        }
        // Date range filter
        if (fromDate || toDate) {
            where.appliedAt = {};
            if (fromDate)
                where.appliedAt.gte = new Date(fromDate);
            if (toDate)
                where.appliedAt.lte = new Date(toDate);
        }
        // Search filter
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { studentId: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [applications, total] = await Promise.all([
            this.prisma.studentApplication.findMany({
                where,
                include: {
                    school: {
                        select: { name: true, code: true },
                    },
                    department: {
                        select: { name: true, code: true },
                    },
                    reviewedBy: {
                        select: { firstName: true, lastName: true, email: true },
                    },
                },
                orderBy: { appliedAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            this.prisma.studentApplication.count({ where }),
        ]);
        return {
            data: applications.map(this.mapToResponseDto),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    async findOne(id, user) {
        const application = await this.prisma.studentApplication.findUnique({
            where: { id },
            include: {
                school: true,
                department: true,
                reviewedBy: {
                    select: { firstName: true, lastName: true, email: true },
                },
                documents: true,
            },
        });
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        // Check permissions
        if ((user.role.name === 'school_admin' || user.role.name === 'staff') &&
            application.schoolId !== user.schoolId) {
            throw new common_1.ForbiddenException('Access denied to this application');
        }
        return this.mapToResponseDto(application);
    }
    async reviewApplication(id, reviewDto, reviewerId) {
        const application = await this.prisma.studentApplication.findUnique({
            where: { id },
            include: { school: true, department: true },
        });
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        // Validate status transition
        if (application.status === student_application_dto_1.ApplicationStatus.APPROVED) {
            throw new common_1.BadRequestException('Application is already approved');
        }
        if (application.status === student_application_dto_1.ApplicationStatus.REJECTED) {
            throw new common_1.BadRequestException('Application is already rejected');
        }
        const oldValues = {
            status: application.status,
            reviewedAt: application.reviewedAt,
            reviewComments: application.reviewComments,
        };
        // Update application
        const updatedApplication = await this.prisma.studentApplication.update({
            where: { id },
            data: {
                status: reviewDto.status,
                reviewedAt: new Date(),
                reviewedById: reviewerId,
                reviewComments: reviewDto.reviewComments,
            },
            include: {
                school: true,
                department: true,
                reviewedBy: {
                    select: { firstName: true, lastName: true, email: true },
                },
            },
        });
        // If approved, create student record and generate pass
        if (reviewDto.status === student_application_dto_1.ApplicationStatus.APPROVED) {
            await this.createApprovedStudent(updatedApplication);
        }
        // Send notification email
        await this.emailService.sendApplicationStatusUpdate({
            email: updatedApplication.email,
            studentName: `${updatedApplication.firstName} ${updatedApplication.lastName}`,
            status: reviewDto.status,
            comments: reviewDto.reviewComments,
            schoolName: updatedApplication.school.name,
        });
        // Log the review action
        await this.auditLogService.create({
            userId: reviewerId,
            action: 'APPLICATION_REVIEWED',
            resourceType: 'StudentApplication',
            resourceId: id,
            oldValues,
            newValues: {
                status: reviewDto.status,
                reviewComments: reviewDto.reviewComments,
            },
        });
        return this.mapToResponseDto(updatedApplication);
    }
    async getApplicationStatus(id) {
        const application = await this.prisma.studentApplication.findUnique({
            where: { id },
            select: {
                id: true,
                studentId: true,
                status: true,
                appliedAt: true,
                reviewedAt: true,
            },
        });
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        return application;
    }
    async remove(id, user) {
        const application = await this.prisma.studentApplication.findUnique({
            where: { id },
        });
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        // Check permissions
        if (user.role.name !== 'admin' &&
            (user.role.name === 'school_admin' && application.schoolId !== user.schoolId)) {
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        // Don't allow deletion of approved applications
        if (application.status === student_application_dto_1.ApplicationStatus.APPROVED) {
            throw new common_1.BadRequestException('Cannot delete approved applications');
        }
        await this.prisma.studentApplication.delete({
            where: { id },
        });
        // Log the deletion
        await this.auditLogService.create({
            userId: user.id,
            action: 'APPLICATION_DELETED',
            resourceType: 'StudentApplication',
            resourceId: id,
            oldValues: { studentId: application.studentId },
        });
        return { message: 'Application deleted successfully' };
    }
    async getStatistics(user) {
        const where = {};
        // Role-based filtering
        if (user.role.name === 'school_admin' || user.role.name === 'staff') {
            where.schoolId = user.schoolId;
        }
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const [total, pending, approved, rejected, underReview, thisMonth, thisWeek,] = await Promise.all([
            this.prisma.studentApplication.count({ where }),
            this.prisma.studentApplication.count({
                where: { ...where, status: student_application_dto_1.ApplicationStatus.PENDING },
            }),
            this.prisma.studentApplication.count({
                where: { ...where, status: student_application_dto_1.ApplicationStatus.APPROVED },
            }),
            this.prisma.studentApplication.count({
                where: { ...where, status: student_application_dto_1.ApplicationStatus.REJECTED },
            }),
            this.prisma.studentApplication.count({
                where: { ...where, status: student_application_dto_1.ApplicationStatus.UNDER_REVIEW },
            }),
            this.prisma.studentApplication.count({
                where: { ...where, appliedAt: { gte: startOfMonth } },
            }),
            this.prisma.studentApplication.count({
                where: { ...where, appliedAt: { gte: startOfWeek } },
            }),
        ]);
        return {
            total,
            pending,
            approved,
            rejected,
            underReview,
            thisMonth,
            thisWeek,
        };
    }
    async createApprovedStudent(application) {
        // Create student record from approved application
        const student = await this.prisma.student.create({
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
                enrollmentDate: application.enrollmentDate,
                graduationDate: application.graduationDate,
                photoUrl: application.photoUrl,
            },
        });
        // Generate pass for the student
        const passService = new (await Promise.resolve().then(() => __importStar(require('../passes/passes.service')))).PassesService(this.prisma, null, // QR service would be injected here
        this.auditLogService);
        await passService.generatePass(student.id, application.reviewedById);
        return student;
    }
    mapToResponseDto(application) {
        return {
            id: application.id,
            studentId: application.studentId,
            email: application.email,
            firstName: application.firstName,
            lastName: application.lastName,
            status: application.status,
            appliedAt: application.appliedAt,
            reviewedAt: application.reviewedAt,
            reviewedById: application.reviewedById,
            reviewComments: application.reviewComments,
            createdAt: application.createdAt,
            updatedAt: application.updatedAt,
        };
    }
};
exports.ApplicationsService = ApplicationsService;
exports.ApplicationsService = ApplicationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaService !== "undefined" && prisma_service_1.PrismaService) === "function" ? _a : Object, typeof (_b = typeof file_upload_service_1.FileUploadService !== "undefined" && file_upload_service_1.FileUploadService) === "function" ? _b : Object, typeof (_c = typeof email_service_1.EmailService !== "undefined" && email_service_1.EmailService) === "function" ? _c : Object, typeof (_d = typeof audit_log_service_1.AuditLogService !== "undefined" && audit_log_service_1.AuditLogService) === "function" ? _d : Object])
], ApplicationsService);
//# sourceMappingURL=applications.service.js.map