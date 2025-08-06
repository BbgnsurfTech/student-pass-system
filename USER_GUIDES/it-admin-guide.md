# IT Administrator Guide

**Technical Administration and System Management Guide**

## Overview

This comprehensive guide is designed for IT administrators responsible for the technical aspects of the Student Pass Management System, including system configuration, deployment, monitoring, maintenance, and security management. This guide covers both development and production environments.

## System Architecture Overview

### Technical Stack Summary
```
Frontend Layer:
├── React 18 + TypeScript
├── Redux Toolkit (State Management)
├── Tailwind CSS (Styling)
├── Chart.js (Analytics)
└── PWA Support

Backend Layer:
├── Node.js 18+ + Express.js
├── TypeScript
├── PostgreSQL 15+ (Primary Database)
├── Redis 7+ (Caching)
├── Prisma ORM
└── JWT Authentication

Infrastructure:
├── Docker Containers
├── Kubernetes (Optional)
├── NGINX (Reverse Proxy)
├── SSL/TLS Encryption
└── Cloud Storage (AWS S3 Compatible)
```

### System Requirements

#### Hardware Requirements
**Minimum Production Requirements**:
- **CPU**: 4 cores, 2.4GHz (8 cores recommended)
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 500GB SSD (1TB recommended)
- **Network**: 1Gbps connection

**Recommended Production Setup**:
- **Application Server**: 8 cores, 16GB RAM, 1TB SSD
- **Database Server**: 8 cores, 32GB RAM, 2TB SSD
- **Cache Server**: 4 cores, 8GB RAM, 256GB SSD
- **Load Balancer**: 2 cores, 4GB RAM, 128GB SSD

#### Software Requirements
**Operating System**:
- Ubuntu 22.04 LTS (Recommended)
- CentOS 8+ / RHEL 8+
- Docker-compatible Linux distribution

**Required Software**:
- Docker 24.0+
- Docker Compose 2.0+
- Node.js 18+ (for development)
- PostgreSQL 15+
- Redis 7+
- NGINX 1.20+

## Installation and Setup

### Development Environment Setup

#### Prerequisites Installation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y
```

#### Project Setup
```bash
# Clone repository
git clone https://github.com/your-org/student-pass-system.git
cd student-pass-system

# Install dependencies
npm run install:all

# Set up environment variables
cp .env.example .env
cp backend/.env.example backend/.env
cp student-pass-frontend/.env.example student-pass-frontend/.env

# Edit environment files with your configuration
nano .env
nano backend/.env
nano student-pass-frontend/.env
```

#### Environment Configuration
**Backend Environment Variables (.env)**:
```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/student_pass_db"
REDIS_URL="redis://localhost:6379"

# Security
JWT_SECRET="your-super-secure-jwt-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-token-secret-here"
QR_SECRET_KEY="your-qr-code-signing-secret"

# File Storage
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="student-pass-documents"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="noreply@yourinstitution.edu"
SMTP_PASS="your-email-password"

# Application Settings
NODE_ENV="development"
PORT="3000"
CORS_ORIGIN="http://localhost:5173"
```

**Frontend Environment Variables (.env)**:
```bash
VITE_API_BASE_URL="http://localhost:3000/api"
VITE_WEBSOCKET_URL="ws://localhost:3000"
VITE_APP_NAME="Student Pass System"
VITE_INSTITUTION_NAME="Your Institution"
```

#### Database Setup
```bash
# Start database services
docker-compose up -d postgres redis

# Wait for services to be ready
sleep 10

# Generate Prisma client
cd backend
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database with sample data (optional)
npm run db:seed
```

#### Development Server Startup
```bash
# Start all services
npm run dev

# Or start services individually
# Backend
cd backend && npm run dev

# Frontend (in another terminal)
cd student-pass-frontend && npm run dev
```

### Production Deployment

#### Docker-Based Production Setup
```bash
# Create production environment file
cp .env.example .env.production

# Edit production settings
nano .env.production

# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations in production
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

