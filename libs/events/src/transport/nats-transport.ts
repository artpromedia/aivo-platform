// =============================================================================
// @aivo/events - NATS JetStream Transport
// =============================================================================
//
// Transport implementation for publishing events to NATS JetStream.
// Features:
// - Connection pooling with automatic reconnection
// - Retry with exponential backoff
// - Schema validation before publish
// - Dead-letter queue routing for failures

import {
  connect,
  NatsConnection,
  JetStreamClient,
  JetStreamManager,
  JetStreamPublishOptions,
  PubAck,
  StringCodec,
  NatsError,
  ErrorCode,
} from 'nats';
import { v4 as uuidv4 } from 'uuid';
import type { BaseEvent } from '../schemas';
import { validateEvent, BaseEventSchema, getStreamForEventType } from '../schemas';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface NatsTransportConfig {
  /** NATS server URLs (comma-separated or array) */
  servers: string | string[];
  /** Connection name for debugging */
  name?: string;
  /** Max reconnect attempts (-1 for infinite) */
  maxReconnectAttempts?: number;
  /** Reconnect time wait (ms) */
  reconnectTimeWait?: number;
  /** Connection timeout (ms) */
  timeout?: number;
  /** Enable TLS */
  tls?: boolean;
  /** Authentication token */
  token?: string;
  /** Username for auth */
  user?: string;
  /** Password for auth */
  pass?: string;
  /** Service name for event source */
  serviceName: string;
  /** Service version for event source */
  serviceVersion: string;
}

export interface PublishOptions {
  /** Correlation ID for request tracing */
  correlationId?: string;
  /** Causation ID linking to triggering event */
  causationId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Message ID for deduplication */
  msgId?: string;
  /** Expected last message ID for ordering */
  expectedLastMsgId?: string;
}

export interface PublishResult {
  /** Whether publish was successful */
  success: boolean;
  /** Assigned event ID */
  eventId: string;
  /** Stream name */
  stream?: string;
  /** Sequence number in stream */
  sequence?: number;
  /** Error if failed */
  error?: Error;
  /** Number of retry attempts */
  attempts: number;
}

// -----------------------------------------------------------------------------
// Retry Configuration
// -----------------------------------------------------------------------------

interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

// -----------------------------------------------------------------------------
// NATS Transport Class
// -----------------------------------------------------------------------------

export class NatsTransport {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private sc = StringCodec();
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;
  private retryConfig: RetryConfig;

