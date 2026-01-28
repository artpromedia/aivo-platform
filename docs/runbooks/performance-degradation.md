# Runbook: Performance Degradation

**Severity:** ⚠️ WARNING → 🚨 CRITICAL  
**Response Time:** 15 minutes  
**Alert:** "P95 Response Time Elevated"  
**Threshold:** P95 >200ms (warning) or >300ms (critical)  

---

## Overview

Performance degradation occurs when response times increase above acceptable thresholds. While not immediately critical, sustained degradation can lead to poor user experience and eventual system failure.

---

## Symptoms

- P95 response times >200ms
- P99 response times >500ms
- Slow page loads reported by users
- Increased database query times
- High CPU or memory usage

---

## Initial Response (First 5 Minutes)

### 1. Assess Severity

Check Datadog dashboard: https://datadog.com/aivo/production-dashboard

**Key metrics:**
- Current P95: [value]ms
- Trend: Increasing / Stable / Decreasing
- Duration: [X] minutes
- Affected services: [list]

**Severity assessment:**
- **WARNING** (200-300ms): Monitor, investigate during business hours
- **CRITICAL** (>300ms): Immediate action required

### 2. Quick Status Check

```powershell
# Check all service response times
$services = @('auth-svc', 'profile-svc', 'session-svc', 'analytics-svc', 'content-svc', 'reports-svc')

foreach ($service in $services) {
    Write-Host "`n$service:" -ForegroundColor Cyan
    
    # Make test request and measure time
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $health = Invoke-WebRequest -Uri "https://aivo.app/$service/health" -TimeoutSec 5
        $stopwatch.Stop()
        $ms = $stopwatch.ElapsedMilliseconds
        $color = if ($ms -lt 100) { 'Green' } elseif ($ms -lt 200) { 'Yellow' } else { 'Red' }
        Write-Host "  Response time: ${ms}ms" -ForegroundColor $color
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}
```

---

## Investigation Steps

### Step 1: Identify Slow Endpoints

```javascript
// In Datadog APM
// Navigate to: APM → Services → [service] → Resources

// Sort by P95 latency
// Look for:
// - Endpoints with P95 >500ms
// - Endpoints with sudden latency increase
// - High throughput endpoints
```

**Questions:**
- Is one endpoint causing most slowdown?
- Are all endpoints slow or just specific ones?
- Any new endpoints recently deployed?

### Step 2: Check Database Performance

```sql
-- Connect to production database
psql $env:DATABASE_URL

-- Check active queries and their duration
SELECT 
  pid,
  now() - query_start as duration,
  state,
  wait_event_type,
  wait_event,
  left(query, 100) as query_preview
FROM pg_stat_activity
WHERE datname = 'aivo_prod'
  AND state = 'active'
ORDER BY query_start
LIMIT 20;

-- Check for slow queries (>200ms)
SELECT 
  substring(query, 1, 100) as query_preview,
  calls,
  mean_exec_time as avg_ms,
  max_exec_time as max_ms,
  total_exec_time / 1000 / 60 as total_minutes
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'aivo_prod')
  AND mean_exec_time > 200
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check connection pool usage
SELECT 
  count(*) as total,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE datname = 'aivo_prod';
```

### Step 3: Check Cache Performance

```powershell
# Check Redis status
redis-cli -u $env:REDIS_URL INFO stats

# Key metrics:
# - keyspace_hits / (keyspace_hits + keyspace_misses) = hit rate
# - Should be >70%

# Check cache hit rate in Datadog
# Navigate to: Dashboards → Production → Cache Performance
```

**Expected:**
- Cache hit rate: >70%
- Redis memory usage: <80%
- Redis response time: <50ms

### Step 4: Check Resource Utilization

```powershell
# Check CPU usage
Get-Counter '\Processor(_Total)\% Processor Time'

# Check memory usage
Get-WmiObject Win32_OperatingSystem | Select-Object @{
  Name="UsedMemoryGB";
  Expression={[math]::Round(($_.TotalVisibleMemorySize - $_.FreePhysicalMemory)/1MB,2)}
}

# Check service resource usage (Docker)
docker stats --no-stream
```

### Step 5: Check Recent Changes

```powershell
# Check recent deployments
Get-Content logs/deployment-*.log | Select-String "Deployment completed" | Select-Object -Last 5

# Check recent commits
git log --oneline --since="4 hours ago"

