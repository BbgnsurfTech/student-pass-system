import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prisma = globalThis.__prisma || new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Log Prisma queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

prisma.$on('info', (e) => {
  logger.info(`Prisma Info: ${e.message}`);
});

prisma.$on('warn', (e) => {
  logger.warn(`Prisma Warning: ${e.message}`);
});

prisma.$on('error', (e) => {
  logger.error(`Prisma Error: ${e.message}`);
});

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connection established');
    
    // Run migrations if configured
    if (process.env.DATABASE_MIGRATE_ON_START === 'true') {
      logger.info('🔄 Running database migrations...');
      // Note: In production, migrations should be run separately
      // This is just for development convenience
    }
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('✅ Database disconnected');
  } catch (error) {
    logger.error('❌ Database disconnection failed:', error);
    throw error;
  }
};

// Database utilities
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

export const getDatabaseInfo = async () => {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        version() as version,
        current_database() as database,
        current_user as user,
        inet_server_addr() as host,
        inet_server_port() as port
    ` as any[];
    
    return result[0];
  } catch (error) {
    logger.error('Failed to get database info:', error);
    return null;
  }
};

export default prisma;