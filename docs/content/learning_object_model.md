# Learning Object Data Model

> **Version**: 1.0  
> **Last Updated**: December 2024  
> **Service**: content-svc

## Overview

Learning Objects (LOs) are the fundamental units of learning content in Aivo. They represent individual pieces of educational material that can be delivered to learners during sessions.

### What is a Learning Object?

A Learning Object is any discrete unit of learning content, such as:

- Reading passages with comprehension questions
- Math problems and problem sets
- SEL (Social-Emotional Learning) check-ins
- Video lessons with embedded questions
- Interactive games targeting specific skills
- Speech/language therapy exercises
- Assessment items

### Key Design Principles

1. **Versioned Content**: Content changes are tracked through versions, not in-place edits
2. **Review Workflow**: All content goes through a review/approval process before publication
3. **Skill Alignment**: Content is explicitly aligned to the Virtual Brain skill graph
4. **Multi-tenancy**: Supports both global (shared) and tenant-specific content
5. **Accessibility-First**: Rich accessibility metadata for inclusive design

## Core Concepts

### Learning Object vs Version

```
┌─────────────────────────────────────────────────────────────────┐
│                       Learning Object                            │
│  ═══════════════════════════════════════════════════════════    │
│  ID: lo-123                                                      │
│  Slug: ela-g3-dogs-winter-passage                               │
│  Title: "Dogs in Winter"                                         │
│  Subject: ELA                                                    │
│  Grade Band: G3_5                                                │
│  Primary Skill: ELA_READING_COMPREHENSION                        │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Version 1      │  │  Version 2      │  │  Version 3      │  │
│  │  ────────────   │  │  ────────────   │  │  ────────────   │  │
│  │  State: RETIRED │  │  State: RETIRED │  │  State: PUBLISHED│  │
│  │  Content: {...} │  │  Content: {...} │  │  Content: {...} │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

- **Learning Object**: Logical identity and metadata (subject, grade, primary skill)
- **Version**: Concrete content payload with workflow state

### Workflow States

```
                     ┌─────────────────┐
                     │                 │
         ┌──────────►│    IN_REVIEW    │◄──────────┐
         │           │                 │           │
         │           └────────┬────────┘           │
         │                    │                    │
         │           ┌────────┴────────┐           │
         │           ▼                 ▼           │
    ┌────┴────┐  (rejected)      (approved)  ┌────┴────┐
    │         │◄─────────────────────────────│         │
    │  DRAFT  │                              │ APPROVED│
    │         │                              │         │
    └────┬────┘                              └────┬────┘
         │                                        │
         │                                        │ (publish)
         │                                        ▼
         │                                   ┌─────────┐
         │                                   │         │
         │                                   │PUBLISHED│──────► RETIRED
         │                                   │         │      (when replaced)
         │                                   └─────────┘
         │
         └──────────────────────────────────────────────────────────►
                        (author continues editing)
```

| State | Description | Who Can Transition |
|-------|-------------|-------------------|
| `DRAFT` | Being authored/edited | Author |
| `IN_REVIEW` | Submitted for review | Author → Reviewer |
| `APPROVED` | Reviewed and approved | Reviewer |
| `PUBLISHED` | Live for learner sessions | Content Admin |
| `RETIRED` | Archived (auto or manual) | System/Content Admin |

### State Transition Rules

| From | To | Action | Requirements |
|------|-----|--------|--------------|
| DRAFT | IN_REVIEW | Submit for review | Content must pass validation |
| IN_REVIEW | DRAFT | Reject with feedback | Reviewer provides comment |
| IN_REVIEW | APPROVED | Approve | Reviewer signs off |
| APPROVED | PUBLISHED | Publish | Retires current published version |
| APPROVED | DRAFT | Revoke approval | Rare, requires admin |
| PUBLISHED | RETIRED | Archive | New version published or manual |
| * | DRAFT | Clone for edit | Creates new version |

## Database Schema

### Entity Relationship

```
┌─────────────────────┐       ┌──────────────────────────┐
│  learning_objects   │       │ learning_object_versions │
├─────────────────────┤       ├──────────────────────────┤
│ id (PK)             │──────<│ learning_object_id (FK)  │
│ tenant_id           │       │ id (PK)                  │
│ slug                │       │ version_number           │
│ title               │       │ state                    │
│ subject             │       │ content_json             │
│ grade_band          │       │ accessibility_json       │
│ primary_skill_id    │       │ standards_json           │
│ is_active           │       │ metadata_json            │
│ created_by_user_id  │       │ created_by_user_id       │
│ created_at          │       │ reviewed_by_user_id      │
│ updated_at          │       │ approved_by_user_id      │
└─────────────────────┘       │ published_at             │
         │                    └──────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐       ┌──────────────────────────┐
