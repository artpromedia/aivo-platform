# Content Discovery & Selection Guide

This document describes the content discovery, selection, and retrieval APIs for Learning Objects.

## Overview

The content-svc provides APIs for:

- **Search**: Find LOs by subject, grade, skills, tags, text
- **Selection**: AI-assisted content selection for lesson planning
- **Render**: Retrieve full content for learner sessions

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Lesson Planner │     │  Teacher UI     │     │  Tutor Agent    │
│  Agent          │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ selectContentForPlan  │ search                │ render
         │                       │                       │
         ▼                       ▼                       ▼
┌────────────────────────────────────────────────────────────────┐
│                        content-svc                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ search.ts │  │selection │  │ render.ts │  │  Prisma DB   │   │
│  │          │  │   .ts    │  │          │  │              │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Search API

#### GET /api/content/search

Search for published Learning Objects.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `tenantId` | UUID | Filter by tenant (includes global content) |
| `subject` | enum | ELA, MATH, SCIENCE, SEL, SPEECH, OTHER |
| `gradeBand` | enum | K_2, G3_5, G6_8, G9_12 |
| `skillId` | UUID | Filter by single skill |
| `skillIds` | string | Comma-separated skill UUIDs |
| `standardCode` | string | Filter by standard code (e.g., CCSS.MATH.3.NF.A.1) |
| `tag` | string | Filter by single tag |
| `tags` | string | Comma-separated tags |
| `textQuery` | string | Text search on title |
| `contentType` | string | Filter by content type |
| `minDuration` | number | Minimum duration in minutes |
| `maxDuration` | number | Maximum duration in minutes |
| `limit` | number | Max results (default: 20, max: 100) |
| `offset` | number | Pagination offset (default: 0) |

**Response:**

```json
{
  "items": [
    {
      "id": "version-uuid",
      "learningObjectId": "lo-uuid",
      "versionNumber": 2,
      "title": "Introduction to Fractions",
      "slug": "intro-fractions",
      "subject": "MATH",
      "gradeBand": "G3_5",
      "primarySkillId": "skill-uuid",
      "skills": [{ "skillId": "skill-uuid", "isPrimary": true }],
      "tags": ["fractions", "grade-3"],
      "standards": ["CCSS.MATH.3.NF.A.1"],
      "estimatedDuration": 15,
      "contentType": "lesson",
      "difficulty": "MEDIUM",
      "publishedAt": "2025-01-15T10:00:00Z",
      "accessibilityFlags": {
        "supportsDyslexiaFriendlyFont": true,
        "supportsReducedStimuli": true,
        "hasScreenReaderOptimizedStructure": true,
        "estimatedCognitiveLoad": "MEDIUM"
      }
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0,
  "query": { "subject": "MATH", "gradeBand": "G3_5" }
}
```

### Selection API

#### POST /api/content/select

Select content for a learner's plan. Used by Lesson Planner agent.

**Request Body:**

```json
{
  "tenantId": "uuid",
  "learnerId": "uuid",
  "subject": "MATH",
  "gradeBand": "G3_5",
  "targetSkills": ["skill-uuid-1", "skill-uuid-2"],
  "minutesAvailable": 30,
  "difficultyAdjustment": "standard",
  "accessibilityProfile": {
    "dyslexiaFriendly": true,
    "reducedStimuli": false,
    "screenReader": false,
    "maxCognitiveLoad": "MEDIUM"
  },
  "excludeLOIds": ["already-done-lo-uuid"],
  "preferredContentTypes": ["lesson", "practice"]
}
```

**Response:**

```json
{
  "items": [
    {
      "versionId": "version-uuid",
      "learningObjectId": "lo-uuid",
      "title": "Fractions: Adding Like Denominators",
      "estimatedDuration": 12,
      "primarySkillId": "skill-uuid-1",
      "matchedSkills": ["skill-uuid-1"],
      "selectionScore": 175,
      "selectionReason": "Covers 1 target skill(s) • Dyslexia-friendly • 12 min"
    }
  ],
  "totalDurationMinutes": 12,
  "skillsCovered": ["skill-uuid-1"],
  "selectionNotes": ["Could not find content for skills: skill-uuid-2"],
  "metadata": {
    "candidatesConsidered": 45,
    "recentlyUsedFiltered": 5,
    "durationFiltered": 8
  }
}
```

### Render API

#### GET /api/content/learning-objects/:loVersionId/render

Retrieve full content for a learner session.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `locale` | string | Requested locale (default: "en") |
| `includeHints` | boolean | Include tutor hints |
| `includeTutorContext` | boolean | Include full tutor context |

**Response:**

