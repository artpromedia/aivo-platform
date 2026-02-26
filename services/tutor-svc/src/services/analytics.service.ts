/**
 * Tutor Analytics Event Emitter
 *
 * Publishes internal usage-tracking events to NATS JetStream for the
 * analytics pipeline. These events are consumed by the analytics-svc
 * and data warehouse for dashboards and reporting.
 *
 * Events:
 * - tutor.session.started  — emitted when a new session is created
 * - tutor.session.ended    — emitted when a session completes or is abandoned
 * - tutor.message.sent     — emitted for each learner or assistant message
 */

import { config } from '../config.js';

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface TutorSessionStartedEvent {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  subject: string;
  personaSlug: string;
  locale: string;
  startedAt: string;
}

export interface TutorSessionEndedEvent {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  subject: string;
  personaSlug: string;
  locale: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  messageCount: number;
  status: string;
  topic?: string;
}

export interface TutorMessageSentEvent {
  sessionId: string;
  messageId: string;
  learnerId: string;
  tenantId: string;
  role: string;
  subject: string;
  locale: string;
  emotionTag?: string;
  contentLength: number;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// NATS CONNECTION (lazy, shared with notification.service.ts)
// ══════════════════════════════════════════════════════════════════════════════

interface NatsLike {
  publish(subject: string, data: Uint8Array): void;
}

let natsConnection: NatsLike | null = null;

async function getNatsConnection(): Promise<NatsLike | null> {
  if (!config.nats.enabled) return null;
  if (natsConnection) return natsConnection;

  try {
    const { connect } = await import('nats');
    const nc = await connect({ servers: config.nats.url, name: 'tutor-svc-analytics' });
    natsConnection = nc;
    console.log('[tutor-analytics] Connected to NATS at', config.nats.url);
    return nc;
  } catch (error) {
    console.warn('[tutor-analytics] NATS connection failed, events disabled:', error);
    return null;
  }
}

function encode(payload: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload));
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Emit when a new tutor session is started.
 */
export async function trackSessionStarted(
  event: TutorSessionStartedEvent,
): Promise<void> {
  const nc = await getNatsConnection();
  if (!nc) return;

  try {
    nc.publish('aivo.tutor.session.started', encode({
      type: 'tutor.session.started',
      timestamp: new Date().toISOString(),
      ...event,
    }));
  } catch (error) {
    console.error('[tutor-analytics] Failed to emit session.started:', error);
  }
}

/**
 * Emit when a tutor session ends (completed, abandoned, or timed out).
 */
export async function trackSessionEnded(
  event: TutorSessionEndedEvent,
): Promise<void> {
  const nc = await getNatsConnection();
  if (!nc) return;

  try {
    nc.publish('aivo.tutor.session.ended', encode({
      type: 'tutor.session.ended',
      timestamp: new Date().toISOString(),
      ...event,
    }));
  } catch (error) {
    console.error('[tutor-analytics] Failed to emit session.ended:', error);
  }
}

/**
 * Emit when a message is sent in a tutor session (learner or assistant).
 */
export async function trackMessageSent(
  event: TutorMessageSentEvent,
): Promise<void> {
  const nc = await getNatsConnection();
  if (!nc) return;

  try {
    nc.publish('aivo.tutor.message.sent', encode({
      type: 'tutor.message.sent',
      timestamp: new Date().toISOString(),
      ...event,
    }));
  } catch (error) {
    console.error('[tutor-analytics] Failed to emit message.sent:', error);
  }
}
