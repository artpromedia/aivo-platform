/**
 * Event Publisher Service
 *
 * Provides a centralized event publishing mechanism that enforces:
 * - Required tenantId on all events (multi-tenant isolation)
 * - Schema validation at publish time
 * - Consistent event metadata
 * - Integration with message queues (Redis Streams, Kafka, etc.)
 *
 * CRITICAL: Events without tenantId are REJECTED. This ensures complete
 * tenant isolation in event-driven architectures.
 *
 * @module @aivo/ts-utils/event-publisher
 */

import { z, ZodError } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Base event interface - all events must have these fields
 */
interface BaseEvent {
  eventId: string;
  tenantId: string;
  eventType: string;
  eventVersion: string;
  timestamp: string;
  source: {
    service: string;
    version: string;
  };
  correlationId?: string;
  causationId?: string;
}

/**
 * Result of a publish attempt
 */
export interface PublishResult {
  success: boolean;
  eventId?: string;
  error?: string;
  validationErrors?: z.ZodIssue[];
}

/**
 * Batch publish result
 */
export interface BatchPublishResult {
  totalEvents: number;
  successful: number;
  failed: number;
  results: PublishResult[];
}

/**
 * Event handler for different transport backends
 */
export interface EventTransport {
  /** Transport name for logging */
  name: string;

  /** Publish a single event */
  publish(topic: string, event: BaseEvent): Promise<void>;

  /** Publish multiple events (optional batch support) */
  publishBatch?(topic: string, events: BaseEvent[]): Promise<void>;

  /** Close connection */
  close?(): Promise<void>;
}

/**
 * Configuration for event publisher
 */
export interface EventPublisherConfig {
  /** Service name for event source metadata */
  serviceName: string;

  /** Service version for event source metadata */
  serviceVersion: string;

  /** Transport backend for event delivery */
  transport: EventTransport;

  /** Whether to throw on publish failures (default: false, logs error) */
  throwOnError?: boolean;

  /** Custom logger */
  logger?: EventLogger;
}

/**
 * Logger interface for event publishing
 */
export interface EventLogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

// ══════════════════════════════════════════════════════════════════════════════
// Errors
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Error thrown when event validation fails
 */
export class EventValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'EventValidationError';
  }
}

/**
 * Error thrown when tenantId is missing from an event
 */
