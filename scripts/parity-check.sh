#!/bin/bash

# =============================================================================
# AIVO Platform - Complete Feature Parity Check
# Week 49: Feature Parity Audit
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Logging functions
log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN_COUNT++))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_header() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
}

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo ""
echo "=============================================="
echo "  AIVO Platform - Feature Parity Check"
echo "  Running comprehensive validation..."
echo "=============================================="
echo ""

# =============================================================================
# 1. CHECK ALL USER PORTALS
# =============================================================================

log_header "1. Checking User Portals"

portals=(
    "web-learner:Learner Portal"
    "web-parent:Parent Portal"
    "web-teacher:Teacher Portal"
    "web-district:District Admin Portal"
    "web-platform-admin:Super Admin Portal"
)

for portal_entry in "${portals[@]}"; do
    IFS=':' read -r portal_dir portal_name <<< "$portal_entry"

    log_info "Checking $portal_name ($portal_dir)..."

    # Check if portal exists
    if [ -d "apps/$portal_dir" ]; then
        log_pass "$portal_name directory exists"

        # Check package.json
        if [ -f "apps/$portal_dir/package.json" ]; then
            log_pass "$portal_name has package.json"
        else
            log_fail "$portal_name missing package.json"
        fi

        # Check source directory
        if [ -d "apps/$portal_dir/src" ]; then
            log_pass "$portal_name has src directory"
        else
            log_fail "$portal_name missing src directory"
        fi

        # Check for key directories
        if [ -d "apps/$portal_dir/src/components" ] || [ -d "apps/$portal_dir/src/app" ]; then
            log_pass "$portal_name has components/app structure"
        else
            log_warn "$portal_name missing standard component structure"
        fi

        # Check for tests
        if [ -d "apps/$portal_dir/__tests__" ] || [ -d "apps/$portal_dir/e2e" ] || [ -d "apps/$portal_dir/test" ]; then
            log_pass "$portal_name has test directory"
        else
            log_warn "$portal_name missing test directory"
        fi

        # Try to verify build configuration
        if [ -f "apps/$portal_dir/next.config.js" ] || [ -f "apps/$portal_dir/next.config.mjs" ] || [ -f "apps/$portal_dir/next.config.ts" ]; then
            log_pass "$portal_name has Next.js configuration"
        elif [ -f "apps/$portal_dir/vite.config.ts" ]; then
            log_pass "$portal_name has Vite configuration"
        else
            log_warn "$portal_name missing build configuration"
        fi
    else
        log_fail "$portal_name directory missing"
    fi

    echo ""
done

# =============================================================================
# 2. CHECK BACKEND SERVICES
# =============================================================================

log_header "2. Checking Backend Services"

# Core services that must exist
core_services=(
    "ai-orchestrator:AI Orchestrator"
    "assessment-svc:Assessment Service"
    "brain-engine:Brain Engine"
    "grading-engine:Grading Engine"
    "auth-svc:Auth Service"
    "profile-svc:Profile Service"
    "content-svc:Content Service"
    "curriculum-svc:Curriculum Service"
    "gamification-svc:Gamification Service"
    "analytics-svc:Analytics Service"
    "messaging-svc:Messaging Service"
    "notify-svc:Notification Service"
    "billing-svc:Billing Service"
    "iep-svc:IEP Service"
    "session-svc:Session Service"
    "tenant-svc:Tenant Service"
    "baseline-svc:Baseline Assessment Service"
)

for service_entry in "${core_services[@]}"; do
    IFS=':' read -r service_dir service_name <<< "$service_entry"

    if [ -d "services/$service_dir" ]; then
        log_pass "$service_name exists"

        # Check for Dockerfile
        if [ -f "services/$service_dir/Dockerfile" ]; then
            log_pass "$service_name has Dockerfile"
        else
            log_warn "$service_name missing Dockerfile"
        fi

        # Check for Prisma or migrations
        if [ -d "services/$service_dir/prisma" ]; then
            log_pass "$service_name has Prisma schema"
        elif [ -d "services/$service_dir/migrations" ]; then
            log_pass "$service_name has SQL migrations"
        fi

        # Check for tests
        if [ -d "services/$service_dir/test" ] || [ -d "services/$service_dir/__tests__" ] || [ -d "services/$service_dir/tests" ]; then
            log_pass "$service_name has tests"
        else
            log_warn "$service_name missing tests"
        fi
    else
        log_fail "$service_name missing"
    fi
