# Status Page Operations Runbook

## Overview

The public status page runs independently from the main AIVO platform.
It consists of two services in the `aivo-status` namespace:

| Service | Port | Purpose |
|---------|------|---------|
| `status-page-svc` | 3090 | Fastify API, SQLite DB, Prometheus poller |
| `web-status` | 3091 | Next.js frontend at status.aivolearning.com |

## Architecture

```
Cloudflare (status.aivolearning.com)
  ├── /api/* → status-page-svc:3090
  └── /* → web-status:3091
                ↑ ISR revalidation every 30s
                ↓
         status-page-svc
           ├── SQLite (PVC /data/status.db)
           ├── Prometheus queries → monitoring namespace
           ├── Alertmanager webhook receiver
           └── Auto-incident detection (cron every 30s)
```

## Key Differences from Main Platform

- **Separate namespace** (`aivo-status`) — survives main platform outages
- **SQLite** — no dependency on shared PostgreSQL
- **No Redis/NATS** — fully self-contained
- **Node affinity** — prefers `infra`/`status` labeled nodes
- **Single replica for backend** (SQLite single-writer constraint)

## Common Operations

### Check service health

```sh
kubectl -n aivo-status get pods
kubectl -n aivo-status logs deploy/status-page-svc --tail=50
kubectl -n aivo-status logs deploy/web-status --tail=50
```

### Restart services

```sh
kubectl -n aivo-status rollout restart deploy/status-page-svc
kubectl -n aivo-status rollout restart deploy/web-status
```

### Backup SQLite database

```sh
kubectl -n aivo-status exec deploy/status-page-svc -- \
  sqlite3 /data/status.db ".backup /tmp/status-backup.db"
kubectl -n aivo-status cp \
  deploy/status-page-svc:/tmp/status-backup.db ./status-backup.db
```

### Create manual incident

```sh
curl -X POST https://status.aivolearning.com/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Elevated API Latency",
    "message": "We are investigating reports of slow API responses.",
    "severity": "major",
    "status": "investigating",
    "components": ["api-gateway"]
  }'
```

### Resolve an incident

```sh
curl -X PUT https://status.aivolearning.com/api/incidents/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "message": "The issue has been resolved. Root cause was..."
  }'
```

### Test Alertmanager webhook

```sh
curl -X POST http://status-page-svc.aivo-status:3090/api/webhooks/alertmanager \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <WEBHOOK_SECRET>" \
  -d '{
    "status": "firing",
    "alerts": [{
      "status": "firing",
      "labels": {
        "alertname": "ServiceDown",
        "service": "auth-svc",
        "severity": "critical"
      },
      "annotations": {
        "summary": "auth-svc is unreachable"
      },
      "startsAt": "2025-01-01T00:00:00Z"
    }]
  }'
```

## Troubleshooting

### Status page shows stale data
1. Check that `status-page-svc` pod is running
2. Verify Prometheus connectivity: `kubectl -n aivo-status logs deploy/status-page-svc | grep -i prometheus`
3. Check ISR revalidation in `web-status` logs

### Auto-detection not creating incidents
1. Verify detection is enabled: check logs for "Auto-detection cycle" messages
2. Confirm Prometheus URL is correct in ConfigMap
3. Check detection thresholds in `src/config.ts`

### Alertmanager webhook not working
1. Verify webhook secret matches between Alertmanager config and status-page-svc secret
2. Check network policy allows traffic from monitoring namespace
3. Test with curl from within the cluster

### SQLite database corrupted
1. Stop the pod: `kubectl -n aivo-status scale deploy/status-page-svc --replicas=0`
2. Restore from backup (see backup procedure above)
3. Start: `kubectl -n aivo-status scale deploy/status-page-svc --replicas=1`
