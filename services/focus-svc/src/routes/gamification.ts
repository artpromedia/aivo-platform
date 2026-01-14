/**
 * Gamification Routes
 *
 * API endpoints for XP/Coins rewards, achievements, streaks, and leaderboards.
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

import {
  getRewardsSummary,
  getAchievementProgress,
  getStreakInfo,
  getRewardHistory,
  getLeaderboard,
  ACHIEVEMENT_DEFINITIONS,
  type AchievementCategory,
} from '../services/gamification.service.js';

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
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const gamificationRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /gamification/rewards
   * Get current XP, coins, and level for a learner
   */
  app.get<{ Querystring: { learnerId?: string } }>('/rewards', async (request, reply) => {
    const user = getUser(request);
    const learnerId = request.query.learnerId || user.learnerId;

    if (!learnerId) {
      return reply.code(400).send({ error: 'learnerId is required' });
    }

    const summary = getRewardsSummary(user.tenantId, learnerId);
    return reply.send(summary);
  });

  /**
   * GET /gamification/achievements
   * Get all achievements and their progress
   */
  app.get<{ Querystring: { learnerId?: string; category?: string; includeHidden?: string } }>(
    '/achievements',
    async (request, reply) => {
      const user = getUser(request);
      const learnerId = request.query.learnerId || user.learnerId;
      const category = request.query.category as AchievementCategory | undefined;
      const includeHidden = request.query.includeHidden === 'true';

      if (!learnerId) {
        return reply.code(400).send({ error: 'learnerId is required' });
      }

      let achievements = getAchievementProgress(user.tenantId, learnerId, includeHidden);

      // Filter by category if specified
      if (category) {
        achievements = achievements.filter((a) => a.category === category);
      }

      // Calculate summary stats
      const completed = achievements.filter((a) => a.isCompleted).length;
      const total = achievements.length;
      const inProgress = achievements.filter(
        (a) => !a.isCompleted && a.progressPercentage > 0
      ).length;

      return reply.send({
        achievements,
        summary: {
          total,
          completed,
          inProgress,
          completionPercentage: Math.round((completed / total) * 100),
        },
      });
    }
  );

  /**
   * GET /gamification/achievements/definitions
   * Get all available achievement definitions
   */
  app.get('/achievements/definitions', async (_request, reply) => {
    const definitions = ACHIEVEMENT_DEFINITIONS.filter((d) => !d.isHidden).map((d) => ({
      code: d.code,
      title: d.title,
      description: d.description,
      category: d.category,
      tier: d.tier,
      xpReward: d.xpReward,
      coinReward: d.coinReward,
    }));

    return reply.send({ definitions });
  });

  /**
   * GET /gamification/streaks
   * Get streak information for a learner
   */
  app.get<{ Querystring: { learnerId?: string } }>('/streaks', async (request, reply) => {
    const user = getUser(request);
    const learnerId = request.query.learnerId || user.learnerId;

    if (!learnerId) {
      return reply.code(400).send({ error: 'learnerId is required' });
    }

    const streakInfo = getStreakInfo(user.tenantId, learnerId);
    return reply.send(streakInfo);
  });

  /**
   * GET /gamification/history
   * Get reward transaction history
   */
  app.get<{ Querystring: { learnerId?: string; limit?: string } }>(
    '/history',
    async (request, reply) => {
      const user = getUser(request);
      const learnerId = request.query.learnerId || user.learnerId;
      const limit = parseInt(request.query.limit || '20', 10);

      if (!learnerId) {
        return reply.code(400).send({ error: 'learnerId is required' });
      }

      const history = getRewardHistory(user.tenantId, learnerId, limit);
      return reply.send({ transactions: history });
    }
  );

  /**
   * GET /gamification/leaderboard
   * Get XP leaderboard for the tenant
   */
  app.get<{ Querystring: { limit?: string } }>('/leaderboard', async (request, reply) => {
    const user = getUser(request);
    const limit = parseInt(request.query.limit || '10', 10);

    const leaderboard = getLeaderboard(user.tenantId, Math.min(limit, 50));
    return reply.send({ leaderboard });
  });

  /**
   * GET /gamification/summary
   * Get complete gamification summary (rewards + streaks + recent achievements)
   */
  app.get<{ Querystring: { learnerId?: string } }>('/summary', async (request, reply) => {
    const user = getUser(request);
    const learnerId = request.query.learnerId || user.learnerId;

    if (!learnerId) {
      return reply.code(400).send({ error: 'learnerId is required' });
    }

    const rewards = getRewardsSummary(user.tenantId, learnerId);
    const streaks = getStreakInfo(user.tenantId, learnerId);
    const achievements = getAchievementProgress(user.tenantId, learnerId, false);

    const recentAchievements = achievements
      .filter((a) => a.isCompleted)
      .sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0;
        return b.completedAt.getTime() - a.completedAt.getTime();
      })
      .slice(0, 3);

    const nearestAchievements = achievements
      .filter((a) => !a.isCompleted && a.progressPercentage > 0)
      .sort((a, b) => b.progressPercentage - a.progressPercentage)
      .slice(0, 3);

    return reply.send({
      rewards,
      streaks,
      recentAchievements,
      nearestAchievements,
      achievementSummary: {
        completed: achievements.filter((a) => a.isCompleted).length,
        total: achievements.length,
      },
    });
  });
};
