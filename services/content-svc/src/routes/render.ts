/**
 * Render Routes
 *
 * REST API for retrieving full Learning Object content for learner sessions.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  renderContent,
  renderBatch,
  isAccessibilitySuitable,
  type AccessibilityProfile,
} from '../render.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const RenderParamsSchema = z.object({
  loVersionId: z.string().uuid(),
});

const RenderQuerySchema = z.object({
  locale: z.string().min(2).max(10).default('en'),
  includeHints: z
    .string()
    .optional()
    .transform((s) => s === 'true'),
  includeTutorContext: z
    .string()
    .optional()
    .transform((s) => s === 'true'),
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

const RenderBodySchema = z
  .object({
    accessibilityProfile: AccessibilityProfileSchema,
  })
  .optional();

const BatchRenderBodySchema = z.object({
  versionIds: z.array(z.string().uuid()).min(1).max(50),
  locale: z.string().min(2).max(10).default('en'),
  accessibilityProfile: AccessibilityProfileSchema,
  includeHints: z.boolean().default(false),
  includeTutorContext: z.boolean().default(false),
});

const AccessibilityCheckBodySchema = z.object({
  versionId: z.string().uuid(),
  accessibilityProfile: z.object({
    dyslexiaFriendly: z.boolean().optional(),
    reducedStimuli: z.boolean().optional(),
    screenReader: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    textToSpeech: z.boolean().optional(),
    maxCognitiveLoad: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  }),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function renderRoutes(fastify: FastifyInstance) {
  /**
   * GET /content/learning-objects/:loVersionId/render
   *
   * Render a Learning Object version for a learner session.
   * Resolves locale with fallback and applies accessibility settings.
   *
   * Path params:
   *   - loVersionId: UUID
   *
   * Query params:
   *   - locale: string (default: "en")
   *   - includeHints: boolean
   *   - includeTutorContext: boolean
   *
   * Body (optional, POST only):
   *   - accessibilityProfile: { dyslexiaFriendly?, reducedStimuli?, screenReader?, ... }
   *
   * Response:
   *   - Full rendered content with locale and accessibility applied
   */
  fastify.get(
    '/content/learning-objects/:loVersionId/render',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = RenderParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const queryResult = RenderQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid query parameters', details: queryResult.error.flatten() });
      }

      const { loVersionId } = paramsResult.data;
      const { locale, includeHints, includeTutorContext } = queryResult.data;

      const content = await renderContent(loVersionId, {
        locale,
        includeHints,
        includeTutorContext,
      });

      if (!content) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Learning Object version not found or not published',
        });
      }

      return reply.send(content);
    }
  );

  /**
   * POST /content/learning-objects/:loVersionId/render
   *
   * Render with accessibility profile in body.
   */
  fastify.post(
    '/content/learning-objects/:loVersionId/render',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = RenderParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const queryResult = RenderQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid query parameters', details: queryResult.error.flatten() });
      }

      const bodyResult = RenderBodySchema.safeParse(request.body ?? {});
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { loVersionId } = paramsResult.data;
      const { locale, includeHints, includeTutorContext } = queryResult.data;
      const accessibilityProfile = bodyResult.data?.accessibilityProfile as
        | AccessibilityProfile
        | undefined;

      const content = await renderContent(loVersionId, {
        locale,
        accessibilityProfile,
        includeHints,
        includeTutorContext,
      });

      if (!content) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Learning Object version not found or not published',
        });
      }

      return reply.send(content);
    }
  );

  /**
   * POST /content/learning-objects/render-batch
   *
   * Render multiple Learning Objects for a session.
   * Useful when loading a Today Plan or session with multiple activities.
   *
   * Body:
   *   - versionIds: UUID[] (1-50)
   *   - locale: string
   *   - accessibilityProfile?: { ... }
   *   - includeHints?: boolean
   *   - includeTutorContext?: boolean
   *
   * Response:
   *   - items: { [versionId]: RenderedContent }
   *   - notFound: string[] - IDs that couldn't be rendered
   */
  fastify.post(
    '/content/learning-objects/render-batch',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const bodyResult = BatchRenderBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { versionIds, locale, accessibilityProfile, includeHints, includeTutorContext } =
        bodyResult.data;

      const results = await renderBatch(versionIds, {
        locale,
        accessibilityProfile: accessibilityProfile as AccessibilityProfile | undefined,
        includeHints,
        includeTutorContext,
      });

      const items: Record<string, unknown> = {};
      const notFound: string[] = [];

      for (const id of versionIds) {
        const content = results.get(id);
        if (content) {
          items[id] = content;
        } else {
          notFound.push(id);
        }
      }

      return reply.send({
        items,
        notFound,
        total: versionIds.length,
        found: results.size,
      });
    }
  );

  /**
   * POST /content/accessibility-check
   *
   * Check if content is suitable for a learner's accessibility needs.
   *
   * Body:
   *   - versionId: UUID
   *   - accessibilityProfile: { ... }
   *
   * Response:
   *   - suitable: boolean
   *   - missingFeatures: string[]
   */
  fastify.post(
    '/content/accessibility-check',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const bodyResult = AccessibilityCheckBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { versionId, accessibilityProfile } = bodyResult.data;

      const content = await renderContent(versionId, {});

      if (!content) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Learning Object version not found or not published',
        });
      }

      const result = isAccessibilitySuitable(content, accessibilityProfile as AccessibilityProfile);

      return reply.send({
        versionId,
        title: content.title,
        ...result,
        accessibilityFlags: content.accessibilityFlags,
      });
    }
  );
}
