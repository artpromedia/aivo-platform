/**
 * Mobile Gamification Routes
 *
 * Mobile-friendly API endpoints for gamification features.
 * Matches Flutter client expectations for badges, rewards, leaderboards.
 *
 * Endpoints:
 * - GET /gamification/:learnerId/profile - Get gamification profile
 * - GET /gamification/:learnerId/badges - Get earned badges
 * - GET /gamification/badges - Get all available badges
 * - GET /gamification/leaderboard - Get leaderboard
 * - GET /gamification/rewards - Get available rewards
 * - POST /gamification/rewards/:rewardId/redeem - Redeem a reward
 * - GET /gamification/:learnerId/badges/:badgeId/progress - Get badge progress
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  gamificationService,
  achievementService,
  streakService,
  leaderboardService,
  rewardService,
  ACHIEVEMENT_DEFINITIONS,
} from '../services/index.js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const learnerIdParamSchema = z.object({
  learnerId: z.string().uuid(),
});

const badgeIdParamSchema = z.object({
  learnerId: z.string().uuid(),
  badgeId: z.string().uuid(),
});

const leaderboardQuerySchema = z.object({
  scope: z.enum(['class', 'school', 'global']).default('class'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// TYPE DEFINITIONS (matching Flutter client)
// ============================================================================

interface MobileBadge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  rarity: string;
  pointsValue: number;
  requirement?: {
    type: string;
    targetValue: number;
    skillId?: string;
  };
}

interface MobileEarnedBadge {
  id: string;
  badge: MobileBadge;
  earnedAt: string;
  earnedForActivity: string | null;
}

interface MobileGamificationProfile {
  learnerId: string;
  totalPoints: number;
  level: number;
  pointsToNextLevel: number;
  streakDays: number;
  longestStreak: number;
  recentBadges: MobileEarnedBadge[];
  totalBadges: number;
  leaderboardPosition: {
    rank: number;
    totalParticipants: number;
    scope: string;
  } | null;
}

interface MobileLeaderboardEntry {
  rank: number;
  learnerId: string;
  learnerName: string;
  avatarUrl: string | null;
  points: number;
  level: number;
  isCurrentUser: boolean;
}

interface MobileReward {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  pointsCost: number;
  type: string;
  isAvailable: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getLearnerIdFromAuth(request: FastifyRequest): string {
  // In production, extract from JWT
  const learnerId = request.headers['x-learner-id'] as string;
  if (!learnerId) {
    throw new Error('Learner ID required');
  }
  return learnerId;
}

/**
 * Transform backend profile to mobile format
 */
function transformProfile(profile: any, learnerId: string): MobileGamificationProfile {
  return {
    learnerId,
    totalPoints: profile.totalXP || 0,
    level: profile.level || 1,
    pointsToNextLevel: profile.xpToNextLevel || 100,
    streakDays: profile.currentStreak || 0,
    longestStreak: profile.longestStreak || 0,
    recentBadges: profile.recentAchievements?.map((ach: any) => transformEarnedBadge(ach)) || [],
    totalBadges: profile.totalAchievements || 0,
    leaderboardPosition: profile.leaderboardRank
      ? {
          rank: profile.leaderboardRank,
          totalParticipants: profile.totalParticipants || 100,
          scope: 'class',
        }
      : null,
  };
}

/**
 * Transform backend achievement to mobile earned badge
 */
