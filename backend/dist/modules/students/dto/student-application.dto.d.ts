export declare enum ApplicationStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    UNDER_REVIEW = "under_review"
}
export declare enum Gender {
    MALE = "male",
    FEMALE = "female",
    OTHER = "other"
}
export declare class CreateStudentApplicationDto {
    studentId: string;
    email: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth?: string;
    gender?: Gender;
    phone?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    schoolId: string;
    departmentId?: string;
    program?: string;
    yearOfStudy?: number;
    enrollmentDate?: string;
    graduationDate?: string;
}
export declare class StudentApplicationResponseDto {
    id: string;
    studentId: string;
    email: string;
    firstName: string;
    lastName: string;
    status: ApplicationStatus;
    appliedAt: Date;
    reviewedAt?: Date;
    reviewedById?: string;
    reviewComments?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ReviewApplicationDto {
    status: ApplicationStatus;
    reviewComments?: string;
}
export declare class ListApplicationsQueryDto {
    page?: number;
    limit?: number;
    status?: ApplicationStatus;
    schoolId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
}
//# sourceMappingURL=student-application.dto.d.ts.map