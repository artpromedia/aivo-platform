/**
 * Achievement Service
 *
 * Manages achievement definitions, progress tracking, and awards:
 * - Tiered achievements (bronze, silver, gold, platinum)
 * - Secret achievements
 * - Progress-based achievements
 * - One-time achievements
 */

import { prisma } from '../prisma.js';
import { eventEmitter } from '../events/event-emitter.js';
import {
  Achievement,
  AchievementDefinition,
  AchievementProgress,
  AchievementCategory,
  AchievementRarity,
  AchievementTier,
} from '../types/gamification.types.js';

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Onboarding achievements
  {
    id: 'welcome',
    name: 'Welcome!',
    description: 'Started your learning journey',
    category: 'onboarding',
    iconUrl: '/achievements/welcome.svg',
    xpReward: 10,
    rarity: 'common',
    secret: false,
  },
  {
    id: 'first_lesson',
    name: 'First Steps',
    description: 'Completed your first lesson',
    category: 'onboarding',
    iconUrl: '/achievements/first_lesson.svg',
    xpReward: 25,
    rarity: 'common',
    secret: false,
  },
  {
    id: 'profile_complete',
    name: 'Identity Established',
    description: 'Completed your profile',
    category: 'onboarding',
    iconUrl: '/achievements/profile.svg',
    xpReward: 15,
    rarity: 'common',
    secret: false,
  },

  // Lesson achievements (tiered)
  {
    id: 'lessons_10',
    name: 'Eager Learner',
    description: 'Completed 10 lessons',
    category: 'lessons',
    iconUrl: '/achievements/lessons_bronze.svg',
    xpReward: 50,
    rarity: 'common',
    secret: false,
    tier: 'bronze',
    requirement: { type: 'lessons_completed', count: 10 },
  },
  {
    id: 'lessons_50',
    name: 'Dedicated Student',
    description: 'Completed 50 lessons',
    category: 'lessons',
    iconUrl: '/achievements/lessons_silver.svg',
    xpReward: 100,
    rarity: 'uncommon',
    secret: false,
    tier: 'silver',
    requirement: { type: 'lessons_completed', count: 50 },
  },
  {
    id: 'lessons_100',
    name: 'Knowledge Seeker',
    description: 'Completed 100 lessons',
    category: 'lessons',
    iconUrl: '/achievements/lessons_gold.svg',
    xpReward: 250,
    rarity: 'rare',
    secret: false,
    tier: 'gold',
    requirement: { type: 'lessons_completed', count: 100 },
  },
  {
    id: 'lessons_250',
    name: 'Scholarly Elite',
    description: 'Completed 250 lessons',
    category: 'lessons',
    iconUrl: '/achievements/lessons_platinum.svg',
    xpReward: 500,
    rarity: 'epic',
    secret: false,
    tier: 'platinum',
    requirement: { type: 'lessons_completed', count: 250 },
  },
  {
    id: 'lessons_500',
    name: 'Master Scholar',
    description: 'Completed 500 lessons',
    category: 'lessons',
    iconUrl: '/achievements/lessons_diamond.svg',
    xpReward: 1000,
    rarity: 'legendary',
    secret: false,
    tier: 'diamond',
    requirement: { type: 'lessons_completed', count: 500 },
  },

  // Perfect score achievements
  {
    id: 'perfect_1',
    name: 'Perfectionist',
    description: 'Got your first perfect score',
    category: 'mastery',
    iconUrl: '/achievements/perfect_bronze.svg',
    xpReward: 30,
    rarity: 'common',
    secret: false,
    tier: 'bronze',
    requirement: { type: 'perfect_scores', count: 1 },
  },
  {
    id: 'perfect_10',
    name: 'Precision Expert',
    description: 'Got 10 perfect scores',
    category: 'mastery',
    iconUrl: '/achievements/perfect_silver.svg',
    xpReward: 100,
    rarity: 'uncommon',
    secret: false,
    tier: 'silver',
    requirement: { type: 'perfect_scores', count: 10 },
  },
  {
    id: 'perfect_25',
    name: 'Accuracy Master',
    description: 'Got 25 perfect scores',
    category: 'mastery',
    iconUrl: '/achievements/perfect_gold.svg',
    xpReward: 200,
    rarity: 'rare',
    secret: false,
    tier: 'gold',
    requirement: { type: 'perfect_scores', count: 25 },
  },
  {
    id: 'perfect_50',
    name: 'Flawless Master',
    description: 'Got 50 perfect scores',
    category: 'mastery',
    iconUrl: '/achievements/perfect_platinum.svg',
    xpReward: 300,
    rarity: 'epic',
    secret: false,
    tier: 'platinum',
    requirement: { type: 'perfect_scores', count: 50 },
  },

  // Streak achievements
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: 'Maintained a 3-day streak',
    category: 'consistency',
    iconUrl: '/achievements/streak_3.svg',
    xpReward: 25,
    rarity: 'common',
    secret: false,
    requirement: { type: 'streak_days', count: 3 },
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintained a 7-day streak',
    category: 'consistency',
    iconUrl: '/achievements/streak_7.svg',
    xpReward: 75,
    rarity: 'uncommon',
    secret: false,
    requirement: { type: 'streak_days', count: 7 },
  },
  {
    id: 'streak_14',
    name: 'Fortnight Fighter',
    description: 'Maintained a 14-day streak',
    category: 'consistency',
    iconUrl: '/achievements/streak_14.svg',
    xpReward: 150,
    rarity: 'uncommon',
    secret: false,
    requirement: { type: 'streak_days', count: 14 },
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintained a 30-day streak',
    category: 'consistency',
    iconUrl: '/achievements/streak_30.svg',
    xpReward: 300,
    rarity: 'rare',
    secret: false,
    requirement: { type: 'streak_days', count: 30 },
  },
  {
    id: 'streak_60',
    name: 'Habit Former',
    description: 'Maintained a 60-day streak',
    category: 'consistency',
    iconUrl: '/achievements/streak_60.svg',
    xpReward: 500,
    rarity: 'rare',
    secret: false,
    requirement: { type: 'streak_days', count: 60 },
  },
  {
    id: 'streak_100',
    name: 'Century Streak',
    description: 'Maintained a 100-day streak',
    category: 'consistency',
    iconUrl: '/achievements/streak_100.svg',
    xpReward: 1000,
    rarity: 'epic',
    secret: false,
    requirement: { type: 'streak_days', count: 100 },
  },
  {
    id: 'streak_365',
    name: 'Year of Learning',
    description: 'Maintained a 365-day streak',
    category: 'consistency',
    iconUrl: '/achievements/streak_365.svg',
    xpReward: 5000,
    rarity: 'legendary',
    secret: false,
    requirement: { type: 'streak_days', count: 365 },
  },

  // XP achievements
  {
    id: 'xp_1000',
    name: 'XP Collector',
    description: 'Earned 1,000 total XP',
    category: 'xp',
    iconUrl: '/achievements/xp_bronze.svg',
    xpReward: 50,
    rarity: 'common',
    secret: false,
    tier: 'bronze',
    requirement: { type: 'total_xp', count: 1000 },
  },
  {
    id: 'xp_5000',
    name: 'XP Accumulator',
    description: 'Earned 5,000 total XP',
    category: 'xp',
    iconUrl: '/achievements/xp_silver.svg',
    xpReward: 100,
    rarity: 'uncommon',
    secret: false,
    tier: 'silver',
    requirement: { type: 'total_xp', count: 5000 },
  },
  {
    id: 'xp_10000',
    name: 'XP Enthusiast',
    description: 'Earned 10,000 total XP',
    category: 'xp',
    iconUrl: '/achievements/xp_gold.svg',
    xpReward: 200,
    rarity: 'rare',
    secret: false,
    tier: 'gold',
    requirement: { type: 'total_xp', count: 10000 },
  },
  {
    id: 'xp_25000',
    name: 'XP Master',
    description: 'Earned 25,000 total XP',
    category: 'xp',
    iconUrl: '/achievements/xp_platinum.svg',
    xpReward: 400,
    rarity: 'epic',
    secret: false,
    tier: 'platinum',
    requirement: { type: 'total_xp', count: 25000 },
  },
  {
    id: 'xp_50000',
    name: 'XP Champion',
    description: 'Earned 50,000 total XP',
    category: 'xp',
    iconUrl: '/achievements/xp_diamond.svg',
    xpReward: 500,
    rarity: 'legendary',
    secret: false,
    tier: 'diamond',
    requirement: { type: 'total_xp', count: 50000 },
  },

  // Time-based achievements
  {
    id: 'time_60',
    name: 'Hour of Power',
    description: 'Spent 1 hour learning',
    category: 'time',
    iconUrl: '/achievements/time_60.svg',
    xpReward: 25,
    rarity: 'common',
    secret: false,
    requirement: { type: 'total_time_minutes', count: 60 },
  },
  {
    id: 'time_300',
    name: 'Five Hour Scholar',
    description: 'Spent 5 hours learning',
    category: 'time',
    iconUrl: '/achievements/time_300.svg',
    xpReward: 75,
    rarity: 'uncommon',
    secret: false,
    requirement: { type: 'total_time_minutes', count: 300 },
  },
  {
    id: 'time_600',
    name: 'Ten Hour Titan',
    description: 'Spent 10 hours learning',
    category: 'time',
    iconUrl: '/achievements/time_600.svg',
    xpReward: 150,
    rarity: 'rare',
    secret: false,
    requirement: { type: 'total_time_minutes', count: 600 },
  },
  {
    id: 'time_1500',
    name: 'Day Devotee',
    description: 'Spent 25 hours (1 day) learning',
    category: 'time',
    iconUrl: '/achievements/time_1500.svg',
    xpReward: 300,
    rarity: 'epic',
    secret: false,
    requirement: { type: 'total_time_minutes', count: 1500 },
  },

  // Quiz achievements
  {
    id: 'quizzes_10',
    name: 'Quiz Taker',
    description: 'Completed 10 quizzes',
    category: 'mastery',
    iconUrl: '/achievements/quiz_bronze.svg',
    xpReward: 50,
    rarity: 'common',
    secret: false,
    tier: 'bronze',
    requirement: { type: 'quizzes_completed', count: 10 },
  },
  {
    id: 'quizzes_50',
    name: 'Quiz Expert',
    description: 'Completed 50 quizzes',
    category: 'mastery',
    iconUrl: '/achievements/quiz_silver.svg',
    xpReward: 150,
    rarity: 'uncommon',
    secret: false,
    tier: 'silver',
    requirement: { type: 'quizzes_completed', count: 50 },
  },
  {
    id: 'quizzes_100',
    name: 'Quiz Master',
    description: 'Completed 100 quizzes',
    category: 'mastery',
    iconUrl: '/achievements/quiz_gold.svg',
    xpReward: 300,
    rarity: 'rare',
    secret: false,
    tier: 'gold',
    requirement: { type: 'quizzes_completed', count: 100 },
  },

  // Secret achievements
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Completed a lesson between midnight and 5 AM',
    category: 'secret',
    iconUrl: '/achievements/night_owl.svg',
    xpReward: 50,
    rarity: 'rare',
    secret: true,
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Completed a lesson before 6 AM',
    category: 'secret',
    iconUrl: '/achievements/early_bird.svg',
    xpReward: 50,
    rarity: 'rare',
    secret: true,
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Completed 10 lessons on a weekend',
    category: 'secret',
    iconUrl: '/achievements/weekend_warrior.svg',
    xpReward: 100,
    rarity: 'rare',
    secret: true,
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Returned after 30 days away',
    category: 'secret',
    iconUrl: '/achievements/comeback.svg',
    xpReward: 75,
    rarity: 'rare',
    secret: true,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Completed 5 lessons in one hour',
    category: 'secret',
    iconUrl: '/achievements/speed_demon.svg',
    xpReward: 100,
    rarity: 'epic',
    secret: true,
  },
  {
    id: 'marathon_learner',
    name: 'Marathon Learner',
    description: 'Studied for 3+ hours in a single session',
    category: 'secret',
    iconUrl: '/achievements/marathon.svg',
    xpReward: 150,
    rarity: 'epic',
    secret: true,
  },
];

