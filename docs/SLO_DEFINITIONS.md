# AIVO Production SLO/SLI Definitions

**Owner:** DevOps & Engineering Team  
**Last Updated:** January 28, 2026  
**Review Cadence:** Monthly  

---

## Overview

Service Level Indicators (SLIs) are quantitative measures of service performance. Service Level Objectives (SLOs) are target values or ranges for SLIs. Together, they define what "good service" means for AIVO.

---

## Core SLOs

### 1. Availability SLO

**Definition:** Percentage of time the service successfully serves requests.

**SLI Calculation:**
```
Availability = (Successful Requests / Total Requests) × 100%

Where:
- Successful Requests = HTTP status codes 200-299, 301-302, 304
- Failed Requests = HTTP status codes 500-599 (excluding 503 during maintenance)
```

**SLO Targets:**

| Period | Target | Error Budget | Allowed Downtime |
|--------|--------|--------------|------------------|
| Daily | 99.9% | 0.1% | ~1.4 minutes |
| Weekly | 99.9% | 0.1% | ~10 minutes |
| Monthly | 99.9% | 0.1% | ~43 minutes |
| Quarterly | 99.9% | 0.1% | ~2.6 hours |

**Measurement:**
- Source: Load balancer access logs, application metrics
- Frequency: Real-time, aggregated per minute
- Dashboard: Datadog → Production Dashboard → SLO Tracking

**Alert Thresholds:**
- **Warning:** 99.5% daily (50% of error budget consumed)
- **Critical:** 99.0% daily (100% of error budget consumed)

**Exclusions:**
- Planned maintenance windows (announced 48h in advance)
- DDoS attacks (mitigated by rate limiting)
- Client errors (4xx status codes)

---

### 2. Latency SLO (P95 Response Time)

**Definition:** 95% of requests complete within target latency.

**SLI Calculation:**
```
P95 Latency = 95th percentile of request response times

Measured from:
- Request received at load balancer
- To response fully sent from application
```

**SLO Targets:**

| Endpoint Type | P95 Target | P99 Target | Notes |
|---------------|------------|------------|-------|
| Health checks | <50ms | <100ms | Should be fast |
| Authentication | <200ms | <500ms | Critical path |
| Profile reads | <200ms | <500ms | Cached |
| Content reads | <200ms | <500ms | Cached |
| Trust score | <900ms | <1500ms | Complex calculation |
| Reports | <2000ms | <5000ms | Heavy computation |
| Writes | <300ms | <800ms | Database writes |

**Overall System Target:**
- **P95 <200ms** for 99% of daily measurements
- **P99 <500ms** for 95% of daily measurements

**Measurement:**
- Source: APM (Datadog), application metrics
- Frequency: Real-time, aggregated per minute
- Dashboard: Datadog → Production Dashboard → Response Times

**Alert Thresholds:**
- **Warning:** P95 >200ms for 15 minutes
- **Critical:** P95 >300ms for 10 minutes

---

### 3. Error Rate SLO

**Definition:** Percentage of requests that result in errors.

**SLI Calculation:**
```
Error Rate = (Error Responses / Total Requests) × 100%

Where:
- Error Responses = HTTP status codes 500-599
- Excluding expected errors (e.g., 503 during deployment with <1% traffic)
```

**SLO Target:**
- **Error Rate <0.5%** daily

**Breakdown by Error Type:**

| Error Type | Target | Notes |
|------------|--------|-------|
| 500 Internal Server Error | <0.3% | Application errors |
| 502 Bad Gateway | <0.1% | Service unavailable |
| 503 Service Unavailable | <0.05% | Overload/maintenance |
| 504 Gateway Timeout | <0.05% | Timeout errors |

**Measurement:**
- Source: Load balancer logs, application logs
- Frequency: Real-time, aggregated per minute
- Dashboard: Datadog → Production Dashboard → Error Tracking

**Alert Thresholds:**
- **Warning:** Error rate >0.5% for 5 minutes
- **Critical:** Error rate >1.0% for 5 minutes

---

### 4. Database Performance SLO

**Definition:** Database queries complete within acceptable time.

**SLI Calculation:**
```
Query Latency P95 = 95th percentile of query execution times
Connection Pool Usage = Active Connections / Total Connections
```

**SLO Targets:**

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Query P95 | <100ms | >150ms | >200ms |
| Query P99 | <200ms | >300ms | >500ms |
| Slow queries/min | <5 | >10 | >20 |
| Connection pool usage | <80% | >80% | >90% |

