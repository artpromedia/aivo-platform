#!/usr/bin/env bash
# =============================================================================
# AIVO Platform - Destroy Terraform Infrastructure
# =============================================================================
# Destroys Terraform infrastructure for a specific environment.
# Includes safety checks to prevent accidental destruction.
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"

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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

usage() {
    cat << EOF
Usage: $(basename "$0") -e ENVIRONMENT [OPTIONS]

Destroy Terraform infrastructure for an AIVO environment.

⚠️  WARNING: This will destroy all infrastructure in the specified environment!
    Data will be permanently deleted. Use with extreme caution.

Options:
    -e ENVIRONMENT  Environment name: dev, staging, or production (required)
    -f              Force destroy (skip additional confirmation for production)
    -t TARGET       Target specific resource (can be used multiple times)
    -h              Show this help message

Examples:
    $(basename "$0") -e dev                    # Destroy dev environment
    $(basename "$0") -e staging -t module.gke  # Destroy only GKE in staging

EOF
    exit 1
}

confirm_destruction() {
    echo ""
    echo -e "${RED}=========================================="
    echo "  ⚠️  DANGER ZONE"
    echo "==========================================${NC}"
    echo ""
    echo "You are about to DESTROY all infrastructure in: $ENVIRONMENT"
    echo ""
    echo "This will permanently delete:"
    echo "  - GKE cluster and all workloads"
    echo "  - Cloud SQL databases and all data"
    echo "  - Redis instances and cached data"
    echo "  - Storage buckets and all objects"
    echo "  - IAM service accounts"
    echo "  - Secrets in Secret Manager"
    echo "  - Monitoring configuration"
    echo "  - CDN configuration"
    echo ""
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo -e "${RED}⚠️  THIS IS PRODUCTION! Data loss will be PERMANENT!${NC}"
        echo ""
        
        if [[ "$FORCE" != "true" ]]; then
            echo "To confirm, type the environment name: $ENVIRONMENT"
            read -p "> " confirmation
            
            if [[ "$confirmation" != "$ENVIRONMENT" ]]; then
                log_error "Confirmation failed. Aborting."
                exit 1
            fi
            
            echo ""
            echo "Are you ABSOLUTELY sure? Type 'destroy-production' to confirm:"
            read -p "> " final_confirmation
            
            if [[ "$final_confirmation" != "destroy-production" ]]; then
                log_error "Final confirmation failed. Aborting."
                exit 1
            fi
        else
            log_warn "Force mode enabled. Skipping additional production confirmation."
        fi
    else
        echo "To confirm, type the environment name: $ENVIRONMENT"
        read -p "> " confirmation
        
        if [[ "$confirmation" != "$ENVIRONMENT" ]]; then
            log_error "Confirmation failed. Aborting."
            exit 1
        fi
    fi
}

run_terraform_destroy() {
    log_step "Planning destruction..."
    
    local destroy_args=("-auto-approve")
    
    # Add targets if specified
    for target in "${TARGETS[@]}"; do
        destroy_args+=("-target=$target")
    done
    
    log_step "Destroying infrastructure..."
    terraform destroy "${destroy_args[@]}"
}

cleanup_state_bucket() {
    local bucket_name="aivo-terraform-state-${ENVIRONMENT}"
    
    echo ""
    read -p "Delete Terraform state bucket ($bucket_name)? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_step "Deleting state bucket..."
        gsutil -m rm -r "gs://${bucket_name}/**" 2>/dev/null || true
        gsutil rb "gs://${bucket_name}" 2>/dev/null || true
        log_info "State bucket deleted."
    else
        log_info "State bucket preserved."
    fi
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    local ENVIRONMENT=""
    local FORCE="false"
    local TARGETS=()
    
    # Parse arguments
    while getopts ":e:ft:h" opt; do
        case ${opt} in
            e) ENVIRONMENT="$OPTARG" ;;
            f) FORCE="true" ;;
            t) TARGETS+=("$OPTARG") ;;
            h) usage ;;
            \?) log_error "Invalid option: -$OPTARG"; usage ;;
            :) log_error "Option -$OPTARG requires an argument"; usage ;;
        esac
    done
    
    # Validate required arguments
    if [[ -z "$ENVIRONMENT" ]]; then
        log_error "Environment is required."
        usage
    fi
    
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
        log_error "Environment must be one of: dev, staging, production"
        usage
    fi
    
    # Confirm destruction
    confirm_destruction
    
    # Change to environment directory
    cd "${TERRAFORM_DIR}/environments/${ENVIRONMENT}"
    
    # Initialize Terraform
    log_step "Initializing Terraform..."
    terraform init
    
    # Run destruction
    run_terraform_destroy
    
    # Optionally clean up state bucket
    cleanup_state_bucket
    
    echo ""
    log_info "=========================================="
    log_info "  Destruction complete!"
    log_info "=========================================="
}

main "$@"
