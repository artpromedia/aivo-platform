# Goals & Session Planning Model

This document describes the data model for teacher/therapist goals, session planning, and progress tracking in the AIVO Learning Platform.

## Overview

The Goals & Session Planning system provides educators and therapists with tools to:

1. **Set Goals** - Define high-level learning outcomes for individual learners
2. **Create Objectives** - Break goals into measurable short-term objectives (STOs)
3. **Plan Sessions** - Design structured activities aligned to goals and skills
4. **Track Progress** - Log notes and evidence of learner progress

This model is **IEP-friendly but non-clinical** - it supports structured goal-setting without storing sensitive diagnostic information.

---

## Conceptual Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GOALS & SESSION PLANNING                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐         ┌──────────────────┐         ┌──────────────────┐    │
│  │   Goal   │────────▶│  GoalObjective   │         │  ProgressNote    │    │
│  │          │   1:N   │    (STO)         │◀────────│                  │    │
│  │ • title  │         │                  │         │ • noteText       │    │
│  │ • domain │         │ • description    │         │ • rating         │    │
│  │ • status │         │ • successCriteria│         │ • evidenceUri    │    │
│  │ • skillId│         │ • status         │         │                  │    │
│  └────┬─────┘         └──────────────────┘         └────────┬─────────┘    │
│       │                                                      │              │
│       │ skill alignment                                      │              │
│       ▼                                                      │              │
│  ┌──────────────┐                                            │              │
│  │ Virtual Brain│                                            │              │
│  │   (skills)   │                                            │              │
│  └──────────────┘                                            │              │
│                                                              │              │
│  ┌──────────────┐         ┌──────────────────┐              │              │
│  │ SessionPlan  │────────▶│ SessionPlanItem  │◀─────────────┘              │
│  │              │   1:N   │                  │                             │
│  │ • scheduled  │         │ • activityType   │        ┌──────────────┐     │
│  │ • status     │         │ • goalId         │───────▶│   Session    │     │
│  │ • sessionId  │─────────│ • skillId        │        │  (session-svc)│    │
│  └──────────────┘         └──────────────────┘        └──────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Entity Descriptions

### Goals

A **Goal** represents a high-level learning outcome set by a teacher or therapist for a specific learner.

| Field | Description |
|-------|-------------|
| `title` | Short, descriptive title (e.g., "Improve reading fluency") |
| `description` | Detailed description of the goal |
| `domain` | Academic domain: ELA, MATH, SCIENCE, SPEECH, SEL, OTHER |
| `skillId` | Optional link to Virtual Brain skill for alignment |
| `startDate` | When work on this goal begins |
| `targetDate` | Expected completion date |
| `status` | DRAFT → ACTIVE → COMPLETED/ARCHIVED |
| `progressRating` | 0-4 scale indicating overall progress |
| `metadataJson` | Extensible: standards tags, IEP references |

**Example Goal:**
```json
{
  "title": "Read grade-level text with 95% accuracy",
  "domain": "ELA",
  "skillId": "skill-reading-fluency-g3",
  "status": "ACTIVE",
  "metadataJson": {
    "standardsTag": "CCSS.ELA-LITERACY.RF.3.4",
    "iepGoalNumber": "1A"
  }
}
```

### Goal Objectives (Short-Term Objectives)

A **GoalObjective** breaks a goal into measurable milestones.

| Field | Description |
|-------|-------------|
| `description` | What the learner will do |
| `successCriteria` | How we know the objective is met |
| `status` | NOT_STARTED → IN_PROGRESS → MET/NOT_MET |
| `progressRating` | 0-4 scale for this objective |
| `orderIndex` | Order within the goal |

**Example Objectives for the reading goal:**
1. "Read 50 words per minute with <3 errors" (success: 3 consecutive sessions)
2. "Read 75 words per minute with <3 errors" (success: 3 consecutive sessions)
3. "Read 95 words per minute with <3 errors" (success: benchmark assessment)

### Session Plans

