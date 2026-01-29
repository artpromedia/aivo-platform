# Generate Prisma migrations for all services that need them
# This script runs prisma migrate dev for services with schema but no migrations

$ErrorActionPreference = "Continue"

# Services that need migrations
$services = @(
    "ai-orchestrator",
    "api-gateway",
    "approval-svc",
    "baseline-svc",
    "benchmarking-svc",
    "brain-orchestrator-svc",
    "collaboration-svc",
    "community-svc",
    "compliance-svc",
    "consent-svc",
    "content-authoring-svc",
    "coursework-ingest-svc",
    "curriculum-svc",
    "device-mgmt-svc",
    "dsr-svc",
    "edfi-svc",
    "engagement-svc",
    "event-collector-svc",
    "executive-function-svc",
    "experimentation-svc",
    "focus-svc",
    "game-gen-svc",
    "game-library-svc",
    "gradebook-svc",
    "iep-svc",
    "import-export-svc",
    "integration-svc",
    "legal-hold-svc",
    "life-skills-svc",
    "messaging-svc",
    "model-monitoring-svc",
    "model-registry-svc",
    "model-trainer-svc",
    "orchestrator-svc",
    "payments-svc",
    "personalization-svc",
    "professional-dev-svc",
    "realtime-svc",
    "research-svc",
    "residency-svc",
    "retention-svc",
    "search-svc",
    "sel-svc",
    "speech-therapy-svc",
    "sync-svc",
    "teacher-planning-svc",
    "training-svc",
    "translation-svc"
)

$successCount = 0
$failedCount = 0
$skippedCount = 0
$failed = @()

Write-Host "`n🔧 Generating Prisma migrations for $($services.Count) services...`n" -ForegroundColor Cyan

foreach ($service in $services) {
    $servicePath = "services/$service"
    $schemaPath = "$servicePath/prisma/schema.prisma"
    
    Write-Host "[$service] " -NoNewline -ForegroundColor Yellow
    
    if (-not (Test-Path $schemaPath)) {
        Write-Host "SKIP - No schema found" -ForegroundColor Gray
        $skippedCount++
        continue
    }
    
    try {
        Push-Location $servicePath
        
        # Run prisma migrate dev
        $output = npx prisma migrate dev --name initial_migration --create-only 2>&1
        
        if ($LASTEXITCODE -eq 0 -or $output -match "already in sync") {
            Write-Host "✓ SUCCESS" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red
            $failedCount++
            $failed += $service
        }
        
        Pop-Location
    }
    catch {
        Write-Host "✗ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $failedCount++
        $failed += $service
        Pop-Location
    }
}

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Generation Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Success:  " -NoNewline -ForegroundColor Green
Write-Host $successCount
Write-Host "✗ Failed:   " -NoNewline -ForegroundColor Red
Write-Host $failedCount
Write-Host "○ Skipped:  " -NoNewline -ForegroundColor Gray
Write-Host $skippedCount
Write-Host "========================================`n" -ForegroundColor Cyan

if ($failed.Count -gt 0) {
    Write-Host "Failed services:" -ForegroundColor Red
    foreach ($service in $failed) {
        Write-Host "  - $service" -ForegroundColor Red
    }
}

# Return exit code based on failures
if ($failedCount -gt 0) {
    exit 1
} else {
    Write-Host "✓ All migrations generated successfully!`n" -ForegroundColor Green
    exit 0
}
