import Bull, { Queue, Job } from 'bull';
import { parse as csvParse } from 'csv-parse/sync';
import { stringify as csvStringify } from 'csv-stringify/sync';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { getCacheService } from './cache.service';
import { getNotificationService } from './notification.service';

interface BulkOperationJob {
  id: string;
  type: 'import' | 'export' | 'generate_passes' | 'update_status' | 'delete';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  userId: string;
  institutionId?: string;
  data: any;
  errors: string[];
  result?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface ImportOptions {
  skipDuplicates: boolean;
  updateExisting: boolean;
  validateData: boolean;
  chunkSize: number;
}

interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeDeleted: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export class BulkService {
  private importQueue: Queue;
  private exportQueue: Queue;
  private processQueue: Queue;
  private cacheService = getCacheService();
  private notificationService = getNotificationService();

  constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    this.importQueue = new Bull('bulk-import', { redis: redisConfig });
    this.exportQueue = new Bull('bulk-export', { redis: redisConfig });
    this.processQueue = new Bull('bulk-process', { redis: redisConfig });

    this.setupQueueHandlers();
    this.setupQueueEvents();

    logger.info('Bulk service initialized with queue processing');
  }

  private setupQueueHandlers(): void {
    // Import queue handlers
    this.importQueue.process('import-users', this.processUserImport.bind(this));
    this.importQueue.process('import-students', this.processStudentImport.bind(this));
    this.importQueue.process('import-applications', this.processApplicationImport.bind(this));

    // Export queue handlers
    this.exportQueue.process('export-users', this.processUserExport.bind(this));
    this.exportQueue.process('export-students', this.processStudentExport.bind(this));
    this.exportQueue.process('export-applications', this.processApplicationExport.bind(this));
    this.exportQueue.process('export-passes', this.processPassExport.bind(this));

    // Processing queue handlers
    this.processQueue.process('generate-passes-bulk', this.processPassGeneration.bind(this));
    this.processQueue.process('update-status-bulk', this.processStatusUpdate.bind(this));
    this.processQueue.process('cleanup-expired', this.processCleanup.bind(this));
  }

  private setupQueueEvents(): void {
    const queues = [this.importQueue, this.exportQueue, this.processQueue];

    queues.forEach(queue => {
      queue.on('completed', (job: Job) => {
        logger.info(`Job ${job.id} completed successfully`);
        this.updateJobStatus(job.id as string, 'completed');
      });

      queue.on('failed', (job: Job, err: Error) => {
        logger.error(`Job ${job.id} failed:`, err);
        this.updateJobStatus(job.id as string, 'failed', [err.message]);
      });

      queue.on('progress', (job: Job, progress: number) => {
        this.updateJobProgress(job.id as string, progress);
      });
    });
  }

