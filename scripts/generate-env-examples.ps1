# Generate .env.example files for services that don't have them
# Based on common patterns across AIVO services

$ErrorActionPreference = "Continue"

# Standard .env.example template
$envTemplate = @"
# Service Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aivo_database_name?schema=public

# Redis (if needed)
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRY=24h

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# External Services (uncomment if needed)
# STRIPE_SECRET_KEY=sk_test_...
# OPENAI_API_KEY=sk-...
# SENDGRID_API_KEY=SG...

# Monitoring
# OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# DD_API_KEY=your-datadog-api-key
"@
$servicesDir = "services"
$services = Get-ChildItem -Path $servicesDir -Directory

$created = 0
$exists = 0
$noPackageJson = 0

Write-Host "`n📝 Generating .env.example files...`n" -ForegroundColor Cyan

foreach ($service in $services) {
    $envExamplePath = Join-Path $service.FullName ".env.example"
    $packageJsonPath = Join-Path $service.FullName "package.json"
    
    Write-Host "[$($service.Name)] " -NoNewline -ForegroundColor Yellow
    
    # Skip if no package.json (not a Node.js service)
    if (-not (Test-Path $packageJsonPath)) {
        Write-Host "SKIP - Not a Node.js service" -ForegroundColor Gray
        $noPackageJson++
        continue
    }
    
    # Skip if .env.example already exists
    if (Test-Path $envExamplePath) {
        Write-Host "EXISTS" -ForegroundColor Blue
        $exists++
        continue
    }
    
    # Create custom template based on service name
    $customEnv = $envTemplate
    $dbName = "aivo_$($service.Name.Replace('-svc', '').Replace('-', '_'))"
    $customEnv = $customEnv -replace "aivo_database_name", $dbName
    
    # Write the file
    Set-Content -Path $envExamplePath -Value $customEnv -Encoding UTF8
    Write-Host "✓ CREATED" -ForegroundColor Green
    $created++
}

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ".env.example Generation Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Created:  " -NoNewline -ForegroundColor Green
Write-Host $created
Write-Host "○ Exists:   " -NoNewline -ForegroundColor Blue
Write-Host $exists
Write-Host "○ Skipped:  " -NoNewline -ForegroundColor Gray
Write-Host $noPackageJson
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✓ Done! Created $created .env.example files`n" -ForegroundColor Green
