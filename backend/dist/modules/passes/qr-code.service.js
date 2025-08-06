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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QRCodeService = void 0;
const common_1 = require("@nestjs/common");
const QRCode = __importStar(require("qrcode"));
const crypto = __importStar(require("crypto"));
const config_1 = require("@nestjs/config");
let QRCodeService = class QRCodeService {
    constructor(configService) {
        this.configService = configService;
        this.secretKey = this.configService.get('QR_SECRET_KEY') || 'default-secret-key';
    }
    async generateQRCode(data) {
        // Create signature for QR code security
        const signature = this.createSignature(data);
        const qrData = { ...data, signature };
        // Convert to JSON string
        const qrCodeString = JSON.stringify(qrData);
        // Generate QR code image
        const qrCodeImage = await QRCode.toDataURL(qrCodeString, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
            width: 256,
        });
        return {
            qrCode: qrCodeString,
            qrCodeImage,
            data: qrData,
        };
    }
    async verifyQRCode(qrCodeString, expectedData) {
        try {
            const data = JSON.parse(qrCodeString);
            // Verify signature
            if (!this.verifySignature(data)) {
                return false;
            }
            // Verify expected data matches
            if (expectedData.passId && data.passId !== expectedData.passId) {
                return false;
            }
            if (expectedData.studentId && data.studentId !== expectedData.studentId) {
                return false;
            }
            if (expectedData.schoolId && data.schoolId !== expectedData.schoolId) {
                return false;
            }
            // Check if QR code is not too old (prevent replay attacks)
            const qrTimestamp = new Date(data.timestamp);
            const now = new Date();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            if (now.getTime() - qrTimestamp.getTime() > maxAge) {
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('QR code verification error:', error);
            return false;
        }
    }
    async updateQRCodeData(passId, data) {
        return this.generateQRCode({ ...data, passId });
    }
    async generateTemporaryQRCode(studentId, schoolId, validityMinutes = 60) {
        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + validityMinutes);
        const data = {
            passId: `temp-${crypto.randomUUID()}`,
            studentId,
            schoolId,
            timestamp: new Date().toISOString(),
            expiresAt: expiryTime.toISOString(),
            type: 'temporary',
        };
        const signature = this.createSignature(data);
        const qrData = { ...data, signature };
        const qrCodeString = JSON.stringify(qrData);
        const qrCodeImage = await QRCode.toDataURL(qrCodeString, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#FF6B35', // Orange color for temporary passes
                light: '#FFFFFF',
            },
            width: 256,
        });
        return {
            qrCode: qrCodeString,
            qrCodeImage,
            data: qrData,
        };
    }
    async verifyTemporaryQRCode(qrCodeString) {
        try {
            const data = JSON.parse(qrCodeString);
            // Verify it's a temporary pass
            if (data.type !== 'temporary') {
                return false;
            }
            // Verify signature
            if (!this.verifySignature(data)) {
                return false;
            }
            // Check expiry
            if (data.expiresAt && new Date() > new Date(data.expiresAt)) {
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Temporary QR code verification error:', error);
            return false;
        }
    }
    createSignature(data) {
        const dataString = JSON.stringify({
            passId: data.passId,
            studentId: data.studentId,
            schoolId: data.schoolId,
            timestamp: data.timestamp,
            ...(data.expiresAt && { expiresAt: data.expiresAt }),
            ...(data.type && { type: data.type }),
        });
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(dataString)
            .digest('hex');
    }
    verifySignature(data) {
        const { signature, ...dataWithoutSignature } = data;
        const expectedSignature = this.createSignature(dataWithoutSignature);
        return signature === expectedSignature;
    }
    async generateBulkQRCodes(students) {
        const results = [];
        for (const student of students) {
            const qrResult = await this.generateQRCode({
                passId: `bulk-${crypto.randomUUID()}`,
                studentId: student.id,
                schoolId: student.schoolId,
                timestamp: new Date().toISOString(),
            });
            results.push({
                studentId: student.studentId,
                qrResult,
            });
        }
        return results;
    }
    decodeQRCode(qrCodeString) {
        try {
            return JSON.parse(qrCodeString);
        }
        catch (error) {
            return null;
        }
    }
    async generateQRCodeBuffer(qrCodeString) {
        return QRCode.toBuffer(qrCodeString, {
            errorCorrectionLevel: 'M',
            type: 'png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
            width: 256,
        });
    }
    async generateCustomStyledQRCode(data, style = {}) {
        const signature = this.createSignature(data);
        const qrData = { ...data, signature };
        const qrCodeString = JSON.stringify(qrData);
        const qrCodeImage = await QRCode.toDataURL(qrCodeString, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: style.darkColor || '#000000',
                light: style.lightColor || '#FFFFFF',
            },
            width: style.width || 256,
        });
        // If a logo is provided, we could overlay it on the QR code
        // This would require additional image processing with libraries like Canvas or Sharp
        return {
            qrCode: qrCodeString,
            qrCodeImage,
            data: qrData,
        };
    }
};
exports.QRCodeService = QRCodeService;
exports.QRCodeService = QRCodeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], QRCodeService);
//# sourceMappingURL=qr-code.service.js.map