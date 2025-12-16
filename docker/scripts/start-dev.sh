#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# AIVO Platform - Development Environment Startup Script
# ══════════════════════════════════════════════════════════════════════════════
# This script starts the complete AIVO platform for local development.
# Usage: ./start-dev.sh [--no-seed] [--minimal] [--build]
# ══════════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$DOCKER_DIR")"

# Default options
SKIP_SEED=false
MINIMAL=false
BUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-seed)
      SKIP_SEED=true
      shift
      ;;
    --minimal)
      MINIMAL=true
      shift
      ;;
    --build)
      BUILD=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./start-dev.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --no-seed    Skip database seeding"
      echo "  --minimal    Start only core services (auth, tenant, content, session)"
      echo "  --build      Force rebuild of all service images"
      echo "  -h, --help   Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                          ║"
echo "║     █████╗ ██╗██╗   ██╗ ██████╗     ██████╗ ██╗      █████╗ ████████╗   ║"
echo "║    ██╔══██╗██║██║   ██║██╔═══██╗    ██╔══██╗██║     ██╔══██╗╚══██╔══╝   ║"
echo "║    ███████║██║██║   ██║██║   ██║    ██████╔╝██║     ███████║   ██║      ║"
echo "║    ██╔══██║██║╚██╗ ██╔╝██║   ██║    ██╔═══╝ ██║     ██╔══██║   ██║      ║"
echo "║    ██║  ██║██║ ╚████╔╝ ╚██████╔╝    ██║     ███████╗██║  ██║   ██║      ║"
echo "║    ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═════╝     ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝      ║"
echo "║                                                                          ║"
echo "║                    Development Environment Startup                       ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

cd "$DOCKER_DIR"

# ══════════════════════════════════════════════════════════════════════════════
# Check Prerequisites
# ══════════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker is not installed. Please install Docker Desktop.${NC}"
  exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
  echo -e "${RED}❌ Docker Compose v2 is not available. Please update Docker.${NC}"
  exit 1
fi

# Check Docker is running
if ! docker info &> /dev/null; then
  echo -e "${RED}❌ Docker daemon is not running. Please start Docker Desktop.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Docker is ready${NC}"

# ══════════════════════════════════════════════════════════════════════════════
# Environment Setup
# ══════════════════════════════════════════════════════════════════════════════

if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}📝 Please update .env with your API keys before using AI features.${NC}"
  else
    echo -e "${RED}❌ .env.example not found!${NC}"
    exit 1
  fi
fi

source .env 2>/dev/null || true

# ══════════════════════════════════════════════════════════════════════════════
# Build Images (if requested)
# ══════════════════════════════════════════════════════════════════════════════

if [ "$BUILD" = true ]; then
  echo -e "${BLUE}🔨 Building service images...${NC}"
  docker compose build --parallel
  echo -e "${GREEN}✓ Images built${NC}"
fi

# ══════════════════════════════════════════════════════════════════════════════
# Start Infrastructure
# ══════════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}🏗️  Starting infrastructure services...${NC}"
docker compose up -d postgres redis nats minio elasticsearch

echo -e "${BLUE}⏳ Waiting for infrastructure to be ready...${NC}"
sleep 5

# Wait for Postgres
echo -n "   Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U aivo > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo -e " ${GREEN}ready${NC}"

# Wait for Redis
echo -n "   Waiting for Redis..."
until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo -e " ${GREEN}ready${NC}"

# Wait for MinIO
echo -n "   Waiting for MinIO..."
until curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo -e " ${GREEN}ready${NC}"

echo -e "${GREEN}✓ Infrastructure is ready${NC}"

# ══════════════════════════════════════════════════════════════════════════════
# Initialize MinIO Buckets
# ══════════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}📦 Initializing storage buckets...${NC}"
docker compose up -d minio-setup
sleep 3
echo -e "${GREEN}✓ Storage buckets created${NC}"

# ══════════════════════════════════════════════════════════════════════════════
# Start Observability Stack
# ══════════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}📊 Starting observability stack...${NC}"
docker compose up -d otel-collector prometheus grafana jaeger loki

# ══════════════════════════════════════════════════════════════════════════════
# Start Services
# ══════════════════════════════════════════════════════════════════════════════

if [ "$MINIMAL" = true ]; then
  echo -e "${BLUE}🚀 Starting minimal service set...${NC}"
  docker compose up -d \
    auth-svc \
    tenant-svc \
    profile-svc \
    content-svc \
    session-svc \
    assessment-svc \
    engagement-svc \
    personalization-svc
else
  echo -e "${BLUE}🚀 Starting all services...${NC}"
  docker compose up -d
fi

# ══════════════════════════════════════════════════════════════════════════════
# Wait for Services
# ══════════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Core services to check
CORE_SERVICES=(
  "auth-svc:3001"
  "tenant-svc:3002"
  "profile-svc:3003"
  "content-svc:3010"
)

for service in "${CORE_SERVICES[@]}"; do
  NAME="${service%%:*}"
  PORT="${service##*:}"
  
  echo -n "   Waiting for ${NAME}..."
  max_attempts=30
  attempt=0
  
  until curl -sf "http://localhost:${PORT}/health" > /dev/null 2>&1; do
    ((attempt++))
    if [ $attempt -ge $max_attempts ]; then
      echo -e " ${RED}timeout${NC}"
      break
    fi
    echo -n "."
    sleep 2
  done
  
  if [ $attempt -lt $max_attempts ]; then
    echo -e " ${GREEN}ready${NC}"
  fi
done

# ══════════════════════════════════════════════════════════════════════════════
# Start API Gateway
# ══════════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}🌐 Starting API Gateway...${NC}"
docker compose up -d kong
sleep 5
echo -e "${GREEN}✓ API Gateway is ready${NC}"

# ══════════════════════════════════════════════════════════════════════════════
# Run Health Check
# ══════════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}🏥 Running health checks...${NC}"
"$SCRIPT_DIR/health-check.sh" || true

# ══════════════════════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ AIVO Platform is running!                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📍 Service URLs:${NC}"
echo "   API Gateway:       http://localhost:8000"
echo "   Kong Admin:        http://localhost:8001"
echo ""
echo -e "${CYAN}📍 Core Services:${NC}"
echo "   Auth Service:      http://localhost:3001"
echo "   Tenant Service:    http://localhost:3002"
echo "   Profile Service:   http://localhost:3003"
echo "   Content Service:   http://localhost:3010"
echo "   Session Service:   http://localhost:3021"
echo "   AI Orchestrator:   http://localhost:3200"
echo ""
echo -e "${CYAN}📍 Development Tools:${NC}"
echo "   Adminer (DB):      http://localhost:8081"
echo "   Redis Commander:   http://localhost:8082"
echo "   MinIO Console:     http://localhost:9001 (aivo_minio/aivo_minio_secret)"
echo "   Mailhog:           http://localhost:8025"
echo ""
echo -e "${CYAN}📍 Observability:${NC}"
echo "   Grafana:           http://localhost:3030 (admin/admin)"
echo "   Prometheus:        http://localhost:9090"
echo "   Jaeger:            http://localhost:16686"
echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "   View logs:         docker compose logs -f [service-name]"
echo "   Stop all:          docker compose down"
echo "   Reset data:        docker compose down -v"
echo "   Health check:      ./scripts/health-check.sh"
echo ""
