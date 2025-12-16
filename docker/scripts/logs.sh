#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# AIVO Platform - Aggregate Logs Viewer
# ══════════════════════════════════════════════════════════════════════════════
# This script aggregates and views logs from AIVO platform services.
# Usage: ./logs.sh [service-name] [--tail N] [--since TIME] [--errors]
# ══════════════════════════════════════════════════════════════════════════════

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

# Default options
SERVICE=""
TAIL_LINES=100
SINCE=""
ERRORS_ONLY=false
FOLLOW=true

# Service groups
INFRA_SERVICES="postgres redis nats elasticsearch minio"
OBSERVABILITY_SERVICES="prometheus grafana jaeger loki otel-collector"
TIER0_SERVICES="auth-svc tenant-svc profile-svc"
TIER1_SERVICES="content-svc content-authoring-svc assessment-svc session-svc"
TIER2_SERVICES="engagement-svc personalization-svc learner-model-svc goal-svc homework-helper-svc"
TIER3_SERVICES="ai-orchestrator sandbox-svc"
ALL_APP_SERVICES="$TIER0_SERVICES $TIER1_SERVICES $TIER2_SERVICES $TIER3_SERVICES"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tail)
      TAIL_LINES="$2"
      shift 2
      ;;
    --since)
      SINCE="$2"
      shift 2
      ;;
    --errors)
      ERRORS_ONLY=true
      shift
      ;;
    --no-follow)
      FOLLOW=false
      shift
      ;;
    -h|--help)
      echo "Usage: ./logs.sh [SERVICE|GROUP] [OPTIONS]"
      echo ""
      echo "Services/Groups:"
      echo "  <service-name>  View logs for a specific service"
      echo "  infra           View infrastructure logs (postgres, redis, nats, etc.)"
      echo "  observability   View observability stack logs"
      echo "  tier0           View core services logs (auth, tenant, profile)"
      echo "  tier1           View content & assessment logs"
      echo "  tier2           View learning experience logs"
      echo "  tier3           View AI & orchestration logs"
      echo "  apps            View all application service logs"
      echo "  all             View all logs"
      echo ""
      echo "Options:"
      echo "  --tail N        Number of lines to show (default: 100)"
      echo "  --since TIME    Show logs since timestamp (e.g., '10m', '1h', '2023-01-01')"
      echo "  --errors        Show only error-level logs"
      echo "  --no-follow     Don't follow log output"
      echo "  -h, --help      Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./logs.sh auth-svc                    # Follow auth-svc logs"
      echo "  ./logs.sh tier0 --tail 50             # Last 50 lines from core services"
      echo "  ./logs.sh apps --errors --since 1h   # Errors from last hour"
      exit 0
      ;;
    *)
      SERVICE="$1"
      shift
      ;;
  esac
done

cd "$DOCKER_DIR"

# Build docker compose command
build_compose_cmd() {
  local services="$1"
  local cmd="docker compose logs"
  
  if [ "$FOLLOW" = true ]; then
    cmd="$cmd -f"
  fi
  
  cmd="$cmd --tail=$TAIL_LINES"
  
  if [ -n "$SINCE" ]; then
    cmd="$cmd --since=$SINCE"
  fi
  
  cmd="$cmd $services"
  
  if [ "$ERRORS_ONLY" = true ]; then
    cmd="$cmd 2>&1 | grep -iE 'error|err|fatal|panic|exception|fail'"
  fi
  
  echo "$cmd"
}

# Determine which services to show
case "$SERVICE" in
  "infra"|"infrastructure")
    echo -e "${BLUE}📦 Showing infrastructure logs...${NC}"
    SERVICES="$INFRA_SERVICES"
    ;;
  "observability"|"obs")
    echo -e "${BLUE}📊 Showing observability logs...${NC}"
    SERVICES="$OBSERVABILITY_SERVICES"
    ;;
  "tier0"|"core")
    echo -e "${BLUE}🏛️  Showing Tier 0 (core) logs...${NC}"
    SERVICES="$TIER0_SERVICES"
    ;;
  "tier1"|"content")
    echo -e "${BLUE}📚 Showing Tier 1 (content/assessment) logs...${NC}"
    SERVICES="$TIER1_SERVICES"
    ;;
  "tier2"|"learning")
    echo -e "${BLUE}🎯 Showing Tier 2 (learning experience) logs...${NC}"
    SERVICES="$TIER2_SERVICES"
    ;;
  "tier3"|"ai")
    echo -e "${BLUE}🤖 Showing Tier 3 (AI/orchestration) logs...${NC}"
    SERVICES="$TIER3_SERVICES"
    ;;
  "apps"|"services")
    echo -e "${BLUE}🚀 Showing all application service logs...${NC}"
    SERVICES="$ALL_APP_SERVICES"
    ;;
  "all"|"")
    if [ -z "$SERVICE" ]; then
      echo -e "${BLUE}📋 Showing all service logs...${NC}"
    fi
    SERVICES=""
    ;;
  *)
    echo -e "${BLUE}📋 Showing logs for: $SERVICE${NC}"
    SERVICES="$SERVICE"
    ;;
esac

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Execute the command
CMD=$(build_compose_cmd "$SERVICES")
eval "$CMD"
