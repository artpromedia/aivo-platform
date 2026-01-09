# Disaster Recovery Testing Runbook

**Version:** 1.0
**Created:** January 2026 - Enterprise QA Audit requirement
**Owner:** Platform Engineering Team
**Review Frequency:** Quarterly

---

## 1. Overview

This runbook provides procedures for testing the Aivo Platform's disaster recovery (DR) capabilities. Regular DR testing ensures the platform can recover from catastrophic failures within acceptable time limits.

### Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| **RTO** (Recovery Time Objective) | 4 hours | Maximum acceptable downtime |
| **RPO** (Recovery Point Objective) | 1 hour | Maximum acceptable data loss |
| **MTTR** (Mean Time To Recovery) | 2 hours | Target average recovery time |

### Critical Services Priority

| Priority | Services | Max Downtime |
|----------|----------|--------------|
| P0 - Critical | auth-svc, api-gateway, learner-model-svc | 30 minutes |
| P1 - High | ai-orchestrator, session-svc, content-svc | 1 hour |
| P2 - Medium | analytics-svc, notify-svc, focus-svc | 2 hours |
| P3 - Low | admin dashboards, reporting | 4 hours |

---

## 2. Pre-Test Checklist

### 2.1 Notification Requirements

- [ ] Notify all stakeholders 48 hours before test
- [ ] Confirm test window with operations team
- [ ] Alert external partners if testing affects integrations
- [ ] Prepare customer communication (if production test)

### 2.2 Environment Preparation

```bash
# Verify backup systems are healthy
kubectl get pods -n backup-system
aws rds describe-db-cluster-snapshots --db-cluster-identifier aivo-primary

# Check current backup status
./scripts/dr/check-backup-status.sh

# Verify standby database is synchronized
./scripts/dr/check-replication-lag.sh
```

### 2.3 Test Data Snapshot

```bash
# Create pre-test snapshot for rollback
./scripts/dr/create-test-snapshot.sh --environment staging --tag "dr-test-$(date +%Y%m%d)"
```

---

## 3. DR Test Scenarios

### 3.1 Database Failover Test

**Objective:** Verify database failover completes within RTO

**Steps:**

1. **Initiate Failover**
   ```bash
   # For AWS RDS Multi-AZ
   aws rds failover-db-cluster --db-cluster-identifier aivo-primary

   # Monitor failover progress
   watch -n 5 'aws rds describe-db-clusters --db-cluster-identifier aivo-primary --query "DBClusters[0].Status"'
   ```

2. **Verify Service Health**
   ```bash
   # Check all services can connect to new primary
   for svc in auth-svc ai-orchestrator learner-model-svc; do
     kubectl exec -n aivo deployment/$svc -- pg_isready -h $DB_HOST
   done
   ```

3. **Validate Data Integrity**
   ```bash
   # Run data integrity checks
   ./scripts/dr/validate-data-integrity.sh

   # Check record counts match pre-failover
   ./scripts/dr/compare-record-counts.sh --snapshot pre-failover
   ```

4. **Record Metrics**
   - Failover duration: _____ seconds
   - Service reconnection time: _____ seconds
   - Data integrity: PASS / FAIL

### 3.2 Full Region Failover Test

**Objective:** Verify cross-region failover within 4-hour RTO

**Steps:**

1. **Pre-Failover Checks**
   ```bash
   # Verify DR region is healthy
   kubectl --context dr-region get nodes
   kubectl --context dr-region get pods -n aivo

   # Check database replica lag
   ./scripts/dr/check-cross-region-lag.sh
   ```

2. **Initiate Region Failover**
   ```bash
   # Update DNS to point to DR region
   ./scripts/dr/failover-dns.sh --target dr-region

   # Promote DR database to primary
   ./scripts/dr/promote-dr-database.sh

   # Scale up DR services
   kubectl --context dr-region scale deployment --all --replicas=3 -n aivo
   ```

3. **Verify Full Service Operation**
   ```bash
   # Run smoke tests against DR region
   npm run test:smoke -- --env=dr

   # Verify critical user journeys
   npm run test:e2e:critical -- --env=dr
   ```

4. **Record Metrics**
   - Total failover time: _____ minutes
   - Services recovered: _____ / _____
   - Data loss (if any): _____ minutes

### 3.3 Point-in-Time Recovery Test

**Objective:** Verify ability to restore to specific point in time

**Steps:**

1. **Create Test Scenario**
   ```bash
   # Record current timestamp
   RESTORE_POINT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

   # Create test data
   ./scripts/dr/create-test-records.sh --count 1000

   # Wait 5 minutes, then create more data
   sleep 300
   ./scripts/dr/create-test-records.sh --count 500 --marker "post-restore"
   ```

2. **Perform PITR**
   ```bash
   # Restore to point before "post-restore" data
   ./scripts/dr/restore-to-point.sh --timestamp "$RESTORE_POINT" --target staging-pitr

   # Verify restore completed
   ./scripts/dr/verify-pitr-restore.sh --target staging-pitr
   ```

3. **Validate Data State**
   ```bash
   # Confirm "post-restore" records are NOT present
   ./scripts/dr/check-for-markers.sh --marker "post-restore" --expect-absent

   # Confirm pre-restore records ARE present
   ./scripts/dr/validate-test-records.sh --count 1000
   ```

4. **Record Metrics**
   - PITR duration: _____ minutes
   - Data accuracy: PASS / FAIL

### 3.4 Service Recovery Test

