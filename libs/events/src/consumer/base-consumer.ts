// =============================================================================
// @aivo/events - Base Consumer
// =============================================================================
//
// Abstract base class for NATS JetStream consumers.
// Provides connection management, message processing, and error handling.

import {
  connect,
  NatsConnection,
  JetStreamClient,
  JetStreamManager,
  ConsumerConfig,
  ConsumerInfo,
  JsMsg,
  StringCodec,
  AckPolicy,
  DeliverPolicy,
  ReplayPolicy,
} from 'nats';
import type { BaseEvent } from '../schemas';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ConsumerConnectionConfig {
  /** NATS server URLs */
  servers: string | string[];
  /** Connection name */
  name?: string;
  /** Max reconnect attempts */
  maxReconnectAttempts?: number;
  /** Enable TLS */
  tls?: boolean;
  /** Auth token */
  token?: string;
  /** Username */
  user?: string;
  /** Password */
  pass?: string;
}

export interface ConsumerOptions {
  /** Stream name to consume from */
  stream: string;
  /** Durable consumer name (for persistence) */
  durableName: string;
  /** Filter subject (optional) */
  filterSubject?: string;
  /** Max messages to process concurrently */
  maxConcurrent?: number;
  /** Ack wait time in ms */
  ackWaitMs?: number;
  /** Max delivery attempts before DLQ */
  maxDeliveries?: number;
  /** Start from beginning or new only */
  deliverPolicy?: 'all' | 'new' | 'last';
}

export interface ProcessedMessage<T = unknown> {
  event: T;
  subject: string;
  sequence: number;
  deliveryCount: number;
  timestamp: Date;
}

export type MessageHandler<T = unknown> = (
  message: ProcessedMessage<T>
) => Promise<void>;

// -----------------------------------------------------------------------------
// Base Consumer Class
// -----------------------------------------------------------------------------

export abstract class BaseConsumer {
  protected nc: NatsConnection | null = null;
  protected js: JetStreamClient | null = null;
  protected jsm: JetStreamManager | null = null;
  protected sc = StringCodec();
  protected isRunning = false;
  protected abortController: AbortController | null = null;

  constructor(
    protected readonly connectionConfig: ConsumerConnectionConfig,
    protected readonly consumerOptions: ConsumerOptions
  ) {}

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  async connect(): Promise<void> {
    if (this.nc && !this.nc.isClosed()) {
      return;
    }

    const servers = Array.isArray(this.connectionConfig.servers)
      ? this.connectionConfig.servers
      : this.connectionConfig.servers.split(',').map(s => s.trim());

    this.nc = await connect({
      servers,
      name: this.connectionConfig.name ?? `${this.consumerOptions.durableName}-consumer`,
      maxReconnectAttempts: this.connectionConfig.maxReconnectAttempts ?? -1,
      tls: this.connectionConfig.tls ? {} : undefined,
      token: this.connectionConfig.token,
      user: this.connectionConfig.user,
      pass: this.connectionConfig.pass,
    });

    this.js = this.nc.jetstream();
    this.jsm = await this.nc.jetstreamManager();

    // Ensure consumer exists
    await this.ensureConsumer();
  }

  protected async ensureConsumer(): Promise<ConsumerInfo> {
    if (!this.jsm) {
      throw new Error('JetStream manager not initialized');
    }

    const config: Partial<ConsumerConfig> = {
      durable_name: this.consumerOptions.durableName,
      ack_policy: AckPolicy.Explicit,
      ack_wait: (this.consumerOptions.ackWaitMs ?? 30000) * 1_000_000, // nanoseconds
      max_deliver: this.consumerOptions.maxDeliveries ?? 5,
      replay_policy: ReplayPolicy.Instant,
    };

    if (this.consumerOptions.filterSubject) {
      config.filter_subject = this.consumerOptions.filterSubject;
    }

    switch (this.consumerOptions.deliverPolicy) {
      case 'new':
        config.deliver_policy = DeliverPolicy.New;
        break;
      case 'last':
        config.deliver_policy = DeliverPolicy.Last;
        break;
      default:
        config.deliver_policy = DeliverPolicy.All;
    }

    try {
      return await this.jsm.consumers.add(
        this.consumerOptions.stream,
        config
      );
    } catch (err) {
      // Consumer might already exist
      return await this.jsm.consumers.info(
        this.consumerOptions.stream,
        this.consumerOptions.durableName
      );
    }
  }

