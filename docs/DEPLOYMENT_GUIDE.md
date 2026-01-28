# Production Deployment Guide

**Version:** 1.0  
**Last Updated:** January 28, 2026  
**Target Audience:** DevOps Engineers, Site Reliability Engineers  

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Blue-Green Deployment Strategy](#blue-green-deployment-strategy)
4. [Deployment Process](#deployment-process)
5. [Health Checks](#health-checks)
6. [Rollback Procedures](#rollback-procedures)
7. [Database Migrations](#database-migrations)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The AIVO platform uses a blue-green deployment strategy to achieve zero-downtime deployments with automatic rollback capabilities.

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                           │
│              (aivo.app or staging.aivo.app)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │               │
    ┌─────────▼────────┐   ┌─▼──────────────┐
    │   Blue Slot      │   │  Green Slot    │
    │ (blue.aivo.app)  │   │(green.aivo.app)│
    │                  │   │                │
    │ auth-svc        │   │ auth-svc      │
    │ profile-svc     │   │ profile-svc   │
    │ session-svc     │   │ session-svc   │
    │ analytics-svc   │   │ analytics-svc │
    │ content-svc     │   │ content-svc   │
    │ reports-svc     │   │ reports-svc   │
    └──────────────────┘   └────────────────┘
```

### Key Features

- ✅ **Zero-downtime deployments**: Traffic switches only after health checks pass
- ✅ **Automatic rollback**: Failed deployments roll back automatically
- ✅ **Blue-green strategy**: Old version stays available during deployment
- ✅ **Gradual traffic shift**: 10% → 25% → 50% → 75% → 100%
- ✅ **Comprehensive health checks**: Database, Redis, dependencies, endpoints, resources

---

## Prerequisites

### Required Tools

```powershell
# Check required tools
node --version        # v20.x or higher
pnpm --version        # v8.x or higher
psql --version        # PostgreSQL client
redis-cli --version   # Redis client
git --version         # Git
```

### Environment Variables

Must be set before deployment:

```powershell
# Database
$env:DATABASE_URL = "postgresql://user:pass@host:5432/aivo_prod"
$env:DATABASE_HOST = "db.aivo.app"
$env:DATABASE_USER = "aivo_prod"
$env:DATABASE_PASSWORD = "***"
$env:DATABASE_NAME = "aivo_prod"

# Redis
$env:REDIS_URL = "redis://redis.aivo.app:6379"

# Secrets
$env:JWT_SECRET = "***"
$env:STRIPE_API_KEY = "***"
$env:SENDGRID_API_KEY = "***"

# Service URLs
$env:PROFILE_SVC_URL = "https://aivo.app/profile-svc"
$env:SESSION_SVC_URL = "https://aivo.app/session-svc"
$env:ANALYTICS_SVC_URL = "https://aivo.app/analytics-svc"
```

### Access Requirements

- SSH access to production servers
- AWS/GCP/Azure credentials (for infrastructure)
- Database admin credentials
- Redis admin access
- Git repository access

---

## Blue-Green Deployment Strategy

### How It Works

1. **Current State**: Blue slot is serving production traffic
2. **Deploy**: Deploy new version to Green slot (inactive)
3. **Test**: Run health checks on Green slot
4. **Switch**: Gradually shift traffic: Blue → Green (10% → 25% → 50% → 75% → 100%)
5. **Monitor**: Monitor error rates and response times at each percentage
6. **Complete**: Green slot now serving 100% traffic, Blue slot on standby
7. **Next Deploy**: Deploy to Blue slot, switch traffic Green → Blue

### Benefits

- **Zero downtime**: Old version handles traffic during deployment
- **Fast rollback**: Just switch traffic back to old slot
- **Safe testing**: Test new version before sending traffic
- **Instant recovery**: Old version ready immediately if needed

---

## Deployment Process

### Step 1: Pre-Deployment Checklist

```powershell
# Clone repository and checkout main
git clone https://github.com/aivo/platform.git
cd platform
git checkout main
git pull origin main

# Verify branch (production must be from main)
git branch --show-current  # Must be 'main'

# Check environment variables
.\scripts\check-env-vars.ps1
```

### Step 2: Run Deployment Script

#### Production Deployment

```powershell
# Deploy to Blue slot (if Green is currently active)
.\scripts\deploy-production.ps1 `
  -Slot blue `
  -Environment production `
  -AutoRollback

# Or deploy to Green slot (if Blue is currently active)
.\scripts\deploy-production.ps1 `
  -Slot green `
  -Environment production `
  -AutoRollback
```

#### Staging Deployment

```powershell
# Deploy to staging first (recommended)
.\scripts\deploy-production.ps1 `
  -Slot blue `
  -Environment staging `
  -AutoRollback
```

### Step 3: Monitor Deployment

The script will:

1. ✅ **Pre-flight checks** (5 min)
   - Git status
   - Tool availability
   - Environment variables
   - Disk space

2. ✅ **Build** (3-5 min)
   - Install dependencies
   - Build all services
   - Generate Prisma client

3. ✅ **Tests** (5-10 min)
   - Unit tests
   - Integration tests
   - Can skip with `-SkipTests`

4. ✅ **Database migrations** (2-5 min)
   - Run Prisma migrations
   - Apply performance indexes
   - Update schema

5. ✅ **Deploy services** (2-3 min)
   - Copy build artifacts
   - Deploy to target slot

6. ✅ **Start services** (1-2 min)
   - Start all services
   - Wait for initialization

7. ✅ **Health checks** (1-2 min)
   - Database connectivity
   - Redis connectivity
   - Service dependencies
   - Critical endpoints
   - Resource utilization

8. ✅ **Traffic switch** (5-10 min)
   - 10% traffic → wait 1 min → health check
   - 25% traffic → wait 1 min → health check
   - 50% traffic → wait 1 min → health check
   - 75% traffic → wait 1 min → health check
   - 100% traffic → deployment complete

**Total Time:** 25-45 minutes

### Step 4: Post-Deployment Validation

```powershell
# Check service health
Invoke-WebRequest -Uri "https://aivo.app/health" -Method Get

# Check individual services
Invoke-WebRequest -Uri "https://aivo.app/auth-svc/health" -Method Get
Invoke-WebRequest -Uri "https://aivo.app/profile-svc/health" -Method Get
Invoke-WebRequest -Uri "https://aivo.app/session-svc/health" -Method Get

# Run smoke tests
pnpm test:smoke

# Monitor logs
Get-Content -Path "logs/deployment-$(Get-Date -Format 'yyyyMMdd').log" -Wait
```

---

## Health Checks

### Health Check Endpoints

All services expose these endpoints:

#### `/health` - Comprehensive Health Check

```bash
curl https://aivo.app/auth-svc/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-28T10:30:00Z",
  "checks": {
    "database": {
      "status": "pass",
      "responseTime": 15,
      "details": { "active": 12, "idle": 3, "total": 15 }
    },
    "redis": {
      "status": "pass",
      "responseTime": 5,
      "details": { "memoryUsedMB": 1850 }
    },
    "dependencies": {
      "status": "pass",
      "responseTime": 120,
      "details": { "results": [...] }
    },
    "endpoints": {
      "status": "pass",
      "responseTime": 50
    },
    "resources": {
      "status": "pass",
      "responseTime": 2,
      "cpu": 45,
      "memory": 62,
      "details": {
        "cpuPercentage": 45,
        "memoryUsedMB": 1200,
        "memoryTotalMB": 1948,
        "memoryPercentage": 62
      }
    }
  },
  "version": "1.0.0",
  "uptime": 3600
}
```

#### `/health/readiness` - Readiness Check

Can the service accept traffic?

```bash
curl https://aivo.app/auth-svc/health/readiness
```

**Response:**
```json
{
  "ready": true
}
```

#### `/health/liveness` - Liveness Check

Is the service alive?

```bash
curl https://aivo.app/auth-svc/health/liveness
```

**Response:**
```json
{
  "alive": true
}
```

### Health Check Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| `healthy` | All checks passed | ✅ Service ready for traffic |
| `degraded` | Some checks warn | ⚠️ Service functional but monitor closely |
| `unhealthy` | Some checks failed | ❌ Do not route traffic |

---

## Rollback Procedures

### Automatic Rollback

If `-AutoRollback` is enabled (default), the deployment script automatically rolls back if:

- Health checks fail
- Error rate >2%
- P95 response time >500ms
- Service crashes

### Manual Rollback

If you need to manually roll back:

```powershell
# Emergency rollback
.\scripts\rollback-deployment.ps1 `
  -FromSlot green `
  -ToSlot blue `
  -Environment production `
  -Reason "High error rate detected"
```

**Rollback Time:** <60 seconds

### Rollback Process

1. ✅ **Immediate traffic switch** (~2 seconds)
   - Switch 100% traffic to stable slot immediately
   - No gradual shift during rollback

2. ✅ **Health check target slot** (~30 seconds)
   - Verify old slot still healthy
   - If not healthy, CRITICAL situation

3. ✅ **Stop failed slot** (~10 seconds)
   - Stop services on failed slot
   - Prevent resource conflicts

4. ✅ **Notify team** (~10 seconds)
   - Send PagerDuty alert
   - Post to Slack
   - Update status page

### Post-Rollback Actions

1. **Investigate failure**
   - Check logs: `logs/rollback-YYYYMMDD.log`
   - Review deployment logs
   - Check error monitoring (Datadog)

2. **Fix issues**
   - Address root cause
   - Test fix in staging
   - Validate with load tests

3. **Retry deployment**
   - Deploy to failed slot again
   - Monitor closely

---

## Database Migrations

### Migration Strategy

Migrations run automatically during deployment using Prisma.

#### Safe Migrations (No Downtime)

```sql
-- Add column with default
ALTER TABLE "User" ADD COLUMN "newsletter" BOOLEAN DEFAULT false;

-- Create index (CONCURRENTLY to avoid locking)
CREATE INDEX CONCURRENTLY idx_user_email ON "User"(email);

-- Add table
CREATE TABLE "NewTable" (...);
```

#### Potentially Unsafe Migrations

```sql
-- Drop column (requires downtime)
ALTER TABLE "User" DROP COLUMN "old_column";

-- Rename column (requires code changes)
ALTER TABLE "User" RENAME COLUMN "old_name" TO "new_name";

-- Change column type (may require rewrite)
ALTER TABLE "User" ALTER COLUMN "age" TYPE INTEGER;
```

### Migration Rollback

If migration fails, the deployment script automatically rolls back:

1. Stop deployment
2. Restore database from backup
3. Roll back traffic to old slot
4. Notify team

### Manual Migration

If you need to run migrations manually:

```powershell
# Navigate to service directory
cd services/auth-svc

# Run migrations
pnpx prisma migrate deploy

# Verify
pnpx prisma migrate status
```

---

## Troubleshooting

### Deployment Failed During Build

**Symptom:** Build fails with errors

**Solution:**
```powershell
# Check Node version
node --version  # Should be v20.x

# Clean install
Remove-Item -Recurse -Force node_modules, dist
pnpm install --frozen-lockfile
pnpm build
```

### Health Checks Failing

**Symptom:** Health checks timeout or fail

**Solution:**
```powershell
# Check database connectivity
psql $env:DATABASE_URL -c "SELECT 1"

# Check Redis connectivity
redis-cli -u $env:REDIS_URL ping

# Check service logs
Get-Content logs/auth-svc.log -Tail 50
```

### High Error Rate After Deployment

**Symptom:** Error rate >1% after traffic switch

**Solution:**
```powershell
# Immediate rollback
.\scripts\rollback-deployment.ps1 `
  -FromSlot green `
  -ToSlot blue `
  -Environment production `
  -Reason "High error rate: 2.5%"

# Investigate errors
# Check Datadog: https://datadog.com/aivo
# Review logs: logs/deployment-YYYYMMDD.log
```

### Database Connection Pool Exhausted

**Symptom:** "Too many connections" errors

**Solution:**
```sql
-- Check active connections
SELECT count(*), state 
FROM pg_stat_activity 
WHERE datname = 'aivo_prod' 
GROUP BY state;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'aivo_prod' AND state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes';
```

### Redis Out of Memory

**Symptom:** Redis evicting keys, cache misses increasing

**Solution:**
```bash
# Check Redis memory
redis-cli -u $REDIS_URL INFO memory

# Flush cache if needed (last resort)
redis-cli -u $REDIS_URL FLUSHALL
```

---

## Emergency Contacts

### On-Call Rotation

- **Primary:** Check PagerDuty schedule
- **Secondary:** Check PagerDuty schedule
- **Escalation:** Tech Lead

### Communication Channels

- **Slack:** #production-deployments
- **PagerDuty:** AIVO Production Service
- **Status Page:** https://status.aivo.app

### Runbooks

- [High Error Rate Runbook](./runbooks/high-error-rate.md)
- [Database Issues Runbook](./runbooks/database-issues.md)
- [Service Down Runbook](./runbooks/service-down.md)
- [Performance Degradation Runbook](./runbooks/performance-degradation.md)

---

## Appendix

### Deployment Script Options

```powershell
.\scripts\deploy-production.ps1 `
  -Slot blue `                # Required: 'blue' or 'green'
  -Environment production `   # Required: 'staging' or 'production'
  [-SkipTests] `             # Optional: Skip test execution
  [-AutoRollback:$false] `   # Optional: Disable auto-rollback
  [-Services @('auth-svc')] # Optional: Deploy specific services only
```

### Rollback Script Options

```powershell
.\scripts\rollback-deployment.ps1 `
  -FromSlot green `          # Required: Current (failing) slot
  -ToSlot blue `             # Required: Target (stable) slot
  -Environment production `   # Required: 'staging' or 'production'
  [-Reason "error message"]  # Optional: Reason for rollback
```

### Useful Commands

```powershell
# Check current active slot
Invoke-WebRequest -Uri "https://aivo.app/health" | 
  Select-Object -ExpandProperty Content | 
  ConvertFrom-Json | 
  Select-Object -ExpandProperty slot

# View deployment history
Get-Content logs/deployment-*.log | 
  Select-String "Deployment.*completed"

# Monitor real-time logs
Get-Content logs/deployment-$(Get-Date -Format 'yyyyMMdd').log -Wait

# Test health endpoint
while ($true) {
  Invoke-WebRequest -Uri "https://aivo.app/health" -Method Get
  Start-Sleep -Seconds 5
}
```

---

**Document Version:** 1.0  
**Last Reviewed:** January 28, 2026  
**Next Review:** February 28, 2026
