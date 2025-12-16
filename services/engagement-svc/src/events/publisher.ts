/**
 * Engagement Event Publisher - NATS JetStream integration
 */

import { randomUUID } from 'node:crypto';

import type { EngagementEventType, Badge, Kudos, EngagementProfile } from '../prisma.js';

// Event types for engagement domain
export interface EngagementEventPayload {
  id: string;
  eventType: 'engagement.event';
  occurredAt: string;
  tenantId: string;
  data: {
    learnerId: string;
    engagementEventType: EngagementEventType;
    xpAwarded: number;
    newXpTotal: number;
    newLevel: number;
    leveledUp: boolean;
    streakDays: number;
    streakUpdated: boolean;
    sessionId?: string | undefined;
    taskId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
  };
}

export interface BadgeAwardedPayload {
  id: string;
  eventType: 'badge.awarded';
  occurredAt: string;
  tenantId: string;
  data: {
    learnerId: string;
    badgeCode: string;
    badgeName: string;
    badgeCategory: string;
    xpReward: number;
    source: string;
    awardedBy?: string | undefined;
    isNew: boolean;
  };
}

export interface KudosSentPayload {
  id: string;
  eventType: 'kudos.sent';
  occurredAt: string;
  tenantId: string;
  data: {
    learnerId: string;
    kudosId: string;
    fromUserId: string;
    fromRole: string;
    context: string;
    linkedSessionId?: string | undefined;
    linkedActionPlanId?: string | undefined;
  };
}

export interface LevelUpPayload {
  id: string;
  eventType: 'engagement.level_up';
  occurredAt: string;
  tenantId: string;
  data: {
    learnerId: string;
    previousLevel: number;
    newLevel: number;
    xpTotal: number;
  };
}

export interface StreakMilestonePayload {
  id: string;
  eventType: 'engagement.streak_milestone';
  occurredAt: string;
  tenantId: string;
  data: {
    learnerId: string;
    streakDays: number;
    milestoneType: 'day_3' | 'day_7' | 'day_14' | 'day_30' | 'day_100';
    isNewRecord: boolean;
  };
}

export type EngagementDomainEvent =
  | EngagementEventPayload
  | BadgeAwardedPayload
  | KudosSentPayload
  | LevelUpPayload
  | StreakMilestonePayload;

/**
 * NATS publisher interface (injected for testability)
 */
export interface NatsPublisher {
  publish(subject: string, payload: unknown): Promise<void>;
}

// In-memory placeholder for when NATS is not connected
let natsPublisher: NatsPublisher | null = null;

/**
 * Set the NATS publisher instance
 */
export function setNatsPublisher(publisher: NatsPublisher): void {
  natsPublisher = publisher;
}

/**
 * Get the configured NATS publisher
 */
export function getNatsPublisher(): NatsPublisher | null {
  return natsPublisher;
}

/**
 * Publish an engagement event to NATS
 */
export async function publishEngagementEvent(
  tenantId: string,
  learnerId: string,
  engagementEventType: EngagementEventType,
  xpAwarded: number,
  profile: EngagementProfile,
  leveledUp: boolean,
  streakUpdated: boolean,
  sessionId?: string,
  taskId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const payload: EngagementEventPayload = {
    id: randomUUID(),
    eventType: 'engagement.event',
    occurredAt: new Date().toISOString(),
    tenantId,
    data: {
      learnerId,
      engagementEventType,
      xpAwarded,
      newXpTotal: profile.xpTotal,
      newLevel: profile.level,
      leveledUp,
      streakDays: profile.currentStreakDays,
      streakUpdated,
      sessionId,
      taskId,
      metadata,
    },
  };

  await publishToNats('engagement.event', payload);
}

/**
 * Publish a badge awarded event
 */
export async function publishBadgeAwarded(
  tenantId: string,
  learnerId: string,
  badge: Badge,
  source: string,
  isNew: boolean,
  awardedBy?: string
): Promise<void> {
  const payload: BadgeAwardedPayload = {
    id: randomUUID(),
    eventType: 'badge.awarded',
    occurredAt: new Date().toISOString(),
    tenantId,
    data: {
      learnerId,
      badgeCode: badge.code,
      badgeName: badge.name,
      badgeCategory: badge.category,
      xpReward: (badge as unknown as { xpReward?: number }).xpReward ?? 0,
      source,
      awardedBy,
      isNew,
    },
  };

  await publishToNats('badge.awarded', payload);
}

/**
 * Publish a kudos sent event
 */
export async function publishKudosSent(tenantId: string, kudos: Kudos): Promise<void> {
  const payload: KudosSentPayload = {
    id: randomUUID(),
    eventType: 'kudos.sent',
    occurredAt: new Date().toISOString(),
    tenantId,
    data: {
      learnerId: kudos.learnerId,
      kudosId: kudos.id,
      fromUserId: kudos.fromUserId,
      fromRole: kudos.fromRole,
      context: kudos.context,
      linkedSessionId: kudos.linkedSessionId ?? undefined,
      linkedActionPlanId: kudos.linkedActionPlanId ?? undefined,
    },
  };

  await publishToNats('kudos.sent', payload);
}

/**
 * Publish a level up event
 */
export async function publishLevelUp(
  tenantId: string,
  learnerId: string,
  previousLevel: number,
  newLevel: number,
  xpTotal: number
): Promise<void> {
  const payload: LevelUpPayload = {
    id: randomUUID(),
    eventType: 'engagement.level_up',
    occurredAt: new Date().toISOString(),
    tenantId,
    data: {
      learnerId,
      previousLevel,
      newLevel,
      xpTotal,
    },
  };

  await publishToNats('engagement.level_up', payload);
}

/**
 * Publish a streak milestone event
 */
export async function publishStreakMilestone(
  tenantId: string,
  learnerId: string,
  streakDays: number,
  isNewRecord: boolean
): Promise<void> {
  // Determine milestone type
  let milestoneType: StreakMilestonePayload['data']['milestoneType'] | null = null;
  if (streakDays === 3) milestoneType = 'day_3';
  else if (streakDays === 7) milestoneType = 'day_7';
  else if (streakDays === 14) milestoneType = 'day_14';
  else if (streakDays === 30) milestoneType = 'day_30';
  else if (streakDays === 100) milestoneType = 'day_100';

  if (!milestoneType) return; // Not a milestone

  const payload: StreakMilestonePayload = {
    id: randomUUID(),
    eventType: 'engagement.streak_milestone',
    occurredAt: new Date().toISOString(),
    tenantId,
    data: {
      learnerId,
      streakDays,
      milestoneType,
      isNewRecord,
    },
  };

  await publishToNats('engagement.streak_milestone', payload);
}

/**
 * Internal publish helper with error handling
 */
async function publishToNats(subject: string, payload: EngagementDomainEvent): Promise<void> {
  if (!natsPublisher) {
    // Log but don't fail - NATS may not be connected in dev
    console.log(`[NATS] Would publish to ${subject}:`, JSON.stringify(payload, null, 2));
    return;
  }

  try {
    await natsPublisher.publish(`aivo.${subject}`, payload);
  } catch (error) {
    console.error(`[NATS] Failed to publish ${subject}:`, error);
    // Don't throw - engagement should work even if NATS is down
  }
}
