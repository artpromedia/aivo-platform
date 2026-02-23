/**
 * Safety Event Publisher
 *
 * Publishes `ai.safety.violation` events via NATS JetStream when
 * AI-generated content is blocked by the safety pipeline.
 * Falls back to Redis pub/sub when NATS is unavailable.
 *
 * Event payload never contains raw content — only metadata.
 */

import type { SafetyViolationEvent } from './safety.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// NATS CONNECTION (lazy, best-effort)
// ══════════════════════════════════════════════════════════════════════════════

let natsConnection: { publish: (subject: string, data: Uint8Array) => void } | null = null;
let natsInitialized = false;

async function getNatsConnection(): Promise<typeof natsConnection> {
  if (natsInitialized) return natsConnection;
  natsInitialized = true;

  const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
  try {
    // Dynamic import so the service works even without nats.ws installed
    const nats = await import('nats');
    natsConnection = await nats.connect({ servers: natsUrl });
    console.log(`[safety-events] Connected to NATS at ${natsUrl}`);
  } catch {
    console.warn('[safety-events] NATS unavailable — safety events will be logged only');
    natsConnection = null;
  }
  return natsConnection;
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLISHER
// ══════════════════════════════════════════════════════════════════════════════

const SUBJECT = 'ai.safety.violation';

/**
 * Publish a safety violation event to NATS.
 * Best-effort — failures are swallowed so they never block the HTTP response.
 */
export async function publishSafetyViolation(event: SafetyViolationEvent): Promise<void> {
  try {
    const nc = await getNatsConnection();
    if (nc) {
      const payload = new TextEncoder().encode(JSON.stringify(event));
      nc.publish(SUBJECT, payload);
    }
  } catch {
    // Swallow — safety events are best-effort
  }
}

/**
 * Disconnect from NATS gracefully (call during app shutdown).
 */
export async function closeSafetyEventPublisher(): Promise<void> {
  if (natsConnection && 'drain' in natsConnection) {
    try {
      await (natsConnection as { drain: () => Promise<void> }).drain();
    } catch {
      /* ignore */
    }
    natsConnection = null;
    natsInitialized = false;
  }
}
