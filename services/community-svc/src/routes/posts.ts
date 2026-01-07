/**
 * Post Routes
 * CRUD operations for community posts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { postService } from '../services/post.service.js';
import { PostCategory, UserRole } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  category: z.nativeEnum(PostCategory).optional(),
});

const UpdatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  category: z.nativeEnum(PostCategory).optional(),
});

const AddCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

const ListQuerySchema = z.object({
  category: z.nativeEnum(PostCategory).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface UserContext {
  tenantId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userSchool?: string;
}

function getUserContext(request: FastifyRequest): UserContext {
  // In production, this would come from JWT or session
  const tenantId = (request.headers['x-tenant-id'] as string) || 'default-tenant';
  const userId = (request.headers['x-user-id'] as string) || 'anonymous';
  const userName = (request.headers['x-user-name'] as string) || 'Anonymous User';
  const userRole = ((request.headers['x-user-role'] as string) || 'TEACHER') as UserRole;
  const userSchool = request.headers['x-user-school'] as string | undefined;

  return { tenantId, userId, userName, userRole, userSchool };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerPostRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /posts
   * List posts with optional category filter
   */
  app.get(
    '/posts',
    async (request: FastifyRequest<{ Querystring: unknown }>, reply: FastifyReply) => {
      const ctx = getUserContext(request);
      const query = ListQuerySchema.parse(request.query);

      const result = await postService.listPosts({
        tenantId: ctx.tenantId,
        category: query.category,
        limit: query.limit,
        offset: query.offset,
      });

      return reply.send({
        data: result.items.map((post) => ({
          id: post.id,
          author: {
            id: post.authorId,
            name: post.authorName,
            role: post.authorRole.toLowerCase(),
            school: post.authorSchool,
          },
          title: post.title,
          content: post.content,
          category: post.category.toLowerCase(),
          likes: post.likesCount,
          comments: post.commentsCount,
          createdAt: formatRelativeTime(post.createdAt),
          isPinned: post.isPinned,
        })),
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      });
    }
  );

  /**
   * GET /posts/:id
   * Get a single post
   */
  app.get(
    '/posts/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;

      const post = await postService.getPostById(id, ctx.tenantId);

      if (!post) {
        return reply.status(404).send({ error: 'Post not found' });
      }

      return reply.send({
        data: {
          id: post.id,
          author: {
            id: post.authorId,
            name: post.authorName,
            role: post.authorRole.toLowerCase(),
            school: post.authorSchool,
          },
          title: post.title,
          content: post.content,
          category: post.category.toLowerCase(),
          likes: post.likesCount,
          comments: post.commentsCount,
          createdAt: formatRelativeTime(post.createdAt),
        },
      });
    }
  );

  /**
   * POST /posts
   * Create a new post
   */
  app.post(
    '/posts',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const ctx = getUserContext(request);
      const body = CreatePostSchema.parse(request.body);

      const post = await postService.createPost({
        tenantId: ctx.tenantId,
        authorId: ctx.userId,
        authorName: ctx.userName,
        authorRole: ctx.userRole,
        authorSchool: ctx.userSchool,
        title: body.title,
        content: body.content,
        category: body.category,
      });

      app.log.info({ postId: post.id }, 'Post created');

      return reply.status(201).send({
        data: {
          id: post.id,
          author: {
            id: post.authorId,
            name: post.authorName,
            role: post.authorRole.toLowerCase(),
            school: post.authorSchool,
          },
          title: post.title,
          content: post.content,
          category: post.category.toLowerCase(),
          likes: 0,
          comments: 0,
          createdAt: 'Just now',
        },
      });
    }
  );

  /**
   * PATCH /posts/:id
   * Update a post
   */
  app.patch(
    '/posts/:id',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;
      const body = UpdatePostSchema.parse(request.body);

      const post = await postService.updatePost(id, ctx.tenantId, ctx.userId, body);

      if (!post) {
        return reply.status(404).send({ error: 'Post not found or unauthorized' });
      }

      return reply.send({ data: post });
    }
  );

  /**
   * DELETE /posts/:id
   * Delete a post
   */
  app.delete(
    '/posts/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;

      const success = await postService.deletePost(id, ctx.tenantId, ctx.userId);

      if (!success) {
        return reply.status(404).send({ error: 'Post not found or unauthorized' });
      }

      return reply.status(204).send();
    }
  );

  /**
   * POST /posts/:id/like
   * Like a post
   */
  app.post(
    '/posts/:id/like',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;

      const result = await postService.likePost(id, ctx.tenantId, ctx.userId);

      if (result.alreadyLiked) {
        return reply.status(400).send({ error: 'Already liked' });
      }

      return reply.send({ data: { success: true } });
    }
  );

  /**
   * DELETE /posts/:id/like
   * Unlike a post
   */
  app.delete(
    '/posts/:id/like',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;

      const result = await postService.unlikePost(id, ctx.userId);

      if (result.notLiked) {
        return reply.status(400).send({ error: 'Not liked' });
      }

      return reply.send({ data: { success: true } });
    }
  );

  /**
   * GET /posts/:id/comments
   * Get comments for a post
   */
  app.get(
    '/posts/:id/comments',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { limit?: string; offset?: string };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;

      const result = await postService.getComments(id, ctx.tenantId, limit, offset);

      return reply.send({
        data: result.items.map((c) => ({
          id: c.id,
          author: {
            id: c.authorId,
            name: c.authorName,
            role: c.authorRole.toLowerCase(),
          },
          content: c.content,
          createdAt: formatRelativeTime(c.createdAt),
        })),
        pagination: { total: result.total, limit, offset },
      });
    }
  );

  /**
   * POST /posts/:id/comments
   * Add a comment to a post
   */
  app.post(
    '/posts/:id/comments',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;
      const body = AddCommentSchema.parse(request.body);

      const comment = await postService.addComment(
        id,
        ctx.tenantId,
        ctx.userId,
        ctx.userName,
        ctx.userRole,
        body.content
      );

      return reply.status(201).send({
        data: {
          id: comment.id,
          author: {
            id: comment.authorId,
            name: comment.authorName,
            role: comment.authorRole.toLowerCase(),
          },
          content: comment.content,
          createdAt: 'Just now',
        },
      });
    }
  );

  /**
   * DELETE /posts/:postId/comments/:commentId
   * Delete a comment
   */
  app.delete(
    '/posts/:postId/comments/:commentId',
    async (
      request: FastifyRequest<{ Params: { postId: string; commentId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { commentId } = request.params;

      const success = await postService.deleteComment(commentId, ctx.tenantId, ctx.userId);

      if (!success) {
        return reply.status(404).send({ error: 'Comment not found or unauthorized' });
      }

      return reply.status(204).send();
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
