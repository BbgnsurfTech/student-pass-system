#!/bin/bash

# Student Pass System Backup Script
# Usage: ./scripts/backup.sh [environment] [type]
# Example: ./scripts/backup.sh production full

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-production}
BACKUP_TYPE=${2:-incremental}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# AWS Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
S3_BACKUP_BUCKET=${S3_BACKUP_BUCKET:-student-pass-backups}
RETENTION_DAYS=${RETENTION_DAYS:-30}

# Validate inputs
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

if [[ ! "$BACKUP_TYPE" =~ ^(full|incremental|database-only|files-only)$ ]]; then
    echo -e "${RED}Error: Backup type must be 'full', 'incremental', 'database-only', or 'files-only'${NC}"
    exit 1
fi

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check required commands
    for cmd in kubectl aws pg_dump redis-cli; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured"
        exit 1
    fi
    
    # Check S3 bucket exists
    if ! aws s3 ls "s3://$S3_BACKUP_BUCKET" &> /dev/null; then
        warning "S3 bucket $S3_BACKUP_BUCKET does not exist, creating..."
        aws s3 mb "s3://$S3_BACKUP_BUCKET" --region "$AWS_REGION"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$S3_BACKUP_BUCKET" \
            --versioning-configuration Status=Enabled
        
        # Set lifecycle policy
        aws s3api put-bucket-lifecycle-configuration \
            --bucket "$S3_BACKUP_BUCKET" \
            --lifecycle-configuration file://<(cat <<EOF
{
    "Rules": [
        {
            "ID": "DeleteOldBackups",
            "Status": "Enabled",
            "Filter": {"Prefix": ""},
            "Expiration": {"Days": $RETENTION_DAYS},
            "NoncurrentVersionExpiration": {"NoncurrentDays": 7}
        }
    ]
}
EOF
            )
    fi
    
    success "Prerequisites check passed"
}

create_backup_directory() {
    BACKUP_DIR="/tmp/student-pass-backup-$ENVIRONMENT-$TIMESTAMP"
    mkdir -p "$BACKUP_DIR"
    log "Created backup directory: $BACKUP_DIR"
}

backup_database() {
    log "Starting database backup..."
    
    # Get database connection info
    DB_HOST=$(kubectl get secret postgres-secret -n $ENVIRONMENT -o jsonpath='{.data.POSTGRES_HOST}' | base64 -d)
    DB_PORT=$(kubectl get secret postgres-secret -n $ENVIRONMENT -o jsonpath='{.data.POSTGRES_PORT}' | base64 -d)
    DB_NAME=$(kubectl get secret postgres-secret -n $ENVIRONMENT -o jsonpath='{.data.POSTGRES_DB}' | base64 -d)
    DB_USER=$(kubectl get secret postgres-secret -n $ENVIRONMENT -o jsonpath='{.data.POSTGRES_USER}' | base64 -d)
    DB_PASS=$(kubectl get secret postgres-secret -n $ENVIRONMENT -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d)
    
    # Create database dump via port-forward
    kubectl port-forward -n $ENVIRONMENT service/postgres-service 5432:5432 &
    PF_PID=$!
    sleep 5
    
    export PGPASSWORD="$DB_PASS"
    
    if [[ "$BACKUP_TYPE" == "full" || "$BACKUP_TYPE" == "database-only" ]]; then
        # Full database backup
        pg_dump -h localhost -p 5432 -U "$DB_USER" -d "$DB_NAME" \
            --verbose --no-password --format=custom \
            --file="$BACKUP_DIR/database-full-$TIMESTAMP.dump"
        
        # Compress the dump
        gzip "$BACKUP_DIR/database-full-$TIMESTAMP.dump"
        
        success "Full database backup completed"
    elif [[ "$BACKUP_TYPE" == "incremental" ]]; then
        # Get last backup timestamp from S3
        LAST_BACKUP_TIME=$(aws s3api list-objects-v2 \
            --bucket "$S3_BACKUP_BUCKET" \
            --prefix "database/$ENVIRONMENT/incremental/" \
            --query 'Contents[?LastModified>`2023-01-01T00:00:00Z`]|sort_by(@, &LastModified)[-1].Key' \
            --output text 2>/dev/null | grep -o '[0-9]\{8\}-[0-9]\{6\}' | tail -1)
        
        if [[ -n "$LAST_BACKUP_TIME" ]]; then
            # Incremental backup (WAL files and changes since last backup)
            log "Performing incremental backup since $LAST_BACKUP_TIME"
            
            # Export data modified since last backup
            pg_dump -h localhost -p 5432 -U "$DB_USER" -d "$DB_NAME" \
                --verbose --no-password --format=custom \
                --file="$BACKUP_DIR/database-incremental-$TIMESTAMP.dump" \
                --where="updated_at > '$LAST_BACKUP_TIME'"
        else
            # First incremental backup - do full backup
            log "No previous backup found, performing full backup"
            pg_dump -h localhost -p 5432 -U "$DB_USER" -d "$DB_NAME" \
                --verbose --no-password --format=custom \
                --file="$BACKUP_DIR/database-full-$TIMESTAMP.dump"
        fi
        
        gzip "$BACKUP_DIR"/database-*.dump
        success "Incremental database backup completed"
    fi
    
    # Kill port-forward
    kill $PF_PID 2>/dev/null || true
    unset PGPASSWORD
}

