#!/bin/bash

# Student Pass System Deployment Script
# Usage: ./scripts/deploy.sh [environment] [strategy]
# Example: ./scripts/deploy.sh production blue-green

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
DEPLOY_STRATEGY=${2:-rolling}
IMAGE_TAG=${3:-$(git rev-parse --short HEAD)}

# Validate inputs
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

if [[ ! "$DEPLOY_STRATEGY" =~ ^(rolling|blue-green|canary)$ ]]; then
    echo -e "${RED}Error: Strategy must be 'rolling', 'blue-green', or 'canary'${NC}"
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
    for cmd in kubectl helm aws docker; do
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

build_and_push_images() {
    log "Building and pushing Docker images..."
    
    # Get ECR registry URL
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region || echo "us-east-1")
    REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $REGISTRY
    
    # Build backend image
    log "Building backend image..."
    docker build -f docker/backend.Dockerfile -t $REGISTRY/student-pass-backend:$IMAGE_TAG .
    docker push $REGISTRY/student-pass-backend:$IMAGE_TAG
    
    # Build frontend image
    log "Building frontend image..."
    docker build -f docker/frontend.Dockerfile -t $REGISTRY/student-pass-frontend:$IMAGE_TAG .
    docker push $REGISTRY/student-pass-frontend:$IMAGE_TAG
    
    success "Images built and pushed successfully"
}

deploy_infrastructure() {
    log "Deploying infrastructure with Terraform..."
    
    cd "$PROJECT_ROOT/terraform"
    
    # Initialize Terraform
    terraform init -backend-config="key=infrastructure/$ENVIRONMENT.tfstate"
    
    # Plan deployment
    terraform plan -var="environment=$ENVIRONMENT" -var="image_tag=$IMAGE_TAG" -out=tfplan
    
    # Apply with confirmation for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        warning "This will deploy to PRODUCTION environment"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    terraform apply tfplan
    
    # Get outputs
    EKS_CLUSTER_NAME=$(terraform output -raw eks_cluster_name)
    
    # Update kubeconfig
    aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER_NAME
    
    cd "$PROJECT_ROOT"
    success "Infrastructure deployed successfully"
}

deploy_applications() {
    log "Deploying applications to Kubernetes..."
    
    # Update image tags in manifests
    find k8s/$ENVIRONMENT -name "*.yaml" -exec sed -i.bak "s|IMAGE_TAG|$IMAGE_TAG|g" {} \;
    find k8s/$ENVIRONMENT -name "*.yaml" -exec sed -i.bak "s|YOUR_REGISTRY|$REGISTRY|g" {} \;
    
    # Apply base resources
    kubectl apply -f k8s/base/namespace.yaml
    kubectl apply -f k8s/$ENVIRONMENT/secrets.yaml
    kubectl apply -f k8s/$ENVIRONMENT/configmap.yaml
    
    # Deploy database and cache
    kubectl apply -f k8s/base/postgres-deployment.yaml
    kubectl apply -f k8s/base/redis-deployment.yaml
    
    # Wait for database to be ready
    kubectl wait --for=condition=ready pod -l app=postgres -n $ENVIRONMENT --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n $ENVIRONMENT --timeout=300s
    
    # Run database migrations
    run_migrations
    
    # Deploy applications based on strategy
    case $DEPLOY_STRATEGY in
        "rolling")
            deploy_rolling_update
            ;;
        "blue-green")
            deploy_blue_green
            ;;
        "canary")
            deploy_canary
            ;;
    esac
    
    # Clean up backup files
    find k8s/$ENVIRONMENT -name "*.yaml.bak" -delete
    
    success "Applications deployed successfully"
}