  constructor(
    private readonly config: NatsTransportConfig,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  /**
   * Connect to NATS server.
   */
  async connect(): Promise<void> {
    if (this.nc?.isClosed() === false) {
      return;
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this.doConnect();
    
    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async doConnect(): Promise<void> {
    const servers = Array.isArray(this.config.servers)
      ? this.config.servers
      : this.config.servers.split(',').map(s => s.trim());

    this.nc = await connect({
      servers,
      name: this.config.name ?? `${this.config.serviceName}-publisher`,
      maxReconnectAttempts: this.config.maxReconnectAttempts ?? -1,
      reconnectTimeWait: this.config.reconnectTimeWait ?? 2000,
      timeout: this.config.timeout ?? 10000,
      tls: this.config.tls ? {} : undefined,
      token: this.config.token,
      user: this.config.user,
      pass: this.config.pass,
    });

    this.js = this.nc.jetstream();
    this.jsm = await this.nc.jetstreamManager();

    // Set up connection event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.nc) return;

    // Handle disconnection
    (async () => {
      if (!this.nc) return;
      for await (const status of this.nc.status()) {
        switch (status.type) {
          case 'disconnect':
            console.warn('[NatsTransport] Disconnected from NATS');
            break;
          case 'reconnect':
            console.info('[NatsTransport] Reconnected to NATS');
            break;
          case 'error':
            console.error('[NatsTransport] Connection error:', status.data);
            break;
          case 'ldm':
            console.warn('[NatsTransport] Lame duck mode detected');
            break;
        }
      }
    })();
  }

  /**
   * Check if connected to NATS.
   */
  isConnected(): boolean {
    return this.nc !== null && !this.nc.isClosed();
  }

  /**
   * Gracefully close connection.
   */
  async close(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      await this.nc.close();
      this.nc = null;
      this.js = null;
      this.jsm = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Publishing
  // ---------------------------------------------------------------------------

  /**
   * Publish an event to NATS JetStream.
   */
  async publish<T extends BaseEvent>(
    event: Omit<T, 'eventId' | 'timestamp' | 'source'>,
    options: PublishOptions = {}
  ): Promise<PublishResult> {
    const eventId = options.msgId ?? uuidv4();
    const timestamp = new Date().toISOString();
    
    // Build complete event
    const fullEvent: T = {
      ...event,
      eventId,
      timestamp,
      source: {
        service: this.config.serviceName,
        version: this.config.serviceVersion,
      },
      correlationId: options.correlationId,
      causationId: options.causationId,
      metadata: options.metadata,
    } as T;

    // Validate event
    const validation = validateEvent(BaseEventSchema.passthrough(), fullEvent);
    if (!validation.success) {
      return {
        success: false,
        eventId,
        attempts: 0,
        error: new Error(
          `Event validation failed: ${validation.errors?.format()}`
        ),
      };
    }

    // Get subject from event type
    const subject = fullEvent.eventType;

    // Ensure connected
    await this.connect();

    // Publish with retry
    return this.publishWithRetry(fullEvent, subject, options, eventId);
  }

  private async publishWithRetry<T extends BaseEvent>(
    event: T,
    subject: string,
    options: PublishOptions,
    eventId: string
  ): Promise<PublishResult> {
    let lastError: Error | undefined;
    let attempts = 0;

    for (let i = 0; i < this.retryConfig.maxAttempts; i++) {
      attempts++;
      
      try {
        const result = await this.doPublish(event, subject, options);
        return {
          success: true,
          eventId,
          stream: result.stream,
          sequence: result.seq,
          attempts,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        // Don't retry on validation errors
        if (this.isNonRetryableError(err)) {
          break;
        }

        // Wait before retry with exponential backoff
        if (i < this.retryConfig.maxAttempts - 1) {
          const delay = Math.min(
            this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, i),
            this.retryConfig.maxDelayMs
          );
          await this.sleep(delay);
        }
      }
    }

    // All retries failed - publish to DLQ
    await this.publishToDLQ(event, subject, lastError);

    return {
      success: false,
      eventId,
      attempts,
      error: lastError,
    };
  }

  private async doPublish<T extends BaseEvent>(
    event: T,
    subject: string,
    options: PublishOptions
  ): Promise<PubAck> {
    if (!this.js) {
      throw new Error('JetStream client not initialized');
    }

    const publishOpts: Partial<JetStreamPublishOptions> = {};
    
    if (options.msgId) {
      publishOpts.msgID = options.msgId;
    }
    
    if (options.expectedLastMsgId) {
      publishOpts.expect = {
        lastMsgID: options.expectedLastMsgId,
      };
    }

    const data = this.sc.encode(JSON.stringify(event));
    return await this.js.publish(subject, data, publishOpts);
  }

  private isNonRetryableError(err: unknown): boolean {
    if (err instanceof NatsError) {
      // Don't retry on duplicate message or bad request
      return (
        err.code === ErrorCode.JetStreamInvalidAck ||
        err.code === ErrorCode.BadPayload
      );
    }
    return false;
  }

  private async publishToDLQ<T extends BaseEvent>(
    event: T,
    originalSubject: string,
    error?: Error
  ): Promise<void> {
    if (!this.js) return;

    const dlqSubject = `dlq.${originalSubject}`;
    const dlqEvent = {
      originalEvent: event,
      originalSubject,
      error: error?.message ?? 'Unknown error',
      failedAt: new Date().toISOString(),
      attempts: this.retryConfig.maxAttempts,
    };

    try {
      const data = this.sc.encode(JSON.stringify(dlqEvent));
      await this.js.publish(dlqSubject, data);
    } catch (dlqErr) {
      console.error('[NatsTransport] Failed to publish to DLQ:', dlqErr);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------------------
  // Stream Info
  // ---------------------------------------------------------------------------

  /**
   * Get stream info for an event type.
   */
  async getStreamInfo(eventType: string): Promise<{
    name: string;
    messages: number;
    bytes: number;
    firstSeq: number;
    lastSeq: number;
  } | null> {
    if (!this.jsm) {
      await this.connect();
    }

    try {
      const streamName = getStreamForEventType(eventType);
      const info = await this.jsm!.streams.info(streamName);
      return {
        name: info.config.name,
        messages: info.state.messages,
        bytes: info.state.bytes,
        firstSeq: info.state.first_seq,
        lastSeq: info.state.last_seq,
      };
    } catch {
      return null;
    }
  }
}
