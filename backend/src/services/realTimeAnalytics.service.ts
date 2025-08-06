import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import NodeCache from 'node-cache';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();
const cache = new NodeCache({ stdTTL: 60 }); // 1-minute cache for real-time data

export class RealTimeAnalyticsService extends EventEmitter {
  private io: Server | null = null;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Initialize with Socket.IO server
   */
  initialize(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  /**
   * Setup Socket.IO handlers for real-time analytics
   */
  private setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`Analytics client connected: ${socket.id}`);

      // Join analytics rooms based on user permissions
      socket.on('join-analytics', (data) => {
        const { userId, role, schoolId } = data;
        
        // Join appropriate rooms based on role
        if (role === 'admin' || role === 'super_admin') {
          socket.join('analytics:system');
        }
        
        if (schoolId && (role === 'school_admin' || role === 'department_staff')) {
          socket.join(`analytics:school:${schoolId}`);
        }

        if (role === 'security') {
          socket.join('analytics:security');
        }

        // Start sending real-time updates
        this.startRealTimeUpdates(socket, data);
      });

      // Handle custom analytics requests
      socket.on('request-metrics', async (data) => {
        try {
          const metrics = await this.getMetricsForUser(data);
          socket.emit('metrics-update', metrics);
        } catch (error) {
          socket.emit('error', { message: 'Failed to fetch metrics' });
        }
      });

