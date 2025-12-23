/**
 * Marketplace Event Subscriber
 *
 * NATS JetStream consumer for external events that affect marketplace state.
 * Subscribes to:
 * - Billing events (subscription lifecycle, payment status)
 * - Content events (content published, updated, archived)
 * - Tenant events (tenant created, suspended, settings changed)
 * - Usage analytics events
 *
 * NOTE: Requires the 'nats' package to be installed.
 * Run: pnpm add nats
 */

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-floating-promises, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */

import {
  connect,
  type JetStreamClient,
  type NatsConnection,
  type JetStreamManager,
  type ConsumerConfig,
  AckPolicy,
  DeliverPolicy,
} from 'nats';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SubscriberConfig {
  natsUrl: string;
  streamName: string;
  consumerName: string;
  subjects: string[];
}

export interface BillingSubscriptionEvent {
  eventType:
    | 'billing.subscription.created'
    | 'billing.subscription.activated'
    | 'billing.subscription.suspended'
    | 'billing.subscription.canceled'
    | 'billing.subscription.renewed';
  data: {
    subscriptionId: string;
    tenantId: string;
    planId: string;
    status: string;
    startDate: string;
    endDate?: string;
    canceledAt?: string;
    reason?: string;
  };
}

export interface BillingPaymentEvent {
  eventType: 'billing.payment.succeeded' | 'billing.payment.failed' | 'billing.payment.refunded';
  data: {
    paymentId: string;
    subscriptionId?: string;
    tenantId: string;
    amount: number;
    currency: string;
    status: string;
    failureReason?: string;
  };
}

export interface ContentPublishedEvent {
  eventType: 'content.published';
  data: {
    contentId: string;
    tenantId: string;
    contentType: string;
    title: string;
    publishedAt: string;
    publishedBy: string;
    visibility: 'private' | 'tenant' | 'marketplace';
    marketplaceItemId?: string;
  };
}

export interface ContentArchivedEvent {
  eventType: 'content.archived';
  data: {
    contentId: string;
    tenantId: string;
    archivedAt: string;
    archivedBy: string;
    reason?: string;
  };
}

export interface TenantCreatedEvent {
  eventType: 'tenant.created';
  data: {
    tenantId: string;
    name: string;
    type: 'district' | 'school' | 'home';
    planType: string;
    createdAt: string;
  };
}

export interface TenantSuspendedEvent {
  eventType: 'tenant.suspended';
  data: {
    tenantId: string;
    suspendedAt: string;
    reason: string;
    suspendedBy?: string;
  };
}

export interface UsageAnalyticsEvent {
  eventType: 'analytics.usage.recorded';
  data: {
    tenantId: string;
    marketplaceItemId: string;
    usageType: 'session_start' | 'session_end' | 'activity_completed' | 'content_view';
    userId: string;
    userRole: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  };
}

type MarketplaceInboundEvent =
  | BillingSubscriptionEvent
  | BillingPaymentEvent
  | ContentPublishedEvent
  | ContentArchivedEvent
  | TenantCreatedEvent
  | TenantSuspendedEvent
  | UsageAnalyticsEvent;

// ══════════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

type EventHandler<T> = (event: T) => Promise<void>;

