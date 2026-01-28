# AIVO Production Monitoring Guide

**Owner:** DevOps Team  
**Last Updated:** January 28, 2026  
**Audience:** DevOps Engineers, SREs, On-Call Engineers  

---

## Table of Contents

1. [Overview](#overview)
2. [Dashboard Access](#dashboard-access)
3. [Key Metrics](#key-metrics)
4. [Alert Configuration](#alert-configuration)
5. [Runbook Index](#runbook-index)
6. [SLO Tracking](#slo-tracking)
7. [Escalation Procedures](#escalation-procedures)
8. [Common Tasks](#common-tasks)

---

## Overview

This guide provides comprehensive information on monitoring the AIVO production platform. It covers dashboards, metrics, alerts, and procedures for maintaining system health and reliability.

**Key Monitoring Tools:**
- **Datadog:** Primary observability platform (dashboards, alerts, logs, APM)
- **Grafana:** Alternative dashboards (if needed)
- **PagerDuty:** On-call alerting and incident management
- **Slack:** Team notifications and collaboration

---

## Dashboard Access

### Primary Production Dashboard

**URL:** https://datadog.com/aivo/production-dashboard

**Key Sections:**
1. **System Overview** - Request rate, error rate, active users, uptime
2. **Response Times** - P50, P95, P99 latencies by service
3. **Database Performance** - Connection pool, query times, slow queries
4. **Cache Performance** - Hit rate, memory usage, operations
5. **Trust Score Performance** - Calculation times, service calls
6. **Resource Utilization** - CPU, memory, network I/O
7. **Error Tracking** - Error rates by service and status code
8. **SLO Tracking** - Availability, latency, error rate SLOs

**Access:**
- Datadog account required
- Contact DevOps for access provisioning
- Read-only access for most engineers
- Edit access for DevOps team

### Service-Specific Dashboards

Individual service dashboards for deep-dive analysis:

- **Auth Service:** https://datadog.com/aivo/auth-svc-dashboard
- **Profile Service:** https://datadog.com/aivo/profile-svc-dashboard
- **Session Service:** https://datadog.com/aivo/session-svc-dashboard
- **Analytics Service:** https://datadog.com/aivo/analytics-svc-dashboard
- **Content Service:** https://datadog.com/aivo/content-svc-dashboard
- **Reports Service:** https://datadog.com/aivo/reports-svc-dashboard

### Infrastructure Dashboards

- **Database:** https://datadog.com/aivo/database-dashboard
- **Redis Cache:** https://datadog.com/aivo/redis-dashboard
- **System Resources:** https://datadog.com/aivo/infrastructure-dashboard

---

## Key Metrics

### Application Performance Metrics

#### Response Time Metrics

| Metric | Target | Warning | Critical | Description |
|--------|--------|---------|----------|-------------|
| P50 Response Time | <100ms | >150ms | >200ms | Median response time |
| P95 Response Time | <200ms | >200ms | >300ms | 95th percentile |
| P99 Response Time | <500ms | >800ms | >1000ms | 99th percentile |

**How to read:**
- **P50 (median):** Half of requests are faster than this
- **P95:** 95% of requests are faster than this (most important)
- **P99:** 99% of requests are faster than this (worst case)

**Query in Datadog:**
```
avg:http.response_time.p95{env:production} by {service}
```

#### Request Rate Metrics

| Metric | Normal Range | Alert On |
|--------|--------------|----------|
| Total requests/sec | 50-500 | <10 or >1000 |
| Auth requests/sec | 10-50 | <2 or >200 |
| Profile requests/sec | 20-100 | <5 or >500 |

**Query in Datadog:**
```
sum:http.requests{env:production}.as_rate()
```

#### Error Rate Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Overall error rate | <0.5% | >0.5% | >1.0% |
| 5xx errors | <0.3% | >0.3% | >0.5% |
| 4xx errors | <5% | >10% | >20% |

**Query in Datadog:**
```
sum:http.errors{env:production}.as_count() / sum:http.requests{env:production}.as_count() * 100
```

### Database Metrics

#### Connection Pool Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Active connections | <40 (80%) | >40 | >45 (90%) |
| Idle connections | 5-10 | <2 | <1 |
| Pool exhaustion events | 0 | >0 | >5/hour |

**Query in Datadog:**
```
avg:postgresql.connections.active{env:production}
```

#### Query Performance Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Average query time | <50ms | >100ms | >200ms |
| P95 query time | <100ms | >200ms | >500ms |
| Slow queries/min | <5 | >10 | >20 |

**Query in Datadog:**
```
avg:postgresql.query_time.avg{env:production}
```

### Cache Metrics

#### Redis Performance

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Cache hit rate | >70% | <65% | <60% |
| Memory usage | <80% | >85% | >90% |
| Operations/sec | 100-1000 | >2000 | >5000 |
| Response time P95 | <50ms | >75ms | >100ms |

**Query in Datadog:**
```
sum:redis.hits{env:production}.as_count() / (sum:redis.hits{env:production}.as_count() + sum:redis.misses{env:production}.as_count()) * 100
```

### Resource Utilization Metrics

#### CPU & Memory

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| CPU usage | <70% | >80% | >90% |
| Memory usage | <70% | >80% | >90% |
| Disk usage | <70% | >85% | >95% |

**Query in Datadog:**
```
avg:system.cpu.usage{env:production} by {service}
avg:system.memory.usage{env:production} by {service}
```

---

## Alert Configuration

### Alert Routing

| Severity | Destination | Response Time |
|----------|-------------|---------------|
| **Critical** | PagerDuty → On-call engineer | Immediate (<5 min) |
| **Warning** | Slack #production-monitoring | Within business hours |
| **Info** | Logs only | No action required |

### Critical Alerts (PagerDuty)

All critical alerts page the on-call engineer via PagerDuty:

1. **High Error Rate** (>1% for 5 min)
2. **P95 Response Time Critical** (>300ms for 10 min)
3. **Database Connection Pool Exhausted** (>90% for 5 min)
4. **Service Health Check Failed** (2 min)
5. **Memory Usage Critical** (>90% for 5 min)
6. **Redis Connection Failed** (2 min)

**PagerDuty Access:**
- URL: https://aivo.pagerduty.com
- Mobile app required for on-call
- Configure notification preferences (SMS, phone, push)

### Warning Alerts (Slack)

Warning alerts notify via Slack `#production-monitoring` channel:

1. **Cache Hit Rate Low** (<60% for 15 min)
2. **P95 Response Time Elevated** (>200ms for 15 min)
3. **Trust Score Calculation Slow** (>900ms for 10 min)
4. **Slow Queries Detected** (>5/min for 10 min)
5. **High CPU Usage** (>80% for 10 min)
6. **Redis Memory High** (>80% for 10 min)

### Alert Customization

Alerts are defined in `monitoring/alerts.yaml`. To modify:

```yaml
# Example: Adjust threshold
- name: "High Error Rate"
  query: "avg(last_5m):sum:http.errors{env:production}.as_count() / sum:http.requests{env:production}.as_count() * 100 > 1"
  thresholds:
    critical: 1.0  # Change this value
    warning: 0.5
```

After editing, apply changes:
```powershell
# Upload to Datadog
datadog-cli monitor update --file monitoring/alerts.yaml
```

---

## Runbook Index

When an alert fires, consult the appropriate runbook for investigation and resolution steps:

### Critical Incidents

| Alert | Runbook | Response Time |
|-------|---------|---------------|
| High Error Rate | [high-error-rate.md](./runbooks/high-error-rate.md) | Immediate |
| Database Pool Exhausted | [database-pool-exhaustion.md](./runbooks/database-pool-exhaustion.md) | Immediate |
| Service Down | [service-down.md](./runbooks/service-down.md) | Immediate |
| Performance Degradation | [performance-degradation.md](./runbooks/performance-degradation.md) | 15 minutes |

### Common Scenarios

- **Deployment Issues:** [deployment-rollback.md](./runbooks/deployment-rollback.md)
- **Cache Issues:** [cache-troubleshooting.md](./runbooks/cache-troubleshooting.md)
- **Database Issues:** [database-troubleshooting.md](./runbooks/database-troubleshooting.md)
- **Load Spike:** [traffic-spike-mitigation.md](./runbooks/traffic-spike-mitigation.md)

### Runbook Structure

Each runbook contains:
1. **Overview:** What is this incident?
2. **Symptoms:** How to recognize it
3. **Initial Response:** First steps (0-5 minutes)
4. **Investigation:** How to diagnose root cause
5. **Resolution:** How to fix it
6. **Prevention:** How to avoid in future
7. **Escalation:** When and how to escalate

---

## SLO Tracking

### Current SLOs

| SLO | Target | Current | Status | Error Budget Remaining |
|-----|--------|---------|--------|------------------------|
| Availability | 99.9% | 99.92% | ✅ | 80% |
| P95 Latency | <200ms | 185ms | ✅ | 75% |
| Error Rate | <0.5% | 0.35% | ✅ | 70% |
| Database P95 | <100ms | 88ms | ✅ | 88% |
| Cache Hit Rate | >70% | 74% | ✅ | N/A |
| Trust Score P95 | <900ms | 820ms | ✅ | 91% |

**View detailed SLO report:**
- Dashboard: https://datadog.com/aivo/slo-dashboard
- Documentation: [SLO_DEFINITIONS.md](./SLO_DEFINITIONS.md)

### Error Budget Policy

| Error Budget Remaining | Action |
|------------------------|--------|
| >50% | Normal development velocity |
| 25-50% | Increase monitoring, review recent changes |
| 10-25% | Slow down features, prioritize reliability |
| <10% | **Feature freeze**, focus on reliability only |
| 0% (SLO breached) | **All hands**, incident review required |

**Check error budget:**
```powershell
# Query Datadog for current error budget
datadog-cli slo status --slo-id availability-slo
```

---

## Escalation Procedures

### When to Escalate

Escalate to next level when:
- Unable to resolve within expected timeframe
- Root cause unclear and requires expertise
- Multiple systems failing simultaneously
- Incident severity increases
- Data integrity concerns

### Escalation Path

```
Primary On-Call (You)
        ↓
Secondary On-Call (PagerDuty)
        ↓
Service Owner / Tech Lead
        ↓
Engineering Manager
        ↓
CTO
```

### How to Escalate

1. **In PagerDuty:**
   - Click "Escalate Incident"
   - Add escalation note with context
   - Select escalation policy

2. **In Slack:**
   - Post to `#production-incidents`
   - Use `@here` or `@channel` for critical
   - Provide incident summary and current status

3. **Phone Call (Critical Only):**
   - Use PagerDuty phone tree
   - For CTO escalation: [redacted]

### Escalation Template

```markdown
🚨 ESCALATING INCIDENT 🚨

**Incident:** [Brief description]
**Duration:** [X minutes/hours]
**Impact:** [% users affected, services down]
**Root Cause:** [Known/Unknown]
**Actions Taken:** [What you've tried]
**Why Escalating:** [Reason]
**Next Steps Needed:** [What help you need]
```

---

## Common Tasks

### Task 1: Check System Health

```powershell
# Quick health check of all services
$services = @('auth-svc', 'profile-svc', 'session-svc', 'analytics-svc', 'content-svc', 'reports-svc')

Write-Host "`n=== AIVO System Health Check ===" -ForegroundColor Cyan
Write-Host "Time: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))`n"

foreach ($service in $services) {
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri "https://aivo.app/$service/health" -TimeoutSec 5
        $stopwatch.Stop()
        
        $health = $response.Content | ConvertFrom-Json
        $status = $health.status
        $responseTime = $stopwatch.ElapsedMilliseconds
        
        $color = switch ($status) {
            'healthy' { 'Green' }
            'degraded' { 'Yellow' }
            'unhealthy' { 'Red' }
            default { 'White' }
        }
        
        Write-Host "✓ $service" -NoNewline -ForegroundColor $color
        Write-Host " - $status (${responseTime}ms)" -ForegroundColor $color
        
        # Show failing checks if degraded/unhealthy
        if ($status -ne 'healthy') {
            foreach ($check in $health.checks.PSObject.Properties) {
                if ($check.Value.status -ne 'healthy') {
                    Write-Host "  └─ $($check.Name): $($check.Value.status)" -ForegroundColor Red
                }
            }
        }
    } catch {
        Write-Host "✗ $service - UNREACHABLE: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== End Health Check ===`n"
```

### Task 2: Check Key Metrics

```powershell
# Quick metrics check
Write-Host "`n=== AIVO Key Metrics ===" -ForegroundColor Cyan

# Error rate (from Datadog API - requires API key)
# Placeholder - actual implementation requires Datadog API
Write-Host "Error Rate: 0.35% (Target: <0.5%) ✓" -ForegroundColor Green
Write-Host "P95 Latency: 185ms (Target: <200ms) ✓" -ForegroundColor Green
Write-Host "Cache Hit Rate: 74% (Target: >70%) ✓" -ForegroundColor Green
Write-Host "Active Users: 523" -ForegroundColor White
Write-Host "Requests/sec: 127" -ForegroundColor White

Write-Host "`n=== Database Status ===" -ForegroundColor Cyan

# Database connection pool
$dbStatus = psql $env:DATABASE_URL -t -c "SELECT count(*) as total, count(*) FILTER (WHERE state='active') as active, count(*) FILTER (WHERE state='idle') as idle FROM pg_stat_activity WHERE datname='aivo_prod';"

Write-Host "Connection Pool: $dbStatus"

Write-Host "`n=== Redis Status ===" -ForegroundColor Cyan

# Redis status
$redisInfo = redis-cli -u $env:REDIS_URL INFO server | Select-String "redis_version"
Write-Host $redisInfo

Write-Host "`n=== End Metrics ===`n"
```

### Task 3: View Recent Errors

```powershell
# View recent errors from logs
Write-Host "`n=== Recent Errors (Last 10) ===" -ForegroundColor Cyan

# In Datadog Logs
# Filter: service:* status:error @timestamp>now-15m
# Or from local logs:

Get-ChildItem -Path "services/*/logs/app.log" | ForEach-Object {
    $serviceName = (Split-Path (Split-Path $_.FullName -Parent) -Leaf)
    $errors = Get-Content $_.FullName -Tail 100 | Where-Object { $_ -match "ERROR|FATAL" } | Select-Object -First 3
    
    if ($errors) {
        Write-Host "`n$serviceName:" -ForegroundColor Yellow
        $errors | ForEach-Object { Write-Host "  $_" }
    }
}

Write-Host "`n=== End Errors ===`n"
```

### Task 4: Monitor Deployment

```powershell
# Monitor deployment progress
Write-Host "`n=== Monitoring Deployment ===" -ForegroundColor Cyan

$deploymentLog = Get-Content logs/deployment-*.log -Tail 1
Write-Host "Latest deployment: $deploymentLog"

# Watch deployment logs
Write-Host "`nTailing deployment logs (Ctrl+C to stop)..." -ForegroundColor Yellow
Get-Content logs/deployment-*.log -Wait -Tail 20
```

### Task 5: Acknowledge Alert

```powershell
# Acknowledge alert in PagerDuty
Write-Host "To acknowledge alert in PagerDuty:"
Write-Host "1. Open PagerDuty mobile app or web"
Write-Host "2. Navigate to 'Incidents'"
Write-Host "3. Click on active incident"
Write-Host "4. Click 'Acknowledge'"
Write-Host "5. Add note with initial assessment"
```

---

## Monitoring Best Practices

### 1. Regular Health Checks

- Run system health check at start of on-call shift
- Review dashboards at least twice daily
- Monitor during deployments and high-traffic periods

### 2. Proactive Monitoring

- Watch for trends (increasing error rates, response times)
- Act on warnings before they become critical
- Review SLO error budget consumption weekly

### 3. Alert Hygiene

- Acknowledge alerts promptly
- Add notes to PagerDuty incidents
- Close resolved incidents
- Review alert effectiveness monthly

### 4. Documentation

- Update runbooks when new solutions found
- Document unusual incidents
- Share learnings in post-incident reviews

### 5. Communication

- Post status updates in `#production-incidents`
- Notify stakeholders of customer-impacting issues
- Coordinate with team during incidents

---

## Useful Links

### Dashboards
- [Production Dashboard](https://datadog.com/aivo/production-dashboard)
- [SLO Dashboard](https://datadog.com/aivo/slo-dashboard)
- [Database Dashboard](https://datadog.com/aivo/database-dashboard)

### Tools
- [PagerDuty](https://aivo.pagerduty.com)
- [Datadog Logs](https://datadog.com/logs)
- [Status Page](https://status.aivo.app)

### Documentation
- [SLO Definitions](./SLO_DEFINITIONS.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Runbooks](./runbooks/)

### Slack Channels
- `#production-alerts` - Critical alerts
- `#production-monitoring` - Warning alerts
- `#production-incidents` - Incident coordination
- `#production-deployments` - Deployment notifications

---

## Support Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Primary On-Call | PagerDuty rotation | 24/7 |
| Secondary On-Call | PagerDuty rotation | 24/7 |
| DevOps Lead | [redacted] | Business hours |
| Database Admin | [redacted] | On-call rotation |
| CTO | [redacted] | Emergency only |

---

**Last Updated:** January 28, 2026  
**Maintainer:** DevOps Team  
**Review:** Monthly
