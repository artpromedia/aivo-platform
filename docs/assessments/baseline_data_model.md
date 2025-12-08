# Baseline Assessment Data Model

## Overview

The baseline assessment captures a learner's initial skill levels across five domains (ELA, Math, Science, Speech, SEL) with five items each (25 total). It supports one retest (up to two attempts) and seeds the Virtual Brain skill graph.

## Entity Relationship

```
Learner (external)
    │
    └─▶ BaselineProfile (per tenant, per learner)
            │
            ├─ status (NOT_STARTED → IN_PROGRESS → COMPLETED → RETEST_ALLOWED → FINAL_ACCEPTED)
            ├─ attempt_count (0–2)
            ├─ final_attempt_id (→ selected attempt once accepted)
            │
            └─▶ BaselineAttempt (1 or 2 per profile)
                    │
                    ├─ attempt_number (1 = initial, 2 = retest)
                    ├─ retest_reason_type / notes (populated on attempt 2)
                    ├─ domain_scores_json  (per domain level + confidence)
                    ├─ overall_estimate_json (global level estimate)
                    │
                    ├─▶ BaselineItem (25 items: 5 domains × 5 each)
                    │       │
                    │       ├─ domain, grade_band, sequence_index
                    │       ├─ prompt_json, correct_answer_json, ai_metadata_json
                    │       │
                    │       └─▶ BaselineResponse (learner's answer)
                    │               ├─ response_json
                    │               ├─ is_correct, score, latency_ms
                    │
                    └─▶ BaselineSkillEstimate (per skill code)
                            ├─ skill_code (e.g., ELA_PHONEMIC_AWARENESS)
                            ├─ domain, estimated_level, confidence
```

## Status Lifecycle

1. **NOT_STARTED** – profile exists, no attempt begun.
2. **IN_PROGRESS** – attempt started, items served.
3. **COMPLETED** – attempt finished, scores computed.
4. **RETEST_ALLOWED** – educator/system flags profile for a second attempt (with reason).
5. **FINAL_ACCEPTED** – final_attempt_id set, skill estimates ready for Virtual Brain.

## Retest Flow

- Retest is attempt_number = 2.
- On creating attempt 2, populate `retest_reason_type` and optional `retest_reason_notes`.
- After scoring, system or educator marks profile as FINAL_ACCEPTED and sets `final_attempt_id`.

## Query Patterns

### Baseline Service (resume/score)

```sql
-- Find or create profile
SELECT * FROM baseline_profiles WHERE tenant_id = $1 AND learner_id = $2;

-- Get latest attempt and items
SELECT a.*, i.*
FROM baseline_attempts a
JOIN baseline_items i ON i.baseline_attempt_id = a.id
WHERE a.baseline_profile_id = $profile AND a.attempt_number = (
  SELECT MAX(attempt_number) FROM baseline_attempts WHERE baseline_profile_id = $profile
)
ORDER BY i.sequence_index;
```

### Virtual Brain Service (seed skill graph)

```sql
-- Read skill estimates for final attempt
SELECT se.*
FROM baseline_skill_estimates se
JOIN baseline_profiles p ON p.final_attempt_id = se.baseline_attempt_id
WHERE p.tenant_id = $1 AND p.learner_id = $2;
```

## Indexes

- `baseline_profiles(tenant_id, learner_id)` – fast lookup per learner.
- `baseline_attempts(baseline_profile_id, attempt_number)` – resume/select attempt.
- `baseline_items(baseline_attempt_id, domain, sequence_index)` – item retrieval.
- `baseline_responses(learner_id, baseline_item_id)` – response lookup.
- `baseline_skill_estimates(baseline_attempt_id, skill_code)` – skill seed lookup.

## Files

- Migration: `services/assessment-svc/prisma/migrations/20251207_baseline_assessment/migration.sql`
- Prisma schema: `services/assessment-svc/prisma/schema.prisma`
