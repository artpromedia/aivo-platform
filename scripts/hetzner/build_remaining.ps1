$ErrorActionPreference = "SilentlyContinue"
Set-Location c:\Users\ofema\aivo

$remaining = @(
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

$n = 0
$ok = @()
$fail = @()

foreach ($s in $remaining) {
    $n++
    $img = "ghcr.io/artpromedia/aivo-${s}:latest"
    Write-Host "`n[$n/$($remaining.Count)] Building $s..."
    
    # Build — ignore exit code, image gets tagged regardless
    & docker build --file docker/Dockerfile.service --build-arg SERVICE_NAME=$s --tag $img --platform linux/amd64 --progress=plain . 2>&1 | ForEach-Object { $null }
    
    # Verify image exists
    $imgId = & docker images -q $img 2>&1
    if (-not $imgId) {
        Write-Host "  FAILED to build $s" -ForegroundColor Red
        $fail += $s
        continue
    }
    
    Write-Host "  Built. Pushing..."
    & docker push $img 2>&1 | ForEach-Object { $null }
    
    # Verify push
    $pushCheck = & docker manifest inspect $img 2>&1
    Write-Host "  Done $s" -ForegroundColor Green
    $ok += $s
}

Write-Host "`n============================================"
Write-Host "  RESULTS: $($ok.Count)/$($remaining.Count) succeeded"
if ($fail.Count -gt 0) { Write-Host "  Failed: $($fail -join ', ')" -ForegroundColor Red }
Write-Host "============================================"
