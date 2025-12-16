/**
 * Engagement Service - Core business logic for XP, streaks, levels
 */

import type { JsonValue } from '@prisma/client/runtime/library';

import * as publisher from '../events/publisher.js';
import {
  prisma,
  EngagementEventType,
  type EngagementProfile,
  type EngagementEvent,
} from '../prisma.js';

import * as badgeAwardEngine from './badgeAwardEngine.js';

// Default XP rules per event type
const DEFAULT_XP_RULES: Record<EngagementEventType, number> = {
  SESSION_STARTED: 2,
  SESSION_COMPLETED: 10,
  ACTIVITY_COMPLETED: 8,
  FOCUS_BREAK_USED: 3,
  FOCUS_BREAK_RETURNED: 5,
  HOMEWORK_HELPER_USED: 5,
  HOMEWORK_STEP_COMPLETED: 10,
  RECOMMENDATION_ACCEPTED: 5,
  ACTION_PLAN_TASK_COMPLETED: 8,
  BASELINE_COMPLETED: 20,
  STREAK_MAINTAINED: 5,
  BADGE_EARNED: 0,
};

// Level thresholds (XP needed for each level)
const LEVEL_THRESHOLDS = [
  0, // Level 1
  50, // Level 2
  150, // Level 3
  300, // Level 4
  500, // Level 5
  750, // Level 6
  1100, // Level 7
  1500, // Level 8
  2000, // Level 9
  2600, // Level 10
  3300, // Level 11
  4100, // Level 12
  5000, // Level 13
];

export interface ApplyEventInput {
  tenantId: string;
  learnerId: string;
  eventType: EngagementEventType;
  sessionId?: string | undefined;
  taskId?: string | undefined;
  activityId?: string | undefined;
  badgeId?: string | undefined;
  metadata?: JsonValue | undefined;
  customXp?: number | undefined;
}

export interface ApplyEventResult {
  event: EngagementEvent;
  profile: EngagementProfile;
  xpAwarded: number;
  leveledUp: boolean;
  previousLevel: number;
  streakUpdated: boolean;
  previousStreak: number;
  awardedBadges: { badge: { code: string; name: string }; isNew: boolean }[];
}

/**
 * Calculate level from total XP
 */
function calculateLevel(xpTotal: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold !== undefined && xpTotal >= threshold) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Calculate XP needed for next level
 */
export function xpForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    return Infinity; // Max level reached
  }
  return LEVEL_THRESHOLDS[currentLevel] ?? Infinity;
}

/**
 * Check if dates are consecutive days
 */
function isConsecutiveDay(lastDate: Date | null, currentDate: Date): boolean {
  if (!lastDate) return false;

  const lastDay = new Date(lastDate);
  lastDay.setHours(0, 0, 0, 0);

  const currentDay = new Date(currentDate);
  currentDay.setHours(0, 0, 0, 0);

  const diffMs = currentDay.getTime() - lastDay.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays === 1;
}

/**
 * Check if dates are the same day
 */
function isSameDay(date1: Date | null, date2: Date): boolean {
  if (!date1) return false;

  const d1 = new Date(date1);
  d1.setHours(0, 0, 0, 0);

  const d2 = new Date(date2);
  d2.setHours(0, 0, 0, 0);

  return d1.getTime() === d2.getTime();
}

/**
 * Get tenant's custom XP rules (if any)
 */
async function getTenantXpRules(tenantId: string): Promise<Record<string, number> | null> {
  const settings = await prisma.gamificationSettings.findUnique({
    where: { tenantId },
    select: { xpRulesOverride: true, xpEnabled: true },
  });

  if (!settings?.xpEnabled) {
    return null; // XP disabled for tenant
  }

  return settings.xpRulesOverride as Record<string, number> | null;
}

/**
 * Get today's XP for a learner (for daily cap)
 */
async function getTodayXp(tenantId: string, learnerId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await prisma.engagementEvent.aggregate({
    where: {
      tenantId,
      learnerId,
      occurredAt: { gte: startOfDay },
    },
    _sum: { xpAwarded: true },
  });

  return result._sum.xpAwarded ?? 0;
}

/**
 * Get or create engagement profile for a learner
 */
export async function getOrCreateProfile(
  tenantId: string,
  learnerId: string
): Promise<EngagementProfile> {
  let profile = await prisma.engagementProfile.findUnique({
    where: { learnerId },
  });

  if (!profile) {
    profile = await prisma.engagementProfile.create({
      data: {
        tenantId,
        learnerId,
        level: 1,
        xpTotal: 0,
        xpThisWeek: 0,
        currentStreakDays: 0,
        maxStreakDays: 0,
      },
    });
  }

  return profile;
}

/**
 * Apply an engagement event (award XP, update streaks, etc.)
 */
