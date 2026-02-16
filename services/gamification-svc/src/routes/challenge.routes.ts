/**
 * Challenge Routes
 *
 * Handles challenge-related API endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { challengeService, CHALLENGE_TEMPLATES } from '../services/index.js';

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

const extractStudentId = (request: FastifyRequest): string => {
  const studentId = request.headers['x-student-id'] as string;
  if (!studentId) {
    throw new Error('Student ID required');
  }
  return studentId;
};

// ============================================================================
// ROUTES
// ============================================================================

async function challengeRoutes(app: FastifyInstance) {
  /**
   * GET /api/gamification/challenges
   * Get all active challenges for the player
   */
  app.get('/', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const challenges = await challengeService.getActiveProgress(studentId);
    return { success: true, data: challenges };
  });

  /**
   * GET /api/gamification/challenges/templates
   * Get available challenge templates
   */
  app.get('/templates', async () => {
    return { success: true, data: CHALLENGE_TEMPLATES };
  });

  /**
   * GET /api/gamification/challenges/daily
   * Get today's daily challenges
   */
  app.get('/daily', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const challenges = await challengeService.getActiveProgress(studentId);
    const daily = challenges.filter((c) => c.type === 'daily');
    return { success: true, data: daily };
  });

  /**
   * GET /api/gamification/challenges/weekly
   * Get this week's weekly challenges
   */
  app.get('/weekly', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const challenges = await challengeService.getActiveProgress(studentId);
    const weekly = challenges.filter((c) => c.type === 'weekly');
    return { success: true, data: weekly };
  });

  /**
   * GET /api/gamification/challenges/monthly
   * Get this month's monthly challenges
   */
  app.get('/monthly', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const challenges = await challengeService.getActiveProgress(studentId);
    const monthly = challenges.filter((c) => c.type === 'monthly');
    return { success: true, data: monthly };
  });

  /**
   * GET /api/gamification/challenges/class/:classId
   * Get class challenges
   */
  app.get('/class/:classId', async (request: FastifyRequest<{ Params: { classId: string } }>) => {
    const classId = request.params.classId;
    const includeEnded = (request.query as any).includeEnded === 'true';

    const { prisma } = await import('../prisma.js');
    const where = includeEnded ? { classId } : { classId, endDate: { gte: new Date() } };

    const challenges = await prisma.classChallenge.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });

    return { success: true, data: challenges };
  });

  /**
   * POST /api/gamification/challenges/class
   * Create a class challenge (teacher only)
   */
  app.post('/class', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = classChallengeSchema.parse(request.body);

    // In production, verify teacher has permission for this class
    const teacherId = extractStudentId(request); // Using student ID as teacher ID for now
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

    reply.status(201);
    return { success: true, data: challenge };
  });

  /**
   * GET /api/gamification/challenges/class/:classId/:challengeId
   * Get class challenge details with participant progress
   */
  app.get(
    '/class/:classId/:challengeId',
    async (
      request: FastifyRequest<{ Params: { classId: string; challengeId: string } }>,
      reply: FastifyReply
    ) => {
      const { challengeId } = request.params;

      const { prisma } = await import('../prisma.js');
      const challenge = await prisma.classChallenge.findUnique({
        where: { id: challengeId },
      });

      if (!challenge) {
        reply.status(404);
        return { success: false, error: 'Challenge not found' };
      }

      // Get participant progress
      const progress = await prisma.classChallengeProgress.findMany({
        where: { challengeId },
        orderBy: { currentProgress: 'desc' },
      });

      return {
        success: true,
        data: {
          challenge,
          participants: progress,
          totalParticipants: progress.length,
          completedCount: progress.filter((p) => p.completed).length,
        },
      };
    }
  );

  /**
   * GET /api/gamification/challenges/completed
   * Get completed challenges history
   */
  app.get('/completed', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const limit = Number.parseInt((request.query as any).limit as string) || 20;
    const offset = Number.parseInt((request.query as any).offset as string) || 0;

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

    return { success: true, data: completed };
  });

  /**
   * GET /api/gamification/challenges/:id
   * Get specific challenge details
   */
  app.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const studentId = extractStudentId(request);
      const challengeId = request.params.id;

      const { prisma } = await import('../prisma.js');
      const challenge = await prisma.activeChallenge.findFirst({
        where: {
          studentId,
          id: challengeId,
        },
      });

      if (!challenge) {
        reply.status(404);
        return { success: false, error: 'Challenge not found' };
      }

      const template = CHALLENGE_TEMPLATES.find((t) => t.id === challenge.templateId);

      return {
        success: true,
        data: {
          ...challenge,
          template,
          progressPercentage: Math.min(
            100,
            (challenge.currentProgress / challenge.targetValue) * 100
          ),
        },
      };
    }
  );
}

export default challengeRoutes;
