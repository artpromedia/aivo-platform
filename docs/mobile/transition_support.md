# Transition Support System (ND-1.1)

A comprehensive transition support system for neurodiverse learners, providing visual, audio, and haptic warnings before activity changes.

## Overview

Many neurodiverse learners experience difficulty with unexpected transitions between activities. This system provides:

- **Advance Warnings**: Multiple configurable warnings before activity changes
- **Visual Countdown**: Circle, bar, sand timer, or character-based countdowns
- **Audio Cues**: Gentle chimes, nature sounds, spoken warnings
- **Haptic Feedback**: Configurable vibration patterns
- **First/Then Boards**: Visual preview of current and upcoming activities
- **Transition Routines**: Guided breathing, movement, and sensory activities

## Architecture

```
services/session-svc/src/transitions/
├── transition.types.ts       # TypeScript type definitions
├── transition.service.ts     # Core business logic
├── transition.events.ts      # NATS event publisher
├── transition.routes.ts      # Fastify API routes
├── transition-strategies.ts  # Default routines and algorithms
└── index.ts                  # Module exports

apps/mobile-learner/lib/transitions/
├── transition_service.dart   # Flutter API client
├── transition_widgets.dart   # UI components
└── transitions.dart          # Module exports
```

## Database Schema

### TransitionPreferences

Stores per-learner preferences for transition handling:

```prisma
model TransitionPreferences {
  id                      String   @id @default(uuid())
  tenantId                String
  learnerId               String
  warningStyle            String   @default("visual_audio")
  defaultWarningSeconds   Int[]    @default([30, 15, 5])
  visualSettingsJson      Json     @default("{}")
  audioSettingsJson       Json     @default("{}")
  hapticSettingsJson      Json     @default("{}")
  preferredRoutineId      String?
  showFirstThenBoard      Boolean  @default(true)
  requireAcknowledgment   Boolean  @default(true)
  allowSkipTransition     Boolean  @default(false)
  extendedTimeMultiplier  Float    @default(1.0)

  @@unique([tenantId, learnerId])
}
```

### TransitionRoutine

Reusable transition routines with multiple steps:

```prisma
model TransitionRoutine {
  id              String   @id @default(uuid())
  tenantId        String
  learnerId       String?  // null = system routine
  name            String
  description     String?
  stepsJson       Json
  isSystemRoutine Boolean  @default(false)
  isActive        Boolean  @default(true)
}
```

### TransitionEvent

Analytics for tracking transition effectiveness:

```prisma
model TransitionEvent {
  id                     String   @id @default(uuid())
  tenantId               String
  sessionId              String
  learnerId              String
  fromActivityId         String
  toActivityId           String
  plannedDuration        Int
  actualDuration         Int
  warningsDelivered      Int
  warningsAcknowledged   Int
  routineStepsCompleted  Int
  routineStepsTotal      Int
  learnerInteractions    Int
  outcome                TransitionOutcome
  metadataJson           Json     @default("{}")
  createdAt              DateTime @default(now())
}
```

## API Endpoints

### Preferences

| Method | Endpoint                              | Description                          |
| ------ | ------------------------------------- | ------------------------------------ |
| GET    | `/transitions/preferences/:learnerId` | Get learner's transition preferences |
| PUT    | `/transitions/preferences/:learnerId` | Update transition preferences        |

### Planning & Execution

| Method | Endpoint                       | Description                              |
| ------ | ------------------------------ | ---------------------------------------- |
| POST   | `/transitions/plan`            | Plan a transition between activities     |
| POST   | `/transitions/:id/acknowledge` | Acknowledge transition warning           |
| POST   | `/transitions/:id/complete`    | Complete transition and record analytics |

### Routines

| Method | Endpoint                    | Description             |
| ------ | --------------------------- | ----------------------- |
| GET    | `/transitions/routines`     | List available routines |
| POST   | `/transitions/routines`     | Create a new routine    |
| GET    | `/transitions/routines/:id` | Get routine details     |
| PUT    | `/transitions/routines/:id` | Update a routine        |
| DELETE | `/transitions/routines/:id` | Soft-delete a routine   |

### Analytics

| Method | Endpoint                 | Description                          |
| ------ | ------------------------ | ------------------------------------ |
| GET    | `/transitions/analytics` | Get transition analytics for learner |

## Flutter Widgets

### TransitionWarningWidget

Main countdown widget with configurable visualization styles:

```dart
TransitionWarningWidget(
  plan: transitionPlan,
  onComplete: () => navigateToNextActivity(),
  onAcknowledge: () => recordAcknowledgment(),
  onSkip: plan.allowSkip ? () => skipTransition() : null,
)
```

### FirstThenBoardWidget

Visual First/Then board:

```dart
FirstThenBoardWidget(
  board: FirstThenBoard(
    currentActivity: currentActivity,
    nextActivity: nextActivity,
  ),
)
```

### TransitionRoutineWidget

Guided routine with breathing, movement, and sensory steps:

```dart
TransitionRoutineWidget(
  routine: routine,
  onComplete: () => proceedToActivity(),
)
```

## System Routines

The system includes default routines for different grade bands:

| Routine             | Grade Band | Duration | Steps                                     |
| ------------------- | ---------- | -------- | ----------------------------------------- |
| Quick Calm (K-5)    | K-5        | 40s      | Breathing, Movement, Preview, Ready Check |
| Sensory Reset (K-5) | K-5        | 35s      | Sensory (x2), Breathing, Ready Check      |
| Quick Reset (6-8)   | 6-8        | 30s      | Breathing, Movement, Preview              |
| Brief Pause (9-12)  | 9-12       | 20s      | Breathing, Preview                        |
| Quiz Preparation    | All        | 45s      | Breathing, Preview, Sensory, Ready Check  |

## Integration with Learner Profile

The transition system reads from the learner's profile to customize behavior:

- `requiresPredictableFlow`: Enables First/Then boards, requires acknowledgment
- `avoidTimers`: Hides numeric countdown, uses character animations instead
- `sensorySensitivities`: Adjusts audio/haptic settings
- `preferredTransitionCues`: Prioritizes specific warning types

## Events

The system publishes the following events to NATS:

| Event                     | Description                                   |
| ------------------------- | --------------------------------------------- |
| `transition.started`      | Transition plan created and countdown started |
| `transition.warning`      | Warning delivered to learner                  |
| `transition.acknowledged` | Learner acknowledged the transition           |
| `transition.routine.step` | Routine step completed or skipped             |
| `transition.completed`    | Transition finished, analytics recorded       |

## Analytics

The system tracks:

- **Success Rate**: Percentage of smooth/successful transitions
- **Average Duration**: Mean time for transitions vs. planned
- **Warning Effectiveness**: Acknowledgment rate per warning count
- **Routine Completion**: Steps completed vs. total
- **Outcome Distribution**: Breakdown by smooth/successful/struggled/refused/timed_out

This data feeds into the learner model for personalization improvements.

## Testing

```bash
# Run transition service tests
pnpm --filter @aivo/session-svc test
```

## Configuration

Environment variables:

```env
# Enable/disable transition features
TRANSITIONS_ENABLED=true

# Default warning intervals (seconds)
DEFAULT_WARNING_INTERVALS=30,15,5

# Audio assets base URL
AUDIO_ASSETS_URL=https://cdn.aivo.com/audio/transitions/
```
