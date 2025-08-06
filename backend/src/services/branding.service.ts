import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { getCacheService } from './cache.service';
import { TenantContext } from '../middleware/tenant.middleware';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { S3 } from 'aws-sdk';

export interface BrandingConfig {
  logo?: {
    url?: string;
    file?: Buffer;
    filename?: string;
  };
  favicon?: {
    url?: string;
    file?: Buffer;
    filename?: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success?: string;
    warning?: string;
    error?: string;
    background?: string;
    surface?: string;
    text?: string;
  };
  typography?: {
    fontFamily: string;
    headingFontFamily?: string;
    fontSizes?: Record<string, string>;
  };
  layout?: {
    borderRadius: string;
    spacing: string;
    shadows?: boolean;
  };
  customCss?: string;
  themeMode: 'LIGHT' | 'DARK' | 'AUTO';
}

export interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  category: 'authentication' | 'notifications' | 'system' | 'custom';
}

export interface CustomField {
  id?: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'file';
  required: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  entityType: 'student' | 'user' | 'application';
  section?: string;
  order: number;
  isActive: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  type: 'manual' | 'automatic' | 'conditional';
  assigneeRole?: string;
  assigneeUser?: string;
  requiredFields?: string[];
  conditions?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  }[];
  actions?: {
    type: 'email' | 'webhook' | 'status_change' | 'assignment';
    config: any;
  }[];
  timeoutDays?: number;
  nextStepId?: string;
  order: number;
}

export class BrandingService {
  private cacheService = getCacheService();
  private s3Client?: S3;

