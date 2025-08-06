# API Documentation

**Complete REST API Reference for the Student Pass Management System**

## Overview

The Student Pass Management System provides a comprehensive RESTful API for managing student applications, passes, and access control. This document details all available endpoints, request/response formats, authentication methods, and integration examples.

## Base Information

### API Base URL
```
Production: https://api.studentpass.yourinstitution.edu
Staging: https://staging-api.studentpass.yourinstitution.edu
Development: http://localhost:3000/api
```

### API Version
```
Current Version: v1
Base Path: /api/v1
```

### Content Types
```
Request Content-Type: application/json
Response Content-Type: application/json
File Upload: multipart/form-data
```

## Authentication

### Authentication Methods

#### JWT Bearer Token
```http
Authorization: Bearer <jwt_token>
```

#### API Key (for integrations)
```http
X-API-Key: <api_key>
```

### Authentication Endpoints

#### POST /auth/login
Authenticate user and obtain JWT tokens.

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@university.edu",
  "password": "SecurePassword123!",
  "rememberMe": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@university.edu",
      "firstName": "John",
      "lastName": "Doe",
      "role": "school_admin",
      "permissions": ["students:read", "students:create", "passes:manage"],
      "schoolId": "123e4567-e89b-12d3-a456-426614174000"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  },
  "message": "Login successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password",
  "statusCode": 401
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

#### POST /auth/logout
Invalidate current session and tokens.

**Request:**
```http
POST /api/v1/auth/logout
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### POST /auth/forgot-password
Request password reset email.

**Request:**
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@university.edu"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

## Student Management

### GET /students
Retrieve paginated list of students.

**Request:**
```http
GET /api/v1/students?page=1&limit=20&search=john&status=active&schoolId=123
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `search` (string, optional): Search term for name, email, or student ID
- `status` (string, optional): Filter by status (active, inactive, graduated, suspended)
- `schoolId` (string, optional): Filter by school ID
- `departmentId` (string, optional): Filter by department ID
- `sortBy` (string, optional): Sort field (firstName, lastName, createdAt)
- `sortOrder` (string, optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "studentId": "CS2023001",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@university.edu",
        "phone": "+1-555-0123",
        "dateOfBirth": "2000-05-15",
        "status": "active",
        "school": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "name": "University of Technology"
        },
        "department": {
          "id": "789e0123-e45f-67g8-h901-234567890123",
          "name": "Computer Science"
        },
        "program": "Bachelor of Computer Science",
        "yearOfStudy": 3,
        "enrollmentDate": "2021-09-01",
        "expectedGraduation": "2025-06-15",
        "photoUrl": "https://cdn.studentpass.edu/photos/john-doe.jpg",
        "hasActivePass": true,
        "createdAt": "2021-08-15T10:30:00Z",
        "updatedAt": "2024-01-10T14:22:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1547,
      "pages": 78,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /students
Create a new student record.

**Request:**
```http
POST /api/v1/students
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "studentId": "CS2024001",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@university.edu",
  "phone": "+1-555-0124",
  "dateOfBirth": "2001-03-22",
  "schoolId": "123e4567-e89b-12d3-a456-426614174000",
  "departmentId": "789e0123-e45f-67g8-h901-234567890123",
  "program": "Bachelor of Computer Science",
  "yearOfStudy": 1,
  "enrollmentDate": "2024-09-01",
  "expectedGraduation": "2028-06-15",
  "emergencyContactName": "Robert Smith",
  "emergencyContactPhone": "+1-555-0999",
  "address": {
    "street": "123 University Ave",
    "city": "College Town",
    "state": "CA",
    "zipCode": "90210",
    "country": "USA"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "660f9511-f3ac-52e5-b827-557766551111",
      "studentId": "CS2024001",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@university.edu",
      "status": "active",
      "createdAt": "2024-01-15T09:15:00Z",
      "updatedAt": "2024-01-15T09:15:00Z"
    }
  },
  "message": "Student created successfully"
}
```

### GET /students/{id}
Retrieve detailed information about a specific student.

**Request:**
```http
GET /api/v1/students/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "studentId": "CS2023001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@university.edu",
      "phone": "+1-555-0123",
      "dateOfBirth": "2000-05-15",
      "status": "active",
      "school": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "University of Technology",
        "code": "UTECH"
      },
      "department": {
        "id": "789e0123-e45f-67g8-h901-234567890123",
        "name": "Computer Science",
        "code": "CS"
      },
      "program": "Bachelor of Computer Science",
      "yearOfStudy": 3,
      "enrollmentDate": "2021-09-01",
      "expectedGraduation": "2025-06-15",
      "emergencyContactName": "Mary Doe",
      "emergencyContactPhone": "+1-555-0999",
      "address": {
        "street": "456 Student Lane",
        "city": "College Town",
        "state": "CA",
        "zipCode": "90210",
        "country": "USA"
      },
      "photoUrl": "https://cdn.studentpass.edu/photos/john-doe.jpg",
      "documents": [
        {
          "id": "doc-001",
          "type": "student_id",
          "fileName": "student_id.pdf",
          "uploadedAt": "2021-08-15T10:30:00Z"
        }
      ],
      "passes": [
        {
          "id": "pass-001",
          "passNumber": "UTECH-2023-001",
          "status": "active",
          "issueDate": "2021-09-01",
          "expiryDate": "2025-08-31",
          "issuedBy": "admin@university.edu"
        }
      ],
      "createdAt": "2021-08-15T10:30:00Z",
      "updatedAt": "2024-01-10T14:22:00Z"
    }
  }
}
```

