/**
 * Trial Routes
 *
 * REST API endpoints for managing trial subscriptions including:
 * - Payment method attachment (store without charging)
 * - Trial conversion to paid subscription
 * - Trial status and management
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { trialConversionService } from '../services/trial-conversion.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const AttachPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1), // Stripe payment method ID (pm_xxx)
  setupForAutoCharge: z.boolean().optional().default(true),
});

const ConvertTrialSchema = z.object({
  applyPromotionalPricing: z.boolean().optional(),
  promoCode: z.string().max(50).optional(),
});

const SetupTrialSchema = z.object({
  subscriptionId: z.string().min(1),
  tenantId: z.string().uuid(),
  customerId: z.string().min(1),
  userEmail: z.string().email().optional(),
  trialEndDate: z.string().datetime(),
  planId: z.string().optional(),
  priceId: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

export async function trialRoutes(fastify: FastifyInstance): Promise<void> {
  // ─────────────────────────────────────────────────────────────────────────────
  // GET TRIAL STATUS
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.get(
    '/trials/:subscriptionId',
    {
      schema: {
        description: 'Get the current trial status for a subscription',
        tags: ['Trials'],
        params: {
          type: 'object',
          required: ['subscriptionId'],
          properties: {
            subscriptionId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              trial: {
                type: 'object',
                properties: {
                  isInTrial: { type: 'boolean' },
                  trialEndDate: { type: 'string', nullable: true },
                  daysRemaining: { type: 'integer' },
                  hasPaymentMethodOnFile: { type: 'boolean' },
                  willAutoConvert: { type: 'boolean' },
                  pendingReminders: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { subscriptionId: string } }>,
      reply: FastifyReply
    ) => {
      const { subscriptionId } = request.params;

      const status = await trialConversionService.getTrialStatus(subscriptionId);

      if (!status) {
        return reply.status(404).send({
          success: false,
          error: 'Subscription not found',
        });
      }

      return reply.send({
        success: true,
        trial: status,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // SETUP TRIAL WITH REMINDERS
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.post(
    '/trials/setup',
    {
      schema: {
        description: 'Setup trial reminders for a new subscription (internal use)',
        tags: ['Trials'],
        body: {
          type: 'object',
          required: ['subscriptionId', 'tenantId', 'customerId', 'trialEndDate'],
          properties: {
            subscriptionId: { type: 'string' },
            tenantId: { type: 'string', format: 'uuid' },
            customerId: { type: 'string' },
            userEmail: { type: 'string', format: 'email' },
            trialEndDate: { type: 'string', format: 'date-time' },
            planId: { type: 'string' },
            priceId: { type: 'string' },
            quantity: { type: 'integer', minimum: 1 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof SetupTrialSchema> }>,
      reply: FastifyReply
    ) => {
      const body = SetupTrialSchema.parse(request.body);

      const result = await trialConversionService.setupTrialWithReminders({
        subscriptionId: body.subscriptionId,
        tenantId: body.tenantId,
        customerId: body.customerId,
        userEmail: body.userEmail,
        trialEndDate: new Date(body.trialEndDate),
        planId: body.planId,
        priceId: body.priceId,
        quantity: body.quantity,
      });

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.status(201).send({
        success: true,
        remindersScheduled: result.remindersScheduled,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACH PAYMENT METHOD
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.post(
    '/trials/:subscriptionId/payment-method',
    {
      schema: {
        description:
          'Attach a payment method to a trial subscription WITHOUT charging it. ' +
          'The payment method will be stored on file and charged automatically when the trial ends.',
        tags: ['Trials'],
        params: {
          type: 'object',
          required: ['subscriptionId'],
          properties: {
            subscriptionId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['paymentMethodId'],
          properties: {
            paymentMethodId: {
              type: 'string',
              description: 'Stripe payment method ID (e.g., pm_xxx)',
            },
            setupForAutoCharge: {
              type: 'boolean',
              default: true,
              description: 'Whether to automatically charge when trial ends',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              reminderType: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { subscriptionId: string };
        Body: z.infer<typeof AttachPaymentMethodSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { subscriptionId } = request.params;
      const body = AttachPaymentMethodSchema.parse(request.body);

      const result = await trialConversionService.attachPaymentMethodToTrial({
        subscriptionId,
        paymentMethodId: body.paymentMethodId,
        setupForAutoCharge: body.setupForAutoCharge,
      });

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Payment method attached successfully. It will be charged when your trial ends.',
        reminderType: result.reminderType,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // REMOVE PAYMENT METHOD
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.delete(
    '/trials/:subscriptionId/payment-method',
    {
      schema: {
        description: 'Remove payment method from trial subscription (disables auto-conversion)',
        tags: ['Trials'],
        params: {
          type: 'object',
          required: ['subscriptionId'],
          properties: {
            subscriptionId: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { subscriptionId: string } }>,
      reply: FastifyReply
    ) => {
      const { subscriptionId } = request.params;

      const result = await trialConversionService.removePaymentMethodFromTrial(subscriptionId);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message:
          'Payment method removed. Your trial will not automatically convert to a paid subscription.',
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // CONVERT TRIAL TO PAID
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.post(
    '/trials/:subscriptionId/convert',
    {
      schema: {
        description: 'Convert a trial to a paid subscription. Requires payment method on file.',
        tags: ['Trials'],
        params: {
          type: 'object',
          required: ['subscriptionId'],
          properties: {
            subscriptionId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            applyPromotionalPricing: {
              type: 'boolean',
              description: 'Apply any available promotional pricing for trial conversions',
            },
            promoCode: {
              type: 'string',
              maxLength: 50,
              description: 'Optional promo code to apply',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              subscriptionId: { type: 'string' },
              invoiceId: { type: 'string' },
              amountCharged: { type: 'integer' },
              discountApplied: { type: 'integer' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { subscriptionId: string };
        Body: z.infer<typeof ConvertTrialSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { subscriptionId } = request.params;
      const body = ConvertTrialSchema.parse(request.body ?? {});
      const userId = (request.user as { id?: string })?.id ?? 'system';

      const result = await trialConversionService.convertTrial({
        subscriptionId,
        applyPromotionalPricing: body.applyPromotionalPricing,
        promoCode: body.promoCode,
        convertedBy: userId,
      });

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        subscriptionId: result.subscriptionId,
        invoiceId: result.invoiceId,
        amountCharged: result.amountCharged,
        discountApplied: result.discountApplied,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // CANCEL TRIAL
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.post(
    '/trials/:subscriptionId/cancel',
    {
      schema: {
        description: 'Cancel a trial subscription',
        tags: ['Trials'],
        params: {
          type: 'object',
          required: ['subscriptionId'],
          properties: {
            subscriptionId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string', maxLength: 1000 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { subscriptionId: string };
        Body: { reason?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { subscriptionId } = request.params;
      const { reason } = request.body ?? {};

      const result = await trialConversionService.cancelTrial(subscriptionId, reason);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Trial subscription cancelled',
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TRIAL STATS (Admin)
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.get(
    '/trials/stats',
    {
      schema: {
        description: 'Get trial subscription statistics',
        tags: ['Trials'],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const stats = await trialConversionService.getTrialStats();

      return reply.send({
        success: true,
        stats,
      });
    }
  );
}

export default trialRoutes;
