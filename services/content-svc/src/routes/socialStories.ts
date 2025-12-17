/**
 * Social Stories Routes - ND-1.2
 *
 * REST API endpoints for the Social Stories Library.
 * Provides CRUD, personalization, recommendations, and analytics.
 */

import type {
  SocialStoryCategory,
  SocialStoryReadingLevel,
  SocialStoryVisualStyle,
  LearningObjectGradeBand,
} from '@prisma/client';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as socialStoryService from '../social-stories/social-story.service.js';
import { seedBuiltInStories } from '../social-stories/story-templates.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const CategoryEnum = z.enum([
  'STARTING_LESSON',
  'ENDING_LESSON',
  'CHANGING_ACTIVITY',
  'UNEXPECTED_CHANGE',
  'TAKING_QUIZ',
  'TEST_TAKING',
  'RECEIVING_FEEDBACK',
  'ASKING_FOR_HELP',
  'ASKING_FOR_BREAK',
  'RAISING_HAND',
  'TALKING_TO_TEACHER',
  'FEELING_FRUSTRATED',
  'FEELING_OVERWHELMED',
  'FEELING_ANXIOUS',
  'CALMING_DOWN',
  'CELEBRATING_SUCCESS',
  'STAYING_ON_TASK',
  'IGNORING_DISTRACTIONS',
  'WAITING_TURN',
  'USING_DEVICE',
  'TECHNICAL_PROBLEM',
  'WORKING_WITH_PEERS',
  'SHARING_MATERIALS',
  'RESPECTFUL_DISAGREEMENT',
  'SENSORY_BREAK',
  'MOVEMENT_BREAK',
  'QUIET_SPACE',
  'FIRE_DRILL',
  'LOCKDOWN',
  'FEELING_UNSAFE',
  'CUSTOM',
]);

const ReadingLevelEnum = z.enum(['PRE_READER', 'EARLY_READER', 'DEVELOPING', 'INTERMEDIATE']);
const VisualStyleEnum = z.enum([
  'PHOTOGRAPHS',
  'REALISTIC_ART',
  'CARTOON',
  'SIMPLE_ICONS',
  'ABSTRACT',
]);
const GradeBandEnum = z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']);
const TriggerTypeEnum = z.enum(['MANUAL', 'AUTO', 'SCHEDULED', 'RECOMMENDED', 'TRANSITION']);

// Story page schemas
const StorySentenceSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum([
    'DESCRIPTIVE',
    'PERSPECTIVE',
    'DIRECTIVE',
    'AFFIRMATIVE',
    'COOPERATIVE',
    'CONTROL',
    'PARTIAL',
  ]),
  audioUrl: z.string().optional(),
  emphasisWords: z.array(z.string()).optional(),
  personalizationTokens: z.array(z.string()).optional(),
});

const StoryVisualSchema = z.object({
  id: z.string(),
  type: z.enum(['IMAGE', 'ICON', 'VIDEO', 'ANIMATION', 'LOTTIE']),
  url: z.string(),
  altText: z.string(),
  style: VisualStyleEnum,
  position: z.enum(['TOP', 'CENTER', 'BOTTOM', 'LEFT', 'RIGHT', 'BACKGROUND']),
  aspectRatio: z.string().optional(),
  variants: z.record(z.string()).optional(),
});

const StoryInteractionSchema = z.object({
  id: z.string(),
  type: z.enum(['TAP_TO_REVEAL', 'CHOICE', 'DRAG', 'EMOTION_CHECK', 'PRACTICE']),
  config: z.record(z.unknown()),
  required: z.boolean(),
});

const StoryPageSchema = z.object({
  id: z.string(),
  pageNumber: z.number().int().min(1),
  sentences: z.array(StorySentenceSchema),
  visual: StoryVisualSchema.optional(),
  interactions: z.array(StoryInteractionSchema).optional(),
  backgroundColor: z.string().optional(),
  transitionEffect: z.enum(['FADE', 'SLIDE', 'NONE']).optional(),
  audioNarration: z.string().optional(),
  displayDuration: z.number().optional(),
});