A **SessionPlan** defines a structured set of activities for a learning or therapy session.

| Field | Description |
|-------|-------------|
| `sessionTemplateName` | Optional template for reuse |
| `scheduledFor` | When the session is planned |
| `sessionType` | LEARNING, THERAPY, GROUP, ASSESSMENT, PRACTICE |
| `status` | DRAFT → PLANNED → IN_PROGRESS → COMPLETED |
| `sessionId` | Links to actual session when executed |
| `metadataJson` | classroomId, location, group members |

### Session Plan Items

A **SessionPlanItem** represents a single activity within a session plan.

| Field | Description |
|-------|-------------|
| `activityType` | Type of activity (reading_passage, math_drill, etc.) |
| `activityDescription` | Detailed instructions |
| `goalId` | Goal this activity addresses |
| `goalObjectiveId` | Specific objective being worked on |
| `skillId` | Virtual Brain skill being practiced |
| `estimatedDurationMinutes` | How long the activity should take |
| `aiMetadataJson` | AI-generated content references |

**Example Session Plan Item:**
```json
{
  "activityType": "reading_passage",
  "activityDescription": "Read 'The Giving Tree' aloud, focusing on expression",
  "goalId": "goal-123",
  "goalObjectiveId": "obj-456",
  "skillId": "skill-reading-fluency-g3",
  "estimatedDurationMinutes": 10,
  "aiMetadataJson": {
    "learningObjectId": "lo-giving-tree-g3",
    "difficultyLevel": 3
  }
}
```

### Progress Notes

A **ProgressNote** captures what happened during a session and tracks progress toward goals.

| Field | Description |
|-------|-------------|
| `noteText` | Free-form description of the session |
| `rating` | 0-4 performance rating |
| `evidenceUri` | Link to work sample or recording |
| `sessionId` | Links to the session record |
| `goalId/goalObjectiveId` | Goal/objective being tracked |

---

## Progress Rating Scale

All progress ratings use a consistent 0-4 scale:

| Rating | Label | Description |
|--------|-------|-------------|
| 0 | Not Started / Not Attempted | No progress or not attempted |
| 1 | Beginning / Emerging | Initial attempts, significant support needed |
| 2 | Developing | Making progress, moderate support needed |
| 3 | Approaching / Proficient | Near mastery, minimal support needed |
| 4 | Met / Advanced | Goal/objective achieved |

---

## Workflow Examples

### Creating Goals and Objectives

```typescript
// 1. Teacher creates a goal for a learner
const goal = await goalService.createGoal({
  tenantId: 'tenant-123',
  learnerId: 'learner-456',
  createdByUserId: 'teacher-789',
  title: 'Master multiplication facts 1-12',
  domain: 'MATH',
  skillId: 'skill-mult-facts',
  targetDate: new Date('2025-06-01'),
  status: 'ACTIVE',
});

// 2. Add short-term objectives
await goalService.createObjective({
  goalId: goal.id,
  description: 'Recall multiplication facts 1-5 within 3 seconds',
  successCriteria: '90% accuracy on 3 consecutive assessments',
  orderIndex: 0,
});

await goalService.createObjective({
  goalId: goal.id,
  description: 'Recall multiplication facts 6-9 within 3 seconds',
  successCriteria: '90% accuracy on 3 consecutive assessments',
  orderIndex: 1,
});
```

### Planning a Session

```typescript
// 1. Create session plan
const plan = await sessionPlanService.createPlan({
  tenantId: 'tenant-123',
  learnerId: 'learner-456',
  createdByUserId: 'teacher-789',
  scheduledFor: new Date('2025-01-15T10:00:00Z'),
  sessionType: 'LEARNING',
  estimatedDurationMinutes: 30,
  items: [
    {
      activityType: 'warm_up',
      activityDescription: 'Review 1-5 facts with flashcards',
      goalObjectiveId: 'obj-mult-1-5',
      estimatedDurationMinutes: 5,
    },
    {
      activityType: 'practice',
      activityDescription: 'Timed drill on 6-9 facts',
      goalObjectiveId: 'obj-mult-6-9',
      skillId: 'skill-mult-facts',
      estimatedDurationMinutes: 15,
    },
    {
      activityType: 'game',
      activityDescription: 'Multiplication bingo',
      goalId: 'goal-mult-facts',
      estimatedDurationMinutes: 10,
    },
  ],
});

// 2. When session starts, link to actual session
await sessionPlanService.updatePlan(plan.id, {
  status: 'IN_PROGRESS',
  sessionId: 'session-from-session-svc',
});
```

