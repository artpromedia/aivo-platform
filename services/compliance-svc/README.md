# AIVO Compliance Service

Multi-framework compliance monitoring and dashboard service.

## Overview

The Compliance Service provides:

- **Multi-Framework Support**: FERPA, COPPA, GDPR, SOC 2, HIPAA, and more
- **Control Management**: Track implementation status of compliance controls
- **Assessment/Audit**: Manage compliance assessments and audits
- **Evidence Management**: Attach and track evidence for controls
- **Findings & Gaps**: Track compliance findings with severity and remediation
- **Dashboard**: Real-time compliance scores and trend tracking
- **Alerts**: Proactive alerts for expiring evidence and overdue findings

## Supported Frameworks

| Framework | Description |
|-----------|-------------|
| FERPA | Family Educational Rights and Privacy Act |
| COPPA | Children's Online Privacy Protection Act |
| GDPR | General Data Protection Regulation |
| CCPA | California Consumer Privacy Act |
| SOC2 | Service Organization Control 2 |
| HIPAA | Health Insurance Portability and Accountability Act |
| PCI_DSS | Payment Card Industry Data Security Standard |
| ISO27001 | Information Security Management |
| NIST_CSF | NIST Cybersecurity Framework |
| CIPA | Children's Internet Protection Act |
| IDEA | Individuals with Disabilities Education Act |
| CUSTOM | Custom/internal framework |

## API Endpoints

### Dashboard

```
GET  /compliance/dashboard              - Get compliance summary
GET  /compliance/dashboard/trend        - Get compliance trend
POST /compliance/dashboard/snapshot     - Take compliance snapshot
GET  /compliance/dashboard/alerts       - Get compliance alerts
POST /compliance/dashboard/alerts/:id/read    - Mark alert read
POST /compliance/dashboard/alerts/:id/dismiss - Dismiss alert
```

### Frameworks

```
POST   /compliance/frameworks           - Enable a framework
GET    /compliance/frameworks           - List frameworks
GET    /compliance/frameworks/:id       - Get framework details
GET    /compliance/frameworks/:id/summary - Get framework compliance summary
PATCH  /compliance/frameworks/:id       - Update framework
DELETE /compliance/frameworks/:id       - Delete framework
```

### Controls

```
POST   /compliance/frameworks/:id/controls - Create control
GET    /compliance/frameworks/:id/controls - List controls
GET    /compliance/controls/:id         - Get control details
PATCH  /compliance/controls/:id         - Update control
POST   /compliance/controls/:id/status  - Update control status
POST   /compliance/controls/:id/evidence - Attach evidence
DELETE /compliance/controls/:id         - Delete control
```

### Assessments

```
POST   /compliance/assessments          - Create assessment
GET    /compliance/assessments          - List assessments
GET    /compliance/assessments/:id      - Get assessment
PATCH  /compliance/assessments/:id      - Update assessment
POST   /compliance/assessments/:id/status - Update status
POST   /compliance/assessments/:id/signoff - Sign off assessment
DELETE /compliance/assessments/:id      - Delete assessment
```

### Findings

```
POST   /compliance/findings             - Create finding
GET    /compliance/findings             - List findings
GET    /compliance/findings/stats       - Get finding statistics
GET    /compliance/findings/:id         - Get finding
PATCH  /compliance/findings/:id         - Update finding
POST   /compliance/findings/:id/status  - Update status
POST   /compliance/findings/:id/verify  - Verify remediation
DELETE /compliance/findings/:id         - Delete finding
```

### Evidence

```
POST   /compliance/evidence             - Create evidence
GET    /compliance/evidence             - List evidence
GET    /compliance/evidence/:id         - Get evidence
POST   /compliance/evidence/:id/review  - Review evidence
DELETE /compliance/evidence/:id         - Delete evidence
```

## Control Lifecycle

```
NOT_STARTED → IN_PROGRESS → IMPLEMENTED
     ↓            ↓              ↓
    NOT_APPLICABLE    PARTIALLY_IMPLEMENTED
```

## Finding Lifecycle

```
OPEN → IN_REMEDIATION → REMEDIATED → CLOSED
  ↓                           ↓
ACCEPTED_RISK            FALSE_POSITIVE
```

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate:dev

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Environment Variables

See `.env.example` for all configuration options.

## Architecture

```
compliance-svc/
├── src/
│   ├── index.ts          # Entry point
│   ├── app.ts            # Fastify app setup
│   ├── config.ts         # Configuration
│   ├── prisma.ts         # Database client
│   ├── routes/           # API routes
│   │   ├── dashboard.ts  # Dashboard endpoints
│   │   ├── frameworks.ts # Framework endpoints
│   │   └── findings.ts   # Finding endpoints
│   ├── services/         # Business logic
│   │   ├── dashboardService.ts
│   │   ├── frameworkService.ts
│   │   ├── controlService.ts
│   │   ├── assessmentService.ts
│   │   └── findingService.ts
│   ├── middleware/       # Auth middleware
│   └── types/            # TypeScript types
├── prisma/
│   └── schema.prisma     # Database schema
└── test/                 # Tests
```

## Compliance Score Calculation

The compliance score is calculated as:

```
Score = (Implemented Controls / Applicable Controls) × 100
```

Where:
- **Applicable Controls** = Total Controls - Not Applicable Controls
- Only `IMPLEMENTED` status counts as passed
