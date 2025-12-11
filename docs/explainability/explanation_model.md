# Explanation & Justification Data Model

> **Module:** Explainability  
> **Status:** Active  
> **Last Updated:** December 2024

## Overview

The Explanation & Justification system provides structured, auditable explanations for key platform decisions. Every significant action—content selection, difficulty adjustments, focus breaks, recommendations—generates an explanation that is:

- **Human-readable**: Suitable for display to parents and teachers
- **Machine-parsable**: Structured JSON for agents and analytics
- **Auditable**: Linked to sessions, learners, and AI calls
- **Privacy-aware**: Uses neutral, strength-based language

## When to Create Explanations

Create an `explanation_event` whenever the platform makes a decision that:

1. **Affects learning content**: Content selection, difficulty changes, learning path adjustments
2. **Triggers interventions**: Focus breaks, scaffolding decisions, policy enforcement
3. **Generates recommendations**: Module suggestions to parents/teachers
4. **Is visible to stakeholders**: Any decision a parent or teacher might ask "why?"

### Decision Points by Agent

| Agent | Actions to Explain |
|-------|-------------------|
| `LESSON_PLANNER` | Content selection, learning path adjustments, skill progression |
| `VIRTUAL_BRAIN` | Difficulty changes, adaptive tutoring decisions |
| `FOCUS_AGENT` | Break triggers, focus interventions |
| `RECOMMENDER` | Module recommendations to parents/teachers |
| `HOMEWORK_HELPER` | Scaffolding decisions, hint provision |
| `SYSTEM_POLICY` | Time limits, content filtering, policy enforcement |
| `BASELINE_AGENT` | Assessment item selection, placement decisions |

## Data Model

### `explanation_events` Table

```sql
CREATE TABLE explanation_events (
  id UUID PRIMARY KEY,
  
  -- Context
  tenant_id UUID NOT NULL,           -- Multi-tenant isolation
  learner_id UUID,                   -- Nullable for tenant-wide explanations
  user_id UUID,                      -- Recipient (parent/teacher)
  session_id UUID,                   -- Session context
  
  -- Classification
  source_type explanation_source_type NOT NULL,
  action_type explanation_action_type NOT NULL,
  
  -- Related Entity
  related_entity_type TEXT NOT NULL, -- e.g., 'LEARNING_OBJECT_VERSION'
  related_entity_id TEXT NOT NULL,   -- UUID or identifier
  
  -- Explanation Content
  summary_text TEXT NOT NULL,        -- Human-readable (1-2 sentences)
  details_json JSONB NOT NULL,       -- Machine-readable structure
  
  -- Traceability
  ai_call_log_id UUID,               -- Link to AI call (if AI-generated)
  template_id UUID,                  -- Template used (if any)
  confidence NUMERIC(4,3),           -- Confidence score (0-1)
  generator_version TEXT NOT NULL,   -- Version tracking
  
  created_at TIMESTAMPTZ NOT NULL
);
```

### `explanation_templates` Table

