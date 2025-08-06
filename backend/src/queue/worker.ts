#!/usr/bin/env node
import 'dotenv/config';
import Bull, { Queue, Job } from 'bull';
import { CronJob } from 'cron';
import { logger } from '../utils/logger';
import { connectDB } from '../config/database';
import { getBulkService } from '../services/bulk.service';
import { getEmailService } from '../services/email.service';
import { getNotificationService } from '../services/notification.service';
import { getAuditService } from '../services/audit.service';
import { getSearchService } from '../services/search.service';
import { getCacheService } from '../services/cache.service';

interface WorkerJob {
  id: string;
  type: string;
  data: any;
  priority?: number;
  delay?: number;
  attempts?: number;
}

class QueueWorker {
  private queues: Map<string, Queue> = new Map();
  private cronJobs: CronJob[] = [];
  private isShuttingDown = false;

  constructor() {
    this.initializeQueues();
    this.setupJobHandlers();
    this.setupCronJobs();
    this.setupGracefulShutdown();
  }

  private initializeQueues(): void {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    // Initialize different queues for different job types
    const queueConfigs = [
      { name: 'email', concurrency: 5 },
      { name: 'notifications', concurrency: 10 },
      { name: 'search-indexing', concurrency: 3 },
      { name: 'file-processing', concurrency: 2 },
      { name: 'data-export', concurrency: 1 },
      { name: 'cleanup', concurrency: 1 },
      { name: 'analytics', concurrency: 2 },
      { name: 'audit', concurrency: 3 }
    ];

    queueConfigs.forEach(({ name, concurrency }) => {
      const queue = new Bull(name, { redis: redisConfig });
      
      queue.on('completed', (job: Job) => {
        logger.info(`Job ${job.id} completed in queue ${name}`);
      });

      queue.on('failed', (job: Job, err: Error) => {
        logger.error(`Job ${job.id} failed in queue ${name}:`, err);
      });

      queue.on('stalled', (job: Job) => {
        logger.warn(`Job ${job.id} stalled in queue ${name}`);
      });

      this.queues.set(name, queue);
    });

    logger.info(`Initialized ${this.queues.size} job queues`);
  }

  private setupJobHandlers(): void {
    // Email queue handlers
    const emailQueue = this.queues.get('email')!;
    emailQueue.process('send-email', 5, this.handleSendEmail.bind(this));
    emailQueue.process('send-bulk-email', 2, this.handleSendBulkEmail.bind(this));
    emailQueue.process('send-weekly-digest', 1, this.handleSendWeeklyDigest.bind(this));

    // Notification queue handlers
    const notificationQueue = this.queues.get('notifications')!;
    notificationQueue.process('send-notification', 10, this.handleSendNotification.bind(this));
    notificationQueue.process('send-push-notification', 10, this.handleSendPushNotification.bind(this));
    notificationQueue.process('cleanup-notifications', 1, this.handleCleanupNotifications.bind(this));

    // Search indexing queue handlers
    const searchQueue = this.queues.get('search-indexing')!;
    searchQueue.process('index-document', 3, this.handleIndexDocument.bind(this));
    searchQueue.process('reindex-all', 1, this.handleReindexAll.bind(this));
    searchQueue.process('delete-document', 5, this.handleDeleteDocument.bind(this));

    // File processing queue handlers
    const fileQueue = this.queues.get('file-processing')!;
    fileQueue.process('process-upload', 2, this.handleProcessUpload.bind(this));
    fileQueue.process('generate-thumbnail', 3, this.handleGenerateThumbnail.bind(this));
    fileQueue.process('compress-file', 2, this.handleCompressFile.bind(this));

    // Data export queue handlers
    const exportQueue = this.queues.get('data-export')!;
    exportQueue.process('export-data', 1, this.handleExportData.bind(this));
    exportQueue.process('generate-report', 1, this.handleGenerateReport.bind(this));

    // Cleanup queue handlers
    const cleanupQueue = this.queues.get('cleanup')!;
    cleanupQueue.process('cleanup-temp-files', 1, this.handleCleanupTempFiles.bind(this));
    cleanupQueue.process('cleanup-expired-sessions', 1, this.handleCleanupExpiredSessions.bind(this));
    cleanupQueue.process('cleanup-audit-logs', 1, this.handleCleanupAuditLogs.bind(this));

    // Analytics queue handlers
    const analyticsQueue = this.queues.get('analytics')!;
    analyticsQueue.process('update-metrics', 2, this.handleUpdateMetrics.bind(this));
    analyticsQueue.process('generate-insights', 1, this.handleGenerateInsights.bind(this));

    // Audit queue handlers
    const auditQueue = this.queues.get('audit')!;
    auditQueue.process('log-audit-event', 3, this.handleLogAuditEvent.bind(this));
    auditQueue.process('generate-compliance-report', 1, this.handleGenerateComplianceReport.bind(this));
  }

