/**
 * Game Generation Routes
 *
 * REST API endpoints for AI-powered adaptive game generation:
 * - Game generation
 * - Difficulty adaptation
 * - Hint generation
 * - Feedback generation
 * - Game type discovery
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import { GameGenerationService } from '../generation/game-generation.service.js';
import { AdaptiveGameEngine } from '../generation/adaptive-game-engine.js';
import { getAllGameTypes, getTemplatesForGrade } from '../generation/game-templates.js';

// ────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ────────────────────────────────────────────────────────────────────────────

const gameGenerationSchema = z.object({
  learnerId: z.string().min(1),
  gameType: z.string().min(1),
  subject: z.string().optional(),
  topic: z.string().optional(),
  gradeLevel: z.number().min(1).max(12),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  learnerProfile: z
    .object({
      vocabulary: z.array(z.string()).optional(),
      interests: z.array(z.string()).optional(),
      currentTopics: z.array(z.string()).optional(),
      skillLevel: z.record(z.number()).optional(),
      preferredDifficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    })
    .optional(),
  customParameters: z.record(z.unknown()).optional(),
  includeInstructions: z.boolean().optional(),
});

const randomGameSchema = z.object({
  learnerId: z.string().min(1),
  gradeLevel: z.number().min(1).max(12),
  subject: z.string().optional(),
});

const sessionCreateSchema = z.object({
  gameId: z.string().min(1),
  gameType: z.string().min(1),
  learnerId: z.string().min(1),
  initialDifficulty: z.enum(['easy', 'medium', 'hard']),
  learningObjectives: z
    .array(
      z.object({
        id: z.string(),
        skill: z.string(),
        targetMastery: z.number().min(0).max(1),
        currentMastery: z.number().min(0).max(1),
        attemptsCount: z.number(),
      })
    )
    .optional(),
});

const performanceUpdateSchema = z.object({
  sessionId: z.string().min(1),
  update: z.object({
    score: z.number().optional(),
    hintsUsed: z.number().optional(),
    timeElapsed: z.number().optional(),
  }),
});

const attemptRecordSchema = z.object({
  sessionId: z.string().min(1),
  isCorrect: z.boolean(),
  responseTime: z.number(),
});

const hintRequestSchema = z.object({
  gameType: z.string(),
  currentProblem: z.string(),
  solution: z.string(),
  playerAttempts: z.array(z.string()),
  hintLevel: z.number().min(1).max(3),
  context: z.record(z.unknown()).optional(),
});

const feedbackRequestSchema = z.object({
  gameType: z.string(),
  attempt: z.string(),
  correctAnswer: z.string(),
  isCorrect: z.boolean(),
  performance: z.object({
    accuracy: z.number(),
    streakCurrent: z.number(),
  }),
  context: z.record(z.unknown()).optional(),
});

const celebrationRequestSchema = z.object({
  achievement: z.string(),
  context: z.object({
    score: z.number(),
    accuracy: z.number(),
    streak: z.number().optional(),
    improvement: z.number().optional(),
  }),
  playerName: z.string().optional(),
});

// ────────────────────────────────────────────────────────────────────────────
// ROUTE OPTIONS
// ────────────────────────────────────────────────────────────────────────────

interface GameGenerationRoutesOptions {
  llmOrchestrator: LLMOrchestrator;
}

// ────────────────────────────────────────────────────────────────────────────
// PLUGIN
// ────────────────────────────────────────────────────────────────────────────

const gameGenerationRoutes: FastifyPluginAsync<GameGenerationRoutesOptions> = async (
  fastify: FastifyInstance,
  options: GameGenerationRoutesOptions
) => {
  const { llmOrchestrator } = options;

  // Initialize services
  const gameService = new GameGenerationService(llmOrchestrator);
  const adaptiveEngine = new AdaptiveGameEngine(llmOrchestrator);

  // Cleanup old sessions periodically
  setInterval(() => {
    adaptiveEngine.cleanupSessions(24);
  }, 60 * 60 * 1000); // Every hour

  // ──────────────────────────────────────────────────────────────────────────
  // GAME GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof gameGenerationSchema>;
  }>('/ai/games/generate', {
    schema: {
      description: 'Generate a new adaptive game for a learner',
      tags: ['AI Games'],
      body: {
        type: 'object',
        required: ['learnerId', 'gameType', 'gradeLevel'],
        properties: {
          learnerId: { type: 'string' },
          gameType: { type: 'string' },
          subject: { type: 'string' },
          topic: { type: 'string' },
          gradeLevel: { type: 'number', minimum: 1, maximum: 12 },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          customParameters: { type: 'object' },
          includeInstructions: { type: 'boolean' },
        },
      },
    },
    handler: async (request, reply) => {
      const parsed = gameGenerationSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const game = await gameService.generateGame({
        ...parsed,
        tenantId,
        userId,
      });

      return reply.status(201).send({
        game,
        success: true,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // RANDOM GAME GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof randomGameSchema>;
  }>('/ai/games/random', {
    schema: {
      description: 'Generate a random game appropriate for learner',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const parsed = randomGameSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const game = await gameService.generateRandomGame(
        parsed.learnerId,
        tenantId,
        userId,
        parsed.gradeLevel,
        parsed.subject
      );

      return reply.status(201).send({
        game,
        success: true,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof sessionCreateSchema>;
  }>('/ai/games/session', {
    schema: {
      description: 'Create a new game session for adaptive tracking',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const parsed = sessionCreateSchema.parse(request.body);

      const session = adaptiveEngine.createSession(
        parsed.gameId,
        parsed.gameType as any,
        parsed.learnerId,
        parsed.initialDifficulty,
        parsed.learningObjectives
      );

      return reply.status(201).send({
        session,
        success: true,
      });
    },
  });

  fastify.get<{
    Params: { sessionId: string };
  }>('/ai/games/session/:sessionId', {
    schema: {
      description: 'Get game session details',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const { sessionId } = request.params;

      const session = adaptiveEngine.getSession(sessionId);

      if (!session) {
        return reply.status(404).send({
          error: 'Session not found',
          success: false,
        });
      }

      return reply.send({
        session,
        success: true,
      });
    },
  });

  fastify.post<{
    Body: z.infer<typeof performanceUpdateSchema>;
  }>('/ai/games/session/performance', {
    schema: {
      description: 'Update session performance metrics',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const parsed = performanceUpdateSchema.parse(request.body);

      adaptiveEngine.updatePerformance(parsed.sessionId, parsed.update);

      return reply.send({
        success: true,
        message: 'Performance updated',
      });
    },
  });

  fastify.post<{
    Body: z.infer<typeof attemptRecordSchema>;
  }>('/ai/games/session/attempt', {
    schema: {
      description: 'Record an attempt result',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const parsed = attemptRecordSchema.parse(request.body);

      adaptiveEngine.recordAttempt(parsed.sessionId, parsed.isCorrect, parsed.responseTime);

      return reply.send({
        success: true,
        message: 'Attempt recorded',
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // ADAPTIVE DIFFICULTY
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: { sessionId: string };
  }>('/ai/games/adapt', {
    schema: {
      description: 'Get difficulty adjustment recommendation',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const { sessionId } = request.body;

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const adjustment = await adaptiveEngine.analyzeDifficulty(sessionId, tenantId, userId);

      // Auto-apply if recommended
      if (adjustment.shouldAdjust && adjustment.confidence > 0.7) {
        adaptiveEngine.applyDifficultyAdjustment(sessionId, adjustment.newDifficulty);
      }

      return reply.send({
        adjustment,
        applied: adjustment.shouldAdjust && adjustment.confidence > 0.7,
        success: true,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // HINT GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof hintRequestSchema>;
  }>('/ai/games/hint', {
    schema: {
      description: 'Generate a contextual hint for the current problem',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const parsed = hintRequestSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const hint = await adaptiveEngine.generateHint(
        {
          ...parsed,
          gameType: parsed.gameType as any,
        },
        tenantId,
        userId
      );

      return reply.send({
        hint,
        success: true,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // FEEDBACK GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof feedbackRequestSchema>;
  }>('/ai/games/feedback', {
    schema: {
      description: 'Generate feedback for an attempt',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const parsed = feedbackRequestSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const feedback = await adaptiveEngine.generateFeedback(
        {
          ...parsed,
          gameType: parsed.gameType as any,
          performance: {
            ...parsed.performance,
            score: 0,
            averageResponseTime: 0,
            hintsUsed: 0,
            completionRate: 0,
            streakBest: 0,
            attemptsCorrect: 0,
            attemptsTotal: 0,
            timeElapsed: 0,
          },
        },
        tenantId,
        userId
      );

      return reply.send({
        feedback,
        success: true,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CELEBRATION GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof celebrationRequestSchema>;
  }>('/ai/games/celebrate', {
    schema: {
      description: 'Generate celebration for achievement',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const parsed = celebrationRequestSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const celebration = await adaptiveEngine.generateCelebration(parsed, tenantId, userId);

      return reply.send({
        celebration,
        success: true,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GAME DISCOVERY
  // ──────────────────────────────────────────────────────────────────────────

  fastify.get('/ai/games/types', {
    schema: {
      description: 'List all available game types',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const gameTypes = getAllGameTypes();

      return reply.send({
        gameTypes,
        count: gameTypes.length,
        success: true,
      });
    },
  });

  fastify.get<{
    Querystring: { gradeLevel: number };
  }>('/ai/games/available', {
    schema: {
      description: 'Get games available for a grade level',
      tags: ['AI Games'],
      querystring: {
        type: 'object',
        required: ['gradeLevel'],
        properties: {
          gradeLevel: { type: 'number', minimum: 1, maximum: 12 },
        },
      },
    },
    handler: async (request, reply) => {
      const { gradeLevel } = request.query;

      const templates = getTemplatesForGrade(gradeLevel);

      return reply.send({
        games: templates,
        count: templates.length,
        gradeLevel,
        success: true,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // LEARNING OBJECTIVES
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: { sessionId: string; skillId: string; success: boolean };
  }>('/ai/games/objective/update', {
    schema: {
      description: 'Update learning objective progress',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const { sessionId, skillId, success } = request.body;

      adaptiveEngine.updateObjectiveProgress(sessionId, skillId, success);

      return reply.send({
        success: true,
        message: 'Objective progress updated',
      });
    },
  });

  fastify.get<{
    Params: { sessionId: string };
  }>('/ai/games/objective/:sessionId', {
    schema: {
      description: 'Get learning objective progress for session',
      tags: ['AI Games'],
    },
    handler: async (request, reply) => {
      const { sessionId } = request.params;

      const objectives = adaptiveEngine.getObjectiveProgress(sessionId);

      return reply.send({
        objectives,
        count: objectives.length,
        success: true,
      });
    },
  });
};

export default gameGenerationRoutes;
