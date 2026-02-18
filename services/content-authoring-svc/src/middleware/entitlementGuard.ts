/**
 * Entitlement Guard Middleware
 *
 * Subscription-tier enforcement for content-authoring-svc.
 * Ensures FREE-tier users cannot exceed plan limits or access paid features.
 *
 * Uses @aivo/billing-access for subscription status checks and calls
 * billing-svc entitlements API for feature / limit verification.
 *
 * Pattern mirrors services/session-svc/src/middleware/billingAccess.ts.
 */

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { BillingAccessClient } from '@aivo/billing-access';
import type { FastifyRequest, FastifyReply } from 'fastify';

import { getUserFromRequest } from '../auth.js';
import { config } from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EntitlementInfo {
  plan: string;
  hasActiveSubscription: boolean;
  limitedMode: boolean;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
  modules: string[];
}

/** Shape of billing-svc GET /entitlements response */
interface EntitlementsResponse {
  plan: string;
  isActive: boolean;
  inGracePeriod: boolean;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
  modules: string[];
}

/** Shape of billing-svc POST /entitlements/check-limit response */
interface CheckLimitResponse {
  limitType: string;
  used: number;
  limit: number | null;
  exceeded: boolean;
  remaining: number | null;
  percentUsed: number | null;
  tenantId: string;
}

/** Shape of billing-svc POST /entitlements/check-feature response */
interface CheckFeatureResponse {
  feature: string;
  hasAccess: boolean;
  tenantId: string;
}

// Extend FastifyRequest so downstream handlers can read entitlements
declare module 'fastify' {
  interface FastifyRequest {
    entitlements?: EntitlementInfo;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const billingClient = new BillingAccessClient({
  billingServiceUrl: config.billingServiceUrl,
  cacheTtlMs: 30_000,
  timeoutMs: 5_000,
});

/** Minimum plan required for each feature (used in upgrade prompts). */
const FEATURE_MIN_PLAN: Record<string, string> = {
  collaboration: 'PREMIUM',
};

/** Default modules for FREE tier (fallback when billing-svc is unreachable). */
export const DEFAULT_FREE_MODULES = ['ELA', 'MATH'];

/** Minimum plan required to access a given module. */
export const MODULE_MIN_PLAN: Record<string, string> = {
  SEL: 'PRO',
  SCIENCE: 'PREMIUM',
  SPEECH: 'PREMIUM',
  EXECUTIVE_FUNCTION: 'PREMIUM',
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchEntitlements(tenantId: string): Promise<EntitlementsResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => { controller.abort(); }, 5_000);

  try {
    const res = await fetch(
      `${config.billingServiceUrl}/entitlements`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': 'system', // internal service call
        },
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as EntitlementsResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkLimitRemote(
  tenantId: string,
  limitType: string,
  currentUsage: number,
): Promise<CheckLimitResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => { controller.abort(); }, 5_000);

  try {
    const res = await fetch(
      `${config.billingServiceUrl}/entitlements/check-limit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': 'system',
        },
        body: JSON.stringify({ limitType, currentUsage }),
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as CheckLimitResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkFeatureRemote(
  tenantId: string,
  feature: string,
): Promise<CheckFeatureResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => { controller.abort(); }, 5_000);

  try {
    const res = await fetch(
      `${config.billingServiceUrl}/entitlements/check-feature`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-id': 'system',
        },
        body: JSON.stringify({ feature }),
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as CheckFeatureResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base entitlement preHandler — validates active subscription and attaches
 * `request.entitlements` for downstream use.
 *
 * Returns 402 when tenant has no active subscription and no FREE entitlements.
 */
export async function entitlementPreHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Dev escape hatch
  if (config.billingCheckDisabled) return;

  const user = getUserFromRequest(request);
  if (!user) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  // Service accounts bypass billing checks (matching session-svc pattern)
  if (user.roles.includes('service')) return;

  const tenantId = user.tenantId ?? user.tenant_id;
  if (!tenantId) {
    return reply.status(400).send({ error: 'Missing tenantId in token' });
  }

  // Check subscription status via billing-access library (cached)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const isLimited = await billingClient.isLimitedMode({ tenantId });
  if (isLimited) {
    return reply.status(402).send({
      error: 'SUBSCRIPTION_PAST_DUE',
      message: 'Your subscription is past due. Please update your payment method to continue.',
      code: 'BILLING_LIMITED_MODE',
    });
  }

  // Fetch full entitlements from billing-svc
  const ent = await fetchEntitlements(tenantId);

  if (ent && !ent.isActive && !ent.inGracePeriod) {
    // Expired / cancelled → treat as FREE but still allow if FREE has access
    request.entitlements = {
      plan: 'FREE',
      hasActiveSubscription: false,
      limitedMode: false,
      features: {},
      limits: {},
      modules: [...DEFAULT_FREE_MODULES],
    };
    return;
  }

  // Attach entitlements for downstream handlers
  request.entitlements = {
    plan: ent?.plan ?? 'FREE',
    hasActiveSubscription: ent?.isActive ?? false,
    limitedMode: false,
    features: ent?.features ?? {},
    limits: ent?.limits ?? {},
    modules: ent?.modules ?? [...DEFAULT_FREE_MODULES],
  };
}

/**
 * Factory: returns a preHandler that checks a plan feature flag.
 * Returns 403 with upgrade prompt if the feature is not available.
 */
export function requireFeature(feature: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (config.billingCheckDisabled) return;

    const user = getUserFromRequest(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });
    if (user.roles.includes('service')) return;

    const tenantId = user.tenantId ?? user.tenant_id;
    if (!tenantId) return reply.status(400).send({ error: 'Missing tenantId' });

    const result = await checkFeatureRemote(tenantId, feature);

    // Fail open if billing-svc is unreachable
    if (!result) return;

    if (!result.hasAccess) {
      const minPlan = FEATURE_MIN_PLAN[feature] ?? 'PRO';
      return reply.status(403).send({
        error: 'FEATURE_NOT_AVAILABLE',
        message: `The "${feature}" feature is not included in your current plan.`,
        code: 'BILLING_FEATURE_GATE',
        upgradePrompt: {
          requiredPlan: minPlan,
          message: `Upgrade to ${minPlan} to unlock ${feature}.`,
        },
      });
    }
  };
}

/**
 * Factory: returns a preHandler that checks a usage limit.
 * Returns 403 with upgrade prompt if the limit is exceeded.
 *
 * `currentUsage` is fetched from the billing-svc side (it counts from DB).
 * We pass 0 and let the service supply the real count, or we can supply it.
 */
export function requireLimit(limitType: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (config.billingCheckDisabled) return;

    const user = getUserFromRequest(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });
    if (user.roles.includes('service')) return;

    const tenantId = user.tenantId ?? user.tenant_id;
    if (!tenantId) return reply.status(400).send({ error: 'Missing tenantId' });

    // Let billing-svc calculate current usage
    const result = await checkLimitRemote(tenantId, limitType, 0);

    // Fail open if billing-svc is unreachable
    if (!result) return;

    if (result.exceeded) {
      return reply.status(403).send({
        error: 'LIMIT_EXCEEDED',
        message: `You have reached your ${limitType} limit (${result.used}/${result.limit}).`,
        code: 'BILLING_LIMIT_EXCEEDED',
        usage: {
          used: result.used,
          limit: result.limit,
          remaining: result.remaining,
        },
        upgradePrompt: {
          requiredPlan: 'PRO',
          message: `Upgrade to PRO for higher ${limitType} limits.`,
        },
      });
    }
  };
}

// Re-export the client for direct use if needed
export { billingClient };
