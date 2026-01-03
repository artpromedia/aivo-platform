/**
 * Gamification API Routes
 *
 * Handles player profiles, XP, levels, and dashboard
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

import { Router, Request, Response, NextFunction, IRouter } from 'express';
import { z } from 'zod';
import { gamificationService, achievementService, streakService, challengeService } from '../services/index.js';

const router: IRouter = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const awardXPSchema = z.object({
  activityType: z.string(),
  amount: z.number().optional(),
  lessonId: z.string().optional(),
  quizId: z.string().optional(),
  skillId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const dailyGoalSchema = z.object({
  xpGoal: z.number().min(10).max(500),
  lessonsGoal: z.number().min(1).max(20),
  minutesGoal: z.number().min(5).max(120),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Extract studentId from authenticated request
const extractStudentId = (req: Request): string => {
  // In production, this would come from JWT/session
  const studentId = req.headers['x-student-id'] as string;
  if (!studentId) {
    throw new Error('Student ID required');
  }
  return studentId;
};

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/gamification/profile
 * Get player profile and stats
 */
router.get(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const profile = await gamificationService.getPlayerProfile(studentId);
    res.json({ success: true, data: profile });
  })
);

/**
 * GET /api/gamification/dashboard
 * Get full gamification dashboard
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);

    // Fetch all dashboard data in parallel
    const [profile, achievements, streak, activeChallenges] = await Promise.all([
      gamificationService.getPlayerProfile(studentId),
      achievementService.getPlayerAchievements(studentId),
      streakService.getCurrentStreak(studentId),
      challengeService.getActiveProgress(studentId),
    ]);

    res.json({
      success: true,
      data: {
        profile,
        achievements,
        streak,
        activeChallenges,
      },
    });
  })
);

/**
 * POST /api/gamification/xp
 * Award XP for an activity
 */
router.post(
  '/xp',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const data = awardXPSchema.parse(req.body);

    const transaction = await gamificationService.awardXP(studentId, data.activityType, {
      bonusXp: data.amount,
      metadata: data.metadata,
    });

    res.json({ success: true, data: transaction });
  })
);

/**
 * GET /api/gamification/levels
 * Get level configuration
 */
router.get('/levels', (_req: Request, res: Response) => {
  const { LEVEL_CONFIG } = require('../services/gamification.service.js');
  res.json({ success: true, data: LEVEL_CONFIG });
});

/**
 * GET /api/gamification/xp/history
 * Get XP transaction history
 */
router.get(
  '/xp/history',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const { prisma } = await import('../prisma.js');
    const transactions = await prisma.xPTransaction.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    res.json({ success: true, data: transactions });
  })
);

/**
 * PUT /api/gamification/daily-goal
 * Update daily goal settings
 */
router.put(
  '/daily-goal',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const goals = dailyGoalSchema.parse(req.body);

    const { prisma } = await import('../prisma.js');
    const profile = await prisma.playerProfile.update({
      where: { studentId },
      data: {
        dailyXPGoal: goals.xpGoal,
        dailyLessonsGoal: goals.lessonsGoal,
        dailyMinutesGoal: goals.minutesGoal,
      },
    });

    res.json({ success: true, data: profile });
  })
);

/**
 * GET /api/gamification/daily-progress
 * Get today's progress towards daily goals
 */
router.get(
  '/daily-progress',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const progress = await gamificationService.getDailyGoalProgress(studentId);
    res.json({ success: true, data: progress });
  })
);

export default router;
