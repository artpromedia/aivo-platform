# AIVO Build Error Remediation Guide

**Date**: January 25, 2026  
**Build Status**: 48 successful / 100 total (52 failures)

---

## Executive Summary

The AIVO monorepo has **52 failing build tasks** across services, packages, and web applications. The failures fall into **7 distinct categories**:

| Category | Affected Count | Priority | Fix Complexity |
|----------|----------------|----------|----------------|
| 1. `exactOptionalPropertyTypes` Prisma conflicts | ~25 services | **HIGH** | Medium |
| 2. Fastify Type Provider conflicts | ~15 services | **HIGH** | Low-Medium |
| 3. Missing dependencies | ~5 packages | **MEDIUM** | Low |
| 4. Prisma schema drift | ~4 services | **HIGH** | Medium-High |
| 5. Unused variable errors (TS6133) | ~3 packages | **LOW** | Low |
| 6. Web app type errors | ~7 apps | **MEDIUM** | Medium |
| 7. Missing module exports | ~3 packages | **MEDIUM** | Low |

---

## Recommended Stable Fastify Version

### Current State
Most services use **Fastify 4.28.1** or **4.29.1** (Fastify v4 series).

### Recommendation: Stay on Fastify 4.x LTS

**Recommended Version: `fastify@4.28.1`**

| Version | Status | Notes |
|---------|--------|-------|
| **4.28.1** | ✅ **Recommended** | Last stable v4.x release before v5, widely tested |
| 4.29.1 | ✅ Also good | Minor update, compatible |
| 5.x | ⚠️ **NOT recommended** | Breaking changes, type incompatibilities with many plugins |

### Why NOT Fastify 5.x
Fastify 5.x introduces breaking changes that cause the `FastifyTypeProvider` vs `FastifyTypeProviderDefault` conflicts you're seeing:

```typescript
// The error pattern:
Type 'FastifyInstance<...FastifyTypeProvider>' is not assignable to 
Type 'FastifyInstance<...FastifyTypeProviderDefault>'
```

**Plugin compatibility issues with v5**:
- `@fastify/cors` - Type conflicts
- `@fastify/helmet` - Type conflicts  
- `@fastify/rate-limit` - Type conflicts
- `@fastify/websocket` - Type conflicts
- `fastify-plugin` - Requires matching version

### Recommended Plugin Versions (for Fastify 4.28.1)

```json
{
  "fastify": "^4.28.1",
  "@fastify/cors": "^9.0.1",
  "@fastify/helmet": "^11.1.1",
  "@fastify/rate-limit": "^9.1.0",
  "@fastify/jwt": "^8.0.1",
  "@fastify/websocket": "^8.3.1",
  "@fastify/multipart": "^8.3.0",
  "@fastify/swagger": "^8.15.0",
  "@fastify/swagger-ui": "^4.1.0",
  "fastify-plugin": "^4.5.1"
}
```

---

## Category 1: `exactOptionalPropertyTypes` + Prisma Conflicts

### Affected Services (~25)
- life-skills-svc, profile-svc, benchmarking-svc, embedded-tools-svc
- billing-svc, assessment-svc, messaging-svc, curriculum-svc
- game-library-svc, game-gen-svc, sel-svc, approval-svc
- orchestrator-svc, baseline-svc, teacher-planning-svc
- professional-dev-svc, speech-therapy-svc, model-trainer-svc
- collaboration-svc, content-authoring-svc, and more

### Root Cause
TypeScript's `exactOptionalPropertyTypes: true` in `tsconfig.base.json` conflicts with Prisma's generated types. Prisma uses `null` for optional fields, but application code often uses `undefined`.

**Example Error:**
```typescript
// Code passes: undefined
{ context: session.context ?? undefined }

// Prisma expects: null
Types of property 'context' are incompatible.
Type 'string | undefined' is not assignable to type 'string | null'.
```

### Solutions (Choose One)

#### Option A: Service-Level tsconfig Override (Quick Fix)
Add to each failing service's `tsconfig.json`:
```json
{
  "compilerOptions": {
    "exactOptionalPropertyTypes": false
  }
}
```

#### Option B: Convert `undefined` to `null` (Proper Fix)
Replace all `?? undefined` with `?? null`:
```typescript
// Before
{ context: session.context ?? undefined }

// After  
{ context: session.context ?? null }
```

#### Option C: Disable Globally (Fastest but Least Type-Safe)
In `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "exactOptionalPropertyTypes": false
  }
}
```

---

## Category 2: Fastify Type Provider Conflicts

### Affected Services (~15)
Services with websocket, custom middleware, or complex route typing.

### Root Cause
Mismatch between `FastifyTypeProvider` and `FastifyTypeProviderDefault` when registering plugins.

### Solution: Use `as any` Cast Pattern

Already applied to many services. For remaining ones:

```typescript
// Before
app.register(rateLimit, { max: 100 });
app.register(cors, { origin: true });
app.register(helmet, {});

// After
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.register(rateLimit as any, { max: 100 });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.register(cors as any, { origin: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.register(helmet as any, {});
```

### Alternative: Use Existing `asPlugin()` Helper
The codebase has a helper in `@aivo/ts-api-utils`:

```typescript
import { asPlugin } from '@aivo/ts-api-utils';

app.register(asPlugin(rateLimit), { max: 100 });
```

---

## Category 3: Missing Dependencies

### @aivo/collaboration
**Error:** Could not resolve `@tiptap/*` packages

