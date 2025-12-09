/**
 * Payment Routes - Customer, Payment Methods, and Subscriptions
 *
 * Internal-facing API endpoints called by billing logic or frontend proxies.
 *
 * SAFETY FEATURES:
 * - Idempotency keys: All Stripe API calls include deterministic idempotency keys
 * - Correlation logging: All operations include correlationId for tracing
 * - Metrics: Key operations are instrumented
 */

import crypto from 'node:crypto';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { config } from '../config.js';
import { getDbClient } from '../db.js';
import * as metrics from '../metrics.js';
import * as stripeClient from '../stripe.js';
import {
  SubscriptionStatus,
  type AttachPaymentMethodRequest,
  type AttachPaymentMethodResponse,
  type CreateSubscriptionRequest,
  type CreateSubscriptionResponse,
  type CancelSubscriptionRequest,
  type CancelSubscriptionResponse,
  type EnsureCustomerResponse,
} from '../types.js';
import { generateIdempotencyKey } from '../webhook-safety.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const BillingAccountIdParams = z.object({
  billingAccountId: z.string().uuid(),
});

const SubscriptionIdParams = z.object({
  subscriptionId: z.string().uuid(),
});

const AttachPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
  setAsDefault: z.boolean().optional().default(true),
});

const CreateSubscriptionSchema = z.object({
  billingAccountId: z.string().uuid(),
  planSku: z.string().min(1),
  quantity: z.number().int().min(1).optional().default(1),
  trialDays: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const CancelSubscriptionSchema = z.object({
  cancelImmediately: z.boolean().optional().default(false),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function paymentRoutes(fastify: FastifyInstance): Promise<void> {
  const db = getDbClient();

  // ──────────────────────────────────────────────────────────────────────────
  // POST /payments/accounts/:billingAccountId/customer
  // Ensure Stripe customer exists for billing account
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post<{
    Params: { billingAccountId: string };
  }>(
    '/payments/accounts/:billingAccountId/customer',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = BillingAccountIdParams.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid billing account ID',
          details: paramsResult.error.flatten(),
        });
      }

      const { billingAccountId } = paramsResult.data;

      // Get billing account
      const account = await db.getBillingAccount(billingAccountId);
      if (!account) {
        return reply.status(404).send({ error: 'Billing account not found' });
      }

      // If customer already exists, return it
      if (account.providerCustomerId) {
        // Verify it still exists in Stripe
        const existingCustomer = await stripeClient.getCustomer(account.providerCustomerId);
        if (existingCustomer) {
          const response: EnsureCustomerResponse = {
            customerId: account.providerCustomerId,
            isNew: false,
          };
          return reply.send(response);
        }
        // Customer was deleted in Stripe, create new one
      }

      // Create new Stripe customer
      const customerParams: stripeClient.CreateCustomerParams = {
        name: account.displayName,
        metadata: {
          billingAccountId: account.id,
          tenantId: account.tenantId,
          accountType: account.accountType,
        },
      };
      if (account.billingEmail) {
        customerParams.email = account.billingEmail;
      }
      const customer = await stripeClient.createCustomer(customerParams);

      // Update billing account with Stripe customer ID
      await db.updateBillingAccountCustomerId(billingAccountId, customer.id);

      const response: EnsureCustomerResponse = {
        customerId: customer.id,
        isNew: true,
      };

      fastify.log.info({ billingAccountId, customerId: customer.id }, 'Created Stripe customer');

      return reply.status(201).send(response);
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /payments/accounts/:billingAccountId/payment-method/attach
  // Attach a payment method to a billing account
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post<{
    Params: { billingAccountId: string };
    Body: AttachPaymentMethodRequest;
  }>(
    '/payments/accounts/:billingAccountId/payment-method/attach',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = BillingAccountIdParams.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid billing account ID',
          details: paramsResult.error.flatten(),
        });
      }

      const bodyResult = AttachPaymentMethodSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.flatten(),
        });
      }

      const { billingAccountId } = paramsResult.data;
      const { paymentMethodId, setAsDefault } = bodyResult.data;

      // Get billing account
      const account = await db.getBillingAccount(billingAccountId);
      if (!account) {
        return reply.status(404).send({ error: 'Billing account not found' });
      }

      // Ensure customer exists
      if (!account.providerCustomerId) {
        return reply.status(400).send({
          error: 'Billing account has no Stripe customer. Create customer first.',
        });
      }

      // Attach payment method to customer
      const paymentMethod = await stripeClient.attachPaymentMethod(
        paymentMethodId,
        account.providerCustomerId
      );

      // Set as default if requested
      if (setAsDefault) {
        await stripeClient.setDefaultPaymentMethod(account.providerCustomerId, paymentMethodId);
      }

      // Extract card details
      const cardDetails = stripeClient.extractCardDetails(paymentMethod);

      // Store in billing_instruments
      const instrument = await db.createBillingInstrument({
        billingAccountId,
        providerPaymentMethodId: paymentMethodId,
        brand: cardDetails.brand,
        last4: cardDetails.last4,
        expiryMonth: cardDetails.expiryMonth,
        expiryYear: cardDetails.expiryYear,
        isDefault: setAsDefault,
        instrumentType: paymentMethod.type,
      });

      // If setting as default, update other instruments
      if (setAsDefault) {
        await db.updateBillingInstrumentDefault(billingAccountId, instrument.id);
      }

      const response: AttachPaymentMethodResponse = {
        instrumentId: instrument.id,
        brand: cardDetails.brand,
        last4: cardDetails.last4,
        expiryMonth: cardDetails.expiryMonth,
        expiryYear: cardDetails.expiryYear,
        isDefault: setAsDefault,
      };

      fastify.log.info(
        { billingAccountId, instrumentId: instrument.id, last4: cardDetails.last4 },
        'Attached payment method'
      );

      return reply.status(201).send(response);
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /payments/subscriptions
  // Create a new subscription
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post<{
    Body: CreateSubscriptionRequest;
  }>('/payments/subscriptions', async (request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (request.headers['x-request-id'] as string) ?? crypto.randomUUID();

    const bodyResult = CreateSubscriptionSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: bodyResult.error.flatten(),
      });
    }

    const { billingAccountId, planSku, quantity, trialDays, metadata } = bodyResult.data;

    // Get billing account
    const account = await db.getBillingAccount(billingAccountId);
    if (!account) {
      return reply.status(404).send({ error: 'Billing account not found' });
    }

    // Ensure customer exists
    if (!account.providerCustomerId) {
      return reply.status(400).send({
        error: 'Billing account has no Stripe customer. Create customer first.',
      });
    }

    // Get plan by SKU
    const plan = await db.getPlanBySku(planSku);
    if (!plan) {
      return reply.status(404).send({ error: `Plan not found: ${planSku}` });
    }

    if (!plan.isActive) {
      return reply.status(400).send({ error: `Plan is not active: ${planSku}` });
    }

    // Get Stripe price ID from plan metadata
    const stripePriceId = (plan.metadataJson as { stripePriceId?: string } | null)?.stripePriceId;
    if (!stripePriceId) {
      return reply.status(500).send({
        error: `Plan ${planSku} is not configured with a Stripe price ID`,
      });
    }

    // Determine trial days - prefer explicit request, then plan default, then global default
    const effectiveTrialDays =
      trialDays !== undefined
        ? trialDays
        : plan.trialDays !== undefined && plan.trialDays > 0
          ? plan.trialDays
          : config.defaultTrialDays;

    // Generate idempotency key for Stripe API call
    // This prevents double-charging if the request is retried
    const idempotencyKey = generateIdempotencyKey({
      operation: 'createSubscription',
      billingAccountId,
      planSku,
      quantity,
    });

    // Create Stripe subscription params
    const subscriptionParams: stripeClient.CreateSubscriptionParams = {
      customerId: account.providerCustomerId,
      priceId: stripePriceId,
      quantity,
      metadata: {
        billingAccountId,
        planId: plan.id,
        planSku,
        correlationId,
        ...(metadata ? { customMetadata: JSON.stringify(metadata) } : {}),
      },
      paymentBehavior: 'default_incomplete',
      idempotencyKey,
    };
    if (effectiveTrialDays > 0) {
      subscriptionParams.trialDays = effectiveTrialDays;
    }

    // Create Stripe subscription
    const stripeSubscription = await stripeClient.createSubscription(subscriptionParams);

    // Calculate dates
    const now = new Date();
    const trialStartAt = effectiveTrialDays > 0 ? now : null;
    const trialEndAt =
      effectiveTrialDays > 0 && stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : null;
    const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

    // Determine initial status
    const status: SubscriptionStatus =
      effectiveTrialDays > 0 ? SubscriptionStatus.IN_TRIAL : SubscriptionStatus.ACTIVE;

    // Create local subscription record
    const subscriptionData: Parameters<typeof db.createSubscription>[0] = {
      billingAccountId,
      planId: plan.id,
      status,
      quantity,
      trialStartAt,
      trialEndAt,
      currentPeriodStart,
      currentPeriodEnd,
      providerSubscriptionId: stripeSubscription.id,
    };
    if (metadata) {
      subscriptionData.metadataJson = metadata;
    }
    const subscription = await db.createSubscription(subscriptionData);

    const response: CreateSubscriptionResponse = {
      subscriptionId: subscription.id,
      providerSubscriptionId: stripeSubscription.id,
      status,
      trialStartAt: trialStartAt?.toISOString() ?? null,
      trialEndAt: trialEndAt?.toISOString() ?? null,
      currentPeriodStart: currentPeriodStart.toISOString(),
      currentPeriodEnd: currentPeriodEnd.toISOString(),
    };

    // Record metrics
    metrics.recordSubscriptionCreated(planSku, account.accountType ?? 'UNKNOWN');

    fastify.log.info(
      {
        subscriptionId: subscription.id,
        providerSubscriptionId: stripeSubscription.id,
        billingAccountId,
        planSku,
        status,
        trialDays: effectiveTrialDays,
        correlationId,
      },
      'Created subscription'
    );

    return reply.status(201).send(response);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /payments/subscriptions/:subscriptionId/cancel
  // Cancel a subscription (at period end by default)
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post<{
    Params: { subscriptionId: string };
    Body: CancelSubscriptionRequest;
  }>(
    '/payments/subscriptions/:subscriptionId/cancel',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = SubscriptionIdParams.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid subscription ID',
          details: paramsResult.error.flatten(),
        });
      }

      const bodyResult = CancelSubscriptionSchema.safeParse(request.body ?? {});
      const { cancelImmediately } = bodyResult.success
        ? bodyResult.data
        : { cancelImmediately: false };

      const { subscriptionId } = paramsResult.data;

      // Get subscription
      const subscription = await db.getSubscription(subscriptionId);
      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' });
      }

      if (!subscription.providerSubscriptionId) {
        return reply.status(400).send({ error: 'Subscription has no Stripe subscription ID' });
      }

      // Cancel in Stripe
      await stripeClient.cancelSubscription(subscription.providerSubscriptionId, cancelImmediately);

      // Update local subscription
      const canceledAt = new Date();
      const updatedSubscription = await db.updateSubscription(subscriptionId, {
        cancelAtPeriodEnd: !cancelImmediately,
        canceledAt,
        status: cancelImmediately ? SubscriptionStatus.CANCELED : subscription.status,
        endedAt: cancelImmediately ? canceledAt : null,
      });

      const response: CancelSubscriptionResponse = {
        subscriptionId: updatedSubscription.id,
        cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
        canceledAt: updatedSubscription.canceledAt?.toISOString() ?? null,
        status: updatedSubscription.status,
      };

      fastify.log.info(
        {
          subscriptionId,
          cancelAtPeriodEnd: !cancelImmediately,
          cancelImmediately,
        },
        'Canceled subscription'
      );

      return reply.send(response);
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GET /payments/subscriptions/:subscriptionId
  // Get subscription details
  // ──────────────────────────────────────────────────────────────────────────
  fastify.get<{
    Params: { subscriptionId: string };
  }>(
    '/payments/subscriptions/:subscriptionId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = SubscriptionIdParams.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid subscription ID',
          details: paramsResult.error.flatten(),
        });
      }

      const { subscriptionId } = paramsResult.data;

      const subscription = await db.getSubscription(subscriptionId);
      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' });
      }

      return reply.send(subscription);
    }
  );
}
