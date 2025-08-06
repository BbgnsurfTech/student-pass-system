import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

// Setup function to run before each test
beforeAll(async () => {
  // Reset database schema
  execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit' });
  
  // Run migrations
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  // Seed test data
  execSync('npx prisma db seed', { stdio: 'inherit' });
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