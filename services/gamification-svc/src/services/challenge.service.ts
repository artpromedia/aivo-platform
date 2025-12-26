/**
 * Challenge Service
 *
 * Manages challenges and quests:
 * - Daily challenges
 * - Weekly challenges
 * - Monthly challenges
 * - Special event challenges
 * - Class challenges (collaborative)
 */

import { prisma } from '../prisma.js';
import { eventEmitter } from '../events/event-emitter.js';
import {
  Challenge,
  ChallengeDefinition,
  ChallengeProgress,
  ChallengeType,
} from '../types/gamification.types.js';

// ============================================================================
// CHALLENGE TEMPLATES
// ============================================================================

export const CHALLENGE_TEMPLATES: ChallengeDefinition[] = [
  // Daily challenges
  {
    id: 'daily_lessons_3',
    name: 'Daily Trio',
    description: 'Complete 3 lessons today',
    type: 'daily',
    category: 'lessons',
    goal: 3,
    metric: 'lessons_completed',
    xpReward: 50,
    coinReward: 10,
    iconUrl: '/challenges/daily_lessons.svg',
  },
  {
    id: 'daily_lessons_5',
    name: 'High Five',
    description: 'Complete 5 lessons today',
    type: 'daily',
    category: 'lessons',
    goal: 5,
    metric: 'lessons_completed',
    xpReward: 75,
    coinReward: 15,
    iconUrl: '/challenges/daily_lessons.svg',
  },
  {
    id: 'daily_perfect_1',
    name: 'Perfection',
    description: 'Get a perfect score on any lesson',
    type: 'daily',
    category: 'mastery',
    goal: 1,
    metric: 'perfect_scores',
    xpReward: 75,
    coinReward: 15,
    iconUrl: '/challenges/daily_perfect.svg',
  },
  {
    id: 'daily_time_30',
    name: 'Study Session',
    description: 'Study for 30 minutes',
    type: 'daily',
    category: 'time',
    goal: 30,
    metric: 'time_minutes',
    xpReward: 40,
    coinReward: 8,
    iconUrl: '/challenges/daily_time.svg',
  },
  {
    id: 'daily_xp_100',
    name: 'XP Hunter',
    description: 'Earn 100 XP today',
    type: 'daily',
    category: 'xp',
    goal: 100,
    metric: 'xp_earned',
    xpReward: 30,
    coinReward: 5,
    iconUrl: '/challenges/daily_xp.svg',
  },
  {
    id: 'daily_quiz_1',
    name: 'Quiz Time',
    description: 'Complete a quiz',
    type: 'daily',
    category: 'assessment',
    goal: 1,
    metric: 'quizzes_completed',
    xpReward: 35,
    coinReward: 7,
    iconUrl: '/challenges/daily_quiz.svg',
  },

  // Weekly challenges
  {
    id: 'weekly_lessons_15',
    name: 'Weekly Scholar',
    description: 'Complete 15 lessons this week',
    type: 'weekly',
    category: 'lessons',
    goal: 15,
    metric: 'lessons_completed',
    xpReward: 200,
    coinReward: 50,
    gemReward: 1,
    iconUrl: '/challenges/weekly_lessons.svg',
  },
  {
    id: 'weekly_lessons_25',
    name: 'Lesson Legend',
    description: 'Complete 25 lessons this week',
    type: 'weekly',
    category: 'lessons',
    goal: 25,
    metric: 'lessons_completed',
    xpReward: 350,
    coinReward: 80,
    gemReward: 2,
    iconUrl: '/challenges/weekly_lessons.svg',
  },
  {
    id: 'weekly_streak_7',
    name: 'Week Warrior',
    description: 'Maintain your streak for 7 days',
    type: 'weekly',
    category: 'consistency',
    goal: 7,
    metric: 'streak_days',
    xpReward: 150,
    coinReward: 40,
    iconUrl: '/challenges/weekly_streak.svg',
  },
  {
    id: 'weekly_perfect_5',
    name: 'Precision Week',
    description: 'Get 5 perfect scores this week',
    type: 'weekly',
    category: 'mastery',
    goal: 5,
    metric: 'perfect_scores',
    xpReward: 250,
    coinReward: 60,
    gemReward: 1,
    iconUrl: '/challenges/weekly_perfect.svg',
  },
  {
    id: 'weekly_quizzes_5',
    name: 'Quiz Master',
    description: 'Complete 5 quizzes',
    type: 'weekly',
    category: 'assessment',
    goal: 5,
    metric: 'quizzes_completed',
    xpReward: 225,
    coinReward: 55,
    iconUrl: '/challenges/weekly_quizzes.svg',
  },
  {
    id: 'weekly_time_180',
    name: 'Three Hour Challenge',
    description: 'Study for 3 hours this week',
    type: 'weekly',
    category: 'time',
    goal: 180,
    metric: 'time_minutes',
    xpReward: 175,
    coinReward: 45,
    iconUrl: '/challenges/weekly_time.svg',
  },

  // Monthly challenges
  {
    id: 'monthly_lessons_50',
    name: 'Monthly Master',
    description: 'Complete 50 lessons this month',
    type: 'monthly',
    category: 'lessons',
    goal: 50,
    metric: 'lessons_completed',
    xpReward: 500,
    coinReward: 150,
    gemReward: 5,
    iconUrl: '/challenges/monthly_lessons.svg',
  },
  {
    id: 'monthly_lessons_100',
    name: 'Century Challenge',
    description: 'Complete 100 lessons this month',
    type: 'monthly',
    category: 'lessons',
    goal: 100,
    metric: 'lessons_completed',
    xpReward: 1000,
    coinReward: 300,
    gemReward: 10,
    iconUrl: '/challenges/monthly_lessons.svg',
  },
  {
    id: 'monthly_perfect_20',
    name: 'Perfection Path',
    description: 'Get 20 perfect scores this month',
    type: 'monthly',
    category: 'mastery',
    goal: 20,
    metric: 'perfect_scores',
    xpReward: 600,
    coinReward: 175,
    gemReward: 7,
    iconUrl: '/challenges/monthly_perfect.svg',
  },
  {
    id: 'monthly_streak_30',
    name: 'Monthly Streak Master',
    description: 'Maintain a 30-day streak',
    type: 'monthly',
    category: 'consistency',
    goal: 30,
    metric: 'streak_days',
    xpReward: 750,
    coinReward: 200,
    gemReward: 10,
    iconUrl: '/challenges/monthly_streak.svg',
  },
];

