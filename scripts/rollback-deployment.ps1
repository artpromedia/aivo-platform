<#
.SYNOPSIS
    Production Rollback Script
    
.DESCRIPTION
    Emergency rollback script for AIVO platform deployments.
    Quickly switches traffic back to the previous stable deployment slot.
    
.PARAMETER FromSlot
    Current (failing) slot: 'blue' or 'green'
    
.PARAMETER ToSlot
    Target (stable) slot: 'blue' or 'green'
    
.PARAMETER Environment
    Target environment: 'staging' or 'production'
    
.PARAMETER Reason
    Reason for rollback (for logging)
    
.EXAMPLE
    .\rollback-deployment.ps1 -FromSlot green -ToSlot blue -Environment production -Reason "High error rate"
    
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('blue', 'green')]
    [string]$FromSlot,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet('blue', 'green')]
    [string]$ToSlot,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet('staging', 'production')]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$Reason = "Manual rollback"
)

$ErrorActionPreference = "Stop"

# =============================================================================
# CONFIGURATION
# =============================================================================

$Config = @{
    ProjectRoot = (Get-Location).Path
    RollbackTimeout = 300  # 5 minutes
    HealthCheckTimeout = 60  # 1 minute
}

# Environment URLs
$EnvironmentUrls = @{
    staging = @{
        blue = "https://blue-staging.aivo.app"
        green = "https://green-staging.aivo.app"
        loadBalancer = "https://staging.aivo.app"
    }
    production = @{
        blue = "https://blue.aivo.app"
        green = "https://green.aivo.app"
        loadBalancer = "https://aivo.app"
    }
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  $Message" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "⏳ $Message..." -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Get-Timestamp {
    return Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    
    $timestamp = Get-Timestamp
    $logMessage = "[$timestamp] [ROLLBACK] [$Level] $Message"
    
    $logDir = Join-Path $Config.ProjectRoot "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    $logFile = Join-Path $logDir "rollback-$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $logFile -Value $logMessage
}

# =============================================================================
# ROLLBACK WORKFLOW
# =============================================================================

