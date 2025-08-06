import { AccessService } from './access.service';
import { PassesService } from '../passes/passes.service';
export declare class VerifyPassDto {
    qrCode: string;
    accessPointId: string;
    deviceInfo?: any;
}
export declare class AccessLogQueryDto {
    page?: number;
    limit?: number;
    studentId?: string;
    accessPointId?: string;
    status?: 'granted' | 'denied';
    fromDate?: string;
    toDate?: string;
}
export declare class AccessController {
    private readonly accessService;
    private readonly passesService;
    constructor(accessService: AccessService, passesService: PassesService);
    verifyPass(verifyDto: VerifyPassDto): Promise<{
        timestamp: string;
        message: string;
        valid: boolean;
        pass?: any;
        student?: any;
        reason?: string;
        accessGranted: boolean;
    }>;
    verifyPassBatch(body: {
        qrCodes: string[];
        accessPointId: string;
    }, req: any): Promise<{
        valid: boolean;
        pass?: any;
        student?: any;
        reason?: string;
        accessGranted: boolean;
        qrCode: string;
    }[]>;
    getAccessLogs(query: AccessLogQueryDto, req: any): Promise<{
        data: any;
        pagination: {
            page: any;
            limit: any;
            total: any;
            totalPages: number;
        };
    }>;
    getAccessStatistics(req: any): Promise<any>;
    getLiveFeed(req: any): Promise<any>;
    testAccessPoint(req: any, body: {
        accessPointId: string;
    }): Promise<any>;
}
//# sourceMappingURL=access.controller.d.ts.map