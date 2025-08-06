import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { tenantMiddleware, requireFeature, checkTenantLimits, getTenantDb } from '../middleware/tenant.middleware';
import { apiAuthMiddleware, requireApiPermission, getApiGatewayService } from '../services/api-gateway.service';
import { getBrandingService } from '../services/branding.service';
import { getIntegrationService } from '../services/integration.service';
import { getBlockchainService } from '../services/blockchain.service';
import { getIoTService } from '../services/iot.service';
import { getAnalyticsService } from '../services/analytics.service';

const router = Router();
const brandingService = getBrandingService();
const integrationService = getIntegrationService();
const blockchainService = getBlockchainService();
const iotService = getIoTService();
const analyticsService = getAnalyticsService();
const apiGatewayService = getApiGatewayService();

// Apply tenant middleware to all routes
router.use(tenantMiddleware);

// Apply API authentication to all routes
router.use(apiAuthMiddleware(apiGatewayService));

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// ================================
// TENANT MANAGEMENT ROUTES
// ================================

/**
 * Get tenant information
 */
router.get('/info', 
  requireApiPermission('tenant', 'read'),
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      
      res.json({
        success: true,
        data: {
          id: tenant.id,
          name: tenant.name,
          displayName: tenant.displayName,
          subdomain: tenant.subdomain,
          customDomain: tenant.customDomain,
          tier: tenant.tier,
          features: tenant.enabledFeatures,
          branding: tenant.branding,
          limits: {
            maxUsers: tenant.maxUsers,
            maxStudents: tenant.maxStudents,
            storageQuotaGB: tenant.storageQuotaGB
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get tenant info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tenant information'
      });
    }
  }
);

/**
 * Update tenant settings
 */
router.put('/settings',
  requireApiPermission('tenant', 'update'),
  [
    body('displayName').optional().isString().isLength({ min: 1, max: 100 }),
    body('settings').optional().isObject(),
    body('customDomain').optional().isFQDN()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const updateData: any = {};
      if (req.body.displayName) updateData.displayName = req.body.displayName;
      if (req.body.settings) updateData.settings = req.body.settings;
      if (req.body.customDomain) updateData.customDomain = req.body.customDomain;

      await db.tenant.update({
        where: { id: tenant.id },
        data: updateData
      });

      res.json({
        success: true,
        message: 'Tenant settings updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update tenant settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update tenant settings'
      });
    }
  }
);

// ================================
// BRANDING & WHITE-LABEL ROUTES
// ================================

/**
 * Get branding configuration
 */
router.get('/branding',
  requireApiPermission('branding', 'read'),
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const brandingConfig = await brandingService.getBrandingConfig(tenant.id, db);
      
      res.json({
        success: true,
        data: brandingConfig
      });

    } catch (error) {
      logger.error('Failed to get branding config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve branding configuration'
      });
    }
  }
);

/**
 * Update branding configuration
 */
router.put('/branding',
  requireApiPermission('branding', 'update'),
  requireFeature('custom_branding'),
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      // Validate branding configuration
      const validation = brandingService.validateBrandingConfig(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid branding configuration',
          details: validation.errors
        });
      }

      const updatedConfig = await brandingService.updateBrandingConfig(
        tenant.id,
        req.body,
        db
      );

      res.json({
        success: true,
        data: updatedConfig,
        message: 'Branding configuration updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update branding config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update branding configuration'
      });
    }
  }
);

/**
 * Get email templates
 */
router.get('/email-templates',
  requireApiPermission('branding', 'read'),
  requireFeature('custom_email_templates'),
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const templates = await brandingService.getEmailTemplates(tenant.id, db);
      
      res.json({
        success: true,
        data: templates
      });

    } catch (error) {
      logger.error('Failed to get email templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve email templates'
      });
    }
  }
);

// ================================
// INTEGRATION ROUTES
// ================================

/**
 * List tenant integrations
 */
router.get('/integrations',
  requireApiPermission('integrations', 'read'),
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const integrations = await db.tenantIntegration.findMany({
        where: { tenantId: tenant.id },
        select: {
          id: true,
          type: true,
          name: true,
          isActive: true,
          lastSyncAt: true,
          syncStatus: true,
          errorMessage: true
        }
      });

      res.json({
        success: true,
        data: integrations
      });

    } catch (error) {
      logger.error('Failed to list integrations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve integrations'
      });
    }
  }
);

/**
 * Create new integration
 */
