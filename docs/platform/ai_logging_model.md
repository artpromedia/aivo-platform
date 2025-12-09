# AI Logging & Incident Management Data Model

> **Status**: Draft  
> **Last Updated**: 2025-01-XX  
> **Author**: Principal Backend Architect – AI Safety & Compliance  
> **Migration**: `services/ai-orchestrator/migrations/0003_ai_logging_and_incidents.sql`

## Overview

This document describes the data model for AI call logging and incident management in the Aivo platform. The model supports:

- **Cost tracking** – Per-tenant, per-agent token and cost accounting
- **Safety monitoring** – Classification and flagging of content safety events
- **Compliance auditing** – Audit trail for regulatory requirements (COPPA, FERPA)
- **Operational observability** – Latency, error rates, model performance

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        AI Orchestrator                           │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Tutor   │  │ Baseline│  │ Safety  │  │Homework │  ...        │
│  │ Agent   │  │ Agent   │  │ Agent   │  │ Helper  │             │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       │            │            │            │                   │
│       └────────────┴────────────┴────────────┘                   │
│                         │                                        │
│                    ┌────▼────┐                                   │
│                    │  LLM    │                                   │
│                    │ Gateway │                                   │
│                    └────┬────┘                                   │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                  ┌───────▼───────┐
                  │ ai_call_logs  │──────┐
                  └───────────────┘      │
                          ▲              │
                          │ M:N         │
              ┌───────────┴──────┐       │
              │ai_incident_ai_calls│     │
              └───────────────────┘      │
                          │              │
                          ▼              │
                  ┌───────────────┐      │
                  │ ai_incidents  │◄─────┘
                  └───────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ Admin Console │
                  │  Dashboards   │
                  └───────────────┘
