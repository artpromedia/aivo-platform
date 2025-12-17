#!/bin/bash
# scripts/setup-local.sh
# Complete local development setup for AIVO platform

set -e

echo "🚀 AIVO Platform - Local Development Setup"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_ROOT/config"
SECRETS_DIR="$CONFIG_DIR/secrets"
ENV_DIR="$CONFIG_DIR/environments"

cd "$PROJECT_ROOT"

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is required but not installed.${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ $1 found${NC}"
    return 0
}

echo -e "${BLUE}Checking prerequisites...${NC}"
echo ""

MISSING_DEPS=0
check_command docker || ((MISSING_DEPS++))
check_command node || ((MISSING_DEPS++))
check_command pnpm || check_command npm || ((MISSING_DEPS++))

if [ $MISSING_DEPS -gt 0 ]; then
    echo ""
    echo -e "${RED}Please install missing dependencies and try again.${NC}"
    exit 1
fi

echo ""
echo "Node version: $(node --version)"
echo "Docker version: $(docker --version | head -1)"

# Check Docker daemon
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Generate secrets if not exist
echo ""
echo -e "${BLUE}Setting up secrets...${NC}"
echo ""

if [ ! -f "$SECRETS_DIR/local.env" ] || [ ! -f "$SECRETS_DIR/jwt-private.pem" ]; then
    echo "Generating secrets..."
    chmod +x "$SCRIPT_DIR/generate-secrets.sh"
    "$SCRIPT_DIR/generate-secrets.sh"
else
    echo -e "${GREEN}✓ Secrets already exist${NC}"
fi

# Create combined environment file
echo ""
echo -e "${BLUE}Creating environment configuration...${NC}"
echo ""

# Combine base + development + secrets into .env
{
    echo "# Combined environment file for local development"
    echo "# Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "# DO NOT COMMIT THIS FILE"
    echo ""
    cat "$ENV_DIR/base.env"
    echo ""
    cat "$ENV_DIR/development.env"
    echo ""
    cat "$SECRETS_DIR/local.env"
} > "$PROJECT_ROOT/.env"

echo -e "${GREEN}✓ Environment file created: .env${NC}"

# Source the environment
set -a
source "$PROJECT_ROOT/.env"
set +a

# Install dependencies
echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
echo ""

if command -v pnpm &> /dev/null; then
    pnpm install
else
    npm install
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Start infrastructure services
echo ""
echo -e "${BLUE}Starting infrastructure services...${NC}"
echo ""

# Check if docker-compose file exists
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.yml"
fi

if [ -f "$COMPOSE_FILE" ]; then
    echo "Using compose file: $COMPOSE_FILE"
    
    # Start core infrastructure
    docker compose -f "$COMPOSE_FILE" up -d postgres redis nats 2>/dev/null || \
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis nats 2>/dev/null || \
    echo -e "${YELLOW}⚠ Could not start infrastructure via docker-compose${NC}"
else
    echo -e "${YELLOW}⚠ No docker-compose.yml found. Please start infrastructure manually.${NC}"
fi

# Wait for services to be ready
echo ""
echo -e "${BLUE}Waiting for services to be ready...${NC}"
echo ""

wait_for_port() {
    local port=$1
    local service=$2
    local max_attempts=30
    local attempt=1
    
    while ! nc -z localhost "$port" 2>/dev/null; do
        if [ $attempt -ge $max_attempts ]; then
            echo -e "${YELLOW}⚠ $service (port $port) did not become ready${NC}"
            return 1
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done
    echo -e " ${GREEN}✓ $service ready${NC}"
    return 0
}

if command -v nc &> /dev/null; then
    wait_for_port 5432 "PostgreSQL"
    wait_for_port 6379 "Redis"
    wait_for_port 4222 "NATS"
else
    echo "Waiting 10 seconds for services..."
    sleep 10
fi

# Run database setup
echo ""
echo -e "${BLUE}Setting up databases...${NC}"
echo ""

if [ -f "$SCRIPT_DIR/db-setup.sh" ]; then
    chmod +x "$SCRIPT_DIR/db-setup.sh"
    "$SCRIPT_DIR/db-setup.sh" migrate 2>/dev/null || \
    echo -e "${YELLOW}⚠ Database migration skipped (run manually if needed)${NC}"
else
    echo -e "${YELLOW}⚠ db-setup.sh not found, skipping database setup${NC}"
fi

# Validate environment
echo ""
echo -e "${BLUE}Validating environment...${NC}"
echo ""

if [ -f "$SCRIPT_DIR/validate-env.sh" ]; then
    chmod +x "$SCRIPT_DIR/validate-env.sh"
    "$SCRIPT_DIR/validate-env.sh" || true
fi

# Print summary
echo ""
echo "==========================================="
echo -e "${GREEN}✅ Local development setup complete!${NC}"
echo ""
echo "Environment: $NODE_ENV"
echo ""
echo -e "${BLUE}Infrastructure Services:${NC}"
echo "  PostgreSQL:      localhost:5432"
echo "  Redis:           localhost:6379"
echo "  NATS:            localhost:4222"
echo ""
echo -e "${BLUE}Application URLs (after starting services):${NC}"
echo "  API Gateway:     http://localhost:8000"
echo "  Auth Service:    http://localhost:3001"
echo "  Content Service: http://localhost:3003"
echo "  Web Author:      http://localhost:3002"
echo ""
echo -e "${BLUE}Development Tools:${NC}"
echo "  MinIO Console:   http://localhost:9001"
echo "  MailHog:         http://localhost:8025"
echo "  Grafana:         http://localhost:3030"
echo ""
echo -e "${BLUE}Test Credentials:${NC}"
echo "  Admin:   admin@aivo.dev / Admin123!@#"
echo "  Author:  author@aivo.dev / Author123!@#"
echo "  Teacher: teacher@aivo.dev / Teacher123!@#"
echo "  Learner: alex@aivo.dev / Learner123!@#"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  Start all:    pnpm dev"
echo "  Run tests:    pnpm test"
echo "  View logs:    docker compose logs -f [service]"
echo "  Stop infra:   docker compose down"
echo "  Reset all:    docker compose down -v && ./scripts/setup-local.sh"
echo ""
echo -e "${YELLOW}Note: Run 'source .env' to load environment in current shell${NC}"
