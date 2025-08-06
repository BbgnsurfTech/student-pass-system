# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Student Pass System** - a full-stack web application built with React frontend and NestJS backend API. The system manages student applications for digital passes with QR code-based verification for educational institutions.

## Architecture Overview

### Technology Stack
- **Frontend**: React 19 with TypeScript, Vite, TailwindCSS
- **Backend**: NestJS with TypeScript, Node.js 18+
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access control
- **State Management**: Redux Toolkit with RTK Query
- **Testing**: Jest with React Testing Library (frontend), Jest (backend)
- **Build Tools**: Vite (frontend), TypeScript compiler (backend)

### Project Structure
```
student-pass-system/
├── student-pass-frontend/     # React frontend application
├── backend/                   # NestJS backend API
├── package.json              # Root workspace configuration
└── CLAUDE.md                 # This file
```

## Development Commands

### Full-Stack Development
```bash
# Install all dependencies (root + frontend + backend)
npm run install:all

# Start both frontend and backend concurrently
npm run dev

# Build both applications
npm run build

# Clean all node_modules
npm run clean
```

### Frontend Commands (from student-pass-frontend/)
```bash
# Development server with hot reload
npm run dev                   # Starts on http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview

# Testing
npm test                      # Run Jest tests
npm run test:watch            # Run tests in watch mode
npm run test:coverage         # Generate coverage report
npm run test:ci               # CI-friendly test run

# Code quality
npm run lint                  # ESLint
```

### Backend Commands (from backend/)
```bash
# Development server with hot reload
npm run dev                   # Starts on http://localhost:3000

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Database operations
npm run migrate               # Run Prisma migrations (dev)
npm run migrate:prod          # Deploy migrations (production)
npm run db:seed               # Seed database
npm run db:studio             # Open Prisma Studio

# Testing
npm test                      # Run Jest tests
npm run test:watch            # Watch mode
npm run test:coverage         # Coverage report

# Code quality
npm run lint                  # ESLint
npm run lint:fix              # Auto-fix ESLint issues
```

## Application Workflow

### Core User Journey
1. **Student Application**: Student applies via frontend form
2. **Admin Review**: Admins review/approve applications via admin dashboard
3. **Pass Generation**: System auto-generates QR code passes for approved students
4. **Access Control**: Gate systems verify passes via API endpoints

### Key Features
- **Multi-role Access**: Student, School Admin, Staff, Security roles
- **Real-time Dashboard**: Statistics and live access feeds
- **File Management**: Document/photo uploads with validation
- **Audit Logging**: Comprehensive tracking of all actions
- **QR Code Security**: Digitally signed QR codes for passes

## Frontend Architecture

### State Management Pattern
- **Redux Toolkit**: Centralized state management
- **RTK Query**: API calls and caching
- **Slices**: Feature-based state organization (auth, applications, passes)

### Component Structure
```
src/components/
├── common/                   # Reusable components (Layout, DelightfulComponents)
├── forms/                    # Form components
├── cards/                    # Card components
└── ui/                       # Base UI components
```

### Page Organization
```
src/pages/
├── auth/                     # LoginPage
├── admin/                    # AdminDashboard
├── student/                  # StudentDashboard
├── dashboard/                # General dashboard components
└── LandingPage.tsx           # Marketing/welcome page
```

### Key Frontend Patterns
- **Custom Hooks**: Reusable stateful logic
- **Delightful UX**: Special components for user engagement (DelightfulComponents, DelightfulForm)
- **Responsive Design**: TailwindCSS for mobile-first design
- **Type Safety**: Comprehensive TypeScript coverage
- **Testing**: Unit tests for components, integration tests for flows

## Backend Architecture

### NestJS Module Structure
```
src/modules/
├── applications/             # Student application workflow
├── students/                 # Student management after approval
├── passes/                   # Digital pass generation & QR verification
├── access/                   # Access control and logging
├── auth/                     # Authentication and authorization
├── files/                    # File upload and processing
└── audit/                    # Audit logging system
```

### Database Schema Flow
- **StudentApplication** → **Student** (after approval) → **Pass** → **AccessLog**
- Multi-tenant with school-based data isolation
- Soft deletes for audit trail preservation

### Security Features
- Role-based access control with guards
- JWT authentication with refresh tokens
- Input validation with class-validator
- File upload restrictions and scanning
- Comprehensive audit logging

## Development Workflow

### Getting Started
1. **Clone and install**: `npm run install:all`
2. **Environment setup**: Copy `.env.example` files in both frontend and backend
3. **Database setup**: `cd backend && npm run migrate && npm run db:seed`
4. **Start development**: `npm run dev` (from root)

### Frontend Development
- Uses Vite for fast development server and hot module replacement
- TailwindCSS for styling with custom configuration
- React Router for navigation
- Framer Motion for animations
- Comprehensive test coverage with Jest and RTL

### Backend Development
- NestJS framework with TypeScript
- Prisma for database operations and migrations
- Swagger/OpenAPI documentation at `/api/docs`
- Comprehensive error handling and validation
- Real-time capabilities for access monitoring

### Testing Strategy
- **Frontend**: Unit tests for components, Redux slices; integration tests for user flows
- **Backend**: Unit tests for services, integration tests for API endpoints
- **Coverage Goals**: 70%+ for critical modules
- **Test Commands**: Use `npm test` in respective directories

## Deployment Considerations

### Frontend Deployment
- Static build output in `dist/` directory
- Environment variables for API endpoints
- CDN-ready for global distribution

### Backend Deployment
- Docker support with multi-stage builds
- Database migrations must run before deployment
- Environment variables for database, JWT secrets, AWS S3 credentials
- Health checks and monitoring endpoints

### Full-Stack Coordination
- API base URL configuration in frontend
- CORS configuration in backend for frontend domain
- Shared TypeScript types can be extracted to common package

## Common Development Patterns

### Error Handling
- **Frontend**: Global error boundaries, user-friendly error messages
- **Backend**: Standardized HTTP exceptions, comprehensive logging

### API Integration
- RTK Query for efficient data fetching and caching
- Optimistic updates for better UX
- Loading states and error handling throughout UI

### File Management
- **Development**: Local storage in backend `uploads/` directory
- **Production**: AWS S3 with private ACL and CDN
- File validation and virus scanning

### Authentication Flow
- JWT-based with automatic token refresh
- Role-based route guards
- Persistent login state in localStorage

## Troubleshooting

### Common Issues
- **CORS errors**: Check backend CORS configuration for frontend URL
- **Database connection**: Verify DATABASE_URL in backend `.env`
- **Build failures**: Ensure Node.js 18+ and clean installs
- **Test failures**: Check test environment setup and mock configurations

### Development Tips
- Use `npm run db:studio` to inspect database state
- Frontend dev server proxies API calls to backend
- Use browser DevTools Redux extension for state debugging
- Check browser console and network tab for API errors

## File Locations

### Key Configuration Files
- `student-pass-frontend/vite.config.ts` - Frontend build configuration
- `student-pass-frontend/tailwind.config.js` - TailwindCSS configuration
- `backend/prisma/schema.prisma` - Database schema
- `backend/src/main.ts` - Backend application bootstrap

### Environment Files
- `student-pass-frontend/.env` - Frontend environment variables
- `backend/.env` - Backend environment variables (database, AWS, JWT secrets)

This full-stack application requires coordination between frontend and backend development, with particular attention to API contracts, authentication flows, and database schema changes.