**Fix:**
```bash
pnpm --filter @aivo/collaboration add @tiptap/react @tiptap/starter-kit @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor @tiptap/extension-highlight @tiptap/extension-image @tiptap/extension-link
```

### @aivo/benchmarking-svc
**Error:** Cannot find module 'fastify-plugin' or 'jose'

**Fix:**
```bash
pnpm --filter @aivo/benchmarking-svc add fastify-plugin jose
```

---

## Category 4: Prisma Schema Drift

### Affected Services
1. **billing-svc** - Missing enums: `EnterpriseCustomerType`, `EnterpriseDealStatus`, `VaultLicenseType`
2. **curriculum-svc** - Missing models/relations
3. **assessment-svc** - Missing question types
4. **messaging-svc** - Missing `ContextType.DOCUMENT` enum

### Root Cause
Code references Prisma types/enums that don't exist in the schema.

### Solutions

#### Step 1: Check Schema
```bash
cd services/billing-svc
cat prisma/schema.prisma | grep -A5 "enum Enterprise"
```

#### Step 2: Add Missing Enums/Models
```prisma
// Add to schema.prisma
enum EnterpriseCustomerType {
  DISTRICT
  NONPROFIT
  CHARTER
  ENTERPRISE
}

enum EnterpriseDealStatus {
  DRAFT
  PENDING
  ACTIVE
  COMPLETED
  CANCELLED
}
```

#### Step 3: Regenerate Client
```bash
pnpm --filter @aivo/billing-svc db:generate
```

---

## Category 5: Unused Variable Errors (TS6133)

### @aivo/ui Package
**Errors:**
```
'AssessmentCard' is declared but its value is never read
'onPhaseChange' is declared but its value is never read
'theme' is declared but its value is never read
```

### Solution: Prefix with Underscore or Remove
```typescript
// Before
const { theme, previousGames } = props;

// After (if intentionally unused)
const { theme: _theme, previousGames: _previousGames } = props;

// Or remove the unused destructuring entirely
```

---

## Category 6: Web App Errors

### @aivo/web-learner
**Error:**
```
Type '(gameId: string) => void' is not assignable to type '(game: GameDefinition) => void'
```

**File:** `components/games/GameContainer.tsx:109`

**Fix:** Update handler signature:
```typescript
// Before
const handleSelectGame = (gameId: string) => { ... };

// After
const handleSelectGame = (game: GameDefinition) => {
  const gameId = game.id;
  // ... rest of logic
};
```

### @aivo/web-author
**Error:** `dev-login endpoint is not available in production`

**Fix:** Add conditional export in route:
```typescript
// app/api/auth/dev-login/route.ts
export const dynamic = 'force-dynamic';

if (process.env.NODE_ENV === 'production') {
  // Return 404 or redirect instead of throwing
  export async function POST() {
    return Response.json({ error: 'Not available' }, { status: 404 });
  }
}
```

### @aivo/web-dev-portal
**Error:** `Cannot find module '@tailwindcss/typography'`

**Fix:**
```bash
pnpm --filter @aivo/web-dev-portal add -D @tailwindcss/typography
```

---

## Category 7: Missing Module Exports

### @aivo/collaboration Package
**Errors:**
```
'"./CommentThread"' has no exported member named 'CommentThreadProps'
'"./CollaborativeEditor"' has no exported member named 'CollaborativeEditorProps'
```

**Fix:** Add missing exports to component files:
```typescript
// CollaborativeEditor.tsx
export interface CollaborativeEditorProps { ... }
export interface CollaboratorInfo { ... }
export const CollaborativeEditor = ...
```

---

## Recommended Fix Order

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Add missing dependencies (collaboration, benchmarking-svc, web-dev-portal)
2. ✅ Add `exactOptionalPropertyTypes: false` to failing service tsconfigs
3. ✅ Remove/prefix unused variables in @aivo/ui

### Phase 2: Type Fixes (2-4 hours)
1. Fix web-learner GameContainer type mismatch
2. Add missing exports to @aivo/collaboration
3. Fix web-author dev-login production handling

### Phase 3: Schema Alignment (4-8 hours)
1. Audit billing-svc Prisma schema vs code
2. Add missing enums/models
3. Regenerate Prisma clients
4. Test affected services

### Phase 4: Deep Type Cleanup (8+ hours)
1. Convert all `?? undefined` to `?? null` for Prisma compatibility
2. Re-enable `exactOptionalPropertyTypes` globally
3. Add proper types to Fastify route handlers

---

## Quick Commands Reference

```bash
# Install missing deps
pnpm install

# Build single service
pnpm --filter @aivo/service-name build

# Build all with continue on error
pnpm turbo build --continue

# Regenerate Prisma client
pnpm --filter @aivo/service-name db:generate

# Check TypeScript errors without building
pnpm --filter @aivo/service-name exec tsc --noEmit
```

---

## Appendix: Version Matrix

| Package | Current | Recommended | Notes |
|---------|---------|-------------|-------|
| fastify | 4.28.1/4.29.1 | 4.28.1 | Stay on v4 LTS |
| @fastify/cors | 9.0.1 | 9.0.1 | Compatible with v4 |
| @fastify/helmet | 11.1.1 | 11.1.1 | Compatible with v4 |
| @fastify/rate-limit | 9.1.0 | 9.1.0 | Compatible with v4 |
| prisma | 5.22.0/6.19.0 | 5.22.0 | Standardize on v5 |
| typescript | 5.5.2/5.9.3 | 5.5.2 | Standardize |
