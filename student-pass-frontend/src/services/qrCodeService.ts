import QRCode from 'qrcode';
import { createHash } from '../utils/crypto-mock';

export interface QRPassData {
  passId: string;
  studentId: string;
  passType: 'TEMPORARY' | 'PERMANENT' | 'VISITOR';
  validFrom: string;
  validTo: string;
  permissions: string[];
  signature: string;
  timestamp: number;
}

export class QRCodeService {
  private static readonly SECRET_KEY = process.env.REACT_APP_QR_SECRET || 'default-secret-key';

  static generateSignature(data: Omit<QRPassData, 'signature' | 'timestamp'>): string {
    const payload = JSON.stringify(data);
    return createHash('sha256').update(payload + this.SECRET_KEY).digest('hex');
  }

  static async generateQRCode(passData: Omit<QRPassData, 'signature' | 'timestamp'>): Promise<string> {
    const timestamp = Date.now();
    const signature = this.generateSignature(passData);
    
    const qrData: QRPassData = {
      ...passData,
      signature,
      timestamp,
    };

    try {
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 256,
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('QR Code generation failed:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  static verifyQRData(qrDataString: string): { isValid: boolean; data?: QRPassData; error?: string } {
    try {
      const qrData: QRPassData = JSON.parse(qrDataString);
      
      // Verify required fields
      if (!qrData.passId || !qrData.studentId || !qrData.signature) {
        return { isValid: false, error: 'Missing required fields' };
      }

      // Verify signature
      const expectedSignature = this.generateSignature({
        passId: qrData.passId,
        studentId: qrData.studentId,
        passType: qrData.passType,
        validFrom: qrData.validFrom,
        validTo: qrData.validTo,
        permissions: qrData.permissions,
      });

      if (qrData.signature !== expectedSignature) {
        return { isValid: false, error: 'Invalid signature' };
      }

      // Check if pass is still valid
      const now = new Date();
      const validFrom = new Date(qrData.validFrom);
      const validTo = new Date(qrData.validTo);

      if (now < validFrom) {
        return { isValid: false, error: 'Pass not yet valid' };
      }

      if (now > validTo) {
        return { isValid: false, error: 'Pass has expired' };
      }

      return { isValid: true, data: qrData };
    } catch (error) {
      return { isValid: false, error: 'Invalid QR code format' };
    }
  }

  static isPassExpired(validTo: string): boolean {
    return new Date() > new Date(validTo);
  }

  static getTimeRemaining(validTo: string): string {
    const now = new Date();
    const expiry = new Date(validTo);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  }
}