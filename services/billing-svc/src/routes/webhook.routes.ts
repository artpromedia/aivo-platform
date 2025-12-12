/**
 * Webhook Routes - Stripe Payment Provider Webhooks
 *
 * Handles incoming webhook events from Stripe for:
 * - invoice.paid - Mark invoice as paid, update subscription status
 * - invoice.payment_failed - Mark invoice as failed, update subscription to past_due
 * - customer.subscription.updated - Sync subscription status changes
 * - customer.subscription.deleted - Handle subscription cancellation
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import * as crypto from 'crypto';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { config } from '../config.js';
import { prisma } from '../prisma.js';

// Note: Stripe types are defined inline to avoid requiring the stripe package
// In production, install stripe and use proper types

// ============================================================================
// Types
// ============================================================================

interface StripeWebhookBody {
  id: string;
  type: string;
  data: {
    object: StripeInvoice | StripeSubscription;
  };
}

interface StripeInvoice {
  id: string;
  object: 'invoice';
  amount_paid: number;
  customer: string;
  subscription: string | { id: string } | null;
  status: string;
  payment_intent: string | null;
  charge: string | null;
  status_transitions?: {
    paid_at: number | null;
  };
  last_finalization_error?: {
    message: string;
  } | null;
}

interface StripeSubscription {
  id: string;
  object: 'subscription';
  customer: string;
  status:
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'incomplete'
    | 'incomplete_expired'
    | 'paused';
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  ended_at: number | null;
}

// Enum values (matching Prisma schema)
const PaymentProviderEnum = {
  STRIPE: 'STRIPE',
  MANUAL_INVOICE: 'MANUAL_INVOICE',
  TEST_FAKE: 'TEST_FAKE',
} as const;

const InvoiceStatusEnum = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  PAID: 'PAID',
  VOID: 'VOID',
  UNCOLLECTIBLE: 'UNCOLLECTIBLE',
} as const;

const SubscriptionStatusEnum = {
  IN_TRIAL: 'IN_TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Store a payment event for auditing and idempotency
 */
async function storePaymentEvent(
  eventId: string,
  eventType: string,
  payload: unknown,
  billingAccountId?: string,
  subscriptionId?: string,
  invoiceId?: string
) {
  return prisma.paymentEvent.upsert({
    where: { providerEventId: eventId },
    create: {
      provider: PaymentProviderEnum.STRIPE,
      eventType,
      providerEventId: eventId,
      billingAccountId: billingAccountId ?? null,
      subscriptionId: subscriptionId ?? null,
      invoiceId: invoiceId ?? null,
      payload: payload as object,
      processedAt: new Date(),
    },
    update: {
      processedAt: new Date(),
    },
  });
}

/**
 * Mark a payment event as failed
 */
async function markEventFailed(eventId: string, error: string) {
  await prisma.paymentEvent.update({
    where: { providerEventId: eventId },
    data: { error, processedAt: new Date() },
  });
}

/**
 * Find subscription by Stripe subscription ID
 */
async function findSubscriptionByProviderId(providerSubscriptionId: string) {
  return prisma.subscription.findFirst({
    where: { providerSubscriptionId },
    include: { billingAccount: true },
  });
}

/**
 * Find invoice by Stripe invoice ID
 */
async function findInvoiceByProviderId(providerInvoiceId: string) {
  return prisma.invoice.findFirst({
    where: { providerInvoiceId },
    include: { billingAccount: true },
  });
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle invoice.paid event
 * Updates invoice status to PAID and ensures subscription is ACTIVE
 */
async function handleInvoicePaid(
  invoice: StripeInvoice,
  eventId: string,
  logger: FastifyInstance['log']
) {
  logger.info({ invoiceId: invoice.id }, 'Processing invoice.paid event');

  // Find our invoice record
  const ourInvoice = await findInvoiceByProviderId(invoice.id);

  if (ourInvoice) {
    // Update invoice status
    await prisma.invoice.update({
      where: { id: ourInvoice.id },
      data: {
        status: InvoiceStatusEnum.PAID,
        amountPaidCents: invoice.amount_paid,
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date(),
        metadataJson: {
          ...(ourInvoice.metadataJson ? (ourInvoice.metadataJson as object) : {}),
          stripePaymentIntent: invoice.payment_intent,
          stripeChargeId: invoice.charge,
        },
      },
    });

    logger.info({ invoiceId: ourInvoice.id }, 'Invoice marked as paid');
  }

  // If this invoice is tied to a subscription, ensure it's active
  if (invoice.subscription) {
    const subscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;

    const subscription = await findSubscriptionByProviderId(subscriptionId);

    if (subscription && subscription.status !== SubscriptionStatusEnum.ACTIVE) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatusEnum.ACTIVE },
      });
      logger.info({ subscriptionId: subscription.id }, 'Subscription activated after payment');
    }
  }

  // Store event for audit
  await storePaymentEvent(
    eventId,
    'invoice.paid',
    invoice,
    ourInvoice?.billingAccountId,
    undefined,
    ourInvoice?.id
  );
}

