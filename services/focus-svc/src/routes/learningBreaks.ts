/**
 * Learning Break Routes
 *
 * API endpoints for generating and tracking learning-laced brain breaks.
 * These breaks combine fun game mechanics with curriculum-aligned content
 * personalized to the learner's Virtual Brain skill levels.
 *
 * @author AIVO Platform Team
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import {
  learningBreakGenerator,
  type LearningBreakGame,
  type SkillDomain,
} from '../services/learning-break-generator.js';
import {
  virtualBrainClient,
  getDefaultSkills,
} from '../services/virtualBrainClient.js';
import { sessionServiceClient } from '../services/sessionServiceClient.js';
import type { GradeBand } from '../types/telemetry.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const GenerateLearningBreakSchema = z.object({
  sessionId: z.string().uuid(),
  learnerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  gradeBand: z.enum(['K5', 'G6_8', 'G9_12']),
  preferredDomain: z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL']).optional(),
  maxDurationSeconds: z.number().int().min(30).max(180).optional(),
  excludeRecentSkills: z.boolean().optional(),
});

const StartLearningBreakSchema = z.object({
  sessionId: z.string().uuid(),
  learnerId: z.string().uuid(),
  gameType: z.string(),
  targetDomain: z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL']),
  targetSkillCodes: z.array(z.string()),
  difficulty: z.number().int().min(1).max(5),
});

const CompleteLearningBreakSchema = z.object({
  sessionId: z.string().uuid(),
  learnerId: z.string().uuid(),
  gameType: z.string(),
  completed: z.boolean(),
  score: z.number().int().min(0).optional(),
  correctAnswers: z.number().int().min(0).optional(),
  totalQuestions: z.number().int().min(0).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  targetSkillCodes: z.array(z.string()).optional(),
  helpfulnessRating: z.number().int().min(1).max(5).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const learningBreakRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /learning-breaks/generate
   *
   * Generate a personalized learning-laced brain break game.
   * Fetches the learner's skills from their Virtual Brain and creates
   * a game tailored to their current level.
   */
  fastify.post(
    '/learning-breaks/generate',
    async (request: FastifyRequest, reply) => {
      const parseResult = GenerateLearningBreakSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const {
        sessionId,
        learnerId,
        tenantId,
        gradeBand,
        preferredDomain,
        maxDurationSeconds,
        excludeRecentSkills,
      } = parseResult.data;

      try {
        // Fetch learner skills from Virtual Brain
        const authHeader = request.headers.authorization;
        const authToken = authHeader?.replace('Bearer ', '');

        const skillsResult = await virtualBrainClient.getLearnerSkills(
          tenantId,
          learnerId,
          authToken
        );

        // Use fetched skills or fallback to defaults
        const skills = skillsResult.success && skillsResult.skills.length > 0
          ? skillsResult.skills
          : getDefaultSkills(gradeBand as GradeBand);

        // Generate personalized learning break
        const game = await learningBreakGenerator.generateLearningBreak({
          tenantId,
          learnerId,
          gradeBand: gradeBand as GradeBand,
          skills,
          preferredDomain: preferredDomain as SkillDomain | undefined,
          maxDurationSeconds,
          excludeRecentSkills,
        });

        // Log generation for analytics
        console.info('[LearningBreak] Generated game', {
          sessionId,
          learnerId,
          gameType: game.gameType,
          targetDomain: game.targetDomain,
          difficulty: game.difficulty,
          skillsUsed: skills.length,
        });

        return reply.status(200).send({
          game,
          meta: {
            personalized: skillsResult.success && skillsResult.skills.length > 0,
            skillsAnalyzed: skills.length,
            gradeBand,
          },
        });
      } catch (err) {
        console.error('[LearningBreak] Generation failed:', err);
        return reply.status(500).send({
          error: 'Failed to generate learning break',
          details: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /learning-breaks/start
   *
   * Record when a learner starts a learning break game.
   * Emits a session event for analytics.
   */
  fastify.post(
    '/learning-breaks/start',
    async (request: FastifyRequest, reply) => {
      const parseResult = StartLearningBreakSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const {
        sessionId,
        learnerId,
        gameType,
        targetDomain,
        targetSkillCodes,
        difficulty,
      } = parseResult.data;

      try {
        // Emit session event
        await sessionServiceClient.emitEvent({
          sessionId,
          eventType: 'LEARNING_BREAK_STARTED',
          payload: {
            learnerId,
            gameType,
            targetDomain,
            targetSkillCodes,
            difficulty,
            startedAt: new Date().toISOString(),
          },
        });

        return reply.status(200).send({
          success: true,
          message: 'Learning break started',
          startedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[LearningBreak] Start event failed:', err);
        // Don't fail the request if event emission fails
        return reply.status(200).send({
          success: true,
          message: 'Learning break started (event emission failed)',
          startedAt: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * POST /learning-breaks/complete
   *
   * Record when a learner completes a learning break game.
   * Sends results to session service and optionally updates Virtual Brain.
   */
  fastify.post(
    '/learning-breaks/complete',
    async (request: FastifyRequest, reply) => {
      const parseResult = CompleteLearningBreakSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const {
        sessionId,
        learnerId,
        gameType,
        completed,
        score,
        correctAnswers,
        totalQuestions,
        durationSeconds,
        targetSkillCodes,
        helpfulnessRating,
      } = parseResult.data;

      // Calculate accuracy if we have the data
      const accuracy =
        totalQuestions && totalQuestions > 0 && correctAnswers !== undefined
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : undefined;

      try {
        // Emit session event
        await sessionServiceClient.emitEvent({
          sessionId,
          eventType: 'LEARNING_BREAK_COMPLETED',
          payload: {
            learnerId,
            gameType,
            completed,
            score,
            correctAnswers,
            totalQuestions,
            accuracy,
            durationSeconds,
            targetSkillCodes,
            helpfulnessRating,
            completedAt: new Date().toISOString(),
          },
        });

        // Calculate rewards
        let xpEarned = 0;
        let coinsEarned = 0;

        if (completed) {
          xpEarned = 15; // Base XP
          coinsEarned = 5; // Base coins

          // Bonus for high accuracy
          if (accuracy && accuracy >= 80) {
            xpEarned += 10;
            coinsEarned += 3;
          }
        }

        return reply.status(200).send({
          success: true,
          message: completed ? 'Learning break completed!' : 'Learning break ended',
          results: {
            completed,
            score,
            accuracy,
            xpEarned,
            coinsEarned,
          },
          completedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[LearningBreak] Complete event failed:', err);
        return reply.status(200).send({
          success: true,
          message: 'Learning break recorded (event emission failed)',
          completedAt: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * GET /learning-breaks/games
   *
   * List available learning break game types for a grade band.
   */
  fastify.get(
    '/learning-breaks/games/:gradeBand',
    async (request: FastifyRequest, reply) => {
      const params = request.params as { gradeBand: string };
      const gradeBand = params.gradeBand as GradeBand;

      if (!['K5', 'G6_8', 'G9_12'].includes(gradeBand)) {
        return reply.status(400).send({
          error: 'Invalid grade band',
          validValues: ['K5', 'G6_8', 'G9_12'],
        });
      }

      // Return available game types for this grade band
      const games = [
        {
          gameType: 'MATH_BUBBLE_POP',
          title: 'Math Bubble Pop',
          description: 'Pop the bubbles with the right answers!',
          domain: 'MATH',
          estimatedDuration: 60,
          available: ['K5', 'G6_8'].includes(gradeBand),
        },
        {
          gameType: 'NUMBER_NINJA',
          title: 'Number Ninja',
          description: 'Slice through math problems like a ninja!',
          domain: 'MATH',
          estimatedDuration: 90,
          available: true,
        },
        {
          gameType: 'WORD_SCRAMBLE',
          title: 'Word Scramble Sprint',
          description: 'Unscramble the letters to find hidden words!',
          domain: 'ELA',
          estimatedDuration: 90,
          available: true,
        },
        {
          gameType: 'QUICK_QUIZ',
          title: 'Quick Quiz Blast',
          description: 'Answer quick questions from your lessons!',
          domain: 'ALL',
          estimatedDuration: 60,
          available: true,
        },
        {
          gameType: 'PATTERN_POWER',
          title: 'Pattern Power',
          description: 'Find the pattern and complete the sequence!',
          domain: 'MATH',
          estimatedDuration: 90,
          available: true,
        },
        {
          gameType: 'FACT_OR_FICTION',
          title: 'Fact or Fiction?',
          description: 'Is it true or false? You decide!',
          domain: 'SCIENCE',
          estimatedDuration: 60,
          available: true,
        },
      ].filter((g) => g.available);

      return reply.status(200).send({
        gradeBand,
        games,
        count: games.length,
      });
    }
  );

  /**
   * GET /learning-breaks/history/:learnerId
   *
   * Get recent learning break history for a learner.
   */
  fastify.get(
    '/learning-breaks/history/:learnerId',
    async (request: FastifyRequest, reply) => {
      const params = request.params as { learnerId: string };
      const query = request.query as { limit?: string };
      const limit = parseInt(query.limit || '10', 10);

      // In production, this would query the database
      // For now, return placeholder data
      return reply.status(200).send({
        learnerId: params.learnerId,
        recentBreaks: [],
        totalBreaks: 0,
        averageAccuracy: null,
        favoriteGameType: null,
        message: 'History tracking available in production deployment',
      });
    }
  );
};

export default learningBreakRoutes;
