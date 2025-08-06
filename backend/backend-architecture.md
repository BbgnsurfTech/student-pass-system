# Student Pass System - Backend Architecture

## 1. API Design and Endpoints Structure

### Base URL Structure
```
/api/v1/
```

### Authentication Endpoints
```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
```

### Student Management Endpoints
```
GET    /api/v1/students                    # List students (paginated, filterable)
POST   /api/v1/students                    # Create student
GET    /api/v1/students/:id                # Get student details
PUT    /api/v1/students/:id                # Update student
DELETE /api/v1/students/:id                # Soft delete student
POST   /api/v1/students/:id/photo          # Upload student photo
POST   /api/v1/students/:id/documents      # Upload documents
GET    /api/v1/students/:id/passes         # Get student's passes
POST   /api/v1/students/import             # Bulk import students
GET    /api/v1/students/export             # Export students data
```

### Pass Management Endpoints
```
GET    /api/v1/passes                      # List passes
POST   /api/v1/passes                      # Generate new pass
GET    /api/v1/passes/:id                  # Get pass details
PUT    /api/v1/passes/:id                  # Update pass
DELETE /api/v1/passes/:id                  # Deactivate pass
POST   /api/v1/passes/:id/activate         # Activate pass
POST   /api/v1/passes/:id/deactivate       # Deactivate pass
GET    /api/v1/passes/:id/qr               # Generate QR code
POST   /api/v1/passes/verify               # Verify pass (for card readers)
GET    /api/v1/passes/templates            # Get pass templates
```

### Access Control Endpoints
```
GET    /api/v1/access-logs                 # List access attempts
POST   /api/v1/access-logs                 # Log access attempt
GET    /api/v1/access-points               # List access points
POST   /api/v1/access-points               # Create access point
PUT    /api/v1/access-points/:id           # Update access point
DELETE /api/v1/access-points/:id           # Delete access point
```

### Administrative Endpoints
```
GET    /api/v1/admin/users                 # List admin users
POST   /api/v1/admin/users                 # Create admin user
PUT    /api/v1/admin/users/:id             # Update admin user
DELETE /api/v1/admin/users/:id             # Delete admin user
GET    /api/v1/admin/roles                 # List roles
POST   /api/v1/admin/roles                 # Create role
PUT    /api/v1/admin/roles/:id             # Update role
GET    /api/v1/admin/permissions           # List permissions
GET    /api/v1/admin/analytics             # System analytics
GET    /api/v1/admin/audit-logs            # Audit logs
```

### School/Institution Endpoints
```
GET    /api/v1/schools                     # List schools
POST   /api/v1/schools                     # Create school
GET    /api/v1/schools/:id                 # Get school details
PUT    /api/v1/schools/:id                 # Update school
GET    /api/v1/schools/:id/departments     # Get departments
POST   /api/v1/schools/:id/departments     # Create department
```

## 2. Database Schema and Relationships

### Core Tables Structure

#### Users Table (Admins/Staff)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id UUID REFERENCES roles(id),
    school_id UUID REFERENCES schools(id),
    is_active BOOLEAN DEFAULT true,
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Students Table
```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    phone VARCHAR(20),
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    school_id UUID REFERENCES schools(id),
    department_id UUID REFERENCES departments(id),
    program VARCHAR(100),
    year_of_study INTEGER,
    enrollment_date DATE,
    graduation_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, graduated, suspended
    photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP -- Soft delete
);
```

#### Schools Table
```sql
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Departments Table
```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) NOT NULL,
    school_id UUID REFERENCES schools(id),
    head_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, code)
);
```

#### Passes Table
```sql
CREATE TABLE passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    pass_number VARCHAR(50) UNIQUE NOT NULL,
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, expired, revoked
    pass_type VARCHAR(50) DEFAULT 'standard', -- standard, temporary, visitor
    issued_by UUID REFERENCES users(id),
    revoked_by UUID REFERENCES users(id),
    revoked_at TIMESTAMP,
    revoke_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Access Points Table
