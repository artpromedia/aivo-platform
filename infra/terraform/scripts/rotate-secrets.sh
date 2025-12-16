#!/usr/bin/env bash
# =============================================================================
# AIVO Platform - Rotate Secrets Script
# =============================================================================
# Rotates auto-generated secrets (JWT keys, session keys, etc.)
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
Usage: $(basename "$0") -e ENVIRONMENT [-s SECRET_TYPE]

Rotate secrets for an AIVO environment.

Options:
    -e ENVIRONMENT  Environment name: dev, staging, or production (required)
    -s SECRET_TYPE  Specific secret to rotate (optional):
                    - jwt: JWT signing key
                    - session: Session encryption key
                    - api: API signing key
                    - lti: LTI keys
                    - all: All auto-generated secrets (default)
    -h              Show this help message

Examples:
    $(basename "$0") -e dev                    # Rotate all secrets in dev
    $(basename "$0") -e production -s jwt      # Rotate only JWT key in production

EOF
    exit 1
}

rotate_secret() {
    local secret_type="$1"
    local resource_name=""
    
    case "$secret_type" in
        jwt)
            resource_name="module.secrets.random_bytes.jwt_secret"
            ;;
        session)
            resource_name="module.secrets.random_bytes.session_key"
            ;;
        api)
            resource_name="module.secrets.random_bytes.api_signing_key"
            ;;
        lti)
            resource_name="module.secrets.tls_private_key.lti_key"
            ;;
        *)
            log_error "Unknown secret type: $secret_type"
            return 1
            ;;
    esac
    
    log_step "Rotating $secret_type secret..."
    
    # Taint the resource to force recreation
    terraform taint "$resource_name" 2>/dev/null || {
        log_warn "Could not taint $resource_name - it may not exist yet."
        return 0
    }
    
    log_info "Marked $secret_type for rotation."
}

apply_rotation() {
    log_step "Applying secret rotation..."
    
    terraform apply \
        -target=module.secrets \
        -auto-approve
    
    log_info "Secrets rotated successfully."
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    local ENVIRONMENT=""
    local SECRET_TYPE="all"
    
    # Parse arguments
    while getopts ":e:s:h" opt; do
        case ${opt} in
            e) ENVIRONMENT="$OPTARG" ;;
            s) SECRET_TYPE="$OPTARG" ;;
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
    
    echo ""
    echo "=========================================="
    echo "  AIVO Platform - Secret Rotation"
    echo "=========================================="
    echo "  Environment: $ENVIRONMENT"
    echo "  Secret Type: $SECRET_TYPE"
    echo "=========================================="
    echo ""
    
    log_warn "This will generate new secrets. Applications will need to be restarted."
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Aborted."
        exit 0
    fi
    
    # Change to environment directory
    cd "${TERRAFORM_DIR}/environments/${ENVIRONMENT}"
    
    # Initialize Terraform
    log_step "Initializing Terraform..."
    terraform init -upgrade
    
    # Rotate specified secrets
    if [[ "$SECRET_TYPE" == "all" ]]; then
        rotate_secret "jwt"
        rotate_secret "session"
        rotate_secret "api"
        rotate_secret "lti"
    else
        rotate_secret "$SECRET_TYPE"
    fi
    
    # Apply changes
    apply_rotation
    
    echo ""
    log_info "=========================================="
    log_info "  Secret rotation complete!"
    log_info "=========================================="
    echo ""
    log_warn "Remember to restart affected applications to pick up new secrets."
}

main "$@"
