/**
 * Content Sharing Routes
 *
 * REST API for content sharing and marketplace functionality.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { getUserFromRequest, requireAuth } from '../auth.js';
import { prisma } from '../prisma.js';
import * as sharingService from '../services/content-sharing.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const VisibilityEnum = z.enum(['PRIVATE', 'SCHOOL', 'DISTRICT', 'PUBLIC']);
const SubjectEnum = z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']);
const GradeBandEnum = z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']);
const SortByEnum = z.enum(['POPULARITY', 'RECENT', 'RATING', 'DOWNLOADS']);

const ShareContentSchema = z.object({
  visibility: VisibilityEnum,
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  license: z.string().max(200).optional(),
  requiresAttribution: z.boolean().default(false),
  schoolId: z.string().uuid().optional(),
});

const ForkContentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
});

const RateContentSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

const ReviewContentSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200),
  comment: z.string().min(1).max(2000),
});

const BrowseQuerySchema = z.object({
  subject: SubjectEnum.optional(),
  gradeBand: GradeBandEnum.optional(),
  visibility: VisibilityEnum.optional(),
  tags: z.string().optional(), // Comma-separated
  minRating: z.coerce.number().min(1).max(5).optional(),
  searchQuery: z.string().optional(),
  sortBy: SortByEnum.default('POPULARITY'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const ContentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const ReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function sharingRoutes(fastify: FastifyInstance) {
  /**
   * POST /content/:id/share
   * Share content with specified visibility level
   */
  fastify.post(
    '/content/:id/share',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = ContentIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const bodyResult = ShareContentSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.flatten(),
        });
      }

      const { id: learningObjectId } = paramsResult.data;
      const { visibility, description, tags, license, requiresAttribution, schoolId } =
        bodyResult.data;

      try {
        const contentShare = await sharingService.shareContent({
          learningObjectId,
          userId: user.sub,
          tenantId: user.tenantId ?? null,
          visibility,
          description,
          tags,
          license,
          requiresAttribution,
        });

        // Update schoolId if provided
        if (schoolId && visibility === 'SCHOOL') {
          await prisma.contentShare.update({
            where: { id: contentShare.id },
            data: { schoolId },
          });
        }

        return reply.status(201).send({
          id: contentShare.id,
          learningObjectId: contentShare.learningObjectId,
          visibility: contentShare.visibility,
          description: contentShare.description,
          license: contentShare.license,
          requiresAttribution: contentShare.requiresAttribution,
          createdAt: contentShare.createdAt,
          updatedAt: contentShare.updatedAt,
        });
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Failed to share content',
          message: err.message,
        });
      }
    }
  );

  /**
   * POST /content/:id/fork
   * Fork/remix content to create a copy
   */
  fastify.post(
    '/content/:id/fork',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = ContentIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const bodyResult = ForkContentSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.flatten(),
        });
      }

      const { id: contentShareId } = paramsResult.data;
      const { title } = bodyResult.data;

      try {
        const result = await sharingService.forkContent({
          contentShareId,
          userId: user.sub,
          tenantId: user.tenantId ?? null,
          title: title || '',
        });

        return reply.status(201).send({
          learningObject: {
            id: result.learningObject.id,
            slug: result.learningObject.slug,
            title: result.learningObject.title,
            subject: result.learningObject.subject,
            gradeBand: result.learningObject.gradeBand,
          },
          version: {
            id: result.version.id,
            versionNumber: result.version.versionNumber,
            state: result.version.state,
          },
        });
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Failed to fork content',
          message: err.message,
        });
      }
    }
  );

  /**
   * GET /content/shared
   * Browse shared content with filters
   */
  fastify.get(
    '/content/shared',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const queryResult = BrowseQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      const { tags: tagsString, ...queryParams } = queryResult.data;

      const tags = tagsString ? tagsString.split(',').map((t) => t.trim()) : undefined;

      try {
        const result = await sharingService.browseSharedContent({
          ...queryParams,
          tags,
          tenantId: user.tenantId ?? null,
        });

        return reply.send(result);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to browse content',
          message: err.message,
        });
      }
    }
  );

  /**
   * GET /content/shared/feed
   * Get personalized feed of shared content
   */
  fastify.get(
    '/content/shared/feed',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const queryResult = z
        .object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(20),
        })
        .safeParse(request.query);

      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      const { page, pageSize } = queryResult.data;

      try {
        const result = await sharingService.getPersonalizedFeed(
          user.sub,
          user.tenantId ?? null,
          null, // schoolId - could be added to user context
          page,
          pageSize
        );

        return reply.send(result);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to get feed',
          message: err.message,
        });
      }
    }
  );

  /**
   * POST /content/:id/rate
   * Rate shared content (simple rating)
   */
  fastify.post(
    '/content/:id/rate',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = ContentIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const bodyResult = RateContentSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.flatten(),
        });
      }

      const { id: contentShareId } = paramsResult.data;
      const { rating } = bodyResult.data;

      try {
        const result = await sharingService.rateContent({
          contentShareId,
          userId: user.sub,
          rating,
        });

        return reply.send(result);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Failed to rate content',
          message: err.message,
        });
      }
    }
  );

  /**
   * GET /content/:id/reviews
   * Get reviews for shared content
   */
  fastify.get(
    '/content/:id/reviews',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = ContentIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const queryResult = ReviewsQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      const { id: contentShareId } = paramsResult.data;
      const { page, pageSize } = queryResult.data;

      try {
        const result = await sharingService.getReviews(contentShareId, page, pageSize);

        return reply.send(result);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to get reviews',
          message: err.message,
        });
      }
    }
  );

  /**
   * POST /content/:id/review
   * Write a detailed review for shared content
   */
  fastify.post(
    '/content/:id/review',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = ContentIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const bodyResult = ReviewContentSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.flatten(),
        });
      }

      const { id: contentShareId } = paramsResult.data;
      const { rating, title, comment } = bodyResult.data;

      try {
        const review = await sharingService.reviewContent({
          contentShareId,
          userId: user.sub,
          rating,
          title,
          comment,
        });

        return reply.status(201).send({
          id: review.id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
        });
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Failed to create review',
          message: err.message,
        });
      }
    }
  );

  /**
   * POST /content/:id/view
   * Track content view
   */
  fastify.post(
    '/content/:id/view',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = ContentIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const { id: contentShareId } = paramsResult.data;

      try {
        await sharingService.incrementViewCount(contentShareId);
        return reply.send({ success: true });
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Failed to track view',
          message: err.message,
        });
      }
    }
  );

  /**
   * POST /content/:id/download
   * Track content download
   */
  fastify.post(
    '/content/:id/download',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = ContentIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const { id: contentShareId } = paramsResult.data;

      try {
        await sharingService.incrementDownloadCount(contentShareId);
        return reply.send({ success: true });
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Failed to track download',
          message: err.message,
        });
      }
    }
  );
}