│ learning_object_tags│       │  learning_object_skills  │
├─────────────────────┤       ├──────────────────────────┤
│ id (PK)             │       │ id (PK)                  │
│ learning_object_id  │       │ learning_object_version_id│
│ tag                 │       │ skill_id                 │
└─────────────────────┘       │ weight                   │
                              └──────────────────────────┘
```

### Key Tables

#### `learning_objects`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID? | NULL = global/shared content |
| `slug` | TEXT | URL-safe identifier, unique per tenant |
| `title` | TEXT | Human-readable title |
| `subject` | ENUM | ELA, MATH, SCIENCE, SEL, SPEECH, OTHER |
| `grade_band` | ENUM | K_2, G3_5, G6_8, G9_12 |
| `primary_skill_id` | UUID? | FK to skills table |
| `is_active` | BOOLEAN | Soft-delete flag |
| `created_by_user_id` | UUID | Author |

#### `learning_object_versions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `learning_object_id` | UUID | FK to parent LO |
| `version_number` | INTEGER | Auto-incremented (1, 2, 3...) |
| `state` | ENUM | DRAFT, IN_REVIEW, APPROVED, PUBLISHED, RETIRED |
| `content_json` | JSONB | Structured content (see below) |
| `accessibility_json` | JSONB | Alt text, reading level, supports |
| `standards_json` | JSONB | CCSS, NGSS alignments |
| `metadata_json` | JSONB | Duration, modality, keywords |
| `published_at` | TIMESTAMPTZ | When published (auto-set) |

## Content JSON Structure

Content is stored as JSONB with a discriminator `type` field:

### Reading Passage with Questions

```json
{
  "type": "reading_passage_with_questions",
  "body": {
    "passage": {
      "text": "During winter, dogs need special care...",
      "lexileLevel": 650,
      "estimatedReadTimeMinutes": 3,
      "genre": "nonfiction"
    },
    "questions": [
      {
        "id": "q1",
        "type": "multiple_choice",
        "prompt": "What is the main idea of the passage?",
        "choices": [
          "Dogs don't like winter",
          "Dogs need extra care in cold weather",
          "Winter is dangerous for all pets"
        ],
        "correctChoiceIndex": 1,
        "dokLevel": 2
      }
    ]
  }
}
```

### Math Problem

```json
{
  "type": "math_problem",
  "body": {
    "problem": {
      "id": "p1",
      "prompt": "Solve for x: 2x + 5 = 13",
      "problemType": "single_answer",
      "correctAnswer": 4,
      "hints": [
        "First, subtract 5 from both sides",
        "Then divide both sides by 2"
      ],
      "solution": "2x + 5 = 13\n2x = 8\nx = 4"
    }
  }
}
```

### SEL Check-In

```json
{
  "type": "sel_check_in",
  "body": {
    "checkInType": "emotion",
    "prompt": "How are you feeling right now?",
    "options": [
      { "id": "happy", "label": "Happy", "emoji": "😊", "value": 5 },
      { "id": "okay", "label": "Okay", "emoji": "😐", "value": 3 },
      { "id": "sad", "label": "Sad", "emoji": "😢", "value": 1 }
    ],
    "followUpPrompt": "Would you like to share more about how you're feeling?"
  }
}
```

### Supported Content Types

| Type | Description |
|------|-------------|
| `reading_passage` | Text passage only |
| `reading_passage_with_questions` | Passage + comprehension questions |
| `math_problem` | Single math problem |
| `math_problem_set` | Collection of related problems |
| `sel_check_in` | Emotional/readiness check-in |
| `sel_scenario` | Scenario with reflection prompts |
| `video_lesson` | Video with optional questions |
| `interactive_game` | Gamified learning activity |
| `speech_exercise` | Speech/language therapy exercise |
| `assessment_item` | Standalone assessment question |

## Skill Alignment

### Primary Skill

Each Learning Object has an optional `primary_skill_id` linking to the Virtual Brain skill graph:

```sql
-- Find LOs for a specific skill
SELECT lo.*
FROM learning_objects lo
WHERE lo.primary_skill_id = :skillId
  AND lo.is_active = true;
```

### Secondary Skills (Version-Specific)

Versions can have additional skill alignments with relevance weights:

```sql
-- Find all skills for a published version
SELECT s.skill_code, los.weight
FROM learning_object_skills los
JOIN skills s ON los.skill_id = s.id
JOIN learning_object_versions lov ON los.learning_object_version_id = lov.id
WHERE lov.id = :versionId;
```

### Weight Semantics

