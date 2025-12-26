/**
 * Streak Routes
 *
 * Handles streak-related API endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { streakService } from '../services/index.js';

const router = Router();

// ============================================================================
// VALIDATION
// ============================================================================

const freezeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

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
 * GET /api/gamification/streaks
 * Get current streak info
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const streak = await streakService.getCurrentStreak(studentId);
    res.json({ success: true, data: streak });
  })
);

/**
 * GET /api/gamification/streaks/calendar
 * Get streak calendar for a month
 */
router.get(
  '/calendar',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const timezone = (req.query.timezone as string) || 'UTC';

    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string);

    let startDate: Date;
    let endDate: Date;

    if (!isNaN(month)) {
      // Specific month requested
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      // Default: last 30 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    const calendar = await streakService.getStreakCalendar(
      studentId,
      startDate,
      endDate,
      timezone
    );

    res.json({ success: true, data: calendar });
  })
);

/**
 * POST /api/gamification/streaks/freeze
 * Use a streak freeze
 */
router.post(
  '/freeze',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const data = freezeSchema.parse(req.body);

    const result = await streakService.useStreakFreeze(
      studentId,
      data.date ? new Date(data.date) : new Date()
    );

    if (result) {
      res.json({ success: true, message: 'Streak freeze applied' });
    } else {
      res.status(400).json({
        success: false,
        error: 'Unable to apply streak freeze. Check if you have freezes available.',
      });
    }
  })
);

/**
 * GET /api/gamification/streaks/milestones
 * Get streak milestones
 */
router.get('/milestones', (_req: Request, res: Response) => {
  const milestones = [
    { days: 3, name: 'Getting Started', xpBonus: 25, icon: '🌱' },
    { days: 7, name: 'Week Warrior', xpBonus: 50, icon: '⚡' },
    { days: 14, name: 'Fortnight Fighter', xpBonus: 100, icon: '🔥' },
    { days: 30, name: 'Month Master', xpBonus: 250, icon: '⭐' },
    { days: 50, name: 'Consistency Champion', xpBonus: 400, icon: '🏆' },
    { days: 100, name: 'Century Sage', xpBonus: 1000, icon: '💎' },
    { days: 365, name: 'Year-Long Legend', xpBonus: 5000, icon: '👑' },
  ];

  res.json({ success: true, data: milestones });
});

/**
 * GET /api/gamification/streaks/stats
 * Get detailed streak statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);

    const { prisma } = await import('../prisma.js');

    const profile = await prisma.playerProfile.findUnique({
      where: { studentId },
      select: {
        currentStreak: true,
        longestStreak: true,
        streakFreezes: true,
        lastActivityDate: true,
      },
    });

    const freezeUsage = await prisma.streakFreezeUsage.count({
      where: { studentId },
    });

    const totalActiveDays = await prisma.dailyActivity.count({
      where: { studentId },
    });

    res.json({
      success: true,
      data: {
        currentStreak: profile?.currentStreak || 0,
        longestStreak: profile?.longestStreak || 0,
        availableFreezes: profile?.streakFreezes || 0,
        freezesUsed: freezeUsage,
        totalActiveDays,
        lastActivityDate: profile?.lastActivityDate,
      },
    });
  })
);

export default router;