done

echo ""

# =============================================================================
# 3. CHECK DATABASE MIGRATIONS
# =============================================================================

log_header "3. Checking Database Migrations"

# Count Prisma migrations
prisma_count=0
for service in services/*/; do
    if [ -d "${service}prisma/migrations" ]; then
        migration_count=$(ls -1 "${service}prisma/migrations" 2>/dev/null | wc -l)
        ((prisma_count+=migration_count))
    fi
done
log_info "Found $prisma_count Prisma migration directories across services"

# Count SQL migrations
sql_count=0
for service in services/*/; do
    if [ -d "${service}migrations" ]; then
        sql_files=$(find "${service}migrations" -name "*.sql" 2>/dev/null | wc -l)
        ((sql_count+=sql_files))
    fi
done
log_info "Found $sql_count SQL migration files across services"

if [ $prisma_count -gt 0 ] || [ $sql_count -gt 0 ]; then
    log_pass "Database migrations exist"
else
    log_fail "No database migrations found"
fi

# =============================================================================
# 4. CHECK INTEGRATIONS
# =============================================================================

log_header "4. Checking Integration Support"

integrations=(
    "stripe:Stripe Payment Integration"
    "saml:SAML SSO Integration"
    "oidc:OIDC SSO Integration"
    "lti:LTI Integration"
    "sis:SIS Integration"
    "edfi:Ed-Fi Integration"
    "scorm:SCORM Integration"
)

for integration_entry in "${integrations[@]}"; do
    IFS=':' read -r integration_key integration_name <<< "$integration_entry"

    # Search for integration in services
    if grep -rqi "$integration_key" services/ --include="*.ts" --include="*.js" --include="*.py" 2>/dev/null; then
        log_pass "$integration_name found"
    else
        log_warn "$integration_name not found"
    fi
done

# Check for dedicated integration services
if [ -d "services/integration-svc" ]; then
    log_pass "Integration service exists"
fi

if [ -d "services/sis-sync-svc" ]; then
    log_pass "SIS Sync service exists"
fi

if [ -d "services/lti-svc" ]; then
    log_pass "LTI service exists"
fi

if [ -d "services/scorm-svc" ]; then
    log_pass "SCORM service exists"
fi

if [ -d "services/edfi-svc" ]; then
    log_pass "Ed-Fi service exists"
fi

# =============================================================================
# 5. CHECK ACCESSIBILITY SUPPORT
# =============================================================================

log_header "5. Checking Accessibility Support"

# Check for a11y package
if [ -d "packages/a11y" ]; then
    log_pass "Accessibility package exists"
fi

# Check for accessibility tests
if find . -name "*.a11y.spec.ts" -o -name "*accessibility*" 2>/dev/null | grep -q .; then
    log_pass "Accessibility tests found"
else
    log_warn "Accessibility tests not found"
fi

# Check for WCAG compliance tests
if grep -rq "wcag" tests/ apps/ 2>/dev/null; then
    log_pass "WCAG compliance testing found"
else
    log_warn "WCAG compliance testing not explicitly found"
fi

# =============================================================================
# 6. CHECK COMPLIANCE & SECURITY
# =============================================================================

log_header "6. Checking Compliance & Security"

# Check for compliance services
compliance_services=(
    "consent-svc:Consent Management (COPPA)"
    "dsr-svc:Data Subject Rights (GDPR)"
    "audit-svc:Audit Logging"
    "compliance-svc:Compliance Tracking"
    "legal-hold-svc:Legal Hold Management"
)

for service_entry in "${compliance_services[@]}"; do
    IFS=':' read -r service_dir service_name <<< "$service_entry"

    if [ -d "services/$service_dir" ]; then
        log_pass "$service_name exists"
    else
        log_fail "$service_name missing"
    fi
done

# Check for RBAC
if [ -d "libs/ts-rbac" ]; then
    log_pass "RBAC library exists"
fi

# Check for security tests
if [ -d "tests/security" ]; then
    log_pass "Security tests directory exists"
fi

# =============================================================================
# 7. CHECK SHARED LIBRARIES
# =============================================================================

log_header "7. Checking Shared Libraries"

