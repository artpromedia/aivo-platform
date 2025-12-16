<# 
.SYNOPSIS
    AIVO Platform Database Setup - Main Orchestration Script

.DESCRIPTION
    Sets up all database migrations and seed data for the AIVO platform.
    Respects foreign key dependencies by running services in correct order.

.PARAMETER Command
    The command to execute: all, migrate, seed, reset, status

.PARAMETER SkipSeed
    Skip seeding after migration (only applies to 'all' command)

.EXAMPLE
    .\db-setup.ps1
    .\db-setup.ps1 -Command migrate
    .\db-setup.ps1 -Command seed
    .\db-setup.ps1 -Command reset
    .\db-setup.ps1 -Command status
#>

param(
    [ValidateSet("all", "migrate", "seed", "reset", "status")]
    [string]$Command = "all",
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

$RootDir = Split-Path -Parent $PSScriptRoot
$ServicesDir = Join-Path $RootDir "services"

# Service migration order (respects foreign key dependencies)
$ServiceOrder = @(
    # 1. Core Infrastructure
    "tenant-svc"           # Organizations and tenants (base for multi-tenancy)
    "auth-svc"             # Users, roles, permissions
    
    # 2. User Profiles
    "profile-svc"          # Learner profiles linked to users
    
    # 3. Content Layer
    "content-svc"          # Learning objects, modules, courses
    "content-authoring-svc" # Authoring workflows, drafts
    
    # 4. Assessment & Learning
    "assessment-svc"       # Quizzes, questions, attempts
    "session-svc"          # Learning sessions
    "baseline-svc"         # Diagnostic assessments
    
    # 5. Personalization
    "personalization-svc"  # Learner models, preferences
    "learner-model-svc"    # AI-driven learner modeling
    
    # 6. Engagement & Gamification
    "engagement-svc"       # XP, badges, streaks, achievements
    "focus-svc"            # Focus tracking and interventions
    
    # 7. Homework & Goals
    "homework-helper-svc"  # Homework assistance
    "goal-svc"             # Learning goals and objectives
    "teacher-planning-svc" # Teacher session planning
    
    # 8. Analytics & Research
    "analytics-svc"        # Learning events, metrics
    "retention-svc"        # Activity tracking, cohorts
    "research-svc"         # Research data collection
    "experimentation-svc"  # A/B testing, feature flags
    
    # 9. Marketplace & Billing
    "marketplace-svc"      # Content marketplace
    "billing-svc"          # Billing and subscriptions
    "payments-svc"         # Payment processing
    
    # 10. Communication
    "notify-svc"           # Notification templates, deliveries
    "messaging-svc"        # In-app messaging
    
    # 11. Integration & Sync
    "integration-svc"      # External integrations
    "lti-svc"              # LTI protocol support
    "sis-sync-svc"         # SIS synchronization
    
    # 12. Safety & Compliance
    "consent-svc"          # Consent management
    "dsr-svc"              # Data subject requests (GDPR/CCPA)
    
    # 13. Tools & Sandbox
    "embedded-tools-svc"   # Embedded tool configurations
    "sandbox-svc"          # Sandbox environments
    "device-mgmt-svc"      # Device management
    
    # 14. AI & Reports
    "ai-orchestrator"      # AI orchestration (no Prisma - uses migrations/)
    "reports-svc"          # Report generation
    "collaboration-svc"    # Real-time collaboration
)

# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-WarningMessage {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-ErrorMessage {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Step {
    param([string]$Message)
    Write-Host "[STEP] $Message" -ForegroundColor Yellow
}

function Test-ServiceHasPrisma {
    param([string]$ServiceName)
    $prismaPath = Join-Path (Join-Path (Join-Path $ServicesDir $ServiceName) "prisma") "schema.prisma"
    return Test-Path $prismaPath
}

function Test-ServiceHasSeed {
    param([string]$ServiceName)
    $seedPath = Join-Path (Join-Path (Join-Path $ServicesDir $ServiceName) "prisma") "seed.ts"
    return Test-Path $seedPath
}