interface EventHandlers {
  'billing.subscription.created': EventHandler<BillingSubscriptionEvent>;
  'billing.subscription.activated': EventHandler<BillingSubscriptionEvent>;
  'billing.subscription.suspended': EventHandler<BillingSubscriptionEvent>;
  'billing.subscription.canceled': EventHandler<BillingSubscriptionEvent>;
  'billing.subscription.renewed': EventHandler<BillingSubscriptionEvent>;
  'billing.payment.succeeded': EventHandler<BillingPaymentEvent>;
  'billing.payment.failed': EventHandler<BillingPaymentEvent>;
  'billing.payment.refunded': EventHandler<BillingPaymentEvent>;
  'content.published': EventHandler<ContentPublishedEvent>;
  'content.archived': EventHandler<ContentArchivedEvent>;
  'tenant.created': EventHandler<TenantCreatedEvent>;
  'tenant.suspended': EventHandler<TenantSuspendedEvent>;
  'analytics.usage.recorded': EventHandler<UsageAnalyticsEvent>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIBER CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class MarketplaceEventSubscriber {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private handlers: Partial<EventHandlers> = {};
  private isRunning = false;

  constructor(private config: SubscriberConfig) {}

  /**
   * Register an event handler
   */
  on<K extends keyof EventHandlers>(eventType: K, handler: EventHandlers[K]): void {
    this.handlers[eventType] = handler as EventHandler<MarketplaceInboundEvent>;
  }

  /**
   * Connect to NATS and start consuming events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Subscriber already running');
      return;
    }

    try {
      // Connect to NATS
      this.nc = await connect({ servers: this.config.natsUrl });
      console.log(`Connected to NATS at ${this.config.natsUrl}`);

      // Get JetStream context
      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();

      // Ensure stream exists
      await this.ensureStream();

      // Create durable consumer
      await this.ensureConsumer();

      // Start consuming
      this.isRunning = true;
      await this.consume();
    } catch (error) {
      console.error('Failed to start event subscriber:', error);
      throw error;
    }
  }

  /**
   * Stop the subscriber
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.nc) {
      await this.nc.drain();
      await this.nc.close();
      this.nc = null;
    }

    console.log('Event subscriber stopped');
  }

  /**
   * Ensure the stream exists
   */
  private async ensureStream(): Promise<void> {
    if (!this.jsm) return;

    try {
      await this.jsm.streams.info(this.config.streamName);
      console.log(`Stream ${this.config.streamName} exists`);
    } catch {
      // Stream doesn't exist, create it
      await this.jsm.streams.add({
        name: this.config.streamName,
        subjects: this.config.subjects,
        retention: 'limits' as const,
        max_msgs: 1000000,
        max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days in nanoseconds
        storage: 'file' as const,
        num_replicas: 1,
      });
      console.log(`Created stream ${this.config.streamName}`);
    }
  }

  /**
   * Ensure the durable consumer exists
   */
  private async ensureConsumer(): Promise<void> {
    if (!this.jsm) return;

    const consumerConfig: Partial<ConsumerConfig> = {
      durable_name: this.config.consumerName,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      max_deliver: 5,
      ack_wait: 30_000_000_000, // 30 seconds in nanoseconds
      filter_subjects: this.config.subjects,
    };

    try {
      await this.jsm.consumers.info(this.config.streamName, this.config.consumerName);
      console.log(`Consumer ${this.config.consumerName} exists`);
    } catch {
      await this.jsm.consumers.add(this.config.streamName, consumerConfig);
      console.log(`Created consumer ${this.config.consumerName}`);
    }
  }

  /**
   * Consume messages from the stream
   */
  private async consume(): Promise<void> {
    if (!this.js) return;

    const consumer = await this.js.consumers.get(this.config.streamName, this.config.consumerName);

    const messages = await consumer.consume();

    (async () => {
      for await (const msg of messages) {
        if (!this.isRunning) break;

        try {
          const event = JSON.parse(msg.data.toString()) as MarketplaceInboundEvent;
          await this.handleEvent(event);
          msg.ack();
        } catch (error) {
          console.error('Error processing message:', error);
          // NAK with delay for retry
          msg.nak(5000);
        }
      }
    })();
  }

  /**
   * Handle an incoming event
   */
  private async handleEvent(event: MarketplaceInboundEvent): Promise<void> {
    const handler = this.handlers[event.eventType as keyof EventHandlers];

    if (handler) {
      console.log(`Processing event: ${event.eventType}`);
      await (handler as EventHandler<MarketplaceInboundEvent>)(event);
    } else {
      console.log(`No handler for event type: ${event.eventType}`);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT SUBSCRIBER CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export function createMarketplaceSubscriber(): MarketplaceEventSubscriber {
  return new MarketplaceEventSubscriber({
    natsUrl: process.env.NATS_URL ?? 'nats://localhost:4222',
    streamName: 'AIVO_EVENTS',
    consumerName: 'marketplace-svc',
    subjects: [
      'billing.subscription.*',
      'billing.payment.*',
      'content.published',
      'content.archived',
      'tenant.created',
      'tenant.suspended',
      'analytics.usage.*',
    ],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT EVENT HANDLERS (to be implemented with actual business logic)
// ══════════════════════════════════════════════════════════════════════════════

export async function registerDefaultHandlers(
  subscriber: MarketplaceEventSubscriber,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services: { licenseService: any; usageService: any }
): Promise<void> {
  // Billing subscription handlers
  subscriber.on('billing.subscription.created', async (event) => {
    console.log('Handling billing.subscription.created', event.data.subscriptionId);
    // Create pending license when subscription is created
    // await services.licenseService.createFromSubscription(event.data);
  });

  subscriber.on('billing.subscription.activated', async (event) => {
    console.log('Handling billing.subscription.activated', event.data.subscriptionId);
    // Activate the associated license
    // await services.licenseService.activateBySubscription(event.data.subscriptionId);
  });

  subscriber.on('billing.subscription.suspended', async (event) => {
    console.log('Handling billing.subscription.suspended', event.data.subscriptionId);
    // Suspend the associated license
    // await services.licenseService.suspendBySubscription(event.data.subscriptionId, event.data.reason);
  });

  subscriber.on('billing.subscription.canceled', async (event) => {
    console.log('Handling billing.subscription.canceled', event.data.subscriptionId);
    // Cancel the associated license
    // await services.licenseService.cancelBySubscription(event.data.subscriptionId, event.data.reason);
  });

  subscriber.on('billing.subscription.renewed', async (event) => {
    console.log('Handling billing.subscription.renewed', event.data.subscriptionId);
    // Extend license validity
    // await services.licenseService.renewBySubscription(event.data.subscriptionId, event.data.endDate);
  });

  // Payment handlers
  subscriber.on('billing.payment.failed', async (event) => {
    console.log('Handling billing.payment.failed', event.data.paymentId);
    // Handle payment failure - may suspend license after grace period
    // await services.licenseService.handlePaymentFailure(event.data.subscriptionId, event.data.failureReason);
  });

  // Content handlers
  subscriber.on('content.published', async (event) => {
    console.log('Handling content.published', event.data.contentId);
    if (event.data.visibility === 'marketplace' && event.data.marketplaceItemId) {
      // Update marketplace item content reference
      // await services.catalogService.linkContent(event.data.marketplaceItemId, event.data.contentId);
    }
  });

  subscriber.on('content.archived', async (event) => {
    console.log('Handling content.archived', event.data.contentId);
    // Update any marketplace items referencing this content
    // await services.catalogService.handleContentArchived(event.data.contentId);
  });

  // Tenant handlers
  subscriber.on('tenant.created', async (event) => {
    console.log('Handling tenant.created', event.data.tenantId);
    // Initialize marketplace entitlements for new tenant
    // await services.entitlementService.initializeTenant(event.data.tenantId, event.data.planType);
  });

  subscriber.on('tenant.suspended', async (event) => {
    console.log('Handling tenant.suspended', event.data.tenantId);
    // Suspend all licenses for the tenant
    // await services.licenseService.suspendAllForTenant(event.data.tenantId, event.data.reason);
  });

  // Analytics handlers
  subscriber.on('analytics.usage.recorded', async (event) => {
    console.log('Handling analytics.usage.recorded', event.data.marketplaceItemId);
    // Track usage for billing/reporting
    // await services.usageService.recordUsage(event.data);
  });
}