// ============================================================================
// CHALLENGE SERVICE
// ============================================================================

class ChallengeService {
  /**
   * Get active challenges for a student
   */
  async getActiveChallenges(studentId: string): Promise<Challenge[]> {
    const now = new Date();

    const challenges = await prisma.activeChallenge.findMany({
      where: {
        studentId,
        startDate: { lte: now },
        endDate: { gt: now },
        status: { in: ['active', 'in_progress'] },
      },
      orderBy: { endDate: 'asc' },
    });

    return challenges.map((c) => this.toChallenge(c));
  }

  /**
   * Get active challenge progress
   */
  async getActiveProgress(studentId: string): Promise<ChallengeProgress[]> {
    const challenges = await this.getActiveChallenges(studentId);

    return challenges.map((c) => ({
      challengeId: c.id,
      challenge: c,
      currentValue: c.currentProgress || 0,
      targetValue: c.goal,
      percentage: Math.min(100, Math.round(((c.currentProgress || 0) / c.goal) * 100)),
      completed: (c.currentProgress || 0) >= c.goal,
      expiresAt: c.endDate,
    }));
  }

  /**
   * Get all challenges (active + completed + expired)
   */
  async getAllChallenges(
    studentId: string,
    options?: { type?: ChallengeType; status?: string }
  ): Promise<Challenge[]> {
    const where: Record<string, unknown> = { studentId };
    if (options?.type) where.type = options.type;
    if (options?.status) where.status = options.status;

    const challenges = await prisma.activeChallenge.findMany({
      where,
      orderBy: { endDate: 'desc' },
    });

    return challenges.map((c) => this.toChallenge(c));
  }

