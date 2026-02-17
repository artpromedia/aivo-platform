/**
 * Competition Routes
 *
 * Handles competition/tournament API endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { CompetitionType, CompetitionPrize } from '../services/competition.service.js';
import {
  competitionService,
  CompetitionDuration,
  CompetitionCategory,
} from '../services/competition.service.js';

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

const extractStudentId = (request: FastifyRequest): string => {
  const studentId = request.headers['x-student-id'] as string;
  if (!studentId) {
    throw new Error('Student ID required');
  }
  return studentId;
};

const extractTeacherId = (request: FastifyRequest): string => {
  // In production, verify teacher role
  return (request.headers['x-teacher-id'] as string) || (request.headers['x-student-id'] as string);
};

// ============================================================================
// ROUTES
// ============================================================================

async function competitionRoutes(app: FastifyInstance) {
  /**
   * POST /api/gamification/competitions
   * Create a new competition (teacher/admin only)
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const createdBy = extractTeacherId(request);
    const data = createCompetitionSchema.parse(request.body);

    const competition = await competitionService.createCompetition({
      name: data.name,
      description: data.description,
      type: data.type,
      duration: data.duration,
      category: data.category,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      minParticipants: data.minParticipants,
      maxParticipants: data.maxParticipants,
      minLevel: data.minLevel,
      maxLevel: data.maxLevel,
      schoolId: data.schoolId,
      prizes: data.prizes as CompetitionPrize[],
      isPublic: data.isPublic,
      autoJoin: data.autoJoin,
      createdBy,
    });

    reply.status(201);
    return {
      success: true,
      data: competition,
    };
  });

  /**
   * GET /api/gamification/competitions
   * List active competitions
   */
  app.get('/', async (request: FastifyRequest) => {
    const type = (request.query as any).type as CompetitionType | undefined;
    const schoolId = (request.query as any).schoolId as string | undefined;
    const studentId =
      (request.query as any).forStudent === 'true' ? extractStudentId(request) : undefined;

    const competitions = await competitionService.listActiveCompetitions({
      type,
      schoolId,
      studentId,
    });

    return {
      success: true,
      data: competitions,
    };
  });

  /**
   * GET /api/gamification/competitions/recommended
   * Get recommended competitions for the current student
   */
  app.get('/recommended', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const competitions = await competitionService.getRecommendedCompetitions(studentId);

    return {
      success: true,
      data: competitions,
    };
  });

  /**
   * GET /api/gamification/competitions/history
   * Get past competition results
   */
  app.get('/history', async (request: FastifyRequest) => {
    const participantId = (request.query as any).participantId as string | undefined;
    const limit = Number.parseInt((request.query as any).limit as string) || 20;

    const competitions = await competitionService.listCompletedCompetitions({
      participantId,
      limit,
    });

    return {
      success: true,
      data: competitions,
    };
  });

  /**
   * GET /api/gamification/competitions/:id
   * Get competition details and standings
   */
  app.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const competitionId = request.params.id;
      const currentUserId =
        ((request.query as any).studentId as string | undefined) ||
        (request.headers['x-student-id'] as string | undefined);

      const details = await competitionService.getCompetitionDetails(competitionId, currentUserId);

      if (!details) {
        reply.status(404);
        return {
          success: false,
          error: 'Competition not found',
        };
      }

      return {
        success: true,
        data: details,
      };
    }
  );

  /**
   * POST /api/gamification/competitions/:id/join
   * Join a competition
   */
  app.post(
    '/:id/join',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const competitionId = request.params.id;
      const studentId = extractStudentId(request);

      try {
        const body = request.body as { participantId?: string; participantType?: CompetitionType };
        const participantId = body.participantId || studentId;
        const participantType = body.participantType;

        const success = await competitionService.joinCompetition(
          competitionId,
          participantId,
          participantType
        );

        return {
          success: true,
          data: { joined: success },
        };
      } catch (error) {
        reply.status(400);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to join competition',
        };
      }
    }
  );

  /**
   * POST /api/gamification/competitions/:id/leave
   * Leave a competition (only if not started)
   */
  app.post(
    '/:id/leave',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const competitionId = request.params.id;
      const studentId = extractStudentId(request);

      try {
        const success = await competitionService.leaveCompetition(competitionId, studentId);

        return {
          success: true,
          data: { left: success },
        };
      } catch (error) {
        reply.status(400);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to leave competition',
        };
      }
    }
  );

  /**
   * GET /api/gamification/competitions/:id/standings
   * Get competition standings/leaderboard
   */
  app.get('/:id/standings', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const competitionId = request.params.id;
    const currentUserId =
      ((request.query as any).studentId as string | undefined) ||
      (request.headers['x-student-id'] as string | undefined);

    const standings = await competitionService.getCompetitionStandings(
      competitionId,
      currentUserId
    );

    return {
      success: true,
      data: standings,
    };
  });

  /**
   * POST /api/gamification/competitions/:id/finalize
   * Finalize competition and award prizes (admin only)
   */
  app.post(
    '/:id/finalize',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const competitionId = request.params.id;
      // In production, verify admin role
      const adminId = extractTeacherId(request);

      if (!adminId) {
        reply.status(403);
        return {
          success: false,
          error: 'Admin access required',
        };
      }

      await competitionService.finalizeCompetition(competitionId);

      return {
        success: true,
        message: 'Competition finalized and prizes awarded',
      };
    }
  );

  /**
   * GET /api/gamification/competitions/my/participations
   * Get competitions the current user is participating in
   */
  app.get('/my/participations', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);

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

    return {
      success: true,
      data,
    };
  });

  /**
   * GET /api/gamification/competitions/stats/overview
   * Get competition statistics (admin)
   */
  app.get('/stats/overview', async () => {
    const { prisma } = await import('../prisma.js');

    const [total, active, completed, upcoming] = await Promise.all([
      prisma.competition.count(),
      prisma.competition.count({ where: { status: 'active' } }),
      prisma.competition.count({ where: { status: 'completed' } }),
      prisma.competition.count({ where: { status: 'upcoming' } }),
    ]);

    const totalParticipations = await prisma.competitionParticipant.count();

    return {
      success: true,
      data: {
        total,
        active,
        completed,
        upcoming,
        totalParticipations,
        averageParticipants: total > 0 ? Math.round(totalParticipations / total) : 0,
      },
    };
  });
}

export default competitionRoutes;
