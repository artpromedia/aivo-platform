# Runbook: Service Down

**Severity:** 🚨 CRITICAL  
**Response Time:** Immediate (<2 minutes)  
**Alert:** "Service Health Check Failed"  
**Threshold:** Health check returning non-200 status for 2+ minutes  

---

## Overview

A service health check failure indicates that a service is not responding or is critically degraded. This requires immediate response as it impacts system availability.

---

## Symptoms

- Health check endpoint returning 503 (Service Unavailable)
- Service not responding to requests
- Increased error rate for specific service
- Timeout errors from dependent services

---

## Initial Response (First 2 Minutes)

### 1. Acknowledge Alert

Acknowledge in PagerDuty immediately.

### 2. Identify Failed Service

```powershell
# Check all service health
$services = @('auth-svc', 'profile-svc', 'session-svc', 'analytics-svc', 'content-svc', 'reports-svc')

foreach ($service in $services) {
    try {
        $health = Invoke-WebRequest -Uri "https://aivo.app/$service/health" -TimeoutSec 5
        $healthData = $health.Content | ConvertFrom-Json
        $color = if ($healthData.status -eq 'healthy') { 'Green' } else { 'Red' }
        Write-Host "$service: $($healthData.status)" -ForegroundColor $color
    } catch {
        Write-Host "$service: DOWN or UNREACHABLE" -ForegroundColor Red
    }
}
```

### 3. Check Deployment Status

```powershell
# Check if deployment in progress
Get-Content logs/deployment-*.log | Select-String "Deployment.*in progress" | Select-Object -Last 1

# Check current active slot
# Expected: blue or green
```

---

## Investigation Steps

### Step 1: Check Service Logs

```powershell
# Check service logs (last 100 lines)
# Replace [service-name] with failed service

# Option 1: Docker logs
docker logs --tail 100 aivo-[service-name]

# Option 2: File logs
Get-Content services/[service-name]/logs/app.log -Tail 100

# Option 3: Datadog
# Navigate to: https://datadog.com/logs
# Filter: service:[service-name] status:error
```

**Look for:**
- Uncaught exceptions
- "FATAL" or "ERROR" level logs
- Database connection errors
- Redis connection errors
- Out of memory errors
- Port binding errors

### Step 2: Check Service Process

```powershell
# Check if process is running
Get-Process | Where-Object { $_.ProcessName -like "*node*" }

# Check port binding
netstat -ano | findstr ":3000"  # Replace with service port

# Check resource usage
Get-Process -Name node | Select-Object ProcessName, CPU, WorkingSet
```

### Step 3: Check Dependencies

```powershell
# Database connectivity
psql $env:DATABASE_URL -c "SELECT 1"

# Redis connectivity
redis-cli -u $env:REDIS_URL PING

# Check dependency health
Invoke-WebRequest -Uri "https://aivo.app/profile-svc/health"
Invoke-WebRequest -Uri "https://aivo.app/session-svc/health"
```

### Step 4: Check Recent Changes

```powershell
# Check recent deployments
Get-Content logs/deployment-*.log | Select-String "completed" | Select-Object -Last 5

# Check recent commits
git log --oneline --since="2 hours ago"

# Check environment variables changed
# Review .env.production file modifications
```

---

## Common Causes & Solutions

### Cause 1: Service Crashed

**Symptoms:**
- Process not running
- No recent log entries
- Port not bound

**Solution:**
```powershell
# Start service
cd services/[service-name]
pnpm start

# Or restart via Docker
docker-compose restart [service-name]

# Monitor logs
docker logs -f aivo-[service-name]
```

### Cause 2: Database Connection Failed

**Symptoms:**
- Health check shows database: "unhealthy"
- Logs: "Connection refused" or "Connection timeout"
- Database check in health response failing

**Solution:**
```powershell
# Check database connectivity
psql $env:DATABASE_URL -c "SELECT 1"

# If connection fails, check:
# 1. Database service running
docker ps | findstr postgres

# 2. Database credentials correct
echo $env:DATABASE_URL

# 3. Network connectivity
Test-NetConnection -ComputerName [db-host] -Port 5432

# Restart service after database recovered
docker-compose restart [service-name]
```

### Cause 3: Redis Connection Failed

**Symptoms:**
- Health check shows redis: "unhealthy"
- Logs: "ECONNREFUSED" or "Redis connection failed"

**Solution:**
```powershell
# Check Redis connectivity
redis-cli -u $env:REDIS_URL PING

# If Redis down:
# 1. Check Redis service
docker ps | findstr redis

# 2. Restart Redis
docker-compose restart redis

# 3. Restart affected service
docker-compose restart [service-name]
```

### Cause 4: Out of Memory (OOM)

**Symptoms:**
- Process terminated without error logs
- Last log entry shows high memory usage
- System logs show OOM killer activity

**Solution:**
```powershell
# Check system memory
Get-WmiObject Win32_OperatingSystem | 
  Select-Object @{Name="FreeGB";Expression={[math]::Round($_.FreePhysicalMemory/1MB,2)}},
                @{Name="TotalGB";Expression={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}}

# Check memory limits (Docker)
docker stats aivo-[service-name]

# Increase memory limit
# In docker-compose.yml
services:
  [service-name]:
    mem_limit: 2g  # Increase from 1g

# Restart with new limits
docker-compose up -d [service-name]
```

