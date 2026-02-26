/**
 * Tutor Notification Service
 *
 * Publishes notification events to NATS for the notify-svc to consume
 * and deliver to parents. Handles:
 * - Session completed notifications
 * - Mastery milestone notifications
 * - Weekly summary triggers
 */

import { config } from '../config.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface TutorSessionCompletedPayload {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  subject: string;
  personaName: string;
  durationMinutes: number;
  messageCount: number;
  topic?: string;
}

export interface TutorMasteryMilestonePayload {
  learnerId: string;
  tenantId: string;
  subject: string;
  milestone: string;
  sessionsCompleted: number;
}

export interface TutorWeeklySummaryPayload {
  learnerId: string;
  tenantId: string;
  totalSessions: number;
  totalMinutes: number;
  subjects: string[];
  periodStart: string;
  periodEnd: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// NATS CONNECTION (lazy singleton)
// ══════════════════════════════════════════════════════════════════════════════

let natsConnection: NatsLike | null = null;

interface NatsLike {
  publish(subject: string, data: Uint8Array): void;
  close(): Promise<void>;
}

async function getNatsConnection(): Promise<NatsLike | null> {
  if (!config.nats.enabled) return null;
  if (natsConnection) return natsConnection;

  try {
    // Dynamic import so NATS dependency is optional
    const { connect, JSONCodec } = await import('nats');
    const nc = await connect({ servers: config.nats.url, name: 'tutor-svc' });
    natsConnection = nc;
    console.log('[tutor-svc] Connected to NATS at', config.nats.url);
    return nc;
  } catch (error) {
    console.warn('[tutor-svc] NATS connection failed, notifications disabled:', error);
    return null;
  }
}

function encodePayload(payload: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload));
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Notify that a tutor session has completed.
 * The notify-svc will deliver this to the parent's configured channels.
 */
export async function emitSessionCompleted(
  payload: TutorSessionCompletedPayload,
): Promise<void> {
  const nc = await getNatsConnection();
  if (!nc) return;

  try {
    nc.publish(
      'aivo.tutor.session.completed',
      encodePayload({
        type: 'tutor.session.completed',
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    );
  } catch (error) {
    console.error('[tutor-svc] Failed to emit session.completed:', error);
  }
}

/**
 * Notify that a learner reached a mastery milestone in a subject.
 */
export async function emitMasteryMilestone(
  payload: TutorMasteryMilestonePayload,
): Promise<void> {
  const nc = await getNatsConnection();
  if (!nc) return;

  try {
    nc.publish(
      'aivo.tutor.mastery.milestone',
      encodePayload({
        type: 'tutor.mastery.milestone',
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    );
  } catch (error) {
    console.error('[tutor-svc] Failed to emit mastery.milestone:', error);
  }
}

/**
 * Trigger a weekly tutor summary for a learner.
 */
export async function emitWeeklySummary(
  payload: TutorWeeklySummaryPayload,
): Promise<void> {
  const nc = await getNatsConnection();
  if (!nc) return;

  try {
    nc.publish(
      'aivo.tutor.weekly.summary',
      encodePayload({
        type: 'tutor.weekly.summary',
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    );
  } catch (error) {
    console.error('[tutor-svc] Failed to emit weekly.summary:', error);
  }
}

/**
 * Close the NATS connection gracefully.
 */
export async function closeNotificationService(): Promise<void> {
  if (natsConnection) {
    await natsConnection.close();
    natsConnection = null;
  }
}