#### Kubernetes Deployment
```bash
# Create namespace
kubectl create namespace student-pass

# Create secrets
kubectl create secret generic database-secret \
  --from-literal=url="postgresql://..." \
  -n student-pass

kubectl create secret generic redis-secret \
  --from-literal=url="redis://..." \
  -n student-pass

# Deploy application
kubectl apply -f k8s/ -n student-pass

# Check deployment status
kubectl get pods -n student-pass
kubectl get services -n student-pass
```

### SSL/TLS Configuration

#### Let's Encrypt Setup with Certbot
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Set up automatic renewal
sudo crontab -e
# Add line: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### NGINX Configuration
```nginx
# /etc/nginx/sites-available/student-pass
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Database Administration

### PostgreSQL Configuration

#### Performance Tuning
```postgresql
-- /etc/postgresql/15/main/postgresql.conf

# Memory settings
shared_buffers = '4GB'                  # 25% of total RAM
effective_cache_size = '12GB'           # 75% of total RAM
work_mem = '256MB'                      # For complex queries
maintenance_work_mem = '1GB'            # For maintenance operations

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = '64MB'
checkpoint_timeout = '15min'

# Connection settings
max_connections = 200
shared_preload_libraries = 'pg_stat_statements'

# Logging
log_destination = 'csvlog'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'mod'
log_min_duration_statement = 1000      # Log queries taking longer than 1s
```

#### Database Maintenance Scripts
```bash
#!/bin/bash
# daily-maintenance.sh

# Variables
DB_NAME="student_pass_db"
BACKUP_DIR="/var/backups/postgres"
LOG_FILE="/var/log/db-maintenance.log"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo "$(date): Starting database backup" >> $LOG_FILE
pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Vacuum and analyze
echo "$(date): Starting vacuum analyze" >> $LOG_FILE
psql $DB_NAME -c "VACUUM ANALYZE;"

# Reindex
echo "$(date): Starting reindex" >> $LOG_FILE
psql $DB_NAME -c "REINDEX DATABASE $DB_NAME;"

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +30 -delete

echo "$(date): Maintenance completed" >> $LOG_FILE
```

#### Monitoring Queries
```sql
-- Check database size
SELECT 
    datname as database,
    pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname = 'student_pass_db';

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Check connection statistics
SELECT 
    datname,
    numbackends as connections,
    xact_commit as commits,
    xact_rollback as rollbacks,
    blks_read,
    blks_hit,
    tup_returned,
    tup_fetched,
    tup_inserted,
    tup_updated,
    tup_deleted
FROM pg_stat_database
WHERE datname = 'student_pass_db';
```

### Redis Configuration

#### Redis Performance Tuning
```bash
# /etc/redis/redis.conf

# Memory management
maxmemory 4gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1      # Save if at least 1 key changed in 900 seconds
save 300 10     # Save if at least 10 keys changed in 300 seconds
save 60 10000   # Save if at least 10000 keys changed in 60 seconds

# Security
requirepass your-secure-redis-password
bind 127.0.0.1

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-keepalive 300
timeout 0
```

#### Redis Monitoring
```bash
# Connect to Redis CLI
redis-cli -a your-password

# Monitor real-time commands
MONITOR

# Get info about Redis instance
INFO all

# Check memory usage
INFO memory

# Check connected clients
CLIENT LIST

# Check slow log
SLOWLOG GET 10
```

## System Monitoring

### Application Performance Monitoring

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'student-pass-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Grafana Dashboards
```json
{
  "dashboard": {
    "title": "Student Pass System Monitoring",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph", 
        "targets": [
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "Active connections"
          }
        ]
      },
      {
        "title": "Redis Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "redis_memory_used_bytes",
            "legendFormat": "Memory used"
          }
        ]
      }
    ]
  }
}
```

#### Custom Monitoring Scripts
```bash
#!/bin/bash
# system-health-check.sh

# Check API health
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$API_HEALTH" != "200" ]; then
    echo "ALERT: API health check failed - HTTP $API_HEALTH"
    # Send alert notification
fi

# Check database connectivity
DB_CHECK=$(pg_isready -h localhost -p 5432)
if [ $? -ne 0 ]; then
    echo "ALERT: Database connectivity failed"
    # Send alert notification
fi

