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

# Do NOT use set -e — we want to continue on failures

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

# Active TypeScript services that need Prisma client generation.
# Auto-discover all services that have a prisma/schema.prisma file.
ACTIVE_SERVICES=()
for svc_dir in "$SERVICES_DIR"/*/prisma/schema.prisma; do
    if [[ -f "$svc_dir" ]]; then
        svc_name="$(basename "$(dirname "$(dirname "$svc_dir")")")"
        ACTIVE_SERVICES+=("$svc_name")
    fi
done

# Find services to generate Prisma clients for
find_prisma_services() {
    if [[ -n "$SPECIFIC_SERVICE" ]]; then
        if [[ -f "$SERVICES_DIR/$SPECIFIC_SERVICE/prisma/schema.prisma" ]]; then
            echo "$SPECIFIC_SERVICE"
        else
            echo -e "${RED}Error: Service '$SPECIFIC_SERVICE' does not have a Prisma schema${NC}"
            return 1
        fi
    else
        for svc in "${ACTIVE_SERVICES[@]}"; do
            if [[ -f "$SERVICES_DIR/$svc/prisma/schema.prisma" ]]; then
                echo "$svc"
            fi
        done
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

    # Skip services without package.json — npx prisma requires Node.js deps
    if [[ ! -f "$service_dir/package.json" ]]; then
        echo -e "${YELLOW}  ⚠ Skipping $service (no package.json — not a Node.js service or missing setup)${NC}"
        return 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${BLUE}  [DRY RUN] Would generate client for: $service${NC}"
        return 0
    fi

    echo -e "${BLUE}  → Generating Prisma client for: $service${NC}"
    
    cd "$service_dir"
    
    local gen_output
    if gen_output=$(npx prisma generate --schema=prisma/schema.prisma 2>&1); then
        echo -e "${GREEN}  ✓ Generated: $service${NC}"
        cd "$ROOT_DIR"
        return 0
    else
        echo -e "${RED}  ✗ Failed: $service${NC}"
        if $VERBOSE; then
            echo "$gen_output"
        fi
        cd "$ROOT_DIR"
        return 1
    fi
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
echo -e "${GREEN}  Generated: $GENERATED${NC} | ${RED}Failed: $FAILED${NC} | Total: $TOTAL"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Warn but don't fail — individual service failures should not block CI
if [[ $FAILED -gt 0 ]]; then
    echo -e "${YELLOW}⚠ Some Prisma clients failed to generate. Check logs above.${NC}"
fi

exit 0
