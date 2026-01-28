# Load Test Execution Plan

**Date:** January 28, 2026  
**Sprint:** 6, Task 1  
**Duration:** 2-3 hours  
**Objective:** Validate performance optimizations from Sprint 5

---

## Test Environment Setup

### Prerequisites
- ✅ k6 installed (from Sprint 5)
- ✅ Load test scripts ready ([tests/performance/sprint5-production-load-test.k6.js](tests/performance/sprint5-production-load-test.k6.js))
- ✅ Test environment URL: `http://localhost:3000` (or staging)
- ✅ Test data seeded in database
- ✅ Redis cache running
- ✅ Database indexes applied
- ✅ Optimized Prisma client deployed

### Services to Test
1. **auth-svc** (primary focus)
   - Login endpoint
   - Session management
   - Trust score calculation
   - MFA flows

2. **profile-svc**
   - User profile retrieval
   - Profile updates

3. **session-svc**
   - Session creation/validation
   - Activity tracking

4. **analytics-svc**
   - Analytics data retrieval

---

## Test Execution Sequence

### Phase 1: Smoke Test (5 minutes)
**Purpose:** Quick validation that system is functional

```powershell
# Execute smoke test
.\tests\performance\run-load-tests.ps1 -Profile smoke -BaseUrl "http://localhost:3000"
```

**Expected Results:**
- ✅ All endpoints return 200 OK
- ✅ No errors
- ✅ Response times reasonable
- ✅ Services all healthy

**Success Criteria:**
- Error rate: 0%
- All checks passing
- No service timeouts

---

### Phase 2: Load Test (15 minutes)
**Purpose:** Validate average production load (100 concurrent users)

```powershell
# Execute load test
.\tests\performance\run-load-tests.ps1 -Profile load -BaseUrl "http://localhost:3000" -GenerateReport
```

**Test Profile:**
- Duration: 9 minutes
- Ramp up: 0 → 100 VUs over 2 minutes
- Sustained: 100 VUs for 5 minutes
- Ramp down: 100 → 0 VUs over 2 minutes

**Metrics to Collect:**
1. **Response Times**
   - P50 (median)
   - P95 (95th percentile)
   - P99 (99th percentile)
   - Max response time

2. **Throughput**
   - Requests per second
   - Data transferred (MB/sec)

3. **Error Rates**
   - HTTP errors (4xx, 5xx)
   - Failed requests
   - Timeout errors

4. **Resource Utilization**
   - CPU usage (%)
   - Memory usage (%)
   - Database connections used
   - Redis connections used
   - Cache hit rate

**Success Criteria:**
- ✅ P50 <100ms
- ✅ P95 <200ms
- ✅ P99 <500ms
- ✅ Error rate <0.5%
- ✅ Throughput >100 req/sec
- ✅ No connection pool exhaustion
- ✅ Cache hit rate >50%

**Baseline Metrics to Document:**
```json
{
  "test": "load",
  "vus": 100,
  "duration": "9m",
  "response_times": {
    "p50": "<value>ms",
    "p95": "<value>ms",
    "p99": "<value>ms",
    "max": "<value>ms"
  },
  "error_rate": "<value>%",
  "throughput": "<value> req/sec",
  "cache_hit_rate": "<value>%",
  "database": {
    "connections_used": "<value>",
    "slow_queries": "<value>",
    "deadlocks": 0
  }
}
```

---

### Phase 3: Stress Test (50 minutes)
**Purpose:** **CRITICAL** - Validate sustained high load (700 VUs)

```powershell
# Execute stress test
.\tests\performance\run-load-tests.ps1 -Profile stress -BaseUrl "http://localhost:3000" -GenerateReport
```

**Test Profile:**
- Duration: 40 minutes
- Ramp up: 0 → 200 VUs (2 min) → 500 VUs (5 min) → 700 VUs (10 min)
- Sustained: 700 VUs for 20 minutes
- Ramp down: 700 → 0 VUs over 3 minutes

**Critical Validation Points:**

**At 200 VUs (minute 7):**
- P95 should still be <200ms
- Error rate should be <0.5%
- No warning logs

**At 500 VUs (minute 12):**
- P95 should be <250ms (slight degradation acceptable)
- Error rate should be <1%
- Database connections <40 (out of 50)
- Redis memory <80% capacity

