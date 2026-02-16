/**
 * Leaderboard Routes
 *
 * Handles leaderboard-related API endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { leaderboardService } from '../services/index.js';
import type { LeaderboardPeriod } from '../types/gamification.types.js';

type LeaderboardScope = 'global' | 'school' | 'class';

// ============================================================================
// VALIDATION
// ============================================================================

const leaderboardQuerySchema = z.object({
  scope: z.enum(['global', 'school', 'class', 'friends']).default('class'),
  period: z.enum(['daily', 'weekly', 'monthly', 'allTime']).default('weekly'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
  schoolId: z.string().optional(),
  classId: z.string().optional(),
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

async function leaderboardRoutes(app: FastifyInstance) {
  /**
   * GET /api/gamification/leaderboards
   * Get leaderboard
   */
  app.get('/', async (request: FastifyRequest) => {
    const query = leaderboardQuerySchema.parse(request.query);

    let scopeId: string | undefined;
    if (query.scope === 'school') {
      scopeId = query.schoolId;
    } else if (query.scope === 'class') {
      scopeId = query.classId;
    }

    const entries = await leaderboardService.getLeaderboard({
      scope: query.scope as LeaderboardScope,
      period: query.period as LeaderboardPeriod,
      limit: query.limit,
      offset: query.offset,
      scopeId,
    });

    return { success: true, data: entries };
  });

  /**
   * GET /api/gamification/leaderboards/rank
   * Get player's rank
   */
  app.get('/rank', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const query = leaderboardQuerySchema.parse(request.query);

    let scopeId: string | undefined;
    if (query.scope === 'school') {
      scopeId = query.schoolId;
    } else if (query.scope === 'class') {
      scopeId = query.classId;
    }

    const rank = await leaderboardService.getPlayerRank(
      studentId,
      query.period as LeaderboardPeriod,
      {
        scope: query.scope as LeaderboardScope,
        scopeId,
      }
    );

    return { success: true, data: rank };
  });

  /**
   * GET /api/gamification/leaderboards/neighbors
   * Get players around the current player
   */
  app.get('/neighbors', async (request: FastifyRequest) => {
    const studentId = extractStudentId(request);
    const query = leaderboardQuerySchema.parse(request.query);
    const range = Number.parseInt((request.query as any).range as string) || 3;

    let scopeId: string | undefined;
    if (query.scope === 'school') {
      scopeId = query.schoolId;
    } else if (query.scope === 'class') {
      scopeId = query.classId;
    }

    const playerRank = await leaderboardService.getPlayerRank(
      studentId,
      query.period as LeaderboardPeriod,
      {
        scope: query.scope as LeaderboardScope,
        scopeId,
      }
    );

    if (!playerRank) {
      return { success: true, data: { player: null, neighbors: [] } };
    }

    const offset = Math.max(0, (playerRank as number) - range - 1);
    const limit = range * 2 + 1;

    const neighbors = await leaderboardService.getLeaderboard({
      scope: query.scope as LeaderboardScope,
      period: query.period as LeaderboardPeriod,
      limit,
      offset,
      scopeId,
    });

    return {
      success: true,
      data: {
        player: playerRank,
        neighbors,
      },
    };
  });

  /**
   * GET /api/gamification/leaderboards/top3
   * Get top 3 players (for podium display)
   */
  app.get('/top3', async (request: FastifyRequest) => {
    const query = leaderboardQuerySchema.parse(request.query);

    let scopeId: string | undefined;
    if (query.scope === 'school') {
      scopeId = query.schoolId;
    } else if (query.scope === 'class') {
      scopeId = query.classId;
    }

    const top3 = await leaderboardService.getLeaderboard({
      scope: query.scope as LeaderboardScope,
      period: query.period as LeaderboardPeriod,
      limit: 3,
      offset: 0,
      scopeId,
    });

    return { success: true, data: top3 };
  });

  /**
   * GET /api/gamification/leaderboards/class/:classId
   * Get class-specific leaderboard
   */
  app.get('/class/:classId', async (request: FastifyRequest<{ Params: { classId: string } }>) => {
    const classId = request.params.classId;
    const query = request.query as any;
    const period = (query.period as LeaderboardPeriod) || 'weekly';
    const limit = Number.parseInt(query.limit as string) || 20;

    const entries = await leaderboardService.getLeaderboard({
      scope: 'class',
      period,
      limit,
      offset: 0,
      scopeId: classId,
    });

    return { success: true, data: entries };
  });

  /**
   * GET /api/gamification/leaderboards/archives
   * Get archived leaderboards (past weeks/months)
   */
  app.get('/archives', async (request: FastifyRequest) => {
    const query = request.query as any;
    const period = (query.period as 'weekly' | 'monthly') || 'weekly';
    const limit = Number.parseInt(query.limit as string) || 10;

    const { prisma } = await import('../prisma.js');
    const archives = await prisma.leaderboardArchive.findMany({
      where: { period },
      orderBy: { archivedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        period: true,
        periodStart: true,
        periodEnd: true,
        scope: true,
        scopeId: true,
        archivedAt: true,
      },
    });

    return { success: true, data: archives };
  });

  /**
   * GET /api/gamification/leaderboards/archives/:id
   * Get specific archived leaderboard
   */
  app.get(
    '/archives/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const archiveId = request.params.id;

      const { prisma } = await import('../prisma.js');
      const archive = await prisma.leaderboardArchive.findUnique({
        where: { id: archiveId },
      });

      if (!archive) {
        reply.status(404);
        return { success: false, error: 'Archive not found' };
      }

      return {
        success: true,
        data: {
          ...archive,
          entries: archive.entries,
        },
      };
    }
  );
}

export default leaderboardRoutes;
