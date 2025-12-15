/**
 * Care Meeting Routes
 * Epic 15: Caregiver Collaboration
 *
 * Manages meetings and check-ins for care teams.
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import {
  CreateCareMeetingSchema,
  UpdateCareMeetingSchema,
  UpdateMeetingParticipantSchema,
  CareMeetingQuerySchema,
  LearnerParamsSchema,
  CareMeetingParamsSchema,
  MeetingParticipantParamsSchema,
} from '../schemas/index.js';
import { z } from 'zod';

type CreateMeetingBody = z.infer<typeof CreateCareMeetingSchema>;
type UpdateMeetingBody = z.infer<typeof UpdateCareMeetingSchema>;
type UpdateParticipantBody = z.infer<typeof UpdateMeetingParticipantSchema>;
type MeetingQuery = z.infer<typeof CareMeetingQuerySchema>;
type LearnerParams = z.infer<typeof LearnerParamsSchema>;
type MeetingParams = z.infer<typeof CareMeetingParamsSchema>;
type ParticipantParams = z.infer<typeof MeetingParticipantParamsSchema>;

export async function careMeetingRoutes(fastify: FastifyInstance) {
  /**
   * GET /learners/:learnerId/meetings
   * List all meetings for a learner
   */
  fastify.get<{
    Params: LearnerParams;
    Querystring: MeetingQuery;
  }>('/learners/:learnerId/meetings', async (request, reply) => {
    const params = LearnerParamsSchema.parse(request.params);
    const query = CareMeetingQuerySchema.parse(request.query);
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const where = {
      tenantId,
      learnerId: params.learnerId,
      ...(query.meetingType && { meetingType: query.meetingType }),
      ...(query.status && { status: query.status }),
      ...(query.actionPlanId && { actionPlanId: query.actionPlanId }),
      ...(query.startDate && { scheduledStart: { gte: query.startDate } }),
      ...(query.endDate && { scheduledStart: { lte: query.endDate } }),
    };

    const [meetings, total] = await Promise.all([
      prisma.careMeeting.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { scheduledStart: 'desc' },
        include: {
          actionPlan: {
            select: {
              id: true,
              title: true,
            },
          },
          participants: {
            include: {
              careTeamMember: {
                select: {
                  id: true,
                  displayName: true,
                  role: true,
                },
              },
            },
          },
          _count: {
            select: { notes: true },
          },
        },
      }),
      prisma.careMeeting.count({ where }),
    ]);

    return reply.send({
      data: meetings,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  /**
   * GET /learners/:learnerId/meetings/:meetingId
   * Get a specific meeting with full details
   */
  fastify.get<{
    Params: MeetingParams;
  }>('/learners/:learnerId/meetings/:meetingId', async (request, reply) => {
    const params = CareMeetingParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const meeting = await prisma.careMeeting.findFirst({
      where: {
        id: params.meetingId,
        tenantId,
        learnerId: params.learnerId,
      },
      include: {
        actionPlan: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        participants: {
          include: {
            careTeamMember: {
              select: {
                id: true,
                displayName: true,
                role: true,
                title: true,
                contactEmail: true,
              },
            },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
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
      },
    });

    if (!meeting) {
      return reply.status(404).send({ error: 'Meeting not found' });
    }

    return reply.send({ data: meeting });
  });

  /**
   * POST /learners/:learnerId/meetings
   * Create a new meeting
   */
  fastify.post<{
    Params: LearnerParams;
    Body: CreateMeetingBody;
  }>('/learners/:learnerId/meetings', async (request, reply) => {
    const params = LearnerParamsSchema.parse(request.params);
    const body = CreateCareMeetingSchema.parse(request.body);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    // Validate end time is after start time
    if (body.scheduledEnd <= body.scheduledStart) {
      return reply.status(400).send({ error: 'End time must be after start time' });
    }

    // Verify all participants are on the care team
    const careTeamMembers = await prisma.careTeamMember.findMany({
      where: {
        id: { in: body.participantIds },
        tenantId,
        learnerId: params.learnerId,
        isActive: true,
      },
    });

    if (careTeamMembers.length !== body.participantIds.length) {
      return reply.status(400).send({
        error: 'All participants must be active care team members',
      });
    }

    // Validate action plan if provided
    if (body.actionPlanId) {
      const plan = await prisma.actionPlan.findFirst({
        where: {
          id: body.actionPlanId,
          tenantId,
          learnerId: params.learnerId,
        },
      });
      if (!plan) {
        return reply.status(400).send({ error: 'Action plan not found' });
      }
    }

    // Create meeting with participants
    const meeting = await prisma.careMeeting.create({
      data: {
        tenantId,
        learnerId: params.learnerId,
        title: body.title,
        description: body.description,
        meetingType: body.meetingType,
        scheduledStart: body.scheduledStart,
        scheduledEnd: body.scheduledEnd,
        location: body.location,
        videoLink: body.videoLink,
        actionPlanId: body.actionPlanId,
        agendaItems: body.agendaItems,
        organizedByUserId: userId,
        participants: {
          create: body.participantIds.map((careTeamMemberId) => ({
            careTeamMemberId,
            rsvpStatus: 'PENDING',
          })),
        },
      },
      include: {
        participants: {
          include: {
            careTeamMember: {
              select: {
                id: true,
                displayName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // TODO: Publish NATS event for meeting created
    // TODO: Send calendar invites to participants

    return reply.status(201).send({ data: meeting });
  });

  /**
   * PATCH /learners/:learnerId/meetings/:meetingId
   * Update a meeting
   */
  fastify.patch<{
    Params: MeetingParams;
    Body: UpdateMeetingBody;
  }>('/learners/:learnerId/meetings/:meetingId', async (request, reply) => {
    const params = CareMeetingParamsSchema.parse(request.params);
    const body = UpdateCareMeetingSchema.parse(request.body);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    const existingMeeting = await prisma.careMeeting.findFirst({
      where: {
        id: params.meetingId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!existingMeeting) {
      return reply.status(404).send({ error: 'Meeting not found' });
    }

    // Validate time if being updated
    const scheduledStart = body.scheduledStart ?? existingMeeting.scheduledStart;
    const scheduledEnd = body.scheduledEnd ?? existingMeeting.scheduledEnd;
    if (scheduledEnd <= scheduledStart) {
      return reply.status(400).send({ error: 'End time must be after start time' });
    }

    const meeting = await prisma.careMeeting.update({
      where: { id: params.meetingId },
      data: {
        ...body,
        updatedByUserId: userId,
      },
      include: {
        participants: {
          include: {
            careTeamMember: {
              select: {
                id: true,
                displayName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // TODO: Publish NATS event for meeting updated
    // TODO: If rescheduled, send updated calendar invites

    return reply.send({ data: meeting });
  });

  /**
   * POST /learners/:learnerId/meetings/:meetingId/start
   * Start a meeting
   */
  fastify.post<{
    Params: MeetingParams;
  }>('/learners/:learnerId/meetings/:meetingId/start', async (request, reply) => {
    const params = CareMeetingParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    const existingMeeting = await prisma.careMeeting.findFirst({
      where: {
        id: params.meetingId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!existingMeeting) {
      return reply.status(404).send({ error: 'Meeting not found' });
    }

    if (existingMeeting.status !== 'SCHEDULED') {
      return reply.status(400).send({ error: 'Meeting cannot be started in its current state' });
    }

    const meeting = await prisma.careMeeting.update({
      where: { id: params.meetingId },
      data: {
        status: 'IN_PROGRESS',
        actualStart: new Date(),
        updatedByUserId: userId,
      },
    });

    // TODO: Publish NATS event for meeting started

    return reply.send({ data: meeting });
  });

  /**
   * POST /learners/:learnerId/meetings/:meetingId/end
   * End a meeting
   */
  fastify.post<{
    Params: MeetingParams;
  }>('/learners/:learnerId/meetings/:meetingId/end', async (request, reply) => {
    const params = CareMeetingParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    const existingMeeting = await prisma.careMeeting.findFirst({
      where: {
        id: params.meetingId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!existingMeeting) {
      return reply.status(404).send({ error: 'Meeting not found' });
    }

    if (existingMeeting.status !== 'IN_PROGRESS') {
      return reply.status(400).send({ error: 'Meeting is not in progress' });
    }

    const meeting = await prisma.careMeeting.update({
      where: { id: params.meetingId },
      data: {
        status: 'COMPLETED',
        actualEnd: new Date(),
        updatedByUserId: userId,
      },
    });

    // TODO: Publish NATS event for meeting ended

    return reply.send({ data: meeting });
  });

  /**
   * DELETE /learners/:learnerId/meetings/:meetingId
   * Cancel a meeting
   */
  fastify.delete<{
    Params: MeetingParams;
  }>('/learners/:learnerId/meetings/:meetingId', async (request, reply) => {
    const params = CareMeetingParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    const existingMeeting = await prisma.careMeeting.findFirst({
      where: {
        id: params.meetingId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!existingMeeting) {
      return reply.status(404).send({ error: 'Meeting not found' });
    }

    if (existingMeeting.status === 'COMPLETED') {
      return reply.status(400).send({ error: 'Cannot cancel a completed meeting' });
    }

    const meeting = await prisma.careMeeting.update({
      where: { id: params.meetingId },
      data: {
        status: 'CANCELLED',
        updatedByUserId: userId,
      },
    });

    // TODO: Publish NATS event for meeting cancelled
    // TODO: Send cancellation notices to participants

    return reply.send({ data: meeting });
  });

  // =========================================================================
  // PARTICIPANT ROUTES
  // =========================================================================

  /**
   * POST /learners/:learnerId/meetings/:meetingId/participants
   * Add a participant to a meeting
   */
  fastify.post<{
    Params: MeetingParams;
    Body: { careTeamMemberId: string };
  }>('/learners/:learnerId/meetings/:meetingId/participants', async (request, reply) => {
    const params = CareMeetingParamsSchema.parse(request.params);
    const { careTeamMemberId } = request.body;
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    if (!careTeamMemberId) {
      return reply.status(400).send({ error: 'careTeamMemberId is required' });
    }

    // Verify meeting exists
    const meeting = await prisma.careMeeting.findFirst({
      where: {
        id: params.meetingId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!meeting) {
      return reply.status(404).send({ error: 'Meeting not found' });
    }

    // Verify care team member exists
    const careTeamMember = await prisma.careTeamMember.findFirst({
      where: {
        id: careTeamMemberId,
        tenantId,
        learnerId: params.learnerId,
        isActive: true,
      },
    });

    if (!careTeamMember) {
      return reply.status(400).send({ error: 'Care team member not found' });
    }

    // Check if already a participant
    const existingParticipant = await prisma.meetingParticipant.findFirst({
      where: {
        meetingId: params.meetingId,
        careTeamMemberId,
      },
    });

    if (existingParticipant) {
      return reply.status(409).send({ error: 'User is already a participant' });
    }

    const participant = await prisma.meetingParticipant.create({
      data: {
        meetingId: params.meetingId,
        careTeamMemberId,
        rsvpStatus: 'PENDING',
      },
      include: {
        careTeamMember: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    // TODO: Send calendar invite to new participant

    return reply.status(201).send({ data: participant });
  });

  /**
   * PATCH /learners/:learnerId/meetings/:meetingId/participants/:participantId
   * Update participant status (RSVP, attendance, notes)
   */
  fastify.patch<{
    Params: ParticipantParams;
    Body: UpdateParticipantBody;
  }>(
    '/learners/:learnerId/meetings/:meetingId/participants/:participantId',
    async (request, reply) => {
      const params = MeetingParticipantParamsSchema.parse(request.params);
      const body = UpdateMeetingParticipantSchema.parse(request.body);
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      // Verify meeting exists
      const meeting = await prisma.careMeeting.findFirst({
        where: {
          id: params.meetingId,
          tenantId,
          learnerId: params.learnerId,
        },
      });

      if (!meeting) {
        return reply.status(404).send({ error: 'Meeting not found' });
      }

      const existingParticipant = await prisma.meetingParticipant.findFirst({
        where: {
          id: params.participantId,
          meetingId: params.meetingId,
        },
      });

      if (!existingParticipant) {
        return reply.status(404).send({ error: 'Participant not found' });
      }

      const participant = await prisma.meetingParticipant.update({
        where: { id: params.participantId },
        data: body,
        include: {
          careTeamMember: {
            select: {
              id: true,
              displayName: true,
              role: true,
            },
          },
        },
      });

      return reply.send({ data: participant });
    }
  );

  /**
   * DELETE /learners/:learnerId/meetings/:meetingId/participants/:participantId
   * Remove a participant from a meeting
   */
  fastify.delete<{
    Params: ParticipantParams;
  }>(
    '/learners/:learnerId/meetings/:meetingId/participants/:participantId',
    async (request, reply) => {
      const params = MeetingParticipantParamsSchema.parse(request.params);
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      // Verify meeting exists
      const meeting = await prisma.careMeeting.findFirst({
        where: {
          id: params.meetingId,
          tenantId,
          learnerId: params.learnerId,
        },
      });

      if (!meeting) {
        return reply.status(404).send({ error: 'Meeting not found' });
      }

      const existingParticipant = await prisma.meetingParticipant.findFirst({
        where: {
          id: params.participantId,
          meetingId: params.meetingId,
        },
      });

      if (!existingParticipant) {
        return reply.status(404).send({ error: 'Participant not found' });
      }

      await prisma.meetingParticipant.delete({
        where: { id: params.participantId },
      });

      return reply.status(204).send();
    }
  );
}
