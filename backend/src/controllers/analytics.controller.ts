import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, format } from 'date-fns';
import NodeCache from 'node-cache';

const prisma = new PrismaClient();
const cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache

export class AnalyticsController {
  /**
   * Get key metrics dashboard data
   */
  async getKeyMetrics(req: Request, res: Response) {
    try {
      const { schoolId, dateRange = '30d' } = req.query;
      const cacheKey = `key-metrics-${schoolId}-${dateRange}`;
      
      let cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const dateRanges = this.getDateRange(dateRange as string);
      const whereClause = schoolId ? { schoolId: schoolId as string } : {};

      // Parallel execution of all metrics queries
      const [
        totalApplications,
        totalStudents,
        totalPasses,
        totalAccessLogs,
        recentApplications,
        applicationsByStatus,
        passDistribution,
        accessPatterns
      ] = await Promise.all([
        // Total applications
        prisma.studentApplication.count({
          where: {
            ...whereClause,
            appliedAt: {
              gte: dateRanges.start,
              lte: dateRanges.end
            }
          }
        }),

        // Total active students
        prisma.student.count({
          where: {
            ...whereClause,
            status: 'active'
          }
        }),

        // Active passes
        prisma.pass.count({
          where: {
            student: whereClause,
            status: 'active'
          }
        }),

        // Access logs count
        prisma.accessLog.count({
          where: {
            accessTime: {
              gte: dateRanges.start,
              lte: dateRanges.end
            }
          }
        }),

        // Recent applications trend
        this.getApplicationTrend(whereClause, dateRanges),

        // Applications by status
        this.getApplicationsByStatus(whereClause, dateRanges),

        // Pass type distribution
        this.getPassDistribution(whereClause),

        // Access patterns
        this.getAccessPatterns(dateRanges)
      ]);

      const metrics = {
        overview: {
          totalApplications,
          totalStudents,
          totalPasses,
          totalAccessLogs
        },
        trends: {
          applications: recentApplications,
          applicationsByStatus,
          passDistribution,
          accessPatterns
        },
        timestamp: new Date().toISOString()
      };

      cache.set(cacheKey, metrics);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching key metrics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get application analytics
   */
  async getApplicationAnalytics(req: Request, res: Response) {
    try {
      const { schoolId, departmentId, dateRange = '30d' } = req.query;
      const dateRanges = this.getDateRange(dateRange as string);
      
      const whereClause: any = {
        appliedAt: {
          gte: dateRanges.start,
          lte: dateRanges.end
        }
      };

      if (schoolId) whereClause.schoolId = schoolId;
      if (departmentId) whereClause.departmentId = departmentId;

      const [
        applicationVolume,
        conversionFunnel,
        processingTimes,
        departmentBreakdown,
        rejectionReasons
      ] = await Promise.all([
        this.getApplicationVolume(whereClause),
        this.getConversionFunnel(whereClause),
        this.getProcessingTimes(whereClause),
        this.getDepartmentBreakdown(whereClause),
        this.getRejectionReasons(whereClause)
      ]);

      res.json({
        applicationVolume,
        conversionFunnel,
        processingTimes,
        departmentBreakdown,
        rejectionReasons,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching application analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get access control analytics
   */
  async getAccessAnalytics(req: Request, res: Response) {
    try {
      const { schoolId, accessPointId, dateRange = '30d' } = req.query;
      const dateRanges = this.getDateRange(dateRange as string);

      const whereClause: any = {
        accessTime: {
          gte: dateRanges.start,
          lte: dateRanges.end
        }
      };

      if (schoolId) {
        whereClause.accessPoint = { schoolId: schoolId };
      }
      if (accessPointId) {
        whereClause.accessPointId = accessPointId;
      }

      const [
        accessVolume,
        peakUsageTimes,
        accessPointBreakdown,
        deniedAccessReasons,
        securityIncidents
      ] = await Promise.all([
        this.getAccessVolume(whereClause),
        this.getPeakUsageTimes(whereClause),
        this.getAccessPointBreakdown(whereClause),
        this.getDeniedAccessReasons(whereClause),
        this.getSecurityIncidents(whereClause)
      ]);

      res.json({
        accessVolume,
        peakUsageTimes,
        accessPointBreakdown,
        deniedAccessReasons,
        securityIncidents,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching access analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user engagement analytics
   */
  async getUserEngagement(req: Request, res: Response) {
    try {
      const { schoolId, dateRange = '30d' } = req.query;
      const dateRanges = this.getDateRange(dateRange as string);

      const [
        activeUsers,
        userGrowth,
        engagementMetrics,
        retentionRates
      ] = await Promise.all([
        this.getActiveUsers(schoolId as string, dateRanges),
        this.getUserGrowth(schoolId as string, dateRanges),
        this.getEngagementMetrics(schoolId as string, dateRanges),
        this.getRetentionRates(schoolId as string, dateRanges)
      ]);

      res.json({
        activeUsers,
        userGrowth,
        engagementMetrics,
        retentionRates,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching user engagement:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get real-time system status
   */
  async getSystemStatus(req: Request, res: Response) {
    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [
        activeUsers,
        recentApplications,
        recentAccess,
        systemHealth
      ] = await Promise.all([
        // Active users in last hour (approximation based on recent activity)
        prisma.accessLog.count({
          distinct: ['studentId'],
          where: {
            accessTime: { gte: hourAgo }
          }
        }),

        // Applications in last hour
        prisma.studentApplication.count({
          where: {
            appliedAt: { gte: hourAgo }
          }
        }),

        // Access attempts in last hour
        prisma.accessLog.count({
          where: {
            accessTime: { gte: hourAgo }
          }
        }),

        // System health check
        this.getSystemHealth()
      ]);

      res.json({
        realTime: {
          activeUsers,
          recentApplications,
          recentAccess,
          timestamp: now.toISOString()
        },
        systemHealth,
        alerts: await this.getSystemAlerts()
      });
    } catch (error) {
      console.error('Error fetching system status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Export analytics report
   */
  async exportReport(req: Request, res: Response) {
    try {
      const { type = 'comprehensive', format = 'json', ...filters } = req.query;
      
      let reportData;
      
      switch (type) {
        case 'applications':
          reportData = await this.generateApplicationReport(filters);
          break;
        case 'access':
          reportData = await this.generateAccessReport(filters);
          break;
        case 'users':
          reportData = await this.generateUserReport(filters);
          break;
        default:
          reportData = await this.generateComprehensiveReport(filters);
      }

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
        res.send(this.convertToCSV(reportData));
      } else {
        res.json(reportData);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Helper methods
  private getDateRange(range: string) {
    const now = new Date();
    
    switch (range) {
      case '7d':
        return { start: subDays(now, 7), end: now };
      case '30d':
        return { start: subDays(now, 30), end: now };
      case '90d':
        return { start: subDays(now, 90), end: now };
      case '1y':
        return { start: subDays(now, 365), end: now };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: subDays(now, 30), end: now };
    }
  }

  private async getApplicationTrend(whereClause: any, dateRanges: any) {
    const applications = await prisma.studentApplication.groupBy({
      by: ['appliedAt'],
      where: {
        ...whereClause,
        appliedAt: {
          gte: dateRanges.start,
          lte: dateRanges.end
        }
      },
      _count: true
    });

    // Group by day for better visualization
    const dailyCount = applications.reduce((acc, app) => {
      const date = format(app.appliedAt, 'yyyy-MM-dd');
      acc[date] = (acc[date] || 0) + app._count;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dailyCount).map(([date, count]) => ({
      date,
      count
    }));
  }

  private async getApplicationsByStatus(whereClause: any, dateRanges: any) {
    return await prisma.studentApplication.groupBy({
      by: ['status'],
      where: {
        ...whereClause,
        appliedAt: {
          gte: dateRanges.start,
          lte: dateRanges.end
        }
      },
      _count: true
    });
  }

  private async getPassDistribution(whereClause: any) {
    return await prisma.pass.groupBy({
      by: ['passType'],
      where: {
        student: whereClause,
        status: 'active'
      },
      _count: true
    });
  }

  private async getAccessPatterns(dateRanges: any) {
    const accessLogs = await prisma.accessLog.findMany({
      where: {
        accessTime: {
          gte: dateRanges.start,
          lte: dateRanges.end
        }
      },
      select: {
        accessTime: true,
        accessType: true
      }
    });

    // Group by hour of day
    const hourlyPattern = accessLogs.reduce((acc, log) => {
      const hour = log.accessTime.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourlyPattern).map(([hour, count]) => ({
      hour: parseInt(hour),
      count
    }));
  }

  private async getApplicationVolume(whereClause: any) {
    return await prisma.studentApplication.groupBy({
      by: ['appliedAt'],
      where: whereClause,
      _count: true,
      orderBy: {
        appliedAt: 'asc'
      }
    });
  }

  private async getConversionFunnel(whereClause: any) {
    const statuses = ['pending', 'under_review', 'approved', 'rejected'];
    const funnel = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await prisma.studentApplication.count({
          where: { ...whereClause, status }
        })
      }))
    );
    return funnel;
  }

  private async getProcessingTimes(whereClause: any) {
    const applications = await prisma.studentApplication.findMany({
      where: {
        ...whereClause,
        reviewedAt: { not: null }
      },
      select: {
        appliedAt: true,
        reviewedAt: true,
        status: true
      }
    });

    return applications.map(app => ({
      status: app.status,
      processingTime: app.reviewedAt ? 
        Math.round((app.reviewedAt.getTime() - app.appliedAt.getTime()) / (1000 * 60 * 60)) : 0 // hours
    }));
  }

  private async getDepartmentBreakdown(whereClause: any) {
    return await prisma.studentApplication.groupBy({
      by: ['departmentId'],
      where: whereClause,
      _count: true,
      orderBy: {
        _count: {
          departmentId: 'desc'
        }
      }
    });
  }

  private async getRejectionReasons(whereClause: any) {
    const rejectedApps = await prisma.studentApplication.findMany({
      where: {
        ...whereClause,
        status: 'rejected'
      },
      select: {
        reviewComments: true
      }
    });

    // This is a simplified version - in practice, you'd want to categorize reasons
    const reasonCategories = rejectedApps.reduce((acc, app) => {
      const reason = app.reviewComments || 'No reason provided';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(reasonCategories).map(([reason, count]) => ({
      reason,
      count
    }));
  }

  private async getAccessVolume(whereClause: any) {
    return await prisma.accessLog.groupBy({
      by: ['accessTime'],
      where: whereClause,
      _count: true,
      orderBy: {
        accessTime: 'asc'
      }
    });
  }

  private async getPeakUsageTimes(whereClause: any) {
    const accessLogs = await prisma.accessLog.findMany({
      where: whereClause,
      select: {
        accessTime: true
      }
    });

    const hourlyUsage = accessLogs.reduce((acc, log) => {
      const hour = log.accessTime.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourlyUsage)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);
  }

  private async getAccessPointBreakdown(whereClause: any) {
    return await prisma.accessLog.groupBy({
      by: ['accessPointId'],
      where: whereClause,
      _count: true,
      orderBy: {
        _count: {
          accessPointId: 'desc'
        }
      }
    });
  }

  private async getDeniedAccessReasons(whereClause: any) {
    const deniedLogs = await prisma.accessLog.findMany({
      where: {
        ...whereClause,
        status: 'denied'
      },
      select: {
        reason: true
      }
    });

    const reasonCount = deniedLogs.reduce((acc, log) => {
      const reason = log.reason || 'Unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(reasonCount).map(([reason, count]) => ({
      reason,
      count
    }));
  }

  private async getSecurityIncidents(whereClause: any) {
    return await prisma.accessLog.count({
      where: {
        ...whereClause,
        status: 'denied'
      }
    });
  }

  private async getActiveUsers(schoolId: string, dateRanges: any) {
    const whereClause = schoolId ? { schoolId } : {};
    
    return await prisma.student.count({
      where: {
        ...whereClause,
        status: 'active',
        accessLogs: {
          some: {
            accessTime: {
              gte: dateRanges.start,
              lte: dateRanges.end
            }
          }
        }
      }
    });
  }

  private async getUserGrowth(schoolId: string, dateRanges: any) {
    const whereClause = schoolId ? { schoolId } : {};
    
    return await prisma.student.groupBy({
      by: ['createdAt'],
      where: {
        ...whereClause,
        createdAt: {
          gte: dateRanges.start,
          lte: dateRanges.end
        }
      },
      _count: true,
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  private async getEngagementMetrics(schoolId: string, dateRanges: any) {
    const whereClause = schoolId ? { schoolId } : {};
    
    const [
      totalAccess,
      uniqueUsers,
      averageSessionsPerUser
    ] = await Promise.all([
      prisma.accessLog.count({
        where: {
          accessTime: {
            gte: dateRanges.start,
            lte: dateRanges.end
          }
        }
      }),
      prisma.accessLog.count({
        distinct: ['studentId'],
        where: {
          accessTime: {
            gte: dateRanges.start,
            lte: dateRanges.end
          }
        }
      }),
      // This is simplified - you'd want more sophisticated session tracking
      prisma.accessLog.count({
        where: {
          accessTime: {
            gte: dateRanges.start,
            lte: dateRanges.end
          }
        }
      })
    ]);

    return {
      totalAccess,
      uniqueUsers,
      averageSessionsPerUser: uniqueUsers > 0 ? Math.round(totalAccess / uniqueUsers) : 0
    };
  }

  private async getRetentionRates(schoolId: string, dateRanges: any) {
    // Simplified retention calculation
    // In practice, you'd want more sophisticated cohort analysis
    const whereClause = schoolId ? { schoolId } : {};
    
    const newUsers = await prisma.student.count({
      where: {
        ...whereClause,
        createdAt: {
          gte: dateRanges.start,
          lte: dateRanges.end
        }
      }
    });

    const activeUsers = await prisma.student.count({
      where: {
        ...whereClause,
        status: 'active',
        accessLogs: {
          some: {
            accessTime: {
              gte: dateRanges.start,
              lte: dateRanges.end
            }
          }
        }
      }
    });

    return {
      newUsers,
      activeUsers,
      retentionRate: newUsers > 0 ? Math.round((activeUsers / newUsers) * 100) : 0
    };
  }

  private async getSystemHealth() {
    try {
      // Simple health checks
      const dbHealth = await prisma.$queryRaw`SELECT 1`;
      
      return {
        database: dbHealth ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        database: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async getSystemAlerts() {
    const alerts = [];
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check for high failure rates
    const deniedAccess = await prisma.accessLog.count({
      where: {
        status: 'denied',
        accessTime: { gte: hourAgo }
      }
    });

    const totalAccess = await prisma.accessLog.count({
      where: {
        accessTime: { gte: hourAgo }
      }
    });

    if (totalAccess > 0 && (deniedAccess / totalAccess) > 0.2) {
      alerts.push({
        type: 'warning',
        message: 'High access denial rate detected',
        value: `${Math.round((deniedAccess / totalAccess) * 100)}%`,
        timestamp: now.toISOString()
      });
    }

    return alerts;
  }

  private async generateApplicationReport(filters: any) {
    // Implementation for generating application reports
    const dateRanges = this.getDateRange(filters.dateRange || '30d');
    const whereClause: any = {
      appliedAt: {
        gte: dateRanges.start,
        lte: dateRanges.end
      }
    };

    if (filters.schoolId) whereClause.schoolId = filters.schoolId;
    if (filters.departmentId) whereClause.departmentId = filters.departmentId;

    return await prisma.studentApplication.findMany({
      where: whereClause,
      include: {
        school: true,
        department: true,
        reviewedBy: true
      }
    });
  }

  private async generateAccessReport(filters: any) {
    // Implementation for generating access reports
    const dateRanges = this.getDateRange(filters.dateRange || '30d');
    const whereClause: any = {
      accessTime: {
        gte: dateRanges.start,
        lte: dateRanges.end
      }
    };

    if (filters.accessPointId) whereClause.accessPointId = filters.accessPointId;

    return await prisma.accessLog.findMany({
      where: whereClause,
      include: {
        student: true,
        accessPoint: true,
        pass: true
      }
    });
  }

  private async generateUserReport(filters: any) {
    // Implementation for generating user reports
    const whereClause: any = {};
    if (filters.schoolId) whereClause.schoolId = filters.schoolId;

    return await prisma.student.findMany({
      where: whereClause,
      include: {
        school: true,
        department: true,
        passes: true
      }
    });
  }

  private async generateComprehensiveReport(filters: any) {
    const [applications, access, users] = await Promise.all([
      this.generateApplicationReport(filters),
      this.generateAccessReport(filters),
      this.generateUserReport(filters)
    ]);

    return {
      applications,
      access,
      users,
      generatedAt: new Date().toISOString()
    };
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in practice, you'd want a more robust solution
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => row[header]).join(','))
      ].join('\n');
      
      return csvContent;
    }
    
    return 'No data available';
  }
}

export const analyticsController = new AnalyticsController();