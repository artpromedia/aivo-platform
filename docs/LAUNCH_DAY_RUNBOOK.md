# AIVO Launch Day Runbook

**Target Launch Date:** February 3, 2026, 06:00 AM EST  
**Launch Coordinator:** DevOps Lead  
**Duration:** ~4 hours (06:00 AM - 10:00 AM)  
**Status:** Ready for Execution  

---

## Table of Contents

1. [Pre-Launch Checklist](#pre-launch-checklist)
2. [Launch Timeline](#launch-timeline)
3. [Deployment Procedure](#deployment-procedure)
4. [Post-Launch Monitoring](#post-launch-monitoring)
5. [Rollback Procedures](#rollback-procedures)
6. [Communication Plan](#communication-plan)
7. [Success Criteria](#success-criteria)
8. [Emergency Contacts](#emergency-contacts)

---

## Pre-Launch Checklist

### T-48 Hours: Final Preparations

**DevOps Team:**
- [ ] Review and confirm launch date/time with stakeholders
- [ ] Verify staging environment matches production-ready state
- [ ] Run final staging validation tests
- [ ] Confirm all team members available on launch day
- [ ] Set up war room (Zoom link + Slack channel)
- [ ] Prepare rollback plan and communication templates
- [ ] Verify backup procedures tested and validated
- [ ] Review monitoring dashboards and alerts
- [ ] Confirm PagerDuty on-call schedule

**Infrastructure:**
- [ ] Verify SSL certificates valid (>30 days remaining)
- [ ] Confirm database backup schedule configured
- [ ] Verify Redis persistence enabled
- [ ] Check resource limits and scaling policies
- [ ] Confirm CDN cache purge procedures ready
- [ ] Verify DNS records configured and tested
- [ ] Check firewall rules and security groups
- [ ] Confirm load balancer health checks configured

**Security:**
- [ ] Final security audit completed
- [ ] Secrets rotated and validated
- [ ] API rate limits configured
- [ ] CORS policies validated
- [ ] DDoS protection enabled (if applicable)
- [ ] Security monitoring alerts configured

**Data:**
- [ ] Production database seeded with initial data
- [ ] User accounts created for initial users
- [ ] Test accounts created for validation
- [ ] Database migrations tested in staging
- [ ] Cache warming strategy prepared

**External Services:**
- [ ] Stripe production keys configured and tested
- [ ] SendGrid production sender verified
- [ ] Google Analytics property created
- [ ] Third-party API limits confirmed
- [ ] Status page configured (status.aivo.app)

**Team:**
- [ ] All team members briefed on launch plan
- [ ] Roles and responsibilities assigned
- [ ] Communication channels established
- [ ] Rollback decision tree reviewed
- [ ] Escalation procedures confirmed

---

### T-24 Hours: Day Before Launch

**Code Freeze:**
- [ ] ✅ CODE FREEZE in effect (no new deployments)
- [ ] Final commit tagged: `v2.0.0-production-launch`
- [ ] Release notes prepared and reviewed
- [ ] Changelog updated

**Final Testing:**
- [ ] Run full integration test suite (147 tests)
- [ ] Run E2E test suite (72 tests)
- [ ] Performance load test (700 concurrent users)
- [ ] Smoke test all critical user flows
- [ ] Verify all health check endpoints

**Communication:**
- [ ] Notify stakeholders of code freeze
- [ ] Send launch reminder to team
- [ ] Prepare customer communication (if applicable)
- [ ] Update status page with scheduled maintenance window

**Environment Prep:**
- [ ] Production blue slot prepared
- [ ] Production green slot prepared
- [ ] Database connection strings configured
- [ ] Environment variables validated
- [ ] Secrets loaded and verified

---

### T-2 Hours: Launch Day Morning

**Team Assembly (04:00 AM):**
- [ ] War room opened (Zoom + Slack #launch-war-room)
- [ ] Roll call: DevOps (2), Backend (2), Frontend (1), QA (1), Product (1)
- [ ] Review launch timeline
- [ ] Confirm go/no-go decision

**Pre-Flight Checks (04:00 - 05:45 AM):**
```powershell
# Run pre-flight check script
.\scripts\pre-launch-checks.ps1 -Environment production

# Checklist:
# - [ ] All services healthy in staging
# - [ ] Database reachable and migrations ready
# - [ ] Redis reachable and configured
# - [ ] SSL certificates valid
# - [ ] DNS resolving correctly
# - [ ] Load balancer configured
# - [ ] Monitoring dashboards accessible
# - [ ] PagerDuty on-call assigned
# - [ ] Backup completed in last 24 hours
```

**Go/No-Go Decision (05:45 AM):**
- [ ] All pre-flight checks passed?
- [ ] All team members ready?
- [ ] No critical blockers identified?
- [ ] **GO** decision confirmed by: DevOps Lead, Engineering Manager, CTO

---

## Launch Timeline

### Phase 1: Pre-Launch (06:00 - 06:15 AM)

**Duration:** 15 minutes

| Time | Task | Owner | Duration | Status |
|------|------|-------|----------|--------|
| 06:00 | Announce launch start | Launch Coordinator | 1 min | - |
| 06:01 | Enable maintenance mode (status page) | DevOps | 2 min | - |
| 06:03 | Final database backup | DevOps | 5 min | - |
| 06:08 | Verify backup completed | DevOps | 2 min | - |
| 06:10 | Review deployment checklist | Team | 5 min | - |

**Announcement:**
```markdown
🚀 AIVO PRODUCTION LAUNCH - STARTING NOW

Time: 06:00 AM EST
Status: Pre-Launch Phase
Expected Duration: 4 hours
War Room: #launch-war-room

Team standing by.
```

---

### Phase 2: Database Migrations (06:15 - 06:25 AM)

**Duration:** 10 minutes

| Time | Task | Command | Duration | Status |
|------|------|---------|----------|--------|
| 06:15 | Apply database migrations | `pnpm prisma migrate deploy` | 8 min | - |
| 06:23 | Verify migrations | `pnpm prisma migrate status` | 2 min | - |

**Commands:**
```powershell
# Apply migrations for each service
cd services/auth-svc
pnpm prisma migrate deploy
# Expected: 0 pending migrations (already applied in staging)

cd ../profile-svc
pnpm prisma migrate deploy

cd ../analytics-svc
pnpm prisma migrate deploy

cd ../content-svc
pnpm prisma migrate deploy

cd ../reports-svc
pnpm prisma migrate deploy

# Verify no errors
# Expected output: "Database is up to date"
```

**Validation:**
- [ ] All migrations applied successfully
- [ ] No errors in migration logs
- [ ] Database schema matches expected state

---

### Phase 3: Deployment to Blue Slot (06:25 - 06:55 AM)

**Duration:** 30 minutes

**Deploy Command:**
```powershell
.\scripts\deploy-production.ps1 `
  -Slot blue `
  -Environment production `
  -AutoRollback $true `
  -Services auth-svc,profile-svc,session-svc,analytics-svc,content-svc,reports-svc
```

**Deployment Phases:**

| Phase | Duration | Validation |
|-------|----------|------------|
| 1. Pre-deployment checks | 5 min | Git status, tools, env vars, disk space |
| 2. Build | 3-5 min | All services build successfully |
| 3. Tests | 5-10 min | 147 integration tests pass |
| 4. Database migrations | 2-5 min | Migrations already applied (skip) |
| 5. Deploy services | 2-3 min | Artifacts copied to blue slot |
| 6. Start services | 1-2 min | All services start successfully |
| 7. Health checks | 1-2 min | All health endpoints return 200 |
| 8. Initial validation | 5 min | Smoke tests on blue slot |

**Real-Time Monitoring:**
```powershell
# Monitor deployment logs
Get-Content logs/deployment-20260203.log -Wait -Tail 20

# In separate terminal: Monitor service health
while ($true) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Checking service health..."
    
    @('auth-svc', 'profile-svc', 'session-svc', 'analytics-svc', 'content-svc', 'reports-svc') | ForEach-Object {
        try {
            $health = Invoke-WebRequest -Uri "http://production-blue/$_/health" -TimeoutSec 5
            $status = ($health.Content | ConvertFrom-Json).status
            $color = if ($status -eq 'healthy') { 'Green' } else { 'Red' }
            Write-Host "  $_: $status" -ForegroundColor $color
        } catch {
            Write-Host "  $_: ERROR" -ForegroundColor Red
        }
    }
    
    Start-Sleep -Seconds 30
}
```

**Checkpoints:**
- [ ] All services deployed successfully
- [ ] All health checks passing
- [ ] No errors in deployment logs
- [ ] Blue slot ready for traffic

**Hold Point:** Wait for explicit "GO" decision before proceeding to traffic switch.

---

### Phase 4: Traffic Switch (06:55 - 07:05 AM)

**Duration:** 10 minutes

**Gradual Traffic Shift:**

| Traffic % | Duration | Actions |
|-----------|----------|---------|
| 0% (baseline) | - | Verify green slot (old) healthy, error rate <0.5% |
| 10% | 1 min | Monitor blue slot, check error rate, response times |
| 25% | 1 min | Continue monitoring, verify metrics stable |
| 50% | 2 min | Heavy monitoring phase, ready to rollback |
| 75% | 2 min | Final verification phase |
| 100% | 2 min | Blue slot receives all traffic |
| Validation | 2 min | Confirm full traffic on blue, green slot idle |

**Monitoring Dashboard:**
```
Open in browser:
- Datadog Production Dashboard: https://datadog.com/aivo/production-dashboard
- Real-time metrics: Error rate, P95 latency, active users
```

**Traffic Switch Command:**
```powershell
# Executed automatically by deployment script
# Manual override if needed:
.\scripts\switch-traffic.ps1 -From green -To blue -Percentage 10

# Wait 1 minute, verify health

.\scripts\switch-traffic.ps1 -From green -To blue -Percentage 25
# Continue...
```

**At Each Traffic Percentage:**
1. Check error rate (should be <0.5%)
2. Check P95 response time (should be <200ms)
3. Check active users (confirm traffic shifting)
4. Check service health (all green)
5. If any metric fails → **ROLLBACK**

**Validation Criteria (at 50% and 100%):**
- [ ] Error rate: <0.5%
- [ ] P95 response time: <200ms
- [ ] P99 response time: <500ms
- [ ] All services healthy
- [ ] No spike in errors in Datadog
- [ ] No customer complaints

---

### Phase 5: Post-Switch Validation (07:05 - 07:30 AM)

**Duration:** 25 minutes

**Validation Tests:**

1. **Smoke Tests (5 minutes):**
```powershell
# Run smoke test suite
pnpm test:smoke --env=production

# Critical user flows:
# - [ ] User registration
# - [ ] User login
# - [ ] Lesson browsing
# - [ ] Lesson completion
# - [ ] Assessment submission
# - [ ] Trust score calculation
# - [ ] Report generation
```

2. **Performance Check (5 minutes):**
```powershell
# Quick load test (100 concurrent users, 5 minutes)
.\tests\performance\run-load-tests.ps1 `
  -Environment production `
  -Profile smoke `
  -Duration 5m

# Verify:
# - [ ] P95 <200ms
# - [ ] Error rate <0.5%
# - [ ] No connection timeouts
```

3. **Integration Validation (10 minutes):**
- [ ] Stripe payment test transaction (test mode)
- [ ] SendGrid email delivery (welcome email)
- [ ] Google Analytics events tracking
- [ ] Database queries executing (check slow query log)
- [ ] Redis cache hit rate >70%
- [ ] Trust score calculation working

4. **Manual Testing (5 minutes):**
- [ ] Login as test student → Complete lesson
- [ ] Login as test parent → View child progress
- [ ] Login as test teacher → View class analytics
- [ ] Check trust score updates correctly
- [ ] Verify notifications sent

**Validation Checklist:**
- [ ] All smoke tests passing
- [ ] Performance metrics meeting targets
- [ ] Third-party integrations working
- [ ] No errors in application logs
- [ ] No errors in database logs
- [ ] Cache performing well
- [ ] Manual tests successful

---

### Phase 6: Monitoring & Stabilization (07:30 - 10:00 AM)

**Duration:** 2.5 hours

**Intensive Monitoring Phase:**

**Every 5 Minutes:**
- Check Datadog dashboard
- Review error rate (should stay <0.5%)
- Review P95 latency (should stay <200ms)
- Check active user count (should be increasing)
- Review application logs for errors

**Every 15 Minutes:**
- Check database connection pool (should be <80%)
- Check Redis memory usage (should be <80%)
- Check CPU usage (should be <70%)
- Check memory usage (should be <70%)
- Review slow query logs

**Every 30 Minutes:**
- Team check-in in war room
- Review any issues or concerns
- Update status page if needed
- Document any incidents

**Monitoring Script:**
```powershell
# Automated monitoring script
.\scripts\monitor-production.ps1 -Duration 150  # 2.5 hours

# Script checks every 5 minutes:
# - Error rate
# - P95 response time
# - Service health
# - Database metrics
# - Cache metrics
# - Resource utilization
#
# Alerts if any metric exceeds threshold
```

**Issues to Watch For:**
1. **Increasing Error Rate**
   - Action: Investigate logs immediately
   - Threshold for concern: >0.5%
   - Threshold for rollback: >1.0%

2. **Slow Response Times**
   - Action: Check database queries, cache hit rate
   - Threshold for concern: P95 >200ms
   - Threshold for rollback: P95 >300ms

3. **Resource Exhaustion**
   - Action: Check connection pool, memory usage
   - Threshold for concern: >80%
   - Threshold for rollback: >90%

4. **Service Crashes**
   - Action: Check logs, restart if necessary
   - Threshold for rollback: Multiple service crashes

---

### Phase 7: Launch Complete (10:00 AM)

**Duration:** 15 minutes

**Final Validation:**
- [ ] All services healthy for 2+ hours
- [ ] Error rate stable at <0.5%
- [ ] Response times meeting targets
- [ ] No customer complaints
- [ ] Monitoring dashboards green

**Announcement:**
```markdown
✅ AIVO PRODUCTION LAUNCH - COMPLETED SUCCESSFULLY

Launch Time: 06:00 AM EST
Completion Time: 10:00 AM EST
Duration: 4 hours
Status: ✅ SUCCESS

Metrics:
- Error Rate: 0.32% (Target: <0.5%) ✅
- P95 Latency: 178ms (Target: <200ms) ✅
- Active Users: 245 and growing ✅
- All Services: Healthy ✅

Thank you to the entire team for a smooth launch! 🚀

War room will remain open until 12:00 PM for continued monitoring.
```

**Team Actions:**
- [ ] Update status page: "All systems operational"
- [ ] Disable maintenance mode
- [ ] Send launch announcement to stakeholders
- [ ] Post launch success in company channels
- [ ] Thank the team publicly

**Post-Launch Tasks:**
- [ ] Document any issues encountered
- [ ] Create incident reports for any problems
- [ ] Update runbooks based on learnings
- [ ] Schedule post-launch retrospective (Week 1)
- [ ] Continue elevated monitoring for 48 hours

---

## Rollback Procedures

### When to Rollback

**Automatic Rollback Triggers:**
- Error rate >2% for >5 minutes
- P95 response time >500ms for >10 minutes
- Service health check failures (>2 services)
- Database connection pool exhausted (>90%)

**Manual Rollback Decision:**
- Error rate >1% sustained for >10 minutes
- Multiple customer complaints
- Data integrity concerns
- Security incident detected
- Engineering judgment

### Rollback Execution

**Command:**
```powershell
# Emergency rollback
.\scripts\rollback-deployment.ps1 `
  -FromSlot blue `
  -ToSlot green `
  -Environment production `
  -Reason "Launch day rollback - [specific reason]"

# Rollback completes in <60 seconds
```

**Rollback Timeline:**

| Step | Duration | Action |
|------|----------|--------|
| 1. Decision made | 0s | Engineering/Product approval |
| 2. Execute rollback | 3s | Immediate traffic switch to green |
| 3. Verify green health | 15s | Health checks on green slot |
| 4. Stop blue services | 12s | Shutdown blue slot services |
| 5. Notifications | 8s | Alert team and stakeholders |
| 6. Validate | 30s | Confirm metrics recovering |

**Post-Rollback:**
1. **Immediate (0-15 minutes):**
   - Verify error rate decreasing
   - Verify response times improving
   - Confirm all services healthy on green
   - Monitor for 15 minutes

2. **Short-term (15-60 minutes):**
   - Root cause analysis
   - Review logs and metrics
   - Identify issue
   - Plan remediation

3. **Communication:**
   ```markdown
   ⚠️ PRODUCTION LAUNCH - ROLLED BACK
   
   Time: [XX:XX AM EST]
   Reason: [Specific reason]
   Status: System returned to pre-launch state
   Impact: [Brief description]
   
   Next Steps:
   - Issue investigation in progress
   - Timeline for re-launch TBD
   - Updates will be provided every hour
   ```

4. **Follow-up:**
   - Schedule post-mortem within 24 hours
   - Document lessons learned
   - Update launch runbook
   - Plan re-launch date

---

## Communication Plan

### Internal Communication

**Slack Channels:**
- `#launch-war-room` - Real-time launch coordination
- `#production-alerts` - Automated alerts
- `#engineering-all` - Team-wide updates
- `#company-announcements` - Company-wide launch announcement

**Communication Cadence:**

| Phase | Frequency | Channel | Audience |
|-------|-----------|---------|----------|
| Pre-Launch | Every 30 min | #launch-war-room | Launch team |
| Deployment | Every 10 min | #launch-war-room | Launch team |
| Traffic Switch | Every 1 min | #launch-war-room | Launch team |
| Stabilization | Every 30 min | #launch-war-room | Launch team |
| Major updates | As needed | #engineering-all | All engineers |
| Launch complete | Once | #company-announcements | All company |

### External Communication

**Status Page (status.aivo.app):**

**Pre-Launch (T-2 hours):**
```markdown
📋 Scheduled Maintenance

Start: February 3, 2026, 06:00 AM EST
End: February 3, 2026, 10:00 AM EST
Impact: Brief periods of reduced availability

We are performing scheduled maintenance to launch new features 
and improvements. Most services will remain available throughout.
```

**During Launch:**
```markdown
⚙️ Maintenance in Progress

Started: February 3, 2026, 06:00 AM EST
Expected End: 10:00 AM EST

We are currently deploying updates. You may experience brief 
periods of reduced performance. Thank you for your patience.
```

**Launch Complete:**
```markdown
✅ All Systems Operational

Maintenance completed at 10:00 AM EST.
All systems are operating normally.

New features are now available! Check out our latest release notes.
```

**Customer Email (Post-Launch):**
```markdown
Subject: AIVO Platform Updates - Now Live!

Dear AIVO Users,

We're excited to announce that our latest platform updates are now live!

New Features:
- Enhanced trust score system with real-time updates
- Improved performance across all services
- New reporting capabilities for parents and teachers
- Enhanced mobile app experience

As part of this launch, you may have experienced brief periods of 
reduced performance this morning. Everything is now running smoothly.

Thank you for being part of the AIVO community!

- The AIVO Team
```

---

## Success Criteria

### Launch Success Definition

**Technical Success:**
- ✅ All services deployed and healthy
- ✅ Error rate <0.5%
- ✅ P95 response time <200ms
- ✅ Zero downtime during traffic switch
- ✅ No data loss or corruption
- ✅ No critical incidents
- ✅ Rollback not required

**Business Success:**
- ✅ All critical user flows operational
- ✅ No customer complaints
- ✅ Trust score system functioning
- ✅ Reports generating correctly
- ✅ Mobile apps working
- ✅ Third-party integrations functional

### Key Performance Indicators (24 hours)

| Metric | Target | Measurement |
|--------|--------|-------------|
| System Availability | >99.9% | No major outages |
| Error Rate | <0.5% | Datadog metrics |
| P95 Response Time | <200ms | Datadog metrics |
| Active Users | Growing | Analytics |
| User Registrations | >100 | Database count |
| Lessons Completed | >500 | Analytics |
| Trust Scores Calculated | >100 | Analytics |
| Customer Support Tickets | <10 | Support system |

---

## Emergency Contacts

### On-Call Team (Launch Day)

| Role | Name | Phone | Backup |
|------|------|-------|--------|
| Launch Coordinator | [Name] | [Phone] | [Backup] |
| DevOps Lead | [Name] | [Phone] | [Backup] |
| Backend Lead | [Name] | [Phone] | [Backup] |
| Frontend Lead | [Name] | [Phone] | [Backup] |
| QA Lead | [Name] | [Phone] | [Backup] |
| Engineering Manager | [Name] | [Phone] | [Backup] |
| CTO | [Name] | [Phone] | - |

### Escalation Path

```
Issue Identified
       ↓
Launch Coordinator
       ↓
DevOps Lead
       ↓
Engineering Manager
       ↓
CTO
```

**For Security Incidents:**
Contact Security Lead immediately: [Phone]

**For Infrastructure Issues:**
Contact Infrastructure Team: [Phone]

**For Customer Impact:**
Contact Customer Support Lead: [Phone]

---

## Contingency Plans

### Scenario 1: Deployment Fails

**Problem:** Build or tests fail during deployment

**Action:**
1. Review error logs
2. Attempt to fix issue if quick (<15 minutes)
3. If not quick fix: Abort launch, reschedule
4. Communicate new timeline

### Scenario 2: High Error Rate Post-Launch

**Problem:** Error rate >1% after traffic switch

**Action:**
1. Immediate rollback to green slot
2. Investigate root cause
3. Fix issue in blue slot
4. Re-test thoroughly
5. Decide: Re-launch today or reschedule

### Scenario 3: Performance Degradation

**Problem:** Response times exceed targets

**Action:**
1. Check database connection pool
2. Check cache hit rate
3. Check slow queries
4. Scale resources if needed
5. If not improving: Consider rollback

### Scenario 4: Database Issue

**Problem:** Database connectivity or performance problem

**Action:**
1. Check database status and logs
2. Check connection pool exhaustion
3. Check for long-running queries
4. Consider failover to replica (if configured)
5. If critical: Rollback and investigate

### Scenario 5: External Service Outage

**Problem:** Stripe, SendGrid, or other service down

**Action:**
1. Confirm outage on provider status page
2. Verify graceful degradation working
3. Monitor impact on users
4. If critical functionality impacted: Consider rollback
5. Communicate issue to users if needed

---

## Post-Launch Activities

### First 48 Hours

**Elevated Monitoring:**
- On-call engineer dedicated to production
- War room remains open
- Hourly check-ins first 24 hours
- Every 4 hours for next 24 hours

**Metric Tracking:**
- Error rate (every hour)
- Response times (every hour)
- Active users (every 4 hours)
- System health (continuous)

**Communication:**
- Daily update to stakeholders
- Document any issues
- Respond to customer feedback

### Week 1

**Activities:**
- [ ] Post-launch retrospective meeting (Day 3)
- [ ] Review all metrics and SLOs
- [ ] Document lessons learned
- [ ] Update runbooks based on experience
- [ ] Create improvement backlog
- [ ] Thank the team celebration

**Retrospective Questions:**
- What went well?
- What could be improved?
- What surprised us?
- What should we do differently next time?
- What processes should we formalize?

---

## Appendix

### Useful Commands

**Check Service Health:**
```powershell
# All services
$services = @('auth-svc', 'profile-svc', 'session-svc', 'analytics-svc', 'content-svc', 'reports-svc')
$services | ForEach-Object {
    $health = Invoke-WebRequest -Uri "https://aivo.app/$_/health" | ConvertFrom-Json
    Write-Host "$_: $($health.status)"
}
```

**Monitor Error Rate:**
```powershell
# In Datadog
sum:http.errors{env:production}.as_count() / sum:http.requests{env:production}.as_count() * 100
```

**Check Database Connections:**
```sql
SELECT count(*), state 
FROM pg_stat_activity 
WHERE datname = 'aivo_prod' 
GROUP BY state;
```

**Check Redis Stats:**
```bash
redis-cli -u $REDIS_URL INFO stats | grep -E "hits|misses"
```

### Reference Links

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Monitoring Guide](./MONITORING_GUIDE.md)
- [Runbooks](./runbooks/)
- [SLO Definitions](./SLO_DEFINITIONS.md)
- [Datadog Dashboard](https://datadog.com/aivo/production-dashboard)
- [PagerDuty](https://aivo.pagerduty.com)
- [Status Page](https://status.aivo.app)

---

**Document Version:** 1.0  
**Last Updated:** January 28, 2026  
**Owner:** DevOps Team  
**Next Review:** Post-launch retrospective
