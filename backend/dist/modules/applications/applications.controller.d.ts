import { ApplicationsService } from './applications.service';
import { CreateStudentApplicationDto, StudentApplicationResponseDto, ReviewApplicationDto, ListApplicationsQueryDto } from '../students/dto/student-application.dto';
export declare class ApplicationsController {
    private readonly applicationsService;
    constructor(applicationsService: ApplicationsService);
    create(createApplicationDto: CreateStudentApplicationDto): Promise<StudentApplicationResponseDto>;
    uploadDocuments(id: string, files: Express.Multer.File[], documentTypes: string[]): Promise<{
        message: string;
        documents: any[];
    }>;
    findAll(query: ListApplicationsQueryDto, req: any): Promise<{
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
    findOne(id: string, req: any): Promise<StudentApplicationResponseDto>;
    reviewApplication(id: string, reviewDto: ReviewApplicationDto, req: any): Promise<StudentApplicationResponseDto>;
    getApplicationStatus(id: string): Promise<any>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
    getStatistics(req: any): Promise<{
        total: any;
        pending: any;
        approved: any;
        rejected: any;
        underReview: any;
        thisMonth: any;
        thisWeek: any;
    }>;
}
//# sourceMappingURL=applications.controller.d.ts.map