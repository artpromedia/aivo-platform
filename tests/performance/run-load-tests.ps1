<#
.SYNOPSIS
    Sprint 5 Load Testing Runner
    
.DESCRIPTION
    Simplified script to run various load test profiles for Sprint 5 production readiness testing.
    
.PARAMETER Profile
    Test profile to run: smoke, load, stress, spike, soak, trust-score, full
    
.PARAMETER OutputDir
    Directory for test results (default: tests/performance/results)
    
.EXAMPLE
    .\run-load-tests.ps1 -Profile smoke
    .\run-load-tests.ps1 -Profile stress -OutputDir "C:\results"
    
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('smoke', 'load', 'stress', 'spike', 'soak', 'trust-score', 'auth', 'full')]
    [string]$Profile = 'smoke',
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "tests\performance\results"
)

# =============================================================================
# CONFIGURATION
# =============================================================================

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Sprint 5: Production Load Testing Runner              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Load configuration
Write-Host "📋 Loading configuration..." -ForegroundColor Yellow
. "$scriptDir\load-test.config.ps1"

# Create results directory
$resultsPath = Join-Path $projectRoot $OutputDir
if (-not (Test-Path $resultsPath)) {
    New-Item -ItemType Directory -Path $resultsPath -Force | Out-Null
    Write-Host "✅ Created results directory: $resultsPath" -ForegroundColor Green
}

# Set output file
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $resultsPath "sprint5-${Profile}-${timestamp}.json"
$env:K6_OUT = "json=$outputFile"

# =============================================================================
# CHECK PREREQUISITES
# =============================================================================

Write-Host ""
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

# Check k6 installation
try {
    $k6Version = k6 version 2>&1
    Write-Host "✅ k6 found: $k6Version" -ForegroundColor Green
} catch {
    Write-Host "❌ k6 not found. Please install k6:" -ForegroundColor Red
    Write-Host "   Windows: choco install k6" -ForegroundColor Yellow
    Write-Host "   Or download from: https://k6.io/docs/get-started/installation/" -ForegroundColor Yellow
    exit 1
}

# Check if services are running (optional)
Write-Host "🌐 Checking service availability..." -ForegroundColor Yellow
$services = @(
    @{ Name = "Auth"; Url = $env:AUTH_URL },
    @{ Name = "Learner"; Url = $env:LEARNER_URL },
    @{ Name = "Session"; Url = $env:SESSION_URL }
)

$servicesUp = 0
foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri "$($service.Url)/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ $($service.Name) service is up" -ForegroundColor Green
            $servicesUp++
        }
    } catch {
        Write-Host "   ⚠️  $($service.Name) service not responding (may need to start services)" -ForegroundColor Yellow
    }
}

if ($servicesUp -eq 0) {
    Write-Host ""
    Write-Host "⚠️  No services detected. Make sure to start services before load testing:" -ForegroundColor Yellow
    Write-Host "   docker-compose up -d" -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        exit 1
    }
}

# =============================================================================
# RUN LOAD TEST
# =============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                    Starting Load Test                          ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "📊 Profile: $Profile" -ForegroundColor Cyan
Write-Host "📁 Output:  $outputFile" -ForegroundColor Cyan
Write-Host "🌐 Dashboard: http://localhost:5665" -ForegroundColor Cyan
Write-Host ""

$testScript = Join-Path $scriptDir "sprint5-production-load-test.k6.js"

