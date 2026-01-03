/**
 * Leaderboard Routes
 *
 * Handles leaderboard-related API endpoints
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */

import { Router, Request, Response, NextFunction, IRouter } from 'express';
import { z } from 'zod';
import { leaderboardService } from '../services/index.js';
import { LeaderboardPeriod } from '../types/gamification.types.js';

type LeaderboardScope = 'global' | 'school' | 'class';

const router: IRouter = Router();

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
 * GET /api/gamification/leaderboards
 * Get leaderboard
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = leaderboardQuerySchema.parse(req.query);

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

    res.json({ success: true, data: entries });
  })
);

/**
 * GET /api/gamification/leaderboards/rank
 * Get player's rank
 */
router.get(
  '/rank',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const query = leaderboardQuerySchema.parse(req.query);

    let scopeId: string | undefined;
    if (query.scope === 'school') {
      scopeId = query.schoolId;
    } else if (query.scope === 'class') {
      scopeId = query.classId;
    }

    const rank = await leaderboardService.getPlayerRank(studentId, query.period as LeaderboardPeriod, {
      scope: query.scope as LeaderboardScope,
      scopeId,
    });

    res.json({ success: true, data: rank });
  })
);

/**
 * GET /api/gamification/leaderboards/neighbors
 * Get players around the current player
 */
router.get(
  '/neighbors',
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = extractStudentId(req);
    const query = leaderboardQuerySchema.parse(req.query);
    const range = parseInt(req.query.range as string) || 3;

    let scopeId: string | undefined;
    if (query.scope === 'school') {
      scopeId = query.schoolId;
    } else if (query.scope === 'class') {
      scopeId = query.classId;
    }

    // Get player's rank first
    const playerRank = await leaderboardService.getPlayerRank(studentId, query.period as LeaderboardPeriod, {
      scope: query.scope as LeaderboardScope,
      scopeId,
    });

    if (!playerRank) {
      res.json({ success: true, data: { player: null, neighbors: [] } });
      return;
    }

    // Get neighbors around the player - playerRank is a number
    const offset = Math.max(0, (playerRank as number) - range - 1);
    const limit = range * 2 + 1;

    const neighbors = await leaderboardService.getLeaderboard({
      scope: query.scope as LeaderboardScope,
      period: query.period as LeaderboardPeriod,
      limit,
      offset,
      scopeId,
    });

    res.json({
      success: true,
      data: {
        player: playerRank,
        neighbors,
      },
    });
  })
);

/**
 * GET /api/gamification/leaderboards/top3
 * Get top 3 players (for podium display)
 */
router.get(
  '/top3',
  asyncHandler(async (req: Request, res: Response) => {
    const query = leaderboardQuerySchema.parse(req.query);

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

    res.json({ success: true, data: top3 });
  })
);

/**
 * GET /api/gamification/leaderboards/class/:classId
 * Get class-specific leaderboard
 */
router.get(
  '/class/:classId',
  asyncHandler(async (req: Request, res: Response) => {
    const classId = req.params.classId;
    const period = (req.query.period as LeaderboardPeriod) || 'weekly';
    const limit = parseInt(req.query.limit as string) || 20;

    const entries = await leaderboardService.getLeaderboard({
      scope: 'class',
      period,
      limit,
      offset: 0,
      scopeId: classId,
    });

    res.json({ success: true, data: entries });
  })
);

/**
 * GET /api/gamification/leaderboards/archives
 * Get archived leaderboards (past weeks/months)
 */
router.get(
  '/archives',
  asyncHandler(async (req: Request, res: Response) => {
    const period = (req.query.period as 'weekly' | 'monthly') || 'weekly';
    const limit = parseInt(req.query.limit as string) || 10;

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

    res.json({ success: true, data: archives });
  })
);

/**
 * GET /api/gamification/leaderboards/archives/:id
 * Get specific archived leaderboard
 */
router.get(
  '/archives/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const archiveId = req.params.id;

    const { prisma } = await import('../prisma.js');
    const archive = await prisma.leaderboardArchive.findUnique({
      where: { id: archiveId },
    });

    if (!archive) {
      res.status(404).json({ success: false, error: 'Archive not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...archive,
        entries: archive.entries,
      },
    });
  })
);

export default router;