```sql
CREATE TABLE access_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    device_id VARCHAR(100) UNIQUE,
    school_id UUID REFERENCES schools(id),
    access_type VARCHAR(50), -- entry, exit, both
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Access Logs Table
```sql
CREATE TABLE access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    pass_id UUID REFERENCES passes(id),
    access_point_id UUID REFERENCES access_points(id),
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_type VARCHAR(20), -- entry, exit
    status VARCHAR(20), -- granted, denied
    reason VARCHAR(200), -- expired_pass, invalid_pass, etc.
    device_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Roles and Permissions Tables
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100), -- students, passes, access_points, etc.
    action VARCHAR(50), -- create, read, update, delete
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id),
    permission_id UUID REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);
```

#### Documents Table
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    document_type VARCHAR(100), -- id_card, transcript, photo, etc.
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Audit Logs Table
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100), -- create, update, delete, login, etc.
    resource_type VARCHAR(100), -- student, pass, user, etc.
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Key Relationships and Indexes

```sql
-- Indexes for performance
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_passes_student_id ON passes(student_id);
CREATE INDEX idx_passes_status ON passes(status);
CREATE INDEX idx_passes_expiry_date ON passes(expiry_date);
CREATE INDEX idx_access_logs_student_id ON access_logs(student_id);
CREATE INDEX idx_access_logs_access_time ON access_logs(access_time);
CREATE INDEX idx_access_logs_access_point_id ON access_logs(access_point_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

## 3. Authentication and Authorization Strategy

### JWT-Based Authentication
- **Access Tokens**: Short-lived (15-30 minutes) for API access
- **Refresh Tokens**: Long-lived (7-30 days) for token renewal
- **Token Storage**: Secure HTTP-only cookies for web, secure storage for mobile

### Role-Based Access Control (RBAC)
```typescript
interface User {
  id: string;
  email: string;
  role: Role;
  school: School;
  permissions: Permission[];
}

interface Role {
  id: string;
  name: string; // super_admin, school_admin, staff, security
  permissions: Permission[];
}

interface Permission {
  resource: string; // students, passes, access_points
  actions: string[]; // create, read, update, delete
}
```

### Permission Levels
1. **Super Admin**: Full system access across all schools
2. **School Admin**: Full access within their school
3. **Staff**: Limited access to student and pass management
4. **Security**: Read-only access to passes and access logs
5. **Card Reader**: Minimal access for pass verification

## 4. Security Considerations for Student Data

### Data Protection Measures
1. **Encryption at Rest**: AES-256 encryption for sensitive data
2. **Encryption in Transit**: TLS 1.3 for all API communications
3. **PII Handling**: Hash/encrypt sensitive fields (SSN, phone numbers)
4. **Data Minimization**: Collect only necessary student information
5. **Access Logging**: Comprehensive audit trails for all data access
6. **Data Retention**: Automatic cleanup of expired data

### Security Headers and Middleware
```typescript
// Security middleware configuration
const securityConfig = {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
  }
};
```

### Input Validation and Sanitization
```typescript
// Validation schemas using Joi or Zod
const studentValidationSchema = {
  firstName: z.string().min(1).max(100).regex(/^[a-zA-Z\s]+$/),
  lastName: z.string().min(1).max(100).regex(/^[a-zA-Z\s]+$/),
  email: z.string().email().optional(),
  studentId: z.string().min(3).max(50).regex(/^[a-zA-Z0-9-]+$/),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  dateOfBirth: z.string().datetime().optional()
};
```

## 5. Technology Stack Recommendations

### Backend Framework
**Node.js with Express.js** or **NestJS**
- Mature ecosystem with extensive TypeScript support
- Excellent performance for I/O operations
- Large community and package availability

### Database
**PostgreSQL** (Primary)
- ACID compliance for data integrity
- Advanced indexing and query optimization
- JSON/JSONB support for flexible data storage
- Row-level security for multi-tenancy

**Redis** (Caching & Sessions)
- Session storage for authentication
- Caching frequently accessed data
- Rate limiting implementation

### File Storage
**AWS S3** or **Google Cloud Storage**
- Scalable object storage for photos and documents
- CDN integration for fast global access
- Built-in backup and versioning

### Additional Technologies
```json
{
  "runtime": "Node.js 18+",
  "framework": "NestJS with TypeScript",
  "database": "PostgreSQL 14+",
  "orm": "Prisma or TypeORM",
  "cache": "Redis 6+",
  "fileStorage": "AWS S3",
  "imageProcessing": "Sharp",
  "qrGeneration": "qrcode library",
  "validation": "Zod or Joi",
  "authentication": "JWT with Passport.js",
  "logging": "Winston with structured logging",
  "monitoring": "Prometheus + Grafana",
  "testing": "Jest + Supertest",
  "documentation": "Swagger/OpenAPI"
}
```

## 6. Data Validation and Error Handling Approach

### Validation Strategy
```typescript
// Input validation middleware
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      req.body = validated.body;
      req.query = validated.query;
      req.params = validated.params;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};
```

### Error Response Format
```typescript
interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: any;
  requestId: string;
}

// Global error handler
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.headers['x-request-id'] as string;
  
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    requestId,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query
  });

  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      statusCode: 400,
      timestamp: new Date().toISOString(),
      path: req.path,
      requestId
    });
  }

  // Handle other error types...
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    statusCode: 500,
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId
  });
};
```

## 7. File Upload Handling

### Upload Configuration
```typescript
// Multer configuration for file uploads
const uploadConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 10 // Max 10 files per request
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
    const allowedMimes = {
      photos: ['image/jpeg', 'image/png', 'image/webp'],
      documents: ['application/pdf', 'image/jpeg', 'image/png']
    };
    
    const fileType = req.path.includes('photo') ? 'photos' : 'documents';
    
    if (allowedMimes[fileType].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedMimes[fileType].join(', ')}`));
    }
  }
};

