# Sprint 5 Load Testing - PowerShell Configuration

# =============================================================================
# SERVICE ENDPOINTS
# =============================================================================
$env:AUTH_URL = "http://localhost:4001"
$env:LEARNER_URL = "http://localhost:3000"
$env:PARENT_URL = "http://localhost:3001"
$env:TEACHER_URL = "http://localhost:3002"
$env:CONTENT_URL = "http://localhost:3010"
$env:SESSION_URL = "http://localhost:3021"
$env:PROFILE_URL = "http://localhost:3003"
$env:SUBSCRIPTION_URL = "http://localhost:3015"

# =============================================================================
# LOAD TEST PROFILES
# =============================================================================

# Profile 1: Quick Smoke Test (2 minutes, 5 VUs)
$env:SMOKE_TEST_DURATION = "2m"
$env:SMOKE_TEST_VUS = "5"

# Profile 2: Normal Load (30 minutes, 100-200 VUs)
$env:LOAD_TEST_DURATION = "30m"
$env:LOAD_TEST_VUS_MIN = "100"
$env:LOAD_TEST_VUS_MAX = "200"

# Profile 3: Stress Test (40 minutes, 500-700 VUs)
$env:STRESS_TEST_DURATION = "40m"
$env:STRESS_TEST_VUS_TARGET = "500"
$env:STRESS_TEST_VUS_MAX = "700"

# Profile 4: Spike Test (5 minutes, 0→600→0)
$env:SPIKE_TEST_DURATION = "5m"
$env:SPIKE_TEST_VUS_SPIKE = "600"

# Profile 5: Soak Test (30 minutes, 200 VUs sustained)
$env:SOAK_TEST_DURATION = "30m"
$env:SOAK_TEST_VUS = "200"

# =============================================================================
# PERFORMANCE TARGETS
# =============================================================================
$env:TARGET_P50_MS = "100"
$env:TARGET_P95_MS = "200"
$env:TARGET_P99_MS = "500"
$env:TARGET_ERROR_RATE = "0.005"  # 0.5%
$env:TARGET_TRUST_SCORE_MS = "900"

# =============================================================================
# K6 OUTPUT OPTIONS
# =============================================================================
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$env:K6_OUT = "json=results/sprint5-load-test-$timestamp.json"
$env:K6_WEB_DASHBOARD = "true"
$env:K6_WEB_DASHBOARD_PORT = "5665"

Write-Host "✅ Load test environment configured" -ForegroundColor Green
Write-Host "📊 Results will be saved to: $env:K6_OUT" -ForegroundColor Cyan
Write-Host "🌐 Web dashboard: http://localhost:5665" -ForegroundColor Cyan
