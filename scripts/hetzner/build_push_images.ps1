# ==============================================================================
# Build and push all AIVO backend service images to GHCR
# ==============================================================================

$ErrorActionPreference = "Stop"
$REGISTRY = "ghcr.io/artpromedia"
$TAG = "latest"
$DOCKERFILE = "docker/Dockerfile.service"

# All 18 backend services
$services = @(
    "auth-svc",
    "session-svc",
    "consent-svc",
    "profile-svc",
    "content-svc",
    "assessment-svc",
    "personalization-svc",
    "life-skills-svc",
    "ai-orchestrator",
    "analytics-svc",
    "notify-svc",
    "messaging-svc",
    "goal-svc",
    "focus-svc",
    "billing-svc",
    "payments-svc",
    "parent-svc",
    "baseline-svc"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Building & pushing $($services.Count) AIVO services to GHCR" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$succeeded = @()
$failed = @()

foreach ($svc in $services) {
    $imageName = "$REGISTRY/aivo-$svc`:$TAG"
    Write-Host "[$($services.IndexOf($svc) + 1)/$($services.Count)] Building $svc -> $imageName" -ForegroundColor Yellow
    
    $startTime = Get-Date
    
    docker build `
        --file $DOCKERFILE `
        --build-arg SERVICE_NAME=$svc `
        --tag $imageName `
        --platform linux/amd64 `
        . 2>&1 | ForEach-Object {
            if ($_ -match "^(Step|DONE|Successfully|#\d+)") { Write-Host "  $_" -ForegroundColor DarkGray }
        }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED to build $svc" -ForegroundColor Red
        $failed += $svc
        continue
    }
    
    $buildTime = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
    Write-Host "  Built in ${buildTime}s. Pushing..." -ForegroundColor DarkGray
    
    docker push $imageName 2>&1 | ForEach-Object {
        if ($_ -match "digest|latest|Pushed") { Write-Host "  $_" -ForegroundColor DarkGray }
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED to push $svc" -ForegroundColor Red
        $failed += $svc
        continue
    }
    
    $totalTime = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
    Write-Host "  ✅ $svc done (${totalTime}s)" -ForegroundColor Green
    $succeeded += $svc
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RESULTS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Succeeded: $($succeeded.Count)/$($services.Count)" -ForegroundColor Green
if ($failed.Count -gt 0) {
    Write-Host "  Failed:    $($failed -join ', ')" -ForegroundColor Red
}
Write-Host ""