```

## Tables

### `ai_call_logs`

Records every AI/LLM invocation across all agents in the AI Orchestrator.

| Column                 | Type        | Description                                              |
| ---------------------- | ----------- | -------------------------------------------------------- |
| `id`                   | UUID        | Primary key                                              |
| `tenant_id`            | UUID        | **Required**. Multi-tenant isolation key                 |
| `agent_type`           | TEXT        | Agent enum: BASELINE, TUTOR, SAFETY, etc.                |
| `model_name`           | TEXT        | Model identifier (e.g., gpt-4o, claude-3-sonnet)         |
| `provider`             | TEXT        | LLM provider: OPENAI, ANTHROPIC, GEMINI                  |
| `version`              | TEXT        | Model version string                                     |
| `request_id`           | UUID        | Correlation ID for distributed tracing                   |
| `user_id`              | UUID        | User who triggered the call (nullable for system calls)  |
| `learner_id`           | UUID        | Learner context (nullable for non-learner calls)         |
| `session_id`           | UUID        | Learning session ID (nullable)                           |
| `use_case`             | TEXT        | Specific use case (e.g., BASELINE_ITEM_GENERATION)       |
| `prompt_summary`       | TEXT        | **Redacted** summary of prompt (max 500 chars, NO PII)   |
| `response_summary`     | TEXT        | **Redacted** summary of response (max 500 chars, NO PII) |
| `tokens_prompt`        | INT         | Input token count                                        |
| `tokens_completion`    | INT         | Output token count                                       |
| `cost_cents_estimate`  | INT         | Estimated cost in USD cents                              |
| `latency_ms`           | INT         | Round-trip latency in milliseconds                       |
| `safety_status`        | TEXT        | Quick status: OK, BLOCKED, NEEDS_REVIEW                  |
| `safety_label`         | TEXT        | Detailed classification: SAFE, LOW, MEDIUM, HIGH         |
| `safety_metadata_json` | JSONB       | Detailed safety analysis data                            |
| `status`               | TEXT        | Call status: SUCCESS, FAILURE, TIMEOUT                   |
| `created_at`           | TIMESTAMPTZ | When the call was made                                   |

**Key Indexes:**

- `(tenant_id, created_at DESC)` – Tenant dashboard queries
- `(agent_type, created_at DESC)` – Agent performance analysis
- `(safety_label, created_at DESC) WHERE IN ('MEDIUM', 'HIGH')` – Safety review queue
- `(learner_id, created_at DESC)` – Learner-specific audit
- `(session_id)` – Session replay

### `ai_incidents`

Represents safety, compliance, or operational incidents requiring review.

| Column                | Type        | Description                                    |
| --------------------- | ----------- | ---------------------------------------------- |
| `id`                  | UUID        | Primary key                                    |
| `tenant_id`           | UUID        | **Required**. Multi-tenant isolation key       |
| `severity`            | TEXT        | INFO, LOW, MEDIUM, HIGH, CRITICAL              |
| `category`            | TEXT        | SAFETY, PRIVACY, COMPLIANCE, PERFORMANCE, COST |
| `status`              | TEXT        | OPEN, INVESTIGATING, RESOLVED, DISMISSED       |
| `title`               | TEXT        | Short incident summary                         |
| `description`         | TEXT        | Detailed incident description                  |
| `first_seen_at`       | TIMESTAMPTZ | First occurrence timestamp                     |
| `last_seen_at`        | TIMESTAMPTZ | Most recent occurrence                         |
| `occurrence_count`    | INT         | Number of related events                       |
| `created_by_system`   | BOOLEAN     | TRUE = auto-created, FALSE = manual            |
| `created_by_user_id`  | UUID        | User who opened (if manual)                    |
| `assigned_to_user_id` | UUID        | Assigned reviewer                              |
| `resolved_at`         | TIMESTAMPTZ | Resolution timestamp                           |
| `resolved_by_user_id` | UUID        | User who resolved                              |
| `resolution_notes`    | TEXT        | Resolution explanation                         |
| `metadata_json`       | JSONB       | Flexible context data                          |
| `created_at`          | TIMESTAMPTZ | Record creation time                           |
| `updated_at`          | TIMESTAMPTZ | Last modification time                         |

**Key Indexes:**

- `(tenant_id, severity, status)` – Dashboard filtering
- `(category, status)` – Category-based workflow
- `(assigned_to_user_id, status)` – My Assignments view
- `(tenant_id, created_at DESC) WHERE status='OPEN' AND severity IN ('HIGH','CRITICAL')` – Critical alerts

### `ai_incident_ai_calls`

Links incidents to the AI calls that contributed to them (many-to-many).

| Column           | Type        | Description                           |
| ---------------- | ----------- | ------------------------------------- |
| `id`             | UUID        | Primary key                           |
| `incident_id`    | UUID        | FK to `ai_incidents.id`               |
| `ai_call_log_id` | UUID        | FK to `ai_call_logs.id`               |
| `link_reason`    | TEXT        | Why linked: TRIGGER, RELATED, CONTEXT |
| `created_at`     | TIMESTAMPTZ | When linked                           |

**Constraints:**

- `UNIQUE (incident_id, ai_call_log_id)` – No duplicate links

## Enumerations

### Agent Types

```
BASELINE, VIRTUAL_BRAIN, LESSON_PLANNER, TUTOR, FOCUS,
HOMEWORK_HELPER, PROGRESS, SAFETY
```

### Safety Labels

| Value    | Description                        |
| -------- | ---------------------------------- |
| `SAFE`   | No concerns detected               |
| `LOW`    | Minor flags, auto-approved         |
| `MEDIUM` | Requires async review              |
| `HIGH`   | Blocked, requires immediate review |

### Incident Severity

| Value      | SLA      | Description                             |
| ---------- | -------- | --------------------------------------- |
| `INFO`     | None     | Informational, no action needed         |
| `LOW`      | 5 days   | Minor issue, routine review             |
| `MEDIUM`   | 48 hours | Moderate concern, timely review         |
| `HIGH`     | 4 hours  | Serious issue, urgent review            |
| `CRITICAL` | 1 hour   | Critical safety event, immediate action |

### Incident Categories

| Value         | Description                             |
| ------------- | --------------------------------------- |
| `SAFETY`      | Content safety (harmful, inappropriate) |
| `PRIVACY`     | PII exposure, data leakage              |
| `COMPLIANCE`  | Regulatory violations (COPPA, FERPA)    |
| `PERFORMANCE` | Model failures, high latency            |
| `COST`        | Anomalous usage, budget alerts          |

### Incident Status

```
OPEN → INVESTIGATING → RESOLVED | DISMISSED
```

## Data Retention Policy

### ai_call_logs

- **Detailed records**: 90 days
- **After 90 days**: Archived to cold storage OR purged
- **Aggregated metrics**: Retained indefinitely via `v_daily_ai_call_stats`

### ai_incidents

- **Retention**: Indefinite (audit/compliance requirement)
- **Reason**: Legal evidence, pattern analysis, regulatory audits

### Implementation Notes

1. A scheduled job should archive/delete `ai_call_logs` records older than 90 days
2. Before deletion, ensure aggregated metrics are captured
3. Linked incidents preserve references via `ai_incident_ai_calls` – handle cascade appropriately

## PII Handling

### Critical Guidelines

⚠️ **The `prompt_summary` and `response_summary` fields must NEVER contain raw PII.**

These fields should contain only:

- Redacted summaries (e.g., "User asked about [MATH_TOPIC] homework")
- Category labels (e.g., "Generated 5 baseline items for reading comprehension")
- Structural descriptions (e.g., "Multi-step scaffold response with 3 hints")

### Redaction Rules

1. Names → `[NAME]`
2. Specific ages/grades → `[GRADE_LEVEL]`
3. Locations → `[LOCATION]`
4. Assignment specifics → `[ASSIGNMENT_CONTENT]`
5. Any identifiable student data → `[STUDENT_DATA]`

## Auto-Incident Creation Rules

The system automatically creates incidents based on these conditions:

| Condition                                                      | Severity | Category    |
| -------------------------------------------------------------- | -------- | ----------- |
| `safety_label = 'HIGH'`                                        | HIGH     | SAFETY      |
| Multiple `safety_label = 'MEDIUM'` from same learner in 1 hour | MEDIUM   | SAFETY      |
| `status = 'FAILURE'` rate > 5% in 5 minutes                    | HIGH     | PERFORMANCE |
| `latency_ms > 10000` for > 10 consecutive calls                | MEDIUM   | PERFORMANCE |
| Daily cost exceeds tenant budget by 150%                       | HIGH     | COST        |
| Daily cost exceeds tenant budget by 200%                       | CRITICAL | COST        |
| PII detected in response (via SafetyAgent)                     | CRITICAL | PRIVACY     |

## Example Queries

### Dashboard: Open Critical Incidents

```sql
SELECT * FROM ai_incidents
WHERE tenant_id = $1
  AND status IN ('OPEN', 'INVESTIGATING')
  AND severity IN ('HIGH', 'CRITICAL')
