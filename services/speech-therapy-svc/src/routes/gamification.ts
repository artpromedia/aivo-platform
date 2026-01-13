/**
 * Speech Therapy Gamification Routes
 *
 * API endpoints for rewards, achievements, and progress tracking.
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  getProgressSummary,
  getAchievementProgress,
  SPEECH_ACHIEVEMENTS,
} from '../services/speech-gamification.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// AUTH HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthUser {
  sub: string;
  tenantId: string;
  learnerId?: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const gamificationRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /gamification/summary
   * Get complete progress summary for a learner
   */
  app.get<{ Querystring: { learnerId?: string } }>(
    '/summary',
    async (request, reply) => {
      const user = getUser(request);
      const learnerId = request.query.learnerId || user.learnerId;

      if (!learnerId) {
        return reply.code(400).send({ error: 'learnerId is required' });
      }

      const summary = getProgressSummary(user.tenantId, learnerId);

      // Calculate next level progress
      const xpInCurrentLevel = summary.totalXp;
      const xpForNextLevel = calculateXpForNextLevel(summary.currentLevel);
      const xpForCurrentLevel = calculateXpForLevel(summary.currentLevel);
      const levelProgress = Math.round(
        ((xpInCurrentLevel - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
      );

      return reply.send({
        ...summary,
        levelProgress: Math.max(0, Math.min(100, levelProgress)),
        xpForNextLevel,
      });
    }
  );

  /**
   * GET /gamification/achievements
   * Get all achievements and progress
   */
  app.get<{ Querystring: { learnerId?: string; category?: string } }>(
    '/achievements',
    async (request, reply) => {
      const user = getUser(request);
      const learnerId = request.query.learnerId || user.learnerId;
      const category = request.query.category;

      if (!learnerId) {
        return reply.code(400).send({ error: 'learnerId is required' });
      }

      let achievements = getAchievementProgress(user.tenantId, learnerId);

      if (category) {
        achievements = achievements.filter((a) => a.category === category);
      }

      const completed = achievements.filter((a) => a.isCompleted);
      const inProgress = achievements.filter((a) => !a.isCompleted && a.progressPercentage > 0);

      return reply.send({
        achievements,
        stats: {
          total: achievements.length,
          completed: completed.length,
          inProgress: inProgress.length,
          completionPercentage: Math.round((completed.length / achievements.length) * 100),
        },
        recentlyUnlocked: completed
          .filter((a) => a.completedAt)
          .sort((a, b) => (b.completedAt!.getTime() - a.completedAt!.getTime()))
          .slice(0, 3),
        nearestToUnlock: inProgress
          .sort((a, b) => b.progressPercentage - a.progressPercentage)
          .slice(0, 3),
      });
    }
  );

  /**
   * GET /gamification/achievements/categories
   * Get achievement categories and counts
   */
  app.get('/achievements/categories', async (_request, reply) => {
    const categories: Record<string, { count: number; description: string }> = {
      SESSIONS: {
        count: SPEECH_ACHIEVEMENTS.filter((a) => a.category === 'SESSIONS').length,
        description: 'Complete therapy sessions',
      },
      ACCURACY: {
        count: SPEECH_ACHIEVEMENTS.filter((a) => a.category === 'ACCURACY').length,
        description: 'Achieve high accuracy scores',
      },
      GOALS: {
        count: SPEECH_ACHIEVEMENTS.filter((a) => a.category === 'GOALS').length,
        description: 'Master speech therapy goals',
      },
      HOME_PRACTICE: {
        count: SPEECH_ACHIEVEMENTS.filter((a) => a.category === 'HOME_PRACTICE').length,
        description: 'Complete home practice assignments',
      },
      STREAKS: {
        count: SPEECH_ACHIEVEMENTS.filter((a) => a.category === 'STREAKS').length,
        description: 'Build practice streaks',
      },
      SOUNDS: {
        count: SPEECH_ACHIEVEMENTS.filter((a) => a.category === 'SOUNDS').length,
        description: 'Master target sounds',
      },
    };

    return reply.send({ categories });
  });

  /**
   * GET /gamification/streak
   * Get streak information
   */
  app.get<{ Querystring: { learnerId?: string } }>(
    '/streak',
    async (request, reply) => {
      const user = getUser(request);
      const learnerId = request.query.learnerId || user.learnerId;

      if (!learnerId) {
        return reply.code(400).send({ error: 'learnerId is required' });
      }

      const summary = getProgressSummary(user.tenantId, learnerId);

      // Calculate next streak milestone
      const streakMilestones = [3, 7, 14, 30, 60, 90];
      const nextMilestone = streakMilestones.find((m) => m > summary.currentStreak) || 100;
      const daysToNextMilestone = nextMilestone - summary.currentStreak;

      return reply.send({
        currentStreak: summary.currentStreak,
        longestStreak: summary.longestStreak,
        nextMilestone,
        daysToNextMilestone,
        streakMessage: getStreakMessage(summary.currentStreak),
      });
    }
  );

  /**
   * GET /gamification/level-info
   * Get level information and rewards
   */
  app.get('/level-info', async (_request, reply) => {
    const levels = [];
    for (let i = 1; i <= 30; i++) {
      levels.push({
        level: i,
        xpRequired: calculateXpForLevel(i),
        title: getLevelTitle(i),
      });
    }

    return reply.send({ levels });
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
  3250, 3850, 4500, 5200, 6000, 6900, 7900, 9000, 10200, 11500,
  13000, 14700, 16600, 18700, 21000, 23500, 26200, 29100, 32200, 35500,
];

function calculateXpForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level <= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1];
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - LEVEL_THRESHOLDS.length) * 5000;
}

function calculateXpForNextLevel(currentLevel: number): number {
  return calculateXpForLevel(currentLevel + 1);
}

function getLevelTitle(level: number): string {
  const titles: Record<number, string> = {
    1: 'Beginner',
    2: 'Novice',
    3: 'Learner',
    4: 'Apprentice',
    5: 'Student',
    6: 'Practitioner',
    7: 'Speaker',
    8: 'Communicator',
    9: 'Articulator',
    10: 'Expert',
    15: 'Master',
    20: 'Champion',
    25: 'Legend',
    30: 'Speech Superstar',
  };

  // Find the highest matching title
  let title = 'Beginner';
  for (const [lvl, t] of Object.entries(titles)) {
    if (level >= parseInt(lvl)) {
      title = t;
    }
  }
  return title;
}

function getStreakMessage(streak: number): string {
  if (streak === 0) {
    return "Start your streak today! Practice makes progress.";
  } else if (streak === 1) {
    return "Great start! Come back tomorrow to keep it going!";
  } else if (streak < 7) {
    return `${streak} days strong! Keep the momentum going!`;
  } else if (streak < 14) {
    return `Wow! ${streak} days! You're building an amazing habit!`;
  } else if (streak < 30) {
    return `${streak} days! You're a practice superstar!`;
  } else {
    return `Incredible! ${streak} days! You're unstoppable!`;
  }
}
