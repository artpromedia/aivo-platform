# AIVO E2E Test Runner (PowerShell)
# Run Patrol E2E tests for mobile apps on Windows

param(
    [ValidateSet('parent', 'teacher', 'learner', 'cross', 'all')]
    [string]$App = 'all',
    
    [ValidateSet('android', 'ios')]
    [string]$Platform = 'android',
    
    [ValidateSet('smoke', 'regression', 'critical', 'all')]
    [string]$Tag = 'smoke',
    
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Flavor = 'dev',
    
    [int]$Shards = 1,
    [int]$ShardIndex = 0,
    [switch]$Headless,
    [switch]$Verbose,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

# Colors
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Blue }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ReportsDir = Join-Path $ProjectRoot 'reports'

function Show-Usage {
    Write-Host "AIVO E2E Test Runner" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Usage: .\run_e2e.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -App          App to test: parent, teacher, learner, cross, all (default: all)"
    Write-Host "  -Platform     Platform: android, ios (default: android)"
    Write-Host "  -Tag          Test tag: smoke, regression, critical, all (default: smoke)"
    Write-Host "  -Flavor       Build flavor: dev, staging, prod (default: dev)"
    Write-Host "  -Shards       Number of shards for parallel execution (default: 1)"
    Write-Host "  -ShardIndex   Shard index to run (default: 0)"
    Write-Host "  -Headless     Run in headless mode"
    Write-Host "  -Verbose      Verbose output"
    Write-Host "  -Help         Show this help"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\run_e2e.ps1 -App parent -Platform android"
    Write-Host "  .\run_e2e.ps1 -App all -Tag regression -Shards 4 -ShardIndex 0"
}

if ($Help) {
    Show-Usage
    exit 0
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check Flutter
    try {
        $flutterVersion = flutter --version 2>$null
        if (-not $flutterVersion) { throw }
    }
    catch {
        Write-Error "Flutter not found. Please install Flutter first."
        exit 1
    }
    
    # Check Patrol CLI
    try {
        $patrolVersion = patrol --version 2>$null
        if (-not $patrolVersion) { throw }
    }
    catch {
        Write-Warn "Patrol CLI not found. Installing..."
        dart pub global activate patrol_cli
    }
    
    # Check Android tools
    if ($Platform -eq 'android') {
        try {
            $adbVersion = adb version 2>$null
            if (-not $adbVersion) { throw }
        }
        catch {
            Write-Error "ADB not found. Please install Android SDK."
            exit 1
        }
        
        # Check emulator
        $devices = adb devices
        if ($devices -notmatch 'emulator') {
            Write-Warn "No Android emulator running. Please start one."
        }
    }
    
    Write-Success "Prerequisites check passed"
}

function Initialize-Reports {
    New-Item -ItemType Directory -Force -Path (Join-Path $ReportsDir 'screenshots') | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $ReportsDir 'logs') | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $ReportsDir 'junit') | Out-Null
}

function Build-App {
    param([string]$AppName)
    
    Write-Info "Building $AppName app for $Platform..."
    
    $appPath = Join-Path (Split-Path -Parent (Split-Path -Parent $ProjectRoot)) "apps\mobile-$AppName"
    Push-Location $appPath
    
    try {
        flutter pub get
        
        if ($Platform -eq 'android') {
            patrol build android --flavor $Flavor
        }
        else {
            if ($Headless) {
                patrol build ios --flavor $Flavor --simulator
            }
            else {
                patrol build ios --flavor $Flavor
            }
        }
        
        Write-Success "Built $AppName app"
    }
    finally {
        Pop-Location
    }
}

function Invoke-Tests {
    param([string]$AppName)
    
    $targetDir = "integration_test\${AppName}_app"
    if ($AppName -eq 'cross') {
        $targetDir = "integration_test\cross_app"
    }
    
    Write-Info "Running E2E tests for $AppName on $Platform..."
    
    $patrolArgs = @(
        '--target', $targetDir,
        '--flavor', $Flavor,
        '--dart-define=TEST_ENV=test'
    )
    
    if ($Shards -gt 1) {
        $patrolArgs += '--shard-index', $ShardIndex
        $patrolArgs += '--shard-count', $Shards
    }
    
    if ($Tag -ne 'all') {
        $patrolArgs += '--tags', $Tag
    }
    
    if ($Verbose) {
        $patrolArgs += '--verbose'
    }
    
    # Set environment
    $env:HEADLESS = $Headless.ToString().ToLower()
    $env:SHARD_INDEX = $ShardIndex
    $env:TOTAL_SHARDS = $Shards
    
    Push-Location $ProjectRoot
    
    try {
        $logFile = Join-Path $ReportsDir "logs\${AppName}_${Platform}.log"
        patrol test @patrolArgs 2>&1 | Tee-Object -FilePath $logFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Tests passed for $AppName"
            return $true
        }
        else {
            Write-Error "Tests failed for $AppName"
            return $false
        }
    }
    finally {
        Pop-Location
    }
}

# Main
Write-Info "Starting AIVO E2E Test Runner"
Write-Info "Configuration:"
Write-Info "  App: $App"
Write-Info "  Platform: $Platform"
Write-Info "  Tag: $Tag"
Write-Info "  Flavor: $Flavor"
Write-Info "  Shards: $Shards (index: $ShardIndex)"
Write-Info "  Headless: $Headless"
Write-Host ""

Test-Prerequisites
Initialize-Reports

# Determine apps
$apps = @()
if ($App -eq 'all') {
    $apps = @('parent', 'teacher', 'learner')
}
else {
    $apps = @($App)
}

# Build apps
if ($App -ne 'cross') {
    foreach ($a in $apps) {
        Build-App -AppName $a
    }
}

# Run tests
$failed = 0
foreach ($a in $apps) {
    if (-not (Invoke-Tests -AppName $a)) {
        $failed++
    }
}

# Summary
Write-Host ""
if ($failed -eq 0) {
    Write-Success "All tests passed! ✓"
}
else {
    Write-Error "$failed app(s) had test failures"
    exit 1
}