# Did performance degrade after deployment?
```

---

## Common Causes & Solutions

### Cause 1: Database Query Performance

**Symptoms:**
- Slow database queries (>200ms)
- High database CPU
- Connection pool usage increasing

**Investigation:**
```sql
-- Find most expensive queries
SELECT 
  substring(query, 1, 150) as query,
  calls,
  mean_exec_time,
  total_exec_time / 1000 / 60 as total_minutes
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'aivo_prod')
ORDER BY total_exec_time DESC
LIMIT 10;

-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  seq_scan,
  idx_scan,
  seq_scan / NULLIF(idx_scan, 0) as seq_idx_ratio
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_scan DESC;
```

**Solution:**
```sql
-- Add missing indexes (use CONCURRENTLY to avoid locking)
-- Example: Trust score queries
CREATE INDEX CONCURRENTLY idx_user_activity_lookup 
ON user_activity(user_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Analyze tables to update statistics
ANALYZE user_activity;
ANALYZE lessons;
ANALYZE user_progress;

-- Check index usage after 15 minutes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_user_activity%'
ORDER BY idx_scan DESC;
```

### Cause 2: Low Cache Hit Rate

**Symptoms:**
- Cache hit rate <60%
- High database load
- Cache misses increasing

**Investigation:**
```bash
# Check cache statistics
redis-cli -u $REDIS_URL INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Check cache evictions
redis-cli -u $REDIS_URL INFO stats | grep evicted_keys

# Check memory usage
redis-cli -u $REDIS_URL INFO memory | grep used_memory_human
```

**Solution:**
```typescript
// Increase cache TTL for stable data
const CACHE_TTL = {
  userProfile: 3600,      // 1 hour (was 15 minutes)
  trustScore: 1800,       // 30 minutes (was 5 minutes)
  lessonContent: 7200,    // 2 hours (was 30 minutes)
  assessmentResults: 3600, // 1 hour (was 15 minutes)
};

// Implement cache warming for frequently accessed data
async function warmCache() {
  const popularLessons = await prisma.lesson.findMany({
    where: { views: { gt: 100 } },
    take: 50,
  });
  
  for (const lesson of popularLessons) {
    await cache.set(`lesson:${lesson.id}`, lesson, CACHE_TTL.lessonContent);
  }
}

// Run warming on deployment
await warmCache();
```

### Cause 3: High Resource Utilization

**Symptoms:**
- CPU >80%
- Memory >80%
- Slow response times across all endpoints

**Solution:**
```powershell
# Immediate: Scale horizontally (add more instances)
# Using Docker Compose scale
docker-compose up -d --scale auth-svc=3 --scale profile-svc=2

# Or using orchestrator (Kubernetes)
kubectl scale deployment auth-svc --replicas=3

# Monitor impact
docker stats

# Long-term: Optimize resource usage
```

```typescript
// Optimize memory usage
// Use streaming for large responses
async function getLargeDataset(req: Request, res: Response) {
  const stream = prisma.$queryRawStream`
    SELECT * FROM large_table WHERE condition = true
  `;
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  for await (const row of stream) {
    res.write(JSON.stringify(row) + '\n');
  }
  res.end();
}
```

### Cause 4: N+1 Query Problem

**Symptoms:**
- Multiple sequential database queries
- One request generating 100+ queries
- High database query count

**Investigation:**
```javascript
// Enable Prisma query logging
// In services/*/src/prisma.ts
const prisma = new PrismaClient({
  log: ['query'],
});

// Watch for repeated similar queries
// Example: Loading lessons with authors
// BAD: N+1 queries
for (const lesson of lessons) {
  const author = await prisma.user.findUnique({ 
    where: { id: lesson.authorId } 
  }); // 1 query per lesson!
}
```

**Solution:**
```typescript
// Use Prisma include/select to eager load
// GOOD: 1 query total
const lessons = await prisma.lesson.findMany({
  include: {
    author: true,  // Joined in single query
    category: true,
    tags: true,
  },
});

// Or use dataloader for batching
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (userIds: string[]) => {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
  });
  return userIds.map(id => users.find(u => u.id === id));
});

// Later: Automatically batches requests
const author = await userLoader.load(lesson.authorId);
```

### Cause 5: Trust Score Service Slow

**Symptoms:**
- Trust score calculation >900ms P95
- Trust score endpoint timing out
- Dependent service calls slow

**Investigation:**
```javascript
// Check trust score metrics in Datadog
service:auth-svc trust_score.calculation_time.p95
service:auth-svc trust_score.service_calls.duration

