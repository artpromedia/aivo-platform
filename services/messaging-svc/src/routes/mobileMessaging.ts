/**
 * Mobile Messaging Routes
 *
 * Mobile-friendly API endpoints for parent-teacher messaging.
 * Wraps the core messaging service endpoints with mobile-specific
 * response formats that match the Flutter client expectations.
 * 
 * Endpoints:
 * - GET /messaging/conversations - Get all conversations
 * - POST /messaging/conversations - Create new conversation
 * - GET /messaging/conversations/:conversationId/messages - Get messages
 * - POST /messaging/conversations/:conversationId/messages - Send message
 * - POST /messaging/conversations/:conversationId/read - Mark as read
 * - GET /messaging/unread-count - Get unread message count
 * - POST /messaging/attachments - Upload attachment
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as conversationService from '../services/conversationService.js';
import * as messageService from '../services/messageService.js';
import * as participantService from '../services/participantService.js';
import * as attachmentService from '../services/attachmentService.js';
import * as translationService from '../services/translationService.js';
import { MessageType, ConversationType } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const SendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.enum(['text', 'image', 'file', 'progress_report', 'system']).default('text'),
  attachmentIds: z.array(z.string()).optional(),
});

const CreateConversationSchema = z.object({
  title: z.string().min(1).max(100),
  participantIds: z.array(z.string().uuid()).min(1),
  initialMessage: z.string().optional(),
});

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  before: z.string().uuid().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS (matching Flutter client expectations)
// ══════════════════════════════════════════════════════════════════════════════

interface MobileConversation {
  id: string;
  title: string;
  participants: ConversationParticipant[];
  lastMessage: MobileMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ConversationParticipant {
  userId: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

interface MobileMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'progress_report' | 'system';
  attachments: Attachment[] | null;
  isRead: boolean;
  createdAt: string;
  editedAt: string | null;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

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

/**
 * Transform backend conversation to mobile format
 */
function transformConversation(conversation: any, userId: string): MobileConversation {
  return {
    id: conversation.id,
    title: conversation.name || 'Conversation',
    participants: conversation.participants?.map((p: any) => ({
      userId: p.userId,
      name: p.user?.name || 'User',
      role: p.role || 'member',
      avatarUrl: p.user?.avatarUrl || null,
      isOnline: false, // TODO: Implement real-time presence
    })) || [],
    lastMessage: conversation.lastMessage ? transformMessage(conversation.lastMessage, userId) : null,
    unreadCount: conversation.participants?.find((p: any) => p.userId === userId)?.unreadCount || 0,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

/**
 * Transform backend message to mobile format
 */
function transformMessage(message: any, currentUserId: string): MobileMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: message.sender?.name || 'User',
    content: message.content,
    type: mapMessageType(message.type),
    attachments: message.attachments?.map((a: any) => ({
      id: a.id,
      name: a.fileName || 'file',
      url: a.fileUrl || '',
      mimeType: a.mimeType || 'application/octet-stream',
      size: a.fileSize || 0,
    })) || null,
    isRead: message.readBy?.includes(currentUserId) || false,
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
  };
}

/**
 * Map backend MessageType to mobile string
 */
function mapMessageType(type: MessageType): 'text' | 'image' | 'file' | 'progress_report' | 'system' {
  switch (type) {
    case MessageType.TEXT:
      return 'text';
    case MessageType.IMAGE:
      return 'image';
    case MessageType.FILE:
      return 'file';
    case MessageType.SYSTEM:
      return 'system';
    default:
      return 'text';
  }
}

/**
 * Map mobile message type to backend MessageType
 */
