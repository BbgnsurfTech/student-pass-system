import { PrismaService } from '../database/prisma.service';
import { QRCodeService } from './qr-code.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CacheService } from '../cache/cache.service';
export interface PassVerificationResult {
    valid: boolean;
    pass?: any;
    student?: any;
    reason?: string;
    accessGranted: boolean;
}
export interface AccessAttempt {
    qrCode: string;
    accessPointId: string;
    deviceInfo?: any;
    timestamp?: Date;
}
export declare class PassesService {
    private readonly prisma;
    private readonly qrCodeService;
    private readonly auditLogService;
    private readonly cacheService?;
    constructor(prisma: PrismaService, qrCodeService: QRCodeService, auditLogService: AuditLogService, cacheService?: CacheService);
    generatePass(studentId: string, issuedById: string): Promise<any>;
    verifyPass(qrCode: string): Promise<PassVerificationResult>;
    logAccess(accessAttempt: AccessAttempt): Promise<void>;
    deactivatePass(passId: string, revokedById: string, reason?: string): Promise<any>;
    getStudentPasses(studentId: string): Promise<any>;
    getPassesWithFilters(filters: any, user: any): Promise<{
        data: any;
        pagination: {
            page: any;
            limit: any;
            total: any;
            totalPages: number;
        };
    }>;
    private generatePassNumber;
    getAccessLogs(filters: any, user: any): Promise<{
        data: any;
        pagination: {
            page: any;
            limit: any;
            total: any;
            totalPages: number;
        };
    }>;
}
//# sourceMappingURL=passes.service.d.ts.map