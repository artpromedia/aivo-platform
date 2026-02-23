/**
 * xAPI Event Bridge — Maps AIVO NATS events to xAPI statements.
 *
 * Subscribes to NATS subjects:
 *   - session.completed
 *   - session.started
 *   - assessment.submitted
 *   - lesson.completed
 *
 * For each event, maps the payload to an xAPI 1.0.3 statement and
 * persists it via XapiService. External LRSes can then query
 * /xapi/statements to consume the learning records.
 */

import type { PrismaClient } from '../../generated/prisma-client/index.js';
import { XapiService } from './xapi.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// EVENT PAYLOAD TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface AivoEvent {
  tenantId: string;
  userId: string;
  userEmail?: string;
  activityId: string;
  activityName?: string;
  activityType?: string;
  sessionId?: string;
  score?: number;
  maxScore?: number;
  success?: boolean;
  duration?: string;
  metadata?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// NATS SUBJECTS WE SUBSCRIBE TO
// ══════════════════════════════════════════════════════════════════════════════

const SUBSCRIBED_SUBJECTS = [
  'session.completed',
  'session.started',
  'assessment.submitted',
  'lesson.completed',
];

// ══════════════════════════════════════════════════════════════════════════════
// BRIDGE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Start the NATS → xAPI event bridge.
 *
 * Connects to NATS, subscribes to learning event subjects, and maps
 * each event to an xAPI statement stored via Prisma.
 *
 * @param prisma – PrismaClient instance (shared with server)
 * @param natsUrl – NATS connection URL (e.g. nats://localhost:4222)
 */
export async function startXapiEventBridge(
  prisma: PrismaClient,
  natsUrl: string
): Promise<{ stop: () => Promise<void> }> {
  const xapi = new XapiService(prisma);

  // Lazy-import NATS client (may not be installed in all environments)
  let nc: NatsConnection;
  try {
    const nats = await import('nats');
    nc = await nats.connect({ servers: natsUrl });
    console.log(`[xAPI EventBridge] Connected to NATS at ${natsUrl}`);
  } catch (err) {
    console.warn(
      '[xAPI EventBridge] NATS unavailable — event bridge disabled. ' +
        'Statements can still be stored via REST.',
      (err as Error).message
    );
    return { stop: async () => {} };
  }

  // Subscribe to each subject
  const subs: Subscription[] = [];
  for (const subject of SUBSCRIBED_SUBJECTS) {
    const sub = nc.subscribe(subject);
    subs.push(sub);

    // Process messages in background
    (async () => {
      for await (const msg of sub) {
        try {
          const jc = JSONCodec();
          const event = jc.decode(msg.data) as AivoEvent;

          await xapi.mapAndStoreEvent(subject, event.tenantId, {
            userId: event.userId,
            userEmail: event.userEmail,
            activityId: event.activityId,
            activityName: event.activityName,
            activityType: event.activityType,
            score: event.score,
            maxScore: event.maxScore,
            success: event.success,
            duration: event.duration,
            sessionId: event.sessionId,
          });
        } catch (err) {
          console.error(`[xAPI EventBridge] Error processing ${subject}:`, err);
        }
      }
    })();
  }

  console.log(`[xAPI EventBridge] Subscribed to: ${SUBSCRIBED_SUBJECTS.join(', ')}`);

  return {
    stop: async () => {
      for (const s of subs) s.unsubscribe();
      await nc.drain();
      console.log('[xAPI EventBridge] Disconnected from NATS');
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// NATS TYPE STUBS — avoids hard dependency on nats package types
// ══════════════════════════════════════════════════════════════════════════════

interface NatsConnection {
  subscribe(subject: string): Subscription;
  drain(): Promise<void>;
}

interface Subscription {
  unsubscribe(): void;
  [Symbol.asyncIterator](): AsyncIterator<NatsMsg>;
}

interface NatsMsg {
  data: Uint8Array;
}

function JSONCodec() {
  return {
    decode(data: Uint8Array): unknown {
      return JSON.parse(new TextDecoder().decode(data));
    },
    encode(value: unknown): Uint8Array {
      return new TextEncoder().encode(JSON.stringify(value));
    },
  };
}
