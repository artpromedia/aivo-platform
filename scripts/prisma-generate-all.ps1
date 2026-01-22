# ==============================================================================
# Prisma Generate All (PowerShell)
# ==============================================================================
# Pre-generates Prisma clients for all services with Prisma schemas.
# This script should be run during CI/build to ensure Prisma clients are
# available before the build process starts.
#
# Usage:
#   .\scripts\prisma-generate-all.ps1
#   .\scripts\prisma-generate-all.ps1 -Service payments-svc
#
# Environment Variables:
#   $env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1"  - Skip checksum validation
#   $env:PRISMA_CLI_QUERY_ENGINE_TYPE = "binary"      - Use binary engine
#
# ==============================================================================

param(
    [string]$Service,
    [switch]$Verbose,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$ServicesDir = Join-Path $RootDir "services"

# Set Prisma environment for offline/CI builds
if (-not $env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING) {
    $env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1"
}

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "  Prisma Client Generation" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

# Find all services with Prisma schemas
function Find-PrismaServices {
    if ($Service) {
        $schemaPath = Join-Path $ServicesDir $Service "prisma" "schema.prisma"
        if (Test-Path $schemaPath) {
            return @($Service)
        } else {
            Write-Host "Error: Service '$Service' does not have a Prisma schema" -ForegroundColor Red
            exit 1
        }
    }

    $services = @()
    Get-ChildItem -Path $ServicesDir -Directory | ForEach-Object {
        $schemaPath = Join-Path $_.FullName "prisma" "schema.prisma"
        if (Test-Path $schemaPath) {
            $services += $_.Name
        }
    }
    return $services | Sort-Object
}

# Generate Prisma client for a service
function Generate-Client {
    param([string]$ServiceName)

    $serviceDir = Join-Path $ServicesDir $ServiceName
    $schemaPath = Join-Path $serviceDir "prisma" "schema.prisma"

    if (-not (Test-Path $schemaPath)) {
        Write-Host "  ⚠ Skipping $ServiceName (no schema.prisma)" -ForegroundColor Yellow
        return $true
    }

    if ($DryRun) {
        Write-Host "  [DRY RUN] Would generate client for: $ServiceName" -ForegroundColor Blue
        return $true
    }

    Write-Host "  → Generating Prisma client for: $ServiceName" -ForegroundColor Blue

    Push-Location $serviceDir
    try {
        if ($Verbose) {
            npx prisma generate --schema=prisma/schema.prisma
        } else {
            npx prisma generate --schema=prisma/schema.prisma 2>&1 | Where-Object { $_ -ne "" }
        }
        Write-Host "  ✓ Generated: $ServiceName" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  ✗ Failed: $ServiceName - $_" -ForegroundColor Red
        return $false
    } finally {
        Pop-Location
    }
}

# Main execution
$services = Find-PrismaServices
$total = $services.Count
$generated = 0
$failed = 0

Write-Host "Found $total services with Prisma schemas" -ForegroundColor Yellow
Write-Host ""

foreach ($svc in $services) {
    if (Generate-Client -ServiceName $svc) {
        $generated++
    } else {
        $failed++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "  Generated: $generated | Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Blue

if ($failed -gt 0) {
    exit 1
}

exit 0
