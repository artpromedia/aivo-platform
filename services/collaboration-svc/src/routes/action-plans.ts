/**
 * Action Plan Routes
 * Epic 15: Caregiver Collaboration
 *
 * Manages shared action plans for learners.
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import {
  CreateActionPlanSchema,
  UpdateActionPlanSchema,
  ActionPlanQuerySchema,
  LearnerParamsSchema,
  ActionPlanParamsSchema,
} from '../schemas/index.js';
import { z } from 'zod';

type CreateActionPlanBody = z.infer<typeof CreateActionPlanSchema>;
type UpdateActionPlanBody = z.infer<typeof UpdateActionPlanSchema>;
type ActionPlanQuery = z.infer<typeof ActionPlanQuerySchema>;
type LearnerParams = z.infer<typeof LearnerParamsSchema>;
type ActionPlanParams = z.infer<typeof ActionPlanParamsSchema>;

export async function actionPlanRoutes(fastify: FastifyInstance) {
  /**
   * GET /learners/:learnerId/action-plans
   * List all action plans for a learner
   */
  fastify.get<{
    Params: LearnerParams;
    Querystring: ActionPlanQuery;
  }>('/learners/:learnerId/action-plans', async (request, reply) => {
    const params = LearnerParamsSchema.parse(request.params);
    const query = ActionPlanQuerySchema.parse(request.query);
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const where = {
      tenantId,
      learnerId: params.learnerId,
      ...(query.status && { status: query.status }),
      ...(query.linkedGoalId && { linkedGoalId: query.linkedGoalId }),
      ...(query.linkedProfileId && { linkedProfileId: query.linkedProfileId }),
    };

    const [plans, total] = await Promise.all([
      prisma.actionPlan.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        include: {
          createdBy: {
            select: {
              id: true,
              displayName: true,
              role: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              notes: true,
              meetings: true,
            },
          },
        },
      }),
      prisma.actionPlan.count({ where }),
    ]);

    return reply.send({
      data: plans,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  /**
   * GET /learners/:learnerId/action-plans/:planId
   * Get a specific action plan with all details
   */
  fastify.get<{
    Params: ActionPlanParams;
  }>('/learners/:learnerId/action-plans/:planId', async (request, reply) => {
    const params = ActionPlanParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const plan = await prisma.actionPlan.findFirst({
      where: {
        id: params.planId,
        tenantId,
        learnerId: params.learnerId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            role: true,
            title: true,
          },
        },
        tasks: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            assignee: {
              select: {
                id: true,
                displayName: true,
                role: true,
              },
            },
            _count: {
              select: { completions: true },
            },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            author: {
              select: {
                id: true,
                displayName: true,
                role: true,
              },
            },
          },
        },
        meetings: {
          orderBy: { scheduledStart: 'desc' },
          take: 5,
        },
      },
    });

    if (!plan) {
      return reply.status(404).send({ error: 'Action plan not found' });
    }

    return reply.send({ data: plan });
  });

  /**
   * POST /learners/:learnerId/action-plans
   * Create a new action plan
   */
  fastify.post<{
    Params: LearnerParams;
    Body: CreateActionPlanBody;
  }>('/learners/:learnerId/action-plans', async (request, reply) => {
    const params = LearnerParamsSchema.parse(request.params);
    const body = CreateActionPlanSchema.parse(request.body);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    // Get the care team member record for the creating user
    const careTeamMember = await prisma.careTeamMember.findFirst({
      where: {
        tenantId,
        learnerId: params.learnerId,
        userId,
        isActive: true,
      },
    });

    if (!careTeamMember) {
      return reply.status(403).send({
        error: 'You must be an active member of the care team to create action plans',
      });
    }

    const plan = await prisma.actionPlan.create({
      data: {
        tenantId,
        learnerId: params.learnerId,
        title: body.title,
        description: body.description,
        status: body.status,
        startDate: body.startDate,
        targetEndDate: body.targetEndDate,
        linkedGoalId: body.linkedGoalId,
        linkedProfileId: body.linkedProfileId,
        focusAreas: body.focusAreas,
        createdById: careTeamMember.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    // TODO: Publish NATS event for action plan created

    return reply.status(201).send({ data: plan });
  });

  /**
   * PATCH /learners/:learnerId/action-plans/:planId
   * Update an action plan
   */
  fastify.patch<{
    Params: ActionPlanParams;
    Body: UpdateActionPlanBody;
  }>('/learners/:learnerId/action-plans/:planId', async (request, reply) => {
    const params = ActionPlanParamsSchema.parse(request.params);
    const body = UpdateActionPlanSchema.parse(request.body);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    const existingPlan = await prisma.actionPlan.findFirst({
      where: {
        id: params.planId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!existingPlan) {
      return reply.status(404).send({ error: 'Action plan not found' });
    }

    // Auto-set actualEndDate when completing/archiving
    const actualEndDate =
      (body.status === 'COMPLETED' || body.status === 'ARCHIVED') &&
      existingPlan.status !== 'COMPLETED' &&
      existingPlan.status !== 'ARCHIVED'
        ? new Date()
        : body.actualEndDate;

    const plan = await prisma.actionPlan.update({
      where: { id: params.planId },
      data: {
        ...body,
        actualEndDate,
        updatedByUserId: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    // TODO: Publish NATS event for action plan updated

    return reply.send({ data: plan });
  });

  /**
   * DELETE /learners/:learnerId/action-plans/:planId
   * Archive an action plan (soft delete)
   */
  fastify.delete<{
    Params: ActionPlanParams;
  }>('/learners/:learnerId/action-plans/:planId', async (request, reply) => {
    const params = ActionPlanParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    const existingPlan = await prisma.actionPlan.findFirst({
      where: {
        id: params.planId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!existingPlan) {
      return reply.status(404).send({ error: 'Action plan not found' });
    }

    // Soft delete by archiving
    const plan = await prisma.actionPlan.update({
      where: { id: params.planId },
      data: {
        status: 'ARCHIVED',
        actualEndDate: new Date(),
        updatedByUserId: userId,
      },
    });

    // TODO: Publish NATS event for action plan archived

    return reply.send({ data: plan });
  });
}
