# AIVO Platform

**AI-Powered Inclusive Learning Platform for Neurodiverse Learners**

AIVO is a comprehensive educational technology platform designed to provide personalized, accessible learning experiences for students of all abilities, with special focus on neurodivergent learners (ADHD, Autism, Dyslexia, and more).

[![Node.js](https://img.shields.io/badge/Node.js-22.22.0-green)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.29.3-orange)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-yellow)](https://python.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.22-02569B)](https://flutter.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Platform Status](#platform-status)
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

- 🎓 **Personalized Learning Paths** — AI-driven curriculum generation per district, with 29 template-seeded subjects across K-12 grade bands
- 🧠 **Neurodiverse Support** — SEL (Social-Emotional Learning), sensory profiles, executive function tools, speech therapy
- 👨‍👩‍👧‍👦 **Family Engagement** — Parent portal with real-time progress tracking and homeschool curriculum triggers
- 👩‍🏫 **Teacher Tools** — Lesson planning, assessment creation, IEP management
- 🏫 **District Administration** — Multi-tenant architecture with compliance tools, geo-based district auto-detection
- 🎮 **Gamification** — XP system, achievements, leaderboards, streaks, virtual shop, and challenge system
- 🤖 **AI-Powered Curriculum** — Automatic per-district curriculum generation from templates using AI orchestration

---

## Platform Status

> **Last updated:** February 2026

| Metric | Count |
| ------ | ----- |
| TypeScript backend services | 66 |
| Python AI/ML services | 20 |
| Next.js web applications | 9 |
| Flutter mobile apps | 3 |
| Shared libraries (libs/) | 20 |
| Shared packages (packages/) | 16 |
| **Total backend services** | **86** |
| **Total Docker images (deployed)** | **43** |

### Deployment Status

| Environment | Infrastructure | Status |
| ----------- | -------------- | ------ |
| **Staging** | Hetzner K3s (`aivo-staging` namespace) | Active — auto-deploys on push to `main` |
| **Production** | Hetzner K3s (`aivo-prod` namespace) | Active — approval-gated promotion from staging |

### Deployed Services (CI/CD Pipeline)

- **14 TypeScript services** (Phase 1 — core services): auth-svc, api-gateway, tenant-svc, sis-sync-svc, iep-svc, parent-svc, profile-svc, messaging-svc, audit-svc, notify-svc, reports-svc, realtime-svc, compliance-svc, gamification-svc
- **20 Python AI/ML services**: ai-inference-svc, training-svc, ml-recommendation-svc, brain-engine, python-api-gateway, vision-analysis-svc, speech-analysis-svc, accessibility-ai-svc, question-generation-svc, writing-assessment-svc, content-intelligence-svc, cognitive-load-svc, knowledge-graph-svc, multimodal-analytics-svc, document-intelligence-svc, specialized-support-svc, rl-tutoring-svc, peer-learning-svc, curriculum-py-svc, grading-engine
- **9 Web frontends**: web-learner, web-teacher, web-marketing, web-parent, web-district, web-platform-admin, web-author, web-creator, web-dev-portal

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Web Apps (Next.js 15)          │  Mobile Apps (Flutter 3.22)          │
│  ├── web-learner     :3000      │  ├── mobile-learner                  │
│  ├── web-parent      :3002      │  ├── mobile-parent                   │
│  ├── web-teacher     :3003      │  └── mobile-teacher                  │
│  ├── web-marketing   :3001      │                                      │
│  ├── web-district    :3004      │                                      │
│  ├── web-platform-admin :3005   │                                      │
│  ├── web-author      :3006      │                                      │
│  ├── web-creator     :3007      │                                      │
│  └── web-dev-portal  :3008      │                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY                                    │
│                        (api-gateway-svc)                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────────┐
│    TypeScript Services (66)   │   │     Python AI/ML Services (20)    │
│    (Fastify 5 + Prisma 5)     │   │     (FastAPI / uvicorn)           │
├───────────────────────────────┤   ├───────────────────────────────────┤
│ auth-svc          :4001       │   │ ai-inference-svc      :8001       │
│ ai-orchestrator   :4010       │   │ brain-engine          :8080       │
│ content-svc       :4020       │   │ ml-recommendation-svc :8002       │
│ session-svc       :4021       │   │ training-svc          :8003       │
│ profile-svc       :3420       │   │ cognitive-load-svc    :8004       │
│ assessment-svc    :4030       │   │ accessibility-ai-svc  :8005       │
│ gamification-svc  :3032       │   │ speech-analysis-svc   :8006       │
│ billing-svc       :4050       │   │ vision-analysis-svc   :8007       │
│ tenant-svc        :4060       │   │ document-intelligence :8008       │
│ curriculum-svc    :4060       │   │ knowledge-graph-svc   :8009       │
│ parent-svc        :4070       │   │ ... (10 more)                     │
│ ... (55 more)                 │   │                                    │
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
| **Frontend Web**       | Next.js 15, React 19, TypeScript 5.9, TailwindCSS, Framer Motion |
| **Frontend Mobile**    | Flutter 3.22, Dart                                           |
| **Backend TypeScript** | Fastify 5, Prisma 5.22, Zod validation, jose (JWT)          |
| **Backend Python**     | FastAPI, uvicorn, Pydantic, SQLAlchemy                       |
| **Databases**          | PostgreSQL 15, Redis 7                                       |
| **Message Broker**     | NATS JetStream 2.10                                          |
| **AI/ML**              | Ollama (local), OpenAI, Anthropic, Google AI                 |
| **Observability**      | OpenTelemetry, Prometheus, Grafana, Loki                     |
| **Infrastructure**     | Docker, K3s (Hetzner), Kustomize, GitHub Actions             |
| **CI/CD**              | GitHub Actions, GHCR, Trivy scanning, multi-stage deploys    |

---

## Prerequisites

### Required

- **Node.js 22.22.0** (managed via `.node` directory)
- **pnpm 10.29.3** (package manager)
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
. .\scripts\use-node22.ps1

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
├── apps/                          # Frontend applications (12 total)
│   ├── web-learner/               # Student learning portal (Next.js 15)
│   ├── web-parent/                # Parent dashboard (Next.js 15)
│   ├── web-teacher/               # Teacher tools (Next.js 15)
│   ├── web-marketing/             # Marketing site (Next.js 15)
│   ├── web-district/              # District admin (Next.js 15)
│   ├── web-platform-admin/        # Platform admin (Next.js 15)
│   ├── web-author/                # Content authoring (Next.js 15)
│   ├── web-creator/               # Content creator tools (Next.js 15)
│   ├── web-dev-portal/            # Developer documentation (Next.js 15)
│   ├── mobile-learner/            # Student mobile app (Flutter 3.22)
│   ├── mobile-parent/             # Parent mobile app (Flutter 3.22)
│   └── mobile-teacher/            # Teacher mobile app (Flutter 3.22)
│
├── services/                      # Backend microservices (86 total)
│   ├── auth-svc/                  # Authentication & authorization (TS)
│   ├── ai-orchestrator/           # AI/LLM orchestration (TS)
│   ├── content-svc/               # Content management (TS)
│   ├── curriculum-svc/            # Curriculum templates & AI generation (TS)
│   ├── session-svc/               # Learning sessions (TS)
│   ├── profile-svc/               # User profiles (TS)
│   ├── assessment-svc/            # Assessments & quizzes (TS)
│   ├── gamification-svc/          # XP, achievements, leaderboards, shop (TS)
│   ├── parent-svc/                # Parent onboarding & learner management (TS)
│   ├── tenant-svc/                # Multi-tenant & geo district detection (TS)
│   ├── sel-svc/                   # Social-emotional learning (TS)
│   ├── brain-engine/              # Personalization ML (Python)
│   ├── ai-inference-svc/          # AI model inference (Python)
│   ├── ml-recommendation-svc/     # Recommendations (Python)
│   └── ... (72 more services)
│
├── libs/                          # Shared libraries (20 total)
│   ├── ts-types/                  # TypeScript type definitions
│   ├── ts-utils/                  # Common utilities
│   ├── ts-shared/                 # Shared business logic
│   ├── ts-data-access/            # Database access patterns
│   ├── ts-rbac/                   # Role-based access control
│   ├── ts-observability/          # Logging & tracing
│   ├── ts-resilience/             # Circuit breakers, retries
│   ├── ts-policy-engine/          # Policy evaluation engine
│   ├── ts-storage/                # File storage abstraction
│   ├── ts-constants/              # Shared constants
│   ├── billing-access/            # Billing data access
│   ├── billing-common/            # Billing shared types
│   ├── design-tokens/             # Design system tokens
│   ├── events/                    # NATS event schemas & JetStream helpers
│   ├── ui-web/                    # React component library
│   ├── ui-components/             # UI design components
│   ├── i18n/                      # Internationalization
│   ├── flutter-common/            # Flutter shared code
│   ├── flutter-notifications/     # Flutter push notifications
│   └── py-common/                 # Python shared utilities
│
├── packages/                      # Additional packages (16 total)
│   ├── ui/                        # Design system
│   ├── auth-web/                  # Auth web components
│   ├── database/                  # Database utilities
│   ├── caching/                   # Caching strategies
│   ├── collaboration/             # Real-time collaboration
│   ├── enterprise-core/           # Enterprise multi-tenant core
│   ├── enterprise-email-sdk/      # Email SDK
│   ├── env-validation/            # Environment variable validation
│   ├── feature-flags/             # Feature flag system
│   ├── i18n/                      # Internationalization runtime
│   ├── i18n-cli/                  # i18n CLI tools
│   ├── rate-limiter/              # Rate limiting
│   ├── seed-data/                 # Test data generators
│   ├── a11y/                      # Accessibility utilities
│   ├── ts-agents/                 # AI agent framework
│   └── ts-api-utils/              # API utility helpers
│
├── infra/                         # Infrastructure configs
│   ├── k8s/                       # Kubernetes/K3s manifests + Kustomize overlays
│   ├── helm/                      # Helm charts
│   ├── terraform/                 # Infrastructure as code
│   ├── prometheus/                # Monitoring configs
│   ├── grafana/                   # Dashboard configs
│   └── monitoring/                # Alerting rules
│
├── docker/                        # Docker configurations
│   ├── Dockerfile.service         # Shared Dockerfile for all TS services
│   ├── Dockerfile.web             # Shared Dockerfile for all Next.js apps
│   ├── docker-compose.yml         # Full platform compose
│   └── docker-compose.override.yml # Dev overrides
│
├── scripts/                       # Utility scripts
│   ├── use-node22.ps1             # Windows Node 22 setup
│   ├── use-flutter.ps1            # Windows Flutter setup
│   ├── setup-local.sh             # Unix local setup
│   ├── prisma-generate-all.sh     # Auto-discovers & generates all Prisma clients
│   ├── prisma-generate-all.ps1    # Windows version
│   └── db-setup.ps1               # Database setup
│
├── .github/                       # GitHub configs
│   ├── workflows/                 # CI/CD pipelines (20 workflow files)
│   └── ENVIRONMENTS.md            # Environment docs
│
├── package.json                   # Root package config
├── pnpm-workspace.yaml            # pnpm workspace definition
├── turbo.json                     # Turborepo build orchestration
├── tsconfig.base.json             # Base TypeScript config (strict)
├── tsconfig.compat.json           # Compat TypeScript config (relaxed, used by most services)
└── docker-compose.services.yml    # Python services compose
```

---

## Services

### Deployed TypeScript Services (Fastify 5) — Phase 1 Staging

| Service            | Port | Description                                   |
| ------------------ | ---- | --------------------------------------------- |
| `auth-svc`         | 4001 | Authentication, JWT, SSO, RBAC                |
| `api-gateway`      | 4001 | API routing & request orchestration           |
| `tenant-svc`       | 4002 | Multi-tenant & geo district detection         |
| `sis-sync-svc`     | 4016 | Student Information System sync               |
| `iep-svc`          | 4069 | Individualized Education Programs             |
| `parent-svc`       | 4024 | Parent onboarding & learner management        |
| `profile-svc`      | 3420 | User profiles & preferences                   |
| `messaging-svc`    | 4041 | In-app messaging & conversations              |
| `audit-svc`        | 4050 | Audit logging & compliance trails             |
| `notify-svc`       | 4040 | Push notifications, emails, webhooks          |
| `reports-svc`      | —    | Reporting & data exports                      |
| `realtime-svc`     | 3003 | WebSocket connections & live updates          |
| `compliance-svc`   | 4052 | FERPA/COPPA compliance enforcement            |
| `gamification-svc` | 3032 | XP, achievements, leaderboards, shop          |

### Additional TypeScript Services (52 more)

| Service              | Port | Description                             |
| -------------------- | ---- | --------------------------------------- |
| `ai-orchestrator`    | 4010 | LLM orchestration (Ollama, OpenAI, etc) |
| `content-svc`        | 3003 | Learning content management             |
| `session-svc`        | 4020 | Learning session tracking               |
| `assessment-svc`     | 3004 | Quizzes, tests, adaptive assessment     |
| `curriculum-svc`     | 4060 | Curriculum templates & AI generation    |
| `sel-svc`            | 4035 | Social-emotional learning               |
| `billing-svc`        | 3008 | Subscriptions & payments                |
| `analytics-svc`      | 3005 | Learning analytics & dashboards         |
| `collaboration-svc`  | 3020 | Real-time collaboration                 |
| `homework-helper-svc`| 4025 | AI-powered homework assistance          |
| `focus-svc`          | 4026 | Focus tracking & brain breaks           |
| `goal-svc`           | 4030 | Learning goals & milestones             |
| `integration-svc`    | 3009 | Third-party integrations                |
| `lti-svc`            | 3008 | LTI interoperability                    |
| `sandbox-svc`        | 3011 | Safe code execution environment         |
| `geolocation-svc`    | 4090 | Location-based services                 |

### Python ML Services (FastAPI) — 20 Total

| Service                     | Port         | Description                     |
| --------------------------- | ------------ | ------------------------------- |
| `python-api-gateway`        | 8000         | Python services API gateway     |
| `brain-engine`              | 8080         | Personalization ML engine       |
| `ai-inference-svc`          | 8001 → 8000  | Model inference                 |
| `ml-recommendation-svc`     | 8007 → 8000  | Content recommendations         |
| `curriculum-py-svc`         | 8004 → 8000  | AI curriculum generation        |
| `training-svc`              | 8003 → 8000  | Model training pipelines        |
| `document-intelligence-svc` | 8005 → 8080  | Document analysis & extraction  |
| `speech-analysis-svc`       | 8006 → 8080  | Speech recognition & analysis   |
| `vision-analysis-svc`       | 8007         | Image/video analysis            |
| `grading-engine`            | 8080         | Automated grading               |
| `cognitive-load-svc`        | —            | Cognitive load analysis         |
| `content-intelligence-svc`  | —            | Content quality analysis        |
| `knowledge-graph-svc`       | —            | Knowledge graph management      |
| `multimodal-analytics-svc`  | —            | Multi-modal data analytics      |
| `peer-learning-svc`         | —            | Peer-to-peer learning matching  |
| `question-generation-svc`   | —            | AI question generation          |
| `rl-tutoring-svc`           | —            | Reinforcement learning tutor    |
| `specialized-support-svc`   | —            | Special needs support           |
| `writing-assessment-svc`    | —            | Writing evaluation & feedback   |
| `research-svc`              | 3040         | Educational research analytics  |

---

## Frontend Applications

### Web Applications (Next.js 15)

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

- `Use Node 22 Shell` — Opens PowerShell with Node.js 22 configured
- `Flutter Shell` — Opens PowerShell with Flutter 3.22 configured
- `pnpm (Node22) ai-orchestrator dev` — Starts AI orchestrator in dev mode
- `pnpm (Node22) ai-orchestrator test` — Runs AI orchestrator tests
- `Flutter pub get (learner)` — Installs learner app Flutter dependencies
- `Flutter pub get (parent)` — Installs parent app Flutter dependencies
- `Flutter test (flutter-common)` — Runs flutter-common lib tests

### Environment Setup (Windows)

```powershell
# Always source the Node.js environment first
. .\scripts\use-node22.ps1

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

| Workflow                         | Trigger                | Description                                    |
| -------------------------------- | ---------------------- | ---------------------------------------------- |
| `ci-unified.yml`                 | Push, PR               | Lint, test, type-check (Turborepo, affected)   |
| `deploy-hetzner-staging.yml`     | Push to `main`         | 10-stage staging pipeline (build → deploy → verify) |
| `deploy-hetzner-production.yml`  | Manual / Release tag   | Production deployment with canary rollout      |
| `flutter-ci.yml`                 | Push, PR               | Flutter lint, test, build (mobile apps)        |

### 10-Stage Staging Pipeline

The staging deployment pipeline (`deploy-hetzner-staging.yml`) runs automatically on every push to `main`:

1. **CI** — TypeScript compilation check, lint, type-check
2. **Docker Build (TS)** — Build & push 14 TypeScript service images to GHCR
3. **Docker Build (Python)** — Build & push 20 Python service images to GHCR
4. **Docker Build (Web)** — Build & push 9 Next.js web app images to GHCR
5. **K3s Deploy** — Deploy all images to Hetzner K3s staging cluster (`aivo-staging`)
6. **Release Tag** — Create Git release tag on successful deploy
7. **Production Approval** — Manual approval gate for production promotion
8. **Canary Deploy** — Deploy canary instances to production
9. **Full Rollout** — Promote canary to full production deployment
10. **Smoke Tests & DB Migrations** — Post-deploy validation and schema migrations

### Docker Images

All images are pushed to GitHub Container Registry (GHCR):
- **TS services:** `ghcr.io/artpromedia/aivo-platform/{service}:sha-{commit}`
- **Python services:** `ghcr.io/artpromedia/aivo-platform/{service}:sha-{commit}`
- **Web apps:** `ghcr.io/artpromedia/aivo-platform/{app}:sha-{commit}`

### Environments

| Environment   | Infrastructure           | Description                              |
| ------------- | ------------------------ | ---------------------------------------- |
| Development   | Local Docker Compose     | Local dev with hot-reload                |
| Staging       | Hetzner K3s (`aivo-staging`) | Auto-deployed on push to `main`      |
| Production    | Hetzner K3s (`aivo-prod`)    | Manual approval, canary rollout      |

See [.github/ENVIRONMENTS.md](.github/ENVIRONMENTS.md) for secrets and cluster configuration.

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
. .\scripts\use-node22.ps1
node --version  # Should show v22.22.0
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
