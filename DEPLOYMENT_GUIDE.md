# Production Deployment Guide

**Complete Production Deployment and Operations Guide**

## Overview

This guide provides comprehensive instructions for deploying the Student Pass Management System in production environments. It covers multiple deployment strategies, from single-server installations to enterprise-scale multi-region deployments with high availability and disaster recovery.

## Deployment Options

### 1. Single Server Deployment
**Best for**: Small institutions (< 1,000 students)
- Single server hosting all components
- Docker Compose orchestration
- Local database and storage
- Basic monitoring and backup

### 2. Multi-Server Deployment  
**Best for**: Medium institutions (1,000 - 10,000 students)
- Separate application, database, and cache servers
- Load balancer for high availability
- External file storage (S3-compatible)
- Comprehensive monitoring stack

### 3. Kubernetes Deployment
**Best for**: Large institutions (10,000+ students)
- Container orchestration with auto-scaling
- Multi-zone deployment for fault tolerance
- Service mesh for advanced traffic management
- Enterprise-grade monitoring and observability

### 4. Cloud-Native Deployment
**Best for**: Multi-institution deployments
- Fully managed cloud services
- Global CDN and edge locations
- Advanced security and compliance features
- Disaster recovery across regions

## Prerequisites

### System Requirements

#### Minimum Production Requirements
```yaml
Application Server:
  CPU: 4 cores @ 2.4GHz
  RAM: 8GB
  Storage: 500GB SSD
  Network: 1Gbps

Database Server:
  CPU: 4 cores @ 2.4GHz  
  RAM: 16GB
  Storage: 1TB SSD (with backup storage)
  Network: 1Gbps

Load Balancer/Proxy:
  CPU: 2 cores @ 2.4GHz
  RAM: 4GB
  Storage: 100GB SSD
  Network: 1Gbps
```

#### Recommended Production Setup
```yaml
Application Servers (2+ instances):
  CPU: 8 cores @ 3.0GHz
  RAM: 16GB each
  Storage: 1TB SSD each
  Network: 10Gbps

Database Cluster:
  Primary: 8 cores, 32GB RAM, 2TB NVMe SSD
  Replica: 8 cores, 32GB RAM, 2TB NVMe SSD
  Storage: Additional backup storage

Cache Cluster:
  3 nodes: 4 cores, 8GB RAM each
  Storage: 256GB SSD each

Load Balancer:
  CPU: 4 cores @ 3.0GHz
  RAM: 8GB
  Storage: 256GB SSD
  Network: 10Gbps
```

### Software Prerequisites

#### Operating System
- **Ubuntu 22.04 LTS** (Recommended)
- **CentOS 8+** / **RHEL 8+**
- **Debian 11+**

#### Required Software Stack
```bash
# Core Infrastructure
- Docker 24.0+
- Docker Compose 2.0+
- NGINX 1.22+
- Certbot (Let's Encrypt)

# Databases
- PostgreSQL 15+
- Redis 7+

# Monitoring (Optional but Recommended)
- Prometheus
- Grafana
- Node Exporter
- PostgreSQL Exporter

# Security Tools
- Fail2ban
- UFW/iptables
- ClamAV (Anti-virus)
```

### Network Requirements

#### Firewall Configuration
```bash
# HTTP/HTTPS
80/tcp (HTTP)
443/tcp (HTTPS)

# SSH Administration
22/tcp (SSH)

# Database (Internal only)
5432/tcp (PostgreSQL)
6379/tcp (Redis)

# Monitoring (Internal only)
9090/tcp (Prometheus)
3001/tcp (Grafana)
```

#### DNS Requirements
- **Primary Domain**: `studentpass.yourinstitution.edu`
- **API Subdomain**: `api.studentpass.yourinstitution.edu`
- **Admin Subdomain**: `admin.studentpass.yourinstitution.edu`
- **Assets CDN**: `cdn.studentpass.yourinstitution.edu`

## Single Server Deployment

### 1. Server Preparation

#### Initial Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git ufw fail2ban

# Create application user
sudo useradd -m -s /bin/bash studentpass
sudo usermod -aG sudo studentpass

