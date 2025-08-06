# Student Pass System - Backend API

A comprehensive backend system for managing student passes, applications, and access control with QR code-based verification.

## Features

### Core Functionality
- **Student Application Workflow**: Students apply → Admins approve → Passes generated
- **QR Code Pass System**: Secure QR codes with digital signatures
- **Access Control**: Real-time gate/card reader verification
- **Role-Based Security**: Multi-level permissions (Super Admin, School Admin, Staff, Security)
- **Multi-School Support**: Centralized system supporting multiple schools
- **File Management**: Secure document and photo uploads
- **Audit Logging**: Comprehensive activity tracking

### Advanced Features
- **Real-time Monitoring**: Live access feed and statistics
- **Bulk Operations**: Batch processing for applications and passes
- **Temporary Passes**: Time-limited access for visitors
- **API Versioning**: Future-proof API design
- **Caching**: Multi-level caching for performance
- **Rate Limiting**: Protection against abuse
- **Health Checks**: Monitoring and alerting

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis 7+
- **File Storage**: AWS S3 (configurable)
- **Authentication**: JWT with refresh tokens
- **Security**: Helmet, CORS, rate limiting
- **Monitoring**: Prometheus, Grafana
- **Documentation**: Swagger/OpenAPI

## Quick Start

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd student-pass-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate dev
   
   # Seed database (optional)
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### Docker Setup

1. **Start with Docker Compose**
   ```bash
   # Development environment
   docker-compose up -d
   
   # With monitoring stack
   docker-compose --profile monitoring up -d
   
   # With development tools
   docker-compose --profile development up -d
   ```

2. **Run database migrations**
   ```bash
   docker-compose exec app npx prisma migrate dev
   ```

## API Documentation

Once the server is running, access the interactive API documentation at:
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`

## Application Workflow

### 1. Student Application Process
```
Student Submits Application → Upload Documents → Admin Reviews → 
Approve/Reject → (If Approved) Student Record Created → Pass Generated
```

### 2. Pass Verification Process
```
QR Code Scanned → Verify Signature → Check Pass Status → 
Check Student Status → Log Access → Grant/Deny Access
```

### 3. Access Control Flow
```
Card Reader/Gate → POST /api/v1/access/verify → 
Verification Response → Access Decision → Log Entry
```

## Key API Endpoints

### Authentication
```
POST /api/v1/auth/login          # User login
POST /api/v1/auth/refresh        # Refresh token
POST /api/v1/auth/logout         # Logout
```

### Student Applications
```
POST /api/v1/applications        # Submit application
GET  /api/v1/applications        # List applications (admin)
PATCH /api/v1/applications/:id/review  # Review application
```

### Pass Management
```
GET  /api/v1/passes              # List passes
POST /api/v1/passes              # Generate pass
GET  /api/v1/passes/:id/qr       # Get QR code
```

### Access Control
```
POST /api/v1/access/verify       # Verify pass (for gates)
GET  /api/v1/access/logs         # Access logs
GET  /api/v1/access/live-feed    # Real-time feed
```

## Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Session management with Redis
- Password hashing with bcrypt

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting

### QR Code Security
- Digital signatures for QR codes
- Timestamp validation
- Replay attack prevention
- Encrypted sensitive data

## Database Schema

### Core Tables
- `users` - Admin and staff accounts
- `student_applications` - Application submissions
- `students` - Approved student records
- `passes` - Generated student passes
- `access_logs` - Access attempt records
- `audit_logs` - System activity logs

### Relationships
- Applications → Students (1:1 when approved)
- Students → Passes (1:many)
- Passes → Access Logs (1:many)
- Schools → Students (1:many)

## Configuration

### Environment Variables
Key configuration options in `.env`:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Security
JWT_SECRET="your-jwt-secret"
QR_SECRET_KEY="your-qr-secret"

# File Storage
AWS_S3_BUCKET="your-bucket"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-password"
```

## Deployment

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Run migrations**
   ```bash
   npx prisma migrate deploy
   ```

3. **Start production server**
   ```bash
   npm start
   ```

### Docker Deployment
```bash
# Build production image
docker build --target production -t student-pass-api .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  student-pass-api
```

### Kubernetes Deployment
See `k8s/` directory for Kubernetes manifests.

## Monitoring & Logging

### Health Checks
- Application health: `GET /health`
- Database connectivity
- Redis connectivity
- External service status

### Metrics
- Prometheus metrics at `/metrics`
- Request duration and count
- Database connection pool status
- Cache hit/miss rates

### Logging
- Structured JSON logging with Winston
- Request/response logging
- Error tracking
- Audit trail

## Development

### Project Structure
```
src/
├── modules/
│   ├── auth/           # Authentication & authorization
│   ├── applications/   # Student applications
│   ├── students/       # Student management
│   ├── passes/         # Pass generation & verification
│   ├── access/         # Access control
│   ├── files/          # File upload handling
│   └── audit/          # Audit logging
├── common/
│   ├── guards/         # Auth guards
│   ├── decorators/     # Custom decorators
│   └── filters/        # Exception filters
└── main.ts             # Application bootstrap
```

### Available Scripts
```bash
npm run dev             # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run test            # Run tests
npm run lint            # Lint code
npm run migrate         # Run database migrations
npm run db:seed         # Seed database
npm run db:studio       # Open Prisma Studio
```

### Code Style
- TypeScript with strict mode
- ESLint + Prettier for formatting
- Conventional commits
- Pre-commit hooks

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API documentation at `/api/docs`

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.