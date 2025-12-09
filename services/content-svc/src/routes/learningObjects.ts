/**
 * Learning Object Routes
 *
 * CRUD operations for Learning Objects (logical content identities).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import type {
  LearningObjectSubject,
  LearningObjectGradeBand,
} from '@aivo/ts-types';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const SubjectEnum = z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']);
const GradeBandEnum = z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']);

const CreateLearningObjectSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(1).max(500),
  subject: SubjectEnum,
  gradeBand: GradeBandEnum,
  primarySkillId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

const UpdateLearningObjectSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  primarySkillId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const ListQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  subject: SubjectEnum.optional(),
  gradeBand: GradeBandEnum.optional(),
  skillId: z.string().uuid().optional(),
  tag: z.string().optional(),
  includeGlobal: z.coerce.boolean().default(true),
  isActive: z.coerce.boolean().default(true),
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

export async function learningObjectRoutes(fastify: FastifyInstance) {
  /**
   * GET /learning-objects
   * List learning objects with filtering and pagination.
   */
  fastify.get(
    '/learning-objects',
    async (request: FastifyRequest, reply: FastifyReply) => {
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

      const {
        tenantId,
        subject,
        gradeBand,
        skillId,
        tag,
        includeGlobal,
        isActive,
        page,
        pageSize,
      } = parseResult.data;

      // Build tenant filter
      const userTenantId = getUserTenantId(user);
      const effectiveTenantId = tenantId ?? userTenantId;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        isActive,
      };

      // Tenant scope: user's tenant + optionally global
      if (includeGlobal) {
        where.OR = [
          { tenantId: effectiveTenantId },
          { tenantId: null },
        ];
      } else {
        where.tenantId = effectiveTenantId;
      }

      if (subject) where.subject = subject;
      if (gradeBand) where.gradeBand = gradeBand;
      if (skillId) where.primarySkillId = skillId;
      if (tag) {
        where.tags = { some: { tag } };
      }

      const [items, total] = await Promise.all([
        prisma.learningObject.findMany({
          where,
          include: {
            tags: true,
            versions: {
              where: { state: 'PUBLISHED' },
              take: 1,
              orderBy: { versionNumber: 'desc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.learningObject.count({ where }),
      ]);

      return reply.send({
        items: items.map((lo) => ({
          ...lo,
          currentVersion: lo.versions[0] ?? null,
          tags: lo.tags.map((t) => t.tag),
          versions: undefined,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    }
  );

  /**
   * POST /learning-objects
   * Create a new learning object.
   */
  fastify.post(
    '/learning-objects',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = CreateLearningObjectSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { tenantId, slug, title, subject, gradeBand, primarySkillId, tags } =
        parseResult.data;

      // For non-platform-admins, force tenant_id to user's tenant
      const userTenantId = getUserTenantId(user);
      const effectiveTenantId =
        user.role === 'PLATFORM_ADMIN' ? (tenantId ?? null) : (userTenantId ?? null);

      try {
        const lo = await prisma.learningObject.create({
          data: {
            tenantId: effectiveTenantId,
            slug,
            title,
            subject: subject as LearningObjectSubject,
            gradeBand: gradeBand as LearningObjectGradeBand,
            primarySkillId: primarySkillId ?? null,
            createdByUserId: user.sub,
            tags: tags
              ? {
                  create: tags.map((tag) => ({ tag })),
                }
              : undefined,
          },
          include: { tags: true },
        });

        return reply.status(201).send({
          ...lo,
          tags: lo.tags.map((t) => t.tag),
        });
      } catch (err) {
        // Handle unique constraint violation
        if (
          err instanceof Error &&
          err.message.includes('Unique constraint failed')
        ) {
          return reply.status(409).send({
            error: 'A learning object with this slug already exists',
          });
        }
        throw err;
      }
    }
  );

  /**
   * GET /learning-objects/:id
   * Get a learning object by ID.
   */
  fastify.get(
    '/learning-objects/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const lo = await prisma.learningObject.findUnique({
        where: { id },
        include: {
          tags: true,
          versions: {
            orderBy: { versionNumber: 'desc' },
            include: {
              skills: true,
            },
          },
        },
      });

      if (!lo) {
        return reply.status(404).send({ error: 'Learning object not found' });
      }

      // Check tenant access
      const userTenantId = getUserTenantId(user);
      if (lo.tenantId && lo.tenantId !== userTenantId && user.role !== 'PLATFORM_ADMIN') {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const currentVersion = lo.versions.find((v) => v.state === 'PUBLISHED') ?? null;

      return reply.send({
        ...lo,
        currentVersion,
        tags: lo.tags.map((t) => t.tag),
      });
    }
  );

  /**
   * PATCH /learning-objects/:id
   * Update a learning object's metadata.
   */
  fastify.patch(
    '/learning-objects/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const parseResult = UpdateLearningObjectSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      // Check existence and access
      const existing = await prisma.learningObject.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Learning object not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (
        existing.tenantId &&
        existing.tenantId !== userTenantId &&
        user.role !== 'PLATFORM_ADMIN'
      ) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const updated = await prisma.learningObject.update({
        where: { id },
        data: parseResult.data,
        include: { tags: true },
      });

      return reply.send({
        ...updated,
        tags: updated.tags.map((t) => t.tag),
      });
    }
  );

  /**
   * DELETE /learning-objects/:id
   * Soft-delete a learning object (set isActive = false).
   */
  fastify.delete(
    '/learning-objects/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      // Check existence and access
      const existing = await prisma.learningObject.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Learning object not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (
        existing.tenantId &&
        existing.tenantId !== userTenantId &&
        user.role !== 'PLATFORM_ADMIN'
      ) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      await prisma.learningObject.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.status(204).send();
    }
  );

  /**
   * POST /learning-objects/:id/tags
   * Add tags to a learning object.
   */
  fastify.post(
    '/learning-objects/:id/tags',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const parseResult = z.object({ tags: z.array(z.string().min(1).max(50)) }).safeParse(request.body);
      
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      // Check existence
      const existing = await prisma.learningObject.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Learning object not found' });
      }

      // Add tags (ignore duplicates)
      await prisma.learningObjectTag.createMany({
        data: parseResult.data.tags.map((tag) => ({
          learningObjectId: id,
          tag,
        })),
        skipDuplicates: true,
      });

      const tags = await prisma.learningObjectTag.findMany({
        where: { learningObjectId: id },
      });

      return reply.send({ tags: tags.map((t) => t.tag) });
    }
  );

  /**
   * DELETE /learning-objects/:id/tags/:tag
   * Remove a tag from a learning object.
   */
  fastify.delete(
    '/learning-objects/:id/tags/:tag',
    async (
      request: FastifyRequest<{ Params: { id: string; tag: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id, tag } = request.params;

      await prisma.learningObjectTag.deleteMany({
        where: { learningObjectId: id, tag },
      });

      return reply.status(204).send();
    }
  );
}