  async close(): Promise<void> {
    this.isRunning = false;
    this.abortController?.abort();
    
    if (this.nc) {
      await this.nc.drain();
      await this.nc.close();
      this.nc = null;
      this.js = null;
      this.jsm = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Message Processing
  // ---------------------------------------------------------------------------

  /**
   * Start consuming messages.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    await this.connect();
    
    if (!this.js) {
      throw new Error('JetStream client not initialized');
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    const consumer = await this.js.consumers.get(
      this.consumerOptions.stream,
      this.consumerOptions.durableName
    );

    const messages = await consumer.consume({
      max_messages: this.consumerOptions.maxConcurrent ?? 100,
      // expires: 30000,
    });

    console.log(
      `[Consumer:${this.consumerOptions.durableName}] Started consuming from ${this.consumerOptions.stream}`
    );

    try {
      for await (const msg of messages) {
        if (!this.isRunning) {
          break;
        }

        await this.processMessage(msg);
      }
    } catch (err) {
      if (this.isRunning) {
        console.error(`[Consumer:${this.consumerOptions.durableName}] Error:`, err);
        throw err;
      }
    }
  }

  /**
   * Stop consuming messages.
   */
  stop(): void {
    this.isRunning = false;
    this.abortController?.abort();
  }

  protected async processMessage(msg: JsMsg): Promise<void> {
    const startTime = Date.now();
    
    try {
      const data = this.sc.decode(msg.data);
      const event = JSON.parse(data) as BaseEvent;

      const processed: ProcessedMessage<BaseEvent> = {
        event,
        subject: msg.subject,
        sequence: msg.seq,
        deliveryCount: msg.info.redeliveryCount + 1,
        timestamp: new Date(),
      };

      await this.handleMessage(processed);
      
      msg.ack();

      const latency = Date.now() - startTime;
      if (latency > 1000) {
        console.warn(
          `[Consumer:${this.consumerOptions.durableName}] Slow message processing: ${latency}ms`
        );
      }
    } catch (err) {
      console.error(
        `[Consumer:${this.consumerOptions.durableName}] Failed to process message:`,
        err
      );

      // Check if max deliveries reached
      if (msg.info.redeliveryCount >= (this.consumerOptions.maxDeliveries ?? 5) - 1) {
        // This will be the last delivery - move to DLQ
        await this.handleDeadLetter(msg, err);
        msg.ack(); // Ack to prevent further redelivery
      } else {
        // NAK for redelivery with backoff
        msg.nak(this.calculateBackoff(msg.info.redeliveryCount));
      }
    }
  }

  protected calculateBackoff(redeliveryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, redeliveryCount), 16000);
  }

  protected async handleDeadLetter(msg: JsMsg, error: unknown): Promise<void> {
    console.error(
      `[Consumer:${this.consumerOptions.durableName}] Message moved to DLQ after ${msg.info.redeliveryCount + 1} attempts`
    );
    // Subclasses can override to publish to DLQ stream
  }

  /**
   * Override this method to handle messages.
   */
  protected abstract handleMessage(message: ProcessedMessage<BaseEvent>): Promise<void>;

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  async getStatus(): Promise<{
    isRunning: boolean;
    pending: number;
    delivered: number;
    ackPending: number;
    redelivered: number;
  }> {
    if (!this.jsm) {
      return {
        isRunning: this.isRunning,
        pending: 0,
        delivered: 0,
        ackPending: 0,
        redelivered: 0,
      };
    }

    try {
      const info = await this.jsm.consumers.info(
        this.consumerOptions.stream,
        this.consumerOptions.durableName
      );

      return {
        isRunning: this.isRunning,
        pending: info.num_pending,
        delivered: info.delivered.consumer_seq,
        ackPending: info.num_ack_pending,
        redelivered: info.num_redelivered,
      };
    } catch {
      return {
        isRunning: this.isRunning,
        pending: 0,
        delivered: 0,
        ackPending: 0,
        redelivered: 0,
      };
    }
  }
}
