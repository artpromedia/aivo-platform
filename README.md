# AIVO Platform

**AI-Powered Inclusive Learning Platform for Neurodiverse Learners**

AIVO is a comprehensive educational technology platform designed to provide personalized, accessible learning experiences for students of all abilities, with special focus on neurodivergent learners (ADHD, Autism, Dyslexia, and more).

[![Node.js](https://img.shields.io/badge/Node.js-20.19.4-green)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.12.0-orange)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-yellow)](https://python.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Services](#services)
- [Frontend Applications](#frontend-applications)
- [Shared Libraries](#shared-libraries)
- [Development](#development)
- [Testing](#testing)
- [Database](#database)
- [Docker & Infrastructure](#docker--infrastructure)
- [CI/CD](#cicd)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Overview

AIVO provides:

- 🎓 **Personalized Learning Paths** - AI-driven curriculum adaptation
- 🧠 **Neurodiverse Support** - SEL (Social-Emotional Learning), sensory profiles, executive function tools
- 👨‍👩‍👧‍👦 **Family Engagement** - Parent portal with real-time progress tracking
- 👩‍🏫 **Teacher Tools** - Lesson planning, assessment creation, IEP management
- 🏫 **District Administration** - Multi-tenant architecture with compliance tools
- 🎮 **Gamification** - Engagement through rewards, achievements, and game-based learning

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Web Apps (Next.js 14)          │  Mobile Apps (Flutter)               │
│  ├── web-learner     :3000      │  ├── mobile-learner                  │
│  ├── web-parent      :3002      │  ├── mobile-parent                   │
│  ├── web-teacher     :3003      │  └── mobile-teacher                  │
│  ├── web-marketing   :3001      │                                      │
│  ├── web-district    :3004      │                                      │
│  ├── web-platform-admin :3005   │                                      │
│  └── web-author      :3006      │                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY                                    │
│                      (Kong / api-gateway-svc)                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────────┐
│    TypeScript Services        │   │       Python ML Services          │
│    (NestJS / Fastify)         │   │       (FastAPI / uvicorn)         │
├───────────────────────────────┤   ├───────────────────────────────────┤
│ auth-svc          :4001       │   │ ai-inference-svc      :8001       │
│ ai-orchestrator   :4010       │   │ brain-engine          :8080       │
│ content-svc       :4020       │   │ ml-recommendation-svc :8002       │
│ session-svc       :4021       │   │ training-svc          :8003       │
│ profile-svc       :3420       │   │ cognitive-load-svc    :8004       │
│ assessment-svc    :4030       │   │ accessibility-ai-svc  :8005       │
│ gamification-svc  :4040       │   │ speech-analysis-svc   :8006       │
│ billing-svc       :4050       │   │ vision-analysis-svc   :8007       │
│ tenant-svc        :4060       │   │ document-intelligence :8008       │
│ ... (70+ more)                │   │ ... (15+ more)                    │
└───────────────────────────────┘   └───────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL :5432  │  Redis :6379  │  NATS :4222  │  Ollama :11434     │
│  (Primary DB)      │  (Cache/Queue)│  (Events)    │  (Local LLM)       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer                  | Technologies                                                 |
| ---------------------- | ------------------------------------------------------------ |
| **Frontend Web**       | Next.js 14, React 18, TypeScript, TailwindCSS, Framer Motion |
| **Frontend Mobile**    | Flutter 3.x, Dart                                            |
| **Backend TypeScript** | Fastify, NestJS, Prisma ORM, Zod validation                  |
| **Backend Python**     | FastAPI, uvicorn, Pydantic, SQLAlchemy                       |
| **Databases**          | PostgreSQL 15, Redis 7                                       |
| **Message Broker**     | NATS 2.10                                                    |
| **AI/ML**              | Ollama (local), OpenAI, Anthropic, Google AI                 |
| **Observability**      | OpenTelemetry, Prometheus, Grafana, Loki                     |
| **Infrastructure**     | Docker, Kubernetes, Terraform, Helm                          |

---

## Prerequisites

### Required

- **Node.js 20.19.4** (managed via `.node` directory)
- **pnpm 9.12.0** (package manager)
- **Docker Desktop** (for infrastructure services)
- **Git**

### Optional (for full development)

- **Python 3.11+** (for Python ML services)
- **Flutter 3.x** (for mobile apps)
- **k6** (for load testing)
- **Ollama** (for local AI inference)

---

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/artpromedia/aivo-platform.git
cd aivo-platform

# Windows: Set up Node.js environment
. .\scripts\use-node20.ps1

# macOS/Linux: Set up Node.js environment
source ./scripts/setup-local.sh

# Install dependencies
pnpm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and NATS
docker compose -f docker/docker-compose.yml up -d postgres redis nats

# Verify services are running
docker ps
```

### 3. Set Up Databases

```bash
# Generate Prisma clients for all services
# Windows:
.\scripts\prisma-generate-all.ps1

# macOS/Linux:
./scripts/prisma-generate-all.sh

# Run database migrations (if applicable)
# Windows:
.\scripts\db-setup.ps1

# macOS/Linux:
./scripts/db-setup.sh
```

### 4. Start Development Services

```bash
# Start a backend service (example: auth-svc)
pnpm --filter @aivo/auth-svc dev

# Start a frontend app (example: web-marketing)
pnpm --filter @aivo/web-marketing dev

# Start AI orchestrator
pnpm --filter @aivo/ai-orchestrator dev
```

### 5. Access Applications

| Application     | URL                   |
| --------------- | --------------------- |
| Web Marketing   | http://localhost:3001 |
| Web Learner     | http://localhost:3000 |
| Web Parent      | http://localhost:3002 |
| Web Teacher     | http://localhost:3003 |
| Auth Service    | http://localhost:4001 |
| AI Orchestrator | http://localhost:4010 |

---

## Project Structure

```
aivo/
├── apps/                          # Frontend applications
│   ├── web-learner/               # Student learning portal (Next.js)
│   ├── web-parent/                # Parent dashboard (Next.js)
│   ├── web-teacher/               # Teacher tools (Next.js)
│   ├── web-marketing/             # Marketing site (Next.js)
│   ├── web-district/              # District admin (Next.js)
│   ├── web-platform-admin/        # Platform admin (Next.js)
│   ├── web-author/                # Content authoring (Next.js)
│   ├── web-creator/               # Content creator tools (Next.js)
│   ├── web-dev-portal/            # Developer documentation (Docusaurus)
│   ├── mobile-learner/            # Student mobile app (Flutter)
│   ├── mobile-parent/             # Parent mobile app (Flutter)
│   └── mobile-teacher/            # Teacher mobile app (Flutter)
│
├── services/                      # Backend microservices
│   ├── auth-svc/                  # Authentication & authorization (TS)
│   ├── ai-orchestrator/           # AI/LLM orchestration (TS)
│   ├── content-svc/               # Content management (TS)
│   ├── session-svc/               # Learning sessions (TS)
│   ├── profile-svc/               # User profiles (TS)
│   ├── assessment-svc/            # Assessments & quizzes (TS)
│   ├── gamification-svc/          # Rewards & achievements (TS)
│   ├── sel-svc/                   # Social-emotional learning (TS)
│   ├── brain-engine/              # Personalization ML (Python)
│   ├── ai-inference-svc/          # AI model inference (Python)
│   ├── ml-recommendation-svc/     # Recommendations (Python)
│   └── ... (70+ more services)
│
├── libs/                          # Shared libraries
│   ├── ts-types/                  # TypeScript type definitions
│   ├── ts-utils/                  # Common utilities
│   ├── ts-shared/                 # Shared business logic
│   ├── ts-data-access/            # Database access patterns
│   ├── ts-rbac/                   # Role-based access control
│   ├── ts-observability/          # Logging & tracing
│   ├── ui-web/                    # React component library
│   ├── events/                    # Event schemas & NATS helpers
│   ├── flutter-common/            # Flutter shared code
│   └── py-common/                 # Python shared utilities
│
├── packages/                      # Additional packages
│   ├── ui/                        # Design system
│   ├── database/                  # Database utilities
│   ├── caching/                   # Caching strategies
│   ├── feature-flags/             # Feature flag system
│   ├── i18n/                      # Internationalization
│   └── seed-data/                 # Test data generators
│
├── infra/                         # Infrastructure configs
│   ├── helm/                      # Kubernetes Helm charts
│   ├── k8s/                       # Kubernetes manifests
│   ├── terraform/                 # Infrastructure as code
│   ├── prometheus/                # Monitoring configs
│   ├── grafana/                   # Dashboard configs
│   └── monitoring/                # Alerting rules
│
├── docker/                        # Docker configurations
│   ├── docker-compose.yml         # Full platform compose
│   ├── docker-compose.override.yml # Dev overrides
│   ├── docker-compose.test.yml    # Test environment
│   └── Dockerfile.*               # Service Dockerfiles
│
├── scripts/                       # Utility scripts
│   ├── use-node20.ps1             # Windows Node setup
│   ├── setup-local.sh             # Unix local setup
│   ├── db-setup.ps1               # Database setup
│   ├── prisma-generate-all.ps1    # Generate all Prisma clients
│   └── ...
│
├── tests/                         # Integration & E2E tests
│   ├── integration/               # Integration tests
│   └── e2e/                       # End-to-end tests
│
├── docs/                          # Documentation
│   ├── CONTRIBUTING.md            # Contribution guide
│   ├── DEVELOPER_QUICK_REFERENCE.md
│   └── ...
│
├── .github/                       # GitHub configs
│   ├── workflows/                 # CI/CD pipelines
│   └── ENVIRONMENTS.md            # Environment docs
│
├── package.json                   # Root package config
├── pnpm-workspace.yaml            # Workspace definition
├── turbo.json                     # Turborepo config
├── tsconfig.base.json             # Base TypeScript config
└── docker-compose.services.yml    # Python services compose
```

---

## Services

### TypeScript Services (Fastify/NestJS)

| Service            | Port | Description                                   |
| ------------------ | ---- | --------------------------------------------- |
| `auth-svc`         | 4001 | Authentication, JWT, SSO, RBAC                |
| `ai-orchestrator`  | 4010 | LLM orchestration (Ollama, OpenAI, Anthropic) |
| `content-svc`      | 4020 | Learning content management                   |
| `session-svc`      | 4021 | Learning session tracking                     |
| `profile-svc`      | 3420 | User profiles & preferences                   |
| `assessment-svc`   | 4030 | Quizzes, tests, grading                       |
| `gamification-svc` | 4040 | Points, badges, leaderboards                  |
| `sel-svc`          | 4022 | Social-emotional learning                     |
| `tenant-svc`       | 4060 | Multi-tenant management                       |
| `billing-svc`      | 4050 | Subscriptions & payments                      |
| `analytics-svc`    | 4070 | Learning analytics                            |
| `notify-svc`       | 4080 | Push notifications, emails                    |

### Python ML Services (FastAPI)

| Service                 | Port | Description                   |
| ----------------------- | ---- | ----------------------------- |
| `brain-engine`          | 8080 | Personalization engine        |
| `ai-inference-svc`      | 8001 | Model inference               |
| `ml-recommendation-svc` | 8002 | Content recommendations       |
| `training-svc`          | 8003 | Model training pipelines      |
| `cognitive-load-svc`    | 8004 | Cognitive load analysis       |
| `speech-analysis-svc`   | 8006 | Speech recognition & analysis |
| `vision-analysis-svc`   | 8007 | Image/video analysis          |

---

## Frontend Applications

### Web Applications (Next.js 14)

```bash
# Start any web app
pnpm --filter @aivo/web-{app-name} dev

# Examples:
pnpm --filter @aivo/web-learner dev      # Student portal
pnpm --filter @aivo/web-parent dev       # Parent dashboard
pnpm --filter @aivo/web-teacher dev      # Teacher tools
pnpm --filter @aivo/web-marketing dev    # Marketing site
```

### Mobile Applications (Flutter)

```bash
# Set up Flutter environment
. .\scripts\use-flutter.ps1

# Get dependencies
cd apps/mobile-learner
flutter pub get

# Run on device/emulator
flutter run
```

---

## Shared Libraries

| Library                  | Description                            |
| ------------------------ | -------------------------------------- |
| `@aivo/ts-types`         | Shared TypeScript interfaces and types |
| `@aivo/ts-utils`         | Common utility functions               |
| `@aivo/ts-shared`        | Shared business logic                  |
| `@aivo/ts-data-access`   | Prisma helpers, repository patterns    |
| `@aivo/ts-rbac`          | Role-based access control              |
| `@aivo/ts-observability` | OpenTelemetry, structured logging      |
| `@aivo/ts-resilience`    | Circuit breakers, retries              |
| `@aivo/events`           | NATS event schemas and publishers      |
| `@aivo/ui-web`           | React component library                |
| `@aivo/ui`               | Design system tokens                   |

### Using Libraries

```typescript
// Import from shared libraries
import { TenantContext } from '@aivo/ts-types';
import { createLogger } from '@aivo/ts-observability';
import { Button, Card } from '@aivo/ui-web';
```

---

## Development

### Available Scripts

```bash
# Root-level commands
pnpm lint                    # Lint changed packages
pnpm lint:fix                # Fix lint issues
pnpm format                  # Format code with Prettier
pnpm test                    # Run tests for changed packages
pnpm build                   # Build changed packages
pnpm validate                # Lint + Test + Build

# Service-specific commands
pnpm --filter @aivo/{service} dev      # Start in dev mode
pnpm --filter @aivo/{service} build    # Build for production
pnpm --filter @aivo/{service} test     # Run tests
pnpm --filter @aivo/{service} lint     # Lint code

# Database commands (per service)
pnpm --filter @aivo/{service} db:generate    # Generate Prisma client
pnpm --filter @aivo/{service} db:migrate:dev # Create/apply migrations
pnpm --filter @aivo/{service} db:studio      # Open Prisma Studio
```

### VS Code Tasks

The workspace includes pre-configured tasks in `.vscode/tasks.json`:

- `Use Node 20 Shell` - Opens PowerShell with Node.js 20 configured
- `Flutter Shell` - Opens PowerShell with Flutter configured
- `pnpm (Node20) ai-orchestrator dev` - Starts AI orchestrator
- `Flutter pub get (learner)` - Installs Flutter dependencies

### Environment Setup (Windows)

```powershell
# Always source the Node.js environment first
. .\scripts\use-node20.ps1

# Then run pnpm commands
pnpm install
pnpm --filter @aivo/auth-svc dev
```

---

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests for specific service
pnpm --filter @aivo/auth-svc test

# Watch mode
pnpm --filter @aivo/auth-svc test:watch
```

### Integration Tests

```bash
# Tenant isolation tests
pnpm test:tenant-isolation

# With detailed report
pnpm test:tenant-isolation:report
```

### E2E Tests

```bash
# Run E2E tests for web-learner
pnpm test:e2e

# Run all E2E tests
pnpm test:e2e:all
```

### Load Tests

```bash
# Requires k6 installed
pnpm test:load
pnpm test:performance
```

---

## Database

### Prisma Workflow

Each service with a database has its own Prisma schema:

```bash
# Generate Prisma client
pnpm --filter @aivo/auth-svc db:generate

# Create a migration
pnpm --filter @aivo/auth-svc db:migrate:dev --name add_user_preferences

# Apply migrations to production
pnpm --filter @aivo/auth-svc db:migrate:deploy

# Open Prisma Studio (GUI)
pnpm --filter @aivo/auth-svc db:studio

# Reset database (CAUTION: deletes all data)
pnpm --filter @aivo/auth-svc db:migrate:reset
```

### Generate All Prisma Clients

```powershell
# Windows
.\scripts\prisma-generate-all.ps1

# macOS/Linux
./scripts/prisma-generate-all.sh
```

### Database URLs

Default local development databases:

```
PostgreSQL: postgresql://aivo:aivo@localhost:5432/aivo
Redis: redis://localhost:6379
```

---

## Docker & Infrastructure

### Start Infrastructure Only

```bash
# Core services (PostgreSQL, Redis, NATS)
docker compose -f docker/docker-compose.yml up -d postgres redis nats

# With observability (Prometheus, Grafana, Jaeger)
docker compose -f docker/docker-compose.yml -f docker-compose.observability.yml up -d
```

### Start All Services

```bash
# All TypeScript services
docker compose -f docker/docker-compose.yml up -d

# Python ML services
docker compose -f docker-compose.services.yml up -d
```

### Useful Docker Commands

```bash
# View logs
docker compose -f docker/docker-compose.yml logs -f auth-svc

# Restart a service
docker compose -f docker/docker-compose.yml restart auth-svc

# Stop all
docker compose -f docker/docker-compose.yml down

# Stop and remove volumes (CAUTION: deletes data)
docker compose -f docker/docker-compose.yml down -v
```

---

## CI/CD

### GitHub Actions Workflows

| Workflow                | Trigger         | Description                      |
| ----------------------- | --------------- | -------------------------------- |
| `ci-unified.yml`        | Push, PR        | Lint, test, build, security scan |
| `deploy-staging.yml`    | Push to `main`  | Deploy to staging                |
| `deploy-production.yml` | Manual, Release | Deploy to production             |

### Environments

- **Development** - Local development
- **Staging** - Pre-production testing
- **Production** - Live environment

See [.github/ENVIRONMENTS.md](.github/ENVIRONMENTS.md) for secrets configuration.

### Deployment

```bash
# Manual deployment (requires kubectl configured)
./scripts/deploy.sh staging

# Using Helm
helm upgrade --install aivo-auth infra/helm/aivo-service \
  -f infra/helm/aivo-service/values-staging.yaml \
  --set image.tag=$(git rev-parse --short HEAD)
```

---

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL=postgresql://aivo:aivo@localhost:5432/aivo

# Redis
REDIS_URL=redis://localhost:6379

# NATS
NATS_URL=nats://localhost:4222

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# AI Providers (optional for local dev with Ollama)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Service-Specific Variables

Copy `.env.example` to `.env` in each service:

```bash
cd services/auth-svc
cp .env.example .env
# Edit .env with your values
```

---

## Troubleshooting

### Common Issues

#### Node.js version mismatch

```powershell
# Always use the workspace Node.js
. .\scripts\use-node20.ps1
node --version  # Should show v20.19.4
```

#### Prisma client not generated

```bash
# Generate for specific service
pnpm --filter @aivo/content-svc db:generate

# Or generate all
.\scripts\prisma-generate-all.ps1
```

#### Port already in use

```powershell
# Find process using port
netstat -ano | findstr :4001

# Kill process
Stop-Process -Id <PID> -Force
```

#### Docker services not starting

```bash
# Check logs
docker compose -f docker/docker-compose.yml logs postgres

# Recreate containers
docker compose -f docker/docker-compose.yml up -d --force-recreate
```

#### pnpm install fails

```bash
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules
pnpm install
```

### Getting Help

1. Check the [docs/](docs/) folder for detailed documentation
2. Review service-specific READMEs in each service directory
3. Check GitHub Issues for known problems
4. Ask in the team Slack channel

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines on:

- Code style and conventions
- Commit message format (Conventional Commits)
- Pull request process
- Testing requirements

---

## License

Proprietary - All Rights Reserved

© 2024-2026 AIVO Learning Platform
