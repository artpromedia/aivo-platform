# Content Authoring Service

REST API for creating and managing Learning Objects through the authoring and publication workflow.

## Overview

This service provides internal tooling for:

- **Curriculum Authors**: Create and edit learning objects
- **Curriculum Reviewers**: Review and approve/reject content
- **District Content Admins**: Manage district-level content and publish
- **Platform Admins**: Full access to all content across tenants

## Quick Start

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Start development server
pnpm dev
```

## API Endpoints

### Learning Objects

| Method | Path                               | Auth Roles    | Description                              |
| ------ | ---------------------------------- | ------------- | ---------------------------------------- |
| POST   | `/api/learning-objects`            | Author, Admin | Create new LO with initial DRAFT version |
| GET    | `/api/learning-objects`            | Author, Admin | List LOs with filters                    |
| GET    | `/api/learning-objects/:loId`      | Author, Admin | Get LO details                           |
| PATCH  | `/api/learning-objects/:loId`      | Author, Admin | Update LO metadata                       |
| DELETE | `/api/learning-objects/:loId`      | Admin         | Soft-delete LO                           |
| POST   | `/api/learning-objects/:loId/tags` | Author, Admin | Replace tags                             |

### Versions

| Method | Path                                              | Auth Roles    | Description                 |
| ------ | ------------------------------------------------- | ------------- | --------------------------- |
| GET    | `/api/learning-objects/:loId/versions`            | Author, Admin | List all versions           |
| POST   | `/api/learning-objects/:loId/versions`            | Author, Admin | Create new version          |
| GET    | `/api/learning-objects/:loId/versions/:vn`        | Author, Admin | Get version details         |
| PATCH  | `/api/learning-objects/:loId/versions/:vn`        | Author, Admin | Update content (DRAFT only) |
| POST   | `/api/learning-objects/:loId/versions/:vn/skills` | Author, Admin | Replace skill alignments    |

### Workflow

| Method | Path                                  | Auth Roles       | Description                 |
| ------ | ------------------------------------- | ---------------- | --------------------------- |
| POST   | `/api/.../versions/:vn/submit-review` | Author           | Submit DRAFT for review     |
| POST   | `/api/.../versions/:vn/approve`       | Reviewer, Admin  | Approve IN_REVIEW version   |
| POST   | `/api/.../versions/:vn/reject`        | Reviewer, Admin  | Reject to DRAFT with reason |
| POST   | `/api/.../versions/:vn/publish`       | Publisher, Admin | Publish APPROVED version    |
| GET    | `/api/review-queue`                   | Reviewer, Admin  | List items awaiting review  |

## Workflow States

```
DRAFT → IN_REVIEW → APPROVED → PUBLISHED
           ↓                      ↓
         DRAFT               RETIRED
        (rejected)     (when new version published)
```

## Roles & Permissions

| Role                   | Create | Edit Own | Edit Any | Review | Publish |
| ---------------------- | ------ | -------- | -------- | ------ | ------- |
| CURRICULUM_AUTHOR      | ✅     | ✅       | ❌       | ❌     | ❌      |
| CURRICULUM_REVIEWER    | ❌     | ❌       | ❌       | ✅     | ❌      |
| DISTRICT_CONTENT_ADMIN | ✅     | ✅       | ✅       | ✅     | ✅      |
| PLATFORM_ADMIN         | ✅     | ✅       | ✅       | ✅     | ✅      |

## Request/Response Examples

### Create Learning Object

```bash
POST /api/learning-objects
Authorization: Bearer <token>

{
  "title": "Reading Comprehension: Main Idea",
  "subject": "ELA",
  "gradeBand": "G3_5",
  "tags": ["reading", "comprehension", "main-idea"]
}
```

Response:

```json
{
  "id": "uuid",
  "slug": "ela-g35-reading-comprehension-main-idea",
  "title": "Reading Comprehension: Main Idea",
  "subject": "ELA",
  "gradeBand": "G3_5",
  "tags": ["reading", "comprehension", "main-idea"],
  "currentVersion": {
    "id": "uuid",
    "versionNumber": 1,
    "state": "DRAFT"
  }
}
```

### Update Version Content

```bash
PATCH /api/learning-objects/:loId/versions/1
Authorization: Bearer <token>

{
  "contentJson": {
    "type": "reading_passage_with_questions",
    "body": {
      "passage": {
        "text": "The sun rose slowly over the mountains...",
        "lexileLevel": 650
      },
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "prompt": "What is the main idea?",
          "choices": ["A", "B", "C"],
          "correctChoiceIndex": 1
        }
      ]
    }
  },
  "changeSummary": "Added passage and comprehension questions"
}
```

### Submit for Review

```bash
POST /api/learning-objects/:loId/versions/1/submit-review
Authorization: Bearer <token>
```

### Approve

```bash
POST /api/learning-objects/:loId/versions/1/approve
Authorization: Bearer <token>
```

### Reject

```bash
POST /api/learning-objects/:loId/versions/1/reject
Authorization: Bearer <token>

{
  "reason": "Questions need DOK level annotations"
}
```

### Publish

```bash
POST /api/learning-objects/:loId/versions/1/publish
Authorization: Bearer <token>
```

## Environment Variables

| Variable       | Description                  | Default |
| -------------- | ---------------------------- | ------- |
| `PORT`         | Server port                  | 4021    |
| `DATABASE_URL` | PostgreSQL connection string | -       |
| `CORS_ORIGIN`  | Allowed CORS origins         | \*      |
| `LOG_LEVEL`    | Logging level                | info    |

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## Database

This service shares the content database with `content-svc`. Tables:

- `learning_objects`
- `learning_object_versions`
- `learning_object_tags`
- `learning_object_skills`
- `learning_object_version_transitions`