```json
{
  "versionId": "version-uuid",
  "learningObjectId": "lo-uuid",
  "versionNumber": 2,
  "title": "Introduction to Fractions",
  "slug": "intro-fractions",
  "subject": "MATH",
  "gradeBand": "G3_5",
  "content": {
    "type": "lesson",
    "passage": "Fractions represent parts of a whole...",
    "questions": [...]
  },
  "accessibility": {
    "altTexts": { "fraction-diagram.png": "A pie chart showing 3/4" },
    "supportsDyslexiaFriendlyFont": true
  },
  "metadata": {
    "estimatedDuration": 15,
    "contentType": "lesson"
  },
  "locale": "en",
  "fallbackLocaleUsed": false,
  "requestedLocale": "en",
  "accessibilityFlags": {
    "supportsDyslexiaFriendlyFont": true,
    "supportsReducedStimuli": true,
    "hasScreenReaderOptimizedStructure": true,
    "hasHighContrastMode": false,
    "supportsTextToSpeech": false,
    "estimatedCognitiveLoad": "MEDIUM"
  },
  "skills": [{ "skillId": "skill-uuid", "isPrimary": true }],
  "primarySkillId": "skill-uuid",
  "tutorContext": {
    "hints": ["Remember that the denominator shows equal parts"],
    "commonMistakes": ["Adding denominators instead of keeping them same"],
    "scaffoldingSteps": ["Step 1: Check if denominators are equal"],
    "encouragementPhrases": ["You're doing great!"]
  },
  "estimatedDuration": 15
}
```

#### POST /api/content/learning-objects/render-batch

Batch render multiple LOs for a session.

**Request Body:**

```json
{
  "versionIds": ["v1-uuid", "v2-uuid", "v3-uuid"],
  "locale": "es",
  "accessibilityProfile": { "dyslexiaFriendly": true },
  "includeTutorContext": true
}
```

**Response:**

```json
{
  "items": {
    "v1-uuid": {
      /* RenderedContent */
    },
    "v2-uuid": {
      /* RenderedContent */
    }
  },
  "notFound": ["v3-uuid"],
  "total": 3,
  "found": 2
}
```

## Selection Algorithm

### Scoring Weights

| Factor                | Weight | Description                             |
| --------------------- | ------ | --------------------------------------- |
| Primary skill match   | +100   | LO's primary skill matches target       |
| Secondary skill match | +50    | LO has target skill (not primary)       |
| Skill coverage bonus  | +20    | Per additional skill covered            |
| Recently used         | -200   | Penalty for content used in past 7 days |
| Difficulty match      | +30    | Matches requested difficulty level      |
| Accessibility match   | +25    | Per matching accessibility flag         |
| Duration fit          | +15    | Duration is 30-50% of available time    |

### Selection Process

1. **Search**: Query published LOs matching subject, grade, and skills
2. **Filter**: Remove recently used and excluded content
3. **Score**: Calculate score for each candidate
4. **Select**: Pick highest-scoring items that fit time budget
5. **Return**: Ordered list with rationale

## Lesson Planner Integration

### How Lesson Planner Calls selectContentForPlan

```typescript
// In AI Orchestrator - Lesson Planner agent
const planContent = await contentSvc.selectContentForPlan({
  tenantId: learner.tenantId,
  learnerId: learner.id,
  subject: 'MATH',
  gradeBand: learner.gradeBand,
  targetSkills: virtualBrain.getNextSkillsToWork(),
  minutesAvailable: todayPlan.targetMinutes,
  accessibilityProfile: learner.accessibilityProfile,
});

// Build Today Plan activities from selection
for (const item of planContent.items) {
  todayPlan.addActivity({
    type: 'LEARNING',
    learningObjectVersionId: item.versionId,
    estimatedMinutes: item.estimatedDuration,
    targetSkillId: item.primarySkillId,
  });
}
```

### Teacher Manual Selection Flow

1. Teacher opens session planning UI
2. Searches by subject/grade/skill/text using `/content/search`
3. Browses results, views LO previews
4. Clicks "Add to Plan" on selected LO
5. Frontend stores LO ID in session plan item:
   ```json
   {
     "session_plan_items": [
       {
         "ai_metadata_json": {
           "learningObjectId": "lo-uuid",
           "versionId": "version-uuid",
           "selectedBy": "teacher",
           "selectionTime": "2025-01-15T10:30:00Z"
         }
       }
     ]
   }
   ```

## Future Enhancements

### Vector/Embedding Search

When pgvector embeddings are available:

```sql
-- Semantic search query
SELECT id, title, 1 - (embedding <=> $query_embedding) as similarity
FROM learning_object_embeddings
WHERE embedding <=> $query_embedding < 0.5
  AND tenant_id = $tenant_id OR tenant_id IS NULL
ORDER BY embedding <=> $query_embedding
LIMIT 20
```

### Integration Points

- **Virtual Brain**: Query skill mastery to adjust difficulty
- **Session Service**: Track recently used LOs per learner
- **Analytics**: A/B test content selection algorithms
