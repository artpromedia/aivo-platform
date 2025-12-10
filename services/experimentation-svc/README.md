# Experimentation Service

MVP experimentation framework for A/B testing focus strategies, UI flows, recommendations, and other platform features.

## Features

- **Experiment Definitions**: Create experiments with multiple variants and allocation percentages
- **Deterministic Assignment**: Hash-based assignment for consistent user experience
- **Exposure Logging**: Track when users actually see experimental variants
- **Tenant Opt-Out**: Respects tenant policies via Policy Engine integration
- **Analytics Integration**: Exposure data flows to analytics warehouse

## Experiment Scopes

| Scope     | Description                                                            |
| --------- | ---------------------------------------------------------------------- |
| `TENANT`  | Assignment at tenant level (all learners in a tenant get same variant) |
| `LEARNER` | Assignment at individual learner level                                 |

## Experiment Status Lifecycle

```
DRAFT → RUNNING → PAUSED → RUNNING → COMPLETED
          ↓
       COMPLETED
```

## API Endpoints

### Experiments

| Method | Path                        | Description                          |
| ------ | --------------------------- | ------------------------------------ |
| POST   | `/experiments`              | Create new experiment with variants  |
| GET    | `/experiments`              | List all experiments                 |
| GET    | `/experiments/:key`         | Get experiment by key                |
| POST   | `/experiments/:id/start`    | Start experiment (DRAFT → RUNNING)   |
| POST   | `/experiments/:id/pause`    | Pause experiment (RUNNING → PAUSED)  |
| POST   | `/experiments/:id/resume`   | Resume experiment (PAUSED → RUNNING) |
| POST   | `/experiments/:id/complete` | Complete experiment                  |

### Assignment & Exposure

| Method | Path                              | Description                               |
| ------ | --------------------------------- | ----------------------------------------- |
| GET    | `/assignment/:experimentKey`      | Get variant assignment for tenant/learner |
| GET    | `/assignments`                    | Get all assignments for tenant/learner    |
| POST   | `/exposures`                      | Log exposure event                        |
| GET    | `/exposures/:experimentKey`       | Get exposures for experiment              |
| GET    | `/exposures/:experimentKey/stats` | Get exposure statistics                   |

### Agent Integration

| Method | Path                  | Description                                |
| ------ | --------------------- | ------------------------------------------ |
| GET    | `/agent/focus/config` | Get Focus Agent experiment configuration   |
| GET    | `/agent/brain/config` | Get Virtual Brain experiment configuration |

## Assignment Algorithm

Uses deterministic hashing for consistent assignments:

```
hash = SHA256(experimentKey + ":" + subjectId)
bucket = (first 8 bytes as uint64) / MAX_UINT64  // 0.0 to 1.0
variant = first variant where cumulative_allocation >= bucket
```

This ensures:

- Same subject always gets same variant (no database lookup needed)
- Assignment survives restarts and deployments
- Uniform distribution across variants

## Agent Integration

### Focus Agent

The Focus Agent calls `/agent/focus/config` to get experiment configurations for:

- Session duration experiments (`focus_session_length`)
- Break interval experiments (`focus_break_interval`)
- Adaptive difficulty experiments (`focus_adaptive_difficulty`)

### Virtual Brain

The Virtual Brain calls `/agent/brain/config` to get experiment configurations for:

- Response style experiments (`brain_response_style`)
- Explanation depth experiments (`brain_explanation_depth`)
- Hint progression experiments (`brain_hint_progression`)

### Known Experiment Keys

| Key                         | Scope   | Description                  |
| --------------------------- | ------- | ---------------------------- |
| `focus_session_length`      | LEARNER | Focus session duration       |
| `focus_break_interval`      | LEARNER | Time between breaks          |
| `focus_adaptive_difficulty` | LEARNER | Difficulty adjustment rate   |
| `brain_response_style`      | TENANT  | Virtual brain response tone  |
| `brain_explanation_depth`   | LEARNER | Detail level in explanations |
| `brain_hint_progression`    | LEARNER | Hint revealing strategy      |

## Policy Integration

The service checks `features.experimentation_enabled` policy before assigning variants:

```typescript
const policy = await policyEngine.getEffectivePolicy(tenantId);
if (!policy.features.experimentation_enabled) {
  return { variantKey: 'control', reason: 'TENANT_OPT_OUT' };
}
```

## Database Tables

- `experiments` - Experiment definitions
- `experiment_variants` - Variant configurations
- `experiment_assignments` - Cached assignments (optional, for audit)
- `experiment_exposures` - Exposure events

## Environment Variables

| Variable        | Description                    | Default   |
| --------------- | ------------------------------ | --------- |
| `PORT`          | HTTP port                      | `3018`    |
| `HOST`          | Bind address                   | `0.0.0.0` |
| `DATABASE_URL`  | PostgreSQL connection string   | -         |
| `WAREHOUSE_URL` | Analytics warehouse connection | -         |
| `POLICY_DB_URL` | Policy engine database         | -         |

## Running

```bash
# Development
pnpm dev

# Build
pnpm build

# Start production
pnpm start

# Run tests
pnpm test
```

## Example Usage

### Create an Experiment

```bash
curl -X POST http://localhost:3018/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "key": "focus_session_length",
    "name": "Focus Session Length Test",
    "description": "Test longer vs shorter focus sessions",
    "scope": "LEARNER",
    "variants": [
      { "key": "control", "allocation": 0.5, "config": { "sessionMinutes": 25 } },
      { "key": "extended", "allocation": 0.5, "config": { "sessionMinutes": 45 } }
    ]
  }'
```

### Get Assignment

```bash
curl "http://localhost:3018/assignment/focus_session_length?tenantId=xxx&learnerId=yyy"
```

### Log Exposure

```bash
curl -X POST http://localhost:3018/exposures \
  -H "Content-Type: application/json" \
  -d '{
    "experimentKey": "focus_session_length",
    "tenantId": "xxx",
    "learnerId": "yyy",
    "variantKey": "extended",
    "featureArea": "focus_agent"
  }'
```