// ============================================================================
// ACHIEVEMENT SERVICE
// ============================================================================

class AchievementService {
  /**
   * Get all achievement definitions
   */
  getDefinitions(options?: { includeSecret?: boolean }): AchievementDefinition[] {
    if (options?.includeSecret) {
      return ACHIEVEMENT_DEFINITIONS;
    }
    return ACHIEVEMENT_DEFINITIONS.filter((a) => !a.secret);
  }

  /**
   * Get player's achievements
   */
  async getPlayerAchievements(studentId: string): Promise<{
    earned: Achievement[];
    progress: AchievementProgress[];
    stats: { total: number; earned: number; percentage: number };
  }> {
    const earned = await prisma.earnedAchievement.findMany({
      where: { studentId },
      orderBy: { earnedAt: 'desc' },
    });

    const earnedIds = new Set(earned.map((e) => e.achievementId));
    const visibleDefinitions = ACHIEVEMENT_DEFINITIONS.filter((a) => !a.secret || earnedIds.has(a.id));

    // Get profile for progress calculation
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
    });

    const progress: AchievementProgress[] = [];

    for (const def of visibleDefinitions) {
      if (earnedIds.has(def.id)) continue;
      if (!def.requirement) continue;

      const currentValue = await this.getCurrentValue(studentId, def.requirement.type, profile);
      const targetValue = def.requirement.count;

      if (currentValue > 0) {
        progress.push({
          achievementId: def.id,
          achievement: this.toAchievement(def),
          currentValue,
          targetValue,
          percentage: Math.min(100, Math.round((currentValue / targetValue) * 100)),
        });
      }
    }

    // Sort progress by percentage (closest to completion first)
    progress.sort((a, b) => b.percentage - a.percentage);

    return {
      earned: earned.map((e) => {
        const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === e.achievementId)!;
        return {
          ...this.toAchievement(def),
          earnedAt: e.earnedAt,
        };
      }),
      progress: progress.slice(0, 10),
      stats: {
        total: visibleDefinitions.length,
        earned: earned.length,
        percentage: Math.round((earned.length / visibleDefinitions.length) * 100),
      },
    };
  }

  /**
   * Get recent achievements
   */
  async getRecentAchievements(studentId: string, limit: number = 5): Promise<Achievement[]> {
    const earned = await prisma.earnedAchievement.findMany({
      where: { studentId },
      orderBy: { earnedAt: 'desc' },
      take: limit,
    });

    return earned.map((e) => {
      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === e.achievementId);
      if (!def) return null;
      return {
        ...this.toAchievement(def),
        earnedAt: e.earnedAt,
      };
    }).filter(Boolean) as Achievement[];
  }

  /**
   * Check and award a specific achievement
   */
  async checkAndAward(studentId: string, achievementId: string): Promise<boolean> {
    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === achievementId);
    if (!def) return false;

    // Check if already earned
    const existing = await prisma.earnedAchievement.findUnique({
      where: {
        studentId_achievementId: { studentId, achievementId },
      },
    });

    if (existing) return false;

    // Award achievement
    await this.awardAchievement(studentId, def);
    return true;
  }

  /**
   * Check lesson-based achievements
   */
  async checkLessonAchievements(studentId: string): Promise<void> {
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { lessonsCompleted: true, perfectScores: true },
    });

    if (!profile) return;

    // Check lesson count achievements
    const lessonAchievements = ACHIEVEMENT_DEFINITIONS.filter(
      (a) => a.requirement?.type === 'lessons_completed'
    );

    for (const achievement of lessonAchievements) {
      if (profile.lessonsCompleted >= achievement.requirement!.count) {
        await this.checkAndAward(studentId, achievement.id);
      }
    }

    // Check first lesson
    if (profile.lessonsCompleted === 1) {
      await this.checkAndAward(studentId, 'first_lesson');
    }

    // Check perfect score achievements
    const perfectAchievements = ACHIEVEMENT_DEFINITIONS.filter(
      (a) => a.requirement?.type === 'perfect_scores'
    );

    for (const achievement of perfectAchievements) {
      if (profile.perfectScores >= achievement.requirement!.count) {
        await this.checkAndAward(studentId, achievement.id);
      }
    }
  }

  /**
   * Check XP achievements
   */
  async checkXPAchievements(studentId: string, totalXp: number): Promise<void> {
    const xpAchievements = ACHIEVEMENT_DEFINITIONS.filter((a) => a.requirement?.type === 'total_xp');

    for (const achievement of xpAchievements) {
      if (totalXp >= achievement.requirement!.count) {
        await this.checkAndAward(studentId, achievement.id);
      }
    }
  }

  /**
   * Check streak achievements
   */
  async checkStreakAchievements(studentId: string, streakDays: number): Promise<void> {
    const streakAchievements = ACHIEVEMENT_DEFINITIONS.filter((a) => a.requirement?.type === 'streak_days');

    for (const achievement of streakAchievements) {
      if (streakDays >= achievement.requirement!.count) {
        await this.checkAndAward(studentId, achievement.id);
      }
    }
  }

  /**
   * Check skill achievements
   */
  async checkSkillAchievements(studentId: string): Promise<void> {
    // Skills mastered would be tracked in a separate skills table
    // For now, we'll skip this as it depends on the learning model service
  }

  /**
   * Check quiz achievements
   */
  async checkQuizAchievements(studentId: string): Promise<void> {
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { quizzesCompleted: true },
    });

    if (!profile) return;

    const quizAchievements = ACHIEVEMENT_DEFINITIONS.filter(
      (a) => a.requirement?.type === 'quizzes_completed'
    );

    for (const achievement of quizAchievements) {
      if (profile.quizzesCompleted >= achievement.requirement!.count) {
        await this.checkAndAward(studentId, achievement.id);
      }
    }
  }

  /**
   * Check time-based secret achievements
   */
  async checkTimeBasedAchievements(studentId: string): Promise<void> {
    const now = new Date();
    const hour = now.getHours();

    // Night owl (midnight to 5 AM)
    if (hour >= 0 && hour < 5) {
      await this.checkAndAward(studentId, 'night_owl');
    }

    // Early bird (5 AM to 6 AM)
    if (hour >= 5 && hour < 6) {
      await this.checkAndAward(studentId, 'early_bird');
    }

    // Weekend warrior
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Would need to track weekend lessons - simplified for now
    }
  }

  /**
   * Check time spent achievements
   */
  async checkTimeAchievements(studentId: string): Promise<void> {
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { totalTimeMinutes: true },
    });

    if (!profile) return;

    const timeAchievements = ACHIEVEMENT_DEFINITIONS.filter(
      (a) => a.requirement?.type === 'total_time_minutes'
    );

    for (const achievement of timeAchievements) {
      if (profile.totalTimeMinutes >= achievement.requirement!.count) {
        await this.checkAndAward(studentId, achievement.id);
      }
    }
  }

  /**
   * Award an achievement
   */
  private async awardAchievement(studentId: string, definition: AchievementDefinition): Promise<void> {
    await prisma.earnedAchievement.create({
      data: {
        studentId,
        achievementId: definition.id,
        earnedAt: new Date(),
      },
    });

    // Award XP for achievement (direct update to avoid recursion)
    if (definition.xpReward > 0) {
      await prisma.playerProfile.update({
        where: { studentId },
        data: {
          totalXp: { increment: definition.xpReward },
          todayXp: { increment: definition.xpReward },
        },
      });

      await prisma.xPTransaction.create({
        data: {
          studentId,
          amount: definition.xpReward,
          activity: 'achievement_earned',
          metadata: { achievementId: definition.id },
          earnedAt: new Date(),
        },
      });
    }

    // Emit event for notifications/celebrations
    eventEmitter.emit('achievement.earned', {
      studentId,
      achievementId: definition.id,
      name: definition.name,
      description: definition.description,
      iconUrl: definition.iconUrl,
      xpReward: definition.xpReward,
      rarity: definition.rarity,
    });

    console.log(`Achievement earned: ${studentId} - ${definition.name}`);
  }

  /**
   * Get current value for a requirement type
   */
  private async getCurrentValue(
    studentId: string,
    type: string,
    profile: {
      lessonsCompleted?: number;
      perfectScores?: number;
      totalXp?: number;
      streakDays?: number;
      totalTimeMinutes?: number;
      quizzesCompleted?: number;
    } | null
  ): Promise<number> {
    switch (type) {
      case 'lessons_completed':
        return profile?.lessonsCompleted || 0;
      case 'perfect_scores':
        return profile?.perfectScores || 0;
      case 'total_xp':
        return profile?.totalXp || 0;
      case 'streak_days':
        return profile?.streakDays || 0;
      case 'total_time_minutes':
        return profile?.totalTimeMinutes || 0;
      case 'quizzes_completed':
        return profile?.quizzesCompleted || 0;
      default:
        return 0;
    }
  }

  /**
   * Convert definition to Achievement type
   */
  private toAchievement(def: AchievementDefinition): Achievement {
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      iconUrl: def.iconUrl,
      xpReward: def.xpReward,
      rarity: def.rarity,
      tier: def.tier,
      secret: def.secret,
    };
  }
}

export const achievementService = new AchievementService();
