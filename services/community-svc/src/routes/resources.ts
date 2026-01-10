/**
 * Resource Routes
 * CRUD operations for shared resources
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { ResourceType } from '../prisma.js';
import { resourceService, type Resource, type ResourceWithCount } from '../services/resource.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const CreateResourceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.nativeEnum(ResourceType),
  subject: z.string().max(100).optional(),
  gradeLevel: z.string().max(50).optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().optional(),
  thumbnailUrl: z.string().url().optional(),
});

const UpdateResourceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  type: z.nativeEnum(ResourceType).optional(),
  subject: z.string().max(100).optional(),
  gradeLevel: z.string().max(50).optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().optional(),
  thumbnailUrl: z.string().url().optional(),
});

const ListQuerySchema = z.object({
  type: z.nativeEnum(ResourceType).optional(),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
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
}

function getUserContext(request: FastifyRequest): UserContext {
  const tenantId = (request.headers['x-tenant-id'] as string) || 'default-tenant';
  const userId = (request.headers['x-user-id'] as string) || 'anonymous';
  const userName = (request.headers['x-user-name'] as string) || 'Anonymous User';

  return { tenantId, userId, userName };
}

/**
 * Format a resource for API response
 */
function formatResource(r: Resource) {
  return {
    id: r.id,
    author: {
      id: r.authorId,
      name: r.authorName,
    },
    title: r.title,
    description: r.description,
    type: String(r.type).toLowerCase().replace('_', '-'),
    subject: r.subject,
    gradeLevel: r.gradeLevel,
    fileUrl: r.fileUrl,
    fileName: r.fileName,
    fileSize: r.fileSize,
    thumbnailUrl: r.thumbnailUrl,
    downloads: r.downloadCount,
    likes: r.likesCount,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * Format a resource with count for API response
 */
function formatResourceWithCount(r: ResourceWithCount) {
  return {
    id: r.id,
    author: {
      id: r.authorId,
      name: r.authorName,
    },
    title: r.title,
    description: r.description,
    type: String(r.type).toLowerCase().replace('_', '-'),
    subject: r.subject,
    gradeLevel: r.gradeLevel,
    fileUrl: r.fileUrl,
    fileName: r.fileName,
    fileSize: r.fileSize,
    thumbnailUrl: r.thumbnailUrl,
    downloads: r.downloadCount,
    likes: r.likesCount,
    createdAt: r.createdAt.toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerResourceRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /resources
   * List resources with optional filters
   */
  app.get(
    '/resources',
    async (request: FastifyRequest<{ Querystring: unknown }>, reply: FastifyReply) => {
      const ctx = getUserContext(request);
      const query = ListQuerySchema.parse(request.query);

      const result = await resourceService.listResources({
        tenantId: ctx.tenantId,
        type: query.type,
        subject: query.subject,
        gradeLevel: query.gradeLevel,
        limit: query.limit,
        offset: query.offset,
      });

      return reply.send({
        data: result.items.map(formatResource),
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      });
    }
  );

  /**
   * GET /resources/:id
   * Get a single resource
   */
  app.get(
    '/resources/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;

      const resource = await resourceService.getResourceById(id, ctx.tenantId);

      if (!resource) {
        return reply.status(404).send({ error: 'Resource not found' });
      }

      return reply.send({
        data: formatResourceWithCount(resource),
      });
    }
  );

  /**
   * POST /resources
   * Create a new resource
   */
  app.post(
    '/resources',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const ctx = getUserContext(request);
      const body = CreateResourceSchema.parse(request.body);

      const resource = await resourceService.createResource({
        tenantId: ctx.tenantId,
        authorId: ctx.userId,
        authorName: ctx.userName,
        title: body.title,
        type: body.type,
        description: body.description,
        subject: body.subject,
        gradeLevel: body.gradeLevel,
        fileUrl: body.fileUrl,
        fileName: body.fileName,
        fileSize: body.fileSize,
        thumbnailUrl: body.thumbnailUrl,
      });

      app.log.info({ resourceId: resource.id }, 'Resource created');

      return reply.status(201).send({
        data: formatResource(resource),
      });
    }
  );

  /**
   * PATCH /resources/:id
   * Update a resource
   */
  app.patch(
    '/resources/:id',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;
      const body = UpdateResourceSchema.parse(request.body);

      const resource = await resourceService.updateResource(
        id,
        ctx.tenantId,
        ctx.userId,
        body
      );

      if (!resource) {
        return reply.status(404).send({ error: 'Resource not found or unauthorized' });
      }

      return reply.send({ data: resource });
    }
  );

  /**
   * DELETE /resources/:id
   * Delete a resource
   */
  app.delete(
    '/resources/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;

      const success = await resourceService.deleteResource(id, ctx.tenantId, ctx.userId);

      if (!success) {
        return reply.status(404).send({ error: 'Resource not found or unauthorized' });
      }

      return reply.status(204).send();
    }
  );

  /**
   * POST /resources/:id/like
   * Like a resource
   */
  app.post(
    '/resources/:id/like',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;

      const result = await resourceService.likeResource(id, ctx.tenantId, ctx.userId);

      if (result.alreadyLiked) {
        return reply.status(400).send({ error: 'Already liked' });
      }

      return reply.send({ data: { success: true } });
    }
  );

  /**
   * DELETE /resources/:id/like
   * Unlike a resource
   */
  app.delete(
    '/resources/:id/like',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getUserContext(request);
      const { id } = request.params;

      const result = await resourceService.unlikeResource(id, ctx.userId);

      if (result.notLiked) {
        return reply.status(400).send({ error: 'Not liked' });
      }

      return reply.send({ data: { success: true } });
    }
  );

  /**
   * POST /resources/:id/download
   * Increment download count
   */
  app.post(
    '/resources/:id/download',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      await resourceService.incrementDownload(id);

      return reply.send({ data: { success: true } });
    }
  );
}
