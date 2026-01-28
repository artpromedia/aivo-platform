# Sprint 5 Load Testing Configuration

# =============================================================================
# SERVICE ENDPOINTS
# =============================================================================
export AUTH_URL=http://localhost:4001
export LEARNER_URL=http://localhost:3000
export PARENT_URL=http://localhost:3001
export TEACHER_URL=http://localhost:3002
export CONTENT_URL=http://localhost:3010
export SESSION_URL=http://localhost:3021
export PROFILE_URL=http://localhost:3003
export SUBSCRIPTION_URL=http://localhost:3015

# =============================================================================
# LOAD TEST PROFILES
# =============================================================================

# Profile 1: Quick Smoke Test (2 minutes, 5 VUs)
export SMOKE_TEST_DURATION=2m
export SMOKE_TEST_VUS=5

# Profile 2: Normal Load (30 minutes, 100-200 VUs)
export LOAD_TEST_DURATION=30m
export LOAD_TEST_VUS_MIN=100
export LOAD_TEST_VUS_MAX=200

# Profile 3: Stress Test (40 minutes, 500-700 VUs)
export STRESS_TEST_DURATION=40m
export STRESS_TEST_VUS_TARGET=500
export STRESS_TEST_VUS_MAX=700

# Profile 4: Spike Test (5 minutes, 0→600→0)
export SPIKE_TEST_DURATION=5m
export SPIKE_TEST_VUS_SPIKE=600

# Profile 5: Soak Test (30 minutes, 200 VUs sustained)
export SOAK_TEST_DURATION=30m
export SOAK_TEST_VUS=200

# =============================================================================
# PERFORMANCE TARGETS
# =============================================================================
export TARGET_P50_MS=100
export TARGET_P95_MS=200
export TARGET_P99_MS=500
export TARGET_ERROR_RATE=0.005  # 0.5%
export TARGET_TRUST_SCORE_MS=900

# =============================================================================
# TEST DATA
# =============================================================================
export TEST_USERS_COUNT=1000
export TEST_LEARNERS=1000
export TEST_PARENTS=500
export TEST_TEACHERS=200

# =============================================================================
# K6 OUTPUT OPTIONS
# =============================================================================
export K6_OUT=json=results/sprint5-load-test-$(date +%Y%m%d-%H%M%S).json
export K6_WEB_DASHBOARD=true
export K6_WEB_DASHBOARD_PORT=5665

# =============================================================================
# DATABASE CONFIGURATION (for cleanup/seeding)
# =============================================================================
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=aivo_test
export DB_USER=aivo_test
export DB_PASSWORD=test123

# =============================================================================
# REDIS CONFIGURATION (for cache testing)
# =============================================================================
export REDIS_HOST=localhost
export REDIS_PORT=6379

# =============================================================================
# MONITORING & OBSERVABILITY
# =============================================================================
export PROMETHEUS_URL=http://localhost:9090
export GRAFANA_URL=http://localhost:3030
export ENABLE_TRACING=true
export JAEGER_URL=http://localhost:16686
