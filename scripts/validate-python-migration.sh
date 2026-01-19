#!/bin/bash
# AIVO Platform - Python Services Migration Validation Script
# Part of Sprint 0/1: Migration Foundation

set -e

echo "🔍 Validating Python Services Migration..."
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0

# Function to check if a file/directory exists
check_exists() {
    local path=$1
    local type=$2  # "file" or "dir"

    if [ "$type" == "dir" ]; then
        if [ -d "$path" ]; then
            echo -e "${GREEN}✅${NC} Found directory: $path"
            return 0
        else
            echo -e "${RED}❌${NC} Missing directory: $path"
            ((ERRORS++))
            return 1
        fi
    else
        if [ -f "$path" ]; then
            echo -e "${GREEN}✅${NC} Found file: $path"
            return 0
        else
            echo -e "${RED}❌${NC} Missing file: $path"
            ((ERRORS++))
            return 1
        fi
    fi
}

echo ""
echo "📁 Checking Python Service Directories..."
echo "-------------------------------------------"

# Check service directories
SERVICES=("ai-inference-svc" "training-svc" "curriculum-py-svc" "python-api-gateway")
for service in "${SERVICES[@]}"; do
    check_exists "services/$service" "dir"
    check_exists "services/$service/Dockerfile" "file"
    check_exists "services/$service/requirements.txt" "file"
    check_exists "services/$service/app" "dir"
    check_exists "services/$service/app/main.py" "file"
    check_exists "services/$service/app/core/config.py" "file"
done

echo ""
echo "📄 Checking Documentation Files..."
echo "-------------------------------------------"

# Check documentation files
check_exists "MIGRATION_INVENTORY.md" "file"
check_exists "DEPENDENCY_COMPATIBILITY.md" "file"
check_exists "ARCHITECTURE_MAP.md" "file"
check_exists "API_INVENTORY.md" "file"

echo ""
echo "🐳 Checking Docker Configuration..."
echo "-------------------------------------------"

check_exists "docker-compose.services.yml" "file"
check_exists "scripts/init-databases.sql" "file"

echo ""
echo "🧪 Checking Test Files..."
echo "-------------------------------------------"

check_exists "services/tests/test_integration.py" "file"
check_exists "services/requirements.txt" "file"

echo ""
echo "============================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All migration validation checks passed!${NC}"
    echo ""
    echo "📦 Migration artifacts are ready."
    echo ""
    echo "Next steps:"
    echo "  1. Start services:    docker-compose -f docker-compose.services.yml up -d"
    echo "  2. Check health:      curl http://localhost:8000/health"
    echo "  3. Run tests:         cd services && pytest tests/"
    echo "  4. View docs:         http://localhost:8000/docs"
    exit 0
else
    echo -e "${RED}❌ Migration validation failed with $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the missing files/directories and run this script again."
    exit 1
fi
