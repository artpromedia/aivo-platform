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

import type { Request, Response, NextFunction, IRouter } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { 
  gamificationService, 
  achievementService, 
  streakService, 
  leaderboardService,
} from '../services/index.js';

const router: IRouter = Router();

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

function getLearnerIdFromAuth(req: Request): string {
  // In production, extract from JWT
  const learnerId = req.headers['x-learner-id'] as string;
  if (!learnerId) {
    throw new Error('Learner ID required');
  }
  return learnerId;
}

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

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
    leaderboardPosition: profile.leaderboardRank ? {
      rank: profile.leaderboardRank,
      totalParticipants: profile.totalParticipants || 100,
      scope: 'class',
    } : null,
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

/**
 * GET /gamification/:learnerId/profile
 * Get gamification profile for a learner
 */
router.get(
  '/:learnerId/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const paramsResult = learnerIdParamSchema.safeParse(req.params);
    
    if (!paramsResult.success) {
      res.status(400).json({ error: 'Invalid learner ID' });
      return;
    }

    const { learnerId } = paramsResult.data;

    try {
      const [profile, streak] = await Promise.all([
        gamificationService.getPlayerProfile(learnerId),
        streakService.getCurrentStreak(learnerId),
      ]);

      const mobileProfile = transformProfile({ ...profile, ...streak }, learnerId);
      res.json(mobileProfile);
    } catch (error) {
      console.error('Error fetching gamification profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  })
);

/**
 * GET /gamification/:learnerId/badges
 * Get all badges earned by a learner
 */
router.get(
  '/:learnerId/badges',
  asyncHandler(async (req: Request, res: Response) => {
    const paramsResult = learnerIdParamSchema.safeParse(req.params);
    
    if (!paramsResult.success) {
      res.status(400).json({ error: 'Invalid learner ID' });
      return;
    }

    const { learnerId } = paramsResult.data;

    try {
      const achievements = await achievementService.getPlayerAchievements(learnerId);
      const badges = achievements.map(transformEarnedBadge);

      res.json({ badges });
    } catch (error) {
      console.error('Error fetching earned badges:', error);
      res.status(500).json({ error: 'Failed to fetch badges' });
    }
  })
);

/**
 * GET /gamification/badges
 * Get all available badges
 */
router.get(
  '/badges',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      // TODO: Implement getAllAvailableBadges in achievement service
      // For now, return mock data
      const badges: MobileBadge[] = [
        {
          id: 'badge-1',
          name: 'First Steps',
          description: 'Complete your first lesson',
          iconUrl: '/badges/first-steps.png',
          category: 'achievement',
          rarity: 'common',
          pointsValue: 10,
          requirement: {
            type: 'lessons_completed',
            targetValue: 1,
          },
        },
        {
          id: 'badge-2',
          name: 'Math Master',
          description: 'Complete 10 math lessons',
          iconUrl: '/badges/math-master.png',
          category: 'skill',
          rarity: 'uncommon',
          pointsValue: 50,
          requirement: {
            type: 'lessons_completed',
            targetValue: 10,
            skillId: 'math',
          },
        },
        {
          id: 'badge-3',
          name: 'Weekly Warrior',
          description: 'Maintain a 7-day streak',
          iconUrl: '/badges/weekly-warrior.png',
          category: 'streak',
          rarity: 'rare',
          pointsValue: 100,
          requirement: {
            type: 'streak_days',
            targetValue: 7,
          },
        },
      ];

      res.json({ badges });
    } catch (error) {
      console.error('Error fetching available badges:', error);
      res.status(500).json({ error: 'Failed to fetch badges' });
    }
  })
);

/**
 * GET /gamification/leaderboard
 * Get leaderboard
 */
router.get(
  '/leaderboard',
  asyncHandler(async (req: Request, res: Response) => {
    const queryResult = leaderboardQuerySchema.safeParse(req.query);
    
    if (!queryResult.success) {
      res.status(400).json({ error: 'Invalid query parameters' });
      return;
    }

    const { scope, limit } = queryResult.data;
    const currentLearnerId = getLearnerIdFromAuth(req);

    try {
      const leaderboard = await leaderboardService.getLeaderboard({
        scope,
        limit,
        studentId: currentLearnerId,
      });

      const entries: MobileLeaderboardEntry[] = leaderboard.map((entry: any, index: number) => ({
        rank: index + 1,
        learnerId: entry.studentId,
        learnerName: entry.studentName || 'Student',
        avatarUrl: entry.avatarUrl || null,
        points: entry.totalXP || 0,
        level: entry.level || 1,
        isCurrentUser: entry.studentId === currentLearnerId,
      }));

      res.json({ entries });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  })
);

/**
 * GET /gamification/rewards
 * Get available rewards
 */
router.get(
  '/rewards',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      // TODO: Implement rewards in shop service
      // For now, return mock data
      const rewards: MobileReward[] = [
        {
          id: 'reward-1',
          name: 'Rainbow Avatar',
          description: 'Unlock the rainbow avatar',
          iconUrl: '/rewards/rainbow-avatar.png',
          pointsCost: 100,
          type: 'avatar',
          isAvailable: true,
        },
        {
          id: 'reward-2',
          name: 'Dark Theme',
          description: 'Unlock the dark theme',
          iconUrl: '/rewards/dark-theme.png',
          pointsCost: 200,
          type: 'theme',
          isAvailable: true,
        },
        {
          id: 'reward-3',
          name: 'Double XP',
          description: 'Earn 2x XP for 1 hour',
          iconUrl: '/rewards/double-xp.png',
          pointsCost: 50,
          type: 'power_up',
          isAvailable: true,
        },
      ];

      res.json({ rewards });
    } catch (error) {
      console.error('Error fetching rewards:', error);
      res.status(500).json({ error: 'Failed to fetch rewards' });
    }
  })
);

/**
 * POST /gamification/rewards/:rewardId/redeem
 * Redeem a reward
 */
router.post(
  '/rewards/:rewardId/redeem',
  asyncHandler(async (req: Request, res: Response) => {
    const { rewardId } = req.params;
    const learnerId = getLearnerIdFromAuth(req);

    try {
      // TODO: Implement reward redemption in shop service
      // For now, return mock success
      console.log(`Learner ${learnerId} redeeming reward ${rewardId}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error redeeming reward:', error);
      res.status(500).json({ error: 'Failed to redeem reward' });
    }
  })
);

/**
 * GET /gamification/:learnerId/badges/:badgeId/progress
 * Get progress towards a specific badge
 */
router.get(
  '/:learnerId/badges/:badgeId/progress',
  asyncHandler(async (req: Request, res: Response) => {
    const paramsResult = badgeIdParamSchema.safeParse(req.params);
    
    if (!paramsResult.success) {
      res.status(400).json({ error: 'Invalid parameters' });
      return;
    }

    const { learnerId, badgeId } = paramsResult.data;

    try {
      // TODO: Implement badge progress tracking in achievement service
      // For now, return mock data
      const progress = {
        badgeId,
        learnerId,
        progress: 5,
        target: 10,
        percentComplete: 0.5,
      };

      res.json(progress);
    } catch (error) {
      console.error('Error fetching badge progress:', error);
      res.status(500).json({ error: 'Failed to fetch badge progress' });
    }
  })
);

export default router;
