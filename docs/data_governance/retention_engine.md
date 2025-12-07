# Retention Engine

This service enforces retention and deletion rules for selected resource types: events, homework uploads, and AI incidents.

## Policy resolution

- Policies live in `retention_policies` with optional `tenant_id`. A `NULL` tenant row is the global default.
- For a resource, the engine first looks for a tenant-specific policy; if none exists, it falls back to the global default.
- `retention_days` defines the window; anything older than `now() - retention_days` is eligible.

## What the job does

- **Events**: hard delete rows older than the retention window.
- **Homework uploads**: mark `deleted_at` and clear `file_path` to remove file references while keeping the record shell (idempotent).
- **AI incidents**: currently hard delete. TODO: replace with anonymization that preserves aggregate counts only.
- The job is idempotent and safe to run repeatedly; already-deleted or marked rows are skipped.

## Running / scheduling

- One-shot run: `pnpm --filter @aivo/retention-svc run run:retention` with `DATABASE_URL` set.
- Kubernetes CronJob: run the same command in a small job container; schedule daily or weekly (daily recommended for tighter compliance).
- Other schedulers: any runner (GitHub Actions, Airflow, etc.) can invoke the script; ensure connectivity to the Postgres instance.

## Changing or adding a policy

1. Insert or update a row in `retention_policies` for the desired `resource_type`.
2. Use `tenant_id = NULL` for the global default, or a tenant ID string for an override.
3. New resource types require code updates: add to the resource enum and enforcement logic.

## Schema notes

- Default seeds are provided in `services/retention-svc/migrations/0001_retention_policies.sql`.
- Assumed tables for enforcement (minimum columns):
  - `events(id UUID, tenant_id TEXT NULL, created_at TIMESTAMPTZ, ...)`
  - `homework_uploads(id UUID, tenant_id TEXT NULL, created_at TIMESTAMPTZ, file_path TEXT, deleted_at TIMESTAMPTZ NULL, ...)`
  - `ai_incidents(id UUID, tenant_id TEXT NULL, created_at TIMESTAMPTZ, details JSONB, ...)`