function Get-ServicePrismaPath {
    param([string]$ServiceName)
    return Join-Path (Join-Path $ServicesDir $ServiceName) "prisma"
}

# ══════════════════════════════════════════════════════════════════════════════
# MIGRATION FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

function Invoke-Migration {
    param([string]$ServiceName)
    
    if (-not (Test-ServiceHasPrisma $ServiceName)) {
        Write-WarningMessage "Skipping $ServiceName (no prisma directory)"
        return $true
    }
    
    Write-Step "Migrating $ServiceName..."
    
    $servicePath = Join-Path $ServicesDir $ServiceName
    Push-Location $servicePath
    
    try {
        # Check if there are any migrations to apply
        $result = & npx prisma migrate deploy 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Success "$ServiceName migrated successfully"
            return $true
        } else {
            Write-ErrorMessage "$ServiceName migration failed: $result"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "$ServiceName migration failed: $_"
        return $false
    }
    finally {
        Pop-Location
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# SEED FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

function Invoke-Seed {
    param([string]$ServiceName)
    
    if (-not (Test-ServiceHasSeed $ServiceName)) {
        Write-WarningMessage "Skipping $ServiceName (no seed.ts)"
        return $true
    }
    
    Write-Step "Seeding $ServiceName..."
    
    $servicePath = Join-Path $ServicesDir $ServiceName
    Push-Location $servicePath
    
    try {
        $result = & npx prisma db seed 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Success "$ServiceName seeded successfully"
            return $true
        } else {
            Write-ErrorMessage "$ServiceName seeding failed: $result"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "$ServiceName seeding failed: $_"
        return $false
    }
    finally {
        Pop-Location
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# RESET FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

function Invoke-Reset {
    param([string]$ServiceName)
    
    if (-not (Test-ServiceHasPrisma $ServiceName)) {
        Write-WarningMessage "Skipping $ServiceName (no prisma directory)"
        return $true
    }
    
    Write-Step "Resetting $ServiceName..."
    
    $servicePath = Join-Path $ServicesDir $ServiceName
    Push-Location $servicePath
    
    try {
        $result = & npx prisma migrate reset --force 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Success "$ServiceName reset successfully"
            return $true
        } else {
            Write-ErrorMessage "$ServiceName reset failed: $result"
            return $false
        }
    }
    catch {
        Write-ErrorMessage "$ServiceName reset failed: $_"
        return $false
    }
    finally {
        Pop-Location
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# STATUS FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

function Get-MigrationStatus {
    param([string]$ServiceName)
    
    if (-not (Test-ServiceHasPrisma $ServiceName)) {
        return @{
            Service = $ServiceName
            HasPrisma = $false
            HasSeed = $false
            Status = "No Prisma"
        }
    }
    
    $servicePath = Join-Path $ServicesDir $ServiceName
    Push-Location $servicePath
    
    try {
        $result = & npx prisma migrate status 2>&1
        $hasPending = $result -match "pending migration|not yet been applied"
        
        return @{
            Service = $ServiceName
            HasPrisma = $true
            HasSeed = Test-ServiceHasSeed $ServiceName
            Status = if ($hasPending) { "Pending" } else { "Up to date" }
        }
    }
    catch {
        return @{
            Service = $ServiceName
            HasPrisma = $true
            HasSeed = Test-ServiceHasSeed $ServiceName
            Status = "Error checking status"
        }
    }
    finally {
        Pop-Location
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ══════════════════════════════════════════════════════════════════════════════

Write-Header "AIVO Platform Database Setup"

# Load environment variables
$envFile = Join-Path $RootDir ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
    Write-Info "Loaded environment from .env"
}

$totalServices = $ServiceOrder.Count
$successCount = 0
$failCount = 0

switch ($Command) {
    "migrate" {
        Write-Info "Running migrations only..."
        Write-Host ""
        
        foreach ($service in $ServiceOrder) {
            if (Invoke-Migration $service) {
                $successCount++
            } else {
                $failCount++
            }
        }
    }
    
    "seed" {
        Write-Info "Running seeds only..."
        Write-Host ""
        
        foreach ($service in $ServiceOrder) {
            if (Invoke-Seed $service) {
                $successCount++
            } else {
                $failCount++
            }
        }
    }
    
    "reset" {
        Write-Host ""
        Write-Host "⚠️  WARNING: This will DROP all databases and recreate them!" -ForegroundColor Red
        Write-Host ""
        $confirm = Read-Host "Are you sure you want to continue? (yes/N)"
        
        if ($confirm -ne "yes") {
            Write-Info "Aborted."
            exit 0
        }
        
        Write-Host ""
        
        foreach ($service in $ServiceOrder) {
            if (Invoke-Reset $service) {
                $successCount++
            } else {
                $failCount++
            }
        }
    }
    
    "status" {
        Write-Info "Checking migration status..."
        Write-Host ""
        
        $statusTable = @()
        foreach ($service in $ServiceOrder) {
            $statusTable += Get-MigrationStatus $service
        }
        
        Write-Host ""
        Write-Host "Service Migration Status:" -ForegroundColor Cyan
        Write-Host "-" * 60
        Write-Host ("{0,-30} {1,-12} {2,-8} {3}" -f "Service", "Has Prisma", "Has Seed", "Status")
        Write-Host "-" * 60
        
        foreach ($status in $statusTable) {
            $prismaIcon = if ($status.HasPrisma) { "✅" } else { "❌" }
            $seedIcon = if ($status.HasSeed) { "✅" } else { "❌" }
            $statusColor = switch ($status.Status) {
                "Up to date" { "Green" }
                "Pending" { "Yellow" }
                "No Prisma" { "DarkGray" }
                default { "Red" }
            }
            Write-Host ("{0,-30} {1,-12} {2,-8} " -f $status.Service, $prismaIcon, $seedIcon) -NoNewline
            Write-Host $status.Status -ForegroundColor $statusColor
        }
        Write-Host ""
        exit 0
    }
    
    "all" {
        Write-Info "Running full setup (migrate + seed)..."
        Write-Host ""
        
        Write-Header "Phase 1: Migrations"
        
        $migrationSuccess = $true
        foreach ($service in $ServiceOrder) {
            if (-not (Invoke-Migration $service)) {
                $failCount++
                $migrationSuccess = $false
            } else {
                $successCount++
            }
        }
        
        if (-not $SkipSeed -and $migrationSuccess) {
            Write-Header "Phase 2: Seeding"
            
            $seedSuccessCount = 0
            $seedFailCount = 0
            
            foreach ($service in $ServiceOrder) {
                if (Invoke-Seed $service) {
                    $seedSuccessCount++
                } else {
                    $seedFailCount++
                }
            }
            
            Write-Host ""
            Write-Info "Seeding complete: $seedSuccessCount succeeded, $seedFailCount failed"
        }
        elseif (-not $migrationSuccess) {
            Write-WarningMessage "Skipping seeding due to migration failures"
        }
        else {
            Write-WarningMessage "Skipping seeding (--SkipSeed flag)"
        }
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

Write-Header "Setup Complete"

if ($Command -ne "status") {
    Write-Host "Results: $successCount/$totalServices succeeded, $failCount failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
    Write-Host ""
}

if ($failCount -eq 0) {
    Write-Host "Default credentials:" -ForegroundColor Cyan
    Write-Host "  Admin:   admin@aivo.dev / Admin123!@#"
    Write-Host "  Author:  author@aivo.dev / Author123!@#"
    Write-Host "  Teacher: teacher@aivo.dev / Teacher123!@#"
    Write-Host "  Learner: alex@aivo.dev / Learner123!@#"
    Write-Host ""
}

exit $failCount
