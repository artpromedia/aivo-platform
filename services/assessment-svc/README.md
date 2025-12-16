# Assessment Service

Node/TypeScript service for managing assessments, quizzes, tests, and assignments in the AIVO platform.

## Features

- **Assessment Management**: Create, update, publish, and archive assessments (quizzes, tests, practice, assignments)
- **Question Bank**: Comprehensive question types with explanation and hints
- **Attempt Tracking**: Track student attempts with time limits and max attempts
- **Automated Scoring**: Auto-grade most question types with partial credit support
- **Manual Grading**: Support for essay and complex question types
- **Adaptive Learning**: Difficulty adjustment based on learner performance
- **Question Pools**: Dynamic question selection based on criteria

## Question Types

| Type            | Description                 | Auto-Scored         |
| --------------- | --------------------------- | ------------------- |
| MULTIPLE_CHOICE | Single correct answer       | ✅                  |
| MULTIPLE_SELECT | Multiple correct answers    | ✅ (partial credit) |
| TRUE_FALSE      | Binary choice               | ✅                  |
| SHORT_ANSWER    | Text input, exact match     | ✅                  |
| ESSAY           | Long text, manual grading   | ❌                  |
| FILL_BLANK      | Fill in the blanks          | ✅ (partial credit) |
| MATCHING        | Match items                 | ✅ (partial credit) |
| ORDERING        | Arrange in order            | ✅ (partial credit) |
| NUMERIC         | Number input with tolerance | ✅                  |
| HOTSPOT         | Click on image area         | ❌                  |
| DRAG_DROP       | Drag items to zones         | ❌                  |

## API Endpoints

### Assessments

- `GET /api/v1/assessments` - List assessments
- `POST /api/v1/assessments` - Create assessment
- `GET /api/v1/assessments/:id` - Get assessment by ID
- `PUT /api/v1/assessments/:id` - Update assessment
- `POST /api/v1/assessments/:id/publish` - Publish assessment
- `POST /api/v1/assessments/:id/archive` - Archive assessment
- `DELETE /api/v1/assessments/:id` - Delete assessment
- `POST /api/v1/assessments/:id/clone` - Clone assessment
- `GET /api/v1/assessments/:id/questions` - Get assessment questions
- `POST /api/v1/assessments/:id/questions` - Add question to assessment
- `DELETE /api/v1/assessments/:id/questions/:questionId` - Remove question
- `PUT /api/v1/assessments/:id/questions/reorder` - Reorder questions

### Questions

- `GET /api/v1/questions` - List questions
- `POST /api/v1/questions` - Create question
- `POST /api/v1/questions/bulk` - Bulk create questions
- `GET /api/v1/questions/:id` - Get question by ID
- `PUT /api/v1/questions/:id` - Update question
- `DELETE /api/v1/questions/:id` - Delete question
- `POST /api/v1/questions/:id/clone` - Clone question

### Attempts

- `GET /api/v1/attempts` - List attempts
- `POST /api/v1/attempts` - Start new attempt
- `GET /api/v1/attempts/:id` - Get attempt by ID
- `POST /api/v1/attempts/:id/submit` - Submit attempt
- `POST /api/v1/attempts/:id/abandon` - Abandon attempt
- `GET /api/v1/attempts/:id/next-question` - Get next question (adaptive)
- `POST /api/v1/attempts/:id/responses` - Submit response
- `POST /api/v1/attempts/:id/responses/bulk` - Bulk submit responses
- `GET /api/v1/attempts/:id/responses` - Get all responses
- `POST /api/v1/attempts/:id/grade` - Manual grade attempt
- `POST /api/v1/attempts/:id/responses/:responseId/grade` - Grade single response

## Configuration

| Environment Variable | Description                          | Default               |
| -------------------- | ------------------------------------ | --------------------- |
| `DATABASE_URL`       | PostgreSQL connection string         | Required              |
| `PORT`               | Server port                          | 3006                  |
| `NATS_URL`           | NATS connection URL                  | nats://localhost:4222 |
| `NODE_ENV`           | Environment (development/production) | development           |

## Events (NATS)

The service publishes events to NATS for integration with other services:

- `aivo.assessment.assessment.created` - Assessment created
- `aivo.assessment.assessment.updated` - Assessment updated
- `aivo.assessment.assessment.published` - Assessment published
- `aivo.assessment.assessment.archived` - Assessment archived
- `aivo.assessment.attempt.started` - Attempt started
- `aivo.assessment.attempt.submitted` - Attempt submitted
- `aivo.assessment.attempt.graded` - Attempt fully graded
- `aivo.assessment.question.created` - Question created
- `aivo.assessment.response.submitted` - Response submitted

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Database Schema

See `prisma/schema.prisma` for the complete database schema. Key models:

- **Assessment** - Quiz, test, or assignment configuration
- **Question** - Question bank with various types
- **AssessmentQuestion** - Links questions to assessments with ordering
- **Attempt** - User's attempt at an assessment
- **QuestionResponse** - Individual question responses within an attempt
- **QuestionPool** - Dynamic question selection criteria

## Architecture

```
src/
├── app.ts              # Express app setup
├── index.ts            # Server entry point
├── prisma.ts           # Database client
├── services/           # Business logic
│   ├── assessment.service.ts
│   ├── question.service.ts
│   ├── attempt.service.ts
│   ├── scoring.service.ts
│   └── adaptive.service.ts
├── routes/             # HTTP endpoints
│   ├── assessment.routes.ts
│   ├── question.routes.ts
│   └── attempt.routes.ts
├── validators/         # Zod schemas
│   └── assessment.validator.ts
└── events/             # NATS publishing
    └── publisher.ts
```