### PUT /students/{id}
Update student information.

**Request:**
```http
PUT /api/v1/students/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "phone": "+1-555-9999",
  "yearOfStudy": 4,
  "address": {
    "street": "789 New Address St",
    "city": "College Town",
    "state": "CA",
    "zipCode": "90210",
    "country": "USA"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone": "+1-555-9999",
      "yearOfStudy": 4,
      "updatedAt": "2024-01-15T16:45:00Z"
    }
  },
  "message": "Student updated successfully"
}
```

### DELETE /students/{id}
Soft delete a student record.

**Request:**
```http
DELETE /api/v1/students/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

### POST /students/{id}/photo
Upload student photo.

**Request:**
```http
POST /api/v1/students/550e8400-e29b-41d4-a716-446655440000/photo
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

photo: [binary file data]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "photoUrl": "https://cdn.studentpass.edu/photos/550e8400-e29b-41d4-a716-446655440000.jpg",
    "uploadedAt": "2024-01-15T11:30:00Z"
  },
  "message": "Photo uploaded successfully"
}
```

## Application Management

### GET /applications
Retrieve student applications.

**Request:**
```http
GET /api/v1/applications?status=submitted&page=1&limit=20
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status` (string, optional): Filter by status (draft, submitted, under_review, approved, rejected, requires_documents)
- `schoolId` (string, optional): Filter by school ID
- `submittedAfter` (string, optional): Filter by submission date (ISO 8601)
- `submittedBefore` (string, optional): Filter by submission date (ISO 8601)
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20)
- `sortBy` (string, optional): Sort field (submittedAt, updatedAt)
- `sortOrder` (string, optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "app-001",
        "studentId": "CS2024002",
        "applicantName": "Alice Johnson",
        "applicantEmail": "alice@university.edu",
        "status": "submitted",
        "priority": "normal",
        "submittedAt": "2024-01-10T09:30:00Z",
        "reviewedAt": null,
        "reviewedBy": null,
        "school": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "name": "University of Technology"
        },
        "applicationData": {
          "firstName": "Alice",
          "lastName": "Johnson",
          "email": "alice@university.edu",
          "phone": "+1-555-0135",
          "program": "Bachelor of Engineering",
          "yearOfStudy": 1
        },
        "documents": [
          {
            "type": "student_id",
            "status": "uploaded",
            "fileName": "student_id.pdf"
          },
          {
            "type": "photo",
            "status": "uploaded", 
            "fileName": "photo.jpg"
          }
        ],
        "createdAt": "2024-01-08T14:20:00Z",
        "updatedAt": "2024-01-10T09:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /applications
Submit a new student application.

**Request:**
```http
POST /api/v1/applications
Content-Type: application/json

