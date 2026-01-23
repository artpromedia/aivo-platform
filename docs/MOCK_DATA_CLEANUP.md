# Mock Data Cleanup Report

## Sprint 4.1: Remove Dead Mock Code

**Date:** January 2025  
**Author:** Staff Software Engineer  
**Sprint:** 4.1 - Remove Dead Mock Code and Cleanup

---

## Executive Summary

This sprint removed all dead mock code, unused mock files, and development-only stubs that were no longer needed after API integration in Phases 1-3. The cleanup improves production safety, reduces bundle size, and prevents accidental mock data usage in production.

---

## Files Deleted

### web-parent Application

| File                                       | Lines | Purpose                               | Replacement                  |
| ------------------------------------------ | ----- | ------------------------------------- | ---------------------------- |
| `apps/web-parent/src/lib/mock-data.ts`     | 2,148 | Legacy mock data for parent dashboard | Real APIs via `@/hooks`      |
| `apps/web-parent/src/lib/hooks.ts`         | 976   | Old hooks with mock fallbacks         | New hooks in `@/hooks/*.ts`  |
| `apps/web-parent/src/lib/billing-hooks.ts` | 608   | Billing hooks with mock fallbacks     | New `@/hooks/use-billing.ts` |

**Total Lines Removed from web-parent:** 3,732

### web-teacher Application

| File                                    | Lines | Purpose                         | Replacement                                   |
| --------------------------------------- | ----- | ------------------------------- | --------------------------------------------- |
| `apps/web-teacher/src/lib/mock-data.ts` | 709   | Mock classes and dashboard data | Real APIs via `classesApi` and `analyticsApi` |

**Total Lines Removed from web-teacher:** 709

### Grand Total

**Total Lines of Dead Code Removed:** 4,441 lines

---

## Files Updated

### Import Migrations

| File                                                      | Change                                                 |
| --------------------------------------------------------- | ------------------------------------------------------ |
| `apps/web-parent/src/app/billing/page.tsx`                | Import from `@/hooks` instead of `@/lib/billing-hooks` |
| `apps/web-parent/src/app/reports/page.tsx`                | Import from `@/hooks` instead of `@/lib/hooks`         |
| `apps/web-parent/src/lib/caregiver-hooks.ts`              | Import `isDevMode` from `@/lib/api/client`             |
| `apps/web-teacher/src/app/(dashboard)/dashboard/page.tsx` | Use `useClasses` and `useClassAnalytics` hooks         |

### API Routes (Mock Fallbacks Removed)

| File                                                              | Change                                 |
| ----------------------------------------------------------------- | -------------------------------------- |
| `apps/web-parent/src/app/api/billing/route.ts`                    | Removed mock data fallback in dev mode |
| `apps/web-parent/src/app/api/billing/subscription/route.ts`       | Removed mock data fallback in dev mode |
| `apps/web-parent/src/app/api/billing/subscription/seats/route.ts` | Removed mock data fallback in dev mode |

---

## New Files Created

### Billing Hooks

| File                                       | Purpose                                  |
| ------------------------------------------ | ---------------------------------------- |
| `apps/web-parent/src/hooks/use-billing.ts` | New billing hooks without mock fallbacks |

**Hooks included:**

- Query hooks: `useSubscription`, `usePlans`, `usePaymentMethods`, `useInvoices`, `useBillingDetails`, `usePlanChangePreview`, `useCouponValidation`, `useAvailableChildren`
- Mutation hooks: `useCreateCheckout`, `useChangePlan`, `useCancelSubscription`, `useResumeSubscription`, `useManageSeats`, `useAddPaymentMethod`, `useRemovePaymentMethod`, `useSetDefaultPaymentMethod`, `useCreateBillingPortal`, `useDownloadInvoice`, `useUpdateBillingPeriod`, `useApplyCoupon`

---

## Safeguards Added

### ESLint Rules

Added `no-restricted-imports` patterns to `eslint.config.mjs`:

```javascript
patterns: [
  {
    group: ['**/mock-data', '**/mock-data.ts', '**/lib/mock-data'],
    message: 'Mock data imports are forbidden. Use real APIs via hooks from @/hooks.',
  },
  {
    group: ['**/*.mock', '**/*.mock.ts'],
    message: 'Mock file imports are forbidden in production code.',
  },
];
```

### .gitignore Updates

Added patterns to prevent mock data files from being committed:

```gitignore
# Sprint 4.1: Prevent mock data files in production
**/lib/mock-data.ts
**/lib/mock-data.js
**/*.mock.ts
**/*.mock.js
**/stub-*.ts
**/stub-*.js
# Allow test mocks
!**/test/mocks/**
!**/__mocks__/**
!**/tests/mocks/**
```

### lint-staged Enhancement

Updated `lint-staged.config.mjs` to detect and block mock data files during pre-commit.

---

## Migration Guide

### For Developers

If you previously used hooks from `@/lib/hooks`, migrate to the new hooks:

**Old (deprecated):**

```typescript
import { useParentProfile, useSubscription } from '@/lib/hooks';
import { usePlans } from '@/lib/billing-hooks';
```

**New:**

```typescript
import { useParentProfile, useSubscription, usePlans } from '@/hooks';
```

### API Route Pattern

If you need development-mode testing, use proper test fixtures or a local development server, not inline mock data:

**Old (removed):**

```typescript
if (process.env.NODE_ENV === 'development') {
  return NextResponse.json(getMockSubscription());
}
```

**New:**

```typescript
// Always call real service - use test fixtures for unit tests
const response = await fetch(`${billingServiceUrl}/api/subscription`, ...);
```

---

## Verification Checklist

- [x] All `mock-data.ts` files deleted
- [x] All old hook files (`hooks.ts`, `billing-hooks.ts`) deleted
- [x] All imports updated to use new hooks
- [x] API routes no longer have mock fallbacks
- [x] ESLint rules block mock imports
- [x] .gitignore prevents mock files
- [x] lint-staged detects mock files
- [x] No TypeScript/ESLint errors in codebase

---

## Test Mocks

**Note:** Test mocks in the following locations are **preserved** and should continue to be used for unit/integration testing:

- `apps/mobile-teacher/test/mocks/**` - Flutter test mocks
- Any `__mocks__/` directories
- Any `tests/mocks/` directories

These are legitimate testing infrastructure and are excluded from the cleanup rules.

---

## References

- [Production Readiness Audit](../AIVO_QA_PRODUCTION_READINESS_AUDIT.md)
- [API Inventory](../API_INVENTORY.md)
- [Sprint 4.1 Plan](../TODO_REMEDIATION_PLAN.md)
