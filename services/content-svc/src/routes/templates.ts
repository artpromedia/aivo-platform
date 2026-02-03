/**
 * Lesson Template Routes
 *
 * CRUD operations for reusable lesson templates in the Creator Portal.
 */

import { randomUUID } from 'node:crypto';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// Local type for JSON values since JsonValue may not be exported
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const BlockContentSchema = z.record(z.unknown());

const ContentBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  content: BlockContentSchema,
  order: z.number().int().min(0),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100),
  subject: z.string().max(50),
  gradeBand: z.string().max(50),
  blocks: z.array(ContentBlockSchema).default([]),
  settings: z.record(z.unknown()).optional(),
  thumbnail: z.string().url().optional(),
  isPublic: z.boolean().default(false),
  isActive: z.boolean().optional(),
});

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  subject: z.string().max(50).optional(),
  gradeBand: z.string().max(50).optional(),
  blocks: z.array(ContentBlockSchema).optional(),
  settings: z.record(z.unknown()).optional(),
  thumbnail: z.string().url().optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const ListQuerySchema = z.object({
  category: z.string().max(100).optional(),
  search: z.string().max(200).optional(),
  includePublic: z.coerce.boolean().default(true),
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
}

function getUserFromRequest(request: FastifyRequest): JwtUser | null {
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

export async function lessonTemplateRoutes(fastify: FastifyInstance) {
  // ─────────────────────────────────────────────────────────────────────────────
  // LIST TEMPLATES
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
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

    const { category, search, includePublic, page, pageSize } = parseResult.data;
    const userTenantId = getUserTenantId(user);

    const where: any = {};

    // Scope: user's tenant templates + optionally public templates
    if (includePublic) {
      where.OR = [{ tenantId: userTenantId }, { tenantId: null }];
    } else {
      where.tenantId = userTenantId;
    }

    if (category) where.category = category;
    if (search) {
      where.AND = [
        where.OR ? { OR: where.OR } : {},
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
      delete where.OR;
    }

    const [items, total] = await Promise.all([
      prisma.lessonTemplate.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { usageCount: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lessonTemplate.count({ where }),
    ]);

    return reply.send({
      items: items.map((t) => ({
        ...t,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET TEMPLATE BY ID
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get(
    '/templates/:id',
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
          OR: [{ tenantId: userTenantId }, { tenantId: null }],
        },
      });

      if (!template) {
        return reply.status(404).send({ error: 'Template not found' });
      }

      return reply.send(template);
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = CreateTemplateSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten(),
      });
    }

    const {
      name,
      description,
      category,
      subject,
      gradeBand,
      blocks,
      settings,
      thumbnail,
      isPublic,
      isActive,
    } = parseResult.data;
    const userTenantId = getUserTenantId(user);

    // Only platform admins can create public templates
    const effectiveIsPublic = user.role === 'PLATFORM_ADMIN' ? isPublic : false;

    const template = await prisma.lessonTemplate.create({
      data: {
        id: randomUUID(),
        tenantId: effectiveIsPublic ? null : userTenantId!,
        name,
        description: description ?? null,
        category,
        subject,
        gradeBand,
        blocks: blocks as JsonValue,
        settings: (settings ?? {}) as JsonValue,
        thumbnailUrl: thumbnail ?? null,
        isActive: isActive ?? true,
        usageCount: 0,
        createdById: user.sub,
      },
    });

    return reply.status(201).send(template);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.patch(
    '/templates/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userTenantId = getUserTenantId(user);

      const parseResult = UpdateTemplateSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      // Check template exists and user has access
      const existing = await prisma.lessonTemplate.findFirst({
        where: {
          id,
          OR: [
            { tenantId: userTenantId, createdById: user.sub },
            ...(user.role === 'PLATFORM_ADMIN' ? [{ tenantId: null }] : []),
          ],
        },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Template not found or no permission' });
      }

      const { isPublic, thumbnail, blocks, settings, ...rest } = parseResult.data;
      const dataToUpdate = {
        ...rest,
        ...(blocks && { blocks: blocks as JsonValue }),
        ...(settings && { settings: settings as JsonValue }),
        ...(thumbnail && { thumbnailUrl: thumbnail }),
        ...(isPublic !== undefined && user.role === 'PLATFORM_ADMIN'
          ? { tenantId: isPublic ? null : userTenantId ?? null }
          : {}),
        updatedAt: new Date(),
      };

      const template = await prisma.lessonTemplate.update({
        where: { id },
        data: dataToUpdate,
      });

      return reply.send(template);
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.delete(
    '/templates/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const userTenantId = getUserTenantId(user);

      const existing = await prisma.lessonTemplate.findFirst({
        where: {
          id,
          OR: [
            { tenantId: userTenantId, createdById: user.sub },
            ...(user.role === 'PLATFORM_ADMIN' ? [{ tenantId: null }] : []),
          ],
        },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Template not found or no permission' });
      }

      await prisma.lessonTemplate.delete({ where: { id } });

      return reply.status(204).send();
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // GET TEMPLATE CATEGORIES
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.get('/templates/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userTenantId = getUserTenantId(user);

    const categories = await prisma.lessonTemplate.groupBy({
      by: ['category'],
      where: {
        OR: [{ tenantId: userTenantId }, { tenantId: null }],
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return reply.send(
      categories.map((c) => ({
        name: c.category,
        count: c._count.id,
      }))
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RECORD TEMPLATE USAGE
  // ─────────────────────────────────────────────────────────────────────────────
  fastify.post(
    '/templates/:id/use',
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
          OR: [{ tenantId: userTenantId }, { tenantId: null }],
        },
      });

      if (!template) {
        return reply.status(404).send({ error: 'Template not found' });
      }

      // Increment usage counter (templateUsage table is optional - just update count)
      await prisma.lessonTemplate.update({
        where: { id },
        data: { usageCount: { increment: 1 } },
      });

      return reply.send({ success: true });
    }
  );
}