  /**
   * Update challenge progress
   */
  async updateProgress(studentId: string, metric: string, increment: number = 1): Promise<void> {
    const now = new Date();

    // Find all active challenges that track this metric
    const challenges = await prisma.activeChallenge.findMany({
      where: {
        studentId,
        metric,
        startDate: { lte: now },
        endDate: { gt: now },
        status: { in: ['active', 'in_progress'] },
      },
    });

    for (const challenge of challenges) {
      const newProgress = (challenge.currentProgress || 0) + increment;
      const completed = newProgress >= challenge.goal;

      await prisma.activeChallenge.update({
        where: { id: challenge.id },
        data: {
          currentProgress: newProgress,
          status: completed ? 'completed' : 'in_progress',
          completedAt: completed ? now : null,
        },
      });

      if (completed && challenge.status !== 'completed') {
        await this.awardChallengeRewards(studentId, challenge);
      }
    }
  }

  /**
   * Join a class challenge
   */
  async joinClassChallenge(studentId: string, challengeId: string): Promise<boolean> {
    const challenge = await prisma.classChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.status !== 'active') {
      return false;
    }

    // Check if already joined
    const existing = await prisma.classChallengeParticipant.findUnique({
      where: {
        challengeId_studentId: { challengeId, studentId },
      },
    });

    if (existing) {
      return true;
    }

    await prisma.classChallengeParticipant.create({
      data: {
        challengeId,
        studentId,
        progress: 0,
      },
    });

