/**
 * Care Team Routes
 * Epic 15: Caregiver Collaboration
 *
 * Manages care team membership for learners.
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import {
  CreateCareTeamMemberSchema,
  UpdateCareTeamMemberSchema,
  CareTeamQuerySchema,
  LearnerParamsSchema,
  CareTeamMemberParamsSchema,
} from '../schemas/index.js';
import { z } from 'zod';

type CreateCareTeamMemberBody = z.infer<typeof CreateCareTeamMemberSchema>;
type UpdateCareTeamMemberBody = z.infer<typeof UpdateCareTeamMemberSchema>;
type CareTeamQuery = z.infer<typeof CareTeamQuerySchema>;
type LearnerParams = z.infer<typeof LearnerParamsSchema>;
type CareTeamMemberParams = z.infer<typeof CareTeamMemberParamsSchema>;

export async function careTeamRoutes(fastify: FastifyInstance) {
  /**
   * GET /learners/:learnerId/care-team
   * List all care team members for a learner
   */
  fastify.get<{
    Params: LearnerParams;
    Querystring: CareTeamQuery;
  }>('/learners/:learnerId/care-team', async (request, reply) => {
    const params = LearnerParamsSchema.parse(request.params);
    const query = CareTeamQuerySchema.parse(request.query);
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const where = {
      tenantId,
      learnerId: params.learnerId,
      ...(query.role && { role: query.role }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [members, total] = await Promise.all([
      prisma.careTeamMember.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ role: 'asc' }, { displayName: 'asc' }],
      }),
      prisma.careTeamMember.count({ where }),
    ]);

    return reply.send({
      data: members,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  /**
   * GET /learners/:learnerId/care-team/:memberId
   * Get a specific care team member
   */
  fastify.get<{
    Params: CareTeamMemberParams;
  }>('/learners/:learnerId/care-team/:memberId', async (request, reply) => {
    const params = CareTeamMemberParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const member = await prisma.careTeamMember.findFirst({
      where: {
        id: params.memberId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!member) {
      return reply.status(404).send({ error: 'Care team member not found' });
    }

    return reply.send({ data: member });
  });

  /**
   * POST /learners/:learnerId/care-team
   * Add a new care team member
   */
  fastify.post<{
    Params: LearnerParams;
    Body: CreateCareTeamMemberBody;
  }>('/learners/:learnerId/care-team', async (request, reply) => {
    const params = LearnerParamsSchema.parse(request.params);
    const body = CreateCareTeamMemberSchema.parse(request.body);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    // Check if member already exists for this learner
    const existingMember = await prisma.careTeamMember.findFirst({
      where: {
        tenantId,
        learnerId: params.learnerId,
        userId: body.userId,
      },
    });

    if (existingMember) {
      return reply.status(409).send({
        error: 'User is already a member of this care team',
        existingMemberId: existingMember.id,
      });
    }

    const member = await prisma.careTeamMember.create({
      data: {
        tenantId,
        learnerId: params.learnerId,
        userId: body.userId,
        displayName: body.displayName,
        role: body.role,
        title: body.title,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        notes: body.notes,
        addedByUserId: userId,
      },
    });

    // TODO: Publish NATS event for care team member added

    return reply.status(201).send({ data: member });
  });

  /**
   * PATCH /learners/:learnerId/care-team/:memberId
   * Update a care team member
   */
  fastify.patch<{
    Params: CareTeamMemberParams;
    Body: UpdateCareTeamMemberBody;
  }>('/learners/:learnerId/care-team/:memberId', async (request, reply) => {
    const params = CareTeamMemberParamsSchema.parse(request.params);
    const body = UpdateCareTeamMemberSchema.parse(request.body);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    const existingMember = await prisma.careTeamMember.findFirst({
      where: {
        id: params.memberId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!existingMember) {
      return reply.status(404).send({ error: 'Care team member not found' });
    }

    // Determine leftAt value based on activation state change
    let leftAt: Date | null | undefined = undefined;
    if (body.isActive === false && existingMember.isActive) {
      leftAt = new Date();
    } else if (body.isActive === true && !existingMember.isActive) {
      leftAt = null;
    }

    const member = await prisma.careTeamMember.update({
      where: { id: params.memberId },
      data: {
        ...body,
        ...(leftAt !== undefined && { leftAt }),
        updatedByUserId: userId,
      },
    });

    // TODO: Publish NATS event for care team member updated

    return reply.send({ data: member });
  });

  /**
   * DELETE /learners/:learnerId/care-team/:memberId
   * Remove a care team member (soft delete by setting isActive = false)
   */
  fastify.delete<{
    Params: CareTeamMemberParams;
  }>('/learners/:learnerId/care-team/:memberId', async (request, reply) => {
    const params = CareTeamMemberParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    const existingMember = await prisma.careTeamMember.findFirst({
      where: {
        id: params.memberId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!existingMember) {
      return reply.status(404).send({ error: 'Care team member not found' });
    }

    // Soft delete
    const member = await prisma.careTeamMember.update({
      where: { id: params.memberId },
      data: {
        isActive: false,
        leftAt: new Date(),
        updatedByUserId: userId,
      },
    });

    // TODO: Publish NATS event for care team member removed

    return reply.send({ data: member });
  });
}