# Create application directory
sudo mkdir -p /opt/student-pass-system
sudo chown studentpass:studentpass /opt/student-pass-system
```

#### Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker studentpass

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Application Deployment

#### Clone and Configure
```bash
# Switch to application user
sudo su - studentpass
cd /opt/student-pass-system

# Clone repository
git clone https://github.com/your-org/student-pass-system.git .

# Create production environment file
cp .env.example .env.production

# Edit configuration (see configuration section below)
nano .env.production
```

#### Production Configuration
```bash
# .env.production

# Application Settings
NODE_ENV=production
APP_VERSION=1.0.0
APP_URL=https://studentpass.yourinstitution.edu

# Database Configuration
POSTGRES_DB=student_pass_production
POSTGRES_USER=studentpass_user
POSTGRES_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DATABASE_URL=postgresql://studentpass_user:CHANGE_THIS_STRONG_PASSWORD@postgres:5432/student_pass_production

# Redis Configuration
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD
REDIS_URL=redis://:CHANGE_THIS_REDIS_PASSWORD@redis:6379

# Security Keys (Generate strong random keys)
JWT_SECRET=CHANGE_THIS_JWT_SECRET_64_CHARS_MINIMUM
JWT_REFRESH_SECRET=CHANGE_THIS_REFRESH_SECRET_64_CHARS_MINIMUM
QR_SECRET_KEY=CHANGE_THIS_QR_SECRET_64_CHARS_MINIMUM
ENCRYPTION_KEY=CHANGE_THIS_ENCRYPTION_KEY_32_CHARS

# File Storage (AWS S3 or compatible)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=studentpass-documents-prod

# Email Configuration
SMTP_HOST=smtp.yourinstitution.edu
SMTP_PORT=587
SMTP_USER=noreply@yourinstitution.edu
SMTP_PASS=your_email_password
FROM_EMAIL=noreply@yourinstitution.edu

# SSL Configuration
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# Monitoring
ENABLE_METRICS=true
GRAFANA_PASSWORD=CHANGE_THIS_GRAFANA_PASSWORD
```

#### Deploy with Docker Compose
```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to initialize
sleep 30

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Create initial admin user (optional)
docker-compose -f docker-compose.prod.yml exec backend npm run create-admin
```

### 3. NGINX Configuration

#### Install and Configure NGINX
```bash
# Install NGINX
sudo apt install nginx -y

# Create site configuration
sudo nano /etc/nginx/sites-available/student-pass-system
```

#### NGINX Site Configuration
```nginx
# /etc/nginx/sites-available/student-pass-system

server {
    listen 80;
    server_name studentpass.yourinstitution.edu;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name studentpass.yourinstitution.edu;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/studentpass.yourinstitution.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/studentpass.yourinstitution.edu/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_dhparam /etc/nginx/dhparam.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Backend API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # API specific timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 120s;
    }

    # Authentication endpoints (stricter rate limiting)
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://localhost:5000/api/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (cache for 1 year)
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000/static/;
    }

    # Health checks
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
```

#### Enable Site and Restart NGINX
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/student-pass-system /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart NGINX
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 4. SSL Certificate Setup

#### Install Certbot
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate DH parameters
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048

# Obtain SSL certificate
sudo certbot --nginx -d studentpass.yourinstitution.edu

# Set up automatic renewal
sudo crontab -e
# Add: 0 2 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx
```

### 5. System Security

#### Configure Firewall
```bash
# Enable UFW
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable
```

#### Configure Fail2ban
```bash
# Install Fail2ban
sudo apt install fail2ban -y

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure SSH protection
sudo nano /etc/fail2ban/jail.local
```

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@yourinstitution.edu

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

```bash
# Start and enable Fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

## Multi-Server Deployment

### Architecture Overview
```
                    Internet
                       |
                [Load Balancer]
                   /       \
            [App Server 1] [App Server 2]
                   \       /
                [Database Cluster]
                       |
                [Redis Cluster]
```

### 1. Load Balancer Setup

#### NGINX Load Balancer Configuration
```nginx
# /etc/nginx/nginx.conf

