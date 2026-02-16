# AIVO Platform — Target Architecture

> **Version:** 1.0  
> **Created:** 2026-02-16  
> **Branch:** `v2-consolidation`  
> **Status:** Active — Sprint 0 (Consolidation Setup & Audit)

---

## 1. Overview

The AIVO platform has grown to **92 services**, **14 apps**, and **35 shared packages** across `libs/` and `packages/`. The PRD specified Phase 1 as an **IEP & Communications Web App** requiring ~12–15 services. Implementation has drifted significantly — three backend frameworks (Fastify, Express, NestJS), plus Python/FastAPI services, premature Phase 2/3 services, and duplicated concerns.

This document defines the **target architecture** that the `v2-consolidation` branch will converge toward.

---

## 2. Standard Backend Framework: Fastify

All **new** TypeScript/Node.js services and all **migrated** services MUST use **Fastify v4+**.

### Rationale

- 63 of 71 Node.js services already use Fastify — it is the clear majority.
- Superior performance vs Express (schema-based serialization, async-first).
- Plugin architecture aligns well with per-service composition.

### Migration Targets

| Service                  | Current Framework | Migration Sprint                        |
| ------------------------ | ----------------- | --------------------------------------- |
| `assessment-svc`         | Express           | Sprint 1 (Phase 2 FREEZE, low priority) |
| `gradebook-svc`          | Express           | Sprint 1 (Phase 2 FREEZE, low priority) |
| `brain-orchestrator-svc` | Express           | Sprint 1 (Phase 2 FREEZE, low priority) |
| `gamification-svc`       | Express           | Sprint 1 (Phase 2 FREEZE, low priority) |
| `parent-svc`             | NestJS            | Sprint 2 (Phase 1 KEEP, high priority)  |
| `translation-svc`        | Hono              | Deferred (Phase 2 FREEZE)               |

### Exception: `api-gateway` stays NestJS

The `api-gateway` service will **remain on NestJS**. NestJS's decorator-based Guards, Interceptors, and Exception Filters are a natural fit for edge security concerns (JWT validation, PII detection, consent guards, rate limiting). Migrating to Fastify would lose these abstractions with no meaningful gain at the gateway layer.

---

## 3. Database: PostgreSQL + Prisma

- **Database engine:** PostgreSQL (no change)
- **ORM:** Prisma (per-service schemas, per-service migrations)
- **Schema ownership:** Each service owns its own Prisma schema and migration history
- **No cross-service direct DB access** — services communicate via API or NATS events

---

## 4. Frontend: Next.js App Router

All existing web applications use **Next.js App Router**. No changes planned.

| App                  | Purpose                    |
| -------------------- | -------------------------- |
| `web-platform-admin` | Platform administration    |
| `web-district`       | District management        |
| `web-teacher`        | Teacher dashboard          |
| `web-parent`         | Parent portal              |
| `web-learner`        | Student learning interface |
| `web-author`         | Content authoring          |
| `web-creator`        | Content creation           |
| `web-dev-portal`     | Developer portal           |
| `web-marketing`      | Marketing site             |

---

## 5. Mobile: Flutter

Mobile applications use **Flutter** with shared code in `libs/flutter-common` and `libs/flutter-notifications`.

| App              | Purpose            |
| ---------------- | ------------------ |
| `mobile-learner` | Student mobile app |
| `mobile-parent`  | Parent mobile app  |
| `mobile-teacher` | Teacher mobile app |

No changes planned for mobile architecture.

---

## 6. Shared Libraries

All existing shared libraries in `libs/` and `packages/` are **kept as-is**. No consolidation needed.

### `libs/` (20 packages)

| Package                 | Purpose                            |
| ----------------------- | ---------------------------------- |
| `billing-access`        | Billing data access layer          |
| `billing-common`        | Shared billing types/utilities     |
| `design-tokens`         | Design system tokens               |
| `events`                | NATS event bus definitions         |
| `flutter-common`        | Shared Flutter code                |
| `flutter-notifications` | Flutter push notification handling |
| `i18n`                  | Internationalization               |
| `py-common`             | Shared Python utilities            |
| `ts-constants`          | TypeScript constants               |
| `ts-data-access`        | TypeScript data access layer       |
| `ts-observability`      | Logging, tracing, metrics          |
| `ts-policy-engine`      | Policy evaluation engine           |
| `ts-rbac`               | Role-based access control          |
| `ts-resilience`         | Circuit breakers, retries          |
| `ts-shared`             | Shared TypeScript utilities        |
| `ts-storage`            | File/object storage abstraction    |
| `ts-types`              | Shared TypeScript type definitions |
| `ts-utils`              | General TypeScript utilities       |
| `ui-components`         | Shared UI component library        |
| `ui-web`                | Web-specific UI utilities          |

### `packages/` (15 packages)

| Package           | Purpose                         |
| ----------------- | ------------------------------- |
| `a11y`            | Accessibility utilities         |
| `auth-web`        | Web authentication utilities    |
| `caching`         | Caching abstraction             |
| `collaboration`   | Real-time collaboration         |
| `database`        | Database utilities              |
| `enterprise-core` | Enterprise feature core         |
| `env-validation`  | Environment variable validation |
| `feature-flags`   | Feature flag management         |
| `i18n`            | i18n (package-level)            |
| `i18n-cli`        | i18n CLI tooling                |
| `rate-limiter`    | Rate limiting                   |
| `seed-data`       | Database seed data              |
| `ts-agents`       | AI agent abstractions           |
| `ts-api-utils`    | API utility functions           |
| `ui`              | UI primitives                   |

---

## 7. Event Bus: NATS

- **Technology:** NATS (via `libs/events`)
- **Pattern:** Publish/subscribe for inter-service communication
- **No change** to event bus architecture

---

## 8. Python Services

20 services use **Python + FastAPI**. These are primarily AI/ML services and will follow their own consolidation path:

- Python services in **Phase 1** scope: None (all Python services are Phase 2 or 3)
- Python shared code: `libs/py-common`
- Python services will be frozen or deferred per `SERVICE_CONSOLIDATION_MAP.md`

---

## 9. Observability

- **Logging:** Structured JSON via `libs/ts-observability`
- **Tracing:** OpenTelemetry
- **Metrics:** Prometheus-compatible
- No architectural changes planned

---

## 10. Deployment

- **Container runtime:** Docker
- **Orchestration:** Docker Compose (development), Hetzner (production)
- **CI/CD:** GitHub Actions (`AIVO CI/CD Pipeline`)
- Per-service Dockerfiles, no change to deployment model

---

## 11. Service Count Targets

| Phase            | Current Count | Target Count | Strategy                      |
| ---------------- | :-----------: | :----------: | ----------------------------- |
| Phase 1 (KEEP)   | ~15 services  | ~12 services | Merge overlapping domains     |
| Phase 2 (FREEZE) | ~40 services  | ~40 services | No new features, code intact  |
| Phase 3 (DEFER)  | ~37 services  | ~37 services | Do not deploy, reference only |

See `SERVICE_CONSOLIDATION_MAP.md` for the complete disposition of all 92 services.
