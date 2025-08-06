import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { getCacheService } from './cache.service';
import { getSearchService } from './search.service';

interface AuditLogEntry {
  id?: string;
  userId?: string;
  institutionId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'auth' | 'data' | 'system' | 'security' | 'compliance';
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

interface AuditQuery {
  userId?: string;
  institutionId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  category?: string;
  severity?: string;
  success?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  page?: number;
  limit?: number;
}

interface AuditStats {
  totalLogs: number;
  successfulActions: number;
  failedActions: number;
  criticalEvents: number;
  topUsers: Array<{ userId: string; userName: string; actionCount: number }>;
  topActions: Array<{ action: string; count: number }>;
  categoryBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
}

interface ComplianceReport {
  period: string;
  totalEvents: number;
  securityEvents: number;
  dataAccessEvents: number;
  authenticationEvents: number;
  failedLoginAttempts: number;
  privilegedOperations: number;
  dataExports: number;
  userCreations: number;
  userDeletions: number;
  suspiciousActivities: number;
  complianceScore: number;
  recommendations: string[];
}

export class AuditService {
  private cacheService = getCacheService();
  private searchService = getSearchService();
  private retentionDays: number;
  private enableElasticsearch: boolean;

  constructor() {
    this.retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '2555'); // 7 years default
    this.enableElasticsearch = process.env.AUDIT_ELASTICSEARCH_ENABLED === 'true';
  }

  public async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<string | null> {
    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date()
      };

      // Save to database
      const savedEntry = await prisma.auditLog.create({
        data: {
          userId: auditEntry.userId,
          institutionId: auditEntry.institutionId,
          action: auditEntry.action,
          entityType: auditEntry.entityType,
          entityId: auditEntry.entityId,
          oldValues: auditEntry.oldValues ? JSON.stringify(auditEntry.oldValues) : null,
          newValues: auditEntry.newValues ? JSON.stringify(auditEntry.newValues) : null,
          metadata: auditEntry.metadata ? JSON.stringify(auditEntry.metadata) : null,
          ipAddress: auditEntry.ipAddress,
          userAgent: auditEntry.userAgent,
          sessionId: auditEntry.sessionId,
          severity: auditEntry.severity,
          category: auditEntry.category,
          success: auditEntry.success,
          errorMessage: auditEntry.errorMessage,
          createdAt: auditEntry.timestamp
        }
      });

      // Index in Elasticsearch if enabled
      if (this.enableElasticsearch) {
        await this.indexAuditLog(savedEntry.id, auditEntry);
      }

      // Cache recent audit logs for quick access
      await this.cacheRecentAuditLog(auditEntry);

      // Check for suspicious patterns
      await this.analyzeForSuspiciousActivity(auditEntry);

