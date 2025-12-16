# AIVO Platform - Database Setup Guide

This guide covers setting up databases for local development, running migrations, and seeding data across all AIVO platform services.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Running Migrations](#running-migrations)
- [Seeding Data](#seeding-data)
- [Resetting Databases](#resetting-databases)
- [Service Dependency Order](#service-dependency-order)
- [Troubleshooting](#troubleshooting)
- [Multi-Tenant Data Model](#multi-tenant-data-model)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| PostgreSQL | 15.0+ | Primary database |
| Node.js | 20.x | Runtime for services |
| pnpm | 8.x+ | Package manager |
| Docker | 20.x+ | Optional: containerized PostgreSQL |

### Verify Installation

```powershell
# Check PostgreSQL
psql --version

# Check Node.js  
node --version

# Check pnpm
pnpm --version
```

### PostgreSQL Setup

**Option 1: Docker (Recommended for development)**

```powershell
docker run -d `
  --name aivo-postgres `
  -e POSTGRES_USER=aivo `
  -e POSTGRES_PASSWORD=aivo_dev_password `
  -e POSTGRES_DB=aivo_dev `
  -p 5432:5432 `
  postgres:15-alpine
```

**Option 2: Local PostgreSQL Installation**

Create the development database:

```sql
CREATE DATABASE aivo_dev;
CREATE USER aivo WITH PASSWORD 'aivo_dev_password';
GRANT ALL PRIVILEGES ON DATABASE aivo_dev TO aivo;
```

---

## Quick Start

### 1. Set Up Environment Variables

Create a `.env` file in the repository root:

```bash
# Database connection
DATABASE_URL="postgresql://aivo:aivo_dev_password@localhost:5432/aivo_dev"

# Service-specific overrides (optional)
# TENANT_SVC_DATABASE_URL="postgresql://..."
# AUTH_SVC_DATABASE_URL="postgresql://..."
```

### 2. Run Full Database Setup

**Windows (PowerShell):**

```powershell
# Full setup: migrate all services and seed data
.\scripts\db-setup.ps1 -Command all

# Or use individual scripts
.\scripts\db-migrate.ps1   # Run migrations only
.\scripts\db-seed.ps1      # Seed data only
.\scripts\db-reset.ps1     # Reset all databases
```

**Linux/macOS (Bash):**

```bash
# Full setup
./scripts/db-setup.sh all

# Individual commands
./scripts/db-setup.sh migrate
./scripts/db-setup.sh seed
./scripts/db-setup.sh reset
```

### 3. Check Status

```powershell
.\scripts\db-setup.ps1 -Command status
```

---

## Environment Configuration

### Database URLs

Each service can use a separate database or share one. The default setup uses a single PostgreSQL instance with schema separation.

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Default connection for all services | Required |
| `{SERVICE}_DATABASE_URL` | Service-specific override | Optional |

### Example Multi-Database Setup

For production-like isolation:

```bash
# Core services
AUTH_SVC_DATABASE_URL="postgresql://user:pass@db1:5432/auth"
TENANT_SVC_DATABASE_URL="postgresql://user:pass@db1:5432/tenant"

# Learning services
SESSION_SVC_DATABASE_URL="postgresql://user:pass@db2:5432/session"
LEARNER_MODEL_SVC_DATABASE_URL="postgresql://user:pass@db2:5432/learner_model"

# Content services
CONTENT_SVC_DATABASE_URL="postgresql://user:pass@db3:5432/content"
```

---

## Running Migrations

### All Services

```powershell
.\scripts\db-migrate.ps1

# Or with verbose output
.\scripts\db-setup.ps1 -Command migrate
```

### Single Service

```powershell
cd services/auth-svc
npx prisma migrate deploy
```

### Generate Migration

After modifying a Prisma schema:

```powershell
cd services/auth-svc
npx prisma migrate dev --name add_user_roles
```

### Migration Status

```powershell
cd services/auth-svc
npx prisma migrate status
```

---

## Seeding Data

### All Services

```powershell
.\scripts\db-seed.ps1
```

### Single Service

```powershell
cd services/auth-svc
npx tsx prisma/seed.ts
```

### Seed Data Overview

The seed scripts create a comprehensive development environment with **26 seeded services**:

| Service | Data Created |
|---------|--------------|
| **tenant-svc** | Development tenant, Demo tenant, 3 schools, 6 classrooms |
| **auth-svc** | Admin, 2 teachers, therapist, parent, 5 learners (10 users total) |
| **profile-svc** | 5 learner profiles with learning styles, sensory preferences |
| **content-svc** | 8 learning objects (Math, ELA, Science, SEL) with versions |
| **content-authoring-svc** | 4 LOs, 5 versions, QA checks, translations |
| **learner-model-svc** | 23 skills, 11 prerequisites, 3 virtual brains |
| **session-svc** | 9 sessions with events across learners |
| **engagement-svc** | 18 badge definitions, learner profiles, badge awards |
| **goal-svc** | 4 goals with objectives across 3 learners |
| **focus-svc** | Focus states, 20 ping logs, 3 interventions |
| **homework-helper-svc** | 3 submissions with steps |
| **assessment-svc** | 5 baseline profiles, 4 attempts, skill estimates |
| **baseline-svc** | 3 profiles, 2 attempts, items, responses, estimates |
| **messaging-svc** | 3 conversations, 7 participants, 12 messages |
| **notify-svc** | 12 notification templates |
| **marketplace-svc** | 4 vendors, 5 items, 3 tenant installations |
| **billing-svc** | 7 plans, 2 accounts, 3 subscriptions |
| **lti-svc** | 2 LTI tools (Canvas, Schoology), 4 links |
| **teacher-planning-svc** | 4 goals, 9 objectives, 3 session plans |
| **collaboration-svc** | Care teams, action plans, tasks, notes, meetings |
| **embedded-tools-svc** | 3 tool definitions, 2 sessions, 8 events |
| **integration-svc** | 2 webhook endpoints, API keys, deliveries |
| **sis-sync-svc** | 3 SIS providers, sync runs, field mappings |
| **device-mgmt-svc** | 5 devices, 3 pools, policies, events |
| **sandbox-svc** | 3 partners, sandbox tenants, API keys |
| **research-svc** | 2 research projects, cohorts, exports, DUAs |

### Default User Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@aivo.dev` | `Admin123!@#` | Platform Admin |
| `author@aivo.dev` | `Author123!@#` | Content Author |
| `teacher@aivo.dev` | `Teacher123!@#` | Teacher |
| `therapist@aivo.dev` | `Therapist123!@#` | Therapist |
| `parent@aivo.dev` | `Parent123!@#` | Parent |
| `alex@aivo.dev` | `Learner123!@#` | Learner (active) |
| `jordan@aivo.dev` | `Learner123!@#` | Learner (new) |
| `sam@aivo.dev` | `Learner123!@#` | Learner |
| `taylor@aivo.dev` | `Learner123!@#` | Learner |
| `morgan@aivo.dev` | `Learner123!@#` | Learner |

---

## Resetting Databases

⚠️ **Warning**: This will delete all data!

### Reset All Services

```powershell
.\scripts\db-reset.ps1

# Equivalent to:
.\scripts\db-setup.ps1 -Command reset
```

### Reset Single Service

```powershell
cd services/auth-svc
npx prisma migrate reset --force
```

### Reset and Re-seed

```powershell
.\scripts\db-reset.ps1
.\scripts\db-seed.ps1
```

---

## Service Dependency Order

Services are migrated in dependency order to ensure foreign key relationships work correctly:

### Tier 1: Core Infrastructure
1. `tenant-svc` - Multi-tenant foundation
2. `auth-svc` - Users, roles, authentication
3. `profile-svc` - Learner profiles

### Tier 2: Content & Learning
4. `content-svc` - Learning objects catalog
5. `content-authoring-svc` - Authoring workflow
6. `learner-model-svc` - Skills, virtual brains
7. `session-svc` - Learning sessions

### Tier 3: Engagement & Support
8. `engagement-svc` - Badges, gamification
9. `goal-svc` - Learning goals
10. `focus-svc` - Focus tracking
11. `homework-helper-svc` - Homework scaffolding

### Tier 4: Assessment & Analytics
12. `assessment-svc` - Baseline assessments
13. `baseline-svc` - Baseline profiles and attempts
14. `analytics-svc` - Usage analytics

### Tier 5: Communication & Collaboration
15. `messaging-svc` - In-app messaging
16. `notify-svc` - Push notifications
17. `collaboration-svc` - Care team coordination

### Tier 6: Marketplace & Integrations
18. `marketplace-svc` - Content marketplace
19. `lti-svc` - LMS integrations
20. `integration-svc` - Webhooks, API keys
21. `sis-sync-svc` - Student Information System sync

### Tier 7: Administrative & Support
22. `billing-svc` - Billing & subscriptions
23. `teacher-planning-svc` - Teacher tools
24. `embedded-tools-svc` - Embedded learning tools
25. `device-mgmt-svc` - Device management
26. `sandbox-svc` - Partner sandbox environments
27. `research-svc` - Research data exports

---

## Troubleshooting

### Common Issues

#### "Database does not exist"

```powershell
# Create the database
psql -U postgres -c "CREATE DATABASE aivo_dev;"
```

#### "Connection refused"

```powershell
# Check PostgreSQL is running
docker ps | Select-String postgres

# Or for local install
Get-Service postgresql*
```

#### "Migration failed: relation already exists"

```powershell
# Reset the migration state
cd services/[service-name]
npx prisma migrate reset --force
```

#### "Prisma Client not generated"

```powershell
cd services/[service-name]
npx prisma generate
```

### Validate All Schemas

```powershell
npx tsx scripts/validate-schemas.ts
```

### View Migration History

```powershell
cd services/auth-svc
npx prisma migrate status
```

### Debug Connection Issues

```powershell
# Test connection
psql $env:DATABASE_URL -c "SELECT 1;"

# Check connection string format
echo $env:DATABASE_URL
```

---

## Multi-Tenant Data Model

### Tenant Isolation Strategy

AIVO uses **row-level tenant isolation**:

- Every table has a `tenant_id` column
- All queries filter by `tenant_id`
- Cross-tenant data access is prevented at the application layer

### Fixed ID Patterns (for seeding)

Seed data uses predictable UUIDs for cross-service references:

| Entity Type | UUID Pattern |
|-------------|--------------|
| Tenants | `00000000-0000-0000-0000-00000000000X` |
| Schools | `00000000-0000-0000-0001-00000000000X` |
| Classrooms | `00000000-0000-0000-0002-00000000000X` |
| Staff Users | `00000000-0000-0000-1000-00000000000X` |
| Learner Users | `00000000-0000-0000-2000-00000000000X` |
| Learning Objects | `00000000-0000-0000-4000-00000000000X` |
| Badges | `00000000-0000-0000-5000-00000000000X` |
| Sessions | `00000000-0000-0000-6000-00000000000X` |

### Development Tenant

```
ID: 00000000-0000-0000-0000-000000000001
Name: AIVO Development
Slug: aivo-dev
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  tenant_svc │  │   auth_svc  │  │ profile_svc │         │
│  │   schema    │  │   schema    │  │   schema    │  ...    │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                    Shared Functions                          │
│  • UUID generation                                           │
│  • Timestamp triggers                                        │
│  • Tenant validation                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

After database setup:

1. **Start services**: `pnpm dev`
2. **Run tests**: `pnpm test`
3. **Open API docs**: `http://localhost:3000/api-docs`

For questions, see the [Developer Documentation](./README.md) or ask in #platform-dev.
