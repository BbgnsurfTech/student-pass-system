import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { getCacheService } from './cache.service';
import { getNotificationService } from './notification.service';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as crypto from 'crypto';
import * as ldap from 'ldapjs';
import { parseString } from 'xml2js';
import { promisify } from 'util';

export interface IntegrationConfig {
  type: string;
  name: string;
  baseUrl?: string;
  credentials: {
    username?: string;
    password?: string;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    token?: string;
    certificate?: string;
    privateKey?: string;
    [key: string]: any;
  };
  settings: {
    syncInterval?: number;
    batchSize?: number;
    timeout?: number;
    retryAttempts?: number;
    mapping?: Record<string, string>;
    [key: string]: any;
  };
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: Array<{
    record: any;
    error: string;
  }>;
  duration: number;
}

abstract class BaseIntegration {
  protected config: IntegrationConfig;
  protected httpClient: AxiosInstance;
  protected tenantId: string;
  protected db: PrismaClient;

  constructor(config: IntegrationConfig, tenantId: string, db: PrismaClient) {
    this.config = config;
    this.tenantId = tenantId;
    this.db = db;
    
    // Setup HTTP client with common configuration
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.settings.timeout || 30000,
      headers: {
        'User-Agent': 'StudentPassSystem/1.0',
        'Content-Type': 'application/json'
      }
    });

    this.setupAuth();
    this.setupInterceptors();
  }

  protected setupAuth(): void {
    const { credentials } = this.config;
    
    if (credentials.apiKey) {
      this.httpClient.defaults.headers.common['X-API-Key'] = credentials.apiKey;
    }
    
    if (credentials.username && credentials.password) {
      this.httpClient.defaults.auth = {
        username: credentials.username,
        password: credentials.password
      };
    }
    
    if (credentials.token) {
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${credentials.token}`;
    }
  }

  protected setupInterceptors(): void {
    // Request interceptor for logging and retry logic
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug(`${this.config.type} API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error(`${this.config.type} API Request Error:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug(`${this.config.type} API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      async (error) => {
        logger.error(`${this.config.type} API Response Error:`, error.response?.data || error.message);
        
        // Retry logic for 5xx errors
        if (error.response?.status >= 500 && error.config && !error.config._retry) {
          error.config._retry = true;
          const retryAttempts = this.config.settings.retryAttempts || 3;
          
          for (let i = 0; i < retryAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            
            try {
              return await this.httpClient.request(error.config);
            } catch (retryError) {
              if (i === retryAttempts - 1) {
                return Promise.reject(retryError);
              }
            }
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  abstract testConnection(): Promise<boolean>;
  abstract syncUsers(): Promise<SyncResult>;
  abstract syncStudents(): Promise<SyncResult>;
  abstract authenticate(username: string, password: string): Promise<any>;
}

/**
 * LDAP/Active Directory Integration
 */
class LDAPIntegration extends BaseIntegration {
  private ldapClient?: ldap.Client;

  private connectLDAP(): Promise<ldap.Client> {
    return new Promise((resolve, reject) => {
      const client = ldap.createClient({
        url: this.config.baseUrl!,
        timeout: this.config.settings.timeout || 10000,
        connectTimeout: this.config.settings.timeout || 10000
      });

      client.bind(this.config.credentials.username!, this.config.credentials.password!, (err) => {
        if (err) {
          reject(err);
        } else {
          this.ldapClient = client;
          resolve(client);
        }
      });
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.connectLDAP();
      client.unbind();
      return true;
    } catch (error) {
      logger.error('LDAP connection test failed:', error);
      return false;
    }
  }

  async authenticate(username: string, password: string): Promise<any> {
    try {
      const client = await this.connectLDAP();
      const userDN = `${this.config.settings.userDnTemplate}`.replace('{username}', username);
      
      return new Promise((resolve, reject) => {
        client.bind(userDN, password, (err) => {
          if (err) {
            reject(new AppError('Invalid credentials', 401));
          } else {
            // Get user attributes
            this.searchUser(client, username)
              .then(user => {
                client.unbind();
                resolve(user);
              })
              .catch(reject);
          }
        });
      });
    } catch (error) {
      throw new AppError('LDAP authentication failed', 500);
    }
  }

  private searchUser(client: ldap.Client, username: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const opts: ldap.SearchOptions = {
        filter: `(${this.config.settings.usernameAttribute || 'sAMAccountName'}=${username})`,
        scope: 'sub',
        attributes: ['cn', 'mail', 'sn', 'givenName', 'department', 'title']
      };

      client.search(this.config.settings.baseDN!, opts, (err, res) => {
        if (err) {
          reject(err);
          return;
        }

        let user: any = null;
        
        res.on('searchEntry', (entry) => {
          user = entry.object;
        });

        res.on('error', (err) => {
          reject(err);
        });

        res.on('end', (result) => {
          if (user) {
            resolve(user);
          } else {
            reject(new AppError('User not found', 404));
          }
        });
      });
    });
  }

  async syncUsers(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0
    };

    try {
      const client = await this.connectLDAP();
      const users = await this.getAllUsers(client);
      
      for (const ldapUser of users) {
        try {
          result.recordsProcessed++;
          
          const email = ldapUser.mail || `${ldapUser.sAMAccountName}@${this.config.settings.emailDomain}`;
          const existingUser = await this.db.user.findUnique({
            where: { 
              tenantId_email: {
                tenantId: this.tenantId,
                email: email
              }
            }
          });

          if (existingUser) {
            // Update existing user
            await this.db.user.update({
              where: { id: existingUser.id },
              data: {
                firstName: ldapUser.givenName || existingUser.firstName,
                lastName: ldapUser.sn || existingUser.lastName,
                lastLoginAt: new Date()
              }
            });
            result.recordsUpdated++;
          } else {
            // Create new user
            await this.db.user.create({
              data: {
                tenantId: this.tenantId,
                email: email,
                firstName: ldapUser.givenName || '',
                lastName: ldapUser.sn || '',
                passwordHash: '', // SSO users don't need local password
                isActive: true,
                emailVerifiedAt: new Date()
              }
            });
            result.recordsCreated++;
          }
        } catch (error) {
          result.errors.push({
            record: ldapUser,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      client.unbind();
    } catch (error) {
      result.success = false;
      result.errors.push({
        record: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private getAllUsers(client: ldap.Client): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const users: any[] = [];
      const opts: ldap.SearchOptions = {
        filter: this.config.settings.userFilter || '(objectClass=user)',
        scope: 'sub',
        attributes: ['cn', 'mail', 'sn', 'givenName', 'sAMAccountName', 'department', 'title']
      };

      client.search(this.config.settings.baseDN!, opts, (err, res) => {
        if (err) {
          reject(err);
          return;
        }

        res.on('searchEntry', (entry) => {
          users.push(entry.object);
        });

        res.on('error', (err) => {
          reject(err);
        });

        res.on('end', () => {
          resolve(users);
        });
      });
    });
  }

  async syncStudents(): Promise<SyncResult> {
    // For LDAP, students are usually synced via SIS integration
    return {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0
    };
  }
}

/**
 * Banner SIS Integration
 */
class BannerIntegration extends BaseIntegration {
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/api/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async authenticate(username: string, password: string): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/auth', {
        username,
        password
      });
      
      return response.data;
    } catch (error) {
      throw new AppError('Banner authentication failed', 401);
    }
  }

  async syncUsers(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0
    };

    try {
      const batchSize = this.config.settings.batchSize || 100;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await this.httpClient.get('/api/users', {
          params: { limit: batchSize, offset }
        });

        const users = response.data.users || [];
        hasMore = users.length === batchSize;
        offset += batchSize;

        for (const bannerUser of users) {
          try {
            result.recordsProcessed++;
            
            const existingUser = await this.db.user.findUnique({
              where: { 
                tenantId_email: {
                  tenantId: this.tenantId,
                  email: bannerUser.email
                }
              }
            });

            if (existingUser) {
              await this.db.user.update({
                where: { id: existingUser.id },
                data: {
                  firstName: bannerUser.firstName,
                  lastName: bannerUser.lastName,
                  isActive: bannerUser.status === 'ACTIVE'
                }
              });
              result.recordsUpdated++;
            } else {
              await this.db.user.create({
                data: {
                  tenantId: this.tenantId,
                  email: bannerUser.email,
                  firstName: bannerUser.firstName,
                  lastName: bannerUser.lastName,
                  passwordHash: crypto.randomBytes(32).toString('hex'), // Temporary password
                  isActive: bannerUser.status === 'ACTIVE',
                  emailVerifiedAt: new Date()
                }
              });
              result.recordsCreated++;
            }
          } catch (error) {
            result.errors.push({
              record: bannerUser,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        record: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  async syncStudents(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0
    };

    try {
      const batchSize = this.config.settings.batchSize || 100;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await this.httpClient.get('/api/students', {
          params: { limit: batchSize, offset }
        });

        const students = response.data.students || [];
        hasMore = students.length === batchSize;
        offset += batchSize;

        for (const bannerStudent of students) {
          try {
            result.recordsProcessed++;
            
            const existingStudent = await this.db.student.findUnique({
              where: { 
                tenantId_studentId: {
                  tenantId: this.tenantId,
                  studentId: bannerStudent.studentId
                }
              }
            });

            if (existingStudent) {
              await this.db.student.update({
                where: { id: existingStudent.id },
                data: {
                  email: bannerStudent.email,
                  firstName: bannerStudent.firstName,
                  lastName: bannerStudent.lastName,
                  program: bannerStudent.program,
                  yearOfStudy: bannerStudent.yearOfStudy,
                  status: bannerStudent.status
                }
              });
              result.recordsUpdated++;
            } else {
              // Create student application first
              const application = await this.db.studentApplication.create({
                data: {
                  tenantId: this.tenantId,
                  studentId: bannerStudent.studentId,
                  email: bannerStudent.email,
                  firstName: bannerStudent.firstName,
                  lastName: bannerStudent.lastName,
                  schoolId: this.config.settings.defaultSchoolId,
                  status: 'approved',
                  appliedAt: new Date(),
                  reviewedAt: new Date()
                }
              });

              // Create student record
              await this.db.student.create({
                data: {
                  tenantId: this.tenantId,
                  applicationId: application.id,
                  studentId: bannerStudent.studentId,
                  email: bannerStudent.email,
                  firstName: bannerStudent.firstName,
                  lastName: bannerStudent.lastName,
                  schoolId: this.config.settings.defaultSchoolId,
                  program: bannerStudent.program,
                  yearOfStudy: bannerStudent.yearOfStudy,
                  status: bannerStudent.status || 'active',
                  enrollmentDate: bannerStudent.enrollmentDate ? new Date(bannerStudent.enrollmentDate) : new Date()
                }
              });
              result.recordsCreated++;
            }
          } catch (error) {
            result.errors.push({
              record: bannerStudent,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        record: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }
}

/**
 * Canvas LMS Integration
 */
class CanvasIntegration extends BaseIntegration {
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/api/v1/courses');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async authenticate(username: string, password: string): Promise<any> {
    // Canvas typically uses OAuth2 or API tokens, not username/password
    throw new AppError('Canvas uses OAuth2 authentication', 400);
  }

  async syncUsers(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0
    };

    try {
      const response = await this.httpClient.get('/api/v1/accounts/self/users', {
        params: { per_page: this.config.settings.batchSize || 100 }
      });

      const users = response.data;

      for (const canvasUser of users) {
        try {
          result.recordsProcessed++;
          
          if (!canvasUser.email) {
            result.recordsSkipped++;
            continue;
          }

          const existingUser = await this.db.user.findUnique({
            where: { 
              tenantId_email: {
                tenantId: this.tenantId,
                email: canvasUser.email
              }
            }
          });

          if (existingUser) {
            await this.db.user.update({
              where: { id: existingUser.id },
              data: {
                firstName: canvasUser.name?.split(' ')[0] || existingUser.firstName,
                lastName: canvasUser.name?.split(' ').slice(1).join(' ') || existingUser.lastName
              }
            });
            result.recordsUpdated++;
          } else {
            await this.db.user.create({
              data: {
                tenantId: this.tenantId,
                email: canvasUser.email,
                firstName: canvasUser.name?.split(' ')[0] || '',
                lastName: canvasUser.name?.split(' ').slice(1).join(' ') || '',
                passwordHash: crypto.randomBytes(32).toString('hex'),
                isActive: true,
                emailVerifiedAt: new Date()
              }
            });
            result.recordsCreated++;
          }
        } catch (error) {
          result.errors.push({
            record: canvasUser,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        record: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  async syncStudents(): Promise<SyncResult> {
    // Canvas student sync would be similar to users
    // Implementation would depend on Canvas API structure
    return this.syncUsers(); // Simplified for now
  }
}

/**
 * Integration Service Manager
 */
export class IntegrationService {
  private cacheService = getCacheService();
  private notificationService = getNotificationService();
  private integrations: Map<string, BaseIntegration> = new Map();

  /**
   * Create integration instance
   */
  createIntegration(config: IntegrationConfig, tenantId: string, db: PrismaClient): BaseIntegration {
    const key = `${tenantId}:${config.type}:${config.name}`;
    
    if (this.integrations.has(key)) {
      return this.integrations.get(key)!;
    }

    let integration: BaseIntegration;

    switch (config.type) {
      case 'AD_LDAP':
        integration = new LDAPIntegration(config, tenantId, db);
        break;
      case 'SIS_BANNER':
        integration = new BannerIntegration(config, tenantId, db);
        break;
      case 'LMS_CANVAS':
        integration = new CanvasIntegration(config, tenantId, db);
        break;
      default:
        throw new AppError(`Unsupported integration type: ${config.type}`, 400);
    }

    this.integrations.set(key, integration);
    return integration;
  }

  /**
   * Test integration connection
   */
  async testIntegration(config: IntegrationConfig, tenantId: string, db: PrismaClient): Promise<boolean> {
    try {
      const integration = this.createIntegration(config, tenantId, db);
      return await integration.testConnection();
    } catch (error) {
      logger.error(`Integration test failed for ${config.type}:`, error);
      return false;
    }
  }

  /**
   * Run integration sync
   */
  async runSync(integrationId: string, tenantId: string, db: PrismaClient): Promise<SyncResult> {
    try {
      const integration = await db.tenantIntegration.findUnique({
        where: { id: integrationId }
      });

      if (!integration || integration.tenantId !== tenantId) {
        throw new AppError('Integration not found', 404);
      }

      const config: IntegrationConfig = {
        type: integration.type,
        name: integration.name,
        baseUrl: integration.configuration.baseUrl,
        credentials: integration.credentials as any,
        settings: integration.configuration.settings || {}
      };

      const integrationInstance = this.createIntegration(config, tenantId, db);
      
      // Update sync status
      await db.tenantIntegration.update({
        where: { id: integrationId },
        data: { 
          syncStatus: 'IN_PROGRESS',
          lastSyncAt: new Date()
        }
      });

      // Run sync based on integration type
      let syncResult: SyncResult;
      if (config.settings.syncType === 'students') {
        syncResult = await integrationInstance.syncStudents();
      } else {
        syncResult = await integrationInstance.syncUsers();
      }

      // Update integration status
      await db.tenantIntegration.update({
        where: { id: integrationId },
        data: {
          syncStatus: syncResult.success ? 'SUCCESS' : 'FAILED',
          errorMessage: syncResult.errors.length > 0 ? 
            syncResult.errors.map(e => e.error).join('; ') : null
        }
      });

      // Send notification if there were errors
      if (syncResult.errors.length > 0) {
        await this.notificationService.sendTenantNotification(tenantId, {
          type: 'INTEGRATION',
          title: 'Integration Sync Completed with Errors',
          message: `${config.name} sync processed ${syncResult.recordsProcessed} records with ${syncResult.errors.length} errors`,
          severity: 'WARNING'
        });
      }

      logger.info(`Integration sync completed: ${config.name} - ${JSON.stringify(syncResult)}`);
      return syncResult;

    } catch (error) {
      logger.error(`Integration sync failed for ${integrationId}:`, error);
      
      // Update integration with error status
      await db.tenantIntegration.update({
        where: { id: integrationId },
        data: {
          syncStatus: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  /**
   * Authenticate user via integration
   */
  async authenticateUser(
    tenantId: string, 
    integrationType: string, 
    username: string, 
    password: string,
    db: PrismaClient
  ): Promise<any> {
    try {
      const integration = await db.tenantIntegration.findFirst({
        where: {
          tenantId,
          type: integrationType,
          isActive: true
        }
      });

      if (!integration) {
        throw new AppError('Integration not configured', 404);
      }

      const config: IntegrationConfig = {
        type: integration.type,
        name: integration.name,
        baseUrl: integration.configuration.baseUrl,
        credentials: integration.credentials as any,
        settings: integration.configuration.settings || {}
      };

      const integrationInstance = this.createIntegration(config, tenantId, db);
      return await integrationInstance.authenticate(username, password);

    } catch (error) {
      logger.error(`Integration authentication failed:`, error);
      throw error;
    }
  }

  /**
   * Schedule automatic syncs
   */
  async scheduleSync(integrationId: string, tenantId: string, db: PrismaClient): Promise<void> {
    // Implementation would use a job queue like Bull or Agenda
    // For now, just log the intent
    logger.info(`Scheduling sync for integration: ${integrationId}`);
  }

  /**
   * Clean up integration connections
   */
  cleanup(): void {
    this.integrations.clear();
  }
}

// Singleton instance
let integrationService: IntegrationService;

export const getIntegrationService = (): IntegrationService => {
  if (!integrationService) {
    integrationService = new IntegrationService();
  }
  return integrationService;
};