# Check Redis connectivity  
REDIS_CHECK=$(redis-cli -h localhost -p 6379 ping)
if [ "$REDIS_CHECK" != "PONG" ]; then
    echo "ALERT: Redis connectivity failed"
    # Send alert notification
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "ALERT: Disk usage is $DISK_USAGE%"
    # Send alert notification
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEM_USAGE" -gt 85 ]; then
    echo "ALERT: Memory usage is $MEM_USAGE%"
    # Send alert notification
fi
```

### Log Management

#### Centralized Logging with ELK Stack
```yaml
# docker-compose-elk.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    volumes:
      - ./logstash/config:/usr/share/logstash/config
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    environment:
      ELASTICSEARCH_URL: http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

#### Logstash Configuration
```ruby
# logstash/pipeline/student-pass.conf
input {
  file {
    path => "/var/log/student-pass/*.log"
    start_position => "beginning"
    codec => json
  }
}

filter {
  if [level] == "ERROR" {
    mutate {
      add_tag => ["error"]
    }
  }
  
  if [level] == "WARN" {
    mutate {
      add_tag => ["warning"]
    }
  }
  
  date {
    match => [ "timestamp", "ISO8601" ]
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "student-pass-logs-%{+YYYY.MM.dd}"
  }
  
  if "error" in [tags] {
    email {
      to => "admin@yourinstitution.edu"
      subject => "Student Pass System Error"
      body => "Error: %{message}"
    }
  }
}
```

## Security Management

### Access Control Configuration

#### JWT Token Management
```typescript
// backend/src/config/jwt.ts
export const jwtConfig = {
  accessToken: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '15m',
    algorithm: 'HS256' as const,
    issuer: 'student-pass-system',
    audience: 'student-pass-users'
  },
  
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: '7d',
    algorithm: 'HS256' as const,
    issuer: 'student-pass-system',
    audience: 'student-pass-users'
  },
  
  // Token rotation settings
  rotateRefreshToken: true,
  maxRefreshTokenAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  
  // Security settings
  enableJti: true, // Enable JWT ID for token revocation
  enableTokenBlacklist: true,
  blacklistCleanupInterval: 60 * 60 * 1000 // 1 hour
};
```

#### Rate Limiting Configuration
```typescript
// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}) => rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: options.windowMs,
  max: options.max,
  keyGenerator: options.keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

// Different rate limits for different endpoints
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 login attempts per 15 minutes
});

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 100 // 100 API calls per 15 minutes
});

export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10 // 10 file uploads per hour
});
```

### Data Encryption

#### Database Field Encryption
```typescript
// backend/src/utils/encryption.ts
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);

export class FieldEncryption {
  static encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, secretKey);
    cipher.setAAD(Buffer.from('student-pass-system', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }
  
  static decrypt(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    const decipher = crypto.createDecipher(algorithm, secretKey);
    decipher.setAAD(Buffer.from('student-pass-system', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

#### File Storage Security
```typescript
// backend/src/services/storage.ts
import AWS from 'aws-sdk';
import crypto from 'crypto';

export class SecureStorageService {
  private s3: AWS.S3;
  
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });
  }
  
  async uploadFile(file: Buffer, key: string, metadata: any): Promise<string> {
    // Generate unique filename with hash
    const hash = crypto.createHash('sha256').update(file).digest('hex');
    const secureKey = `${key}/${hash}`;
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: secureKey,
      Body: file,
      ServerSideEncryption: 'AES256',
      Metadata: {
        ...metadata,
        uploadTime: new Date().toISOString(),
        checksum: hash
      },
      ContentType: this.getContentType(key),
      ACL: 'private' // Ensure files are private
    };
    
    const result = await this.s3.upload(params).promise();
    return result.Location;
  }
  
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Expires: expiresIn
    });
  }
}
```

### Security Scanning and Updates

#### Automated Security Scanning
```bash
#!/bin/bash
# security-scan.sh

# Update system packages
sudo apt update && sudo apt upgrade -y

# Scan for vulnerabilities with npm audit
cd backend
npm audit --audit-level=moderate
if [ $? -ne 0 ]; then
    echo "ALERT: npm audit found vulnerabilities"
    npm audit fix
fi