backup_redis() {
    log "Starting Redis backup..."
    
    # Get Redis connection info
    REDIS_HOST=$(kubectl get service redis-service -n $ENVIRONMENT -o jsonpath='{.spec.clusterIP}')
    REDIS_PORT="6379"
    REDIS_PASS=$(kubectl get secret redis-secret -n $ENVIRONMENT -o jsonpath='{.data.REDIS_PASSWORD}' | base64 -d)
    
    # Create Redis backup via port-forward
    kubectl port-forward -n $ENVIRONMENT service/redis-service 6379:6379 &
    PF_PID=$!
    sleep 5
    
    # Save Redis data
    redis-cli -h localhost -p 6379 -a "$REDIS_PASS" --rdb "$BACKUP_DIR/redis-$TIMESTAMP.rdb"
    
    # Compress Redis backup
    gzip "$BACKUP_DIR/redis-$TIMESTAMP.rdb"
    
    # Kill port-forward
    kill $PF_PID 2>/dev/null || true
    
    success "Redis backup completed"
}

backup_kubernetes_resources() {
    log "Starting Kubernetes resources backup..."
    
    # Create directories
    mkdir -p "$BACKUP_DIR/k8s"
    
    # Backup all resources in the namespace
    RESOURCES=(
        "configmaps"
        "secrets"
        "services"
        "deployments"
        "ingresses"
        "persistentvolumeclaims"
        "serviceaccounts"
        "roles"
        "rolebindings"
    )
    
    for resource in "${RESOURCES[@]}"; do
        log "Backing up $resource..."
        kubectl get $resource -n $ENVIRONMENT -o yaml > "$BACKUP_DIR/k8s/$resource.yaml" 2>/dev/null || true
    done
    
    # Backup cluster-wide resources related to the application
    kubectl get clusterroles,clusterrolebindings -o yaml | \
        grep -A 1000 -B 1000 "student-pass\|$ENVIRONMENT" > "$BACKUP_DIR/k8s/cluster-resources.yaml" 2>/dev/null || true
    
    success "Kubernetes resources backup completed"
}

