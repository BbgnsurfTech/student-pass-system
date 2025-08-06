import { ConfigService } from '@nestjs/config';
export interface QRCodeData {
    passId: string;
    studentId: string;
    schoolId: string;
    timestamp: string;
    signature?: string;
}
export interface QRCodeResult {
    qrCode: string;
    qrCodeImage: string;
    data: QRCodeData;
}
export declare class QRCodeService {
    private readonly configService;
    private readonly secretKey;
    constructor(configService: ConfigService);
    generateQRCode(data: Omit<QRCodeData, 'signature'>): Promise<QRCodeResult>;
    verifyQRCode(qrCodeString: string, expectedData: Partial<QRCodeData>): Promise<boolean>;
    updateQRCodeData(passId: string, data: Omit<QRCodeData, 'signature'>): Promise<QRCodeResult>;
    generateTemporaryQRCode(studentId: string, schoolId: string, validityMinutes?: number): Promise<QRCodeResult>;
    verifyTemporaryQRCode(qrCodeString: string): Promise<boolean>;
    private createSignature;
    private verifySignature;
    generateBulkQRCodes(students: Array<{
        id: string;
        studentId: string;
        schoolId: string;
    }>): Promise<Array<{
        studentId: string;
        qrResult: QRCodeResult;
    }>>;
    decodeQRCode(qrCodeString: string): QRCodeData | null;
    generateQRCodeBuffer(qrCodeString: string): Promise<Buffer>;
    generateCustomStyledQRCode(data: Omit<QRCodeData, 'signature'>, style?: {
        darkColor?: string;
        lightColor?: string;
        width?: number;
        logo?: string;
    }): Promise<QRCodeResult>;
}
//# sourceMappingURL=qr-code.service.d.ts.map