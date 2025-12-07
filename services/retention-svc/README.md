# Retention Service

Background job runner that enforces data-retention policies for events, homework uploads, and AI incidents. There is no HTTP API; run via `pnpm run run:retention` or hook into a scheduled runner (e.g., Kubernetes CronJob).

## Running locally

```bash
pnpm install
pnpm --filter @aivo/retention-svc run build
pnpm --filter @aivo/retention-svc run run:retention
```

Set the following env vars (or rely on repo-level defaults):

- `DATABASE_URL` – Postgres connection string
- `PGSSL` (optional) – enable TLS if required

## Scheduling

See `docs/data_governance/retention_engine.md` for suggested CronJob wiring.
