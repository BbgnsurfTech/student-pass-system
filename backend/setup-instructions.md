# Student Pass System Backend - Setup Instructions

## Phase 2 Implementation Status

✅ **Completed:**
- Express.js server with TypeScript
- JWT authentication system with role-based access control (RBAC)
- PostgreSQL database with Prisma ORM
- Redis caching and session management
- Comprehensive error handling and logging
- File upload functionality with validation
- API rate limiting and security middleware
- Swagger API documentation
- Database seeding with test data
- Jest testing framework setup
- Core API endpoints structure

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 15+ installed and running
- Redis 7+ installed and running
- Docker and Docker Compose (optional, for containerized setup)

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set up Environment Variables
```bash
cp .env.example .env
# Edit .env with your database and Redis connection details
```

### 3. Set up Database
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with initial data
npx prisma db seed
```

### 4. Start the Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Documentation

- **API Documentation**: `http://localhost:3000/api/v1/docs`
- **Health Check**: `http://localhost:3000/health`

## Default Test Accounts

After seeding the database, you can use these accounts:

**Super Admin:**
- Email: `superadmin@studentpass.com`
- Password: `admin123456`

**School Admins:**
- UNILAG: `admin@unilag.edu.ng` / `admin123456`
- ABU: `admin@abu.edu.ng` / `admin123456`
- OAU: `admin@oauife.edu.ng` / `admin123456`

## API Endpoints Overview

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/profile` - Get user profile

### Users
- `GET /api/v1/users` - List users (admin only)
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create user (admin only)
- `PUT /api/v1/users/:id` - Update user (admin only)

### Applications
- `GET /api/v1/applications` - List applications
- `POST /api/v1/applications` - Submit application
- `GET /api/v1/applications/:id` - Get application details
- `PATCH /api/v1/applications/:id/review` - Review application
- `POST /api/v1/applications/:id/approve` - Approve application

### File Uploads
- `POST /api/v1/uploads/document` - Upload document
- `POST /api/v1/uploads/photo` - Upload photo
- `GET /api/v1/uploads/:filename` - Get uploaded file

### Health Checks
- `GET /health` - Basic health check
- `GET /health/db` - Database health check
- `GET /health/redis` - Redis health check

## Database Schema

The system includes these main entities:
- **Users** - System users with role-based permissions
- **Students** - Student records created from approved applications
- **Applications** - Student applications for pass issuance
- **Passes** - Digital passes with QR codes
- **Access Logs** - Records of access attempts
- **Schools** - Educational institutions
- **Departments** - Academic departments

## Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Request validation with Zod
- File upload validation and security
- CORS protection
- Security headers with Helmet

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Docker Setup

```bash
# Start all services
docker-compose up -d

# Run migrations in container
docker-compose exec app npx prisma migrate dev

# Seed database in container  
docker-compose exec app npx prisma db seed
```

## Environment Variables

Key environment variables in `.env`:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/student_pass_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (change in production!)
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

# Application
NODE_ENV="development"
PORT=3000
```

## Next Steps (Phase 3)

The following features are planned for Phase 3:
- Complete student management functionality
- Pass issuance with QR code generation
- Access control system for scanning devices
- Email notification service
- File storage with AWS S3 integration
- Advanced search and filtering
- Bulk operations
- Real-time notifications
- Analytics and reporting

## Troubleshooting

**Database Connection Issues:**
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Run `npx prisma migrate reset` to reset database

**Redis Connection Issues:**
- Ensure Redis is running
- Check REDIS_URL in .env
- Redis is optional for development

**Port Already in Use:**
- Change PORT in .env file
- Kill process using the port: `lsof -ti:3000 | xargs kill -9`

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database operations
npm run migrate        # Run migrations
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio

# Code quality
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database, Redis, Swagger config
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Authentication, validation, etc.
│   ├── routes/          # API route definitions
│   ├── utils/           # Utility functions and helpers
│   └── server.ts        # Main application entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seeding script
├── tests/               # Test files
├── uploads/             # File uploads directory
└── logs/                # Application logs
```

The backend is now ready for Phase 3 development and frontend integration!