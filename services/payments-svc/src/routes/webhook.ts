/**
 * Stripe Webhook Handler
 *
 * Handles incoming Stripe webhook events for:
 * - invoice.paid / invoice.payment_failed
 * - customer.subscription.deleted / updated
 * - payment_intent.succeeded / failed
 *
 * SAFETY FEATURES:
 * - Idempotency: Events are deduplicated using payment_events table
 * - Correlation: All logs include correlationId for tracing
 * - Metrics: All events are tracked for observability
 * - Dunning: Payment failures trigger dunning flow
 */

import crypto from 'node:crypto';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type Stripe from 'stripe';

import { getDbClient } from '../db.js';
import * as dunning from '../dunning.js';
import * as metrics from '../metrics.js';
import * as stripeClient from '../stripe.js';
import { SubscriptionStatus } from '../types.js';
import * as webhookSafety from '../webhook-safety.js';

// ══════════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

interface WebhookHandlerContext {
  db: ReturnType<typeof getDbClient>;
  log: FastifyInstance['log'];
  correlationId: string;
}

/**
 * Handle invoice.paid event
 * Mark subscription as active if it was in trial or past_due
 */
async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  ctx: WebhookHandlerContext
): Promise<void> {
  const { db, log, correlationId } = ctx;

  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    log.warn({ invoiceId: invoice.id, correlationId }, 'Invoice has no subscription ID');
    return;
  }

  // Find local subscription by provider ID
  const subscription = await db.getSubscriptionByProviderId(subscriptionId);
  if (!subscription) {
    log.warn(
      { providerSubscriptionId: subscriptionId, correlationId },
      'Subscription not found for invoice.paid event'
    );
    return;
  }

  // Get billing account for metrics
  const billingAccount = await db.getBillingAccount(subscription.billingAccountId);
  const tenantType = billingAccount?.accountType ?? 'UNKNOWN';

  // Record metrics
  metrics.recordInvoicePaid(
    (invoice.currency ?? 'usd').toUpperCase(),
    tenantType,
    invoice.amount_paid
  );

  // Check if this was a recovery from PAST_DUE (dunning recovery)
  if (subscription.status === SubscriptionStatus.PAST_DUE) {
    await dunning.handlePaymentRecovered({
      subscriptionId: subscription.id,
      billingAccountId: subscription.billingAccountId,
      tenantId: billingAccount?.tenantId ?? '',
      tenantType,
      invoiceId: invoice.id,
      correlationId,
      log,
    });
    return;
  }

  // Update subscription status to active if not already
  if (subscription.status === SubscriptionStatus.IN_TRIAL) {
    await db.updateSubscription(subscription.id, {
      status: SubscriptionStatus.ACTIVE,
    });

    log.info(
      { subscriptionId: subscription.id, invoiceId: invoice.id, correlationId },
      'Subscription activated after invoice paid'
    );
  }

  // Log payment event
  await db.createPaymentEvent({
    billingAccountId: subscription.billingAccountId,
    eventType: 'invoice.paid',
    providerEventId: invoice.id,
    payload: {
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      correlationId,
    },
  });
}

/**
 * Handle invoice.payment_failed event
 * Mark subscription as past_due and start dunning process
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  ctx: WebhookHandlerContext
): Promise<void> {
  const { db, log, correlationId } = ctx;

  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    log.warn({ invoiceId: invoice.id, correlationId }, 'Invoice has no subscription ID');
    return;
  }

  // Find local subscription by provider ID
  const subscription = await db.getSubscriptionByProviderId(subscriptionId);
  if (!subscription) {
    log.warn(
      { providerSubscriptionId: subscriptionId, correlationId },
      'Subscription not found for invoice.payment_failed event'
    );
    return;
  }

  // Get billing account for metrics and dunning
  const billingAccount = await db.getBillingAccount(subscription.billingAccountId);
  const tenantType = billingAccount?.accountType ?? 'UNKNOWN';

  // Record metrics
  metrics.recordInvoiceFailed(
    (invoice.currency ?? 'usd').toUpperCase(),
    tenantType,
    invoice.amount_due
  );

  // Update subscription status to past_due
  await db.updateSubscription(subscription.id, {
    status: SubscriptionStatus.PAST_DUE,
  });

  log.warn(
    { subscriptionId: subscription.id, invoiceId: invoice.id, correlationId },
    'Subscription marked as past_due after payment failure'
  );

  // Start dunning process (Day 0)
  await dunning.handlePaymentFailure({
    subscriptionId: subscription.id,
    billingAccountId: subscription.billingAccountId,
    tenantId: billingAccount?.tenantId ?? '',
    tenantType,
    invoiceId: invoice.id,
    correlationId,
    log,
  });

  // Log payment event
  await db.createPaymentEvent({
    billingAccountId: subscription.billingAccountId,
    eventType: 'invoice.payment_failed',
    providerEventId: invoice.id,
    payload: {
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      amountDue: invoice.amount_due,
      attemptCount: invoice.attempt_count,
      nextPaymentAttempt: invoice.next_payment_attempt,
      correlationId,
    },
  });
}

/**
 * Handle customer.subscription.deleted event
 * Mark subscription as canceled
 */
