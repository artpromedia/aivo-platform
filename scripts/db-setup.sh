#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# AIVO Platform Database Setup - Main Orchestration Script (Bash)
# ══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./db-setup.sh [command]
#
# Commands:
#   all      - Run migrations then seeding (default)
#   migrate  - Run migrations only
#   seed     - Run seeding only
#   reset    - Drop, recreate, migrate, and seed
#   status   - Check migration status
#
# ══════════════════════════════════════════════════════════════════════════════

set -e

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICES_DIR="$ROOT_DIR/services"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Service migration order (respects foreign key dependencies)
SERVICES=(
    # 1. Core Infrastructure
    "tenant-svc"
    "auth-svc"
    
    # 2. User Profiles
    "profile-svc"
    
    # 3. Content Layer
    "content-svc"
    "content-authoring-svc"
    
    # 4. Assessment & Learning
    "assessment-svc"
    "session-svc"
    "baseline-svc"
    
    # 5. Personalization
    "personalization-svc"
    "learner-model-svc"
    
    # 6. Engagement & Gamification
    "engagement-svc"
    "focus-svc"
    
    # 7. Homework & Goals
    "homework-helper-svc"
    "goal-svc"
    "teacher-planning-svc"
    
    # 8. Analytics & Research
    "analytics-svc"
    "retention-svc"
    "research-svc"
    "experimentation-svc"
    
    # 9. Marketplace & Billing
    "marketplace-svc"
    "billing-svc"
    "payments-svc"
    
    # 10. Communication
    "notify-svc"
    "messaging-svc"
    
    # 11. Integration & Sync
    "integration-svc"
    "lti-svc"
    "sis-sync-svc"
    
    # 12. Safety & Compliance
    "consent-svc"
    "dsr-svc"
    
    # 13. Tools & Sandbox
    "embedded-tools-svc"
    "sandbox-svc"
    "device-mgmt-svc"
    
    # 14. AI & Reports
    "ai-orchestrator"
    "reports-svc"
    "collaboration-svc"
)

# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${YELLOW}📦 $1${NC}"
}

has_prisma() {
    local service=$1
    [[ -f "$SERVICES_DIR/$service/prisma/schema.prisma" ]]
}

has_seed() {
    local service=$1
    [[ -f "$SERVICES_DIR/$service/prisma/seed.ts" ]]
}

# ══════════════════════════════════════════════════════════════════════════════
# MIGRATION FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

