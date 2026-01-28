# Sprint 5: Production Load Testing Guide

## Overview

Comprehensive load testing infrastructure for validating Aivo platform performance under 500+ concurrent users. This testing is critical for Sprint 5 production readiness.

**Goal:** Ensure system can handle production-scale traffic with P95 response times <200ms and error rates <0.5%.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Test Profiles](#test-profiles)
- [Prerequisites](#prerequisites)
- [Running Tests](#running-tests)
- [Interpreting Results](#interpreting-results)
- [Performance Targets](#performance-targets)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Windows (PowerShell)

```powershell
# 1. Start all services
docker-compose up -d

# 2. Run smoke test (2 minutes, 5 users)
.\tests\performance\run-load-tests.ps1 -Profile smoke

# 3. Run stress test (40 minutes, 500-700 users) - CRITICAL
.\tests\performance\run-load-tests.ps1 -Profile stress
```

### Linux/Mac (Bash)

```bash
# 1. Start all services
docker-compose up -d

# 2. Load configuration
source tests/performance/load-test.config.sh

# 3. Run smoke test
k6 run tests/performance/sprint5-production-load-test.k6.js

# 4. Run stress test (filter to stress scenario)
K6_SCENARIOS=stress_test k6 run tests/performance/sprint5-production-load-test.k6.js
```

---

## Test Profiles

### 1. 🔥 Smoke Test (Quick Validation)
- **Duration:** 2 minutes
- **Virtual Users:** 5 concurrent
- **Purpose:** Quick validation that all endpoints work
- **Use Case:** After code changes, before deeper testing

**Run:**
```powershell
.\tests\performance\run-load-tests.ps1 -Profile smoke
```

---

### 2. 📈 Load Test (Normal Traffic)
- **Duration:** 30 minutes
- **Virtual Users:** 100 → 200 ramping
- **Purpose:** Simulate normal production traffic patterns
- **Use Case:** Baseline performance measurement

**Run:**
```powershell
.\tests\performance\run-load-tests.ps1 -Profile load
```

**Traffic Pattern:**
```
100 VUs ┤     ╭──────────────
        │    ╱
 50 VUs ┤   ╱
        │  ╱
  0 VUs ┼─╯
        └─────────────────────
        0m  3m  13m  16m  26m
```

---

### 3. 💪 Stress Test (500+ Users) ⭐ **CRITICAL**
- **Duration:** 40 minutes
- **Virtual Users:** 0 → 500 → 700
- **Purpose:** **Sprint 5 requirement - validate 500+ concurrent users**
- **Use Case:** Production readiness validation

**Run:**
```powershell
.\tests\performance\run-load-tests.ps1 -Profile stress
```

**Traffic Pattern:**
```
700 VUs ┤                 ╭─────╮
        │                ╱       ╲
500 VUs ┤          ╭────────────╮ ╲
        │         ╱              ╲  ╲
300 VUs ┤     ╭──╯                ╲  ╲
        │    ╱                     ╲  ╲
  0 VUs ┼───╯                       ╰──╯
        └──────────────────────────────
        0m 5m 10m 15m 30m 35m 40m
```

**Success Criteria:**
- ✅ P95 response time <200ms at 500 VUs
- ✅ Error rate <0.5% throughout test
- ✅ No service crashes or timeouts
- ✅ Memory/CPU remain stable

---

### 4. ⚡ Spike Test (Traffic Surge)
- **Duration:** 5 minutes
- **Virtual Users:** 0 → 600 (30 seconds) → hold → drop
- **Purpose:** Test sudden traffic surges (e.g., class starts, viral content)
- **Use Case:** Resilience validation

**Run:**
```powershell
.\tests\performance\run-load-tests.ps1 -Profile spike
```

---

### 5. ⏱️ Soak Test (Endurance)
- **Duration:** 30 minutes
- **Virtual Users:** 200 constant
- **Purpose:** Detect memory leaks, connection pool exhaustion
- **Use Case:** Stability over time

**Run:**
```powershell
.\tests\performance\run-load-tests.ps1 -Profile soak
```

---

### 6. 🔐 Trust Score Focused (Sprint 5 Feature)
- **Duration:** 5 minutes
- **Rate:** 50 requests/second
- **Purpose:** Test new trust score endpoints (5 service calls each)
- **Use Case:** Validate Sprint 5 Task 1 implementation

**Run:**
```powershell
.\tests\performance\run-load-tests.ps1 -Profile trust-score
```

**Expected:**
- Trust score calculation: <900ms (P95)
- Success rate: >98%
- Service fallbacks working correctly

---

### 7. 🚀 Full Suite (Complete Validation)
- **Duration:** 110+ minutes
- **Purpose:** Run ALL scenarios sequentially
- **Use Case:** Final production readiness gate

**Run:**
```powershell
.\tests\performance\run-load-tests.ps1 -Profile full
```

⚠️ **Warning:** This runs all tests sequentially. Only use before production deployment.

---

## Prerequisites

### Required

1. **k6 Installation**
   ```powershell
   # Windows (Chocolatey)
   choco install k6
   
   # Or download from https://k6.io/docs/get-started/installation/
   ```

2. **All Services Running**
   ```powershell
   docker-compose up -d
   ```

3. **Test Data Seeded**
   ```powershell
   # Seed 1000 test users
   pnpm run seed:load-test-users
   ```

### Optional (Recommended)

4. **Monitoring Tools**
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3030
   - Jaeger (tracing): http://localhost:16686

5. **Database Connection**
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

---

## Running Tests

### Method 1: PowerShell Script (Recommended)

```powershell
# Quick smoke test
.\tests\performance\run-load-tests.ps1 -Profile smoke

# Production stress test
.\tests\performance\run-load-tests.ps1 -Profile stress

# Custom output directory
.\tests\performance\run-load-tests.ps1 -Profile load -OutputDir "C:\load-test-results"
```

**Features:**
- ✅ Automatic service health check
- ✅ Environment configuration
- ✅ Results summary
- ✅ Error handling

---

### Method 2: Direct k6 Execution

```powershell
# Load configuration
. .\tests\performance\load-test.config.ps1

# Run test
k6 run `
  --out json=results.json `
  tests\performance\sprint5-production-load-test.k6.js
```

---

### Method 3: With Cloud Reporting (k6 Cloud)

```powershell
# Requires k6 cloud account
k6 login cloud --token YOUR_TOKEN

k6 run `
  --out cloud `
  tests\performance\sprint5-production-load-test.k6.js
```

**Benefits:**
- 📊 Web dashboard
- 📈 Historical comparison
- 🔔 Alerts on threshold violations
- 📄 PDF reports

---

## Interpreting Results

### Console Output

k6 outputs real-time metrics during test execution:

```
scenarios: (100.00%) 1 scenario, 500 max VUs, 40m0s max duration

✓ login status 200
✓ has access token
✓ session created
✓ lesson fetched
✓ progress updated

checks.........................: 99.82% ✓ 149745  ✗ 265
data_received..................: 450 MB 187 kB/s
data_sent......................: 68 MB  28 kB/s
http_req_duration..............: avg=95ms  min=12ms med=78ms max=890ms p(95)=187ms p(99)=345ms
http_req_failed................: 0.18%  ✓ 265     ✗ 149480
http_reqs......................: 149745 62 rps
iterations.....................: 24957  10.4/s
vus............................: 500    min=0     max=500
```

### Key Metrics Explained

| Metric | Target | Meaning |
|--------|--------|---------|
| `http_req_duration p(95)` | **<200ms** | 95% of requests complete in under 200ms |
| `http_req_duration p(99)` | <500ms | 99% of requests complete in under 500ms |
| `http_req_failed` | **<0.5%** | Error rate under 0.5% |
| `checks` | >99% | Assertions passed |
| `vus` | 500+ | Virtual users (concurrent) |
| `iterations/s` | - | Throughput (requests completed per second) |

### Custom Metrics

**Trust Score Performance:**
```
trust_score_calculation_duration: avg=456ms p(95)=782ms p(99)=890ms
trust_score_errors..............: 0.12%
```
- Should be <900ms P95 (5 service calls)
- Error rate <2% (with fallbacks)

**Authentication:**
```
auth_login_duration.............: avg=124ms p(95)=245ms
auth_token_refresh_duration.....: avg=45ms  p(95)=89ms
```

**Content Delivery:**
```
content_fetch_duration..........: avg=67ms  p(95)=145ms
content_cache_hit_rate..........: 78.5%
```

---

## Performance Targets

### Sprint 5 Requirements

| Category | Metric | Target | Critical? |
|----------|--------|--------|-----------|
| **Response Time** | P50 | <100ms | ✅ Yes |
| | P95 | <200ms | ✅ **Yes** |
| | P99 | <500ms | ⚠️ Nice to have |
| **Reliability** | Error Rate | <0.5% | ✅ **Yes** |
| | Availability | >99.9% | ✅ Yes |
| **Scalability** | Concurrent Users | 500+ | ✅ **Yes** |
| | Throughput | 1000+ RPS | ⚠️ Nice to have |
| **Trust Score** | P95 Duration | <900ms | ✅ Yes (5 calls) |
| | Error Rate | <2% | ✅ Yes (fallbacks) |

### Pass/Fail Criteria

**Test PASSES if:**
- ✅ P95 response time <200ms at 500 VUs
- ✅ Error rate <0.5% throughout stress test
- ✅ No service crashes or OOM errors
- ✅ Trust score endpoints <900ms P95

**Test FAILS if:**
- ❌ P95 >200ms at 500 VUs
- ❌ Error rate >0.5%
- ❌ Any service crashes
- ❌ Trust score >900ms P95

---

## Analyzing Bottlenecks

If tests fail performance targets, investigate:

### 1. High Response Times (P95 >200ms)

**Check:**
- Database query performance (add indexes)
- N+1 query problems (use JOINs or batching)
- Missing caching (Redis)
- Slow external API calls (add timeouts)

**Tools:**
```powershell
# Check database slow queries
psql -U aivo_user -d aivo_db -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check Redis hit rate
redis-cli INFO stats | findstr keyspace_hits
```

---

### 2. High Error Rates (>0.5%)

**Check:**
- Connection pool exhaustion
- Database deadlocks
- Timeout configurations
- Rate limiting too aggressive

**Tools:**
```powershell
# Check service logs
docker-compose logs --tail=100 auth-svc
docker-compose logs --tail=100 session-svc

# Check error patterns
grep "ERROR" logs/*.log | sort | uniq -c
```

---

### 3. Memory Leaks (Soak Test)

**Check:**
- Memory usage over time (should be flat)
- Connection leaks (connections not closed)
- Event listener leaks
- Cache not expiring

**Tools:**
```powershell
# Monitor memory usage
docker stats --no-stream

# Node.js heap snapshot
node --inspect services/auth-svc/dist/index.js
```

---

### 4. Trust Score Slow (>900ms)

**Optimization Strategies:**
1. **Parallelize service calls** (currently sequential)
2. **Add caching** (Redis, 5-minute TTL)
3. **Reduce timeout** from 5s to 3s
4. **Pre-calculate** for active users

---

## Troubleshooting

### Services Not Responding

```powershell
# Check service health
curl http://localhost:4001/health
curl http://localhost:3000/health
curl http://localhost:3021/health

# Restart services
docker-compose restart

# Check logs
docker-compose logs -f auth-svc
```

### k6 Not Found

```powershell
# Install k6
choco install k6

# Or use Docker
docker run --rm -i loadimpact/k6 run - <tests/performance/sprint5-production-load-test.k6.js
```

### Out of Memory During Test

```powershell
# Increase Docker memory
# Docker Desktop → Settings → Resources → Memory: 8GB+

# Or reduce concurrent VUs
# Edit script: vus: 250 instead of 500
```

### Test Results Not Saving

```powershell
# Create results directory
mkdir tests\performance\results

# Check permissions
icacls tests\performance\results

# Try different output format
k6 run --out csv=results.csv tests/performance/sprint5-production-load-test.k6.js
```

---

## Next Steps After Testing

### If Tests PASS ✅

1. ✅ Mark Sprint 5 Task 3 complete
2. 📊 Document baseline performance metrics
3. 🚀 Proceed to production deployment planning
4. 📈 Set up continuous performance monitoring

### If Tests FAIL ❌

1. 📋 Proceed to **Sprint 5 Task 4: Performance Optimization**
2. 🔍 Analyze bottlenecks (see section above)
3. 🛠️ Implement optimizations:
   - Database indexes
   - Redis caching
   - Query optimization
   - Service call parallelization
4. 🔁 Re-run load tests to validate improvements

---

## Files Reference

```
tests/performance/
├── sprint5-production-load-test.k6.js  # Main load test script
├── load-test.config.ps1                # PowerShell configuration
├── load-test.config.sh                 # Bash configuration
├── run-load-tests.ps1                  # PowerShell test runner
├── LOAD_TESTING_GUIDE.md               # This file
├── results/                            # Test results directory
│   └── sprint5-stress-20260128-143022.json
└── load-test.k6.js                     # Legacy test (reference)
```

---

## Additional Resources

- **k6 Documentation:** https://k6.io/docs/
- **k6 Cloud:** https://k6.io/cloud/
- **Performance Best Practices:** https://k6.io/docs/misc/fine-tuning-os/
- **Grafana k6 Dashboard:** https://grafana.com/grafana/dashboards/2587

---

## Support

**Questions?** Contact:
- Platform Team: platform@aivo.com
- DevOps: devops@aivo.com
- Sprint 5 Lead: [Your Name]

**Issues?** Create ticket:
- JIRA: https://aivo.atlassian.net/projects/LOAD
- GitHub Issues: https://github.com/aivo/platform/issues
