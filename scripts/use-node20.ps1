# PowerShell script to set up Node.js 20.19.4 environment
# This script adds the local Node.js installation to the PATH

$NodePath = "$PSScriptRoot\..\\.node\\node-v20.19.4-win-x64"
$ResolvedPath = Resolve-Path $NodePath -ErrorAction SilentlyContinue

if (-not $ResolvedPath) {
    Write-Error "Node.js installation not found at: $NodePath"
    Write-Host "Please run the setup script to install Node.js 20.19.4"
    exit 1
}

$NodeDir = $ResolvedPath.Path

# Add Node.js to the beginning of PATH
$env:PATH = "$NodeDir;$env:PATH"

# Verify Node.js version
$NodeVersion = & "$NodeDir\node.exe" --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Using Node.js $NodeVersion from $NodeDir" -ForegroundColor Green
} else {
    Write-Error "Failed to run Node.js from $NodeDir"
    exit 1
}

Write-Host "Node.js environment ready!" -ForegroundColor Green
Write-Host "Use 'pnpm' to run commands (corepack already enabled)" -ForegroundColor Cyan