libraries=(
    "ts-types:TypeScript Types"
    "ts-utils:TypeScript Utilities"
    "ts-shared:Shared Components"
    "ts-data-access:Data Access Layer"
    "ts-observability:Observability/Logging"
    "ts-resilience:Resilience Patterns"
    "ts-policy-engine:Policy Engine"
    "ui-web:Web UI Components"
    "design-tokens:Design Tokens"
    "flutter-common:Flutter Common"
)

for lib_entry in "${libraries[@]}"; do
    IFS=':' read -r lib_dir lib_name <<< "$lib_entry"

    if [ -d "libs/$lib_dir" ]; then
        log_pass "$lib_name exists"
    else
        log_warn "$lib_name missing"
    fi
done

# =============================================================================
# 8. CHECK INFRASTRUCTURE
# =============================================================================

log_header "8. Checking Infrastructure"

# Check Terraform
if [ -d "infrastructure/terraform" ]; then
    log_pass "Terraform configuration exists"

    for env in development staging production; do
        if [ -d "infrastructure/terraform/$env" ]; then
            log_pass "Terraform $env environment exists"
        else
            log_warn "Terraform $env environment missing"
        fi
    done
fi

# Check Kubernetes
if [ -d "infra/k8s" ]; then
    log_pass "Kubernetes manifests exist"

    deployment_count=$(ls -1 infra/k8s/deployments/*.yaml 2>/dev/null | wc -l)
    log_info "Found $deployment_count K8s deployment manifests"
fi

# Check Helm charts
if [ -d "infrastructure/helm" ]; then
    log_pass "Helm charts exist"
fi

# Check monitoring
if [ -d "infra/prometheus" ]; then
    log_pass "Prometheus configuration exists"
fi

if [ -d "infra/grafana" ]; then
    log_pass "Grafana dashboards exist"
fi

if [ -d "infra/loki" ]; then
    log_pass "Loki log aggregation exists"
fi

# =============================================================================
# 9. CHECK CI/CD WORKFLOWS
# =============================================================================

log_header "9. Checking CI/CD Workflows"

workflows=(
    "ci.yml:CI Pipeline"
    "deploy.yml:Deployment Pipeline"
    "e2e-testing.yml:E2E Testing"
    "integration-tests.yml:Integration Tests"
    "performance.yml:Performance Testing"
    "security-scan.yml:Security Scanning"
)

for workflow_entry in "${workflows[@]}"; do
    IFS=':' read -r workflow_file workflow_name <<< "$workflow_entry"

    if [ -f ".github/workflows/$workflow_file" ]; then
        log_pass "$workflow_name workflow exists"
    else
        log_warn "$workflow_name workflow missing"
    fi
done

# =============================================================================
# 10. CHECK TESTS
# =============================================================================

log_header "10. Checking Test Infrastructure"

# Check test directories
if [ -d "tests/integration" ]; then
    log_pass "Integration tests directory exists"
fi

if [ -d "tests/performance" ]; then
    log_pass "Performance tests directory exists"
fi

if [ -d "tests/security" ]; then
    log_pass "Security tests directory exists"
fi

if [ -d "tests/e2e-mobile" ]; then
    log_pass "Mobile E2E tests directory exists"
fi

# Count test files
total_tests=$(find . -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l)
log_info "Found $total_tests test files total"

# =============================================================================
# SUMMARY
# =============================================================================

log_header "PARITY CHECK SUMMARY"

echo ""
echo "Results:"
echo "  - Passed:   $PASS_COUNT"
echo "  - Failed:   $FAIL_COUNT"
echo "  - Warnings: $WARN_COUNT"
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ $TOTAL -gt 0 ]; then
    PERCENTAGE=$((PASS_COUNT * 100 / TOTAL))
    echo "Pass Rate: $PERCENTAGE%"
else
    PERCENTAGE=0
fi

echo ""

# Determine exit status
if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}PARITY CHECK FAILED${NC}"
    echo "Please address the $FAIL_COUNT failed checks before deployment."
    exit 1
elif [ $WARN_COUNT -gt 5 ]; then
    echo -e "${YELLOW}PARITY CHECK PASSED WITH WARNINGS${NC}"
    echo "Consider addressing the $WARN_COUNT warnings."
    exit 0
else
    echo -e "${GREEN}PARITY CHECK PASSED${NC}"
    exit 0
fi