**Measurement:**
- Source: PostgreSQL metrics, Prisma query logs
- Frequency: Every 30 seconds
- Dashboard: Datadog → Production Dashboard → Database Performance

**Alert Thresholds:**
- **Warning:** Query P95 >150ms for 10 minutes
- **Critical:** Connection pool >90% for 5 minutes

---

### 5. Cache Performance SLO

**Definition:** Redis cache effectively reduces database load.

**SLI Calculation:**
```
Cache Hit Rate = Hits / (Hits + Misses) × 100%
Cache Response Time P95 = 95th percentile of cache operations
```

**SLO Targets:**

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Cache hit rate | >70% | <65% | <60% |
| Cache P95 latency | <50ms | >75ms | >100ms |
| Cache memory usage | <80% | >85% | >90% |
| Cache evictions/sec | <10 | >20 | >50 |

**Measurement:**
- Source: Redis INFO stats
- Frequency: Every 30 seconds
- Dashboard: Datadog → Production Dashboard → Cache Performance

**Alert Thresholds:**
- **Warning:** Hit rate <65% for 15 minutes
- **Critical:** Cache memory >90%

---

### 6. Trust Score Performance SLO

**Definition:** Trust score calculations complete efficiently.

**SLI Calculation:**
```
Trust Score P95 = 95th percentile of calculation times
Service Call Success Rate = Successful Calls / Total Calls
```

**SLO Targets:**

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Calculation P95 | <900ms | >1200ms | >1500ms |
| Calculation P99 | <1500ms | >2000ms | >3000ms |
| Service call success | >99% | <98% | <95% |
| Cache hit rate | >80% | <70% | <60% |

**Measurement:**
- Source: Application metrics (auth-svc)
- Frequency: Every request
- Dashboard: Datadog → Production Dashboard → Trust Score Performance

**Alert Thresholds:**
- **Warning:** P95 >900ms for 10 minutes
- **Critical:** Service call success <95%

---

## Error Budget Policy

### Error Budget Definition

**Error budget** is the allowed amount of unavailability or performance degradation before SLO is violated.

**Example (Availability):**
- SLO: 99.9% monthly availability
- Error Budget: 0.1% = ~43 minutes of downtime per month

### Error Budget Tracking

```typescript
// Error budget consumption calculation
interface ErrorBudget {
  slo: number;              // e.g., 99.9
  actualPerformance: number; // e.g., 99.85
  errorBudget: number;       // 0.1
  consumed: number;          // 0.05 (50%)
  remaining: number;         // 0.05 (50%)
}

function calculateErrorBudget(
  totalRequests: number,
  failedRequests: number,
  sloTarget: number
): ErrorBudget {
  const actualPerformance = ((totalRequests - failedRequests) / totalRequests) * 100;
  const errorBudget = 100 - sloTarget;
  const consumed = sloTarget - actualPerformance;
  const remaining = errorBudget - consumed;
  
  return {
    slo: sloTarget,
    actualPerformance,
    errorBudget,
    consumed,
    remaining,
  };
}
```

### Error Budget Policy

| Error Budget Remaining | Action Required |
|------------------------|-----------------|
| >50% | Normal operations. Continue feature development. |
| 25-50% | Caution zone. Increase monitoring. Review recent changes. |
| 10-25% | Slow down. Prioritize reliability over features. Require extra testing. |
| <10% | **Freeze features**. Focus on reliability. Incident review required. |
| 0% (SLO breached) | **Feature freeze**. All hands on reliability. Root cause analysis required. |

---

## SLO Reporting

### Daily SLO Report (Automated)

Sent to: `#production-metrics` Slack channel  
Time: 9:00 AM daily

```markdown
📊 **Daily SLO Report** - [Date]

✅ **Availability:** 99.95% (Target: 99.9%) - 95% error budget remaining
⚠️  **P95 Latency:** 215ms (Target: <200ms) - WARNING
✅ **Error Rate:** 0.3% (Target: <0.5%)
✅ **Database P95:** 85ms (Target: <100ms)
⚠️  **Cache Hit Rate:** 68% (Target: >70%) - WARNING
✅ **Trust Score P95:** 850ms (Target: <900ms)

**Error Budget Status:** 85% remaining (safe zone)

**Action Items:**
- Investigate P95 latency increase (auth-svc)
- Review cache hit rate decline (profile-svc)
```