cd ../student-pass-frontend  
npm audit --audit-level=moderate
if [ $? -ne 0 ]; then
    echo "ALERT: npm audit found vulnerabilities in frontend"
    npm audit fix
fi

# Docker image scanning with Trivy
trivy image student-pass-api:latest
trivy image student-pass-frontend:latest

# OWASP ZAP security testing
docker run -t owasp/zap2docker-stable zap-baseline.py \
    -t http://localhost:3000 \
    -r zap-report.html

# Check SSL certificate expiry
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem \
    -noout -dates | grep notAfter
```

#### Security Update Automation
```bash
#!/bin/bash
# auto-security-updates.sh

# Enable automatic security updates
sudo apt install unattended-upgrades apt-listchanges -y

# Configure automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Custom configuration
cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id} ESMApps:\${distro_codename}-apps-security";
    "\${distro_id} ESM:\${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";

Unattended-Upgrade::Mail "admin@yourinstitution.edu";
Unattended-Upgrade::MailOnlyOnError "true";
EOF
```

## Backup and Recovery

### Automated Backup Strategy

#### Database Backup Script
```bash
#!/bin/bash
# backup-database.sh

# Configuration
DB_NAME="student_pass_db"
DB_USER="postgres"
BACKUP_DIR="/var/backups/postgres"
S3_BUCKET="student-pass-backups"
RETENTION_DAYS=30

# Create timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="student_pass_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
echo "Creating database backup..."
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
echo "Compressing backup..."
gzip $BACKUP_DIR/$BACKUP_FILE

# Upload to S3
echo "Uploading to S3..."
aws s3 cp $BACKUP_DIR/$COMPRESSED_FILE s3://$S3_BUCKET/database/

# Clean up local files older than retention period
find $BACKUP_DIR -name "student_pass_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Clean up S3 files (requires lifecycle policy or custom script)
echo "Backup completed: $COMPRESSED_FILE"

# Verify backup integrity
echo "Verifying backup integrity..."
gunzip -t $BACKUP_DIR/$COMPRESSED_FILE
if [ $? -eq 0 ]; then
    echo "Backup integrity verified"
else
    echo "ERROR: Backup integrity check failed"
    exit 1
fi
```

#### File System Backup
```bash
#!/bin/bash
# backup-files.sh

# Configuration
SOURCE_DIRS=("/opt/student-pass" "/etc/nginx" "/etc/letsencrypt")
BACKUP_DIR="/var/backups/system"
S3_BUCKET="student-pass-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup archive
echo "Creating system backup..."
tar -czf $BACKUP_DIR/system_backup_${TIMESTAMP}.tar.gz \
    --exclude='*/node_modules' \
    --exclude='*/logs' \
    --exclude='*/tmp' \
    "${SOURCE_DIRS[@]}"

# Upload to S3
aws s3 cp $BACKUP_DIR/system_backup_${TIMESTAMP}.tar.gz \
    s3://$S3_BUCKET/system/

# Clean up old backups
find $BACKUP_DIR -name "system_backup_*.tar.gz" -mtime +7 -delete

echo "System backup completed"
```

### Disaster Recovery Procedures

#### Database Recovery
```bash
#!/bin/bash
# restore-database.sh

# Configuration
DB_NAME="student_pass_db"
DB_USER="postgres"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

# Stop application services
echo "Stopping application services..."
docker-compose stop backend

# Create new database
echo "Creating new database..."
sudo -u postgres dropdb --if-exists $DB_NAME
sudo -u postgres createdb $DB_NAME

# Restore from backup
echo "Restoring database from $BACKUP_FILE..."
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c $BACKUP_FILE | sudo -u postgres psql $DB_NAME
else
    sudo -u postgres psql $DB_NAME < $BACKUP_FILE
fi

# Run migrations to ensure schema is current
echo "Running migrations..."
cd /opt/student-pass/backend
npx prisma migrate deploy

# Start application services
echo "Starting application services..."
docker-compose start backend

echo "Database recovery completed"
```

#### Point-in-Time Recovery
```bash
#!/bin/bash
# point-in-time-recovery.sh

