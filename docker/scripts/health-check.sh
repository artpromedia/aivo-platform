#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# AIVO Platform - Health Check Script
# ══════════════════════════════════════════════════════════════════════════════
# This script checks the health status of all AIVO platform services.
# Usage: ./health-check.sh [--verbose] [--json]
# ══════════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Options
VERBOSE=false
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./health-check.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -v, --verbose   Show detailed health information"
      echo "  --json          Output results in JSON format"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

# ══════════════════════════════════════════════════════════════════════════════
# Service Definitions
# ══════════════════════════════════════════════════════════════════════════════

declare -A INFRASTRUCTURE=(
  ["postgres"]="5432"
  ["redis"]="6379"
  ["nats"]="4222"
  ["elasticsearch"]="9200"
  ["minio"]="9000"
)

declare -A OBSERVABILITY=(
  ["prometheus"]="9090"
  ["grafana"]="3030"
  ["jaeger"]="16686"
)

declare -A GATEWAY=(
  ["kong"]="8001"
)

declare -A TIER0_SERVICES=(
  ["auth-svc"]="3001"
  ["tenant-svc"]="3002"
  ["profile-svc"]="3003"
)

declare -A TIER1_SERVICES=(
  ["content-svc"]="3010"
  ["content-authoring-svc"]="3011"
  ["assessment-svc"]="3020"
  ["session-svc"]="3021"
)

declare -A TIER2_SERVICES=(
  ["engagement-svc"]="3030"
  ["personalization-svc"]="3031"
  ["learner-model-svc"]="3032"
  ["goal-svc"]="3033"
  ["homework-helper-svc"]="3034"
)

declare -A TIER3_SERVICES=(
  ["ai-orchestrator"]="3200"
  ["sandbox-svc"]="3201"
)

declare -A TIER4_SERVICES=(
  ["analytics-svc"]="3040"
  ["baseline-svc"]="3041"
  ["reports-svc"]="3042"
  ["research-svc"]="3043"
)

# ══════════════════════════════════════════════════════════════════════════════
# Health Check Functions
# ══════════════════════════════════════════════════════════════════════════════

total_services=0
healthy_services=0
unhealthy_services=0

check_tcp_port() {
  local host=$1
  local port=$2
  timeout 2 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null
  return $?
}

check_http_health() {
  local url=$1
  local response=$(curl -sf -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" 2>/dev/null || echo "000")
  if [[ "$response" =~ ^2[0-9][0-9]$ ]]; then
    return 0
  fi
  return 1
}

print_status() {
  local name=$1
  local status=$2
  local details=${3:-""}
  
  ((total_services++))
  
  if [ "$status" = "healthy" ]; then
    ((healthy_services++))
    echo -e "   ${GREEN}✓${NC} ${name}${GRAY}${details:+ - $details}${NC}"
  elif [ "$status" = "degraded" ]; then
    ((healthy_services++))
    echo -e "   ${YELLOW}⚠${NC} ${name}${GRAY}${details:+ - $details}${NC}"
  else
    ((unhealthy_services++))
    echo -e "   ${RED}✗${NC} ${name}${GRAY}${details:+ - $details}${NC}"
  fi
}

check_service_group() {
  local group_name=$1
  local -n services=$2
  local use_http=${3:-true}
  
  echo -e "\n${BLUE}${group_name}${NC}"
  
  for name in "${!services[@]}"; do
    local port="${services[$name]}"
    local status="unhealthy"
    local details=""
    
    if [ "$use_http" = true ]; then
      if check_http_health "http://localhost:${port}/health"; then
        status="healthy"
      elif check_tcp_port "localhost" "$port"; then
        status="degraded"
        details="port open but health check failed"
      fi
    else
      if check_tcp_port "localhost" "$port"; then
        status="healthy"
      fi
    fi
    
    print_status "$name (:$port)" "$status" "$details"
  done
}

# ══════════════════════════════════════════════════════════════════════════════
# Run Health Checks
# ══════════════════════════════════════════════════════════════════════════════

if [ "$JSON_OUTPUT" = false ]; then
  echo -e "${CYAN}"
  echo "╔══════════════════════════════════════════════════════════════════════════╗"
  echo "║              AIVO Platform Health Check                                  ║"
  echo "╚══════════════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
fi

# Check infrastructure
check_service_group "🏗️  Infrastructure" INFRASTRUCTURE false

# Check observability
check_service_group "📊 Observability" OBSERVABILITY true

# Check gateway
check_service_group "🌐 API Gateway" GATEWAY true

# Check services by tier
check_service_group "📦 Tier 0 - Core Services" TIER0_SERVICES true
check_service_group "📚 Tier 1 - Content & Assessment" TIER1_SERVICES true
check_service_group "🎯 Tier 2 - Learning Experience" TIER2_SERVICES true
check_service_group "🤖 Tier 3 - AI & Orchestration" TIER3_SERVICES true
check_service_group "📈 Tier 4 - Analytics & Reporting" TIER4_SERVICES true

# ══════════════════════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════════════════════${NC}"

if [ $unhealthy_services -eq 0 ]; then
  echo -e "${GREEN}✅ All $total_services services are healthy!${NC}"
  exit 0
elif [ $unhealthy_services -lt $((total_services / 2)) ]; then
  echo -e "${YELLOW}⚠️  $healthy_services/$total_services services healthy, $unhealthy_services services need attention${NC}"
  exit 0
else
  echo -e "${RED}❌ Only $healthy_services/$total_services services healthy. Platform may not work correctly.${NC}"
  exit 1
fi
