# Content Service

Service for managing Learning Objects - versioned, reviewable units of learning content.

## Overview

The content-svc manages the lifecycle of Learning Objects (LOs), which are individual units of learning content such as:

- Reading passages with comprehension questions
- Math problems and problem sets
- SEL check-ins and scenarios
- Video lessons
- Interactive games
- Speech/language exercises

## Key Concepts

### Learning Object vs Version

- **Learning Object**: Logical identity (e.g., "ELA G3 reading passage: Dogs in Winter")
- **Learning Object Version**: Concrete content instance with a workflow state

### Workflow States

```
DRAFT → IN_REVIEW → APPROVED → PUBLISHED
            ↓           ↓
         DRAFT       DRAFT (rejected)
```

Only one `PUBLISHED` version per LO per tenant at a time.

### Global vs Tenant Content

- `tenant_id = NULL`: Global/shared content available to all tenants
- `tenant_id = <uuid>`: Tenant-specific content

## Database Schema

See migration at: `prisma/migrations/20251209_001_learning_objects/migration.sql`

### Tables

| Table | Purpose |
|-------|---------|
| `learning_objects` | Logical LO identity and metadata |
| `learning_object_versions` | Versioned content with workflow state |
| `learning_object_tags` | Flexible tagging for discovery |
| `learning_object_skills` | Version-specific skill alignments |
| `learning_object_version_transitions` | Audit trail for state changes |

## Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start development server
pnpm dev
```

## API Endpoints

### Learning Objects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/learning-objects` | List LOs with filtering |
| POST | `/learning-objects` | Create new LO |
| GET | `/learning-objects/:id` | Get LO by ID |
| PATCH | `/learning-objects/:id` | Update LO metadata |
| DELETE | `/learning-objects/:id` | Soft-delete LO |

### Versions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/learning-objects/:id/versions` | List versions |
| POST | `/learning-objects/:id/versions` | Create new version |
| GET | `/versions/:id` | Get version by ID |
| PATCH | `/versions/:id` | Update version content |
| POST | `/versions/:id/transition` | Change workflow state |
| POST | `/versions/:id/publish` | Publish version (APPROVED → PUBLISHED) |

### Discovery

| Method | Path | Description |
|--------|------|-------------|
| GET | `/learning-objects/search` | Full-text search |
| GET | `/learning-objects/by-skill/:skillId` | Find LOs for a skill |
| GET | `/learning-objects/published` | Get current published versions |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 4020 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_PUBLIC_KEY_PATH` | Path to JWT public key | - |

## Integration Points

### Virtual Brain (skill_id)

Learning Objects can be aligned to skills in the Virtual Brain via:
- `primary_skill_id` on the LO itself
- `learning_object_skills` junction table for additional skill alignments

### Session Service

When a learner starts an activity, the session-svc fetches the current published version:

```sql
SELECT lov.*
FROM learning_object_versions lov
JOIN learning_objects lo ON lov.learning_object_id = lo.id
WHERE lo.id = :loId
  AND lov.state = 'PUBLISHED'
  AND (lo.tenant_id IS NULL OR lo.tenant_id = :tenantId);
```

### Future: Ingestion Pipeline

The model supports external content ingestion via:
- `metadata_json.externalId` - ID in source system
- `metadata_json.sourceSystem` - Source system identifier
- Idempotent upsert by `(slug, tenant_id)`