```sql
CREATE TABLE explanation_templates (
  id UUID PRIMARY KEY,
  source_type explanation_source_type NOT NULL,
  action_type explanation_action_type NOT NULL,
  template_key TEXT NOT NULL UNIQUE,     -- e.g., 'DIFFICULTY_DOWN_STRUGGLE'
  display_name TEXT NOT NULL,            -- Admin-friendly name
  template_text TEXT NOT NULL,           -- Text with {placeholders}
  placeholders_schema JSONB NOT NULL,    -- JSON Schema for validation
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

## Summary Text vs Details JSON

### `summary_text` (Human-Readable)

The `summary_text` field contains a brief, parent/teacher-friendly explanation:

```
"We chose easier fractions tasks based on recent performance."
"A short break was suggested after 25 minutes of focused practice."
"This module is recommended to help strengthen multiplication skills."
```

**Requirements:**
- 1-2 sentences maximum
- Neutral, strength-based language
- No sensitive diagnoses or defamatory language
- Actionable and informative

### `details_json` (Machine-Readable)

The `details_json` field contains structured data for agents and analytics:

```json
{
  "reasons": [
    {
      "code": "LOW_MASTERY",
      "weight": 0.7,
      "description": "Mastery score below threshold"
    },
    {
      "code": "RECENT_STRUGGLE",
      "weight": 0.3,
      "description": "3 incorrect attempts in last session"
    }
  ],
  "inputs": {
    "masteryScore": 0.42,
    "recentAccuracy": 0.33,
    "focusScore": 0.85,
    "sessionDurationMinutes": 25
  },
  "thresholds": {
    "masteryThreshold": 0.6,
    "accuracyThreshold": 0.5
  },
  "policyReferences": ["DIFFICULTY_ADAPTATION_V1"],
  "experimentKey": "difficulty_adjustment_experiment",
  "variantId": "aggressive_reduction"
}
```

**Standard Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `reasons` | Array | Contributing factors with codes, weights, descriptions |
| `inputs` | Object | Signal values used in the decision |
| `thresholds` | Object | Comparison thresholds |
| `policyReferences` | Array | Policy identifiers that applied |
| `experimentKey` | String | A/B test experiment (if applicable) |
| `variantId` | String | Experiment variant (if applicable) |

## Using Templates

Templates ensure consistent, vetted language across the platform.

### Template Structure

```
"We adjusted {subject} to a slightly easier level because {reason}."
```

Placeholders use `{variable}` syntax and are validated against `placeholders_schema`.

### Rendering a Template

```typescript
import { ExplanationTemplate, TemplateContext } from '@aivo/ts-types';

