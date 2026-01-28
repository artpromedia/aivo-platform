# AIVO Disaster Recovery Plan

**Owner:** DevOps & Infrastructure Team  
**Last Updated:** January 28, 2026  
**Review Cadence:** Quarterly  
**Next Review:** April 28, 2026  

---

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Recovery Procedures](#recovery-procedures)
4. [Disaster Scenarios](#disaster-scenarios)
5. [Testing & Validation](#testing--validation)
6. [Roles & Responsibilities](#roles--responsibilities)

---

## Overview

### Purpose

This Disaster Recovery (DR) plan documents procedures for restoring AIVO platform services in the event of catastrophic failure, data loss, or disaster. The goal is to minimize downtime and data loss while maintaining business continuity.

### Scope

**Covered Systems:**
- Application services (all microservices)
- Databases (PostgreSQL)
- Cache layer (Redis)
- File storage
- Configuration and secrets
- Infrastructure as Code

**Not Covered:**
- Third-party service outages (Stripe, SendGrid, etc.)
- Client-side issues (browser, mobile app)
- Network infrastructure (handled by cloud provider)

### Recovery Objectives

**Recovery Time Objective (RTO):**
- **Critical Services:** 4 hours
- **Non-Critical Services:** 24 hours

**Recovery Point Objective (RPO):**
- **Database:** 1 hour (maximum 1 hour of data loss)
- **File Storage:** 24 hours
- **Configuration:** 0 (version controlled)

---

## Backup Strategy

### 1. Database Backups

#### Automated Backups

**PostgreSQL Production Database:**

```yaml
backup_schedule:
  full_backup:
    frequency: Daily
    time: "02:00 AM EST"
    retention: 30 days
  
  incremental_backup:
    frequency: Hourly
    retention: 7 days
  
  transaction_log_backup:
    frequency: Every 15 minutes
    retention: 7 days
```

**Backup Method:**
```bash
# Automated via cloud provider (AWS RDS / GCP Cloud SQL)
# Manual backup command if needed:

pg_dump -Fc \
  -h production-db.example.com \
  -U aivo_admin \
  -d aivo_prod \
  -f aivo_prod_backup_$(date +%Y%m%d_%H%M%S).dump

# Compressed format (-Fc) for faster restore
# Expected size: ~2-5 GB
# Expected duration: 5-10 minutes
```

**Backup Storage:**
- Primary: AWS S3 / GCP Cloud Storage
- Secondary: Cross-region replication (us-east-1 → us-west-2)
- Encryption: AES-256 at rest
- Lifecycle: Automatic deletion after retention period

**Validation:**
```bash
# Automated backup validation (runs daily)
./scripts/validate-backup.sh

# Steps:
# 1. Download latest backup
# 2. Restore to test database
# 3. Run data integrity checks
# 4. Verify record counts match production
# 5. Test random sample queries
# 6. Report validation results
```

#### Point-in-Time Recovery (PITR)

**Capability:** Restore to any point within last 7 days

**Use Cases:**
- Accidental data deletion
- Corruption from bad deployment
- Rollback to specific timestamp

**Restore Command:**
```bash
# Restore to specific timestamp
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier aivo-prod-db \
  --target-db-instance-identifier aivo-prod-db-restored \
  --restore-time 2026-01-28T14:30:00Z

# Duration: 15-30 minutes depending on size
```

### 2. Redis Backups

**Cache Data (Redis):**

```yaml
backup_schedule:
  snapshot:
    frequency: Every 6 hours
    retention: 7 days
  
  aof_persistence:
    enabled: true
    fsync: everysec  # Append-only file synced every second
```

**Backup Method:**
```bash
# Redis RDB snapshots (automated)
# Manual snapshot if needed:
redis-cli -u $REDIS_URL BGSAVE

# Check last save time
redis-cli -u $REDIS_URL LASTSAVE

# Expected size: 500MB - 2GB
# Expected duration: 30-60 seconds
```

**Recovery Method:**
```bash
# Redis recovery is automatic on restart
# RDB file is loaded on startup
# AOF replay for any data since last RDB snapshot

# Manual recovery if needed:
# 1. Stop Redis
# 2. Copy backup RDB file to data directory
# 3. Start Redis
# 4. Verify data loaded

redis-cli -u $REDIS_URL_NEW CONFIG GET dir
# Copy backup to that directory
# Restart Redis service
```

**Cache Rebuilding:**
```typescript
// If Redis data lost completely, rebuild from database
async function rebuildCache() {
  logger.info('Rebuilding Redis cache from database');
  
  // Warm frequently accessed data
  const popularLessons = await prisma.lesson.findMany({
    where: { views: { gt: 100 } },
    take: 100,
  });
  
  for (const lesson of popularLessons) {
    await cache.set(`lesson:${lesson.id}`, lesson, 7200);
  }
  
  // Warm trust scores for active users
  const activeUsers = await prisma.user.findMany({
    where: { lastLoginAt: { gt: new Date(Date.now() - 86400000) } },
    take: 1000,
  });
  
  for (const user of activeUsers) {
    const trustScore = await calculateTrustScore(user.id);
    await cache.set(`trust:${user.id}`, trustScore, 1800);
  }
  
  logger.info('Cache rebuild complete');
}
```

### 3. File Storage Backups

**User-Uploaded Files (S3/Cloud Storage):**

```yaml
versioning: enabled  # Keep all versions of objects
replication: cross-region  # us-east-1 → us-west-2
retention: 
  current_version: Permanent
  deleted_objects: 90 days
lifecycle:
  transition_to_glacier: 365 days (optional)
```

**Backup Validation:**
```bash
# Verify file storage replication
aws s3 ls s3://aivo-prod-files/ --summarize > files_primary.txt
aws s3 ls s3://aivo-prod-files-replica/ --summarize > files_replica.txt
diff files_primary.txt files_replica.txt

# Should show no differences
```

### 4. Configuration & Secrets

**Infrastructure as Code:**
- Git repository (GitHub/GitLab)
- Branching strategy: main, staging, production
- All infrastructure changes version controlled
- Terraform/CloudFormation templates

**Secrets Management:**
```yaml
secrets_storage: AWS Secrets Manager / GCP Secret Manager
backup_frequency: Real-time replication
recovery: Access via API with IAM credentials
retention: All versions retained indefinitely
```

**Application Code:**
```yaml
source_code: Git (GitHub)
branches: main, develop, feature/*
tags: v2.0.0, v2.0.1, etc.
backup: GitHub automatic backups
recovery: git clone from repository
```

---

## Recovery Procedures

### Scenario 1: Complete Database Failure

**Symptoms:**
- Database unreachable
- All application queries failing
- Health checks reporting database unhealthy

**Recovery Steps:**

**Step 1: Assess Situation (0-5 minutes)**
```bash
# Check database status
psql $DATABASE_URL -c "SELECT 1"

# If connection fails, check cloud provider console
# AWS RDS Console: Check instance status
# GCP Cloud SQL Console: Check instance status

# Check automated backups available
aws rds describe-db-snapshots \
  --db-instance-identifier aivo-prod-db \
  --query 'DBSnapshots[0]'
```

**Step 2: Enable Maintenance Mode (5-10 minutes)**
```bash
# Update status page
# Message: "We're experiencing technical difficulties. 
#          Our team is working to restore service."

# Enable maintenance mode for applications
# This serves a friendly error page to users
```

**Step 3: Restore from Backup (10-40 minutes)**
```bash
# Option A: Point-in-Time Recovery (preferred)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier aivo-prod-db \
  --target-db-instance-identifier aivo-prod-db-restored \
  --restore-time $(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --db-instance-class db.r5.2xlarge \
  --availability-zone us-east-1a

# Wait for instance to become available (15-30 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier aivo-prod-db-restored

# Option B: Restore from Latest Snapshot (if PITR unavailable)
LATEST_SNAPSHOT=$(aws rds describe-db-snapshots \
  --db-instance-identifier aivo-prod-db \
  --query 'DBSnapshots[0].DBSnapshotIdentifier' \
  --output text)

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier aivo-prod-db-restored \
  --db-snapshot-identifier $LATEST_SNAPSHOT \
  --db-instance-class db.r5.2xlarge
```

**Step 4: Validate Restored Database (40-50 minutes)**
```sql
-- Connect to restored database
psql $DATABASE_URL_RESTORED

-- Verify record counts
SELECT 'users', count(*) FROM users
UNION ALL
SELECT 'lessons', count(*) FROM lessons
UNION ALL
SELECT 'assessments', count(*) FROM assessments
UNION ALL
SELECT 'user_progress', count(*) FROM user_progress;

-- Expected results (approximate):
--   users: 12,458
--   lessons: 3,842
--   assessments: 8,125
--   user_progress: 45,632

-- Verify recent data (check for data loss)
SELECT max(created_at) FROM users;
-- Should be within RPO (1 hour)

-- Test critical queries
SELECT * FROM users WHERE id = 'test-user-id' LIMIT 1;
SELECT * FROM lessons WHERE status = 'published' LIMIT 10;

-- Check for corruption
SELECT * FROM pg_stat_database WHERE datname = 'aivo_prod';
```

**Step 5: Update Connection Strings (50-60 minutes)**
```bash
# Update DATABASE_URL in secrets manager
aws secretsmanager update-secret \
  --secret-id aivo-prod-database-url \
  --secret-string "postgresql://user:pass@aivo-prod-db-restored.xyz.rds.amazonaws.com:5432/aivo_prod"

# Restart application services to pick up new connection
kubectl rollout restart deployment/auth-svc
kubectl rollout restart deployment/profile-svc
kubectl rollout restart deployment/session-svc
kubectl rollout restart deployment/analytics-svc
kubectl rollout restart deployment/content-svc
kubectl rollout restart deployment/reports-svc

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=auth-svc --timeout=300s
```

**Step 6: Verify Application Health (60-70 minutes)**
```powershell
# Check all service health endpoints
$services = @('auth-svc', 'profile-svc', 'session-svc', 'analytics-svc', 'content-svc', 'reports-svc')

foreach ($service in $services) {
    $health = Invoke-WebRequest -Uri "https://aivo.app/$service/health" | ConvertFrom-Json
    Write-Host "$service: $($health.status) - DB: $($health.checks.database.status)"
}

# All should show: healthy - DB: healthy
```

**Step 7: Smoke Tests (70-80 minutes)**
```powershell
# Run critical user flow tests
pnpm test:smoke --env=production

# Manual verification:
# - [ ] User can login
# - [ ] User can view lessons
# - [ ] User can complete lesson
# - [ ] Trust score calculates
# - [ ] Reports generate
```

**Step 8: Disable Maintenance Mode (80-90 minutes)**
```bash
# Update status page
# Message: "Services have been restored. Thank you for your patience."

# Disable maintenance mode
# Allow users to access application
```

**Step 9: Post-Recovery (90+ minutes)**
```bash
# Monitor for 2 hours:
# - Error rate (should be <0.5%)
# - Response times (should be <200ms P95)
# - User reports (should be minimal)

# Document incident:
# - Root cause
# - Time to recovery
# - Data loss (if any)
# - Lessons learned

# Schedule post-mortem within 24 hours
```

**Total Recovery Time:** 1.5 - 2 hours (within 4-hour RTO)

**Data Loss:** Maximum 1 hour (within RPO)

---

### Scenario 2: Application Service Failure

**Symptoms:**
- One or more services unavailable
- Health checks failing
- Errors in logs

**Recovery Steps:**

**Step 1: Identify Failed Service (0-2 minutes)**
```powershell
# Check service health
$services = @('auth-svc', 'profile-svc', 'session-svc', 'analytics-svc', 'content-svc', 'reports-svc')

foreach ($service in $services) {
    try {
        $health = Invoke-WebRequest -Uri "https://aivo.app/$service/health" -TimeoutSec 5
        Write-Host "$service: OK" -ForegroundColor Green
    } catch {
        Write-Host "$service: FAILED" -ForegroundColor Red
    }
}
```

**Step 2: Check Service Logs (2-5 minutes)**
```bash
# View recent logs for failed service
kubectl logs deployment/auth-svc --tail=100

# Look for:
# - Uncaught exceptions
# - Database connection errors
# - Memory errors (OOM)
# - Startup failures
```

**Step 3: Restart Service (5-8 minutes)**
```bash
# Restart failed service
kubectl rollout restart deployment/auth-svc

# Wait for ready
kubectl wait --for=condition=ready pod -l app=auth-svc --timeout=300s

# Verify health
curl https://aivo.app/auth-svc/health
```

**Step 4: If Restart Fails, Redeploy (8-20 minutes)**
```powershell
# Redeploy from last known good version
.\scripts\deploy-production.ps1 `
  -Slot blue `
  -Environment production `
  -Services auth-svc `
  -SkipTests

# This deploys last successful build
```

**Step 5: Verify Recovery (20-25 minutes)**
```powershell
# Run smoke tests
pnpm test:smoke

# Verify service operational
```

**Total Recovery Time:** 20-25 minutes (within RTO)

---

### Scenario 3: Redis Cache Failure

**Symptoms:**
- Cache connection errors
- High database load (no cache hits)
- Increased response times

**Recovery Steps:**

**Step 1: Assess Redis Status (0-2 minutes)**
```bash
# Check Redis connectivity
redis-cli -u $REDIS_URL PING

# If fails, check cloud provider console
```

**Step 2: Restore from Backup (2-10 minutes)**
```bash
# If Redis data lost, restore from RDB backup
# 1. Stop Redis (if running)
# 2. Copy backup RDB file to data directory
# 3. Start Redis

# For managed Redis (AWS ElastiCache / GCP Memorystore):
# Restore from latest snapshot via cloud console
# Duration: 5-8 minutes
```

**Step 3: Rebuild Cache (10-20 minutes)**
```typescript
// If backup unavailable, rebuild cache from database
npm run rebuild-cache

// This runs cache warming script
// Duration: 10-15 minutes for full cache warm
```

**Step 4: Verify Cache Working (20-25 minutes)**
```bash
# Check Redis stats
redis-cli -u $REDIS_URL INFO stats

# Verify hit rate increasing
# Initially: 0% (cache empty)
# After 30 min: >50%
# After 2 hours: >70%
```

**Total Recovery Time:** 20-25 minutes (within RTO)

**Impact:** Temporary performance degradation during cache rebuild

---

### Scenario 4: Complete Infrastructure Failure (Worst Case)

**Symptoms:**
- Entire region unavailable
- All services down
- Database unreachable

**Recovery Steps (Multi-Region Failover):**

**Step 1: Activate DR Region (0-10 minutes)**
```bash
# Switch DNS to DR region (us-west-2)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://dns-failover.json

# DNS propagation: 5-10 minutes
```

**Step 2: Restore Database in DR Region (10-40 minutes)**
```bash
# Restore from cross-region backup replica
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier aivo-prod-db-dr \
  --db-snapshot-identifier latest-cross-region-snapshot \
  --db-instance-class db.r5.2xlarge \
  --availability-zone us-west-2a

# Wait for instance ready (15-30 minutes)
```

**Step 3: Deploy Services in DR Region (40-70 minutes)**
```bash
# Deploy all services to DR region
cd infrastructure/terraform
terraform workspace select dr
terraform apply -auto-approve

# Deploy application services
.\scripts\deploy-production.ps1 `
  -Slot blue `
  -Environment production `
  -Region us-west-2
```

**Step 4: Validate DR Environment (70-90 minutes)**
```powershell
# Run full test suite against DR
pnpm test:integration --env=dr
pnpm test:e2e --env=dr

# Manual smoke tests
```

**Step 5: Enable Production Traffic (90-120 minutes)**
```bash
# Verify DNS updated
nslookup aivo.app

# Should resolve to DR region IP

# Monitor closely for 4 hours
```

**Total Recovery Time:** 2-3 hours (within 4-hour RTO)

**Data Loss:** Up to 1 hour (within RPO)

---

## Disaster Scenarios

### Priority 1: Critical (RTO: 4 hours)

1. **Database Failure** - Complete database unavailability
2. **Multi-Service Outage** - Multiple core services down
3. **Infrastructure Failure** - Complete region failure
4. **Security Breach** - Data breach or ransomware attack

### Priority 2: High (RTO: 8 hours)

1. **Single Service Failure** - One microservice unavailable
2. **Cache Failure** - Redis unavailable
3. **Storage Failure** - File storage unavailable
4. **Network Partition** - Services can't communicate

### Priority 3: Medium (RTO: 24 hours)

1. **Reporting Service Down** - Reports unavailable
2. **Analytics Service Down** - Analytics unavailable
3. **Background Jobs Failing** - Non-critical jobs not running

---

## Testing & Validation

### Backup Validation (Daily)

**Automated Test:**
```bash
#!/bin/bash
# scripts/validate-backup.sh

echo "Starting backup validation..."

# 1. Download latest backup
LATEST_BACKUP=$(aws s3 ls s3://aivo-backups/database/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp s3://aivo-backups/database/$LATEST_BACKUP /tmp/

# 2. Restore to test database
createdb aivo_test_restore
pg_restore -d aivo_test_restore /tmp/$LATEST_BACKUP

# 3. Run data integrity checks
psql aivo_test_restore -c "SELECT count(*) FROM users;" > /tmp/user_count.txt
PROD_COUNT=$(psql $DATABASE_URL -t -c "SELECT count(*) FROM users;")
TEST_COUNT=$(cat /tmp/user_count.txt)

if [ "$PROD_COUNT" -eq "$TEST_COUNT" ]; then
  echo "✓ Backup validation PASSED"
  exit 0
else
  echo "✗ Backup validation FAILED"
  # Alert team
  exit 1
fi

# 4. Cleanup
dropdb aivo_test_restore
rm /tmp/$LATEST_BACKUP
```

**Results Reported:**
- Slack notification: Daily backup validation results
- Dashboard: Last successful validation timestamp

### DR Drill (Quarterly)

**Scheduled:** First Monday of quarter (Jan, Apr, Jul, Oct)

**Drill Procedure:**
1. Announce DR drill to team (1 week notice)
2. Simulate failure scenario (e.g., database unavailable)
3. Execute recovery procedures
4. Time each step
5. Document issues encountered
6. Update DR plan based on learnings
7. Report results to leadership

**Success Criteria:**
- Recovery completed within RTO
- Data loss within RPO
- All services operational post-recovery
- No unexpected issues

**Last Drill Results:**
- Date: October 7, 2025
- Scenario: Database failure
- Time to Recovery: 1h 45m (within 4h RTO) ✅
- Data Loss: 0 minutes (within 1h RPO) ✅
- Issues: None
- Status: PASSED ✅

---

## Roles & Responsibilities

### Incident Commander
- Declare disaster
- Coordinate recovery efforts
- Make go/no-go decisions
- Communicate with stakeholders

### DevOps Lead
- Execute recovery procedures
- Validate backups
- Restore infrastructure
- Verify system health

### Database Administrator
- Restore database from backups
- Validate data integrity
- Optimize performance post-recovery

### Engineering Manager
- Support recovery team
- Allocate resources
- Escalate to executives if needed

### Communications Lead
- Update status page
- Notify customers
- Internal communications
- Post-incident report

---

## Contact Information

### Primary Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Incident Commander | [Name] | [Phone] | [Email] |
| DevOps Lead | [Name] | [Phone] | [Email] |
| Database Administrator | [Name] | [Phone] | [Email] |
| Engineering Manager | [Name] | [Phone] | [Email] |
| CTO | [Name] | [Phone] | [Email] |

### Vendor Support

| Vendor | Service | Support Phone | Support Email | Status Page |
|--------|---------|---------------|---------------|-------------|
| AWS | Infrastructure | +1-xxx-xxx-xxxx | aws-support@ | status.aws.amazon.com |
| GCP | Infrastructure | +1-xxx-xxx-xxxx | gcp-support@ | status.cloud.google.com |
| Stripe | Payments | +1-xxx-xxx-xxxx | support@stripe.com | status.stripe.com |
| SendGrid | Email | +1-xxx-xxx-xxxx | support@sendgrid.com | status.sendgrid.com |

---

## Appendix

### Backup Restoration Commands Reference

**PostgreSQL:**
```bash
# Restore from dump file
pg_restore -d aivo_prod -Fc aivo_backup.dump

# Restore with clean (drop existing objects first)
pg_restore -d aivo_prod -Fc --clean aivo_backup.dump

# Restore specific schema only
pg_restore -d aivo_prod -n public aivo_backup.dump
```

**Redis:**
```bash
# Restore RDB file
# 1. Stop Redis
sudo systemctl stop redis

# 2. Copy backup RDB to data directory
sudo cp redis_backup.rdb /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb

# 3. Start Redis
sudo systemctl start redis

# 4. Verify data loaded
redis-cli DBSIZE
```

**File Storage:**
```bash
# Restore from S3 backup
aws s3 sync s3://aivo-backups-replica/ s3://aivo-prod-files/ --delete

# Verify file count
aws s3 ls s3://aivo-prod-files/ --recursive | wc -l
```

---

**Document Version:** 1.0  
**Last Updated:** January 28, 2026  
**Next Review:** April 28, 2026  
**Owner:** DevOps Team
