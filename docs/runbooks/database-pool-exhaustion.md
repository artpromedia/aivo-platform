# Runbook: Database Connection Pool Exhaustion

**Severity:** 🚨 CRITICAL  
**Response Time:** Immediate (<5 minutes)  
**Alert:** "Database Connection Pool Exhausted"  
**Threshold:** Active connections >90% (45/50) for 5+ minutes  

---

## Overview

The database connection pool manages a fixed number of connections (default: 50) to PostgreSQL. When all connections are in use, new requests wait or timeout, causing cascading failures. This is a critical issue that can bring down the entire system.

---

## Symptoms

- Connection timeout errors
- Error messages: "Connection pool exhausted" or "Timed out acquiring connection"
- High P95/P99 response times
- Error rate increasing
- Requests queuing up

---

## Initial Response (First 5 Minutes)

### 1. Acknowledge Alert

Acknowledge in PagerDuty to prevent duplicate pages.

### 2. Check Pool Status

```sql
-- Connect to production database
psql $env:DATABASE_URL

-- Check connection pool usage
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = 'aivo_prod';
```

**Expected output:**
```
 total_connections | active | idle | idle_in_transaction 
-------------------+--------+------+---------------------
                48 |     46 |    2 |                   0
```

### 3. Quick Health Check

```powershell
# Check service health
Invoke-WebRequest -Uri "https://aivo.app/health" | ConvertFrom-Json

# Services should show "degraded" or "unhealthy"
```

---

## Investigation Steps

### Step 1: Identify Connection Hogs

```sql
-- Find queries holding connections longest
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  now() - state_change as state_duration,
  now() - query_start as query_duration,
  wait_event_type,
  wait_event,
  left(query, 100) as query_preview
FROM pg_stat_activity
WHERE datname = 'aivo_prod'
  AND state != 'idle'
ORDER BY state_change
LIMIT 20;
```

**What to look for:**
- Queries running >5 minutes (may be stuck)
- Multiple connections in "idle in transaction" state (connection leak)
- High number of connections from single service
- Queries waiting on locks

### Step 2: Check for Connection Leaks

```sql
-- Check "idle in transaction" connections
SELECT 
  pid,
  usename,
  application_name,
  now() - state_change as duration,
  left(query, 100) as last_query
FROM pg_stat_activity
WHERE datname = 'aivo_prod'
  AND state = 'idle in transaction'
ORDER BY state_change;
```

**Common causes:**
- Missing `finally` blocks in code
- Exceptions during transactions
- Long-running transactions not committed
- Connection not released after use

### Step 3: Check for Long-Running Queries

```sql
-- Find slow queries
SELECT 
  pid,
  now() - query_start as duration,
  state,
  wait_event_type,
  wait_event,
  query
FROM pg_stat_activity
WHERE datname = 'aivo_prod'
  AND state = 'active'
  AND now() - query_start > interval '1 minute'
ORDER BY query_start;
```

### Step 4: Check for Deadlocks

```sql
-- Check for blocking queries
SELECT 
  blocked.pid AS blocked_pid,
  blocked.usename AS blocked_user,
  blocking.pid AS blocking_pid,
  blocking.usename AS blocking_user,
  blocked.query AS blocked_query,
  blocking.query AS blocking_query
FROM pg_stat_activity AS blocked
JOIN pg_stat_activity AS blocking
  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE blocked.datname = 'aivo_prod';
```

---

## Common Causes & Solutions

### Cause 1: Connection Leak in Application Code

**Symptoms:**
- Steady increase in "idle in transaction" connections
- Connections not being released
- Specific service using disproportionate connections

**Immediate Solution:**
```sql
-- Kill idle in transaction connections older than 5 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'aivo_prod'
  AND state = 'idle in transaction'
  AND now() - state_change > interval '5 minutes';
```

**Root Cause Fix:**
```typescript
// BAD: Connection not released on error
async function getUserData(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found'); // Connection still held!
  }
  return user;
}

// GOOD: Prisma automatically handles connection release
async function getUserData(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found'); // Connection released
  }
  return user;
}

// If using raw SQL queries:
async function rawQuery() {
  try {
    return await prisma.$queryRaw`SELECT * FROM users`;
  } finally {
    // Prisma handles this automatically, but ensure no manual connections
  }
}
```

