/**
 * Badge Service - Business logic for badges and achievements
 */

import type {
  Prisma,
  prisma,
  BadgeCategory,
  BadgeSource,
  type Badge,
  type LearnerBadge,
} from '../prisma.js';

export interface AwardBadgeInput {
  tenantId: string;
  learnerId: string;
  badgeCode: string;
  source?: BadgeSource | undefined;
  note?: string | undefined;
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
      // Filter by tenant - null means global badge, else must match tenantId
      ...(tenantId && {
        OR: [{ tenantId: null }, { tenantId }],
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
): Promise<(LearnerBadge & { badge: Badge })[]> {
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

  // Check if tenant can award this badge - badge.tenantId must be null (global) or match input.tenantId
  if (badge.tenantId !== null && badge.tenantId !== input.tenantId) {
    return null;
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
      source: input.source ?? BadgeSource.SYSTEM,
      note: input.note ?? null,
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
): Promise<(LearnerBadge & { badge: Badge })[]> {
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
  criteriaJson: Prisma.InputJsonValue;
  tenantId?: string | undefined;
}): Promise<Badge> {
  return prisma.badge.create({
    data: {
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      iconKey: data.iconKey,
      criteriaJson: data.criteriaJson,
      tenantId: data.tenantId ?? null,
    },
  });
}

/**
 * Seed default badges (for initial setup)
 */
export async function seedDefaultBadges(): Promise<void> {
  const defaultBadges = [
    // Effort badges
    {
      code: 'first-session',
      name: 'First Session',
      description: 'Completed your first learning session',
      category: BadgeCategory.EFFORT,
      iconKey: 'badge-first-session',
      criteriaJson: { event: 'SESSION_COMPLETED', count: 1 },
    },
    {
      code: 'ten-sessions',
      name: 'Getting Started',
      description: 'Completed 10 learning sessions',
      category: BadgeCategory.EFFORT,
      iconKey: 'badge-ten-sessions',
      criteriaJson: { event: 'SESSION_COMPLETED', count: 10 },
    },
    {
      code: 'fifty-sessions',
      name: 'Dedicated Learner',
      description: 'Completed 50 learning sessions',
      category: BadgeCategory.EFFORT,
      iconKey: 'badge-fifty-sessions',
      criteriaJson: { event: 'SESSION_COMPLETED', count: 50 },
    },

    // Consistency badges
    {
      code: 'streak-3',
      name: '3-Day Streak',
      description: 'Learned for 3 days in a row',
      category: BadgeCategory.CONSISTENCY,
      iconKey: 'badge-streak-3',
      criteriaJson: { streakDays: 3 },
    },
    {
      code: 'streak-7',
      name: 'Week Warrior',
      description: 'Learned for 7 days in a row',
      category: BadgeCategory.CONSISTENCY,
      iconKey: 'badge-streak-7',
      criteriaJson: { streakDays: 7 },
    },
    {
      code: 'streak-30',
      name: 'Monthly Master',
      description: 'Learned for 30 days in a row',
      category: BadgeCategory.CONSISTENCY,
      iconKey: 'badge-streak-30',
      criteriaJson: { streakDays: 30 },
    },

    // Focus badges
    {
      code: 'focus-break-5',
      name: 'Taking Care',
      description: 'Used 5 focus breaks',
      category: BadgeCategory.FOCUS,
      iconKey: 'badge-focus-break',
      criteriaJson: { event: 'FOCUS_BREAK_USED', count: 5 },
    },
    {
      code: 'focus-return-10',
      name: 'Bouncing Back',
      description: 'Returned from 10 focus breaks',
      category: BadgeCategory.FOCUS,
      iconKey: 'badge-focus-return',
      criteriaJson: { event: 'FOCUS_BREAK_RETURNED', count: 10 },
    },

    // Growth badges
    {
      code: 'level-5',
      name: 'Rising Star',
      description: 'Reached level 5',
      category: BadgeCategory.GROWTH,
      iconKey: 'badge-level-5',
      criteriaJson: { level: 5 },
    },
    {
      code: 'level-10',
      name: 'Shining Bright',
      description: 'Reached level 10',
      category: BadgeCategory.GROWTH,
      iconKey: 'badge-level-10',
      criteriaJson: { level: 10 },
    },
  ];

  for (const badge of defaultBadges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {},
      create: badge,
    });
  }
}
