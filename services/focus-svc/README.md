# Focus Monitor & Regulation Service

Focus monitoring and regulation engine for the Aivo Learning Platform. This service supports neurodiverse learners with gentle focus monitoring and age-appropriate regulation breaks.

## Overview

The Focus Service:

- Consumes lightweight telemetry from client apps
- Detects disengagement patterns using a rule-based engine
- Recommends age-appropriate regulation activities (breathing, movement, stretching)
- Tracks focus breaks through session events
- Keeps all content generic and non-clinical

## Port

`4026` (default)

## API Endpoints

### Health Check

```
GET /health
```

### Focus Telemetry

```
POST /focus/ping
```

Accept periodic focus telemetry from client apps.

**Request Body:**

```json
{
  "sessionId": "uuid",
  "learnerId": "uuid",
  "activityId": "current-activity-123",
  "idleMs": 15000,
  "appInBackground": false,
  "selfReportedMood": "focused",
  "rapidExit": false
}
```

**Response:**

```json
{
  "received": true,
  "detection": {
    "detected": false,
    "reasons": [],
    "confidence": 0,
    "suggestedIntervention": "none"
  }
}
```

### Regulation Recommendation

```
POST /focus/recommendation
```

Get an age-appropriate regulation activity recommendation.

**Request Body:**

```json
{
  "sessionId": "uuid",
  "learnerId": "uuid",
  "context": {
    "currentActivityId": "activity-123",
    "gradeBand": "K5",
    "mood": "frustrated",
    "focusLossReasons": ["extended_idle", "self_reported_frustrated"]
  }
}
```

**Response:**

```json
{
  "activityType": "breathing",
  "title": "Balloon Breaths",
  "description": "Let's blow up an imaginary balloon! Breathe in slowly through your nose (1...2...3), then breathe out slowly through your mouth like you're blowing up a balloon (1...2...3...4). Do this 3 times!",
  "estimatedDurationSeconds": 30,
  "gradeBand": "K5",
  "source": "catalog"
}
```

### List Activities

```
GET /focus/activities/:gradeBand
```

Get all available regulation activities for a grade band.

**Response:**

```json
{
  "gradeBand": "K5",
  "activities": [
    {
      "activityType": "breathing",
      "title": "Balloon Breaths",
      "description": "...",
      "estimatedDurationSeconds": 30
    }
  ]
}
```

### Break Lifecycle

```
POST /focus/break-started
```

Log when a learner starts a regulation break.

```
POST /focus/break-complete
```

Log when a learner completes a regulation break.

**Request Body:**

```json
{
  "sessionId": "uuid",
  "learnerId": "uuid",
  "activityType": "breathing",
  "durationSeconds": 45,
  "helpfulnessRating": 4
}
```

### Mood Report

```
POST /focus/mood-report
```

Record explicit mood changes from learner.

**Request Body:**

```json
{
  "sessionId": "uuid",
  "learnerId": "uuid",
  "mood": "frustrated",
  "context": "during_math_activity"
}
```

### Analyze Session

```
POST /focus/analyze
```

Manually trigger focus analysis for a session.

## Focus Detection Engine

The detection engine analyzes recent focus pings and applies 5 rules:

### Rule 1: Extended Idle

- Triggers if multiple consecutive pings have `idleMs > threshold` (default 30s)
- Confidence: 0.4-0.6

### Rule 2: Rapid Activity Switching

- Triggers if learner switches between >3 activities within 2 minutes
- Confidence: 0.3-0.6

### Rule 3: Self-Reported Mood

- Triggers on `selfReportedMood` = "frustrated" or "tired"
- Confidence: 0.4-0.5

### Rule 4: App Backgrounding

- Triggers if >50% of recent pings have `appInBackground: true`
- Confidence: 0.3-0.5

### Rule 5: Rapid Exit Attempts

- Triggers if learner attempts to exit multiple times
- Confidence: 0.3-0.5

### Detection Result

```typescript
{
  detected: boolean;        // true if any rule triggered with confidence >= 0.3
  reasons: string[];        // Which rules triggered
  confidence: number;       // 0-1 combined confidence
  suggestedIntervention: 'none' | 'light_prompt' | 'regulation_break';
}
```

## Regulation Catalog

Age-appropriate activities by grade band:

### K5 (Kindergarten - 5th Grade)

- **Balloon Breaths** (30s) - Breathing exercise
- **Animal Stretch** (45s) - Movement/stretching
- **Squeeze & Release** (30s) - Sensory calming

### G6_8 (6th - 8th Grade)

- **Box Breathing** (60s) - Structured breathing
- **Desk Stretches** (45s) - Simple stretches
- **5-4-3-2-1 Grounding** (60s) - Mindfulness

### G9_12 (9th - 12th Grade)

- **4-7-8 Breathing** (90s) - Advanced breathing
- **Progressive Relaxation** (120s) - Body scan
- **Mindful Minute** (60s) - Focused awareness

## Session Events

The service emits these events to session-svc:

| Event Type                 | When                                |
| -------------------------- | ----------------------------------- |
| `FOCUS_PING`               | Each telemetry ping (optional)      |
| `FOCUS_LOSS_DETECTED`      | Detection engine triggers           |
| `FOCUS_INTERVENTION_SHOWN` | Recommendation shown to learner     |
| `FOCUS_BREAK_STARTED`      | Learner accepts regulation activity |
| `FOCUS_BREAK_ENDED`        | Learner completes activity          |

## Configuration

| Variable                 | Description                  | Default                 |
| ------------------------ | ---------------------------- | ----------------------- |
| `PORT`                   | Server port                  | `4026`                  |
| `LOG_LEVEL`              | Logging level                | `info`                  |
| `IDLE_THRESHOLD_MS`      | Idle time threshold          | `30000`                 |
| `RAPID_SWITCH_THRESHOLD` | Activity switches to trigger | `3`                     |
| `RAPID_SWITCH_WINDOW_MS` | Time window for switches     | `120000`                |
| `SESSION_SVC_URL`        | Session service URL          | `http://localhost:4020` |
| `SESSION_SVC_API_KEY`    | Internal API key             | -                       |
| `AI_ORCHESTRATOR_URL`    | AI service URL (future)      | `http://localhost:4010` |

## AI Integration (Future)

The service has a stub for AI orchestrator integration:

```typescript
// In regulationCatalog.ts
export async function getAiRecommendation(
  context: RecommendationContext
): Promise<RegulationActivity | null> {
  // TODO: Call ai-orchestrator FOCUS agent
  // const response = await aiOrchestratorClient.generate({
  //   agentType: 'FOCUS',
  //   payload: {
  //     gradeBand: context.gradeBand,
  //     mood: context.mood,
  //     focusLossReasons: context.focusLossReasons,
  //   }
  // });
  return null; // Falls back to catalog
}
```

## Safety Constraints

- ✅ All content is generic and non-clinical
- ✅ No diagnosis or mental health counseling
- ✅ Activities are simple and age-appropriate
- ✅ Learner can always skip or dismiss

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Tests

- **42 passing tests** covering:
  - Focus detection engine (16 tests)
  - Regulation catalog (11 tests)
  - API endpoints (15 tests)