{
  "studentId": "CS2024003",
  "firstName": "Bob",
  "lastName": "Wilson",
  "email": "bob@university.edu",
  "phone": "+1-555-0146",
  "dateOfBirth": "2002-07-18",
  "schoolId": "123e4567-e89b-12d3-a456-426614174000",
  "departmentId": "789e0123-e45f-67g8-h901-234567890123",
  "program": "Bachelor of Computer Science",
  "yearOfStudy": 1,
  "enrollmentDate": "2024-09-01",
  "emergencyContactName": "Sarah Wilson",
  "emergencyContactPhone": "+1-555-0888",
  "address": {
    "street": "321 Oak Street",
    "city": "College Town",
    "state": "CA",
    "zipCode": "90210",
    "country": "USA"
  },
  "agreedToTerms": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "app-002",
      "studentId": "CS2024003",
      "status": "draft",
      "referenceNumber": "APP-2024-002",
      "applicationData": {
        "firstName": "Bob",
        "lastName": "Wilson",
        "email": "bob@university.edu"
      },
      "requiredDocuments": [
        "student_id",
        "photo",
        "enrollment_verification"
      ],
      "createdAt": "2024-01-15T10:45:00Z"
    }
  },
  "message": "Application created successfully"
}
```

### GET /applications/{id}
Get detailed application information.

**Request:**
```http
GET /api/v1/applications/app-001
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "app-001",
      "referenceNumber": "APP-2024-001",
      "studentId": "CS2024002",
      "status": "under_review",
      "priority": "normal",
      "submittedAt": "2024-01-10T09:30:00Z",
      "reviewedAt": "2024-01-12T14:15:00Z",
      "reviewedBy": {
        "id": "admin-001",
        "name": "John Admin",
        "email": "admin@university.edu"
      },
      "applicationData": {
        "firstName": "Alice",
        "lastName": "Johnson",
        "email": "alice@university.edu",
        "phone": "+1-555-0135",
        "dateOfBirth": "2001-12-05",
        "program": "Bachelor of Engineering",
        "yearOfStudy": 1,
        "emergencyContactName": "Robert Johnson",
        "emergencyContactPhone": "+1-555-0777"
      },
      "documents": [
        {
          "id": "doc-001",
          "type": "student_id",
          "fileName": "student_id.pdf",
          "status": "verified",
          "uploadedAt": "2024-01-09T16:20:00Z",
          "url": "https://secure.studentpass.edu/documents/doc-001"
        },
        {
          "id": "doc-002",
          "type": "photo",
          "fileName": "alice_photo.jpg",
          "status": "verified",
          "uploadedAt": "2024-01-09T16:25:00Z",
          "url": "https://secure.studentpass.edu/documents/doc-002"
        }
      ],
      "reviewNotes": "All documents verified. Student eligibility confirmed.",
      "timeline": [
        {
          "status": "draft",
          "timestamp": "2024-01-08T14:20:00Z",
          "note": "Application created"
        },
        {
          "status": "submitted",
          "timestamp": "2024-01-10T09:30:00Z",
          "note": "Application submitted for review"
        },
        {
          "status": "under_review",
          "timestamp": "2024-01-12T14:15:00Z",
          "note": "Review started by John Admin"
        }
      ],
      "createdAt": "2024-01-08T14:20:00Z",
      "updatedAt": "2024-01-12T14:15:00Z"
    }
  }
}
```

### PATCH /applications/{id}/review
Review and update application status.

**Request:**
```http
PATCH /api/v1/applications/app-001/review
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "action": "approve",
  "notes": "Application approved. All requirements met.",
  "passValidityPeriod": "1 year"
}
```

**Actions:**
- `approve`: Approve the application
- `reject`: Reject the application
- `request_documents`: Request additional documents
- `return_for_revision`: Return to applicant for revision

**Response:**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "app-001",
      "status": "approved",
      "reviewedAt": "2024-01-15T11:30:00Z",
      "reviewedBy": {
        "id": "admin-001",
        "name": "John Admin"
      },
      "reviewNotes": "Application approved. All requirements met."
    },
    "studentCreated": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "studentId": "CS2024002"
    },
    "passGenerated": {
      "id": "pass-002",
      "passNumber": "UTECH-2024-002"
    }
  },
  "message": "Application approved and student pass generated"
}
```

### POST /applications/{id}/documents
Upload documents for an application.

**Request:**
```http
POST /api/v1/applications/app-001/documents
Content-Type: multipart/form-data

documentType: student_id
file: [binary file data]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc-003",
      "type": "student_id",
      "fileName": "student_id.pdf",
      "fileSize": 2458112,
      "uploadedAt": "2024-01-15T12:00:00Z",
      "status": "uploaded"
    }
  },
  "message": "Document uploaded successfully"
}
```

## Pass Management

### GET /passes
Retrieve student passes.

