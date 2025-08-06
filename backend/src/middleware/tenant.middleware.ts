import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { getCacheService } from '../services/cache.service';

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

export interface TenantContext {
  id: string;
  subdomain: string;
  customDomain?: string;
  name: string;
  displayName: string;
  status: string;
  tier: string;
  settings: any;
  enabledFeatures: string[];
  databaseUrl: string;
  databaseSchema: string;
  storageQuotaGB: number;
  maxUsers: number;
  maxStudents: number;
  dataRegion: string;
  complianceFlags: string[];
  branding: {
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    customCss?: string;
    themeMode: string;
  };
}

class TenantManager {
  private masterPrisma: PrismaClient;
  private tenantConnections: Map<string, PrismaClient> = new Map();
  private cacheService = getCacheService();

  constructor() {
    this.masterPrisma = new PrismaClient({
      datasources: {
        db: { url: process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL }
      }
    });
  }

  /**
   * Resolve tenant from subdomain or custom domain
   */
  async resolveTenant(hostname: string): Promise<TenantContext | null> {
    const cacheKey = `tenant:${hostname}`;
    
    try {
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Tenant resolved from cache: ${hostname}`);
        return JSON.parse(cached);
      }

      // Extract subdomain
      const subdomain = this.extractSubdomain(hostname);
      
      let tenant;
      
      // First try custom domain lookup
      if (hostname !== subdomain && !hostname.includes('localhost')) {
        tenant = await this.masterPrisma.tenant.findUnique({
          where: { customDomain: hostname }
        });
      }
      
      // Fallback to subdomain lookup
      if (!tenant && subdomain) {
        tenant = await this.masterPrisma.tenant.findUnique({
          where: { subdomain }
        });
      }

      if (!tenant) {
        logger.warn(`Tenant not found for hostname: ${hostname}`);
        return null;
      }

      if (tenant.status !== 'ACTIVE') {
        logger.warn(`Tenant is not active: ${tenant.subdomain} (${tenant.status})`);
        return null;
      }

      const tenantContext: TenantContext = {
        id: tenant.id,
        subdomain: tenant.subdomain,
        customDomain: tenant.customDomain || undefined,
        name: tenant.name,
        displayName: tenant.displayName,
        status: tenant.status,
        tier: tenant.tier,
        settings: tenant.settings as any,
        enabledFeatures: tenant.enabledFeatures,
        databaseUrl: tenant.databaseUrl,
        databaseSchema: tenant.databaseSchema,
        storageQuotaGB: tenant.storageQuotaGB,
        maxUsers: tenant.maxUsers,
        maxStudents: tenant.maxStudents,
        dataRegion: tenant.dataRegion,
        complianceFlags: tenant.complianceFlags,
        branding: {
          logoUrl: tenant.logoUrl || undefined,
          faviconUrl: tenant.faviconUrl || undefined,
          primaryColor: tenant.primaryColor || undefined,
          secondaryColor: tenant.secondaryColor || undefined,
          accentColor: tenant.accentColor || undefined,
          customCss: tenant.customCss || undefined,
          themeMode: tenant.themeMode
        }
      };

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, JSON.stringify(tenantContext), 300);
      
      logger.info(`Tenant resolved: ${tenant.subdomain} (${tenant.name})`);
      return tenantContext;

    } catch (error) {
      logger.error(`Failed to resolve tenant for ${hostname}:`, error);
      return null;
    }
  }

  /**
   * Get tenant-specific database connection
   */
  async getTenantConnection(tenantId: string): Promise<PrismaClient> {
    if (this.tenantConnections.has(tenantId)) {
      return this.tenantConnections.get(tenantId)!;
    }

    try {
      const tenant = await this.masterPrisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      const connection = new PrismaClient({
        datasources: {
          db: { url: tenant.databaseUrl }
        }
      });

      // Test connection
      await connection.$connect();
      
      this.tenantConnections.set(tenantId, connection);
      logger.info(`Created database connection for tenant: ${tenant.subdomain}`);
      
      return connection;

    } catch (error) {
      logger.error(`Failed to create tenant connection for ${tenantId}:`, error);
      throw new AppError('Failed to connect to tenant database', 500);
    }
  }

  /**
   * Extract subdomain from hostname
   */
  private extractSubdomain(hostname: string): string {
    // Handle localhost development
    if (hostname.includes('localhost')) {
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost') {
        return parts[0];
      }
      return 'default';
    }

    // Extract subdomain from production domains
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
    
    return 'default';
  }

  /**
   * Validate tenant features
   */
  validateFeature(tenant: TenantContext, feature: string): boolean {
    return tenant.enabledFeatures.includes(feature);
  }

  /**
   * Check tenant limits
   */
  async checkLimits(tenant: TenantContext, type: 'users' | 'students' | 'storage'): Promise<boolean> {
    const connection = await this.getTenantConnection(tenant.id);

    try {
      switch (type) {
        case 'users':
          const userCount = await connection.user.count({
            where: { tenantId: tenant.id, isActive: true }
          });
          return userCount < tenant.maxUsers;

        case 'students':
          const studentCount = await connection.student.count({
            where: { tenantId: tenant.id, deletedAt: null }
          });
          return studentCount < tenant.maxStudents;

        case 'storage':
          // Implementation would check actual storage usage
          // For now, return true
          return true;

        default:
          return true;
      }
    } catch (error) {
      logger.error(`Failed to check limits for tenant ${tenant.id}:`, error);
      return false;
    }
  }

  /**
   * Cleanup connections
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up tenant connections...');
    
    await Promise.all([
      this.masterPrisma.$disconnect(),
      ...Array.from(this.tenantConnections.values()).map(conn => conn.$disconnect())
    ]);
    
    this.tenantConnections.clear();
  }
}

// Singleton instance
const tenantManager = new TenantManager();

/**
 * Middleware to resolve tenant and inject into request
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hostname = req.get('host') || '';
    
    // Skip tenant resolution for health checks and static assets
    if (req.path.startsWith('/health') || req.path.startsWith('/uploads')) {
      return next();
    }

    const tenant = await tenantManager.resolveTenant(hostname);
    
    if (!tenant) {
      // For API requests, return JSON error
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({
          error: 'Tenant not found',
          message: 'Invalid subdomain or domain',
          code: 'TENANT_NOT_FOUND'
        });
      }
      
      // For web requests, redirect to onboarding
      return res.redirect(process.env.ONBOARDING_URL || 'https://signup.studentpass.com');
    }

    // Inject tenant into request
    req.tenant = tenant;
    
    // Set tenant-specific headers
    res.header('X-Tenant-ID', tenant.id);
    res.header('X-Tenant-Name', tenant.name);
    
    next();

  } catch (error) {
    logger.error('Tenant middleware error:', error);
    next(error);
  }
};

/**
 * Middleware to check if tenant has access to specific feature
 */
export const requireFeature = (feature: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(401).json({
        error: 'No tenant context',
        code: 'NO_TENANT'
      });
    }

    if (!tenantManager.validateFeature(req.tenant, feature)) {
      return res.status(403).json({
        error: 'Feature not available',
        message: `Your plan does not include access to ${feature}`,
        code: 'FEATURE_NOT_AVAILABLE',
        requiredFeature: feature
      });
    }

    next();
  };
};

/**
 * Middleware to check tenant limits
 */
export const checkTenantLimits = (type: 'users' | 'students' | 'storage') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(401).json({
        error: 'No tenant context',
        code: 'NO_TENANT'
      });
    }

    try {
      const withinLimits = await tenantManager.checkLimits(req.tenant, type);
      
      if (!withinLimits) {
        return res.status(429).json({
          error: 'Tenant limit exceeded',
          message: `You have reached the maximum ${type} limit for your plan`,
          code: 'LIMIT_EXCEEDED',
          limitType: type
        });
      }

      next();
    } catch (error) {
      logger.error(`Error checking tenant limits for ${type}:`, error);
      next(error);
    }
  };
};

/**
 * Get tenant database connection helper
 */
export const getTenantDb = async (tenantId: string): Promise<PrismaClient> => {
  return tenantManager.getTenantConnection(tenantId);
};

/**
 * Cleanup helper for graceful shutdown
 */
export const cleanupTenantConnections = async (): Promise<void> => {
  await tenantManager.cleanup();
};

export { tenantManager };