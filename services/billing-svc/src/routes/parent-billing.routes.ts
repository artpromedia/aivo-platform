/**
 * Parent Billing Routes
 *
 * REST API endpoints for parent (consumer) billing operations.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  CheckoutSessionRequestSchema,
  CreateCouponRequestSchema,
  UpdateModulesRequestSchema,
} from '@aivo/billing-common';

import { couponService } from '../services/coupon.service.js';
import { parentBillingService } from '../services/parent-billing.service.js';
import { trialService } from '../services/trial.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RequestContext {
  tenantId: string;
  userId: string;
  correlationId: string;
}

// Extract context from request headers (injected by Kong)
function getContext(request: FastifyRequest): RequestContext {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;
  const correlationId = (request.headers['x-correlation-id'] as string) ?? crypto.randomUUID();

  if (!tenantId || !userId) {
    throw new Error('Missing required headers: x-tenant-id, x-user-id');
  }

  return { tenantId, userId, correlationId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function parentBillingRoutes(app: FastifyInstance): Promise<void> {
  // ───────────────────────────────────────────────────────────────────────────
  // CHECKOUT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /billing/checkout-session
   * Create a Stripe Checkout session for subscription purchase
   */
  app.post('/billing/checkout-session', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    const body = CheckoutSessionRequestSchema.parse(request.body);

    const result = await parentBillingService.createCheckoutSession(ctx, body);

    return reply.status(201).send(result);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTION
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * GET /billing/subscription
   * Get current subscription for the tenant
   */
  app.get('/billing/subscription', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);

    const subscription = await parentBillingService.getSubscription(ctx);

    if (!subscription) {
      return reply.status(404).send({ error: 'No active subscription found' });
    }

    return reply.send(subscription);
  });

  /**
   * POST /billing/update-modules
   * Add or remove modules from subscription with proration
   */
  app.post('/billing/update-modules', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    const body = UpdateModulesRequestSchema.parse(request.body);

    const result = await parentBillingService.updateModules(ctx, body);

    return reply.send(result);
  });

  /**
   * POST /billing/cancel
   * Cancel subscription (at period end by default)
   */
  app.post(
    '/billing/cancel',
    async (
      request: FastifyRequest<{ Body: { immediate?: boolean } }>,
      reply: FastifyReply
    ) => {
      const ctx = getContext(request);
      const immediate = (request.body as { immediate?: boolean })?.immediate ?? false;

      const result = await parentBillingService.cancelSubscription(ctx, immediate);

      return reply.send(result);
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // INVOICES
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * GET /billing/invoices
   * Get paginated invoice history
   */
  app.get(
    '/billing/invoices',
    async (
      request: FastifyRequest<{ Querystring: { limit?: string; startingAfter?: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getContext(request);
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;
      const startingAfter = request.query.startingAfter;

      const result = await parentBillingService.getInvoices(ctx, limit, startingAfter);

      return reply.send(result);
    }
  );

  /**
   * GET /billing/upcoming
   * Get upcoming invoice preview
   */
  app.get('/billing/upcoming', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);

    const preview = await parentBillingService.getUpcomingInvoice(ctx);

    if (!preview) {
      return reply.status(404).send({ error: 'No upcoming invoice' });
    }

    return reply.send(preview);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // BILLING PORTAL
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /billing/portal-session
   * Create Stripe Billing Portal session for self-service
   */
  app.post(
    '/billing/portal-session',
    async (
      request: FastifyRequest<{ Body: { returnUrl: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getContext(request);
      const { returnUrl } = request.body as { returnUrl: string };

      if (!returnUrl) {
        return reply.status(400).send({ error: 'returnUrl is required' });
      }

      const result = await parentBillingService.createBillingPortalSession(ctx, returnUrl);

      return reply.send(result);
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // COUPONS (Parent-facing)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /billing/apply-coupon
   * Validate a coupon code
   */
  app.post(
    '/billing/apply-coupon',
    async (
      request: FastifyRequest<{ Body: { code: string; skus?: string[] } }>,
      reply: FastifyReply
    ) => {
      const ctx = getContext(request);
      const { code, skus } = request.body as { code: string; skus?: string[] };

      if (!code) {
        return reply.status(400).send({ error: 'code is required' });
      }

      const result = await couponService.validateCoupon(ctx.tenantId, code, skus as any);

      return reply.send(result);
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // TRIALS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * GET /billing/trials
   * Get active trials for the tenant
   */
  app.get('/billing/trials', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);

    const trials = await trialService.getActiveTrials(ctx.tenantId);

    return reply.send({ trials });
  });

  /**
   * POST /billing/trials/check-eligibility
   * Check trial eligibility for learner/SKU combinations
   */
  app.post(
    '/billing/trials/check-eligibility',
    async (
      request: FastifyRequest<{ Body: { learnerIds: string[]; skus: string[] } }>,
      reply: FastifyReply
    ) => {
      const ctx = getContext(request);
      const { learnerIds, skus } = request.body as { learnerIds: string[]; skus: string[] };

      if (!learnerIds?.length || !skus?.length) {
        return reply.status(400).send({ error: 'learnerIds and skus are required' });
      }

      const results = await trialService.checkBulkEligibility(ctx.tenantId, learnerIds, skus as any);

      return reply.send({ eligibility: results });
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES (Separate registration for RBAC)
// ═══════════════════════════════════════════════════════════════════════════════

export async function adminBillingRoutes(app: FastifyInstance): Promise<void> {
  // ───────────────────────────────────────────────────────────────────────────
  // COUPON MANAGEMENT (Admin only)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /admin/billing/coupons
   * Create a new coupon
   */
  app.post('/admin/billing/coupons', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    const body = CreateCouponRequestSchema.parse(request.body);

    const coupon = await couponService.createCoupon(body, ctx.userId);

    return reply.status(201).send(coupon);
  });

  /**
   * GET /admin/billing/coupons
   * List coupons with filters
   */
  app.get(
    '/admin/billing/coupons',
    async (
      request: FastifyRequest<{
        Querystring: { tenantId?: string; isActive?: string; limit?: string; offset?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId, isActive, limit, offset } = request.query;

      const result = await couponService.listCoupons({
        tenantId: tenantId ?? undefined,
        isActive: isActive ? isActive === 'true' : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return reply.send(result);
    }
  );

  /**
   * GET /admin/billing/coupons/:id
   * Get coupon details
   */
  app.get(
    '/admin/billing/coupons/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const coupon = await couponService.getCoupon(request.params.id);

      if (!coupon) {
        return reply.status(404).send({ error: 'Coupon not found' });
      }

      return reply.send(coupon);
    }
  );

  /**
   * PATCH /admin/billing/coupons/:id
   * Update coupon
   */
  app.patch(
    '/admin/billing/coupons/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { isActive?: boolean; validTo?: string; maxRedemptions?: number; description?: string };
      }>,
      reply: FastifyReply
    ) => {
      const coupon = await couponService.updateCoupon(request.params.id, request.body);

      if (!coupon) {
        return reply.status(404).send({ error: 'Coupon not found' });
      }

      return reply.send(coupon);
    }
  );

  /**
   * DELETE /admin/billing/coupons/:id
   * Deactivate coupon
   */
  app.delete(
    '/admin/billing/coupons/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      await couponService.deactivateCoupon(request.params.id);
      return reply.status(204).send();
    }
  );

  /**
   * GET /admin/billing/coupons/:id/redemptions
   * Get coupon redemption history
   */
  app.get(
    '/admin/billing/coupons/:id/redemptions',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const history = await couponService.getRedemptionHistory(request.params.id);
      return reply.send({ redemptions: history });
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // TRIAL ANALYTICS (Admin only)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * GET /admin/billing/trials/stats
   * Get trial conversion stats
   */
  app.get(
    '/admin/billing/trials/stats',
    async (
      request: FastifyRequest<{
        Querystring: { tenantId?: string; startDate?: string; endDate?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId, startDate, endDate } = request.query;

      const stats = await trialService.getTrialStats(
        tenantId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      return reply.send(stats);
    }
  );

  /**
   * GET /admin/billing/trials/ending-soon
   * Get trials ending soon (for proactive outreach)
   */
  app.get(
    '/admin/billing/trials/ending-soon',
    async (
      request: FastifyRequest<{ Querystring: { days?: string } }>,
      reply: FastifyReply
    ) => {
      const days = request.query.days ? parseInt(request.query.days, 10) : 7;
      const trials = await trialService.getTrialsEndingSoon(days);
      return reply.send({ trials });
    }
  );
}
