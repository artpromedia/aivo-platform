/**
 * Content Routes
 *
 * REST API for content consumers (Lesson Planner, Tutor).
 * Provides localized, accessible content resolution with fallback.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { getUserFromRequest, getUserTenantId } from '../auth.js';
import {
  resolveContent,
  resolveContentList,
  findBestMatch,
  type AccessibilityProfile,
} from '../content-resolver.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const ResolveQuerySchema = z.object({
  skillId: z.string().uuid().optional(),
  subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']).optional(),
  gradeBand: z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']).optional(),
  locale: z.string().min(2).max(10).default('en'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const AccessibilityProfileSchema = z
  .object({
    dyslexiaFriendly: z.boolean().optional(),
    reducedStimuli: z.boolean().optional(),
    screenReader: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    textToSpeech: z.boolean().optional(),
    maxCognitiveLoad: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  })
  .optional();

const ResolveBodySchema = z
  .object({
    accessibilityProfile: AccessibilityProfileSchema,
  })
  .optional();

const ResolveByIdParamsSchema = z.object({
  learningObjectId: z.string().uuid(),
});

const BestMatchQuerySchema = z.object({
  skillId: z.string().uuid(),
  locale: z.string().min(2).max(10).default('en'),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function contentRoutes(fastify: FastifyInstance) {
  /**
   * GET /content/learning-objects/resolve
   *
   * Resolve Learning Objects by query with locale and accessibility profile.
   * Returns best-matching content with fallback information.
   *
   * Query params:
   *   - skillId?: UUID - Filter by skill alignment
   *   - subject?: ELA|MATH|SCIENCE|SEL|SPEECH|OTHER
   *   - gradeBand?: K_2|G3_5|G6_8|G9_12
   *   - locale: string (default: "en") - Requested locale
   *   - page: number (default: 1)
   *   - pageSize: number (default: 20, max: 100)
   *
   * Body (optional):
   *   - accessibilityProfile: { dyslexiaFriendly?, reducedStimuli?, screenReader?, ... }
   *
   * Response:
   *   - items: ResolvedContent[]
   *   - total: number
   *   - page: number
   *   - pageSize: number
   *   - fallbacksUsed: number
   */
  fastify.post(
    '/content/learning-objects/resolve',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      // Note: This endpoint may be called by services without user context
      // In that case, we use the tenantId from a header or skip tenant filtering

      const queryResult = ResolveQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid query parameters', details: queryResult.error.flatten() });
      }

      const bodyResult = ResolveBodySchema.safeParse(request.body ?? {});
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { skillId, subject, gradeBand, locale, page, pageSize } = queryResult.data;
      const accessibilityProfile = bodyResult.data?.accessibilityProfile as
        | AccessibilityProfile
        | undefined;

      // Get tenant ID from user or header
      const tenantId = user
        ? getUserTenantId(user)
        : ((request.headers['x-tenant-id'] as string | undefined) ?? null);

      const result = await resolveContentList(
        {
          skillId,
          subject,
          gradeBand,
          locale,
          accessibilityProfile,
          tenantId,
          publishedOnly: true,
        },
        page,
        pageSize
      );

      return reply.send(result);
    }
  );

  /**
   * GET /content/learning-objects/:learningObjectId/resolve
   *
   * Resolve a specific Learning Object with locale and accessibility profile.
   *
   * Query params:
   *   - locale: string (default: "en")
   *
   * Body (optional):
   *   - accessibilityProfile: { dyslexiaFriendly?, reducedStimuli?, screenReader?, ... }
   *
   * Response:
   *   - ResolvedContent | 404
   */
  fastify.post(
    '/content/learning-objects/:learningObjectId/resolve',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);

      const paramsResult = ResolveByIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const queryResult = z
        .object({ locale: z.string().min(2).max(10).default('en') })
        .safeParse(request.query);
      if (!queryResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid query parameters', details: queryResult.error.flatten() });
      }

      const bodyResult = ResolveBodySchema.safeParse(request.body ?? {});
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { learningObjectId } = paramsResult.data;
      const { locale } = queryResult.data;
      const accessibilityProfile = bodyResult.data?.accessibilityProfile as
        | AccessibilityProfile
        | undefined;

      const tenantId = user
        ? getUserTenantId(user)
        : ((request.headers['x-tenant-id'] as string | undefined) ?? null);

      const result = await resolveContent(learningObjectId, {
        locale,
        accessibilityProfile,
        tenantId,
        publishedOnly: true,
      });

      if (!result) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Learning Object not found or not published',
        });
      }

      return reply.send(result);
    }
  );

  /**
   * POST /content/learning-objects/best-match
   *
   * Find the best matching LO for a skill + accessibility profile.
   * Used by Tutor to get ideal content for a learner.
   *
   * Query params:
   *   - skillId: UUID (required)
   *   - locale: string (default: "en")
   *
   * Body (optional):
   *   - accessibilityProfile: { dyslexiaFriendly?, reducedStimuli?, screenReader?, ... }
   *
   * Response:
   *   - ResolvedContent | 404
   */
  fastify.post(
    '/content/learning-objects/best-match',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);

      const queryResult = BestMatchQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid query parameters', details: queryResult.error.flatten() });
      }

      const bodyResult = ResolveBodySchema.safeParse(request.body ?? {});
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { skillId, locale } = queryResult.data;
      const accessibilityProfile = bodyResult.data?.accessibilityProfile as
        | AccessibilityProfile
        | undefined;

      const tenantId = user
        ? getUserTenantId(user)
        : ((request.headers['x-tenant-id'] as string | undefined) ?? null);

      const result = await findBestMatch(skillId, locale, accessibilityProfile, tenantId);

      if (!result) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'No matching Learning Object found for the given skill',
        });
      }

      return reply.send(result);
    }
  );

  /**
   * GET /content/accessibility-profile/schema
   *
   * Returns the accessibility profile schema for UI configuration.
   */
  fastify.get('/content/accessibility-profile/schema', async (_request, reply) => {
    return reply.send({
      schema: {
        type: 'object',
        properties: {
          dyslexiaFriendly: {
            type: 'boolean',
            description: 'Request content optimized for dyslexia-friendly fonts and formatting',
          },
          reducedStimuli: {
            type: 'boolean',
            description:
              'Request content with reduced visual stimuli (minimal animations, calmer colors)',
          },
          screenReader: {
            type: 'boolean',
            description: 'Request content optimized for screen reader usage',
          },
          highContrast: {
            type: 'boolean',
            description: 'Request content with high contrast mode support',
          },
          textToSpeech: {
            type: 'boolean',
            description: 'Request content with text-to-speech support',
          },
          maxCognitiveLoad: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
            description: 'Maximum cognitive load level appropriate for the learner',
          },
        },
      },
      contentFlags: {
        supportsDyslexiaFriendlyFont: 'Content can be rendered in dyslexia-friendly fonts',
        supportsReducedStimuli: 'Content has a reduced-stimuli variant',
        hasScreenReaderOptimizedStructure: 'Content structure is optimized for screen readers',
        hasHighContrastMode: 'Content supports high contrast rendering',
        supportsTextToSpeech: 'Content is optimized for TTS with proper pauses and emphasis',
        estimatedCognitiveLoad: 'Estimated cognitive load of the content (LOW/MEDIUM/HIGH)',
      },
    });
  });
}
