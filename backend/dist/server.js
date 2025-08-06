"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
require("express-async-errors");
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const swagger_1 = require("./config/swagger");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const application_routes_1 = __importDefault(require("./routes/application.routes"));
const pass_routes_1 = __importDefault(require("./routes/pass.routes"));
const access_routes_1 = __importDefault(require("./routes/access.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || 'api/v1';
// Security middleware
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)(corsOptions));
app.use((0, compression_1.default)());
// Logging
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.logger.info(message.trim()) }
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Rate limiting
app.use(rateLimiter_1.rateLimiter);
// Health check endpoint (before auth)
app.use('/health', health_routes_1.default);
// API routes
app.use(`/${API_PREFIX}/auth`, auth_routes_1.default);
app.use(`/${API_PREFIX}/users`, user_routes_1.default);
app.use(`/${API_PREFIX}/students`, student_routes_1.default);
app.use(`/${API_PREFIX}/applications`, application_routes_1.default);
app.use(`/${API_PREFIX}/passes`, pass_routes_1.default);
app.use(`/${API_PREFIX}/access`, access_routes_1.default);
app.use(`/${API_PREFIX}/uploads`, upload_routes_1.default);
// Setup Swagger documentation
(0, swagger_1.setupSwagger)(app, API_PREFIX);
// Static file serving
app.use('/uploads', express_1.default.static('uploads'));
// 404 handler
app.use(notFoundHandler_1.notFoundHandler);
// Global error handler
app.use(errorHandler_1.errorHandler);
// Graceful shutdown
const gracefulShutdown = (signal) => {
    logger_1.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
async function startServer() {
    try {
        // Initialize database connection
        await (0, database_1.connectDB)();
        logger_1.logger.info('Database connected successfully');
        // Initialize Redis connection
        await (0, redis_1.setupRedis)();
        logger_1.logger.info('Redis connected successfully');
        // Start server
        app.listen(PORT, () => {
            logger_1.logger.info(`🚀 Student Pass System API running on port ${PORT}`);
            logger_1.logger.info(`📚 API Documentation: http://localhost:${PORT}/${API_PREFIX}/docs`);
            logger_1.logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
            logger_1.logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map