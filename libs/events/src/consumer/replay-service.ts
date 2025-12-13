// =============================================================================
// @aivo/events - Event Replay Service
// =============================================================================
//
// Internal API for replaying events from JetStream streams.
// Used for debugging, backfilling, and recovery.

import {
  connect,
  NatsConnection,
  JetStreamClient,
  JetStreamManager,
  StringCodec,
  DeliverPolicy,
  ConsumerConfig,
  AckPolicy,
} from 'nats';
import type { BaseEvent } from '../schemas';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ReplayServiceConfig {
  /** NATS server URLs */
  servers: string | string[];
  /** Connection name */
  name?: string;
  /** TLS enabled */
  tls?: boolean;
  /** Auth token */
  token?: string;
  /** Username */
  user?: string;
  /** Password */
  pass?: string;
}

export interface ReplayOptions {
  /** Stream to replay from */
  stream: string;
  /** Filter by subject (optional) */
  filterSubject?: string;
  /** Start sequence (optional, defaults to first) */
  startSequence?: number;
  /** Start time (optional) */
  startTime?: Date;
  /** End sequence (optional) */
  endSequence?: number;
  /** End time (optional) */
  endTime?: Date;
  /** Filter by tenant ID (optional) */
  tenantId?: string;
  /** Filter by event type (optional) */
  eventType?: string;
  /** Maximum events to replay */
  maxEvents?: number;
  /** Replay speed multiplier (1 = real-time, 0 = instant) */
  speedMultiplier?: number;
}

export interface ReplayResult {
  /** Number of events replayed */
  eventsReplayed: number;
  /** First sequence replayed */
  firstSequence: number;
  /** Last sequence replayed */
  lastSequence: number;
  /** Replay duration in ms */
  durationMs: number;
  /** Errors encountered */
  errors: Array<{
    sequence: number;
    error: string;
  }>;
}

export interface StreamInfo {
  name: string;
  subjects: string[];
  messages: number;
  bytes: number;
  firstSeq: number;
  lastSeq: number;
  firstTime?: Date;
  lastTime?: Date;
}

export interface MessageInfo {
  sequence: number;
  subject: string;
  timestamp: Date;
  event: BaseEvent;
}

// -----------------------------------------------------------------------------
// Event Replay Service
// -----------------------------------------------------------------------------

export class EventReplayService {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private sc = StringCodec();

  constructor(private readonly config: ReplayServiceConfig) {}

  async connect(): Promise<void> {
    if (this.nc && !this.nc.isClosed()) {
      return;
    }

    const servers = Array.isArray(this.config.servers)
      ? this.config.servers
      : this.config.servers.split(',').map(s => s.trim());

    this.nc = await connect({
      servers,
      name: this.config.name ?? 'event-replay-service',
      tls: this.config.tls ? {} : undefined,
      token: this.config.token,
      user: this.config.user,
      pass: this.config.pass,
    });

    this.js = this.nc.jetstream();
    this.jsm = await this.nc.jetstreamManager();
  }

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
  // Stream Info
  // ---------------------------------------------------------------------------

  async listStreams(): Promise<StreamInfo[]> {
    await this.connect();
    
    const streams: StreamInfo[] = [];
    const lister = this.jsm!.streams.list();
    
    for await (const si of lister) {
      streams.push({
        name: si.config.name,
        subjects: si.config.subjects ?? [],
        messages: si.state.messages,
        bytes: si.state.bytes,
        firstSeq: si.state.first_seq,
        lastSeq: si.state.last_seq,
        firstTime: si.state.first_ts ? new Date(si.state.first_ts) : undefined,
        lastTime: si.state.last_ts ? new Date(si.state.last_ts) : undefined,
      });
    }
    
    return streams;
  }

