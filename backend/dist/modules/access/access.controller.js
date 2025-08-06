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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessController = exports.AccessLogQueryDto = exports.VerifyPassDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const access_service_1 = require("./access.service");
const passes_service_1 = require("../passes/passes.service");
class VerifyPassDto {
}
exports.VerifyPassDto = VerifyPassDto;
class AccessLogQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 10;
    }
}
exports.AccessLogQueryDto = AccessLogQueryDto;
let AccessController = class AccessController {
    constructor(accessService, passesService) {
        this.accessService = accessService;
        this.passesService = passesService;
    }
    async verifyPass(verifyDto) {
        if (!verifyDto.qrCode || !verifyDto.accessPointId) {
            throw new common_1.BadRequestException('QR code and access point ID are required');
        }
        // Verify the pass
        const verification = await this.passesService.verifyPass(verifyDto.qrCode);
        // Log the access attempt
        await this.passesService.logAccess({
            qrCode: verifyDto.qrCode,
            accessPointId: verifyDto.accessPointId,
            deviceInfo: verifyDto.deviceInfo,
            timestamp: new Date(),
        });
        // Return verification result for the gate/card reader
        return {
            ...verification,
            timestamp: new Date().toISOString(),
            message: verification.accessGranted
                ? 'Access granted'
                : `Access denied: ${verification.reason}`,
        };
    }
    async verifyPassBatch(body, req) {
        const { qrCodes, accessPointId } = body;
        if (!qrCodes || !Array.isArray(qrCodes) || qrCodes.length === 0) {
            throw new common_1.BadRequestException('QR codes array is required');
        }
        if (qrCodes.length > 100) {
            throw new common_1.BadRequestException('Maximum 100 QR codes per batch');
        }
        const results = [];
        for (const qrCode of qrCodes) {
            try {
                const verification = await this.passesService.verifyPass(qrCode);
                // Log the access attempt
                await this.passesService.logAccess({
                    qrCode,
                    accessPointId,
                    timestamp: new Date(),
                });
                results.push({
                    qrCode,
                    ...verification,
                });
            }
            catch (error) {
                results.push({
                    qrCode,
                    valid: false,
                    accessGranted: false,
                    reason: 'Verification error',
                });
            }
        }
        return results;
    }
    async getAccessLogs(query, req) {
        return this.passesService.getAccessLogs(query, req.user);
    }
    async getAccessStatistics(req) {
        return this.accessService.getAccessStatistics(req.user);
    }
    async getLiveFeed(req) {
        return this.accessService.getLiveFeed(req.user);
    }
    async testAccessPoint(req, body) {
        return this.accessService.testAccessPoint(body.accessPointId, req.user);
    }
};
exports.AccessController = AccessController;
__decorate([
    (0, common_1.Post)('verify'),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify student pass for access (for card readers/gates)',
        description: 'This endpoint is used by card readers and access gates to verify QR codes'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Pass verification result',
        schema: {
            properties: {
                valid: { type: 'boolean' },
                accessGranted: { type: 'boolean' },
                student: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        studentId: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        photoUrl: { type: 'string' },
                        school: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                code: { type: 'string' },
                            },
                        },
                    },
                },
                pass: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        passNumber: { type: 'string' },
                        expiryDate: { type: 'string' },
                        status: { type: 'string' },
                    },
                },
                reason: { type: 'string', nullable: true },
                timestamp: { type: 'string' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid QR code or request data' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyPassDto]),
    __metadata("design:returntype", Promise)
], AccessController.prototype, "verifyPass", null);
__decorate([
    (0, common_1.Post)('verify-batch'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'school_admin', 'security'),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify multiple passes (batch processing)',
        description: 'For processing multiple QR codes at once'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Batch verification results',
        schema: {
            type: 'array',
            items: {
                properties: {
                    qrCode: { type: 'string' },
                    valid: { type: 'boolean' },
                    accessGranted: { type: 'boolean' },
                    student: { type: 'object' },
                    reason: { type: 'string', nullable: true },
                },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AccessController.prototype, "verifyPassBatch", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'school_admin', 'staff', 'security'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get access logs with filtering' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Access logs retrieved successfully',
        schema: {
            properties: {
                data: {
                    type: 'array',
                    items: {
                        properties: {
                            id: { type: 'string' },
                            student: {
                                type: 'object',
                                properties: {
                                    studentId: { type: 'string' },
                                    firstName: { type: 'string' },
                                    lastName: { type: 'string' },
                                },
                            },
                            pass: {
                                type: 'object',
                                properties: {
                                    passNumber: { type: 'string' },
                                    status: { type: 'string' },
                                },
                            },
                            accessPoint: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    location: { type: 'string' },
                                },
                            },
                            accessTime: { type: 'string' },
                            status: { type: 'string' },
                            reason: { type: 'string', nullable: true },
                        },
                    },
                },
                pagination: {
                    type: 'object',
                    properties: {
                        page: { type: 'number' },
                        limit: { type: 'number' },
                        total: { type: 'number' },
                        totalPages: { type: 'number' },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AccessLogQueryDto, Object]),
    __metadata("design:returntype", Promise)
], AccessController.prototype, "getAccessLogs", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'school_admin', 'staff'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get access statistics' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Access statistics retrieved successfully',
        schema: {
            properties: {
                totalAccess: { type: 'number' },
                accessGranted: { type: 'number' },
                accessDenied: { type: 'number' },
                todayAccess: { type: 'number' },
                thisWeekAccess: { type: 'number' },
                thisMonthAccess: { type: 'number' },
                topAccessPoints: {
                    type: 'array',
                    items: {
                        properties: {
                            accessPointName: { type: 'string' },
                            count: { type: 'number' },
                        },
                    },
                },
                hourlyStats: {
                    type: 'array',
                    items: {
                        properties: {
                            hour: { type: 'number' },
                            count: { type: 'number' },
                        },
                    },
                },
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AccessController.prototype, "getAccessStatistics", null);
__decorate([
    (0, common_1.Get)('live-feed'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'school_admin', 'security'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get live access feed (recent access attempts)',
        description: 'Returns the most recent access attempts for real-time monitoring'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Live access feed retrieved successfully',
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string' },
                    student: {
                        type: 'object',
                        properties: {
                            studentId: { type: 'string' },
                            firstName: { type: 'string' },
                            lastName: { type: 'string' },
                            photoUrl: { type: 'string' },
                        },
                    },
                    accessPoint: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            location: { type: 'string' },
                        },
                    },
                    accessTime: { type: 'string' },
                    status: { type: 'string' },
                    reason: { type: 'string', nullable: true },
                },
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AccessController.prototype, "getLiveFeed", null);
__decorate([
    (0, common_1.Post)('access-points/:id/test'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'school_admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Test access point connectivity' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Access point test result',
        schema: {
            properties: {
                accessPointId: { type: 'string' },
                status: { type: 'string' },
                responseTime: { type: 'number' },
                lastSeen: { type: 'string' },
                message: { type: 'string' },
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AccessController.prototype, "testAccessPoint", null);
exports.AccessController = AccessController = __decorate([
    (0, swagger_1.ApiTags)('Access Control'),
    (0, common_1.Controller)('access'),
    __metadata("design:paramtypes", [typeof (_a = typeof access_service_1.AccessService !== "undefined" && access_service_1.AccessService) === "function" ? _a : Object, passes_service_1.PassesService])
], AccessController);
//# sourceMappingURL=access.controller.js.map