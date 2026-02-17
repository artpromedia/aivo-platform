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
import { PromptBuilder } from '../prompts/prompt-builder.js';
import type {
  LessonGenerationRequest,
  QuestionGenerationRequest,
  ExplanationRequest,
  FeedbackRequest,
  TranslationRequest,
  LearningPathRequest,
  ImageGenerationRequest,
  GradeLevel,
  QuestionType,
  SubmissionType,
  RubricCriteria,
  ImageStyle,
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

  // Initialize shared dependencies
  const promptBuilder = new PromptBuilder();
  const validator = new ContentValidator();

  // Initialize services with all required dependencies
  const lessonService = new LessonGenerationService(llmOrchestrator, promptBuilder, validator);
  const questionService = new QuestionGenerationService(llmOrchestrator);
  const explanationService = new ExplanationService(llmOrchestrator);
  const feedbackService = new FeedbackService(llmOrchestrator);
  const translationService = new TranslationService(llmOrchestrator);
  const learningPathService = new LearningPathService(llmOrchestrator);
  const imageService = new ImageGenerationService(); // Uses env OPENAI_API_KEY internally
  const costTracker = new CostTrackingService(llmOrchestrator);

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
        tenantId,
        userId,
        topic: parsed.topic,
        subject: parsed.subject,
        gradeLevel: parsed.gradeLevel as GradeLevel,
        standards: parsed.standards,
        duration: parsed.duration,
        includeAssessment: parsed.includeAssessment,
        // learnerProfile mapped to difficultyLevel and contentStyle
        contentStyle: parsed.learnerProfile?.learningStyle === 'visual' ? 'interactive' : 'formal',
      };

      const lesson = await lessonService.generateLesson(lessonRequest);

      // Validate the generated lesson
      const validation = validator.validateLesson({
        ...lesson,
        gradeLevel: lessonRequest.gradeLevel,
      });

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
        tenantId,
        userId,
        content: parsed.topic, // Use topic as content
        subject: parsed.subject,
        gradeLevel: parsed.gradeLevel as GradeLevel,
        questionTypes: (parsed.questionTypes ?? ['multiple_choice']).map((t) =>
          t === 'multipleChoice' ? 'multiple_choice' :
          t === 'trueFalse' ? 'true_false' :
          t === 'shortAnswer' ? 'short_answer' :
          t === 'fillBlank' ? 'fill_blank' :
          t
        ) as QuestionType[],
        count: parsed.count ?? 5,
        bloomsLevels: parsed.bloomsLevels,
        includeHints: parsed.includeHints,
      };

      const questions = await questionService.generateQuestions(questionRequest);

      // Validate questions - just check that we have valid questions
      const validations = questions.map((q) => validator.validateQuestion({
        ...q,
        gradeLevel: questionRequest.gradeLevel,
      }));

      // Log to database
      await logGeneration(pool, {
        tenantId,
        userId,
        generationType: 'question',
        request: questionRequest,
        response: questions,
        metadata: {},
      });

      return reply.status(201).send({
        questions,
        validations,
        metadata: {},
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
        studentId: userId, // Use userId as studentId
        tenantId,
        userId,
        preferredStyle: parsed.studentProfile?.learningStyle === 'visual' ? 'visual' :
                       parsed.studentProfile?.learningStyle === 'reading' ? 'textual' :
                       'step-by-step',
      };

      const explanation = await explanationService.generateExplanation(explanationRequest);

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

      // Map schema submissionType to service SubmissionType
      const submissionTypeMap: Record<string, SubmissionType> = {
        essay: 'essay',
        shortAnswer: 'short_answer',
        code: 'code',
        other: 'essay', // Default to essay for 'other'
      };

      // Build rubric with required properties
      const rubric: RubricCriteria[] | undefined = parsed.rubric?.map((r) => ({
        name: r.criterion,
        description: r.description,
        maxPoints: r.maxPoints,
        levels: [
          { score: r.maxPoints, description: 'Excellent' },
          { score: Math.floor(r.maxPoints * 0.5), description: 'Satisfactory' },
          { score: 0, description: 'Needs improvement' },
        ],
      }));

      const feedbackRequest: FeedbackRequest = {
        tenantId,
        userId,
        studentId: userId, // Would come from auth in production
        submissionType: submissionTypeMap[parsed.submissionType] ?? 'essay',
        studentResponse: parsed.submission,
        question: parsed.assignmentContext ?? 'Evaluate this submission',
        rubric,
        gradeLevel: parsed.gradeLevel as GradeLevel,
        subject: parsed.subject,
        maxPoints: rubric?.reduce((sum, r) => sum + r.maxPoints, 0) ?? 100,
      };

      const feedback = await feedbackService.generateFeedback(feedbackRequest);

      // Validate feedback
      const validation = validator.validateFeedback(feedback);

      // Log to database
      await logGeneration(pool, {
        tenantId,
        userId,
        generationType: 'feedback',
        request: feedbackRequest,
        response: feedback,
        metadata: {},
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

      // Build rubric with required properties
      const rubric: RubricCriteria[] = (parsed.rubric ?? []).map((r) => ({
        name: r.criterion,
        description: r.description,
        maxPoints: r.maxPoints,
        levels: [
          { score: r.maxPoints, description: 'Excellent' },
          { score: Math.floor(r.maxPoints * 0.5), description: 'Satisfactory' },
          { score: 0, description: 'Needs improvement' },
        ],
      }));

      const gradingResult = await feedbackService.gradeEssay(
        parsed.submission,
        parsed.assignmentContext ?? 'Evaluate this essay',
        {
          gradeLevel: parsed.gradeLevel,
          rubric: rubric.length > 0 ? rubric : undefined,
          maxPoints: rubric.reduce((sum, r) => sum + r.maxPoints, 0) || 100,
          studentId: userId,
          tenantId,
        }
      );

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
        tenantId,
        userId,
        content: parsed.content,
        sourceLanguage: parsed.sourceLanguage,
        targetLanguage: parsed.targetLanguage,
        contentType: parsed.contentType,
        preserveFormatting: parsed.preserveFormatting,
        educationalContext: parsed.educationalContext,
      };

      const translation = await translationService.translate(translationRequest);

      return reply.status(200).send({
        translation,
      });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // BATCH TRANSLATION
  // ──────────────────────────────────────────────────────────────────────────

  const batchTranslationSchema = z.object({
    contents: z.array(z.string().min(1)).min(1).max(200),
    sourceLanguage: z.string().min(2).max(10),
    targetLanguage: z.string().min(2).max(10),
    contentType: z.enum(['lesson', 'question', 'feedback', 'general']).optional(),
    preserveFormatting: z.boolean().optional(),
    educationalContext: z.union([z.boolean(), z.string()]).optional(),
  });

  fastify.post<{
    Body: z.infer<typeof batchTranslationSchema>;
  }>('/translate/batch', {
    schema: {
      description: 'Translate multiple content strings in batch',
      tags: ['AI Generation'],
    },
    handler: async (request, reply) => {
      const parsed = batchTranslationSchema.parse(request.body);

      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'default';
      const userId = (request.headers['x-user-id'] as string) ?? 'anonymous';

      const items = parsed.contents.map((text, i) => ({
        id: String(i),
        content: text,
        contentType: parsed.contentType ?? 'general',
      }));

      const results = await translationService.translateBatch(
        items,
        parsed.sourceLanguage,
        parsed.targetLanguage,
        { tenantId, userId },
      );

      // Map back to ordered translations array
      const translations = results
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map((r) => r.translatedContent || '');

      return reply.status(200).send({ translations });
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
        tenantId,
        userId,
        goal: parsed.targetSkill, // Map targetSkill to goal
        targetSkills: [parsed.targetSkill],
        timeframe: parsed.timeAvailable ? `${parsed.timeAvailable} hours` : undefined,
        studentProfile: parsed.learnerProfile ? {
          gradeLevel: parsed.learnerProfile.gradeLevel as GradeLevel,
          learningStyle: parsed.learnerProfile.learningStyle,
          pacePreference: parsed.learnerProfile.pacePreference === 'normal' ? 'moderate' : parsed.learnerProfile.pacePreference,
        } : undefined,
      };

      const learningPath = await learningPathService.generateLearningPath(pathRequest);

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

      // Map style names and construct proper request
      const styleMap: Record<string, ImageStyle> = {
        realistic: 'realistic',
        cartoon: 'cartoon',
        sketch: 'hand-drawn',
        flat: 'minimalist',
        isometric: 'educational',
      };

      const imageRequest: ImageGenerationRequest = {
        tenantId,
        userId,
        prompt: parsed.description,
        type: parsed.imageType,
        subject: parsed.subject,
        gradeLevel: parsed.gradeLevel as GradeLevel,
        style: parsed.style ? styleMap[parsed.style] : undefined,
        size: parsed.size,
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
