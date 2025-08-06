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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListApplicationsQueryDto = exports.ReviewApplicationDto = exports.StudentApplicationResponseDto = exports.CreateStudentApplicationDto = exports.Gender = exports.ApplicationStatus = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["PENDING"] = "pending";
    ApplicationStatus["APPROVED"] = "approved";
    ApplicationStatus["REJECTED"] = "rejected";
    ApplicationStatus["UNDER_REVIEW"] = "under_review";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
var Gender;
(function (Gender) {
    Gender["MALE"] = "male";
    Gender["FEMALE"] = "female";
    Gender["OTHER"] = "other";
})(Gender || (exports.Gender = Gender = {}));
class CreateStudentApplicationDto {
}
exports.CreateStudentApplicationDto = CreateStudentApplicationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'STU2024001', description: 'Student ID number' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 50),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9-]+$/, { message: 'Student ID can only contain letters, numbers, and hyphens' }),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'john.doe@university.edu', description: 'Student email address' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John', description: 'First name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    (0, class_validator_1.Matches)(/^[a-zA-Z\s]+$/, { message: 'First name can only contain letters and spaces' }),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Doe', description: 'Last name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    (0, class_validator_1.Matches)(/^[a-zA-Z\s]+$/, { message: 'Last name can only contain letters and spaces' }),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Michael', description: 'Middle name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    (0, class_validator_1.Matches)(/^[a-zA-Z\s]+$/, { message: 'Middle name can only contain letters and spaces' }),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "middleName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '1999-01-15', description: 'Date of birth' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: Gender, example: Gender.MALE, description: 'Gender' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Gender),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+1234567890', description: 'Phone number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsPhoneNumber)(),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '123 Main St, City, State, ZIP', description: 'Home address' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Jane Doe', description: 'Emergency contact name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "emergencyContactName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+0987654321', description: 'Emergency contact phone' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsPhoneNumber)(),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "emergencyContactPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-school-id', description: 'School/University ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "schoolId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'uuid-department-id', description: 'Department ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Computer Science', description: 'Program of study' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "program", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2, description: 'Year of study' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateStudentApplicationDto.prototype, "yearOfStudy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-09-01', description: 'Enrollment date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "enrollmentDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2028-06-30', description: 'Expected graduation date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateStudentApplicationDto.prototype, "graduationDate", void 0);
class StudentApplicationResponseDto {
}
exports.StudentApplicationResponseDto = StudentApplicationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid', description: 'Application ID' }),
    __metadata("design:type", String)
], StudentApplicationResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'STU2024001', description: 'Student ID' }),
    __metadata("design:type", String)
], StudentApplicationResponseDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'john.doe@university.edu', description: 'Student email' }),
    __metadata("design:type", String)
], StudentApplicationResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John', description: 'First name' }),
    __metadata("design:type", String)
], StudentApplicationResponseDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Doe', description: 'Last name' }),
    __metadata("design:type", String)
], StudentApplicationResponseDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ApplicationStatus, example: ApplicationStatus.PENDING, description: 'Application status' }),
    __metadata("design:type", String)
], StudentApplicationResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-01-15T10:30:00Z', description: 'Application submission date' }),
    __metadata("design:type", Date)
], StudentApplicationResponseDto.prototype, "appliedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-01-16T14:20:00Z', description: 'Application review date' }),
    __metadata("design:type", Date)
], StudentApplicationResponseDto.prototype, "reviewedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'uuid-admin-id', description: 'Admin who reviewed the application' }),
    __metadata("design:type", String)
], StudentApplicationResponseDto.prototype, "reviewedById", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Missing required documents', description: 'Review comments' }),
    __metadata("design:type", String)
], StudentApplicationResponseDto.prototype, "reviewComments", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T10:30:00Z', description: 'Creation timestamp' }),
    __metadata("design:type", Date)
], StudentApplicationResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-16T14:20:00Z', description: 'Last update timestamp' }),
    __metadata("design:type", Date)
], StudentApplicationResponseDto.prototype, "updatedAt", void 0);
class ReviewApplicationDto {
}
exports.ReviewApplicationDto = ReviewApplicationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ApplicationStatus, example: ApplicationStatus.APPROVED, description: 'New application status' }),
    (0, class_validator_1.IsEnum)(ApplicationStatus),
    __metadata("design:type", String)
], ReviewApplicationDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Application approved. Pass will be generated.', description: 'Review comments' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 500),
    __metadata("design:type", String)
], ReviewApplicationDto.prototype, "reviewComments", void 0);
class ListApplicationsQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 10;
    }
}
exports.ListApplicationsQueryDto = ListApplicationsQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Page number' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ListApplicationsQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10, description: 'Items per page' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ListApplicationsQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ApplicationStatus, description: 'Filter by status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ApplicationStatus),
    __metadata("design:type", String)
], ListApplicationsQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'uuid-school-id', description: 'Filter by school' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListApplicationsQueryDto.prototype, "schoolId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'John', description: 'Search by name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListApplicationsQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-01-01', description: 'Filter applications from date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ListApplicationsQueryDto.prototype, "fromDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-12-31', description: 'Filter applications to date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ListApplicationsQueryDto.prototype, "toDate", void 0);
//# sourceMappingURL=student-application.dto.js.map