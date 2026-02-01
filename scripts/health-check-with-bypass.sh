#!/bin/bash
# =============================================================================
# AIVO Platform - Stub Service Health Check Bypass Script
# =============================================================================
#
# This script provides health check functionality that properly handles
# stub services during CI/CD and deployment.
#
# Stub services (those returning HTTP 501) are excluded from health checks
# when their feature flags are disabled, preventing deployment failures.
#
# Usage:
#   ./scripts/health-check-with-bypass.sh [--verbose] [--fail-on-stub]
#
# Environment Variables:
#   FEATURE_RL_TUTORING, FEATURE_PEER_LEARNING, etc. - Feature flags
#   HEALTH_CHECK_TIMEOUT - Timeout in seconds (default: 5)
#   HEALTH_CHECK_RETRIES - Number of retries (default: 3)
#
# =============================================================================

set -e

# Configuration
TIMEOUT=${HEALTH_CHECK_TIMEOUT:-5}
RETRIES=${HEALTH_CHECK_RETRIES:-3}
VERBOSE=${1:-""}
FAIL_ON_STUB=${2:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Stub services and their feature flags
declare -A STUB_SERVICES=(
    ["rl-tutoring-svc"]="FEATURE_RL_TUTORING"
    ["peer-learning-svc"]="FEATURE_PEER_LEARNING"
    ["multimodal-analytics-svc"]="FEATURE_MULTIMODAL_ANALYTICS"
    ["gamification-svc"]="FEATURE_GAMIFICATION_PYTHON"
    ["content-intelligence-svc"]="FEATURE_CONTENT_INTELLIGENCE"
    ["cognitive-load-svc"]="FEATURE_COGNITIVE_LOAD"
    ["accessibility-ai-svc"]="FEATURE_ACCESSIBILITY_AI"
    ["specialized-support-svc"]="FEATURE_SPECIALIZED_SUPPORT"
)

# All services to check (production services)
PRODUCTION_SERVICES=(
    "auth-svc:3001"
    "tenant-svc:3002"
    "profile-svc:3003"
    "content-svc:3004"
    "session-svc:3005"
    "ai-orchestrator:3006"
    "billing-svc:3007"
    "notify-svc:3008"
    "messaging-svc:3009"
    "python-api-gateway:8000"
)

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

is_stub_service_enabled() {
    local service=$1
    local flag_var=${STUB_SERVICES[$service]}
    
    if [ -z "$flag_var" ]; then
        # Not a stub service
        return 0
    fi
    
    local flag_value=${!flag_var:-"false"}
    
    if [ "$flag_value" = "true" ] || [ "$flag_value" = "1" ]; then
        return 0  # Enabled
    else
        return 1  # Disabled
    fi
}

check_service_health() {
    local service=$1
    local port=$2
    local url="http://${service}:${port}/health"
    
    for i in $(seq 1 $RETRIES); do
        if curl -sf --max-time $TIMEOUT "$url" > /dev/null 2>&1; then
            return 0
        fi
        
        if [ "$VERBOSE" = "--verbose" ]; then
            log_warning "Retry $i/$RETRIES for $service..."
        fi
        sleep 1
    done
    
    return 1
}

main() {
    echo "=============================================="
    echo "AIVO Platform Health Check (with Stub Bypass)"
    echo "=============================================="
    echo ""
    
    local failed_services=()
    local skipped_services=()
    local healthy_services=()
    
    # Check production services
    log_info "Checking production services..."
    for service_entry in "${PRODUCTION_SERVICES[@]}"; do
        IFS=':' read -r service port <<< "$service_entry"
        
        if check_service_health "$service" "$port"; then
            log_success "$service is healthy"
            healthy_services+=("$service")
        else
            log_error "$service is unhealthy"
            failed_services+=("$service")
        fi
    done
    
    echo ""
    log_info "Checking stub services (feature flag controlled)..."
    
    # Check stub services
    for service in "${!STUB_SERVICES[@]}"; do
        flag_var=${STUB_SERVICES[$service]}
        flag_value=${!flag_var:-"false"}
        
        if is_stub_service_enabled "$service"; then
            # Service is enabled, check health
            if check_service_health "$service" "8000"; then
                log_success "$service is healthy (enabled)"
                healthy_services+=("$service")
            else
                log_error "$service is unhealthy (enabled but failing)"
                failed_services+=("$service")
            fi
        else
            # Service is disabled, skip health check
            log_warning "$service SKIPPED (feature flag disabled: $flag_var=false)"
            skipped_services+=("$service")
        fi
    done
    
    # Summary
    echo ""
    echo "=============================================="
    echo "Health Check Summary"
    echo "=============================================="
    echo -e "${GREEN}Healthy:${NC} ${#healthy_services[@]} services"
    echo -e "${YELLOW}Skipped:${NC} ${#skipped_services[@]} stub services (feature flags disabled)"
    echo -e "${RED}Failed:${NC} ${#failed_services[@]} services"
    echo ""
    
    if [ ${#skipped_services[@]} -gt 0 ]; then
        echo "Skipped stub services:"
        for service in "${skipped_services[@]}"; do
            echo "  - $service"
        done
        echo ""
    fi
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        echo "Failed services:"
        for service in "${failed_services[@]}"; do
            echo "  - $service"
        done
        echo ""
        
        if [ "$FAIL_ON_STUB" = "--fail-on-stub" ]; then
            log_error "Health check failed!"
            exit 1
        else
            # Only fail if non-stub services failed
            local non_stub_failures=0
            for service in "${failed_services[@]}"; do
                if [ -z "${STUB_SERVICES[$service]}" ]; then
                    non_stub_failures=$((non_stub_failures + 1))
                fi
            done
            
            if [ $non_stub_failures -gt 0 ]; then
                log_error "Health check failed! $non_stub_failures production service(s) unhealthy."
                exit 1
            else
                log_warning "Only stub services failed. Continuing..."
                exit 0
            fi
        fi
    fi
    
    log_success "All required services are healthy!"
    exit 0
}

main "$@"
