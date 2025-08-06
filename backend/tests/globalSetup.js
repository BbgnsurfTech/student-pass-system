"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://student_user:student_pass_2024@localhost:5432/student_pass_test_db';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use database 1 for tests
};
//# sourceMappingURL=globalSetup.js.map