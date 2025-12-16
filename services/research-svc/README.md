# Research Service

> Researcher & Insights Export Portal - De-identified, Governed Data Access

## Overview

The Research Service provides a governed platform for district administrators and approved researchers to access de-identified analytics data for program evaluation and research purposes. It implements strict privacy controls including k-anonymity, pseudonymization, and comprehensive audit trails for FERPA/COPPA compliance.

## Features

### Core Capabilities

- **Research Project Management** - Create, submit, approve/reject research projects
- **Data Use Agreements (DUAs)** - Versioned legal agreements governing data access
- **Cohort Definitions** - Filter-based learner populations for studies
- **Dataset Definitions** - Schema definitions with privacy transformations
- **Export Jobs** - Asynchronous data export with de-identification
- **Access Grants** - Scoped access control for researchers
- **Audit Logging** - Immutable logs of all actions

### Privacy Protections

| Protection | Description |
|------------|-------------|
| **k-Anonymity** | Groups with <10 learners are suppressed |
| **Pseudonymization** | Learner IDs converted via HMAC-SHA256 (project-scoped) |
| **Date Coarsening** | Timestamps rounded to day/week/month |
| **Column Exclusion** | PII columns (email, name, IP) auto-excluded |
| **Noise Injection** | Optional Laplacian noise for differential privacy |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Web District Portal                          │
│                  (Next.js Research Portal UI)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Research Service                            │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ Project CRUD  │  │ Export Engine │  │ Privacy Guard     │   │
│  │ DUA Mgmt      │  │ Job Queue     │  │ k-Anonymity       │   │
│  │ Access Grants │  │ File Gen      │  │ Pseudonymization  │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐         ┌───────────┐         ┌───────────┐
   │ Postgres│         │   NATS    │         │ Analytics │
   │ (state) │         │ JetStream │         │ Warehouse │
   └─────────┘         └───────────┘         └───────────┘
```

## API Endpoints

### Projects
```
POST   /research/projects           Create research project
GET    /research/projects           List projects
GET    /research/projects/:id       Get project details
PATCH  /research/projects/:id       Update project
POST   /research/projects/:id/submit    Submit for approval
POST   /research/projects/:id/approve   Approve project (admin)
POST   /research/projects/:id/reject    Reject project (admin)
POST   /research/projects/:id/close     Close project
```

### Exports
```
POST   /research/exports            Request new export
GET    /research/exports            List exports
GET    /research/exports/:id        Get export details
GET    /research/exports/:id/download   Get signed download URL
```

### Access
```
POST   /research/access-grants      Grant researcher access
GET    /research/my-access          Get current user's access
DELETE /research/access-grants/:id  Revoke access
POST   /research/accept-dua         Accept DUA
```

### Data
```
POST   /research/cohorts            Create cohort
GET    /research/cohorts            List cohorts
GET    /research/cohorts/:id/estimate   Estimate cohort size
POST   /research/dataset-definitions    Create dataset definition
GET    /research/dataset-definitions    List definitions
GET    /research/dataset-templates      List pre-approved templates
```

## Data Models

### Project Status Flow
```
DRAFT → PENDING_APPROVAL → APPROVED → CLOSED
                        ↘ REJECTED
```

### Access Scopes
| Scope | Description |
|-------|-------------|
| `AGG_ONLY` | Can only export aggregated data |
| `DEIDENTIFIED_LEARNER_LEVEL` | Can export per-learner de-identified data |
| `INTERNAL_FULL_ACCESS` | Internal staff with broader access |

## Development

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- NATS Server with JetStream

### Setup
```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev

# Start export worker (separate terminal)
pnpm dev:worker
```

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/research
WAREHOUSE_URL=postgresql://user:pass@localhost:5433/warehouse
NATS_URL=nats://localhost:4222
JWT_SECRET=your-jwt-secret
PORT=4020
```

### Testing
```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# Coverage
pnpm test -- --coverage
```

## Export File Formats

| Format | Use Case |
|--------|----------|
| **CSV** | Spreadsheet analysis, R, SPSS |
| **JSON** | Web applications, custom processing |
| **Parquet** | Large datasets, data science, Spark |

## Compliance

### FERPA
- All student data is de-identified per §99.31(b)
- Audit logs retained for 5+ years
- Access requires legitimate educational interest

### COPPA
- No personal information of children under 13 exposed
- Parental consent workflows integrated
- Data minimization principles applied

## Integration

### With Analytics Warehouse
The service reads from the analytics warehouse's star schema:
- `fact_sessions` - Learning session metrics
- `fact_activity_event` - Granular activity events
- `fact_ai_usage` - AI tutor interactions
- `dim_learner` - Learner dimensions (de-identified)
- `dim_content` - Content metadata

### With NATS
Events published:
- `research.project.created/approved/rejected`
- `research.export.requested/completed/failed`
- `research.access.granted/revoked`

## Roadmap

- [ ] Differential privacy with formal ε guarantees
- [ ] Federated analytics (no data leaves tenant)
- [ ] Secure multi-party computation for cross-district studies
- [ ] Automated IRB integration
- [ ] ML model export (privacy-preserving)