    return true;
  }

  /**
   * Award rewards for completing a challenge
   */
  private async awardChallengeRewards(studentId: string, challenge: {
    id: string;
    name: string;
    xpReward: number;
    coinReward?: number | null;
    gemReward?: number | null;
  }): Promise<void> {
    // Award XP
    if (challenge.xpReward) {
      await prisma.xPTransaction.create({
        data: {
          studentId,
          amount: challenge.xpReward,
          activity: 'challenge_completed',
          metadata: { challengeId: challenge.id },
          earnedAt: new Date(),
        },
      });

      await prisma.playerProfile.update({
        where: { studentId },
        data: {
          totalXp: { increment: challenge.xpReward },
          todayXp: { increment: challenge.xpReward },
        },
      });
    }

    // Award coins
    if (challenge.coinReward) {
      await prisma.playerProfile.update({
        where: { studentId },
        data: { coins: { increment: challenge.coinReward } },
      });
    }

    // Award gems
    if (challenge.gemReward) {
      await prisma.playerProfile.update({
        where: { studentId },
        data: { gems: { increment: challenge.gemReward } },
      });
    }

    // Emit event for celebration
    eventEmitter.emit('challenge.completed', {
      studentId,
      challengeId: challenge.id,
      name: challenge.name,
      xpReward: challenge.xpReward,
      coinReward: challenge.coinReward,
      gemReward: challenge.gemReward,
    });

    console.log(`Challenge completed: ${studentId} - ${challenge.name}`);
  }

  /**
   * Start daily challenges for all players
   */
  async startDailyChallenges(): Promise<void> {
    const dailyTemplates = CHALLENGE_TEMPLATES.filter((t) => t.type === 'daily');

    // Randomly select 3 daily challenges
    const selected = this.selectRandom(dailyTemplates, 3);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active students
    const students = await prisma.playerProfile.findMany({
      select: { studentId: true },
    });

    for (const student of students) {
      // Remove expired daily challenges
      await prisma.activeChallenge.deleteMany({
        where: {
          studentId: student.studentId,
          type: 'daily',
          endDate: { lt: today },
        },
      });

      // Create new daily challenges
      for (const template of selected) {
        try {
          await prisma.activeChallenge.upsert({
            where: {
              studentId_templateId_startDate: {
                studentId: student.studentId,
                templateId: template.id,
                startDate: today,
              },
            },
            create: {
              studentId: student.studentId,
              templateId: template.id,
              name: template.name,
              description: template.description,
              type: 'daily',
              category: template.category,
              metric: template.metric,
              goal: template.goal,
              currentProgress: 0,
              xpReward: template.xpReward,
              coinReward: template.coinReward,
              gemReward: template.gemReward,
              iconUrl: template.iconUrl,
              startDate: today,
              endDate: tomorrow,
              status: 'active',
            },
            update: {},
          });
        } catch (error) {
          // Ignore duplicate key errors
        }
      }
    }

    console.log(`Daily challenges started: ${selected.length} challenges for ${students.length} players`);
  }

  /**
   * Start weekly challenges
   */
  async startWeeklyChallenges(): Promise<void> {
    const weeklyTemplates = CHALLENGE_TEMPLATES.filter((t) => t.type === 'weekly');
    const selected = this.selectRandom(weeklyTemplates, 3);

    const today = new Date();
    const dayOfWeek = today.getDay();

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const students = await prisma.playerProfile.findMany({
      select: { studentId: true },
    });

    for (const student of students) {
      for (const template of selected) {
        try {
          await prisma.activeChallenge.upsert({
            where: {
              studentId_templateId_startDate: {
                studentId: student.studentId,
                templateId: template.id,
                startDate: weekStart,
              },
            },
            create: {
              studentId: student.studentId,
              templateId: template.id,
              name: template.name,
              description: template.description,
              type: 'weekly',
              category: template.category,
              metric: template.metric,
              goal: template.goal,
              currentProgress: 0,
              xpReward: template.xpReward,
              coinReward: template.coinReward,
              gemReward: template.gemReward,
              iconUrl: template.iconUrl,
              startDate: weekStart,
              endDate: weekEnd,
              status: 'active',
            },
            update: {},
          });
        } catch (error) {
          // Ignore duplicate key errors
        }
      }
    }

    console.log(`Weekly challenges started: ${selected.length} challenges`);
  }

  /**
   * Start monthly challenges
   */
  async startMonthlyChallenges(): Promise<void> {
    const monthlyTemplates = CHALLENGE_TEMPLATES.filter((t) => t.type === 'monthly');

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const students = await prisma.playerProfile.findMany({
      select: { studentId: true },
    });

    for (const student of students) {
      for (const template of monthlyTemplates) {
        try {
          await prisma.activeChallenge.upsert({
            where: {
              studentId_templateId_startDate: {
                studentId: student.studentId,
                templateId: template.id,
                startDate: monthStart,
              },
            },
            create: {
              studentId: student.studentId,
              templateId: template.id,
              name: template.name,
              description: template.description,
              type: 'monthly',
              category: template.category,
              metric: template.metric,
              goal: template.goal,
              currentProgress: 0,
              xpReward: template.xpReward,
              coinReward: template.coinReward,
              gemReward: template.gemReward,
              iconUrl: template.iconUrl,
              startDate: monthStart,
              endDate: monthEnd,
              status: 'active',
            },
            update: {},
          });
        } catch (error) {
          // Ignore duplicate key errors
        }
      }
    }

    console.log(`Monthly challenges started: ${monthlyTemplates.length} challenges`);
  }

  /**
   * Create a class challenge
   */
  async createClassChallenge(
    classId: string,
    teacherId: string,
    data: {
      name: string;
      description: string;
      metric: string;
      goal: number;
      startDate: Date;
      endDate: Date;
      collaborative: boolean;
      rewards: {
        xp?: number;
        coins?: number;
        gems?: number;
        badge?: string;
      };
    }
  ): Promise<Challenge> {
    const challenge = await prisma.classChallenge.create({
      data: {
        classId,
        createdBy: teacherId,
        name: data.name,
        description: data.description,
        metric: data.metric,
        goal: data.goal,
        currentProgress: 0,
        collaborative: data.collaborative,
        startDate: data.startDate,
        endDate: data.endDate,
        xpReward: data.rewards.xp,
        coinReward: data.rewards.coins,
        gemReward: data.rewards.gems,
        badgeReward: data.rewards.badge,
        status: 'active',
      },
    });

    // Emit event
    eventEmitter.emit('challenge.class.created', {
      challengeId: challenge.id,
      classId,
      name: data.name,
    });

    return this.toChallenge(challenge);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private selectRandom<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }

  private toChallenge(data: {
    id: string;
    name: string;
    description: string;
    type: string;
    category: string;
    metric: string;
    goal: number;
    currentProgress: number;
    xpReward: number;
    coinReward?: number | null;
    gemReward?: number | null;
    iconUrl?: string | null;
    startDate: Date;
    endDate: Date;
    status: string;
    completedAt?: Date | null;
  }): Challenge {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type as ChallengeType,
      category: data.category,
      metric: data.metric,
      goal: data.goal,
      currentProgress: data.currentProgress,
      xpReward: data.xpReward,
      coinReward: data.coinReward || undefined,
      gemReward: data.gemReward || undefined,
      iconUrl: data.iconUrl || '/challenges/default.svg',
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status as 'active' | 'in_progress' | 'completed' | 'expired',
      completedAt: data.completedAt,
    };
  }
}

export const challengeService = new ChallengeService();
