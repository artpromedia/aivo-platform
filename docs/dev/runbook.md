# ==============================================================================
# AIVO Platform - Operations Runbook
# ==============================================================================

# Table of Contents
1. [Daily Operations](#daily-operations)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [Scaling Procedures](#scaling-procedures)
4. [Deployment Procedures](#deployment-procedures)
5. [Database Operations](#database-operations)
6. [Monitoring & Alerting](#monitoring--alerting)

---

## Daily Operations

### Morning Health Check

```bash
#!/bin/bash
# Run this script to perform morning health checks

echo "=== AIVO Platform Health Check ==="
echo "Date: $(date)"

# 1. Check all pods
echo -e "\n--- Pod Status ---"
kubectl get pods -n aivo --no-headers | \
  awk '{print $3}' | sort | uniq -c

# 2. Check for recent restarts
echo -e "\n--- Recent Restarts (last 24h) ---"
kubectl get pods -n aivo -o json | \
  jq -r '.items[] | select(.status.containerStatuses[].restartCount > 0) | 
    "\(.metadata.name): \(.status.containerStatuses[].restartCount) restarts"'

# 3. Check node status
echo -e "\n--- Node Status ---"
kubectl get nodes --no-headers | awk '{print $2}' | sort | uniq -c

# 4. Check pending PVCs
echo -e "\n--- Pending PVCs ---"
kubectl get pvc -n aivo --field-selector status.phase!=Bound

# 5. Check recent alerts
echo -e "\n--- Active Alerts ---"
kubectl exec -n monitoring deploy/alertmanager -- \
  amtool alert query --alertmanager.url=http://localhost:9093

# 6. Check error rate (last hour)
echo -e "\n--- Error Rate (1h) ---"
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=sum(rate(http_requests_total{status=~"5.."}[1h])) / sum(rate(http_requests_total[1h]))' | \
  jq -r '.data.result[0].value[1] | tonumber * 100 | "\(.)%"'
```

### Key Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Platform Overview | grafana.internal.aivo.edu/d/platform | Overall system health |
| Service Metrics | grafana.internal.aivo.edu/d/services | Per-service metrics |
| Database | grafana.internal.aivo.edu/d/postgres | PostgreSQL metrics |
| Kubernetes | grafana.internal.aivo.edu/d/k8s | Cluster resources |

---

## Common Issues & Solutions

### Issue: Pod CrashLoopBackOff

**Symptoms:**
- Pod status shows CrashLoopBackOff
- Service unavailable

**Diagnosis:**
```bash
# Get pod details
kubectl describe pod <pod-name> -n aivo

# Check logs
kubectl logs <pod-name> -n aivo --previous

# Check events
kubectl get events -n aivo --field-selector involvedObject.name=<pod-name>
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| OOM Killed | Increase memory limits |
| Missing config/secret | Verify ConfigMap/Secret exists |
| Dependency unavailable | Check dependent services |
| Application error | Check logs, fix code |

**Quick Fix:**
```bash
# Delete pod to trigger restart
kubectl delete pod <pod-name> -n aivo

# Rollback if recent deployment
kubectl rollout undo deployment/<deployment> -n aivo
```

---

### Issue: High Latency

**Symptoms:**
- p95 latency > 500ms
- Users reporting slow responses
- SLO breach alerts

**Diagnosis:**
```bash
# Check current latency
kubectl exec -n monitoring deploy/prometheus-server -- \
  wget -qO- 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket[5m]))by(le,service))'

# Check database query times
kubectl exec -n aivo deploy/postgres -- \
  psql -U aivo_admin -d aivo -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check Redis latency
kubectl exec -n aivo deploy/redis -- redis-cli --latency
```

**Solutions:**

1. **Database slow queries:**
   ```sql
   -- Find slow queries
   SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   WHERE mean_exec_time > 100
   ORDER BY total_exec_time DESC
   LIMIT 20;
   
   -- Add missing indexes if needed
   ```

2. **Scale up pods:**
   ```bash
   kubectl scale deployment/<service> -n aivo --replicas=<count>
   ```

3. **Clear Redis cache:**
   ```bash
   kubectl exec -n aivo deploy/redis -- redis-cli FLUSHDB
   ```

---

### Issue: Database Connection Exhaustion

**Symptoms:**
- "too many connections" errors
- Services failing to connect
- Connection pool alerts

**Diagnosis:**
```bash
# Check current connections
kubectl exec -n aivo deploy/postgres -- \
  psql -U aivo_admin -d aivo -c "SELECT count(*) FROM pg_stat_activity;"

# Check connections by application
kubectl exec -n aivo deploy/postgres -- \
  psql -U aivo_admin -d aivo -c "
    SELECT application_name, state, count(*) 
    FROM pg_stat_activity 
    GROUP BY application_name, state 
    ORDER BY count DESC;"
```

**Solutions:**

1. **Terminate idle connections:**
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' 
     AND state_change < now() - interval '10 minutes';
   ```

2. **Increase max connections (requires restart):**
   ```bash
   aws rds modify-db-parameter-group \
     --db-parameter-group-name aivo-production \
     --parameters "ParameterName=max_connections,ParameterValue=500,ApplyMethod=pending-reboot"
   ```

3. **Scale down services temporarily:**
   ```bash
   kubectl scale deployment --all -n aivo --replicas=2
   ```

---

### Issue: Certificate Expiring

**Symptoms:**
- Certificate expiry alerts
- Browser SSL warnings (if expired)

**Solution:**
```bash
# Check certificate status
kubectl get certificates -n aivo

# Check certificate details
kubectl describe certificate <cert-name> -n aivo

# Force renewal (cert-manager)
kubectl delete secret <cert-secret-name> -n aivo
# cert-manager will automatically create new certificate

# Verify new certificate
kubectl get secret <cert-secret-name> -n aivo -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -dates
```

---

## Scaling Procedures

### Horizontal Scaling (Pods)

```bash
# Manual scaling
kubectl scale deployment/<service> -n aivo --replicas=<count>

# Update HPA limits
kubectl patch hpa <service> -n aivo \
  --patch '{"spec":{"maxReplicas": 20}}'

# Verify scaling
kubectl get hpa -n aivo
kubectl get pods -n aivo -l app.kubernetes.io/name=<service>
```

### Vertical Scaling (Resources)

```bash
# Update resource limits
kubectl set resources deployment/<service> -n aivo \
  --limits=cpu=1,memory=1Gi \
  --requests=cpu=500m,memory=512Mi

# Or patch via Helm
helm upgrade <release> ./infrastructure/helm/services/<service> \
  --set resources.limits.cpu=1 \
  --set resources.limits.memory=1Gi
```

### Node Scaling

```bash
# Manual node group scaling
aws eks update-nodegroup-config \
  --cluster-name aivo-production-eks \
  --nodegroup-name general \
  --scaling-config minSize=5,maxSize=30,desiredSize=10

# Karpenter will auto-scale based on pending pods
# Check Karpenter logs
kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter
```

---

## Deployment Procedures

### Standard Deployment

```bash
# 1. Pre-deployment checks
kubectl get pods -n aivo
kubectl get hpa -n aivo

# 2. Deploy via Helm
helm upgrade --install <service> ./infrastructure/helm/services/<service> \
  --namespace aivo \
  --values ./infrastructure/helm/services/<service>/values-prod.yaml \
  --set image.tag=<new-tag> \
  --wait \
  --timeout 10m

# 3. Verify deployment
kubectl rollout status deployment/<service> -n aivo

# 4. Check for errors
kubectl logs -n aivo -l app.kubernetes.io/name=<service> --tail=100 | grep -i error
```

### Canary Deployment

```bash
# 1. Deploy canary (10% traffic)
helm upgrade --install <service>-canary ./infrastructure/helm/services/<service> \
  --namespace aivo \
  --values ./infrastructure/helm/services/<service>/values-prod.yaml \
  --set image.tag=<new-tag> \
  --set canary.enabled=true \
  --set canary.weight=10 \
  --set nameOverride=<service>-canary

# 2. Monitor for 15 minutes
# Check error rates, latency in Grafana

# 3a. If successful, promote
helm upgrade --install <service> ./infrastructure/helm/services/<service> \
  --namespace aivo \
  --values ./infrastructure/helm/services/<service>/values-prod.yaml \
  --set image.tag=<new-tag>

helm uninstall <service>-canary -n aivo

# 3b. If failed, rollback
helm uninstall <service>-canary -n aivo
```

### Rollback

```bash
# Quick rollback
kubectl rollout undo deployment/<service> -n aivo

# Rollback to specific revision
kubectl rollout history deployment/<service> -n aivo
kubectl rollout undo deployment/<service> -n aivo --to-revision=<revision>

# Helm rollback
helm rollback <service> <revision> -n aivo
```

---

## Database Operations

### Routine Maintenance

```bash
# Vacuum analyze (run during low traffic)
kubectl exec -n aivo deploy/postgres -- \
  psql -U aivo_admin -d aivo -c "VACUUM ANALYZE;"

# Check table bloat
kubectl exec -n aivo deploy/postgres -- \
  psql -U aivo_admin -d aivo -c "
    SELECT schemaname, tablename, 
           pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10;"
```

### Index Management

```bash
# Find missing indexes
kubectl exec -n aivo deploy/postgres -- \
  psql -U aivo_admin -d aivo -c "
    SELECT relname, seq_scan, idx_scan
    FROM pg_stat_user_tables
    WHERE seq_scan > 1000 AND idx_scan < seq_scan/10
    ORDER BY seq_scan DESC;"

# Find unused indexes
kubectl exec -n aivo deploy/postgres -- \
  psql -U aivo_admin -d aivo -c "
    SELECT indexrelname, idx_scan
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0
    ORDER BY pg_relation_size(indexrelid) DESC;"
```

### Backup Operations

```bash
# Manual backup
aws rds create-db-snapshot \
  --db-instance-identifier aivo-production-postgres \
  --db-snapshot-identifier aivo-manual-$(date +%Y%m%d)

# Export to S3
aws rds start-export-task \
  --export-task-identifier aivo-export-$(date +%Y%m%d) \
  --source-arn arn:aws:rds:us-east-1:ACCOUNT:snapshot:aivo-manual-$(date +%Y%m%d) \
  --s3-bucket-name aivo-production-backups \
  --iam-role-arn arn:aws:iam::ACCOUNT:role/aivo-rds-export \
  --kms-key-id arn:aws:kms:us-east-1:ACCOUNT:key/KEY_ID
```

---

## Monitoring & Alerting

### Alert Response

| Alert | Severity | Response Time | Escalation |
|-------|----------|---------------|------------|
| ServiceDown | Critical | 5 min | Immediate |
| HighErrorRate | Critical | 15 min | 30 min |
| HighLatency | Warning | 30 min | 1 hour |
| DatabaseConnectionsHigh | Warning | 30 min | 1 hour |
| CertificateExpiring | Warning | 24 hours | 48 hours |

### Silence Alerts

```bash
# Create silence (for maintenance)
kubectl exec -n monitoring deploy/alertmanager -- \
  amtool silence add alertname=~".*" \
    --alertmanager.url=http://localhost:9093 \
    --duration=2h \
    --comment="Planned maintenance" \
    --author="operator@aivo.edu"

# List silences
kubectl exec -n monitoring deploy/alertmanager -- \
  amtool silence query --alertmanager.url=http://localhost:9093

# Remove silence
kubectl exec -n monitoring deploy/alertmanager -- \
  amtool silence expire <silence-id> --alertmanager.url=http://localhost:9093
```

### Custom Queries

```bash
# Error rate by service
curl -G http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)'

# Request rate
curl -G http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=sum(rate(http_requests_total[5m])) by (service)'

# Memory usage by pod
curl -G http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=container_memory_working_set_bytes{namespace="aivo",container!=""}'
```

---

## Quick Reference

### Useful kubectl Commands

```bash
# Get all resources in namespace
kubectl get all -n aivo

# Watch pod status
kubectl get pods -n aivo -w

# Get pod logs (follow)
kubectl logs -f <pod-name> -n aivo

# Execute command in pod
kubectl exec -it <pod-name> -n aivo -- /bin/sh

# Port forward for debugging
kubectl port-forward svc/<service> 3000:80 -n aivo

# Get resource usage
kubectl top pods -n aivo
kubectl top nodes
```

### Useful AWS CLI Commands

```bash
# Get EKS cluster info
aws eks describe-cluster --name aivo-production-eks

# Get RDS status
aws rds describe-db-instances --db-instance-identifier aivo-production-postgres

# Get ElastiCache status
aws elasticache describe-replication-groups --replication-group-id aivo-production-redis

# Get CloudWatch alarms
aws cloudwatch describe-alarms --state-value ALARM
```