### Logging Progress

```typescript
// After session, teacher logs progress
await progressNoteService.createNote({
  tenantId: 'tenant-123',
  learnerId: 'learner-456',
  createdByUserId: 'teacher-789',
  sessionId: 'session-123',
  sessionPlanId: plan.id,
  goalObjectiveId: 'obj-mult-6-9',
  noteText: 'Student showed improvement on 6-9 facts. Struggled with 7x8 and 6x9. Used manipulatives to reinforce.',
  rating: 2, // Developing
  evidenceUri: 'https://storage.aivo.edu/evidence/mult-drill-20250115.pdf',
});
```

---

## Integration Points

### Virtual Brain (skill_id)

Goals and session plan items can be linked to Virtual Brain skills via `skill_id`:

- Enables teachers to create goals that align with the skill graph
- When a goal is met, the corresponding `learner_skill_state` can be updated
- AI can suggest activities that target specific skills

```sql
-- Find goals targeting skills below mastery
SELECT g.*, lss.mastery_level
FROM goals g
JOIN learner_skill_states lss ON g.skill_id = lss.skill_id
WHERE lss.virtual_brain_id = ?
  AND lss.mastery_level < 0.8
  AND g.status = 'ACTIVE';
```

### Sessions (session_id)

Session plans connect to the session-svc via `session_id`:

1. Teacher creates a session plan with activities
2. When the session starts (in session-svc), `session_plans.session_id` is populated
3. Progress notes can reference both the plan and the actual session
4. Analytics can correlate planned activities with actual session events

```sql
-- Join session plan with session events
SELECT sp.*, s.started_at, s.ended_at, se.event_type
FROM session_plans sp
JOIN sessions s ON sp.session_id = s.id
LEFT JOIN session_events se ON s.id = se.session_id
WHERE sp.learner_id = ?;
```

### Analytics

Progress notes feed into analytics for:

- Goal achievement dashboards
- Progress over time visualizations
- Skill mastery correlation
- Teacher effectiveness metrics

---

## Database Schema

See the full migration at:
`services/goal-svc/prisma/migrations/20251208_001_goals_session_plans/migration.sql`

### Key Indexes

| Index | Purpose |
|-------|---------|
| `idx_goals_tenant_learner_status` | Efficient lookup of active goals per learner |
| `idx_goals_skill_id` | Find goals by Virtual Brain skill |
| `idx_session_plans_tenant_scheduled` | Calendar view of upcoming sessions |
| `idx_progress_notes_tenant_learner_created` | Recent progress notes per learner |

---

## API Endpoints (Planned)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/goals` | Create a new goal |
| GET | `/goals/:id` | Get goal with objectives |
| PATCH | `/goals/:id` | Update goal |
| POST | `/goals/:id/objectives` | Add objective to goal |
| POST | `/session-plans` | Create session plan |
| GET | `/session-plans/calendar` | Get calendar view |
| POST | `/progress-notes` | Log progress note |
| GET | `/learners/:id/goals/summary` | Get learner goal summary |

---

## Security & Privacy

- All data is **multi-tenant** - `tenant_id` is required on all queries
- **Role-based access**: Teachers see their learners' goals, therapists see their assigned learners
- **No clinical data**: This model stores educational goals, not diagnoses
- **Evidence storage**: `evidence_uri` points to secure storage, not inline content
- **Audit trail**: All records have `created_at`/`updated_at` timestamps
