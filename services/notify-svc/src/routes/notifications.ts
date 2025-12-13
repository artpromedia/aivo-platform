/**
 * Notification Routes
 *
 * REST endpoints for managing notifications.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as notificationService from '../services/notificationService.js';
import * as preferenceService from '../services/preferenceService.js';
import { NotificationType, DeliveryChannel, NotificationPriority } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const CreateNotificationSchema = z.object({
  recipientId: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().url().optional(),
  actionData: z.record(z.unknown()).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  expiresAt: z.coerce.date().optional(),
  groupKey: z.string().optional(),
  channels: z.array(z.nativeEnum(DeliveryChannel)).optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().uuid().optional(),
});

const BulkNotificationSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(1000),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().url().optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  channels: z.array(z.nativeEnum(DeliveryChannel)).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getTenantContext(request: FastifyRequest): { tenantId: string; userId: string } {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;

  if (!tenantId) {
    throw new Error('Missing tenant context');
  }

  return { tenantId, userId: userId || 'system' };
}

export async function registerNotificationRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /notifications
   * Create a new notification
   */
  fastify.post(
    '/notifications',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const body = CreateNotificationSchema.parse(request.body);

      const notification = await notificationService.createNotification({
        tenantId: ctx.tenantId,
        ...body,
      });

      fastify.log.info(
        { notificationId: notification.id, recipientId: body.recipientId },
        'Notification created'
      );

      return reply.status(201).send({ data: notification });
    }
  );

  /**
   * POST /notifications/bulk
   * Create notifications for multiple recipients
   */
  fastify.post(
    '/notifications/bulk',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const body = BulkNotificationSchema.parse(request.body);

      const notifications = await notificationService.createBulkNotifications({
        tenantId: ctx.tenantId,
        ...body,
      });

      fastify.log.info(
        { count: notifications.length, type: body.type },
        'Bulk notifications created'
      );

      return reply.status(201).send({ data: { count: notifications.length } });
    }
  );

  /**
   * GET /notifications
   * List notifications for current user
   */
  fastify.get(
    '/notifications',
    async (
      request: FastifyRequest<{
        Querystring: {
          type?: string;
          isRead?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { type, isRead, page, pageSize } = request.query;

      const result = await notificationService.listNotifications(
        {
          tenantId: ctx.tenantId,
          recipientId: ctx.userId,
          type: type as any,
          isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
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
   * GET /notifications/unread-count
   * Get unread notification count
   */
  fastify.get('/notifications/unread-count', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getTenantContext(request);

    const count = await notificationService.getUnreadCount(ctx.tenantId, ctx.userId);

    return reply.send({ data: { count } });
  });

  /**
   * GET /notifications/:notificationId
   * Get a specific notification
   */
  fastify.get(
    '/notifications/:notificationId',
    async (
      request: FastifyRequest<{ Params: { notificationId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { notificationId } = request.params;

      const notification = await notificationService.getNotificationById(
        notificationId,
        ctx.tenantId
      );

      if (!notification) {
        return reply.status(404).send({ error: 'Notification not found' });
      }

      return reply.send({ data: notification });
    }
  );

  /**
   * PATCH /notifications/:notificationId/read
   * Mark notification as read
   */
  fastify.patch(
    '/notifications/:notificationId/read',
    async (
      request: FastifyRequest<{ Params: { notificationId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { notificationId } = request.params;

      await notificationService.markAsRead(notificationId, ctx.tenantId);

      return reply.status(204).send();
    }
  );

  /**
   * POST /notifications/read-all
   * Mark all notifications as read
   */
  fastify.post('/notifications/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getTenantContext(request);

    await notificationService.markAllAsRead(ctx.tenantId, ctx.userId);

    return reply.status(204).send();
  });

  /**
   * DELETE /notifications/:notificationId
   * Dismiss a notification
   */
  fastify.delete(
    '/notifications/:notificationId',
    async (
      request: FastifyRequest<{ Params: { notificationId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { notificationId } = request.params;

      await notificationService.dismissNotification(notificationId, ctx.tenantId);

      return reply.status(204).send();
    }
  );
}