export async function applyEvent(input: ApplyEventInput): Promise<ApplyEventResult> {
  const now = new Date();

  // Get or create profile
  let profile = await getOrCreateProfile(input.tenantId, input.learnerId);
  const previousLevel = profile.level;
  const previousStreak = profile.currentStreakDays;

  // Check if XP is enabled for tenant
  const tenantXpRules = await getTenantXpRules(input.tenantId);
  const xpEnabled = tenantXpRules !== null;

  // Calculate XP to award
  let baseXp = input.customXp ?? DEFAULT_XP_RULES[input.eventType];

  // Apply tenant custom rules if present
  if (tenantXpRules?.[input.eventType] !== undefined) {
    baseXp = tenantXpRules[input.eventType] ?? baseXp;
  }

  // Apply daily cap (100 XP by default)
  let xpAwarded = 0;
  if (xpEnabled && baseXp > 0) {
    const todayXp = await getTodayXp(input.tenantId, input.learnerId);
    const dailyCap = 100; // Could be tenant-configurable
    xpAwarded = Math.min(baseXp, Math.max(0, dailyCap - todayXp));
  }

  // Create the event record
  const event = await prisma.engagementEvent.create({
    data: {
      tenantId: input.tenantId,
      learnerId: input.learnerId,
      eventType: input.eventType,
      xpAwarded,
      metadata: input.metadata ?? {},
      sessionId: input.sessionId ?? null,
      taskId: input.taskId ?? null,
      occurredAt: now,
    },
  });

  // Update profile
  let streakUpdated = false;
  let newStreak = profile.currentStreakDays;

  // Update streak only for session completion events
  if (input.eventType === EngagementEventType.SESSION_COMPLETED) {
    if (!isSameDay(profile.lastSessionDate, now)) {
      if (isConsecutiveDay(profile.lastSessionDate, now)) {
        newStreak = profile.currentStreakDays + 1;
        streakUpdated = true;
      } else if (!profile.lastSessionDate || !isSameDay(profile.lastSessionDate, now)) {
        // First session or streak broken
        newStreak = 1;
        streakUpdated = profile.currentStreakDays > 0;
      }
    }
  }

  // Calculate new totals
  const newXpTotal = profile.xpTotal + xpAwarded;
  const newLevel = calculateLevel(newXpTotal);
  const leveledUp = newLevel > previousLevel;

  // Update profile
  profile = await prisma.engagementProfile.update({
    where: { id: profile.id },
    data: {
      xpTotal: newXpTotal,
      xpThisWeek: profile.xpThisWeek + xpAwarded,
      level: newLevel,
      currentStreakDays: newStreak,
      maxStreakDays: Math.max(profile.maxStreakDays, newStreak),
      lastSessionDate:
        input.eventType === EngagementEventType.SESSION_COMPLETED ? now : profile.lastSessionDate,
    },
  });

  // Publish engagement event to NATS
  await publisher.publishEngagementEvent(
    input.tenantId,
    input.learnerId,
    input.eventType,
    xpAwarded,
    profile,
    leveledUp,
    streakUpdated,
    input.sessionId,
    input.taskId,
    input.metadata as Record<string, unknown> | undefined
  );

  // Publish level up event if applicable
  if (leveledUp) {
    await publisher.publishLevelUp(
      input.tenantId,
      input.learnerId,
      previousLevel,
      newLevel,
      newXpTotal
    );
  }

  // Check streak milestones
  if (streakUpdated) {
    await badgeAwardEngine.checkStreakMilestones(
      input.tenantId,
      input.learnerId,
      newStreak,
      previousStreak,
      profile.maxStreakDays
    );
  }

  // Check and award any earned badges
  const awardedBadges = await badgeAwardEngine.checkAndAwardBadges(
    input.tenantId,
    input.learnerId,
    profile,
    input.eventType
  );

  return {
    event,
    profile,
    xpAwarded,
    leveledUp,
    previousLevel,
    streakUpdated,
    previousStreak,
    awardedBadges,
  };
}

/**
 * Get engagement profile with computed fields
 */
export async function getEngagement(tenantId: string, learnerId: string) {
  const profile = await getOrCreateProfile(tenantId, learnerId);

  const xpToNextLevel = xpForNextLevel(profile.level);
  const xpInCurrentLevel = profile.level > 1 ? (LEVEL_THRESHOLDS[profile.level - 1] ?? 0) : 0;
  const xpProgress = profile.xpTotal - xpInCurrentLevel;
  const xpNeeded = xpToNextLevel - xpInCurrentLevel;

  return {
    ...profile,
    xpToNextLevel,
    xpProgress,
    xpNeeded,
    progressPercent: xpNeeded > 0 ? Math.round((xpProgress / xpNeeded) * 100) : 100,
  };
}

/**
 * Get recent events for a learner
 */
export async function getRecentEvents(
  tenantId: string,
  learnerId: string,
  limit = 20
): Promise<EngagementEvent[]> {
  return prisma.engagementEvent.findMany({
    where: { tenantId, learnerId },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  });
}

/**
 * Get weekly XP leaderboard (opt-in only via tenant settings)
 */
export async function getWeeklyLeaderboard(
  tenantId: string,
  limit = 10
): Promise<{ learnerId: string; xpThisWeek: number; level: number }[]> {
  // Check if comparisons are enabled for tenant
  const settings = await prisma.gamificationSettings.findUnique({
    where: { tenantId },
    select: { showComparisons: true },
  });

  if (!settings?.showComparisons) {
    return [];
  }

  const profiles = await prisma.engagementProfile.findMany({
    where: { tenantId },
    orderBy: { xpThisWeek: 'desc' },
    take: limit,
    select: {
      learnerId: true,
      xpThisWeek: true,
      level: true,
    },
  });

  return profiles;
}

/**
 * Reset weekly XP counters (to be called by scheduled job)
 */
export async function resetWeeklyXp(): Promise<number> {
  const result = await prisma.engagementProfile.updateMany({
    data: { xpThisWeek: 0 },
  });
  return result.count;
}
