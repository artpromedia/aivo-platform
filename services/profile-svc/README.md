# Profile Service

Neurodiversity profiles and accommodations service for learners.

## Overview

This service manages learner neurodiversity profiles, accommodations, and IEP/504 document references. It provides:

- **Non-diagnostic profile storage**: Learning preferences, sensory needs, and UI accessibility settings
- **Accommodations management**: Explicit accommodations aligned with IEP/504 workflows
- **AI integration endpoint**: Compact profile data for AI orchestrator consumption
- **Goal linking**: Connect profiles to learner goals

## Key Design Principles

1. **Non-Diagnostic Language**: We store *preferences* and *what helps*, not diagnoses
   - ✅ "Learner benefits from visual supports"
   - ❌ "Learner has autism"

2. **Privacy-First**: Profiles contain sensitive information
   - RBAC-enforced access (parents, assigned teachers, district admins)
   - Platform admins see only de-identified aggregates

3. **Multi-Tenant Isolation**: All data scoped by `tenantId` + `learnerId`

## API Endpoints

### Profile Management
- `GET /learners/:learnerId/profile` - Get merged profile + accommodations
- `POST /learners/:learnerId/profile` - Create profile
- `PATCH /learners/:learnerId/profile` - Update profile (versioned)

### Accommodations
- `GET /learners/:learnerId/accommodations` - List accommodations
- `POST /learners/:learnerId/accommodations` - Create accommodation
- `PATCH /learners/:learnerId/accommodations/:id` - Update accommodation
- `DELETE /learners/:learnerId/accommodations/:id` - Soft delete

### AI Integration (Internal)
- `GET /internal/ai/learners/:learnerId/profile-for-ai` - Compact profile for AI

## Events (NATS)

- `profile.updated` - Profile was created or updated
- `accommodation.created` - New accommodation added
- `accommodation.updated` - Accommodation modified
- `accommodation.deleted` - Accommodation removed

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Run in development mode
pnpm dev

# Run tests
pnpm test
```
