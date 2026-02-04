#!/usr/bin/env bash
# =============================================================================
# AIVO Platform - Docker Build Validation Script
# =============================================================================
# Validates that each service can be built with the unified Dockerfile and
# that the resulting container responds to health checks on the correct port.
#
# Usage:
#   ./scripts/validate-docker-builds.sh              # test all services
#   ./scripts/validate-docker-builds.sh notify-svc    # test a single service
#   ./scripts/validate-docker-builds.sh --build-only  # build without running
# =============================================================================

set -euo pipefail

# Port mapping - must match infra/service-ports.yaml and ci-unified.yml
declare -A SERVICE_PORTS=(
  ["auth-svc"]=4001
  ["session-svc"]=4020
  ["content-svc"]=4020
  ["assessment-svc"]=3031
  ["ai-orchestrator"]=4010
  ["analytics-svc"]=4030
  ["notify-svc"]=4040
  ["messaging-svc"]=4041
  ["goal-svc"]=4030
  ["focus-svc"]=4026
  ["billing-svc"]=4060
  ["payments-svc"]=4070
  ["parent-svc"]=3010
  ["baseline-svc"]=4011
  ["consent-svc"]=4004
  ["profile-svc"]=3420
  ["personalization-svc"]=3012
  ["life-skills-svc"]=4050
)

BUILD_ONLY=false
SERVICES_TO_TEST=()

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --build-only)
      BUILD_ONLY=true
      ;;
    --help|-h)
      echo "Usage: $0 [--build-only] [service-name ...]"
      echo ""
      echo "Options:"
      echo "  --build-only    Only build images, skip health check tests"
      echo "  service-name    One or more service names to test (default: all)"
      exit 0
      ;;
    *)
      if [[ -n "${SERVICE_PORTS[$arg]+_}" ]]; then
        SERVICES_TO_TEST+=("$arg")
      else
        echo "ERROR: Unknown service '$arg'"
        echo "Available services: ${!SERVICE_PORTS[*]}"
        exit 1
      fi
      ;;
  esac
done

# Default to all services if none specified
if [ ${#SERVICES_TO_TEST[@]} -eq 0 ]; then
  SERVICES_TO_TEST=("${!SERVICE_PORTS[@]}")
fi

PASSED=0
FAILED=0
ERRORS=()

for svc in "${SERVICES_TO_TEST[@]}"; do
  port=${SERVICE_PORTS[$svc]}
  image_tag="aivo-${svc}:validate"

  echo "============================================"
  echo "Building $svc (port $port)..."
  echo "============================================"

  if docker build \
    --build-arg SERVICE_NAME="$svc" \
    --build-arg SERVICE_PORT="$port" \
    -f docker/Dockerfile.service \
    -t "$image_tag" .; then
    echo "BUILD OK: $svc"
  else
    echo "BUILD FAILED: $svc"
    FAILED=$((FAILED + 1))
    ERRORS+=("$svc: build failed")
    continue
  fi

  if [ "$BUILD_ONLY" = true ]; then
    PASSED=$((PASSED + 1))
    continue
  fi

  echo "Starting $svc on port $port..."
  container_name="validate-${svc}"

  # Clean up any previous container
  docker rm -f "$container_name" 2>/dev/null || true

  docker run -d \
    --name "$container_name" \
    -p "$port:$port" \
    -e PORT="$port" \
    -e DATABASE_URL="postgresql://test:test@host.docker.internal:5432/test" \
    "$image_tag"

  # Wait for container to start
  echo "Waiting for $svc to start..."
  sleep 8

  # Check if container is still running
  if ! docker ps --filter "name=$container_name" --filter "status=running" -q | grep -q .; then
    echo "FAIL: $svc container exited"
    docker logs "$container_name" 2>&1 | tail -20
    FAILED=$((FAILED + 1))
    ERRORS+=("$svc: container exited unexpectedly")
    docker rm -f "$container_name" 2>/dev/null || true
    continue
  fi

  # Health check
  if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
    echo "HEALTH OK: $svc (port $port)"
    PASSED=$((PASSED + 1))
  else
    echo "HEALTH FAIL: $svc (port $port)"
    docker logs "$container_name" 2>&1 | tail -20
    FAILED=$((FAILED + 1))
    ERRORS+=("$svc: health check failed on port $port")
  fi

  docker rm -f "$container_name" 2>/dev/null || true
done

echo ""
echo "============================================"
echo "RESULTS: $PASSED passed, $FAILED failed"
echo "============================================"

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  echo "Failures:"
  for err in "${ERRORS[@]}"; do
    echo "  - $err"
  done
  exit 1
fi
