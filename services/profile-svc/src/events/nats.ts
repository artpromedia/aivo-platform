/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * NATS JetStream Client for Profile Service
 *
 * Handles event publishing to NATS JetStream for profile and accommodation changes.
 * Events are used by other services (AI orchestrator, analytics, notifications).
 */

import type { JetStreamManager, JetStreamClient, NatsConnection } from 'nats';
import { connect, StringCodec } from 'nats';

import { config } from '../config.js';

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ProfileEvent {
  type: 'profile.created' | 'profile.updated';
  tenantId: string;
  learnerId: string;
  userId: string;
  timestamp: string;
  data: {
    profileId: string;
    changes?: string[];
  };
}

export interface AccommodationEvent {
  type: 'accommodation.created' | 'accommodation.updated' | 'accommodation.deleted';
  tenantId: string;
  learnerId: string;
  userId: string;
  timestamp: string;
  data: {
    accommodationId: string;
    category?: string;
    isCritical?: boolean;
    changes?: string[];
  };
}

export type ProfileServiceEvent = ProfileEvent | AccommodationEvent;

// ══════════════════════════════════════════════════════════════════════════════
// NATS CLIENT
// ══════════════════════════════════════════════════════════════════════════════

class NatsEventPublisher {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private sc = StringCodec();
  private streamName: string;
  private initialized = false;
  private initializing = false;

  constructor() {
    this.streamName = config.natsStream;
  }

  /**
   * Initialize the NATS connection and JetStream
   */
  async initialize(): Promise<void> {
    if (this.initialized || this.initializing) return;
    this.initializing = true;

    try {
      console.log(`[NATS] Connecting to ${config.natsUrl}...`);

      this.nc = await connect({
        servers: config.natsUrl,
        name: 'profile-svc',
        reconnect: true,
        maxReconnectAttempts: 10,
        reconnectTimeWait: 2000,
      });

      console.log(`[NATS] Connected to ${this.nc.getServer()}`);

      // Get JetStream manager and client
      this.jsm = await this.nc.jetstreamManager();
      this.js = this.nc.jetstream();

      // Ensure stream exists
      await this.ensureStream();

      this.initialized = true;
      console.log('[NATS] Event publisher initialized');

      // Handle connection events
      this.handleConnectionEvents();
    } catch (error) {
      console.error('[NATS] Failed to initialize:', error);
      this.initializing = false;
      throw error;
    }
  }

  /**
   * Ensure the JetStream stream exists
   */
  private async ensureStream(): Promise<void> {
    if (!this.jsm) return;

    try {
      // Try to get existing stream
      await this.jsm.streams.info(this.streamName);
      console.log(`[NATS] Stream '${this.streamName}' already exists`);
    } catch {
      // Create stream if it doesn't exist
      console.log(`[NATS] Creating stream '${this.streamName}'...`);
      await this.jsm.streams.add({
        name: this.streamName,
        subjects: ['profile.>', 'accommodation.>'],
        retention: 'limits' as const,
        max_msgs: 100000,
        max_age: 7 * 24 * 60 * 60 * 1e9, // 7 days in nanoseconds
        storage: 'file' as const,
        discard: 'old' as const,
        num_replicas: 1,
      });
      console.log(`[NATS] Stream '${this.streamName}' created`);
    }
  }

  /**
   * Handle connection lifecycle events
   */
  private handleConnectionEvents(): void {
    if (!this.nc) return;

    (async () => {
      for await (const status of this.nc!.status()) {
        switch (status.type) {
          case 'disconnect':
            console.warn('[NATS] Disconnected from server');
            break;
          case 'reconnect':
            console.log('[NATS] Reconnected to server');
            break;
          case 'error':
            console.error('[NATS] Connection error:', status.data);
            break;
        }
      }
    })().catch((err: unknown) => {
      console.error('[NATS] Status handler error:', err);
    });
  }

  /**
   * Publish an event to NATS JetStream
   */
  async publish(event: ProfileServiceEvent): Promise<void> {
    if (!this.initialized || !this.js) {
      console.warn('[NATS] Not initialized, skipping event publish:', event.type);
      return;
    }

    try {
      const subject = event.type.replace('.', '.');
      const payload = this.sc.encode(JSON.stringify(event));

      const pubAck = await this.js.publish(subject, payload, {
        msgID: `${event.type}-${event.tenantId}-${Date.now()}`,
      });

      console.log(`[NATS] Published ${event.type} to stream ${pubAck.stream}, seq ${pubAck.seq}`);
    } catch (error) {
      console.error(`[NATS] Failed to publish ${event.type}:`, error);
      // Don't throw - event publishing should not break the main operation
    }
  }

  /**
   * Close the NATS connection
   */
  async close(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      console.log('[NATS] Connection closed');
    }
  }

  /**
   * Check if the publisher is ready
   */
  isReady(): boolean {
    return this.initialized && this.nc !== null && !this.nc.isClosed();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const natsPublisher = new NatsEventPublisher();

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Emit a profile created event
 */
export async function emitProfileCreated(
  tenantId: string,
  learnerId: string,
  profileId: string,
  userId: string
): Promise<void> {
  await natsPublisher.publish({
    type: 'profile.created',
    tenantId,
    learnerId,
    userId,
    timestamp: new Date().toISOString(),
    data: { profileId },
  });
}

/**
 * Emit a profile updated event
 */
export async function emitProfileUpdated(
  tenantId: string,
  learnerId: string,
  profileId: string,
  userId: string,
  changes?: string[]
): Promise<void> {
  await natsPublisher.publish({
    type: 'profile.updated',
    tenantId,
    learnerId,
    userId,
    timestamp: new Date().toISOString(),
    data: { profileId, changes },
  });
}

/**
 * Emit an accommodation created event
 */
export async function emitAccommodationCreated(
  tenantId: string,
  learnerId: string,
  accommodationId: string,
  userId: string,
  category?: string,
  isCritical?: boolean
): Promise<void> {
  await natsPublisher.publish({
    type: 'accommodation.created',
    tenantId,
    learnerId,
    userId,
    timestamp: new Date().toISOString(),
    data: { accommodationId, category, isCritical },
  });
}

/**
 * Emit an accommodation updated event
 */
export async function emitAccommodationUpdated(
  tenantId: string,
  learnerId: string,
  accommodationId: string,
  userId: string,
  changes?: string[]
): Promise<void> {
  await natsPublisher.publish({
    type: 'accommodation.updated',
    tenantId,
    learnerId,
    userId,
    timestamp: new Date().toISOString(),
    data: { accommodationId, changes },
  });
}

/**
 * Emit an accommodation deleted event
 */
export async function emitAccommodationDeleted(
  tenantId: string,
  learnerId: string,
  accommodationId: string,
  userId: string
): Promise<void> {
  await natsPublisher.publish({
    type: 'accommodation.deleted',
    tenantId,
    learnerId,
    userId,
    timestamp: new Date().toISOString(),
    data: { accommodationId },
  });
}
