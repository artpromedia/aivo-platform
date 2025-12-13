/**
 * Conversation Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as conversationService from '../services/conversationService.js';
import * as participantService from '../services/participantService.js';
import { ConversationType, ParticipantRole } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const CreateConversationSchema = z.object({
  type: z.nativeEnum(ConversationType).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  participantIds: z.array(z.string().uuid()).min(1).max(100),
  contextType: z.string().optional(),
  contextId: z.string().uuid().optional(),
});

const UpdateConversationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  isArchived: z.boolean().optional(),
  isMuted: z.boolean().optional(),
});

const AddParticipantsSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
  role: z.nativeEnum(ParticipantRole).optional(),
});

const UpdateParticipantSchema = z.object({
  role: z.nativeEnum(ParticipantRole).optional(),
  isMuted: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
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

export async function registerConversationRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // CONVERSATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /conversations
   * Create a new conversation
   */
  fastify.post(
    '/conversations',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const body = CreateConversationSchema.parse(request.body);

      const conversation = await conversationService.createConversation({
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        ...body,
      });

      fastify.log.info(
        { conversationId: conversation.id, type: conversation.type },
        'Conversation created'
      );

      return reply.status(201).send({ data: conversation });
    }
  );

  /**
   * POST /conversations/direct/:userId
   * Find or create direct conversation with user
   */
  fastify.post(
    '/conversations/direct/:userId',
    async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { userId: otherUserId } = request.params;

      const conversation = await conversationService.findOrCreateDirectConversation(
        ctx.tenantId,
        ctx.userId,
        otherUserId
      );

      return reply.send({ data: conversation });
    }
  );

  /**
   * GET /conversations
   * List user's conversations
   */
  fastify.get(
    '/conversations',
    async (
      request: FastifyRequest<{
        Querystring: {
          type?: string;
          isArchived?: string;
          contextType?: string;
          contextId?: string;
          search?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { type, isArchived, contextType, contextId, search, page, pageSize } = request.query;

      const result = await conversationService.listConversations(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          type: type as any,
          isArchived: isArchived === 'true',
          contextType,
          contextId,
          search,
        },
        {
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 20,
        }
      );

      return reply.send(result);
    }
  );

  /**
   * GET /conversations/:conversationId
   * Get conversation details
   */
  fastify.get(
    '/conversations/:conversationId',
    async (
      request: FastifyRequest<{ Params: { conversationId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId } = request.params;

      const conversation = await conversationService.getConversationById(conversationId, ctx.tenantId);

      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      return reply.send({ data: conversation });
    }
  );

  /**
   * PATCH /conversations/:conversationId
   * Update conversation
   */
  fastify.patch(
    '/conversations/:conversationId',
    async (
      request: FastifyRequest<{ Params: { conversationId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId } = request.params;
      const body = UpdateConversationSchema.parse(request.body);

      // Check permission
      const canModify = await participantService.canModifyConversation(conversationId, ctx.userId);
      if (!canModify) {
        return reply.status(403).send({ error: 'Not authorized to modify this conversation' });
      }

      const conversation = await conversationService.updateConversation(
        conversationId,
        ctx.tenantId,
        body
      );

      return reply.send({ data: conversation });
    }
  );

  /**
   * DELETE /conversations/:conversationId
   * Archive/delete conversation
   */
  fastify.delete(
    '/conversations/:conversationId',
    async (
      request: FastifyRequest<{ Params: { conversationId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId } = request.params;

      const canModify = await participantService.canModifyConversation(conversationId, ctx.userId);
      if (!canModify) {
        return reply.status(403).send({ error: 'Not authorized to delete this conversation' });
      }

      await conversationService.deleteConversation(conversationId, ctx.tenantId);

      return reply.status(204).send();
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // PARTICIPANTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /conversations/:conversationId/participants
   * Add participants to conversation
   */
  fastify.post(
    '/conversations/:conversationId/participants',
    async (
      request: FastifyRequest<{ Params: { conversationId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId } = request.params;
      const body = AddParticipantsSchema.parse(request.body);

      const canModify = await participantService.canModifyConversation(conversationId, ctx.userId);
      if (!canModify) {
        return reply.status(403).send({ error: 'Not authorized to add participants' });
      }

      const participants = await participantService.addParticipants({
        conversationId,
        tenantId: ctx.tenantId,
        userIds: body.userIds,
        role: body.role,
        addedBy: ctx.userId,
      });

      return reply.status(201).send({ data: participants });
    }
  );

  /**
   * PATCH /conversations/:conversationId/participants/:userId
   * Update participant settings
   */
  fastify.patch(
    '/conversations/:conversationId/participants/:userId',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string; userId: string };
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId, userId } = request.params;
      const body = UpdateParticipantSchema.parse(request.body);

      // Users can update their own settings, or admins can update anyone
      if (userId !== ctx.userId) {
        const canModify = await participantService.canModifyConversation(
          conversationId,
          ctx.userId
        );
        if (!canModify) {
          return reply.status(403).send({ error: 'Not authorized' });
        }
      }

      await participantService.updateParticipant(conversationId, userId, body);

      return reply.status(204).send();
    }
  );

  /**
   * DELETE /conversations/:conversationId/participants/:userId
   * Remove participant from conversation
   */
  fastify.delete(
    '/conversations/:conversationId/participants/:userId',
    async (
      request: FastifyRequest<{ Params: { conversationId: string; userId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId, userId } = request.params;

      const canRemove = await participantService.canRemoveParticipant(
        conversationId,
        ctx.userId,
        userId
      );
      if (!canRemove) {
        return reply.status(403).send({ error: 'Not authorized to remove this participant' });
      }

      await participantService.removeParticipant(conversationId, userId, ctx.userId);

      return reply.status(204).send();
    }
  );

  /**
   * POST /conversations/:conversationId/leave
   * Leave a conversation
   */
  fastify.post(
    '/conversations/:conversationId/leave',
    async (
      request: FastifyRequest<{ Params: { conversationId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId } = request.params;

      await participantService.leaveConversation(conversationId, ctx.userId);

      return reply.status(204).send();
    }
  );

  /**
   * POST /conversations/:conversationId/read
   * Mark conversation as read
   */
  fastify.post(
    '/conversations/:conversationId/read',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Body: { lastMessageId: string };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId } = request.params;
      const { lastMessageId } = request.body;

      await participantService.markAsRead(conversationId, ctx.userId, lastMessageId);

      return reply.status(204).send();
    }
  );

  /**
   * GET /unread
   * Get unread counts
   */
  fastify.get('/unread', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getTenantContext(request);

    const counts = await participantService.getUnreadCounts(ctx.tenantId, ctx.userId);

    return reply.send({ data: counts });
  });
}
