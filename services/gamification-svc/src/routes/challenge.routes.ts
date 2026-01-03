/**
 * Challenge Routes
 *
 * Handles challenge-related API endpoints
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

import { Router, Request, Response, NextFunction, IRouter } from 'express';
import { z } from 'zod';
import { challengeService, CHALLENGE_TEMPLATES } from '../services/index.js';

const router: IRouter = Router();

// ============================================================================
// VALIDATION
// ============================================================================

const classChallengeSchema = z.object({
  classId: z.string(),
  title: z.string().min(3).max(100),
  description: z.string().max(500),
  targetType: z.enum(['xp', 'lessons', 'achievements', 'streak']),
  targetValue: z.number().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  rewardXP: z.number().min(0),
  rewardCoins: z.number().min(0).optional(),
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
 * GET /api/gamification/challenges
 * Get all active challenges for the player
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const challenges = await challengeService.getActiveProgress(studentId);
    res.json({ success: true, data: challenges });
  })
);

/**
 * GET /api/gamification/challenges/templates
 * Get available challenge templates
 */
router.get('/templates', (_req: Request, res: Response) => {
  res.json({ success: true, data: CHALLENGE_TEMPLATES });
});

/**
 * GET /api/gamification/challenges/daily
 * Get today's daily challenges
 */
router.get(
  '/daily',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const challenges = await challengeService.getActiveProgress(studentId);
    const daily = challenges.filter((c) => c.type === 'daily');
    res.json({ success: true, data: daily });
  })
);

/**
 * GET /api/gamification/challenges/weekly
 * Get this week's weekly challenges
 */
router.get(
  '/weekly',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const challenges = await challengeService.getActiveProgress(studentId);
    const weekly = challenges.filter((c) => c.type === 'weekly');
    res.json({ success: true, data: weekly });
  })
);

/**
 * GET /api/gamification/challenges/monthly
 * Get this month's monthly challenges
 */
router.get(
  '/monthly',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const challenges = await challengeService.getActiveProgress(studentId);
    const monthly = challenges.filter((c) => c.type === 'monthly');
    res.json({ success: true, data: monthly });
  })
);

/**
 * GET /api/gamification/challenges/class/:classId
 * Get class challenges
 */
router.get(
  '/class/:classId',
  asyncHandler(async (req: Request, res: Response) => {
    const classId = req.params.classId;
    const includeEnded = req.query.includeEnded === 'true';

    const { prisma } = await import('../prisma.js');
    const where = includeEnded
      ? { classId }
      : { classId, endDate: { gte: new Date() } };

    const challenges = await prisma.classChallenge.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });

    res.json({ success: true, data: challenges });
  })
);

/**
 * POST /api/gamification/challenges/class
 * Create a class challenge (teacher only)
 */
router.post(
  '/class',
  asyncHandler(async (req: Request, res: Response) => {
    const data = classChallengeSchema.parse(req.body);

    // In production, verify teacher has permission for this class
    const teacherId = extractStudentId(req); // Using student ID as teacher ID for now
    const challenge = await challengeService.createClassChallenge(data.classId, teacherId, {
      name: data.title,
      description: data.description,
      metric: data.targetType,
      goal: data.targetValue,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      collaborative: false,
      rewards: {
        xp: data.rewardXP,
        coins: data.rewardCoins || 0,
      },
    });

    res.status(201).json({ success: true, data: challenge });
  })
);

/**
 * GET /api/gamification/challenges/class/:classId/:challengeId
 * Get class challenge details with participant progress
 */
router.get(
  '/class/:classId/:challengeId',
  asyncHandler(async (req: Request, res: Response) => {
    const { challengeId } = req.params;

    const { prisma } = await import('../prisma.js');
    const challenge = await prisma.classChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      res.status(404).json({ success: false, error: 'Challenge not found' });
      return;
    }

    // Get participant progress
    const progress = await prisma.classChallengeProgress.findMany({
      where: { challengeId },
      orderBy: { currentProgress: 'desc' },
    });

    res.json({
      success: true,
      data: {
        challenge,
        participants: progress,
        totalParticipants: progress.length,
        completedCount: progress.filter((p) => p.completed).length,
      },
    });
  })
);

/**
 * GET /api/gamification/challenges/completed
 * Get completed challenges history
 */
router.get(
  '/completed',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const { prisma } = await import('../prisma.js');
    const completed = await prisma.activeChallenge.findMany({
      where: {
        studentId,
        completed: true,
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    res.json({ success: true, data: completed });
  })
);

/**
 * GET /api/gamification/challenges/:id
 * Get specific challenge details
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const challengeId = req.params.id;

    const { prisma } = await import('../prisma.js');
    const challenge = await prisma.activeChallenge.findFirst({
      where: {
        studentId,
        id: challengeId,
      },
    });

    if (!challenge) {
      res.status(404).json({ success: false, error: 'Challenge not found' });
      return;
    }

    const template = CHALLENGE_TEMPLATES.find((t) => t.id === challenge.templateId);

    res.json({
      success: true,
      data: {
        ...challenge,
        template,
        progressPercentage: Math.min(100, (challenge.currentProgress / challenge.targetValue) * 100),
      },
    });
  })
);

export default router;