**Request:**
```http
GET /api/v1/passes?status=active&studentId=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status` (string, optional): Filter by status (active, inactive, expired, revoked, temporary)
- `studentId` (string, optional): Filter by student ID
- `schoolId` (string, optional): Filter by school ID
- `issuedAfter` (string, optional): Filter by issue date (ISO 8601)
- `issuedBefore` (string, optional): Filter by issue date (ISO 8601)
- `expiresAfter` (string, optional): Filter by expiry date (ISO 8601)
- `expiresBefore` (string, optional): Filter by expiry date (ISO 8601)
- `page` (integer, optional): Page number
- `limit` (integer, optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "passes": [
      {
        "id": "pass-001",
        "passNumber": "UTECH-2023-001",
        "status": "active",
        "type": "standard",
        "student": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "studentId": "CS2023001",
          "firstName": "John",
          "lastName": "Doe",
          "photoUrl": "https://cdn.studentpass.edu/photos/john-doe.jpg"
        },
        "school": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "name": "University of Technology"
        },
        "issueDate": "2021-09-01",
        "expiryDate": "2025-08-31",
        "accessLevel": "standard",
        "issuedBy": {
          "id": "admin-001",
          "name": "John Admin"
        },
        "lastUsed": "2024-01-14T08:30:00Z",
        "usageCount": 1247,
        "createdAt": "2021-09-01T10:00:00Z",
        "updatedAt": "2024-01-14T08:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

### POST /passes
Generate a new student pass.

**Request:**
```http
POST /api/v1/passes
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "studentId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "standard",
  "validityPeriod": "1 year",
  "accessLevel": "standard",
  "notes": "Regular student pass"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pass": {
      "id": "pass-003",
      "passNumber": "UTECH-2024-003",
      "status": "active",
      "type": "standard",
      "issueDate": "2024-01-15",
      "expiryDate": "2025-01-15",
      "accessLevel": "standard",
      "qrCodeUrl": "https://api.studentpass.edu/passes/pass-003/qr",
      "digitalPassUrl": "https://studentpass.edu/pass/pass-003",
      "createdAt": "2024-01-15T13:15:00Z"
    }
  },
  "message": "Pass generated successfully"
}
```

### GET /passes/{id}
Get detailed pass information.

**Request:**
```http
GET /api/v1/passes/pass-001
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pass": {
      "id": "pass-001",
      "passNumber": "UTECH-2023-001",
      "status": "active",
      "type": "standard",
      "student": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "studentId": "CS2023001",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@university.edu",
        "photoUrl": "https://cdn.studentpass.edu/photos/john-doe.jpg",
        "program": "Bachelor of Computer Science",
        "yearOfStudy": 3
      },
      "school": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "University of Technology",
        "logoUrl": "https://cdn.studentpass.edu/logos/utech.png"
      },
      "issueDate": "2021-09-01",
      "expiryDate": "2025-08-31",
      "accessLevel": "standard",
      "permissions": [
        "library_access",
        "lab_access",
        "parking_access"
      ],
      "issuedBy": {
        "id": "admin-001",
        "name": "John Admin",
        "email": "admin@university.edu"
      },
      "lastUsed": "2024-01-14T08:30:00Z",
      "usageCount": 1247,
      "qrCodeData": {
        "version": "2.0",
        "encrypted": true,
        "signatureValid": true
      },
      "restrictions": [],
      "notes": "Standard student pass",
      "createdAt": "2021-09-01T10:00:00Z",
      "updatedAt": "2024-01-14T08:30:00Z"
    }
  }
}
```

### GET /passes/{id}/qr
Generate QR code for pass verification.

**Request:**
```http
GET /api/v1/passes/pass-001/qr?format=png&size=400
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `format` (string, optional): Image format (png, svg, pdf) (default: png)
- `size` (integer, optional): Image size in pixels (default: 300)
- `includeText` (boolean, optional): Include pass number text (default: true)

**Response:**
For image formats (png, svg):
```
Content-Type: image/png
[Binary image data]
```

For JSON format:
```json
{
  "success": true,
  "data": {
    "qrCodeData": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "imageUrl": "https://api.studentpass.edu/passes/pass-001/qr.png",
    "expiresAt": "2025-08-31T23:59:59Z"
  }
}
```

### POST /passes/verify
Verify a pass using QR code data (for access control systems).

**Request:**
```http
POST /api/v1/passes/verify
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "qrCodeData": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessPointId": "gate-001",
  "location": "Main Entrance",
  "timestamp": "2024-01-15T09:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verification": {
      "valid": true,
      "passId": "pass-001",
      "student": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "studentId": "CS2023001",
        "firstName": "John",
        "lastName": "Doe",
        "photoUrl": "https://cdn.studentpass.edu/photos/john-doe.jpg"
      },
      "pass": {
        "passNumber": "UTECH-2023-001",
        "status": "active",
        "expiryDate": "2025-08-31",
        "accessLevel": "standard"
      },
      "accessGranted": true,
      "verificationTime": "2024-01-15T09:30:00Z",
      "accessLogId": "log-001"
    }
  },
  "message": "Pass verified successfully"
}
```

**Error Response (Invalid Pass):**
```json
{
  "success": false,
  "data": {
    "verification": {
      "valid": false,
      "reason": "Pass has expired",
      "passId": "pass-001",
      "accessGranted": false,
      "verificationTime": "2024-01-15T09:30:00Z"
    }
  },
  "error": "PASS_EXPIRED",
  "message": "Pass verification failed"
}
```

### PATCH /passes/{id}/status
Update pass status.

**Request:**
```http
PATCH /api/v1/passes/pass-001/status
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "status": "suspended",
  "reason": "Academic probation",
  "notes": "Temporary suspension pending academic review"
}
```

**Status Options:**
- `active`: Pass is active and can be used
- `inactive`: Pass is temporarily inactive
- `suspended`: Pass is suspended (requires reason)
- `revoked`: Pass is permanently revoked
- `expired`: Pass has expired (automatic)

**Response:**
```json
{
  "success": true,
  "data": {
    "pass": {
      "id": "pass-001",
      "status": "suspended",
      "statusChangedAt": "2024-01-15T14:30:00Z",
      "statusChangedBy": "admin-001",
      "statusReason": "Academic probation"
    }
  },
  "message": "Pass status updated successfully"
}
```

## Access Control & Logging

### GET /access-logs
Retrieve access logs.

**Request:**
```http
GET /api/v1/access-logs?studentId=550e8400-e29b-41d4-a716-446655440000&from=2024-01-01&to=2024-01-15
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `studentId` (string, optional): Filter by student ID
- `passId` (string, optional): Filter by pass ID
- `accessPointId` (string, optional): Filter by access point
- `status` (string, optional): Filter by access status (granted, denied)
- `from` (string, optional): Start date (ISO 8601)
- `to` (string, optional): End date (ISO 8601)
- `page` (integer, optional): Page number
- `limit` (integer, optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "accessLogs": [
      {
        "id": "log-001",
        "student": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "studentId": "CS2023001",
          "firstName": "John",
          "lastName": "Doe"
        },
        "pass": {
          "id": "pass-001",
          "passNumber": "UTECH-2023-001"
        },
        "accessPoint": {
          "id": "gate-001",
          "name": "Main Entrance",
          "location": "Building A"
        },
        "accessTime": "2024-01-15T09:30:00Z",
        "accessType": "entry",
        "status": "granted",
        "deviceInfo": {
          "deviceId": "scanner-001",
          "deviceType": "QR_SCANNER",
          "softwareVersion": "v2.1.0"
        },
        "verificationMethod": "qr_code",
        "responseTime": "234ms",
        "ipAddress": "192.168.1.100",
        "createdAt": "2024-01-15T09:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 127,
      "pages": 3
    }
  }
}
```

### POST /access-logs
Log an access attempt (typically used by access control systems).

**Request:**
```http
POST /api/v1/access-logs
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "studentId": "550e8400-e29b-41d4-a716-446655440000",
  "passId": "pass-001",
  "accessPointId": "gate-001",
  "accessTime": "2024-01-15T10:15:00Z",
  "accessType": "entry",
  "status": "granted",
  "verificationMethod": "qr_code",
  "deviceInfo": {
    "deviceId": "scanner-001",
    "deviceType": "QR_SCANNER",
    "softwareVersion": "v2.1.0"
  },
  "responseTime": "189ms"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessLog": {
      "id": "log-002",
      "status": "granted",
      "accessTime": "2024-01-15T10:15:00Z",
      "createdAt": "2024-01-15T10:15:00Z"
    }
  },
  "message": "Access log created successfully"
}
```

### GET /access-points
Retrieve access points.

**Request:**
```http
GET /api/v1/access-points?schoolId=123e4567-e89b-12d3-a456-426614174000&active=true
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `schoolId` (string, optional): Filter by school ID
- `active` (boolean, optional): Filter by active status
- `type` (string, optional): Filter by access point type
- `location` (string, optional): Filter by location