async function handleSubscriptionDeleted(
  stripeSubscription: Stripe.Subscription,
  ctx: WebhookHandlerContext
): Promise<void> {
  const { db, log, correlationId } = ctx;

  // Find local subscription by provider ID
  const subscription = await db.getSubscriptionByProviderId(stripeSubscription.id);
  if (!subscription) {
    log.warn(
      { providerSubscriptionId: stripeSubscription.id, correlationId },
      'Subscription not found for customer.subscription.deleted event'
    );
    return;
  }

  // Get billing account for entitlements sync
  const billingAccount = await db.getBillingAccount(subscription.billingAccountId);

  // Update subscription status to canceled
  const now = new Date();
  await db.updateSubscription(subscription.id, {
    status: SubscriptionStatus.CANCELED,
    endedAt: now,
    canceledAt: subscription.canceledAt ?? now,
  });

  log.info(
    { subscriptionId: subscription.id, correlationId },
    'Subscription canceled from Stripe webhook'
  );

  // Trigger entitlements recalculation
  if (billingAccount?.tenantId) {
    await webhookSafety.entitlementsSync.triggerRecalculation(
      billingAccount.tenantId,
      billingAccount.accountType ?? 'PARENT',
      correlationId
    );
  }

  // Log payment event
  await db.createPaymentEvent({
    billingAccountId: subscription.billingAccountId,
    eventType: 'customer.subscription.deleted',
    providerEventId: stripeSubscription.id,
    payload: {
      subscriptionId: subscription.id,
      canceledAt: stripeSubscription.canceled_at,
      endedAt: stripeSubscription.ended_at,
      correlationId,
    },
  });
}

/**
 * Handle customer.subscription.updated event
 * Sync status changes from Stripe
 */
async function handleSubscriptionUpdated(
  stripeSubscription: Stripe.Subscription,
  ctx: WebhookHandlerContext
): Promise<void> {
  const { db, log, correlationId } = ctx;

  // Find local subscription by provider ID
  const subscription = await db.getSubscriptionByProviderId(stripeSubscription.id);
  if (!subscription) {
    log.warn(
      { providerSubscriptionId: stripeSubscription.id, correlationId },
      'Subscription not found for customer.subscription.updated event'
    );
    return;
  }

  // Map Stripe status to our status
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    trialing: SubscriptionStatus.IN_TRIAL,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELED,
    unpaid: SubscriptionStatus.PAST_DUE,
    incomplete: SubscriptionStatus.ACTIVE, // Will complete or fail
    incomplete_expired: SubscriptionStatus.CANCELED,
    paused: SubscriptionStatus.PAUSED,
  };

  const newStatus = statusMap[stripeSubscription.status] ?? subscription.status;
  const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
  const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

  // Update subscription
  await db.updateSubscription(subscription.id, {
    status: newStatus,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
  });

  log.info(
    {
      subscriptionId: subscription.id,
      status: newStatus,
      stripeStatus: stripeSubscription.status,
      correlationId,
    },
    'Subscription updated from Stripe webhook'
  );
}