// File upload service
class FileUploadService {
  async uploadStudentPhoto(studentId: string, file: Express.Multer.File): Promise<string> {
    // Validate file
    if (!file) throw new Error('No file provided');
    
    // Process image (resize, optimize)
    const processedBuffer = await sharp(file.buffer)
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    // Generate unique filename
    const filename = `students/${studentId}/photo-${Date.now()}.jpg`;
    
    // Upload to S3
    const uploadResult = await this.s3Client.upload({
      Bucket: process.env.S3_BUCKET,
      Key: filename,
      Body: processedBuffer,
      ContentType: 'image/jpeg',
      ACL: 'private'
    }).promise();
    
    // Update student record
    await this.studentRepository.update(studentId, {
      photoUrl: uploadResult.Location
    });
    
    return uploadResult.Location;
  }
  
  async uploadDocument(studentId: string, file: Express.Multer.File, documentType: string): Promise<Document> {
    // Virus scan (integrate with ClamAV or similar)
    await this.virusScanService.scan(file.buffer);
    
    // Generate unique filename
    const filename = `students/${studentId}/documents/${documentType}-${Date.now()}-${file.originalname}`;
    
    // Upload to S3
    const uploadResult = await this.s3Client.upload({
      Bucket: process.env.S3_BUCKET,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private'
    }).promise();
    
    // Save document record
    return await this.documentRepository.create({
      studentId,
      documentType,
      fileName: file.originalname,
      filePath: uploadResult.Location,
      fileSize: file.size,
      mimeType: file.mimetype
    });
  }
}
```

## 8. Integration Considerations

### School Systems Integration
```typescript
// SIS (Student Information System) Integration
interface SISIntegration {
  syncStudents(): Promise<void>;
  validateStudent(studentId: string): Promise<boolean>;
  getStudentData(studentId: string): Promise<StudentData>;
}

// Card Reader Integration
interface CardReaderIntegration {
  verifyPass(qrCode: string): Promise<PassVerificationResult>;
  logAccess(accessData: AccessLogData): Promise<void>;
}