/**
 * Handle invoice.payment_failed event
 * Updates invoice and subscription status to reflect payment failure
 */
async function handleInvoicePaymentFailed(
  invoice: StripeInvoice,
  eventId: string,
  logger: FastifyInstance['log']
) {
  logger.warn({ invoiceId: invoice.id }, 'Processing invoice.payment_failed event');

  // Find our invoice record
  const ourInvoice = await findInvoiceByProviderId(invoice.id);

  if (ourInvoice) {
    // Keep invoice as OPEN but add failure metadata
    await prisma.invoice.update({
      where: { id: ourInvoice.id },
      data: {
        status: InvoiceStatusEnum.OPEN, // Still open, awaiting retry/resolution
        metadataJson: {
          ...(ourInvoice.metadataJson ? (ourInvoice.metadataJson as object) : {}),
          lastPaymentFailure: new Date().toISOString(),
          failureReason: invoice.last_finalization_error?.message || 'Payment failed',
        },
      },
    });

    logger.info({ invoiceId: ourInvoice.id }, 'Invoice payment failure recorded');
  }

  // Update subscription to PAST_DUE
  if (invoice.subscription) {
    const subscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;

    const subscription = await findSubscriptionByProviderId(subscriptionId);

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatusEnum.PAST_DUE },
      });
      logger.warn({ subscriptionId: subscription.id }, 'Subscription marked as past due');
    }
  }

  // Store event for audit
  await storePaymentEvent(
    eventId,
    'invoice.payment_failed',
    invoice,
    ourInvoice?.billingAccountId,
    undefined,
    ourInvoice?.id
  );
}

/**
 * Handle customer.subscription.updated event
 * Syncs subscription status changes from Stripe
 */
async function handleSubscriptionUpdated(
  stripeSubscription: StripeSubscription,
  eventId: string,
  logger: FastifyInstance['log']
) {
  logger.info({ subscriptionId: stripeSubscription.id }, 'Processing subscription.updated event');

  const subscription = await findSubscriptionByProviderId(stripeSubscription.id);

  if (!subscription) {
    logger.warn(
      { stripeSubscriptionId: stripeSubscription.id },
      'Subscription not found in database'
    );
    await storePaymentEvent(eventId, 'customer.subscription.updated', stripeSubscription);
    return;
  }

  // Map Stripe status to our status
  type StripeSubStatus = StripeSubscription['status'];
  const statusMap: Record<StripeSubStatus, string> = {
    active: SubscriptionStatusEnum.ACTIVE,
    trialing: SubscriptionStatusEnum.IN_TRIAL,
    past_due: SubscriptionStatusEnum.PAST_DUE,
    canceled: SubscriptionStatusEnum.CANCELED,
    unpaid: SubscriptionStatusEnum.PAST_DUE,
    incomplete: SubscriptionStatusEnum.IN_TRIAL,
    incomplete_expired: SubscriptionStatusEnum.EXPIRED,
    paused: SubscriptionStatusEnum.CANCELED, // Map paused to canceled
  };

  const newStatus = statusMap[stripeSubscription.status] || SubscriptionStatusEnum.ACTIVE;

  // Update subscription
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      // Cast to any since we're using inline enum values that match Prisma's enum
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: newStatus as any,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : null,
      endedAt: stripeSubscription.ended_at ? new Date(stripeSubscription.ended_at * 1000) : null,
    },
  });

  logger.info(
    { subscriptionId: subscription.id, newStatus },
    'Subscription status synced from Stripe'
  );

  // Store event for audit
  await storePaymentEvent(
    eventId,
    'customer.subscription.updated',
    stripeSubscription,
    subscription.billingAccountId,
    subscription.id
  );
}

/**
 * Handle customer.subscription.deleted event
 * Marks subscription as canceled/expired
 */
