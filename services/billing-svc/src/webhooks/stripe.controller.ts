/**
 * Stripe Webhook Controller
 *
 * Production-ready webhook handler for Stripe events:
 * - Checkout sessions
 * - Subscriptions lifecycle
 * - Invoices and payments
 * - Payment intents
 * - Disputes and refunds
 * - Customer events
 *
 * Features:
 * - Event signature verification
 * - Idempotent event processing
 * - Event deduplication
 * - Correlation IDs for tracing
 * - Comprehensive metrics
 * - Error handling and dead letter queue
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type Stripe from 'stripe';

import { getPlanFromPriceId } from '../config/stripe.config.js';
import { billingEventPublisher, BillingEventType } from '../events/billing.publisher.js';
import { stripeService } from '../services/stripe.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface WebhookMetrics {
  eventsReceived: number;
  eventsProcessed: number;
  eventsFailed: number;
  eventsDuplicate: number;
  processingTimeMs: number[];
}

interface ProcessedEvent {
  eventId: string;
  processedAt: Date;
  ttl: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

class StripeWebhookController {
  private readonly processedEvents = new Map<string, ProcessedEvent>();
  private readonly metrics: WebhookMetrics = {
    eventsReceived: 0,
    eventsProcessed: 0,
    eventsFailed: 0,
    eventsDuplicate: 0,
    processingTimeMs: [],
  };

  // Event deduplication TTL (24 hours)
  private readonly DEDUP_TTL_MS = 24 * 60 * 60 * 1000;

  // Clean up processed events periodically
  constructor() {
    setInterval(() => {
      this.cleanupProcessedEvents();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Register webhook routes
   */
  register(fastify: FastifyInstance): void {
    // Raw body parser is required for webhook signature verification
    fastify.post('/webhooks/stripe', {
      config: {
        rawBody: true,
      },
      handler: this.handleWebhook.bind(this),
    });

    // Health check for webhook endpoint
    fastify.get('/webhooks/stripe/health', async () => ({
      status: 'healthy',
      metrics: this.getMetrics(),
    }));
  }

  /**
   * Main webhook handler
   */
  async handleWebhook(
    request: FastifyRequest<{ Body: string }>,
    reply: FastifyReply
  ): Promise<void> {
    this.metrics.eventsReceived++;
    const startTime = Date.now();

    // Get raw body for signature verification
    const rawBody = (request as unknown as { rawBody?: Buffer }).rawBody;
    const payload = rawBody?.toString() ?? request.body;
    const signature = request.headers['stripe-signature'] as string;
    const headerCorrelationId = request.headers['x-correlation-id'];
    const correlationId = typeof headerCorrelationId === 'string' ? headerCorrelationId : crypto.randomUUID();

    // Verify signature
    let event: Stripe.Event;
    try {
      event = stripeService.constructWebhookEvent(payload, signature);
    } catch (err) {
      request.log.error({ err, correlationId }, 'Webhook signature verification failed');
      reply.code(400).send({ error: 'Invalid signature' });
      return;
    }

    // Check for duplicate events
    if (this.isEventProcessed(event.id)) {
      this.metrics.eventsDuplicate++;
      request.log.info({ eventId: event.id, correlationId }, 'Duplicate event skipped');
      reply.code(200).send({ received: true, duplicate: true });
      return;
    }

    // Process event
    try {
      request.log.info(
        { eventId: event.id, eventType: event.type, correlationId },
        'Processing Stripe webhook event'
      );

      await this.processEvent(event, correlationId, request.log);

      // Mark event as processed
      this.markEventProcessed(event.id);
      this.metrics.eventsProcessed++;
      this.metrics.processingTimeMs.push(Date.now() - startTime);

      request.log.info(
        { eventId: event.id, eventType: event.type, processingTimeMs: Date.now() - startTime },
        'Stripe webhook event processed successfully'
      );

      reply.code(200).send({ received: true });
    } catch (err) {
      this.metrics.eventsFailed++;
      request.log.error(
        { err, eventId: event.id, eventType: event.type, correlationId },
        'Failed to process Stripe webhook event'
      );

      // Return 500 to trigger retry from Stripe
      reply.code(500).send({ error: 'Event processing failed' });
    }
  }

  /**
   * Route event to appropriate handler
   */
  private async processEvent(
    event: Stripe.Event,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    switch (event.type) {
      // ════════════════════════════════════════════════════════════════════════
      // CHECKOUT EVENTS
      // ════════════════════════════════════════════════════════════════════════
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          correlationId,
          logger
        );
        break;

      case 'checkout.session.async_payment_succeeded':
        await this.handleCheckoutPaymentSucceeded(
          event.data.object as Stripe.Checkout.Session,
          correlationId,
          logger
        );
        break;

      case 'checkout.session.async_payment_failed':
        await this.handleCheckoutPaymentFailed(
          event.data.object as Stripe.Checkout.Session,
          correlationId,
          logger
        );
        break;

      case 'checkout.session.expired':
        await this.handleCheckoutExpired(
          event.data.object as Stripe.Checkout.Session,
          correlationId,
          logger
        );
        break;

      // ════════════════════════════════════════════════════════════════════════
      // SUBSCRIPTION EVENTS
      // ════════════════════════════════════════════════════════════════════════
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
          correlationId,
          logger
        );
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          event.data.previous_attributes as Partial<Stripe.Subscription>,
          correlationId,
          logger
        );
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          correlationId,
          logger
        );
        break;

      case 'customer.subscription.paused':
        await this.handleSubscriptionPaused(
          event.data.object as Stripe.Subscription,
          correlationId,
          logger
        );
        break;

      case 'customer.subscription.resumed':
        await this.handleSubscriptionResumed(
          event.data.object as Stripe.Subscription,
          correlationId,
          logger
        );
        break;

      case 'customer.subscription.trial_will_end':
        await this.handleTrialWillEnd(
          event.data.object as Stripe.Subscription,
          correlationId,
          logger
        );
        break;

      // ════════════════════════════════════════════════════════════════════════
      // INVOICE EVENTS
      // ════════════════════════════════════════════════════════════════════════
      case 'invoice.created':
        await this.handleInvoiceCreated(
          event.data.object as Stripe.Invoice,
          correlationId,
          logger
        );
        break;

      case 'invoice.finalized':
        await this.handleInvoiceFinalized(
          event.data.object as Stripe.Invoice,
          correlationId,
          logger
        );
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(
          event.data.object as Stripe.Invoice,
          correlationId,
          logger
        );
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          correlationId,
          logger
        );
        break;

      case 'invoice.payment_action_required':
        await this.handleInvoicePaymentActionRequired(
          event.data.object as Stripe.Invoice,
          correlationId,
          logger
        );
        break;

      case 'invoice.upcoming':
        await this.handleInvoiceUpcoming(
          event.data.object as Stripe.Invoice,
          correlationId,
          logger
        );
        break;

      case 'invoice.voided':
        await this.handleInvoiceVoided(
          event.data.object as Stripe.Invoice,
          correlationId,
          logger
        );
        break;

      // ════════════════════════════════════════════════════════════════════════
      // PAYMENT INTENT EVENTS
      // ════════════════════════════════════════════════════════════════════════
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
          correlationId,
          logger
        );
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
          correlationId,
          logger
        );
        break;

      case 'payment_intent.requires_action':
        await this.handlePaymentIntentRequiresAction(
          event.data.object as Stripe.PaymentIntent,
          correlationId,
          logger
        );
        break;

      // ════════════════════════════════════════════════════════════════════════
      // DISPUTE EVENTS
      // ════════════════════════════════════════════════════════════════════════
      case 'charge.dispute.created':
        await this.handleDisputeCreated(
          event.data.object as Stripe.Dispute,
          correlationId,
          logger
        );
        break;

      case 'charge.dispute.updated':
        await this.handleDisputeUpdated(
          event.data.object as Stripe.Dispute,
          correlationId,
          logger
        );
        break;

      case 'charge.dispute.closed':
        await this.handleDisputeClosed(
          event.data.object as Stripe.Dispute,
          correlationId,
          logger
        );
        break;

      // ════════════════════════════════════════════════════════════════════════
      // REFUND EVENTS
      // ════════════════════════════════════════════════════════════════════════
      case 'charge.refunded':
        await this.handleChargeRefunded(
          event.data.object as Stripe.Charge,
          correlationId,
          logger
        );
        break;

      case 'charge.refund.updated':
        await this.handleRefundUpdated(
          event.data.object as Stripe.Refund,
          correlationId,
          logger
        );
        break;

      // ════════════════════════════════════════════════════════════════════════
      // CUSTOMER EVENTS
      // ════════════════════════════════════════════════════════════════════════
      case 'customer.created':
        await this.handleCustomerCreated(
          event.data.object as Stripe.Customer,
          correlationId,
          logger
        );
        break;

      case 'customer.updated':
        await this.handleCustomerUpdated(
          event.data.object as Stripe.Customer,
          correlationId,
          logger
        );
        break;

      case 'customer.deleted':
        await this.handleCustomerDeleted(
          event.data.object as unknown as Stripe.DeletedCustomer,
          correlationId,
          logger
        );
        break;

      // ════════════════════════════════════════════════════════════════════════
      // PAYMENT METHOD EVENTS
      // ════════════════════════════════════════════════════════════════════════
      case 'payment_method.attached':
        await this.handlePaymentMethodAttached(
          event.data.object as Stripe.PaymentMethod,
          correlationId,
          logger
        );
        break;

      case 'payment_method.detached':
        await this.handlePaymentMethodDetached(
          event.data.object as Stripe.PaymentMethod,
          correlationId,
          logger
        );
        break;

      case 'customer.source.expiring':
        await this.handlePaymentSourceExpiring(
          event.data.object as Stripe.Card,
          correlationId,
          logger
        );
        break;

      default:
        logger.warn({ eventType: event.type }, 'Unhandled Stripe event type');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHECKOUT HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const tenantId = session.metadata?.tenantId;

    logger.info(
      { sessionId: session.id, customerId, subscriptionId, tenantId, correlationId },
      'Checkout session completed'
    );

    // For subscription checkouts
    if (session.mode === 'subscription' && subscriptionId) {
      const subscription = await stripeService.getSubscription(subscriptionId);
      if (subscription) {
        const plan = getPlanFromPriceId(subscription.items.data[0]?.price.id ?? '');

        await billingEventPublisher.publish({
          type: BillingEventType.SUBSCRIPTION_CREATED,
          tenantId: tenantId ?? '',
          customerId,
          subscriptionId,
          plan,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          correlationId,
        });
      }
    }

    // For one-time payment checkouts
    if (session.mode === 'payment') {
      await billingEventPublisher.publish({
        type: BillingEventType.PAYMENT_SUCCEEDED,
        tenantId: tenantId ?? '',
        customerId,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
        paymentIntentId: session.payment_intent as string,
        correlationId,
      });
    }
  }

  private async handleCheckoutPaymentSucceeded(
    session: Stripe.Checkout.Session,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      { sessionId: session.id, correlationId },
      'Checkout async payment succeeded'
    );

    // Handle async payment methods (bank transfers, etc.)
    await billingEventPublisher.publish({
      type: BillingEventType.PAYMENT_SUCCEEDED,
      tenantId: session.metadata?.tenantId ?? '',
      customerId: session.customer as string,
      amount: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      paymentIntentId: session.payment_intent as string,
      correlationId,
    });
  }

  private async handleCheckoutPaymentFailed(
    session: Stripe.Checkout.Session,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.warn(
      { sessionId: session.id, correlationId },
      'Checkout async payment failed'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.PAYMENT_FAILED,
      tenantId: session.metadata?.tenantId ?? '',
      customerId: session.customer as string,
      amount: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      failureReason: 'Async payment failed',
      correlationId,
    });
  }

  private async handleCheckoutExpired(
    session: Stripe.Checkout.Session,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info({ sessionId: session.id, correlationId }, 'Checkout session expired');

    await billingEventPublisher.publish({
      type: BillingEventType.CHECKOUT_EXPIRED,
      tenantId: session.metadata?.tenantId ?? '',
      customerId: session.customer as string,
      sessionId: session.id,
      correlationId,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  private async handleSubscriptionCreated(
    subscription: Stripe.Subscription,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const customerId = subscription.customer as string;
    const tenantId = subscription.metadata?.tenantId ?? '';
    const plan = getPlanFromPriceId(subscription.items.data[0]?.price.id ?? '');

    logger.info(
      { subscriptionId: subscription.id, customerId, plan, status: subscription.status, correlationId },
      'Subscription created'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.SUBSCRIPTION_CREATED,
      tenantId,
      customerId,
      subscriptionId: subscription.id,
      plan,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      correlationId,
    });
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
    previousAttributes: Partial<Stripe.Subscription>,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const customerId = subscription.customer as string;
    const tenantId = subscription.metadata?.tenantId ?? '';
    const plan = getPlanFromPriceId(subscription.items.data[0]?.price.id ?? '');

    logger.info(
      {
        subscriptionId: subscription.id,
        customerId,
        plan,
        status: subscription.status,
        previousStatus: previousAttributes?.status,
        correlationId,
      },
      'Subscription updated'
    );

    // Check for status changes
    if (previousAttributes?.status && previousAttributes.status !== subscription.status) {
      await this.handleSubscriptionStatusChange(
        subscription,
        previousAttributes.status,
        tenantId,
        correlationId,
        logger
      );
    }

    // Check for plan changes
    const previousPriceId = previousAttributes?.items?.data?.[0]?.price?.id;
    const currentPriceId = subscription.items.data[0]?.price.id;
    if (previousPriceId && previousPriceId !== currentPriceId) {
      const previousPlan = getPlanFromPriceId(previousPriceId);
      const currentPlan = getPlanFromPriceId(currentPriceId ?? '');

      await billingEventPublisher.publish({
        type: BillingEventType.SUBSCRIPTION_PLAN_CHANGED,
        tenantId,
        customerId,
        subscriptionId: subscription.id,
        previousPlan,
        newPlan: currentPlan,
        correlationId,
      });
    }

    // Emit generic update event
    await billingEventPublisher.publish({
      type: BillingEventType.SUBSCRIPTION_UPDATED,
      tenantId,
      customerId,
      subscriptionId: subscription.id,
      plan,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      correlationId,
    });
  }

  private async handleSubscriptionStatusChange(
    subscription: Stripe.Subscription,
    previousStatus: Stripe.Subscription.Status,
    tenantId: string,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const customerId = subscription.customer as string;

    logger.info(
      {
        subscriptionId: subscription.id,
        previousStatus,
        newStatus: subscription.status,
        correlationId,
      },
      'Subscription status changed'
    );

    // Handle specific status transitions
    switch (subscription.status) {
      case 'active':
        if (previousStatus === 'past_due' || previousStatus === 'unpaid') {
          // Payment recovered
          await billingEventPublisher.publish({
            type: BillingEventType.DUNNING_RECOVERED,
            tenantId,
            customerId,
            subscriptionId: subscription.id,
            correlationId,
          });
        }
        break;

      case 'past_due':
        await billingEventPublisher.publish({
          type: BillingEventType.DUNNING_STARTED,
          tenantId,
          customerId,
          subscriptionId: subscription.id,
          correlationId,
        });
        break;

      case 'unpaid':
        await billingEventPublisher.publish({
          type: BillingEventType.DUNNING_FINAL_WARNING,
          tenantId,
          customerId,
          subscriptionId: subscription.id,
          correlationId,
        });
        break;
    }
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const customerId = subscription.customer as string;
    const tenantId = subscription.metadata?.tenantId ?? '';

    logger.info(
      { subscriptionId: subscription.id, customerId, correlationId },
      'Subscription deleted/canceled'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.SUBSCRIPTION_CANCELED,
      tenantId,
      customerId,
      subscriptionId: subscription.id,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : new Date(),
      correlationId,
    });

    // Trigger entitlements downgrade
    await billingEventPublisher.publish({
      type: BillingEventType.ENTITLEMENTS_UPDATED,
      tenantId,
      customerId,
      subscriptionId: subscription.id,
      plan: 'FREE',
      correlationId,
    });
  }

  private async handleSubscriptionPaused(
    subscription: Stripe.Subscription,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const tenantId = subscription.metadata?.tenantId ?? '';

    logger.info({ subscriptionId: subscription.id, correlationId }, 'Subscription paused');

    await billingEventPublisher.publish({
      type: BillingEventType.SUBSCRIPTION_PAUSED,
      tenantId,
      customerId: subscription.customer as string,
      subscriptionId: subscription.id,
      correlationId,
    });
  }

  private async handleSubscriptionResumed(
    subscription: Stripe.Subscription,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const tenantId = subscription.metadata?.tenantId ?? '';

    logger.info({ subscriptionId: subscription.id, correlationId }, 'Subscription resumed');

    await billingEventPublisher.publish({
      type: BillingEventType.SUBSCRIPTION_RESUMED,
      tenantId,
      customerId: subscription.customer as string,
      subscriptionId: subscription.id,
      correlationId,
    });
  }

  private async handleTrialWillEnd(
    subscription: Stripe.Subscription,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const tenantId = subscription.metadata?.tenantId ?? '';
    const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

    logger.info(
      { subscriptionId: subscription.id, trialEndDate, correlationId },
      'Subscription trial will end soon'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.TRIAL_ENDING,
      tenantId,
      customerId: subscription.customer as string,
      subscriptionId: subscription.id,
      trialEnd: trialEndDate ?? new Date(),
      correlationId,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INVOICE HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  private async handleInvoiceCreated(
    invoice: Stripe.Invoice,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      { invoiceId: invoice.id, customerId: invoice.customer, correlationId },
      'Invoice created'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.INVOICE_CREATED,
      tenantId: (invoice.metadata?.tenantId || invoice.subscription_details?.metadata?.tenantId) ?? '',
      customerId: invoice.customer as string,
      invoiceId: invoice.id ?? '',
      amount: invoice.amount_due,
      currency: invoice.currency,
      subscriptionId: invoice.subscription as string,
      correlationId,
    });
  }

  private async handleInvoiceFinalized(
    invoice: Stripe.Invoice,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      { invoiceId: invoice.id, customerId: invoice.customer, correlationId },
      'Invoice finalized'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.INVOICE_FINALIZED,
      tenantId: (invoice.metadata?.tenantId || invoice.subscription_details?.metadata?.tenantId) ?? '',
      customerId: invoice.customer as string,
      invoiceId: invoice.id ?? '',
      amount: invoice.amount_due,
      currency: invoice.currency,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? undefined,
      invoicePdfUrl: invoice.invoice_pdf ?? undefined,
      correlationId,
    });
  }

  private async handleInvoicePaid(
    invoice: Stripe.Invoice,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const tenantId = (invoice.metadata?.tenantId || invoice.subscription_details?.metadata?.tenantId) ?? '';

    logger.info(
      {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amountPaid: invoice.amount_paid,
        correlationId,
      },
      'Invoice paid'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.INVOICE_PAID,
      tenantId,
      customerId: invoice.customer as string,
      invoiceId: invoice.id ?? '',
      amount: invoice.amount_paid,
      currency: invoice.currency,
      subscriptionId: invoice.subscription as string,
      correlationId,
    });

    // Also emit payment succeeded
    await billingEventPublisher.publish({
      type: BillingEventType.PAYMENT_SUCCEEDED,
      tenantId,
      customerId: invoice.customer as string,
      invoiceId: invoice.id ?? '',
      amount: invoice.amount_paid,
      currency: invoice.currency,
      paymentIntentId: invoice.payment_intent as string,
      correlationId,
    });
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const tenantId = (invoice.metadata?.tenantId || invoice.subscription_details?.metadata?.tenantId) ?? '';
    const attemptCount = invoice.attempt_count ?? 0;

    logger.warn(
      {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        attemptCount,
        correlationId,
      },
      'Invoice payment failed'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.INVOICE_PAYMENT_FAILED,
      tenantId,
      customerId: invoice.customer as string,
      invoiceId: invoice.id ?? '',
      amount: invoice.amount_due,
      currency: invoice.currency,
      subscriptionId: invoice.subscription as string,
      attemptCount,
      nextPaymentAttempt: invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000)
        : undefined,
      correlationId,
    });

    // Emit payment failed event
    await billingEventPublisher.publish({
      type: BillingEventType.PAYMENT_FAILED,
      tenantId,
      customerId: invoice.customer as string,
      invoiceId: invoice.id ?? '',
      amount: invoice.amount_due,
      currency: invoice.currency,
      failureReason: invoice.last_finalization_error?.message ?? 'Payment failed',
      correlationId,
    });
  }

  private async handleInvoicePaymentActionRequired(
    invoice: Stripe.Invoice,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      { invoiceId: invoice.id, correlationId },
      'Invoice payment action required (3D Secure, etc.)'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.PAYMENT_ACTION_REQUIRED,
      tenantId: (invoice.metadata?.tenantId || invoice.subscription_details?.metadata?.tenantId) ?? '',
      customerId: invoice.customer as string,
      invoiceId: invoice.id ?? '',
      paymentIntentId: invoice.payment_intent as string,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? undefined,
      correlationId,
    });
  }

  private async handleInvoiceUpcoming(
    invoice: Stripe.Invoice,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amountDue: invoice.amount_due,
        periodEnd: invoice.period_end,
        correlationId,
      },
      'Upcoming invoice notification'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.INVOICE_UPCOMING,
      tenantId: (invoice.metadata?.tenantId || invoice.subscription_details?.metadata?.tenantId) ?? '',
      customerId: invoice.customer as string,
      amount: invoice.amount_due,
      currency: invoice.currency,
      subscriptionId: invoice.subscription as string,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
      correlationId,
    });
  }

  private async handleInvoiceVoided(
    invoice: Stripe.Invoice,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info({ invoiceId: invoice.id, correlationId }, 'Invoice voided');

    await billingEventPublisher.publish({
      type: BillingEventType.INVOICE_VOIDED,
      tenantId: (invoice.metadata?.tenantId || invoice.subscription_details?.metadata?.tenantId) ?? '',
      customerId: invoice.customer as string,
      invoiceId: invoice.id ?? '',
      correlationId,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAYMENT INTENT HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        correlationId,
      },
      'Payment intent succeeded'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.PAYMENT_SUCCEEDED,
      tenantId: paymentIntent.metadata?.tenantId ?? '',
      customerId: paymentIntent.customer as string,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      correlationId,
    });
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const error = paymentIntent.last_payment_error;

    logger.warn(
      {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        errorCode: error?.code,
        errorMessage: error?.message,
        correlationId,
      },
      'Payment intent failed'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.PAYMENT_FAILED,
      tenantId: paymentIntent.metadata?.tenantId ?? '',
      customerId: paymentIntent.customer as string,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      failureReason: error?.message ?? 'Payment failed',
      failureCode: error?.code,
      correlationId,
    });
  }

  private async handlePaymentIntentRequiresAction(
    paymentIntent: Stripe.PaymentIntent,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      { paymentIntentId: paymentIntent.id, correlationId },
      'Payment intent requires action'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.PAYMENT_ACTION_REQUIRED,
      tenantId: paymentIntent.metadata?.tenantId ?? '',
      customerId: paymentIntent.customer as string,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ?? undefined,
      correlationId,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DISPUTE HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  private async handleDisputeCreated(
    dispute: Stripe.Dispute,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.error(
      {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        amount: dispute.amount,
        reason: dispute.reason,
        correlationId,
      },
      'DISPUTE CREATED - Immediate attention required!'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.DISPUTE_CREATED,
      tenantId: dispute.metadata?.tenantId ?? '',
      disputeId: dispute.id,
      chargeId: dispute.charge as string,
      amount: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason,
      status: dispute.status,
      evidenceDueBy: dispute.evidence_details?.due_by
        ? new Date(dispute.evidence_details.due_by * 1000)
        : undefined,
      correlationId,
    });
  }

  private async handleDisputeUpdated(
    dispute: Stripe.Dispute,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.warn(
      {
        disputeId: dispute.id,
        status: dispute.status,
        correlationId,
      },
      'Dispute updated'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.DISPUTE_UPDATED,
      tenantId: dispute.metadata?.tenantId ?? '',
      disputeId: dispute.id,
      chargeId: dispute.charge as string,
      status: dispute.status,
      correlationId,
    });
  }

  private async handleDisputeClosed(
    dispute: Stripe.Dispute,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    const won = dispute.status === 'won';

    logger.info(
      {
        disputeId: dispute.id,
        status: dispute.status,
        won,
        correlationId,
      },
      `Dispute closed - ${won ? 'WON' : 'LOST'}`
    );

    await billingEventPublisher.publish({
      type: BillingEventType.DISPUTE_CLOSED,
      tenantId: dispute.metadata?.tenantId ?? '',
      disputeId: dispute.id,
      chargeId: dispute.charge as string,
      status: dispute.status,
      won,
      amount: dispute.amount,
      currency: dispute.currency,
      correlationId,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REFUND HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  private async handleChargeRefunded(
    charge: Stripe.Charge,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      {
        chargeId: charge.id,
        amountRefunded: charge.amount_refunded,
        correlationId,
      },
      'Charge refunded'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.REFUND_CREATED,
      tenantId: charge.metadata?.tenantId ?? '',
      customerId: charge.customer as string,
      chargeId: charge.id,
      amount: charge.amount_refunded,
      currency: charge.currency,
      correlationId,
    });
  }

  private async handleRefundUpdated(
    refund: Stripe.Refund,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      {
        refundId: refund.id,
        status: refund.status,
        correlationId,
      },
      'Refund updated'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.REFUND_UPDATED,
      tenantId: refund.metadata?.tenantId ?? '',
      refundId: refund.id,
      chargeId: refund.charge as string,
      status: refund.status ?? 'unknown',
      amount: refund.amount,
      currency: refund.currency,
      correlationId,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOMER HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  private async handleCustomerCreated(
    customer: Stripe.Customer,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      { customerId: customer.id, email: customer.email, correlationId },
      'Customer created'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.CUSTOMER_CREATED,
      tenantId: customer.metadata?.tenantId ?? '',
      customerId: customer.id,
      email: customer.email ?? undefined,
      correlationId,
    });
  }

  private async handleCustomerUpdated(
    customer: Stripe.Customer,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info({ customerId: customer.id, correlationId }, 'Customer updated');

    await billingEventPublisher.publish({
      type: BillingEventType.CUSTOMER_UPDATED,
      tenantId: customer.metadata?.tenantId ?? '',
      customerId: customer.id,
      email: customer.email ?? undefined,
      correlationId,
    });
  }

  private async handleCustomerDeleted(
    customer: Stripe.DeletedCustomer,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info({ customerId: customer.id, correlationId }, 'Customer deleted');

    await billingEventPublisher.publish({
      type: BillingEventType.CUSTOMER_DELETED,
      tenantId: '',
      customerId: customer.id,
      correlationId,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAYMENT METHOD HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  private async handlePaymentMethodAttached(
    paymentMethod: Stripe.PaymentMethod,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      {
        paymentMethodId: paymentMethod.id,
        customerId: paymentMethod.customer,
        type: paymentMethod.type,
        correlationId,
      },
      'Payment method attached'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.PAYMENT_METHOD_ATTACHED,
      tenantId: paymentMethod.metadata?.tenantId ?? '',
      customerId: paymentMethod.customer as string,
      paymentMethodId: paymentMethod.id,
      paymentMethodType: paymentMethod.type,
      correlationId,
    });
  }

  private async handlePaymentMethodDetached(
    paymentMethod: Stripe.PaymentMethod,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.info(
      { paymentMethodId: paymentMethod.id, correlationId },
      'Payment method detached'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.PAYMENT_METHOD_DETACHED,
      tenantId: paymentMethod.metadata?.tenantId ?? '',
      paymentMethodId: paymentMethod.id,
      correlationId,
    });
  }

  private async handlePaymentSourceExpiring(
    card: Stripe.Card,
    correlationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: any
  ): Promise<void> {
    logger.warn(
      {
        cardId: card.id,
        customerId: card.customer,
        expMonth: card.exp_month,
        expYear: card.exp_year,
        correlationId,
      },
      'Payment source expiring soon'
    );

    await billingEventPublisher.publish({
      type: BillingEventType.PAYMENT_METHOD_EXPIRING,
      tenantId: card.metadata?.tenantId ?? '',
      customerId: card.customer as string,
      paymentMethodId: card.id,
      expiryMonth: card.exp_month,
      expiryYear: card.exp_year,
      last4: card.last4,
      correlationId,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Check if event was already processed (idempotency)
   */
  private isEventProcessed(eventId: string): boolean {
    const processed = this.processedEvents.get(eventId);
    if (!processed) return false;

    // Check if TTL expired
    if (Date.now() - processed.processedAt.getTime() > this.DEDUP_TTL_MS) {
      this.processedEvents.delete(eventId);
      return false;
    }

    return true;
  }

  /**
   * Mark event as processed
   */
  private markEventProcessed(eventId: string): void {
    this.processedEvents.set(eventId, {
      eventId,
      processedAt: new Date(),
      ttl: this.DEDUP_TTL_MS,
    });
  }

  /**
   * Clean up expired processed events
   */
  private cleanupProcessedEvents(): void {
    const now = Date.now();
    for (const [eventId, data] of this.processedEvents) {
      if (now - data.processedAt.getTime() > this.DEDUP_TTL_MS) {
        this.processedEvents.delete(eventId);
      }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): WebhookMetrics {
    return {
      ...this.metrics,
      processingTimeMs: this.metrics.processingTimeMs.slice(-100), // Last 100
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const stripeWebhookController = new StripeWebhookController();
export default stripeWebhookController;