ORDER BY created_at DESC;
```

### Audit: All AI Calls for a Learner

```sql
SELECT * FROM ai_call_logs
WHERE tenant_id = $1
  AND learner_id = $2
  AND created_at BETWEEN $3 AND $4
ORDER BY created_at DESC;
```

### Cost Report: Daily Spend by Agent

```sql
SELECT * FROM v_daily_ai_call_stats
WHERE tenant_id = $1
  AND call_date BETWEEN $2 AND $3
ORDER BY call_date DESC, total_cost_cents DESC;
```

### Investigation: AI Calls Linked to Incident

```sql
SELECT c.*
FROM ai_call_logs c
JOIN ai_incident_ai_calls link ON link.ai_call_log_id = c.id
WHERE link.incident_id = $1
ORDER BY c.created_at;
```

## Integration Points

### AI Orchestrator

- **Write**: Every LLM call writes to `ai_call_logs`
- **SafetyAgent**: Populates `safety_label` and `safety_metadata_json`

### Admin Web (web-platform-admin)

- **Read**: Incident dashboard, call audit, cost reports
- **Write**: Incident status updates, assignments, resolution

### Scheduled Jobs

- **Retention**: Daily job to archive/purge old call logs
- **Aggregation**: Hourly job to update aggregated metrics
- **Alerting**: Real-time job to create incidents from rules

### Analytics Service

- **Read**: Aggregated views for reporting
- **Export**: Compliance reports for districts

## Migration Notes

### From Existing ai_call_logs

Migration `0003` uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to safely extend the existing table without data loss.

### Rollback

```sql
-- To rollback (CAUTION: data loss for new columns)
DROP VIEW IF EXISTS v_daily_ai_call_stats;
DROP VIEW IF EXISTS v_open_incidents_summary;
DROP TRIGGER IF EXISTS trg_ai_incidents_updated_at ON ai_incidents;
DROP FUNCTION IF EXISTS update_ai_incidents_updated_at();
DROP TABLE IF EXISTS ai_incident_ai_calls;
DROP TABLE IF EXISTS ai_incidents;
-- Note: Removing columns from ai_call_logs requires explicit ALTER TABLE DROP COLUMN
```

## Future Considerations

1. **Partitioning**: Consider partitioning `ai_call_logs` by `created_at` for better retention management
2. **Full-text search**: Add GIN index on `metadata_json` for complex queries
3. **Real-time streaming**: Consider CDC to stream incidents to alerting systems
4. **ML-based classification**: Auto-categorize incidents using historical patterns