async function handleSubscriptionDeleted(
  stripeSubscription: StripeSubscription,
  eventId: string,
  logger: FastifyInstance['log']
) {
  logger.info({ subscriptionId: stripeSubscription.id }, 'Processing subscription.deleted event');

  const subscription = await findSubscriptionByProviderId(stripeSubscription.id);

  if (!subscription) {
    logger.warn(
      { stripeSubscriptionId: stripeSubscription.id },
      'Subscription not found in database'
    );
    await storePaymentEvent(eventId, 'customer.subscription.deleted', stripeSubscription);
    return;
  }

  // Mark as canceled with end date
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatusEnum.CANCELED,
      canceledAt: new Date(),
      endedAt: new Date(),
    },
  });

  logger.info({ subscriptionId: subscription.id }, 'Subscription marked as deleted/canceled');

  // Store event for audit
  await storePaymentEvent(
    eventId,
    'customer.subscription.deleted',
    stripeSubscription,
    subscription.billingAccountId,
    subscription.id
  );
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * Verify Stripe webhook signature using HMAC
 */
function verifyStripeSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): { valid: boolean; timestamp: number } {
  // Parse the signature header
  const elements = signature.split(',');
  const signatureMap: Record<string, string> = {};
  for (const element of elements) {
    const [key, value] = element.split('=');
    if (key && value) signatureMap[key] = value;
  }

  const timestamp = parseInt(signatureMap.t || '0', 10);
  const expectedSignature = signatureMap.v1;

  if (!timestamp || !expectedSignature) {
    return { valid: false, timestamp: 0 };
  }

  // Compute expected signature
  const payloadString = typeof payload === 'string' ? payload : payload.toString();
  const signedPayload = `${timestamp}.${payloadString}`;
  const computedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  return {
    valid: crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(computedSignature)),
    timestamp,
  };
}

/**
 * POST /webhooks/stripe
 *
 * Main Stripe webhook endpoint. Verifies signature and routes to appropriate handler.
 */
async function handleStripeWebhook(
  request: FastifyRequest<{ Body: StripeWebhookBody }>,
  reply: FastifyReply
) {
  const logger = request.log;
  const sig = request.headers['stripe-signature'] as string | undefined;

  if (!sig) {
    logger.warn('Missing stripe-signature header');
    return reply.status(400).send({ error: 'Missing stripe-signature header' });
  }

  // Get raw body for signature verification
  const rawBody = (request as unknown as { rawBody: string | Buffer }).rawBody;

  // Verify webhook signature
  const verification = verifyStripeSignature(rawBody, sig, config.stripe.webhookSecret);

  if (!verification.valid) {
    logger.error('Webhook signature verification failed');
    return reply.status(400).send({ error: 'Invalid signature' });
  }

  // Check timestamp is within tolerance (5 minutes)
  const tolerance = 5 * 60; // 5 minutes in seconds
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - verification.timestamp) > tolerance) {
    logger.error({ timestamp: verification.timestamp }, 'Webhook timestamp outside tolerance');
    return reply.status(400).send({ error: 'Timestamp outside tolerance' });
  }

  const body = request.body;
  const eventId = body.id;
  const eventType = body.type;

  // Check for duplicate event (idempotency)
  const existingEvent = await prisma.paymentEvent.findUnique({
    where: { providerEventId: eventId },
  });

  if (existingEvent?.processedAt) {
    logger.info({ eventId }, 'Duplicate event, skipping');
    return reply.status(200).send({ received: true, duplicate: true });
  }

  try {
    // Route to appropriate handler
    switch (eventType) {
      case 'invoice.paid':
        await handleInvoicePaid(body.data.object as StripeInvoice, eventId, logger);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(body.data.object as StripeInvoice, eventId, logger);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(body.data.object as StripeSubscription, eventId, logger);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(body.data.object as StripeSubscription, eventId, logger);
        break;

      default:
        // Log unhandled events for visibility
        logger.debug({ eventType }, 'Unhandled webhook event type');
        await storePaymentEvent(eventId, eventType, body.data.object);
    }

    return reply.status(200).send({ received: true });
  } catch (err) {
    const error = err as Error;
    logger.error({ error: error.message, eventId }, 'Error processing webhook');
    await markEventFailed(eventId, error.message);
    // Return 200 to prevent Stripe from retrying (we logged the error)
    return reply.status(200).send({ received: true, error: error.message });
  }
}

// ============================================================================
// Plugin Registration
// ============================================================================

export async function webhookRoutes(fastify: FastifyInstance) {
  // Configure raw body parsing for Stripe signature verification
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    try {
      // Store raw body for signature verification
      (_req as unknown as { rawBody: Buffer }).rawBody = body as Buffer;
      const json = JSON.parse(body.toString()) as StripeWebhookBody;
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // POST /webhooks/stripe - Main Stripe webhook endpoint
  fastify.post<{ Body: StripeWebhookBody }>('/stripe', handleStripeWebhook);
}