| Weight | Meaning |
|--------|---------|
| 1.0 | Primary focus - directly teaches/assesses the skill |
| 0.7-0.9 | Strong alignment - significantly practices the skill |
| 0.4-0.6 | Moderate alignment - touches on the skill |
| 0.1-0.3 | Weak alignment - peripheral skill involvement |

## Global vs Tenant-Specific Content

### Global Content (`tenant_id = NULL`)

- Available to all tenants
- Created by platform content team
- Cannot be edited by tenants (they can clone)
- Forms the "standard library" of content

### Tenant Content (`tenant_id = <uuid>`)

- Only visible to that tenant
- Created by tenant's content authors
- Can be customized for tenant's curriculum

### Query Pattern

```sql
-- Get content available to a tenant (global + tenant-specific)
SELECT lo.*
FROM learning_objects lo
WHERE (lo.tenant_id IS NULL OR lo.tenant_id = :tenantId)
  AND lo.is_active = true
  AND lo.subject = :subject
  AND lo.grade_band = :gradeBand;
```

## Accessibility Metadata

```json
{
  "altText": "A dog wearing a winter coat in the snow",
  "readingLevel": {
    "fleschKincaid": 4.2,
    "lexile": 650
  },
  "supports": {
    "dyslexia": true,
    "adhd": true,
    "visualImpairment": true,
    "hearingImpairment": false
  },
  "language": "en",
  "ttsAvailable": true,
  "closedCaptionsAvailable": false
}
```

## Standards Alignment

```json
{
  "ccss": [
    {
      "code": "CCSS.ELA-LITERACY.RL.3.1",
      "description": "Ask and answer questions to demonstrate understanding",
      "alignmentStrength": "primary"
    }
  ],
  "state": [
    {
      "stateCode": "TX",
      "standards": [
        {
          "code": "TEKS.ELA.3.6.A",
          "alignmentStrength": "secondary"
        }
      ]
    }
  ]
}
```

## Querying Published Content

### Get Current Published Version for Runtime

```sql
SELECT lov.*
FROM learning_object_versions lov
JOIN learning_objects lo ON lov.learning_object_id = lo.id
WHERE lo.id = :learningObjectId
  AND lov.state = 'PUBLISHED'
  AND (lo.tenant_id IS NULL OR lo.tenant_id = :tenantId)
LIMIT 1;
```

### Find Content by Skill for Adaptive Selection

```sql
SELECT lo.*, lov.content_json
FROM learning_objects lo
JOIN learning_object_versions lov ON lo.id = lov.learning_object_id
WHERE lo.primary_skill_id = :skillId
  AND lov.state = 'PUBLISHED'
  AND lo.is_active = true
  AND (lo.tenant_id IS NULL OR lo.tenant_id = :tenantId)
ORDER BY (lov.metadata_json->>'difficultyLevel')::int;
```

## API Usage Examples

### Create Learning Object

```typescript
const lo = await contentService.createLearningObject({
  tenantId: null, // Global content
  slug: 'ela-g3-dogs-winter-passage',
  title: 'Dogs in Winter',
  subject: 'ELA',
  gradeBand: 'G3_5',
  primarySkillId: 'skill-uuid-reading-comp',
  tags: ['reading', 'animals', 'winter', 'nonfiction']
});
```

### Create Version

```typescript
const version = await contentService.createVersion({
  learningObjectId: lo.id,
  changeSummary: 'Initial content creation',
  contentJson: {
    type: 'reading_passage_with_questions',
    body: { passage: {...}, questions: [...] }
  },
  accessibilityJson: { ttsAvailable: true, language: 'en' },
  standardsJson: { ccss: [...] },
  skillAlignments: [
    { skillId: 'skill-main-idea', weight: 0.8 },
    { skillId: 'skill-inference', weight: 0.5 }
  ]
});
```

### Transition State

```typescript
// Submit for review
await contentService.transitionState({
  versionId: version.id,
  targetState: 'IN_REVIEW',
  comment: 'Ready for review'
});

// Approve
await contentService.transitionState({
  versionId: version.id,
  targetState: 'APPROVED',
  comment: 'LGTM - ready to publish'
});

// Publish
await contentService.publish(version.id);
```

## Future Considerations

### Ingestion Pipeline

The model supports external content ingestion via:

- `metadata_json.externalId` - ID in source system
- `metadata_json.sourceSystem` - Source system identifier
- Idempotent upsert by `(slug, tenant_id)`

### Content Validation

Future enhancement: JSON Schema validation for each `type` in `content_json` to ensure structural integrity before publication.

### A/B Testing

Multiple PUBLISHED versions could be supported with a `variant` field for A/B testing content effectiveness.
