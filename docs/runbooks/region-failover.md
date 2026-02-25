# Region Failover Runbook — Active-Passive

> **STATUS: PROVISIONED — NOT ACTIVE**
> This runbook is pre-built for when AIVO enables multi-region deployment.
> The current MVP runs single-region on Hetzner US-East (Ashburn).

---

## Overview

| Property | Value |
|----------|-------|
| **Primary** | US-East — Ashburn (`ash`) |
| **Secondary** | US-West — Hillsboro (`hil`) |
| **Failover detection** | 30 seconds (Cloudflare GLB) |
| **RPO (Recovery Point Objective)** | < 1 second (async replication) |
| **RTO (Recovery Target Objective)** | < 5 minutes (automated), < 15 minutes (manual) |
| **Replication** | PostgreSQL streaming, NATS gateway |

---

## Table of Contents

1. [Decision Matrix](#1-decision-matrix)
2. [Automated Failover](#2-automated-failover)
3. [Manual Failover](#3-manual-failover)
4. [Failback Procedure](#4-failback-procedure)
5. [Monitoring & Alerts](#5-monitoring--alerts)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Decision Matrix

| Scenario | Action | Who Decides |
|----------|--------|-------------|
| Primary API health check fails (30s) | Cloudflare auto-routes to secondary | Automatic |
| Primary region total outage | Manual failover + DB promotion | On-call SRE |
| Replication lag > 30s | Investigate, do NOT failover yet | On-call SRE |
| Replication lag > 5 min | Failover if primary unreachable | Engineering Lead |
| Planned maintenance | Graceful failover | Engineering Lead |
| Data corruption on primary | STOP replication, investigate | Engineering Lead + DBA |

### Escalation Path

1. PagerDuty alert → On-call SRE (5 min response)
2. SRE assesses → Engineering Lead (if manual failover needed)
3. Engineering Lead authorizes → SRE executes failover
4. Post-incident review within 24h

---

## 2. Automated Failover

Cloudflare Global Load Balancer handles traffic routing automatically:

- **Health check**: `GET https://api.aivolearning.com/health` every 15s
- **Failure threshold**: 2 consecutive failures = 30s detection
- **Action**: Traffic routes to US-West pool automatically
- **No database promotion** — secondary serves read-only until manual promotion

### What happens automatically

```
  Cloudflare GLB monitors /health on both origins
       ↓
  US-East fails 2 consecutive checks (30s)
       ↓
  Cloudflare routes ALL traffic to US-West
       ↓
  US-West serves read traffic from standby DB
       ↓
  ⚠ WRITE OPERATIONS FAIL until DB promotion
```

### When to manually promote the database

Only promote the standby if:
- Primary is confirmed unreachable (not just a transient issue)
- Estimated downtime > 15 minutes
- Engineering Lead has authorized

---

## 3. Manual Failover

### Prerequisites

- `kubectl` configured for both clusters
- SSH access to database servers
- Cloudflare API token with LB permissions

### Step 1: Verify primary is down

```bash
# Check primary cluster health
kubectl --context=aivo-us-east get nodes
kubectl --context=aivo-us-east get pods -n aivo-prod --field-selector=status.phase!=Running

# Check primary DB
ssh aivo-db-us-east "pg_isready -h localhost -p 5432"

# Check replication status from standby
ssh aivo-db-us-west "sudo -u postgres psql -c \"SELECT pg_is_in_recovery(), pg_last_xact_replay_timestamp()\""
```

### Step 2: Promote PostgreSQL standby

```bash
# SSH to US-West database server
ssh aivo-db-us-west

# Check replication lag before promotion
sudo -u postgres psql -c "SELECT EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp()) AS lag_seconds"

# PROMOTE (irreversible — standby becomes primary)
sudo -u postgres pg_ctlcluster 15 main promote

# Verify promotion
sudo -u postgres psql -c "SELECT pg_is_in_recovery()"
# Should return: f (false = primary)
```

**Alternative via K8s (if using K8s-managed postgres):**
```bash
kubectl exec -n aivo-postgres <standby-pod> -- /scripts/promote-standby.sh
```

### Step 3: Update application connection strings

```bash
# Update shared-secrets in US-West cluster to point to local DB
kubectl --context=aivo-us-west -n aivo-prod patch secret shared-secrets \
  --type='json' -p='[
    {"op": "replace", "path": "/data/DATABASE_HOST", "'$(echo -n "10.20.0.10" | base64)'"}
  ]'

# Restart all backend services to pick up new DB connection
kubectl --context=aivo-us-west -n aivo-prod rollout restart deployment
```

### Step 4: Verify US-West is serving traffic

```bash
# Check Cloudflare LB status
curl -s https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/load_balancers \
  -H "Authorization: Bearer ${CF_TOKEN}" | jq '.result[].pools'

# Smoke test endpoints
curl -sf https://api.aivolearning.com/health
curl -sf https://app.aivolearning.com

# Check NATS connectivity
kubectl --context=aivo-us-west exec -n aivo-nats nats-0 -- \
  nats server check connection --server nats://localhost:4222
```

### Step 5: Verify data integrity

```bash
# Check recent data on new primary
ssh aivo-db-us-west "sudo -u postgres psql -d aivo_core -c \"
  SELECT count(*) as total_users FROM users WHERE updated_at > now() - interval '1 hour';
\""

# Verify no replication slot WAL accumulation
ssh aivo-db-us-west "sudo -u postgres psql -c \"
  SELECT slot_name, active, pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) as lag_bytes
  FROM pg_replication_slots;
\""
```

### Step 6: Post-failover checklist

- [ ] Confirmed US-West DB is primary (pg_is_in_recovery() = false)
- [ ] All 43 services running in US-West (`kubectl get pods -n aivo-prod`)
- [ ] API returns 200 on `/health`
- [ ] Web apps loading correctly
- [ ] NATS streams are processing messages
- [ ] Prometheus/Grafana dashboards updated to US-West
- [ ] PagerDuty incident updated with failover status
- [ ] Stakeholders notified (Slack #ops + email)
- [ ] Old replication slot on new primary dropped if not needed

---

## 4. Failback Procedure

Failback should only happen during a maintenance window, never under pressure.

### Step 1: Restore US-East infrastructure

```bash
# If servers need reprovisioning
cd infra/terraform/multi-region
terraform apply -target=hcloud_server.database["us_east"] \
  -var-file=production.tfvars

# Wait for server to be ready
ssh aivo-db-us-east "pg_isready -h localhost -p 5432" # Should fail (fresh server)
```

### Step 2: Rebuild US-East as standby

```bash
# SSH to US-East DB server
ssh aivo-db-us-east

# Stop PostgreSQL if running
sudo systemctl stop postgresql

# Clear data directory
sudo -u postgres rm -rf /var/lib/postgresql/15/main/*

# Base backup from current primary (US-West)
sudo -u postgres pg_basebackup \
  -h <US_WEST_DB_PUBLIC_IP> \
  -p 5432 \
  -U repl_user \
  -D /var/lib/postgresql/15/main \
  -Fp -Xs -P -R \
  --slot=aivo_standby \
  --checkpoint=fast

# Configure standby
sudo -u postgres cat >> /var/lib/postgresql/15/main/postgresql.auto.conf <<EOF
primary_conninfo = 'host=<US_WEST_DB_PUBLIC_IP> port=5432 user=repl_user password=<REPL_PASS> application_name=aivo_standby sslmode=require'
primary_slot_name = 'aivo_standby'
recovery_target_timeline = 'latest'
EOF

sudo -u postgres touch /var/lib/postgresql/15/main/standby.signal

# Start PostgreSQL
sudo systemctl start postgresql

# Verify replication
sudo -u postgres psql -c "SELECT pg_is_in_recovery()"
# Should return: t (true = standby)
```

### Step 3: Wait for replication catch-up

```bash
# Monitor lag until it reaches 0
watch -n 5 'sudo -u postgres psql -tAc "SELECT EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp())"'
# Wait until lag < 1 second
```

### Step 4: Planned switchover (during maintenance window)

```bash
# 1. Enable synchronous replication temporarily
ssh aivo-db-us-west "sudo -u postgres psql -c \"ALTER SYSTEM SET synchronous_standby_names = 'aivo_standby'\""
ssh aivo-db-us-west "sudo -u postgres psql -c \"SELECT pg_reload_conf()\""

# 2. Wait for sync confirmation
ssh aivo-db-us-west "sudo -u postgres psql -c \"SELECT sync_state FROM pg_stat_replication\""
# Should show 'sync'

# 3. Stop writes (put API in maintenance mode)
kubectl --context=aivo-us-west -n aivo-prod scale deployment api-gateway --replicas=0

# 4. Final sync check
ssh aivo-db-us-east "sudo -u postgres psql -tAc \"SELECT EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp())\""
# Must be 0

# 5. Promote US-East
ssh aivo-db-us-east "sudo -u postgres pg_ctlcluster 15 main promote"

# 6. Update connection strings, restart services, restore traffic
# (Same as Manual Failover steps 3-5 but targeting US-East)
```

---

## 5. Monitoring & Alerts

### Prometheus Alerts (pre-configured)

| Alert | Severity | Condition | Action |
|-------|----------|-----------|--------|
| `PostgresReplicationLagHigh` | warning | lag > 5s for 2m | Investigate network |
| `PostgresReplicationLagCritical` | critical | lag > 30s for 1m | Prepare for failover |
| `PostgresStandbyDisconnected` | critical | 0 standbys for 2m | Reconnect or failover |
| `NATSGatewayDisconnected` | critical | 0 gateway conns for 1m | Check cross-region network |
| `NATSGatewayHighLatency` | warning | RTT > 200ms for 5m | Normal ash↔hil is ~60ms |

### Grafana Dashboards

- **Replication Health**: `infra/k8s/base/postgres/replication.yaml` metrics
- **NATS Gateway**: Gateway RTT, message rates, consumer lag
- **Cloudflare GLB**: Pool health, failover events, request distribution

### Key Metrics to Watch

```promql
# Replication lag (seconds)
pg_replication_lag_seconds

# Connected standbys
pg_replication_connected_standbys

# Replication slot lag (bytes)
pg_replication_slots_lag_bytes{slot_name="aivo_standby"}

# NATS gateway connections
nats_gatewayz_outbound_connections

# NATS gateway RTT
nats_gatewayz_outbound_rtt_ms
```

---

## 6. Troubleshooting

### Replication Lag

**Symptoms**: `PostgresReplicationLagHigh` alert firing

**Diagnosis**:
```bash
# Check WAL sender status on primary
ssh aivo-db-us-east "sudo -u postgres psql -c \"
  SELECT pid, application_name, client_addr, state, sync_state,
    sent_lsn, write_lsn, flush_lsn, replay_lsn,
    write_lag, flush_lag, replay_lag
  FROM pg_stat_replication;
\""

# Check standby receiver
ssh aivo-db-us-west "sudo -u postgres psql -c \"
  SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(),
    pg_last_xact_replay_timestamp(),
    EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp()) as lag_seconds;
\""
```

**Resolution**:
1. **Network issue**: Check Hetzner network status, MTU settings
2. **High write volume**: Increase `wal_keep_size`, consider throttling
3. **Standby overloaded**: Kill long-running read queries, check resources

### Standby Disconnected

**Symptoms**: `PostgresStandbyDisconnected` alert

**Resolution**:
```bash
# Check standby status
ssh aivo-db-us-west "sudo systemctl status postgresql"

# Check standby logs
ssh aivo-db-us-west "sudo tail -50 /var/log/postgresql/postgresql-15-main.log"

# Restart WAL receiver if stuck
ssh aivo-db-us-west "sudo -u postgres psql -c \"SELECT pg_wal_replay_resume()\""

# If broken, rebuild standby (Step 4.2)
```

### NATS Gateway Down

**Symptoms**: `NATSGatewayDisconnected` alert

**Resolution**:
```bash
# Check gateway status
kubectl --context=aivo-us-east exec -n aivo-nats nats-0 -- \
  nats server report gateways

# Check connectivity to peer
kubectl --context=aivo-us-east exec -n aivo-nats nats-0 -- \
  nc -zv <WEST_GATEWAY_HOST> 7222

# Restart NATS pod if gateway stuck
kubectl --context=aivo-us-east -n aivo-nats delete pod nats-0
# StatefulSet will recreate it
```

### Split Brain Prevention

**CRITICAL**: Never have two PostgreSQL primaries simultaneously.

If both regions think they are primary:
```bash
# 1. IMMEDIATELY fence one region — stop its PostgreSQL
ssh aivo-db-us-west "sudo systemctl stop postgresql"

# 2. Check which primary has more recent data
ssh aivo-db-us-east "sudo -u postgres psql -tAc \"SELECT pg_current_wal_lsn()\""
# Compare LSN — higher LSN = more recent data

# 3. Rebuild the other as standby (Step 4.2)
```

---

## Appendix: Contact Info

| Role | Contact |
|------|---------|
| On-call SRE | PagerDuty escalation #aivo-infra |
| Engineering Lead | Slack #aivo-engineering |
| Hetzner Support | https://console.hetzner.cloud/support |
| Cloudflare Support | https://dash.cloudflare.com/support |