function renderTemplate(
  template: ExplanationTemplate,
  context: TemplateContext
): string {
  let text = template.templateText;
  
  for (const [key, value] of Object.entries(context)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  
  return text;
}

// Example
const summary = renderTemplate(template, {
  subject: 'fractions',
  learner_name: 'Alex',
  reason: 'recent practice showed some areas for growth'
});
// "We adjusted fractions to a slightly easier level because recent practice showed some areas for growth."
```

### Built-in Templates

| Template Key | Source | Action | Use Case |
|-------------|--------|--------|----------|
| `DIFFICULTY_DOWN_STRUGGLE` | VIRTUAL_BRAIN | DIFFICULTY_CHANGE | Reducing difficulty after struggle |
| `DIFFICULTY_UP_MASTERY` | VIRTUAL_BRAIN | DIFFICULTY_CHANGE | Increasing difficulty after mastery |
| `FOCUS_BREAK_TIME_BASED` | FOCUS_AGENT | FOCUS_BREAK_TRIGGER | Time-based break suggestion |
| `FOCUS_BREAK_ATTENTION` | FOCUS_AGENT | FOCUS_BREAK_TRIGGER | Attention-based break |
| `CONTENT_SKILL_GAP` | LESSON_PLANNER | CONTENT_SELECTION | Addressing skill gaps |
| `RECOMMEND_NEXT_SKILL` | RECOMMENDER | MODULE_RECOMMENDATION | Next skill recommendation |

## Integration with Other Systems

### AI Call Logs

When an explanation is generated by an AI agent, link it to the AI call:

```typescript
const explanation = await createExplanationEvent({
  tenantId,
  learnerId,
  sourceType: 'VIRTUAL_BRAIN',
  actionType: 'DIFFICULTY_CHANGE',
  relatedEntityType: 'SKILL',
  relatedEntityId: skillId,
  summaryText: renderedSummary,
  detailsJson: {
    reasons: [{ code: 'LOW_MASTERY', weight: 0.8, description: '...' }],
    inputs: { masteryScore: 0.42 }
  },
  aiCallLogId: aiCallLog.id  // Link to AI call
});
```

### Sessions

For session-scoped explanations:

```typescript
const explanation = await createExplanationEvent({
  tenantId,
  learnerId,
  sessionId,  // Current session
  sourceType: 'FOCUS_AGENT',
  actionType: 'FOCUS_BREAK_TRIGGER',
  // ...
});
```

### Experimentation

When A/B tests influence decisions:

```typescript
const explanation = await createExplanationEvent({
  // ...
  detailsJson: {
    reasons: [{ code: 'EXPERIMENT_VARIANT', weight: 1.0, description: 'A/B test variant applied' }],
    experimentKey: 'difficulty_adjustment_v2',
    variantId: 'aggressive'
  }
});
```

## Querying Explanations

### Common Query Patterns

**Learner Dashboard (Parent View):**
```sql
SELECT * FROM explanation_events
WHERE tenant_id = $1
  AND learner_id = $2
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;
```

**Audit Trail (Teacher/Admin):**
```sql
SELECT * FROM explanation_events
WHERE tenant_id = $1
  AND action_type = 'DIFFICULTY_CHANGE'
  AND created_at BETWEEN $2 AND $3
ORDER BY created_at DESC;
```

**Entity-Specific Explanations:**
```sql
SELECT * FROM explanation_events
WHERE related_entity_type = 'LEARNING_OBJECT_VERSION'
  AND related_entity_id = $1;
```

**Session Replay:**
```sql
SELECT * FROM explanation_events
WHERE session_id = $1
ORDER BY created_at;
```

## Indexing Strategy

| Index | Purpose |
|-------|---------|
| `(tenant_id, learner_id, created_at DESC)` | Learner dashboard queries |
| `(tenant_id, created_at DESC)` | Tenant-wide views |
| `(tenant_id, action_type, created_at DESC)` | Action type filtering |
| `(tenant_id, source_type, created_at DESC)` | Source debugging |
| `(related_entity_type, related_entity_id)` | Entity lookup |
| `(session_id, created_at)` | Session replay |
| `(ai_call_log_id)` | AI traceability |
| `GIN(details_json)` | JSONB queries |

## Privacy & Retention

### Privacy Requirements

1. **No Sensitive Diagnoses**: Never include medical, psychological, or educational diagnoses
2. **No Defamatory Language**: Use neutral, encouraging phrasing
3. **Strength-Based**: Focus on growth and progress, not deficits
4. **Multi-Tenant Isolation**: All queries must include `tenant_id`

**Good Examples:**
- "We chose easier tasks to help build confidence."
- "A break was suggested to help maintain focus."
- "Additional practice is recommended to strengthen understanding."

**Bad Examples (Never Use):**
- ❌ "The learner is struggling with basic concepts."
- ❌ "Performance indicates possible learning difficulties."
- ❌ "The student keeps making mistakes."

### Retention Policy

- **Classification**: Derived explanatory data (not raw PII)
- **Retention**: Per tenant data governance policy (typically 1-3 years)
- **DSR Compliance**: Subject to deletion requests via `learner_id`
- **Archival**: Consider moving to cold storage after 90 days

### Data Subject Requests

Explanations are included in DSR exports and deletions:

```sql
-- Export all explanations for a learner
SELECT * FROM explanation_events
WHERE tenant_id = $1 AND learner_id = $2;

-- Delete all explanations for a learner (DSR deletion)
DELETE FROM explanation_events
WHERE tenant_id = $1 AND learner_id = $2;
```

## TypeScript Types

Import from `@aivo/ts-types`:

```typescript
import {
  ExplanationEvent,
  ExplanationSourceType,
  ExplanationActionType,
  ExplanationDetails,
  ExplanationReason,
  CreateExplanationEventInput,
  ExplanationTemplate,
  TemplateContext,
  TEMPLATE_KEYS,
  REASON_CODES,
} from '@aivo/ts-types';
```

## Future Considerations

1. **Explanation Quality Scoring**: Track which explanations are helpful vs confusing
2. **Personalized Language**: Adjust tone/complexity based on recipient
3. **Multi-Language Support**: Template translations
4. **Explanation Chains**: Link related explanations for complex decisions
5. **Feedback Loop**: Allow recipients to mark explanations as unclear
