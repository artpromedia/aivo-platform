# Baseline Assessment Service

Drives the 25-question baseline assessment flow (5 domains × 5 items) for learners.

## Setup

```bash
pnpm install --filter @aivo/baseline-svc...
cp .env.example .env  # and edit with real values
pnpm --filter @aivo/baseline-svc db:generate
pnpm --filter @aivo/baseline-svc db:migrate
```

## Dev

```bash
pnpm --filter @aivo/baseline-svc dev
```

## Test

```bash
pnpm --filter @aivo/baseline-svc test
```

## Endpoints

| Method | Path                                         | Description                         |
| ------ | -------------------------------------------- | ----------------------------------- |
| GET    | `/health`                                    | Health check (no auth)              |
| POST   | `/baseline/profiles`                         | Create baseline profile for learner |
| GET    | `/baseline/profiles/:profileId`              | Get profile with attempts           |
| POST   | `/baseline/profiles/:profileId/start`        | Start a new attempt                 |
| GET    | `/baseline/attempts/:attemptId/next`         | Get next unanswered item            |
| POST   | `/baseline/items/:itemId/answer`             | Submit answer for item              |
| POST   | `/baseline/attempts/:attemptId/complete`     | Complete attempt and score          |
| POST   | `/baseline/profiles/:profileId/retest`       | Request retest (max 1)              |
| POST   | `/baseline/profiles/:profileId/accept-final` | Accept final attempt                |

## Domains & Skills

Each baseline covers 5 domains with 5 skills each (25 items total):

- **ELA**: Reading comprehension, vocabulary, grammar, writing, literature
- **MATH**: Arithmetic, algebra, geometry, measurement, data/probability
- **SCIENCE**: Life science, physical science, earth science, inquiry, technology
- **SPEECH**: Articulation, fluency, voice, language concepts, listening comprehension
- **SEL**: Self-awareness, self-management, social awareness, relationships, decision-making

## Flow

1. Parent creates profile for learner → `POST /baseline/profiles`
2. Start first attempt → `POST /baseline/profiles/:id/start` (generates 25 questions)
3. Loop: Get next item → answer → repeat until all 25 answered
4. Complete attempt → `POST /baseline/attempts/:id/complete` (calculates scores)
5. Optionally request retest → `POST /baseline/profiles/:id/retest`
6. Accept final → `POST /baseline/profiles/:id/accept-final` (publishes to Virtual Brain)

## Environment Variables

| Variable              | Description                                   |
| --------------------- | --------------------------------------------- |
| `PORT`                | Server port (default: 3006)                   |
| `DATABASE_URL`        | PostgreSQL connection string                  |
| `AI_ORCHESTRATOR_URL` | URL of AI orchestrator service                |
| `AI_ORCHESTRATOR_KEY` | Internal API key for AI orchestrator          |
| `JWT_PUBLIC_KEY_PATH` | Path to RS256 public key for JWT verification |
