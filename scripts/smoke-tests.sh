# ==============================================================================
# AIVO Platform - Smoke Tests Script
# ==============================================================================
#!/bin/bash

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-production}"
BASE_URL=""
TIMEOUT=10
MAX_RETRIES=3

case $ENVIRONMENT in
  production)
    BASE_URL="https://app.aivo.edu"
    API_URL="https://api.aivo.edu"
    ;;
  staging)
    BASE_URL="https://staging.aivo.edu"
    API_URL="https://api.staging.aivo.edu"
    ;;
  development)
    BASE_URL="https://dev.aivo.edu"
    API_URL="https://api.dev.aivo.edu"
    ;;
  *)
    echo "Unknown environment: $ENVIRONMENT"
    exit 1
    ;;
esac

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Helper functions
log_info() {
  echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
  ((PASSED++))
  ((TOTAL++))
}

log_failure() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((FAILED++))
  ((TOTAL++))
}

check_endpoint() {
  local url=$1
  local expected_status=${2:-200}
  local description=${3:-"Check $url"}
  
  for i in $(seq 1 $MAX_RETRIES); do
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" || echo "000")
    
    if [ "$status" = "$expected_status" ]; then
      log_success "$description (status: $status)"
      return 0
    fi
    
    if [ $i -lt $MAX_RETRIES ]; then
      sleep 2
    fi
  done
  
  log_failure "$description (expected: $expected_status, got: $status)"
  return 1
}

check_json_endpoint() {
  local url=$1
  local jq_filter=${2:-.}
  local description=${3:-"Check $url"}
  
  response=$(curl -s --max-time $TIMEOUT "$url")
  
  if echo "$response" | jq -e "$jq_filter" > /dev/null 2>&1; then
    log_success "$description"
    return 0
  else
    log_failure "$description"
    return 1
  fi
}

# ==============================================================================
# SMOKE TESTS
# ==============================================================================

echo "=============================================="
echo "AIVO Platform Smoke Tests - $ENVIRONMENT"
echo "=============================================="
echo ""

log_info "Starting smoke tests for $ENVIRONMENT environment"
echo ""

# Health Checks
echo "--- Health Checks ---"
check_endpoint "$API_URL/health" 200 "API Gateway health"
check_endpoint "$API_URL/api/v1/auth/health" 200 "Auth Service health"
check_endpoint "$API_URL/api/v1/content/health" 200 "Content Service health"
check_endpoint "$API_URL/api/v1/assessment/health" 200 "Assessment Service health"
check_endpoint "$API_URL/api/v1/analytics/health" 200 "Analytics Service health"

echo ""

# API Endpoints
echo "--- API Endpoints ---"
check_json_endpoint "$API_URL/api/v1/health" ".status" "API health JSON response"
check_endpoint "$API_URL/api/v1/docs" 200 "API documentation"

echo ""

# Web Application
echo "--- Web Application ---"
check_endpoint "$BASE_URL" 200 "Main application"
check_endpoint "$BASE_URL/login" 200 "Login page"

echo ""

# Static Assets
echo "--- Static Assets ---"
check_endpoint "$BASE_URL/favicon.ico" 200 "Favicon"

echo ""

# Security Headers
echo "--- Security Headers ---"
headers=$(curl -s -I --max-time $TIMEOUT "$BASE_URL")

if echo "$headers" | grep -qi "strict-transport-security"; then
  log_success "HSTS header present"
else
  log_failure "HSTS header missing"
fi

if echo "$headers" | grep -qi "x-content-type-options"; then
  log_success "X-Content-Type-Options header present"
else
  log_failure "X-Content-Type-Options header missing"
fi

if echo "$headers" | grep -qi "x-frame-options"; then
  log_success "X-Frame-Options header present"
else
  log_failure "X-Frame-Options header missing"
fi

echo ""

# Database Connectivity (via API)
echo "--- Database Connectivity ---"
check_json_endpoint "$API_URL/api/v1/health/db" ".database" "Database connectivity"

echo ""

# Redis Connectivity (via API)
echo "--- Redis Connectivity ---"
check_json_endpoint "$API_URL/api/v1/health/cache" ".cache" "Redis connectivity"

echo ""

# Performance Check
echo "--- Performance ---"
start_time=$(date +%s.%N)
curl -s -o /dev/null --max-time $TIMEOUT "$API_URL/api/v1/health"
end_time=$(date +%s.%N)
response_time=$(echo "$end_time - $start_time" | bc)

if (( $(echo "$response_time < 1.0" | bc -l) )); then
  log_success "API response time: ${response_time}s (< 1s)"
else
  log_failure "API response time: ${response_time}s (> 1s)"
fi

echo ""
echo "=============================================="
echo "RESULTS: $PASSED/$TOTAL passed, $FAILED failed"
echo "=============================================="

if [ $FAILED -gt 0 ]; then
  echo ""
  echo -e "${RED}Smoke tests failed!${NC}"
  exit 1
else
  echo ""
  echo -e "${GREEN}All smoke tests passed!${NC}"
  exit 0
fi