**Objective:** Verify individual service recovery from complete failure

**Steps:**

1. **Simulate Service Failure**
   ```bash
   # Delete all pods for target service
   TARGET_SERVICE=auth-svc
   kubectl delete pods -l app=$TARGET_SERVICE -n aivo

   # Start timer
   START_TIME=$(date +%s)
   ```

2. **Monitor Recovery**
   ```bash
   # Watch pod recovery
   kubectl get pods -l app=$TARGET_SERVICE -n aivo -w

   # Check service health endpoint
   while ! curl -s http://$TARGET_SERVICE.aivo.svc/health | grep -q '"status":"ok"'; do
     sleep 5
   done

   # Record recovery time
   END_TIME=$(date +%s)
   echo "Recovery time: $((END_TIME - START_TIME)) seconds"
   ```

3. **Verify Service Function**
   ```bash
   # Run service-specific health checks
   ./scripts/dr/verify-service-health.sh --service $TARGET_SERVICE
   ```

---

## 4. Recovery Procedures

### 4.1 Database Recovery from Backup

```bash
# List available backups
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier aivo-primary \
  --query 'DBClusterSnapshots[*].[DBClusterSnapshotIdentifier,SnapshotCreateTime]' \
  --output table

# Restore from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier aivo-restored \
  --snapshot-identifier <snapshot-id> \
  --engine aurora-postgresql

# Wait for cluster to be available
aws rds wait db-cluster-available --db-cluster-identifier aivo-restored

# Update service configurations to use restored cluster
./scripts/dr/update-db-endpoint.sh --cluster aivo-restored
```

### 4.2 Redis Recovery

```bash
# Check Redis cluster status
redis-cli -h $REDIS_HOST cluster info

# If cluster is down, restore from snapshot
aws elasticache create-replication-group \
  --replication-group-id aivo-redis-restored \
  --snapshot-name <snapshot-name> \
  --preferred-cache-cluster-azs us-east-1a us-east-1b

# Update service configurations
./scripts/dr/update-redis-endpoint.sh --cluster aivo-redis-restored
```

### 4.3 Kubernetes Cluster Recovery

```bash
# If cluster is compromised, restore from backup
velero restore create --from-backup aivo-cluster-backup-<date>

# Verify all namespaces restored
kubectl get namespaces

# Check workload status
kubectl get deployments -A | grep -v "1/1\|2/2\|3/3"

# Verify secrets and configmaps
./scripts/dr/verify-secrets.sh
```

---

## 5. Post-Test Procedures

### 5.1 Test Documentation

Complete the following for each test:

| Field | Value |
|-------|-------|
| Test Date | |
| Test Type | |
| Start Time | |
| End Time | |
| Total Duration | |
| RTO Met (Yes/No) | |
| RPO Met (Yes/No) | |
| Issues Encountered | |
| Remediation Actions | |
| Tester Name | |
| Reviewer Name | |

### 5.2 Cleanup

```bash
# Remove test resources
./scripts/dr/cleanup-test-resources.sh

# Restore original configuration
./scripts/dr/restore-original-config.sh

# Verify production health
./scripts/dr/verify-production-health.sh
```

### 5.3 Reporting

1. Generate test report:
   ```bash
   ./scripts/dr/generate-test-report.sh --test-id <test-id>
   ```

2. Review report with:
   - Engineering leads
   - Security team
   - Operations team
   - Compliance officer (if required)

3. File report in:
   - Confluence: Engineering > DR Testing
   - Compliance documentation (for audit)

---

## 6. Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Incident Commander | | | @ic-oncall |
| Database Admin | | | @dba-oncall |
| Platform Engineer | | | @platform-oncall |
| Security Lead | | | @security-oncall |

---

## 7. Test Schedule

| Quarter | Test Type | Target Date | Status |
|---------|-----------|-------------|--------|
| Q1 2026 | Database Failover | January 15 | Pending |
| Q1 2026 | Service Recovery | February 15 | Pending |
| Q2 2026 | Full Region Failover | April 15 | Pending |
| Q2 2026 | PITR Test | May 15 | Pending |
| Q3 2026 | Full DR Exercise | July 15 | Pending |
| Q4 2026 | Annual Full Test | October 15 | Pending |

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | Platform Team | Initial version |

---

## 9. Appendix

### A. Related Documentation

- [Backup Configuration Guide](./BACKUP-CONFIGURATION.md)
- [High Availability Architecture](../architecture/HA-ARCHITECTURE.md)
- [Incident Response Playbook](./INCIDENT-RESPONSE.md)

### B. DR Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRIMARY REGION                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   EKS       │    │   RDS       │    │   Redis     │             │
│  │   Cluster   │    │   Primary   │    │   Primary   │             │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘             │
│                            │                   │                    │
└────────────────────────────┼───────────────────┼────────────────────┘
                             │ Replication       │ Replication
┌────────────────────────────┼───────────────────┼────────────────────┐
│                            ▼                   ▼                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   EKS       │    │   RDS       │    │   Redis     │             │
│  │   Standby   │    │   Replica   │    │   Replica   │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                         DR REGION                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### C. Recovery Time Benchmarks

| Component | Target | Historical Average | Last Test |
|-----------|--------|-------------------|-----------|
| Database Failover | < 60s | 45s | - |
| Service Pod Recovery | < 120s | 90s | - |
| Full Region Failover | < 4h | - | - |
| PITR Restore | < 2h | - | - |
