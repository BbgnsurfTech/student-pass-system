import { PrismaService } from '../database/prisma.service';
import { FileUploadService } from '../files/file-upload.service';
import { EmailService } from '../notifications/email.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateStudentApplicationDto, StudentApplicationResponseDto, ReviewApplicationDto, ListApplicationsQueryDto } from '../students/dto/student-application.dto';
export declare class ApplicationsService {
    private readonly prisma;
    private readonly fileUploadService;
    private readonly emailService;
    private readonly auditLogService;
    constructor(prisma: PrismaService, fileUploadService: FileUploadService, emailService: EmailService, auditLogService: AuditLogService);
    create(createApplicationDto: CreateStudentApplicationDto): Promise<StudentApplicationResponseDto>;
    uploadDocuments(applicationId: string, files: Express.Multer.File[], documentTypes: string[]): Promise<{
        message: string;
        documents: any[];
    }>;
    findAll(query: ListApplicationsQueryDto, user: any): Promise<{
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    findOne(id: string, user: any): Promise<StudentApplicationResponseDto>;
    reviewApplication(id: string, reviewDto: ReviewApplicationDto, reviewerId: string): Promise<StudentApplicationResponseDto>;
    getApplicationStatus(id: string): Promise<any>;
    remove(id: string, user: any): Promise<{
        message: string;
    }>;
    getStatistics(user: any): Promise<{
        total: any;
        pending: any;
        approved: any;
        rejected: any;
        underReview: any;
        thisMonth: any;
        thisWeek: any;
    }>;
    private createApprovedStudent;
    private mapToResponseDto;
}
//# sourceMappingURL=applications.service.d.ts.map