// Request schemas
const ListStoriesQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  category: CategoryEnum.optional(),
  readingLevel: ReadingLevelEnum.optional(),
  gradeBand: GradeBandEnum.optional(),
  minAge: z.coerce.number().int().min(0).optional(),
  maxAge: z.coerce.number().int().max(25).optional(),
  isBuiltIn: z.coerce.boolean().optional(),
  isApproved: z.coerce.boolean().optional(),
  includeGlobal: z.coerce.boolean().default(true),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const CreateStorySchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  category: CategoryEnum,
  pages: z.array(StoryPageSchema).min(1),
  readingLevel: ReadingLevelEnum.optional(),
  estimatedDuration: z.number().int().min(1).optional(),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().max(25).optional(),
  gradeBands: z.array(GradeBandEnum).optional(),
  supportsPersonalization: z.boolean().optional(),
  personalizationTokens: z.array(z.string()).optional(),
  defaultVisualStyle: VisualStyleEnum.optional(),
  hasAudio: z.boolean().optional(),
  hasVideo: z.boolean().optional(),
  accessibilityFeatures: z.record(z.unknown()).optional(),
  translations: z.record(z.unknown()).optional(),
});

const UpdateStorySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  pages: z.array(StoryPageSchema).min(1).optional(),
  readingLevel: ReadingLevelEnum.optional(),
  estimatedDuration: z.number().int().min(1).optional(),
  minAge: z.number().int().min(0).nullable().optional(),
  maxAge: z.number().int().max(25).nullable().optional(),
  gradeBands: z.array(GradeBandEnum).optional(),
  supportsPersonalization: z.boolean().optional(),
  defaultVisualStyle: VisualStyleEnum.optional(),
  hasAudio: z.boolean().optional(),
  hasVideo: z.boolean().optional(),
  accessibilityFeatures: z.record(z.unknown()).optional(),
  translations: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

const UpdatePreferencesSchema = z.object({
  preferredVisualStyle: VisualStyleEnum.optional(),
  preferredReadingLevel: ReadingLevelEnum.optional(),
  enableAudio: z.boolean().optional(),
  enableTts: z.boolean().optional(),
  ttsVoice: z.string().optional(),
  ttsSpeed: z.number().min(0.5).max(2.0).optional(),
  autoAdvance: z.boolean().optional(),
  pageDisplayTime: z.number().int().min(3).max(60).optional(),
  characterName: z.string().max(50).optional(),
  favoriteColor: z.string().optional(),
  interests: z.array(z.string()).optional(),
  highContrast: z.boolean().optional(),
  largeText: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
});

const RecordViewSchema = z.object({
  sessionId: z.string().uuid().optional(),
  triggerType: TriggerTypeEnum,
  triggerContext: z.record(z.unknown()).optional(),
  pagesViewed: z.number().int().min(0),
  totalPages: z.number().int().min(1),
  completedAt: z.coerce.date().optional(),
  durationSeconds: z.number().int().min(0).optional(),
  replayCount: z.number().int().min(0).optional(),
  audioPlayed: z.boolean().optional(),
  interactions: z.array(z.record(z.unknown())).optional(),
  preEmotionalState: z.string().optional(),
  postEmotionalState: z.string().optional(),
  helpfulnessRating: z.number().int().min(1).max(5).optional(),
});

const CreateAssignmentSchema = z.object({
  storyId: z.string().uuid(),
  learnerId: z.string().uuid(),
  priority: z.number().int().min(0).max(100).optional(),
  isRequired: z.boolean().optional(),
  showBefore: z.array(z.string()).optional(),
  showAfter: z.array(z.string()).optional(),
  scheduledTimes: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6).optional(),
        timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
        timezone: z.string(),
      })
    )
    .optional(),
  maxDailyViews: z.number().int().min(1).optional(),
  minHoursBetween: z.number().min(0).optional(),
  expiresAt: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

const UpdateAssignmentSchema = z.object({
  priority: z.number().int().min(0).max(100).optional(),
  isRequired: z.boolean().optional(),
  showBefore: z.array(z.string()).optional(),
  showAfter: z.array(z.string()).optional(),
  scheduledTimes: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6).optional(),
        timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
        timezone: z.string(),
      })
    )
    .optional(),
  maxDailyViews: z.number().int().min(1).nullable().optional(),
  minHoursBetween: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  notes: z.string().max(1000).optional(),
});

const RecommendationsQuerySchema = z.object({
  currentActivityType: z.string().optional(),
  nextActivityType: z.string().optional(),
  detectedEmotionalState: z.string().optional(),
  timeOfDay: z.string().optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  excludeStoryIds: z.string().optional(), // comma-separated
  maxResults: z.coerce.number().int().min(1).max(20).default(5),
});