  private async updateJobStatus(
    jobId: string, 
    status: BulkOperationJob['status'], 
    errors?: string[]
  ): Promise<void> {
    try {
      await this.cacheService.hset('bulk_jobs', jobId, {
        status,
        errors: errors || [],
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Failed to update job status:', error);
    }
  }

  private async updateJobProgress(jobId: string, processedRecords: number): Promise<void> {
    try {
      const job = await this.getJobStatus(jobId);
      if (job) {
        const progress = job.totalRecords > 0 ? (processedRecords / job.totalRecords) * 100 : 0;
        
        await this.cacheService.hset('bulk_jobs', jobId, {
          ...job,
          processedRecords,
          progress,
          updatedAt: new Date()
        });

        // Send real-time update to user
        this.notificationService.sendNotification(job.userId, {
          title: 'Bulk Operation Progress',
          message: `${Math.round(progress)}% completed (${processedRecords}/${job.totalRecords})`,
          type: 'info',
          data: { jobId, progress, processedRecords }
        }, ['realtime']);
      }
    } catch (error) {
      logger.error('Failed to update job progress:', error);
    }
  }

  // User Import/Export
  public async importUsers(
    filePath: string, 
    userId: string, 
    institutionId: string,
    options: Partial<ImportOptions> = {}
  ): Promise<string> {
    const jobId = uuidv4();
    const defaultOptions: ImportOptions = {
      skipDuplicates: true,
      updateExisting: false,
      validateData: true,
      chunkSize: 100,
      ...options
    };

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const records = csvParse(fileContent, { columns: true, skip_empty_lines: true });

      // Store job information
      const job: BulkOperationJob = {
        id: jobId,
        type: 'import',
        status: 'pending',
        totalRecords: records.length,
        processedRecords: 0,
        failedRecords: 0,
        userId,
        institutionId,
        data: { filePath, options: defaultOptions },
        errors: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.cacheService.hset('bulk_jobs', jobId, job);

      // Add to queue
      await this.importQueue.add('import-users', {
        jobId,
        records,
        options: defaultOptions,
        userId,
        institutionId
      }, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });

      return jobId;
    } catch (error) {
      logger.error('Failed to queue user import:', error);
      throw error;
    }
  }

  public async exportUsers(
    userId: string,
    institutionId: string,
    options: Partial<ExportOptions> = {}
  ): Promise<string> {
    const jobId = uuidv4();
    const defaultOptions: ExportOptions = {
      format: 'csv',
      includeDeleted: false,
      ...options
    };

    try {
      // Count total records for progress tracking
      const whereClause: any = { institutionId };
      if (!defaultOptions.includeDeleted) {
        whereClause.deletedAt = null;
      }
      if (defaultOptions.dateRange) {
        whereClause.createdAt = {
          gte: defaultOptions.dateRange.start,
          lte: defaultOptions.dateRange.end
        };
      }

      const totalRecords = await prisma.user.count({ where: whereClause });

      const job: BulkOperationJob = {
        id: jobId,
        type: 'export',
        status: 'pending',
        totalRecords,
        processedRecords: 0,
        failedRecords: 0,
        userId,
        institutionId,
        data: { options: defaultOptions },
        errors: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.cacheService.hset('bulk_jobs', jobId, job);

      // Add to queue
      await this.exportQueue.add('export-users', {
        jobId,
        options: defaultOptions,
        userId,
        institutionId
      }, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });

      return jobId;
    } catch (error) {
      logger.error('Failed to queue user export:', error);
      throw error;
    }
  }

  private async processUserImport(job: Job): Promise<void> {
    const { jobId, records, options, userId, institutionId } = job.data;
    const errors: string[] = [];
    let processedCount = 0;
    let failedCount = 0;

    try {
      // Process in chunks
      for (let i = 0; i < records.length; i += options.chunkSize) {
        const chunk = records.slice(i, i + options.chunkSize);
        
        for (const record of chunk) {
          try {
            // Validate required fields
            if (!record.email || !record.name) {
              throw new Error('Missing required fields: email or name');
            }

            // Check if user exists
            const existingUser = await prisma.user.findUnique({
              where: { email: record.email }
            });

            if (existingUser) {
              if (options.skipDuplicates) {
                processedCount++;
                continue;
              }
              if (options.updateExisting) {
                await prisma.user.update({
                  where: { id: existingUser.id },
                  data: {
                    name: record.name,
                    phone: record.phone,
                    updatedAt: new Date()
                  }
                });
              }
            } else {
              // Create new user
              await prisma.user.create({
                data: {
                  email: record.email,
                  name: record.name,
                  phone: record.phone,
                  role: record.role || 'student',
                  institutionId,
                  isActive: true,
                  emailVerified: false
                }
              });
            }

            processedCount++;
          } catch (error: any) {
            errors.push(`Row ${i + 1}: ${error.message}`);
            failedCount++;
          }
        }

        // Update progress
        job.progress(processedCount);
        await this.updateJobProgress(jobId, processedCount);
      }

      // Update final status
      await this.cacheService.hset('bulk_jobs', jobId, {
        status: 'completed',
        processedRecords: processedCount,
        failedRecords: failedCount,
        errors,
        updatedAt: new Date()
      });

      // Send completion notification
      await this.notificationService.sendNotification(userId, {
        title: 'User Import Completed',
        message: `Imported ${processedCount} users successfully. ${failedCount} failed.`,
        type: failedCount > 0 ? 'warning' : 'success'
      });

    } catch (error: any) {
      logger.error('User import job failed:', error);
      await this.cacheService.hset('bulk_jobs', jobId, {
        status: 'failed',
        errors: [error.message],
        updatedAt: new Date()
      });
      throw error;
    }
  }

  private async processUserExport(job: Job): Promise<void> {
    const { jobId, options, userId, institutionId } = job.data;

    try {
      // Build query
      const whereClause: any = { institutionId };
      if (!options.includeDeleted) {
        whereClause.deletedAt = null;
      }
      if (options.dateRange) {
        whereClause.createdAt = {
          gte: options.dateRange.start,
          lte: options.dateRange.end
        };
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Generate export file
      const fileName = `users_export_${Date.now()}.${options.format}`;
      const filePath = path.join(process.cwd(), 'uploads', 'exports', fileName);

      // Ensure export directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      if (options.format === 'csv') {
        const csv = csvStringify(users, { header: true });
        await fs.writeFile(filePath, csv);
      } else {
        await fs.writeFile(filePath, JSON.stringify(users, null, 2));
      }

      // Update job with result
      await this.cacheService.hset('bulk_jobs', jobId, {
        status: 'completed',
        processedRecords: users.length,
        result: { filePath, fileName, downloadUrl: `/uploads/exports/${fileName}` },
        updatedAt: new Date()
      });

      // Send completion notification
      await this.notificationService.sendNotification(userId, {
        title: 'User Export Completed',
        message: `Exported ${users.length} users successfully.`,
        type: 'success',
        action: {
          url: `/downloads/${jobId}`,
          label: 'Download File'
        }
      });

    } catch (error: any) {
      logger.error('User export job failed:', error);
      throw error;
    }
  }

  // Pass Generation in Bulk
  public async generatePassesBulk(
    applicationIds: string[],
    userId: string,
    institutionId: string
  ): Promise<string> {
    const jobId = uuidv4();

    try {
      const job: BulkOperationJob = {
        id: jobId,
        type: 'generate_passes',
        status: 'pending',
        totalRecords: applicationIds.length,
        processedRecords: 0,
        failedRecords: 0,
        userId,
        institutionId,
        data: { applicationIds },
        errors: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.cacheService.hset('bulk_jobs', jobId, job);

      await this.processQueue.add('generate-passes-bulk', {
        jobId,
        applicationIds,
        userId,
        institutionId
      }, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });

      return jobId;
    } catch (error) {
      logger.error('Failed to queue bulk pass generation:', error);
      throw error;
    }
  }

  private async processPassGeneration(job: Job): Promise<void> {
    const { jobId, applicationIds, userId, institutionId } = job.data;
    const errors: string[] = [];
    let processedCount = 0;
    let failedCount = 0;

    try {
      for (const applicationId of applicationIds) {
        try {
          // Get application details
          const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: { student: { include: { user: true } } }
          });

          if (!application) {
            throw new Error('Application not found');
          }

          if (application.status !== 'approved') {
            throw new Error('Application not approved');
          }

          // Check if pass already exists
          const existingPass = await prisma.pass.findUnique({
            where: { applicationId }
          });

          if (existingPass) {
            throw new Error('Pass already exists for this application');
          }

          // Generate QR code data
          const qrData = JSON.stringify({
            passId: uuidv4(),
            studentId: application.studentId,
            applicationId: application.id,
            institutionId,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
          });

          // Create pass
          await prisma.pass.create({
            data: {
              studentId: application.studentId,
              applicationId: application.id,
              institutionId,
              qrCode: qrData,
              status: 'active',
              validFrom: new Date(),
              validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          });

          processedCount++;
        } catch (error: any) {
          errors.push(`Application ${applicationId}: ${error.message}`);
          failedCount++;
        }

        // Update progress
        job.progress(processedCount + failedCount);
        await this.updateJobProgress(jobId, processedCount + failedCount);
      }

      // Send completion notification
      await this.notificationService.sendNotification(userId, {
        title: 'Bulk Pass Generation Completed',
        message: `Generated ${processedCount} passes successfully. ${failedCount} failed.`,
        type: failedCount > 0 ? 'warning' : 'success'
      });

    } catch (error: any) {
      logger.error('Bulk pass generation job failed:', error);
      throw error;
    }
  }

