/**
 * Version Routes
 *
 * CRUD and workflow operations for Learning Object Versions.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import type { LearningObjectVersionState, Prisma } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const VersionStateEnum = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'RETIRED',
]);

const CreateVersionSchema = z.object({
  changeSummary: z.string().max(1000).optional(),
  contentJson: z.object({
    type: z.string(),
    body: z.record(z.unknown()),
  }),
  accessibilityJson: z.record(z.unknown()).optional(),
  standardsJson: z.record(z.unknown()).optional(),
  metadataJson: z.record(z.unknown()).optional(),
  skillAlignments: z
    .array(
      z.object({
        skillId: z.string().uuid(),
        weight: z.number().min(0).max(1).optional(),
      })
    )
    .optional(),
});

const UpdateVersionSchema = z.object({
  changeSummary: z.string().max(1000).optional(),
  contentJson: z
    .object({
      type: z.string(),
      body: z.record(z.unknown()),
    })
    .optional(),
  accessibilityJson: z.record(z.unknown()).optional(),
  standardsJson: z.record(z.unknown()).optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

const TransitionSchema = z.object({
  targetState: VersionStateEnum,
  comment: z.string().max(1000).optional(),
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

/**
 * Valid state transitions.
 */
const VALID_TRANSITIONS: Record<
  LearningObjectVersionState,
  LearningObjectVersionState[]
> = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['DRAFT', 'APPROVED'],
  APPROVED: ['DRAFT', 'PUBLISHED'],
  PUBLISHED: ['RETIRED'],
  RETIRED: [], // Terminal state
};

