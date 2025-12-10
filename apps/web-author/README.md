# Aivo Author (web-author)

Content authoring UI for creating and managing Learning Objects.

## Overview

This Next.js application provides a complete authoring workflow for curriculum developers:

- **Create** Learning Objects with metadata (subject, grade band, skills, tags)
- **Edit** version content (reading passages, math problems, etc.)
- **Manage** accessibility settings and standards alignment
- **Review** and transition versions through workflow states

## Routes

| Route                                               | Description                 |
| --------------------------------------------------- | --------------------------- |
| `/learning-objects`                                 | List view with filters      |
| `/learning-objects/new`                             | Create new LO form          |
| `/learning-objects/[loId]`                          | LO detail with version list |
| `/learning-objects/[loId]/versions/[versionNumber]` | Version editor              |
| `/login`                                            | Authentication (dev mode)   |

## Roles & Permissions

| Role                     | Capabilities                               |
| ------------------------ | ------------------------------------------ |
| `CURRICULUM_AUTHOR`      | Create LOs, edit drafts, submit for review |
| `CURRICULUM_REVIEWER`    | Review, approve, or reject submissions     |
| `DISTRICT_CONTENT_ADMIN` | All of the above + publish/retire          |

## Features

### Content Editor

- Reading Passage: Text, Lexile level, multiple-choice questions
- Math Problem: Problem statement, solution steps, correct answer
- Generic: Free-form content

### Accessibility Tab

- Alt text for media
- Support flags (dyslexia font, reduced stimuli, high contrast, screen reader)
- Supplementary resource URLs (audio, sign language)

### Standards & Skills Tab

- Skill multi-select from learner-model-svc
- Standards search/autocomplete (CCSS, NGSS)

### Workflow

```
DRAFT → IN_REVIEW → APPROVED → PUBLISHED → RETIRED
         ↓
       DRAFT (rejected)
```

## Development

```bash
# Install dependencies
pnpm install

# Run dev server (port 3002)
pnpm --filter @aivo/web-author dev

# Run tests
pnpm --filter @aivo/web-author test

# Build
pnpm --filter @aivo/web-author build
```

## Environment Variables

| Variable                            | Description                | Default                      |
| ----------------------------------- | -------------------------- | ---------------------------- |
| `NEXT_PUBLIC_AUTHORING_SVC_URL`     | content-authoring-svc URL  | `/api/authoring`             |
| `NEXT_PUBLIC_LEARNER_MODEL_SVC_URL` | learner-model-svc URL      | `/api/learner-model`         |
| `AUTH_SVC_URL`                      | auth-svc URL               | `http://localhost:4001`      |
| `AUTH_PUBLIC_KEY`                   | RS256 public key for JWT   | (none)                       |
| `JWT_SECRET`                        | HS256 secret for dev login | `dev-secret-key-for-testing` |

## API Integration

The app connects to `content-authoring-svc` for all LO/version operations:

- `GET/POST /learning-objects` - List/create LOs
- `GET/PATCH /learning-objects/:loId` - Get/update LO
- `GET /learning-objects/:loId/versions` - List versions
- `GET/PATCH /learning-objects/:loId/versions/:num` - Get/update version
- `POST /learning-objects/:loId/versions/:num/submit-review` - Submit
- `POST /learning-objects/:loId/versions/:num/approve` - Approve
- `POST /learning-objects/:loId/versions/:num/reject` - Reject
- `POST /learning-objects/:loId/versions/:num/publish` - Publish
- `POST /learning-objects/:loId/versions/:num/retire` - Retire

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- `@aivo/ui-web` design system
- `@aivo/ts-rbac` for role definitions
- Vitest + Testing Library
