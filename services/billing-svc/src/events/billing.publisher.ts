/**
 * Billing Events Publisher
 *
 * Event publisher for billing domain events.
 * All billing events flow through this publisher to notify
 * other services about subscription changes, payments, etc.
 *
 * Events are published with:
 * - Correlation IDs for tracing
 * - Timestamps for ordering
 * - Tenant context for multi-tenancy
 * - Idempotency keys for deduplication
 *
 * NATS JetStream integration is enabled when NATS_URL is configured.
 * Falls back to in-memory handlers when NATS is not available.
 */

import { connect, NatsConnection, JetStreamClient, StringCodec } from 'nats';

// Simple logger using console
const logger = {
  info: (msg: string, data?: Record<string, unknown>): void => {
    console.log(`[BillingPublisher] INFO: ${msg}`, data ?? '');
  },
  warn: (msg: string, data?: Record<string, unknown>): void => {
    console.warn(`[BillingPublisher] WARN: ${msg}`, data ?? '');
  },
  error: (msg: string, data?: Record<string, unknown>): void => {
    console.error(`[BillingPublisher] ERROR: ${msg}`, data ?? '');
  },
  debug: (msg: string, data?: Record<string, unknown>): void => {
    console.debug(`[BillingPublisher] DEBUG: ${msg}`, data ?? '');
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export enum BillingEventType {
  // Subscription Events
  SUBSCRIPTION_CREATED = 'billing.subscription.created',
  SUBSCRIPTION_UPDATED = 'billing.subscription.updated',
  SUBSCRIPTION_CANCELED = 'billing.subscription.canceled',
  SUBSCRIPTION_PAUSED = 'billing.subscription.paused',
  SUBSCRIPTION_RESUMED = 'billing.subscription.resumed',
  SUBSCRIPTION_TRIAL_ENDING = 'billing.subscription.trial_ending',
  SUBSCRIPTION_TRIAL_ENDED = 'billing.subscription.trial_ended',
  SUBSCRIPTION_PLAN_CHANGED = 'billing.subscription.plan_changed',

  // Payment Events
  PAYMENT_SUCCEEDED = 'billing.payment.succeeded',
  PAYMENT_FAILED = 'billing.payment.failed',
  PAYMENT_REFUNDED = 'billing.payment.refunded',
  PAYMENT_DISPUTED = 'billing.payment.disputed',
  PAYMENT_DISPUTE_RESOLVED = 'billing.payment.dispute_resolved',
  PAYMENT_ACTION_REQUIRED = 'billing.payment.action_required',

  // Invoice Events
  INVOICE_CREATED = 'billing.invoice.created',
  INVOICE_PAID = 'billing.invoice.paid',
  INVOICE_PAYMENT_FAILED = 'billing.invoice.payment_failed',
  INVOICE_UPCOMING = 'billing.invoice.upcoming',
  INVOICE_FINALIZED = 'billing.invoice.finalized',
  INVOICE_VOIDED = 'billing.invoice.voided',

  // Customer Events
  CUSTOMER_CREATED = 'billing.customer.created',
  CUSTOMER_UPDATED = 'billing.customer.updated',
  CUSTOMER_DELETED = 'billing.customer.deleted',

  // Entitlements Events
  ENTITLEMENTS_UPDATED = 'billing.entitlements.updated',
  ENTITLEMENTS_GRANTED = 'billing.entitlements.granted',
  ENTITLEMENTS_REVOKED = 'billing.entitlements.revoked',

  // Usage Events
  USAGE_LIMIT_WARNING = 'billing.usage.limit_warning',
  USAGE_LIMIT_EXCEEDED = 'billing.usage.limit_exceeded',
  USAGE_RECORDED = 'billing.usage.recorded',

  // Checkout Events
  CHECKOUT_STARTED = 'billing.checkout.started',
  CHECKOUT_COMPLETED = 'billing.checkout.completed',
  CHECKOUT_ABANDONED = 'billing.checkout.abandoned',
  CHECKOUT_EXPIRED = 'billing.checkout.expired',

  // Dunning Events
  DUNNING_STARTED = 'billing.dunning.started',
  DUNNING_RECOVERED = 'billing.dunning.recovered',
  DUNNING_FINAL_WARNING = 'billing.dunning.final_warning',

  // Dispute Events
  DISPUTE_CREATED = 'billing.dispute.created',
  DISPUTE_UPDATED = 'billing.dispute.updated',
  DISPUTE_CLOSED = 'billing.dispute.closed',

  // Refund Events
  REFUND_CREATED = 'billing.refund.created',
  REFUND_UPDATED = 'billing.refund.updated',

  // Payment Method Events
  PAYMENT_METHOD_ATTACHED = 'billing.payment_method.attached',
  PAYMENT_METHOD_DETACHED = 'billing.payment_method.detached',
  PAYMENT_METHOD_EXPIRING = 'billing.payment_method.expiring',
}

// Alias for backwards compatibility
export const TRIAL_ENDING = BillingEventType.SUBSCRIPTION_TRIAL_ENDING;

// ══════════════════════════════════════════════════════════════════════════════
// EVENT PAYLOAD TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface BillingEventMetadata {
  correlationId: string;
  timestamp: string;
  source: string;
  version: string;
  idempotencyKey?: string | undefined;
}

export interface TenantContext {
  tenantId: string;
  organizationId?: string | undefined;
  userId?: string | undefined;
}

export interface SubscriptionEventPayload {
  subscriptionId: string;
  customerId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  previousPlan?: string;
  cancelReason?: string;
}

export interface PaymentEventPayload {
  paymentId: string;
  customerId: string;
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  amount: number;
  currency: string;
  status: string;
  subscriptionId?: string;
  invoiceId?: string;
  failureCode?: string;
  failureMessage?: string;
  refundedAmount?: number;
  refundReason?: string;
}

export interface InvoiceEventPayload {
  invoiceId: string;
  customerId: string;
  stripeInvoiceId: string;
  stripeCustomerId: string;
  subscriptionId?: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  dueDate?: string;
  paidAt?: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
}

export interface CustomerEventPayload {
  customerId: string;
  stripeCustomerId: string;
  email: string;
  name?: string;
  plan?: string;
  subscriptionStatus?: string;
  metadata?: Record<string, string>;
}

export interface EntitlementsEventPayload {
  customerId: string;
  tenantId: string;
  plan: string;
  features: string[];
  limits: Record<string, number>;
  previousPlan?: string;
  previousFeatures?: string[];
  reason: string;
}

export interface UsageEventPayload {
  customerId: string;
  tenantId: string;
  metricName: string;
  currentUsage: number;
  limit: number;
  percentUsed: number;
  recordedQuantity?: number;
}

export interface CheckoutEventPayload {
  sessionId: string;
  stripeSessionId: string;
  customerId?: string;
  stripeCustomerId?: string;
  plan: string;
  mode: 'subscription' | 'payment';
  status: string;
  successUrl?: string;
  cancelUrl?: string;
  amountTotal?: number;
  currency?: string;
}

export type BillingEventPayload =
  | SubscriptionEventPayload
  | PaymentEventPayload
  | InvoiceEventPayload
  | CustomerEventPayload
  | EntitlementsEventPayload
  | UsageEventPayload
  | CheckoutEventPayload
  | Record<string, unknown>;

export interface BillingEvent<T extends BillingEventPayload = BillingEventPayload> {
  type: BillingEventType;
  metadata: BillingEventMetadata;
  tenant: TenantContext;
  payload: T;
}

/**
 * Legacy event format for backwards compatibility with existing webhook handlers.
 * Allows passing event data as a single object with type, tenantId, etc.
 */
export interface LegacyBillingEvent {
  type: BillingEventType;
  tenantId?: string;
  userId?: string;
  organizationId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  [key: string]: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS (for in-memory/testing mode)
// ══════════════════════════════════════════════════════════════════════════════

type EventHandler = (event: BillingEvent) => void | Promise<void>;

const eventHandlers = new Map<BillingEventType | '*', EventHandler[]>();

/**
 * Subscribe to billing events (for testing/in-memory mode)
 */
export function onBillingEvent(
  eventType: BillingEventType | '*',
  handler: EventHandler
): () => void {
  const handlers = eventHandlers.get(eventType) ?? [];
  handlers.push(handler);
  eventHandlers.set(eventType, handlers);

  // Return unsubscribe function
  return () => {
    const currentHandlers = eventHandlers.get(eventType) ?? [];
    const index = currentHandlers.indexOf(handler);
    if (index > -1) {
      currentHandlers.splice(index, 1);
    }
  };
}

/**
 * Emit event to handlers (for in-memory mode)
 */
async function emitToHandlers(event: BillingEvent): Promise<void> {
  // Call specific handlers
  const specificHandlers = eventHandlers.get(event.type) ?? [];
  for (const handler of specificHandlers) {
    try {
      await handler(event);
    } catch (error) {
      logger.error('Event handler error', { type: event.type, error });
    }
  }

  // Call wildcard handlers
  const wildcardHandlers = eventHandlers.get('*') ?? [];
  for (const handler of wildcardHandlers) {
    try {
      await handler(event);
    } catch (error) {
      logger.error('Wildcard event handler error', { type: event.type, error });
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLISHER CLASS
// ══════════════════════════════════════════════════════════════════════════════

interface PublishOptions {
  correlationId?: string | undefined;
  idempotencyKey?: string | undefined;
}

class BillingEventPublisher {
  private isInitialized = false;
  private natsConnection: NatsConnection | null = null;
  private jetstream: JetStreamClient | null = null;
  private readonly natsUrl = process.env.NATS_URL;
  private readonly streamName = 'BILLING';
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  // For deduplication
  private readonly processedEvents = new Map<string, number>();
  private readonly deduplicationWindowMs = 60000; // 60 seconds
  private readonly stringCodec = StringCodec();

  /**
   * Initialize the publisher
   * Connects to NATS JetStream if NATS_URL is configured.
   * Falls back to in-memory handlers when NATS is not available.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Clean up expired deduplication entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanupDeduplicationCache();
    }, this.deduplicationWindowMs);

    // Initialize NATS if configured
    if (this.natsUrl) {
      try {
        this.natsConnection = await connect({
          servers: this.natsUrl,
          name: 'billing-svc-publisher',
          reconnect: true,
          maxReconnectAttempts: -1, // Unlimited retries
          reconnectTimeWait: 1000,
        });

        this.jetstream = this.natsConnection.jetstream();

        // Ensure stream exists
        const jsm = await this.natsConnection.jetstreamManager();
        try {
          await jsm.streams.info(this.streamName);
          logger.info('NATS JetStream stream exists', { stream: this.streamName });
        } catch {
          // Create stream if it doesn't exist
          await jsm.streams.add({
            name: this.streamName,
            subjects: ['billing.>'],
            retention: 'limits',
            max_msgs: 100000,
            max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days in nanoseconds
            storage: 'file',
            replicas: 1,
          });
          logger.info('NATS JetStream stream created', { stream: this.streamName });
        }

        logger.info('NATS JetStream publisher initialized', { url: this.natsUrl });
      } catch (error) {
        logger.error('Failed to connect to NATS, falling back to in-memory mode', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.natsConnection = null;
        this.jetstream = null;
      }
    } else {
      logger.info('NATS_URL not configured, using in-memory mode');
    }

    this.isInitialized = true;
    logger.info('Billing event publisher initialized', {
      mode: this.jetstream ? 'nats-jetstream' : 'in-memory',
    });
  }

  /**
   * Clean up old entries from deduplication cache
   */
  private cleanupDeduplicationCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.deduplicationWindowMs) {
        this.processedEvents.delete(key);
      }
    }
  }

  /**
   * Check if event is a duplicate
   */
  private isDuplicate(idempotencyKey: string): boolean {
    if (this.processedEvents.has(idempotencyKey)) {
      return true;
    }
    this.processedEvents.set(idempotencyKey, Date.now());
    return false;
  }

  /**
   * Publish a billing event
   * Supports both structured format and legacy object format for backwards compatibility
   */
  async publish(
    typeOrEvent: BillingEventType | LegacyBillingEvent,
    tenant?: TenantContext,
    payload?: BillingEventPayload,
    options: PublishOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Handle legacy object format (single argument with type property)
    let eventType: BillingEventType;
    let eventTenant: TenantContext;
    let eventPayload: Record<string, unknown>;
    let correlationId: string;
    let idempotencyKey: string | undefined;

    if (typeof typeOrEvent === 'object' && 'type' in typeOrEvent) {
      // Legacy format: { type, tenantId, correlationId, ...payload }
      const legacyEvent = typeOrEvent;
      eventType = legacyEvent.type;
      eventTenant = {
        tenantId: legacyEvent.tenantId ?? '',
        userId: legacyEvent.userId,
        organizationId: legacyEvent.organizationId,
      };
      correlationId = legacyEvent.correlationId ?? this.generateCorrelationId();
      idempotencyKey = legacyEvent.idempotencyKey;
      // Extract payload (everything except type, tenantId, correlationId, etc.)
      const {
        type: _t,
        tenantId: _tid,
        userId: _uid,
        organizationId: _oid,
        correlationId: _cid,
        idempotencyKey: _ik,
        ...rest
      } = legacyEvent;
      eventPayload = rest;
    } else {
      // New structured format
      eventType = typeOrEvent;
      if (!tenant) {
        throw new Error('Tenant context is required when using structured format');
      }
      eventTenant = tenant;
      eventPayload = (payload ?? {}) as Record<string, unknown>;
      correlationId = options.correlationId ?? this.generateCorrelationId();
      idempotencyKey = options.idempotencyKey;
    }

    // Check for duplicates
    const dedupeKey = idempotencyKey ?? correlationId;
    if (this.isDuplicate(dedupeKey)) {
      logger.info('Duplicate event detected and ignored', {
        type: eventType,
        correlationId,
        idempotencyKey,
      });
      return;
    }

    const event: BillingEvent = {
      type: eventType,
      metadata: {
        correlationId,
        timestamp: new Date().toISOString(),
        source: 'billing-svc',
        version: '1.0.0',
        idempotencyKey,
      },
      tenant: eventTenant,
      payload: eventPayload as BillingEventPayload,
    };

    try {
      // Log the event (always)
      logger.debug('Billing event published', {
        type: eventType,
        correlationId: event.metadata.correlationId,
        tenantId: eventTenant.tenantId,
      });

      // Emit to in-memory handlers
      await emitToHandlers(event);

      // Publish to NATS JetStream if available
      if (this.jetstream) {
        const subject = eventType; // e.g., "billing.subscription.created"
        const payload = this.stringCodec.encode(JSON.stringify(event));

        try {
          const ack = await this.jetstream.publish(subject, payload, {
            msgID: dedupeKey, // For deduplication in JetStream
          });
          logger.debug('Event published to NATS JetStream', {
            type: eventType,
            seq: ack.seq,
            stream: ack.stream,
          });
        } catch (natsError) {
          logger.error('Failed to publish to NATS JetStream', {
            type: eventType,
            error: natsError instanceof Error ? natsError.message : String(natsError),
          });
          // Don't throw - in-memory handlers have already been called
        }
      }
    } catch (error) {
      logger.error('Failed to publish billing event', {
        type: eventType,
        correlationId: event.metadata.correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate a unique correlation ID
   */
  private generateCorrelationId(): string {
    return `billing-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Gracefully close the publisher
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close NATS connection if it exists
    if (this.natsConnection) {
      try {
        await this.natsConnection.drain();
        await this.natsConnection.close();
        logger.info('NATS connection closed');
      } catch (error) {
        logger.error('Error closing NATS connection', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.natsConnection = null;
      this.jetstream = null;
    }

    this.isInitialized = false;
    this.processedEvents.clear();
    eventHandlers.clear();
    logger.info('Billing event publisher closed');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CONVENIENCE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Publish subscription created event
   */
  async publishSubscriptionCreated(
    tenant: TenantContext,
    payload: SubscriptionEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.SUBSCRIPTION_CREATED, tenant, payload, {
      correlationId,
      idempotencyKey: `sub-created-${payload.stripeSubscriptionId}`,
    });
  }

  /**
   * Publish subscription updated event
   */
  async publishSubscriptionUpdated(
    tenant: TenantContext,
    payload: SubscriptionEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.SUBSCRIPTION_UPDATED, tenant, payload, {
      correlationId,
    });
  }

  /**
   * Publish subscription canceled event
   */
  async publishSubscriptionCanceled(
    tenant: TenantContext,
    payload: SubscriptionEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.SUBSCRIPTION_CANCELED, tenant, payload, {
      correlationId,
      idempotencyKey: `sub-canceled-${payload.stripeSubscriptionId}-${Date.now()}`,
    });
  }

  /**
   * Publish payment succeeded event
   */
  async publishPaymentSucceeded(
    tenant: TenantContext,
    payload: PaymentEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.PAYMENT_SUCCEEDED, tenant, payload, {
      correlationId,
      idempotencyKey: `payment-success-${payload.stripePaymentIntentId}`,
    });
  }

  /**
   * Publish payment failed event
   */
  async publishPaymentFailed(
    tenant: TenantContext,
    payload: PaymentEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.PAYMENT_FAILED, tenant, payload, {
      correlationId,
    });
  }

  /**
   * Publish invoice paid event
   */
  async publishInvoicePaid(
    tenant: TenantContext,
    payload: InvoiceEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.INVOICE_PAID, tenant, payload, {
      correlationId,
      idempotencyKey: `invoice-paid-${payload.stripeInvoiceId}`,
    });
  }

  /**
   * Publish entitlements updated event
   */
  async publishEntitlementsUpdated(
    tenant: TenantContext,
    payload: EntitlementsEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.ENTITLEMENTS_UPDATED, tenant, payload, {
      correlationId,
    });
  }

  /**
   * Publish customer created event
   */
  async publishCustomerCreated(
    tenant: TenantContext,
    payload: CustomerEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.CUSTOMER_CREATED, tenant, payload, {
      correlationId,
      idempotencyKey: `customer-created-${payload.stripeCustomerId}`,
    });
  }

  /**
   * Publish checkout completed event
   */
  async publishCheckoutCompleted(
    tenant: TenantContext,
    payload: CheckoutEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.CHECKOUT_COMPLETED, tenant, payload, {
      correlationId,
      idempotencyKey: `checkout-complete-${payload.stripeSessionId}`,
    });
  }

  /**
   * Publish usage limit warning event
   */
  async publishUsageLimitWarning(
    tenant: TenantContext,
    payload: UsageEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.USAGE_LIMIT_WARNING, tenant, payload, {
      correlationId,
    });
  }

  /**
   * Publish trial ending event
   */
  async publishTrialEnding(
    tenant: TenantContext,
    payload: SubscriptionEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.SUBSCRIPTION_TRIAL_ENDING, tenant, payload, {
      correlationId,
      idempotencyKey: `trial-ending-${payload.stripeSubscriptionId}`,
    });
  }

  /**
   * Publish dispute created event
   */
  async publishPaymentDisputed(
    tenant: TenantContext,
    payload: PaymentEventPayload,
    correlationId?: string
  ): Promise<void> {
    await this.publish(BillingEventType.PAYMENT_DISPUTED, tenant, payload, {
      correlationId,
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const billingEventPublisher = new BillingEventPublisher();

// Export class for testing
export { BillingEventPublisher };