export class MissingTenantIdError extends Error {
  constructor(eventType: string) {
    super(
      `[SECURITY] Event rejected: Missing tenantId on event type "${eventType}". ` +
        'All events MUST include a tenantId for multi-tenant isolation.'
    );
    this.name = 'MissingTenantIdError';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Default Logger
// ══════════════════════════════════════════════════════════════════════════════

const defaultLogger: EventLogger = {
  info(message, data) {
    console.log(`[EventPublisher] ${message}`, data ?? '');
  },
  warn(message, data) {
    console.warn(`[EventPublisher] ${message}`, data ?? '');
  },
  error(message, data) {
    console.error(`[EventPublisher] ${message}`, data ?? '');
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// In-Memory Transport (for testing)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory event transport for testing
 */
export class InMemoryTransport implements EventTransport {
  name = 'in-memory';
  private events: Map<string, BaseEvent[]> = new Map();

  async publish(topic: string, event: BaseEvent): Promise<void> {
    const topicEvents = this.events.get(topic) ?? [];
    topicEvents.push(event);
    this.events.set(topic, topicEvents);
  }

  async publishBatch(topic: string, events: BaseEvent[]): Promise<void> {
    const topicEvents = this.events.get(topic) ?? [];
    topicEvents.push(...events);
    this.events.set(topic, topicEvents);
  }

  /** Get all events for a topic (for testing) */
  getEvents(topic: string): BaseEvent[] {
    return this.events.get(topic) ?? [];
  }

  /** Get all events across all topics (for testing) */
  getAllEvents(): Map<string, BaseEvent[]> {
    return new Map(this.events);
  }

  /** Clear all events (for testing) */
  clear(): void {
    this.events.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Event Publisher Service
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Central event publisher with mandatory tenant isolation.
 *
 * @example
 * ```typescript
 * const publisher = new EventPublisher({
 *   serviceName: 'homework-helper-svc',
 *   serviceVersion: '1.0.0',
 *   transport: new RedisStreamsTransport(redis),
 * });
 *
 * // Publish with schema validation
 * await publisher.publish(
 *   'learning.events',
 *   HomeworkTaskCompletedEventSchema,
 *   {
 *     tenantId: 'clg123...',
 *     eventType: 'homework.task.completed',
 *     payload: { taskId: '...', completedAt: '...' }
 *   }
 * );
 *
 * // This will FAIL - no tenantId
 * await publisher.publish(
 *   'learning.events',
 *   SomeEventSchema,
 *   { eventType: 'some.event', payload: {} }
 * ); // Throws MissingTenantIdError
 * ```
 */
export class EventPublisher {
  private readonly config: Required<EventPublisherConfig>;

  constructor(config: EventPublisherConfig) {
    this.config = {
      ...config,
      throwOnError: config.throwOnError ?? false,
      logger: config.logger ?? defaultLogger,
    };
  }

  /**
   * Publish a single event with schema validation.
   *
   * @param topic - Topic/stream to publish to
   * @param schema - Zod schema to validate against
   * @param eventData - Event data (eventId, timestamp, source will be auto-populated)
   * @returns Publish result
   * @throws MissingTenantIdError if tenantId is missing
   * @throws EventValidationError if schema validation fails (when throwOnError is true)
   */
  async publish<T extends z.ZodSchema>(
    topic: string,
    schema: T,
    eventData: Omit<z.infer<T>, 'eventId' | 'timestamp' | 'source' | 'eventVersion'>
  ): Promise<PublishResult> {
    // CRITICAL: Check tenantId FIRST
    if (!this.hasTenantId(eventData)) {
      const error = new MissingTenantIdError(
        (eventData as Record<string, unknown>).eventType as string ?? 'unknown'
      );
      this.config.logger.error('[SECURITY] Event rejected - missing tenantId', {
        eventType: (eventData as Record<string, unknown>).eventType,
        topic,
      });

      if (this.config.throwOnError) {
        throw error;
      }

      return {
        success: false,
        error: error.message,
      };
    }

    // Build complete event with auto-populated fields
    const event = {
      ...eventData,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventVersion: '1.0',
      source: {
        service: this.config.serviceName,
        version: this.config.serviceVersion,
      },
    };

    // Validate against schema
    const validationResult = schema.safeParse(event);
    if (!validationResult.success) {
      this.config.logger.error('Event validation failed', {
        topic,
        eventType: event.eventType,
        errors: validationResult.error.issues,
      });

      if (this.config.throwOnError) {
        throw new EventValidationError(
          'Event validation failed',
          validationResult.error.issues
        );
      }

      return {
        success: false,
        error: 'Event validation failed',
        validationErrors: validationResult.error.issues,
      };
    }

    // Publish to transport
    try {
      await this.config.transport.publish(topic, validationResult.data as BaseEvent);

      this.config.logger.info('Event published', {
        topic,
        eventId: event.eventId,
        eventType: event.eventType,
        tenantId: (eventData as Record<string, unknown>).tenantId,
      });

      return {
        success: true,
        eventId: event.eventId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.config.logger.error('Event publish failed', {
        topic,
        eventType: event.eventType,
        error: errorMessage,
      });

      if (this.config.throwOnError) {
        throw err;
      }

      return {
        success: false,
        eventId: event.eventId,
        error: errorMessage,
      };
    }
  }

  /**
   * Publish multiple events in a batch.
   *
   * @param topic - Topic/stream to publish to
   * @param schema - Zod schema to validate against
   * @param eventsData - Array of event data
   * @returns Batch publish result
   */
  async publishBatch<T extends z.ZodSchema>(
    topic: string,
    schema: T,
    eventsData: Array<Omit<z.infer<T>, 'eventId' | 'timestamp' | 'source' | 'eventVersion'>>
  ): Promise<BatchPublishResult> {
    const results: PublishResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const eventData of eventsData) {
      const result = await this.publish(topic, schema, eventData);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      totalEvents: eventsData.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Publish a pre-validated event (skips schema validation).
   *
   * Use this when you've already validated the event elsewhere.
   * Still checks for tenantId!
   *
   * @param topic - Topic/stream to publish to
   * @param event - Pre-validated event
   * @returns Publish result
   */
  async publishRaw(topic: string, event: BaseEvent): Promise<PublishResult> {
    // CRITICAL: Still check tenantId even for raw events
    if (!event.tenantId) {
      const error = new MissingTenantIdError(event.eventType ?? 'unknown');
      this.config.logger.error('[SECURITY] Raw event rejected - missing tenantId', {
        eventType: event.eventType,
        topic,
      });

      if (this.config.throwOnError) {
        throw error;
      }

      return {
        success: false,
        error: error.message,
      };
    }

    try {
      await this.config.transport.publish(topic, event);

      return {
        success: true,
        eventId: event.eventId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (this.config.throwOnError) {
        throw err;
      }

      return {
        success: false,
        eventId: event.eventId,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if event data has a valid tenantId
   */
  private hasTenantId(eventData: unknown): boolean {
    return (
      typeof eventData === 'object' &&
      eventData !== null &&
      'tenantId' in eventData &&
      typeof (eventData as Record<string, unknown>).tenantId === 'string' &&
      (eventData as Record<string, unknown>).tenantId !== ''
    );
  }

  /**
   * Close the publisher and underlying transport
   */
  async close(): Promise<void> {
    if (this.config.transport.close) {
      await this.config.transport.close();
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Factory Function
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create an event publisher with default configuration from environment
 */
export function createEventPublisher(transport: EventTransport): EventPublisher {
  return new EventPublisher({
    serviceName: process.env.SERVICE_NAME ?? 'unknown-service',
    serviceVersion: process.env.APP_VERSION ?? '1.0.0',
    transport,
    throwOnError: process.env.NODE_ENV !== 'production',
  });
}
