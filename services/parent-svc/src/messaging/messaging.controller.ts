/**
 * Messaging Routes
 *
 * REST API endpoints for parent-teacher messaging.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { SenderType } from './messaging.types.js';

export async function messagingRoutes(app: FastifyInstance) {
  const messagingService = app.services.messaging;

  /**
   * Get all conversations for the parent
   */
  app.get('/conversations', async (request: FastifyRequest) => {
    const { includeArchived } = request.query as { includeArchived?: string };
    return messagingService.getParentConversations(request.parent!.id);
  });

  /**
   * Create a new conversation with a teacher
   */
  app.post('/conversations', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      teacherId: string;
      studentId: string;
      subject: string;
      message?: string;
    };
    const conversation = await messagingService.createConversation(request.parent!.id, {
      teacherId: body.teacherId,
      studentId: body.studentId,
      subject: body.subject,
    });

    if (body.message) {
      await messagingService.sendMessage(request.parent!.id, SenderType.PARENT, {
        conversationId: conversation.id,
        content: body.message,
      });
    }

    reply.status(201);
    return conversation;
  });

  /**
   * Get messages in a conversation
   */
  app.get('/conversations/:conversationId', async (request: FastifyRequest) => {
    const { conversationId } = request.params as { conversationId: string };
    const { limit, before } = request.query as { limit?: string; before?: string };
    return messagingService.getConversationMessages(
      request.parent!.id,
      SenderType.PARENT,
      conversationId,
      {
        limit: limit ? Number.parseInt(limit, 10) : undefined,
        cursor: before || undefined,
      }
    );
  });

  /**
   * Send a message in a conversation
   */
  app.post(
    '/conversations/:conversationId/messages',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { conversationId } = request.params as { conversationId: string };
      const body = request.body as { content: string };
      reply.status(201);
      return messagingService.sendMessage(request.parent!.id, SenderType.PARENT, {
        conversationId,
        content: body.content,
      });
    }
  );

  /**
   * Mark messages as read
   */
  app.put('/conversations/:conversationId/read', async (request: FastifyRequest) => {
    const { conversationId } = request.params as { conversationId: string };
    await messagingService.getConversationMessages(
      request.parent!.id,
      SenderType.PARENT,
      conversationId,
      { limit: 0 }
    );
    return { success: true };
  });

  /**
   * Archive a conversation
   */
  app.put('/conversations/:conversationId/archive', async (request: FastifyRequest) => {
    const { conversationId } = request.params as { conversationId: string };
    await messagingService.archiveConversation(
      request.parent!.id,
      SenderType.PARENT,
      conversationId
    );
    return { success: true };
  });

  /**
   * Report a message
   */
  app.post('/messages/:messageId/report', async (request: FastifyRequest, reply: FastifyReply) => {
    const { messageId } = request.params as { messageId: string };
    const body = request.body as { reason: string; details?: string };
    reply.status(201);
    return messagingService.reportMessage(request.parent!.id, SenderType.PARENT, {
      messageId,
      reason: body.reason,
    });
  });

  /**
   * Get unread message count
   */
  app.get('/unread-count', async (request: FastifyRequest) => {
    return messagingService.getUnreadCount(request.parent!.id);
  });
}
