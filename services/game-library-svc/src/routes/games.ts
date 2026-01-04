/**
 * Game Library Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { GameService } from '../services/game.service.js';
import { PrismaClient } from '../generated/prisma-client/index.js';
import type { GradeBand, GameContext } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const listGamesQuerySchema = z.object({
  type: z.enum(['FOCUS_BREAK', 'BRAIN_TRAINING', 'EDUCATIONAL', 'REWARD', 'RELAXATION']).optional(),
  category: z.enum(['PUZZLE', 'MEMORY', 'REACTION', 'PATTERN', 'RELAXATION', 'MOVEMENT', 'CREATIVE', 'MATH', 'LANGUAGE']).optional(),
  gradeBand: z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']).optional(),
  cognitiveSkill: z.enum(['WORKING_MEMORY', 'ATTENTION', 'PROCESSING_SPEED', 'COGNITIVE_FLEXIBILITY', 'INHIBITORY_CONTROL', 'VISUAL_SPATIAL', 'VERBAL_REASONING', 'PATTERN_RECOGNITION']).optional(),
  maxDurationSec: z.coerce.number().optional(),
  minAge: z.coerce.number().optional(),
  maxAge: z.coerce.number().optional(),
  tags: z.string().optional(), // comma-separated
});

const startSessionSchema = z.object({
  gameId: z.string().uuid(),
  context: z.enum(['BREAK', 'REWARD', 'BRAIN_TRAINING', 'FREE_PLAY', 'TEACHER_ASSIGNED']),
  difficulty: z.string().optional(),
  learningSessionId: z.string().uuid().optional(),
});

const endSessionSchema = z.object({
  score: z.number().optional(),
  stars: z.number().min(0).max(3).optional(),
  levelReached: z.number().optional(),
  metrics: z.record(z.unknown()).optional(),
  completed: z.boolean(),
});

const recommendationsQuerySchema = z.object({
  context: z.enum(['BREAK', 'BRAIN_TRAINING', 'FREE_PLAY']),
  gradeBand: z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']),
  limit: z.coerce.number().min(1).max(20).default(5),
});

const focusBreakQuerySchema = z.object({
  gradeBand: z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']),
  exclude: z.string().optional(), // comma-separated slugs
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  learnerId?: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

function getLearnerId(user: AuthenticatedUser): string {
  return user.learnerId ?? user.sub;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const registerGameRoutes: FastifyPluginAsync<{ prisma: PrismaClient }> = async (app, opts) => {
  const gameService = new GameService(opts.prisma);

  /**
   * GET /games
   * List all available games with optional filters
   */
  app.get('/', async (request, reply) => {
    const parsed = listGamesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query parameters', details: parsed.error.issues });
    }

    const filters = {
      ...parsed.data,
      tags: parsed.data.tags?.split(',').map(t => t.trim()),
    };

    const games = await gameService.listGames(filters);
    return reply.send({ games });
  });

  /**
   * GET /games/:idOrSlug
   * Get a single game by ID or slug
   */
  app.get<{ Params: { idOrSlug: string } }>('/:idOrSlug', async (request, reply) => {
    const { idOrSlug } = request.params;
    const game = await gameService.getGameDetails(idOrSlug);

    if (!game) {
      return reply.code(404).send({ error: 'Game not found' });
    }

    return reply.send({ game });
  });

  /**
   * GET /games/recommendations
   * Get personalized game recommendations
   */
  app.get('/recommendations', async (request, reply) => {
    const user = getUser(request);
    const learnerId = getLearnerId(user);

    const parsed = recommendationsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query parameters', details: parsed.error.issues });
    }

    const { context, gradeBand, limit } = parsed.data;

    const recommendations = await gameService.getRecommendations(
      user.tenantId,
      learnerId,
      context as 'BREAK' | 'BRAIN_TRAINING' | 'FREE_PLAY',
      gradeBand as GradeBand,
      limit
    );

    return reply.send({ recommendations });
  });

  /**
   * GET /games/focus-break
   * Get a random game for focus break
   */
  app.get('/focus-break', async (request, reply) => {
    const parsed = focusBreakQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query parameters', details: parsed.error.issues });
    }

    const { gradeBand, exclude } = parsed.data;
    const excludeSlugs = exclude?.split(',').map(s => s.trim()) || [];

    const game = await gameService.getRandomFocusBreak(gradeBand as GradeBand, excludeSlugs);

    if (!game) {
      return reply.code(404).send({ error: 'No focus break games available' });
    }

    return reply.send({ game });
  });

  /**
   * POST /games/sessions
   * Start a new game session
   */
  app.post('/sessions', async (request, reply) => {
    const user = getUser(request);
    const learnerId = getLearnerId(user);

    const parsed = startSessionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    try {
      const session = await gameService.startSession(user.tenantId, learnerId, parsed.data);
      return reply.code(201).send({ session });
    } catch (err) {
      if (err instanceof Error && err.message === 'Game not found') {
        return reply.code(404).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /games/sessions/:sessionId/end
   * End a game session
   */
  app.post<{ Params: { sessionId: string } }>('/sessions/:sessionId/end', async (request, reply) => {
    const user = getUser(request);
    const { sessionId } = request.params;

    const parsed = endSessionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    try {
      const session = await gameService.endSession(user.tenantId, sessionId, parsed.data);
      return reply.send({ session });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Session not found') {
          return reply.code(404).send({ error: err.message });
        }
        if (err.message === 'Session already ended') {
          return reply.code(400).send({ error: err.message });
        }
      }
      throw err;
    }
  });

  /**
   * POST /games/sessions/:sessionId/pause
   * Pause a game session
   */
  app.post<{ Params: { sessionId: string } }>('/sessions/:sessionId/pause', async (request, reply) => {
    const user = getUser(request);
    const { sessionId } = request.params;

    try {
      const session = await gameService.pauseSession(user.tenantId, sessionId);
      return reply.send({ session });
    } catch (err) {
      if (err instanceof Error && err.message === 'Session not found') {
        return reply.code(404).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * GET /games/sessions/history
   * Get game session history for the current learner
   */
  app.get('/sessions/history', async (request, reply) => {
    const user = getUser(request);
    const learnerId = getLearnerId(user);

    const limitParam = (request.query as any).limit;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const sessions = await gameService.getSessionHistory(user.tenantId, learnerId, limit);
    return reply.send({ sessions });
  });

  /**
   * GET /games/brain-training/plan
   * Get today's brain training plan
   */
  app.get('/brain-training/plan', async (request, reply) => {
    const user = getUser(request);
    const learnerId = getLearnerId(user);

    const gradeBandParam = (request.query as any).gradeBand;
    if (!gradeBandParam) {
      return reply.code(400).send({ error: 'gradeBand query parameter is required' });
    }

    const plan = await gameService.getBrainTrainingPlan(user.tenantId, learnerId, gradeBandParam as GradeBand);
    return reply.send({ plan });
  });

  /**
   * POST /games/brain-training/complete/:gameId
   * Mark a brain training game as completed
   */
  app.post<{ Params: { gameId: string } }>('/brain-training/complete/:gameId', async (request, reply) => {
    const user = getUser(request);
    const learnerId = getLearnerId(user);
    const { gameId } = request.params;

    try {
      const plan = await gameService.completeBrainTrainingGame(user.tenantId, learnerId, gameId);
      return reply.send({ plan });
    } catch (err) {
      if (err instanceof Error) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * GET /games/brain-training/stats
   * Get brain training statistics
   */
  app.get('/brain-training/stats', async (request, reply) => {
    const user = getUser(request);
    const learnerId = getLearnerId(user);

    const stats = await gameService.getBrainTrainingStats(user.tenantId, learnerId);
    return reply.send({ stats });
  });
};
