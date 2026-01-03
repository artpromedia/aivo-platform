#!/bin/bash
# ==============================================================================
# AIVO Platform - Deployment Helper Script
# ==============================================================================
# Usage: ./deploy.sh <environment> <service> [version]

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-}"
SERVICE="${2:-}"
VERSION="${3:-latest}"
NAMESPACE="aivo"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

usage() {
  echo "Usage: $0 <environment> <service> [version]"
  echo ""
  echo "Arguments:"
  echo "  environment  Target environment (development, staging, production)"
  echo "  service      Service name (auth-svc, content-svc, etc.)"
  echo "  version      Optional: Docker image tag (default: latest)"
  echo ""
  echo "Examples:"
  echo "  $0 staging auth-svc"
  echo "  $0 production content-svc v1.2.3"
  exit 1
}

validate_environment() {
  case $ENVIRONMENT in
    development|staging|production)
      return 0
      ;;
    *)
      log_error "Invalid environment: $ENVIRONMENT"
      echo "Valid environments: development, staging, production"
      exit 1
      ;;
  esac
}

get_cluster_name() {
  case $ENVIRONMENT in
    development)
      echo "aivo-development-eks"
      ;;
    staging)
      echo "aivo-staging-eks"
      ;;
    production)
      echo "aivo-production-eks"
      ;;
  esac
}

get_values_file() {
  case $ENVIRONMENT in
    development)
      echo "values-dev.yaml"
      ;;
    staging)
      echo "values-staging.yaml"
      ;;
    production)
      echo "values-prod.yaml"
      ;;
  esac
}

# Validation
if [ -z "$ENVIRONMENT" ] || [ -z "$SERVICE" ]; then
  usage
fi

validate_environment

# Main deployment logic
log_info "Starting deployment..."
log_info "Environment: $ENVIRONMENT"
log_info "Service: $SERVICE"
log_info "Version: $VERSION"

# Get cluster configuration
CLUSTER_NAME=$(get_cluster_name)
VALUES_FILE=$(get_values_file)
CHART_PATH="infrastructure/helm/services/$SERVICE"

# Check if chart exists
if [ ! -d "$CHART_PATH" ]; then
  log_error "Helm chart not found: $CHART_PATH"
  exit 1
fi

# Check if values file exists
if [ ! -f "$CHART_PATH/$VALUES_FILE" ]; then
  log_error "Values file not found: $CHART_PATH/$VALUES_FILE"
  exit 1
fi

# Configure kubectl
log_info "Configuring kubectl for cluster: $CLUSTER_NAME"
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region us-east-1

# Verify cluster connectivity
log_info "Verifying cluster connectivity..."
if ! kubectl cluster-info > /dev/null 2>&1; then
  log_error "Cannot connect to cluster"
  exit 1
fi

# Get ECR repository
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/aivo/$SERVICE"

# Check if image exists
log_info "Checking if image exists: $ECR_REPO:$VERSION"
if ! aws ecr describe-images --repository-name "aivo/$SERVICE" --image-ids imageTag="$VERSION" > /dev/null 2>&1; then
  log_warning "Image not found in ECR. Deployment may fail."
fi

# Create namespace if not exists
log_info "Ensuring namespace exists: $NAMESPACE"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Deploy with Helm
log_info "Deploying with Helm..."
helm upgrade --install "$SERVICE" "$CHART_PATH" \
  --namespace "$NAMESPACE" \
  --values "$CHART_PATH/$VALUES_FILE" \
  --set image.repository="$ECR_REPO" \
  --set image.tag="$VERSION" \
  --wait \
  --timeout 10m

# Verify deployment
log_info "Verifying deployment..."
if kubectl rollout status "deployment/$SERVICE" -n "$NAMESPACE" --timeout=300s; then
  log_success "Deployment completed successfully!"
else
  log_error "Deployment verification failed"
  exit 1
fi

# Get deployment info
log_info "Deployment summary:"
kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/name=$SERVICE"

echo ""
log_success "Deployment of $SERVICE to $ENVIRONMENT completed!"