// Check service call failures
service:auth-svc trust_score.service_calls.failures
```

**Solution:**
```typescript
// Increase parallelism
async calculateTrustScore(userId: string): Promise<TrustScoreResult> {
  const startTime = Date.now();
  
  // Fetch all data in parallel (not sequential)
  const [attendance, lessonProgress, assessmentResults, reviews, badges] = 
    await Promise.all([
      this.dataProviders.getAttendanceData(userId),
      this.dataProviders.getLessonProgressData(userId),
      this.dataProviders.getAssessmentData(userId),
      this.dataProviders.getReviewData(userId),
      this.dataProviders.getBadgeData(userId),
    ]);
  
  // Add timeout to prevent hanging
  const timeout = 5000; // 5 seconds max
  const calculationPromise = this.calculateFromData(/* data */);
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Calculation timeout')), timeout)
  );
  
  try {
    return await Promise.race([calculationPromise, timeoutPromise]);
  } catch (error) {
    logger.warn('Trust score timeout, using cached', { userId });
    // Return cached value
    return await this.getCachedTrustScore(userId);
  }
}
```

---

## Resolution Steps

### Step 1: Implement Fix

Choose appropriate solution based on root cause:
- Add database indexes
- Increase cache TTL
- Fix N+1 queries
- Scale resources
- Optimize algorithms

### Step 2: Monitor Impact

```powershell
# Monitor P95 response times for 30 minutes
# Should decrease below 200ms

# PowerShell monitoring script
$startTime = Get-Date
while ($true) {
    # Query Datadog API for current P95
    # (Requires Datadog API key)
    
    $elapsed = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)
    Write-Host "[$elapsed min] Monitoring P95..." -ForegroundColor Cyan
    
    # Check service health
    foreach ($service in @('auth-svc', 'profile-svc', 'session-svc')) {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $health = Invoke-WebRequest -Uri "https://aivo.app/$service/health" -TimeoutSec 5
        $stopwatch.Stop()
        $ms = $stopwatch.ElapsedMilliseconds
        $color = if ($ms -lt 100) { 'Green' } elseif ($ms -lt 200) { 'Yellow' } else { 'Red' }
        Write-Host "  $service: ${ms}ms" -ForegroundColor $color
    }
    
    Start-Sleep -Seconds 60
    
    if ($elapsed -gt 30) { break }
}
```

### Step 3: Verify Resolution

```powershell
# Check all metrics returned to normal

# 1. Response times
# P95 <200ms ✓
# P99 <500ms ✓

# 2. Database performance
# Query times <100ms average ✓
# Connection pool <80% ✓

# 3. Cache performance
# Hit rate >70% ✓

# 4. Resource utilization
# CPU <70% ✓
# Memory <70% ✓
```

---

## Prevention

### 1. Performance Testing

```powershell
# Run regular performance tests
.\tests\performance\run-load-tests.ps1 -Profile load

# Compare against baseline
# Alert if P95 increases >20%
```

### 2. Query Performance Monitoring

```typescript
// Log slow queries automatically
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;
  
  if (duration > 200) {
    logger.warn('Slow query detected', {
      model: params.model,
      action: params.action,
      duration,
    });
  }
  
  return result;
});
```

### 3. Automated Index Recommendations

```sql
-- Weekly: Check for missing indexes
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  seq_scan / NULLIF(idx_scan, 0) as seq_idx_ratio
FROM pg_stat_user_tables
WHERE seq_scan > 10000
  AND seq_tup_read > 100000
ORDER BY seq_tup_read DESC;

-- Consider adding indexes for high-ratio tables
```

---

## Escalation

### When to Escalate

- P95 >300ms and not improving within 30 minutes
- Unable to identify root cause
- Requires infrastructure changes (scaling, upgrades)

### Escalation Path

1. **Primary On-Call** → 
2. **Performance Engineer** → 
3. **Tech Lead** → 
4. **Infrastructure Team**

---

## Related Runbooks

- [High Error Rate](./high-error-rate.md)
- [Database Pool Exhaustion](./database-pool-exhaustion.md)
- [Service Down](./service-down.md)

---

**Last Updated:** January 28, 2026  
**Owner:** DevOps Team