/**
 * Handle checkout.session.completed event
 * For subscription checkout sessions, activate the subscription
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  ctx: WebhookHandlerContext
): Promise<void> {
  const { db, log, correlationId } = ctx;

  if (session.mode !== 'subscription') {
    log.debug({ sessionId: session.id, correlationId }, 'Ignoring non-subscription checkout');
    return;
  }

  const subscriptionId = session.subscription;
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    log.warn({ sessionId: session.id, correlationId }, 'Checkout session has no subscription ID');
    return;
  }

  // Find local subscription by provider ID
  const subscription = await db.getSubscriptionByProviderId(subscriptionId);
  if (!subscription) {
    log.warn(
      { providerSubscriptionId: subscriptionId, correlationId },
      'Subscription not found for checkout.session.completed event'
    );
    return;
  }

  // Record subscription created metric
  const billingAccount = await db.getBillingAccount(subscription.billingAccountId);
  const tenantType = billingAccount?.accountType ?? 'UNKNOWN';
  metrics.recordSubscriptionCreated(subscription.planId, tenantType);

  log.info(
    { subscriptionId: subscription.id, sessionId: session.id, correlationId },
    'Checkout completed for subscription'
  );

  // Trigger entitlements recalculation
  if (billingAccount?.tenantId) {
    await webhookSafety.entitlementsSync.triggerRecalculation(
      billingAccount.tenantId,
      tenantType,
      correlationId
    );
  }

  // Log payment event
  await db.createPaymentEvent({
    billingAccountId: subscription.billingAccountId,
    eventType: 'checkout.session.completed',
    providerEventId: session.id,
    payload: {
      sessionId: session.id,
      subscriptionId: subscription.id,
      customerId: session.customer,
      correlationId,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK ROUTE
// ══════════════════════════════════════════════════════════════════════════════

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  const db = getDbClient();
  const eventStore = webhookSafety.createWebhookEventStore(db);

  // Important: We need raw body for Stripe signature verification
  // This is configured at the app level with rawBody plugin
  fastify.post(
    '/payments/webhook/stripe',
    {
      config: {
        rawBody: true,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['stripe-signature'];
      const correlationId = (request.headers['x-request-id'] as string) ?? crypto.randomUUID();

      if (!signature || typeof signature !== 'string') {
        fastify.log.warn({ correlationId }, 'Missing Stripe signature header');
        metrics.recordWebhookFailure('unknown', 'missing_signature');
        return reply.status(400).send({ error: 'Missing stripe-signature header' });
      }

      // Get raw body - need to access via request.rawBody (configured via plugin)
      const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        fastify.log.error({ correlationId }, 'Raw body not available for webhook');
        metrics.recordWebhookFailure('unknown', 'no_raw_body');
        return reply.status(500).send({ error: 'Raw body not available' });
      }

      // Verify webhook signature and construct event
      let event: Stripe.Event;
      try {
        event = stripeClient.constructWebhookEvent(rawBody, signature);
      } catch (err) {
        fastify.log.warn({ err, correlationId }, 'Invalid Stripe webhook signature');
        metrics.recordWebhookFailure('unknown', 'invalid_signature');
        return reply.status(400).send({ error: 'Invalid signature' });
      }

      // Record webhook received metric
      metrics.recordWebhookReceived(event.type);

      // Check for duplicate event (idempotency)
      const isDuplicate = await eventStore.isEventProcessed(event.id);
      if (isDuplicate) {
        fastify.log.info(
          { eventId: event.id, eventType: event.type, correlationId },
          'Duplicate webhook event, skipping'
        );
        return reply.status(200).send({ received: true, duplicate: true });
      }

      // Process the event
      const ctx: WebhookHandlerContext = { db, log: fastify.log, correlationId };

      try {
        fastify.log.info(
          { eventId: event.id, eventType: event.type, correlationId },
          'Processing Stripe webhook event'
        );

        switch (event.type) {
          case 'invoice.paid':
            await handleInvoicePaid(event.data.object, ctx);
            break;

          case 'invoice.payment_failed':
            await handleInvoicePaymentFailed(event.data.object, ctx);
            break;

          case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object, ctx);
            break;

          case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object, ctx);
            break;

          case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object, ctx);
            break;

          default:
            // Log but don't fail on unknown events
            fastify.log.debug(
              { eventType: event.type, correlationId },
              'Unhandled Stripe event type'
            );
        }

        // Mark event as processed
        await eventStore.markEventProcessed(event.id, event.type);

        // Record successful processing
        metrics.recordWebhookProcessed(event.type);

        // Always return 200 to acknowledge receipt
        return reply.status(200).send({ received: true });
      } catch (err) {
        fastify.log.error(
          { err, eventId: event.id, eventType: event.type, correlationId },
          'Error processing webhook'
        );
        metrics.recordWebhookFailure(event.type, 'processing_error');
        // Still return 200 to prevent Stripe from retrying
        // We log the error for investigation
        return reply.status(200).send({ received: true, error: 'Processing error logged' });
      }
    }
  );
}
