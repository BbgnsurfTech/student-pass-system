#!/bin/bash

# Student Pass System Rollback Script
# Usage: ./scripts/rollback.sh [environment] [revision]
# Example: ./scripts/rollback.sh production 2

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
ENVIRONMENT=${1:-staging}
REVISION=${2:-""}

# Validate inputs
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
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
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is required but not installed"
        exit 1
    fi
    
    # Check kubectl context
    CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
    if [[ "$CURRENT_CONTEXT" != *"$ENVIRONMENT"* ]]; then
        warning "Current kubectl context: $CURRENT_CONTEXT"
        read -p "Continue with this context? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    success "Prerequisites check passed"
}

show_rollout_history() {
    log "Showing rollout history for $ENVIRONMENT environment:"
    echo
    
    echo "Backend deployment history:"
    kubectl rollout history deployment/backend-deployment -n $ENVIRONMENT
    echo
    
    echo "Frontend deployment history:"
    kubectl rollout history deployment/frontend-deployment -n $ENVIRONMENT
    echo
}

get_current_revision() {
    local deployment=$1
    kubectl get deployment $deployment -n $ENVIRONMENT -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}'
}

confirm_rollback() {
    local backend_current=$(get_current_revision "backend-deployment")
    local frontend_current=$(get_current_revision "frontend-deployment")
    
    warning "Current revisions:"
    warning "  Backend: $backend_current"
    warning "  Frontend: $frontend_current"
    echo
    
    if [[ -n "$REVISION" ]]; then
        warning "Rolling back to revision: $REVISION"
    else
        warning "Rolling back to previous revision"
    fi
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        warning "This will rollback PRODUCTION environment"
    fi
    
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Rollback cancelled"
        exit 0
    fi
}

create_rollback_annotation() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local user=$(whoami)
    local reason="Manual rollback by $user at $timestamp"
    
    kubectl annotate deployment/backend-deployment -n $ENVIRONMENT \
        rollback.timestamp="$timestamp" \
        rollback.user="$user" \
        rollback.reason="$reason" \
        --overwrite
    
    kubectl annotate deployment/frontend-deployment -n $ENVIRONMENT \
        rollback.timestamp="$timestamp" \
        rollback.user="$user" \
        rollback.reason="$reason" \
        --overwrite
}

rollback_deployments() {
    log "Starting rollback process..."
    
    # Create rollback annotations
    create_rollback_annotation
    
    # Rollback backend
    log "Rolling back backend deployment..."
    if [[ -n "$REVISION" ]]; then
        kubectl rollout undo deployment/backend-deployment -n $ENVIRONMENT --to-revision=$REVISION
    else
        kubectl rollout undo deployment/backend-deployment -n $ENVIRONMENT
    fi
    
    # Rollback frontend
    log "Rolling back frontend deployment..."
    if [[ -n "$REVISION" ]]; then
        kubectl rollout undo deployment/frontend-deployment -n $ENVIRONMENT --to-revision=$REVISION
    else
        kubectl rollout undo deployment/frontend-deployment -n $ENVIRONMENT
    fi
    
    # Wait for rollout to complete
    log "Waiting for rollout to complete..."
    kubectl rollout status deployment/backend-deployment -n $ENVIRONMENT --timeout=300s
    kubectl rollout status deployment/frontend-deployment -n $ENVIRONMENT --timeout=300s
    
    success "Rollback completed successfully"
}

