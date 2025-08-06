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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PassesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const qr_code_service_1 = require("./qr-code.service");
const audit_log_service_1 = require("../audit/audit-log.service");
const cache_service_1 = require("../cache/cache.service");
let PassesService = class PassesService {
    constructor(prisma, qrCodeService, auditLogService, cacheService) {
        this.prisma = prisma;
        this.qrCodeService = qrCodeService;
        this.auditLogService = auditLogService;
        this.cacheService = cacheService;
    }
    async generatePass(studentId, issuedById) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            include: { school: true },
        });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        if (student.status !== 'active') {
            throw new common_1.BadRequestException('Cannot generate pass for inactive student');
        }
        // Check if student already has an active pass
        const existingPass = await this.prisma.pass.findFirst({
            where: {
                studentId,
                status: 'active',
                expiryDate: { gt: new Date() },
            },
        });
        if (existingPass) {
            throw new common_1.BadRequestException('Student already has an active pass');
        }
        // Generate unique pass number and QR code
        const passNumber = await this.generatePassNumber(student.school.code);
        const qrCodeData = await this.qrCodeService.generateQRCode({
            passId: '', // Will be updated after creation
            studentId,
            schoolId: student.schoolId,
            timestamp: new Date().toISOString(),
        });
        // Calculate expiry date (1 year from issue)
        const issueDate = new Date();
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        const pass = await this.prisma.pass.create({
            data: {
                studentId,
                passNumber,
                qrCode: qrCodeData.qrCode,
                issueDate,
                expiryDate,
                status: 'active',
                passType: 'standard',
                issuedById,
            },
            include: {
                student: {
                    include: { school: true, department: true },
                },
                issuedBy: {
                    select: { firstName: true, lastName: true, email: true },
                },
            },
        });
        // Update QR code with actual pass ID
        await this.qrCodeService.updateQRCodeData(pass.id, {
            passId: pass.id,
            studentId,
            schoolId: student.schoolId,
            timestamp: new Date().toISOString(),
        });
        // Cache the pass for quick verification
        if (this.cacheService) {
            await this.cacheService.set(`pass:${pass.qrCode}`, pass, 3600); // 1 hour cache
        }
        // Log pass generation
        await this.auditLogService.create({
            userId: issuedById,
            action: 'PASS_GENERATED',
            resourceType: 'Pass',
            resourceId: pass.id,
            newValues: {
                studentId,
                passNumber: pass.passNumber,
                expiryDate: pass.expiryDate,
            },
        });
        return pass;
    }
    async verifyPass(qrCode) {
        try {
            // Try to get from cache first
            let pass = null;
            if (this.cacheService) {
                pass = await this.cacheService.get(`pass:${qrCode}`);
            }
            // If not in cache, get from database
            if (!pass) {
                pass = await this.prisma.pass.findUnique({
                    where: { qrCode },
                    include: {
                        student: {
                            include: { school: true, department: true },
                        },
                    },
                });
                if (pass && this.cacheService) {
                    // Cache for future requests
                    await this.cacheService.set(`pass:${qrCode}`, pass, 1800); // 30 minutes
                }
            }
            if (!pass) {
                return {
                    valid: false,
                    reason: 'Pass not found',
                    accessGranted: false,
                };
            }
            // Check if pass is active
            if (pass.status !== 'active') {
                return {
                    valid: false,
                    pass,
                    reason: `Pass is ${pass.status}`,
                    accessGranted: false,
                };
            }
            // Check if pass is expired
            if (new Date() > new Date(pass.expiryDate)) {
                // Auto-expire the pass
                await this.prisma.pass.update({
                    where: { id: pass.id },
                    data: { status: 'expired' },
                });
                return {
                    valid: false,
                    pass,
                    reason: 'Pass has expired',
                    accessGranted: false,
                };
            }
            // Check student status
            if (pass.student.status !== 'active') {
                return {
                    valid: false,
                    pass,
                    student: pass.student,
                    reason: `Student is ${pass.student.status}`,
                    accessGranted: false,
                };
            }
            // Verify QR code integrity
            const isValidQR = await this.qrCodeService.verifyQRCode(qrCode, {
                passId: pass.id,
                studentId: pass.studentId,
                schoolId: pass.student.schoolId,
            });
            if (!isValidQR) {
                return {
                    valid: false,
                    pass,
                    student: pass.student,
                    reason: 'Invalid QR code',
                    accessGranted: false,
                };
            }
            return {
                valid: true,
                pass,
                student: pass.student,
                accessGranted: true,
            };
        }
        catch (error) {
            console.error('Pass verification error:', error);
            return {
                valid: false,
                reason: 'Verification error',
                accessGranted: false,
            };
        }
    }
    async logAccess(accessAttempt) {
        const verification = await this.verifyPass(accessAttempt.qrCode);
        const accessLog = await this.prisma.accessLog.create({
            data: {
                studentId: verification.student?.id || null,
                passId: verification.pass?.id || null,
                accessPointId: accessAttempt.accessPointId,
                accessTime: accessAttempt.timestamp || new Date(),
                accessType: 'entry', // Could be determined from access point configuration
                status: verification.accessGranted ? 'granted' : 'denied',
                reason: verification.reason || null,
                deviceInfo: accessAttempt.deviceInfo || null,
            },
        });
        // Log to audit trail
        await this.auditLogService.create({
            action: 'ACCESS_ATTEMPT',
            resourceType: 'AccessLog',
            resourceId: accessLog.id,
            newValues: {
                studentId: verification.student?.id,
                accessPointId: accessAttempt.accessPointId,
                status: verification.accessGranted ? 'granted' : 'denied',
                reason: verification.reason,
            },
        });
        // Real-time notification could be sent here
        // await this.notificationService.sendAccessNotification(accessLog);
    }
    async deactivatePass(passId, revokedById, reason) {
        const pass = await this.prisma.pass.findUnique({
            where: { id: passId },
            include: { student: true },
        });
        if (!pass) {
            throw new common_1.NotFoundException('Pass not found');
        }
        if (pass.status !== 'active') {
            throw new common_1.BadRequestException('Pass is not active');
        }
        const updatedPass = await this.prisma.pass.update({
            where: { id: passId },
            data: {
                status: 'revoked',
                revokedById,
                revokedAt: new Date(),
                revokeReason: reason,
            },
            include: {
                student: {
                    include: { school: true },
                },
                revokedBy: {
                    select: { firstName: true, lastName: true },
                },
            },
        });
        // Remove from cache
        if (this.cacheService) {
            await this.cacheService.delete(`pass:${pass.qrCode}`);
        }
        // Log the deactivation
        await this.auditLogService.create({
            userId: revokedById,
            action: 'PASS_REVOKED',
            resourceType: 'Pass',
            resourceId: passId,
            oldValues: { status: 'active' },
            newValues: {
                status: 'revoked',
                revokeReason: reason,
            },
        });
        return updatedPass;
    }
    async getStudentPasses(studentId) {
        return this.prisma.pass.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
            include: {
                issuedBy: {
                    select: { firstName: true, lastName: true },
                },
                revokedBy: {
                    select: { firstName: true, lastName: true },
                },
            },
        });
    }
    async getPassesWithFilters(filters, user) {
        const where = {};
        // Role-based filtering
        if (user.role.name === 'school_admin' || user.role.name === 'staff') {
            where.student = { schoolId: user.schoolId };
        }
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.schoolId && user.role.name === 'admin') {
            where.student = { schoolId: filters.schoolId };
        }
        if (filters.studentId) {
            where.student = {
                ...where.student,
                studentId: { contains: filters.studentId, mode: 'insensitive' },
            };
        }
        if (filters.fromDate || filters.toDate) {
            where.issueDate = {};
            if (filters.fromDate)
                where.issueDate.gte = new Date(filters.fromDate);
            if (filters.toDate)
                where.issueDate.lte = new Date(filters.toDate);
        }
        const passes = await this.prisma.pass.findMany({
            where,
            include: {
                student: {
                    select: {
                        studentId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        school: {
                            select: { name: true, code: true },
                        },
                    },
                },
                issuedBy: {
                    select: { firstName: true, lastName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (filters.page - 1) * filters.limit,
            take: filters.limit,
        });
        const total = await this.prisma.pass.count({ where });
        return {
            data: passes,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: Math.ceil(total / filters.limit),
            },
        };
    }
    async generatePassNumber(schoolCode) {
        const year = new Date().getFullYear();
        const count = await this.prisma.pass.count({
            where: {
                passNumber: {
                    startsWith: `${schoolCode}${year}`,
                },
            },
        });
        return `${schoolCode}${year}${String(count + 1).padStart(6, '0')}`;
    }
    async getAccessLogs(filters, user) {
        const where = {};
        // Role-based filtering
        if (user.role.name === 'school_admin' || user.role.name === 'staff') {
            where.accessPoint = { schoolId: user.schoolId };
        }
        if (filters.studentId) {
            where.student = {
                studentId: { contains: filters.studentId, mode: 'insensitive' },
            };
        }
        if (filters.accessPointId) {
            where.accessPointId = filters.accessPointId;
        }
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.fromDate || filters.toDate) {
            where.accessTime = {};
            if (filters.fromDate)
                where.accessTime.gte = new Date(filters.fromDate);
            if (filters.toDate)
                where.accessTime.lte = new Date(filters.toDate);
        }
        const logs = await this.prisma.accessLog.findMany({
            where,
            include: {
                student: {
                    select: {
                        studentId: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                pass: {
                    select: {
                        passNumber: true,
                        status: true,
                    },
                },
                accessPoint: {
                    select: {
                        name: true,
                        location: true,
                    },
                },
            },
            orderBy: { accessTime: 'desc' },
            skip: (filters.page - 1) * filters.limit,
            take: filters.limit,
        });
        const total = await this.prisma.accessLog.count({ where });
        return {
            data: logs,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: Math.ceil(total / filters.limit),
            },
        };
    }
};
exports.PassesService = PassesService;
exports.PassesService = PassesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaService !== "undefined" && prisma_service_1.PrismaService) === "function" ? _a : Object, qr_code_service_1.QRCodeService, typeof (_b = typeof audit_log_service_1.AuditLogService !== "undefined" && audit_log_service_1.AuditLogService) === "function" ? _b : Object, typeof (_c = typeof cache_service_1.CacheService !== "undefined" && cache_service_1.CacheService) === "function" ? _c : Object])
], PassesService);
//# sourceMappingURL=passes.service.js.map