**Response:**
```json
{
  "success": true,
  "data": {
    "accessPoints": [
      {
        "id": "gate-001",
        "name": "Main Entrance",
        "location": "Building A",
        "type": "entry_exit",
        "schoolId": "123e4567-e89b-12d3-a456-426614174000",
        "isActive": true,
        "operatingHours": {
          "monday": { "open": "06:00", "close": "22:00" },
          "tuesday": { "open": "06:00", "close": "22:00" },
          "wednesday": { "open": "06:00", "close": "22:00" },
          "thursday": { "open": "06:00", "close": "22:00" },
          "friday": { "open": "06:00", "close": "22:00" },
          "saturday": { "open": "08:00", "close": "20:00" },
          "sunday": { "open": "08:00", "close": "20:00" }
        },
        "accessLevels": ["standard", "staff", "visitor"],
        "deviceInfo": {
          "deviceId": "scanner-001",
          "model": "SecureScan 3000",
          "lastHeartbeat": "2024-01-15T10:20:00Z",
          "status": "online"
        },
        "statistics": {
          "dailyAccess": 247,
          "weeklyAccess": 1589,
          "monthlyAccess": 6824
        },
        "createdAt": "2021-08-01T12:00:00Z",
        "updatedAt": "2024-01-15T10:20:00Z"
      }
    ]
  }
}
```

## Analytics & Reporting

### GET /analytics/dashboard
Get dashboard analytics data.

**Request:**
```http
GET /api/v1/analytics/dashboard?timeRange=30d&schoolId=123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `timeRange` (string, optional): Time range (7d, 30d, 90d, 1y) (default: 30d)
- `schoolId` (string, optional): Filter by school ID
- `departmentId` (string, optional): Filter by department ID

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalStudents": 15847,
      "activeStudents": 14523,
      "totalPasses": 15234,
      "activePasses": 14232,
      "pendingApplications": 126,
      "dailyAccessEvents": 8456,
      "systemUptime": 99.97
    },
    "trends": {
      "studentGrowth": {
        "current": 14523,
        "previous": 14245,
        "change": 1.95,
        "trend": "up"
      },
      "applicationVolume": {
        "current": 456,
        "previous": 423,
        "change": 7.8,
        "trend": "up"
      },
      "accessActivity": {
        "current": 8456,
        "previous": 8123,
        "change": 4.1,
        "trend": "up"
      }
    },
    "charts": {
      "applicationsByStatus": [
        { "status": "approved", "count": 342, "percentage": 75.0 },
        { "status": "pending", "count": 67, "percentage": 14.7 },
        { "status": "rejected", "count": 28, "percentage": 6.1 },
        { "status": "requires_documents", "count": 19, "percentage": 4.2 }
      ],
      "accessByTimeOfDay": [
        { "hour": 8, "count": 456 },
        { "hour": 9, "count": 789 },
        { "hour": 10, "count": 634 },
        { "hour": 11, "count": 723 },
        { "hour": 12, "count": 892 },
        { "hour": 13, "count": 1024 },
        { "hour": 14, "count": 876 },
        { "hour": 15, "count": 654 },
        { "hour": 16, "count": 534 },
        { "hour": 17, "count": 423 }
      ],
      "topAccessPoints": [
        { "name": "Main Entrance", "count": 2456 },
        { "name": "Library Gate", "count": 1789 },
        { "name": "Lab Building", "count": 1234 },
        { "name": "Parking Gate", "count": 987 }
      ]
    },
    "alerts": [
      {
        "type": "warning",
        "message": "High application volume detected",
        "count": 67,
        "threshold": 50
      }
    ],
    "generatedAt": "2024-01-15T11:00:00Z"
  }
}
```

