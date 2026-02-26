# Tenant-Svc Test Coverage Research Report

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [File Inventory](#file-inventory)
3. [Existing Test Analysis](#existing-test-analysis)
4. [Gap Analysis — Untested or Under-tested Code](#gap-analysis)
5. [Priority Coverage Targets](#priority-coverage-targets)
6. [Mock & Test Pattern Reference](#mock-patterns)

---

## 1. Architecture Overview

**Stack:** Fastify v4 + Prisma ORM + Redis (ioredis) + Vitest  
**Port:** 4002  
**Entry:** `src/index.ts` → `src/app.ts` → `createApp()`

**Plugin/Middleware chain:**
1. `@fastify/rate-limit` (100 req/min)
2. `tenantResolverPlugin` — hostname-based tenant resolution (subdomain / custom domain / default)
3. Health routes (`/health`, `/ready`) — no auth
4. `authMiddleware` — JWT verification via `@aivo/ts-rbac`, skips `/tenant/resolve`, `/districts/`, `/internal/`, `/health`, `/healthz`, `/metrics`
5. `ipAllowlistMiddleware` — CIDR-based IP blocking per tenant
6. Route registration (resolve, tenants, schools, classrooms, districts, internal, onboarding, admin domains, IP allowlist, custom domains, feature flags)

---

## 2. File Inventory

### Source Files (src/)

| File | Lines | Category | Description |
|------|-------|----------|-------------|
| `app.ts` | ~115 | Setup | Fastify app factory, plugin/middleware/route registration |
| `index.ts` | ~35 | Entry | Server startup, graceful shutdown |
| `config.ts` | ~30 | Config | Env vars: port, DB URL, JWT, Redis, baseDomain, audit-svc |
| `prisma.ts` | ~5 | DB | PrismaClient singleton |
| **Services** | | | |
| `services/branding.service.ts` | ~280 | Service | Tenant white-label branding with Redis cache (TTL 300s) |
| `services/curriculum-trigger.service.ts` | ~140 | Service | Fire-and-forget curriculum generation trigger |
| `services/data-residency.service.ts` | ~180 | Service | Region resolution, GDPR/FERPA compliance labels |
| `services/deprovisioning.service.ts` | 662 | Service | Soft delete, GDPR export, permanent deletion cascade |
| `services/district-lookup.service.ts` | ~310 | Service | ZIP/state lookup, NCES district ID, auto-detect location |
| `services/provisioning.service.ts` | 859 | Service | 10-step idempotent provisioning pipeline |
| `services/tenant-config.service.ts` | 524 | Service | Tenant config CRUD, AI provider/model overrides, quotas |
| `services/tenant-lifecycle.service.ts` | 758 | Service | Full CRUD, suspend/reactivate/delete lifecycle, audit trail |
| `services/tenant-usage.service.ts` | 593 | Service | Daily usage tracking, quota checks (LLM/tutor/storage) |
| `services/tenant-resolver.service.ts` | 710 | Service | Hostname→tenant resolution, domain verification (DNS TXT) |
| `services/trial-management.service.ts` | 548 | Service | 30-day trial lifecycle, Stripe conversion, plan limits |
| **Routes** | | | |
| `routes/branding.routes.ts` | ~195 | Route | Admin branding CRUD + multipart upload + public domain lookup |
| `routes/classrooms.ts` | 481 | Route | Session codes, PIN validation, learner roster management |
| `routes/deprovisioning.ts` | ~190 | Route | Initiate/cancel deletion, GDPR export, process-deletions cron |
| `routes/district-lookup.ts` | ~175 | Route | ZIP/state lookup, NCES ID, auto-detect, curriculum endpoints |
| `routes/internal.ts` | ~135 | Route | Service-to-service: PATCH curriculum-standards, GET config |
| `routes/onboarding.ts` | 458 | Route | District onboarding wizard (create, agreement, schools, go-live) |
| `routes/provisioning.ts` | ~155 | Route | Start/status/retry/rollback provisioning jobs |
| `routes/resolve.ts` | ~22 | Route | GET /tenant/resolve by host query param |
| `routes/schools.ts` | ~70 | Route | CRUD schools + classrooms under tenant |
| `routes/tenants.ts` | 569 | Route | Full tenant CRUD, lifecycle actions, config, audit log |
| `routes/trial.ts` | ~175 | Route | Trial status/convert/confirm/extend/process-expirations |
| `routes/admin/tenant-domains.routes.ts` | 468 | Route | Subdomain update, domain verification, cache invalidation |
| **Middleware/Lib/Plugins** | | | |
| `middleware/authMiddleware.ts` | ~30 | Middleware | JWT auth via `@aivo/ts-rbac`, skip list |
| `lib/jwt.ts` | ~45 | Lib | `verifyJwt()` using jose RS256 |
| `lib/cloudflare-domains.ts` | 220 | Lib | Cloudflare for SaaS: add/check/remove custom hostnames |
| `plugins/tenant-resolver.plugin.ts` | 246 | Plugin | Fastify plugin wrapping TenantResolverService |
| **Feature Modules** | | | |
| `custom-domains/custom-domain.service.ts` | ~210 | Service | DNS TXT verification, Redis-cached domain→tenant lookup |
| `custom-domains/custom-domain.routes.ts` | ~110 | Route | Admin CRUD for custom domains per tenant |
| `feature-flags/tenant-feature-flags.service.ts` | ~200 | Service | 8 toggleable flags, NATS events, Redis cache |
| `feature-flags/feature-flags.routes.ts` | ~100 | Route | Available flags, tenant flags CRUD |
| `ip-allowlist/ip-allowlist.service.ts` | ~280 | Service | CIDR matching (IPv4+IPv6), tenant IP allowlist CRUD |
| `ip-allowlist/ip-allowlist.routes.ts` | ~120 | Route | Admin CRUD + test endpoint |
| `ip-allowlist/ip-allowlist.middleware.ts` | ~120 | Middleware | preHandler IP enforcement, audit-svc webhook |

### Existing Test Files (test/)

| File | Lines | What It Tests |
|------|-------|---------------|
| `resolve.test.ts` | ~50 | GET /tenant/resolve — single happy-path test |
| `tenant-resolver.service.test.ts` | 563 | TenantResolverService — subdomain/custom domain/caching/verification/update |
| `tenant-resolver.plugin.test.ts` | ~350 | Fastify plugin — subdomain/custom domain/default/skip paths/guards |
| `tenant.rbac.test.ts` | ~120 | RBAC on POST /tenants — unauthenticated, wrong role, PLATFORM_ADMIN |
| `tenant.service.comprehensive.test.ts` | 755 | Lifecycle stubs — create/update/softDelete/reactivate/hardDelete/config/transitions |
| `trial-management.service.test.ts` | ~200 | TrialManagementService — getTrialInfo/convertToPaid/processExpirations/extendTrial |
| `custom-domains.test.ts` | ~120 | CustomDomainService unit + route registration smoke |
| `feature-flags.test.ts` | ~115 | TenantFeatureFlagsService unit + route registration smoke |
| `ip-allowlist.test.ts` | ~140 | ipMatchesCidr pure function + route registration smoke |

---

## 3. Existing Test Analysis

### Patterns Used

**Mocking approach:** All tests use `vi.mock()` for Prisma, DNS, and config modules. Tests create inline mock factories rather than importing shared fixtures.

**Common mock pattern:**
```typescript
vi.mock('../src/prisma', () => ({
  prisma: {
    tenant: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), ... },
    // ... other models
  },
}));
```

**App injection pattern (RBAC/route tests):**
```typescript
const app = createApp();
await app.ready();
const res = await app.inject({ method: 'GET', url: '/...', headers: { authorization: `Bearer ${token}` } });
```

**Service unit test pattern:**
```typescript
const service = new ServiceClass({ prisma: mockPrisma, redis: mockRedis, ... });
const result = await service.someMethod(params);
expect(result).toEqual(...);
```

### Test Quality Assessment

| Test File | Quality | Notes |
|-----------|---------|-------|
| `tenant-resolver.service.test.ts` | **Good** | 20+ tests, covers happy paths, errors, caching, DNS failures |
| `tenant-resolver.plugin.test.ts` | **Good** | Full integration via Fastify inject, covers skip paths, guards |
| `trial-management.service.test.ts` | **Good** | Covers all 4 methods, edge cases (grace period, already converted) |
| `tenant.service.comprehensive.test.ts` | **Fair** | Uses local helper stubs instead of testing actual service class methods |
| `tenant.rbac.test.ts` | **Fair** | Only tests POST /tenants, 3 test cases |
| `resolve.test.ts` | **Minimal** | Single happy-path test |
| `custom-domains.test.ts` | **Minimal** | 4 unit tests + 1 smoke test |
| `feature-flags.test.ts` | **Minimal** | 4 unit tests + 2 smoke tests |
| `ip-allowlist.test.ts` | **Good for CIDR** | Thorough IPv4/IPv6 CIDR tests, but route tests are smoke only |

---

## 4. Gap Analysis — Untested or Under-tested Code

### 🔴 NO TESTS (Critical)

| Code | Lines | Complexity | Why It Matters |
|------|-------|------------|----------------|
| **`branding.service.ts`** | 280 | Medium | Redis caching, domain-based lookup, defaults merging |
| **`data-residency.service.ts`** | 180 | Medium | Region validation, compliance labels, 307 redirect middleware |
| **`deprovisioning.service.ts`** | 662 | **High** | GDPR export, cascade delete (10+ tables), grace period logic |
| **`district-lookup.service.ts`** | 310 | Medium | ZIP normalization, state curriculum mapping, auto-detect |
| **`provisioning.service.ts`** | 859 | **Very High** | 10-step pipeline, idempotency, rollback, Stripe integration |
| **`tenant-config.service.ts`** | 524 | Medium | Config defaults, AI provider allowlists, in-memory cache fallback |
| **`tenant-lifecycle.service.ts`** | 758 | **High** | Full CRUD, status transitions, audit trail, cache invalidation |
| **`tenant-usage.service.ts`** | 593 | Medium-High | Quota enforcement, daily aggregation, 80% warning threshold |
| **`curriculum-trigger.service.ts`** | 140 | Low | HTTP calls, error handling per template |
| **`cloudflare-domains.ts`** | 220 | Medium | External API calls, status mapping |
| **`jwt.ts`** | 45 | Low | RS256 verification, env/file key loading |

### 🟡 UNDER-TESTED (Partial coverage)

| Code | Existing Tests | Gaps |
|------|---------------|------|
| **`custom-domain.service.ts`** | 4 basic unit tests | Missing: `verifyDomain()` DNS flow, `resolveDomainToTenant()` with cache hit, error handling |
| **`tenant-feature-flags.service.ts`** | 4 unit tests | Missing: NATS event emission, Redis cache hit/miss, `setFlag` update flow |
| **`ip-allowlist.service.ts`** | CIDR matching tested | Missing: `addRange`, `removeRange`, `listRanges`, `isAllowed` (empty list = allow all) |
| **`ip-allowlist.middleware.ts`** | No direct tests | Missing: IP extraction from X-Forwarded-For, skip paths, audit webhook |

### 🟡 ROUTE TESTS NEEDED

| Route File | Status | Test Coverage Needed |
|------------|--------|---------------------|
| `routes/branding.routes.ts` | **No tests** | Admin GET/PUT, multipart upload (logo, favicon), public domain lookup, cache headers |
| `routes/classrooms.ts` | **No tests** | Session code generation/validation/deactivation, PIN validation/lockout, learner CRUD |
| `routes/deprovisioning.ts` | **No tests** | Initiate/cancel deletion, GDPR export, process-deletions (auth check) |
| `routes/district-lookup.ts` | **No tests** | ZIP/state lookup, NCES, auto-detect, curriculum endpoints |
| `routes/internal.ts` | **No tests** | X-Service-Name validation, PATCH curriculum-standards, GET config |
| `routes/onboarding.ts` | **No tests** | Create tenant wizard, agreement signing, school config, go-live (curriculum trigger) |
| `routes/provisioning.ts` | **No tests** | Start/status/retry/rollback, 409 duplicate handling, 202 async response |
| `routes/schools.ts` | **No tests** | CRUD schools + classrooms |
| `routes/tenants.ts` | **Minimal (RBAC only)** | List, GET by ID, PATCH, DELETE, suspend/reactivate, hard-delete, config CRUD, audit log |
| `routes/trial.ts` | **No tests** | All 5 endpoints |
| `routes/admin/tenant-domains.routes.ts` | **No tests** | GET domains, PUT subdomain, POST domain verify, DELETE, cache invalidate |

---

## 5. Priority Coverage Targets

### Tier 1 — Business-Critical Services (write tests first)

1. **`provisioning.service.ts`** (859 lines, 10-step pipeline)
   - Test each pipeline step independently
   - Test idempotency (duplicate job creation)
   - Test retry from failed step
   - Test rollback
   - Mock: Prisma, Stripe, email service, curriculum trigger

2. **`deprovisioning.service.ts`** (662 lines, GDPR compliance)
   - `initiateDeletion` — grace period calculation
   - `cancelDeletion` — status transition
   - `requestDataExport` — GDPR data collection from multiple tables
   - `processPermanentDeletions` — cascade delete across 10+ tables
   - `permanentlyDeleteTenant` — ensure all related data removed

3. **`tenant-lifecycle.service.ts`** (758 lines)
   - NOTE: `tenant.service.comprehensive.test.ts` uses local stubs, NOT the actual class
   - Write proper tests using the actual `TenantLifecycleService` class
   - Test: create, update, suspend, reactivate, initiateDelete, hardDelete
   - Test: audit trail creation, cache invalidation, status transitions

4. **`tenant-usage.service.ts`** (593 lines)
   - `incrementUsage`/`recordLLMCall`/`recordTutorTurn` — upsert pattern
   - `checkLLMQuota`/`checkTutorQuota`/`checkStorageQuota` — 80% warning, 100% block
   - `getUsageHistory`/`getAggregatedUsage` — date range queries

### Tier 2 — Configuration & Resolution

5. **`tenant-config.service.ts`** (524 lines)
   - Config defaults (AI providers, grade levels, limits)
   - `isFeatureEnabled`, `isAIProviderAllowed`, `getAIModelOverride`
   - In-memory cache fallback when Redis unavailable
   - Upsert behavior

6. **`branding.service.ts`** (280 lines)
   - Default branding merging
   - Domain-based lookup (custom domain → subdomain pattern)
   - Redis cache hit/miss/invalidation

7. **`data-residency.service.ts`** (180 lines)
   - Region validation, `suggestRegion` by country code
   - `enforceResidency` 307 redirect middleware

8. **`district-lookup.service.ts`** (310 lines)
   - ZIP code normalization, state-specific curriculum mapping
   - `autoDetectFromLocation` combining ZIP + state + city

### Tier 3 — Routes & Integration

9. **Route integration tests** for all untested routes
   - Use Fastify inject pattern from existing tests
   - Cover: validation errors (Zod), auth/RBAC, happy paths, 404s

10. **`classrooms.ts` routes** (481 lines, complex)
    - Session code generation uniqueness
    - PIN validation with bcrypt
    - Lockout after MAX_PIN_ATTEMPTS
    - Learner roster CRUD

### Tier 4 — Utility & Middleware

11. **`cloudflare-domains.ts`** — mock fetch, test status mapping
12. **`jwt.ts`** — test with valid/invalid/expired tokens
13. **`ip-allowlist.middleware.ts`** — IP extraction, skip paths, 403 response
14. **`authMiddleware.ts`** — skip path matching (partially tested via RBAC test)

---

## 6. Mock & Test Pattern Reference

### Recommended Mock Setup (based on existing patterns)

**Prisma Mock Factory:**
```typescript
function createMockPrisma() {
  return {
    tenant: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    tenantConfig: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    tenantAuditEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    tenantUsage: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    school: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    classroom: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    classroomLearner: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    classroomSessionCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    tenantDomainVerification: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    tenantBranding: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    tenantCustomDomain: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    tenantFeatureFlag: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    tenantIpAllowlist: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    tenantDataExport: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    provisioningJob: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((fn: Function) => fn(/* pass self */)),
    $queryRaw: vi.fn(),
  } as unknown as PrismaClient;
}
```

**Redis Mock Factory:**
```typescript
function createMockRedis() {
  const cache = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => cache.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => { cache.set(key, value); return 'OK'; }),
    del: vi.fn(async (...keys: string[]) => {
      let c = 0;
      for (const k of keys) { if (cache.delete(k)) c++; }
      return c;
    }),
  } as unknown as Redis;
}
```

**Vitest Config (`vitest.config.ts`):**
```typescript
{
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  }
}
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total source files | 32 |
| Total source lines (approx) | ~8,500 |
| Existing test files | 9 |
| Existing test lines (approx) | ~2,400 |
| **Files with NO tests** | **20** |
| **Services with NO tests** | **11 of 13** |
| **Route files with NO tests** | **10 of 12** |
| Critical untested services (Tier 1) | 4 |

### Next Steps
1. Start with **Tier 1 services** — provisioning, deprovisioning, tenant-lifecycle (actual class), tenant-usage
2. Then **Tier 2 services** — tenant-config, branding, data-residency, district-lookup  
3. Then **route integration tests** using Fastify inject
4. Finally **middleware & utility tests**
