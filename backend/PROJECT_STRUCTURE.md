# Student Pass System - Project Structure

## Frontend Structure (React + TypeScript)
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (Button, Modal, etc.)
│   ├── forms/           # Form components
│   ├── layout/          # Layout components
│   └── ui/              # UI-specific components
├── pages/               # Page components
│   ├── auth/            # Authentication pages
│   ├── dashboard/       # Dashboard pages
│   ├── students/        # Student management
│   ├── passes/          # Pass management
│   └── reports/         # Reporting pages
├── hooks/               # Custom React hooks
├── services/            # API services
├── store/               # Redux store and slices
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── constants/           # Application constants
├── assets/              # Static assets
└── styles/              # Global styles
```

## Backend Structure (Node.js + TypeScript)
```
server/
├── src/
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models (Prisma)
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Input validation schemas
│   ├── config/          # Configuration files
│   └── types/           # TypeScript types
├── prisma/              # Database schema and migrations
├── tests/               # Test files
└── uploads/             # File uploads (development only)
```

## Full Stack Integration
```
student-pass-system/
├── frontend/            # React application
├── backend/             # Node.js API
├── shared/              # Shared types and utilities
├── docker-compose.yml   # Container orchestration
├── .github/             # CI/CD workflows
└── docs/                # Documentation
```