  // Status Updates in Bulk
  public async updateStatusBulk(
    entityType: 'application' | 'pass' | 'user',
    entityIds: string[],
    status: string,
    userId: string,
    institutionId: string
  ): Promise<string> {
    const jobId = uuidv4();

    try {
      const job: BulkOperationJob = {
        id: jobId,
        type: 'update_status',
        status: 'pending',
        totalRecords: entityIds.length,
        processedRecords: 0,
        failedRecords: 0,
        userId,
        institutionId,
        data: { entityType, entityIds, status },
        errors: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.cacheService.hset('bulk_jobs', jobId, job);

      await this.processQueue.add('update-status-bulk', {
        jobId,
        entityType,
        entityIds,
        status,
        userId,
        institutionId
      }, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });

      return jobId;
    } catch (error) {
      logger.error('Failed to queue bulk status update:', error);
      throw error;
    }
  }

  private async processStatusUpdate(job: Job): Promise<void> {
    const { jobId, entityType, entityIds, status, userId } = job.data;
    const errors: string[] = [];
    let processedCount = 0;
    let failedCount = 0;

    try {
      for (const entityId of entityIds) {
        try {
          switch (entityType) {
            case 'application':
              await prisma.application.update({
                where: { id: entityId },
                data: { status, updatedAt: new Date() }
              });
              break;
            case 'pass':
              await prisma.pass.update({
                where: { id: entityId },
                data: { status, updatedAt: new Date() }
              });
              break;
            case 'user':
              await prisma.user.update({
                where: { id: entityId },
                data: { isActive: status === 'active', updatedAt: new Date() }
              });
              break;
          }

          processedCount++;
        } catch (error: any) {
          errors.push(`${entityType} ${entityId}: ${error.message}`);
          failedCount++;
        }

        // Update progress
        job.progress(processedCount + failedCount);
        await this.updateJobProgress(jobId, processedCount + failedCount);
      }

      // Send completion notification
      await this.notificationService.sendNotification(userId, {
        title: 'Bulk Status Update Completed',
        message: `Updated ${processedCount} ${entityType}s successfully. ${failedCount} failed.`,
        type: failedCount > 0 ? 'warning' : 'success'
      });

    } catch (error: any) {
      logger.error('Bulk status update job failed:', error);
      throw error;
    }
  }

