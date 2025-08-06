# Database Schema Design

## Core Tables

### Users
```sql
users {
  id: UUID (PK)
  email: VARCHAR(255) UNIQUE
  password_hash: VARCHAR(255)
  role: ENUM('admin', 'staff', 'security', 'student')
  first_name: VARCHAR(100)
  last_name: VARCHAR(100)
  phone: VARCHAR(20)
  is_active: BOOLEAN
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### Students
```sql
students {
  id: UUID (PK)
  user_id: UUID (FK -> users.id)
  student_id: VARCHAR(50) UNIQUE
  department: VARCHAR(100)
  program: VARCHAR(100)
  year_of_study: INTEGER
  enrollment_date: DATE
  graduation_date: DATE
  emergency_contact_name: VARCHAR(100)
  emergency_contact_phone: VARCHAR(20)
  photo_url: VARCHAR(500)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### Passes
```sql
passes {
  id: UUID (PK)
  student_id: UUID (FK -> students.id)
  pass_number: VARCHAR(50) UNIQUE
  qr_code: TEXT
  status: ENUM('active', 'suspended', 'expired', 'lost')
  issue_date: DATE
  expiry_date: DATE
  last_used: TIMESTAMP
  usage_count: INTEGER DEFAULT 0
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### Access_Logs
```sql
access_logs {
  id: UUID (PK)
  pass_id: UUID (FK -> passes.id)
  location: VARCHAR(100)
  access_type: ENUM('entry', 'exit')
  timestamp: TIMESTAMP
  device_id: VARCHAR(100)
  ip_address: VARCHAR(45)
  status: ENUM('granted', 'denied')
  reason: VARCHAR(255)
  created_at: TIMESTAMP
}
```

### Locations
```sql
locations {
  id: UUID (PK)
  name: VARCHAR(100)
  description: TEXT
  access_level: ENUM('public', 'restricted', 'private')
  operating_hours_start: TIME
  operating_hours_end: TIME
  is_active: BOOLEAN
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### Visitor_Passes
```sql
visitor_passes {
  id: UUID (PK)
  visitor_name: VARCHAR(100)
  visitor_phone: VARCHAR(20)
  visitor_email: VARCHAR(255)
  host_id: UUID (FK -> users.id)
  purpose: VARCHAR(255)
  qr_code: TEXT
  valid_from: TIMESTAMP
  valid_until: TIMESTAMP
  status: ENUM('active', 'expired', 'revoked')
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

## Relationships
- Users (1) -> Students (1)
- Students (1) -> Passes (many)
- Passes (1) -> Access_Logs (many)
- Users (1) -> Visitor_Passes (many) [as host]