// Webhook system for real-time updates
class WebhookService {
  async handleCardReaderEvent(data: CardReaderEvent) {
    const { qrCode, accessPointId, timestamp } = data;
    
    // Verify pass
    const verification = await this.passService.verifyPass(qrCode);
    
    if (verification.valid) {
      // Log successful access
      await this.accessLogService.create({
        studentId: verification.studentId,
        passId: verification.passId,
        accessPointId,
        accessTime: timestamp,
        status: 'granted'
      });
      
      // Real-time notification to frontend
      this.websocketService.emit('access-granted', {
        studentId: verification.studentId,
        timestamp
      });
    } else {
      // Log denied access
      await this.accessLogService.create({
        passId: verification.passId,
        accessPointId,
        accessTime: timestamp,
        status: 'denied',
        reason: verification.reason
      });
    }
  }
}
```

### API Versioning Strategy
```typescript
// Version-aware routing
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// Backward compatibility middleware
const apiVersioning = (req: Request, res: Response, next: NextFunction) => {
  const version = req.headers['api-version'] || '1.0';
  req.apiVersion = version;
  next();
};
```

## 9. Scalability and Performance Considerations

### Database Optimization
```sql
-- Partitioning for large tables
CREATE TABLE access_logs_2024 PARTITION OF access_logs
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Materialized views for analytics
CREATE MATERIALIZED VIEW student_pass_summary AS
SELECT 
    s.school_id,
    COUNT(*) as total_students,
    COUNT(p.id) as total_passes,
    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_passes
FROM students s
LEFT JOIN passes p ON s.id = p.student_id
WHERE s.deleted_at IS NULL
GROUP BY s.school_id;
```

### Caching Strategy
```typescript
// Multi-level caching
class CacheService {
  private redisClient: Redis;
  private memoryCache: NodeCache;
  
  async get(key: string): Promise<any> {
    // L1 Cache: Memory
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) return memoryResult;
    
    // L2 Cache: Redis
    const redisResult = await this.redisClient.get(key);
    if (redisResult) {
      const parsed = JSON.parse(redisResult);
      this.memoryCache.set(key, parsed, 60); // 1 minute in memory
      return parsed;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl = 3600): Promise<void> {
    this.memoryCache.set(key, value, Math.min(ttl, 300)); // Max 5 minutes in memory
    await this.redisClient.setex(key, ttl, JSON.stringify(value));
  }
}

// Cache warming for frequently accessed data
class CacheWarmingService {
  async warmStudentCache(): Promise<void> {
    const activeStudents = await this.studentRepository.findActive();
    
    for (const student of activeStudents) {
      await this.cacheService.set(
        `student:${student.id}`,
        student,
        3600 // 1 hour
      );
    }
  }
}
```

### Load Balancing and Horizontal Scaling
```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.APP_VERSION
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    database.close();
    redis.disconnect();
    process.exit(0);
  });
});
```

## 10. Deployment and Infrastructure Recommendations

### Container Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodeuser:nodejs . .

USER nodeuser

EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:password@postgres:5432/student_pass_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: student_pass_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: student-pass-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: student-pass-api
  template:
    metadata:
      labels:
        app: student-pass-api
    spec:
      containers:
      - name: api
        image: student-pass-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Infrastructure as Code (Terraform)
```hcl
# main.tf
resource "aws_ecs_cluster" "student_pass" {
  name = "student-pass-cluster"
}

resource "aws_ecs_service" "student_pass_api" {
  name            = "student-pass-api"
  cluster         = aws_ecs_cluster.student_pass.id
  task_definition = aws_ecs_task_definition.student_pass_api.arn
  desired_count   = 3

  load_balancer {
    target_group_arn = aws_lb_target_group.student_pass_api.arn
    container_name   = "api"
    container_port   = 3000
  }
}

resource "aws_rds_instance" "postgres" {
  engine               = "postgres"
  engine_version       = "14.6"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  storage_encrypted    = true
  
  db_name  = "student_pass_db"
  username = var.db_username
  password = var.db_password
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "student-pass-final-snapshot"
}
```

### Monitoring and Logging Setup
```typescript
// Monitoring with Prometheus metrics
import promClient from 'prom-client';

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active database connections'
});

// Structured logging with Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

This comprehensive backend architecture provides a solid foundation for a secure, scalable Student Pass System that can handle the complexities of student data management, pass generation, and access control while maintaining high performance and security standards.