backup_application_data() {
    if [[ "$BACKUP_TYPE" == "files-only" || "$BACKUP_TYPE" == "full" ]]; then
        log "Starting application data backup..."
        
        # Create directories
        mkdir -p "$BACKUP_DIR/app-data"
        
        # Backup uploaded files from persistent volumes
        PODS=$(kubectl get pods -n $ENVIRONMENT -l app=backend --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}')
        
        if [[ -n "$PODS" ]]; then
            # Copy uploads directory
            kubectl cp "$ENVIRONMENT/$PODS:/app/uploads" "$BACKUP_DIR/app-data/uploads" 2>/dev/null || true
            
            # Copy logs directory
            kubectl cp "$ENVIRONMENT/$PODS:/app/logs" "$BACKUP_DIR/app-data/logs" 2>/dev/null || true
        fi
        
        success "Application data backup completed"
    fi
}

create_backup_manifest() {
    log "Creating backup manifest..."
    
    cat > "$BACKUP_DIR/manifest.json" <<EOF
{
    "backup_id": "student-pass-$ENVIRONMENT-$TIMESTAMP",
    "timestamp": "$TIMESTAMP",
    "environment": "$ENVIRONMENT",
    "backup_type": "$BACKUP_TYPE",
    "kubernetes_version": "$(kubectl version --short --client | cut -d' ' -f3)",
    "cluster_name": "$(kubectl config current-context)",
    "created_by": "$(whoami)",
    "files": [
$(find "$BACKUP_DIR" -type f -not -name "manifest.json" | sed 's|'"$BACKUP_DIR"'/||' | sort | sed 's/^/        "/' | sed 's/$/",/' | sed '$s/,$//')
    ],
    "total_size": "$(du -sh "$BACKUP_DIR" | cut -f1)",
    "checksums": {
$(find "$BACKUP_DIR" -type f -not -name "manifest.json" -exec sh -c 'echo "        \"$(basename "{}")\": \"$(sha256sum "{}" | cut -d" " -f1)\","' \; | sed '$s/,$//')
    }
}
EOF
    
    success "Backup manifest created"
}

upload_to_s3() {
    log "Uploading backup to S3..."
    
    # Create tarball
    TARBALL="$BACKUP_DIR.tar.gz"
    tar -czf "$TARBALL" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"
    
    # Upload to S3
    S3_PATH="s3://$S3_BACKUP_BUCKET/$BACKUP_TYPE/$ENVIRONMENT/student-pass-backup-$TIMESTAMP.tar.gz"
    aws s3 cp "$TARBALL" "$S3_PATH" \
        --metadata "Environment=$ENVIRONMENT,BackupType=$BACKUP_TYPE,Timestamp=$TIMESTAMP"
    
    # Upload manifest separately for easy access
    aws s3 cp "$BACKUP_DIR/manifest.json" \
        "s3://$S3_BACKUP_BUCKET/$BACKUP_TYPE/$ENVIRONMENT/manifests/manifest-$TIMESTAMP.json"
    
    # Set lifecycle tags
    aws s3api put-object-tagging \
        --bucket "$S3_BACKUP_BUCKET" \
        --key "${S3_PATH#s3://$S3_BACKUP_BUCKET/}" \
        --tagging "TagSet=[{Key=Environment,Value=$ENVIRONMENT},{Key=BackupType,Value=$BACKUP_TYPE},{Key=CreatedBy,Value=$(whoami)}]"
    
    success "Backup uploaded to $S3_PATH"
    
    # Store S3 path for reference
    echo "$S3_PATH" > "$BACKUP_DIR/s3_location.txt"
}

verify_backup() {
    log "Verifying backup integrity..."
    
    # Download and verify the uploaded backup
    TEMP_VERIFY_DIR="/tmp/verify-backup-$TIMESTAMP"
    mkdir -p "$TEMP_VERIFY_DIR"
    
    # Download from S3
    S3_PATH=$(cat "$BACKUP_DIR/s3_location.txt")
    aws s3 cp "$S3_PATH" "$TEMP_VERIFY_DIR/backup.tar.gz"
    
    # Extract and verify
    tar -xzf "$TEMP_VERIFY_DIR/backup.tar.gz" -C "$TEMP_VERIFY_DIR"
    
    # Verify checksums
    EXTRACTED_DIR="$TEMP_VERIFY_DIR/$(basename "$BACKUP_DIR")"
    if [[ -f "$EXTRACTED_DIR/manifest.json" ]]; then
        # Compare original and downloaded manifests
        if diff "$BACKUP_DIR/manifest.json" "$EXTRACTED_DIR/manifest.json" > /dev/null; then
            success "Backup verification completed successfully"
        else
            error "Backup verification failed - manifest mismatch"
            return 1
        fi
    else
        error "Backup verification failed - no manifest found"
        return 1
    fi
    
    # Cleanup verification files
    rm -rf "$TEMP_VERIFY_DIR"
}

cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # List and delete backups older than retention period
    CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    
    aws s3 ls "s3://$S3_BACKUP_BUCKET/$BACKUP_TYPE/$ENVIRONMENT/" --recursive | \
        awk '{print $4}' | \
        while read -r key; do
            # Extract date from filename
            BACKUP_DATE=$(echo "$key" | grep -o '[0-9]\{8\}' | head -1)
            
            if [[ -n "$BACKUP_DATE" ]] && [[ "$BACKUP_DATE" -lt "$CUTOFF_DATE" ]]; then
                log "Deleting old backup: $key"
                aws s3 rm "s3://$S3_BACKUP_BUCKET/$key"
            fi
        done
    
    success "Old backups cleaned up"
}

send_notification() {
    local status=$1
    local webhook_url=${SLACK_WEBHOOK_URL:-""}
    
    if [[ -n "$webhook_url" ]]; then
        local color="good"
        local title="Backup Successful"
        
        if [[ "$status" != "success" ]]; then
            color="danger"
            title="Backup Failed"
        fi
        
        local backup_size=$(du -sh "$BACKUP_DIR" | cut -f1)
        local s3_path=$(cat "$BACKUP_DIR/s3_location.txt" 2>/dev/null || echo "N/A")
        
        local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "$title",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Backup Type",
                    "value": "$BACKUP_TYPE",
                    "short": true
                },
                {
                    "title": "Size",
                    "value": "$backup_size",
                    "short": true
                },
                {
                    "title": "Location",
                    "value": "$s3_path",
                    "short": false
                },
                {
                    "title": "Timestamp",
                    "value": "$TIMESTAMP",
                    "short": true
                }
            ]
        }
    ]
}
EOF
        )
        
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$webhook_url" 2>/dev/null || true
    fi
}

cleanup_local_files() {
    log "Cleaning up local backup files..."
    
    # Remove local backup directory
    rm -rf "$BACKUP_DIR"
    
    # Remove tarball if it exists
    if [[ -f "$BACKUP_DIR.tar.gz" ]]; then
        rm "$BACKUP_DIR.tar.gz"
    fi
    
    success "Local cleanup completed"
}

main() {
    log "Starting backup process for $ENVIRONMENT environment"
    log "Backup type: $BACKUP_TYPE"
    log "Timestamp: $TIMESTAMP"
    
    check_prerequisites
    create_backup_directory
    
    # Perform backup based on type
    case $BACKUP_TYPE in
        "full")
            backup_database
            backup_redis
            backup_kubernetes_resources
            backup_application_data
            ;;
        "incremental")
            backup_database
            backup_redis
            ;;
        "database-only")
            backup_database
            ;;
        "files-only")
            backup_application_data
            backup_kubernetes_resources
            ;;
    esac
    
    create_backup_manifest
    upload_to_s3
    
    if verify_backup; then
        cleanup_old_backups
        send_notification "success"
        success "Backup completed successfully!"
        log "Backup location: $(cat "$BACKUP_DIR/s3_location.txt")"
        log "Backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
    else
        send_notification "failure"
        error "Backup verification failed"
        exit 1
    fi
    
    cleanup_local_files
}

# Trap errors
trap 'error "Backup process failed. Check the logs above for details."; cleanup_local_files' ERR

# Run main function
main "$@"