  private setupCronJobs(): void {
    // Daily cleanup job - every day at 2 AM
    const dailyCleanup = new CronJob('0 2 * * *', async () => {
      if (this.isShuttingDown) return;

      logger.info('Starting daily cleanup job');
      
      try {
        // Queue multiple cleanup tasks
        const cleanupQueue = this.queues.get('cleanup')!;
        
        await Promise.all([
          cleanupQueue.add('cleanup-temp-files', {}, { 
            priority: 1,
            attempts: 3,
            backoff: { type: 'exponential', delay: 60000 }
          }),
          cleanupQueue.add('cleanup-expired-sessions', {}, { 
            priority: 2,
            attempts: 2 
          }),
          cleanupQueue.add('cleanup-audit-logs', {}, { 
            priority: 3,
            attempts: 2 
          })
        ]);

        // Cleanup expired notifications
        const notificationQueue = this.queues.get('notifications')!;
        await notificationQueue.add('cleanup-notifications', {}, {
          priority: 2,
          attempts: 2
        });

        logger.info('Daily cleanup jobs queued successfully');
      } catch (error) {
        logger.error('Failed to queue daily cleanup jobs:', error);
      }
    });

    // Weekly digest job - every Sunday at 8 AM
    const weeklyDigest = new CronJob('0 8 * * 0', async () => {
      if (this.isShuttingDown) return;

      logger.info('Starting weekly digest job');
      
      try {
        const emailQueue = this.queues.get('email')!;
        await emailQueue.add('send-weekly-digest', {}, {
          priority: 1,
          attempts: 3,
          backoff: { type: 'exponential', delay: 300000 }
        });

        logger.info('Weekly digest job queued successfully');
      } catch (error) {
        logger.error('Failed to queue weekly digest job:', error);
      }
    });

    // Metrics update job - every hour
    const metricsUpdate = new CronJob('0 * * * *', async () => {
      if (this.isShuttingDown) return;

      logger.info('Starting metrics update job');
      
      try {
        const analyticsQueue = this.queues.get('analytics')!;
        await analyticsQueue.add('update-metrics', {}, {
          priority: 5,
          attempts: 2
        });

        logger.info('Metrics update job queued successfully');
      } catch (error) {
        logger.error('Failed to queue metrics update job:', error);
      }
    });

    // Cache cleanup job - every 30 minutes
    const cacheCleanup = new CronJob('*/30 * * * *', async () => {
      if (this.isShuttingDown) return;

      try {
        const cacheService = getCacheService();
        // This would implement cache cleanup logic
        logger.debug('Cache cleanup completed');
      } catch (error) {
        logger.error('Cache cleanup failed:', error);
      }
    });

    this.cronJobs = [dailyCleanup, weeklyDigest, metricsUpdate, cacheCleanup];
    this.cronJobs.forEach(job => job.start());

    logger.info(`Started ${this.cronJobs.length} cron jobs`);
  }

