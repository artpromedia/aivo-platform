# Analytics & Reporting System

A comprehensive analytics platform for learning data with xAPI/Caliper compliance, real-time metrics, and multi-format reporting.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Event Source  │────▶│  Kinesis Stream  │────▶│   Redshift DW   │
│  (Apps/Mobile)  │     │  (Real-time)     │     │  (Analytics)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │                          │
                              ▼                          ▼
                        ┌──────────────┐         ┌──────────────┐
                        │  Redis Cache │         │  ETL Jobs    │
                        │  (Metrics)   │         │  (Daily)     │
                        └──────────────┘         └──────────────┘
```

## Components

### Event Tracking (`services/analytics-svc/src/events/`)
- **event.service.ts** - Core event ingestion with Kinesis streaming
- **xapi.service.ts** - xAPI 1.0.3 statement generation (FERPA compliant)
- **caliper.service.ts** - IMS Caliper 1.2 event support

### Query Service (`services/analytics-svc/src/query/`)
- **analytics-query.service.ts** - Redshift queries with Redis caching

### Reporting (`services/reports-svc/src/services/`)
- **report.service.ts** - PDF/Excel/CSV/HTML generation with S3 storage

### Dashboard (`libs/ui-web/src/components/analytics/`)
- **StudentProgressCard.tsx** - Individual student metrics
- **ClassOverviewChart.tsx** - Class-level visualizations

### ETL (`services/analytics-svc/src/etl/`)
- **daily-aggregation.job.ts** - Scheduled Redshift aggregations

## Event Types

| Category | Events |
|----------|--------|
| Learning | lesson_started, lesson_completed, skill_practiced |
| Assessment | assessment_started, question_answered, assessment_submitted |
| Engagement | session_started, session_ended, achievement_unlocked |
| System | error_occurred, feature_used |

## Report Formats

- **PDF** - Printable progress reports
- **Excel** - Data analysis with charts
- **CSV** - Raw data export
- **HTML** - Web-viewable reports

## Compliance

- ✅ **xAPI 1.0.3** - ADL Learning Record Store compatible
- ✅ **Caliper 1.2** - IMS Global Analytics
- ✅ **FERPA** - PII hashing & anonymization
- ✅ **GDPR** - Data privacy controls

## Quick Start

```bash
# Run analytics service
pnpm --filter @aivo/analytics-svc dev

# Run ETL job
pnpm --filter @aivo/analytics-svc run etl:daily
```

## Environment Variables

```env
AWS_REGION=us-east-1
KINESIS_STREAM_NAME=aivo-analytics-events
REDSHIFT_CLUSTER_ID=analytics-cluster
REDIS_URL=redis://localhost:6379
S3_REPORTS_BUCKET=aivo-reports
LRS_ENDPOINT=https://lrs.example.com
```
