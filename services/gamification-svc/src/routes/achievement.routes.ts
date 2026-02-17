/**
 * Achievement Routes
 *
 * Handles achievement-related API endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { achievementService, ACHIEVEMENT_DEFINITIONS } from '../services/index.js';

// ============================================================================
// HELPERS
// ============================================================================

function computeProgressPercentage(
  threshold: number | null | undefined,
  currentProgress: number,
  isEarned: boolean
): number {
  if (threshold) {
    return Math.min(100, (currentProgress / threshold) * 100);
  }
  return isEarned ? 100 : 0;
}

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

async function achievementRoutes(app: FastifyInstance) {
  /**
   * GET /api/gamification/achievements
   * Get all achievements and player progress
   */
  app.get('/', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const achievements = await achievementService.getPlayerAchievements(studentId);
    return { success: true, data: achievements };
  });

  /**
   * GET /api/gamification/achievements/definitions
   * Get all achievement definitions
   */
  app.get('/definitions', async () => {
    return { success: true, data: ACHIEVEMENT_DEFINITIONS };
  });

  /**
   * GET /api/gamification/achievements/:id
   * Get specific achievement details
   */
  app.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const studentId = extractStudentId(request);
      const achievementId = request.params.id;

      const definition = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === achievementId);
      if (!definition) {
        reply.status(404);
        return { success: false, error: 'Achievement not found' };
      }

      const { prisma } = await import('../prisma.js');
      const earned = await prisma.earnedAchievement.findFirst({
        where: { studentId, achievementId },
      });

      const progress = await prisma.achievementProgress.findFirst({
        where: { studentId, achievementId },
      });

      return {
        success: true,
        data: {
          ...definition,
          earned: !!earned,
          earnedAt: earned?.earnedAt,
          currentProgress: progress?.currentProgress || 0,
          progressPercentage: computeProgressPercentage(
            definition.threshold,
            progress?.currentProgress || 0,
            !!earned
          ),
        },
      };
    }
  );

  /**
   * GET /api/gamification/achievements/recent
   * Get recently earned achievements
   */
  app.get('/recent/list', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const limit = Number.parseInt((request.query as any).limit as string) || 5;

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

    return { success: true, data: achievements };
  });

  /**
   * GET /api/gamification/achievements/categories
   * Get achievements grouped by category
   */
  app.get('/categories/list', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);

    const { prisma } = await import('../prisma.js');
    const earned = await prisma.earnedAchievement.findMany({
      where: { studentId },
      select: { achievementId: true },
    });

    const earnedSet = new Set(earned.map((e) => e.achievementId));

    const categories = new Map<
      string,
      { total: number; earned: number; achievements: unknown[] }
    >();

    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
      if (!categories.has(achievement.category)) {
        categories.set(achievement.category, { total: 0, earned: 0, achievements: [] });
      }

      const cat = categories.get(achievement.category);
      if (!cat) continue;
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

    return { success: true, data: result };
  });
}

export default achievementRoutes;