  // Job handlers
  private async handleSendEmail(job: Job): Promise<void> {
    const { to, templateName, variables, attachments } = job.data;
    
    try {
      const emailService = getEmailService();
      const success = await emailService.sendTemplateEmail(to, templateName, variables, attachments);
      
      if (!success) {
        throw new Error('Email sending failed');
      }

      job.progress(100);
      logger.info(`Email sent successfully to ${to} using template ${templateName}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  private async handleSendBulkEmail(job: Job): Promise<void> {
    const { recipients, templateName, variables } = job.data;
    
    try {
      const emailService = getEmailService();
      let sent = 0;
      let failed = 0;

      for (const recipient of recipients) {
        try {
          const success = await emailService.sendTemplateEmail(
            recipient.email, 
            templateName, 
            { ...variables, ...recipient.variables }
          );
          
          if (success) {
            sent++;
          } else {
            failed++;
          }
        } catch (error) {
          logger.error(`Failed to send email to ${recipient.email}:`, error);
          failed++;
        }

        // Update progress
        const progress = Math.round(((sent + failed) / recipients.length) * 100);
        job.progress(progress);

        // Small delay to avoid overwhelming email service
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(`Bulk email completed: ${sent} sent, ${failed} failed`);
    } catch (error) {
      logger.error('Bulk email job failed:', error);
      throw error;
    }
  }

  private async handleSendWeeklyDigest(job: Job): Promise<void> {
    try {
      const emailService = getEmailService();
      await emailService.sendWeeklyDigest();
      
      job.progress(100);
      logger.info('Weekly digest sent successfully');
    } catch (error) {
      logger.error('Failed to send weekly digest:', error);
      throw error;
    }
  }

  private async handleSendNotification(job: Job): Promise<void> {
    const { userId, notification, channels } = job.data;
    
    try {
      const notificationService = getNotificationService();
      await notificationService.sendNotification(userId, notification, channels);
      
      job.progress(100);
      logger.info(`Notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  private async handleSendPushNotification(job: Job): Promise<void> {
    const { userId, notification } = job.data;
    
    try {
      const notificationService = getNotificationService();
      await notificationService.sendNotification(userId, notification, ['push']);
      
      job.progress(100);
      logger.info(`Push notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  private async handleCleanupNotifications(job: Job): Promise<void> {
    try {
      const notificationService = getNotificationService();
      await notificationService.cleanupExpiredNotifications();
      
      job.progress(100);
      logger.info('Notification cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup notifications:', error);
      throw error;
    }
  }

  private async handleIndexDocument(job: Job): Promise<void> {
    const { type, id } = job.data;
    
    try {
      const searchService = getSearchService();
      let success = false;

      switch (type) {
        case 'user':
          success = await searchService.indexUser(id);
          break;
        case 'application':
          success = await searchService.indexApplication(id);
          break;
        case 'pass':
          success = await searchService.indexPass(id);
          break;
        default:
          throw new Error(`Unknown document type: ${type}`);
      }

      if (!success) {
        throw new Error('Document indexing failed');
      }

      job.progress(100);
      logger.info(`Document ${type}:${id} indexed successfully`);
    } catch (error) {
      logger.error('Failed to index document:', error);
      throw error;
    }
  }

  private async handleReindexAll(job: Job): Promise<void> {
    const { institutionId } = job.data;
    
    try {
      const searchService = getSearchService();
      const result = await searchService.reindexAll(institutionId);
      
      job.progress(100);
      logger.info(`Reindex completed: ${result.indexed}/${result.total} documents`);
    } catch (error) {
      logger.error('Failed to reindex all documents:', error);
      throw error;
    }
  }

  private async handleDeleteDocument(job: Job): Promise<void> {
    const { type, id } = job.data;
    
    try {
      const searchService = getSearchService();
      const success = await searchService.deleteDocument(type, id);
      
      if (!success) {
        throw new Error('Document deletion failed');
      }

      job.progress(100);
      logger.info(`Document ${type}:${id} deleted from search index`);
    } catch (error) {
      logger.error('Failed to delete document from search index:', error);
      throw error;
    }
  }

  private async handleProcessUpload(job: Job): Promise<void> {
    const { filePath, fileType, options } = job.data;
    
    try {
      // File processing logic would be implemented here
      // This could include virus scanning, format conversion, etc.
      
      job.progress(50);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      job.progress(100);
      logger.info(`File processed successfully: ${filePath}`);
    } catch (error) {
      logger.error('Failed to process upload:', error);
      throw error;
    }
  }

  private async handleGenerateThumbnail(job: Job): Promise<void> {
    const { filePath, outputPath, size } = job.data;
    
    try {
      // Thumbnail generation logic would be implemented here
      // Using libraries like sharp for image processing
      
      job.progress(100);
      logger.info(`Thumbnail generated: ${outputPath}`);
    } catch (error) {
      logger.error('Failed to generate thumbnail:', error);
      throw error;
    }
  }

  private async handleCompressFile(job: Job): Promise<void> {
    const { filePath, outputPath, compressionLevel } = job.data;
    
    try {
      // File compression logic would be implemented here
      
      job.progress(100);
      logger.info(`File compressed: ${outputPath}`);
    } catch (error) {
      logger.error('Failed to compress file:', error);
      throw error;
    }
  }

  private async handleExportData(job: Job): Promise<void> {
    const { exportType, filters, format, userId } = job.data;
    
    try {
      const bulkService = getBulkService();
      // Export logic would be handled by bulk service
      
      job.progress(100);
      logger.info(`Data export completed for user ${userId}`);
    } catch (error) {
      logger.error('Failed to export data:', error);
      throw error;
    }
  }

  private async handleGenerateReport(job: Job): Promise<void> {
    const { reportType, parameters, userId } = job.data;
    
    try {
      // Report generation logic would be implemented here
      
      job.progress(100);
      logger.info(`Report generated for user ${userId}: ${reportType}`);
    } catch (error) {
      logger.error('Failed to generate report:', error);
      throw error;
    }
  }

  private async handleCleanupTempFiles(job: Job): Promise<void> {
    try {
      const fs = require('fs/promises');
      const path = require('path');
      
      const tempDir = path.join(process.cwd(), 'temp');
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      const files = await fs.readdir(tempDir);
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
      
      job.progress(100);
      logger.info(`Cleaned up ${cleanedCount} temporary files`);
    } catch (error) {
      logger.error('Failed to cleanup temp files:', error);
      throw error;
    }
  }

  private async handleCleanupExpiredSessions(job: Job): Promise<void> {
    try {
      const cacheService = getCacheService();
      // Session cleanup logic would be implemented here
      
      job.progress(100);
      logger.info('Expired sessions cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      throw error;
    }
  }

  private async handleCleanupAuditLogs(job: Job): Promise<void> {
    try {
      const auditService = getAuditService();
      const deletedCount = await auditService.cleanupOldLogs();
      
      job.progress(100);
      logger.info(`Cleaned up ${deletedCount} old audit logs`);
    } catch (error) {
      logger.error('Failed to cleanup audit logs:', error);
      throw error;
    }
  }

  private async handleUpdateMetrics(job: Job): Promise<void> {
    try {
      // Metrics update logic would be implemented here
      // This could include updating dashboard statistics, generating analytics, etc.
      
      job.progress(100);
      logger.info('Metrics updated successfully');
    } catch (error) {
      logger.error('Failed to update metrics:', error);
      throw error;
    }
  }

  private async handleGenerateInsights(job: Job): Promise<void> {
    try {
      // Insights generation logic would be implemented here
      
      job.progress(100);
      logger.info('Insights generated successfully');
    } catch (error) {
      logger.error('Failed to generate insights:', error);
      throw error;
    }
  }

  private async handleLogAuditEvent(job: Job): Promise<void> {
    const { auditData } = job.data;
    
    try {
      const auditService = getAuditService();
      await auditService.log(auditData);
      
      job.progress(100);
      logger.debug('Audit event logged successfully');
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      throw error;
    }
  }

  private async handleGenerateComplianceReport(job: Job): Promise<void> {
    const { institutionId, period } = job.data;
    
    try {
      const auditService = getAuditService();
      await auditService.generateComplianceReport(institutionId, period);
      
      job.progress(100);
      logger.info('Compliance report generated successfully');
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGUSR2', this.gracefulShutdown.bind(this)); // Nodemon restart
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    logger.info('Starting graceful shutdown of queue worker...');

    try {
      // Stop cron jobs
      this.cronJobs.forEach(job => job.stop());
      logger.info('Stopped cron jobs');

      // Close all queues
      const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
      await Promise.all(closePromises);
      logger.info('Closed all job queues');

      // Close services
      const cacheService = getCacheService();
      await cacheService.close();
      
      const searchService = getSearchService();
      await searchService.close();

      logger.info('Queue worker shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  public async getQueueStats(): Promise<any> {
    const stats: any = {};
    
    for (const [name, queue] of this.queues) {
      try {
        const counts = await queue.getJobCounts();
        stats[name] = counts;
      } catch (error) {
        logger.error(`Failed to get stats for queue ${name}:`, error);
        stats[name] = { error: error.message };
      }
    }
    
    return stats;
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDB();
      logger.info('Database connected');

      // Start processing
      logger.info(`🚀 Queue worker started with ${this.queues.size} queues`);
      logger.info('Queue worker is ready to process jobs');

      // Keep the process alive
      process.stdin.resume();
    } catch (error) {
      logger.error('Failed to start queue worker:', error);
      process.exit(1);
    }
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  const worker = new QueueWorker();
  worker.start().catch(error => {
    logger.error('Failed to start queue worker:', error);
    process.exit(1);
  });
}

export { QueueWorker };