router.post('/integrations',
  requireApiPermission('integrations', 'create'),
  requireFeature('enterprise_integrations'),
  [
    body('type').isIn(['AD_LDAP', 'SIS_BANNER', 'LMS_CANVAS', 'SAML_SSO']),
    body('name').isString().isLength({ min: 1, max: 100 }),
    body('configuration').isObject(),
    body('credentials').isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      // Test integration connection
      const connectionTest = await integrationService.testIntegration(
        {
          type: req.body.type,
          name: req.body.name,
          baseUrl: req.body.configuration.baseUrl,
          credentials: req.body.credentials,
          settings: req.body.configuration.settings || {}
        },
        tenant.id,
        db
      );

      if (!connectionTest) {
        return res.status(400).json({
          success: false,
          error: 'Integration connection test failed'
        });
      }

      // Create integration record
      const integration = await db.tenantIntegration.create({
        data: {
          tenantId: tenant.id,
          type: req.body.type,
          name: req.body.name,
          isActive: true,
          configuration: req.body.configuration,
          credentials: req.body.credentials, // This should be encrypted
          syncStatus: 'PENDING'
        }
      });

      res.status(201).json({
        success: true,
        data: integration,
        message: 'Integration created successfully'
      });

    } catch (error) {
      logger.error('Failed to create integration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create integration'
      });
    }
  }
);

/**
 * Sync integration
 */
router.post('/integrations/:integrationId/sync',
  requireApiPermission('integrations', 'update'),
  [param('integrationId').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const syncResult = await integrationService.runSync(
        req.params.integrationId,
        tenant.id,
        db
      );

      res.json({
        success: true,
        data: syncResult,
        message: 'Integration sync completed'
      });

    } catch (error) {
      logger.error('Failed to sync integration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync integration'
      });
    }
  }
);

// ================================
// API MANAGEMENT ROUTES
// ================================

/**
 * List API keys
 */
router.get('/api-keys',
  requireApiPermission('api_keys', 'read'),
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const apiKeys = await db.tenantApiKey.findMany({
        where: { tenantId: tenant.id },
        select: {
          id: true,
          name: true,
          permissions: true,
          rateLimitTier: true,
          isActive: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true
        }
      });

      res.json({
        success: true,
        data: apiKeys
      });

    } catch (error) {
      logger.error('Failed to list API keys:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve API keys'
      });
    }
  }
);

/**
 * Generate new API key
 */
router.post('/api-keys',
  requireApiPermission('api_keys', 'create'),
  [
    body('name').isString().isLength({ min: 1, max: 100 }),
    body('permissions').isArray(),
    body('rateLimitTier').optional().isIn(['basic', 'standard', 'premium', 'enterprise']),
    body('expiresIn').optional().isInt({ min: 1, max: 365 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const { apiKey, keyRecord } = await apiGatewayService.generateApiKey(
        tenant.id,
        req.body.name,
        req.body.permissions,
        req.body.rateLimitTier || 'standard',
        req.body.expiresIn,
        db
      );

      res.status(201).json({
        success: true,
        data: {
          id: keyRecord.id,
          name: keyRecord.name,
          apiKey: apiKey,
          permissions: keyRecord.permissions,
          rateLimitTier: keyRecord.rateLimitTier,
          expiresAt: keyRecord.expiresAt
        },
        message: 'API key generated successfully. Please store it securely as it will not be shown again.'
      });

    } catch (error) {
      logger.error('Failed to generate API key:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate API key'
      });
    }
  }
);

/**
 * Revoke API key
 */
router.delete('/api-keys/:keyId',
  requireApiPermission('api_keys', 'delete'),
  [param('keyId').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      await apiGatewayService.revokeApiKey(req.params.keyId, tenant.id, db);

      res.json({
        success: true,
        message: 'API key revoked successfully'
      });

    } catch (error) {
      logger.error('Failed to revoke API key:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke API key'
      });
    }
  }
);

/**
 * Get API usage statistics
 */
router.get('/api-usage',
  requireApiPermission('analytics', 'read'),
  [
    query('startDate').isISO8601(),
    query('endDate').isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      const usage = await apiGatewayService.getUsageStats(tenant.id, startDate, endDate, db);

      res.json({
        success: true,
        data: usage
      });

    } catch (error) {
      logger.error('Failed to get API usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve API usage statistics'
      });
    }
  }
);

// ================================
// BLOCKCHAIN ROUTES
// ================================

/**
 * Issue digital pass on blockchain
 */
router.post('/blockchain/passes/:passId/issue',
  requireApiPermission('blockchain', 'create'),
  requireFeature('blockchain_passes'),
  [
    param('passId').isUUID(),
    body('walletAddress').isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      // Get pass details
      const pass = await db.pass.findFirst({
        where: {
          tenantId: tenant.id,
          id: req.params.passId
        },
        include: {
          student: {
            include: { school: true }
          }
        }
      });

      if (!pass) {
        return res.status(404).json({
          success: false,
          error: 'Pass not found'
        });
      }

      const digitalPass = await blockchainService.issueDigitalPass(
        tenant.id,
        pass,
        req.body.walletAddress,
        db
      );

      res.status(201).json({
        success: true,
        data: digitalPass,
        message: 'Digital pass issued on blockchain successfully'
      });

    } catch (error) {
      logger.error('Failed to issue digital pass:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to issue digital pass on blockchain'
      });
    }
  }
);

