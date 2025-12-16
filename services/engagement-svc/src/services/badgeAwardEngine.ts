/**
 * Badge Auto-Award Engine - Evaluates badge criteria after engagement events
 */

import { prisma, BadgeCategory, type Badge, type EngagementProfile } from '../prisma.js';
import * as badgeService from './badgeService.js';
import * as publisher from '../events/publisher.js';

/**
 * Badge criteria types
 */
export interface EventCountCriteria {
  event: string;
  count: number;
  timeWindowDays?: number;
}

export interface StreakCriteria {
  streakDays: number;
}

export interface LevelCriteria {
  level: number;
}

export interface XpCriteria {
  xpTotal: number;
}

export type BadgeCriteria = EventCountCriteria | StreakCriteria | LevelCriteria | XpCriteria;

/**
 * Check and award any earned badges after an engagement event
 */
export async function checkAndAwardBadges(
  tenantId: string,
  learnerId: string,
  profile: EngagementProfile,
  eventType?: string,
  eventCount?: number
): Promise<Array<{ badge: Badge; isNew: boolean }>> {
  const awardedBadges: Array<{ badge: Badge; isNew: boolean }> = [];

  // Get all active badges that the learner doesn't have yet
  const allBadges = await prisma.badge.findMany({
    where: {
      isActive: true,
      OR: [
        { tenantId: null }, // Global badges
        { tenantId }, // Tenant-specific badges
      ],
    },
  });

  // Get learner's existing badges
  const existingBadges = await prisma.learnerBadge.findMany({
    where: { tenantId, learnerId },
    select: { badgeId: true },
  });
  const earnedBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

  // Check each badge
  for (const badge of allBadges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) continue;

    const criteria = badge.criteriaJson as BadgeCriteria;
    const earned = await evaluateCriteria(tenantId, learnerId, profile, criteria, eventType, eventCount);

    if (earned) {
      const result = await badgeService.awardBadge({
        tenantId,
        learnerId,
        badgeCode: badge.code,
        source: 'SYSTEM',
      });

      if (result) {
        awardedBadges.push({ badge: result.badge, isNew: result.isNew });

        // Publish badge awarded event
        await publisher.publishBadgeAwarded(
          tenantId,
          learnerId,
          result.badge,
          'SYSTEM',
          result.isNew
        );
      }
    }
  }

  return awardedBadges;
}

/**
 * Evaluate if a badge criteria is met
 */
async function evaluateCriteria(
  tenantId: string,
  learnerId: string,
  profile: EngagementProfile,
  criteria: BadgeCriteria,
  eventType?: string,
  providedEventCount?: number
): Promise<boolean> {
  // Level-based criteria
  if ('level' in criteria) {
    return profile.level >= criteria.level;
  }

  // XP-based criteria
  if ('xpTotal' in criteria) {
    return profile.xpTotal >= criteria.xpTotal;
  }

  // Streak-based criteria
  if ('streakDays' in criteria) {
    return profile.currentStreakDays >= criteria.streakDays;
  }

  // Event count criteria
  if ('event' in criteria && 'count' in criteria) {
    // If the event type matches and we have a count, use it
    if (eventType === criteria.event && providedEventCount !== undefined) {
      return providedEventCount >= criteria.count;
    }

    // Otherwise, query the event count
    const startDate = criteria.timeWindowDays
      ? new Date(Date.now() - criteria.timeWindowDays * 24 * 60 * 60 * 1000)
      : undefined;

    const count = await prisma.engagementEvent.count({
      where: {
        tenantId,
        learnerId,
        eventType: criteria.event as never,
        ...(startDate && { occurredAt: { gte: startDate } }),
      },
    });

    return count >= criteria.count;
  }

  return false;
}

/**
 * Get badge progress for a learner (how close they are to earning each badge)
 */
export async function getBadgeProgress(
  tenantId: string,
  learnerId: string,
  profile: EngagementProfile
): Promise<Array<{ badge: Badge; progress: number; target: number; earned: boolean }>> {
  const allBadges = await prisma.badge.findMany({
    where: {
      isActive: true,
      isSecret: false, // Don't show secret badges
      OR: [
        { tenantId: null },
        { tenantId },
      ],
    },
    orderBy: [
      { category: 'asc' },
      { sortOrder: 'asc' },
    ],
  });

  const existingBadges = await prisma.learnerBadge.findMany({
    where: { tenantId, learnerId },
    select: { badgeId: true },
  });
  const earnedBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

  const progressList: Array<{ badge: Badge; progress: number; target: number; earned: boolean }> = [];

  for (const badge of allBadges) {
    const earned = earnedBadgeIds.has(badge.id);
    const criteria = badge.criteriaJson as BadgeCriteria;
    const { progress, target } = await calculateProgress(tenantId, learnerId, profile, criteria);

    progressList.push({
      badge,
      progress: earned ? target : progress,
      target,
      earned,
    });
  }

  return progressList;
}

/**
 * Calculate progress toward a badge
 */
async function calculateProgress(
  tenantId: string,
  learnerId: string,
  profile: EngagementProfile,
  criteria: BadgeCriteria
): Promise<{ progress: number; target: number }> {
  // Level-based
  if ('level' in criteria) {
    return { progress: profile.level, target: criteria.level };
  }

  // XP-based
  if ('xpTotal' in criteria) {
    return { progress: profile.xpTotal, target: criteria.xpTotal };
  }

  // Streak-based
  if ('streakDays' in criteria) {
    return { progress: profile.currentStreakDays, target: criteria.streakDays };
  }

  // Event count
  if ('event' in criteria && 'count' in criteria) {
    const startDate = criteria.timeWindowDays
      ? new Date(Date.now() - criteria.timeWindowDays * 24 * 60 * 60 * 1000)
      : undefined;

    const count = await prisma.engagementEvent.count({
      where: {
        tenantId,
        learnerId,
        eventType: criteria.event as never,
        ...(startDate && { occurredAt: { gte: startDate } }),
      },
    });

    return { progress: count, target: criteria.count };
  }

  return { progress: 0, target: 1 };
}

/**
 * Get recommended next badges for a learner (closest to earning)
 */
export async function getNextBadges(
  tenantId: string,
  learnerId: string,
  profile: EngagementProfile,
  limit = 3
): Promise<Array<{ badge: Badge; progress: number; target: number }>> {
  const allProgress = await getBadgeProgress(tenantId, learnerId, profile);

  // Filter to unearned badges and sort by progress percentage
  return allProgress
    .filter((p) => !p.earned)
    .sort((a, b) => {
      const aPercent = a.target > 0 ? a.progress / a.target : 0;
      const bPercent = b.target > 0 ? b.progress / b.target : 0;
      return bPercent - aPercent; // Highest progress first
    })
    .slice(0, limit);
}

/**
 * Check for streak milestones and award related badges
 */
export async function checkStreakMilestones(
  tenantId: string,
  learnerId: string,
  currentStreak: number,
  previousStreak: number,
  maxStreak: number
): Promise<void> {
  const milestones = [3, 7, 14, 30, 100];
  const isNewRecord = currentStreak > maxStreak;

  for (const milestone of milestones) {
    if (currentStreak >= milestone && previousStreak < milestone) {
      // Publish streak milestone event
      await publisher.publishStreakMilestone(tenantId, learnerId, milestone, isNewRecord);
    }
  }
}