run_migrations() {
    log "Running database migrations..."
    
    # Create migration job
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-$IMAGE_TAG
  namespace: $ENVIRONMENT
spec:
  template:
    spec:
      containers:
      - name: migration
        image: $REGISTRY/student-pass-backend:$IMAGE_TAG
        command: ["npm", "run", "migrate:prod"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: backend-secret
              key: DATABASE_URL
      restartPolicy: Never
  backoffLimit: 3
EOF
    
    # Wait for migration to complete
    kubectl wait --for=condition=complete job/db-migration-$IMAGE_TAG -n $ENVIRONMENT --timeout=600s
    
    success "Database migrations completed"
}

deploy_rolling_update() {
    log "Deploying with rolling update strategy..."
    
    kubectl apply -f k8s/base/backend-deployment.yaml
    kubectl apply -f k8s/base/frontend-deployment.yaml
    kubectl apply -f k8s/base/ingress.yaml
    
    # Wait for rollout to complete
    kubectl rollout status deployment/backend-deployment -n $ENVIRONMENT --timeout=600s
    kubectl rollout status deployment/frontend-deployment -n $ENVIRONMENT --timeout=600s
}

deploy_blue_green() {
    log "Deploying with blue-green strategy..."
    
    # Deploy green version
    kubectl apply -f k8s/$ENVIRONMENT/backend-deployment-green.yaml
    kubectl apply -f k8s/$ENVIRONMENT/frontend-deployment-green.yaml
    
    # Wait for green deployment to be ready
    kubectl rollout status deployment/backend-deployment-green -n $ENVIRONMENT --timeout=600s
    kubectl rollout status deployment/frontend-deployment-green -n $ENVIRONMENT --timeout=600s
    
    # Run health checks on green environment
    run_health_checks "green"
    
    # Switch traffic to green
    kubectl patch service backend-service -n $ENVIRONMENT -p '{"spec":{"selector":{"version":"green"}}}'
    kubectl patch service frontend-service -n $ENVIRONMENT -p '{"spec":{"selector":{"version":"green"}}}'
    
    log "Traffic switched to green environment"
    
    # Wait for confirmation before removing blue
    sleep 30
    
    # Remove blue environment
    kubectl delete deployment backend-deployment-blue -n $ENVIRONMENT --ignore-not-found=true
    kubectl delete deployment frontend-deployment-blue -n $ENVIRONMENT --ignore-not-found=true
    
    success "Blue-green deployment completed"
}

deploy_canary() {
    log "Deploying with canary strategy..."
    
    # Deploy canary version (10% traffic)
    kubectl apply -f k8s/$ENVIRONMENT/backend-deployment-canary.yaml
    kubectl apply -f k8s/$ENVIRONMENT/frontend-deployment-canary.yaml
    
    # Wait for canary deployment
    kubectl rollout status deployment/backend-deployment-canary -n $ENVIRONMENT --timeout=600s
    kubectl rollout status deployment/frontend-deployment-canary -n $ENVIRONMENT --timeout=600s
    
    # Monitor canary for 5 minutes
    log "Monitoring canary deployment for 5 minutes..."
    sleep 300
    
    # Check metrics (simplified - integrate with your monitoring system)
    ERROR_RATE=$(kubectl exec -n monitoring deployment/prometheus -- \
        promtool query instant 'student_pass:error_rate{version="canary"}' | tail -n1 | awk '{print $2}')
    
    if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
        error "Canary error rate too high: $ERROR_RATE"
        rollback_canary
        exit 1
    fi
    
    # Full rollout
    kubectl patch deployment backend-deployment -n $ENVIRONMENT -p \
        '{"spec":{"template":{"spec":{"containers":[{"name":"backend","image":"'$REGISTRY'/student-pass-backend:'$IMAGE_TAG'"}]}}}}'
    kubectl patch deployment frontend-deployment -n $ENVIRONMENT -p \
        '{"spec":{"template":{"spec":{"containers":[{"name":"frontend","image":"'$REGISTRY'/student-pass-frontend:'$IMAGE_TAG'"}]}}}}'
    
    # Wait for full rollout
    kubectl rollout status deployment/backend-deployment -n $ENVIRONMENT --timeout=600s
    kubectl rollout status deployment/frontend-deployment -n $ENVIRONMENT --timeout=600s
    
    # Clean up canary
    kubectl delete deployment backend-deployment-canary -n $ENVIRONMENT --ignore-not-found=true
    kubectl delete deployment frontend-deployment-canary -n $ENVIRONMENT --ignore-not-found=true
    
    success "Canary deployment completed"
}

rollback_canary() {
    warning "Rolling back canary deployment..."
    kubectl delete deployment backend-deployment-canary -n $ENVIRONMENT --ignore-not-found=true
    kubectl delete deployment frontend-deployment-canary -n $ENVIRONMENT --ignore-not-found=true
}

run_health_checks() {
    local version=${1:-""}
    log "Running health checks..."
    
    # Get ingress URL
    INGRESS_URL=$(kubectl get ingress student-pass-ingress -n $ENVIRONMENT -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "localhost")
    
    # Health check endpoints
    ENDPOINTS=(
        "http://$INGRESS_URL/health"
        "http://$INGRESS_URL/api/health"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        log "Checking $endpoint..."
        
        # Retry logic
        for i in {1..5}; do
            if curl -f -s "$endpoint" > /dev/null; then
                success "Health check passed: $endpoint"
                break
            elif [[ $i -eq 5 ]]; then
                error "Health check failed after 5 attempts: $endpoint"
                return 1
            else
                warning "Health check attempt $i failed, retrying..."
                sleep 10
            fi
        done
    done
    
    success "All health checks passed"
}

deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    # Add Prometheus Helm repo
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Install Prometheus
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --create-namespace \
        --values monitoring/prometheus/values.yaml \
        --set prometheus.prometheusSpec.configMaps[0]=prometheus-config
    
    # Install Grafana dashboards
    kubectl create configmap grafana-dashboards \
        --from-file=monitoring/grafana/dashboards/ \
        --namespace=monitoring \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "Monitoring stack deployed"
}

cleanup() {
    log "Cleaning up deployment resources..."
    
    # Remove completed migration jobs older than 1 day
    kubectl get jobs -n $ENVIRONMENT --field-selector status.successful=1 -o json | \
        jq '.items[] | select(.metadata.creationTimestamp < (now - 86400 | todate)) | .metadata.name' -r | \
        xargs -r kubectl delete job -n $ENVIRONMENT
    
    success "Cleanup completed"
}

main() {
    log "Starting deployment to $ENVIRONMENT environment with $DEPLOY_STRATEGY strategy"
    log "Image tag: $IMAGE_TAG"
    
    check_prerequisites
    build_and_push_images
    deploy_infrastructure
    deploy_applications
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        deploy_monitoring
    fi
    
    run_health_checks
    cleanup
    
    success "Deployment completed successfully!"
    log "Application URLs:"
    log "  Frontend: https://$(kubectl get ingress student-pass-ingress -n $ENVIRONMENT -o jsonpath='{.spec.rules[0].host}')"
    log "  Backend API: https://$(kubectl get ingress student-pass-ingress -n $ENVIRONMENT -o jsonpath='{.spec.rules[1].host}')"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "  Grafana: http://$(kubectl get service prometheus-grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'):3000"
    fi
}

# Trap errors and cleanup
trap 'error "Deployment failed. Check the logs above for details."' ERR

# Run main function
main "$@"