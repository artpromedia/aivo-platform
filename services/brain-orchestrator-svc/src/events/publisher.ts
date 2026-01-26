import { connect, NatsConnection, JSONCodec } from 'nats';
import { config } from '../config.js';

export type BrainEventType =
  | 'brain.plan_created'
  | 'brain.plan_started'
  | 'brain.plan_paused'
  | 'brain.plan_resumed'
  | 'brain.plan_cancelled'
  | 'brain.plan_completed'
  | 'brain.plan_adjusted'
  | 'brain.task_assigned'
  | 'brain.task_started'
  | 'brain.task_completed'
  | 'brain.task_failed'
  | 'brain.break_recommended'
  | 'brain.break_started'
  | 'brain.break_ended'
  | 'brain.path_adjusted'
  | 'brain.path_optimized'
  | 'brain.mastery_updated'
  | 'brain.mastery_milestone'
  | 'brain.cognitive_state_changed'
  | 'brain.fatigue_detected'
  | 'brain.disengagement_detected'
  | 'brain.activity_completed';

export interface BrainEvent {
  type: BrainEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

let natsConnection: NatsConnection | null = null;
const jsonCodec = JSONCodec<BrainEvent>();

/**
 * Initialize NATS connection
 */
export async function initNats(): Promise<void> {
  if (natsConnection) {
    return;
  }

  try {
    natsConnection = await connect({
      servers: config.natsUrl,
      name: 'brain-orchestrator-svc',
      reconnect: true,
      maxReconnectAttempts: -1, // Infinite
      reconnectTimeWait: 2000,
    });

    console.log(`Connected to NATS at ${config.natsUrl}`);

    // Handle connection events
    (async () => {
      for await (const status of natsConnection!.status()) {
        console.log(`NATS status: ${status.type}`);
      }
    })();
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
    natsConnection = null;
  }
}

/**
 * Publish a brain event
 */
export async function publishEvent(
  type: BrainEventType,
  data: Record<string, unknown>
): Promise<void> {
  // Log event in development mode
  if (process.env.NODE_ENV === 'development' && !natsConnection) {
    console.log(`[Event] ${type}:`, JSON.stringify(data));
    return;
  }

  if (!natsConnection) {
    console.warn(`Cannot publish event ${type}: NATS not connected`);
    return;
  }

  const event: BrainEvent = {
    type,
    timestamp: new Date().toISOString(),
    data,
  };

  const subject = `aivo.brain.${type.replace('brain.', '')}`;

  try {
    natsConnection.publish(subject, jsonCodec.encode(event));
  } catch (error) {
    console.error(`Failed to publish event ${type}:`, error);
  }
}

/**
 * Publish plan created event
 */
export async function publishPlanCreated(
  planId: string,
  learnerId: string,
  tenantId: string,
  goal: Record<string, unknown>
): Promise<void> {
  await publishEvent('brain.plan_created', {
    planId,
    learnerId,
    tenantId,
    goal,
  });
}

/**
 * Publish task assigned event
 */
export async function publishTaskAssigned(
  planId: string,
  taskId: string,
  learnerId: string,
  taskType: string
): Promise<void> {
  await publishEvent('brain.task_assigned', {
    planId,
    taskId,
    learnerId,
    taskType,
  });
}

/**
 * Publish break recommended event
 */
export async function publishBreakRecommended(
  learnerId: string,
  sessionId: string,
  urgency: string,
  suggestedDuration: number
): Promise<void> {
  await publishEvent('brain.break_recommended', {
    learnerId,
    sessionId,
    urgency,
    suggestedDuration,
  });
}

/**
 * Publish mastery milestone event
 */
export async function publishMasteryMilestone(
  learnerId: string,
  skillId: string,
  milestone: number,
  level: number
): Promise<void> {
  await publishEvent('brain.mastery_milestone', {
    learnerId,
    skillId,
    milestone,
    level,
  });
}

/**
 * Publish fatigue detected event
 */
export async function publishFatigueDetected(
  learnerId: string,
  sessionId: string,
  fatigueLevel: number,
  recommendation: string
): Promise<void> {
  await publishEvent('brain.fatigue_detected', {
    learnerId,
    sessionId,
    fatigueLevel,
    recommendation,
  });
}

/**
 * Publish disengagement detected event
 */
export async function publishDisengagementDetected(
  learnerId: string,
  sessionId: string,
  severity: string,
  indicators: string[]
): Promise<void> {
  await publishEvent('brain.disengagement_detected', {
    learnerId,
    sessionId,
    severity,
    indicators,
  });
}

/**
 * Get NATS connection status
 */
export function isNatsConnected(): boolean {
  return natsConnection !== null && !natsConnection.isClosed();
}
