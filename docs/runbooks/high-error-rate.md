# Runbook: High Error Rate (>1%)

**Severity:** 🚨 CRITICAL  
**Response Time:** Immediate (<5 minutes)  
**Alert:** "High Error Rate"  
**Threshold:** Error rate >1% for 5+ minutes

---

## Overview

This alert indicates that the system is experiencing an elevated error rate above 1%, which is twice our SLO target of 0.5%. This typically indicates a serious production issue requiring immediate attention.

---

## Symptoms

- Error rate dashboard shows >1%
- Increased customer support tickets
- Status page may show degraded performance
- Error logs showing high volume of errors

---

## Initial Response (First 5 Minutes)

### 1. Acknowledge Alert

```powershell
# Acknowledge in PagerDuty
# This prevents duplicate pages
```

### 2. Assess Severity

Navigate to Datadog dashboard:

- https://datadog.com/aivo/production-dashboard

Check:

- Current error rate (%)
- Affected services
- Error rate trend (increasing/stable/decreasing)
- Number of users impacted

### 3. Quick Status Check

```powershell
# Check service health
Invoke-WebRequest -Uri "https://aivo.app/health" | ConvertFrom-Json

# Check all service healths
@('auth-svc', 'profile-svc', 'session-svc', 'analytics-svc', 'content-svc', 'reports-svc') | ForEach-Object {
    $health = Invoke-WebRequest -Uri "https://aivo.app/$_/health" | ConvertFrom-Json
    Write-Host "$_: $($health.status)"
}
```

---

## Investigation Steps

### Step 1: Identify Failing Endpoints

```javascript
// In Datadog Log Explorer
service:* status:error
| group by http.url_details.path
| sort by count desc
| limit 10
```

**What to look for:**

- Is a specific endpoint causing most errors?
- Are errors distributed across all endpoints?
- Any new endpoints showing errors?

### Step 2: Check Error Types

```javascript
// In Datadog Log Explorer
service:* status:error
| group by error.kind
| sort by count desc
```

**Common error types:**

- `ConnectionError`: Database or Redis connection issues
- `TimeoutError`: Slow queries or service calls
- `ValidationError`: Bad request data (less critical)
- `AuthenticationError`: Auth service issues
- `InternalServerError`: Application logic errors

### Step 3: Review Recent Changes

```powershell
# Check recent deployments
Get-Content logs/deployment-*.log | Select-String "Deployment.*completed" | Select-Object -Last 5

# Check recent git commits
git log --oneline --since="2 hours ago"
```

**Questions:**

- Was there a deployment in the last 2 hours?
- Any configuration changes?
- Any database migrations?

### Step 4: Check Dependencies

```powershell
# Check database connectivity
psql $env:DATABASE_URL -c "SELECT 1"

# Check Redis connectivity
redis-cli -u $env:REDIS_URL PING

# Check external service status
# - Stripe status: https://status.stripe.com
# - SendGrid status: https://status.sendgrid.com
```

### Step 5: Examine Error Logs

```javascript
// In Datadog, filter by time range of high error rate
service:* status:error
| sort by @timestamp desc
| limit 50
```

**Look for patterns:**

- Same error message repeated?
- Specific user IDs affected?
- Geographic patterns?
- Timing patterns (every X seconds)?

---

## Common Causes & Solutions

### Cause 1: Recent Deployment Issue

**Symptoms:**

- Error rate spiked immediately after deployment
- Specific service showing errors
- Errors in new code paths

**Solution:**

```powershell
# Immediate rollback
.\scripts\rollback-deployment.ps1 `
  -FromSlot green `
  -ToSlot blue `
  -Environment production `
  -Reason "High error rate after deployment"

# Verify error rate decreases
# Monitor for 10 minutes
```

**Post-Rollback:**

1. Investigate failed deployment locally
2. Fix issues
3. Test in staging
4. Retry deployment

### Cause 2: Database Connection Pool Exhaustion

**Symptoms:**

- Errors: "Connection pool exhausted" or "Connection timeout"
- Database connection count at/near limit (50)
- Slow response times

**Solution:**

```sql
-- Check active connections
SELECT count(*), state, wait_event_type
FROM pg_stat_activity
WHERE datname = 'aivo_prod'
GROUP BY state, wait_event_type;

-- Identify long-running queries
SELECT
  pid,
  now() - query_start as duration,
  state,
  query
FROM pg_stat_activity
WHERE datname = 'aivo_prod' AND state != 'idle'
ORDER BY duration DESC
LIMIT 10;

-- Kill long-running queries if needed (>5 minutes)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'aivo_prod'
  AND state != 'idle'
  AND now() - query_start > interval '5 minutes';
```

**Immediate mitigation:**

```typescript
// Increase connection pool size temporarily
// In services/auth-svc/src/prisma.ts
export const prisma = createOptimizedPrismaClient(
  RecommendedConfig.loadTest, // 100 connections
  logger
);

// Redeploy auth-svc
```

### Cause 3: Redis Cache Failure

**Symptoms:**

- Errors: "Redis connection refused" or "ECONNREFUSED"
- Cache hit rate drops to 0%
- Database load increases significantly

**Solution:**

```bash
# Check Redis status
redis-cli -u $REDIS_URL INFO server

# Check Redis memory
redis-cli -u $REDIS_URL INFO memory

# If Redis is down, restart or failover
# Hetzner: systemctl restart redis on the server
```

