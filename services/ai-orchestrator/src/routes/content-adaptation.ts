/**
 * Content Adaptation Routes
 *
 * API endpoints for adapting educational content to target reading levels.
 * Enables the platform to deliver grade-level concepts at appropriate
 * language complexity for each learner.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { ContentAdaptationService } from '../generation/content-adaptation.service.js';
import { ReadabilityAnalysisService } from '../generation/readability-analysis.service.js';
import { getLLMOrchestrator } from '../providers/llm-orchestrator.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const AdaptContentSchema = z.object({
  content: z.string().min(1).max(50000),
  targetLexile: z.number().min(-100).max(2000),
  currentLexile: z.number().min(-100).max(2000).optional(),
  subject: z.string().optional(),
  topic: z.string().optional(),
  conceptGradeLevel: z.string().optional(),
  contentType: z
    .enum(['instruction', 'explanation', 'question', 'feedback', 'narrative'])
    .optional(),
  preserveTerms: z.array(z.string()).optional(),
  context: z
    .object({
      learnerProfile: z
        .object({
          hasIEP: z.boolean().optional(),
          englishLearner: z.boolean().optional(),
          interests: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .optional(),
});

const AnalyzeReadabilitySchema = z.object({
  text: z.string().min(1).max(50000),
  context: z
    .object({
      subject: z.string().optional(),
      gradeLevel: z.string().optional(),
      contentType: z.enum(['instruction', 'narrative', 'informational', 'assessment']).optional(),
    })
    .optional(),
});

const ScaffoldContentSchema = z.object({
  content: z.string().min(1).max(50000),
  levels: z.array(z.number().min(-100).max(2000)).min(1).max(5),
  subject: z.string().optional(),
  preserveTerms: z.array(z.string()).optional(),
  learnerCurrentLexile: z.number().optional(),
});

const AdaptQuestionSchema = z.object({
  question: z.object({
    prompt: z.string().min(1),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string(),
    explanation: z.string().optional(),
  }),
  targetLexile: z.number().min(-100).max(2000),
  subject: z.string().optional(),
  preserveTerms: z.array(z.string()).optional(),
});

const BatchAdaptSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      content: z.string().min(1).max(10000),
      contentType: z
        .enum(['instruction', 'explanation', 'question', 'feedback', 'narrative'])
        .optional(),
    })
  ).min(1).max(20),
  targetLexile: z.number().min(-100).max(2000),
  subject: z.string().optional(),
  preserveTerms: z.array(z.string()).optional(),
});

const EstimateLexileSchema = z.object({
  text: z.string().min(1).max(50000),
  context: z.object({
    subject: z.string().optional(),
    contentType: z.enum(['instruction', 'narrative', 'informational', 'assessment']).optional(),
  }).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
}

function getUserFromRequest(request: FastifyRequest): { sub: string; tenantId: string } | null {
  const user = (request as unknown as { user?: JwtUser }).user;
  if (!user) return null;
  return {
    sub: user.sub,
    tenantId: user.tenantId ?? user.tenant_id ?? '',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function contentAdaptationRoutes(fastify: FastifyInstance) {
  const llm = getLLMOrchestrator();
  const adaptationService = new ContentAdaptationService(llm);
  const readabilityService = new ReadabilityAnalysisService(llm);

  /**
   * POST /api/v1/content-adaptation/adapt
   * Adapt content to a target Lexile reading level
   */
  fastify.post(
    '/api/v1/content-adaptation/adapt',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      const tenantId = user?.tenantId ?? 'system';

      const parseResult = AdaptContentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const data = parseResult.data;

      try {
        const result = await adaptationService.adaptContent({
          ...data,
          tenantId,
          learnerId: user?.sub,
        });

        return reply.send(result);
      } catch (error) {
        console.error('Content adaptation failed', { error });
        return reply.status(500).send({
          error: 'Content adaptation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /api/v1/content-adaptation/analyze
   * Analyze text readability and get Lexile estimate
   */
  fastify.post(
    '/api/v1/content-adaptation/analyze',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = AnalyzeReadabilitySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { text, context } = parseResult.data;

      try {
        const result = await readabilityService.analyzeReadability(text, context);
        return reply.send(result);
      } catch (error) {
        console.error('Readability analysis failed', { error });
        return reply.status(500).send({
          error: 'Readability analysis failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /api/v1/content-adaptation/estimate-lexile
   * Quick Lexile level estimation for text
   */
  fastify.post(
    '/api/v1/content-adaptation/estimate-lexile',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);

      const parseResult = EstimateLexileSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { text, context } = parseResult.data;

      try {
        const result = await readabilityService.estimateLexileLevel({
          text,
          context,
          tenantId: user?.tenantId,
        });

        return reply.send(result);
      } catch (error) {
        console.error('Lexile estimation failed', { error });
        return reply.status(500).send({
          error: 'Lexile estimation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /api/v1/content-adaptation/scaffold
   * Generate scaffolded versions at multiple reading levels
   */
  fastify.post(
    '/api/v1/content-adaptation/scaffold',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);

      const parseResult = ScaffoldContentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { content, levels, subject, preserveTerms, learnerCurrentLexile } = parseResult.data;

      try {
        const result = await adaptationService.generateScaffoldedVersions(content, {
          levels,
          subject,
          preserveTerms,
          learnerCurrentLexile,
          tenantId: user?.tenantId,
        });

        return reply.send(result);
      } catch (error) {
        console.error('Scaffolded content generation failed', { error });
        return reply.status(500).send({
          error: 'Scaffolded content generation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /api/v1/content-adaptation/adapt-question
   * Adapt an assessment question to target reading level
   */
  fastify.post(
    '/api/v1/content-adaptation/adapt-question',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);

      const parseResult = AdaptQuestionSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { question, targetLexile, subject, preserveTerms } = parseResult.data;

      try {
        const result = await adaptationService.adaptQuestion(question, targetLexile, {
          subject,
          preserveTerms,
          tenantId: user?.tenantId,
        });

        return reply.send(result);
      } catch (error) {
        console.error('Question adaptation failed', { error });
        return reply.status(500).send({
          error: 'Question adaptation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /api/v1/content-adaptation/batch
   * Batch adapt multiple content items
   */
  fastify.post(
    '/api/v1/content-adaptation/batch',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);

      const parseResult = BatchAdaptSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { items, targetLexile, subject, preserveTerms } = parseResult.data;

      try {
        const results = await adaptationService.batchAdapt({
          items,
          targetLexile,
          subject,
          preserveTerms,
          tenantId: user?.tenantId,
        });

        // Convert Map to object for JSON response
        const response: Record<string, unknown> = {};
        for (const [id, adapted] of results) {
          response[id] = adapted;
        }

        return reply.send({
          results: response,
          itemCount: items.length,
          targetLexile,
        });
      } catch (error) {
        console.error('Batch adaptation failed', { error });
        return reply.status(500).send({
          error: 'Batch adaptation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /api/v1/content-adaptation/lexile-ranges
   * Get Lexile level ranges by grade
   */
  fastify.get(
    '/api/v1/content-adaptation/lexile-ranges',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const { LEXILE_GRADE_RANGES } = await import('../generation/readability-analysis.service.js');

      return reply.send({
        ranges: LEXILE_GRADE_RANGES,
        description: 'Lexile measure ranges by grade level',
        notes: {
          BR: 'Beginning Reader (below 0L)',
          typical: 'Average reading level for grade',
          min: 'Lower end of grade-level range',
          max: 'Upper end of grade-level range (stretch)',
        },
      });
    }
  );

  /**
   * POST /api/v1/content-adaptation/grade-to-lexile
   * Convert grade level to Lexile estimate
   */
  fastify.post(
    '/api/v1/content-adaptation/grade-to-lexile',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        gradeLevel: z.number().min(0).max(16),
      });

      const parseResult = schema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid grade level',
          details: parseResult.error.flatten(),
        });
      }

      const { gradeLevel } = parseResult.data;
      const lexile = readabilityService.gradeToLexile(gradeLevel);

      return reply.send({
        gradeLevel,
        estimatedLexile: lexile,
        gradeEquivalent: readabilityService.lexileToGradeEquivalent(lexile),
      });
    }
  );
}
