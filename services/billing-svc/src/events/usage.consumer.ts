/**
 * Usage Event Consumer (Sprint 12)
 *
 * NATS JetStream consumer that subscribes to platform-wide events and
 * routes them into the metering service for usage-based billing.
 *
 * Subscribed subjects:
 *   - auth.login.success         → active_seats (unique per user per period)
 *   - ai.session.*               → ai_interactions
 *   - integration.api_call       → api_calls
 *   - content.storage.*          → storage_bytes
 *   - assessment.completed       → assessments
 *   - report.generated           → reports
 *
 * Uses JetStream durable consumers for at-least-once delivery with
 * idempotency-key-based deduplication in the metering service.
 */

import type { NatsConnection, JetStreamClient, JetStreamSubscription } from 'nats';
import { connect, StringCodec, AckPolicy, DeliverPolicy } from 'nats';

import { meteringService, type MeterMetric } from '../services/metering.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// LOGGER
// ══════════════════════════════════════════════════════════════════════════════

const logger = {
  info: (msg: string, data?: Record<string, unknown>): void => {
    console.log(`[UsageConsumer] INFO: ${msg}`, data ?? '');
  },
  warn: (msg: string, data?: Record<string, unknown>): void => {
    console.warn(`[UsageConsumer] WARN: ${msg}`, data ?? '');
  },
  error: (msg: string, data?: Record<string, unknown>): void => {
    console.error(`[UsageConsumer] ERROR: ${msg}`, data ?? '');
  },
  debug: (msg: string, data?: Record<string, unknown>): void => {
    console.debug(`[UsageConsumer] DEBUG: ${msg}`, data ?? '');
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Shape of events published across the platform */
interface PlatformEvent {
  type: string;
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/** Maps NATS subject patterns to metering dimensions */
interface SubjectMapping {
  /** NATS subject to subscribe to */
  subject: string;
  /** Durable consumer name */
  durableName: string;
  /** Meter metric to update */
  metric: MeterMetric;
  /** Extract delta from event payload (defaults to 1) */
  extractDelta?: (event: PlatformEvent) => number;
  /** Extract unique key for "unique" aggregation */
  extractUniqueKey?: (event: PlatformEvent) => string | undefined;
  /** Extract metadata for the event */
  extractMetadata?: (event: PlatformEvent) => Record<string, unknown> | undefined;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBJECT MAPPINGS
// ══════════════════════════════════════════════════════════════════════════════

const SUBJECT_MAPPINGS: SubjectMapping[] = [
  {
    subject: 'auth.login.success',
    durableName: 'billing-usage-auth-login',
    metric: 'active_seats',
    extractUniqueKey: (e) => e.userId as string | undefined,
  },
  {
    subject: 'ai.session.>',
    durableName: 'billing-usage-ai-session',
    metric: 'ai_interactions',
    extractMetadata: (e) => ({
      model: e.model,
      sessionType: e.sessionType,
      tokensUsed: e.tokensUsed,
    }),
  },
  {
    subject: 'integration.api_call',
    durableName: 'billing-usage-api-call',
    metric: 'api_calls',
    extractMetadata: (e) => ({
      endpoint: e.endpoint,
      method: e.method,
      statusCode: e.statusCode,
    }),
  },
  {
    subject: 'content.storage.>',
    durableName: 'billing-usage-storage',
    metric: 'storage_bytes',
    extractDelta: (e) => (e.sizeBytes as number) ?? 0,
    extractMetadata: (e) => ({
      action: e.action, // "upload" | "delete"
      contentType: e.contentType,
    }),
  },
  {
    subject: 'assessment.completed',
    durableName: 'billing-usage-assessment',
    metric: 'assessments',
    extractMetadata: (e) => ({
      assessmentType: e.assessmentType,
      learnerId: e.learnerId,
    }),
  },
  {
    subject: 'report.generated',
    durableName: 'billing-usage-report',
    metric: 'reports',
    extractMetadata: (e) => ({
      reportType: e.reportType,
      format: e.format,
    }),
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// CONSUMER CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class UsageEventConsumer {
  private natsConnection: NatsConnection | null = null;
  private jetstream: JetStreamClient | null = null;
  private subscriptions: JetStreamSubscription[] = [];
  private readonly natsUrl: string | undefined;
  private readonly streamName = 'PLATFORM';
  private readonly stringCodec = StringCodec();
  private isRunning = false;

  constructor(natsUrl?: string) {
    this.natsUrl = natsUrl ?? process.env.NATS_URL;
  }

  /**
   * Initialize the consumer: connect to NATS, ensure stream exists,
   * and start consuming from all mapped subjects.
   */
  async start(): Promise<void> {
    if (!this.natsUrl) {
      logger.info('NATS_URL not configured — usage event consumer disabled');
      return;
    }

    if (this.isRunning) {
      logger.warn('Consumer already running');
      return;
    }

    try {
      this.natsConnection = await connect({
        servers: this.natsUrl,
        name: 'billing-usage-consumer',
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
      });

      this.jetstream = this.natsConnection.jetstream();

      // Ensure the PLATFORM stream exists (may be created by other services)
      const jsm = await this.natsConnection.jetstreamManager();
      try {
        await jsm.streams.info(this.streamName);
        logger.info('PLATFORM stream found');
      } catch {
        // Create stream with all subjects we care about
        const subjects = SUBJECT_MAPPINGS.map((m) => m.subject);
        await jsm.streams.add({
          name: this.streamName,
          subjects,
          max_msgs: 500_000,
          max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days
        });
        logger.info('PLATFORM stream created', { subjects });
      }

      // Start consumers for each mapping
      for (const mapping of SUBJECT_MAPPINGS) {
        await this.startConsumer(mapping);
      }

      this.isRunning = true;
      logger.info('Usage event consumer started', {
        subjects: SUBJECT_MAPPINGS.map((m) => m.subject),
      });
    } catch (error) {
      logger.error('Failed to start usage event consumer', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Start a durable consumer for a single subject mapping.
   */
  private async startConsumer(mapping: SubjectMapping): Promise<void> {
    if (!this.jetstream) return;

    try {
      const sub = await this.jetstream.subscribe(mapping.subject, {
        durable: mapping.durableName,
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.New,
        max_ack_pending: 100,
      });

      this.subscriptions.push(sub);

      // Process messages in background
      this.processMessages(sub, mapping).catch((err) => {
        logger.error('Message processing loop failed', {
          subject: mapping.subject,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      logger.info('Consumer started', {
        subject: mapping.subject,
        durable: mapping.durableName,
      });
    } catch (error) {
      logger.error('Failed to start consumer for subject', {
        subject: mapping.subject,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Message processing loop for a subscription.
   */
  private async processMessages(
    sub: JetStreamSubscription,
    mapping: SubjectMapping,
  ): Promise<void> {
    for await (const msg of sub) {
      try {
        const rawData = this.stringCodec.decode(msg.data);
        const event: PlatformEvent = JSON.parse(rawData);

        // Require tenantId
        if (!event.tenantId) {
          logger.warn('Event missing tenantId, skipping', {
            subject: msg.subject,
            type: event.type,
          });
          msg.ack();
          continue;
        }

        const delta = mapping.extractDelta?.(event) ?? 1;
        const uniqueKey = mapping.extractUniqueKey?.(event);
        const metadata = mapping.extractMetadata?.(event);

        // Build idempotency key from correlationId if available
        const idempotencyKey = event.correlationId
          ? `nats:${mapping.metric}:${event.correlationId}`
          : undefined;

        const result = await meteringService.recordUsage({
          tenantId: event.tenantId,
          metric: mapping.metric,
          delta,
          uniqueKey,
          source: `nats:${msg.subject}`,
          userId: event.userId,
          idempotencyKey,
          metadata,
          timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
        });

        // Check if we should emit warning/exceeded events
        if (result.limitCheck.warning || !result.limitCheck.allowed) {
          logger.warn('Usage limit alert', {
            tenantId: event.tenantId,
            metric: mapping.metric,
            currentValue: result.limitCheck.currentValue,
            hardLimit: result.limitCheck.hardLimit,
            warning: result.limitCheck.warning,
            exceeded: !result.limitCheck.allowed,
          });
        }

        msg.ack();
      } catch (error) {
        logger.error('Failed to process usage event', {
          subject: msg.subject,
          error: error instanceof Error ? error.message : String(error),
        });
        // NAK with delay for retry
        msg.nak(5000);
      }
    }
  }

  /**
   * Gracefully stop the consumer.
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    for (const sub of this.subscriptions) {
      try {
        await sub.drain();
      } catch (error) {
        logger.error('Error draining subscription', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    this.subscriptions = [];

    if (this.natsConnection) {
      try {
        await this.natsConnection.drain();
        await this.natsConnection.close();
      } catch (error) {
        logger.error('Error closing NATS connection', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.natsConnection = null;
      this.jetstream = null;
    }

    logger.info('Usage event consumer stopped');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const usageEventConsumer = new UsageEventConsumer();
