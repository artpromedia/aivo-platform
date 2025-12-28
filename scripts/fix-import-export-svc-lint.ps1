# Fix lint issues in import-export-svc
# Run from the repository root: .\scripts\fix-import-export-svc-lint.ps1
#
# PROGRESS: 807 -> ~550 errors (32% reduction)
#
# Remaining issues require significant refactoring:
# 1. Cognitive complexity (detectFormat, findElement) - split into helper functions
# 2. Too many parameters (processOrganizationItem, processResource) - use options objects
# 3. strictOptionalPropertyTypes - use conditional property assignment

$svcPath = "services/import-export-svc/src"

Write-Host "Fixing lint issues in import-export-svc..." -ForegroundColor Cyan

# ============================================================================
# 1. Fix node: prefix imports
# ============================================================================
Write-Host "`n[1/6] Fixing node: prefix imports..." -ForegroundColor Yellow

Get-ChildItem -Path $svcPath -Filter "*.ts" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { return }
    $original = $content
    
    # Fix path imports
    $content = $content -replace "from 'path'", "from 'node:path'"
    $content = $content -replace 'from "path"', 'from "node:path"'
    
    # Fix fs/promises imports
    $content = $content -replace "import\('fs/promises'\)", "import('node:fs/promises')"
    $content = $content -replace "from 'fs/promises'", "from 'node:fs/promises'"
    
    # Avoid double-prefixing
    $content = $content -replace "node:node:", "node:"
    
    if ($content -ne $original) {
        Set-Content $_.FullName $content -NoNewline -ErrorAction SilentlyContinue
        Write-Host "  Fixed imports in: $($_.Name)" -ForegroundColor Green
    }
}

# ============================================================================
# 2. Fix unnecessary type assertions
# ============================================================================
Write-Host "`n[2/6] Fixing unnecessary type assertions..." -ForegroundColor Yellow

Get-ChildItem -Path $svcPath -Filter "*.ts" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { return }
    $original = $content
    
    # Remove (ns as string) when ns is already string from type guard
    $content = $content -replace "\(ns as string\)\.includes", "ns.includes"
    $content = $content -replace "\(ns as string\)\.startsWith", "ns.startsWith"
    
    if ($content -ne $original) {
        Set-Content $_.FullName $content -NoNewline -ErrorAction SilentlyContinue
        Write-Host "  Fixed type assertions in: $($_.Name)" -ForegroundColor Green
    }
}

# ============================================================================
# 3. Fix parseFloat/parseInt -> Number.parseFloat/parseInt
# ============================================================================
Write-Host "`n[3/6] Fixing parseFloat/parseInt -> Number equivalents..." -ForegroundColor Yellow

Get-ChildItem -Path $svcPath -Filter "*.ts" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { return }
    $original = $content
    
    # Replace standalone parseFloat/parseInt (not preceded by Number.)
    $content = $content -replace "(?<!Number\.)parseFloat\(", "Number.parseFloat("
    $content = $content -replace "(?<!Number\.)parseInt\(", "Number.parseInt("
    
    if ($content -ne $original) {
        Set-Content $_.FullName $content -NoNewline -ErrorAction SilentlyContinue
        Write-Host "  Fixed parseFloat/parseInt in: $($_.Name)" -ForegroundColor Green
    }
}

# ============================================================================
# 4. Fix .replace with /g flag -> .replaceAll
# ============================================================================
Write-Host "`n[4/6] Fixing .replace with global flag -> .replaceAll..." -ForegroundColor Yellow

Get-ChildItem -Path $svcPath -Filter "*.ts" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { return }
    $original = $content
    
    # Replace .replace(..., /gi) with .replaceAll
    # This is a simplified pattern - may need manual review
    $content = $content -replace "\.replace\((/.+/gi?),", ".replaceAll(`$1,"
    
    if ($content -ne $original) {
        Set-Content $_.FullName $content -NoNewline -ErrorAction SilentlyContinue
        Write-Host "  Fixed replaceAll in: $($_.Name)" -ForegroundColor Green
    }
}

# ============================================================================
# 5. Fix tsconfig deprecation warning  
# ============================================================================
Write-Host "`n[5/6] Fixing tsconfig deprecation warning..." -ForegroundColor Yellow

$tsconfig = "services/import-export-svc/tsconfig.json"
if (Test-Path $tsconfig) {
    $content = Get-Content $tsconfig -Raw
    
    if ($content -notmatch '"ignoreDeprecations"') {
        # Add ignoreDeprecations after opening compilerOptions brace
        $content = $content -replace '("compilerOptions":\s*\{)', '$1
    "ignoreDeprecations": "5.0",'
        Set-Content $tsconfig $content -NoNewline
        Write-Host "  Added ignoreDeprecations to tsconfig.json" -ForegroundColor Green
    } else {
        Write-Host "  tsconfig.json already has ignoreDeprecations" -ForegroundColor DarkGray
    }
}

# ============================================================================
# 6. Remove unused variable assignments
# ============================================================================
Write-Host "`n[6/6] Removing unused variable assignments..." -ForegroundColor Yellow

$scormImporter = "$svcPath/import/importers/scorm.importer.ts"
if (Test-Path $scormImporter) {
    $content = Get-Content $scormImporter -Raw
    $original = $content
    
    # Remove unused defaultOrg if it's only assigned but not used
    # Check if defaultOrg is used elsewhere in the file
    if ($content -match 'defaultOrg' -and ($content -split 'defaultOrg').Count -eq 2) {
        $content = $content -replace "const defaultOrg = manifest\.organizations\?\.\[0\]\?\.\['\`$'\]\?\.\['default'\];\r?\n\s*", ""
        Write-Host "  Removed unused defaultOrg in scorm.importer.ts" -ForegroundColor Green
    }
    
    if ($content -ne $original) {
        Set-Content $scormImporter $content -NoNewline -ErrorAction SilentlyContinue
    }
}

# ============================================================================
# Summary
# ============================================================================
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "Lint fixes applied!" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "`nRemaining manual fixes needed:" -ForegroundColor Yellow
Write-Host "  1. Refactor functions with high cognitive complexity (split into smaller functions)" -ForegroundColor White
Write-Host "  2. Refactor methods with >7 parameters to use options objects" -ForegroundColor White
Write-Host "  3. Wrap case block declarations in braces: case 'x': { const y = ...; break; }" -ForegroundColor White
Write-Host "  4. Fix exactOptionalPropertyTypes by updating interface definitions" -ForegroundColor White
Write-Host "`nRun 'pnpm --filter @aivo/import-export-svc lint' to check remaining issues" -ForegroundColor Cyan