### Weekly SLO Review (Manual)

Attendees: DevOps, Tech Leads  
Time: Monday 10:00 AM

**Agenda:**
1. Review previous week's SLO performance
2. Discuss any SLO violations
3. Review error budget consumption
4. Identify trends (improving/degrading)
5. Action items for upcoming week

### Monthly SLO Review (Executive)

Attendees: Engineering Leadership, CTO  
Time: First Monday of month

**Deliverables:**
1. Monthly SLO summary report
2. Trend analysis (vs. previous months)
3. Root cause analysis for SLO violations
4. Reliability roadmap updates

---

## SLO Monitoring Implementation

### Datadog SLO Configuration

```yaml
# SLO: Availability (99.9% monthly)
slos:
  - name: "AIVO Production Availability"
    type: metric
    description: "99.9% of requests succeed"
    query:
      numerator: "sum:http.requests{env:production,status:ok}.as_count()"
      denominator: "sum:http.requests{env:production}.as_count()"
    thresholds:
      - target: 99.9
        timeframe: 30d
        warning: 99.5
    tags:
      - "team:devops"
      - "service:platform"

  - name: "AIVO P95 Response Time"
    type: metric
    description: "95% of requests complete in <200ms"
    query:
      numerator: "sum:http.requests{env:production,response_time:<200}.as_count()"
      denominator: "sum:http.requests{env:production}.as_count()"
    thresholds:
      - target: 95.0
        timeframe: 7d
        warning: 90.0
    tags:
      - "team:devops"
      - "service:platform"

  - name: "AIVO Error Rate"
    type: metric
    description: "Error rate <0.5%"
    query:
      numerator: "sum:http.requests{env:production,status:ok}.as_count()"
      denominator: "sum:http.requests{env:production}.as_count()"
    thresholds:
      - target: 99.5  # (100% - 0.5% error rate)
        timeframe: 7d
        warning: 99.0
    tags:
      - "team:devops"
      - "service:platform"
```

### Application Metrics Instrumentation

```typescript
// Export SLI metrics
import { Counter, Histogram } from 'prom-client';

// Request counter
const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Response time histogram
const responseTimeHistogram = new Histogram({
  name: 'http_response_time_ms',
  help: 'HTTP response time in milliseconds',
  labelNames: ['method', 'route'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

// Middleware to track SLIs
export function sliMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Track request
    requestCounter.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode,
    });
    
    // Track latency
    responseTimeHistogram.observe(
      { method: req.method, route: req.route?.path || 'unknown' },
      duration
    );
  });
  
  next();
}
```

---

## SLO Improvement Process

### When SLO is Consistently Missed

1. **Incident Review**
   - Analyze root causes of SLO violations
   - Document in incident reports

2. **Determine Action**
   - **Option A:** Improve system to meet SLO
   - **Option B:** Adjust SLO to realistic target (requires approval)

3. **Implementation**
   - Create improvement tasks
   - Track progress weekly
   - Validate improvements with monitoring

4. **Validation**
   - Run load tests to verify
   - Monitor production for 2 weeks
   - Document improvements

### When SLO is Consistently Exceeded

1. **Evaluate if SLO is Too Lax**
   - If consistently exceeding by >10%, consider tightening
   - Example: If availability is 99.99%, consider raising SLO to 99.95%

2. **Maintain Current SLO**
   - Provides error budget buffer
   - Allows for experimentation and feature velocity

---

## SLO Review Questions

**Monthly Review:**
- Are we meeting all SLOs?
- How much error budget remains?
- What caused the largest SLO violations?
- Are SLOs still appropriate for user needs?
- Do we need new SLOs for new features?

**Quarterly Review:**
- Should we tighten or loosen any SLOs?
- Are we investing appropriately in reliability?
- How does reliability affect feature velocity?
- What infrastructure improvements are needed?

---

## References

- [Datadog SLO Dashboard](https://datadog.com/aivo/slo-dashboard)
- [Google SRE Book - SLIs, SLOs, SLAs](https://sre.google/sre-book/service-level-objectives/)
- [Incident Reports](./incident-reports/)
- [Runbooks](./runbooks/)

---

**Approval:**
- **DevOps Lead:** [Signature]
- **Engineering Manager:** [Signature]
- **CTO:** [Signature]

**Next Review Date:** February 28, 2026
