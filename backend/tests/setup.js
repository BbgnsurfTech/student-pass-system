"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const prisma = new client_1.PrismaClient();
// Setup function to run before each test
beforeAll(async () => {
    // Reset database schema
    (0, child_process_1.execSync)('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit' });
    // Run migrations
    (0, child_process_1.execSync)('npx prisma migrate deploy', { stdio: 'inherit' });
    // Seed test data
    (0, child_process_1.execSync)('npx prisma db seed', { stdio: 'inherit' });
});
// Cleanup function to run after each test
afterEach(async () => {
    // Clean up test data but keep schema and seed data
    const tableNames = [
        'access_logs',
        'documents',
        'application_documents',
        'passes',
        'students',
        'student_applications',
    ];
    for (const tableName of tableNames) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`);
    }
});
// Global cleanup
afterAll(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=setup.js.map