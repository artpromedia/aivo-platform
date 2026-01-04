/**
 * Teacher Community Routes
 *
 * REST API for teacher community features including profiles,
 * following, and content collections.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { getUserFromRequest, requireAuth } from '../auth.js';
import * as communityService from '../services/teacher-community.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const SubjectEnum = z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']);
const GradeBandEnum = z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']);
const SortByEnum = z.enum(['POPULAR', 'ACTIVE', 'RECENT']);

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  bio: z.string().max(1000).optional(),
  school: z.string().max(200).optional(),
  district: z.string().max(200).optional(),
  subjects: z.array(SubjectEnum).optional(),
  gradeBands: z.array(GradeBandEnum).optional(),
  avatarUrl: z.string().url().optional(),
});

const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

const AddToCollectionSchema = z.object({
  contentShareId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

const TeacherIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const CollectionIdParamsSchema = z.object({
  collectionId: z.string().uuid(),
});

const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const DiscoverQuerySchema = z.object({
  subject: SubjectEnum.optional(),
  gradeBand: GradeBandEnum.optional(),
  school: z.string().optional(),
  district: z.string().optional(),
  searchQuery: z.string().optional(),
  sortBy: SortByEnum.default('POPULAR'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function communityRoutes(fastify: FastifyInstance) {
  /**
   * GET /teachers/me/profile
   * Get current user's teacher profile
   */
  fastify.get(
    '/teachers/me/profile',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const profile = await communityService.getTeacherProfile(user.sub);
        return reply.send(profile);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to get profile',
          message: err.message,
        });
      }
    }
  );

  /**
   * PATCH /teachers/me/profile
   * Update current user's teacher profile
   */
  fastify.patch(
    '/teachers/me/profile',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const bodyResult = UpdateProfileSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.flatten(),
        });
      }

      try {
        const profile = await communityService.updateTeacherProfile({
          userId: user.sub,
          ...bodyResult.data,
        });

        return reply.send(profile);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to update profile',
          message: err.message,
        });
      }
    }
  );

  /**
   * GET /teachers/:id/profile
   * Get another teacher's profile
   */
  fastify.get(
    '/teachers/:id/profile',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = TeacherIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const { id } = paramsResult.data;

      try {
        const profile = await communityService.getTeacherProfile(id);

        // Check if current user is following this teacher
        const isFollowing = await communityService.isFollowing(user.sub, id);

        return reply.send({
          ...profile,
          isFollowing,
        });
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to get profile',
          message: err.message,
        });
      }
    }
  );

  /**
   * GET /teachers/:id/content
   * Get a teacher's shared content
   */
  fastify.get(
    '/teachers/:id/content',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = TeacherIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const queryResult = PaginationQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      const { id } = paramsResult.data;
      const { page, pageSize } = queryResult.data;

      try {
        // Only show private content if viewing own profile
        const includePrivate = id === user.sub;

        const content = await communityService.getTeacherContent(id, {
          page,
          pageSize,
          includePrivate,
        });

        return reply.send(content);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to get teacher content',
          message: err.message,
        });
      }
    }
  );

  /**
   * POST /teachers/:id/follow
   * Follow a teacher
   */
  fastify.post(
    '/teachers/:id/follow',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = TeacherIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const { id: followingId } = paramsResult.data;

      try {
        const follow = await communityService.followTeacher(user.sub, followingId);

        return reply.status(201).send({
          followerId: follow.followerId,
          followingId: follow.followingId,
          createdAt: follow.createdAt,
        });
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Failed to follow teacher',
          message: err.message,
        });
      }
    }
  );

  /**
   * DELETE /teachers/:id/follow
   * Unfollow a teacher
   */
  fastify.delete(
    '/teachers/:id/follow',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = TeacherIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const { id: followingId } = paramsResult.data;

      try {
        await communityService.unfollowTeacher(user.sub, followingId);
        return reply.status(204).send();
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Failed to unfollow teacher',
          message: err.message,
        });
      }
    }
  );

  /**
   * GET /teachers/following
   * Get list of teachers current user is following
   */
  fastify.get(
    '/teachers/following',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const queryResult = PaginationQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      const { page, pageSize } = queryResult.data;

      try {
        const following = await communityService.getFollowing(user.sub, page, pageSize);
        return reply.send(following);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to get following list',
          message: err.message,
        });
      }
    }
  );

  /**
   * GET /teachers/:id/followers
   * Get list of a teacher's followers
   */
  fastify.get(
    '/teachers/:id/followers',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = TeacherIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const queryResult = PaginationQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      const { id } = paramsResult.data;
      const { page, pageSize } = queryResult.data;

      try {
        const followers = await communityService.getFollowers(id, page, pageSize);
        return reply.send(followers);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to get followers',
          message: err.message,
        });
      }
    }
  );

  /**
   * GET /teachers/discover
   * Discover teachers by subject/grade/etc
   */
  fastify.get(
    '/teachers/discover',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const queryResult = DiscoverQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      try {
        const teachers = await communityService.discoverTeachers(queryResult.data);
        return reply.send(teachers);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to discover teachers',
          message: err.message,
        });
      }
    }
  );

  /**
   * GET /teachers/recommended-content
   * Get recommended content based on user profile
   */
  fastify.get(
    '/teachers/recommended-content',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const queryResult = PaginationQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      const { page, pageSize } = queryResult.data;

      try {
        const content = await communityService.getRecommendedContent(
          user.sub,
          page,
          pageSize
        );
        return reply.send(content);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to get recommendations',
          message: err.message,
        });
      }
    }
  );

  /**
   * POST /collections
   * Create a content collection
   */
  fastify.post(
    '/collections',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const bodyResult = CreateCollectionSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.flatten(),
        });
      }

      try {
        const collection = await communityService.createCollection({
          userId: user.sub,
          ...bodyResult.data,
        });

        return reply.status(201).send(collection);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Failed to create collection',
          message: err.message,
        });
      }
    }
  );

  /**
   * GET /collections
   * Get user's collections
   */
  fastify.get(
    '/collections',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const collections = await communityService.getUserCollections(user.sub, true);
        return reply.send({ items: collections });
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to get collections',
          message: err.message,
        });
      }
    }
  );

  /**
   * GET /collections/:collectionId/items
   * Get items in a collection
   */
  fastify.get(
    '/collections/:collectionId/items',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = CollectionIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const queryResult = PaginationQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      const { collectionId } = paramsResult.data;
      const { page, pageSize } = queryResult.data;

      try {
        const items = await communityService.getCollectionItems(collectionId, page, pageSize);
        return reply.send(items);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(500).send({
          error: 'Failed to get collection items',
          message: err.message,
        });
      }
    }
  );

  /**
   * POST /collections/:collectionId/items
   * Add content to a collection
   */
  fastify.post(
    '/collections/:collectionId/items',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = CollectionIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const bodyResult = AddToCollectionSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.flatten(),
        });
      }

      const { collectionId } = paramsResult.data;
      const { contentShareId, notes } = bodyResult.data;

      try {
        const item = await communityService.addToCollection({
          collectionId,
          contentShareId,
          userId: user.sub,
          notes,
        });

        return reply.status(201).send(item);
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Failed to add to collection',
          message: err.message,
        });
      }
    }
  );

  /**
   * DELETE /collections/:collectionId/items/:contentShareId
   * Remove content from a collection
   */
  fastify.delete(
    '/collections/:collectionId/items/:contentShareId',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = z
        .object({
          collectionId: z.string().uuid(),
          contentShareId: z.string().uuid(),
        })
        .safeParse(request.params);

      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.flatten(),
        });
      }

      const { collectionId, contentShareId } = paramsResult.data;

      try {
        await communityService.removeFromCollection(collectionId, contentShareId, user.sub);
        return reply.status(204).send();
      } catch (error) {
        const err = error as Error;
        fastify.log.error(err);
        return reply.status(400).send({
          error: 'Failed to remove from collection',
          message: err.message,
        });
      }
    }
  );
}