### Cause 2: Slow Queries Holding Connections

**Symptoms:**
- Many active connections
- Queries running >1 minute
- High CPU on database

**Immediate Solution:**
```sql
-- Identify slow queries
SELECT 
  pid,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE datname = 'aivo_prod'
  AND state = 'active'
  AND now() - query_start > interval '30 seconds'
ORDER BY query_start;

-- Kill queries over 5 minutes (after reviewing)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'aivo_prod'
  AND state = 'active'
  AND now() - query_start > interval '5 minutes';
```

**Root Cause Fix:**
```sql
-- Add missing indexes
-- Example: Trust score queries
CREATE INDEX CONCURRENTLY idx_user_reviews_composite 
ON user_reviews(user_id, created_at DESC, status)
WHERE status = 'active';

-- Optimize query
-- BAD: Sequential scan
SELECT * FROM lessons WHERE content LIKE '%math%';

-- GOOD: Use full-text search or specific fields
SELECT * FROM lessons WHERE subject = 'math' AND title ILIKE '%algebra%';
```

### Cause 3: Traffic Spike Overwhelming Pool

**Symptoms:**
- All connections active
- High request rate
- No stuck queries or leaks
- Pool size simply insufficient

**Immediate Solution:**
```typescript
// Temporarily increase pool size
// In services/*/src/prisma.ts

export const prisma = createOptimizedPrismaClient(
  {
    connectionPoolSize: 100, // Increased from 50
    connectionTimeout: 10000,
    poolTimeout: 10000,
    queryTimeout: 30000,
  },
  logger
);

// Redeploy affected services with increased pool
.\scripts\deploy-production.ps1 `
  -Slot blue `
  -Environment production `
  -Services auth-svc,profile-svc `
  -SkipTests
```

**Long-term Solution:**
- Scale horizontally (more service instances)
- Implement connection pooler (PgBouncer)
- Optimize queries to hold connections shorter

### Cause 4: Missing Connection Timeout Configuration

**Symptoms:**
- Connections hanging indefinitely
- No query activity but connection active
- Network issues or deadlocks

**Solution:**
```typescript
// Configure proper timeouts
export const prisma = createOptimizedPrismaClient(
  {
    connectionPoolSize: 50,
    connectionTimeout: 10000,  // 10s to acquire connection
    poolTimeout: 10000,        // 10s waiting in pool queue
    queryTimeout: 30000,       // 30s max query time
    idleTimeout: 60000,        // 60s idle before release
  },
  logger
);
```

---

## Resolution Steps

### Step 1: Immediate Mitigation

Choose based on root cause:

**Option A: Kill Stuck Connections**
```sql
-- Kill connections stuck >5 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'aivo_prod'
  AND state != 'idle'
  AND now() - state_change > interval '5 minutes';
```

**Option B: Increase Pool Size**
```typescript
// Update connection pool configuration
// Redeploy services
```

**Option C: Restart Service**
```powershell
# Last resort: Restart service to release connections
# This causes brief downtime

# Using blue-green deployment
.\scripts\deploy-production.ps1 `
  -Slot green `
  -Environment production `
  -Services auth-svc `
  -SkipTests

# Switches traffic to fresh service with clean connections
```

### Step 2: Monitor Recovery

```powershell
# Monitor connection pool for 15 minutes
# Should stabilize below 80% (40/50 connections)

# PowerShell monitoring script
while ($true) {
    $result = psql $env:DATABASE_URL -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'aivo_prod' AND state != 'idle';"
    $active = [int]$result.Trim()
    $percentage = [math]::Round(($active / 50) * 100, 1)
    
    $color = if ($percentage -gt 90) { "Red" } elseif ($percentage -gt 80) { "Yellow" } else { "Green" }
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] Active: $active/50 ($percentage%)" -ForegroundColor $color
    
    Start-Sleep -Seconds 10
}
```

### Step 3: Verify System Health

```powershell
# Check all service health
@('auth-svc', 'profile-svc', 'session-svc', 'analytics-svc') | ForEach-Object {
    $health = Invoke-WebRequest -Uri "https://aivo.app/$_/health" | ConvertFrom-Json
    Write-Host "$_: $($health.status) (DB: $($health.checks.database.status))"
}

# Check error rate returned to normal (<0.5%)
# Check P95 response time returned to normal (<200ms)
```