const PersonalizeBodySchema = z.object({
  learnerName: z.string().optional(),
  teacherName: z.string().optional(),
  helperName: z.string().optional(),
  schoolName: z.string().optional(),
  classroomName: z.string().optional(),
  favoriteActivity: z.string().optional(),
  calmPlace: z.string().optional(),
  comfortItem: z.string().optional(),
  characterName: z.string().optional(),
  breakSignal: z.string().optional(),
  helpSignal: z.string().optional(),
  customTokens: z.record(z.string()).optional(),
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

function getUserFromRequest(request: FastifyRequest): JwtUser | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (request as any).user;
  if (!user || typeof user.sub !== 'string') return null;
  return user as JwtUser;
}

function getUserTenantId(user: JwtUser): string | undefined {
  return user.tenantId ?? user.tenant_id;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function socialStoriesRoutes(fastify: FastifyInstance) {
  // ────────────────────────────────────────────────────────────────────────────
  // STORY CRUD
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * GET /social-stories
   * List social stories with filtering and pagination.
   */
  fastify.get('/social-stories', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = ListStoriesQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parseResult.error.flatten(),
      });
    }

    const userTenantId = getUserTenantId(user);
    const result = await socialStoryService.listStories({
      ...parseResult.data,
      tenantId: parseResult.data.tenantId ?? userTenantId,
      category: parseResult.data.category,
      readingLevel: parseResult.data.readingLevel,
      gradeBand: parseResult.data.gradeBand,
    });

    return reply.send(result);
  });

  /**
   * GET /social-stories/:id
   * Get a single social story by ID.
   */
  fastify.get(
    '/social-stories/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const story = await socialStoryService.getStoryById(request.params.id);
      if (!story) {
        return reply.status(404).send({ error: 'Story not found' });
      }

      return reply.send(story);
    }
  );

  /**
   * GET /social-stories/slug/:slug
   * Get a social story by slug.
   */
  fastify.get(
    '/social-stories/slug/:slug',
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const userTenantId = getUserTenantId(user);
      const story = await socialStoryService.getStoryBySlug(request.params.slug, userTenantId);
      if (!story) {
        return reply.status(404).send({ error: 'Story not found' });
      }

      return reply.send(story);
    }
  );

  /**
   * POST /social-stories
   * Create a new social story.
   */
  fastify.post('/social-stories', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = CreateStorySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten(),
      });
    }

    const userTenantId = getUserTenantId(user);
    const effectiveTenantId =
      user.role === 'PLATFORM_ADMIN' ? (parseResult.data.tenantId ?? null) : (userTenantId ?? null);

    const story = await socialStoryService.createStory(
      {
        ...parseResult.data,
        tenantId: effectiveTenantId,
        category: parseResult.data.category as SocialStoryCategory,
        readingLevel: parseResult.data.readingLevel,
        gradeBands: parseResult.data.gradeBands as LearningObjectGradeBand[] | undefined,
        defaultVisualStyle: parseResult.data.defaultVisualStyle,
      },
      user.sub
    );

    return reply.status(201).send(story);
  });

  /**
   * PATCH /social-stories/:id
   * Update an existing social story.
   */
  fastify.patch(
    '/social-stories/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = UpdateStorySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const story = await socialStoryService.updateStory(request.params.id, {
        ...parseResult.data,
        readingLevel: parseResult.data.readingLevel,
        gradeBands: parseResult.data.gradeBands as LearningObjectGradeBand[] | undefined,
        defaultVisualStyle: parseResult.data.defaultVisualStyle,
      });

      if (!story) {
        return reply.status(404).send({ error: 'Story not found' });
      }

      return reply.send(story);
    }
  );

  /**
   * DELETE /social-stories/:id
   * Soft delete a social story.
   */
  fastify.delete(
    '/social-stories/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const deleted = await socialStoryService.deleteStory(request.params.id);
      if (!deleted) {
        return reply.status(404).send({
          error: 'Story not found or is a built-in story',
        });
      }

      return reply.status(204).send();
    }
  );

  /**
   * POST /social-stories/:id/approve
   * Approve a social story for use.
   */
  fastify.post(
    '/social-stories/:id/approve',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Only certain roles can approve stories
      if (!['PLATFORM_ADMIN', 'DISTRICT_ADMIN', 'TEACHER'].includes(user.role)) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      const story = await socialStoryService.approveStory(request.params.id, user.sub);

      if (!story) {
        return reply.status(404).send({ error: 'Story not found' });
      }

      return reply.send(story);
    }
  );

  /**
   * POST /social-stories/:id/personalize
   * Get a personalized version of a story.
   */
  fastify.post(
    '/social-stories/:id/personalize',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const story = await socialStoryService.getStoryById(request.params.id);
      if (!story) {
        return reply.status(404).send({ error: 'Story not found' });
      }

      const parseResult = PersonalizeBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const personalized = socialStoryService.personalizeStory(story, parseResult.data);

      return reply.send(personalized);
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // LEARNER PREFERENCES
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * GET /learners/:learnerId/story-preferences
   * Get learner story preferences.
   */
  fastify.get(
    '/learners/:learnerId/story-preferences',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const preferences = await socialStoryService.getLearnerPreferences(request.params.learnerId);

      return reply.send(preferences ?? { learnerId: request.params.learnerId });
    }
  );

  /**
   * PUT /learners/:learnerId/story-preferences
   * Update learner story preferences.
   */
  fastify.put(
    '/learners/:learnerId/story-preferences',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = UpdatePreferencesSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const preferences = await socialStoryService.updateLearnerPreferences(
        request.params.learnerId,
        {
          ...parseResult.data,
          preferredVisualStyle: parseResult.data.preferredVisualStyle,
          preferredReadingLevel: parseResult.data.preferredReadingLevel,
        }
      );

      return reply.send(preferences);
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // STORY VIEWS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * POST /social-stories/:storyId/views
   * Record a story view.
   */
  fastify.post(
    '/social-stories/:storyId/views',
    async (
      request: FastifyRequest<{
        Params: { storyId: string };
        Body: { learnerId: string };
      }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const body = request.body as { learnerId: string };
      const parseResult = RecordViewSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const view = await socialStoryService.recordStoryView({
        storyId: request.params.storyId,
        learnerId: body.learnerId,
        ...parseResult.data,
      });

      return reply.status(201).send(view);
    }
  );

  /**
   * GET /learners/:learnerId/story-stats
   * Get learner story statistics.
   */
  fastify.get(
    '/learners/:learnerId/story-stats',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const stats = await socialStoryService.getLearnerStoryStats(request.params.learnerId);

      return reply.send(stats);
    }
  );

  /**
   * GET /social-stories/:id/effectiveness
   * Get story effectiveness metrics.
   */
  fastify.get(
    '/social-stories/:id/effectiveness',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const metrics = await socialStoryService.getStoryEffectiveness(request.params.id);

      return reply.send(metrics);
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // ASSIGNMENTS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * POST /social-story-assignments
   * Create a story assignment.
   */
  fastify.post(
    '/social-story-assignments',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = CreateAssignmentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const assignment = await socialStoryService.createAssignment(parseResult.data, user.sub);

      return reply.status(201).send(assignment);
    }
  );

  /**
   * GET /learners/:learnerId/story-assignments
   * Get active story assignments for a learner.
   */
  fastify.get(
    '/learners/:learnerId/story-assignments',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const assignments = await socialStoryService.getLearnerAssignments(request.params.learnerId);

      return reply.send({ items: assignments });
    }
  );

  /**
   * PATCH /social-story-assignments/:id
   * Update a story assignment.
   */
  fastify.patch(
    '/social-story-assignments/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = UpdateAssignmentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const assignment = await socialStoryService.updateAssignment(
        request.params.id,
        parseResult.data
      );

      return reply.send(assignment);
    }
  );

  /**
   * DELETE /social-story-assignments/:id
   * Delete a story assignment.
   */
  fastify.delete(
    '/social-story-assignments/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      await socialStoryService.deleteAssignment(request.params.id);

      return reply.status(204).send();
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // RECOMMENDATIONS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * GET /learners/:learnerId/story-recommendations
   * Get story recommendations for a learner.
   */
  fastify.get(
    '/learners/:learnerId/story-recommendations',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = RecommendationsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: parseResult.error.flatten(),
        });
      }

      const { excludeStoryIds, ...rest } = parseResult.data;

      const recommendations = await socialStoryService.getRecommendations({
        learnerId: request.params.learnerId,
        ...rest,
        excludeStoryIds: excludeStoryIds?.split(',') ?? [],
      });

      return reply.send({ items: recommendations });
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN / SEEDING
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * POST /social-stories/seed-built-in
   * Seed built-in story templates (admin only).
   */
  fastify.post(
    '/social-stories/seed-built-in',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (user.role !== 'PLATFORM_ADMIN') {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      const result = await seedBuiltInStories(socialStoryService.createStory);

      return reply.send({
        message: 'Built-in stories seeded',
        ...result,
      });
    }
  );
}
