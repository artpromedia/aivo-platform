/**
 * Message Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as messageService from '../services/messageService.js';
import { MessageType } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const SendMessageSchema = z.object({
  type: z.nativeEnum(MessageType).optional(),
  content: z.string().min(1).max(4000),
  metadata: z.record(z.unknown()).optional(),
  replyToId: z.string().uuid().optional(),
});

const EditMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

const SearchMessagesSchema = z.object({
  query: z.string().min(1).max(200),
  pageSize: z.coerce.number().min(1).max(100).optional(),
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

export async function registerMessageRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // MESSAGES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /conversations/:conversationId/messages
   * Send a message
   */
  fastify.post(
    '/conversations/:conversationId/messages',
    async (
      request: FastifyRequest<{ Params: { conversationId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId } = request.params;
      const body = SendMessageSchema.parse(request.body);

      const message = await messageService.sendMessage({
        tenantId: ctx.tenantId,
        conversationId,
        senderId: ctx.userId,
        ...body,
      });

      fastify.log.info(
        { messageId: message.id, conversationId },
        'Message sent'
      );

      return reply.status(201).send({ data: message });
    }
  );

  /**
   * GET /conversations/:conversationId/messages
   * List messages in conversation
   */
  fastify.get(
    '/conversations/:conversationId/messages',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Querystring: {
          beforeId?: string;
          afterId?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId } = request.params;
      const { beforeId, afterId, pageSize } = request.query;

      const result = await messageService.listMessages(
        {
          conversationId,
          tenantId: ctx.tenantId,
          beforeId,
          afterId,
        },
        pageSize ? parseInt(pageSize, 10) : 50
      );

      return reply.send(result);
    }
  );

  /**
   * GET /messages/:messageId
   * Get a specific message
   */
  fastify.get(
    '/messages/:messageId',
    async (
      request: FastifyRequest<{ Params: { messageId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { messageId } = request.params;

      const message = await messageService.getMessageById(messageId, ctx.tenantId);

      if (!message) {
        return reply.status(404).send({ error: 'Message not found' });
      }

      return reply.send({ data: message });
    }
  );

  /**
   * PATCH /messages/:messageId
   * Edit a message
   */
  fastify.patch(
    '/messages/:messageId',
    async (
      request: FastifyRequest<{ Params: { messageId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { messageId } = request.params;
      const body = EditMessageSchema.parse(request.body);

      const message = await messageService.editMessage(messageId, ctx.tenantId, {
        content: body.content,
        editedBy: ctx.userId,
      });

      return reply.send({ data: message });
    }
  );

  /**
   * DELETE /messages/:messageId
   * Delete a message
   */
  fastify.delete(
    '/messages/:messageId',
    async (
      request: FastifyRequest<{ Params: { messageId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { messageId } = request.params;

      await messageService.deleteMessage(messageId, ctx.tenantId, ctx.userId);

      return reply.status(204).send();
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // READ RECEIPTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /messages/:messageId/delivered
   * Mark message as delivered
   */
  fastify.post(
    '/messages/:messageId/delivered',
    async (
      request: FastifyRequest<{ Params: { messageId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { messageId } = request.params;

      await messageService.markMessageDelivered(messageId, ctx.userId, ctx.tenantId);

      return reply.status(204).send();
    }
  );

  /**
   * POST /messages/:messageId/read
   * Mark message as read
   */
  fastify.post(
    '/messages/:messageId/read',
    async (
      request: FastifyRequest<{ Params: { messageId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { messageId } = request.params;

      await messageService.markMessageRead(messageId, ctx.userId, ctx.tenantId);

      return reply.status(204).send();
    }
  );

  /**
   * GET /messages/:messageId/receipts
   * Get read receipts for a message
   */
  fastify.get(
    '/messages/:messageId/receipts',
    async (
      request: FastifyRequest<{ Params: { messageId: string } }>,
      reply: FastifyReply
    ) => {
      const { messageId } = request.params;

      const receipts = await messageService.getReadReceipts(messageId);

      return reply.send({ data: receipts });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /messages/search
   * Search messages across conversations
   */
  fastify.get(
    '/messages/search',
    async (
      request: FastifyRequest<{ Querystring: { query: string; pageSize?: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { query, pageSize } = request.query;

      const validated = SearchMessagesSchema.parse({ query, pageSize });

      const messages = await messageService.searchMessages(
        ctx.tenantId,
        ctx.userId,
        validated.query,
        validated.pageSize
      );

      return reply.send({ data: messages });
    }
  );
}