---

## Post-Incident Actions

### 1. Identify Root Cause

Review logs and code:

```javascript
// In Datadog, search for connection errors
service:* "connection pool" OR "timed out acquiring"
| filter @timestamp >= [incident_start]
| group by service
```

### 2. Implement Permanent Fix

Based on root cause:

**Connection Leak:**
```typescript
// Add connection leak detection
// In libs/database-common/src/prisma-client.ts

prisma.$on('query', (e) => {
  if (e.duration > 5000) {
    logger.warn('Slow query detected', {
      query: e.query,
      duration: e.duration,
      timestamp: e.timestamp,
    });
  }
});

// Add connection pool monitoring
export function monitorConnectionPool(prisma: PrismaClient) {
  setInterval(async () => {
    const metrics = await prisma.$queryRaw`
      SELECT count(*) as active
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state != 'idle'
    `;
    
    logger.info('Connection pool metrics', { metrics });
  }, 30000); // Every 30s
}
```

**Slow Queries:**
```sql
-- Add missing indexes
-- Check pg_stat_statements for most time-consuming queries
SELECT 
  substring(query, 1, 100) as query_preview,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'aivo_prod')
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### 3. Update Monitoring

```yaml
# Add early warning alert
- name: "Database Connection Pool Warning"
  query: "avg(last_5m):avg:postgresql.connections.active{env:production} > 40"
  severity: warning
  thresholds:
    warning: 40  # 80% of pool
    critical: 45 # 90% of pool
  notification:
    channels:
      - slack: "#production-monitoring"
```

---

## Prevention

### 1. Connection Pool Best Practices

```typescript
// Use appropriate pool sizes per environment
export const ConnectionPoolConfig = {
  development: {
    connectionPoolSize: 10,
    connectionTimeout: 5000,
  },
  staging: {
    connectionPoolSize: 25,
    connectionTimeout: 8000,
  },
  production: {
    connectionPoolSize: 50,  // or more based on traffic
    connectionTimeout: 10000,
    poolTimeout: 10000,
    queryTimeout: 30000,
  },
  loadTest: {
    connectionPoolSize: 100,
    connectionTimeout: 15000,
  },
};
```

### 2. Implement PgBouncer (Connection Pooler)

```yaml
# docker-compose.pgbouncer.yml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      - DATABASES_HOST=postgres
      - DATABASES_PORT=5432
      - DATABASES_DBNAME=aivo_prod
      - POOL_MODE=transaction  # Connection pooling mode
      - MAX_CLIENT_CONN=1000   # Max client connections
      - DEFAULT_POOL_SIZE=50   # Connections to PostgreSQL
    ports:
      - "6432:6432"
```

Benefits:
- Support thousands of client connections
- Efficient connection reuse
- Reduces database connection overhead

### 3. Query Timeout Configuration

```typescript
// Add statement_timeout at database level
await prisma.$executeRaw`SET statement_timeout = '30s'`;

// Or in Prisma schema
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool configuration
  pool {
    timeout = 10
    size = 50
  }
}
```

### 4. Monitoring & Alerting

```typescript
// Export connection pool metrics
export function setupConnectionPoolMetrics(prisma: PrismaClient) {
  const gauge = new promClient.Gauge({
    name: 'db_connection_pool_active',
    help: 'Active database connections',
  });
  
  setInterval(async () => {
    const result = await prisma.$queryRaw<[{count: bigint}]>`
      SELECT count(*) FROM pg_stat_activity
      WHERE datname = current_database() AND state != 'idle'
    `;
    gauge.set(Number(result[0].count));
  }, 10000);
}
```

---

## Escalation

### When to Escalate

- Unable to reduce connection usage within 15 minutes
- Connection leaks persist after killing connections
- Database performance degraded
- Need to scale database resources

### Escalation Path

1. **Primary On-Call** → 
2. **Database Administrator** → 
3. **Infrastructure Team** → 
4. **CTO**

---

## Related Runbooks

- [High Error Rate](./high-error-rate.md)
- [Performance Degradation](./performance-degradation.md)
- [Database Issues](./database-issues.md)

---

**Last Updated:** January 28, 2026  
**Owner:** DevOps Team
