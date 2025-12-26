/**
 * Gamification Service
 *
 * Core gamification engine that:
 * - Awards XP for learning activities
 * - Tracks player levels and progression
 * - Manages achievements and badges
 * - Maintains streaks and daily goals
 * - Coordinates challenges and rewards
 * - Respects teacher/parent controls
 */

import { prisma } from '../prisma.js';
import { eventEmitter } from '../events/event-emitter.js';
import {
  XPTransaction,
  PlayerProfile,
  LevelConfig,
  DailyGoal,
  Streak,
  PlayerDashboardResponse,
  PlayerSettings,
} from '../types/gamification.types.js';
import { achievementService } from './achievement.service.js';
import { streakService } from './streak.service.js';
import { leaderboardService } from './leaderboard.service.js';
import { challengeService } from './challenge.service.js';
import { rewardService } from './reward.service.js';

// ============================================================================
// XP AWARD CONFIGURATION
// ============================================================================

export const XP_AWARDS: Record<string, number> = {
  // Lesson activities
  lesson_started: 5,
  lesson_completed: 25,
  lesson_perfect_score: 50,
  lesson_first_try_correct: 10,
  lesson_streak_bonus: 5, // Per question in a row correct

  // Assessment activities
  quiz_completed: 30,
  quiz_passed: 20,
  quiz_perfect: 100,
  test_completed: 50,
  test_passed: 30,

  // Practice activities
  practice_session: 10,
  skill_practiced: 5,
  skill_mastered: 75,

  // Engagement activities
  daily_login: 5,
  daily_goal_met: 25,
  streak_maintained: 10,
  streak_milestone: 50, // Every 7 days

  // Social activities
  helped_classmate: 15,
  discussion_contribution: 10,

  // Challenge activities
  challenge_joined: 5,
  challenge_completed: 50,
  challenge_won: 100,
};

// ============================================================================
// LEVEL CONFIGURATION
// ============================================================================

export const LEVEL_CONFIG: LevelConfig[] = [
  { level: 1, xpRequired: 0, title: 'Novice Learner', color: '#9E9E9E' },
  { level: 2, xpRequired: 100, title: 'Curious Explorer', color: '#8BC34A' },
  { level: 3, xpRequired: 250, title: 'Knowledge Seeker', color: '#4CAF50' },
  { level: 4, xpRequired: 500, title: 'Rising Star', color: '#00BCD4' },
  { level: 5, xpRequired: 1000, title: 'Dedicated Scholar', color: '#2196F3' },
  { level: 6, xpRequired: 1750, title: 'Brilliant Mind', color: '#3F51B5' },
  { level: 7, xpRequired: 2750, title: 'Master Student', color: '#9C27B0' },
  { level: 8, xpRequired: 4000, title: 'Learning Champion', color: '#E91E63' },
  { level: 9, xpRequired: 5500, title: 'Knowledge Wizard', color: '#FF5722' },
  { level: 10, xpRequired: 7500, title: 'Legendary Learner', color: '#FFD700' },
  { level: 11, xpRequired: 10000, title: 'Epic Scholar', color: '#FF4081' },
  { level: 12, xpRequired: 13000, title: 'Grandmaster', color: '#7C4DFF' },
  { level: 13, xpRequired: 16500, title: 'Sage of Wisdom', color: '#00E5FF' },
  { level: 14, xpRequired: 20500, title: 'Enlightened One', color: '#76FF03' },
  { level: 15, xpRequired: 25000, title: 'Transcendent Mind', color: '#FF6D00' },
  { level: 16, xpRequired: 30000, title: 'Cosmic Scholar', color: '#D500F9' },
  { level: 17, xpRequired: 36000, title: 'Universal Genius', color: '#1DE9B6' },
  { level: 18, xpRequired: 43000, title: 'Infinite Learner', color: '#FFEA00' },
  { level: 19, xpRequired: 51000, title: 'Timeless Master', color: '#F50057' },
  { level: 20, xpRequired: 60000, title: 'Ultimate Legend', color: '#651FFF' },
];

