/**
 * Achievement Routes
 *
 * Handles achievement-related API endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { achievementService, ACHIEVEMENT_DEFINITIONS } from '../services/index.js';

const router = Router();

// ============================================================================
// HELPERS
// ============================================================================

const extractStudentId = (req: Request): string => {
  const studentId = req.headers['x-student-id'] as string;
  if (!studentId) {
    throw new Error('Student ID required');
  }
  return studentId;
};

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/gamification/achievements
 * Get all achievements and player progress
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const achievements = await achievementService.getPlayerAchievements(studentId);
    res.json({ success: true, data: achievements });
  })
);

/**
 * GET /api/gamification/achievements/definitions
 * Get all achievement definitions
 */
router.get('/definitions', (_req: Request, res: Response) => {
  res.json({ success: true, data: ACHIEVEMENT_DEFINITIONS });
});

/**
 * GET /api/gamification/achievements/:id
 * Get specific achievement details
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const achievementId = req.params.id;

    const definition = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === achievementId);
    if (!definition) {
      res.status(404).json({ success: false, error: 'Achievement not found' });
      return;
    }

    const { prisma } = await import('../prisma.js');
    const earned = await prisma.earnedAchievement.findFirst({
      where: { studentId, achievementId },
    });

    const progress = await prisma.achievementProgress.findFirst({
      where: { studentId, achievementId },
    });

    res.json({
      success: true,
      data: {
        ...definition,
        earned: !!earned,
        earnedAt: earned?.earnedAt,
        currentProgress: progress?.currentProgress || 0,
        progressPercentage: definition.threshold
          ? Math.min(100, ((progress?.currentProgress || 0) / definition.threshold) * 100)
          : earned
            ? 100
            : 0,
      },
    });
  })
);

/**
 * GET /api/gamification/achievements/recent
 * Get recently earned achievements
 */
router.get(
  '/recent/list',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const limit = parseInt(req.query.limit as string) || 5;

    const { prisma } = await import('../prisma.js');
    const recent = await prisma.earnedAchievement.findMany({
      where: { studentId },
      orderBy: { earnedAt: 'desc' },
      take: limit,
    });

    const achievements = recent.map((earned) => {
      const definition = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === earned.achievementId);
      return {
        ...definition,
        earnedAt: earned.earnedAt,
      };
    });

    res.json({ success: true, data: achievements });
  })
);

/**
 * GET /api/gamification/achievements/categories
 * Get achievements grouped by category
 */
router.get(
  '/categories/list',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);

    const { prisma } = await import('../prisma.js');
    const earned = await prisma.earnedAchievement.findMany({
      where: { studentId },
      select: { achievementId: true },
    });

    const earnedSet = new Set(earned.map((e) => e.achievementId));

    const categories = new Map<string, { total: number; earned: number; achievements: unknown[] }>();

    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
      if (!categories.has(achievement.category)) {
        categories.set(achievement.category, { total: 0, earned: 0, achievements: [] });
      }

      const cat = categories.get(achievement.category)!;
      cat.total++;
      if (earnedSet.has(achievement.id)) {
        cat.earned++;
      }
      cat.achievements.push({
        ...achievement,
        earned: earnedSet.has(achievement.id),
      });
    }

    const result = Array.from(categories.entries()).map(([name, data]) => ({
      name,
      ...data,
      percentage: Math.round((data.earned / data.total) * 100),
    }));

    res.json({ success: true, data: result });
  })
);

export default router;
