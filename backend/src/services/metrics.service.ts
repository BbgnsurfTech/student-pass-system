import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { cacheService } from './cache.service';

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: any;
}

export interface AggregatedMetric {
  name: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  tags?: Record<string, string>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export class MetricsService {
  private prisma: PrismaClient;
  private metrics: Map<string, MetricData[]> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
  }

  async recordPrediction(modelName: string, confidence: number, cached: boolean = false): Promise<void> {
    try {
      const metric: MetricData = {
        name: 'ai_prediction',
        value: confidence,
        timestamp: new Date(),
        tags: {
          model: modelName,
          cached: cached.toString()
        }
      };

      await this.recordMetric(metric);
    } catch (error) {
      logger.error('Failed to record prediction metric:', error);
    }
  }

  async recordMetric(metric: MetricData): Promise<void> {
    try {
      // Store in memory for real-time access
      if (!this.metrics.has(metric.name)) {
        this.metrics.set(metric.name, []);
      }
      
      const metricsList = this.metrics.get(metric.name)!;
      metricsList.push(metric);

      // Keep only recent metrics in memory (last 1000 per metric)
      if (metricsList.length > 1000) {
        metricsList.shift();
      }

      // Persist to database
      await this.prisma.metric.create({
        data: {
          name: metric.name,
          value: metric.value,
          timestamp: metric.timestamp,
          tags: metric.tags ? JSON.stringify(metric.tags) : null,
          metadata: metric.metadata ? JSON.stringify(metric.metadata) : null
        }
      });

      // Update cached aggregations
      await this.updateCachedAggregations(metric);
    } catch (error) {
      logger.error('Failed to record metric:', error);
    }
  }

  async getAggregatedMetrics(
    metricName: string,
    startTime: Date,
    endTime: Date,
    tags?: Record<string, string>
  ): Promise<AggregatedMetric | null> {
    try {
      const cacheKey = `metrics:${metricName}:${startTime.getTime()}:${endTime.getTime()}:${JSON.stringify(tags)}`;
      
      // Try cache first
      const cached = await cacheService.get<AggregatedMetric>(cacheKey);
      if (cached) {
        return cached;
      }

      const whereClause: any = {
        name: metricName,
        timestamp: {
          gte: startTime,
          lte: endTime
        }
      };

      if (tags) {
        // This is a simplified tag matching - in production you might want more sophisticated filtering
        whereClause.tags = {
          contains: JSON.stringify(tags).slice(1, -1) // Remove outer braces for partial matching
        };
      }

      const metrics = await this.prisma.metric.findMany({
        where: whereClause,
        orderBy: { timestamp: 'asc' }
      });

      if (metrics.length === 0) {
        return null;
      }

      const values = metrics.map(m => m.value);
      const aggregated: AggregatedMetric = {
        name: metricName,
        count: values.length,
        sum: values.reduce((sum, val) => sum + val, 0),
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        tags,
        timeRange: {
          start: startTime,
          end: endTime
        }
      };

      // Cache for 5 minutes
      await cacheService.set(cacheKey, aggregated, 300);

      return aggregated;
    } catch (error) {
      logger.error('Failed to get aggregated metrics:', error);
      return null;
    }
  }

  private async updateCachedAggregations(metric: MetricData): Promise<void> {
    try {
      // Update various time-based aggregations
      const now = new Date();
      const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Update hourly cache
      const hourlyCacheKey = `metrics_hourly:${metric.name}:${hourStart.getTime()}`;
      const hourlyMetrics = await cacheService.get<MetricData[]>(hourlyCacheKey) || [];
      hourlyMetrics.push(metric);
      await cacheService.set(hourlyCacheKey, hourlyMetrics, 3600); // 1 hour TTL

      // Update daily cache
      const dailyCacheKey = `metrics_daily:${metric.name}:${dayStart.getTime()}`;
      const dailyMetrics = await cacheService.get<MetricData[]>(dailyCacheKey) || [];
      dailyMetrics.push(metric);
      await cacheService.set(dailyCacheKey, dailyMetrics, 86400); // 24 hours TTL
    } catch (error) {
      logger.error('Failed to update cached aggregations:', error);
    }
  }

  async getRealtimeMetrics(metricName: string): Promise<MetricData[]> {
    return this.metrics.get(metricName) || [];
  }

  async recordSystemMetric(name: string, value: number, metadata?: any): Promise<void> {
    const metric: MetricData = {
      name: `system.${name}`,
      value,
      timestamp: new Date(),
      metadata
    };

    await this.recordMetric(metric);
  }

  async recordUserActivity(userId: string, activity: string, metadata?: any): Promise<void> {
    const metric: MetricData = {
      name: 'user_activity',
      value: 1,
      timestamp: new Date(),
      tags: {
        user_id: userId,
        activity
      },
      metadata
    };

    await this.recordMetric(metric);
  }

  async cleanup(): Promise<void> {
    try {
      this.metrics.clear();
      await this.prisma.$disconnect();
      logger.info('Metrics service cleanup completed');
    } catch (error) {
      logger.error('Metrics service cleanup error:', error);
    }
  }
}

export const metricsService = new MetricsService();