**At 700 VUs (minutes 17-37):**
- P95 should be <300ms (degradation expected but controlled)
- Error rate should be <1%
- System should remain stable for full 20 minutes
- No crashes or restarts
- No OOM errors
- Database connections <45 (out of 50)

**Success Criteria:**
- ✅ System handles 700 VUs without crashing
- ✅ P95 <300ms at 700 VUs (target: <200ms)
- ✅ Error rate <1% (target: <0.5%)
- ✅ No service restarts
- ✅ No connection pool exhaustion
- ✅ Sustained for 20+ minutes
- ✅ Graceful recovery after ramp down

**Resource Monitoring During Stress Test:**

Monitor continuously and log every 5 minutes:
1. CPU usage per service
2. Memory usage per service
3. Database connection pool usage
4. Redis memory usage
5. Cache hit rate
6. Error logs
7. Slow query count

**Failure Indicators (require investigation):**
- 🔴 Error rate >2%
- 🔴 P95 >500ms
- 🔴 Service crashes/restarts
- 🔴 Database connection errors
- 🔴 OOM errors
- 🔴 Response timeout errors

---

### Phase 4: Spike Test (15 minutes)
**Purpose:** Validate sudden traffic spike handling (0 → 1000 VUs)

```powershell
# Execute spike test
.\tests\performance\run-load-tests.ps1 -Profile spike -BaseUrl "http://localhost:3000" -GenerateReport
```

**Test Profile:**
- Baseline: 100 VUs for 1 minute
- Spike: 100 → 1000 VUs in 10 seconds
- Sustained spike: 1000 VUs for 3 minutes
- Recovery: 1000 → 100 VUs in 10 seconds
- Post-spike: 100 VUs for 3 minutes

**Key Questions to Answer:**
1. Does the system handle the sudden spike without crashing?
2. Do error rates spike temporarily but recover?
3. Do response times spike temporarily but recover?
4. Does the system fully recover after the spike?
5. Are there any lingering issues after spike?

**Success Criteria:**
- ✅ System survives the spike (no crashes)
- ✅ Error rate <5% during spike (temporary spike acceptable)
- ✅ Error rate returns to <0.5% post-spike
- ✅ P95 returns to <200ms post-spike
- ✅ All services recover within 2 minutes
- ✅ No permanent degradation

**Acceptable Temporary Degradation:**
- Error rate spike to 5% during first minute of spike
- P95 spike to 1000ms during first minute
- Some connection timeouts during spike

**Unacceptable Issues:**
- 🔴 Service crashes
- 🔴 Database connection pool exhaustion causing permanent errors
- 🔴 System doesn't recover after spike ends
- 🔴 Data corruption

---

### Phase 5: Trust Score Focused Test (10 minutes)
**Purpose:** Validate trust score endpoint specifically (<900ms P95 target)

```powershell
# Execute trust-score test
.\tests\performance\run-load-tests.ps1 -Profile trust-score -BaseUrl "http://localhost:3000" -GenerateReport
```

**Test Profile:**
- Duration: 7 minutes
- Ramp up: 0 → 50 VUs over 1 minute
- Sustained: 50 VUs for 5 minutes
- Ramp down: 50 → 0 VUs over 1 minute

**Focus Metrics:**
1. Trust score calculation time (P50, P95, P99)
2. Service call parallelization (5 parallel calls)
3. Service call failure handling
4. Cache effectiveness for trust scores

**Success Criteria:**
- ✅ P95 trust score calculation <900ms
- ✅ P99 trust score calculation <1500ms
- ✅ Error rate <0.1% (trust score is critical)
- ✅ All 5 service calls complete in parallel
- ✅ Graceful fallbacks work on service failures
- ✅ Cache hit rate >60% (after warmup)

**Service Call Breakdown:**
| Service Call | Expected Time | Timeout |
|-------------|---------------|---------|
| reviews (profile-svc) | 200-400ms | 5000ms |
| verification (auth DB + profile-svc) | 150-300ms | 5000ms |
| tenure (auth DB) | 50-100ms | 5000ms |
| activity (session-svc + analytics-svc) | 200-400ms | 5000ms |
| compliance (auth DB) | 50-100ms | 5000ms |
| **Total (parallel)** | **200-400ms** | **5000ms** |

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Start all services (auth-svc, profile-svc, session-svc, analytics-svc)
- [ ] Verify Redis is running
- [ ] Verify database is running
- [ ] Apply database indexes migration
- [ ] Deploy optimized Prisma client (50 connection pool)
- [ ] Seed test data (users, sessions, etc.)
- [ ] Clear Redis cache (for fresh test)
- [ ] Verify k6 is installed: `k6 version`

