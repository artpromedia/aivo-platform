# Cross-District Benchmarking Service

Enterprise service for anonymous cross-district performance comparison and best practice sharing.

## Overview

The Benchmarking Service enables districts to:

- Share anonymized performance metrics with peer districts
- Compare against similar districts by demographics, size, and location
- Identify performance gaps and improvement opportunities
- Discover best practices from high-performing peers
- Build network effects through data sharing incentives

## Features

### Data Categories

- **Academic Performance**: Test scores, growth metrics, proficiency rates
- **Engagement Metrics**: Platform usage, session duration, completion rates
- **AI Tutor Effectiveness**: Learning gains, mastery rates, intervention success
- **Operational Efficiency**: Teacher adoption, resource utilization

### Peer Matching

Districts are matched with peers based on configurable criteria:

- Student population size (small/medium/large/very-large)
- Geographic region (urban/suburban/rural)
- Free/reduced lunch percentage (socioeconomic indicator)
- Grade levels served
- State/region

### Privacy Controls

- All data is aggregated and anonymized before sharing
- K-anonymity enforcement (minimum cohort sizes)
- Differential privacy for sensitive metrics
- Opt-in participation with granular controls
- Data retention policies with automatic expiration

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Benchmarking Service                          │
├─────────────────────────────────────────────────────────────────┤
│  API Layer (Fastify)                                             │
│  ├── /api/v1/benchmarks - Benchmark queries                     │
│  ├── /api/v1/participation - Enrollment & settings              │
│  ├── /api/v1/reports - Report generation                        │
│  └── /api/v1/insights - AI-generated insights                   │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer                                                   │
│  ├── ParticipationService - Enrollment & consent management     │
│  ├── AggregationService - Data collection & anonymization       │
│  ├── BenchmarkService - Peer matching & comparison              │
│  ├── InsightsService - AI-powered recommendations               │
│  └── ReportService - Report generation & export                 │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer (Prisma + PostgreSQL)                               │
│  ├── BenchmarkParticipant - Enrolled districts                  │
│  ├── BenchmarkMetric - Anonymized metric submissions            │
│  ├── BenchmarkCohort - Peer group definitions                   │
│  ├── BenchmarkReport - Generated comparison reports             │
│  └── BenchmarkInsight - AI-generated recommendations            │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Participation Management

- `GET /api/v1/participation` - Get participation status
- `POST /api/v1/participation/enroll` - Enroll in benchmarking
- `PATCH /api/v1/participation/settings` - Update sharing preferences
- `DELETE /api/v1/participation` - Withdraw from benchmarking

### Benchmark Queries

- `GET /api/v1/benchmarks/summary` - Overall district summary
- `GET /api/v1/benchmarks/compare` - Compare against peers
- `GET /api/v1/benchmarks/trends` - Historical trend analysis
- `GET /api/v1/benchmarks/rankings` - Anonymized peer rankings

### Reports

- `POST /api/v1/reports` - Generate new report
- `GET /api/v1/reports/:id` - Get report details
- `GET /api/v1/reports/:id/export` - Export report (PDF/CSV)

### Insights

- `GET /api/v1/insights` - Get AI-generated insights
- `GET /api/v1/insights/recommendations` - Actionable recommendations

## Configuration

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/benchmarking

# Service Configuration
PORT=3012
NODE_ENV=production

# Privacy Settings
MIN_COHORT_SIZE=5
DIFFERENTIAL_PRIVACY_EPSILON=1.0
DATA_RETENTION_DAYS=365

# AI Service (for insights)
AI_SERVICE_URL=http://ai-svc:3000
AI_INSIGHTS_ENABLED=true
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev

# Run tests
pnpm test
```

## Security & Compliance

- FERPA compliant through data anonymization
- No PII stored in benchmarking database
- All comparisons use aggregated metrics only
- Audit logging for all data access
- SOC 2 Type II controls implemented
