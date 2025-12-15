/**
 * Care Notes Routes
 * Epic 15: Caregiver Collaboration
 *
 * Manages notes and observations shared by care team members.
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import {
  CreateCareNoteSchema,
  UpdateCareNoteSchema,
  AcknowledgeCareNoteSchema,
  CareNoteQuerySchema,
  LearnerParamsSchema,
  CareNoteParamsSchema,
} from '../schemas/index.js';
import { z } from 'zod';

type CreateCareNoteBody = z.infer<typeof CreateCareNoteSchema>;
type UpdateCareNoteBody = z.infer<typeof UpdateCareNoteSchema>;
type AcknowledgeBody = z.infer<typeof AcknowledgeCareNoteSchema>;
type CareNoteQuery = z.infer<typeof CareNoteQuerySchema>;
type LearnerParams = z.infer<typeof LearnerParamsSchema>;
type CareNoteParams = z.infer<typeof CareNoteParamsSchema>;

export async function careNoteRoutes(fastify: FastifyInstance) {
  /**
   * GET /learners/:learnerId/notes
   * List all care notes for a learner
   */
  fastify.get<{
    Params: LearnerParams;
    Querystring: CareNoteQuery;
  }>('/learners/:learnerId/notes', async (request, reply) => {
    const params = LearnerParamsSchema.parse(request.params);
    const query = CareNoteQuerySchema.parse(request.query);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    // Get the user's care team membership to filter by visibility
    const careTeamMember = await prisma.careTeamMember.findFirst({
      where: {
        tenantId,
        learnerId: params.learnerId,
        userId,
        isActive: true,
      },
    });

    // Build visibility filter based on role
    const visibilityFilter = careTeamMember
      ? getVisibilityFilter(careTeamMember.role)
      : { visibility: 'TEAM' }; // Non-members only see team-visible notes

    const where = {
      tenantId,
      learnerId: params.learnerId,
      ...visibilityFilter,
      ...(query.noteType && { noteType: query.noteType }),
      ...(query.authorId && { authorId: query.authorId }),
      ...(query.actionPlanId && { actionPlanId: query.actionPlanId }),
      ...(query.meetingId && { meetingId: query.meetingId }),
      ...(query.requiresFollowUp !== undefined && { requiresFollowUp: query.requiresFollowUp }),
      ...(query.startDate && { createdAt: { gte: query.startDate } }),
      ...(query.endDate && { createdAt: { lte: query.endDate } }),
    };

    const [notes, total] = await Promise.all([
      prisma.careNote.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              role: true,
              title: true,
            },
          },
          actionPlan: {
            select: {
              id: true,
              title: true,
            },
          },
          meeting: {
            select: {
              id: true,
              title: true,
              scheduledStart: true,
            },
          },
        },
      }),
      prisma.careNote.count({ where }),
    ]);

    return reply.send({
      data: notes,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  /**
   * GET /learners/:learnerId/notes/:noteId
   * Get a specific care note
   */
  fastify.get<{
    Params: CareNoteParams;
  }>('/learners/:learnerId/notes/:noteId', async (request, reply) => {
    const params = CareNoteParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const note = await prisma.careNote.findFirst({
      where: {
        id: params.noteId,
        tenantId,
        learnerId: params.learnerId,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            role: true,
            title: true,
            userId: true,
          },
        },
        actionPlan: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        meeting: {
          select: {
            id: true,
            title: true,
            scheduledStart: true,
            status: true,
          },
        },
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Care note not found' });
    }

    // Check visibility
    const careTeamMember = await prisma.careTeamMember.findFirst({
      where: {
        tenantId,
        learnerId: params.learnerId,
        userId,
        isActive: true,
      },
    });

    if (!canViewNote(note, careTeamMember, userId)) {
      return reply.status(403).send({ error: 'You do not have permission to view this note' });
    }

    return reply.send({ data: note });
  });

  /**
   * POST /learners/:learnerId/notes
   * Create a new care note
   */
  fastify.post<{
    Params: LearnerParams;
    Body: CreateCareNoteBody;
  }>('/learners/:learnerId/notes', async (request, reply) => {
    const params = LearnerParamsSchema.parse(request.params);
    const body = CreateCareNoteSchema.parse(request.body);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    // Get care team membership
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
        error: 'You must be an active member of the care team to create notes',
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

    // Validate meeting if provided
    if (body.meetingId) {
      const meeting = await prisma.careMeeting.findFirst({
        where: {
          id: body.meetingId,
          tenantId,
          learnerId: params.learnerId,
        },
      });
      if (!meeting) {
        return reply.status(400).send({ error: 'Meeting not found' });
      }
    }

    const note = await prisma.careNote.create({
      data: {
        tenantId,
        learnerId: params.learnerId,
        noteType: body.noteType,
        title: body.title,
        content: body.content,
        visibility: body.visibility,
        authorId: careTeamMember.id,
        actionPlanId: body.actionPlanId,
        meetingId: body.meetingId,
        tags: body.tags,
        attachments: body.attachments,
        requiresFollowUp: body.requiresFollowUp,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    // TODO: Publish NATS event for note created
    // TODO: Send notification to relevant care team members

    return reply.status(201).send({ data: note });
  });

  /**
   * PATCH /learners/:learnerId/notes/:noteId
   * Update a care note
   */
  fastify.patch<{
    Params: CareNoteParams;
    Body: UpdateCareNoteBody;
  }>('/learners/:learnerId/notes/:noteId', async (request, reply) => {
    const params = CareNoteParamsSchema.parse(request.params);
    const body = UpdateCareNoteSchema.parse(request.body);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    const existingNote = await prisma.careNote.findFirst({
      where: {
        id: params.noteId,
        tenantId,
        learnerId: params.learnerId,
      },
      include: {
        author: true,
      },
    });

    if (!existingNote) {
      return reply.status(404).send({ error: 'Care note not found' });
    }

    // Only author can edit their notes
    if (existingNote.author.userId !== userId) {
      return reply.status(403).send({ error: 'Only the author can edit this note' });
    }

    const note = await prisma.careNote.update({
      where: { id: params.noteId },
      data: body,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    // TODO: Publish NATS event for note updated

    return reply.send({ data: note });
  });

  /**
   * POST /learners/:learnerId/notes/:noteId/acknowledge
   * Acknowledge a care note
   */
  fastify.post<{
    Params: CareNoteParams;
    Body: AcknowledgeBody;
  }>('/learners/:learnerId/notes/:noteId/acknowledge', async (request, reply) => {
    const params = CareNoteParamsSchema.parse(request.params);
    const body = AcknowledgeCareNoteSchema.parse(request.body);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    const note = await prisma.careNote.findFirst({
      where: {
        id: params.noteId,
        tenantId,
        learnerId: params.learnerId,
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Care note not found' });
    }

    const acknowledgedBy = (note.acknowledgedBy as string[]) || [];

    let newAcknowledgedBy: string[];
    if (body.acknowledge) {
      // Add user to acknowledged list
      newAcknowledgedBy = acknowledgedBy.includes(userId)
        ? acknowledgedBy
        : [...acknowledgedBy, userId];
    } else {
      // Remove user from acknowledged list
      newAcknowledgedBy = acknowledgedBy.filter((id) => id !== userId);
    }

    const updatedNote = await prisma.careNote.update({
      where: { id: params.noteId },
      data: {
        acknowledgedBy: newAcknowledgedBy,
        isAcknowledged: newAcknowledgedBy.length > 0,
      },
    });

    return reply.send({ data: updatedNote });
  });

  /**
   * DELETE /learners/:learnerId/notes/:noteId
   * Delete a care note
   */
  fastify.delete<{
    Params: CareNoteParams;
  }>('/learners/:learnerId/notes/:noteId', async (request, reply) => {
    const params = CareNoteParamsSchema.parse(request.params);
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }
    if (!userId) {
      return reply.status(400).send({ error: 'Missing x-user-id header' });
    }

    const existingNote = await prisma.careNote.findFirst({
      where: {
        id: params.noteId,
        tenantId,
        learnerId: params.learnerId,
      },
      include: {
        author: true,
      },
    });

    if (!existingNote) {
      return reply.status(404).send({ error: 'Care note not found' });
    }

    // Only author can delete their notes
    if (existingNote.author.userId !== userId) {
      return reply.status(403).send({ error: 'Only the author can delete this note' });
    }

    await prisma.careNote.delete({
      where: { id: params.noteId },
    });

    // TODO: Publish NATS event for note deleted

    return reply.status(204).send();
  });
}

/**
 * Get visibility filter based on user role
 */
function getVisibilityFilter(role: string) {
  // Parents can see TEAM and PARENTS_ONLY
  if (role === 'PARENT' || role === 'GUARDIAN') {
    return {
      visibility: { in: ['TEAM', 'PARENTS_ONLY'] },
    };
  }

  // Educators can see TEAM and EDUCATORS_ONLY
  if (['TEACHER', 'SPECIALIST', 'AIDE', 'COUNSELOR', 'CASE_MANAGER', 'DISTRICT_ADMIN'].includes(role)) {
    return {
      visibility: { in: ['TEAM', 'EDUCATORS_ONLY'] },
    };
  }

  // Therapists and others see only TEAM
  return {
    visibility: 'TEAM',
  };
}

/**
 * Check if user can view a specific note based on visibility
 */
function canViewNote(
  note: { visibility: string; authorId: string; author?: { userId: string } },
  careTeamMember: { role: string } | null,
  userId: string
): boolean {
  // Author can always view their own notes
  if (note.author?.userId === userId) {
    return true;
  }

  // Private notes only visible to author
  if (note.visibility === 'PRIVATE') {
    return false;
  }

  // Team-visible notes
  if (note.visibility === 'TEAM') {
    return careTeamMember !== null;
  }

  // Parents-only notes
  if (note.visibility === 'PARENTS_ONLY') {
    return careTeamMember?.role === 'PARENT' || careTeamMember?.role === 'GUARDIAN';
  }

  // Educators-only notes
  if (note.visibility === 'EDUCATORS_ONLY') {
    return ['TEACHER', 'SPECIALIST', 'AIDE', 'COUNSELOR', 'CASE_MANAGER', 'DISTRICT_ADMIN'].includes(
      careTeamMember?.role ?? ''
    );
  }

  return false;
}
