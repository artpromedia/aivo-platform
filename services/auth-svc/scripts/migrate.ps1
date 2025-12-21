# ══════════════════════════════════════════════════════════════════════════════
# AIVO Auth Service - Database Migration Script (PowerShell)
# ══════════════════════════════════════════════════════════════════════════════
#
# Usage: .\scripts\migrate.ps1 [dev|deploy|reset|status|create|diff]
#
# ══════════════════════════════════════════════════════════════════════════════

param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "deploy", "reset", "status", "create", "diff", "generate", "studio", "seed")]
    [string]$Command = "status",
    
    [Parameter(Position=1)]
    [string]$Name
)

$ErrorActionPreference = "Stop"

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Set-Location $ProjectRoot

function Write-Header {
    Write-Host "══════════════════════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host "  AIVO Auth Service - Database Migration" -ForegroundColor Blue
    Write-Host "══════════════════════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }

function Test-DatabaseUrl {
    if (-not $env:DATABASE_URL) {
        if (Test-Path ".env") {
            Get-Content ".env" | ForEach-Object {
                if ($_ -match "^([^#=]+)=(.*)$") {
                    [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
                }
            }
        }
    }
    
    if (-not $env:DATABASE_URL) {
        Write-Error "DATABASE_URL is not set"
        Write-Host "Please set DATABASE_URL in your environment or .env file"
        exit 1
    }
}

switch ($Command) {
    "dev" {
        Write-Header
        Test-DatabaseUrl
        Write-Info "Running development migration..."
        Write-Host ""
        
        if ($Name) {
            npx prisma migrate dev --name $Name
        } else {
            npx prisma migrate dev
        }
        
        Write-Host ""
        Write-Success "Development migration completed"
        Write-Info "Generating Prisma client..."
        npx prisma generate
    }
    
    "deploy" {
        Write-Header
        Test-DatabaseUrl
        Write-Info "Running production migration..."
        Write-Host ""
        
        npx prisma migrate status
        
        Write-Host ""
        Write-Warning "This will apply pending migrations to the database"
        $confirm = Read-Host "Continue? (y/N)"
        
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            npx prisma migrate deploy
            Write-Host ""
            Write-Success "Production migration completed"
        } else {
            Write-Info "Migration cancelled"
        }
    }
    
    "reset" {
        Write-Header
        Test-DatabaseUrl
        
        if ($env:NODE_ENV -eq "production") {
            Write-Error "Cannot reset production database!"
            exit 1
        }
        
        Write-Warning "This will DESTROY all data in the database!"
        Write-Host ""
        $confirm = Read-Host "Type 'RESET' to confirm"
        
        if ($confirm -eq "RESET") {
            npx prisma migrate reset --force
            Write-Host ""
            Write-Success "Database reset completed"
        } else {
            Write-Info "Reset cancelled"
        }
    }
    
    "status" {
        Write-Header
        Test-DatabaseUrl
        Write-Info "Checking migration status..."
        Write-Host ""
        npx prisma migrate status
    }
    
    "create" {
        Write-Header
        Test-DatabaseUrl
        
        if (-not $Name) {
            Write-Error "Migration name required"
            Write-Host "Usage: .\scripts\migrate.ps1 create <migration_name>"
            exit 1
        }
        
        Write-Info "Creating migration: $Name"
        Write-Host ""
        npx prisma migrate dev --name $Name --create-only
        Write-Host ""
        Write-Success "Migration created (not applied)"
        Write-Info "Review the migration SQL in prisma/migrations/"
    }
    
    "diff" {
        Write-Header
        Test-DatabaseUrl
        Write-Info "Generating schema diff..."
        Write-Host ""
        npx prisma migrate diff `
            --from-schema-datamodel prisma/schema.prisma `
            --to-schema-datasource prisma/schema.prisma `
            --script
    }
    
    "generate" {
        Write-Header
        Write-Info "Generating Prisma client..."
        npx prisma generate
        Write-Success "Prisma client generated"
    }
    
    "studio" {
        Write-Header
        Test-DatabaseUrl
        Write-Info "Opening Prisma Studio..."
        npx prisma studio
    }
    
    "seed" {
        Write-Header
        Test-DatabaseUrl
        Write-Info "Running database seed..."
        npx prisma db seed
        Write-Success "Database seeded"
    }
}
