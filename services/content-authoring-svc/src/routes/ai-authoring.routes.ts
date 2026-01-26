/**
 * AI Authoring Routes
 *
 * REST API endpoints for AI-assisted content authoring features:
 * - Draft generation
 * - Section regeneration
 * - Curriculum alignment validation
 * - Content quality scoring
 * - Auto-tagging
 * - Content simplification
 * - Assessment generation
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { getUserFromRequest, getUserTenantId, requireRoles } from '../auth.js';
import { DraftGenerator, createDraftGenerator } from '../ai/draft-generator.js';
import { CurriculumValidator, createCurriculumValidator } from '../ai/curriculum-validator.js';
import { QualityScorer, createQualityScorer } from '../ai/quality-scorer.js';
import { getCurriculumService } from '../ai/curriculum-service.js';
import { getCacheManager } from '../ai/cache.js';
import type {
  DraftGenerationRequest,
  ContentType,
  Subject,
  ContentStyle,
  TargetLength,
  QuestionType,
  BloomsLevel,
} from '../types/ai-authoring.js';

// ══════════════════════════════════════════════════════════════════════════════
// ROLE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

const AUTHOR_ROLES = ['CONTENT_AUTHOR', 'PLATFORM_ADMIN', 'DISTRICT_ADMIN', 'SCHOOL_ADMIN'];

// ══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const ContentTypeEnum = z.enum([
  'lesson',
  'assessment',
  'activity',
  'reading-passage',
  'video-script',
  'interactive-exercise',
  'study-guide',
  'flashcard-set',
]);

const SubjectEnum = z.enum([
  'ELA',
  'MATH',
  'SCIENCE',
  'SOCIAL_STUDIES',
  'SEL',
  'SPEECH',
  'ART',
  'MUSIC',
  'WORLD_LANGUAGES',
  'HEALTH',
  'OTHER',
]);

const ContentStyleEnum = z.enum(['formal', 'conversational', 'interactive', 'narrative']);

const TargetLengthEnum = z.enum(['short', 'medium', 'long']);

const QuestionTypeEnum = z.enum([
  'multiple_choice',
  'multi_select',
  'true_false',
  'fill_blank',
  'short_answer',
  'essay',
  'matching',
  'ordering',
  'numeric',
  'drag_drop',
]);

const BloomsLevelEnum = z.enum([
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create',
]);

// Request Schemas
const GenerateDraftSchema = z.object({
  contentType: ContentTypeEnum,
  subject: SubjectEnum,
  gradeLevel: z.number().int().min(0).max(12),
  curriculumStandards: z.array(z.string()).default([]),
  topic: z.string().min(1).max(500),
  learningObjectives: z.array(z.string()).default([]),
  targetLength: TargetLengthEnum.optional(),
  style: ContentStyleEnum.optional(),
  includeAssessments: z.boolean().optional(),
  includeActivities: z.boolean().optional(),
  keywords: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  locale: z.string().optional(),
});

const RegenerateSectionSchema = z.object({
  feedback: z.string().optional(),
});

const ExpandContentSchema = z.object({
  targetLength: z.number().int().min(100).max(10000),
});

const SimplifyContentSchema = z.object({
  targetGradeLevel: z.number().int().min(0).max(12),
});

const ValidateAlignmentSchema = z.object({
  contentId: z.string().optional(),
  content: z.string().optional(),
  targetStandards: z.array(z.string()).min(1),
  subject: SubjectEnum,
  gradeLevel: z.number().int().min(0).max(12),
});

const ScoreQualitySchema = z.object({
  contentId: z.string().optional(),
  content: z.string().optional(),
  metadata: z
    .object({
      subject: SubjectEnum,
      gradeLevel: z.number().int().min(0).max(12),
      contentType: ContentTypeEnum,
      standards: z.array(z.string()).optional(),
      targetAudience: z.string().optional(),
    })
    .optional(),
});

const SuggestImprovementsSchema = z.object({
  contentId: z.string(),
  focusAreas: z.array(z.string()).optional(),
});

const AutoTagSchema = z.object({
  contentId: z.string(),
});

const GenerateAssessmentSchema = z.object({
  contentId: z.string(),
  questionCount: z.number().int().min(1).max(50),
  questionTypes: z.array(QuestionTypeEnum).min(1),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
  bloomsLevels: z.array(BloomsLevelEnum).optional(),
  includeRubric: z.boolean().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE INSTANCES
// ══════════════════════════════════════════════════════════════════════════════

let draftGenerator: DraftGenerator | null = null;
let curriculumValidator: CurriculumValidator | null = null;
let qualityScorer: QualityScorer | null = null;

function getDraftGenerator(): DraftGenerator {
  if (!draftGenerator) {
    const cacheManager = getCacheManager();
    draftGenerator = createDraftGenerator(
      undefined,
      getCurriculumService(),
      cacheManager.getDraftCache()
    );
  }
  return draftGenerator;
}

function getCurriculumValidator(): CurriculumValidator {
  if (!curriculumValidator) {
    const cacheManager = getCacheManager();
    curriculumValidator = createCurriculumValidator(
      undefined,
      getCurriculumService(),
      cacheManager.getAlignmentCache()
    );
  }
  return curriculumValidator;
}

function getQualityScorer(): QualityScorer {
  if (!qualityScorer) {
    const cacheManager = getCacheManager();
    qualityScorer = createQualityScorer(undefined, cacheManager.getQualityCache());
  }
  return qualityScorer;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function aiAuthoringRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Generate initial draft
   * POST /api/v1/content/ai/generate-draft
   */
  fastify.post(
    '/v1/content/ai/generate-draft',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const tenantId = getUserTenantId(user);
      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const parseResult = GenerateDraftSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: parseResult.error.issues,
        });
      }

      const body = parseResult.data;

      try {
        const draftRequest: DraftGenerationRequest = {
          contentType: body.contentType as ContentType,
          subject: body.subject as Subject,
          gradeLevel: body.gradeLevel,
          curriculumStandards: body.curriculumStandards,
          topic: body.topic,
          learningObjectives: body.learningObjectives,
          targetLength: body.targetLength as TargetLength | undefined,
          style: body.style as ContentStyle | undefined,
          includeAssessments: body.includeAssessments,
          includeActivities: body.includeActivities,
          keywords: body.keywords,
          prerequisites: body.prerequisites,
          targetAudience: body.targetAudience,
          locale: body.locale,
          tenantId,
          userId: user.sub,
        };

        const generator = getDraftGenerator();
        const draft = await generator.generateDraft(draftRequest);

        return reply.status(201).send(draft);
      } catch (error) {
        console.error('Draft generation failed', { error, userId: user.sub });
        return reply.status(500).send({
          error: 'Draft generation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get draft by ID
   * GET /api/v1/content/ai/drafts/:draftId
   */
  fastify.get(
    '/v1/content/ai/drafts/:draftId',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest<{ Params: { draftId: string } }>, reply: FastifyReply) => {
      const { draftId } = request.params;

      const generator = getDraftGenerator();
      const draft = generator.getDraft(draftId);

      if (!draft) {
        return reply.status(404).send({ error: 'Draft not found' });
      }

      return reply.send(draft);
    }
  );

  /**
   * Regenerate specific section
   * POST /api/v1/content/ai/drafts/:draftId/sections/:sectionIndex/regenerate
   */
  fastify.post(
    '/v1/content/ai/drafts/:draftId/sections/:sectionIndex/regenerate',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (
      request: FastifyRequest<{ Params: { draftId: string; sectionIndex: string } }>,
      reply: FastifyReply
    ) => {
      const { draftId, sectionIndex } = request.params;
      const sectionIdx = parseInt(sectionIndex, 10);

      if (isNaN(sectionIdx)) {
        return reply.status(400).send({ error: 'Invalid section index' });
      }

      const parseResult = RegenerateSectionSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: parseResult.error.issues,
        });
      }

      try {
        const generator = getDraftGenerator();
        const section = await generator.regenerateSection(
          draftId,
          sectionIdx,
          parseResult.data.feedback
        );

        return reply.send(section);
      } catch (error) {
        console.error('Section regeneration failed', { error, draftId, sectionIndex });
        if (error instanceof Error && error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        return reply.status(500).send({
          error: 'Section regeneration failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Expand content in a section
   * POST /api/v1/content/ai/drafts/:draftId/sections/:sectionIndex/expand
   */
  fastify.post(
    '/v1/content/ai/drafts/:draftId/sections/:sectionIndex/expand',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (
      request: FastifyRequest<{ Params: { draftId: string; sectionIndex: string } }>,
      reply: FastifyReply
    ) => {
      const { draftId, sectionIndex } = request.params;
      const sectionIdx = parseInt(sectionIndex, 10);

      if (isNaN(sectionIdx)) {
        return reply.status(400).send({ error: 'Invalid section index' });
      }

      const parseResult = ExpandContentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: parseResult.error.issues,
        });
      }

      try {
        const generator = getDraftGenerator();
        const section = await generator.expandContent(
          draftId,
          sectionIdx,
          parseResult.data.targetLength
        );

        return reply.send(section);
      } catch (error) {
        console.error('Content expansion failed', { error, draftId, sectionIndex });
        return reply.status(500).send({
          error: 'Content expansion failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Validate curriculum alignment
   * POST /api/v1/content/ai/validate-alignment
   */
  fastify.post(
    '/v1/content/ai/validate-alignment',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = ValidateAlignmentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: parseResult.error.issues,
        });
      }

      const { contentId, content, targetStandards, subject, gradeLevel } = parseResult.data;

      // Get content from contentId or use provided content
      let contentToValidate = content;
      if (contentId && !contentToValidate) {
        const generator = getDraftGenerator();
        const draft = generator.getDraft(contentId);
        if (!draft) {
          return reply.status(404).send({ error: 'Content not found' });
        }
        contentToValidate = draft.content;
      }

      if (!contentToValidate) {
        return reply.status(400).send({ error: 'Content or contentId required' });
      }

      try {
        const validator = getCurriculumValidator();
        const alignment = await validator.validateAlignment(
          contentToValidate,
          targetStandards,
          subject as Subject,
          gradeLevel,
          { tenantId: getUserTenantId(user) ?? 'system', userId: user.sub }
        );

        return reply.send(alignment);
      } catch (error) {
        console.error('Alignment validation failed', { error });
        return reply.status(500).send({
          error: 'Alignment validation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Score content quality
   * POST /api/v1/content/ai/score-quality
   */
  fastify.post(
    '/v1/content/ai/score-quality',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = ScoreQualitySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: parseResult.error.issues,
        });
      }

      const { contentId, content, metadata } = parseResult.data;

      // Get content from contentId or use provided content
      let contentToScore = content;
      let contentMetadata = metadata;

      if (contentId && !contentToScore) {
        const generator = getDraftGenerator();
        const draft = generator.getDraft(contentId);
        if (!draft) {
          return reply.status(404).send({ error: 'Content not found' });
        }
        contentToScore = draft.content;
        contentMetadata = contentMetadata ?? {
          subject: 'OTHER' as Subject,
          gradeLevel: draft.readabilityScore.targetGradeLevel,
          contentType: 'lesson' as ContentType,
        };
      }

      if (!contentToScore) {
        return reply.status(400).send({ error: 'Content or contentId required' });
      }

      if (!contentMetadata) {
        return reply.status(400).send({ error: 'Content metadata required' });
      }

      try {
        const scorer = getQualityScorer();
        const score = await scorer.scoreContent(
          contentToScore,
          {
            subject: contentMetadata.subject as Subject,
            gradeLevel: contentMetadata.gradeLevel,
            contentType: contentMetadata.contentType as ContentType,
            standards: contentMetadata.standards,
            targetAudience: contentMetadata.targetAudience,
          },
          { tenantId: getUserTenantId(user) ?? 'system', userId: user.sub }
        );

        return reply.send(score);
      } catch (error) {
        console.error('Quality scoring failed', { error });
        return reply.status(500).send({
          error: 'Quality scoring failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Suggest improvements
   * POST /api/v1/content/ai/suggest-improvements
   */
  fastify.post(
    '/v1/content/ai/suggest-improvements',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = SuggestImprovementsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: parseResult.error.issues,
        });
      }

      const { contentId, focusAreas } = parseResult.data;

      const generator = getDraftGenerator();
      const draft = generator.getDraft(contentId);
      if (!draft) {
        return reply.status(404).send({ error: 'Content not found' });
      }

      try {
        const scorer = getQualityScorer();
        const score = await scorer.scoreContent(
          draft.content,
          {
            subject: 'OTHER' as Subject,
            gradeLevel: draft.readabilityScore.targetGradeLevel,
            contentType: 'lesson' as ContentType,
          },
          { tenantId: getUserTenantId(user) ?? 'system', userId: user.sub }
        );

        // Filter suggestions by focus areas if specified
        let suggestions = score.suggestions;
        if (focusAreas && focusAreas.length > 0) {
          suggestions = suggestions.filter((s) => focusAreas.includes(s.dimension));
        }

        // Create prioritized actions
        const prioritizedActions = suggestions
          .sort((a, b) => {
            const impactOrder = { high: 0, medium: 1, low: 2 };
            return impactOrder[a.impact] - impactOrder[b.impact];
          })
          .slice(0, 5)
          .map((s, i) => ({
            rank: i + 1,
            suggestionId: s.id,
            summary: s.suggestion,
            estimatedEffort: s.effort,
          }));

        return reply.send({
          suggestions: suggestions.map((s) => ({
            id: s.id,
            area: s.dimension,
            title: `Improve ${s.dimension}`,
            description: s.suggestion,
            currentState: '',
            suggestedState: '',
            rationale: s.rationale,
            impact: s.impact === 'high' ? 20 : s.impact === 'medium' ? 10 : 5,
          })),
          prioritizedActions,
          estimatedScoreImpact: prioritizedActions.length * 5,
        });
      } catch (error) {
        console.error('Improvement suggestions failed', { error });
        return reply.status(500).send({
          error: 'Failed to generate improvement suggestions',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Auto-tag content
   * POST /api/v1/content/ai/auto-tag
   */
  fastify.post(
    '/v1/content/ai/auto-tag',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = AutoTagSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: parseResult.error.issues,
        });
      }

      const { contentId } = parseResult.data;

      const generator = getDraftGenerator();
      const draft = generator.getDraft(contentId);
      if (!draft) {
        return reply.status(404).send({ error: 'Content not found' });
      }

      try {
        const validator = getCurriculumValidator();
        const standards = await validator.suggestStandards(
          draft.content,
          'OTHER' as Subject,
          draft.readabilityScore.targetGradeLevel,
          { tenantId: getUserTenantId(user) ?? 'system', userId: user.sub }
        );

        // Extract topics from vocabulary and title
        const topics = draft.vocabularyTerms.map((v) => v.term);
        const skills = draft.learningObjectives
          ? ['critical thinking', 'reading comprehension']
          : [];

        // Generate tags based on content analysis
        const tags = [
          { name: draft.title.split(':')[0] || draft.title, category: 'topic', confidence: 0.9 },
          ...topics.slice(0, 5).map((t) => ({ name: t, category: 'concept' as const, confidence: 0.8 })),
          ...skills.map((s) => ({ name: s, category: 'skill' as const, confidence: 0.7 })),
        ];

        return reply.send({
          tags,
          standards,
          topics: topics.slice(0, 10),
          skills,
        });
      } catch (error) {
        console.error('Auto-tagging failed', { error });
        return reply.status(500).send({
          error: 'Auto-tagging failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Simplify content for lower grade
   * POST /api/v1/content/ai/simplify
   */
  fastify.post(
    '/v1/content/ai/simplify',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = SimplifyContentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: parseResult.error.issues,
        });
      }

      const contentId = (request.body as any).contentId;
      if (!contentId) {
        return reply.status(400).send({ error: 'contentId required' });
      }

      try {
        const generator = getDraftGenerator();
        const simplifiedDraft = await generator.simplifyContent(
          contentId,
          parseResult.data.targetGradeLevel
        );

        return reply.send(simplifiedDraft);
      } catch (error) {
        console.error('Content simplification failed', { error });
        if (error instanceof Error && error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        return reply.status(500).send({
          error: 'Content simplification failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Generate assessment from content
   * POST /api/v1/content/ai/generate-assessment
   */
  fastify.post(
    '/v1/content/ai/generate-assessment',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const tenantId = getUserTenantId(user);
      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const parseResult = GenerateAssessmentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: parseResult.error.issues,
        });
      }

      const { contentId, questionCount, questionTypes, difficulty, bloomsLevels } = parseResult.data;

      const generator = getDraftGenerator();
      const draft = generator.getDraft(contentId);
      if (!draft) {
        return reply.status(404).send({ error: 'Content not found' });
      }

      try {
        const questions = await generator.generateAssessmentForContent(
          contentId,
          draft.content,
          {
            questionCount,
            questionTypes: questionTypes as string[],
            difficulty,
            bloomsLevels: bloomsLevels as string[] | undefined,
            tenantId,
            userId: user.sub,
          }
        );

        // Calculate total points
        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

        return reply.status(201).send({
          id: `assessment-${Date.now()}`,
          title: `Assessment: ${draft.title}`,
          description: `Assessment generated from ${draft.title}`,
          questions,
          totalPoints,
          estimatedDuration: Math.ceil(questionCount * 2), // ~2 min per question
          standards: draft.curriculumAlignment.primaryStandards.map((s) => s.standardCode),
          metadata: {
            generatedAt: new Date(),
            sourceContentId: contentId,
          },
        });
      } catch (error) {
        console.error('Assessment generation failed', { error });
        return reply.status(500).send({
          error: 'Assessment generation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Check factual accuracy
   * POST /api/v1/content/ai/check-accuracy
   */
  fastify.post(
    '/v1/content/ai/check-accuracy',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const body = request.body as { contentId?: string; content?: string; subject?: string };
      const { contentId, content, subject } = body;

      let contentToCheck = content;
      if (contentId && !contentToCheck) {
        const generator = getDraftGenerator();
        const draft = generator.getDraft(contentId);
        if (!draft) {
          return reply.status(404).send({ error: 'Content not found' });
        }
        contentToCheck = draft.content;
      }

      if (!contentToCheck) {
        return reply.status(400).send({ error: 'Content or contentId required' });
      }

      try {
        const scorer = getQualityScorer();
        const accuracyCheck = await scorer.checkFactualAccuracy(
          contentToCheck,
          (subject as Subject) || 'OTHER',
          { tenantId: getUserTenantId(user) ?? 'system', userId: user.sub }
        );

        return reply.send(accuracyCheck);
      } catch (error) {
        console.error('Accuracy check failed', { error });
        return reply.status(500).send({
          error: 'Accuracy check failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Analyze content for bias
   * POST /api/v1/content/ai/analyze-bias
   */
  fastify.post(
    '/v1/content/ai/analyze-bias',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const body = request.body as { contentId?: string; content?: string };
      const { contentId, content } = body;

      let contentToAnalyze = content;
      if (contentId && !contentToAnalyze) {
        const generator = getDraftGenerator();
        const draft = generator.getDraft(contentId);
        if (!draft) {
          return reply.status(404).send({ error: 'Content not found' });
        }
        contentToAnalyze = draft.content;
      }

      if (!contentToAnalyze) {
        return reply.status(400).send({ error: 'Content or contentId required' });
      }

      try {
        const scorer = getQualityScorer();
        const biasAnalysis = await scorer.analyzeBias(contentToAnalyze, {
          tenantId: getUserTenantId(user) ?? 'system',
          userId: user.sub,
        });

        return reply.send(biasAnalysis);
      } catch (error) {
        console.error('Bias analysis failed', { error });
        return reply.status(500).send({
          error: 'Bias analysis failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Check accessibility
   * POST /api/v1/content/ai/check-accessibility
   */
  fastify.post(
    '/v1/content/ai/check-accessibility',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const body = request.body as { contentId?: string; content?: string };
      const { contentId, content } = body;

      let contentToCheck = content;
      if (contentId && !contentToCheck) {
        const generator = getDraftGenerator();
        const draft = generator.getDraft(contentId);
        if (!draft) {
          return reply.status(404).send({ error: 'Content not found' });
        }
        contentToCheck = draft.content;
      }

      if (!contentToCheck) {
        return reply.status(400).send({ error: 'Content or contentId required' });
      }

      try {
        const scorer = getQualityScorer();
        const accessibilityCheck = await scorer.checkAccessibility(contentToCheck, {
          tenantId: getUserTenantId(user) ?? 'system',
          userId: user.sub,
        });

        return reply.send(accessibilityCheck);
      } catch (error) {
        console.error('Accessibility check failed', { error });
        return reply.status(500).send({
          error: 'Accessibility check failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
