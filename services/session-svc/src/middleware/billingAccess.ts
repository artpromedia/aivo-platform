/**
 * Billing access middleware for session-svc
 *
 * Enforces subscription requirements before allowing session creation.
 * Uses @aivo/billing-access library to check subscription status.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BillingAccessClient } from '@aivo/billing-access';

import { config } from '../config.js';

// Initialize billing access client
const billingClient = new BillingAccessClient({
  billingServiceUrl: config.billingServiceUrl,
  cacheTtlMs: 30000, // 30 second cache
  timeoutMs: 5000,
});

interface JwtUser {
  sub: string;
  tenantId: string;
  role: string;
}

/**
 * Fastify preHandler hook to check billing access before session creation.
 * This middleware:
 * 1. Extracts tenantId and learnerId from the request
 * 2. Checks if the subscription allows session creation
 * 3. Returns 402 Payment Required if subscription is missing or in limited mode
 */
export async function billingAccessPreHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip billing check in development if disabled
  if (config.billingCheckDisabled) {
    return;
  }

  // Get user from JWT
  const user = (request as FastifyRequest & { user?: JwtUser }).user;
  if (!user) {
    // Auth middleware should have already rejected, but be safe
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  // Service accounts bypass billing checks
  if (user.role === 'service') {
    return;
  }

  // Extract tenantId and learnerId from request body (for POST /sessions)
  const body = request.body as { tenantId?: string; learnerId?: string } | undefined;
  const tenantId = body?.tenantId ?? user.tenantId;
  const learnerId = body?.learnerId;

  if (!tenantId) {
    return reply.status(400).send({ error: 'Missing tenantId' });
  }

  if (!learnerId) {
    // For endpoints that don't have learnerId, just check limited mode
    const isLimited = await billingClient.isLimitedMode({ tenantId });
    if (isLimited) {
      return reply.status(402).send({
        error: 'SUBSCRIPTION_PAST_DUE',
        message: 'Your subscription is past due. Please update your payment method to continue.',
        code: 'BILLING_LIMITED_MODE',
      });
    }
    return;
  }

  // Full session access check
  const result = await billingClient.canStartSession({ tenantId, learnerId });

  if (!result.allowed) {
    return reply.status(402).send({
      error: result.limitedMode ? 'SUBSCRIPTION_PAST_DUE' : 'SUBSCRIPTION_REQUIRED',
      message: result.reason ?? 'Unable to start session. Please check your subscription.',
      code: result.limitedMode ? 'BILLING_LIMITED_MODE' : 'BILLING_NO_SUBSCRIPTION',
      subscriptionStatus: result.subscriptionStatus,
    });
  }
}

/**
 * Register billing access check as a Fastify plugin.
 * This allows selective application to specific routes.
 */
export async function billingAccessPlugin(fastify: FastifyInstance): Promise<void> {
  // Decorate with billing client for use in routes
  fastify.decorate('billingClient', billingClient);

  // Add hook that can be used by routes
  fastify.decorateRequest('billingAccess', null);

  // Expose the preHandler for selective use
  fastify.decorate('billingAccessPreHandler', billingAccessPreHandler);
}

/**
 * Check if a learner has access to a specific add-on.
 * Useful for routes that require specific SKU access (e.g., SEL sessions).
 */
export async function checkAddonAccess(
  tenantId: string,
  learnerId: string,
  sku: 'ADDON_SEL' | 'ADDON_SPEECH' | 'ADDON_SCIENCE'
): Promise<{ hasAccess: boolean; isTrialing?: boolean }> {
  const result = await billingClient.hasAddon({ tenantId, learnerId, sku });
  return {
    hasAccess: result.hasAddon,
    isTrialing: result.isTrialing,
  };
}

/**
 * Invalidate billing cache for a tenant.
 * Call this when you receive a webhook indicating subscription changes.
 */
export function invalidateBillingCache(tenantId: string): void {
  billingClient.invalidateCache(tenantId);
}

// Export the client for direct use if needed
export { billingClient };
