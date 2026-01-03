/**
 * In-App Notification Routes
 *
 * REST endpoints for managing in-app notifications.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { inAppService } from '../channels/in-app/in-app.service.js';
import type { InAppNotificationFilters } from '../channels/in-app/types.js';
import { NotificationType } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const ListNotificationsQuerySchema = z.object({
  type: z.string().optional(),
  isRead: z.enum(['true', 'false']).optional(),
  isDismissed: z.enum(['true', 'false']).optional(),
  groupKey: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

const MarkReadBodySchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1).max(100),
});

const MarkAllReadBodySchema = z.object({
  types: z.array(z.nativeEnum(NotificationType)).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getTenantContext(request: FastifyRequest): { tenantId: string; userId: string } {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;

  if (!tenantId || !userId) {
    throw new Error('Missing tenant/user context');
  }

  return { tenantId, userId };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerInAppRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /notifications/in-app
   * List in-app notifications for current user
   */
  fastify.get(
    '/notifications/in-app',
    async (request: FastifyRequest<{ Querystring: unknown }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const query = ListNotificationsQuerySchema.parse(request.query);

      const filters: InAppNotificationFilters = {
        tenantId: ctx.tenantId,
        recipientId: ctx.userId,
      };

      if (query.type) {
        filters.type = query.type as NotificationType;
      }
      if (query.isRead === 'true') {
        filters.isRead = true;
      } else if (query.isRead === 'false') {
        filters.isRead = false;
      }
      if (query.isDismissed === 'true') {
        filters.isDismissed = true;
      } else if (query.isDismissed === 'false') {
        filters.isDismissed = false;
      }
      if (query.groupKey) {
        filters.groupKey = query.groupKey;
      }

      const result = await inAppService.getNotifications(
        filters,
        {
          page: query.page,
          pageSize: query.pageSize,
        }
      );

      return reply.send({
        data: result.notifications,
        pagination: {
          total: result.total,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.ceil(result.total / query.pageSize),
        },
        unreadCount: result.unreadCount,
      });
    }
  );

  /**
   * GET /notifications/in-app/unread-count
   * Get unread notification count
   */
  fastify.get(
    '/notifications/in-app/unread-count',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getTenantContext(request);

      const count = await inAppService.getUnreadCount(ctx.tenantId, ctx.userId);

      return reply.send({ data: { count } });
    }
  );

  /**
   * GET /notifications/in-app/grouped
   * Get grouped notifications
   */
  fastify.get(
    '/notifications/in-app/grouped',
    async (
      request: FastifyRequest<{ Querystring: { limit?: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const limit = request.query.limit ? Number.parseInt(request.query.limit, 10) : 10;

      const groups = await inAppService.getGroupedNotifications(
        ctx.tenantId,
        ctx.userId,
        limit
      );

      return reply.send({
        data: groups,
      });
    }
  );

  /**
   * GET /notifications/in-app/:id
   * Get a specific notification
   */
  fastify.get(
    '/notifications/in-app/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { id } = request.params;

      const notification = await inAppService.getNotificationById(id, ctx.tenantId);

      if (!notification) {
        return reply.status(404).send({ error: 'Notification not found' });
      }

      return reply.send({ data: notification });
    }
  );

  /**
   * POST /notifications/in-app/:id/read
   * Mark a notification as read
   */
  fastify.post(
    '/notifications/in-app/:id/read',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { id } = request.params;

      const result = await inAppService.markAsRead(id, ctx.tenantId, ctx.userId);

      if (!result.success) {
        return reply.status(404).send({ error: 'Notification not found or already read' });
      }

      return reply.send({ data: { success: true } });
    }
  );

  /**
   * POST /notifications/in-app/read
   * Mark multiple notifications as read
   */
  fastify.post(
    '/notifications/in-app/read',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const body = MarkReadBodySchema.parse(request.body);

      const result = await inAppService.markMultipleAsRead(
        body.notificationIds,
        ctx.tenantId,
        ctx.userId
      );

      return reply.send({
        data: {
          success: result.success,
          updatedCount: result.updatedCount,
        },
      });
    }
  );

  /**
   * POST /notifications/in-app/read-all
   * Mark all notifications as read
   */
  fastify.post(
    '/notifications/in-app/read-all',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const body = MarkAllReadBodySchema.safeParse(request.body);
      const types = body.success ? body.data.types : undefined;

      const result = await inAppService.markAllAsRead(ctx.tenantId, ctx.userId, types);

      return reply.send({
        data: {
          success: result.success,
          updatedCount: result.updatedCount,
        },
      });
    }
  );

  /**
   * POST /notifications/in-app/:id/dismiss
   * Dismiss (archive) a notification
   */
  fastify.post(
    '/notifications/in-app/:id/dismiss',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { id } = request.params;

      const success = await inAppService.dismiss(id, ctx.tenantId, ctx.userId);

      if (!success) {
        return reply.status(404).send({ error: 'Notification not found' });
      }

      return reply.send({ data: { success: true } });
    }
  );

  /**
   * POST /notifications/in-app/dismiss-all
   * Dismiss all notifications
   */
  fastify.post(
    '/notifications/in-app/dismiss-all',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getTenantContext(request);

      const count = await inAppService.dismissAll(ctx.tenantId, ctx.userId);

      return reply.send({ data: { dismissedCount: count } });
    }
  );

  /**
   * DELETE /notifications/in-app/:id
   * Delete a notification
   */
  fastify.delete(
    '/notifications/in-app/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { id } = request.params;

      const success = await inAppService.delete(id, ctx.tenantId, ctx.userId);

      if (!success) {
        return reply.status(404).send({ error: 'Notification not found' });
      }

      return reply.status(204).send();
    }
  );
}
