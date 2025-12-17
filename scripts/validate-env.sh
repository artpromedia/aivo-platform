#!/bin/bash
# scripts/validate-env.sh
# Validate environment configuration for AIVO platform

set -e

echo "🔍 AIVO Platform - Environment Validation"
echo "=========================================="

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default paths
SECRETS_DIR="${SECRETS_DIR:-./config/secrets}"
ENV_DIR="${ENV_DIR:-./config/environments}"

# Check required environment variable
check_required() {
    local var_name=$1
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}✗ Missing required: $var_name${NC}"
        ((ERRORS++))
        return 1
    fi
    echo -e "${GREEN}✓ $var_name${NC}"
    return 0
}

# Check optional variable with warning
check_optional() {
    local var_name=$1
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        echo -e "${YELLOW}⚠ Optional not set: $var_name${NC}"
        ((WARNINGS++))
        return 1
    fi
    echo -e "${GREEN}✓ $var_name${NC}"
    return 0
}

# Check file exists
check_file() {
    local file_path=$1
    local description=$2
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✓ $description exists${NC}"
        return 0
    else
        echo -e "${RED}✗ $description not found: $file_path${NC}"
        ((ERRORS++))
        return 1
    fi
}

# Check file exists (optional)
check_file_optional() {
    local file_path=$1
    local description=$2
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✓ $description exists${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ $description not found: $file_path${NC}"
        ((WARNINGS++))
        return 1
    fi
}

# Check database connectivity
check_database() {
    local db_url=$1
    local service=$2
    
    if command -v pg_isready &> /dev/null; then
        # Extract host and port from URL
        local host=$(echo "$db_url" | sed -E 's/.*@([^:\/]+).*/\1/')
        local port=$(echo "$db_url" | sed -E 's/.*:([0-9]+)\/.*/\1/')
        
        if pg_isready -h "$host" -p "${port:-5432}" -t 3 &> /dev/null; then
            echo -e "${GREEN}✓ Database connection OK for $service${NC}"
            return 0
        else
            echo -e "${RED}✗ Database connection FAILED for $service${NC}"
            ((ERRORS++))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ pg_isready not available, skipping database check${NC}"
        ((WARNINGS++))
        return 0
    fi
}

# Check Redis connectivity
check_redis() {
    local redis_url=$1
    
    if command -v redis-cli &> /dev/null; then
        if redis-cli -u "$redis_url" ping 2>/dev/null | grep -q "PONG"; then
            echo -e "${GREEN}✓ Redis connection OK${NC}"
            return 0
        else
            echo -e "${RED}✗ Redis connection FAILED${NC}"
            ((ERRORS++))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ redis-cli not available, skipping Redis check${NC}"
        ((WARNINGS++))
        return 0
    fi
}

# Check NATS connectivity
check_nats() {
    local nats_url=$1
    
    if command -v nats &> /dev/null; then
        if nats server ping --server="$nats_url" &> /dev/null; then
            echo -e "${GREEN}✓ NATS connection OK${NC}"
            return 0
        else
            echo -e "${RED}✗ NATS connection FAILED${NC}"
            ((ERRORS++))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ nats CLI not available, skipping NATS check${NC}"
        ((WARNINGS++))
        return 0
    fi
}

# Check port availability
check_port() {
    local port=$1
    local service=$2
    
    if command -v nc &> /dev/null; then
        if nc -z localhost "$port" 2>/dev/null; then
            echo -e "${GREEN}✓ Port $port ($service) is in use${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠ Port $port ($service) is not responding${NC}"
            ((WARNINGS++))
            return 1
        fi
    fi
    return 0
}

# Validate URL format
check_url() {
    local var_name=$1
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        return 1
    fi
    
    if [[ "$var_value" =~ ^https?:// ]] || [[ "$var_value" =~ ^(redis|nats|postgresql):// ]]; then
        echo -e "${GREEN}✓ $var_name has valid URL format${NC}"
        return 0
    else
        echo -e "${RED}✗ $var_name has invalid URL format: $var_value${NC}"
        ((ERRORS++))
        return 1
    fi
}

echo ""
echo -e "${BLUE}Checking environment files...${NC}"
echo ""

check_file "$ENV_DIR/base.env" "Base environment file"
check_file "$ENV_DIR/development.env" "Development environment file"
check_file_optional "$ENV_DIR/staging.env" "Staging environment file"
check_file_optional "$ENV_DIR/production.env.example" "Production template file"

echo ""
echo -e "${BLUE}Checking secrets...${NC}"
echo ""

JWT_PRIVATE="${JWT_PRIVATE_KEY_PATH:-$SECRETS_DIR/jwt-private.pem}"
JWT_PUBLIC="${JWT_PUBLIC_KEY_PATH:-$SECRETS_DIR/jwt-public.pem}"

check_file "$JWT_PRIVATE" "JWT private key"
check_file "$JWT_PUBLIC" "JWT public key"
check_file_optional "$SECRETS_DIR/local.env" "Local secrets file"

# Check JWT key permissions
if [ -f "$JWT_PRIVATE" ]; then
    PERMS=$(stat -c "%a" "$JWT_PRIVATE" 2>/dev/null || stat -f "%Lp" "$JWT_PRIVATE" 2>/dev/null)
    if [ "$PERMS" = "600" ]; then
        echo -e "${GREEN}✓ JWT private key has correct permissions (600)${NC}"
    else
        echo -e "${YELLOW}⚠ JWT private key should have 600 permissions (has $PERMS)${NC}"
        ((WARNINGS++))
    fi
fi

echo ""
echo -e "${BLUE}Checking required environment variables...${NC}"
echo ""

check_required "NODE_ENV"
check_required "DATABASE_HOST" || check_required "DATABASE_URL"
check_required "REDIS_HOST" || check_required "REDIS_URL"
check_required "NATS_URL"
check_required "JWT_ISSUER"
check_required "JWT_AUDIENCE"

echo ""
echo -e "${BLUE}Checking optional configurations...${NC}"
echo ""

check_optional "OPENAI_API_KEY"
check_optional "SENDGRID_API_KEY"
check_optional "STRIPE_SECRET_KEY"
check_optional "ELASTICSEARCH_URL"

echo ""
echo -e "${BLUE}Validating URL formats...${NC}"
echo ""

[ -n "$DATABASE_URL" ] && check_url "DATABASE_URL"
[ -n "$REDIS_URL" ] && check_url "REDIS_URL"
check_url "NATS_URL"
[ -n "$ELASTICSEARCH_URL" ] && check_url "ELASTICSEARCH_URL"

# Only check connectivity in development
if [ "$NODE_ENV" = "development" ]; then
    echo ""
    echo -e "${BLUE}Checking service connectivity...${NC}"
    echo ""
    
    [ -n "$REDIS_URL" ] && check_redis "$REDIS_URL"
    [ -n "$DATABASE_URL" ] && check_database "$DATABASE_URL" "main"
    
    echo ""
    echo -e "${BLUE}Checking local ports...${NC}"
    echo ""
    
    check_port 5432 "PostgreSQL"
    check_port 6379 "Redis"
    check_port 4222 "NATS"
    check_port 9000 "MinIO"
    check_port 9200 "Elasticsearch"
fi

echo ""
echo "=========================================="

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Validation FAILED with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Validation PASSED with $WARNINGS warning(s)${NC}"
    exit 0
else
    echo -e "${GREEN}✅ Validation PASSED${NC}"
    exit 0
fi
