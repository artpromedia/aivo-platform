import { connect, JSONCodec } from 'nats';
import type { NatsConnection } from 'nats';

let natsConnection: NatsConnection | null = null;
const jsonCodec = JSONCodec();

// Event types
export type AssessmentEventType =
  | 'assessment.created'
  | 'assessment.updated'
  | 'assessment.published'
  | 'assessment.archived'
  | 'assessment.deleted'
  | 'assessment.cloned'
  | 'question.created'
  | 'question.updated'
  | 'question.deleted'
  | 'attempt.started'
  | 'attempt.submitted'
  | 'attempt.expired'
  | 'attempt.abandoned'
  | 'attempt.graded'
  | 'response.submitted'
  | 'response.graded';

export interface AssessmentEvent {
  type: AssessmentEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Initialize NATS connection
 */
export async function initNats(): Promise<void> {
  if (natsConnection) {
    return;
  }

  const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';

  try {
    natsConnection = await connect({
      servers: natsUrl,
      name: 'assessment-svc',
    });
    console.log(`Connected to NATS at ${natsUrl}`);
  } catch (error) {
    console.error('Failed to connect to NATS:', error);
    throw error;
  }
}

/**
 * Close NATS connection
 */
export async function closeNats(): Promise<void> {
  if (natsConnection) {
    await natsConnection.drain();
    await natsConnection.close();
    natsConnection = null;
  }
}

/**
 * Publish an event to NATS
 */
export async function publishEvent(
  type: AssessmentEventType,
  data: Record<string, unknown>
): Promise<void> {
  if (!natsConnection) {
    // In development, log but don't fail
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log(`[Event] ${type}:`, JSON.stringify(data));
      return;
    }
    throw new Error('NATS connection not initialized');
  }

  const event: AssessmentEvent = {
    type,
    timestamp: new Date().toISOString(),
    data,
  };

  const subject = `aivo.assessment.${type}`;

  try {
    natsConnection.publish(subject, jsonCodec.encode(event));
  } catch (error) {
    console.error(`Failed to publish event ${type}:`, error);
    throw error;
  }
}

/**
 * Get NATS connection status
 */
export function isNatsConnected(): boolean {
  return natsConnection !== null && !natsConnection.isClosed();
}
