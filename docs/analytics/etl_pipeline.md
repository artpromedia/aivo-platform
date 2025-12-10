# Analytics ETL Pipeline

This document describes the ETL (Extract, Transform, Load) pipeline for moving data from OLTP databases into the analytics warehouse.

## Overview

The ETL pipeline:

1. **Syncs dimension tables** from OLTP sources (tenants, learners, users, skills)
2. **Builds fact tables** by aggregating session events, homework data, and progress snapshots
3. **Tracks job runs** for monitoring and idempotency

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ETL Pipeline                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐        ┌──────────────┐       ┌──────────────┐  │
│   │  OLTP Source │ ──────▶│  ETL Jobs    │──────▶│  Warehouse   │  │
│   │  (Postgres)  │        │  (Node.js)   │       │  (Postgres)  │  │
│   └──────────────┘        └──────────────┘       └──────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│                          ┌──────────────┐                          │
│                          │ etl_job_runs │                          │
│                          │  (tracking)  │                          │
│                          └──────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Jobs

### Dimension Sync Jobs

| Job                | Schedule | Description                      |
| ------------------ | -------- | -------------------------------- |
| `sync_dim_tenant`  | Hourly   | Upserts tenants with SCD Type 2  |
| `sync_dim_learner` | Hourly   | Upserts learners with SCD Type 2 |
| `sync_dim_user`    | Hourly   | Upserts users (teachers/parents) |
| `sync_dim_subject` | Daily    | Static subject configuration     |
| `sync_dim_skill`   | Daily    | Skills from curriculum           |

### Fact Build Jobs

| Job                                | Schedule  | Description                    |
| ---------------------------------- | --------- | ------------------------------ |
| `build_fact_sessions`              | Daily 2am | Session-level aggregates       |
| `build_fact_focus_events`          | Daily 2am | Individual focus events        |
| `build_fact_homework_events`       | Daily 2am | Homework submission aggregates |
| `build_fact_learning_progress`     | Daily 3am | Daily skill mastery snapshots  |
| `build_fact_recommendation_events` | Daily 2am | AI recommendation tracking     |

## Usage

### CLI Commands

```bash
# Run full pipeline for yesterday
pnpm etl:run

# Run with specific date
pnpm etl run --date=2025-01-15

# Force re-run (ignore previous completion)
pnpm etl run --date=2025-01-15 --force

# Sync dimensions only
pnpm etl:dimensions

# Build facts only
pnpm etl:facts --date=2025-01-15

# Run specific job
pnpm etl run-job --job=build_fact_sessions --date=2025-01-15

# Check job status
pnpm etl:status
```

### Programmatic Usage

```typescript
import {
  runAllDimensionSyncs,
  runAllFactBuilds,
  jobBuildFactSessions,
  parseDate,
} from './etl/index.js';

// Run all dimensions
await runAllDimensionSyncs();

// Run all facts for a date
const targetDate = parseDate('2025-01-15');
await runAllFactBuilds(targetDate);

// Run single job
const result = await jobBuildFactSessions(targetDate, false);
console.log(`Processed ${result.rowsProcessed} rows`);
```

## Idempotency

The pipeline ensures idempotent execution through two strategies:

### 1. Date-Partitioned Delete + Insert (Fact Tables)

```sql
-- For fact tables, delete existing data for target date before inserting
DELETE FROM fact_sessions WHERE date_key = 20250115;
INSERT INTO fact_sessions (date_key, ...) VALUES (20250115, ...);
```

### 2. Job Run Tracking

```sql
-- Check if job already completed for date
SELECT 1 FROM etl_job_runs
WHERE job_name = 'build_fact_sessions'
  AND target_date = '2025-01-15'
  AND status = 'SUCCESS';
```

If a job has already succeeded for a date, it's skipped unless `--force` is used.

## Schema

### Dimension Tables (SCD Type 2)

