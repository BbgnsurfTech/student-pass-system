# Developer Documentation

**Comprehensive Development Guide for the Student Pass Management System**

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure & Architecture](#project-structure--architecture)
3. [Development Workflow](#development-workflow)
4. [Coding Standards & Guidelines](#coding-standards--guidelines)
5. [Testing Procedures](#testing-procedures)
6. [Database Development](#database-development)
7. [API Development Guidelines](#api-development-guidelines)
8. [Frontend Development](#frontend-development)
9. [Contributing Guidelines](#contributing-guidelines)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Development Tools & Utilities](#development-tools--utilities)

## Development Environment Setup

### Prerequisites

#### Required Software
```bash
# Node.js (LTS version)
Node.js >= 18.17.0
npm >= 9.6.0 (or yarn >= 1.22.0)

# Database
PostgreSQL >= 15.0
Redis >= 7.0

# Development Tools
Git >= 2.40.0
Docker >= 24.0.0
Docker Compose >= 2.18.0

# Optional but Recommended
VS Code >= 1.80.0
Postman or Insomnia (API testing)
pgAdmin 4 (Database management)
```

#### System Requirements
```yaml
Development Machine Specifications:
  Minimum:
    RAM: 8GB
    CPU: 4 cores
    Storage: 50GB free space
    
  Recommended:
    RAM: 16GB+
    CPU: 8 cores+
    Storage: 100GB+ SSD
    OS: macOS 12+, Ubuntu 20.04+, Windows 10+
```

### Quick Setup Guide

#### 1. Clone Repository
```bash
# Clone the repository
git clone https://github.com/your-org/student-pass-system.git
cd student-pass-system

# Create your feature branch
git checkout -b feature/your-feature-name
```

#### 2. Environment Configuration
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp student-pass-frontend/.env.example student-pass-frontend/.env

# Generate required secrets
npm run generate-secrets
```

#### 3. Docker Development Setup
```bash
# Start all services with Docker
docker-compose -f docker-compose.dev.yml up -d

# Verify all services are running
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

#### 4. Local Development Setup
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../student-pass-frontend
npm install

# Return to root
cd ..
```

#### 5. Database Setup
```bash
# Run database migrations
cd backend
npm run db:migrate

# Seed development data
npm run db:seed

# Verify database setup
npm run db:status
```

#### 6. Start Development Servers
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd student-pass-frontend
npm run dev

# Terminal 3: Start Redis (if not using Docker)
redis-server

# Terminal 4: Monitor logs
npm run dev:logs
```

### Development Environment Verification

#### Health Check Script
```typescript
// scripts/dev-health-check.ts
import { execSync } from 'child_process';
import chalk from 'chalk';

interface HealthCheck {
  service: string;
  check: () => Promise<boolean>;
  fix?: string;
}

const healthChecks: HealthCheck[] = [
  {
    service: 'Node.js',
    check: async () => {
      try {
        const version = execSync('node --version', { encoding: 'utf8' });
        return parseFloat(version.slice(1)) >= 18.17;
      } catch {
        return false;
      }
    },
    fix: 'Install Node.js LTS from https://nodejs.org/'
  },
  {
    service: 'PostgreSQL',
    check: async () => {
      try {
        execSync('pg_config --version', { encoding: 'utf8' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Install PostgreSQL: brew install postgresql (macOS) or apt-get install postgresql (Ubuntu)'
  },
  {
    service: 'Redis',
    check: async () => {
      try {
        execSync('redis-cli ping', { encoding: 'utf8', timeout: 3000 });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Start Redis: redis-server or docker run -d -p 6379:6379 redis:alpine'
  },
  {
    service: 'Database Connection',
    check: async () => {
      try {
        const { Client } = require('pg');
        const client = new Client(process.env.DATABASE_URL);
        await client.connect();
        await client.end();
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Check database connection settings in .env file'
  }
];

export async function runHealthChecks(): Promise<void> {
  console.log(chalk.blue('🔍 Running development environment health checks...\n'));

  const results = await Promise.all(
    healthChecks.map(async (check) => ({
      ...check,
      passed: await check.check()
    }))
  );

  results.forEach((result) => {
    const status = result.passed 
      ? chalk.green('✅ PASS') 
      : chalk.red('❌ FAIL');
    console.log(`${status} ${result.service}`);
    
    if (!result.passed && result.fix) {
      console.log(chalk.yellow(`   Fix: ${result.fix}`));
    }
  });

  const allPassed = results.every(r => r.passed);
  
  console.log('\n' + chalk.blue('=' * 50));
  if (allPassed) {
    console.log(chalk.green('🎉 All health checks passed! Ready for development.'));
  } else {
    console.log(chalk.red('⚠️  Some health checks failed. Please fix the issues above.'));
    process.exit(1);
  }
}

if (require.main === module) {
  runHealthChecks();
}
```

## Project Structure & Architecture

### Repository Structure
```
student-pass-system/
├── backend/                    # Node.js/Express API server
│   ├── src/
│   │   ├── controllers/       # API request handlers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/            # Database models (Prisma)
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic layer
│   │   ├── utils/             # Utility functions
│   │   ├── types/             # TypeScript type definitions
│   │   ├── config/            # Configuration files
│   │   └── database/          # Database migrations & seeds
│   ├── tests/                 # Backend test suites
│   ├── prisma/                # Prisma schema & migrations
│   ├── uploads/               # File upload directory (dev)
│   └── logs/                  # Application logs
├── student-pass-frontend/      # React/TypeScript frontend
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── pages/             # Page-level components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API service layer
│   │   ├── stores/            # State management (Zustand)
│   │   ├── utils/             # Frontend utilities
│   │   ├── types/             # TypeScript interfaces
│   │   └── styles/            # CSS/SCSS stylesheets
│   ├── public/                # Static assets
│   └── tests/                 # Frontend test suites
├── shared/                     # Shared code/types
│   ├── types/                 # Common TypeScript types
│   ├── constants/             # Shared constants
│   └── validation/            # Shared validation schemas
├── scripts/                   # Development & deployment scripts
├── docs/                      # Additional documentation
├── .github/                   # GitHub workflows & templates
└── deployment/                # Docker & K8s configurations
```

### Core Architecture Components

#### Backend Architecture
```typescript
// backend/src/app.ts - Main application setup
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware } from './middleware/auth';

import { authRoutes } from './routes/auth';
import { studentRoutes } from './routes/students';
import { applicationRoutes } from './routes/applications';
import { passRoutes } from './routes/passes';
import { analyticsRoutes } from './routes/analytics';

class Application {
  public app: express.Application;
  
  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }
  
  private configureMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
      optionsSuccessStatus: 200
    }));
    
    // Performance middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP'
    });
    this.app.use('/api/', limiter);
    
    // Logging
    this.app.use(requestLogger);
  }
  
  private configureRoutes(): void {
    // Public routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/health', (req, res) => res.json({ status: 'OK' }));
    
    // Protected routes
    this.app.use('/api/students', authMiddleware, studentRoutes);
    this.app.use('/api/applications', authMiddleware, applicationRoutes);
    this.app.use('/api/passes', authMiddleware, passRoutes);
    this.app.use('/api/analytics', authMiddleware, analyticsRoutes);
  }
  
  private configureErrorHandling(): void {
    this.app.use(errorHandler);
  }
}

export const app = new Application().app;
```

#### Service Layer Pattern
```typescript
// backend/src/services/StudentService.ts
import { PrismaClient } from '@prisma/client';
import { CacheService } from './CacheService';
import { ValidationService } from './ValidationService';
import { AuditService } from './AuditService';

export class StudentService {
  constructor(
    private prisma: PrismaClient,
    private cache: CacheService,
    private validator: ValidationService,
    private audit: AuditService
  ) {}
  
  async createStudent(data: CreateStudentData, userId: string): Promise<Student> {
    // Validate input
    const validatedData = await this.validator.validateStudentData(data);
    
    // Check for duplicates
    const existingStudent = await this.findByEmail(validatedData.email);
    if (existingStudent) {
      throw new ConflictError('Student with this email already exists');
    }
    
    try {
      // Database transaction
      const student = await this.prisma.$transaction(async (tx) => {
        // Create student record
        const newStudent = await tx.student.create({
          data: {
            ...validatedData,
            createdById: userId
          },
          include: {
            school: true,
            applications: true
          }
        });
        
        // Create initial application
        await tx.application.create({
          data: {
            studentId: newStudent.id,
            status: 'draft',
            createdById: userId
          }
        });
        
        return newStudent;
      });
      
      // Audit log
      await this.audit.log('student_created', {
        studentId: student.id,
        userId,
        timestamp: new Date()
      });
      
      // Cache invalidation
      await this.cache.invalidatePattern(`students:*`);
      
      return student;
      
    } catch (error) {
      await this.audit.log('student_creation_failed', {
        error: error.message,
        userId,
        data: validatedData
      });
      throw error;
    }
  }
  
  async findStudents(filters: StudentFilters, userId: string): Promise<StudentList> {
    const cacheKey = `students:list:${JSON.stringify(filters)}`;
    
    // Try cache first
    const cached = await this.cache.get<StudentList>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Build query
    const query = this.buildStudentQuery(filters);
    
    // Execute query
    const [students, total] = await Promise.all([
      this.prisma.student.findMany(query),
      this.prisma.student.count({ where: query.where })
    ]);
    
    const result: StudentList = {
      students,
      total,
      page: filters.page || 1,
      limit: filters.limit || 25,
      hasMore: total > (filters.page || 1) * (filters.limit || 25)
    };
    
    // Cache result
    await this.cache.set(cacheKey, result, 300); // 5 minutes
    
    return result;
  }
  
  private buildStudentQuery(filters: StudentFilters): any {
    const where: any = {};
    
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { studentId: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    if (filters.schoolId) {
      where.schoolId = filters.schoolId;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    return {
      where,
      include: {
        school: true,
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: ((filters.page || 1) - 1) * (filters.limit || 25),
      take: filters.limit || 25
    };
  }
}
```

#### Frontend Architecture
```typescript
// student-pass-frontend/src/store/useStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  // Auth state
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // UI state
  loading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  
  // Data state
  students: Student[];
  applications: Application[];
  passes: Pass[];
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Data actions
  setStudents: (students: Student[]) => void;
  addStudent: (student: Student) => void;
  updateStudent: (id: string, student: Partial<Student>) => void;
  removeStudent: (id: string) => void;
}

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        theme: 'light',
        students: [],
        applications: [],
        passes: [],
        
        // Auth actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setToken: (token) => set({ token }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        
        // Data actions
        setStudents: (students) => set({ students }),
        addStudent: (student) => set((state) => ({
          students: [...state.students, student]
        })),
        updateStudent: (id, updates) => set((state) => ({
          students: state.students.map(s => 
            s.id === id ? { ...s, ...updates } : s
          )
        })),
        removeStudent: (id) => set((state) => ({
          students: state.students.filter(s => s.id !== id)
        }))
      }),
      {
        name: 'student-pass-store',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          theme: state.theme
        })
      }
    )
  )
);
```

## Development Workflow

### Git Workflow

#### Branch Strategy
```bash
# Main branches
main              # Production-ready code
develop           # Integration branch for features
staging           # Pre-production testing

# Feature branches
feature/SPS-123-student-search    # New features
bugfix/SPS-456-fix-validation     # Bug fixes
hotfix/SPS-789-critical-security  # Critical fixes
release/v2.1.0                    # Release preparation
```

#### Commit Message Convention
```bash
# Format: <type>(<scope>): <subject>

# Types
feat: new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons, etc.
refactor: code change that neither fixes bug nor adds feature
test: adding missing tests
chore: maintain

# Examples
feat(auth): add multi-factor authentication
fix(database): resolve connection timeout issues
docs(api): update authentication endpoints
test(students): add integration tests for student CRUD
```

#### Development Process
```bash
# 1. Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/SPS-123-student-search

# 2. Development cycle
git add .
git commit -m "feat(students): implement advanced search functionality"
git push origin feature/SPS-123-student-search

# 3. Create pull request
# - Title: [SPS-123] Add advanced student search
# - Description: Detailed explanation of changes
# - Link to issue/ticket
# - Screenshots for UI changes

# 4. Code review process
# - Automated checks must pass
# - At least 2 approvals required
# - All comments resolved

# 5. Merge and cleanup
git checkout develop
git pull origin develop
git branch -d feature/SPS-123-student-search
```

### Development Scripts

#### Package.json Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd student-pass-frontend && npm run dev",
    "dev:logs": "docker-compose -f docker-compose.dev.yml logs -f",
    
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd student-pass-frontend && npm run build",
    
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd backend && npm run test",
    "test:frontend": "cd student-pass-frontend && npm run test",
    "test:e2e": "cd backend && npm run test:e2e",
    
    "lint": "npm run lint:backend && npm run lint:frontend",
    "lint:backend": "cd backend && npm run lint",
    "lint:frontend": "cd student-pass-frontend && npm run lint",
    "lint:fix": "npm run lint:backend -- --fix && npm run lint:frontend -- --fix",
    
    "db:migrate": "cd backend && npx prisma migrate dev",
    "db:seed": "cd backend && npx prisma db seed",
    "db:reset": "cd backend && npx prisma migrate reset --force",
    "db:studio": "cd backend && npx prisma studio",
    
    "docker:dev": "docker-compose -f docker-compose.dev.yml up -d",
    "docker:prod": "docker-compose -f docker-compose.prod.yml up -d",
    "docker:clean": "docker-compose down -v && docker system prune -f",
    
    "health-check": "ts-node scripts/dev-health-check.ts",
    "generate-secrets": "ts-node scripts/generate-secrets.ts",
    "backup:dev": "ts-node scripts/backup-dev-data.ts"
  }
}
```

## Coding Standards & Guidelines

### TypeScript Configuration

#### Backend tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/types/*": ["./src/types/*"],
      "@/services/*": ["./src/services/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

#### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/prefer-const": "error",
    "@typescript-eslint/no-var-requires": "error",
    
    "prefer-const": "error",
    "no-var": "error",
    "no-console": "warn",
    "eqeqeq": "error",
    "curly": "error",
    
    "max-len": ["error", { "code": 100, "ignoreUrls": true }],
    "max-lines": ["warn", 500],
    "complexity": ["warn", 10]
  }
}
```

### Code Style Guidelines

#### Naming Conventions
```typescript
// Files and directories: kebab-case
user-service.ts
student-controller.ts
auth-middleware.ts

// Classes: PascalCase
class StudentService {}
class AuthenticationError {}

// Functions and variables: camelCase
const getUserById = () => {}
const isAuthenticated = true;

// Constants: SCREAMING_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5;
const DEFAULT_PAGE_SIZE = 25;

// Types and interfaces: PascalCase
interface Student {}
type UserRole = 'admin' | 'student' | 'staff';

// Database tables: snake_case (Prisma)
model student_applications {}
```

#### Function Documentation
```typescript
/**
 * Creates a new student application with validation and audit logging
 * 
 * @param applicationData - The application data to create
 * @param userId - ID of the user creating the application
 * @returns Promise resolving to the created application
 * 
 * @throws {ValidationError} When application data is invalid
 * @throws {ConflictError} When student already has pending application
 * @throws {DatabaseError} When database operation fails
 * 
 * @example
 * ```typescript
 * const application = await createApplication({
 *   studentId: 'student-123',
 *   type: 'temporary',
 *   reason: 'Lost permanent pass',
 *   validUntil: new Date('2024-12-31')
 * }, 'user-456');
 * ```
 */
export async function createApplication(
  applicationData: CreateApplicationData,
  userId: string
): Promise<Application> {
  // Implementation
}
```

#### Error Handling Patterns
```typescript
// Custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Error handling in services
export class StudentService {
  async createStudent(data: CreateStudentData): Promise<Student> {
    try {
      // Validation
      const errors = await this.validateStudentData(data);
      if (errors.length > 0) {
        throw new ValidationError(
          'Invalid student data',
          errors[0].field,
          'INVALID_STUDENT_DATA'
        );
      }
      
      // Database operation
      const student = await this.prisma.student.create({ data });
      return student;
      
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error; // Re-throw validation errors
      }
      
      // Log and wrap database errors
      this.logger.error('Failed to create student', {
        error: error.message,
        data
      });
      
      throw new DatabaseError(
        'Failed to create student',
        'create',
        error
      );
    }
  }
}

// Error handling in controllers
export const createStudentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const student = await studentService.createStudent(req.body);
    res.status(201).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error); // Pass to error middleware
  }
};

// Global error middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let status = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  
  if (error instanceof ValidationError) {
    status = 400;
    code = error.code;
  } else if (error instanceof ConflictError) {
    status = 409;
    code = 'CONFLICT';
  }
  
  res.status(status).json({
    success: false,
    error: {
      message: error.message,
      code,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};
```

## Testing Procedures

### Testing Strategy

#### Test Pyramid Structure
```
    E2E Tests (5%)
   ┌─────────────────┐
   │   Integration   │ (25%)
   ├─────────────────┤
   │   Unit Tests    │ (70%)
   └─────────────────┘
```

### Unit Testing

#### Backend Unit Tests (Jest)
```typescript
// backend/tests/services/StudentService.test.ts
import { StudentService } from '../../src/services/StudentService';
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('StudentService', () => {
  let studentService: StudentService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  
  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    studentService = new StudentService(mockPrisma);
  });
  
  describe('createStudent', () => {
    const validStudentData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@university.edu',
      studentId: 'STU123456',
      schoolId: 'school-1'
    };
    
    it('should create student successfully', async () => {
      // Arrange
      const expectedStudent = { id: 'student-1', ...validStudentData };
      mockPrisma.student.create.mockResolvedValue(expectedStudent);
      mockPrisma.student.findFirst.mockResolvedValue(null);
      
      // Act
      const result = await studentService.createStudent(validStudentData, 'user-1');
      
      // Assert
      expect(result).toEqual(expectedStudent);
      expect(mockPrisma.student.create).toHaveBeenCalledWith({
        data: expect.objectContaining(validStudentData)
      });
    });
    
    it('should throw ValidationError for invalid data', async () => {
      // Arrange
      const invalidData = { ...validStudentData, email: 'invalid-email' };
      
      // Act & Assert
      await expect(
        studentService.createStudent(invalidData, 'user-1')
      ).rejects.toThrow(ValidationError);
    });
    
    it('should throw ConflictError for duplicate email', async () => {
      // Arrange
      mockPrisma.student.findFirst.mockResolvedValue({
        id: 'existing-student',
        ...validStudentData
      });
      
      // Act & Assert
      await expect(
        studentService.createStudent(validStudentData, 'user-1')
      ).rejects.toThrow(ConflictError);
    });
  });
  
  describe('findStudents', () => {
    it('should return paginated students', async () => {
      // Arrange
      const mockStudents = [
        { id: 'student-1', firstName: 'John', lastName: 'Doe' },
        { id: 'student-2', firstName: 'Jane', lastName: 'Smith' }
      ];
      mockPrisma.student.findMany.mockResolvedValue(mockStudents);
      mockPrisma.student.count.mockResolvedValue(2);
      
      // Act
      const result = await studentService.findStudents({
        page: 1,
        limit: 10
      }, 'user-1');
      
      // Assert
      expect(result).toEqual({
        students: mockStudents,
        total: 2,
        page: 1,
        limit: 10,
        hasMore: false
      });
    });
  });
});
```

#### Frontend Unit Tests (React Testing Library)
```typescript
// student-pass-frontend/tests/components/StudentList.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudentList } from '../../src/components/StudentList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const mockStudents = [
  {
    id: 'student-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@university.edu',
    studentId: 'STU123456',
    status: 'active'
  },
  {
    id: 'student-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@university.edu',
    studentId: 'STU789012',
    status: 'inactive'
  }
];

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('StudentList', () => {
  it('should render student list correctly', () => {
    render(
      <TestWrapper>
        <StudentList students={mockStudents} onStudentClick={jest.fn()} />
      </TestWrapper>
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('STU123456')).toBeInTheDocument();
  });
  
  it('should filter students by search term', async () => {
    render(
      <TestWrapper>
        <StudentList students={mockStudents} onStudentClick={jest.fn()} />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText('Search students...');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });
  
  it('should call onStudentClick when student is clicked', () => {
    const mockOnClick = jest.fn();
    
    render(
      <TestWrapper>
        <StudentList students={mockStudents} onStudentClick={mockOnClick} />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByText('John Doe'));
    expect(mockOnClick).toHaveBeenCalledWith('student-1');
  });
  
  it('should show empty state when no students', () => {
    render(
      <TestWrapper>
        <StudentList students={[]} onStudentClick={jest.fn()} />
      </TestWrapper>
    );
    
    expect(screen.getByText('No students found')).toBeInTheDocument();
  });
});
```

### Integration Testing

#### API Integration Tests
```typescript
// backend/tests/integration/students.integration.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import { generateTestToken } from '../utils/auth';

describe('/api/students', () => {
  let prisma: PrismaClient;
  let authToken: string;
  
  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    
    // Create test user and get token
    const testUser = await prisma.user.create({
      data: {
        email: 'test@university.edu',
        password: 'hashedpassword',
        role: 'admin'
      }
    });
    authToken = generateTestToken(testUser.id);
  });
  
  afterAll(async () => {
    // Cleanup test data
    await prisma.student.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });
  
  describe('POST /api/students', () => {
    it('should create a new student', async () => {
      const studentData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@university.edu',
        studentId: 'STU123456',
        schoolId: 'school-1'
      };
      
      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(studentData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(studentData);
      expect(response.body.data.id).toBeDefined();
    });
    
    it('should return 400 for invalid data', async () => {
      const invalidData = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email'
      };
      
      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/students')
        .send({})
        .expect(401);
    });
  });
  
  describe('GET /api/students', () => {
    beforeEach(async () => {
      // Create test students
      await prisma.student.createMany({
        data: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@university.edu',
            studentId: 'STU001',
            schoolId: 'school-1'
          },
          {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@university.edu',
            studentId: 'STU002',
            schoolId: 'school-1'
          }
        ]
      });
    });
    
    afterEach(async () => {
      await prisma.student.deleteMany();
    });
    
    it('should return paginated students', async () => {
      const response = await request(app)
        .get('/api/students?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.students).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.page).toBe(1);
    });
    
    it('should filter students by search term', async () => {
      const response = await request(app)
        .get('/api/students?search=John')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.data.students).toHaveLength(1);
      expect(response.body.data.students[0].firstName).toBe('John');
    });
  });
});
```

### End-to-End Testing

#### E2E Tests with Playwright
```typescript
// backend/tests/e2e/student-management.e2e.test.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Student Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@university.edu');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });
  
  test('should create a new student', async ({ page }) => {
    // Navigate to student management
    await page.click('[data-testid="nav-students"]');
    await page.waitForURL('/students');
    
    // Click create student button
    await page.click('[data-testid="create-student-button"]');
    
    // Fill student form
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="email"]', 'john.doe@university.edu');
    await page.fill('[data-testid="student-id"]', 'STU123456');
    await page.selectOption('[data-testid="school"]', 'school-1');
    
    // Submit form
    await page.click('[data-testid="submit-button"]');
    
    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
  });
  
  test('should search for students', async ({ page }) => {
    // Navigate to students page
    await page.goto('/students');
    
    // Search for student
    await page.fill('[data-testid="search-input"]', 'John');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Verify results
    await expect(page.locator('[data-testid="student-card"]')).toHaveCount(1);
    await expect(page.locator('text=John Doe')).toBeVisible();
  });
  
  test('should generate student pass', async ({ page }) => {
    // Navigate to student detail
    await page.goto('/students');
    await page.click('[data-testid="student-card"]:has-text("John Doe")');
    
    // Generate pass
    await page.click('[data-testid="generate-pass-button"]');
    
    // Fill pass details
    await page.selectOption('[data-testid="pass-type"]', 'temporary');
    await page.fill('[data-testid="valid-until"]', '2024-12-31');
    await page.fill('[data-testid="reason"]', 'Testing purposes');
    
    // Submit
    await page.click('[data-testid="generate-button"]');
    
    // Verify pass generation
    await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
    await expect(page.locator('text=Pass generated successfully')).toBeVisible();
  });
});
```

### Test Running Scripts

#### Test Configuration
```json
// package.json test scripts
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest --testMatch='**/*.test.ts'",
    "test:integration": "jest --testMatch='**/*.integration.test.ts' --runInBand",
    "test:e2e": "playwright test",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}

// Jest configuration
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/src", "<rootDir>/tests"],
  "testMatch": ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/index.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  },
  "setupFilesAfterEnv": ["<rootDir>/tests/setup.ts"]
}
```

## Database Development

### Prisma Schema Management

#### Schema Development Workflow
```bash
# 1. Update schema file
# Edit prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name add-student-verification

# 3. Generate Prisma client
npx prisma generate

# 4. Update seeder if needed
# Edit prisma/seed.ts

# 5. Reset and seed for development
npx prisma migrate reset --force
npx prisma db seed
```

#### Schema Best Practices
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Base model with common fields
model BaseModel {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  @@map("base_model")
}

// Student model with proper indexing
model Student {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")
  
  // Personal information
  firstName   String   @map("first_name") @db.VarChar(100)
  lastName    String   @map("last_name") @db.VarChar(100)
  email       String   @unique @db.VarChar(255)
  phone       String?  @db.VarChar(20)
  
  // Academic information
  studentId   String   @unique @map("student_id") @db.VarChar(20)
  schoolId    String   @map("school_id")
  school      School   @relation(fields: [schoolId], references: [id])
  
  // Status and metadata
  status      StudentStatus @default(ACTIVE)
  isVerified  Boolean  @default(false) @map("is_verified")
  
  // Relationships
  applications Application[]
  passes       Pass[]
  accessLogs   AccessLog[]
  
  // Indexes
  @@index([email])
  @@index([studentId])
  @@index([schoolId])
  @@index([status, deletedAt])
  @@index([createdAt DESC])
  @@index([firstName, lastName])
  
  // Full-text search
  @@index([firstName, lastName, email, studentId], type: Gin)
  
  @@map("students")
}

// Enum definitions
enum StudentStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  GRADUATED
  
  @@map("student_status")
}

enum PassType {
  PERMANENT
  TEMPORARY
  VISITOR
  EMERGENCY
  
  @@map("pass_type")
}

// Pass model with security considerations
model Pass {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Pass information
  type        PassType
  status      PassStatus @default(ACTIVE)
  validFrom   DateTime @map("valid_from")
  validUntil  DateTime @map("valid_until")
  
  // Security fields
  qrCodeData  String   @unique @map("qr_code_data") @db.Text
  qrCodeHash  String   @unique @map("qr_code_hash") @db.VarChar(64)
  signature   String   @db.Text
  nonce       String   @db.VarChar(32)
  
  // Relationships
  studentId   String   @map("student_id")
  student     Student  @relation(fields: [studentId], references: [id])
  
  issuedById  String   @map("issued_by_id")
  issuedBy    User     @relation(fields: [issuedById], references: [id])
  
  accessLogs  AccessLog[]
  
  // Indexes
  @@index([qrCodeHash])
  @@index([studentId, status])
  @@index([validFrom, validUntil])
  @@index([type, status])
  
  @@map("passes")
}
```

#### Database Seeding
```typescript
// prisma/seed.ts
import { PrismaClient, StudentStatus, PassType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  
  // Create admin user
  const adminPassword = await hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@university.edu' },
    update: {},
    create: {
      email: 'admin@university.edu',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      isVerified: true
    }
  });
  
  console.log('✅ Admin user created');
  
  // Create schools
  const schools = await Promise.all([
    prisma.school.upsert({
      where: { code: 'ENG' },
      update: {},
      create: {
        name: 'School of Engineering',
        code: 'ENG',
        address: '123 Engineering Drive',
        contactEmail: 'engineering@university.edu'
      }
    }),
    prisma.school.upsert({
      where: { code: 'BUS' },
      update: {},
      create: {
        name: 'School of Business',
        code: 'BUS',
        address: '456 Business Boulevard',
        contactEmail: 'business@university.edu'
      }
    })
  ]);
  
  console.log('✅ Schools created');
  
  // Create students
  const students = [];
  for (let i = 0; i < 50; i++) {
    const student = await prisma.student.create({
      data: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        studentId: `STU${String(i + 1).padStart(6, '0')}`,
        schoolId: faker.helpers.arrayElement(schools).id,
        status: faker.helpers.enumValue(StudentStatus),
        isVerified: faker.datatype.boolean(0.8)
      }
    });
    students.push(student);
  }
  
  console.log(`✅ ${students.length} students created`);
  
  // Create applications
  for (let i = 0; i < 30; i++) {
    await prisma.application.create({
      data: {
        studentId: faker.helpers.arrayElement(students).id,
        type: faker.helpers.enumValue(PassType),
        reason: faker.lorem.sentence(),
        status: faker.helpers.arrayElement(['PENDING', 'APPROVED', 'REJECTED']),
        submittedAt: faker.date.past(),
        createdById: adminUser.id
      }
    });
  }
  
  console.log('✅ Applications created');
  
  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Database Performance Optimization

#### Query Optimization
```typescript
// backend/src/services/DatabaseOptimizationService.ts
export class DatabaseOptimizationService {
  constructor(private prisma: PrismaClient) {}
  
  // Optimized student search with full-text search
  async searchStudents(query: string, filters: SearchFilters): Promise<Student[]> {
    return this.prisma.$queryRaw`
      SELECT s.*, sc.name as school_name
      FROM students s
      INNER JOIN schools sc ON s.school_id = sc.id
      WHERE s.deleted_at IS NULL
        AND (
          to_tsvector('english', s.first_name || ' ' || s.last_name || ' ' || s.email) 
          @@ plainto_tsquery('english', ${query})
          OR s.student_id ILIKE ${`%${query}%`}
        )
        ${filters.schoolId ? Prisma.sql`AND s.school_id = ${filters.schoolId}` : Prisma.empty}
        ${filters.status ? Prisma.sql`AND s.status = ${filters.status}` : Prisma.empty}
      ORDER BY 
        ts_rank(to_tsvector('english', s.first_name || ' ' || s.last_name), plainto_tsquery('english', ${query})) DESC,
        s.created_at DESC
      LIMIT ${filters.limit || 25}
      OFFSET ${((filters.page || 1) - 1) * (filters.limit || 25)}
    `;
  }
  
  // Bulk operations for performance
  async bulkCreateStudents(students: CreateStudentData[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Batch insert students
      await tx.student.createMany({
        data: students,
        skipDuplicates: true
      });
      
      // Create corresponding applications
      const studentEmails = students.map(s => s.email);
      const createdStudents = await tx.student.findMany({
        where: { email: { in: studentEmails } },
        select: { id: true }
      });
      
      await tx.application.createMany({
        data: createdStudents.map(s => ({
          studentId: s.id,
          type: 'PERMANENT',
          status: 'PENDING',
          reason: 'Initial application'
        }))
      });
    });
  }
  
  // Optimized analytics queries
  async getStudentStatistics(timeRange: TimeRange): Promise<StudentStats> {
    const [totalStudents, activeStudents, newStudents, passStats] = await Promise.all([
      // Total students
      this.prisma.student.count({
        where: { deletedAt: null }
      }),
      
      // Active students
      this.prisma.student.count({
        where: { 
          deletedAt: null,
          status: 'ACTIVE' 
        }
      }),
      
      // New students in time range
      this.prisma.student.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        }
      }),
      
      // Pass statistics
      this.prisma.pass.groupBy({
        by: ['type', 'status'],
        _count: {
          id: true
        },
        where: {
          createdAt: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        }
      })
    ]);
    
    return {
      totalStudents,
      activeStudents,
      newStudents,
      passStats: passStats.reduce((acc, stat) => {
        acc[`${stat.type}_${stat.status}`] = stat._count.id;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}
```

## API Development Guidelines

### RESTful API Design

#### API Structure
```typescript
// backend/src/routes/students.ts
import { Router } from 'express';
import { StudentController } from '../controllers/StudentController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { rateLimit } from '../middleware/rateLimit';
import { CreateStudentSchema, UpdateStudentSchema } from '../schemas/student';

const router = Router();
const studentController = new StudentController();

// Apply middleware
router.use(authMiddleware);
router.use(rateLimit({ max: 100, windowMs: 15 * 60 * 1000 })); // 100 requests per 15 minutes

// Routes
router.get(
  '/',
  studentController.getStudents.bind(studentController)
);

router.get(
  '/:id',
  studentController.getStudent.bind(studentController)
);

router.post(
  '/',
  validateRequest(CreateStudentSchema),
  studentController.createStudent.bind(studentController)
);

router.put(
  '/:id',
  validateRequest(UpdateStudentSchema),
  studentController.updateStudent.bind(studentController)
);

router.delete(
  '/:id',
  studentController.deleteStudent.bind(studentController)
);

// Nested routes
router.get(
  '/:id/applications',
  studentController.getStudentApplications.bind(studentController)
);

router.get(
  '/:id/passes',
  studentController.getStudentPasses.bind(studentController)
);

export { router as studentRoutes };
```

#### Request/Response Standards
```typescript
// API Response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

// Controller implementation
export class StudentController {
  async getStudents(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseFilters(req.query);
      const result = await this.studentService.findStudents(filters, req.user.id);
      
      const response: ApiResponse<StudentList> = {
        success: true,
        data: result,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          hasMore: result.hasMore
        }
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
  
  async createStudent(req: Request, res: Response): Promise<void> {
    try {
      const student = await this.studentService.createStudent(
        req.body,
        req.user.id
      );
      
      const response: ApiResponse<Student> = {
        success: true,
        data: student
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
  
  private parseFilters(query: any): StudentFilters {
    return {
      page: parseInt(query.page) || 1,
      limit: Math.min(parseInt(query.limit) || 25, 100), // Max 100 items
      search: query.search?.toString(),
      schoolId: query.schoolId?.toString(),
      status: query.status?.toString(),
      sortBy: query.sortBy?.toString() || 'createdAt',
      sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc'
    };
  }
}
```

### Input Validation

#### Validation Schemas (Zod)
```typescript
// backend/src/schemas/student.ts
import { z } from 'zod';

export const CreateStudentSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(1, 'First name is required')
      .max(100, 'First name too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in first name'),
    
    lastName: z.string()
      .min(1, 'Last name is required')
      .max(100, 'Last name too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in last name'),
    
    email: z.string()
      .email('Invalid email format')
      .max(255, 'Email too long')
      .transform(email => email.toLowerCase()),
    
    phone: z.string()
      .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
      .optional(),
    
    studentId: z.string()
      .min(3, 'Student ID too short')
      .max(20, 'Student ID too long')
      .regex(/^[A-Z0-9]+$/, 'Student ID must contain only uppercase letters and numbers'),
    
    schoolId: z.string()
      .cuid('Invalid school ID format'),
    
    dateOfBirth: z.string()
      .datetime()
      .transform(date => new Date(date))
      .refine(date => {
        const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return age >= 16 && age <= 100;
      }, 'Student must be between 16 and 100 years old'),
    
    address: z.object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(2, 'State is required').max(2, 'Use state abbreviation'),
      zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format')
    }).optional()
  })
});

export const UpdateStudentSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z\s'-]+$/)
      .optional(),
    
    lastName: z.string()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z\s'-]+$/)
      .optional(),
    
    phone: z.string()
      .regex(/^\+?[\d\s\-\(\)]+$/)
      .optional(),
    
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED'])
      .optional()
  })
});

// Validation middleware
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      // Replace request data with validated/transformed data
      req.body = parsed.body || req.body;
      req.query = parsed.query || req.query;
      req.params = parsed.params || req.params;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          }
        });
      } else {
        next(error);
      }
    }
  };
};
```

## Contributing Guidelines

### Pull Request Process

#### PR Template
```markdown
<!-- .github/pull_request_template.md -->
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Issue Reference
Fixes #(issue number)

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] E2E tests

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information that reviewers should know.
```

#### Code Review Checklist
```markdown
# Code Review Checklist

## Functionality
- [ ] Code accomplishes what it's supposed to do
- [ ] Edge cases are handled properly
- [ ] Error handling is appropriate
- [ ] Business logic is correct

## Code Quality
- [ ] Code is readable and well-structured
- [ ] Functions are appropriately sized
- [ ] Variable names are descriptive
- [ ] Code follows project conventions
- [ ] No code duplication
- [ ] No commented-out code

## Security
- [ ] No hardcoded secrets or credentials
- [ ] Input validation is present where needed
- [ ] SQL injection protection is in place
- [ ] Authentication/authorization is correct
- [ ] Sensitive data is handled properly

## Performance
- [ ] No obvious performance issues
- [ ] Database queries are optimized
- [ ] Memory usage is reasonable
- [ ] Caching is used where appropriate

## Testing
- [ ] Tests are present and comprehensive
- [ ] Tests actually test the functionality
- [ ] Test names are descriptive
- [ ] Tests are not flaky

## Documentation
- [ ] Code is self-documenting or well-commented
- [ ] API documentation is updated if needed
- [ ] README is updated if needed
```

### Development Workflow Guidelines

#### Feature Development
```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/SPS-123-advanced-search

# 2. Development cycle
# Make changes
git add .
git commit -m "feat(search): implement advanced search filters"

# Push frequently
git push origin feature/SPS-123-advanced-search

# 3. Keep branch updated
git fetch origin develop
git rebase origin/develop

# 4. Final testing
npm run test
npm run lint
npm run build

# 5. Create PR
# Use GitHub interface or GitHub CLI
gh pr create --title "[SPS-123] Add advanced search functionality" --body-file .github/pr-template.md

# 6. After approval and merge
git checkout develop
git pull origin develop
git branch -d feature/SPS-123-advanced-search
```

## Troubleshooting Guide

### Common Development Issues

#### Database Connection Issues
```bash
# Issue: Database connection refused
Error: connect ECONNREFUSED 127.0.0.1:5432

# Solution:
1. Check if PostgreSQL is running:
   brew services list | grep postgresql  # macOS
   sudo systemctl status postgresql      # Linux

2. Start PostgreSQL:
   brew services start postgresql        # macOS
   sudo systemctl start postgresql       # Linux

3. Check connection string in .env:
   DATABASE_URL="postgresql://user:password@localhost:5432/studentpass"

4. Test connection:
   npx prisma db pull
```

#### Frontend Build Issues
```bash
# Issue: Module not found errors
Module not found: Error: Can't resolve 'some-module'

# Solutions:
1. Clear node_modules and reinstall:
   rm -rf node_modules package-lock.json
   npm install

2. Check if module is in package.json:
   npm list some-module

3. Install missing dependency:
   npm install some-module

4. Clear build cache:
   rm -rf .next/cache  # Next.js
   rm -rf build        # Create React App
```

#### Type Errors
```typescript
// Issue: TypeScript type errors after schema changes

// Solution: Regenerate types
npm run generate-types

// Or manually:
cd backend
npx prisma generate

// Update shared types
npm run build:types
```

#### Authentication Issues
```bash
# Issue: JWT token invalid/expired

# Debug steps:
1. Check token expiration:
   jwt.decode(token)

2. Verify JWT secret matches:
   console.log(process.env.JWT_SECRET)

3. Check token format:
   Authorization: Bearer <token>

4. Regenerate token:
   npm run generate-test-token
```

### Performance Debugging

#### Slow Database Queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms
SELECT pg_reload_conf();

-- Find slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze specific query
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM students WHERE ...;
```

#### Memory Leaks
```typescript
// Monitor memory usage
const memoryUsage = () => {
  const used = process.memoryUsage();
  console.log('Memory Usage:');
  for (let key in used) {
    console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
};

// Call periodically
setInterval(memoryUsage, 30000); // Every 30 seconds

// Use heap profiler
node --inspect app.js
# Then open Chrome DevTools
```

### Environment-Specific Issues

#### Development Environment
```bash
# Issue: Services not starting

# Check Docker containers:
docker-compose -f docker-compose.dev.yml ps

# View logs:
docker-compose -f docker-compose.dev.yml logs service-name

# Restart specific service:
docker-compose -f docker-compose.dev.yml restart backend

# Rebuild containers:
docker-compose -f docker-compose.dev.yml up --build -d
```

#### Production Deployment
```bash
# Issue: Application not accessible

# Check deployment status:
kubectl get pods -n studentpass
kubectl get services -n studentpass
kubectl get ingress -n studentpass

# View pod logs:
kubectl logs deployment/backend -n studentpass

# Check resource usage:
kubectl top pods -n studentpass

# Scale deployment:
kubectl scale deployment backend --replicas=3 -n studentpass
```

## Development Tools & Utilities

### VS Code Configuration

#### Workspace Settings
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true,
    "**/coverage": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

#### Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "ms-vscode-remote.remote-containers"
  ]
}
```

### Debugging Configuration

#### VS Code Launch Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/index.ts",
      "env": {
        "NODE_ENV": "development"
      },
      "envFile": "${workspaceFolder}/backend/.env",
      "runtimeArgs": ["-r", "ts-node/register"],
      "sourceMaps": true,
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    },
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Development Scripts

#### Utility Scripts
```typescript
// scripts/dev-utils.ts
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Reset development environment
export function resetDevEnvironment(): void {
  console.log('🔄 Resetting development environment...');
  
  // Stop all services
  execSync('docker-compose -f docker-compose.dev.yml down -v');
  
  // Clear caches
  execSync('rm -rf backend/dist backend/node_modules/.cache');
  execSync('rm -rf student-pass-frontend/.next student-pass-frontend/node_modules/.cache');
  
  // Reset database
  execSync('cd backend && npx prisma migrate reset --force');
  
  // Restart services
  execSync('docker-compose -f docker-compose.dev.yml up -d');
  
  console.log('✅ Development environment reset complete');
}

// Generate test data
export function generateTestData(): void {
  console.log('📊 Generating test data...');
  
  execSync('cd backend && npm run db:seed');
  
  console.log('✅ Test data generated');
}

// Check environment health
export function checkEnvironmentHealth(): void {
  const checks = [
    { name: 'Node.js', cmd: 'node --version' },
    { name: 'npm', cmd: 'npm --version' },
    { name: 'Docker', cmd: 'docker --version' },
    { name: 'PostgreSQL', cmd: 'psql --version' },
    { name: 'Redis', cmd: 'redis-cli --version' }
  ];
  
  console.log('🔍 Checking environment health...');
  
  checks.forEach(check => {
    try {
      const version = execSync(check.cmd, { encoding: 'utf8' }).trim();
      console.log(`✅ ${check.name}: ${version}`);
    } catch {
      console.log(`❌ ${check.name}: Not found`);
    }
  });
}

if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'reset':
      resetDevEnvironment();
      break;
    case 'seed':
      generateTestData();
      break;
    case 'health':
      checkEnvironmentHealth();
      break;
    default:
      console.log('Available commands: reset, seed, health');
  }
}
```

---

## Conclusion

This developer documentation provides comprehensive guidance for developing, testing, and maintaining the Student Pass Management System. By following these guidelines and best practices, developers can ensure high code quality, maintainability, and consistency across the project.

### Key Takeaways

- **Environment Setup**: Ensure all prerequisites are met and health checks pass
- **Code Standards**: Follow TypeScript, ESLint, and Prettier configurations
- **Testing**: Maintain high test coverage with unit, integration, and E2E tests
- **Database**: Use Prisma best practices and optimize queries
- **API Development**: Follow RESTful principles with proper validation
- **Git Workflow**: Use feature branches and comprehensive PR reviews
- **Debugging**: Use provided tools and scripts for troubleshooting

### Getting Help

- **Documentation**: Reference this guide and API documentation
- **Team Communication**: Use designated Slack channels for questions
- **Code Reviews**: Request reviews early and often
- **Pair Programming**: Schedule sessions for complex features
- **Office Hours**: Attend weekly team office hours for discussions

---

**Developer Documentation**  
**Document Version**: 1.0.0  
**Last Updated**: [Current Date]  
**Next Review**: [Quarterly Date]  
**Maintainer**: Development Team Lead