  async getStreamInfo(streamName: string): Promise<StreamInfo | null> {
    await this.connect();
    
    try {
      const si = await this.jsm!.streams.info(streamName);
      return {
        name: si.config.name,
        subjects: si.config.subjects ?? [],
        messages: si.state.messages,
        bytes: si.state.bytes,
        firstSeq: si.state.first_seq,
        lastSeq: si.state.last_seq,
        firstTime: si.state.first_ts ? new Date(si.state.first_ts) : undefined,
        lastTime: si.state.last_ts ? new Date(si.state.last_ts) : undefined,
      };
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Message Retrieval
  // ---------------------------------------------------------------------------

  async getMessage(stream: string, sequence: number): Promise<MessageInfo | null> {
    await this.connect();
    
    try {
      const sm = await this.jsm!.streams.getMessage(stream, { seq: sequence });
      const data = this.sc.decode(sm.data);
      const event = JSON.parse(data) as BaseEvent;
      
      return {
        sequence: sm.seq,
        subject: sm.subject,
        timestamp: new Date(sm.time),
        event,
      };
    } catch {
      return null;
    }
  }

  async getMessages(
    stream: string,
    startSeq: number,
    count: number
  ): Promise<MessageInfo[]> {
    await this.connect();
    
    const messages: MessageInfo[] = [];
    
    // Create ephemeral consumer starting at sequence
    const consumerConfig: Partial<ConsumerConfig> = {
      ack_policy: AckPolicy.None,
      deliver_policy: DeliverPolicy.StartSequence,
      opt_start_seq: startSeq,
      max_deliver: 1,
      inactive_threshold: 10_000_000_000, // 10 seconds in nanoseconds
    };

    const consumer = await this.jsm!.consumers.add(stream, consumerConfig);
    const sub = await this.js!.consumers.get(stream, consumer.name);
    
    try {
      const iter = await sub.consume({ max_messages: count });
      
      for await (const msg of iter) {
        const data = this.sc.decode(msg.data);
        const event = JSON.parse(data) as BaseEvent;
        
        messages.push({
          sequence: msg.seq,
          subject: msg.subject,
          timestamp: new Date(msg.info.timestampNanos / 1_000_000),
          event,
        });
        
        if (messages.length >= count) {
          break;
        }
      }
    } finally {
      await this.jsm!.consumers.delete(stream, consumer.name);
    }
    
    return messages;
  }

  // ---------------------------------------------------------------------------
  // Event Replay
  // ---------------------------------------------------------------------------

  async replay(
    options: ReplayOptions,
    handler: (event: BaseEvent, sequence: number) => Promise<void>
  ): Promise<ReplayResult> {
    await this.connect();
    
    const startTime = Date.now();
    const errors: ReplayResult['errors'] = [];
    let eventsReplayed = 0;
    let firstSequence = 0;
    let lastSequence = 0;

    // Build consumer config based on options
    const consumerConfig: Partial<ConsumerConfig> = {
      ack_policy: AckPolicy.None,
      max_deliver: 1,
      inactive_threshold: 30_000_000_000, // 30 seconds
    };

    if (options.filterSubject) {
      consumerConfig.filter_subject = options.filterSubject;
    }

    if (options.startSequence) {
      consumerConfig.deliver_policy = DeliverPolicy.StartSequence;
      consumerConfig.opt_start_seq = options.startSequence;
    } else if (options.startTime) {
      consumerConfig.deliver_policy = DeliverPolicy.StartTime;
      consumerConfig.opt_start_time = options.startTime.toISOString();
    } else {
      consumerConfig.deliver_policy = DeliverPolicy.All;
    }

    const consumer = await this.jsm!.consumers.add(options.stream, consumerConfig);
    const sub = await this.js!.consumers.get(options.stream, consumer.name);

    try {
      const maxEvents = options.maxEvents ?? Infinity;
      const iter = await sub.consume({ max_messages: Math.min(maxEvents, 10000) });
      
      let prevTimestamp: number | undefined;

      for await (const msg of iter) {
        // Check end conditions
        if (options.endSequence && msg.seq > options.endSequence) {
          break;
        }

        const msgTime = new Date(msg.info.timestampNanos / 1_000_000);
        if (options.endTime && msgTime > options.endTime) {
          break;
        }

        if (eventsReplayed >= maxEvents) {
          break;
        }

        try {
          const data = this.sc.decode(msg.data);
          const event = JSON.parse(data) as BaseEvent;

          // Filter by tenant if specified
          if (options.tenantId && event.tenantId !== options.tenantId) {
            continue;
          }

          // Filter by event type if specified
          if (options.eventType && event.eventType !== options.eventType) {
            continue;
          }

          // Apply speed multiplier for real-time replay
          if (options.speedMultiplier && options.speedMultiplier > 0 && prevTimestamp) {
            const delay = (msgTime.getTime() - prevTimestamp) / options.speedMultiplier;
            if (delay > 0 && delay < 60000) {
              await this.sleep(delay);
            }
          }
          prevTimestamp = msgTime.getTime();

          // Handle event
          await handler(event, msg.seq);

          // Track progress
          if (firstSequence === 0) {
            firstSequence = msg.seq;
          }
          lastSequence = msg.seq;
          eventsReplayed++;

        } catch (err) {
          errors.push({
            sequence: msg.seq,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } finally {
      await this.jsm!.consumers.delete(options.stream, consumer.name);
    }

    return {
      eventsReplayed,
      firstSequence,
      lastSequence,
      durationMs: Date.now() - startTime,
      errors,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------------------
  // Republish (for backfilling new consumers)
  // ---------------------------------------------------------------------------

  async republish(
    options: ReplayOptions,
    targetSubject: string
  ): Promise<ReplayResult> {
    return this.replay(options, async (event, _sequence) => {
      if (!this.js) {
        throw new Error('JetStream not connected');
      }
      
      const data = this.sc.encode(JSON.stringify(event));
      await this.js.publish(targetSubject, data);
    });
  }
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

export function createEventReplayService(config: ReplayServiceConfig): EventReplayService {
  return new EventReplayService(config);
}