switch ($Profile) {
    'smoke' {
        Write-Host "🔥 Running smoke test (2 min, 5 VUs)..." -ForegroundColor Yellow
        Write-Host "   Purpose: Quick validation of basic functionality" -ForegroundColor Gray
        $env:K6_SCENARIOS = "smoke_test"
    }
    'load' {
        Write-Host "📈 Running load test (30 min, 100-200 VUs)..." -ForegroundColor Yellow
        Write-Host "   Purpose: Simulate normal production traffic" -ForegroundColor Gray
        $env:K6_SCENARIOS = "normal_load"
    }
    'stress' {
        Write-Host "💪 Running stress test (40 min, 500-700 VUs)..." -ForegroundColor Yellow
        Write-Host "   Purpose: Test at 500+ concurrent users (CRITICAL)" -ForegroundColor Gray
        $env:K6_SCENARIOS = "stress_test"
    }
    'spike' {
        Write-Host "⚡ Running spike test (5 min, 0→600→0 VUs)..." -ForegroundColor Yellow
        Write-Host "   Purpose: Test sudden traffic surge" -ForegroundColor Gray
        $env:K6_SCENARIOS = "spike_test"
    }
    'soak' {
        Write-Host "⏱️  Running soak test (30 min, 200 VUs sustained)..." -ForegroundColor Yellow
        Write-Host "   Purpose: Test for memory leaks and degradation" -ForegroundColor Gray
        $env:K6_SCENARIOS = "soak_test"
    }
    'trust-score' {
        Write-Host "🔐 Running trust score test (5 min, 50 req/s)..." -ForegroundColor Yellow
        Write-Host "   Purpose: Test new Sprint 5 trust score endpoints" -ForegroundColor Gray
        $env:K6_SCENARIOS = "trust_score_focused"
    }
    'auth' {
        Write-Host "🔑 Running auth-focused test (5 min, 100 req/s)..." -ForegroundColor Yellow
        Write-Host "   Purpose: Test authentication under high load" -ForegroundColor Gray
        $env:K6_SCENARIOS = "auth_focused"
    }
    'full' {
        Write-Host "🚀 Running FULL test suite (110+ minutes, all scenarios)..." -ForegroundColor Yellow
        Write-Host "   Purpose: Complete production readiness validation" -ForegroundColor Gray
        Write-Host ""
        Write-Host "⚠️  This will run ALL test scenarios sequentially:" -ForegroundColor Red
        Write-Host "   - Smoke (2m), Load (30m), Stress (40m), Spike (5m)," -ForegroundColor Gray
        Write-Host "   - Soak (30m), Auth (5m), Trust Score (5m)" -ForegroundColor Gray
        Write-Host ""
        $confirm = Read-Host "Are you sure? This will take 2+ hours (y/n)"
        if ($confirm -ne 'y') {
            Write-Host "❌ Test cancelled" -ForegroundColor Red
            exit 0
        }
        # Run all scenarios (don't filter)
        Remove-Item Env:\K6_SCENARIOS -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "⏰ Test starting at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# Run k6 test
try {
    $k6Args = @(
        "run",
        "--out", "json=$outputFile"
    )
    
    # Add specific scenario filter if set
    if ($env:K6_SCENARIOS) {
        $k6Args += "--env", "K6_SCENARIOS=$env:K6_SCENARIOS"
    }
    
    $k6Args += $testScript
    
    & k6 $k6Args
    
    $exitCode = $LASTEXITCODE
    
} catch {
    Write-Host ""
    Write-Host "❌ Load test failed with error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# =============================================================================
# RESULTS SUMMARY
# =============================================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Load Test Complete                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($exitCode -eq 0) {
    Write-Host "✅ Test PASSED" -ForegroundColor Green
} else {
    Write-Host "❌ Test FAILED (thresholds exceeded)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Results saved to:" -ForegroundColor Cyan
Write-Host "   $outputFile" -ForegroundColor White
Write-Host ""
Write-Host "📈 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Review metrics above" -ForegroundColor White
Write-Host "   2. Check for threshold violations" -ForegroundColor White
Write-Host "   3. Analyze bottlenecks if P95 > 200ms" -ForegroundColor White
Write-Host "   4. Proceed to Task 4 (Performance Optimization) if needed" -ForegroundColor White
Write-Host ""

# Open results file location
$openResults = Read-Host "Open results directory? (y/n)"
if ($openResults -eq 'y') {
    Invoke-Item $resultsPath
}

exit $exitCode