function transformEarnedBadge(achievement: any): MobileEarnedBadge {
  return {
    id: achievement.id,
    badge: {
      id: achievement.achievementType || 'badge-1',
      name: achievement.name || 'Achievement',
      description: achievement.description || '',
      iconUrl: achievement.iconUrl || '/badges/default.png',
      category: achievement.category || 'achievement',
      rarity: achievement.rarity || 'common',
      pointsValue: achievement.xpValue || 10,
    },
    earnedAt: achievement.earnedAt?.toISOString() || new Date().toISOString(),
    earnedForActivity: achievement.contextId || null,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

async function mobileGamificationRoutes(app: FastifyInstance) {
  /**
   * GET /gamification/:learnerId/profile
   * Get gamification profile for a learner
   */
  app.get(
    '/:learnerId/profile',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const paramsResult = learnerIdParamSchema.safeParse(request.params);

      if (!paramsResult.success) {
        reply.status(400);
        return { error: 'Invalid learner ID' };
      }

      const { learnerId } = paramsResult.data;

      try {
        const [profile, streak] = await Promise.all([
          gamificationService.getPlayerProfile(learnerId),
          streakService.getCurrentStreak(learnerId),
        ]);

        const mobileProfile = transformProfile({ ...profile, ...streak }, learnerId);
        return mobileProfile;
      } catch (error) {
        console.error('Error fetching gamification profile:', error);
        reply.status(500);
        return { error: 'Failed to fetch profile' };
      }
    }
  );

  /**
   * GET /gamification/:learnerId/badges
   * Get all badges earned by a learner
   */
  app.get(
    '/:learnerId/badges',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const paramsResult = learnerIdParamSchema.safeParse(request.params);

      if (!paramsResult.success) {
        reply.status(400);
        return { error: 'Invalid learner ID' };
      }

      const { learnerId } = paramsResult.data;

      try {
        const achievements = await achievementService.getPlayerAchievements(learnerId);
        const badges = achievements.earned.map(transformEarnedBadge);

        return { badges };
      } catch (error) {
        console.error('Error fetching earned badges:', error);
        reply.status(500);
        return { error: 'Failed to fetch badges' };
      }
    }
  );

  /**
   * GET /gamification/badges
   * Get all available badges
   */
  app.get('/badges', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const badges: MobileBadge[] = ACHIEVEMENT_DEFINITIONS.filter((d) => !d.secret).map((def) => ({
        id: def.id,
        name: def.name,
        description: def.description,
        iconUrl: def.iconUrl || `/badges/${def.id}.png`,
        category: def.category,
        rarity: def.rarity,
        pointsValue: def.xpReward,
        requirement: def.requirement
          ? {
              type: def.requirement.type,
              targetValue: def.requirement.count ?? 1,
              skillId: (def.requirement as any).skillId,
            }
          : undefined,
      }));

      return { badges };
    } catch (error) {
      console.error('Error fetching available badges:', error);
      reply.status(500);
      return { error: 'Failed to fetch badges' };
    }
  });

  /**
   * GET /gamification/leaderboard
   * Get leaderboard
   */
  app.get('/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const queryResult = leaderboardQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      reply.status(400);
      return { error: 'Invalid query parameters' };
    }

    const { scope, limit } = queryResult.data;
    const currentLearnerId = getLearnerIdFromAuth(request);

    try {
      const leaderboard = await leaderboardService.getLeaderboard({
        scope,
        limit,
      });

      const entries: MobileLeaderboardEntry[] = leaderboard.entries.map((entry: any, index: number) => ({
        rank: index + 1,
        learnerId: entry.studentId,
        learnerName: entry.studentName || 'Student',
        avatarUrl: entry.avatarUrl || null,
        points: entry.totalXP || 0,
        level: entry.level || 1,
        isCurrentUser: entry.studentId === currentLearnerId,
      }));

      return { entries };
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      reply.status(500);
      return { error: 'Failed to fetch leaderboard' };
    }
  });

  /**
   * GET /gamification/rewards
   * Get available rewards
   */
  app.get('/rewards', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const learnerId = getLearnerIdFromAuth(request);
      const shop = await rewardService.getShopItems(learnerId);

      const rewards: MobileReward[] = shop.categories.flatMap((cat) =>
        cat.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          iconUrl: (item as any).imageUrl || (item as any).iconUrl || `/rewards/${item.id}.png`,
          pointsCost: item.price,
          type: item.category,
          isAvailable: true,
        }))
      );

      return { rewards, balance: shop.playerBalance };
    } catch (error) {
      console.error('Error fetching rewards:', error);
      reply.status(500);
      return { error: 'Failed to fetch rewards' };
    }
  });

  /**
   * POST /gamification/rewards/:rewardId/redeem
   * Redeem a reward
   */
  app.post(
    '/rewards/:rewardId/redeem',
    async (request: FastifyRequest<{ Params: { rewardId: string } }>, reply: FastifyReply) => {
      const { rewardId } = request.params;
      const learnerId = getLearnerIdFromAuth(request);

      try {
        const result = await rewardService.purchaseItem(learnerId, rewardId);

        if (!result.success) {
          reply.status(400);
          return { success: false, error: result.message };
        }

        return { success: true };
      } catch (error) {
        console.error('Error redeeming reward:', error);
        reply.status(500);
        return { error: 'Failed to redeem reward' };
      }
    }
  );

  /**
   * GET /gamification/:learnerId/badges/:badgeId/progress
   * Get progress towards a specific badge
   */
  app.get(
    '/:learnerId/badges/:badgeId/progress',
    async (
      request: FastifyRequest<{ Params: { learnerId: string; badgeId: string } }>,
      reply: FastifyReply
    ) => {
      const paramsResult = badgeIdParamSchema.safeParse(request.params);

      if (!paramsResult.success) {
        reply.status(400);
        return { error: 'Invalid parameters' };
      }

      const { learnerId, badgeId } = paramsResult.data;

      try {
        const earned = await achievementService.getPlayerAchievements(learnerId);
        const definition = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === badgeId);

        if (!definition) {
          reply.status(404);
          return { error: 'Badge not found' };
        }

        const isEarned = earned.earned.some((a: any) => a.achievementType === badgeId || a.id === badgeId);
        const target = definition.requirement?.count ?? 1;

        const progress = {
          badgeId,
          learnerId,
          name: definition.name,
          description: definition.description,
          progress: isEarned ? target : 0,
          target,
          percentComplete: isEarned ? 1 : 0,
          earned: isEarned,
        };

        return progress;
      } catch (error) {
        console.error('Error fetching badge progress:', error);
        reply.status(500);
        return { error: 'Failed to fetch badge progress' };
      }
    }
  );
}

export default mobileGamificationRoutes;
