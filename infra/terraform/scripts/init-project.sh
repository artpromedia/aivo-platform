#!/usr/bin/env bash
# =============================================================================
# AIVO Platform - GCP Project Initialization Script
# =============================================================================
# This script initializes a GCP project for AIVO infrastructure deployment.
# It enables required APIs and creates the Terraform state bucket.
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
REGION="${REGION:-us-central1}"

# -----------------------------------------------------------------------------
# Functions
# -----------------------------------------------------------------------------

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

usage() {
    cat << EOF
Usage: $(basename "$0") -p PROJECT_ID -e ENVIRONMENT [-r REGION]

Initialize a GCP project for AIVO infrastructure.

Options:
    -p PROJECT_ID   GCP project ID (required)
    -e ENVIRONMENT  Environment name: dev, staging, or production (required)
    -r REGION       GCP region (default: us-central1)
    -h              Show this help message

Examples:
    $(basename "$0") -p aivo-dev-12345 -e dev
    $(basename "$0") -p aivo-prod-67890 -e production -r us-east1

EOF
    exit 1
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install version 1.5 or later."
        exit 1
    fi
    
    # Check Terraform version
    TF_VERSION=$(terraform version -json | jq -r '.terraform_version')
    TF_MAJOR=$(echo "$TF_VERSION" | cut -d. -f1)
    TF_MINOR=$(echo "$TF_VERSION" | cut -d. -f2)
    
    if [[ "$TF_MAJOR" -lt 1 ]] || [[ "$TF_MAJOR" -eq 1 && "$TF_MINOR" -lt 5 ]]; then
        log_error "Terraform version 1.5 or later is required. Current version: $TF_VERSION"
        exit 1
    fi
    
    log_info "Prerequisites check passed."
}

enable_apis() {
    log_info "Enabling required GCP APIs..."
    
    local apis=(
        "compute.googleapis.com"
        "container.googleapis.com"
        "sqladmin.googleapis.com"
        "redis.googleapis.com"
        "storage.googleapis.com"
        "secretmanager.googleapis.com"
        "servicenetworking.googleapis.com"
        "cloudresourcemanager.googleapis.com"
        "iam.googleapis.com"
        "iamcredentials.googleapis.com"
        "logging.googleapis.com"
        "monitoring.googleapis.com"
        "cloudbuild.googleapis.com"
        "artifactregistry.googleapis.com"
        "cloudkms.googleapis.com"
        "dns.googleapis.com"
        "certificatemanager.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        log_info "Enabling $api..."
        gcloud services enable "$api" --project="$PROJECT_ID" --quiet
    done
    
    log_info "All required APIs enabled."
}

create_state_bucket() {
    local bucket_name="aivo-terraform-state-${ENVIRONMENT}"
    
    log_info "Creating Terraform state bucket: $bucket_name"
    
    if gsutil ls -b "gs://${bucket_name}" &> /dev/null; then
        log_warn "Bucket $bucket_name already exists."
    else
        gsutil mb -p "$PROJECT_ID" -l "$REGION" -b on "gs://${bucket_name}"
        
        # Enable versioning
        gsutil versioning set on "gs://${bucket_name}"
        
        # Set lifecycle policy (keep 30 versions)
        cat > /tmp/lifecycle.json << EOF
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"numNewerVersions": 30}
    }
  ]
}
EOF
        gsutil lifecycle set /tmp/lifecycle.json "gs://${bucket_name}"
        rm /tmp/lifecycle.json
        
        log_info "Terraform state bucket created and configured."
    fi
}

create_service_account() {
    local sa_name="terraform-deployer"
    local sa_email="${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    log_info "Creating Terraform deployer service account..."
    
    if gcloud iam service-accounts describe "$sa_email" --project="$PROJECT_ID" &> /dev/null; then
        log_warn "Service account $sa_email already exists."
    else
        gcloud iam service-accounts create "$sa_name" \
            --project="$PROJECT_ID" \
            --display-name="Terraform Deployer" \
            --description="Service account for Terraform deployments"
        
        log_info "Granting required roles..."
        
        local roles=(
            "roles/compute.admin"
            "roles/container.admin"
            "roles/cloudsql.admin"
            "roles/redis.admin"
            "roles/storage.admin"
            "roles/secretmanager.admin"
            "roles/iam.serviceAccountAdmin"
            "roles/iam.serviceAccountUser"
            "roles/iam.workloadIdentityPoolAdmin"
            "roles/servicenetworking.networksAdmin"
            "roles/monitoring.admin"
            "roles/logging.admin"
            "roles/resourcemanager.projectIamAdmin"
        )
        
        for role in "${roles[@]}"; do
            gcloud projects add-iam-policy-binding "$PROJECT_ID" \
                --member="serviceAccount:$sa_email" \
                --role="$role" \
                --quiet
        done
        
        log_info "Service account created with required roles."
    fi
    
    echo ""
    log_info "To authenticate as the Terraform deployer, run:"
    echo "    gcloud auth activate-service-account --key-file=<KEY_FILE>"
    echo "    Or set GOOGLE_APPLICATION_CREDENTIALS=<KEY_FILE>"
}

setup_artifact_registry() {
    local repo_name="aivo-containers"
    
    log_info "Setting up Artifact Registry..."
    
    if gcloud artifacts repositories describe "$repo_name" --location="$REGION" --project="$PROJECT_ID" &> /dev/null; then
        log_warn "Artifact Registry repository $repo_name already exists."
    else
        gcloud artifacts repositories create "$repo_name" \
            --project="$PROJECT_ID" \
            --location="$REGION" \
            --repository-format=docker \
            --description="AIVO container images"
        
        log_info "Artifact Registry repository created."
    fi
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    # Parse arguments
    while getopts ":p:e:r:h" opt; do
        case ${opt} in
            p) PROJECT_ID="$OPTARG" ;;
            e) ENVIRONMENT="$OPTARG" ;;
            r) REGION="$OPTARG" ;;
            h) usage ;;
            \?) log_error "Invalid option: -$OPTARG"; usage ;;
            :) log_error "Option -$OPTARG requires an argument"; usage ;;
        esac
    done
    
    # Validate required arguments
    if [[ -z "${PROJECT_ID:-}" ]]; then
        log_error "Project ID is required."
        usage
    fi
    
    if [[ -z "${ENVIRONMENT:-}" ]]; then
        log_error "Environment is required."
        usage
    fi
    
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
        log_error "Environment must be one of: dev, staging, production"
        usage
    fi
    
    echo ""
    echo "=========================================="
    echo "  AIVO Platform - GCP Project Setup"
    echo "=========================================="
    echo "  Project:     $PROJECT_ID"
    echo "  Environment: $ENVIRONMENT"
    echo "  Region:      $REGION"
    echo "=========================================="
    echo ""
    
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Aborted."
        exit 0
    fi
    
    # Set project
    gcloud config set project "$PROJECT_ID"
    
    # Run setup steps
    check_prerequisites
    enable_apis
    create_state_bucket
    create_service_account
    setup_artifact_registry
    
    echo ""
    log_info "=========================================="
    log_info "  Project initialization complete!"
    log_info "=========================================="
    echo ""
    log_info "Next steps:"
    echo "  1. Navigate to: infra/terraform/environments/${ENVIRONMENT}"
    echo "  2. Copy terraform.tfvars.example to terraform.tfvars"
    echo "  3. Fill in the required values"
    echo "  4. Run: terraform init"
    echo "  5. Run: terraform plan"
    echo "  6. Run: terraform apply"
    echo ""
}

main "$@"