**Immediate mitigation:**

```typescript
// Services should gracefully degrade without cache
// Verify cache service has proper error handling
try {
  const cached = await cache.get(key);
} catch (error) {
  logger.warn('Cache unavailable, querying database', { error });
  // Fall back to database
}
```

### Cause 4: External Service Outage

**Symptoms:**

- Errors specific to external API calls (Stripe, SendGrid, etc.)
- Timeout errors on external requests
- Service call failures in trust score

**Solution:**

```powershell
# Check external service status pages
Start-Process "https://status.stripe.com"
Start-Process "https://status.sendgrid.com"

# Check trust score service call failures
# In Datadog
service:auth-svc @trust_score.service_call.failed:true
```

**Immediate mitigation:**

```typescript
// Verify services have proper fallbacks
// Example: Trust score should use cached values or safe defaults
const trustScoreData = await this.dataProviders.getReviewData(userId).catch((error) => {
  logger.warn('Review service unavailable, using defaults', { error });
  return defaultReviewData; // Safe fallback
});
```

### Cause 5: Traffic Spike / DDoS

**Symptoms:**

- Sudden traffic increase (10x normal)
- Errors: "Too many requests" or "Service unavailable"
- Resource utilization (CPU/memory) maxed out

**Solution:**

```powershell
# Check traffic volume
# In Datadog
sum:http.requests{env:production}.as_rate()

# Check request sources
# In Datadog logs
service:*
| group by http.client_ip
| sort by count desc
| limit 20
```

**Immediate mitigation:**

```bash
# Enable rate limiting at load balancer
# Hetzner firewall: Implement IP blocking rules
# Cloudflare: Enable "I'm Under Attack" mode

# Block offending IPs if identified
# Add IP to firewall blocklist
```

---

## Resolution Steps

### Step 1: Implement Fix

Based on root cause identified:

- Rollback deployment if deployment-related
- Scale resources if capacity issue
- Fix connection pool if pool exhaustion
- Implement fallbacks if dependency issue

### Step 2: Verify Resolution

```powershell
# Monitor error rate for 15 minutes
# Should drop below 0.5% and stay stable

# Check Datadog dashboard
Start-Process "https://datadog.com/aivo/production-dashboard"

# Verify all services healthy
@('auth-svc', 'profile-svc', 'session-svc', 'analytics-svc', 'content-svc', 'reports-svc') | ForEach-Object {
    $health = Invoke-WebRequest -Uri "https://aivo.app/$_/health" | ConvertFrom-Json
    Write-Host "$_: $($health.status)" -ForegroundColor $(if ($health.status -eq 'healthy') { 'Green' } else { 'Red' })
}
```

### Step 3: Update Status Page

```markdown
# If customer-impacting, update status page

# https://status.aivo.app

**Title:** Elevated Error Rates Resolved
**Status:** Resolved
**Message:**
We experienced elevated error rates from [start time] to [end time] due to [root cause].
The issue has been resolved and all systems are operating normally.
```

### Step 4: Post-Incident Communication

```markdown
# Post to #production-incidents Slack channel

**Incident:** High Error Rate
**Duration:** [X minutes]
**Root Cause:** [Brief description]
**Resolution:** [Brief description]
**Impact:** [% of users affected]
**Next Steps:** Post-incident review scheduled
```

---

## Prevention

### Immediate Actions

1. **Add test coverage** for affected code paths
2. **Update deployment checklist** if deployment-related
3. **Add monitoring** for early warning if missed
4. **Document** new failure mode

### Long-term Actions

1. **Post-Incident Review (PIR)**
   - Schedule within 48 hours
   - Invite: On-call engineer, team lead, affected service owners
   - Document: Timeline, root cause, contributing factors
   - Action items: Prevention measures

2. **Update Runbooks**
   - Add this specific failure scenario
   - Update mitigation steps
   - Add links to relevant logs/dashboards

3. **Improve Monitoring**
   - Add alerts for early warning signs
   - Lower alert thresholds if needed
   - Add composite alerts for related metrics

---

## Escalation

### When to Escalate

- Unable to identify root cause within 15 minutes
- Unable to mitigate within 30 minutes
- Multiple systems failing simultaneously
- Data integrity concerns

### Escalation Path

1. **Primary On-Call** (you) →
2. **Secondary On-Call** (check PagerDuty) →
3. **Tech Lead** →
4. **CTO**

### Escalation Commands

```powershell
# Page secondary on-call
# In PagerDuty: "Escalate incident"

# Post to Slack
# "#production-incidents" channel
@here Escalating high error rate incident. Need additional help.
Root cause: [brief description or "unknown"]
Current status: [mitigation attempts]
```

---

## Related Runbooks

- [Performance Degradation](./performance-degradation.md)
- [Service Down](./service-down.md)
- [Database Issues](./database-issues.md)
- [Deployment Rollback](./deployment-rollback.md)

---

## Metrics

**Target Resolution Time:** 30 minutes  
**Average Resolution Time:** [Update after incidents]  
**Escalation Rate:** [Update after incidents]

---

**Last Updated:** January 28, 2026  
**Owner:** DevOps Team  
**Reviewers:** Engineering Team
