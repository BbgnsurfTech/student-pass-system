"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logBusiness = exports.logAuth = exports.logRequest = exports.logQuery = exports.logHttp = exports.logDebug = exports.logWarn = exports.logInfo = exports.logError = exports.loggerStream = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
// Tell winston that you want to link the colors
winston_1.default.addColors(colors);
// Define which logs to print based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'warn';
};
// Define log format
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
// Define log format for files (without colors)
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// Create transports array
const transports = [
    // Console transport
    new winston_1.default.transports.Console({
        level: level(),
        format,
    }),
];
// Add file transports in production or if LOG_FILE_ENABLED is true
if (process.env.NODE_ENV === 'production' || process.env.LOG_FILE_ENABLED === 'true') {
    const logDir = process.env.LOG_FILE_PATH ? path_1.default.dirname(process.env.LOG_FILE_PATH) : 'logs';
    // Ensure logs directory exists
    const fs = require('fs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    // Error log file
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
    }));
    // Combined log file
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'combined.log'),
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
    }));
    // HTTP requests log file
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'http.log'),
        level: 'http',
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 3,
    }));
}
// Create the logger
exports.logger = winston_1.default.createLogger({
    level: level(),
    levels,
    format: fileFormat,
    transports,
    // Handle exceptions and rejections
    exceptionHandlers: [
        new winston_1.default.transports.Console({ format }),
        ...(process.env.NODE_ENV === 'production' || process.env.LOG_FILE_ENABLED === 'true'
            ? [new winston_1.default.transports.File({
                    filename: path_1.default.join(process.env.LOG_FILE_PATH ? path_1.default.dirname(process.env.LOG_FILE_PATH) : 'logs', 'exceptions.log'),
                    format: fileFormat,
                })]
            : []),
    ],
    rejectionHandlers: [
        new winston_1.default.transports.Console({ format }),
        ...(process.env.NODE_ENV === 'production' || process.env.LOG_FILE_ENABLED === 'true'
            ? [new winston_1.default.transports.File({
                    filename: path_1.default.join(process.env.LOG_FILE_PATH ? path_1.default.dirname(process.env.LOG_FILE_PATH) : 'logs', 'rejections.log'),
                    format: fileFormat,
                })]
            : []),
    ],
});
// Create a stream object for Morgan
exports.loggerStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    },
};
// Utility functions for structured logging
const logError = (error, context) => {
    exports.logger.error({
        message: error.message,
        stack: error.stack,
        context,
    });
};
exports.logError = logError;
const logInfo = (message, meta) => {
    exports.logger.info({
        message,
        ...meta,
    });
};
exports.logInfo = logInfo;
const logWarn = (message, meta) => {
    exports.logger.warn({
        message,
        ...meta,
    });
};
exports.logWarn = logWarn;
const logDebug = (message, meta) => {
    exports.logger.debug({
        message,
        ...meta,
    });
};
exports.logDebug = logDebug;
const logHttp = (message, meta) => {
    exports.logger.http({
        message,
        ...meta,
    });
};
exports.logHttp = logHttp;
// Database query logger
const logQuery = (query, duration, params) => {
    if (process.env.NODE_ENV === 'development') {
        exports.logger.debug({
            message: 'Database Query',
            query,
            duration: `${duration}ms`,
            params,
        });
    }
};
exports.logQuery = logQuery;
// API request logger
const logRequest = (req, res, duration) => {
    exports.logger.http({
        message: 'HTTP Request',
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
    });
};
exports.logRequest = logRequest;
// Authentication logger
const logAuth = (event, userId, details) => {
    exports.logger.info({
        message: `Auth: ${event}`,
        userId,
        ...details,
    });
};
exports.logAuth = logAuth;
// Business logic logger
const logBusiness = (event, data) => {
    exports.logger.info({
        message: `Business: ${event}`,
        ...data,
    });
};
exports.logBusiness = logBusiness;
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map