run_health_checks() {
    log "Running post-rollback health checks..."
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app=backend -n $ENVIRONMENT --timeout=180s
    kubectl wait --for=condition=ready pod -l app=frontend -n $ENVIRONMENT --timeout=180s
    
    # Get ingress URL
    INGRESS_URL=$(kubectl get ingress student-pass-ingress -n $ENVIRONMENT -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "localhost")
    
    # Health check endpoints
    ENDPOINTS=(
        "http://$INGRESS_URL/health"
        "http://$INGRESS_URL/api/health"
        "http://$INGRESS_URL/api/auth/health"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        log "Checking $endpoint..."
        
        # Retry logic
        for i in {1..10}; do
            if curl -f -s --max-time 10 "$endpoint" > /dev/null 2>&1; then
                success "Health check passed: $endpoint"
                break
            elif [[ $i -eq 10 ]]; then
                error "Health check failed after 10 attempts: $endpoint"
                return 1
            else
                warning "Health check attempt $i failed, retrying in 10s..."
                sleep 10
            fi
        done
    done
    
    success "All health checks passed"
}

verify_rollback() {
    log "Verifying rollback status..."
    
    # Get current revisions
    local backend_current=$(get_current_revision "backend-deployment")
    local frontend_current=$(get_current_revision "frontend-deployment")
    
    log "Post-rollback revisions:"
    log "  Backend: $backend_current"
    log "  Frontend: $frontend_current"
    
    # Check pod status
    log "Current pod status:"
    kubectl get pods -n $ENVIRONMENT -l app=backend
    kubectl get pods -n $ENVIRONMENT -l app=frontend
    
    # Check deployment status
    log "Deployment status:"
    kubectl get deployments -n $ENVIRONMENT
}

send_notification() {
    local status=$1
    local webhook_url=${SLACK_WEBHOOK_URL:-""}
    
    if [[ -n "$webhook_url" ]]; then
        local color="good"
        local title="Rollback Successful"
        
        if [[ "$status" != "success" ]]; then
            color="danger"
            title="Rollback Failed"
        fi
        
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
                    "title": "Revision",
                    "value": "${REVISION:-previous}",
                    "short": true
                },
                {
                    "title": "User",
                    "value": "$(whoami)",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$(date)",
                    "short": false
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

create_incident_log() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local log_file="rollback-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).log"
    
    cat <<EOF > "$log_file"
Rollback Incident Log
=====================
Environment: $ENVIRONMENT
Timestamp: $timestamp
User: $(whoami)
Revision: ${REVISION:-previous}

Pre-Rollback State:
------------------
$(kubectl get deployments -n $ENVIRONMENT -o wide)

Post-Rollback State:
-------------------
$(kubectl get deployments -n $ENVIRONMENT -o wide)

Pod Status:
----------
$(kubectl get pods -n $ENVIRONMENT)

Events:
-------
$(kubectl get events -n $ENVIRONMENT --sort-by='.lastTimestamp' | tail -20)
EOF
    
    log "Incident log created: $log_file"
}

show_monitoring_urls() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Monitoring URLs:"
        
        # Get Grafana URL
        GRAFANA_URL=$(kubectl get service prometheus-grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Check Grafana service")
        log "  Grafana: http://$GRAFANA_URL:3000"
        
        # Get Prometheus URL
        PROMETHEUS_URL=$(kubectl get service prometheus-server -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Check Prometheus service")
        log "  Prometheus: http://$PROMETHEUS_URL:9090"
        
        log "Monitor these dashboards for the next 30 minutes to ensure system stability"
    fi
}

main() {
    log "Starting rollback process for $ENVIRONMENT environment"
    
    check_prerequisites
    show_rollout_history
    confirm_rollback
    
    # Perform rollback
    if rollback_deployments && run_health_checks; then
        verify_rollback
        create_incident_log
        send_notification "success"
        show_monitoring_urls
        
        success "Rollback completed successfully!"
        log "Please monitor the application for the next 30 minutes to ensure stability"
    else
        error "Rollback failed or health checks did not pass"
        create_incident_log
        send_notification "failure"
        
        log "Please check the following:"
        log "1. Pod logs: kubectl logs -l app=backend -n $ENVIRONMENT"
        log "2. Pod logs: kubectl logs -l app=frontend -n $ENVIRONMENT"
        log "3. Events: kubectl get events -n $ENVIRONMENT --sort-by='.lastTimestamp'"
        log "4. Deployment status: kubectl get deployments -n $ENVIRONMENT"
        
        exit 1
    fi
}

# Trap errors
trap 'error "Rollback process failed. Check the logs above for details."' ERR

# Run main function
main "$@"