### Cause 5: Port Already in Use

**Symptoms:**
- Logs: "EADDRINUSE" or "Port already in use"
- Service fails to start
- Health check unreachable

**Solution:**
```powershell
# Find process using port
netstat -ano | findstr ":3000"  # Replace with service port

# Kill process holding port
Stop-Process -Id [PID] -Force

# Restart service
docker-compose restart [service-name]
```

### Cause 6: Failed Deployment

**Symptoms:**
- Service down after recent deployment
- New code introduced errors
- Missing environment variables

**Solution:**
```powershell
# Immediate rollback
.\scripts\rollback-deployment.ps1 `
  -FromSlot green `
  -ToSlot blue `
  -Environment production `
  -Reason "Service health check failing after deployment"

# Monitor service recovery
Start-Sleep -Seconds 30
Invoke-WebRequest -Uri "https://aivo.app/[service-name]/health"
```

---

## Resolution Steps

### Step 1: Implement Fix

Based on root cause:
- Restart service if crashed
- Fix database/Redis connectivity
- Rollback deployment if deployment issue
- Increase resources if capacity issue

### Step 2: Verify Service Health

```powershell
# Check service health
$health = Invoke-WebRequest -Uri "https://aivo.app/[service-name]/health" | ConvertFrom-Json

# Should return:
# {
#   "status": "healthy",
#   "checks": {
#     "database": { "status": "healthy" },
#     "redis": { "status": "healthy" },
#     "dependencies": { "status": "healthy" }
#   }
# }

# Monitor for 10 minutes
for ($i = 0; $i -lt 10; $i++) {
    $health = Invoke-WebRequest -Uri "https://aivo.app/[service-name]/health" -TimeoutSec 5
    $status = ($health.Content | ConvertFrom-Json).status
    Write-Host "[$i] Status: $status" -ForegroundColor $(if ($status -eq 'healthy') { 'Green' } else { 'Red' })
    Start-Sleep -Seconds 60
}
```

### Step 3: Verify System Impact

```powershell
# Check error rate (should be <0.5%)
# In Datadog dashboard

# Check dependent services
Invoke-WebRequest -Uri "https://aivo.app/health"

# Check user impact
# Review support tickets, user reports
```

---

## Post-Incident Actions

### 1. Root Cause Analysis

```powershell
# Review service logs around incident time
# In Datadog logs
service:[service-name] @timestamp>=[incident_start] @timestamp<=[incident_end]

# Document:
# - What failed?
# - Why did it fail?
# - What was the trigger?
# - Why didn't we catch it earlier?
```

### 2. Implement Permanent Fix

Examples:
```typescript
// Add better error handling
try {
  await someOperation();
} catch (error) {
  logger.error('Operation failed', { error });
  // Don't crash - gracefully degrade
  return fallbackValue;
}

// Add health check for missing dependencies
async checkHealth(): Promise<HealthCheckResult> {
  const checks = await Promise.allSettled([
    this.checkDatabase(),
    this.checkRedis(),
    this.checkDependencies(),
  ]);
  
  // Service stays up even if dependency down
  return {
    status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
    checks,
  };
}
```

### 3. Update Monitoring

```yaml
# Add alert for early warning
- name: "Service Response Time High"
  query: "avg(last_5m):avg:http.response_time.p95{service:[service-name]} > 500"
  severity: warning
  notification:
    channels:
      - slack: "#production-monitoring"
```

---

## Prevention

### 1. Improve Health Checks

```typescript
// Enhanced health check
export class HealthCheckService {
  async check(): Promise<HealthCheckResult> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      dependencies: await this.checkDependencies(),
      resources: await this.checkResources(),
    };
    
    // Determine overall status
    const hasUnhealthy = Object.values(checks).some(c => c.status === 'unhealthy');
    const hasDegraded = Object.values(checks).some(c => c.status === 'degraded');
    
    return {
      status: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 2. Add Graceful Degradation

```typescript
// Service should stay up even if dependencies down
async getTrustScore(userId: string): Promise<number> {
  try {
    return await this.calculateTrustScore(userId);
  } catch (error) {
    logger.warn('Trust score calculation failed, using cached', { userId, error });
    // Try cache
    const cached = await this.cache.get(`trust:${userId}`);
    if (cached) return cached;
    
    // Last resort: return safe default
    return DEFAULT_TRUST_SCORE;
  }
}
```

### 3. Add Circuit Breakers

```typescript
// Prevent cascading failures
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(asyncFunction, {
  timeout: 3000,           // 3s timeout
  errorThresholdPercentage: 50,  // Open after 50% errors
  resetTimeout: 30000,     // Try again after 30s
});

breaker.fallback(() => defaultValue);

// Use breaker for external calls
const result = await breaker.fire(params);
```

---

## Escalation

### When to Escalate

- Service cannot be restarted within 10 minutes
- Root cause unclear
- Multiple services failing
- Database or infrastructure issue

### Escalation Path

1. **Primary On-Call** → 
2. **Service Owner** → 
3. **Tech Lead** → 
4. **Infrastructure Team**

---

## Related Runbooks

- [High Error Rate](./high-error-rate.md)
- [Database Issues](./database-issues.md)
- [Deployment Rollback](./deployment-rollback.md)

---

**Last Updated:** January 28, 2026  
**Owner:** DevOps Team
