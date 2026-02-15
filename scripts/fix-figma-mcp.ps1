#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Fixes Figma MCP server configuration issues in VS Code.

.DESCRIPTION
    This script resolves two common problems preventing the Figma MCP server from starting:
    1. Expired/revoked npm auth tokens that cause 404 errors
    2. Incorrect package name in MCP configuration

    Run this script from the workspace root (c:\Users\ofema\aivo).
#>

$ErrorActionPreference = "Continue"

Write-Host "`n=== Figma MCP Fix Script ===" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------
# Step 1: Clear stale npm auth tokens
# ------------------------------------------------------------------
Write-Host "[1/4] Checking for stale npm auth tokens..." -ForegroundColor Yellow

# Check user-level .npmrc
$userNpmrc = Join-Path $env:USERPROFILE ".npmrc"
if (Test-Path $userNpmrc) {
    $content = Get-Content $userNpmrc -Raw
    if ($content -match "_auth|_authToken|//registry\.npmjs\.org") {
        Write-Host "  -> Found auth tokens in $userNpmrc" -ForegroundColor Red
        # Remove auth-related lines, keep everything else
        $lines = Get-Content $userNpmrc
        $cleanLines = $lines | Where-Object { $_ -notmatch "^\s*(_auth|//.*:_auth)" }
        if ($cleanLines) {
            Set-Content $userNpmrc -Value $cleanLines
        } else {
            Remove-Item $userNpmrc
        }
        Write-Host "  -> Cleaned stale tokens from $userNpmrc" -ForegroundColor Green
    } else {
        Write-Host "  -> No auth tokens in user .npmrc" -ForegroundColor Green
    }
} else {
    Write-Host "  -> No user .npmrc found (OK)" -ForegroundColor Green
}

# Check project-level .npmrc
$projectNpmrc = Join-Path (Join-Path $PSScriptRoot "..") ".npmrc"
$projectNpmrc = (Resolve-Path $projectNpmrc -ErrorAction SilentlyContinue).Path
if ($projectNpmrc -and (Test-Path $projectNpmrc)) {
    $content = Get-Content $projectNpmrc -Raw
    if ($content -match "_auth|_authToken|//registry\.npmjs\.org") {
        Write-Host "  -> Found auth tokens in $projectNpmrc" -ForegroundColor Red
        $lines = Get-Content $projectNpmrc
        $cleanLines = $lines | Where-Object { $_ -notmatch "^\s*(_auth|//.*:_auth)" }
        if ($cleanLines) {
            Set-Content $projectNpmrc -Value $cleanLines
        } else {
            Remove-Item $projectNpmrc
        }
        Write-Host "  -> Cleaned stale tokens from $projectNpmrc" -ForegroundColor Green
    } else {
        Write-Host "  -> No auth tokens in project .npmrc" -ForegroundColor Green
    }
}

# Also try npm config delete as a fallback
try {
    $authCheck = npm config get _auth 2>&1
    if ($authCheck -and $authCheck -ne "undefined") {
        npm config delete _auth 2>$null
        Write-Host "  -> Removed _auth from npm config" -ForegroundColor Green
    }
} catch { }

try {
    $tokenCheck = npm config get "//registry.npmjs.org/:_authToken" 2>&1
    if ($tokenCheck -and $tokenCheck -ne "undefined") {
        npm config delete "//registry.npmjs.org/:_authToken" 2>$null
        Write-Host "  -> Removed _authToken from npm config" -ForegroundColor Green
    }
} catch { }

# ------------------------------------------------------------------
# Step 2: Clear npm cache for the figma package
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[2/4] Clearing npm cache for figma-developer-mcp..." -ForegroundColor Yellow
npm cache clean --force 2>$null
Write-Host "  -> npm cache cleared" -ForegroundColor Green

# ------------------------------------------------------------------
# Step 3: Verify the correct package exists on npm
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[3/4] Verifying figma-developer-mcp package on npm..." -ForegroundColor Yellow