function isValidTransition(
  from: LearningObjectVersionState,
  to: LearningObjectVersionState
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function versionRoutes(fastify: FastifyInstance) {
  /**
   * GET /learning-objects/:loId/versions
   * List all versions of a learning object.
   */
  fastify.get(
    '/learning-objects/:loId/versions',
    async (
      request: FastifyRequest<{ Params: { loId: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { loId } = request.params;

      const versions = await prisma.learningObjectVersion.findMany({
        where: { learningObjectId: loId },
        orderBy: { versionNumber: 'desc' },
        include: {
          skills: true,
          transitions: {
            orderBy: { transitionedAt: 'desc' },
            take: 5,
          },
        },
      });

      return reply.send({ versions });
    }
  );

  /**
   * POST /learning-objects/:loId/versions
   * Create a new version (starts in DRAFT state).
   */
  fastify.post(
    '/learning-objects/:loId/versions',
    async (
      request: FastifyRequest<{ Params: { loId: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { loId } = request.params;

      const parseResult = CreateVersionSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      // Check LO exists
      const lo = await prisma.learningObject.findUnique({
        where: { id: loId },
      });

      if (!lo) {
        return reply.status(404).send({ error: 'Learning object not found' });
      }

      // Check tenant access
      const userTenantId = getUserTenantId(user);
      if (lo.tenantId && lo.tenantId !== userTenantId && user.role !== 'PLATFORM_ADMIN') {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const {
        changeSummary,
        contentJson,
        accessibilityJson,
        standardsJson,
        metadataJson,
        skillAlignments,
      } = parseResult.data;

      // Get next version number
      const maxVersion = await prisma.learningObjectVersion.aggregate({
        where: { learningObjectId: loId },
        _max: { versionNumber: true },
      });

      const versionNumber = (maxVersion._max.versionNumber ?? 0) + 1;

      const version = await prisma.learningObjectVersion.create({
        data: {
          learningObjectId: loId,
          versionNumber,
          state: 'DRAFT',
          createdByUserId: user.sub,
          changeSummary,
          contentJson: contentJson as Prisma.InputJsonValue,
          accessibilityJson: (accessibilityJson ?? {}) as Prisma.InputJsonValue,
          standardsJson: (standardsJson ?? {}) as Prisma.InputJsonValue,
          metadataJson: (metadataJson ?? {}) as Prisma.InputJsonValue,
          skills: skillAlignments
            ? {
                create: skillAlignments.map((s) => ({
                  skillId: s.skillId,
                  weight: s.weight,
                })),
              }
            : undefined,
        },
        include: { skills: true },
      });

      return reply.status(201).send(version);
    }
  );

  /**
   * GET /versions/:id
   * Get a specific version by ID.
   */
  fastify.get(
    '/versions/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const version = await prisma.learningObjectVersion.findUnique({
        where: { id },
        include: {
          skills: true,
          learningObject: true,
          transitions: {
            orderBy: { transitionedAt: 'desc' },
          },
        },
      });

      if (!version) {
        return reply.status(404).send({ error: 'Version not found' });
      }

      return reply.send(version);
    }
  );

  /**
   * PATCH /versions/:id
   * Update a version (only allowed in DRAFT state).
   */
  fastify.patch(
    '/versions/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const parseResult = UpdateVersionSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const existing = await prisma.learningObjectVersion.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Version not found' });
      }

      if (existing.state !== 'DRAFT') {
        return reply.status(400).send({
          error: 'Can only edit versions in DRAFT state',
          currentState: existing.state,
        });
      }

      const { changeSummary, contentJson, accessibilityJson, standardsJson, metadataJson } =
        parseResult.data;

      const updated = await prisma.learningObjectVersion.update({
        where: { id },
        data: {
          changeSummary,
          contentJson: contentJson as Prisma.InputJsonValue | undefined,
          accessibilityJson: accessibilityJson as Prisma.InputJsonValue | undefined,
          standardsJson: standardsJson as Prisma.InputJsonValue | undefined,
          metadataJson: metadataJson as Prisma.InputJsonValue | undefined,
        },
        include: { skills: true },
      });

      return reply.send(updated);
    }
  );

  /**
   * POST /versions/:id/transition
   * Transition a version to a new state.
   */
  fastify.post(
    '/versions/:id/transition',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const parseResult = TransitionSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { targetState, comment } = parseResult.data;

      const existing = await prisma.learningObjectVersion.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Version not found' });
      }

      if (!isValidTransition(existing.state, targetState as LearningObjectVersionState)) {
        return reply.status(400).send({
          error: 'Invalid state transition',
          from: existing.state,
          to: targetState,
          validTransitions: VALID_TRANSITIONS[existing.state],
        });
      }

      // Determine reviewer/approver fields
      const updateData: Prisma.LearningObjectVersionUpdateInput = {
        state: targetState as LearningObjectVersionState,
      };

      if (targetState === 'APPROVED') {
        updateData.reviewedByUserId = user.sub;
        updateData.approvedByUserId = user.sub;
      } else if (targetState === 'DRAFT' && existing.state === 'IN_REVIEW') {
        updateData.reviewedByUserId = user.sub;
      }

      // If publishing, retire any existing published version
      if (targetState === 'PUBLISHED') {
        await prisma.learningObjectVersion.updateMany({
          where: {
            learningObjectId: existing.learningObjectId,
            state: 'PUBLISHED',
            id: { not: id },
          },
          data: { state: 'RETIRED' },
        });
      }

      const [updated] = await prisma.$transaction([
        prisma.learningObjectVersion.update({
          where: { id },
          data: updateData,
          include: { skills: true },
        }),
        prisma.learningObjectVersionTransition.create({
          data: {
            versionId: id,
            fromState: existing.state,
            toState: targetState as LearningObjectVersionState,
            userId: user.sub,
            comment,
          },
        }),
      ]);

      return reply.send(updated);
    }
  );

  /**
   * POST /versions/:id/publish
   * Shortcut to publish an APPROVED version.
   */
  fastify.post(
    '/versions/:id/publish',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const existing = await prisma.learningObjectVersion.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Version not found' });
      }

      if (existing.state !== 'APPROVED') {
        return reply.status(400).send({
          error: 'Can only publish APPROVED versions',
          currentState: existing.state,
        });
      }

      // Retire existing published version
      await prisma.learningObjectVersion.updateMany({
        where: {
          learningObjectId: existing.learningObjectId,
          state: 'PUBLISHED',
          id: { not: id },
        },
        data: { state: 'RETIRED' },
      });

      const [updated] = await prisma.$transaction([
        prisma.learningObjectVersion.update({
          where: { id },
          data: {
            state: 'PUBLISHED',
            publishedAt: new Date(),
          },
          include: { skills: true },
        }),
        prisma.learningObjectVersionTransition.create({
          data: {
            versionId: id,
            fromState: 'APPROVED',
            toState: 'PUBLISHED',
            userId: user.sub,
            comment: 'Published',
          },
        }),
      ]);

      return reply.send(updated);
    }
  );

  /**
   * PUT /versions/:id/skills
   * Replace skill alignments for a version (only in DRAFT state).
   */
  fastify.put(
    '/versions/:id/skills',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const parseResult = z
        .object({
          skills: z.array(
            z.object({
              skillId: z.string().uuid(),
              weight: z.number().min(0).max(1).optional(),
            })
          ),
        })
        .safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const existing = await prisma.learningObjectVersion.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Version not found' });
      }

      if (existing.state !== 'DRAFT') {
        return reply.status(400).send({
          error: 'Can only modify skills for DRAFT versions',
          currentState: existing.state,
        });
      }

      // Replace all skills
      await prisma.$transaction([
        prisma.learningObjectSkill.deleteMany({
          where: { learningObjectVersionId: id },
        }),
        prisma.learningObjectSkill.createMany({
          data: parseResult.data.skills.map((s) => ({
            learningObjectVersionId: id,
            skillId: s.skillId,
            weight: s.weight,
          })),
        }),
      ]);

      const skills = await prisma.learningObjectSkill.findMany({
        where: { learningObjectVersionId: id },
      });

      return reply.send({ skills });
    }
  );

  /**
   * GET /versions/review-queue
   * Get versions awaiting review.
   */
  fastify.get('/versions/review-queue', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userTenantId = getUserTenantId(user);

    const versions = await prisma.learningObjectVersion.findMany({
      where: {
        state: 'IN_REVIEW',
        learningObject: {
          OR: [
            { tenantId: userTenantId },
            { tenantId: null }, // Global content
          ],
        },
      },
      include: {
        learningObject: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return reply.send({ versions });
  });

  /**
   * GET /learning-objects/published
   * Get current published versions (for runtime content selection).
   */
  fastify.get(
    '/learning-objects/published',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const query = z
        .object({
          subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']).optional(),
          gradeBand: z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']).optional(),
          skillId: z.string().uuid().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(50),
        })
        .safeParse(request.query);

      if (!query.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: query.error.flatten(),
        });
      }

      const { subject, gradeBand, skillId, limit } = query.data;
      const userTenantId = getUserTenantId(user);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        state: 'PUBLISHED',
        learningObject: {
          isActive: true,
          OR: [{ tenantId: userTenantId }, { tenantId: null }],
        },
      };

      if (subject) where.learningObject.subject = subject;
      if (gradeBand) where.learningObject.gradeBand = gradeBand;
      if (skillId) {
        where.OR = [
          { learningObject: { primarySkillId: skillId } },
          { skills: { some: { skillId } } },
        ];
      }

      const versions = await prisma.learningObjectVersion.findMany({
        where,
        include: {
          learningObject: { include: { tags: true } },
          skills: true,
        },
        take: limit,
        orderBy: { publishedAt: 'desc' },
      });

      return reply.send({
        items: versions.map((v) => ({
          ...v,
          learningObject: {
            ...v.learningObject,
            tags: v.learningObject.tags.map((t) => t.tag),
          },
        })),
      });
    }
  );
}