run_migration() {
    local service=$1
    
    if ! has_prisma "$service"; then
        print_warning "Skipping $service (no prisma directory)"
        return 0
    fi
    
    print_step "Migrating $service..."
    
    cd "$SERVICES_DIR/$service"
    
    if npx prisma migrate deploy 2>&1; then
        print_success "$service migrated successfully"
        cd - > /dev/null
        return 0
    else
        print_error "$service migration failed"
        cd - > /dev/null
        return 1
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
# SEED FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

run_seed() {
    local service=$1
    
    if ! has_seed "$service"; then
        print_warning "Skipping $service (no seed.ts)"
        return 0
    fi
    
    print_step "Seeding $service..."
    
    cd "$SERVICES_DIR/$service"
    
    if npx prisma db seed 2>&1; then
        print_success "$service seeded successfully"
        cd - > /dev/null
        return 0
    else
        print_error "$service seeding failed"
        cd - > /dev/null
        return 1
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
# RESET FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

run_reset() {
    local service=$1
    
    if ! has_prisma "$service"; then
        print_warning "Skipping $service (no prisma directory)"
        return 0
    fi
    
    print_step "Resetting $service..."
    
    cd "$SERVICES_DIR/$service"
    
    if npx prisma migrate reset --force 2>&1; then
        print_success "$service reset successfully"
        cd - > /dev/null
        return 0
    else
        print_error "$service reset failed"
        cd - > /dev/null
        return 1
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ══════════════════════════════════════════════════════════════════════════════

COMMAND=${1:-"all"}

print_header "AIVO Platform Database Setup"

# Load environment
if [[ -f "$ROOT_DIR/.env" ]]; then
    export $(cat "$ROOT_DIR/.env" | grep -v '^#' | xargs)
    print_info "Loaded environment from .env"
fi

SUCCESS_COUNT=0
FAIL_COUNT=0

case $COMMAND in
    "migrate")
        print_info "Running migrations only..."
        echo ""
        
        for service in "${SERVICES[@]}"; do
            if run_migration "$service"; then
                ((SUCCESS_COUNT++))
            else
                ((FAIL_COUNT++))
            fi
        done
        ;;
    
    "seed")
        print_info "Running seeds only..."
        echo ""
        
        for service in "${SERVICES[@]}"; do
            if run_seed "$service"; then
                ((SUCCESS_COUNT++))
            else
                ((FAIL_COUNT++))
            fi
        done
        ;;
    
    "reset")
        echo ""
        echo -e "${RED}⚠️  WARNING: This will DROP all databases and recreate them!${NC}"
        echo ""
        read -p "Are you sure you want to continue? (yes/N) " confirm
        
        if [[ "$confirm" != "yes" ]]; then
            print_info "Aborted."
            exit 0
        fi
        
        echo ""
        
        for service in "${SERVICES[@]}"; do
            if run_reset "$service"; then
                ((SUCCESS_COUNT++))
            else
                ((FAIL_COUNT++))
            fi
        done
        ;;
    
    "status")
        print_info "Checking migration status..."
        echo ""
        
        printf "%-30s %-12s %-8s %s\n" "Service" "Has Prisma" "Has Seed" "Status"
        printf "%s\n" "------------------------------------------------------------"
        
        for service in "${SERVICES[@]}"; do
            if has_prisma "$service"; then
                PRISMA_STATUS="✅"
                cd "$SERVICES_DIR/$service"
                if npx prisma migrate status 2>&1 | grep -q "pending\|not yet been applied"; then
                    MIGRATION_STATUS="Pending"
                else
                    MIGRATION_STATUS="Up to date"
                fi
                cd - > /dev/null
            else
                PRISMA_STATUS="❌"
                MIGRATION_STATUS="No Prisma"
            fi
            
            if has_seed "$service"; then
                SEED_STATUS="✅"
            else
                SEED_STATUS="❌"
            fi
            
            printf "%-30s %-12s %-8s %s\n" "$service" "$PRISMA_STATUS" "$SEED_STATUS" "$MIGRATION_STATUS"
        done
        
        echo ""
        exit 0
        ;;
    
    "all"|*)
        print_info "Running full setup (migrate + seed)..."
        echo ""
        
        print_header "Phase 1: Migrations"
        
        MIGRATION_FAILED=false
        for service in "${SERVICES[@]}"; do
            if run_migration "$service"; then
                ((SUCCESS_COUNT++))
            else
                ((FAIL_COUNT++))
                MIGRATION_FAILED=true
            fi
        done
        
        if [[ "$MIGRATION_FAILED" == "false" ]]; then
            print_header "Phase 2: Seeding"
            
            SEED_SUCCESS=0
            SEED_FAIL=0
            
            for service in "${SERVICES[@]}"; do
                if run_seed "$service"; then
                    ((SEED_SUCCESS++))
                else
                    ((SEED_FAIL++))
                fi
            done
            
            echo ""
            print_info "Seeding complete: $SEED_SUCCESS succeeded, $SEED_FAIL failed"
        else
            print_warning "Skipping seeding due to migration failures"
        fi
        ;;
esac

# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

print_header "Setup Complete"

if [[ $COMMAND != "status" ]]; then
    if [[ $FAIL_COUNT -eq 0 ]]; then
        echo -e "${GREEN}Results: $SUCCESS_COUNT succeeded, $FAIL_COUNT failed${NC}"
    else
        echo -e "${YELLOW}Results: $SUCCESS_COUNT succeeded, $FAIL_COUNT failed${NC}"
    fi
    echo ""
fi

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${CYAN}Default credentials:${NC}"
    echo "  Admin:   admin@aivo.dev / Admin123!@#"
    echo "  Author:  author@aivo.dev / Author123!@#"
    echo "  Teacher: teacher@aivo.dev / Teacher123!@#"
    echo "  Learner: alex@aivo.dev / Learner123!@#"
    echo ""
fi

exit $FAIL_COUNT
