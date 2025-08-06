import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import 'express-async-errors';
import dotenv from 'dotenv';
import { createServer } from 'http';

import { connectDB } from './config/database';
import { setupRedis } from './config/redis';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { setupSwagger } from './config/swagger';

// Import new services
import { initializeWebSocket } from './services/websocket.service';
import { getEmailService } from './services/email.service';
import { getNotificationService } from './services/notification.service';
import { getCacheService } from './services/cache.service';
import { getSearchService } from './services/search.service';
import { getAuditService } from './services/audit.service';
import { setupGraphQLServer } from './graphql/server';
import { 
  generalRateLimit, 
  authRateLimit, 
  uploadRateLimit,
  searchRateLimit,
  bulkRateLimit,
  blacklistCheck,
  adaptiveLimit
} from './middleware/advancedRateLimit';

// Import multi-tenant services
import { cleanupTenantConnections } from './middleware/tenant.middleware';
import { getBrandingService } from './services/branding.service';
import { getIntegrationService } from './services/integration.service';
import { getBlockchainService } from './services/blockchain.service';
import { getIoTService } from './services/iot.service';
import { getAnalyticsService } from './services/analytics.service';
import { getApiGatewayService } from './services/api-gateway.service';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import studentRoutes from './routes/student.routes';
import applicationRoutes from './routes/application.routes';
import passRoutes from './routes/pass.routes';
import accessRoutes from './routes/access.routes';
import uploadRoutes from './routes/upload.routes';
import healthRoutes from './routes/health.routes';
import tenantRoutes from './routes/tenant.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || 'api/v1';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

app.use(cors(corsOptions));
app.use(compression());

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Advanced rate limiting and security
app.use(blacklistCheck());
app.use(adaptiveLimit());
app.use(generalRateLimit());

// Legacy rate limiter as fallback
app.use(rateLimiter);

// Health check endpoint (before auth)
app.use('/health', healthRoutes);

// Multi-tenant API routes
app.use(`/${API_PREFIX}/tenant`, tenantRoutes);

// Standard API routes with specific rate limiting
app.use(`/${API_PREFIX}/auth`, authRateLimit(), authRoutes);
app.use(`/${API_PREFIX}/users`, userRoutes);
app.use(`/${API_PREFIX}/students`, studentRoutes);
app.use(`/${API_PREFIX}/applications`, applicationRoutes);
app.use(`/${API_PREFIX}/passes`, passRoutes);
app.use(`/${API_PREFIX}/access`, accessRoutes);
app.use(`/${API_PREFIX}/uploads`, uploadRateLimit(), uploadRoutes);

// Setup Swagger documentation
setupSwagger(app, API_PREFIX);

// Static file serving
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close multi-tenant services
    const analyticsService = getAnalyticsService();
    await analyticsService.cleanup();
    logger.info('Analytics service closed');
    
    const iotService = getIoTService();
    await iotService.cleanup();
    logger.info('IoT service closed');
    
    const blockchainService = getBlockchainService();
    await blockchainService.cleanup();
    logger.info('Blockchain service closed');
    
    const integrationService = getIntegrationService();
    integrationService.cleanup();
    logger.info('Integration service closed');
    
    const apiGatewayService = getApiGatewayService();
    await apiGatewayService.cleanup();
    logger.info('API Gateway service closed');
    
    // Close tenant connections
    await cleanupTenantConnections();
    logger.info('Tenant connections closed');
    
    // Close core services
    const searchService = getSearchService();
    await searchService.close();
    logger.info('Search service closed');
    
    const cacheService = getCacheService();
    await cacheService.close();
    logger.info('Cache service closed');
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart

async function startServer() {
  try {
    // Initialize database connection
    await connectDB();
    logger.info('Database connected successfully');

    // Initialize Redis connection
    await setupRedis();
    logger.info('Redis connected successfully');

    // Initialize core services
    logger.info('Initializing core services...');
    
    // Initialize cache service
    const cacheService = getCacheService();
    logger.info('Cache service initialized');
    
    // Initialize search service
    const searchService = getSearchService();
    logger.info('Search service initialized');
    
    // Initialize email service
    const emailService = getEmailService();
    const emailTest = await emailService.testEmailConnection();
    logger.info(`Email service initialized (connection: ${emailTest ? 'OK' : 'FAILED'})`);
    
    // Initialize notification service
    const notificationService = getNotificationService();
    logger.info('Notification service initialized');
    
    // Initialize audit service
    const auditService = getAuditService();
    logger.info('Audit service initialized');
    
    // Initialize multi-tenant services
    logger.info('Initializing multi-tenant services...');
    
    // Initialize branding service
    const brandingService = getBrandingService();
    logger.info('Branding service initialized');
    
    // Initialize integration service
    const integrationService = getIntegrationService();
    logger.info('Integration service initialized');
    
    // Initialize blockchain service
    const blockchainService = getBlockchainService();
    logger.info('Blockchain service initialized');
    
    // Initialize IoT service
    const iotService = getIoTService();
    logger.info('IoT service initialized');
    
    // Initialize analytics service
    const analyticsService = getAnalyticsService();
    logger.info('Analytics service initialized');
    
    // Initialize API gateway service
    const apiGatewayService = getApiGatewayService();
    logger.info('API Gateway service initialized');

    // Create HTTP server for WebSocket support
    const httpServer = createServer(app);
    
    // Initialize WebSocket service
    const websocketService = initializeWebSocket(httpServer);
    logger.info('WebSocket service initialized');

    // Setup GraphQL server
    const { server: graphqlServer } = await setupGraphQLServer(app);
    logger.info('GraphQL server initialized');

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Student Pass System API running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/${API_PREFIX}/docs`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
      logger.info(`🔍 GraphQL Playground: http://localhost:${PORT}/graphql`);
      logger.info(`🔌 WebSocket Server: ws://localhost:${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Log service status
      logger.info('🎯 Core Features Status:');
      logger.info(`   📧 Email Service: ${emailTest ? '✅ Active' : '❌ Inactive'}`);
      logger.info(`   🔍 Search Service: ✅ Active`);
      logger.info(`   📊 Real-time Updates: ✅ Active`);
      logger.info(`   🚀 Background Jobs: ✅ Active`);
      logger.info(`   🛡️  Advanced Security: ✅ Active`);
      logger.info(`   📈 Analytics & Audit: ✅ Active`);
      
      logger.info('🏢 Multi-Tenant Features Status:');
      logger.info(`   🎨 White-Label Branding: ✅ Active`);
      logger.info(`   🔗 Enterprise Integrations: ✅ Active`);
      logger.info(`   ⛓️  Blockchain Integration: ✅ Active`);
      logger.info(`   🏠 IoT Smart Campus: ✅ Active`);
      logger.info(`   🤖 Predictive Analytics: ✅ Active`);
      logger.info(`   🚪 API Gateway: ✅ Active`);
    });

    // Log initial system stats
    setTimeout(async () => {
      try {
        const stats = {
          activeConnections: websocketService.getActiveConnections(),
          cacheStats: cacheService.getStats(),
          searchHealth: await searchService.healthCheck()
        };
        logger.info('📊 System Status:', stats);
      } catch (error) {
        logger.error('Failed to get system stats:', error);
      }
    }, 5000); // Wait 5 seconds for services to stabilize

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export default app;