### GET /analytics/reports
Generate detailed reports.

**Request:**
```http
GET /api/v1/analytics/reports/student-activity?from=2024-01-01&to=2024-01-31&format=json
Authorization: Bearer <jwt_token>
```

**Report Types:**
- `student-activity`: Student access activity report
- `application-summary`: Application processing summary
- `pass-utilization`: Pass usage statistics
- `security-incidents`: Security incident report
- `performance-metrics`: System performance report

**Query Parameters:**
- `from` (string): Start date (ISO 8601)
- `to` (string): End date (ISO 8601)
- `format` (string, optional): Output format (json, csv, pdf) (default: json)
- `schoolId` (string, optional): Filter by school
- `departmentId` (string, optional): Filter by department

**Response (JSON format):**
```json
{
  "success": true,
  "data": {
    "report": {
      "title": "Student Activity Report",
      "period": {
        "from": "2024-01-01T00:00:00Z",
        "to": "2024-01-31T23:59:59Z"
      },
      "summary": {
        "totalStudents": 15847,
        "activeStudents": 14523,
        "totalAccess": 234567,
        "averageDailyAccess": 7566,
        "peakDailyAccess": 12456,
        "uniqueAccessPoints": 45
      },
      "details": {
        "dailyActivity": [
          {
            "date": "2024-01-01",
            "accessCount": 5678,
            "uniqueStudents": 1234,
            "peakHour": 13,
            "averageResponseTime": "234ms"
          }
        ],
        "topStudents": [
          {
            "studentId": "CS2023001",
            "name": "John Doe",
            "accessCount": 89,
            "lastAccess": "2024-01-31T17:30:00Z"
          }
        ],
        "accessPatterns": {
          "busiest_day": "Wednesday",
          "busiest_hour": 13,
          "least_busy_day": "Sunday",
          "least_busy_hour": 6
        }
      },
      "generatedAt": "2024-01-15T11:30:00Z",
      "generatedBy": "admin@university.edu"
    }
  }
}
```

**Response (CSV format):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="student-activity-report.csv"

Date,Access Count,Unique Students,Peak Hour,Average Response Time
2024-01-01,5678,1234,13,234ms
2024-01-02,6234,1345,14,245ms
...
```

**Response (PDF format):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="student-activity-report.pdf"

[Binary PDF data]
```

## User Management

### GET /users
Retrieve system users.

**Request:**
```http
GET /api/v1/users?role=school_admin&active=true&page=1&limit=20
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `role` (string, optional): Filter by role
- `schoolId` (string, optional): Filter by school ID
- `active` (boolean, optional): Filter by active status
- `search` (string, optional): Search by name or email
- `page` (integer, optional): Page number
- `limit` (integer, optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-001",
        "email": "admin@university.edu",
        "firstName": "John",
        "lastName": "Admin",
        "role": "school_admin",
        "isActive": true,
        "school": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "name": "University of Technology"
        },
        "permissions": [
          "students:read",
          "students:create", 
          "students:update",
          "passes:manage",
          "applications:review"
        ],
        "lastLogin": "2024-01-15T08:30:00Z",
        "createdAt": "2021-08-01T10:00:00Z",
        "updatedAt": "2024-01-15T08:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### POST /users
Create a new user.

**Request:**
```http
POST /api/v1/users
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "email": "newadmin@university.edu",
  "firstName": "Jane",
  "lastName": "Administrator",
  "role": "staff",
  "schoolId": "123e4567-e89b-12d3-a456-426614174000",
  "permissions": ["students:read", "applications:read"],
  "sendWelcomeEmail": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-002",
      "email": "newadmin@university.edu",
      "firstName": "Jane",
      "lastName": "Administrator",
      "role": "staff",
      "isActive": true,
      "temporaryPassword": "TempPass123!",
      "mustChangePassword": true,
      "createdAt": "2024-01-15T12:00:00Z"
    }
  },
  "message": "User created successfully. Welcome email sent."
}
```

## File Management

### POST /files/upload
Upload files to the system.

**Request:**
```http
POST /api/v1/files/upload
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