  // Cleanup Operations
  public async scheduleCleanup(
    type: 'expired_passes' | 'old_notifications' | 'inactive_users',
    userId: string
  ): Promise<string> {
    const jobId = uuidv4();

    try {
      const job: BulkOperationJob = {
        id: jobId,
        type: 'delete',
        status: 'pending',
        totalRecords: 0, // Will be determined during processing
        processedRecords: 0,
        failedRecords: 0,
        userId,
        data: { cleanupType: type },
        errors: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.cacheService.hset('bulk_jobs', jobId, job);

      await this.processQueue.add('cleanup-expired', {
        jobId,
        cleanupType: type,
        userId
      }, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });

      return jobId;
    } catch (error) {
      logger.error('Failed to schedule cleanup:', error);
      throw error;
    }
  }

  private async processCleanup(job: Job): Promise<void> {
    const { jobId, cleanupType, userId } = job.data;
    let processedCount = 0;

    try {
      switch (cleanupType) {
        case 'expired_passes':
          const expiredPasses = await prisma.pass.deleteMany({
            where: {
              validUntil: { lt: new Date() },
              status: 'expired'
            }
          });
          processedCount = expiredPasses.count;
          break;

        case 'old_notifications':
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const oldNotifications = await prisma.notification.deleteMany({
            where: {
              createdAt: { lt: thirtyDaysAgo },
              isRead: true
            }
          });
          processedCount = oldNotifications.count;
          break;

        case 'inactive_users':
          const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
          const inactiveUsers = await prisma.user.updateMany({
            where: {
              lastSeen: { lt: sixMonthsAgo },
              isActive: true,
              role: 'student'
            },
            data: { isActive: false }
          });
          processedCount = inactiveUsers.count;
          break;
      }

      // Send completion notification
      await this.notificationService.sendNotification(userId, {
        title: 'Cleanup Completed',
        message: `Cleaned up ${processedCount} records of type: ${cleanupType}`,
        type: 'success'
      });

    } catch (error: any) {
      logger.error('Cleanup job failed:', error);
      throw error;
    }
  }

  // Job Management
  public async getJobStatus(jobId: string): Promise<BulkOperationJob | null> {
    return await this.cacheService.hget<BulkOperationJob>('bulk_jobs', jobId);
  }

  public async getUserJobs(userId: string): Promise<BulkOperationJob[]> {
    const allJobs = await this.cacheService.hgetall<BulkOperationJob>('bulk_jobs');
    if (!allJobs) return [];

    return Object.values(allJobs).filter(job => job.userId === userId);
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    try {
      const queues = [this.importQueue, this.exportQueue, this.processQueue];
      
      for (const queue of queues) {
        const job = await queue.getJob(jobId);
        if (job) {
          await job.remove();
          await this.updateJobStatus(jobId, 'failed', ['Job cancelled by user']);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to cancel job:', error);
      return false;
    }
  }

  public async getQueueStats(): Promise<any> {
    const stats = await Promise.all([
      this.importQueue.getJobCounts(),
      this.exportQueue.getJobCounts(),
      this.processQueue.getJobCounts()
    ]);

    return {
      import: stats[0],
      export: stats[1],
      process: stats[2]
    };
  }

  public async close(): Promise<void> {
    await Promise.all([
      this.importQueue.close(),
      this.exportQueue.close(),
      this.processQueue.close()
    ]);
    logger.info('Bulk service queues closed');
  }
}

let bulkService: BulkService | null = null;

export const getBulkService = (): BulkService => {
  if (!bulkService) {
    bulkService = new BulkService();
  }
  return bulkService;
};