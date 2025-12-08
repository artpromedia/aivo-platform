# Homework Helper Service

AI-powered homework scaffolding service for the Aivo Learning Platform. This service guides learners through homework problems step-by-step without giving direct answers.

## Overview

The Homework Helper Service:

- Accepts homework problems (text, images, or PDFs)
- Uses the AI Orchestrator's `HOMEWORK_HELPER` agent to generate scaffolding steps
- Applies guardrails to ensure no direct answers are given
- Tracks progress through the session-svc
- Provides hints and feedback as learners work through problems

## Port

`4025` (default)

## API Endpoints

### Health Check

```
GET /health
```

Returns service health status.

### Start Homework Session

```
POST /homework/start
```

Creates a new homework submission, generates AI scaffolding, and returns the steps.

**Request Body:**

```json
{
  "subject": "MATH", // ELA | MATH | SCIENCE | OTHER
  "gradeBand": "G6_8", // K5 | G6_8 | G9_12
  "sourceType": "TEXT", // IMAGE | TEXT | PDF
  "sourceUrl": "...", // Optional: URL to uploaded file
  "rawText": "Solve for x: 2x + 5 = 15",
  "maxSteps": 5 // Optional: default 5, max 10
}
```

**Response:**

```json
{
  "submission": {
    "id": "uuid",
    "sessionId": "uuid",
    "subject": "MATH",
    "gradeBand": "G6_8",
    "status": "SCAFFOLDED",
    "stepCount": 3
  },
  "steps": [
    {
      "id": "uuid",
      "stepOrder": 1,
      "promptText": "What is the first thing you should do to isolate x?",
      "isStarted": false,
      "isCompleted": false
    }
  ]
}
```

### Get Steps

```
GET /homework/:homeworkId/steps
```

Returns all steps for a homework submission with their current status.

### Submit Answer

```
POST /homework/steps/:stepId/answer
```

Submit a response to a scaffolding step and optionally receive AI feedback.

**Request Body:**

```json
{
  "responseText": "I would subtract 5 from both sides",
  "requestFeedback": true
}
```

**Response:**

```json
{
  "response": {
    "id": "uuid",
    "stepId": "uuid",
    "responseText": "I would subtract 5 from both sides",
    "aiFeedback": "Great thinking! That's the right approach.",
    "isCorrect": true
  },
  "step": {
    "id": "uuid",
    "stepOrder": 1,
    "isStarted": true,
    "isCompleted": true
  }
}
```

### Request Hint

```
POST /homework/steps/:stepId/hint
```

Reveals the hint for a step (if available).

### Complete Homework

```
POST /homework/:homeworkId/complete
```

Marks the homework as completed and ends the associated session.

### List Submissions

```
GET /homework/submissions
```

Lists all homework submissions for the current learner.

## Database Schema

### homework_submissions

- `id` - UUID primary key
- `tenant_id` - Tenant UUID
- `learner_id` - Learner UUID
- `session_id` - Link to session-svc session
- `subject` - ELA, MATH, SCIENCE, OTHER
- `grade_band` - K5, G6_8, G9_12
- `source_type` - IMAGE, TEXT, PDF
- `source_url` - URL to uploaded file
- `raw_text` - Extracted/input problem text
- `status` - RECEIVED, PARSED, SCAFFOLDED, COMPLETED, FAILED
- `step_count` - Number of scaffolding steps
- `steps_completed` - Steps completed by learner

### homework_steps

- `id` - UUID primary key
- `submission_id` - FK to homework_submissions
- `step_order` - Order in sequence (1-based)
- `prompt_text` - Scaffolding question
- `hint_text` - Optional hint
- `expected_concept` - Expected approach (not shown to learner)
- `is_started`, `is_completed`, `hint_revealed` - Progress flags

### homework_step_responses

- `id` - UUID primary key
- `step_id` - FK to homework_steps
- `response_text` - Learner's response
- `ai_feedback` - AI-generated scaffolding feedback
- `is_correct` - Whether response demonstrates understanding

## Guardrails

The service enforces strict guardrails to ensure the AI never gives direct answers:

### Static Patterns Detected

- "The answer is..."
- "x = N" (variable assignments)
- "Therefore, the answer..."
- "The main idea is that..."

### Replacement Strategy

When a direct answer is detected, the problematic sentence is replaced with a subject-appropriate scaffolding question.

### Future Enhancement

Integration with the `SAFETY` agent for more sophisticated content moderation.

## AI Contract

### HOMEWORK_HELPER Agent Request

```typescript
{
  subject: "MATH" | "ELA" | "SCIENCE" | "OTHER",
  gradeBand: "K5" | "G6_8" | "G9_12",
  rawText: string,
  maxSteps: number,
  guardrails: {
    noDirectAnswers: true,
    maxHintsPerStep: 2,
    requireWorkShown: true,
    vocabularyLevel: GradeBand
  }
}
```

### HOMEWORK_HELPER Agent Response

```typescript
{
  steps: [
    {
      stepOrder: number,
      promptText: string,
      hintText?: string,
      expectedConcept?: string
    }
  ],
  problemType?: string,
  warnings?: string[]
}
```

## Session Integration

The service integrates with `session-svc` to track:

- `HOMEWORK` session creation
- `HOMEWORK_CAPTURED` - When homework is submitted
- `HOMEWORK_PARSED` - When AI scaffolding is generated
- `HOMEWORK_STEP_STARTED` - When learner starts a step
- `HOMEWORK_STEP_COMPLETED` - When step is completed
- `HOMEWORK_HINT_REQUESTED` - When hint is revealed

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Environment Variables

| Variable                  | Description                  | Default                 |
| ------------------------- | ---------------------------- | ----------------------- |
| `PORT`                    | Server port                  | `4025`                  |
| `DATABASE_URL`            | PostgreSQL connection string | -                       |
| `JWT_PUBLIC_KEY_PATH`     | Path to JWT public key       | -                       |
| `AI_ORCHESTRATOR_URL`     | AI Orchestrator service URL  | `http://localhost:4010` |
| `AI_ORCHESTRATOR_API_KEY` | Internal API key             | -                       |
| `SESSION_SVC_URL`         | Session service URL          | `http://localhost:4020` |
| `SESSION_SVC_API_KEY`     | Internal API key             | -                       |
