/**
 * Social Story Personalization Routes - ND-1.2
 *
 * AI-powered endpoints for personalizing social stories.
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  SocialStoryPersonalizerAgent,
  type SocialStoryPersonalizationInput,
  type LearnerContext,
  type PersonalizationPreferences,
  type CustomStoryScenario,
} from '../agents/social-story-personalizer.js';
import type { AiLoggingService } from '../logging/index.js';
import type { AgentConfigRegistry } from '../registry/AgentConfigRegistry.js';
import type { TelemetryStore } from '../telemetry/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const pronounsSchema = z
  .object({
    subject: z.string(),
    object: z.string(),
    possessive: z.string(),
  })
  .optional();

const sensoryPreferencesSchema = z
  .object({
    lightSensitivity: z.enum(['low', 'medium', 'high']).optional(),
    soundSensitivity: z.enum(['low', 'medium', 'high']).optional(),
    preferredCalmingActivities: z.array(z.string()).optional(),
  })
  .optional();

const learnerContextSchema = z.object({
  learnerId: z.string().uuid(),
  name: z.string().optional(),
  preferredName: z.string().optional(),
  gradeLevel: z.number().int().min(0).max(12).optional(),
  pronouns: pronounsSchema,
  interests: z.array(z.string()).optional(),
  currentEmotionalState: z.string().optional(),
  currentActivityType: z.string().optional(),
  nextActivityType: z.string().optional(),
  recentChallenges: z.array(z.string()).optional(),
  recentSuccesses: z.array(z.string()).optional(),
  preferredCopingStrategies: z.array(z.string()).optional(),
  sensoryPreferences: sensoryPreferencesSchema,
});

const preferencesSchema = z.object({
  readingLevel: z.enum(['SIMPLIFIED', 'STANDARD', 'ADVANCED']).default('STANDARD'),
  vocabularyLevel: z.enum(['BASIC', 'GRADE_LEVEL', 'ADVANCED']).default('GRADE_LEVEL'),
  includeVisualPrompts: z.boolean().default(true),
  sentenceLength: z.enum(['SHORT', 'MEDIUM', 'LONG']).default('MEDIUM'),
  useLearnerName: z.boolean().default(true),
  includeInteractiveElements: z.boolean().default(true),
  emphasizeEmotions: z.boolean().default(true),
  includeBreathingExercises: z.boolean().default(false),
});

const sentenceSchema = z.object({
  id: z.string(),
  text: z.string(),
  sentenceType: z.enum([
    'DESCRIPTIVE',
    'PERSPECTIVE',
    'DIRECTIVE',
    'AFFIRMATIVE',
    'COOPERATIVE',
    'CONTROL',
    'PARTIAL',
  ]),
  emphasisWords: z.array(z.string()).optional(),
  personalizable: z.boolean().optional(),
  placeholders: z.array(z.string()).optional(),
});

const pageSchema = z.object({
  pageNumber: z.number().int().positive(),
  title: z.string().optional(),
  sentences: z.array(sentenceSchema),
  visualPrompt: z.string().optional(),
});

const storySchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  pages: z.array(pageSchema),
  targetSentenceTypes: z.array(z.string()).optional(),
});

const personalizeStorySchema = z.object({
  tenantId: z.string().uuid(),
  story: storySchema,
  learnerContext: learnerContextSchema,
  preferences: preferencesSchema.optional(),
});

const generateStorySchema = z.object({
  tenantId: z.string().uuid(),
  scenario: z.object({
    type: z.string(),
    description: z.string(),
    specificSituation: z.string().optional(),
    desiredOutcome: z.string().optional(),
    keyBehaviors: z.array(z.string()).optional(),
  }),
  learnerContext: learnerContextSchema,
  preferences: preferencesSchema.optional(),
});

const suggestCalmingSchema = z.object({
  tenantId: z.string().uuid(),
  learnerContext: learnerContextSchema,
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface SocialStoryRoutesOptions {
  registry: AgentConfigRegistry;
  telemetryStore?: TelemetryStore;
  loggingService?: AiLoggingService;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

const socialStoryRoutes: FastifyPluginAsync<SocialStoryRoutesOptions> = async (
  fastify: FastifyInstance,
  options: SocialStoryRoutesOptions
) => {
  const { registry, telemetryStore, loggingService } = options;
  const personalizer = new SocialStoryPersonalizerAgent(registry, telemetryStore, loggingService);

  /**
   * POST /ai/social-stories/personalize
   *
   * Personalize a social story for a specific learner using AI.
   */
  fastify.post('/ai/social-stories/personalize', async (request, reply) => {
    try {
      const body = personalizeStorySchema.parse(request.body);

      const input: SocialStoryPersonalizationInput = {
        story: body.story,
        learnerContext: body.learnerContext as LearnerContext,
        preferences: (body.preferences ?? {
          readingLevel: 'STANDARD',
          vocabularyLevel: 'GRADE_LEVEL',
          includeVisualPrompts: true,
          sentenceLength: 'MEDIUM',
          useLearnerName: true,
          includeInteractiveElements: true,
          emphasizeEmotions: true,
          includeBreathingExercises: false,
        }) as PersonalizationPreferences,
      };

      const result = await personalizer.personalizeStory(body.tenantId, input);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      request.log.error({ error }, 'Failed to personalize social story');
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });

  /**
   * POST /ai/social-stories/generate
   *
   * Generate a new custom social story based on a scenario.
   */
  fastify.post('/ai/social-stories/generate', async (request, reply) => {
    try {
      const body = generateStorySchema.parse(request.body);

      const result = await personalizer.generateCustomStory(
        body.tenantId,
        body.scenario as CustomStoryScenario,
        body.learnerContext as LearnerContext,
        (body.preferences ?? {
          readingLevel: 'STANDARD',
          vocabularyLevel: 'GRADE_LEVEL',
          includeVisualPrompts: true,
          sentenceLength: 'MEDIUM',
          useLearnerName: true,
          includeInteractiveElements: true,
          emphasizeEmotions: true,
          includeBreathingExercises: false,
        }) as PersonalizationPreferences
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      request.log.error({ error }, 'Failed to generate social story');
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });

  /**
   * POST /ai/social-stories/calming-strategy
   *
   * Suggest a calming strategy based on learner context.
   */
  fastify.post('/ai/social-stories/calming-strategy', async (request, reply) => {
    try {
      const body = suggestCalmingSchema.parse(request.body);

      const result = await personalizer.suggestCalmingStrategy(
        body.tenantId,
        body.learnerContext as LearnerContext
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      request.log.error({ error }, 'Failed to suggest calming strategy');
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });

  /**
   * POST /ai/social-stories/batch-personalize
   *
   * Personalize multiple stories for a learner (e.g., for pre-caching).
   */
  fastify.post('/ai/social-stories/batch-personalize', async (request, reply) => {
    const batchSchema = z.object({
      tenantId: z.string().uuid(),
      stories: z.array(storySchema).max(10),
      learnerContext: learnerContextSchema,
      preferences: preferencesSchema.optional(),
    });

    try {
      const body = batchSchema.parse(request.body);

      const preferences = (body.preferences ?? {
        readingLevel: 'STANDARD',
        vocabularyLevel: 'GRADE_LEVEL',
        includeVisualPrompts: true,
        sentenceLength: 'MEDIUM',
        useLearnerName: true,
        includeInteractiveElements: true,
        emphasizeEmotions: true,
        includeBreathingExercises: false,
      }) as PersonalizationPreferences;

      // Process stories in parallel with concurrency limit
      const results = await Promise.allSettled(
        body.stories.map((story) =>
          personalizer.personalizeStory(body.tenantId, {
            story,
            learnerContext: body.learnerContext as LearnerContext,
            preferences,
          })
        )
      );

      const successful = results
        .filter(
          (
            r
          ): r is PromiseFulfilledResult<
            Awaited<ReturnType<typeof personalizer.personalizeStory>>
          > => r.status === 'fulfilled'
        )
        .map((r) => r.value);

      const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r, idx) => ({
          storyId: body.stories[idx]?.id,
          error: r.reason instanceof Error ? r.reason.message : 'Unknown error',
        }));

      return reply.status(200).send({
        success: true,
        data: {
          successful,
          failed,
          totalProcessed: body.stories.length,
          successCount: successful.length,
          failureCount: failed.length,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      request.log.error({ error }, 'Failed to batch personalize stories');
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });
};

export { socialStoryRoutes };
export default socialStoryRoutes;
