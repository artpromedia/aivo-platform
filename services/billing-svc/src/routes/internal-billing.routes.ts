/**
 * Internal Billing Access API Routes
 *
 * These routes are meant for internal service-to-service communication only.
 * They should NOT be exposed through the public API gateway.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ParentSku } from '@aivo/billing-common';

interface SubscriptionAccessInfo {
  hasActiveSubscription: boolean;
  status: string | null;
  limitedMode: boolean;
  activeSkus: ParentSku[];
  learnerSkus: Record<string, ParentSku[]>;
}

interface InternalRoutesOptions {
  prisma: PrismaClient;
}

export async function internalBillingRoutes(
  fastify: FastifyInstance,
  options: InternalRoutesOptions
): Promise<void> {
  const { prisma } = options;

  /**
   * GET /internal/billing/access/:tenantId
   *
   * Returns subscription access information for a tenant.
   * Used by other services to check billing status before granting access.
   */
  fastify.get<{
    Params: { tenantId: string };
  }>(
    '/internal/billing/access/:tenantId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              hasActiveSubscription: { type: 'boolean' },
              status: { type: ['string', 'null'] },
              limitedMode: { type: 'boolean' },
              activeSkus: { type: 'array', items: { type: 'string' } },
              learnerSkus: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
      const { tenantId } = request.params;

      // Find billing account for tenant
      const billingAccount = await prisma.billingAccount.findFirst({
        where: { tenantId },
        include: {
          subscriptions: {
            where: {
              status: {
                in: ['active', 'trialing', 'past_due'],
              },
            },
            include: {
              items: {
                include: {
                  plan: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1, // Get most recent active subscription
          },
        },
      });

      if (!billingAccount || billingAccount.subscriptions.length === 0) {
        return reply.status(404).send({
          hasActiveSubscription: false,
          status: null,
          limitedMode: false,
          activeSkus: [],
          learnerSkus: {},
        } satisfies SubscriptionAccessInfo);
      }

      const subscription = billingAccount.subscriptions[0];
      const isActive = ['active', 'trialing'].includes(subscription.status);
      const isPastDue = subscription.status === 'past_due';

      // Check for limitedMode flag
      const limitedMode = (billingAccount as { limitedMode?: boolean }).limitedMode ?? isPastDue;

      // Extract active SKUs from subscription items
      const activeSkus: ParentSku[] = [];
      const learnerSkus: Record<string, ParentSku[]> = {};

      for (const item of subscription.items) {
        const sku = item.plan?.metadata?.sku as ParentSku | undefined;
        if (sku) {
          activeSkus.push(sku);

          // If item has learnerIds metadata, map to those learners
          const learnerIds = (item as { metadata?: { learnerIds?: string[] } }).metadata?.learnerIds;
          if (learnerIds && Array.isArray(learnerIds)) {
            for (const learnerId of learnerIds) {
              if (!learnerSkus[learnerId]) {
                learnerSkus[learnerId] = [];
              }
              learnerSkus[learnerId].push(sku);
            }
          }
        }
      }

      const response: SubscriptionAccessInfo = {
        hasActiveSubscription: isActive || isPastDue,
        status: subscription.status,
        limitedMode,
        activeSkus: [...new Set(activeSkus)], // Dedupe
        learnerSkus,
      };

      return reply.send(response);
    }
  );

  /**
   * POST /internal/billing/invalidate-cache/:tenantId
   *
   * Webhook endpoint to invalidate cached billing access info.
   * Called by billing-svc when subscription changes occur.
   */
  fastify.post<{
    Params: { tenantId: string };
  }>(
    '/internal/billing/invalidate-cache/:tenantId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
      },
    },
    async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
      const { tenantId } = request.params;

      // This endpoint is used by billing-svc to notify other services
      // that billing data has changed and caches should be invalidated.
      // The actual cache invalidation happens on the consuming services.

      fastify.log.info({ tenantId }, 'Cache invalidation requested for tenant');

      return reply.send({ success: true, tenantId });
    }
  );

  /**
   * GET /internal/billing/limited-mode/:tenantId
   *
   * Quick check for limited mode status only.
   */
  fastify.get<{
    Params: { tenantId: string };
  }>(
    '/internal/billing/limited-mode/:tenantId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              limitedMode: { type: 'boolean' },
              reason: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
      const { tenantId } = request.params;

      const billingAccount = await prisma.billingAccount.findFirst({
        where: { tenantId },
        select: {
          limitedMode: true,
        },
      });

      if (!billingAccount) {
        return reply.send({
          limitedMode: false,
          reason: 'No billing account found',
        });
      }

      // Type assertion for the extended schema field
      const limitedMode = (billingAccount as { limitedMode?: boolean }).limitedMode ?? false;

      return reply.send({
        limitedMode,
        reason: limitedMode ? 'Payment past due' : 'Account in good standing',
      });
    }
  );
}
