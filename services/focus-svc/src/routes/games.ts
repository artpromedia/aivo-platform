/**
 * Focus Break Mini-Games Routes
 *
 * API endpoints for accessing and playing focus break mini-games.
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import {
  getGamesForGrade,
  getGamesByCategory,
  getGameById,
  getRecommendedGame,
  getGameCategories,
  type GameCategory,
} from '../games/game-library.js';
import {
  startGameSession,
  endGameSession,
  recordReturnToFocus,
  getLearnerPreferences,
  getRecentlyPlayedGames,
  getGameStats,
  getActiveGameSession,
} from '../games/game-session.js';
import type { GradeBand } from '../types/telemetry.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const StartGameSchema = z.object({
  sessionId: z.string().uuid(),
  learnerId: z.string().uuid(),
  gameId: z.string(),
  preFocusScore: z.number().min(0).max(1).optional(),
});

const EndGameSchema = z.object({
  gameSessionId: z.string(),
  completed: z.boolean(),
  score: z.number().optional(),
  maxScore: z.number().optional(),
  helpfulnessRating: z.number().int().min(1).max(5).optional(),
});

const RecommendedGameSchema = z.object({
  learnerId: z.string().uuid(),
  gradeBand: z.enum(['K5', 'G6_8', 'G9_12']),
  mood: z.enum(['happy', 'okay', 'frustrated', 'tired', 'confused']).optional(),
  preferredCategory: z.enum(['cognitive', 'relaxation', 'physical', 'creative']).optional(),
});

const ReturnToFocusSchema = z.object({
  gameSessionId: z.string(),
  postFocusScore: z.number().min(0).max(1).optional(),
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

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const registerGamesRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /focus/games/:gradeBand
   * Get all available games for a specific grade band
   */
  app.get<{ Params: { gradeBand: string } }>('/games/:gradeBand', async (request, reply) => {
    const _user = getUser(request);
    const gradeBand = request.params.gradeBand as GradeBand;

    if (!['K5', 'G6_8', 'G9_12'].includes(gradeBand)) {
      return reply.code(400).send({ error: 'Invalid grade band' });
    }

    const games = getGamesForGrade(gradeBand);
    const categories = getGameCategories(gradeBand);

    return reply.send({
      gradeBand,
      games,
      categories,
      totalCount: games.length,
    });
  });

  /**
   * GET /focus/games/:gradeBand/category/:category
   * Get games filtered by category and grade band
   */
  app.get<{ Params: { gradeBand: string; category: string } }>(
    '/games/:gradeBand/category/:category',
    async (request, reply) => {
      const _user = getUser(request);
      const gradeBand = request.params.gradeBand as GradeBand;
      const category = request.params.category as GameCategory;

      if (!['K5', 'G6_8', 'G9_12'].includes(gradeBand)) {
        return reply.code(400).send({ error: 'Invalid grade band' });
      }

      if (!['cognitive', 'relaxation', 'physical', 'creative'].includes(category)) {
        return reply.code(400).send({ error: 'Invalid category' });
      }

      const games = getGamesByCategory(category, gradeBand);

      return reply.send({
        gradeBand,
        category,
        games,
        count: games.length,
      });
    }
  );

  /**
   * GET /focus/games/details/:gameId
   * Get details for a specific game
   */
  app.get<{ Params: { gameId: string } }>('/games/details/:gameId', async (request, reply) => {
    const _user = getUser(request);
    const gameId = request.params.gameId;

    const game = getGameById(gameId);

    if (!game) {
      return reply.code(404).send({ error: 'Game not found' });
    }

    return reply.send({
      game,
    });
  });

  /**
   * POST /focus/games/recommended
   * Get AI-recommended game based on learner state and preferences
   */
  app.post('/games/recommended', async (request, reply) => {
    const parsed = RecommendedGameSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const _user = getUser(request);
    const { learnerId, gradeBand, mood, preferredCategory } = parsed.data;

    // Get learner preferences and recent games
    const preferences = getLearnerPreferences(learnerId);
    const recentGames = getRecentlyPlayedGames(learnerId);
    const recentGameIds = recentGames.slice(0, 5).map((s) => s.gameId);

    // Get recommended game
    const game = getRecommendedGame({
      gradeBand,
      mood,
      previousGameIds: recentGameIds,
      preferredCategory:
        preferredCategory ?? preferences?.favoriteCategories[0] ?? undefined,
    });

    if (!game) {
      return reply.code(404).send({ error: 'No suitable game found' });
    }

    return reply.send({
      game,
      recommendation: {
        reason: generateRecommendationReason(game, mood, preferences?.favoriteCategories),
        matchScore: 'high', // Could be calculated
      },
    });
  });

  /**
   * POST /focus/games/start
   * Start a new game session
   */
  app.post('/games/start', async (request, reply) => {
    const parsed = StartGameSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const _user = getUser(request);
    const { sessionId, learnerId, gameId, preFocusScore } = parsed.data;

    // Get the game
    const game = getGameById(gameId);
    if (!game) {
      return reply.code(404).send({ error: 'Game not found' });
    }

    // Check if learner already has an active game
    const existingSession = getActiveGameSession(learnerId);
    if (existingSession) {
      return reply.code(409).send({
        error: 'Game already in progress',
        activeGameSession: existingSession,
      });
    }

    // Start the session
    const gameSession = await startGameSession({
      sessionId,
      learnerId,
      game,
      preFocusScore,
    });

    return reply.send({
      success: true,
      gameSession,
      game,
      message: `${game.title} started! Take your time and enjoy.`,
    });
  });

  /**
   * POST /focus/games/end
   * End a game session and record results
   */
  app.post('/games/end', async (request, reply) => {
    const parsed = EndGameSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const _user = getUser(request);
    const { gameSessionId, completed, score, maxScore, helpfulnessRating } = parsed.data;

    // End the session
    const gameSession = await endGameSession({
      gameSessionId,
      completed,
      score,
      maxScore,
      helpfulnessRating,
    });

    if (!gameSession) {
      return reply.code(404).send({ error: 'Game session not found' });
    }

    // Generate encouraging message
    let message: string;
    if (completed) {
      message = 'Great job! Ready to get back to learning?';
    } else {
      message = "That's okay! Even a short break can help. Ready when you are!";
    }

    return reply.send({
      success: true,
      gameSession,
      message,
      encouragement: generateEncouragement(completed, score, maxScore),
    });
  });

  /**
   * POST /focus/games/return-to-focus
   * Record that learner returned to focus after completing a game
   */
  app.post('/games/return-to-focus', async (request, reply) => {
    const parsed = ReturnToFocusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const _user = getUser(request);
    const { gameSessionId, postFocusScore } = parsed.data;

    await recordReturnToFocus({
      gameSessionId,
      postFocusScore,
    });

    return reply.send({
      success: true,
      message: 'Welcome back! Great job taking that break.',
    });
  });

  /**
   * GET /focus/games/preferences/:learnerId
   * Get learner's game preferences and statistics
   */
  app.get<{ Params: { learnerId: string } }>(
    '/games/preferences/:learnerId',
    async (request, reply) => {
      const _user = getUser(request);
      const learnerId = request.params.learnerId;

      const preferences = getLearnerPreferences(learnerId);
      const stats = getGameStats(learnerId);
      const recentGames = getRecentlyPlayedGames(learnerId);

      return reply.send({
        learnerId,
        preferences,
        stats,
        recentGames: recentGames.slice(0, 5), // Last 5 games
      });
    }
  );

  /**
   * GET /focus/games/stats/:learnerId
   * Get detailed statistics for a learner's game usage
   */
  app.get<{ Params: { learnerId: string } }>('/games/stats/:learnerId', async (request, reply) => {
    const _user = getUser(request);
    const learnerId = request.params.learnerId;

    const stats = getGameStats(learnerId);
    const recentGames = getRecentlyPlayedGames(learnerId);

    // Calculate additional stats
    const gamesWithFeedback = recentGames.filter((g) => g.helpfulnessRating !== undefined);
    const highlyRatedGames = gamesWithFeedback.filter((g) => (g.helpfulnessRating ?? 0) >= 4);

    return reply.send({
      learnerId,
      stats,
      insights: {
        recentActivity: {
          last7Days: recentGames.length,
          averageDuration:
            recentGames.length > 0
              ? recentGames.reduce((sum, g) => sum + (g.durationSeconds ?? 0), 0) /
                recentGames.length
              : 0,
        },
        satisfaction: {
          feedbackCount: gamesWithFeedback.length,
          highlyRatedCount: highlyRatedGames.length,
          satisfactionRate:
            gamesWithFeedback.length > 0
              ? highlyRatedGames.length / gamesWithFeedback.length
              : 0,
        },
      },
    });
  });

  /**
   * GET /focus/games/active/:learnerId
   * Get active game session for a learner (if any)
   */
  app.get<{ Params: { learnerId: string } }>('/games/active/:learnerId', async (request, reply) => {
    const _user = getUser(request);
    const learnerId = request.params.learnerId;

    const activeSession = getActiveGameSession(learnerId);

    if (!activeSession) {
      return reply.send({
        hasActiveGame: false,
        activeSession: null,
      });
    }

    // Get the game details
    const game = getGameById(activeSession.gameId);

    return reply.send({
      hasActiveGame: true,
      activeSession,
      game,
    });
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function generateRecommendationReason(
  game: { category: GameCategory; title: string },
  mood?: string,
  favoriteCategories?: GameCategory[]
): string {
  const reasons: string[] = [];

  // Category-based reasons
  if (favoriteCategories && favoriteCategories.includes(game.category)) {
    reasons.push(`You enjoy ${game.category} games`);
  }

  // Mood-based reasons
  if (mood === 'frustrated' && game.category === 'relaxation') {
    reasons.push('This calming game can help when feeling frustrated');
  } else if (mood === 'tired' && game.category === 'physical') {
    reasons.push('A physical activity can help boost energy');
  } else if (mood === 'tired' && game.category === 'relaxation') {
    reasons.push('A relaxing game can help you recharge');
  } else if ((mood === 'happy' || mood === 'okay') && game.category === 'cognitive') {
    reasons.push('A great time for a fun brain exercise');
  }

  // Default reason
  if (reasons.length === 0) {
    reasons.push(`${game.title} is a great choice for a quick break`);
  }

  return reasons.join('. ') + '.';
}

function generateEncouragement(
  completed: boolean,
  score?: number,
  maxScore?: number
): string {
  if (!completed) {
    return 'Every bit of break time helps! You did great.';
  }

  if (score !== undefined && maxScore !== undefined) {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) {
      return 'Wow! Amazing performance! Your focus is sharp!';
    } else if (percentage >= 70) {
      return 'Great job! You did really well!';
    } else if (percentage >= 50) {
      return 'Good effort! Every game helps you refocus.';
    }
  }

  return 'Nice work! Hope you enjoyed that break.';
}
