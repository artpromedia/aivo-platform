/**
 * Stripe Webhook Handler
 *
 * Handles incoming Stripe webhook events for:
 * - invoice.paid / invoice.payment_failed
 * - customer.subscription.deleted / updated
 * - payment_intent.succeeded / failed
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type Stripe from 'stripe';

import { getDbClient } from '../db.js';
import * as stripeClient from '../stripe.js';
import { SubscriptionStatus } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

interface WebhookHandlerContext {
  db: ReturnType<typeof getDbClient>;
  log: FastifyInstance['log'];
}

/**
 * Handle invoice.paid event
 * Mark subscription as active if it was in trial or past_due
 */
async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  ctx: WebhookHandlerContext
): Promise<void> {
  const { db, log } = ctx;

  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    log.warn({ invoiceId: invoice.id }, 'Invoice has no subscription ID');
    return;
  }

  // Find local subscription by provider ID
  const subscription = await db.getSubscriptionByProviderId(subscriptionId);
  if (!subscription) {
    log.warn(
      { providerSubscriptionId: subscriptionId },
      'Subscription not found for invoice.paid event'
    );
    return;
  }

  // Update subscription status to active if not already
  if (
    subscription.status === SubscriptionStatus.IN_TRIAL ||
    subscription.status === SubscriptionStatus.PAST_DUE
  ) {
    await db.updateSubscription(subscription.id, {
      status: SubscriptionStatus.ACTIVE,
    });

    log.info(
      { subscriptionId: subscription.id, invoiceId: invoice.id },
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
    },
  });
}

/**
 * Handle invoice.payment_failed event
 * Mark subscription as past_due
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  ctx: WebhookHandlerContext
): Promise<void> {
  const { db, log } = ctx;

  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    log.warn({ invoiceId: invoice.id }, 'Invoice has no subscription ID');
    return;
  }

  // Find local subscription by provider ID
  const subscription = await db.getSubscriptionByProviderId(subscriptionId);
  if (!subscription) {
    log.warn(
      { providerSubscriptionId: subscriptionId },
      'Subscription not found for invoice.payment_failed event'
    );
    return;
  }

  // Update subscription status to past_due
  await db.updateSubscription(subscription.id, {
    status: SubscriptionStatus.PAST_DUE,
  });

  log.warn(
    { subscriptionId: subscription.id, invoiceId: invoice.id },
    'Subscription marked as past_due after payment failure'
  );

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
  const { db, log } = ctx;

  // Find local subscription by provider ID
  const subscription = await db.getSubscriptionByProviderId(stripeSubscription.id);
  if (!subscription) {
    log.warn(
      { providerSubscriptionId: stripeSubscription.id },
      'Subscription not found for customer.subscription.deleted event'
    );
    return;
  }

  // Update subscription status to canceled
  const now = new Date();
  await db.updateSubscription(subscription.id, {
    status: SubscriptionStatus.CANCELED,
    endedAt: now,
    canceledAt: subscription.canceledAt ?? now,
  });

  log.info(
    { subscriptionId: subscription.id },
    'Subscription canceled from Stripe webhook'
  );

  // Log payment event
  await db.createPaymentEvent({
    billingAccountId: subscription.billingAccountId,
    eventType: 'customer.subscription.deleted',
    providerEventId: stripeSubscription.id,
    payload: {
      subscriptionId: subscription.id,
      canceledAt: stripeSubscription.canceled_at,
      endedAt: stripeSubscription.ended_at,
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
  const { db, log } = ctx;

  // Find local subscription by provider ID
  const subscription = await db.getSubscriptionByProviderId(stripeSubscription.id);
  if (!subscription) {
    log.warn(
      { providerSubscriptionId: stripeSubscription.id },
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
  const { db, log } = ctx;

  if (session.mode !== 'subscription') {
    log.debug({ sessionId: session.id }, 'Ignoring non-subscription checkout');
    return;
  }

  const subscriptionId = session.subscription;
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    log.warn({ sessionId: session.id }, 'Checkout session has no subscription ID');
    return;
  }

  // Find local subscription by provider ID
  const subscription = await db.getSubscriptionByProviderId(subscriptionId);
  if (!subscription) {
    log.warn(
      { providerSubscriptionId: subscriptionId },
      'Subscription not found for checkout.session.completed event'
    );
    return;
  }

  log.info(
    { subscriptionId: subscription.id, sessionId: session.id },
    'Checkout completed for subscription'
  );

  // Log payment event
  await db.createPaymentEvent({
    billingAccountId: subscription.billingAccountId,
    eventType: 'checkout.session.completed',
    providerEventId: session.id,
    payload: {
      sessionId: session.id,
      subscriptionId: subscription.id,
      customerId: session.customer,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK ROUTE
// ══════════════════════════════════════════════════════════════════════════════

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  const db = getDbClient();

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

      if (!signature || typeof signature !== 'string') {
        fastify.log.warn('Missing Stripe signature header');
        return reply.status(400).send({ error: 'Missing stripe-signature header' });
      }

      // Get raw body - need to access via request.rawBody (configured via plugin)
      const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        fastify.log.error('Raw body not available for webhook');
        return reply.status(500).send({ error: 'Raw body not available' });
      }

      // Verify webhook signature and construct event
      let event: Stripe.Event;
      try {
        event = stripeClient.constructWebhookEvent(rawBody, signature);
      } catch (err) {
        fastify.log.warn({ err }, 'Invalid Stripe webhook signature');
        return reply.status(400).send({ error: 'Invalid signature' });
      }

      // Process the event
      const ctx: WebhookHandlerContext = { db, log: fastify.log };

      try {
        switch (event.type) {
          case 'invoice.paid':
            await handleInvoicePaid(event.data.object as Stripe.Invoice, ctx);
            break;

          case 'invoice.payment_failed':
            await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, ctx);
            break;

          case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, ctx);
            break;

          case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, ctx);
            break;

          case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, ctx);
            break;

          default:
            // Log but don't fail on unknown events
            fastify.log.debug({ eventType: event.type }, 'Unhandled Stripe event type');
        }

        // Always return 200 to acknowledge receipt
        return reply.status(200).send({ received: true });
      } catch (err) {
        fastify.log.error({ err, eventType: event.type }, 'Error processing webhook');
        // Still return 200 to prevent Stripe from retrying
        // We log the error for investigation
        return reply.status(200).send({ received: true, error: 'Processing error logged' });
      }
    }
  );
}
