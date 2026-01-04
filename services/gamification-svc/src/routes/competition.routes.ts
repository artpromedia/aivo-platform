/**
 * Competition Routes
 *
 * Handles competition/tournament API endpoints
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

import { Router, Request, Response, NextFunction, IRouter } from 'express';
import { z } from 'zod';
import {
  competitionService,
  CompetitionType,
  CompetitionDuration,
  CompetitionCategory,
} from '../services/competition.service.js';

const router: IRouter = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const prizeSchema = z.object({
  rank: z.number().min(1),
  xp: z.number().min(0).optional(),
  coins: z.number().min(0).optional(),
  gems: z.number().min(0).optional(),
  badge: z.string().optional(),
  title: z.string().optional(),
});

const createCompetitionSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500),
  type: z.enum(['individual', 'team', 'class', 'school']),
  duration: z.enum(['daily', 'weekly', 'seasonal']),
  category: z.enum([
    'xp_earned',
    'lessons_completed',
    'reading_minutes',
    'math_problems',
    'streak_days',
    'perfect_scores',
  ]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  minParticipants: z.number().min(2).optional(),
  maxParticipants: z.number().min(2).max(1000).optional(),
  minLevel: z.number().min(1).optional(),
  maxLevel: z.number().min(1).optional(),
  schoolId: z.string().optional(),
  prizes: z.array(prizeSchema).min(1),
  isPublic: z.boolean().optional(),
  autoJoin: z.boolean().optional(),
});

const joinCompetitionSchema = z.object({
  participantId: z.string().optional(), // If joining as team/class
  participantType: z.enum(['individual', 'team', 'class', 'school']).optional(),
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

const extractTeacherId = (req: Request): string => {
  // In production, verify teacher role
  return req.headers['x-teacher-id'] as string || req.headers['x-student-id'] as string;
};

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/gamification/competitions
 * Create a new competition (teacher/admin only)
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const createdBy = extractTeacherId(req);
    const data = createCompetitionSchema.parse(req.body);

    const competition = await competitionService.createCompetition({
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      createdBy,
    });

    res.status(201).json({
      success: true,
      data: competition,
    });
  })
);

/**
 * GET /api/gamification/competitions
 * List active competitions
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const type = req.query.type as CompetitionType | undefined;
    const schoolId = req.query.schoolId as string | undefined;
    const studentId = req.query.forStudent === 'true' ? extractStudentId(req) : undefined;

    const competitions = await competitionService.listActiveCompetitions({
      type,
      schoolId,
      studentId,
    });

    res.json({
      success: true,
      data: competitions,
    });
  })
);

/**
 * GET /api/gamification/competitions/recommended
 * Get recommended competitions for the current student
 */
router.get(
  '/recommended',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const competitions = await competitionService.getRecommendedCompetitions(studentId);

    res.json({
      success: true,
      data: competitions,
    });
  })
);

/**
 * GET /api/gamification/competitions/history
 * Get past competition results
 */
router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const participantId = req.query.participantId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;

    const competitions = await competitionService.listCompletedCompetitions({
      participantId,
      limit,
    });

    res.json({
      success: true,
      data: competitions,
    });
  })
);

/**
 * GET /api/gamification/competitions/:id
 * Get competition details and standings
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const competitionId = req.params.id;
    const currentUserId = req.query.studentId as string | undefined ||
                          (req.headers['x-student-id'] as string | undefined);

    const details = await competitionService.getCompetitionDetails(
      competitionId,
      currentUserId
    );

    if (!details) {
      res.status(404).json({
        success: false,
        error: 'Competition not found',
      });
      return;
    }

    res.json({
      success: true,
      data: details,
    });
  })
);

/**
 * POST /api/gamification/competitions/:id/join
 * Join a competition
 */
router.post(
  '/:id/join',
  asyncHandler(async (req: Request, res: Response) => {
    const competitionId = req.params.id;
    const studentId = extractStudentId(req);

    try {
      const body = req.body as { participantId?: string; participantType?: CompetitionType };
      const participantId = body.participantId || studentId;
      const participantType = body.participantType;

      const success = await competitionService.joinCompetition(
        competitionId,
        participantId,
        participantType
      );

      res.json({
        success: true,
        data: { joined: success },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join competition',
      });
    }
  })
);

/**
 * POST /api/gamification/competitions/:id/leave
 * Leave a competition (only if not started)
 */
router.post(
  '/:id/leave',
  asyncHandler(async (req: Request, res: Response) => {
    const competitionId = req.params.id;
    const studentId = extractStudentId(req);

    try {
      const success = await competitionService.leaveCompetition(competitionId, studentId);

      res.json({
        success: true,
        data: { left: success },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave competition',
      });
    }
  })
);

/**
 * GET /api/gamification/competitions/:id/standings
 * Get competition standings/leaderboard
 */
router.get(
  '/:id/standings',
  asyncHandler(async (req: Request, res: Response) => {
    const competitionId = req.params.id;
    const currentUserId = req.query.studentId as string | undefined ||
                          (req.headers['x-student-id'] as string | undefined);

    const standings = await competitionService.getCompetitionStandings(
      competitionId,
      currentUserId
    );

    res.json({
      success: true,
      data: standings,
    });
  })
);

/**
 * POST /api/gamification/competitions/:id/finalize
 * Finalize competition and award prizes (admin only)
 */
router.post(
  '/:id/finalize',
  asyncHandler(async (req: Request, res: Response) => {
    const competitionId = req.params.id;
    // In production, verify admin role
    const adminId = extractTeacherId(req);

    if (!adminId) {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
      return;
    }

    await competitionService.finalizeCompetition(competitionId);

    res.json({
      success: true,
      message: 'Competition finalized and prizes awarded',
    });
  })
);

/**
 * GET /api/gamification/competitions/my/participations
 * Get competitions the current user is participating in
 */
router.get(
  '/my/participations',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);

    const { prisma } = await import('../prisma.js');
    const participations = await prisma.competitionParticipant.findMany({
      where: { participantId: studentId },
      include: {
        competition: {
          include: {
            _count: {
              select: { participants: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const data = participations.map((p) => ({
      participant: {
        id: p.id,
        score: p.score,
        rank: p.rank,
        prize: p.prize,
        joinedAt: p.joinedAt,
      },
      competition: {
        ...p.competition,
        currentParticipants: p.competition._count.participants,
      },
    }));

    res.json({
      success: true,
      data,
    });
  })
);

/**
 * GET /api/gamification/competitions/stats/overview
 * Get competition statistics (admin)
 */
router.get(
  '/stats/overview',
  asyncHandler(async (req: Request, res: Response) => {
    const { prisma } = await import('../prisma.js');

    const [total, active, completed, upcoming] = await Promise.all([
      prisma.competition.count(),
      prisma.competition.count({ where: { status: 'active' } }),
      prisma.competition.count({ where: { status: 'completed' } }),
      prisma.competition.count({ where: { status: 'upcoming' } }),
    ]);

    const totalParticipations = await prisma.competitionParticipant.count();

    res.json({
      success: true,
      data: {
        total,
        active,
        completed,
        upcoming,
        totalParticipations,
        averageParticipants: total > 0 ? Math.round(totalParticipations / total) : 0,
      },
    });
  })
);

export default router;
