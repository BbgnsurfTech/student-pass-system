# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Student Pass System** built with **React** and **TypeScript** backend API. The system manages student applications, digital passes, and access control for educational institutions. It uses **PostgreSQL** with **Prisma ORM** for data management.

## Core Architecture

### Technology Stack
- **Backend**: React 18 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport.js
- **File Processing**: Sharp for images, Multer for uploads
- **Cloud Storage**: AWS S3 for document/photo storage
- **QR Codes**: qrcode library for pass generation
- **Caching**: Redis for sessions and performance
- **API Documentation**: Swagger/OpenAPI

### Key Concepts
- **Student Applications**: Workflow from application submission → review → approval → student creation
- **Pass Generation**: Automatic QR code-based passes for approved students
- **Audit Logging**: Comprehensive tracking of all system changes

## Development Commands

### Essential Commands
```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build TypeScript to JavaScript
npm start               # Start production server

# Database
npm run migrate         # Run Prisma migrations (development)
npm run migrate:prod    # Deploy migrations to production
npm run db:seed         # Seed database with initial data
npm run db:studio       # Open Prisma Studio (database GUI)

# Testing
npm test               # Run Jest tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate test coverage report

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix ESLint issues
```

### Database Management
- Use `npm run migrate` after making Prisma schema changes
- Run `npm run db:studio` to browse/edit data during development
- Always backup before running `npm run migrate:prod`

## Application Architecture

### Module Structure
The application follows NestJS modular architecture:

```
src/modules/
├── applications/          # Student application workflow
├── students/             # Student management after approval
├── passes/               # Digital pass generation & verification
├── auth/                 # Authentication and authorization
├── files/                # File upload and processing
├── notifications/        # Email notifications
├── audit/                # Audit logging system
└── database/             # Prisma service and database config
```

### Key Workflows

#### Student Application Process
1. **Submit Application** → Public endpoint, basic validation
2. **Upload Documents** → File validation, cloud storage
3. **Admin Review** → Status transitions (pending → under_review → approved/rejected)
4. **Auto Student Creation** → If approved, creates Student record + generates Pass

#### Pass Management
- QR codes generated automatically for approved students
- Pass verification for access control systems
- Status tracking (active, expired, revoked)
- Access logging for security audit trails

### Role-Based Access Control
- **Super Admin**: Full system access
- **School Admin**: Access within their school only
- **Staff**: Limited student/application management
- **Security**: Read-only access to passes and logs

### Data Flow
1. **StudentApplication** (pending approval)
2. **Student** (approved applications become students)
3. **Pass** (generated for each student)
4. **AccessLog** (tracks pass usage)

## Database Schema

### Core Tables
- `student_applications` - Application submissions and review workflow
- `students` - Approved student records
- `passes` - QR-coded digital passes
- `access_logs` - Pass usage tracking
- `schools` & `departments` - Multi-tenant organization
- `users` & `roles` - Admin/staff accounts with RBAC

### Important Relationships
- StudentApplication (1:1) → Student (after approval)
- Student (1:many) → Pass
- Pass (1:many) → AccessLog
- School (1:many) → Students, Applications, Users

## File Management

### File Types Supported
- **Student Photos**: JPEG, PNG, WebP (auto-resized to 400x400)
- **Documents**: PDF, JPEG, PNG (for applications)

### File Storage Strategy
- Development: Local storage in `uploads/` directory
- Production: AWS S3 with private ACL
- File validation includes virus scanning and size limits (5MB max)

## Security Considerations

### Authentication
- JWT tokens with refresh mechanism
- Role-based guards on all endpoints
- School-based data isolation

### Data Protection
- Soft deletes for student records
- Comprehensive audit logging
- Input validation with class-validator
- File upload restrictions and scanning

### API Security
- Rate limiting configured
- CORS restrictions
- Security headers via Helmet
- Request/response logging

## Integration Points

### External Systems
- **Email Service**: Application notifications and status updates
- **Card Readers**: Pass verification endpoints for access control
- **School Information Systems**: Student data synchronization capability

### Webhook Support
- Real-time access events from card readers
- Application status change notifications

## Testing Strategy

### Test Structure
- Unit tests for services and business logic
- Integration tests for API endpoints
- Database tests with test containers
- Mock external services (email, file storage)

### Running Tests
- Use `npm run test:watch` during development
- Always run full test suite before deployment
- Maintain >80% test coverage for critical modules

## Common Development Patterns

### Service Layer Pattern
- Controllers handle HTTP concerns only
- Services contain business logic
- Repository pattern via Prisma

### DTO Validation
- Use class-validator decorators
- Separate DTOs for create/update operations
- Transform and validate all inputs

### Error Handling
- Use NestJS built-in HTTP exceptions
- Standardized error response format
- Comprehensive logging for debugging

### Audit Trail
- Log all significant actions via AuditLogService
- Include user context and IP addresses
- Track before/after values for updates

## Environment Configuration

### Required Environment Variables
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=student-pass-documents
REDIS_URL=redis://localhost:6379
SMTP_HOST=your-email-provider
```

### Development Setup
1. Copy `.env.example` to `.env`
2. Configure database connection
3. Run `npm run migrate` to set up schema
4. Run `npm run db:seed` for initial data
5. Start with `npm run dev`

## Deployment Notes

### Production Checklist
- Run database migrations first
- Ensure all environment variables are set
- Enable file uploads to cloud storage
- Configure email service for notifications
- Set up monitoring and logging
- Test pass verification endpoints

### Scaling Considerations
- Database connection pooling configured in Prisma
- Redis caching for frequently accessed data
- File storage uses CDN for global access
- API designed for horizontal scaling

## Troubleshooting

### Common Issues
- **Migration failures**: Check database permissions and connection
- **File upload errors**: Verify AWS credentials and bucket permissions
- **Email delivery**: Confirm SMTP configuration and credentials
- **Pass generation**: Ensure QR code service is properly configured

### Debug Mode
- Set `NODE_ENV=development` for detailed error messages
- Use `npm run db:studio` to inspect database state
- Check application logs for audit trail
- Monitor Redis for caching issues