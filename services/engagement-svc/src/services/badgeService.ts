/**
 * Badge Service - Business logic for badges and achievements
 */

import { prisma, BadgeCategory, type Badge, type LearnerBadge } from '../prisma.js';
import type { JsonValue } from '@prisma/client/runtime/library';

export interface AwardBadgeInput {
  tenantId: string;
  learnerId: string;
  badgeCode: string;
  source?: string;
  note?: string;
}

export interface AwardBadgeResult {
  badge: Badge;
  learnerBadge: LearnerBadge;
  isNew: boolean;
}

/**
 * Get all active badges (optionally filtered by category)
 */
export async function getActiveBadges(
  tenantId?: string,
  category?: BadgeCategory
): Promise<Badge[]> {
  return prisma.badge.findMany({
    where: {
      isActive: true,
      ...(category && { category }),
      // Filter by tenant restrictions if provided
      ...(tenantId && {
        OR: [
          { tenantRestrictions: { equals: null } },
          { tenantRestrictions: { path: [], array_contains: tenantId } },
        ],
      }),
    },
    orderBy: { category: 'asc' },
  });
}

/**
 * Get a badge by code
 */
export async function getBadgeByCode(code: string): Promise<Badge | null> {
  return prisma.badge.findUnique({
    where: { code },
  });
}

/**
 * Get learner's badges
 */
export async function getLearnerBadges(
  tenantId: string,
  learnerId: string
): Promise<Array<LearnerBadge & { badge: Badge }>> {
  return prisma.learnerBadge.findMany({
    where: { tenantId, learnerId },
    include: { badge: true },
    orderBy: { awardedAt: 'desc' },
  });
}

/**
 * Check if learner has a badge
 */
export async function learnerHasBadge(
  tenantId: string,
  learnerId: string,
  badgeCode: string
): Promise<boolean> {
  const badge = await prisma.badge.findUnique({
    where: { code: badgeCode },
    select: { id: true },
  });
  
  if (!badge) return false;
  
  const learnerBadge = await prisma.learnerBadge.findFirst({
    where: { tenantId, learnerId, badgeId: badge.id },
  });
  
  return !!learnerBadge;
}

/**
 * Award a badge to a learner
 */
export async function awardBadge(input: AwardBadgeInput): Promise<AwardBadgeResult | null> {
  // Find the badge
  const badge = await getBadgeByCode(input.badgeCode);
  if (!badge?.isActive) {
    return null;
  }
  
  // Check if tenant can award this badge
  const tenantRestrictions = badge.tenantRestrictions as string[] | null;
  if (tenantRestrictions && tenantRestrictions.length > 0) {
    if (!tenantRestrictions.includes(input.tenantId)) {
      return null;
    }
  }
  
  // Check if learner already has this badge
  const existing = await prisma.learnerBadge.findFirst({
    where: {
      tenantId: input.tenantId,
      learnerId: input.learnerId,
      badgeId: badge.id,
    },
  });
  
  if (existing) {
    return {
      badge,
      learnerBadge: existing,
      isNew: false,
    };
  }
  
  // Award the badge
  const learnerBadge = await prisma.learnerBadge.create({
    data: {
      tenantId: input.tenantId,
      learnerId: input.learnerId,
      badgeId: badge.id,
      source: input.source ?? 'system',
      note: input.note,
    },
  });
  
  return {
    badge,
    learnerBadge,
    isNew: true,
  };
}

/**
 * Mark badge as seen by learner
 */
export async function markBadgeSeen(learnerBadgeId: string): Promise<LearnerBadge> {
  return prisma.learnerBadge.update({
    where: { id: learnerBadgeId },
    data: { firstSeenAt: new Date() },
  });
}

/**
 * Get unseen badges for learner
 */
