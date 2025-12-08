# Session & Event Model

> Unified tracking system for learning sessions and events across the Aivo Learning Platform.

## Overview

The Session & Event model provides a **unified, flexible architecture** for tracking all types of learning interactions:

- **Learning Sessions** (Today's Plan) - Scheduled learning activities
- **Homework Helper Sessions** - AI-assisted homework interactions
- **Focus Events** - Engagement, disengagement, breaks, regulation
- **SEL Sessions** - Social-emotional learning (future)
- **Baseline/Assessment Sessions** - Diagnostic and progress assessments

This model feeds **analytics dashboards** and **Virtual Brain updates**, enabling personalized learning recommendations.

---

## Core Concepts

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SESSION LIFECYCLE                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────┐     ┌──────────────┐     ┌───────────────┐               │
│   │  CREATE  │────▶│   ACTIVE     │────▶│   COMPLETE    │               │
│   └──────────┘     └──────────────┘     └───────────────┘               │
│        │                  │                     │                        │
│        ▼                  ▼                     ▼                        │
│  SESSION_STARTED    Events stream        SESSION_ENDED                  │
│  event emitted      (activities,         event emitted                  │
│                     focus, etc.)         duration_ms set                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Model

#### Sessions Table

| Field           | Type      | Description                               |
| --------------- | --------- | ----------------------------------------- |
| `id`            | UUID      | Primary key                               |
| `tenant_id`     | UUID      | Multi-tenant isolation                    |
| `learner_id`    | UUID      | The learner this session belongs to       |
| `session_type`  | Enum      | LEARNING, HOMEWORK, BASELINE, etc.        |
| `origin`        | Enum      | Where session started (MOBILE, WEB, etc.) |
| `started_at`    | Timestamp | When session began                        |
| `ended_at`      | Timestamp | When session completed (nullable)         |
| `duration_ms`   | BigInt    | Computed duration in milliseconds         |
| `metadata_json` | JSONB     | Flexible metadata for the session         |

#### Session Events Table

| Field           | Type      | Description                       |
| --------------- | --------- | --------------------------------- |
| `id`            | UUID      | Primary key                       |
| `session_id`    | UUID      | FK to sessions table              |
| `tenant_id`     | UUID      | Denormalized for query efficiency |
| `learner_id`    | UUID      | Denormalized for query efficiency |
| `event_type`    | Enum      | Type of event (see below)         |
| `event_time`    | Timestamp | When event occurred               |
| `metadata_json` | JSONB     | Event-specific payload            |

---

## Event Types

### Session Lifecycle Events

- `SESSION_STARTED` - Session began
- `SESSION_PAUSED` - Learner paused (intentional)
- `SESSION_RESUMED` - Learner resumed from pause
- `SESSION_ENDED` - Session completed

### Activity Events

- `ACTIVITY_STARTED` - Started a learning activity
- `ACTIVITY_COMPLETED` - Finished activity (includes outcome)
- `ACTIVITY_SKIPPED` - Skipped without attempting
- `ACTIVITY_TIMEOUT` - Activity timed out

### Homework Helper Events

- `HOMEWORK_PROBLEM_SUBMITTED` - Problem submitted for help
- `HOMEWORK_HINT_REQUESTED` - Learner asked for a hint
- `HOMEWORK_SOLUTION_VIEWED` - Full solution was revealed
- `HOMEWORK_PROBLEM_COMPLETED` - Problem resolved

### Focus & Engagement Events

- `FOCUS_LOSS_DETECTED` - System detected disengagement
- `FOCUS_REGAINED` - Learner re-engaged
- `BREAK_SUGGESTED` - System suggested a break
- `BREAK_STARTED` - Learner started a break
- `BREAK_ENDED` - Break finished
- `REGULATION_ACTIVITY_STARTED` - SEL/regulation activity began
- `REGULATION_ACTIVITY_COMPLETED` - SEL/regulation activity ended

### Skill & Progress Events

- `SKILL_PRACTICED` - Skill was practiced (not mastered)
- `SKILL_MASTERED` - Mastery achieved
- `MISCONCEPTION_DETECTED` - Identified a misconception
- `STRUGGLE_DETECTED` - Extended difficulty detected

### Engagement Events

- `ENCOURAGEMENT_SHOWN` - Motivational message displayed
- `REWARD_EARNED` - Badge/reward earned
- `STREAK_UPDATED` - Streak count changed

---

## Example Event Sequences

### Example 1: Homework Helper Session

A student uses Homework Helper to get help with a math problem:

```json
// 1. Session created
POST /sessions
{
  "tenantId": "abc-school-uuid",
  "learnerId": "student-123-uuid",
  "sessionType": "HOMEWORK",
  "origin": "HOMEWORK_HELPER"
}
// Auto-generates SESSION_STARTED event

// 2. Student submits a problem
POST /sessions/:id/events
{
  "eventType": "HOMEWORK_PROBLEM_SUBMITTED",
  "metadata": {
    "subject": "math",
    "topic": "fractions",
    "problemText": "What is 3/4 + 1/2?",
    "imageUrl": null
  }
}

// 3. Student requests a hint
POST /sessions/:id/events
{
  "eventType": "HOMEWORK_HINT_REQUESTED",
  "metadata": {
    "hintLevel": 1,
    "hintText": "Try finding a common denominator first."
  }
}

// 4. Student successfully solves it
POST /sessions/:id/events
{
  "eventType": "HOMEWORK_PROBLEM_COMPLETED",
  "metadata": {
    "outcome": "solved_with_hints",
    "hintsUsed": 1,
    "skillIds": ["fraction-addition"],
    "correctAnswer": "5/4 or 1 1/4"
  }
}

// 5. Session completed
POST /sessions/:id/complete
{}
// Auto-generates SESSION_ENDED event with duration_ms
```

### Example 2: Learning Session with Focus Break

A student doing Today's Plan loses focus, takes a regulation break:

```json
// 1. Session created from mobile app
POST /sessions
{
  "tenantId": "abc-school-uuid",
  "learnerId": "student-456-uuid",
  "sessionType": "LEARNING",
  "origin": "MOBILE_LEARNER",
  "metadata": {
    "planId": "todays-plan-789",
    "scheduledActivities": 5
  }
}

// 2. First activity started
POST /sessions/:id/events
{
  "eventType": "ACTIVITY_STARTED",
  "metadata": {
    "activityId": "activity-001",
    "activityType": "practice",
    "skillId": "multiplication-tables"
  }
}

// 3. Activity completed successfully
POST /sessions/:id/events
{
  "eventType": "ACTIVITY_COMPLETED",
  "metadata": {
    "activityId": "activity-001",
    "outcome": "passed",
    "score": 0.85,
    "timeSpentMs": 45000
  }
}

// 4. Second activity started
POST /sessions/:id/events
{
  "eventType": "ACTIVITY_STARTED",
  "metadata": {
    "activityId": "activity-002",
    "activityType": "practice",
    "skillId": "division-basics"
  }
}

// 5. System detects focus loss (camera/interaction signals)
POST /sessions/:id/events
{
  "eventType": "FOCUS_LOSS_DETECTED",
  "metadata": {
    "detectionMethod": "inactivity",
    "inactivityDurationMs": 30000,
    "activityId": "activity-002"
  }
}

// 6. System suggests a break
POST /sessions/:id/events
{
  "eventType": "BREAK_SUGGESTED",
  "metadata": {
    "reason": "focus_loss",
    "suggestedDurationMs": 120000
  }
}

// 7. Learner accepts and starts break
POST /sessions/:id/events
{
  "eventType": "BREAK_STARTED",
  "metadata": {
    "breakType": "movement",
    "plannedDurationMs": 120000
  }
}

// 8. Optional: Regulation activity during break
POST /sessions/:id/events
{
  "eventType": "REGULATION_ACTIVITY_STARTED",
  "metadata": {
    "activityType": "breathing_exercise",
    "activityName": "5-finger breathing"
  }
}

POST /sessions/:id/events
{
  "eventType": "REGULATION_ACTIVITY_COMPLETED",
  "metadata": {
    "activityType": "breathing_exercise",
    "completedSuccessfully": true,
    "durationMs": 45000
  }
}

// 9. Break ends
POST /sessions/:id/events
{
  "eventType": "BREAK_ENDED",
  "metadata": {
    "actualDurationMs": 95000
  }
}

// 10. Focus regained, resume activity
POST /sessions/:id/events
{
  "eventType": "FOCUS_REGAINED",
  "metadata": {
    "resumeActivityId": "activity-002"
  }
}

// 11. Activity eventually completed
POST /sessions/:id/events
{
  "eventType": "ACTIVITY_COMPLETED",
  "metadata": {
    "activityId": "activity-002",
    "outcome": "passed",
    "score": 0.70,
    "timeSpentMs": 180000,
    "includesBreak": true
  }
}

// 12. Session completed
POST /sessions/:id/complete
{
  "metadata": {
    "activitiesCompleted": 2,
    "activitiesSkipped": 0,
    "totalBreaks": 1
  }
}
```

---

## API Reference

### Create Session

```http
POST /sessions
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "tenantId": "uuid",
  "learnerId": "uuid",
  "sessionType": "LEARNING | HOMEWORK | BASELINE | PRACTICE | SEL | ASSESSMENT",
  "origin": "MOBILE_LEARNER | WEB_LEARNER | TEACHER_LED | HOMEWORK_HELPER | PARENT_APP | SYSTEM",
  "metadata": { /* optional */ }
}

Response: 201 Created
{
  "id": "session-uuid",
  "tenantId": "...",
  "learnerId": "...",
  "sessionType": "LEARNING",
  "origin": "MOBILE_LEARNER",
  "startedAt": "2024-12-08T10:00:00Z",
  "endedAt": null,
  "durationMs": null,
  "events": [{ /* SESSION_STARTED event */ }]
}
```

### Append Event

```http
POST /sessions/:id/events
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "eventType": "ACTIVITY_COMPLETED",
  "eventTime": "2024-12-08T10:05:00Z",  // optional, defaults to now
  "metadata": { /* event-specific */ }
}

Response: 201 Created
{
  "id": "event-uuid",
  "sessionId": "session-uuid",
  "eventType": "ACTIVITY_COMPLETED",
  "eventTime": "2024-12-08T10:05:00Z",
  "metadataJson": { ... }
}
```

### Complete Session

```http
POST /sessions/:id/complete
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "endedAt": "2024-12-08T10:30:00Z",  // optional, defaults to now
  "metadata": { /* optional, merges with session metadata */ }
}

Response: 200 OK
{
  "id": "session-uuid",
  "durationMs": 1800000,
  "endedAt": "2024-12-08T10:30:00Z",
  "events": [ ... ]
}
```

### Get Session

```http
GET /sessions/:id
Authorization: Bearer <jwt>

Response: 200 OK
{ /* full session with all events */ }
```

### List Sessions

```http
GET /sessions?tenantId=<uuid>&learnerId=<uuid>&sessionType=LEARNING&limit=20&offset=0&includeIncomplete=false
Authorization: Bearer <jwt>

Response: 200 OK
{
  "total": 150,
  "limit": 20,
  "offset": 0,
  "items": [ /* session summaries with eventCount */ ]
}
```

### Get Active Session

```http
GET /learners/:learnerId/sessions/active?tenantId=<uuid>
Authorization: Bearer <jwt>

Response: 200 OK | 404 Not Found
{ /* active session with events, or 404 if none */ }
```

---

## Integration Points

### Virtual Brain Updates

After key events, downstream consumers should update the learner's Virtual Brain:

| Event Type               | Virtual Brain Update                  |
| ------------------------ | ------------------------------------- |
| `ACTIVITY_COMPLETED`     | Update skill mastery, practice counts |
| `SKILL_MASTERED`         | Mark skill as mastered, unlock next   |
| `MISCONCEPTION_DETECTED` | Flag for targeted remediation         |
| `FOCUS_LOSS_DETECTED`    | Update engagement patterns            |
| `SESSION_ENDED`          | Update session stats, streaks         |

### Analytics Pipeline

Events are consumed by the analytics service for:

- **Learning dashboards** - Progress over time, skill gaps
- **Teacher reports** - Class engagement, individual attention flags
- **Parent summaries** - Activity recaps, encouragement points

### Real-time Streaming (Future)

Consider publishing events to a message queue (e.g., Redis Streams, Kafka) for:

- Real-time teacher dashboard updates
- Immediate intervention triggers
- Live parent notifications

---

## Design Decisions

### Why JSONB Metadata?

Using `metadata_json` as JSONB provides:

1. **Flexibility** - Different event types need different payloads
2. **Evolvability** - Add new fields without migrations
3. **Query capability** - Postgres JSONB operators for filtering

### Why Denormalized tenant_id/learner_id on Events?

Query efficiency. Common queries like "all events for learner X in tenant Y" don't require joins.

### Why Computed duration_ms via Trigger?

Ensures consistency. The trigger computes duration on `UPDATE` when `ended_at` is set, avoiding client calculation errors.

---

## Service Configuration

```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost:5432/aivo_sessions
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=4020
```

### Running the Service

```bash
cd services/session-svc

# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start development server
pnpm dev
```

---

## Future Considerations

1. **Event Sourcing** - Consider full event sourcing if audit trails become critical
2. **Archival** - Sessions older than N days could be archived to cold storage
3. **Partitioning** - If scale demands, partition `session_events` by `tenant_id` or time
4. **Rate Limiting** - Add rate limits on event ingestion per session
5. **Webhooks** - Allow external systems to subscribe to session events