file: [binary file data]
category: student_documents
metadata: {"studentId": "550e8400-e29b-41d4-a716-446655440000", "type": "transcript"}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "file-001",
      "fileName": "transcript.pdf",
      "originalName": "john_doe_transcript.pdf",
      "fileSize": 2458112,
      "mimeType": "application/pdf",
      "category": "student_documents",
      "url": "https://secure.studentpass.edu/files/file-001",
      "metadata": {
        "studentId": "550e8400-e29b-41d4-a716-446655440000",
        "type": "transcript"
      },
      "uploadedAt": "2024-01-15T13:45:00Z"
    }
  },
  "message": "File uploaded successfully"
}
```

### GET /files/{id}
Retrieve file information and download URL.

**Request:**
```http
GET /api/v1/files/file-001
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "file-001",
      "fileName": "transcript.pdf",
      "originalName": "john_doe_transcript.pdf",
      "fileSize": 2458112,
      "mimeType": "application/pdf",
      "category": "student_documents",
      "downloadUrl": "https://secure.studentpass.edu/files/file-001/download?token=temp_token_here",
      "thumbnailUrl": "https://secure.studentpass.edu/files/file-001/thumbnail",
      "metadata": {
        "studentId": "550e8400-e29b-41d4-a716-446655440000",
        "type": "transcript"
      },
      "uploadedBy": "admin@university.edu",
      "uploadedAt": "2024-01-15T13:45:00Z",
      "lastAccessed": "2024-01-15T14:20:00Z",
      "accessCount": 3
    }
  }
}
```

## System Management

### GET /system/health
System health check endpoint.

**Request:**
```http
GET /api/v1/system/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T15:00:00Z",
    "version": "1.0.0",
    "uptime": 2592000,
    "checks": {
      "database": {
        "status": "healthy",
        "responseTime": "15ms",
        "connections": 23
      },
      "redis": {
        "status": "healthy",
        "responseTime": "2ms",
        "memoryUsage": "45%"
      },
      "fileStorage": {
        "status": "healthy",
        "responseTime": "120ms",
        "availableSpace": "2.5TB"
      },
      "externalServices": {
        "emailService": "healthy",
        "smsService": "healthy"
      }
    },
    "metrics": {
      "cpuUsage": 35.2,
      "memoryUsage": 68.7,
      "diskUsage": 42.1,
      "activeConnections": 245
    }
  }
}
```

### GET /system/config
Retrieve system configuration.

**Request:**
```http
GET /api/v1/system/config
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
      "application": {
        "name": "Student Pass System",
        "version": "1.0.0",
        "environment": "production"
      },
      "features": {
        "multiSchoolSupport": true,
        "advancedAnalytics": true,
        "realTimeNotifications": true,
        "mobileApp": true,
        "apiIntegrations": true
      },
      "limits": {
        "maxFileSize": 10485760,
        "maxApplications": 1000,
        "maxStudentsPerSchool": 50000,
        "apiRateLimit": 100
      },
      "security": {
        "jwtExpiration": 900,
        "passwordPolicy": {
          "minLength": 8,
          "requireSpecialChars": true,
          "requireNumbers": true,
          "requireUppercase": true
        },
        "mfaEnabled": true
      }
    }
  }
}
```

## Error Handling

### Error Response Format
All errors follow a consistent format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "statusCode": 400,
  "timestamp": "2024-01-15T15:30:00Z",
  "path": "/api/v1/students",
  "requestId": "req_123456789",
  "details": {
    "field": "email",
    "validationErrors": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_EMAIL"
      }
    ]
  }
}
```

### Common Error Codes

#### Authentication Errors (401)
- `UNAUTHORIZED`: Missing or invalid authentication token
- `TOKEN_EXPIRED`: JWT token has expired
- `INVALID_CREDENTIALS`: Invalid email/password combination
- `ACCOUNT_DISABLED`: User account is disabled
- `MFA_REQUIRED`: Multi-factor authentication required

#### Authorization Errors (403)
- `FORBIDDEN`: Insufficient permissions for requested action
- `ROLE_REQUIRED`: Specific role required for access
- `RESOURCE_FORBIDDEN`: Access denied to specific resource
- `SCHOOL_MISMATCH`: User doesn't belong to requested school

#### Validation Errors (400)
- `VALIDATION_ERROR`: Request validation failed
- `MISSING_REQUIRED_FIELD`: Required field is missing
- `INVALID_FORMAT`: Field format is invalid
- `VALUE_TOO_LONG`: Field value exceeds maximum length
- `VALUE_TOO_SHORT`: Field value below minimum length

#### Resource Errors (404)
- `STUDENT_NOT_FOUND`: Student record not found
- `APPLICATION_NOT_FOUND`: Application not found
- `PASS_NOT_FOUND`: Pass not found
- `USER_NOT_FOUND`: User not found
- `FILE_NOT_FOUND`: File not found

#### Business Logic Errors (409)
- `DUPLICATE_STUDENT_ID`: Student ID already exists
- `DUPLICATE_EMAIL`: Email already registered
- `APPLICATION_ALREADY_EXISTS`: Student already has pending application
- `PASS_ALREADY_ACTIVE`: Student already has active pass
- `INVALID_STATUS_TRANSITION`: Invalid status change requested

#### Server Errors (500)
- `INTERNAL_SERVER_ERROR`: Unexpected server error
- `DATABASE_ERROR`: Database operation failed
- `EXTERNAL_SERVICE_ERROR`: External service unavailable
- `FILE_UPLOAD_ERROR`: File upload failed

