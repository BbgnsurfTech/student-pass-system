"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseInfo = exports.checkDatabaseHealth = exports.disconnectDB = exports.connectDB = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
// Prevent multiple instances of Prisma Client in development
const prisma = globalThis.__prisma || new client_1.PrismaClient({
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
        logger_1.logger.debug(`Query: ${e.query}`);
        logger_1.logger.debug(`Duration: ${e.duration}ms`);
    });
}
prisma.$on('info', (e) => {
    logger_1.logger.info(`Prisma Info: ${e.message}`);
});
prisma.$on('warn', (e) => {
    logger_1.logger.warn(`Prisma Warning: ${e.message}`);
});
prisma.$on('error', (e) => {
    logger_1.logger.error(`Prisma Error: ${e.message}`);
});
const connectDB = async () => {
    try {
        await prisma.$connect();
        logger_1.logger.info('✅ Database connection established');
        // Run migrations if configured
        if (process.env.DATABASE_MIGRATE_ON_START === 'true') {
            logger_1.logger.info('🔄 Running database migrations...');
            // Note: In production, migrations should be run separately
            // This is just for development convenience
        }
    }
    catch (error) {
        logger_1.logger.error('❌ Database connection failed:', error);
        throw error;
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    try {
        await prisma.$disconnect();
        logger_1.logger.info('✅ Database disconnected');
    }
    catch (error) {
        logger_1.logger.error('❌ Database disconnection failed:', error);
        throw error;
    }
};
exports.disconnectDB = disconnectDB;
// Database utilities
const checkDatabaseHealth = async () => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        logger_1.logger.error('Database health check failed:', error);
        return false;
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
const getDatabaseInfo = async () => {
    try {
        const result = await prisma.$queryRaw `
      SELECT 
        version() as version,
        current_database() as database,
        current_user as user,
        inet_server_addr() as host,
        inet_server_port() as port
    `;
        return result[0];
    }
    catch (error) {
        logger_1.logger.error('Failed to get database info:', error);
        return null;
    }
};
exports.getDatabaseInfo = getDatabaseInfo;
exports.default = prisma;
//# sourceMappingURL=database.js.map