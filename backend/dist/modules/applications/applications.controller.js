"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const applications_service_1 = require("./applications.service");
const student_application_dto_1 = require("../students/dto/student-application.dto");
let ApplicationsController = class ApplicationsController {
    constructor(applicationsService) {
        this.applicationsService = applicationsService;
    }
    async create(createApplicationDto) {
        return this.applicationsService.create(createApplicationDto);
    }
    async uploadDocuments(id, files, documentTypes) {
        return this.applicationsService.uploadDocuments(id, files, documentTypes);
    }
    async findAll(query, req) {
        return this.applicationsService.findAll(query, req.user);
    }
    async findOne(id, req) {
        return this.applicationsService.findOne(id, req.user);
    }
    async reviewApplication(id, reviewDto, req) {
        return this.applicationsService.reviewApplication(id, reviewDto, req.user.id);
    }
    async getApplicationStatus(id) {
        return this.applicationsService.getApplicationStatus(id);
    }
    async remove(id, req) {
        return this.applicationsService.remove(id, req.user);
    }
    async getStatistics(req) {
        return this.applicationsService.getStatistics(req.user);
    }
};
exports.ApplicationsController = ApplicationsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a new student application' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Application submitted successfully',
        type: student_application_dto_1.StudentApplicationResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input data' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Student ID already exists' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [student_application_dto_1.CreateStudentApplicationDto]),
    __metadata("design:returntype", Promise)
], ApplicationsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('documents', 10)),
    (0, swagger_1.ApiOperation)({ summary: 'Upload documents for an application' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Documents uploaded successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Application not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid file format or size' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Body)('documentTypes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Array]),
    __metadata("design:returntype", Promise)
], ApplicationsController.prototype, "uploadDocuments", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'school_admin', 'staff'),
    (0, swagger_1.ApiOperation)({ summary: 'Get list of student applications with filters' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of applications retrieved successfully',
        type: [student_application_dto_1.StudentApplicationResponseDto],
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [student_application_dto_1.ListApplicationsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ApplicationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'school_admin', 'staff'),
    (0, swagger_1.ApiOperation)({ summary: 'Get application details by ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Application details retrieved successfully',
        type: student_application_dto_1.StudentApplicationResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Application not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ApplicationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/review'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'school_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Review and approve/reject an application' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Application reviewed successfully',
        type: student_application_dto_1.StudentApplicationResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Application not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid status transition' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, student_application_dto_1.ReviewApplicationDto, Object]),
    __metadata("design:returntype", Promise)
], ApplicationsController.prototype, "reviewApplication", null);
__decorate([
    (0, common_1.Get)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Check application status (public endpoint)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Application status retrieved successfully',
        schema: {
            properties: {
                id: { type: 'string' },
                studentId: { type: 'string' },
                status: { enum: Object.values(student_application_dto_1.ApplicationStatus) },
                appliedAt: { type: 'string', format: 'date-time' },
                reviewedAt: { type: 'string', format: 'date-time', nullable: true },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Application not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApplicationsController.prototype, "getApplicationStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'school_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an application (admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Application deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Application not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ApplicationsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('stats/summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'school_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get application statistics summary' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Statistics retrieved successfully',
        schema: {
            properties: {
                total: { type: 'number' },
                pending: { type: 'number' },
                approved: { type: 'number' },
                rejected: { type: 'number' },
                underReview: { type: 'number' },
                thisMonth: { type: 'number' },
                thisWeek: { type: 'number' },
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApplicationsController.prototype, "getStatistics", null);
exports.ApplicationsController = ApplicationsController = __decorate([
    (0, swagger_1.ApiTags)('Student Applications'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('applications'),
    __metadata("design:paramtypes", [applications_service_1.ApplicationsService])
], ApplicationsController);
//# sourceMappingURL=applications.controller.js.map