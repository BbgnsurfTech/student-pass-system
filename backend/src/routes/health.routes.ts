import { Router } from 'express';
import { checkDatabaseHealth, getDatabaseInfo } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

const router = Router();

// Basic health check
router.get('/', async (req, res) => {
  try {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();

    res.status(200).json({
      status: 'healthy',
      timestamp,
      uptime: Math.floor(uptime),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Database health check
router.get('/db', async (req, res) => {
  try {
    const isHealthy = await checkDatabaseHealth();
    const dbInfo = await getDatabaseInfo();

    if (isHealthy) {
      res.status(200).json({
        status: 'healthy',
        database: 'connected',
        info: dbInfo,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Redis health check
router.get('/redis', async (req, res) => {
  try {
    const redisClient = getRedisClient();
    
    if (!redisClient) {
      return res.status(503).json({
        status: 'unhealthy',
        redis: 'not_connected',
        timestamp: new Date().toISOString(),
      });
    }

    // Test Redis connection
    await redisClient.ping();

    res.status(200).json({
      status: 'healthy',
      redis: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Redis health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      redis: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Comprehensive health check
router.get('/full', async (req, res) => {
  try {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();
    
    // Check database
    const dbHealthy = await checkDatabaseHealth();
    const dbInfo = await getDatabaseInfo();
    
    // Check Redis
    let redisHealthy = false;
    try {
      const redisClient = getRedisClient();
      if (redisClient) {
        await redisClient.ping();
        redisHealthy = true;
      }
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    
    const overallHealthy = dbHealthy && redisHealthy;
    const statusCode = overallHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      uptime: Math.floor(uptime),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          info: dbInfo,
        },
        redis: {
          status: redisHealthy ? 'healthy' : 'unhealthy',
        },
      },
      system: {
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
        },
        uptime: Math.floor(uptime),
        pid: process.pid,
      },
    });
  } catch (error) {
    logger.error('Full health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

export default router;