$packageName = "figma-developer-mcp"
try {
    $result = npm view $packageName version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  -> Package '$packageName' found, latest version: $result" -ForegroundColor Green
    } else {
        Write-Host "  -> WARNING: Package '$packageName' not found on npm!" -ForegroundColor Red
        Write-Host "     Trying '@anthropic-ai/figma-mcp'..." -ForegroundColor Yellow
        $altResult = npm view "@anthropic-ai/figma-mcp" version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $packageName = "@anthropic-ai/figma-mcp"
            Write-Host "  -> Package '$packageName' found, latest version: $altResult" -ForegroundColor Green
        } else {
            Write-Host "  -> WARNING: Neither package found. Check your internet connection." -ForegroundColor Red
        }
    }
} catch {
    Write-Host "  -> Could not verify package (network issue?): $_" -ForegroundColor Red
}

# ------------------------------------------------------------------
# Step 4: Update MCP config with correct package name
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[4/4] Updating .vscode/mcp.json..." -ForegroundColor Yellow

$mcpConfigPath = Join-Path (Join-Path (Join-Path $PSScriptRoot "..") ".vscode") "mcp.json"
$mcpConfigPath = (Resolve-Path $mcpConfigPath -ErrorAction SilentlyContinue).Path

if (-not $mcpConfigPath -or -not (Test-Path $mcpConfigPath)) {
    # Fallback to workspace root
    $mcpConfigPath = Join-Path (Join-Path (Join-Path $PSScriptRoot "..") ".vscode") "mcp.json"
}

if (Test-Path $mcpConfigPath) {
    $mcpContent = Get-Content $mcpConfigPath -Raw
    Write-Host "  -> Current config:" -ForegroundColor Gray
    Write-Host $mcpContent -ForegroundColor Gray

    # Read the current FIGMA_PERSONAL_ACCESS_TOKEN value to preserve it
    if ($mcpContent -match '"FIGMA_PERSONAL_ACCESS_TOKEN"\s*:\s*"([^"]*)"') {
        $figmaToken = $Matches[1]
    } else {
        $figmaToken = "YOUR_FIGMA_TOKEN_HERE"
    }

    # Write corrected config
    $newConfig = @"
{
  "servers": {
    "figma": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "$packageName@latest"
      ],
      "env": {
        "FIGMA_PERSONAL_ACCESS_TOKEN": "$figmaToken"
      }
    }
  }
}
"@
    Set-Content -Path $mcpConfigPath -Value $newConfig -Encoding UTF8
    Write-Host "  -> Updated MCP config with package: $packageName" -ForegroundColor Green
} else {
    Write-Host "  -> ERROR: Could not find .vscode/mcp.json at $mcpConfigPath" -ForegroundColor Red
}

# ------------------------------------------------------------------
# Step 5: Test npx execution
# ------------------------------------------------------------------
Write-Host ""
Write-Host "[5/5] Testing npx can resolve the package..." -ForegroundColor Yellow
$testResult = npx -y "$packageName@latest" --help 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  -> npx can resolve $packageName successfully!" -ForegroundColor Green
} else {
    # npx might exit non-zero for --help on some tools, check if it downloaded
    if ($testResult -match "error|E404|not found") {
        Write-Host "  -> WARNING: npx could not resolve $packageName" -ForegroundColor Red
        Write-Host "     Output: $testResult" -ForegroundColor Gray
    } else {
        Write-Host "  -> Package downloaded successfully (non-zero exit from --help is OK)" -ForegroundColor Green
    }
}

# ------------------------------------------------------------------
# Done
# ------------------------------------------------------------------
Write-Host ""
Write-Host "=== Fix Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. In VS Code, press Ctrl+Shift+P" -ForegroundColor White
Write-Host "  2. Type 'MCP: List Servers' and select it" -ForegroundColor White
Write-Host "  3. Click 'Start' on the figma server" -ForegroundColor White
Write-Host "  4. If it still fails, check your FIGMA_PERSONAL_ACCESS_TOKEN is valid" -ForegroundColor White
Write-Host ""
