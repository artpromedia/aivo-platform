# Disaster Recovery Runbook

> **Owner:** DevOps / SRE  
> **Last updated:** 2026-02-24  
> **Severity if invoked:** SEV-1

---

## Recovery Objectives

| Scenario | RPO | RTO | Procedure |
|---|---|---|---|
| Single DB corruption | 6 hours | 1 hour | [Restore single DB](#single-database-restore) |
| Full database loss | 6 hours | 2 hours | [Full restore](#full-platform-restore) |
| Complete cluster loss | 6 hours | 4 hours | [Rebuild cluster + restore](#complete-cluster-rebuild) |
| Region failure | 6 hours | 8 hours | Failover to secondary region |

**Backup cadence:** Every 6 hours via K8s CronJob `aivo-backup`  
**Retention:** 30 days (daily), 12 months (monthly snapshots)  
**Storage:** Encrypted (AES-256-CBC) in offsite S3-compatible object storage  

---

## Prerequisites

Before performing any restore you will need:

| Item | Where to find it |
|---|---|
| `BACKUP_ENCRYPTION_KEY` | Vault `secret/data/aivo/backup-encryption-key` or 1Password "AIVO Backup Key" |
| `BACKUP_BUCKET` / S3 credentials | Vault `secret/data/aivo/s3-backup` or Kubernetes secret `backup-secrets` |
| `PGPASSWORD` (superuser) | Vault `secret/data/aivo/postgres` |
| `kubectl` access to the target cluster | Kubeconfig for `aivo-prod` or `aivo-staging` |
| AWS CLI configured for the backup bucket | `~/.aws/credentials` or env vars |

---

## Finding the Right Backup

### List recent backups

```bash
aws s3 ls "s3://${BACKUP_BUCKET}/aivo-backups/daily/" --recursive \
  | sort -k1,2 | tail -20
```

### Read a backup manifest

```bash
BACKUP_ID="20260224_060000"
aws s3 cp "s3://${BACKUP_BUCKET}/aivo-backups/daily/manifest-${BACKUP_ID}.json" - | jq .
```

The manifest shows which databases were included, archive size, and checksum.

### Verify a backup without restoring

```bash
./scripts/backup/restore.sh ${BACKUP_ID} --dry-run
```

This downloads, verifies the SHA-256 checksum, tests decryption, and lists contents.

---

## Restore Procedures

### Single Database Restore

**When:** One service's database is corrupted, accidentally dropped, or needs to be rolled back.

**Estimated time:** 15-30 minutes

1. **Identify the latest clean backup:**
   ```bash
   aws s3 ls "s3://${BACKUP_BUCKET}/aivo-backups/daily/" \
     | grep manifest | sort | tail -5
   ```

2. **Run targeted restore:**
   ```bash
   export BACKUP_BUCKET=aivo-backups
   export BACKUP_ENCRYPTION_KEY="<from-vault>"
   export PGPASSWORD="<from-vault>"
   export PG_HOST=postgres

   ./scripts/backup/restore.sh 20260224_060000 --database aivo_auth
   ```

3. **Run migrations for the affected service:**
   ```bash
   pnpm --filter @aivo/auth-svc db:migrate:deploy
   ```

4. **Restart the affected service:**
   ```bash
   kubectl rollout restart deployment/auth-svc -n aivo-prod
   ```

5. **Verify health:**
   ```bash
   kubectl exec -n aivo-prod deploy/auth-svc -- curl -s localhost:4001/health | jq .
   ```

6. **Monitor logs for errors:**
   ```bash
   kubectl logs -n aivo-prod deploy/auth-svc --since=5m -f
   ```

---

### Full Platform Restore

**When:** All databases are lost or the PostgreSQL instance is unrecoverable.

**Estimated time:** 1-2 hours

1. **Scale down all application services** (prevents services from writing to a partially-restored DB):
   ```bash
   kubectl scale deployment --all --replicas=0 -n aivo-prod
   ```

2. **Run full restore:**
   ```bash
   export BACKUP_BUCKET=aivo-backups
   export BACKUP_ENCRYPTION_KEY="<from-vault>"
   export PGPASSWORD="<from-vault>"
   export PG_HOST=postgres

   ./scripts/backup/restore.sh 20260224_060000
   ```

3. **Run all database migrations:**
   ```bash
   ./scripts/db-migrate-all.sh
   ```
   Or, if that script doesn't exist yet, run per-service:
   ```bash
   for svc in auth-svc tenant-svc profile-svc billing-svc; do
     pnpm --filter "@aivo/${svc}" db:migrate:deploy
   done
   ```

4. **Scale services back up:**
   ```bash
   kubectl scale deployment --all --replicas=2 -n aivo-prod
   ```

5. **Run smoke tests:**
   ```bash
   pnpm test:smoke
   ```

6. **Check all pods are healthy:**
   ```bash
   kubectl get pods -n aivo-prod | grep -v Running
   ```

7. **Notify stakeholders** via `#ops-incidents` Slack channel.

---

### Complete Cluster Rebuild

**When:** The entire K3s cluster is destroyed (server failure, accidental deletion).

**Estimated time:** 2-4 hours

1. **Provision new infrastructure:**
   ```bash
   python scripts/hetzner/provision.py --env production
   ```

2. **Bootstrap K3s:**
   ```bash
   ssh deploy@<new-host> 'curl -sfL https://get.k3s.io | sh -'
   ```

3. **Apply base Kubernetes manifests:**
   ```bash
   kubectl apply -k infra/k8s/base/
   ```

4. **Deploy PostgreSQL and Redis:**
   ```bash
   kubectl apply -f infra/k8s/base/postgres/
   kubectl apply -f infra/k8s/base/redis/
   ```
   Wait for pods to be ready.

5. **Configure backup secrets** (so the restore script can access S3):
   ```bash
   kubectl apply -f infra/k8s/base/backup/cronjob.yaml
   # Then edit the secret with real credentials:
   kubectl edit secret backup-secrets -n aivo-prod
   ```

6. **Run full restore** (see [Full Platform Restore](#full-platform-restore) above).

7. **Deploy all application services:**
   ```bash
   kubectl apply -k infra/k8s/overlays/production/
   ```

8. **Verify:**
   ```bash
   kubectl get pods -n aivo-prod
   pnpm test:smoke
   ```

---

## Redis Restore

Redis is primarily a cache/session store and will self-heal when services restart.
For cases where Redis data must be preserved:

1. Download and extract the backup (the restore script does this).
2. Stop the Redis pod:
   ```bash
   kubectl scale statefulset/redis --replicas=0 -n aivo-prod
   ```
3. Copy the RDB file into the Redis PVC:
   ```bash
   kubectl cp redis.rdb aivo-prod/redis-0:/data/dump.rdb
   ```
4. Restart Redis:
   ```bash
   kubectl scale statefulset/redis --replicas=1 -n aivo-prod
   ```

---

## Vault Restore

If Vault snapshots are included in the backup:

1. Unseal Vault or re-initialize if the cluster is new.
2. Restore from the Raft snapshot:
   ```bash
   vault operator raft snapshot restore vault-snapshot.snap
   ```
3. Verify:
   ```bash
   vault status
   vault secrets list
   ```

---

## Backup Verification Schedule

| Frequency | Test | Owner |
|---|---|---|
| **Every 6 hours** | Automated backup runs, uploads, checksum generated | CronJob |
| **Weekly (Sunday 03:00)** | Automated restore to verification DB, row-count checks | CronJob `aivo-backup-verify` |
| **Monthly** | Full DR drill — restore to fresh staging cluster, run full test suite | DevOps lead |
| **Quarterly** | Timed DR exercise with documented RTO measurement, post-mortem | Engineering team |

---

## Troubleshooting

### Backup CronJob not running

```bash
kubectl get cronjob aivo-backup -n aivo-prod
kubectl describe cronjob aivo-backup -n aivo-prod
kubectl get jobs -n aivo-prod | grep aivo-backup
```

### Backup job fails with permission error

Check S3 credentials in the `backup-secrets` Kubernetes secret:
```bash
kubectl get secret backup-secrets -n aivo-prod -o yaml
```

### Decryption fails during restore

Verify you're using the correct `BACKUP_ENCRYPTION_KEY`. The key is stored in:
- Vault: `secret/data/aivo/backup-encryption-key`
- 1Password: "AIVO Backup Key" in the DevOps vault

### pg_restore errors

Common causes:
- **"database does not exist"** → The restore script creates the DB, but if the PG user lacks `CREATEDB` privilege, it will fail. Grant with: `ALTER USER aivo CREATEDB;`
- **Partial restore warnings** → Usually harmless (e.g., trying to drop objects that don't exist). Check the specific errors.

---

## Contacts

| Role | Contact |
|---|---|
| DevOps on-call | PagerDuty: `#devops-oncall` |
| Database admin | Slack: `#database-ops` |
| Engineering lead | Slack: `#engineering` |
| VP Engineering | Direct page via PagerDuty for SEV-1 |