export async function getUnseenBadges(
  tenantId: string,
  learnerId: string
): Promise<Array<LearnerBadge & { badge: Badge }>> {
  return prisma.learnerBadge.findMany({
    where: {
      tenantId,
      learnerId,
      firstSeenAt: null,
    },
    include: { badge: true },
    orderBy: { awardedAt: 'desc' },
  });
}

/**
 * Create a new badge (admin only)
 */
export async function createBadge(data: {
  code: string;
  name: string;
  description: string;
  category: BadgeCategory;
  iconKey: string;
  criteria: JsonValue;
  xpReward?: number;
  tenantRestrictions?: string[];
}): Promise<Badge> {
  return prisma.badge.create({
    data: {
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      iconKey: data.iconKey,
      criteria: data.criteria,
      xpReward: data.xpReward ?? 0,
      tenantRestrictions: data.tenantRestrictions ?? null,
    },
  });
}

/**
 * Seed default badges (for initial setup)
 */
export async function seedDefaultBadges(): Promise<void> {
  const defaultBadges = [
    // Effort badges
    { code: 'first-session', name: 'First Session', description: 'Completed your first learning session', category: BadgeCategory.EFFORT, iconKey: 'badge-first-session', criteria: { event: 'SESSION_COMPLETED', count: 1 }, xpReward: 10 },
    { code: 'ten-sessions', name: 'Getting Started', description: 'Completed 10 learning sessions', category: BadgeCategory.EFFORT, iconKey: 'badge-ten-sessions', criteria: { event: 'SESSION_COMPLETED', count: 10 }, xpReward: 25 },
    { code: 'fifty-sessions', name: 'Dedicated Learner', description: 'Completed 50 learning sessions', category: BadgeCategory.EFFORT, iconKey: 'badge-fifty-sessions', criteria: { event: 'SESSION_COMPLETED', count: 50 }, xpReward: 50 },
    
    // Consistency badges
    { code: 'streak-3', name: '3-Day Streak', description: 'Learned for 3 days in a row', category: BadgeCategory.CONSISTENCY, iconKey: 'badge-streak-3', criteria: { streakDays: 3 }, xpReward: 15 },
    { code: 'streak-7', name: 'Week Warrior', description: 'Learned for 7 days in a row', category: BadgeCategory.CONSISTENCY, iconKey: 'badge-streak-7', criteria: { streakDays: 7 }, xpReward: 30 },
    { code: 'streak-30', name: 'Monthly Master', description: 'Learned for 30 days in a row', category: BadgeCategory.CONSISTENCY, iconKey: 'badge-streak-30', criteria: { streakDays: 30 }, xpReward: 100 },
    
    // Focus badges
    { code: 'focus-break-5', name: 'Taking Care', description: 'Used 5 focus breaks', category: BadgeCategory.FOCUS, iconKey: 'badge-focus-break', criteria: { event: 'FOCUS_BREAK_USED', count: 5 }, xpReward: 15 },
    { code: 'focus-return-10', name: 'Bouncing Back', description: 'Returned from 10 focus breaks', category: BadgeCategory.FOCUS, iconKey: 'badge-focus-return', criteria: { event: 'FOCUS_BREAK_RETURNED', count: 10 }, xpReward: 20 },
    
    // Growth badges
    { code: 'level-5', name: 'Rising Star', description: 'Reached level 5', category: BadgeCategory.GROWTH, iconKey: 'badge-level-5', criteria: { level: 5 }, xpReward: 25 },
    { code: 'level-10', name: 'Shining Bright', description: 'Reached level 10', category: BadgeCategory.GROWTH, iconKey: 'badge-level-10', criteria: { level: 10 }, xpReward: 50 },
    { code: 'goal-achieved', name: 'Goal Getter', description: 'Achieved a learning goal', category: BadgeCategory.GROWTH, iconKey: 'badge-goal', criteria: { event: 'GOAL_ACHIEVED', count: 1 }, xpReward: 20 },
  ];
  
  for (const badge of defaultBadges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {},
      create: badge,
    });
  }
}
