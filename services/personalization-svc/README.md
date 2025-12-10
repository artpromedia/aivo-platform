# Personalization Service

**Personalization Signal Layer** for adaptive learning feedback loops.

## Overview

The personalization service derives signals from learner behavior data and makes them available to AI agents (Virtual Brain, Lesson Planner) for personalized decision-making. It implements a closed feedback loop where recommendation acceptance rates inform future signal thresholds.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ANALYTICS WAREHOUSE                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │fact_sessions│ │ fact_focus_ │ │fact_homework│ │fact_recommendation_│   │
│  │             │ │   events    │ │   _events   │ │      events        │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Signal Generation   │ (Daily Batch Job)
                    │   - Engagement        │
                    │   - Difficulty        │
                    │   - Focus             │
                    │   - Homework          │
                    │   - Recommendations   │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │ personalization_      │
                    │      signals          │
                    └───────────┬───────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
    ┌───────▼───────┐   ┌───────▼───────┐   ┌──────▼──────┐
    │ Virtual Brain │   │Lesson Planner │   │ Focus Agent │
    │    Agent      │   │    Agent      │   │             │
    └───────┬───────┘   └───────┬───────┘   └──────┬──────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Decision Logs       │
                    │ (Transparency/Audit)  │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │ Recommendation        │
                    │    Feedback           │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │ Threshold Adjustment  │ (Feedback Loop)
                    │    Analysis           │
                    └───────────────────────┘
```

## Signal Types

| Type | Description | Source |
|------|-------------|--------|
| `ENGAGEMENT` | Session frequency, duration patterns | fact_sessions |
| `DIFFICULTY` | Mastery levels, struggle indicators | fact_learning_progress |
| `FOCUS` | Break frequency, intervention success | fact_focus_events |
| `HOMEWORK` | Completion rates, hint usage | fact_homework_events |
| `MODULE_UPTAKE` | Content preference patterns | fact_sessions |
| `PREFERENCE` | Time-of-day, subject preferences | fact_sessions |
| `PROGRESSION` | Learning velocity, trajectory | fact_learning_progress |
| `RECOMMENDATION` | Acceptance rates by type | fact_recommendation_events |

## API Endpoints

### GET `/personalization/learners/:learnerId/signals`

Returns personalization signals for a learner.

**Query Parameters:**
- `recentDays` (number, default: 7) - Lookback window
- `signalTypes` (string) - Comma-separated filter (e.g., "ENGAGEMENT,FOCUS")
- `minConfidence` (number, default: 0) - Minimum confidence threshold
- `includeExpired` (boolean, default: false) - Include expired signals

**Response:**
```json
{
  "learnerId": "learner-123",
  "fromDate": "2025-01-08",
  "toDate": "2025-01-15",
  "signals": [
    {
      "id": "signal-uuid",
      "signalType": "ENGAGEMENT",
      "signalKey": "LOW_ENGAGEMENT",
      "signalValue": {
        "value": 1.5,
        "threshold": 3,
        "direction": "below"
      },
      "confidence": 0.75,
      "source": "ANALYTICS_ETL"
    }
  ],
  "signalsByType": {
    "ENGAGEMENT": [...]
  },
  "count": 5
}
```

### GET `/personalization/learners/:learnerId/decision-log`

Returns decision history for transparency/debugging.

### POST `/personalization/recommendation-feedback`

Records recommendation acceptance/rejection for feedback loop.

### PATCH `/personalization/decisions/:decisionId/outcome`

Updates decision outcome (accepted/declined/ignored).

## Agent Contracts

### Virtual Brain Integration

```typescript
import { prepareVirtualBrainInput, processVirtualBrainOutput } from './agentContracts';

// Get signals for decision-making
const input = await prepareVirtualBrainInput(tenantId, learnerId, {
  sessionId: 'session-123',
  currentSubject: 'MATH',
  timeOfDay: 'morning',
  dayOfWeek: 1,
});

// Use input.signalSummary for quick decisions:
// - engagementLevel: 'LOW' | 'NORMAL' | 'HIGH'
// - difficultyAdjustments: { MATH: 'EASIER', ... }
// - focusProfile: { needsMoreBreaks, avgBreakDuration }

// After making a decision, log it:
const decisionId = await processVirtualBrainOutput(input, {
  agentVersion: '1.0.0',
  recommendations: {
    adjustDifficulty: { domain: 'MATH', action: 'EASIER' },
  },
  reasoning: 'Learner showing struggle signals in math',
});
```

### Lesson Planner Integration

```typescript
import { prepareLessonPlannerInput, processLessonPlannerOutput } from './agentContracts';

const input = await prepareLessonPlannerInput(tenantId, learnerId, {
  targetDate: '2025-01-16',
  availableMinutes: 45,
  subjectConstraints: ['MATH', 'ELA'],
});

// Use input.constraints for content selection:
// - difficultyBySubject: recommended difficulty per subject
// - preferredModules: high-uptake modules
// - avoidModules: low-uptake modules
// - prioritizeEngaging: true if low recommendation acceptance
```

## Signal Generation Job

The signal generation job runs daily as part of the analytics ETL pipeline.

### Running Manually

```bash
# Run with defaults (today, 7-day lookback)
npx tsx src/job.ts

# Run for specific date
npx tsx src/job.ts --date 2025-01-15 --lookback 14

# Skip cleanup of expired signals
npx tsx src/job.ts --no-cleanup
```

### Integration with Analytics ETL

Add to `analytics-svc/src/etl/jobs/facts.ts`:

```typescript
// After fact table ETL completes
await fetch('http://personalization-svc:3000/internal/run-job', {
  method: 'POST',
  headers: { 'X-Service-Token': SERVICE_TOKEN },
});
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `HOST` | 0.0.0.0 | HTTP server host |
| `LOG_LEVEL` | info | Logging level |
| `DATABASE_URL` | - | Main database connection |
| `WAREHOUSE_DATABASE_URL` | - | Warehouse read connection |
| `THRESHOLD_LOW_ENGAGEMENT` | 3.0 | Sessions/week for low engagement |
| `THRESHOLD_STRUGGLE_MASTERY` | 0.4 | Mastery below = struggling |
| `THRESHOLD_READY_CHALLENGE` | 0.75 | Mastery above = ready for challenge |

See `src/config.ts` for full threshold configuration.

## Database Schema

See `prisma/schema.sql` for table definitions:

- `personalization_signals` - Computed signals
- `personalization_decision_logs` - Decision audit trail
- `recommendation_feedback` - Acceptance tracking
- `threshold_overrides` - Per-tenant/learner customization

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage
```

## Transparency & Guardrails

1. **Decision Logging**: Every agent decision is logged with:
   - Input signals used
   - Output decision
   - Human-readable reasoning

2. **Configurable Thresholds**: All signal thresholds can be:
   - Configured via environment variables
   - Overridden per-tenant or per-learner
   - Adjusted based on feedback loop analysis

3. **Feedback Loop**: Low recommendation acceptance rates trigger:
   - Automatic threshold adjustment suggestions
   - Alerts for review

4. **No Black Box**: Signals are rule-based and explainable, not ML predictions.