      logger.debug(`Audit log created: ${savedEntry.id}`);
      return savedEntry.id;
    } catch (error) {
      logger.error('Failed to create audit log:', error);
      return null;
    }
  }

  public async logAuthentication(
    userId: string,
    action: 'login' | 'logout' | 'failed_login' | 'password_reset',
    success: boolean,
    metadata: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `auth_${action}`,
      entityType: 'user',
      entityId: userId,
      metadata: {
        ...metadata,
        authenticationType: 'standard'
      },
      ipAddress,
      userAgent,
      severity: success ? 'low' : 'high',
      category: 'auth',
      success
    });
  }

  public async logDataAccess(
    userId: string,
    entityType: string,
    entityId: string,
    action: 'create' | 'read' | 'update' | 'delete',
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    institutionId?: string
  ): Promise<void> {
    const severity = action === 'delete' ? 'high' : action === 'update' ? 'medium' : 'low';
    
    await this.log({
      userId,
      institutionId,
      action: `data_${action}`,
      entityType,
      entityId,
      oldValues,
      newValues,
      severity,
      category: 'data',
      success: true
    });
  }

  public async logSystemEvent(
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, any> = {},
    severity: AuditLogEntry['severity'] = 'medium',
    success = true,
    userId?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `system_${action}`,
      entityType,
      entityId,
      metadata,
      severity,
      category: 'system',
      success
    });
  }

  public async logSecurityEvent(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, any> = {},
    severity: AuditLogEntry['severity'] = 'high',
    success = true
  ): Promise<void> {
    await this.log({
      userId,
      action: `security_${action}`,
      entityType,
      entityId,
      metadata,
      severity,
      category: 'security',
      success
    });

    // Send immediate notification for critical security events
    if (severity === 'critical') {
      await this.handleCriticalSecurityEvent({
        userId,
        action,
        entityType,
        entityId,
        metadata
      });
    }
  }

  public async logComplianceEvent(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, any> = {},
    institutionId?: string
  ): Promise<void> {
    await this.log({
      userId,
      institutionId,
      action: `compliance_${action}`,
      entityType,
      entityId,
      metadata: {
        ...metadata,
        complianceStandard: process.env.COMPLIANCE_STANDARD || 'GDPR',
        dataClassification: metadata.dataClassification || 'personal'
      },
      severity: 'medium',
      category: 'compliance',
      success: true
    });
  }

  public async getAuditLogs(query: AuditQuery): Promise<{
    logs: AuditLogEntry[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const page = query.page || 1;
      const limit = Math.min(query.limit || 50, 100); // Max 100 records per page
      const skip = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {};
      
      if (query.userId) whereClause.userId = query.userId;
      if (query.institutionId) whereClause.institutionId = query.institutionId;
      if (query.action) whereClause.action = query.action;
      if (query.entityType) whereClause.entityType = query.entityType;
      if (query.entityId) whereClause.entityId = query.entityId;
      if (query.category) whereClause.category = query.category;
      if (query.severity) whereClause.severity = query.severity;
      if (query.success !== undefined) whereClause.success = query.success;
      
      if (query.dateRange) {
        whereClause.createdAt = {
          gte: query.dateRange.start,
          lte: query.dateRange.end
        };
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }),
        prisma.auditLog.count({ where: whereClause })
      ]);

      const formattedLogs: AuditLogEntry[] = logs.map(log => ({
        id: log.id,
        userId: log.userId,
        institutionId: log.institutionId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues ? JSON.parse(log.oldValues) : undefined,
        newValues: log.newValues ? JSON.parse(log.newValues) : undefined,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        sessionId: log.sessionId,
        severity: log.severity as AuditLogEntry['severity'],
        category: log.category as AuditLogEntry['category'],
        timestamp: log.createdAt,
        success: log.success,
        errorMessage: log.errorMessage
      }));

      return {
        logs: formattedLogs,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      return { logs: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  public async getAuditStats(
    institutionId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AuditStats> {
    try {
      const whereClause: any = {};
      if (institutionId) whereClause.institutionId = institutionId;
      if (dateRange) {
        whereClause.createdAt = {
          gte: dateRange.start,
          lte: dateRange.end
        };
      }

      const [
        totalLogs,
        successfulActions,
        failedActions,
        criticalEvents,
        topUsersResult,
        topActionsResult,
        categoryResult,
        severityResult
      ] = await Promise.all([
        prisma.auditLog.count({ where: whereClause }),
        prisma.auditLog.count({ where: { ...whereClause, success: true } }),
        prisma.auditLog.count({ where: { ...whereClause, success: false } }),
        prisma.auditLog.count({ where: { ...whereClause, severity: 'critical' } }),
        prisma.auditLog.groupBy({
          by: ['userId'],
          where: whereClause,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),
        prisma.auditLog.groupBy({
          by: ['action'],
          where: whereClause,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),
        prisma.auditLog.groupBy({
          by: ['category'],
          where: whereClause,
          _count: { id: true }
        }),
        prisma.auditLog.groupBy({
          by: ['severity'],
          where: whereClause,
          _count: { id: true }
        })
      ]);

      // Get user names for top users
      const userIds = topUsersResult.map(item => item.userId).filter(Boolean);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true }
      });

      const userMap = new Map(users.map(user => [user.id, user.name]));

      const topUsers = topUsersResult.map(item => ({
        userId: item.userId!,
        userName: userMap.get(item.userId!) || 'Unknown',
        actionCount: item._count.id
      }));

      const topActions = topActionsResult.map(item => ({
        action: item.action,
        count: item._count.id
      }));

      const categoryBreakdown: Record<string, number> = {};
      categoryResult.forEach(item => {
        categoryBreakdown[item.category] = item._count.id;
      });

      const severityBreakdown: Record<string, number> = {};
      severityResult.forEach(item => {
        severityBreakdown[item.severity] = item._count.id;
      });

      return {
        totalLogs,
        successfulActions,
        failedActions,
        criticalEvents,
        topUsers,
        topActions,
        categoryBreakdown,
        severityBreakdown
      };
    } catch (error) {
      logger.error('Failed to get audit stats:', error);
      return {
        totalLogs: 0,
        successfulActions: 0,
        failedActions: 0,
        criticalEvents: 0,
        topUsers: [],
        topActions: [],
        categoryBreakdown: {},
        severityBreakdown: {}
      };
    }
  }

  public async generateComplianceReport(
    institutionId?: string,
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' = 'monthly'
  ): Promise<ComplianceReport> {
    try {
      const now = new Date();
      const startDate = this.getPeriodStartDate(now, period);
      
      const whereClause: any = {
        createdAt: { gte: startDate, lte: now }
      };
      if (institutionId) whereClause.institutionId = institutionId;

      const [
        totalEvents,
        securityEvents,
        dataAccessEvents,
        authEvents,
        failedLogins,
        privilegedOps,
        dataExports,
        userCreations,
        userDeletions,
        suspiciousActivities
      ] = await Promise.all([
        prisma.auditLog.count({ where: whereClause }),
        prisma.auditLog.count({ where: { ...whereClause, category: 'security' } }),
        prisma.auditLog.count({ where: { ...whereClause, category: 'data' } }),
        prisma.auditLog.count({ where: { ...whereClause, category: 'auth' } }),
        prisma.auditLog.count({ 
          where: { 
            ...whereClause, 
            action: 'auth_failed_login',
            success: false
          } 
        }),
        prisma.auditLog.count({ 
          where: { 
            ...whereClause, 
            severity: { in: ['high', 'critical'] }
          } 
        }),
        prisma.auditLog.count({ 
          where: { 
            ...whereClause, 
            action: { contains: 'export' }
          } 
        }),
        prisma.auditLog.count({ 
          where: { 
            ...whereClause, 
            action: 'data_create',
            entityType: 'user'
          } 
        }),
        prisma.auditLog.count({ 
          where: { 
            ...whereClause, 
            action: 'data_delete',
            entityType: 'user'
          } 
        }),
        this.getSuspiciousActivityCount(whereClause)
      ]);

      // Calculate compliance score (0-100)
      const complianceScore = this.calculateComplianceScore({
        totalEvents,
        securityEvents,
        failedLogins,
        suspiciousActivities,
        privilegedOps
      });

      const recommendations = this.generateComplianceRecommendations({
        failedLogins,
        suspiciousActivities,
        privilegedOps,
        complianceScore
      });

      return {
        period,
        totalEvents,
        securityEvents,
        dataAccessEvents,
        authenticationEvents: authEvents,
        failedLoginAttempts: failedLogins,
        privilegedOperations: privilegedOps,
        dataExports,
        userCreations,
        userDeletions,
        suspiciousActivities,
        complianceScore,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  private async indexAuditLog(logId: string, entry: AuditLogEntry): Promise<void> {
    try {
      await this.searchService.indexDocument({
        id: logId,
        type: 'audit_log',
        title: `${entry.action} - ${entry.entityType}`,
        content: `${entry.action} ${entry.entityType} ${entry.entityId} ${entry.success ? 'success' : 'failed'}`,
        metadata: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          severity: entry.severity,
          category: entry.category,
          success: entry.success,
          ipAddress: entry.ipAddress,
          ...entry.metadata
        },
        institutionId: entry.institutionId,
        userId: entry.userId,
        createdAt: entry.timestamp,
        updatedAt: entry.timestamp
      });
    } catch (error) {
      logger.error('Failed to index audit log in Elasticsearch:', error);
    }
  }

  private async cacheRecentAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      const key = `recent_audit_logs:${entry.institutionId || 'global'}`;
      const recentLogs = await this.cacheService.get<AuditLogEntry[]>(key) || [];
      
      // Keep only last 100 entries
      recentLogs.unshift(entry);
      if (recentLogs.length > 100) {
        recentLogs.splice(100);
      }

      await this.cacheService.set(key, recentLogs, { ttl: 3600 }); // 1 hour
    } catch (error) {
      logger.error('Failed to cache recent audit log:', error);
    }
  }

  private async analyzeForSuspiciousActivity(entry: AuditLogEntry): Promise<void> {
    try {
      if (!entry.userId) return;

      const suspiciousPatterns = [
        // Multiple failed login attempts
        {
          condition: entry.action === 'auth_failed_login',
          check: async () => {
            const recentFailures = await prisma.auditLog.count({
              where: {
                userId: entry.userId,
                action: 'auth_failed_login',
                success: false,
                createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
              }
            });
            return recentFailures >= 5;
          },
          alert: 'Multiple failed login attempts detected'
        },
        // Rapid data access
        {
          condition: entry.category === 'data',
          check: async () => {
            const recentDataAccess = await prisma.auditLog.count({
              where: {
                userId: entry.userId,
                category: 'data',
                createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
              }
            });
            return recentDataAccess >= 50;
          },
          alert: 'Rapid data access pattern detected'
        }
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.condition && await pattern.check()) {
          await this.logSecurityEvent(
            entry.userId!,
            'suspicious_activity_detected',
            'user',
            entry.userId!,
            {
              originalAction: entry.action,
              alert: pattern.alert,
              timestamp: entry.timestamp
            },
            'critical'
          );
          break;
        }
      }
    } catch (error) {
      logger.error('Failed to analyze suspicious activity:', error);
    }
  }

  private async handleCriticalSecurityEvent(event: any): Promise<void> {
    try {
      // Log to system logger immediately
      logger.error('CRITICAL SECURITY EVENT', event);

      // Send immediate notification to security team
      const securityAdmins = await prisma.user.findMany({
        where: {
          role: { in: ['admin', 'super_admin'] },
          isActive: true
        }
      });

      // This would integrate with notification service
      logger.info(`Critical security event notification sent to ${securityAdmins.length} administrators`);
    } catch (error) {
      logger.error('Failed to handle critical security event:', error);
    }
  }

  private getPeriodStartDate(endDate: Date, period: string): Date {
    const start = new Date(endDate);
    
    switch (period) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
    }
    
    return start;
  }

  private async getSuspiciousActivityCount(whereClause: any): Promise<number> {
    return await prisma.auditLog.count({
      where: {
        ...whereClause,
        action: 'security_suspicious_activity_detected'
      }
    });
  }

  private calculateComplianceScore(metrics: any): number {
    let score = 100;
    
    // Deduct points for security issues
    if (metrics.failedLogins > 100) score -= 10;
    if (metrics.suspiciousActivities > 5) score -= 20;
    if (metrics.privilegedOps > metrics.totalEvents * 0.1) score -= 15;
    
    // Bonus points for good practices
    if (metrics.securityEvents > 0) score += 5; // Security monitoring is active
    
    return Math.max(0, Math.min(100, score));
  }

  private generateComplianceRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.failedLogins > 50) {
      recommendations.push('Consider implementing account lockout policies');
    }
    
    if (metrics.suspiciousActivities > 3) {
      recommendations.push('Review and strengthen security monitoring rules');
    }
    
    if (metrics.privilegedOps > 100) {
      recommendations.push('Review privileged access controls and implement principle of least privilege');
    }
    
    if (metrics.complianceScore < 80) {
      recommendations.push('Conduct security assessment and improve monitoring capabilities');
    }
    
    return recommendations;
  }

  public async exportAuditLogs(
    query: AuditQuery,
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> {
    try {
      // Get all matching logs (up to a reasonable limit)
      const result = await this.getAuditLogs({
        ...query,
        limit: 10000 // Maximum export limit
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `audit_logs_${timestamp}.${format}`;
      const filepath = `/tmp/${filename}`;

      if (format === 'json') {
        await require('fs/promises').writeFile(
          filepath,
          JSON.stringify(result.logs, null, 2)
        );
      } else {
        // CSV export would be implemented here
        const csv = this.convertLogsToCSV(result.logs);
        await require('fs/promises').writeFile(filepath, csv);
      }

      return filepath;
    } catch (error) {
      logger.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  private convertLogsToCSV(logs: AuditLogEntry[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'timestamp', 'userId', 'action', 'entityType', 'entityId',
      'severity', 'category', 'success', 'ipAddress'
    ];

    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.userId || '',
      log.action,
      log.entityType,
      log.entityId,
      log.severity,
      log.category,
      log.success.toString(),
      log.ipAddress || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  public async cleanupOldLogs(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate }
        }
      });

      logger.info(`Cleaned up ${result.count} audit log entries older than ${this.retentionDays} days`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup old audit logs:', error);
      return 0;
    }
  }
}

let auditService: AuditService | null = null;

export const getAuditService = (): AuditService => {
  if (!auditService) {
    auditService = new AuditService();
  }
  return auditService;
};