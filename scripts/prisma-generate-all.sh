#!/bin/bash
# ==============================================================================
# Prisma Generate All
# ==============================================================================
# Pre-generates Prisma clients for all services with Prisma schemas.
# This script should be run during CI/build to ensure Prisma clients are
# available before the build process starts.
#
# Usage:
#   ./scripts/prisma-generate-all.sh
#   ./scripts/prisma-generate-all.sh --service payments-svc
#
# Environment Variables:
#   PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1  - Skip checksum validation for offline builds
#   PRISMA_CLI_QUERY_ENGINE_TYPE=binary       - Use binary engine for compatibility
#
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICES_DIR="$ROOT_DIR/services"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SPECIFIC_SERVICE=""
VERBOSE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --service|-s)
            SPECIFIC_SERVICE="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Set Prisma environment for offline/CI builds
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING="${PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING:-1}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Prisma Client Generation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Find all services with Prisma schemas
find_prisma_services() {
    if [[ -n "$SPECIFIC_SERVICE" ]]; then
        if [[ -f "$SERVICES_DIR/$SPECIFIC_SERVICE/prisma/schema.prisma" ]]; then
            echo "$SPECIFIC_SERVICE"
        else
            echo -e "${RED}Error: Service '$SPECIFIC_SERVICE' does not have a Prisma schema${NC}"
            exit 1
        fi
    else
        find "$SERVICES_DIR" -maxdepth 3 -name "schema.prisma" -path "*/prisma/*" | \
            sed 's|.*/services/||' | \
            sed 's|/prisma/schema.prisma||' | \
            sort
    fi
}

# Generate Prisma client for a service
generate_client() {
    local service="$1"
    local service_dir="$SERVICES_DIR/$service"
    local schema_path="$service_dir/prisma/schema.prisma"
    
    if [[ ! -f "$schema_path" ]]; then
        echo -e "${YELLOW}  ⚠ Skipping $service (no schema.prisma)${NC}"
        return 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${BLUE}  [DRY RUN] Would generate client for: $service${NC}"
        return 0
    fi

    echo -e "${BLUE}  → Generating Prisma client for: $service${NC}"
    
    cd "$service_dir"
    
    if $VERBOSE; then
        npx prisma generate --schema=prisma/schema.prisma
    else
        npx prisma generate --schema=prisma/schema.prisma 2>&1 | grep -v "^$" || true
    fi
    
    echo -e "${GREEN}  ✓ Generated: $service${NC}"
    
    cd "$ROOT_DIR"
}

# Main execution
SERVICES=$(find_prisma_services)
TOTAL=$(echo "$SERVICES" | wc -l)
GENERATED=0
FAILED=0

echo -e "Found ${YELLOW}$TOTAL${NC} services with Prisma schemas"
echo ""

for service in $SERVICES; do
    if generate_client "$service"; then
        ((GENERATED++))
    else
        ((FAILED++))
        echo -e "${RED}  ✗ Failed: $service${NC}"
    fi
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Generated: $GENERATED${NC} | ${RED}Failed: $FAILED${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

if [[ $FAILED -gt 0 ]]; then
    exit 1
fi

exit 0