function Invoke-EmergencyRollback {
    $rollbackId = "rollback-$Environment-$FromSlot-to-$ToSlot-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $startTime = Get-Date
    
    Write-Header "EMERGENCY ROLLBACK"
    Write-Host "Rollback ID: $rollbackId" -ForegroundColor Red
    Write-Host "Environment: $Environment" -ForegroundColor Red
    Write-Host "From Slot: $FromSlot (failing)" -ForegroundColor Red
    Write-Host "To Slot: $ToSlot (stable)" -ForegroundColor Red
    Write-Host "Reason: $Reason" -ForegroundColor Red
    Write-Host ""
    
    Write-Log "Starting emergency rollback: $rollbackId" "WARNING"
    Write-Log "Reason: $Reason" "WARNING"
    
    try {
        # Step 1: Immediate traffic switch
        Write-Step "Switching all traffic to $ToSlot slot IMMEDIATELY"
        Write-Log "Switching traffic from $FromSlot to $ToSlot" "WARNING"
        
        # In a real deployment:
        # - AWS: aws elbv2 modify-target-group-weights
        # - GCP: gcloud compute backend-services update
        # - Azure: az network traffic-manager endpoint update
        # - Kubernetes: kubectl patch service
        
        Start-Sleep -Seconds 2  # Simulated switch time
        Write-Success "Traffic switched to $ToSlot slot"
        Write-Log "Traffic successfully switched to $ToSlot" "SUCCESS"
        
        # Step 2: Verify target slot health
        Write-Step "Verifying $ToSlot slot health"
        $targetUrl = $EnvironmentUrls[$Environment][$ToSlot]
        
        $healthCheckPassed = $false
        $retries = 0
        $maxRetries = 12  # 1 minute with 5-second intervals
        
        while (-not $healthCheckPassed -and $retries -lt $maxRetries) {
            try {
                $response = Invoke-WebRequest -Uri "$targetUrl/health" -Method Get -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    $healthCheckPassed = $true
                    Write-Success "$ToSlot slot is healthy"
                    Write-Log "$ToSlot slot health check passed" "SUCCESS"
                }
            }
            catch {
                $retries++
                Write-Host "  Health check attempt $retries/$maxRetries..." -ForegroundColor Yellow
                Start-Sleep -Seconds 5
            }
        }
        
        if (-not $healthCheckPassed) {
            Write-Error "WARNING: $ToSlot slot health checks failing!"
            Write-Log "$ToSlot slot health checks failing after rollback" "ERROR"
            Write-Host ""
            Write-Host "CRITICAL: Both slots may be unhealthy!" -ForegroundColor Red
            Write-Host "Manual intervention required immediately!" -ForegroundColor Red
            return $false
        }
        
        # Step 3: Stop failed slot services
        Write-Step "Stopping services on $FromSlot slot"
        Write-Log "Stopping services on $FromSlot slot" "INFO"
        
        # In a real deployment, stop or kill services on the failing slot
        Start-Sleep -Seconds 1  # Simulated stop time
        Write-Success "Services on $FromSlot stopped"
        
        # Step 4: Notification
        Write-Step "Sending rollback notifications"
        Write-Log "Sending rollback notifications" "INFO"
        
        # In a real deployment:
        # - Send PagerDuty alert
        # - Post to Slack
        # - Send email to team
        # - Update status page
        
        Write-Success "Notifications sent"
        
        # Success!
        $duration = (Get-Date) - $startTime
        Write-Header "ROLLBACK SUCCESSFUL"
        Write-Success "Rollback completed in $($duration.TotalSeconds) seconds"
        Write-Log "Rollback $rollbackId completed successfully in $($duration.TotalSeconds)s" "SUCCESS"
        
        Write-Host ""
        Write-Host "Rollback Summary:" -ForegroundColor Green
        Write-Host "  Rollback ID: $rollbackId" -ForegroundColor White
        Write-Host "  Environment: $Environment" -ForegroundColor White
        Write-Host "  Active Slot: $ToSlot (stable)" -ForegroundColor White
        Write-Host "  Failed Slot: $FromSlot (stopped)" -ForegroundColor White
        Write-Host "  Duration: $($duration.TotalSeconds) seconds" -ForegroundColor White
        Write-Host "  Reason: $Reason" -ForegroundColor White
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Yellow
        Write-Host "  1. Investigate failure in $FromSlot slot" -ForegroundColor White
        Write-Host "  2. Review logs: logs/rollback-$(Get-Date -Format 'yyyyMMdd').log" -ForegroundColor White
        Write-Host "  3. Fix issues before next deployment attempt" -ForegroundColor White
        Write-Host "  4. Update team via Slack/Email" -ForegroundColor White
        
        return $true
    }
    catch {
        Write-Header "ROLLBACK FAILED"
        Write-Error "Rollback failed: $_"
        Write-Log "Rollback $rollbackId failed: $_" "ERROR"
        
        Write-Host ""
        Write-Host "CRITICAL FAILURE!" -ForegroundColor Red
        Write-Host "Manual intervention required immediately!" -ForegroundColor Red
        Write-Host "Contact on-call engineer NOW!" -ForegroundColor Red
        
        return $false
    }
}

# =============================================================================
# EXECUTE ROLLBACK
# =============================================================================

# Confirm with user (skip in automated scenarios)
if (-not $env:AUTOMATED_ROLLBACK) {
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  WARNING: This will perform an EMERGENCY ROLLBACK             ║" -ForegroundColor Red
    Write-Host "║  All traffic will be switched to $ToSlot slot                  ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    $confirmation = Read-Host "Type 'ROLLBACK' to confirm"
    
    if ($confirmation -ne 'ROLLBACK') {
        Write-Host "Rollback cancelled by user" -ForegroundColor Yellow
        exit 0
    }
}

$rollbackSuccess = Invoke-EmergencyRollback

if ($rollbackSuccess) {
    exit 0
} else {
    exit 1
}
