# AIVO Platform - Deployment Runbook

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Procedures](#deployment-procedures)
4. [Rollback Procedures](#rollback-procedures)
5. [Incident Response](#incident-response)
6. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview

This runbook covers deployment procedures for the AIVO platform across all environments.

### Environments

| Environment | URL                                | Cluster           | Namespace      |
| ----------- | ---------------------------------- | ----------------- | -------------- |
| Development | `https://dev.aivolearning.com`     | `aivo-dev`        | `aivo-dev`     |
| Staging     | `https://staging.aivolearning.com` | `aivo-staging`    | `aivo-staging` |
| Production  | `https://app.aivolearning.com`     | `aivo-production` | `aivo-prod`    |

### Contact Information

| Role             | Team          | Contact Channel         | PagerDuty           |
| ---------------- | ------------- | ----------------------- | ------------------- |
| Platform On-Call | Platform Team | `#aivo-platform-oncall` | `platform-critical` |
| Database On-Call | DBA Team      | `#aivo-dba`             | `dba-critical`      |
| Security On-Call | Security Team | `#aivo-security`        | `security-critical` |

---

## Pre-Deployment Checklist

### Before Staging Deployment

- [ ] All CI checks passing (lint, test, build, security)
- [ ] No P0/P1 bugs in the release
- [ ] Database migrations reviewed and tested
- [ ] Feature flags configured correctly
- [ ] Release notes prepared
- [ ] QA sign-off obtained

### Before Production Deployment

- [ ] Staging deployment successful
- [ ] Staging smoke tests passed
- [ ] QA validation on staging complete
- [ ] No active incidents in production
- [ ] Database backups verified (< 24h old)
- [ ] Rollback plan reviewed
- [ ] On-call engineer notified
- [ ] Deployment window confirmed
- [ ] Release tag created (`vX.Y.Z`)

### Required Approvals

| Environment | Required Approvers      | Minimum |
| ----------- | ----------------------- | ------- |
| Staging     | Any team member         | 1       |
| Production  | Platform Leads          | 2       |
| Hotfix      | Platform Lead + On-Call | 2       |

---

## Deployment Procedures

### Standard Staging Deployment

Staging deploys automatically on merge to `main`. Manual deployment:

```bash
# Trigger staging deployment via ci-unified pipeline
gh workflow run ci-unified.yml -f deploy_environment=staging

# Or via kubectl on Hetzner
ssh staging-server
cd /opt/aivo/infra/k8s/overlays/staging
kustomize edit set image aivo/<service>=ghcr.io/artpromedia/aivo-<service>:<tag>
kustomize build . | kubectl apply -f -
kubectl rollout status deployment --all -n aivo-staging
```

### Standard Production Deployment

1. **Create Release Tag**

   ```bash
   git tag -a v1.2.3 -m "Release v1.2.3: Description of changes"
   git push origin v1.2.3
   ```

2. **Create GitHub Release**
   - Go to GitHub → Releases → New Release
   - Select tag `v1.2.3`
   - Write release notes
   - Publish release

3. **Monitor Deployment**

   ```bash
   # Watch deployment progress
   gh run watch

   # Check pod status
   kubectl get pods -n aivo-prod -w

   # Check logs
   kubectl logs -f deployment/<service> -n aivo-prod
   ```

4. **Verify Deployment**

   ```bash
   # Check all deployments
   kubectl get deployments -n aivo-prod

   # Run health checks
   for svc in auth-svc content-svc billing-svc session-svc; do
     kubectl exec -n aivo-prod deploy/$svc -- curl -sf http://localhost:3000/health/ready
   done
   ```

### Hotfix Deployment

For critical production issues:

1. **Create Hotfix Branch**

   ```bash
   git checkout -b hotfix/v1.2.4 v1.2.3
   # Make fix
   git commit -m "fix: critical bug description"
   git push origin hotfix/v1.2.4
   ```

2. **Fast-Track Review**
   - Create PR with `hotfix` label
   - Request immediate review from on-call engineer
   - Skip staging validation if critical

3. **Deploy Hotfix**
   ```bash
   git tag -a v1.2.4 -m "Hotfix v1.2.4: Critical bug fix"
   git push origin v1.2.4
   # Create release with `hotfix` label
   ```

### Database Migration Deployment

1. **Review Migration**

   ```bash
   # Generate migration
   cd services/<service>
   npx prisma migrate dev --name <migration-name>

   # Review generated SQL
   cat prisma/migrations/<timestamp>_<name>/migration.sql
   ```

2. **Deploy Migration (Staging)**

   ```bash
   # Run migration in staging
   kubectl exec -it deploy/<service> -n aivo-staging -- npx prisma migrate deploy

   # Verify
   kubectl exec -it deploy/<service> -n aivo-staging -- npx prisma migrate status
   ```

3. **Deploy Migration (Production)**

   ```bash
   # ALWAYS backup first
   ssh production-server 'pg_dump -Fc aivo_prod > /backups/aivo_prod_$(date +%Y%m%d_%H%M%S).dump'

   # Run migration
   kubectl exec -it deploy/<service> -n aivo-prod -- npx prisma migrate deploy

   # Verify
   kubectl exec -it deploy/<service> -n aivo-prod -- npx prisma migrate status
   ```

---

## Rollback Procedures

### Quick Rollback (< 5 minutes)

```bash
# Rollback to previous version
kubectl rollout undo deployment/<service> -n aivo-prod

# Verify rollback
kubectl rollout status deployment/<service> -n aivo-prod
kubectl get pods -n aivo-prod | grep <service>
```

### Rollback to Specific Version

```bash
# List revisions
kubectl rollout history deployment/<service> -n aivo-prod

# Rollback to specific revision
kubectl rollout undo deployment/<service> --to-revision=<N> -n aivo-prod
```

### Rollback via CI/CD

```bash
# Deploy previous release via ci-unified pipeline
gh workflow run ci-unified.yml -f deploy_environment=production -f version=v1.2.2
```

### Full Environment Rollback

```bash
# Get previous kustomize state from git
git checkout v1.2.2 -- infra/k8s/overlays/production

# Apply previous state
cd infra/k8s/overlays/production
kustomize build . | kubectl apply -f -
kubectl rollout status deployment --all -n aivo-prod
```

### Database Rollback

⚠️ **WARNING**: Database rollbacks can cause data loss. Only proceed if absolutely necessary.

1. **Check Migration Status**

   ```bash
   kubectl exec -it deploy/<service> -n aivo-prod -- npx prisma migrate status
   ```

2. **Restore from Backup**

   ```bash
   # List backups
   ssh production-server 'ls -lt /backups/aivo_prod_*.dump'

   # Restore (this will cause downtime)
   ssh production-server 'pg_restore -d aivo_prod /backups/<backup-file>.dump'
   ```

3. **Manual Schema Rollback** (if forward-compatible)

   ```bash
   # Connect to database
   kubectl exec -it deploy/pgbouncer -n aivo-prod -- psql

   # Run rollback SQL (prepared in advance)
   \i rollback_v1.2.3.sql
   ```

---

## Incident Response

### Severity Levels

| Level | Description       | Response Time | Examples                           |
| ----- | ----------------- | ------------- | ---------------------------------- |
| SEV1  | Complete outage   | 15 minutes    | Platform down, data breach         |
| SEV2  | Major degradation | 30 minutes    | Payment failures, auth issues      |
| SEV3  | Minor impact      | 2 hours       | Feature degraded, slow performance |
| SEV4  | Minimal impact    | 24 hours      | Cosmetic issues, non-critical bugs |

### Incident Response Process

1. **Detection & Alert**
   - PagerDuty alert received
   - Monitor in `#aivo-incidents`

2. **Triage (5 minutes)**

   ```bash
   # Check service status
   kubectl get pods -n aivo-prod | grep -v Running

   # Check recent deployments
   kubectl get deployments -n aivo-prod -o jsonpath='{.items[*].metadata.annotations}'

   # Check error rate
   # Open Grafana: https://grafana.aivolearning.com/d/aivo-services-overview
   ```

3. **Containment**
   - Rollback if deployment-related
   - Scale up if load-related
   - Enable circuit breakers if dependency issue

4. **Communication**

   ```
   # Post in #aivo-incidents:
   🚨 SEV[1-4] Incident: [Brief Description]

   Impact: [User impact description]
   Status: Investigating / Mitigating / Resolved
   Incident Commander: [Name]

   Updates every [X] minutes.
   ```

5. **Resolution & Post-Mortem**
   - Document timeline
   - Identify root cause
   - Create follow-up tickets
   - Schedule post-mortem meeting

### Emergency Contacts

```
Platform Lead: platform-lead@aivolearning.com
DBA On-Call: dba-oncall@aivolearning.com
Security: security@aivolearning.com
```

---

## Troubleshooting Guide

### Service Not Starting

1. **Check Pod Events**

   ```bash
   kubectl describe pod <pod-name> -n aivo-prod
   ```

2. **Check Logs**

   ```bash
   kubectl logs <pod-name> -n aivo-prod --previous
   ```

3. **Common Causes**
   - Image pull failure → Check GCR credentials
   - OOMKilled → Increase memory limits
   - CrashLoopBackOff → Check environment variables

### High Latency

1. **Check Database**

   ```bash
   # Check connection count
   kubectl exec -it deploy/pgbouncer -n aivo-prod -- psql -c "SELECT count(*) FROM pg_stat_activity"

   # Check slow queries
   kubectl exec -it deploy/pgbouncer -n aivo-prod -- psql -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10"
   ```

2. **Check Redis**

   ```bash
   kubectl exec -it deploy/redis -n aivo-prod -- redis-cli info memory
   kubectl exec -it deploy/redis -n aivo-prod -- redis-cli info clients
   ```

3. **Check Service Metrics**
   - Open Grafana dashboard
   - Look for resource saturation
   - Check external dependency latencies

### High Error Rate

1. **Identify Error Type**

   ```bash
   # Check logs for errors
   kubectl logs -f deployment/<service> -n aivo-prod | grep -i error
   ```

2. **Check Dependencies**

   ```bash
   # Test database connection
   kubectl exec -it deploy/<service> -n aivo-prod -- nc -zv postgres 5432

   # Test Redis connection
   kubectl exec -it deploy/<service> -n aivo-prod -- nc -zv redis 6379
   ```

3. **Check External Services**
   - Stripe status: https://status.stripe.com
   - OpenAI status: https://status.openai.com
   - Hetzner status: https://status.hetzner.com

### Memory Issues

1. **Check Memory Usage**

   ```bash
   kubectl top pods -n aivo-prod --sort-by=memory
   ```

2. **Check for Memory Leaks**

   ```bash
   # Get heap snapshot
   kubectl exec -it deploy/<service> -n aivo-prod -- node --inspect=0.0.0.0:9229
   # Connect Chrome DevTools to take heap snapshot
   ```

3. **Mitigation**
   ```bash
   # Restart pods one by one
   kubectl rollout restart deployment/<service> -n aivo-prod
   ```

### SSL/TLS Issues

1. **Check Certificate Expiry**

   ```bash
   kubectl get certificate -n aivo-prod
   kubectl describe certificate aivo-tls -n aivo-prod
   ```

2. **Renew Certificate**
   ```bash
   # Delete certificate to trigger renewal (cert-manager)
   kubectl delete certificate aivo-tls -n aivo-prod
   ```

---

## Appendix

### Useful Commands

```bash
# Get all pods with issues
kubectl get pods -n aivo-prod --field-selector status.phase!=Running

# Get recent events
kubectl get events -n aivo-prod --sort-by=.lastTimestamp | tail -20

# Port-forward to debug
kubectl port-forward svc/<service> 3000:3000 -n aivo-prod

# Execute shell in container
kubectl exec -it deploy/<service> -n aivo-prod -- /bin/sh

# Copy files from pod
kubectl cp aivo-prod/<pod-name>:/path/to/file ./local-file
```

### Monitoring URLs

| Tool       | URL                                            |
| ---------- | ---------------------------------------------- |
| Grafana    | https://grafana.aivolearning.com               |
| Prometheus | https://prometheus.aivolearning.com (internal) |
| Jaeger     | https://jaeger.aivolearning.com                |
| ArgoCD     | https://argocd.aivolearning.com                |
| PagerDuty  | https://aivo.pagerduty.com                     |

### Maintenance Windows

| Day      | Time (UTC)  | Duration | Notes                       |
| -------- | ----------- | -------- | --------------------------- |
| Tuesday  | 02:00-04:00 | 2 hours  | Preferred deployment window |
| Thursday | 02:00-04:00 | 2 hours  | Secondary deployment window |

**No deployments on:**

- Fridays (unless critical hotfix)
- Major holidays
- During marketing campaigns