### Test Execution
- [ ] Phase 1: Smoke test (5 min)
- [ ] Phase 2: Load test (15 min)
- [ ] Phase 3: Stress test (50 min) **← CRITICAL**
- [ ] Phase 4: Spike test (15 min)
- [ ] Phase 5: Trust score test (10 min)

### Post-Test Analysis
- [ ] Review k6 reports (JSON and HTML)
- [ ] Document baseline metrics
- [ ] Identify any bottlenecks
- [ ] Check error logs for issues
- [ ] Verify database performance
- [ ] Check cache hit rates
- [ ] Create performance validation report

### Expected Total Time
- Setup: 15 minutes
- Smoke test: 5 minutes
- Load test: 15 minutes
- Stress test: 50 minutes
- Spike test: 15 minutes
- Trust score test: 10 minutes
- Analysis: 30 minutes
- **Total: ~2.5 hours**

---

## Results Documentation Template

### Test Results Summary

```markdown
# Load Test Validation Results
Date: January 28, 2026
Environment: Staging
Test Suite: Sprint 6, Task 1

## Executive Summary
- ✅/❌ All tests passed
- ✅/❌ Performance targets met
- ✅/❌ System ready for production

## Smoke Test Results
- Status: PASS/FAIL
- Duration: <actual>
- Error Rate: <actual>%
- Issues: <none or list>

## Load Test Results (100 VUs)
- Status: PASS/FAIL
- P50: <actual>ms (target: <100ms)
- P95: <actual>ms (target: <200ms)
- P99: <actual>ms (target: <500ms)
- Error Rate: <actual>% (target: <0.5%)
- Throughput: <actual> req/sec
- Cache Hit Rate: <actual>%

## Stress Test Results (700 VUs)
- Status: PASS/FAIL
- P50: <actual>ms
- P95: <actual>ms (target: <300ms)
- P99: <actual>ms
- Error Rate: <actual>% (target: <1%)
- Sustained Duration: <actual> minutes
- Issues: <none or list>

## Spike Test Results (1000 VUs peak)
- Status: PASS/FAIL
- System Survived: YES/NO
- Recovery Time: <actual> seconds
- Post-spike P95: <actual>ms
- Issues: <none or list>

## Trust Score Test Results (50 VUs)
- Status: PASS/FAIL
- P95: <actual>ms (target: <900ms)
- P99: <actual>ms (target: <1500ms)
- Error Rate: <actual>%
- Parallelization: WORKING/ISSUES
- Cache Hit Rate: <actual>%

## Bottlenecks Identified
1. <bottleneck 1 or "None">
2. <bottleneck 2>

## Recommendations
1. <recommendation 1 or "None - ready for production">
2. <recommendation 2>

## Sign-off
Performance validation: APPROVED / NEEDS WORK
Ready for production: YES / NO

---
Validated by: <name>
Date: <date>
```

---

## Next Steps After Validation

### If All Tests Pass ✅
1. Document baseline metrics
2. Mark Task 1 as complete
3. Proceed to Task 2 (Deployment Automation)
4. Use metrics as production baseline

### If Tests Fail ❌
1. Identify bottlenecks from test results
2. Implement additional optimizations:
   - Add more database indexes
   - Increase cache TTLs
   - Optimize slow queries
   - Increase connection pool size
3. Re-run failed tests
4. Document issues and resolutions

---

## Monitoring During Tests

### Real-time Monitoring Commands

**Check service status:**
```powershell
# PowerShell
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
```

**Monitor database connections:**
```sql
-- PostgreSQL
SELECT count(*) as connection_count, state
FROM pg_stat_activity
WHERE datname = 'aivo_db'
GROUP BY state;
```

**Monitor Redis:**
```bash
redis-cli INFO stats
redis-cli INFO memory
```

**Check logs:**
```powershell
# Tail logs
Get-Content -Path "logs/auth-svc.log" -Wait -Tail 50
```

---

**Status:** Ready to execute  
**Estimated Duration:** 2.5 hours  
**Next Task:** Deployment Automation (Task 2)