  constructor() {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
    }
  }

  /**
   * Get tenant branding configuration
   */
  async getBrandingConfig(tenantId: string, db: PrismaClient): Promise<BrandingConfig> {
    const cacheKey = `branding:${tenantId}`;
    
    try {
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const tenant = await db.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      const brandingConfig: BrandingConfig = {
        logo: {
          url: tenant.logoUrl || undefined
        },
        favicon: {
          url: tenant.faviconUrl || undefined
        },
        colors: {
          primary: tenant.primaryColor || '#2563eb',
          secondary: tenant.secondaryColor || '#64748b',
          accent: tenant.accentColor || '#dc2626'
        },
        customCss: tenant.customCss || undefined,
        themeMode: (tenant.themeMode as 'LIGHT' | 'DARK' | 'AUTO') || 'LIGHT'
      };

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, JSON.stringify(brandingConfig), 1800);
      
      return brandingConfig;

    } catch (error) {
      logger.error(`Failed to get branding config for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Update tenant branding configuration
   */
  async updateBrandingConfig(
    tenantId: string, 
    config: Partial<BrandingConfig>, 
    db: PrismaClient
  ): Promise<BrandingConfig> {
    try {
      const updateData: any = {};

      if (config.colors) {
        updateData.primaryColor = config.colors.primary;
        updateData.secondaryColor = config.colors.secondary;
        updateData.accentColor = config.colors.accent;
      }

      if (config.customCss !== undefined) {
        updateData.customCss = config.customCss;
      }

      if (config.themeMode) {
        updateData.themeMode = config.themeMode;
      }

      // Handle logo upload
      if (config.logo?.file && config.logo?.filename) {
        const logoUrl = await this.uploadBrandingAsset(
          tenantId,
          'logo',
          config.logo.file,
          config.logo.filename
        );
        updateData.logoUrl = logoUrl;
      }

      // Handle favicon upload
      if (config.favicon?.file && config.favicon?.filename) {
        const faviconUrl = await this.uploadBrandingAsset(
          tenantId,
          'favicon',
          config.favicon.file,
          config.favicon.filename
        );
        updateData.faviconUrl = faviconUrl;
      }

      await db.tenant.update({
        where: { id: tenantId },
        data: updateData
      });

      // Clear cache
      await this.cacheService.delete(`branding:${tenantId}`);

      // Return updated config
      return await this.getBrandingConfig(tenantId, db);

    } catch (error) {
      logger.error(`Failed to update branding config for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Upload branding assets (logo, favicon)
   */
  private async uploadBrandingAsset(
    tenantId: string,
    assetType: 'logo' | 'favicon',
    file: Buffer,
    filename: string
  ): Promise<string> {
    try {
      // Process image based on type
      let processedImage: Buffer;
      const fileExtension = path.extname(filename).toLowerCase();
      const baseFilename = `${tenantId}-${assetType}-${Date.now()}`;

      if (assetType === 'logo') {
        // Resize logo to standard sizes
        processedImage = await sharp(file)
          .resize(200, 60, { fit: 'inside', withoutEnlargement: true })
          .png({ quality: 90 })
          .toBuffer();
      } else { // favicon
        // Create favicon in multiple sizes
        processedImage = await sharp(file)
          .resize(32, 32, { fit: 'cover' })
          .png({ quality: 90 })
          .toBuffer();
      }

      // Upload to S3 if configured
      if (this.s3Client && process.env.AWS_S3_BUCKET) {
        const key = `branding/${tenantId}/${baseFilename}.png`;
        
        await this.s3Client.upload({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: processedImage,
          ContentType: 'image/png',
          ACL: 'public-read'
        }).promise();

        return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
      }

      // Fallback to local storage
      const uploadsDir = path.join(process.cwd(), 'uploads', 'branding', tenantId);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const localPath = path.join(uploadsDir, `${baseFilename}.png`);
      fs.writeFileSync(localPath, processedImage);

      return `/uploads/branding/${tenantId}/${baseFilename}.png`;

    } catch (error) {
      logger.error(`Failed to upload branding asset:`, error);
      throw new AppError('Failed to upload asset', 500);
    }
  }

  /**
   * Generate CSS variables from branding config
   */
  generateCSSVariables(config: BrandingConfig): string {
    const variables = [
      `--color-primary: ${config.colors.primary};`,
      `--color-secondary: ${config.colors.secondary};`,
      `--color-accent: ${config.colors.accent};`
    ];

    if (config.colors.success) variables.push(`--color-success: ${config.colors.success};`);
    if (config.colors.warning) variables.push(`--color-warning: ${config.colors.warning};`);
    if (config.colors.error) variables.push(`--color-error: ${config.colors.error};`);
    if (config.colors.background) variables.push(`--color-background: ${config.colors.background};`);
    if (config.colors.surface) variables.push(`--color-surface: ${config.colors.surface};`);
    if (config.colors.text) variables.push(`--color-text: ${config.colors.text};`);

    if (config.typography?.fontFamily) {
      variables.push(`--font-family: ${config.typography.fontFamily};`);
    }

    if (config.typography?.headingFontFamily) {
      variables.push(`--heading-font-family: ${config.typography.headingFontFamily};`);
    }

    if (config.layout?.borderRadius) {
      variables.push(`--border-radius: ${config.layout.borderRadius};`);
    }

    if (config.layout?.spacing) {
      variables.push(`--spacing-unit: ${config.layout.spacing};`);
    }

    return `:root {\n  ${variables.join('\n  ')}\n}`;
  }

  /**
   * Get custom email templates for tenant
   */
  async getEmailTemplates(tenantId: string, db: PrismaClient): Promise<EmailTemplate[]> {
    // This would typically be stored in a separate table
    // For now, return default templates with tenant customization
    const defaultTemplates: EmailTemplate[] = [
      {
        name: 'welcome_email',
        subject: 'Welcome to {{tenant_name}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: {{primary_color}}; color: white; padding: 20px; text-align: center;">
              {{#if logo_url}}<img src="{{logo_url}}" alt="{{tenant_name}}" style="max-height: 60px;">{{/if}}
              <h1>Welcome to {{tenant_name}}</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{user_name}},</p>
              <p>Welcome to the {{tenant_name}} Student Pass System. Your account has been created successfully.</p>
              <p>You can log in using your email address and the password provided separately.</p>
              <p>Best regards,<br>{{tenant_name}} Team</p>
            </div>
          </div>
        `,
        variables: ['tenant_name', 'logo_url', 'primary_color', 'user_name'],
        category: 'authentication'
      },
      {
        name: 'pass_issued',
        subject: 'Your Student Pass has been Issued',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: {{primary_color}}; color: white; padding: 20px; text-align: center;">
              {{#if logo_url}}<img src="{{logo_url}}" alt="{{tenant_name}}" style="max-height: 60px;">{{/if}}
              <h1>Student Pass Issued</h1>
            </div>
            <div style="padding: 20px;">
              <p>Dear {{student_name}},</p>
              <p>Your student pass has been successfully issued!</p>
              <p><strong>Pass Number:</strong> {{pass_number}}</p>
              <p><strong>Issue Date:</strong> {{issue_date}}</p>
              <p><strong>Expiry Date:</strong> {{expiry_date}}</p>
              <p>You can now use your pass to access campus facilities.</p>
              <p>Best regards,<br>{{tenant_name}} Team</p>
            </div>
          </div>
        `,
        variables: ['tenant_name', 'logo_url', 'primary_color', 'student_name', 'pass_number', 'issue_date', 'expiry_date'],
        category: 'notifications'
      }
    ];

    return defaultTemplates;
  }

  /**
   * Get custom fields configuration for tenant
   */
  async getCustomFields(tenantId: string, entityType: string, db: PrismaClient): Promise<CustomField[]> {
    // Implementation would fetch from a custom_fields table
    // For now, return empty array
    return [];
  }

  /**
   * Create or update custom field
   */
  async upsertCustomField(
    tenantId: string, 
    fieldData: CustomField, 
    db: PrismaClient
  ): Promise<CustomField> {
    // Implementation would handle custom field storage
    // This is a simplified version
    logger.info(`Custom field upsert for tenant ${tenantId}:`, fieldData);
    return fieldData;
  }

  /**
   * Get workflow configuration for tenant
   */
  async getWorkflowSteps(
    tenantId: string, 
    workflowType: 'student_application' | 'pass_issue' | 'access_request', 
    db: PrismaClient
  ): Promise<WorkflowStep[]> {
    // Default workflow for student applications
    if (workflowType === 'student_application') {
      return [
        {
          id: 'initial_review',
          name: 'Initial Review',
          description: 'Review application completeness and basic requirements',
          type: 'manual',
          assigneeRole: 'administrator',
          requiredFields: ['firstName', 'lastName', 'email', 'studentId'],
          order: 1,
          nextStepId: 'document_verification'
        },
        {
          id: 'document_verification',
          name: 'Document Verification',
          description: 'Verify submitted documents',
          type: 'manual',
          assigneeRole: 'verifier',
          timeoutDays: 3,
          order: 2,
          nextStepId: 'final_approval'
        },
        {
          id: 'final_approval',
          name: 'Final Approval',
          description: 'Final approval and pass generation',
          type: 'manual',
          assigneeRole: 'administrator',
          actions: [
            {
              type: 'status_change',
              config: { status: 'approved' }
            },
            {
              type: 'email',
              config: { template: 'application_approved' }
            }
          ],
          order: 3
        }
      ];
    }

    return [];
  }

  /**
   * Update workflow configuration
   */
  async updateWorkflowSteps(
    tenantId: string,
    workflowType: string,
    steps: WorkflowStep[],
    db: PrismaClient
  ): Promise<WorkflowStep[]> {
    // Implementation would store workflow configuration
    logger.info(`Workflow update for tenant ${tenantId}, type ${workflowType}:`, steps);
    return steps;
  }

  /**
   * Generate tenant-specific configuration file
   */
  async generateTenantConfig(tenant: TenantContext): Promise<any> {
    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        displayName: tenant.displayName,
        subdomain: tenant.subdomain,
        customDomain: tenant.customDomain
      },
      branding: tenant.branding,
      features: tenant.enabledFeatures,
      limits: {
        maxUsers: tenant.maxUsers,
        maxStudents: tenant.maxStudents,
        storageQuotaGB: tenant.storageQuotaGB
      },
      compliance: tenant.complianceFlags,
      dataRegion: tenant.dataRegion
    };
  }

  /**
   * Validate branding configuration
   */
  validateBrandingConfig(config: Partial<BrandingConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate colors
    if (config.colors) {
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      
      if (config.colors.primary && !colorRegex.test(config.colors.primary)) {
        errors.push('Invalid primary color format');
      }
      
      if (config.colors.secondary && !colorRegex.test(config.colors.secondary)) {
        errors.push('Invalid secondary color format');
      }
      
      if (config.colors.accent && !colorRegex.test(config.colors.accent)) {
        errors.push('Invalid accent color format');
      }
    }

    // Validate CSS
    if (config.customCss && config.customCss.length > 50000) {
      errors.push('Custom CSS too large (max 50KB)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clone branding from another tenant (for white-label partners)
   */
  async cloneBranding(
    sourceTenantId: string,
    targetTenantId: string,
    db: PrismaClient
  ): Promise<void> {
    try {
      const sourceConfig = await this.getBrandingConfig(sourceTenantId, db);
      
      // Remove URLs as they're tenant-specific
      const clonedConfig = {
        ...sourceConfig,
        logo: undefined,
        favicon: undefined
      };

      await this.updateBrandingConfig(targetTenantId, clonedConfig, db);
      
      logger.info(`Branding cloned from ${sourceTenantId} to ${targetTenantId}`);
    } catch (error) {
      logger.error('Failed to clone branding:', error);
      throw error;
    }
  }
}

// Singleton instance
let brandingService: BrandingService;

export const getBrandingService = (): BrandingService => {
  if (!brandingService) {
    brandingService = new BrandingService();
  }
  return brandingService;
};