# Configuration
RECOVERY_TIME="$1"
BACKUP_DIR="/var/backups/postgres"
WAL_DIR="/var/lib/postgresql/15/main/pg_wal"

if [ -z "$RECOVERY_TIME" ]; then
    echo "Usage: $0 'YYYY-MM-DD HH:MM:SS'"
    exit 1
fi

# Find the most recent backup before recovery time
BACKUP_FILE=$(find $BACKUP_DIR -name "*.sql.gz" | sort -r | head -1)

echo "Using backup: $BACKUP_FILE"
echo "Recovery time: $RECOVERY_TIME"

# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore base backup
echo "Restoring base backup..."
sudo -u postgres pg_ctl -D /var/lib/postgresql/15/main stop
sudo -u postgres rm -rf /var/lib/postgresql/15/main/*
sudo -u postgres pg_basebackup -D /var/lib/postgresql/15/main

# Configure recovery
cat > /var/lib/postgresql/15/main/recovery.conf << EOF
restore_command = 'cp $WAL_DIR/%f %p'
recovery_target_time = '$RECOVERY_TIME'
recovery_target_action = 'promote'
EOF

sudo chown postgres:postgres /var/lib/postgresql/15/main/recovery.conf

# Start PostgreSQL in recovery mode
sudo systemctl start postgresql

echo "Point-in-time recovery initiated"
```

## Performance Optimization

### Database Optimization

#### Index Management
```sql
-- Query to find missing indexes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
    AND n_distinct > 100
    AND correlation < 0.1;

-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_applications_created_at_status 
    ON applications(created_at, status) 
    WHERE status IN ('submitted', 'under_review');

CREATE INDEX CONCURRENTLY idx_students_school_active 
    ON students(school_id) 
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_passes_student_active 
    ON passes(student_id) 
    WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_access_logs_time_student 
    ON access_logs(access_time DESC, student_id);

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY idx_applications_pending_review 
    ON applications(submitted_at) 
    WHERE status = 'submitted';
```

#### Query Optimization
```sql
-- Optimize slow queries with proper joins
EXPLAIN ANALYZE
SELECT 
    s.student_id,
    s.first_name,
    s.last_name,
    p.status as pass_status,
    p.expiry_date
FROM students s
LEFT JOIN passes p ON s.id = p.student_id 
    AND p.status = 'active'
WHERE s.school_id = $1 
    AND s.deleted_at IS NULL
ORDER BY s.last_name, s.first_name;

-- Use materialized views for complex aggregations
CREATE MATERIALIZED VIEW student_pass_summary AS
SELECT 
    s.school_id,
    count(*) as total_students,
    count(p.id) as total_passes,
    count(CASE WHEN p.status = 'active' THEN 1 END) as active_passes,
    count(CASE WHEN p.expiry_date < CURRENT_DATE THEN 1 END) as expired_passes
FROM students s
LEFT JOIN passes p ON s.id = p.student_id
WHERE s.deleted_at IS NULL
GROUP BY s.school_id;

-- Refresh materialized view (schedule this in cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY student_pass_summary;
```

### Application Performance

#### Caching Strategy Implementation
```typescript
// backend/src/services/cacheManager.ts
import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';

export class CacheManager {
  private redis: Redis;
  private memoryCache: LRUCache<string, any>;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.memoryCache = new LRUCache({
      max: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes
      updateAgeOnGet: true
    });
  }
  
  async get(key: string, options: { 
    useMemory?: boolean;
    ttl?: number; 
  } = {}): Promise<any> {
    const { useMemory = true, ttl = 3600 } = options;
    
    // L1 Cache: Memory
    if (useMemory) {
      const memoryResult = this.memoryCache.get(key);
      if (memoryResult !== undefined) {
        return memoryResult;
      }
    }
    
    // L2 Cache: Redis
    const redisResult = await this.redis.get(key);
    if (redisResult) {
      const parsed = JSON.parse(redisResult);
      
      if (useMemory) {
        this.memoryCache.set(key, parsed);
      }
      
      return parsed;
    }
    
    return null;
  }
  
  async set(key: string, value: any, options: {
    useMemory?: boolean;
    ttl?: number;
  } = {}): Promise<void> {
    const { useMemory = true, ttl = 3600 } = options;
    
    const serialized = JSON.stringify(value);
    
    // Set in Redis
    await this.redis.setex(key, ttl, serialized);
    
    // Set in memory cache
    if (useMemory) {
      this.memoryCache.set(key, value);
    }
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear Redis cache
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

#### Connection Pool Optimization
```typescript
// backend/src/config/database.ts
import { Pool } from 'pg';

export const createDatabasePool = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    
    // Connection pool settings
    min: 5,                    // Minimum connections
    max: 30,                   // Maximum connections
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Wait 5s for connection
    
    // Performance settings
    query_timeout: 10000,      // 10s query timeout
    statement_timeout: 15000,  // 15s statement timeout
    
    // Health checks
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  });
};

// Monitor connection pool health
export const monitorPool = (pool: Pool) => {
  setInterval(() => {
    console.log('Pool stats:', {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    });
  }, 60000); // Every minute
};
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Application Won't Start
**Symptoms**: Server fails to start, connection errors
**Troubleshooting Steps**:
1. Check environment variables
2. Verify database connectivity
3. Check port availability
4. Review application logs
5. Validate configuration files

```bash
# Check if ports are in use
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5432

# Test database connection
pg_isready -h localhost -p 5432 -U postgres

# Check application logs
docker-compose logs backend
tail -f /var/log/student-pass/application.log
```

#### High Memory Usage
**Symptoms**: Server running out of memory, slow performance
**Troubleshooting Steps**:
1. Check memory usage patterns
2. Identify memory leaks
3. Optimize database queries
4. Review caching strategy
5. Scale resources if needed

```bash
# Monitor memory usage
htop
free -h
ps aux --sort=-%mem | head -20

# Check Node.js memory usage
node --max-old-space-size=4096 server.js

# PostgreSQL memory analysis
SELECT query, calls, total_time, mean_time, shared_blks_hit, shared_blks_read
FROM pg_stat_statements
ORDER BY shared_blks_read DESC;
```

#### Database Performance Issues
**Symptoms**: Slow queries, high database load
**Solutions**:
1. Analyze slow queries
2. Add missing indexes
3. Update table statistics
4. Optimize query plans
5. Consider connection pooling

```sql
-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY total_time DESC;

-- Check table statistics
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, last_analyze
FROM pg_stat_user_tables
ORDER BY last_analyze;

-- Update statistics
ANALYZE;
```

### Emergency Procedures

#### Service Recovery Checklist
```bash
#!/bin/bash
# emergency-recovery.sh

echo "Starting emergency recovery procedures..."

# 1. Stop all services
echo "Stopping services..."
docker-compose down

# 2. Check system resources
echo "Checking system resources..."
df -h
free -h
top -b -n 1 | head -20

# 3. Check database integrity
echo "Checking database integrity..."
sudo -u postgres pg_dump --schema-only student_pass_db > /dev/null
if [ $? -ne 0 ]; then
    echo "ERROR: Database integrity check failed"
    # Restore from backup
    ./restore-database.sh /var/backups/postgres/latest.sql.gz
fi

# 4. Clear temporary files and caches
echo "Clearing temporary files..."
rm -rf /tmp/student-pass/*
redis-cli FLUSHALL

# 5. Restart services
echo "Starting services..."
docker-compose up -d

# 6. Verify service health
echo "Verifying service health..."
sleep 30
curl -f http://localhost:3000/api/health || echo "ERROR: API health check failed"

echo "Recovery procedures completed"
```

#### Data Corruption Recovery
```bash
#!/bin/bash
# data-corruption-recovery.sh

# Identify corrupted data
echo "Scanning for data corruption..."

# Check database for corruption
sudo -u postgres pg_dump student_pass_db > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Database corruption detected"
    
    # Try to repair minor issues
    sudo -u postgres psql student_pass_db -c "REINDEX DATABASE student_pass_db;"
    sudo -u postgres psql student_pass_db -c "VACUUM FULL;"
    
    # If repair fails, restore from backup
    if [ $? -ne 0 ]; then
        echo "Restoring from backup..."
        ./restore-database.sh /var/backups/postgres/latest.sql.gz
    fi
fi

# Check file system integrity
echo "Checking file system integrity..."
fsck -f /dev/sda1

# Verify application data integrity
echo "Verifying application data integrity..."
cd /opt/student-pass/backend
npm run verify-data-integrity
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily Tasks Automation
```bash
#!/bin/bash
# daily-maintenance.sh

# Log rotation
logrotate /etc/logrotate.d/student-pass

# Database maintenance
psql student_pass_db -c "VACUUM ANALYZE;"

# Clean temporary files
find /tmp -name "student-pass-*" -mtime +1 -delete

# Update system packages (security only)
apt-get update && apt-get upgrade -y --only-upgrade $(apt list --upgradable 2>/dev/null | grep -i security | cut -d'/' -f1)

# Backup verification
./verify-backups.sh

# Health check
./system-health-check.sh

# Generate daily report
./generate-daily-report.sh
```

#### Weekly Tasks
```bash
#!/bin/bash
# weekly-maintenance.sh

# Full system backup
./backup-database.sh
./backup-files.sh

# Security scan
./security-scan.sh

# Performance analysis
./performance-analysis.sh

# Clean old logs (keep 4 weeks)
find /var/log/student-pass -name "*.log" -mtime +28 -delete

# Update dependency audit
cd /opt/student-pass
npm audit fix --only=prod

# SSL certificate check
./check-ssl-expiry.sh
```

#### Monthly Tasks
```bash
#!/bin/bash
# monthly-maintenance.sh

# Full system security audit
./security-audit.sh

# Performance optimization review
./optimize-database.sh

# Capacity planning analysis
./capacity-planning.sh

# Disaster recovery test
./test-disaster-recovery.sh

# Update documentation
./update-system-documentation.sh

# Generate monthly report
./generate-monthly-report.sh
```

### Update Procedures

#### Application Updates
```bash
#!/bin/bash
# update-application.sh

VERSION=$1
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

echo "Updating Student Pass System to version $VERSION"

# Create backup before update
./backup-database.sh
./backup-files.sh

# Pull new version
git fetch origin
git checkout v$VERSION

# Update dependencies
npm run install:all

# Run database migrations
cd backend
npx prisma migrate deploy

# Build new version
cd ..
npm run build

# Update Docker images
docker-compose build
docker-compose up -d --no-deps backend frontend

# Verify update
sleep 30
curl -f http://localhost:3000/api/health
if [ $? -eq 0 ]; then
    echo "Update successful"
else
    echo "Update failed, rolling back..."
    ./rollback-application.sh
fi
```

#### Security Updates
```bash
#!/bin/bash
# security-updates.sh

echo "Applying security updates..."

# Update system packages
apt-get update
apt-get upgrade -y

# Update Node.js dependencies
cd /opt/student-pass
npm audit fix --force

# Update Docker images
docker-compose pull
docker-compose up -d

# Update SSL certificates
certbot renew --quiet

# Run security scan
./security-scan.sh

echo "Security updates completed"
```

## Contact and Support

### Technical Support Contacts
- **Primary IT Support**: it-admin@yourinstitution.edu
- **Database Administrator**: dba@yourinstitution.edu  
- **Security Team**: security@yourinstitution.edu
- **Emergency Hotline**: +1-xxx-xxx-xxxx

### Vendor Support
- **Database Support**: PostgreSQL Community
- **Cloud Infrastructure**: AWS/Azure Support
- **Monitoring Tools**: Grafana/Prometheus Community
- **Container Platform**: Docker/Kubernetes Support

### Documentation and Resources
- **System Documentation**: /docs/
- **API Documentation**: http://localhost:3000/api/docs
- **Monitoring Dashboards**: http://localhost:3001
- **Log Analysis**: http://localhost:5601

---

**IT Administrator Certification**

Complete our IT administrator certification program to validate your expertise in managing the Student Pass System. Contact training@yourinstitution.edu for enrollment details.

*This guide is continuously updated to reflect system changes and best practices. Please check for updates monthly and ensure you're running the latest version.*

**Document Version**: 3.0.0  
**Last Updated**: [Current Date]  
**Next Review**: [Review Date]