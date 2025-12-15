/**
 * Contextual Thread Routes
 *
 * Messaging 2.0: Routes for context-linked conversations (learners, action plans, meetings).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as conversationService from '../services/conversationService.js';
import { ContextType, ConversationType } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const CreateLearnerThreadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  participantIds: z.array(z.string().uuid()).min(1).max(50),
});

const CreateActionPlanThreadSchema = z.object({
  actionPlanId: z.string().uuid(),
  learnerId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  participantIds: z.array(z.string().uuid()).min(1).max(50),
});

const CreateMeetingThreadSchema = z.object({
  meetingId: z.string().uuid(),
  learnerId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  participantIds: z.array(z.string().uuid()).min(1).max(50),
});

const GetThreadsQuerySchema = z.object({
  contextType: z.nativeEnum(ContextType).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getTenantContext(request: FastifyRequest): { tenantId: string; userId: string } {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;

  if (!tenantId || !userId) {
    throw new Error('Missing tenant context');
  }

  return { tenantId, userId };
}

function generateThreadName(contextType: ContextType, customName?: string): string {
  if (customName) return customName;

  switch (contextType) {
    case ContextType.LEARNER:
      return 'Care Team Discussion';
    case ContextType.ACTION_PLAN:
      return 'Action Plan Discussion';
    case ContextType.MEETING:
      return 'Meeting Thread';
    case ContextType.GOAL:
      return 'Goal Updates';
    case ContextType.TASK:
      return 'Task Discussion';
    case ContextType.SESSION:
      return 'Session Notes';
    case ContextType.CARE_NOTE:
      return 'Care Note Follow-up';
    case ContextType.CLASS:
      return 'Class Channel';
    default:
      return 'Discussion Thread';
  }
}

export async function registerThreadRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // LEARNER THREADS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /threads/learner/:learnerId
   * Find or create a care team thread for a specific learner
   */
  fastify.post(
    '/threads/learner/:learnerId',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { learnerId } = request.params;
      const body = CreateLearnerThreadSchema.parse(request.body);

      const result = await conversationService.findOrCreateContextThread({
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        contextType: ContextType.LEARNER,
        contextLearnerId: learnerId,
        name: generateThreadName(ContextType.LEARNER, body.name),
        description: body.description,
        participantIds: body.participantIds,
      });

      fastify.log.info(
        {
          threadId: result.conversation.id,
          learnerId,
          created: result.created,
        },
        result.created ? 'Learner thread created' : 'Existing learner thread found'
      );

      return reply.status(result.created ? 201 : 200).send({
        data: result.conversation,
        created: result.created,
      });
    }
  );

  /**
   * GET /threads/learner/:learnerId
   * Get all threads related to a specific learner
   */
  fastify.get(
    '/threads/learner/:learnerId',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Querystring: { page?: string; pageSize?: string };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { learnerId } = request.params;
      const { page, pageSize } = request.query;

      const result = await conversationService.getThreadsForLearner(
        ctx.tenantId,
        ctx.userId,
        learnerId,
        {
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 20,
        }
      );

      return reply.send(result);
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ACTION PLAN THREADS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /threads/action-plan/:actionPlanId
   * Find or create a thread for an action plan
   */
  fastify.post(
    '/threads/action-plan/:actionPlanId',
    async (
      request: FastifyRequest<{
        Params: { actionPlanId: string };
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { actionPlanId } = request.params;
      const body = CreateActionPlanThreadSchema.parse(request.body);

      const result = await conversationService.findOrCreateContextThread({
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        contextType: ContextType.ACTION_PLAN,
        contextId: actionPlanId,
        contextLearnerId: body.learnerId,
        contextActionPlanId: actionPlanId,
        name: generateThreadName(ContextType.ACTION_PLAN, body.name),
        description: body.description,
        participantIds: body.participantIds,
      });

      fastify.log.info(
        {
          threadId: result.conversation.id,
          actionPlanId,
          learnerId: body.learnerId,
          created: result.created,
        },
        result.created ? 'Action plan thread created' : 'Existing action plan thread found'
      );

      return reply.status(result.created ? 201 : 200).send({
        data: result.conversation,
        created: result.created,
      });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MEETING THREADS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /threads/meeting/:meetingId
   * Find or create a thread for a meeting
   */
  fastify.post(
    '/threads/meeting/:meetingId',
    async (
      request: FastifyRequest<{
        Params: { meetingId: string };
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { meetingId } = request.params;
      const body = CreateMeetingThreadSchema.parse(request.body);

      const result = await conversationService.findOrCreateContextThread({
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        contextType: ContextType.MEETING,
        contextId: meetingId,
        contextLearnerId: body.learnerId,
        contextMeetingId: meetingId,
        name: generateThreadName(ContextType.MEETING, body.name),
        description: body.description,
        participantIds: body.participantIds,
      });

      fastify.log.info(
        {
          threadId: result.conversation.id,
          meetingId,
          learnerId: body.learnerId,
          created: result.created,
        },
        result.created ? 'Meeting thread created' : 'Existing meeting thread found'
      );

      return reply.status(result.created ? 201 : 200).send({
        data: result.conversation,
        created: result.created,
      });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // GENERIC CONTEXT LOOKUP
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /threads/context/:contextType/:contextId
   * Get thread by context type and ID
   */
  fastify.get(
    '/threads/context/:contextType/:contextId',
    async (
      request: FastifyRequest<{
        Params: { contextType: string; contextId: string };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { contextType, contextId } = request.params;

      // Validate context type
      if (!Object.values(ContextType).includes(contextType as ContextType)) {
        return reply.status(400).send({
          error: 'Invalid context type',
          validTypes: Object.values(ContextType),
        });
      }

      const thread = await conversationService.getThreadByContext(
        ctx.tenantId,
        contextType as ContextType,
        contextId
      );

      if (!thread) {
        return reply.status(404).send({
          error: 'Thread not found',
          contextType,
          contextId,
          suggestion: 'Use POST /threads/{context-type}/{id} to create a thread',
        });
      }

      return reply.send({ data: thread });
    }
  );

  /**
   * GET /threads
   * List all contextual threads for the current user
   */
  fastify.get(
    '/threads',
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof GetThreadsQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const query = GetThreadsQuerySchema.parse(request.query);

      const filters: Parameters<typeof conversationService.listConversations>[0] = {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        isArchived: false,
      };

      // Filter by context type if provided
      if (query.contextType) {
        filters.contextType = query.contextType;
      }

      const result = await conversationService.listConversations(filters, {
        page: query.page ? parseInt(query.page, 10) : 1,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20,
      });

      return reply.send(result);
    }
  );
}
