#!/usr/bin/env bash
# =============================================================================
# AIVO Platform - Apply Terraform Configuration
# =============================================================================
# Applies Terraform configuration for a specific environment.
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

Apply Terraform configuration for an AIVO environment.

Options:
    -e ENVIRONMENT  Environment name: dev, staging, or production (required)
    -a              Auto-approve (skip confirmation prompts)
    -p              Plan only (don't apply)
    -t TARGET       Target specific resource (can be used multiple times)
    -d              Enable debug output
    -h              Show this help message

Examples:
    $(basename "$0") -e dev                    # Plan and apply dev environment
    $(basename "$0") -e staging -p             # Plan only for staging
    $(basename "$0") -e production -a          # Apply production with auto-approve
    $(basename "$0") -e dev -t module.gke      # Target specific module

EOF
    exit 1
}

validate_environment() {
    local env_dir="${TERRAFORM_DIR}/environments/${ENVIRONMENT}"
    
    if [[ ! -d "$env_dir" ]]; then
        log_error "Environment directory not found: $env_dir"
        exit 1
    fi
    
    if [[ ! -f "${env_dir}/main.tf" ]]; then
        log_error "main.tf not found in environment directory."
        exit 1
    fi
    
    if [[ ! -f "${env_dir}/terraform.tfvars" ]]; then
        log_warn "terraform.tfvars not found. Using terraform.tfvars.example as reference."
        if [[ -f "${env_dir}/terraform.tfvars.example" ]]; then
            log_info "Copy and customize terraform.tfvars.example to terraform.tfvars"
        fi
    fi
}

run_terraform_init() {
    log_step "Initializing Terraform..."
    terraform init -upgrade
}

run_terraform_validate() {
    log_step "Validating Terraform configuration..."
    terraform validate
}

run_terraform_plan() {
    log_step "Creating Terraform plan..."
    
    local plan_args=("-out=tfplan" "-detailed-exitcode")
    
    # Add targets if specified
    for target in "${TARGETS[@]}"; do
        plan_args+=("-target=$target")
    done
    
    set +e
    terraform plan "${plan_args[@]}"
    local exit_code=$?
    set -e
    
    case $exit_code in
        0)
            log_info "No changes required."
            return 1
            ;;
        1)
            log_error "Terraform plan failed."
            exit 1
            ;;
        2)
            log_info "Changes detected."
            return 0
            ;;
    esac
}

run_terraform_apply() {
    log_step "Applying Terraform configuration..."
    
    local apply_args=("tfplan")
    
    if [[ "$AUTO_APPROVE" == "true" ]]; then
        apply_args+=("-auto-approve")
    fi
    
    terraform apply "${apply_args[@]}"
    
    # Clean up plan file
    rm -f tfplan
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    local ENVIRONMENT=""
    local AUTO_APPROVE="false"
    local PLAN_ONLY="false"
    local DEBUG="false"
    local TARGETS=()
    
    # Parse arguments
    while getopts ":e:apt:dh" opt; do
        case ${opt} in
            e) ENVIRONMENT="$OPTARG" ;;
            a) AUTO_APPROVE="true" ;;
            p) PLAN_ONLY="true" ;;
            t) TARGETS+=("$OPTARG") ;;
            d) DEBUG="true" ;;
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
    
    # Enable debug if requested
    if [[ "$DEBUG" == "true" ]]; then
        export TF_LOG=DEBUG
    fi
    
    echo ""
    echo "=========================================="
    echo "  AIVO Platform - Terraform Apply"
    echo "=========================================="
    echo "  Environment: $ENVIRONMENT"
    echo "  Plan Only:   $PLAN_ONLY"
    echo "  Auto-Approve: $AUTO_APPROVE"
    if [[ ${#TARGETS[@]} -gt 0 ]]; then
        echo "  Targets:     ${TARGETS[*]}"
    fi
    echo "=========================================="
    echo ""
    
    # Validate environment
    validate_environment
    
    # Change to environment directory
    cd "${TERRAFORM_DIR}/environments/${ENVIRONMENT}"
    
    # Run Terraform commands
    run_terraform_init
    run_terraform_validate
    
    if run_terraform_plan; then
        if [[ "$PLAN_ONLY" == "true" ]]; then
            log_info "Plan complete. Skipping apply (plan-only mode)."
            rm -f tfplan
        else
            if [[ "$AUTO_APPROVE" != "true" ]]; then
                echo ""
                read -p "Apply these changes? (y/N) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log_info "Aborted."
                    rm -f tfplan
                    exit 0
                fi
            fi
            
            run_terraform_apply
            
            echo ""
            log_info "=========================================="
            log_info "  Terraform apply complete!"
            log_info "=========================================="
        fi
    else
        rm -f tfplan
    fi
}

main "$@"