upstream backend_servers {
    least_conn;
    server app1.internal:5000 weight=1 max_fails=3 fail_timeout=30s;
    server app2.internal:5000 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream frontend_servers {
    least_conn;
    server app1.internal:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app2.internal:3000 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name studentpass.yourinstitution.edu;

    # SSL configuration (same as single server)
    
    # Health check endpoint
    location /health {
        proxy_pass http://backend_servers/health;
        proxy_set_header Host $host;
    }

    # Frontend
    location / {
        proxy_pass http://frontend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend_servers/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Database Cluster Setup

#### PostgreSQL Primary-Replica Configuration

**Primary Server Configuration**
```postgresql
# /etc/postgresql/15/main/postgresql.conf

# Connection settings
listen_addresses = '*'
port = 5432
max_connections = 200

# Replication settings
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
synchronous_commit = on
synchronous_standby_names = 'replica1'

# Performance settings
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 256MB
maintenance_work_mem = 2GB

# Logging
log_destination = 'csvlog'
logging_collector = on
log_directory = 'pg_log'
log_min_duration_statement = 1000
```

**Replica Server Setup**
```bash
# Stop PostgreSQL on replica
sudo systemctl stop postgresql

# Create base backup from primary
sudo -u postgres pg_basebackup -h primary.internal -D /var/lib/postgresql/15/main -U replication -v -P -W

# Configure replica
sudo -u postgres cat > /var/lib/postgresql/15/main/recovery.conf << EOF
standby_mode = 'on'
primary_conninfo = 'host=primary.internal port=5432 user=replication password=replication_password'
primary_slot_name = 'replica1'
EOF

# Start PostgreSQL on replica
sudo systemctl start postgresql
```

### 3. Redis Cluster Setup

#### Redis Cluster Configuration
```bash
# Create Redis cluster with 3 masters and 3 replicas
redis-cli --cluster create \
  redis1.internal:6379 \
  redis2.internal:6379 \
  redis3.internal:6379 \
  redis4.internal:6379 \
  redis5.internal:6379 \
  redis6.internal:6379 \
  --cluster-replicas 1
```

#### Application Configuration for Redis Cluster
```typescript
// backend/src/config/redis.ts
import Redis from 'ioredis';

export const createRedisCluster = () => {
  return new Redis.Cluster([
    { host: 'redis1.internal', port: 6379 },
    { host: 'redis2.internal', port: 6379 },
    { host: 'redis3.internal', port: 6379 }
  ], {
    redisOptions: {
      password: process.env.REDIS_PASSWORD
    },
    enableOfflineQueue: false,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  });
};
```

## Kubernetes Deployment

### 1. Cluster Preparation

#### Install Kubernetes Tools
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
kubectl version --client
helm version
```

#### Create Namespace and Secrets
```bash
# Create namespace
kubectl create namespace student-pass

# Create database secret
kubectl create secret generic postgres-secret \
  --from-literal=username=studentpass_user \
  --from-literal=password=STRONG_DATABASE_PASSWORD \
  --from-literal=database=student_pass_production \
  -n student-pass

# Create Redis secret
kubectl create secret generic redis-secret \
  --from-literal=password=STRONG_REDIS_PASSWORD \
  -n student-pass

# Create JWT secrets
kubectl create secret generic jwt-secret \
  --from-literal=secret=JWT_SECRET_64_CHARS_MINIMUM \
  --from-literal=refresh-secret=REFRESH_SECRET_64_CHARS_MINIMUM \
  -n student-pass

# Create AWS credentials
kubectl create secret generic aws-credentials \
  --from-literal=access-key-id=YOUR_ACCESS_KEY \
  --from-literal=secret-access-key=YOUR_SECRET_KEY \
  -n student-pass
```

### 2. Database Deployment

#### PostgreSQL StatefulSet
```yaml
# k8s/postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: student-pass
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: database
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
          name: postgres
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - $(POSTGRES_USER)
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - $(POSTGRES_USER)
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
      storageClassName: ssd

---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: student-pass
spec:
  selector:
    app: postgres
  ports:
  - name: postgres
    port: 5432
    targetPort: 5432
  type: ClusterIP
```

### 3. Application Deployment

#### Backend Deployment
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: student-pass
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: backend
        image: student-pass/backend:latest
        imagePullPolicy: Always
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          value: "postgresql://$(DB_USER):$(DB_PASS)@postgres:5432/$(DB_NAME)"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: DB_PASS
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: database
        - name: REDIS_URL
          value: "redis://:$(REDIS_PASSWORD)@redis:6379"
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        - name: JWT_REFRESH_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: refresh-secret
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key-id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: secret-access-key
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9464
          name: metrics
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL

---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: student-pass
  labels:
    app: backend
spec:
  selector:
    app: backend
  ports:
  - name: http
    port: 3000
    targetPort: http
  - name: metrics
    port: 9464
    targetPort: metrics
  type: ClusterIP
```

#### Frontend Deployment
```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: student-pass
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: student-pass/frontend:latest
        imagePullPolicy: Always
        env:
        - name: REACT_APP_API_URL
          value: "/api"
        ports:
        - containerPort: 80
          name: http
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001

---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: student-pass
spec:
  selector:
    app: frontend
  ports:
  - name: http
    port: 80
    targetPort: http
  type: ClusterIP
```

### 4. Ingress Configuration

#### NGINX Ingress Controller
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: student-pass-ingress
  namespace: student-pass
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  tls:
  - hosts:
    - studentpass.yourinstitution.edu
    secretName: student-pass-tls
  rules:
  - host: studentpass.yourinstitution.edu
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

### 5. Horizontal Pod Autoscaler

#### HPA Configuration
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: student-pass
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: student-pass
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 6. Deploy to Kubernetes

#### Deployment Commands
```bash
# Apply all configurations
kubectl apply -f k8s/ -n student-pass

# Wait for deployments to be ready
kubectl wait --for=condition=available --timeout=600s deployment/postgres -n student-pass
kubectl wait --for=condition=available --timeout=600s deployment/backend -n student-pass
kubectl wait --for=condition=available --timeout=600s deployment/frontend -n student-pass

# Run database migrations
kubectl exec -it deployment/backend -n student-pass -- npx prisma migrate deploy

# Check deployment status
kubectl get pods -n student-pass
kubectl get services -n student-pass
kubectl get ingress -n student-pass
```

## Cloud-Native Deployment

### AWS Deployment with EKS

#### Prerequisites
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Configure AWS credentials
aws configure
```

#### Create EKS Cluster
```bash
# Create cluster configuration
cat > cluster.yaml << EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: student-pass-cluster
  region: us-west-2
  version: "1.28"

managedNodeGroups:
  - name: app-nodes
    instanceType: t3.large
    minSize: 3
    maxSize: 20
    desiredCapacity: 5
    volumeSize: 100
    ssh:
      allow: true
    iam:
      withAddonPolicies:
        autoScaler: true
        cloudWatch: true

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-load-balancer-controller

cloudWatch:
  clusterLogging:
    enable: ["audit", "authenticator", "controllerManager"]
EOF

# Create cluster
eksctl create cluster -f cluster.yaml
```

#### Install Cert-Manager and AWS Load Balancer Controller
```bash
# Install cert-manager
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=student-pass-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

#### RDS Database Setup
```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier student-pass-production \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --engine-version 15.4 \
  --master-username studentpass_admin \
  --master-user-password STRONG_DATABASE_PASSWORD \
  --allocated-storage 100 \
  --storage-type gp3 \
  --storage-encrypted \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --backup-retention-period 30 \
  --multi-az \
  --auto-minor-version-upgrade
```

### Azure Deployment with AKS

#### Create AKS Cluster
```bash
# Create resource group
az group create --name student-pass-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group student-pass-rg \
  --name student-pass-aks \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-addons monitoring,azure-policy \
  --enable-autoscaler \
  --min-count 3 \
  --max-count 20 \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group student-pass-rg --name student-pass-aks
```

## Monitoring and Observability

### 1. Prometheus and Grafana Setup

#### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'student-pass-backend'
    static_configs:
      - targets: ['backend:9464']
    scrape_interval: 30s
    metrics_path: /metrics
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
      
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
      
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Alert Rules
```yaml
# monitoring/alert_rules.yml
groups:
- name: student-pass-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      
  - alert: DatabaseDown
    expr: up{job="postgres"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "PostgreSQL database is down"
      
  - alert: HighCPUUsage
    expr: rate(cpu_usage_total[5m]) > 0.8
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage detected"
```

### 2. Centralized Logging

#### ELK Stack Deployment
```yaml
# monitoring/elasticsearch.yml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        env:
        - name: discovery.type
          value: "zen"
        - name: ES_JAVA_OPTS
          value: "-Xms2g -Xmx2g"
        - name: xpack.security.enabled
          value: "false"
        ports:
        - containerPort: 9200
        - containerPort: 9300
        resources:
          requests:
            memory: 4Gi
            cpu: 1000m
          limits:
            memory: 4Gi
            cpu: 2000m
```

### 3. Application Performance Monitoring

#### Custom Metrics Implementation
```typescript
// backend/src/middleware/metrics.ts
import promClient from 'prom-client';

// Create custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const applicationRequests = new promClient.Counter({
  name: 'student_pass_requests_total',
  help: 'Total number of application requests',
  labelNames: ['type', 'status', 'school_id']
});

export const passVerifications = new promClient.Counter({
  name: 'student_pass_verifications_total', 
  help: 'Total number of pass verifications',
  labelNames: ['status', 'location']
});

export const activeUsers = new promClient.Gauge({
  name: 'student_pass_active_users',
  help: 'Number of currently active users',
  labelNames: ['user_type']
});

// Metrics middleware
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || 'unknown', res.statusCode.toString())
      .observe(duration);
  });
  
  next();
};
```

## Backup and Disaster Recovery

### 1. Automated Backup Strategy

#### Database Backup with WAL-E
```bash
# Install WAL-E
pip install wal-e

# Configure WAL-E
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export WALE_S3_PREFIX=s3://your-backup-bucket/wal-e
export PGDATA=/var/lib/postgresql/data

# Configure PostgreSQL for continuous archiving
echo "wal_level = replica" >> /var/lib/postgresql/data/postgresql.conf
echo "archive_mode = on" >> /var/lib/postgresql/data/postgresql.conf
echo "archive_command = 'wal-e wal-push %p'" >> /var/lib/postgresql/data/postgresql.conf

# Create base backup
wal-e backup-push /var/lib/postgresql/data
```

#### Application Backup Script
```bash
#!/bin/bash
# comprehensive-backup.sh

BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
S3_BUCKET="student-pass-backups"
RETENTION_DAYS=90

# Database backup
echo "Creating database backup..."
pg_dump student_pass_production | gzip > /tmp/db_backup_${BACKUP_DATE}.sql.gz
aws s3 cp /tmp/db_backup_${BACKUP_DATE}.sql.gz s3://${S3_BUCKET}/database/

# Configuration backup
echo "Backing up configuration files..."
tar -czf /tmp/config_backup_${BACKUP_DATE}.tar.gz \
  /etc/nginx/ \
  /etc/ssl/ \
  /opt/student-pass-system/.env.production
aws s3 cp /tmp/config_backup_${BACKUP_DATE}.tar.gz s3://${S3_BUCKET}/config/

# Application files backup
echo "Backing up application files..."
tar --exclude='node_modules' --exclude='logs' --exclude='.git' \
  -czf /tmp/app_backup_${BACKUP_DATE}.tar.gz /opt/student-pass-system/
aws s3 cp /tmp/app_backup_${BACKUP_DATE}.tar.gz s3://${S3_BUCKET}/application/

# Clean up local files
rm -f /tmp/*_backup_${BACKUP_DATE}.*

# Clean up old backups in S3
aws s3 ls s3://${S3_BUCKET}/database/ | while read -r line; do
  createDate=$(echo $line | awk '{print $1" "$2}')
  createDate=$(date -d"$createDate" +%s)
  olderThan=$(date -d"$RETENTION_DAYS days ago" +%s)
  if [[ $createDate -lt $olderThan ]]; then
    fileName=$(echo $line | awk '{print $4}')
    if [[ $fileName != "" ]]; then
      aws s3 rm s3://${S3_BUCKET}/database/$fileName
    fi
  fi
done

echo "Backup completed successfully"
```

### 2. Disaster Recovery Procedures

#### RTO/RPO Targets
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 15 minutes
- **Data Retention**: 90 days for backups, 7 years for archives

#### DR Site Setup
```bash
#!/bin/bash
# disaster-recovery-setup.sh

# Set up DR infrastructure
terraform plan -var-file="dr.tfvars" dr-infrastructure/
terraform apply -var-file="dr.tfvars" dr-infrastructure/

# Restore database from backup
LATEST_BACKUP=$(aws s3 ls s3://student-pass-backups/database/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp s3://student-pass-backups/database/$LATEST_BACKUP /tmp/latest_backup.sql.gz
gunzip -c /tmp/latest_backup.sql.gz | psql student_pass_production

# Deploy application to DR site
kubectl config use-context dr-cluster
kubectl apply -f k8s/ -n student-pass

# Update DNS to point to DR site (manual step)
echo "Update DNS records to point to DR site: $DR_SITE_IP"
```

## Security Hardening

### 1. Network Security

#### Security Groups Configuration
```json
{
  "SecurityGroups": [
    {
      "GroupName": "student-pass-web",
      "Description": "Web tier security group",
      "IpPermissions": [
        {
          "IpProtocol": "tcp",
          "FromPort": 443,
          "ToPort": 443,
          "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
        },
        {
          "IpProtocol": "tcp", 
          "FromPort": 80,
          "ToPort": 80,
          "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
        }
      ]
    },
    {
      "GroupName": "student-pass-app",
      "Description": "Application tier security group",
      "IpPermissions": [
        {
          "IpProtocol": "tcp",
          "FromPort": 3000,
          "ToPort": 3000,
          "UserIdGroupPairs": [{"GroupName": "student-pass-web"}]
        }
      ]
    },
    {
      "GroupName": "student-pass-db",
      "Description": "Database tier security group",
      "IpPermissions": [
        {
          "IpProtocol": "tcp",
          "FromPort": 5432,
          "ToPort": 5432,
          "UserIdGroupPairs": [{"GroupName": "student-pass-app"}]
        }
      ]
    }
  ]
}
```

### 2. Application Security

#### Security Headers Configuration
```typescript
// backend/src/middleware/security.ts
import helmet from 'helmet';

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https://api.yourdomain.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});
```

## Performance Optimization

### 1. Database Optimization

#### Query Optimization
```sql
-- Create optimized indexes
CREATE INDEX CONCURRENTLY idx_applications_status_created 
ON applications(status, created_at DESC) 
WHERE status IN ('submitted', 'under_review');

CREATE INDEX CONCURRENTLY idx_students_search 
ON students USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || student_id))
WHERE deleted_at IS NULL;

-- Optimize frequent queries
EXPLAIN ANALYZE
SELECT s.*, p.status as pass_status, p.expiry_date
FROM students s
LEFT JOIN LATERAL (
  SELECT status, expiry_date 
  FROM passes p 
  WHERE p.student_id = s.id 
    AND p.status = 'active'
  ORDER BY created_at DESC 
  LIMIT 1
) p ON true
WHERE s.school_id = $1 
  AND s.deleted_at IS NULL
ORDER BY s.last_name, s.first_name;
```

### 2. Caching Strategy

#### Multi-Level Caching
```typescript
// backend/src/services/cachingService.ts
export class CachingService {
  private memoryCache = new LRUCache({ max: 1000, ttl: 5 * 60 * 1000 });
  private redisClient: Redis;

  async get<T>(key: string, fetchFn?: () => Promise<T>, ttl = 3600): Promise<T | null> {
    // L1: Memory cache
    let result = this.memoryCache.get(key) as T;
    if (result) return result;

    // L2: Redis cache
    const redisValue = await this.redisClient.get(key);
    if (redisValue) {
      result = JSON.parse(redisValue);
      this.memoryCache.set(key, result);
      return result;
    }

    // L3: Database/API call
    if (fetchFn) {
      result = await fetchFn();
      if (result) {
        await this.set(key, result, ttl);
      }
      return result;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    this.memoryCache.set(key, value);
    await this.redisClient.setex(key, ttl, JSON.stringify(value));
  }
}
```

## Maintenance and Updates

### 1. Rolling Updates

#### Zero-Downtime Deployment Script
```bash
#!/bin/bash
# zero-downtime-deploy.sh

NEW_VERSION=$1
if [ -z "$NEW_VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

echo "Deploying version $NEW_VERSION with zero downtime..."

# Pre-deployment checks
./pre-deployment-checks.sh

# Update backend with rolling deployment
kubectl set image deployment/backend backend=student-pass/backend:$NEW_VERSION -n student-pass
kubectl rollout status deployment/backend -n student-pass --timeout=600s

# Update frontend
kubectl set image deployment/frontend frontend=student-pass/frontend:$NEW_VERSION -n student-pass  
kubectl rollout status deployment/frontend -n student-pass --timeout=600s

# Run database migrations (if any)
kubectl exec -it deployment/backend -n student-pass -- npx prisma migrate deploy

# Post-deployment verification
./post-deployment-checks.sh

echo "Deployment completed successfully"
```

### 2. Health Checks

#### Comprehensive Health Check System
```typescript
// backend/src/routes/health.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL);

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Database health check
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = { status: 'healthy' };
  } catch (error) {
    health.checks.database = { status: 'unhealthy', error: error.message };
    health.status = 'unhealthy';
  }

  try {
    // Redis health check  
    await redis.ping();
    health.checks.redis = { status: 'healthy' };
  } catch (error) {
    health.checks.redis = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }

  try {
    // External services check
    const s3Check = await checkS3Health();
    health.checks.s3 = s3Check;
  } catch (error) {
    health.checks.s3 = { status: 'unhealthy', error: error.message };
    if (health.status === 'healthy') health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(health);
});

router.get('/health/ready', async (req, res) => {
  // Readiness probe - check if app is ready to serve requests
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

router.get('/health/live', (req, res) => {
  // Liveness probe - check if app is still running
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export default router;
```

## Troubleshooting

### Common Issues and Solutions

#### 1. High Database Load
**Symptoms**: Slow response times, high CPU on database server
**Solutions**:
```sql
-- Identify slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
ORDER BY total_time DESC LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_missing_index
ON table_name(column_name);

-- Update table statistics
ANALYZE table_name;
```

#### 2. Memory Issues
**Symptoms**: Out of memory errors, application crashes
**Solutions**:
```bash
# Increase Node.js heap size
node --max-old-space-size=4096 server.js

# Monitor memory usage
kubectl top pods -n student-pass
kubectl describe pod pod-name -n student-pass
```

#### 3. SSL Certificate Issues
**Symptoms**: Certificate expired, HTTPS warnings
**Solutions**:
```bash
# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/domain/cert.pem -noout -dates

# Renew certificate
certbot renew --force-renewal

# Update Kubernetes secret
kubectl create secret tls student-pass-tls \
  --cert=/etc/letsencrypt/live/domain/fullchain.pem \
  --key=/etc/letsencrypt/live/domain/privkey.pem \
  -n student-pass --dry-run=client -o yaml | kubectl apply -f -
```

## Contact and Support

### Emergency Contacts
- **Primary On-Call**: +1-xxx-xxx-xxxx
- **Database Emergency**: +1-xxx-xxx-xxxx  
- **Security Incident**: security@yourinstitution.edu
- **Infrastructure Support**: infrastructure@yourinstitution.edu

### Support Resources
- **Documentation**: https://docs.studentpass.yourinstitution.edu
- **Monitoring Dashboard**: https://monitoring.studentpass.yourinstitution.edu
- **Log Analysis**: https://logs.studentpass.yourinstitution.edu
- **Status Page**: https://status.studentpass.yourinstitution.edu

---

**This deployment guide is continuously updated to reflect best practices and new features. Please check for updates before major deployments.**

**Document Version**: 2.0.0  
**Last Updated**: [Current Date]  
**Next Review**: [Review Date]