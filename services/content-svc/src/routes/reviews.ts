/**
 * Review Routes
 *
 * Formal review submission and tracking for Learning Object Versions.
 */

import type { Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

// Define ReviewDecision locally since it may not be generated yet
type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const ReviewDecisionEnum = z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED']);

const CreateReviewSchema = z.object({
  decision: ReviewDecisionEnum,
  comments: z.string().max(5000).optional(),
  checklist: z
    .object({
      contentAccurate: z.boolean().optional(),
      ageAppropriate: z.boolean().optional(),
      accessibilityComplete: z.boolean().optional(),
      standardsAligned: z.boolean().optional(),
      noSafetyIssues: z.boolean().optional(),
    })
    .optional(),
});

const ReviewListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
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

function canReview(user: JwtUser): boolean {
  const reviewerRoles = ['CONTENT_REVIEWER', 'PLATFORM_ADMIN', 'DISTRICT_ADMIN'];
  return reviewerRoles.includes(user.role);
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function reviewRoutes(fastify: FastifyInstance) {
  /**
   * GET /versions/:versionId/reviews
   * List all reviews for a version.
   */
  fastify.get(
    '/versions/:versionId/reviews',
    async (
      request: FastifyRequest<{ Params: { versionId: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { versionId } = request.params;

      const queryResult = ReviewListQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      const { limit, offset } = queryResult.data;

      // Verify version exists
      const version = await prisma.learningObjectVersion.findUnique({
        where: { id: versionId },
        include: { learningObject: true },
      });

      if (!version) {
        return reply.status(404).send({ error: 'Version not found' });
      }

      // Check tenant access
      const userTenantId = getUserTenantId(user);
      if (
        version.learningObject.tenantId &&
        version.learningObject.tenantId !== userTenantId &&
        user.role !== 'PLATFORM_ADMIN'
      ) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const [reviews, total] = await Promise.all([
        prisma.learningObjectReview.findMany({
          where: { versionId },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.learningObjectReview.count({ where: { versionId } }),
      ]);

      return reply.send({
        reviews,
        pagination: { limit, offset, total },
      });
    }
  );

  /**
   * POST /versions/:versionId/reviews
   * Submit a review for a version.
   */
  fastify.post(
    '/versions/:versionId/reviews',
    async (
      request: FastifyRequest<{ Params: { versionId: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (!canReview(user)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only reviewers can submit reviews',
        });
      }

      const { versionId } = request.params;

      const parseResult = CreateReviewSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { decision, comments, checklist } = parseResult.data;

      // Verify version exists and is in IN_REVIEW state
      const version = await prisma.learningObjectVersion.findUnique({
        where: { id: versionId },
        include: { learningObject: true },
      });

      if (!version) {
        return reply.status(404).send({ error: 'Version not found' });
      }

      if (version.state !== 'IN_REVIEW') {
        return reply.status(400).send({
          error: 'Can only review versions in IN_REVIEW state',
          currentState: version.state,
        });
      }

      // Check tenant access
      const userTenantId = getUserTenantId(user);
      if (
        version.learningObject.tenantId &&
        version.learningObject.tenantId !== userTenantId &&
        user.role !== 'PLATFORM_ADMIN'
      ) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Determine version state update based on decision
      let newState: 'APPROVED' | 'DRAFT' = 'APPROVED';
      if (decision === 'CHANGES_REQUESTED' || decision === 'REJECTED') {
        newState = 'DRAFT'; // Return to draft for revision
      }

      // Create review and update version in transaction
      const [review] = await prisma.$transaction([
        prisma.learningObjectReview.create({
          data: {
            versionId,
            reviewerUserId: user.sub,
            decision: decision as ReviewDecision,
            comments,
            checklist: (checklist ?? {}) as Prisma.InputJsonValue,
          },
        }),
        prisma.learningObjectVersion.update({
          where: { id: versionId },
          data: {
            state: newState,
            reviewedByUserId: user.sub,
            approvedByUserId: decision === 'APPROVED' ? user.sub : undefined,
            reviewNotes: comments,
          },
        }),
        prisma.learningObjectVersionTransition.create({
          data: {
            versionId,
            fromState: 'IN_REVIEW',
            toState: newState,
            transitionedByUserId: user.sub,
            reason: `Review ${decision.toLowerCase()}: ${comments ?? ''}`.trim(),
          },
        }),
      ]);

      return reply.status(201).send({
        review,
        newVersionState: newState,
      });
    }
  );

  /**
   * GET /review-queue
   * Get versions awaiting review with detailed info.
   */
  fastify.get('/review-queue', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const queryResult = z
      .object({
        subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']).optional(),
        gradeBand: z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .safeParse(request.query);

    if (!queryResult.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: queryResult.error.flatten(),
      });
    }

    const { subject, gradeBand, limit, offset } = queryResult.data;
    const userTenantId = getUserTenantId(user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      state: 'IN_REVIEW',
      learningObject: {
        OR: [{ tenantId: userTenantId }, { tenantId: null }],
      },
    };

    if (subject) where.learningObject.subject = subject;
    if (gradeBand) where.learningObject.gradeBand = gradeBand;

    const [versions, total] = await Promise.all([
      prisma.learningObjectVersion.findMany({
        where,
        include: {
          learningObject: {
            include: { tags: true },
          },
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'asc' }, // Oldest first for queue
        skip: offset,
        take: limit,
      }),
      prisma.learningObjectVersion.count({ where }),
    ]);

    return reply.send({
      items: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        changeSummary: v.changeSummary,
        createdByUserId: v.createdByUserId,
        createdAt: v.createdAt,
        learningObject: {
          id: v.learningObject.id,
          title: v.learningObject.title,
          slug: v.learningObject.slug,
          subject: v.learningObject.subject,
          gradeBand: v.learningObject.gradeBand,
          tags: v.learningObject.tags.map((t) => t.tag),
        },
        latestReview: v.reviews[0] ?? null,
      })),
      pagination: { limit, offset, total },
    });
  });

  /**
   * GET /reviews/:id
   * Get a specific review by ID.
   */
  fastify.get(
    '/reviews/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const review = await prisma.learningObjectReview.findUnique({
        where: { id },
        include: {
          version: {
            include: { learningObject: true },
          },
        },
      });

      if (!review) {
        return reply.status(404).send({ error: 'Review not found' });
      }

      return reply.send(review);
    }
  );
}