function mapToBackendMessageType(type: string): MessageType {
  switch (type) {
    case 'image':
      return MessageType.IMAGE;
    case 'file':
      return MessageType.FILE;
    case 'system':
      return MessageType.SYSTEM;
    default:
      return MessageType.TEXT;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerMobileMessagingRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /messaging/conversations
   * Get all conversations for current user
   */
  fastify.get(
    '/messaging/conversations',
    async (
      request: FastifyRequest<{
        Querystring: { limit?: string; offset?: string };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const paginationResult = PaginationSchema.safeParse(request.query);

      if (!paginationResult.success) {
        return reply.code(400).send({ error: 'Invalid pagination parameters' });
      }

      const { limit, offset } = paginationResult.data;

      try {
        const result = await conversationService.listConversations(
          {
            tenantId: ctx.tenantId,
            userId: ctx.userId,
          },
          {
            page: Math.floor(offset / limit) + 1,
            pageSize: limit,
          }
        );

        const conversations = result.data.map((conv: any) => 
          transformConversation(conv, ctx.userId)
        );

        return reply.send({ conversations });
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching conversations');
        return reply.code(500).send({ error: 'Failed to fetch conversations' });
      }
    }
  );

  /**
   * POST /messaging/conversations
   * Create a new conversation
   */
  fastify.post(
    '/messaging/conversations',
    async (
      request: FastifyRequest<{ Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const bodyResult = CreateConversationSchema.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.code(400).send({ error: 'Invalid request body' });
      }

      const { title, participantIds, initialMessage } = bodyResult.data;

      try {
        const conversation = await conversationService.createConversation({
          tenantId: ctx.tenantId,
          createdBy: ctx.userId,
          name: title,
          participantIds: [ctx.userId, ...participantIds],
          type: ConversationType.DIRECT,
        });

        // Send initial message if provided
        if (initialMessage) {
          await messageService.sendMessage({
            tenantId: ctx.tenantId,
            conversationId: conversation.id,
            senderId: ctx.userId,
            content: initialMessage,
            type: MessageType.TEXT,
          });
        }

        return reply.code(201).send(transformConversation(conversation, ctx.userId));
      } catch (error) {
        fastify.log.error({ error }, 'Error creating conversation');
        return reply.code(500).send({ error: 'Failed to create conversation' });
      }
    }
  );

  /**
   * GET /messaging/conversations/:conversationId/messages
   * Get messages in a conversation
   */
  fastify.get(
    '/messaging/conversations/:conversationId/messages',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Querystring: { limit?: string; before?: string };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId } = request.params;
      const paginationResult = PaginationSchema.safeParse(request.query);

      if (!paginationResult.success) {
        return reply.code(400).send({ error: 'Invalid pagination parameters' });
      }

      const { limit, before } = paginationResult.data;

      try {
        const messageResult = await messageService.listMessages(
          {
          conversationId,
          tenantId: ctx.tenantId,
          beforeId: before,
          },
          limit
        );

        const transformedMessages = messageResult.data.map((msg: any) =>
          transformMessage(msg, ctx.userId)
        );

        return reply.send({
          messages: transformedMessages,
          hasMore: messageResult.hasMore,
          nextCursor: messageResult.nextCursor,
        });
      } catch (error) {
        fastify.log.error({ error, conversationId }, 'Error fetching messages');
        return reply.code(500).send({ error: 'Failed to fetch messages' });
      }
    }
  );

  /**
   * POST /messaging/conversations/:conversationId/messages
   * Send a message
   */
  fastify.post(
    '/messaging/conversations/:conversationId/messages',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId } = request.params;
      const bodyResult = SendMessageSchema.safeParse(request.body);

      if (!bodyResult.success) {
        return reply.code(400).send({ error: 'Invalid message body' });
      }

      const { content, type, attachmentIds } = bodyResult.data;

      try {
        const message = await messageService.sendMessage({
          tenantId: ctx.tenantId,
          conversationId,
          senderId: ctx.userId,
          content,
          type: mapToBackendMessageType(type),
          metadata: attachmentIds ? { attachmentIds } : undefined,
        });

        return reply.code(201).send(transformMessage(message, ctx.userId));
      } catch (error) {
        fastify.log.error({ error, conversationId }, 'Error sending message');
        return reply.code(500).send({ error: 'Failed to send message' });
      }
    }
  );

  /**
   * POST /messaging/conversations/:conversationId/read
   * Mark messages as read
   */
  fastify.post(
    '/messaging/conversations/:conversationId/read',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Body: { upToMessageId?: string };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { conversationId } = request.params;
      const { upToMessageId } = request.body || {};

      try {
        await participantService.markAsRead(conversationId, ctx.userId, upToMessageId);
        return reply.code(204).send();
      } catch (error) {
        fastify.log.error({ error, conversationId }, 'Error marking messages as read');
        return reply.code(500).send({ error: 'Failed to mark messages as read' });
      }
    }
  );

  /**
   * GET /messaging/unread-count
   * Get total unread message count
   */
  fastify.get(
    '/messaging/unread-count',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getTenantContext(request);

      try {
        const counts = await participantService.getUnreadCounts(ctx.tenantId, ctx.userId);
        const totalCount = counts.total || 0;

        return reply.send({ count: totalCount });
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching unread count');
        return reply.code(500).send({ error: 'Failed to fetch unread count' });
      }
    }
  );

  /**
   * POST /messaging/attachments
   * Upload an attachment to Cloudflare R2
   */
  fastify.post(
    '/messaging/attachments',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getTenantContext(request);

      try {
        // Parse multipart file upload
        const data = await (request as any).file();

        if (!data) {
          return reply.code(400).send({ error: 'No file uploaded' });
        }

        const filename = data.filename || 'unnamed';
        const mimeType = data.mimetype || 'application/octet-stream';

        // Read file into buffer
        const fileBuffer = await data.toBuffer();
        const size = fileBuffer.length;

        // Validate file type and size
        const validation = attachmentService.validateAttachment(mimeType, size, filename);
        if (!validation.valid) {
          return reply.code(400).send({ error: validation.error });
        }

        // Upload to Cloudflare R2
        const result = await attachmentService.uploadAttachment(
          ctx.tenantId,
          ctx.userId,
          fileBuffer,
          filename,
          mimeType,
        );

        const attachment: Attachment = {
          id: result.id,
          name: result.name,
          url: result.url,
          mimeType: result.mimeType,
          size: result.size,
        };

        return reply.code(201).send(attachment);
      } catch (error) {
        fastify.log.error({ error }, 'Error uploading attachment');
        return reply.code(500).send({ error: 'Failed to upload attachment' });
      }
    }
  );

  /**
   * POST /messaging/messages/:messageId/translate
   * Translate a message to the requested locale
   */
  fastify.post(
    '/messaging/messages/:messageId/translate',
    async (
      request: FastifyRequest<{
        Params: { messageId: string };
        Body: { targetLocale: string; sourceLocale?: string };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { messageId } = request.params;
      const { targetLocale, sourceLocale } = request.body || {};

      if (!targetLocale) {
        return reply.code(400).send({ error: 'targetLocale is required' });
      }

      if (!translationService.isSupportedLocale(targetLocale)) {
        return reply.code(400).send({
          error: `Unsupported locale: ${targetLocale}`,
          supportedLocales: translationService.getSupportedLocales(),
        });
      }

      try {
        // Get the message to translate
        const message = await messageService.getMessageById(messageId, ctx.tenantId);
        if (!message) {
          return reply.code(404).send({ error: 'Message not found' });
        }

        const result = await translationService.translateMessage(
          messageId,
          message.content,
          targetLocale,
          sourceLocale,
        );

        return reply.send(result);
      } catch (error) {
        fastify.log.error({ error, messageId }, 'Error translating message');
        return reply.code(500).send({ error: 'Failed to translate message' });
      }
    }
  );

  /**
   * GET /messaging/locales
   * Get list of supported translation locales
   */
  fastify.get(
    '/messaging/locales',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        locales: translationService.getSupportedLocales(),
      });
    }
  );
}
