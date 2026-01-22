/**
 * Lesson Builder Routes
 *
 * CRUD operations for lessons used by the Creator Portal.
 * Includes version management, publishing workflow, and collaboration support.
 */

import { randomUUID } from 'node:crypto';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { Prisma } from '../prisma-types.js';
import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const BlockContentSchema = z.record(z.unknown());

const ContentBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  content: BlockContentSchema,
  order: z.number().int().min(0),
  adaptiveRules: z.array(z.record(z.unknown())).optional(),
});

const CreateLessonSchema = z.object({
  learningObjectId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  blocks: z.array(ContentBlockSchema).default([]),
  settings: z.record(z.unknown()).optional(),
});

const UpdateLessonSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  blocks: z.array(ContentBlockSchema).optional(),
  settings: z.record(z.unknown()).optional(),
});

const PublishLessonSchema = z.object({
  notes: z.string().max(1000).optional(),
});

const ListQuerySchema = z.object({
  learningObjectId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
  name?: string;
}

function getUserFromRequest(request: FastifyRequest): JwtUser | null {
  const user = (request as unknown as Record<string, unknown>).user as JwtUser | undefined;
  if (!user || typeof user.sub !== 'string') return null;
  return user;
}

function getUserTenantId(user: JwtUser): string | undefined {
  return user.tenantId ?? user.tenant_id;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function lessonRoutes(fastify: FastifyInstance): Promise<void> {
  // ─────────────────────────────────────────────────────────────────────────────
  // LIST LESSONS
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get('/lessons', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = ListQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { learningObjectId, status, search, page, pageSize } = parseResult.data;
    const userTenantId = getUserTenantId(user);

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: userTenantId,
    };

    if (learningObjectId) where.learningObjectId = learningObjectId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.lessonDraft.findMany({
        where,
        include: {
          learningObject: { select: { id: true, slug: true, title: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lessonDraft.count({ where }),
    ]);

    return reply.send({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET LESSON BY ID
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/lessons/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userTenantId = getUserTenantId(user);

      const lesson = await prisma.lessonDraft.findFirst({
        where: {
          id,
          tenantId: userTenantId,
        },
        include: {
          learningObject: { select: { id: true, slug: true, title: true } },
        },
      });

      if (!lesson) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      return reply.send(lesson);
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE LESSON
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post('/lessons', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = CreateLessonSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten(),
      });
    }

    const { learningObjectId, templateId, title, description, blocks, settings } = parseResult.data;
    const userTenantId = getUserTenantId(user);

    if (!userTenantId) {
      return reply.status(400).send({ error: 'Tenant ID required' });
    }

    // If templateId provided, copy blocks from template
    let initialBlocks = blocks;
    if (templateId) {
      const template = await prisma.lessonTemplate.findFirst({
        where: { id: templateId },
      });
      if (template) {
        initialBlocks = template.blocks as typeof blocks;
        // Increment usage count
        await prisma.lessonTemplate.update({
          where: { id: templateId },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    const lesson = await prisma.lessonDraft.create({
      data: {
        id: randomUUID(),
        tenantId: userTenantId,
        learningObjectId: learningObjectId ?? null,
        title,
        description: description ?? null,
        blocks: initialBlocks as Prisma.JsonValue,
        settings: (settings ?? {}) as Prisma.JsonValue,
        status: 'DRAFT',
        version: 1,
        createdById: user.sub,
        lastModifiedById: user.sub,
      },
      include: {
        learningObject: { select: { id: true, slug: true, title: true } },
      },
    });

    return reply.status(201).send(lesson);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE LESSON
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.patch(
    '/lessons/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userTenantId = getUserTenantId(user);

      const parseResult = UpdateLessonSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      // Check lesson exists and user has access
      const existing = await prisma.lessonDraft.findFirst({
        where: { id, tenantId: userTenantId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      const { title, description, blocks, settings } = parseResult.data;
      const lesson = await prisma.lessonDraft.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(blocks !== undefined && { blocks: blocks as Prisma.JsonValue }),
          ...(settings !== undefined && { settings: settings as Prisma.JsonValue }),
          lastModifiedById: user.sub,
        },
        include: {
          learningObject: { select: { id: true, slug: true, title: true } },
        },
      });

      return reply.send(lesson);
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE LESSON
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.delete(
    '/lessons/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userTenantId = getUserTenantId(user);

      const existing = await prisma.lessonDraft.findFirst({
        where: { id, tenantId: userTenantId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      await prisma.lessonDraft.delete({ where: { id } });

      return reply.status(204).send();
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // GET VERSION HISTORY
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/lessons/:id/versions',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userTenantId = getUserTenantId(user);

      // Verify access to lesson
      const lesson = await prisma.lessonDraft.findFirst({
        where: { id, tenantId: userTenantId },
      });

      if (!lesson) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      const versions = await prisma.lessonVersion.findMany({
        where: { lessonDraftId: id },
        orderBy: { versionNumber: 'desc' },
      });

      return reply.send(versions);
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // GET SPECIFIC VERSION
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/lessons/:id/versions/:versionId',
    async (
      request: FastifyRequest<{ Params: { id: string; versionId: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id, versionId } = request.params;
      const userTenantId = getUserTenantId(user);

      // Verify access to lesson
      const lesson = await prisma.lessonDraft.findFirst({
        where: { id, tenantId: userTenantId },
      });

      if (!lesson) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      const version = await prisma.lessonVersion.findFirst({
        where: { id: versionId, lessonDraftId: id },
      });

      if (!version) {
        return reply.status(404).send({ error: 'Version not found' });
      }

      return reply.send(version);
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RESTORE VERSION
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/lessons/:id/versions/:versionId/restore',
    async (
      request: FastifyRequest<{ Params: { id: string; versionId: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id, versionId } = request.params;
      const userTenantId = getUserTenantId(user);

      // Verify access to lesson
      const lesson = await prisma.lessonDraft.findFirst({
        where: { id, tenantId: userTenantId },
      });

      if (!lesson) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      const version = await prisma.lessonVersion.findFirst({
        where: { id: versionId, lessonDraftId: id },
      });

      if (!version) {
        return reply.status(404).send({ error: 'Version not found' });
      }

      // Save current state as a new version before restoring
      await prisma.lessonVersion.create({
        data: {
          id: randomUUID(),
          lessonDraftId: id,
          versionNumber: lesson.version,
          title: lesson.title,
          description: lesson.description,
          blocks: lesson.blocks as object,
          settings: lesson.settings as object,
          note: 'Auto-saved before restore',
          createdById: user.sub,
        },
      });

      // Restore the selected version
      const restored = await prisma.lessonDraft.update({
        where: { id },
        data: {
          title: version.title,
          description: version.description,
          blocks: version.blocks as object,
          settings: version.settings as object,
          version: lesson.version + 1,
          lastModifiedById: user.sub,
        },
        include: {
          learningObject: { select: { id: true, slug: true, title: true } },
        },
      });

      return reply.send(restored);
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLISH LESSON
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/lessons/:id/publish',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userTenantId = getUserTenantId(user);

      const parseResult = PublishLessonSchema.safeParse(request.body ?? {});
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { notes } = parseResult.data;

      const lesson = await prisma.lessonDraft.findFirst({
        where: { id, tenantId: userTenantId },
      });

      if (!lesson) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      // Create version snapshot
      await prisma.lessonVersion.create({
        data: {
          id: randomUUID(),
          lessonDraftId: id,
          versionNumber: lesson.version,
          title: lesson.title,
          description: lesson.description,
          blocks: lesson.blocks as object,
          settings: lesson.settings as object,
          note: notes ?? 'Published version',
          isPublished: true,
          createdById: user.sub,
        },
      });

      // Update lesson status
      const updated = await prisma.lessonDraft.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          version: lesson.version + 1,
          lastModifiedById: user.sub,
        },
        include: {
          learningObject: { select: { id: true, slug: true, title: true } },
        },
      });

      return reply.send({
        ...updated,
        message: 'Lesson published successfully',
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // UNPUBLISH LESSON
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/lessons/:id/unpublish',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userTenantId = getUserTenantId(user);

      const lesson = await prisma.lessonDraft.findFirst({
        where: { id, tenantId: userTenantId },
      });

      if (!lesson) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      const updated = await prisma.lessonDraft.update({
        where: { id },
        data: {
          status: 'DRAFT',
          publishedAt: null,
          lastModifiedById: user.sub,
        },
        include: {
          learningObject: { select: { id: true, slug: true, title: true } },
        },
      });

      return reply.send(updated);
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // DUPLICATE LESSON
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/lessons/:id/duplicate',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userTenantId = getUserTenantId(user);

      if (!userTenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const original = await prisma.lessonDraft.findFirst({
        where: { id, tenantId: userTenantId },
      });

      if (!original) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      // Create duplicate with new IDs for blocks
      const duplicatedBlocks = (original.blocks as { id: string }[]).map((block) => ({
        ...block,
        id: randomUUID(),
      }));

      const duplicate = await prisma.lessonDraft.create({
        data: {
          id: randomUUID(),
          tenantId: userTenantId,
          learningObjectId: original.learningObjectId,
          title: `${original.title} (Copy)`,
          description: original.description,
          blocks: duplicatedBlocks,
          settings: original.settings as object,
          status: 'DRAFT',
          version: 1,
          createdById: user.sub,
          lastModifiedById: user.sub,
        },
        include: {
          learningObject: { select: { id: true, slug: true, title: true } },
        },
      });

      return reply.status(201).send(duplicate);
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // ARCHIVE LESSON
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/lessons/:id/archive',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userTenantId = getUserTenantId(user);

      const lesson = await prisma.lessonDraft.findFirst({
        where: { id, tenantId: userTenantId },
      });

      if (!lesson) {
        return reply.status(404).send({ error: 'Lesson not found' });
      }

      const updated = await prisma.lessonDraft.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
          lastModifiedById: user.sub,
        },
        include: {
          learningObject: { select: { id: true, slug: true, title: true } },
        },
      });

      return reply.send(updated);
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST TEMPLATES
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get('/lesson-templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userTenantId = getUserTenantId(user);

    // Get templates - both tenant-specific and global (tenantId = null)
    const templates = await prisma.lessonTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ tenantId: userTenantId }, { tenantId: null }],
      },
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
    });

    return reply.send(templates);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET TEMPLATE BY ID
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/lesson-templates/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userTenantId = getUserTenantId(user);

      const template = await prisma.lessonTemplate.findFirst({
        where: {
          id,
          isActive: true,
          OR: [{ tenantId: userTenantId }, { tenantId: null }],
        },
      });

      if (!template) {
        return reply.status(404).send({ error: 'Template not found' });
      }

      return reply.send(template);
    }
  );
}