## Rate Limiting

### Rate Limit Headers
All API responses include rate limiting information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642248000
X-RateLimit-Window: 3600
```

### Rate Limit Tiers

#### Public Endpoints
- **Limit**: 10 requests per minute
- **Endpoints**: `/auth/login`, `/auth/forgot-password`

#### Authenticated Users
- **Limit**: 100 requests per 15 minutes
- **Endpoints**: Most authenticated endpoints

#### Administrative Users
- **Limit**: 500 requests per 15 minutes
- **Endpoints**: Admin-specific endpoints

#### File Upload Endpoints
- **Limit**: 10 uploads per hour
- **Max Size**: 10MB per file

## SDKs and Code Examples

### JavaScript/Node.js SDK

```javascript
import StudentPassAPI from '@studentpass/api-client';

const api = new StudentPassAPI({
  baseURL: 'https://api.studentpass.yourinstitution.edu',
  apiKey: 'your-api-key'
});

// Authenticate
const { tokens } = await api.auth.login({
  email: 'admin@university.edu',
  password: 'password'
});

api.setTokens(tokens);

// Get students
const students = await api.students.list({
  page: 1,
  limit: 20,
  status: 'active'
});

// Create application
const application = await api.applications.create({
  studentId: 'CS2024001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@university.edu'
});

// Verify pass
const verification = await api.passes.verify({
  qrCodeData: 'encrypted-qr-data',
  accessPointId: 'gate-001'
});
```

### Python SDK

```python
from studentpass import StudentPassAPI

api = StudentPassAPI(
    base_url='https://api.studentpass.yourinstitution.edu',
    api_key='your-api-key'
)

# Authenticate
tokens = api.auth.login(
    email='admin@university.edu',
    password='password'
)
api.set_tokens(tokens)

# Get students
students = api.students.list(
    page=1,
    limit=20,
    status='active'
)

# Create application
application = api.applications.create({
    'studentId': 'CS2024001',
    'firstName': 'John',
    'lastName': 'Doe',
    'email': 'john@university.edu'
})

# Verify pass
verification = api.passes.verify({
    'qrCodeData': 'encrypted-qr-data',
    'accessPointId': 'gate-001'
})
```

### cURL Examples

```bash
# Login
curl -X POST https://api.studentpass.yourinstitution.edu/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@university.edu",
    "password": "password"
  }'

# Get students
curl -X GET "https://api.studentpass.yourinstitution.edu/students?page=1&limit=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Create application
curl -X POST https://api.studentpass.yourinstitution.edu/applications \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "CS2024001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@university.edu"
  }'

# Upload file
curl -X POST https://api.studentpass.yourinstitution.edu/files/upload \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@document.pdf" \
  -F "category=student_documents"
```

## Webhooks

### Webhook Events
The system supports webhooks for real-time event notifications:

#### Student Events
- `student.created`: New student record created
- `student.updated`: Student information updated
- `student.deleted`: Student record deleted

#### Application Events
- `application.submitted`: New application submitted
- `application.approved`: Application approved
- `application.rejected`: Application rejected
- `application.documents_required`: Additional documents requested

#### Pass Events
- `pass.generated`: New pass generated
- `pass.activated`: Pass activated
- `pass.suspended`: Pass suspended
- `pass.expired`: Pass expired
- `pass.verified`: Pass verification occurred

#### Access Events
- `access.granted`: Access granted at checkpoint
- `access.denied`: Access denied at checkpoint
- `access.anomaly`: Unusual access pattern detected

### Webhook Configuration

```http
POST /api/v1/webhooks
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "url": "https://yourapp.com/webhooks/studentpass",
  "events": ["application.submitted", "pass.generated"],
  "secret": "webhook-secret-key",
  "active": true
}
```

### Webhook Payload Example

```json
{
  "id": "wh_123456789",
  "event": "application.approved",
  "timestamp": "2024-01-15T16:30:00Z",
  "data": {
    "application": {
      "id": "app-001",
      "studentId": "CS2024001",
      "status": "approved",
      "approvedBy": "admin@university.edu"
    }
  },
  "signature": "sha256=abcdef123456..."
}
```

## Support and Resources

### API Support
- **Documentation**: https://docs.studentpass.yourinstitution.edu
- **Support Email**: api-support@yourinstitution.edu
- **Developer Portal**: https://developer.studentpass.yourinstitution.edu
- **Status Page**: https://status.studentpass.yourinstitution.edu

### Getting Started
1. Request API access from your system administrator
2. Obtain API credentials from the admin panel
3. Review authentication requirements
4. Test endpoints using the interactive API explorer
5. Implement error handling for your integration

### Best Practices
- Always use HTTPS for API calls
- Implement proper error handling
- Use appropriate timeout values
- Cache responses when possible
- Follow rate limiting guidelines
- Validate webhook signatures
- Keep API credentials secure
- Monitor API usage and performance

---

**API Documentation Version**: 2.1.0  
**Last Updated**: [Current Date]  
**API Version**: v1  
**OpenAPI Specification**: Available at `/api/docs`