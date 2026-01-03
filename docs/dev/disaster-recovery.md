# ==============================================================================
# AIVO Platform - Disaster Recovery Procedures
# ==============================================================================

# Table of Contents
1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Backup Strategy](#backup-strategy)
4. [Disaster Scenarios](#disaster-scenarios)
5. [Recovery Procedures](#recovery-procedures)
6. [Testing Schedule](#testing-schedule)
7. [Contacts](#contacts)

---

## Overview

This document outlines the disaster recovery (DR) procedures for the AIVO platform.
Our DR strategy is designed to ensure business continuity and minimize data loss
in the event of a service disruption.

### Infrastructure Overview

- **Primary Region:** us-east-1
- **DR Region:** us-west-2
- **Cloud Provider:** AWS
- **Container Orchestration:** Amazon EKS
- **Database:** Amazon RDS PostgreSQL (Multi-AZ)
- **Cache:** Amazon ElastiCache Redis (Cluster Mode)
- **Storage:** Amazon S3 (Cross-region replication enabled)

---

## Recovery Objectives

| Metric | Target | Current Capability |
|--------|--------|--------------------|
| **RTO (Recovery Time Objective)** | < 4 hours | 2-3 hours |
| **RPO (Recovery Point Objective)** | < 1 hour | 15 minutes |
| **MTTR (Mean Time to Recovery)** | < 2 hours | 1-2 hours |

### Service Level Tiers

| Tier | Services | RTO | RPO |
|------|----------|-----|-----|
| Critical | auth-svc, api-gateway, billing-svc | 30 min | 5 min |
| High | content-svc, assessment-svc, analytics-svc | 1 hour | 15 min |
| Medium | ai-orchestrator, notify-svc | 2 hours | 1 hour |
| Low | experimentation-svc, engagement-svc | 4 hours | 4 hours |

---

## Backup Strategy

### Database Backups

**Automated Backups:**
- Continuous backups with point-in-time recovery
- Retention: 30 days
- Backup window: 03:00-06:00 UTC

**Manual Snapshots:**
- Weekly full snapshots (Sunday 02:00 UTC)
- Retention: 90 days
- Cross-region copy to us-west-2

**Backup Verification:**
```bash
# Verify latest backup
aws rds describe-db-snapshots \
  --db-instance-identifier aivo-production-postgres \
  --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | [-1]'

# Test restore (non-production)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier aivo-restore-test \
  --db-snapshot-identifier <snapshot-id> \
  --db-instance-class db.r6g.large
```

### Kubernetes State (Velero)

**Schedule:**
- Daily: Full namespace backup at 02:00 UTC
- Weekly: Full cluster backup on Sundays
- Retention: 30 days (daily), 180 days (weekly)

**Velero Commands:**
```bash
# Check backup status
velero backup get

# Create manual backup
velero backup create aivo-manual-$(date +%Y%m%d) \
  --include-namespaces aivo \
  --ttl 720h

# Verify backup
velero backup describe aivo-daily-<timestamp>

# List restore points
velero restore get
```

### S3 Assets

- **Versioning:** Enabled
- **Cross-region replication:** Enabled to us-west-2
- **Lifecycle rules:**
  - Non-current versions → Glacier after 30 days
  - Delete non-current versions after 365 days

---

## Disaster Scenarios

### Scenario 1: Single Service Failure

**Symptoms:**
- Service returning 5xx errors
- Pod CrashLoopBackOff
- Health checks failing

**Automatic Recovery:**
1. Kubernetes restarts unhealthy pods
2. HPA scales up healthy replicas
3. Load balancer removes unhealthy targets

**Manual Intervention (if needed):**
```bash
# Check pod status
kubectl get pods -n aivo -l app.kubernetes.io/name=<service>

# View logs
kubectl logs -n aivo -l app.kubernetes.io/name=<service> --tail=100

# Force rollback
kubectl rollout undo deployment/<service> -n aivo

# Restart deployment
kubectl rollout restart deployment/<service> -n aivo
```

### Scenario 2: Database Failure

**Symptoms:**
- Services unable to connect to database
- Connection pool exhaustion
- Increased latency

**Recovery Procedure:**

1. **Check RDS status:**
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier aivo-production-postgres \
     --query 'DBInstances[0].DBInstanceStatus'
   ```

2. **If Multi-AZ failover occurred:**
   - Automatic failover completes in 60-120 seconds
   - Update DNS if using custom CNAME
   - Verify application connectivity

3. **If manual recovery needed:**
   ```bash
   # Point-in-time recovery
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier aivo-production-postgres \
     --target-db-instance-identifier aivo-production-postgres-recovered \
     --restore-time 2024-01-15T10:00:00Z

   # Update connection strings
   kubectl create secret generic database-credentials \
     --from-literal=DATABASE_URL=<new-endpoint> \
     --namespace aivo \
     --dry-run=client -o yaml | kubectl apply -f -
   
   # Restart services
   kubectl rollout restart deployment -n aivo
   ```

### Scenario 3: EKS Cluster Failure

**Recovery Procedure:**

1. **Assess damage:**
   ```bash
   aws eks describe-cluster --name aivo-production-eks
   kubectl cluster-info
   ```

2. **If control plane unavailable:**
   - AWS EKS control plane is managed and auto-recovers
   - Wait for AWS status page updates
   - Contact AWS support if > 30 minutes

3. **If worker nodes affected:**
   ```bash
   # Scale node group
   aws eks update-nodegroup-config \
     --cluster-name aivo-production-eks \
     --nodegroup-name general \
     --scaling-config minSize=3,maxSize=20,desiredSize=5

   # Or trigger Karpenter provisioning
   kubectl scale deployment <any-deployment> --replicas=10 -n aivo
   ```

### Scenario 4: Complete Region Failure

**Pre-requisites:**
- DR infrastructure in us-west-2 (warm standby)
- Database read replica in DR region
- S3 cross-region replication active

**Recovery Procedure:**

1. **Declare DR event (requires approval):**
   - Notify on-call manager
   - Create incident in PagerDuty
   - Update status page

2. **Promote DR region:**
   ```bash
   # Switch to DR region
   export AWS_REGION=us-west-2
   
   # Promote RDS read replica
   aws rds promote-read-replica \
     --db-instance-identifier aivo-production-postgres-dr
   
   # Update Route53
   aws route53 change-resource-record-sets \
     --hosted-zone-id <zone-id> \
     --change-batch file://dr-dns-failover.json
   ```

3. **Deploy to DR cluster:**
   ```bash
   # Update kubeconfig
   aws eks update-kubeconfig --name aivo-dr-eks --region us-west-2
   
   # Restore from Velero backup
   velero restore create --from-backup aivo-daily-latest
   
   # Verify deployments
   kubectl get deployments -n aivo
   ```

4. **Update CDN origin:**
   ```bash
   aws cloudfront update-distribution \
     --id <distribution-id> \
     --distribution-config file://dr-cloudfront-config.json
   ```

5. **Verify services:**
   ```bash
   # Run smoke tests
   ./scripts/smoke-tests.sh production-dr
   
   # Check all endpoints
   curl -sf https://api.aivo.edu/health
   curl -sf https://app.aivo.edu
   ```

---

## Recovery Procedures

### Procedure: Restore from Velero Backup

```bash
# 1. List available backups
velero backup get

# 2. Describe backup contents
velero backup describe <backup-name> --details

# 3. Perform restore
velero restore create --from-backup <backup-name> \
  --include-namespaces aivo \
  --restore-volumes=true

# 4. Monitor restore progress
velero restore describe <restore-name>

# 5. Verify resources
kubectl get all -n aivo
```

### Procedure: Database Point-in-Time Recovery

```bash
# 1. Identify recovery point
aws rds describe-db-instance-automated-backups \
  --db-instance-identifier aivo-production-postgres

# 2. Perform PITR
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier aivo-production-postgres \
  --target-db-instance-identifier aivo-pitr-$(date +%Y%m%d%H%M) \
  --restore-time "2024-01-15T10:30:00Z" \
  --db-instance-class db.r6g.xlarge \
  --vpc-security-group-ids sg-xxxxxx \
  --db-subnet-group-name aivo-production-db-subnet

# 3. Wait for instance availability
aws rds wait db-instance-available \
  --db-instance-identifier aivo-pitr-$(date +%Y%m%d%H%M)

# 4. Update application configuration
# (Update secrets/configmaps with new endpoint)

# 5. Verify data integrity
psql -h <new-endpoint> -U aivo_admin -d aivo -c "SELECT COUNT(*) FROM users;"
```

### Procedure: Rollback Deployment

```bash
# 1. Check rollout history
kubectl rollout history deployment/<service> -n aivo

# 2. Rollback to previous version
kubectl rollout undo deployment/<service> -n aivo

# 3. Or rollback to specific revision
kubectl rollout undo deployment/<service> -n aivo --to-revision=<revision>

# 4. Verify rollback
kubectl rollout status deployment/<service> -n aivo
```

---

## Testing Schedule

| Test Type | Frequency | Last Tested | Next Scheduled |
|-----------|-----------|-------------|----------------|
| Backup verification | Weekly | - | - |
| Single service recovery | Monthly | - | - |
| Database failover | Quarterly | - | - |
| Full DR failover | Annually | - | - |
| Chaos engineering | Monthly | - | - |

### DR Test Checklist

- [ ] Notify stakeholders of planned test
- [ ] Verify backup availability
- [ ] Test restore in isolated environment
- [ ] Validate data integrity
- [ ] Measure recovery time
- [ ] Document issues and improvements
- [ ] Update runbooks as needed

---

## Contacts

### On-Call Rotation

| Role | Primary | Secondary |
|------|---------|-----------|
| Platform Engineer | PagerDuty | PagerDuty |
| Database Admin | PagerDuty | PagerDuty |
| Security | PagerDuty | PagerDuty |

### Escalation Path

1. **L1:** On-call engineer (0-15 min)
2. **L2:** Team lead (15-30 min)
3. **L3:** Engineering manager (30-60 min)
4. **L4:** VP Engineering (> 1 hour or critical)

### External Contacts

| Vendor | Purpose | Contact |
|--------|---------|---------|
| AWS Support | Infrastructure issues | AWS Console |
| PagerDuty | Incident management | support@pagerduty.com |
| CloudFlare | CDN issues | Enterprise support portal |

---

## Appendix

### A. Recovery Metrics Tracking

After each recovery event, document:
- Time to detect (TTD)
- Time to respond (TTR)
- Time to recover (TTR)
- Root cause
- Preventive measures

### B. Post-Incident Review Template

1. Incident timeline
2. Root cause analysis
3. Impact assessment
4. Recovery actions taken
5. Lessons learned
6. Action items
