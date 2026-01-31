# Fix Production Build - Automated Dockerfile Update Script
# This script updates all service Dockerfiles to build workspace dependencies

Write-Host "AIVO Platform - Production Build Fix Script" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host ""

# Determine workspace root (parent of scripts folder)
$workspaceRoot = Split-Path -Parent $PSScriptRoot

# Get all service Dockerfiles
$dockerfiles = Get-ChildItem -Path "$workspaceRoot\services\*\Dockerfile" -File

if ($dockerfiles.Count -eq 0) {
    Write-Host "❌ No Dockerfiles found in services/" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($dockerfiles.Count) Dockerfiles to update`n" -ForegroundColor Yellow

$updatedCount = 0
$skippedCount = 0
$errors = @()

foreach ($dockerfile in $dockerfiles) {
    $serviceName = $dockerfile.Directory.Name
    Write-Host "Processing: $serviceName..." -NoNewline
    
    try {
        # Read current content
        $content = Get-Content $dockerfile.FullName -Raw
        
        # Check if already fixed
        if ($content -match 'pnpm turbo build --filter="@aivo/[^"]+\.\.\."') {
            Write-Host " [SKIP] Already fixed" -ForegroundColor Gray
            $skippedCount++
            continue
        }
        
        # Check if it has the old pattern
        if ($content -match 'pnpm turbo build --filter="@aivo/[^"]+"') {
            # Create backup
            $backupPath = "$($dockerfile.FullName).backup"
            Copy-Item $dockerfile.FullName $backupPath -Force
            
            # Apply the fix: Add "..." to include dependencies
            $newContent = $content -replace `
                '(pnpm turbo build --filter="@aivo/[^"]+)"', `
                '$1..."'
            
            # Write updated content
            Set-Content -Path $dockerfile.FullName -Value $newContent -NoNewline
            
            Write-Host " [OK] Updated (backup created)" -ForegroundColor Green
            $updatedCount++
        } else {
            Write-Host " [WARN] No turbo build command found" -ForegroundColor Yellow
            $skippedCount++
        }
    }
    catch {
        Write-Host " [ERROR] $($_.Exception.Message)" -ForegroundColor Red
        $errors += @{
            Service = $serviceName
            Error = $_.Exception.Message
        }
    }
}

Write-Host ""
Write-Host "=" * 60
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   Updated: $updatedCount files" -ForegroundColor Green
Write-Host "   Skipped: $skippedCount files" -ForegroundColor Gray
Write-Host "   Errors:  $($errors.Count) files" -ForegroundColor $(if ($errors.Count -gt 0) { "Red" } else { "Gray" })
Write-Host ""

if ($errors.Count -gt 0) {
    Write-Host "Errors encountered:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   - $($error.Service): $($error.Error)"
    }
    Write-Host ""
}

if ($updatedCount -gt 0) {
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Review the changes: git diff services/*/Dockerfile"
    Write-Host "   2. Test one service: cd services/auth-svc; docker build -t test ."
    Write-Host "   3. Commit changes: git add services/; git commit -m 'fix: add workspace dependency builds to Dockerfiles'"
    Write-Host "   4. Push to trigger CI/CD: git push"
    Write-Host ""
    Write-Host "WARNING: Backup files created: services/**/Dockerfile.backup" -ForegroundColor Yellow
    Write-Host "   Delete after verifying: Remove-Item services/**/Dockerfile.backup -Force"
    Write-Host ""
}

Write-Host "Script completed!" -ForegroundColor Green
