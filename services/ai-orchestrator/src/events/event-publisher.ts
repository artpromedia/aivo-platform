/**
 * AI Orchestrator Event Publisher
 *
 * Publishes AI events to Redis pub/sub (and future NATS JetStream)
 * for consumption by other services.
 *
 * Events published:
 * - ai.recommendation.created - Learning recommendation generated
 * - ai.incident.created - Safety incident detected
 * - ai.concern.reported - Teacher reported AI concern
 * - ai.session.completed - AI session completed
 */

import { createClient, type RedisClientType } from 'redis';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AiEvent {
  eventType: string;
  tenantId: string;
  learnerId?: string;
  userId?: string;
  correlationId?: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface RecommendationEvent {
  type:
    | 'MASTERY_ADVANCE'
    | 'DIFFICULTY_CHANGE'
    | 'SKILL_REVIEW'
    | 'FOCUS_INTERVENTION'
    | 'PRACTICE_MORE';
  subject: string;
  skill: string;
  fromValue: number;
  toValue: number;
  confidence: number;
  reason: string;
}

export interface ConcernReportEvent {
  reportId: string;
  interactionId: string;
  teacherId: string;
  concernType: string;
  description: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const CHANNEL_PREFIX = process.env.AI_EVENT_CHANNEL_PREFIX ?? 'ai-events';
const EVENT_BUS_ENABLED = process.env.AI_EVENT_BUS_ENABLED !== 'false';

// ══════════════════════════════════════════════════════════════════════════════
// EVENT BUS CLIENT
// ══════════════════════════════════════════════════════════════════════════════

let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Initialize the event bus connection
 */
export async function initializeEventBus(): Promise<void> {
  if (!EVENT_BUS_ENABLED) {
    console.log('[AiEventBus] Event bus disabled via configuration');
    return;
  }

  if (redisClient && isConnected) {
    return;
  }

  try {
    redisClient = createClient({
      url: REDIS_URL,
    });

    redisClient.on('error', (err) => {
      console.error('[AiEventBus] Redis client error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[AiEventBus] Connected to Redis');
      isConnected = true;
    });

    redisClient.on('reconnecting', () => {
      console.log('[AiEventBus] Reconnecting to Redis...');
    });

    await redisClient.connect();
  } catch (error) {
    console.error('[AiEventBus] Failed to initialize:', error);
    // Don't throw - event bus failure shouldn't block core AI processing
  }
}

/**
 * Publish an event to the event bus
 */
export async function publishEvent(event: AiEvent): Promise<boolean> {
  if (!EVENT_BUS_ENABLED) {
    // Log for debugging in dev mode
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AiEventBus] Event (disabled):', event.eventType, event.payload);
    }
    return false;
  }

  if (!redisClient || !isConnected) {
    console.warn('[AiEventBus] Not connected, event will not be published', {
      eventType: event.eventType,
    });
    return false;
  }

  const channel = `${CHANNEL_PREFIX}:${event.eventType}`;

  try {
    const message = JSON.stringify({
      ...event,
      publishedAt: new Date().toISOString(),
    });

    await redisClient.publish(channel, message);

    console.log('[AiEventBus] Published event', {
      channel,
      eventType: event.eventType,
      tenantId: event.tenantId,
    });

    return true;
  } catch (error) {
    console.error('[AiEventBus] Failed to publish event:', error);
    return false;
  }
}

/**
 * Close the event bus connection
 */
export async function closeEventBus(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    console.log('[AiEventBus] Connection closed');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Publish a recommendation created event
 */
export async function publishRecommendationEvent(
  tenantId: string,
  learnerId: string,
  recommendation: RecommendationEvent
): Promise<boolean> {
  return publishEvent({
    eventType: 'recommendation.created',
    tenantId,
    learnerId,
    timestamp: new Date().toISOString(),
    payload: {
      recommendationType: recommendation.type,
      subject: recommendation.subject,
      skill: recommendation.skill,
      fromValue: recommendation.fromValue,
      toValue: recommendation.toValue,
      confidence: recommendation.confidence,
      reason: recommendation.reason,
    },
  });
}

/**
 * Publish a teacher concern report event
 */
export async function publishConcernReportEvent(
  tenantId: string,
  concern: ConcernReportEvent
): Promise<boolean> {
  return publishEvent({
    eventType: 'concern.reported',
    tenantId,
    userId: concern.teacherId,
    timestamp: new Date().toISOString(),
    payload: {
      reportId: concern.reportId,
      interactionId: concern.interactionId,
      concernType: concern.concernType,
      description: concern.description,
    },
  });
}

/**
 * Publish an AI incident event
 */
export async function publishIncidentEvent(
  tenantId: string,
  incidentId: string,
  category: string,
  severity: string,
  learnerId?: string
): Promise<boolean> {
  return publishEvent({
    eventType: 'incident.created',
    tenantId,
    learnerId,
    timestamp: new Date().toISOString(),
    payload: {
      incidentId,
      category,
      severity,
    },
  });
}