      socket.on('disconnect', () => {
        console.log(`Analytics client disconnected: ${socket.id}`);
        this.stopRealTimeUpdates(socket.id);
      });
    });
  }

  /**
   * Start real-time updates for a connected client
   */
  private startRealTimeUpdates(socket: any, userData: any) {
    const updateInterval = setInterval(async () => {
      try {
        const realTimeData = await this.getRealTimeData(userData);
        socket.emit('realtime-update', realTimeData);
      } catch (error) {
        console.error('Error sending real-time update:', error);
      }
    }, 5000); // Update every 5 seconds

    this.updateIntervals.set(socket.id, updateInterval);
  }

  /**
   * Stop real-time updates for a disconnected client
   */
  private stopRealTimeUpdates(socketId: string) {
    const interval = this.updateIntervals.get(socketId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(socketId);
    }
  }

  /**
   * Get real-time data based on user permissions
   */
  private async getRealTimeData(userData: any) {
    const cacheKey = `realtime:${userData.role}:${userData.schoolId || 'all'}`;
    
    let cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    let whereClause: any = {};
    if (userData.schoolId && userData.role !== 'admin') {
      whereClause = { schoolId: userData.schoolId };
    }

    const [
      recentApplications,
      recentAccessAttempts,
      activeUsers,
      systemAlerts,
      queueStatus
    ] = await Promise.all([
      // Recent applications (last 15 minutes)
      prisma.studentApplication.count({
        where: {
          ...whereClause,
          appliedAt: { gte: fifteenMinutesAgo }
        }
      }),

      // Recent access attempts (last 15 minutes)
      prisma.accessLog.count({
        where: {
          accessTime: { gte: fifteenMinutesAgo }
        }
      }),

      // Active users (users who accessed in the last hour)
      prisma.accessLog.count({
        distinct: ['studentId'],
        where: {
          accessTime: { gte: oneHourAgo }
        }
      }),

      // System alerts
      this.getSystemAlerts(userData),

      // Queue status
      this.getQueueStatus(whereClause)
    ]);

    const realTimeData = {
      timestamp: now.toISOString(),
      metrics: {
        recentApplications,
        recentAccessAttempts,
        activeUsers
      },
      alerts: systemAlerts,
      queue: queueStatus,
      trends: await this.getTrendData(userData)
    };

    cache.set(cacheKey, realTimeData, 30); // Cache for 30 seconds
    return realTimeData;
  }

  /**
   * Get metrics for a specific user based on their role and permissions
   */
  private async getMetricsForUser(userData: any) {
    const { role, schoolId, departmentId, dateRange = '24h' } = userData;
    
    let whereClause: any = {};
    
    if (role === 'school_admin' && schoolId) {
      whereClause = { schoolId };
    } else if (role === 'department_staff' && departmentId) {
      whereClause = { departmentId };
    }

    const dateRanges = this.getDateRange(dateRange);

    return {
      applications: await this.getApplicationMetrics(whereClause, dateRanges),
      access: await this.getAccessMetrics(whereClause, dateRanges),
      users: await this.getUserMetrics(whereClause, dateRanges)
    };
  }

  /**
   * Get system alerts based on user role
   */
  private async getSystemAlerts(userData: any) {
    const alerts = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      // High denial rate alert
      if (userData.role === 'security' || userData.role === 'admin') {
        const [totalAccess, deniedAccess] = await Promise.all([
          prisma.accessLog.count({
            where: { accessTime: { gte: oneHourAgo } }
          }),
          prisma.accessLog.count({
            where: {
              accessTime: { gte: oneHourAgo },
              status: 'denied'
            }
          })
        ]);

        if (totalAccess > 10 && (deniedAccess / totalAccess) > 0.2) {
          alerts.push({
            id: 'high-denial-rate',
            type: 'warning',
            title: 'High Access Denial Rate',
            message: `${Math.round((deniedAccess / totalAccess) * 100)}% of access attempts denied in the last hour`,
            timestamp: now.toISOString(),
            priority: 'high'
          });
        }
      }

      // Application backlog alert
      if (userData.role === 'admin' || userData.role === 'school_admin') {
        const pendingApplications = await prisma.studentApplication.count({
          where: {
            status: 'pending',
            appliedAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // Older than 24 hours
          }
        });

        if (pendingApplications > 50) {
          alerts.push({
            id: 'application-backlog',
            type: 'warning',
            title: 'Application Backlog',
            message: `${pendingApplications} applications pending for more than 24 hours`,
            timestamp: now.toISOString(),
            priority: 'medium'
          });
        }
      }

      // System performance alert (simplified)
      const slowQueries = await this.checkSystemPerformance();
      if (slowQueries) {
        alerts.push({
          id: 'system-performance',
          type: 'info',
          title: 'System Performance',
          message: 'Some database queries are running slower than usual',
          timestamp: now.toISOString(),
          priority: 'low'
        });
      }

    } catch (error) {
      console.error('Error generating alerts:', error);
    }

    return alerts;
  }

  /**
   * Get queue status for applications and processing
   */
  private async getQueueStatus(whereClause: any) {
    try {
      const [
        pendingApplications,
        underReviewApplications,
        processingQueue
      ] = await Promise.all([
        prisma.studentApplication.count({
          where: {
            ...whereClause,
            status: 'pending'
          }
        }),
        
        prisma.studentApplication.count({
          where: {
            ...whereClause,
            status: 'under_review'
          }
        }),

        // Simplified queue status - in practice, you'd track actual processing queues
        prisma.studentApplication.count({
          where: {
            ...whereClause,
            status: { in: ['pending', 'under_review'] }
          }
        })
      ]);

      return {
        pending: pendingApplications,
        underReview: underReviewApplications,
        total: processingQueue
      };
    } catch (error) {
      console.error('Error getting queue status:', error);
      return { pending: 0, underReview: 0, total: 0 };
    }
  }

  /**
   * Get trend data for real-time visualization
   */
  private async getTrendData(userData: any) {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      let whereClause: any = {};
      if (userData.schoolId && userData.role !== 'admin') {
        whereClause = { schoolId: userData.schoolId };
      }

      // Get hourly application trends for the last 24 hours
      const applications = await prisma.studentApplication.findMany({
        where: {
          ...whereClause,
          appliedAt: { gte: last24Hours }
        },
        select: {
          appliedAt: true
        }
      });

      // Get hourly access trends
      const accessLogs = await prisma.accessLog.findMany({
        where: {
          accessTime: { gte: last24Hours }
        },
        select: {
          accessTime: true,
          status: true
        }
      });

      // Group by hour
      const hourlyApplications = this.groupByHour(applications.map(a => a.appliedAt));
      const hourlyAccess = this.groupByHour(accessLogs.map(a => a.accessTime));
      const hourlyDenials = this.groupByHour(
        accessLogs.filter(a => a.status === 'denied').map(a => a.accessTime)
      );

      return {
        applications: hourlyApplications,
        access: hourlyAccess,
        denials: hourlyDenials
      };
    } catch (error) {
      console.error('Error getting trend data:', error);
      return { applications: [], access: [], denials: [] };
    }
  }

  /**
   * Setup event listeners for database changes
   */
  private setupEventListeners() {
    // Listen for new applications
    this.on('new-application', (applicationData) => {
      if (this.io) {
        // Broadcast to appropriate rooms
        this.io.to('analytics:system').emit('application-created', applicationData);
        this.io.to(`analytics:school:${applicationData.schoolId}`).emit('application-created', applicationData);
      }
    });

    // Listen for access events
    this.on('access-event', (accessData) => {
      if (this.io) {
        this.io.to('analytics:system').emit('access-event', accessData);
        this.io.to('analytics:security').emit('access-event', accessData);
      }
    });

    // Listen for status changes
    this.on('status-change', (statusData) => {
      if (this.io) {
        this.io.to('analytics:system').emit('status-change', statusData);
      }
    });
  }

  /**
   * Emit analytics events (called from other parts of the application)
   */
  emitApplicationEvent(eventType: string, data: any) {
    this.emit(eventType, data);
  }

  emitAccessEvent(data: any) {
    this.emit('access-event', data);
  }

  emitStatusChange(data: any) {
    this.emit('status-change', data);
  }

  // Helper methods
  private getDateRange(range: string) {
    const now = new Date();
    
    switch (range) {
      case '1h':
        return { start: new Date(now.getTime() - 60 * 60 * 1000), end: now };
      case '24h':
        return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
      case '7d':
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      default:
        return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
    }
  }

  private async getApplicationMetrics(whereClause: any, dateRanges: any) {
    return {
      total: await prisma.studentApplication.count({
        where: {
          ...whereClause,
          appliedAt: { gte: dateRanges.start, lte: dateRanges.end }
        }
      }),
      pending: await prisma.studentApplication.count({
        where: {
          ...whereClause,
          status: 'pending',
          appliedAt: { gte: dateRanges.start, lte: dateRanges.end }
        }
      }),
      approved: await prisma.studentApplication.count({
        where: {
          ...whereClause,
          status: 'approved',
          appliedAt: { gte: dateRanges.start, lte: dateRanges.end }
        }
      })
    };
  }

  private async getAccessMetrics(whereClause: any, dateRanges: any) {
    return {
      total: await prisma.accessLog.count({
        where: {
          accessTime: { gte: dateRanges.start, lte: dateRanges.end }
        }
      }),
      granted: await prisma.accessLog.count({
        where: {
          accessTime: { gte: dateRanges.start, lte: dateRanges.end },
          status: 'granted'
        }
      }),
      denied: await prisma.accessLog.count({
        where: {
          accessTime: { gte: dateRanges.start, lte: dateRanges.end },
          status: 'denied'
        }
      })
    };
  }

  private async getUserMetrics(whereClause: any, dateRanges: any) {
    return {
      active: await prisma.student.count({
        where: {
          ...whereClause,
          status: 'active'
        }
      }),
      new: await prisma.student.count({
        where: {
          ...whereClause,
          createdAt: { gte: dateRanges.start, lte: dateRanges.end }
        }
      })
    };
  }

  private groupByHour(dates: Date[]) {
    const hourly = dates.reduce((acc, date) => {
      const hour = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(hourly).map(([hour, count]) => ({
      time: hour,
      count
    }));
  }

  private async checkSystemPerformance(): Promise<boolean> {
    try {
      const start = Date.now();
      await prisma.studentApplication.findFirst();
      const queryTime = Date.now() - start;
      
      // If query takes more than 1 second, consider it slow
      return queryTime > 1000;
    } catch (error) {
      return true; // Consider errors as performance issues
    }
  }

  /**
   * Cleanup method
   */
  cleanup() {
    // Clear all intervals
    this.updateIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.updateIntervals.clear();
    
    // Remove all listeners
    this.removeAllListeners();
  }
}

export const realTimeAnalyticsService = new RealTimeAnalyticsService();