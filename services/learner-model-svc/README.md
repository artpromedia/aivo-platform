# Learner Model Service

Manages the "Virtual Brain" - a personalized skill graph for each learner that evolves over time based on their learning activities.

## Overview

The Virtual Brain is initialized from baseline assessment results and tracks:

- **Skill mastery levels** - How well the learner has mastered each skill (0-10 scale)
- **Confidence scores** - How confident the system is in the mastery estimate
- **Skill prerequisites** - Graph of skill dependencies
- **Practice history** - Number of practice attempts and correct streaks

## API Endpoints

### Health Check

```
GET /health -> 200 OK
{
  "status": "ok",
  "service": "learner-model-svc",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Initialize Virtual Brain

Called by `baseline-svc` after a baseline assessment is accepted.

```
POST /virtual-brains/initialize
Authorization: Bearer <service-token>

{
  "tenantId": "uuid",
  "learnerId": "uuid",
  "baselineProfileId": "uuid",
  "baselineAttemptId": "uuid",
  "gradeBand": "K5" | "G6_8" | "G9_12",
  "skillEstimates": [
    {
      "skillCode": "ELA_PHONEMIC_AWARENESS",
      "domain": "ELA",
      "estimatedLevel": 2.5,
      "confidence": 0.8
    }
  ]
}

-> 201 Created
{
  "virtualBrainId": "uuid",
  "learnerId": "uuid",
  "skillsInitialized": 25,
  "skillsMissing": [],
  "createdAt": "2024-01-15T12:00:00.000Z"
}
```

### Get Virtual Brain

```
GET /virtual-brains/:learnerId
Authorization: Bearer <jwt>

-> 200 OK
{
  "id": "uuid",
  "learnerId": "uuid",
  "tenantId": "uuid",
  "gradeBand": "K5",
  "baselineProfileId": "uuid",
  "skillStates": [
    {
      "id": "uuid",
      "skillCode": "ELA_PHONEMIC_AWARENESS",
      "domain": "ELA",
      "displayName": "Phonemic Awareness",
      "masteryLevel": 2.5,
      "confidence": 0.8,
      "practiceCount": 0,
      "correctStreak": 0,
      "lastAssessedAt": "2024-01-15T12:00:00.000Z"
    }
  ],
  "summary": {
    "totalSkills": 25,
    "byDomain": {
      "ELA": { "count": 5, "avgMastery": 3.2 },
      "MATH": { "count": 5, "avgMastery": 4.0 }
    }
  }
}
```

### Get Skill Graph

Returns the skill prerequisite graph with mastery status and recommended next skills.

```
GET /virtual-brains/:learnerId/skill-graph
Authorization: Bearer <jwt>

-> 200 OK
{
  "learnerId": "uuid",
  "skillGraph": [
    {
      "skillId": "uuid",
      "skillCode": "ELA_COMPREHENSION",
      "displayName": "Reading Comprehension",
      "domain": "ELA",
      "masteryLevel": 2.0,
      "isMastered": false,
      "isReady": true,
      "prerequisites": [
        { "skillCode": "ELA_FLUENCY", "isMastered": true }
      ],
      "dependents": [
        { "skillCode": "ELA_WRITING" }
      ]
    }
  ],
  "recommendedSkills": [...],
  "stats": {
    "totalSkills": 25,
    "masteredSkills": 8,
    "readySkills": 5
  }
}
```

## Database Schema

- `skills` - Master catalog of skills in the learning graph
- `skill_prerequisites` - Directed edges in the skill dependency graph
- `virtual_brains` - One per learner, links to baseline and contains metadata
- `learner_skill_states` - Mastery state for each skill per learner

## Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed skills catalog
pnpm db:seed

# Start development server
pnpm dev
```

## Environment Variables

See `.env.example` for required configuration:

- `PORT` - Server port (default: 4015)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_PUBLIC_KEY_PATH` - Path to JWT public key for auth

## Skills Domains

The skills catalog covers 5 domains with 5 skills each (25 total for baseline):

| Domain  | Skills                                                                      |
| ------- | --------------------------------------------------------------------------- |
| ELA     | Phonemic Awareness, Fluency, Vocabulary, Comprehension, Writing             |
| MATH    | Number Sense, Operations, Fractions, Geometry, Problem Solving              |
| SCIENCE | Observation, Hypothesis, Experiment, Data, Conclusion                       |
| SPEECH  | Articulation, Fluency, Voice, Language, Pragmatics                          |
| SEL     | Self-Awareness, Self-Management, Social Awareness, Relationships, Decisions |

## Integration

1. Parent accepts baseline results in mobile app
2. `baseline-svc` calls `POST /virtual-brains/initialize`
3. Virtual Brain is created with initial skill states
4. Learning activities update mastery levels over time
5. Skill graph provides personalized learning path recommendations