/**
 * Verify digital pass on blockchain
 */
router.get('/blockchain/passes/:tokenId/verify',
  requireApiPermission('blockchain', 'read'),
  [param('tokenId').isString()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const verification = await blockchainService.verifyDigitalPass(
        tenant.id,
        req.params.tokenId,
        db
      );

      res.json({
        success: true,
        data: verification
      });

    } catch (error) {
      logger.error('Failed to verify digital pass:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify digital pass'
      });
    }
  }
);

// ================================
// IOT DEVICE ROUTES
// ================================

/**
 * Register IoT device
 */
router.post('/iot/devices',
  requireApiPermission('iot', 'create'),
  requireFeature('iot_integration'),
  [
    body('schoolId').isUUID(),
    body('deviceConfig').isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      await iotService.registerDevice(
        tenant.id,
        req.body.schoolId,
        req.body.deviceConfig,
        db
      );

      res.status(201).json({
        success: true,
        message: 'IoT device registered successfully'
      });

    } catch (error) {
      logger.error('Failed to register IoT device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register IoT device'
      });
    }
  }
);

/**
 * Get device analytics
 */
router.get('/iot/devices/:deviceId/analytics',
  requireApiPermission('iot', 'read'),
  [
    param('deviceId').isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const timeRange = {
        start: req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: req.query.endDate ? new Date(req.query.endDate as string) : new Date()
      };

      const analytics = await iotService.getDeviceAnalytics(
        tenant.id,
        req.params.deviceId,
        timeRange,
        db
      );

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Failed to get device analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve device analytics'
      });
    }
  }
);

/**
 * Control IoT device
 */
router.post('/iot/devices/:deviceId/control',
  requireApiPermission('iot', 'update'),
  [
    param('deviceId').isString(),
    body('command').isString(),
    body('parameters').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const success = await iotService.controlDevice(
        tenant.id,
        req.params.deviceId,
        req.body.command,
        req.body.parameters,
        db
      );

      if (success) {
        res.json({
          success: true,
          message: 'Device command sent successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to send device command'
        });
      }

    } catch (error) {
      logger.error('Failed to control device:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to control device'
      });
    }
  }
);

// ================================
// ANALYTICS ROUTES
// ================================

/**
 * Get dashboard metrics
 */
router.get('/analytics/dashboard',
  requireApiPermission('analytics', 'read'),
  [query('schoolId').optional().isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const metrics = await analyticsService.getDashboardMetrics(
        tenant.id,
        req.query.schoolId as string,
        db
      );

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Failed to get dashboard metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard metrics'
      });
    }
  }
);

/**
 * Execute custom analytics query
 */
router.post('/analytics/query',
  requireApiPermission('analytics', 'read'),
  requireFeature('advanced_analytics'),
  [
    body('metrics').isArray(),
    body('dimensions').isArray(),
    body('timeRange').isObject(),
    body('filters').optional().isArray()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const query = {
        tenantId: tenant.id,
        ...req.body
      };

      const result = await analyticsService.executeQuery(query, db);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Failed to execute analytics query:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute analytics query'
      });
    }
  }
);

/**
 * Get student success predictions
 */
router.get('/analytics/predictions/student-success/:studentId',
  requireApiPermission('analytics', 'read'),
  requireFeature('predictive_analytics'),
  [param('studentId').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const prediction = await analyticsService.predictStudentSuccess(
        tenant.id,
        req.params.studentId,
        db
      );

      res.json({
        success: true,
        data: prediction
      });

    } catch (error) {
      logger.error('Failed to get student success prediction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate student success prediction'
      });
    }
  }
);

/**
 * Get compliance report
 */
router.get('/analytics/compliance/:complianceType',
  requireApiPermission('analytics', 'read'),
  requireFeature('compliance_reporting'),
  [
    param('complianceType').isIn(['GDPR', 'FERPA', 'SOC2']),
    query('startDate').isISO8601(),
    query('endDate').isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const tenant = req.tenant!;
      const db = await getTenantDb(tenant.id);
      
      const timeRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string)
      };

      const report = await analyticsService.generateComplianceReport(
        tenant.id,
        req.params.complianceType as 'GDPR' | 'FERPA' | 'SOC2',
        timeRange,
        db
      );

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate compliance report'
      });
    }
  }
);

export default router;