```sql
-- Example: dim_tenant
CREATE TABLE dim_tenant (
  tenant_key SERIAL PRIMARY KEY,       -- Surrogate key
  tenant_id UUID NOT NULL,             -- Business key
  tenant_name VARCHAR(255),
  is_active BOOLEAN,
  effective_from TIMESTAMPTZ,          -- Version start
  effective_to TIMESTAMPTZ,            -- Version end (null = current)
  is_current BOOLEAN                   -- Quick filter for current records
);
```

### Fact Tables

```sql
-- Example: fact_sessions
CREATE TABLE fact_sessions (
  session_key SERIAL PRIMARY KEY,
  session_id UUID UNIQUE,              -- Deduplication key
  date_key INTEGER NOT NULL,           -- Partition key
  tenant_key INTEGER REFERENCES dim_tenant,
  learner_key INTEGER REFERENCES dim_learner,
  -- Measures
  duration_seconds INTEGER,
  activities_completed INTEGER,
  correct_responses INTEGER,
  -- Timestamps
  started_at TIMESTAMPTZ
);
```

### Job Tracking

```sql
CREATE TABLE etl_job_runs (
  id UUID PRIMARY KEY,
  job_name VARCHAR(100),
  run_date DATE,
  target_date DATE,
  status VARCHAR(20),  -- RUNNING, SUCCESS, FAILED, SKIPPED
  rows_processed INTEGER,
  rows_inserted INTEGER,
  rows_updated INTEGER,
  rows_deleted INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

## Monitoring

### Job Run Dashboard Query

```sql
-- Recent job runs
SELECT
  job_name,
  target_date,
  status,
  rows_processed,
  duration_ms,
  error_message
FROM etl_job_runs
ORDER BY started_at DESC
LIMIT 50;

-- Daily job success rate
SELECT
  run_date,
  COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_count,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count,
  COUNT(*) as total
FROM etl_job_runs
WHERE run_date >= CURRENT_DATE - 7
GROUP BY run_date
ORDER BY run_date DESC;
```

### Alerts

Set up alerts for:

- Jobs not completing within expected time window
- Failed jobs (status = 'FAILED')
- Significant drop in rows_processed (data quality)

## Environment Variables

```bash
# OLTP source database (read-only for ETL)
OLTP_DATABASE_URL=postgresql://user:pass@oltp-host:5432/aivo

# Warehouse database (read-write for ETL)
WAREHOUSE_DATABASE_URL=postgresql://user:pass@warehouse-host:5432/analytics

# Optional: Enable debug logging
ETL_DEBUG=true
```

## Scheduling with Cron

Example crontab for running ETL jobs:

```cron
# Sync dimensions hourly
0 * * * * cd /app && pnpm etl sync-dimensions >> /var/log/etl/dimensions.log 2>&1

# Build facts daily at 2am UTC
0 2 * * * cd /app && pnpm etl build-facts >> /var/log/etl/facts.log 2>&1

# Full pipeline at 3am UTC (with --force for daily refresh)
0 3 * * * cd /app && pnpm etl run --force >> /var/log/etl/full.log 2>&1
```

## Scheduling with Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etl-daily
spec:
  schedule: '0 2 * * *' # 2am UTC daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: etl
              image: aivo/analytics-svc:latest
              command: ['pnpm', 'etl', 'run']
              env:
                - name: OLTP_DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: db-secrets
                      key: oltp-url
                - name: WAREHOUSE_DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: db-secrets
                      key: warehouse-url
          restartPolicy: OnFailure
```

## Backfilling Historical Data

To backfill facts for a date range:

```bash
# Backfill last 30 days
for i in {1..30}; do
  DATE=$(date -d "$i days ago" +%Y-%m-%d)
  pnpm etl build-facts --date=$DATE --force
done
```

Or programmatically:

```typescript
import { dateRange, parseDate, runAllFactBuilds } from './etl/index.js';

const start = parseDate('2025-01-01');
const end = parseDate('2025-01-31');

for (const date of dateRange(start, end)) {
  await runAllFactBuilds(date, true);
}
```
