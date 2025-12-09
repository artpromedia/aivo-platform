/**
 * Learning Object Routes
 *
 * REST API for creating and managing Learning Objects.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { getUserFromRequest, getUserTenantId, requireRoles } from '../auth.js';
import { prisma } from '../prisma.js';
import { AUTHOR_ROLES, canAccessTenant } from '../rbac.js';
import { generateSlug } from '../utils.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const SubjectEnum = z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']);
const GradeBandEnum = z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']);
const VersionStateEnum = z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED']);

const CreateLearningObjectSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(500),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  subject: SubjectEnum,
  gradeBand: GradeBandEnum,
  primarySkillId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

const ListQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  subject: SubjectEnum.optional(),
  gradeBand: GradeBandEnum.optional(),
  tag: z.string().optional(),
  state: VersionStateEnum.optional(),
  createdByMe: z.coerce.boolean().optional(),
  includeGlobal: z.coerce.boolean().default(true),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const UpdateLearningObjectSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  primarySkillId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const LoIdParamsSchema = z.object({
  loId: z.string().uuid(),
});

const TagsBodySchema = z.object({
  tags: z.array(z.string().min(1).max(50)),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function learningObjectRoutes(fastify: FastifyInstance) {
  /**
   * POST /learning-objects
   * Create a new Learning Object with an initial DRAFT version.
   */
  fastify.post(
    '/learning-objects',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
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

      const { tenantId, title, slug, subject, gradeBand, primarySkillId, tags } = parseResult.data;

      // Determine effective tenant ID
      const userTenantId = getUserTenantId(user);
      let effectiveTenantId: string | null;

      if (user.roles.includes('PLATFORM_ADMIN')) {
        effectiveTenantId = tenantId ?? null;
      } else {
        effectiveTenantId = userTenantId ?? null;
      }

      const finalSlug = slug ?? generateSlug(title, subject, gradeBand);

      try {
        const result = await prisma.$transaction(async (tx) => {
          const lo = await tx.learningObject.create({
            data: {
              tenantId: effectiveTenantId,
              slug: finalSlug,
              title,
              subject,
              gradeBand,
              primarySkillId: primarySkillId ?? null,
              createdByUserId: user.sub,
              isActive: true,
              tags: tags ? { create: tags.map((tag: string) => ({ tag })) } : undefined,
            },
            include: { tags: true },
          });

          const version = await tx.learningObjectVersion.create({
            data: {
              learningObjectId: lo.id,
              versionNumber: 1,
              state: 'DRAFT',
              contentJson: {},
              createdByUserId: user.sub,
            },
          });

          return { lo, version };
        });

        return reply.status(201).send({
          id: result.lo.id,
          tenantId: result.lo.tenantId,
          slug: result.lo.slug,
          title: result.lo.title,
          subject: result.lo.subject,
          gradeBand: result.lo.gradeBand,
          primarySkillId: result.lo.primarySkillId,
          createdByUserId: result.lo.createdByUserId,
          createdAt: result.lo.createdAt,
          tags: result.lo.tags.map((t: { tag: string }) => t.tag),
          currentVersion: {
            id: result.version.id,
            versionNumber: result.version.versionNumber,
            state: result.version.state,
          },
        });
      } catch (error) {
        const err = error as Error & { code?: string };
        if (err.code === 'P2002') {
          return reply.status(409).send({
            error: 'Conflict',
            message: 'A learning object with this slug already exists',
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /learning-objects
   * List Learning Objects with filtering.
   */
  fastify.get(
    '/learning-objects',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
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
        tag,
        state,
        createdByMe,
        includeGlobal,
        page,
        pageSize,
      } = parseResult.data;

      const userTenantId = getUserTenantId(user);
      const isPlatformAdmin = user.roles.includes('PLATFORM_ADMIN');

      // Build where clause using Prisma's native type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { isActive: true };

      if (tenantId) {
        if (!isPlatformAdmin && tenantId !== userTenantId) {
          return reply
            .status(403)
            .send({ error: 'Forbidden', message: 'Cannot access this tenant' });
        }
        if (includeGlobal) {
          where.OR = [{ tenantId }, { tenantId: null }];
        } else {
          where.tenantId = tenantId;
        }
      } else if (!isPlatformAdmin && userTenantId) {
        if (includeGlobal) {
          where.OR = [{ tenantId: userTenantId }, { tenantId: null }];
        } else {
          where.tenantId = userTenantId;
        }
      }

      if (subject) where.subject = subject;
      if (gradeBand) where.gradeBand = gradeBand;
      if (createdByMe) where.createdByUserId = user.sub;
      if (tag) where.tags = { some: { tag } };

      const skip = (page - 1) * pageSize;

      const [items, total] = await Promise.all([
        prisma.learningObject.findMany({
          where,
          include: {
            tags: true,
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1,
              select: { id: true, versionNumber: true, state: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.learningObject.count({ where }),
      ]);

      // Filter by state if specified
      let filteredItems = items;
      if (state) {
        filteredItems = items.filter((lo) => lo.versions[0]?.state === state);
      }

      return reply.send({
        items: filteredItems.map((lo) => ({
          id: lo.id,
          tenantId: lo.tenantId,
          slug: lo.slug,
          title: lo.title,
          subject: lo.subject,
          gradeBand: lo.gradeBand,
          createdByUserId: lo.createdByUserId,
          createdAt: lo.createdAt,
          tags: lo.tags.map((t) => t.tag),
          latestVersion: lo.versions[0] ?? null,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    }
  );

  /**
   * GET /learning-objects/:loId
   * Get a Learning Object by ID with all versions.
   */
  fastify.get(
    '/learning-objects/:loId',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = LoIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId } = paramsResult.data;

      const lo = await prisma.learningObject.findUnique({
        where: { id: loId },
        include: {
          tags: true,
          versions: {
            orderBy: { versionNumber: 'desc' },
            select: {
              id: true,
              versionNumber: true,
              state: true,
              createdByUserId: true,
              createdAt: true,
              publishedAt: true,
            },
          },
        },
      });

      if (!lo) {
        return reply.status(404).send({ error: 'Not found', message: 'Learning object not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, lo.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      return reply.send({
        id: lo.id,
        tenantId: lo.tenantId,
        slug: lo.slug,
        title: lo.title,
        subject: lo.subject,
        gradeBand: lo.gradeBand,
        primarySkillId: lo.primarySkillId,
        createdByUserId: lo.createdByUserId,
        createdAt: lo.createdAt,
        updatedAt: lo.updatedAt,
        isActive: lo.isActive,
        tags: lo.tags.map((t) => t.tag),
        versions: lo.versions,
      });
    }
  );

  /**
   * PATCH /learning-objects/:loId
   * Update a Learning Object's metadata.
   */
  fastify.patch(
    '/learning-objects/:loId',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = LoIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const bodyResult = UpdateLearningObjectSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { loId } = paramsResult.data;
      const updateData = bodyResult.data;

      const existing = await prisma.learningObject.findUnique({
        where: { id: loId },
        select: { tenantId: true },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Not found', message: 'Learning object not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, existing.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      const updated = await prisma.learningObject.update({
        where: { id: loId },
        data: updateData,
        include: { tags: true },
      });

      return reply.send({
        id: updated.id,
        tenantId: updated.tenantId,
        slug: updated.slug,
        title: updated.title,
        subject: updated.subject,
        gradeBand: updated.gradeBand,
        primarySkillId: updated.primarySkillId,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
        tags: updated.tags.map((t) => t.tag),
      });
    }
  );

  /**
   * DELETE /learning-objects/:loId
   * Soft-delete a Learning Object (set isActive = false).
   */
  fastify.delete(
    '/learning-objects/:loId',
    { preHandler: [requireRoles(['DISTRICT_CONTENT_ADMIN', 'PLATFORM_ADMIN'])] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = LoIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const { loId } = paramsResult.data;

      const existing = await prisma.learningObject.findUnique({
        where: { id: loId },
        select: { tenantId: true },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Not found', message: 'Learning object not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, existing.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      await prisma.learningObject.update({
        where: { id: loId },
        data: { isActive: false },
      });

      return reply.status(204).send();
    }
  );

  /**
   * POST /learning-objects/:loId/tags
   * Replace all tags on a Learning Object.
   */
  fastify.post(
    '/learning-objects/:loId/tags',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = LoIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const bodyResult = TagsBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }

      const { loId } = paramsResult.data;
      const { tags } = bodyResult.data;

      const existing = await prisma.learningObject.findUnique({
        where: { id: loId },
        select: { tenantId: true },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Not found', message: 'Learning object not found' });
      }

      const userTenantId = getUserTenantId(user);
      if (!canAccessTenant(userTenantId, existing.tenantId, user.roles)) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Access denied to this tenant' });
      }

      await Promise.all([
        prisma.learningObjectTag.deleteMany({ where: { learningObjectId: loId } }),
        prisma.learningObjectTag.createMany({
          data: tags.map((tag: string) => ({ learningObjectId: loId, tag })),
        }),
      ]);

      const updatedTags = await prisma.learningObjectTag.findMany({
        where: { learningObjectId: loId },
      });

      return reply.send({ tags: updatedTags.map((t) => t.tag) });
    }
  );
}