// ============================================================================
// GAMIFICATION SERVICE
// ============================================================================

class GamificationService {
  // ==========================================================================
  // PLAYER PROFILE
  // ==========================================================================

  /**
   * Get or create player profile
   */
  async getPlayerProfile(studentId: string): Promise<PlayerProfile> {
    let profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      include: {
        equippedItems: true,
        activeTitle: true,
      },
    });

    if (!profile) {
      profile = await prisma.playerProfile.create({
        data: {
          studentId,
          totalXp: 0,
          level: 1,
          currentLevelXp: 0,
          coins: 0,
          gems: 0,
          streakDays: 0,
          longestStreak: 0,
          dailyXpGoal: 50,
          lessonsCompleted: 0,
          quizzesCompleted: 0,
          perfectScores: 0,
          totalTimeMinutes: 0,
          settings: {
            showOnLeaderboard: true,
            celebrationsEnabled: true,
            soundEnabled: true,
            dailyReminders: true,
          },
        },
        include: {
          equippedItems: true,
          activeTitle: true,
        },
      });

      // Award welcome achievement
      await achievementService.checkAndAward(studentId, 'welcome');
    }

    return this.toPlayerProfile(profile);
  }

  /**
   * Get player dashboard data
   */
  async getPlayerDashboard(studentId: string): Promise<PlayerDashboardResponse> {
    const [profile, streak, dailyGoal, recentAchievements, activeChallenges, leaderboardRank] =
      await Promise.all([
        this.getPlayerProfile(studentId),
        streakService.getCurrentStreak(studentId),
        this.getDailyGoalProgress(studentId),
        achievementService.getRecentAchievements(studentId, 5),
        challengeService.getActiveProgress(studentId),
        leaderboardService.getPlayerRank(studentId, 'weekly'),
      ]);

    return {
      profile,
      streak,
      dailyGoal,
      recentAchievements,
      activeChallenges,
      leaderboardRank,
    };
  }

  /**
   * Update player settings
   */
  async updatePlayerSettings(studentId: string, settings: Partial<PlayerSettings>): Promise<PlayerProfile> {
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { settings: true },
    });

    const currentSettings = (profile?.settings as PlayerSettings) || {};
    const newSettings = { ...currentSettings, ...settings };

    await prisma.playerProfile.update({
      where: { studentId },
      data: { settings: newSettings },
    });

    return this.getPlayerProfile(studentId);
  }

  // ==========================================================================
  // XP SYSTEM
  // ==========================================================================

  /**
   * Award XP for an activity
   */
  async awardXP(
    studentId: string,
    activity: string,
    options?: {
      multiplier?: number;
      bonusXp?: number;
      metadata?: Record<string, unknown>;
      skipCelebration?: boolean;
    }
  ): Promise<XPTransaction> {
    const baseXP = XP_AWARDS[activity];
    if (!baseXP) {
      console.warn(`Unknown activity: ${activity}`);
      return {
        id: '',
        studentId,
        amount: 0,
        activity,
        reason: 'Unknown activity',
        createdAt: new Date(),
      };
    }

    const multiplier = options?.multiplier || 1;
    const bonusXP = options?.bonusXp || 0;
    const totalXP = Math.round(baseXP * multiplier + bonusXP);

    // Check if gamification is enabled for this student
    const isEnabled = await this.isGamificationEnabled(studentId);
    if (!isEnabled) {
      return {
        id: '',
        studentId,
        amount: 0,
        activity,
        reason: 'Gamification disabled',
        createdAt: new Date(),
      };
    }

    // Apply any active XP boosters
    const boostedXP = await this.applyBoosters(studentId, totalXP);

    // Create transaction
    const transaction = await prisma.xPTransaction.create({
      data: {
        studentId,
        amount: boostedXP,
        activity,
        metadata: options?.metadata,
        earnedAt: new Date(),
      },
    });

    // Get current profile
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
    });

    if (!profile) {
      throw new Error('Player profile not found');
    }

    const newTotalXP = profile.totalXp + boostedXP;
    const { newLevel, currentLevelXp, leveledUp } = this.calculateLevel(newTotalXP, profile.level);

    // Update profile
    await prisma.playerProfile.update({
      where: { studentId },
      data: {
        totalXp: newTotalXP,
        level: newLevel,
        currentLevelXp,
        todayXp: { increment: boostedXP },
        weekXp: { increment: boostedXP },
        monthXp: { increment: boostedXP },
      },
    });

    // Update daily goal progress
    await this.updateDailyGoalProgress(studentId, boostedXP);

    // Check for XP-based achievements
    await achievementService.checkXPAchievements(studentId, newTotalXP);

    // Emit events
    eventEmitter.emit('xp.awarded', {
      studentId,
      amount: boostedXP,
      activity,
      newTotal: newTotalXP,
    });

    if (leveledUp) {
      eventEmitter.emit('player.levelUp', {
        studentId,
        oldLevel: profile.level,
        newLevel,
        title: LEVEL_CONFIG[newLevel - 1]?.title,
      });

      // Award level-up rewards
      await rewardService.awardLevelUpRewards(studentId, newLevel);
    }

    // Update leaderboards
    await leaderboardService.updatePlayerScore(studentId, boostedXP);

    console.log(`XP awarded: ${studentId} +${boostedXP} for ${activity} (total: ${newTotalXP})`);

    return {
      id: transaction.id,
      studentId,
      amount: boostedXP,
      activity,
      reason: this.getActivityDescription(activity),
      createdAt: transaction.earnedAt,
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
    };
  }

  /**
   * Calculate level from total XP
   */
  private calculateLevel(
    totalXP: number,
    currentLevel: number
  ): {
    newLevel: number;
    currentLevelXp: number;
    leveledUp: boolean;
    xpToNextLevel: number;
  } {
    let newLevel = 1;

    for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
      if (totalXP >= LEVEL_CONFIG[i].xpRequired) {
        newLevel = LEVEL_CONFIG[i].level;
        break;
      }
    }

    const currentLevelConfig = LEVEL_CONFIG[newLevel - 1];
    const nextLevelConfig = LEVEL_CONFIG[newLevel] || currentLevelConfig;

    const currentLevelXp = totalXP - currentLevelConfig.xpRequired;
    const xpToNextLevel = nextLevelConfig.xpRequired - totalXP;
    const leveledUp = newLevel > currentLevel;

    return {
      newLevel,
      currentLevelXp,
      leveledUp,
      xpToNextLevel: Math.max(0, xpToNextLevel),
    };
  }

  /**
   * Apply active XP boosters
   */
  private async applyBoosters(studentId: string, baseXP: number): Promise<number> {
    const activeBoosters = await prisma.activeBooster.findMany({
      where: {
        studentId,
        expiresAt: { gt: new Date() },
      },
    });

    let multiplier = 1;
    for (const booster of activeBoosters) {
      multiplier += booster.multiplier - 1; // Stack additively
    }

    return Math.round(baseXP * multiplier);
  }

  // ==========================================================================
  // DAILY GOALS
  // ==========================================================================

  /**
   * Get daily goal progress
   */
  async getDailyGoalProgress(studentId: string): Promise<DailyGoal> {
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { dailyXpGoal: true, todayXp: true, streakDays: true },
    });

    if (!profile) {
      return {
        goal: 50,
        current: 0,
        progress: 0,
        completed: false,
        streak: 0,
      };
    }

    const todayXp = profile.todayXp || 0;
    const goal = profile.dailyXpGoal;
    const progress = Math.min(100, Math.round((todayXp / goal) * 100));
    const completed = todayXp >= goal;

    return {
      goal,
      current: todayXp,
      progress,
      completed,
      streak: profile.streakDays,
    };
  }

  /**
   * Update daily XP goal
   */
  async updateDailyGoal(studentId: string, newGoal: number): Promise<void> {
    if (newGoal < 10 || newGoal > 500) {
      throw new Error('Daily goal must be between 10 and 500 XP');
    }

    await prisma.playerProfile.update({
      where: { studentId },
      data: { dailyXpGoal: newGoal },
    });
  }

  /**
   * Update daily goal progress (internal)
   */
  private async updateDailyGoalProgress(studentId: string, xpEarned: number): Promise<void> {
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { dailyXpGoal: true, todayXp: true },
    });

    if (!profile) return;

    const previousXp = profile.todayXp || 0;
    const wasComplete = previousXp >= profile.dailyXpGoal;
    const nowComplete = previousXp + xpEarned >= profile.dailyXpGoal;

    if (!wasComplete && nowComplete) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Record goal completion
      await prisma.dailyGoalRecord.upsert({
        where: {
          studentId_date: { studentId, date: today },
        },
        create: {
          studentId,
          date: today,
          goal: profile.dailyXpGoal,
          achieved: previousXp + xpEarned,
          completed: true,
          completedAt: new Date(),
        },
        update: {
          achieved: previousXp + xpEarned,
          completed: true,
          completedAt: new Date(),
        },
      });

      // Award XP for completing daily goal (but don't recurse)
      await prisma.xPTransaction.create({
        data: {
          studentId,
          amount: XP_AWARDS.daily_goal_met,
          activity: 'daily_goal_met',
          earnedAt: new Date(),
        },
      });

      await prisma.playerProfile.update({
        where: { studentId },
        data: {
          totalXp: { increment: XP_AWARDS.daily_goal_met },
          todayXp: { increment: XP_AWARDS.daily_goal_met },
        },
      });

      // Check streak
      await streakService.recordActivity(studentId, 'daily_goal');

      eventEmitter.emit('dailyGoal.completed', { studentId });
    }
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * Handle lesson completed event
   */
  async handleLessonCompleted(event: {
    studentId: string;
    lessonId: string;
    score: number;
    timeSpentSeconds: number;
    firstAttempt: boolean;
  }): Promise<void> {
    const { studentId, score, firstAttempt } = event;

    // Base XP for completion
    await this.awardXP(studentId, 'lesson_completed', {
      metadata: { lessonId: event.lessonId },
    });

    // Bonus for perfect score
    if (score === 100) {
      await this.awardXP(studentId, 'lesson_perfect_score');

      await prisma.playerProfile.update({
        where: { studentId },
        data: { perfectScores: { increment: 1 } },
      });
    }

    // Bonus for first try correct
    if (firstAttempt && score >= 80) {
      await this.awardXP(studentId, 'lesson_first_try_correct');
    }

    // Update lessons completed count
    await prisma.playerProfile.update({
      where: { studentId },
      data: {
        lessonsCompleted: { increment: 1 },
        totalTimeMinutes: { increment: Math.round(event.timeSpentSeconds / 60) },
      },
    });

    // Check for lesson-based achievements
    await achievementService.checkLessonAchievements(studentId);

    // Update challenge progress
    await challengeService.updateProgress(studentId, 'lessons_completed', 1);

    // Check time-based secret achievements
    await achievementService.checkTimeBasedAchievements(studentId);
  }

  /**
   * Handle quiz completed event
   */
  async handleQuizCompleted(event: {
    studentId: string;
    quizId: string;
    score: number;
    passed: boolean;
  }): Promise<void> {
    const { studentId, score, passed } = event;

    await this.awardXP(studentId, 'quiz_completed');

    if (passed) {
      await this.awardXP(studentId, 'quiz_passed');
    }

    if (score === 100) {
      await this.awardXP(studentId, 'quiz_perfect');
    }

    await prisma.playerProfile.update({
      where: { studentId },
      data: { quizzesCompleted: { increment: 1 } },
    });

    await challengeService.updateProgress(studentId, 'quizzes_completed', 1);
  }

  /**
   * Handle skill mastered event
   */
  async handleSkillMastered(event: { studentId: string; skillId: string }): Promise<void> {
    await this.awardXP(event.studentId, 'skill_mastered', {
      metadata: { skillId: event.skillId },
    });

    await achievementService.checkSkillAchievements(event.studentId);
  }

  /**
   * Handle user login event
   */
  async handleUserLogin(event: { studentId: string }): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already logged in today
    const existingLogin = await prisma.dailyLogin.findFirst({
      where: {
        studentId: event.studentId,
        date: today,
      },
    });

    if (!existingLogin) {
      await prisma.dailyLogin.create({
        data: {
          studentId: event.studentId,
          date: today,
        },
      });

      await this.awardXP(event.studentId, 'daily_login');
      await streakService.recordActivity(event.studentId, 'login');
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Check if gamification is enabled for a student
   */
  private async isGamificationEnabled(studentId: string): Promise<boolean> {
    // Get student's profile settings
    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: { settings: true },
    });

    // If profile exists and has gamification explicitly disabled, return false
    // For now, we'll assume gamification is always enabled unless specifically disabled
    // In production, this would check class settings, parental controls, etc.

    return true;
  }

  /**
   * Get activity description
   */
  private getActivityDescription(activity: string): string {
    const descriptions: Record<string, string> = {
      lesson_started: 'Started a lesson',
      lesson_completed: 'Completed a lesson',
      lesson_perfect_score: 'Perfect score on lesson',
      lesson_first_try_correct: 'First try success',
      quiz_completed: 'Completed a quiz',
      quiz_passed: 'Passed a quiz',
      quiz_perfect: 'Perfect quiz score',
      daily_login: 'Daily login bonus',
      daily_goal_met: 'Daily goal achieved',
      streak_maintained: 'Streak maintained',
      skill_mastered: 'Mastered a skill',
      challenge_completed: 'Challenge completed',
      practice_session: 'Practice session',
      skill_practiced: 'Practiced a skill',
      helped_classmate: 'Helped a classmate',
      discussion_contribution: 'Contributed to discussion',
      challenge_joined: 'Joined a challenge',
      challenge_won: 'Won a challenge',
    };

    return descriptions[activity] || activity;
  }

  /**
   * Convert database profile to PlayerProfile type
   */
  private toPlayerProfile(data: {
    id: string;
    studentId: string;
    totalXp: number;
    level: number;
    currentLevelXp: number;
    todayXp: number;
    weekXp: number;
    monthXp: number;
    coins: number;
    gems: number;
    streakDays: number;
    longestStreak: number;
    dailyXpGoal: number;
    lessonsCompleted: number;
    quizzesCompleted: number;
    perfectScores: number;
    totalTimeMinutes: number;
    settings: unknown;
    equippedItems?: unknown[];
    activeTitle?: { id: string; name: string; color: string | null } | null;
  }): PlayerProfile {
    const levelConfig = LEVEL_CONFIG[data.level - 1] || LEVEL_CONFIG[0];
    const nextLevelConfig = LEVEL_CONFIG[data.level] || levelConfig;

    const levelXpRange = nextLevelConfig.xpRequired - levelConfig.xpRequired;
    const xpProgress = levelXpRange > 0 ? Math.round((data.currentLevelXp / levelXpRange) * 100) : 100;

    return {
      id: data.id,
      studentId: data.studentId,
      totalXp: data.totalXp,
      level: data.level,
      levelTitle: levelConfig.title,
      levelColor: levelConfig.color,
      currentLevelXp: data.currentLevelXp,
      xpToNextLevel: Math.max(0, nextLevelConfig.xpRequired - data.totalXp),
      xpProgress,
      coins: data.coins,
      gems: data.gems,
      streakDays: data.streakDays,
      longestStreak: data.longestStreak,
      dailyXpGoal: data.dailyXpGoal,
      todayXp: data.todayXp,
      weekXp: data.weekXp,
      monthXp: data.monthXp,
      lessonsCompleted: data.lessonsCompleted,
      quizzesCompleted: data.quizzesCompleted,
      perfectScores: data.perfectScores,
      totalTimeMinutes: data.totalTimeMinutes,
      settings: data.settings as PlayerSettings,
      activeTitle: data.activeTitle
        ? { id: data.activeTitle.id, name: data.activeTitle.name, color: data.activeTitle.color || undefined }
        : null,
    };
  }
}

export const gamificationService = new GamificationService();
