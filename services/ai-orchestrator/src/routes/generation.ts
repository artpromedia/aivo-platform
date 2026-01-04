/**
 * AI Content Generation Routes
 *
 * REST API endpoints for AI-powered content generation:
 * - Lesson generation
 * - Question generation
 * - Feedback/grading
 * - Translations
 * - Learning paths
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import {
  LessonGenerationService,
  QuestionGenerationService,
  ExplanationService,
  FeedbackService,
  TranslationService,
  LearningPathService,
  ImageGenerationService,
  CostTrackingService,
} from '../generation/index.js';
import { ContentValidator } from '../validators/index.js';
import type {
  LessonGenerationRequest,
  QuestionGenerationRequest,
  ExplanationRequest,
  FeedbackRequest,
  TranslationRequest,
  LearningPathRequest,
  ImageGenerationRequest,
} from '../generation/types.js';

// ────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ────────────────────────────────────────────────────────────────────────────

const lessonGenerationSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  gradeLevel: z.string().min(1),
  objectives: z.array(z.string()).optional(),
  standards: z.array(z.string()).optional(),
  duration: z.number().min(5).max(120).optional(),
  difficulty: z.number().min(1).max(5).optional(),
  learnerProfile: z
    .object({
      learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading']).optional(),
      specialNeeds: z.array(z.string()).optional(),
      interests: z.array(z.string()).optional(),
    })
    .optional(),
  includeAssessment: z.boolean().optional(),
  model: z.string().optional(),
});

const questionGenerationSchema = z.object({
  topic: z.string().min(1),
  subject: z.string().min(1),
  gradeLevel: z.string().min(1),
  questionTypes: z
    .array(z.enum(['multipleChoice', 'trueFalse', 'shortAnswer', 'essay', 'fillBlank', 'matching']))
    .optional(),
  count: z.number().min(1).max(20).optional(),
  difficulty: z.number().min(1).max(5).optional(),
  bloomsLevels: z
    .array(z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']))
    .optional(),
  skills: z.array(z.string()).optional(),
  includeHints: z.boolean().optional(),
  model: z.string().optional(),
});

const explanationSchema = z.object({
  concept: z.string().min(1),
  context: z.string().optional(),
  studentProfile: z.object({
    gradeLevel: z.string(),
    learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading']).optional(),
    priorKnowledge: z.array(z.string()).optional(),
  }),
  simplify: z.boolean().optional(),
  includeExamples: z.boolean().optional(),
  model: z.string().optional(),
});

const feedbackSchema = z.object({
  submission: z.string().min(1),
  submissionType: z.enum(['essay', 'shortAnswer', 'code', 'other']),
  rubric: z
    .array(
      z.object({
        criterion: z.string(),
        description: z.string(),
        maxPoints: z.number(),
      })
    )
    .optional(),
  assignmentContext: z.string().optional(),
  gradeLevel: z.string(),
  subject: z.string(),
  model: z.string().optional(),
});

const translationSchema = z.object({
  content: z.string().min(1),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
  contentType: z.enum(['lesson', 'question', 'feedback', 'general']).optional(),
  preserveFormatting: z.boolean().optional(),
  educationalContext: z.boolean().optional(),
  model: z.string().optional(),
});

const learningPathSchema = z.object({
  subject: z.string().min(1),
  currentSkills: z.array(
    z.object({
      skillId: z.string(),
      masteryLevel: z.number().min(0).max(1),
    })
  ),
  targetSkill: z.string(),
  targetMasteryLevel: z.number().min(0).max(1).optional(),
  learnerProfile: z
    .object({
      gradeLevel: z.string(),
      learningStyle: z.string().optional(),
      pacePreference: z.enum(['slow', 'normal', 'fast']).optional(),
    })
    .optional(),
  timeAvailable: z.number().optional(),
  model: z.string().optional(),
});

const imageGenerationSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  imageType: z.enum(['diagram', 'illustration', 'chart', 'infographic', 'scene']),
  description: z.string().min(10),
  gradeLevel: z.string(),
  style: z.enum(['realistic', 'cartoon', 'sketch', 'flat', 'isometric']).optional(),
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
});

// ────────────────────────────────────────────────────────────────────────────
// ROUTE OPTIONS
// ────────────────────────────────────────────────────────────────────────────

interface GenerationRoutesOptions {
  pool: Pool;
  llmOrchestrator: LLMOrchestrator;
}

// ────────────────────────────────────────────────────────────────────────────
// PLUGIN
// ────────────────────────────────────────────────────────────────────────────

const generationRoutes: FastifyPluginAsync<GenerationRoutesOptions> = async (
  fastify: FastifyInstance,
  options: GenerationRoutesOptions
) => {
  const { pool, llmOrchestrator } = options;

  // Initialize services
  const lessonService = new LessonGenerationService(llmOrchestrator);
  const questionService = new QuestionGenerationService(llmOrchestrator);
  const explanationService = new ExplanationService(llmOrchestrator);
  const feedbackService = new FeedbackService(llmOrchestrator);
  const translationService = new TranslationService(llmOrchestrator);
  const learningPathService = new LearningPathService(llmOrchestrator);
  const imageService = new ImageGenerationService(llmOrchestrator);
  const costTracker = new CostTrackingService(llmOrchestrator);
  const validator = new ContentValidator();

  // ──────────────────────────────────────────────────────────────────────────
  // LESSON GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof lessonGenerationSchema>;
  }>('/generation/lessons', {
    schema: {
      description: 'Generate an AI-powered lesson',
      tags: ['AI Generation'],
      body: {
        type: 'object',
        required: ['subject', 'topic', 'gradeLevel'],
        properties: {
          subject: { type: 'string' },
          topic: { type: 'string' },
          gradeLevel: { type: 'string' },
          objectives: { type: 'array', items: { type: 'string' } },
          standards: { type: 'array', items: { type: 'string' } },
          duration: { type: 'number', minimum: 5, maximum: 120 },
          difficulty: { type: 'number', minimum: 1, maximum: 5 },
          includeAssessment: { type: 'boolean' },
        },
      },
    },
    handler: async (request, reply) => {
      const parsed = lessonGenerationSchema.parse(request.body);

      // Get tenant/user from auth (simplified here)
      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const lessonRequest: LessonGenerationRequest = {
        ...parsed,
        tenantId,
        userId,
      };

      const lesson = await lessonService.generateLesson(lessonRequest);

      // Validate the generated lesson
      const validation = validator.validateLesson(lesson);

      // Track cost
      if (lesson.metadata) {
        costTracker.recordFromMetadata(lesson.metadata, {
          tenantId,
          userId,
          featureType: 'lesson_generation',
        });
      }

      // Log to database
      await logGeneration(pool, {
        tenantId,
        userId,
        generationType: 'lesson',
        request: lessonRequest,
        response: lesson,
        metadata: lesson.metadata,
      });

      return reply.status(201).send({
        lesson,
        validation,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // QUESTION GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof questionGenerationSchema>;
  }>('/generation/questions', {
    schema: {
      description: 'Generate AI-powered assessment questions',
      tags: ['AI Generation'],
    },
    handler: async (request, reply) => {
      const parsed = questionGenerationSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const questionRequest: QuestionGenerationRequest = {
        ...parsed,
        count: parsed.count ?? 5,
        tenantId,
        userId,
      };

      const result = await questionService.generateQuestions(questionRequest);

      // Validate questions
      const validations = result.questions.map((q) => validator.validateQuestion(q));

      // Track cost
      if (result.metadata) {
        costTracker.recordFromMetadata(result.metadata, {
          tenantId,
          userId,
          featureType: 'question_generation',
        });
      }

      // Log to database
      await logGeneration(pool, {
        tenantId,
        userId,
        generationType: 'question',
        request: questionRequest,
        response: result,
        metadata: result.metadata,
      });

      return reply.status(201).send({
        questions: result.questions,
        validations,
        metadata: result.metadata,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // EXPLANATION GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof explanationSchema>;
  }>('/generation/explanations', {
    schema: {
      description: 'Generate adaptive explanations for concepts',
      tags: ['AI Generation'],
    },
    handler: async (request, reply) => {
      const parsed = explanationSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const explanationRequest: ExplanationRequest = {
        concept: parsed.concept,
        context: parsed.context,
        studentProfile: parsed.studentProfile,
        tenantId,
        userId,
      };

      const explanation = await explanationService.generateExplanation(explanationRequest);

      // Track cost
      if (explanation.metadata) {
        costTracker.recordFromMetadata(explanation.metadata, {
          tenantId,
          userId,
          featureType: 'explanation_generation',
        });
      }

      return reply.status(201).send({
        explanation,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // FEEDBACK GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof feedbackSchema>;
  }>('/generation/feedback', {
    schema: {
      description: 'Generate AI-powered feedback for student submissions',
      tags: ['AI Generation'],
    },
    handler: async (request, reply) => {
      const parsed = feedbackSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const feedbackRequest: FeedbackRequest = {
        submission: parsed.submission,
        submissionType: parsed.submissionType,
        rubric: parsed.rubric,
        assignmentContext: parsed.assignmentContext,
        gradeLevel: parsed.gradeLevel,
        subject: parsed.subject,
        tenantId,
        userId,
        studentId: userId, // Would come from auth in production
      };

      const feedback = await feedbackService.generateFeedback(feedbackRequest);

      // Validate feedback
      const validation = validator.validateFeedback(feedback);

      // Track cost
      if (feedback.metadata) {
        costTracker.recordFromMetadata(feedback.metadata, {
          tenantId,
          userId,
          featureType: 'feedback_generation',
        });
      }

      // Log to database
      await logGeneration(pool, {
        tenantId,
        userId,
        generationType: 'feedback',
        request: feedbackRequest,
        response: feedback,
        metadata: feedback.metadata,
      });

      return reply.status(201).send({
        feedback,
        validation,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // ESSAY GRADING
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof feedbackSchema>;
  }>('/generation/grade-essay', {
    schema: {
      description: 'AI-powered essay grading with detailed analysis',
      tags: ['AI Generation'],
    },
    handler: async (request, reply) => {
      const parsed = feedbackSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const gradingResult = await feedbackService.gradeEssay({
        essay: parsed.submission,
        rubric: parsed.rubric ?? [],
        assignmentPrompt: parsed.assignmentContext ?? '',
        maxScore: 100,
        tenantId,
        userId,
      });

      // Track cost
      if (gradingResult.metadata) {
        costTracker.recordFromMetadata(gradingResult.metadata, {
          tenantId,
          userId,
          featureType: 'essay_grading',
        });
      }

      return reply.status(200).send({
        grading: gradingResult,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TRANSLATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof translationSchema>;
  }>('/generation/translate', {
    schema: {
      description: 'Translate educational content',
      tags: ['AI Generation'],
    },
    handler: async (request, reply) => {
      const parsed = translationSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const translationRequest: TranslationRequest = {
        ...parsed,
        tenantId,
        userId,
      };

      const translation = await translationService.translate(translationRequest);

      // Track cost
      if (translation.metadata) {
        costTracker.recordFromMetadata(translation.metadata, {
          tenantId,
          userId,
          featureType: 'translation',
        });
      }

      return reply.status(200).send({
        translation,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // LEARNING PATH GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof learningPathSchema>;
  }>('/generation/learning-paths', {
    schema: {
      description: 'Generate personalized learning paths',
      tags: ['AI Generation'],
    },
    handler: async (request, reply) => {
      const parsed = learningPathSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const pathRequest: LearningPathRequest = {
        ...parsed,
        tenantId,
        userId,
        learnerId: userId, // Would come from auth in production
      };

      const learningPath = await learningPathService.generateLearningPath(pathRequest);

      // Track cost
      if (learningPath.metadata) {
        costTracker.recordFromMetadata(learningPath.metadata, {
          tenantId,
          userId,
          featureType: 'learning_path',
        });
      }

      // Log to database
      await logGeneration(pool, {
        tenantId,
        userId,
        generationType: 'learning_path',
        request: pathRequest,
        response: learningPath,
        metadata: learningPath.metadata,
      });

      return reply.status(201).send({
        learningPath,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // IMAGE GENERATION
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post<{
    Body: z.infer<typeof imageGenerationSchema>;
  }>('/generation/images', {
    schema: {
      description: 'Generate educational images using DALL-E',
      tags: ['AI Generation'],
    },
    handler: async (request, reply) => {
      const parsed = imageGenerationSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const imageRequest: ImageGenerationRequest = {
        ...parsed,
        tenantId,
        userId,
      };

      const image = await imageService.generateImage(imageRequest);

      // Track cost
      costTracker.recordUsage({
        tenantId,
        userId,
        featureType: 'image_generation',
        model: 'dall-e-3',
        provider: 'openai',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 0,
        metadata: {
          quality: parsed.quality ?? 'standard',
          size: parsed.size ?? '1024x1024',
        },
      });

      return reply.status(201).send({
        image,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUPPORTED LANGUAGES
  // ──────────────────────────────────────────────────────────────────────────

  fastify.get('/generation/languages', {
    schema: {
      description: 'Get supported translation languages',
      tags: ['AI Generation'],
    },
    handler: async (request, reply) => {
      const languages = translationService.getSupportedLanguages();
      return reply.send({ languages });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // USAGE STATS
  // ──────────────────────────────────────────────────────────────────────────

  fastify.get('/generation/usage', {
    schema: {
      description: 'Get AI generation usage stats for the tenant',
      tags: ['AI Generation'],
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const summary = await costTracker.getUsageSummary(tenantId);
      const budgetStatus = await costTracker.getBudgetStatus(tenantId);

      return reply.send({
        summary,
        budget: budgetStatus,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // MODEL COSTS
  // ──────────────────────────────────────────────────────────────────────────

  fastify.get('/generation/models', {
    schema: {
      description: 'Get available AI models and their costs',
      tags: ['AI Generation'],
    },
    handler: async (request, reply) => {
      const models = costTracker.getModelCosts();
      return reply.send({ models });
    },
  });
};

// ────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

async function logGeneration(
  pool: Pool,
  data: {
    tenantId: string;
    userId: string;
    generationType: string;
    request: unknown;
    response: unknown;
    metadata?: {
      model?: string;
      provider?: string;
      tokensUsed?: number;
      latencyMs?: number;
      cached?: boolean;
    };
  }
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO ai_generation_log (
        tenant_id, user_id, generation_type, 
        request_payload, response_payload,
        provider, model, tokens_total, latency_ms, cached,
        status, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed', now())`,
      [
        data.tenantId,
        data.userId,
        data.generationType,
        JSON.stringify(data.request),
        JSON.stringify(data.response),
        data.metadata?.provider ?? 'unknown',
        data.metadata?.model ?? 'unknown',
        data.metadata?.tokensUsed ?? 0,
        data.metadata?.latencyMs ?? 0,
        data.metadata?.cached ?? false,
      ]
    );
  } catch (error) {
    console.error('Failed to log generation', { error, generationType: data.generationType });
  }
}

export default generationRoutes;
