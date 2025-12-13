/**
 * Notification Service
 *
 * Core business logic for creating, delivering, and managing notifications.
 */

import { prisma, NotificationType, DeliveryChannel, NotificationPriority, DeliveryStatus } from '../prisma.js';
import type {
  CreateNotificationInput,
  NotificationFilters,
  BulkNotificationInput,
  DeliveryResult,
} from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION CRUD
// ══════════════════════════════════════════════════════════════════════════════

export async function createNotification(input: CreateNotificationInput) {
  const channels = input.channels ?? [DeliveryChannel.IN_APP];

  const notification = await prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      imageUrl: input.imageUrl,
      actionUrl: input.actionUrl,
      actionData: input.actionData,
      priority: input.priority ?? NotificationPriority.NORMAL,
      expiresAt: input.expiresAt,
      groupKey: input.groupKey,
      collapseKey: input.collapseKey,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      deliveries: {
        create: channels.map((channel) => ({
          channel,
          status: DeliveryStatus.PENDING,
        })),
      },
    },
    include: {
      deliveries: true,
    },
  });

  return notification;
}

export async function getNotificationById(id: string, tenantId: string) {
  return prisma.notification.findFirst({
    where: { id, tenantId },
    include: {
      deliveries: true,
    },
  });
}

export async function listNotifications(
  filters: NotificationFilters,
  pagination: { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 20 } = pagination;
  const skip = (page - 1) * pageSize;

  const where: Parameters<typeof prisma.notification.findMany>[0]['where'] = {
    tenantId: filters.tenantId,
    recipientId: filters.recipientId,
  };

  if (filters.type) {
    where.type = Array.isArray(filters.type) ? { in: filters.type } : filters.type;
  }

  if (filters.isRead !== undefined) {
    where.isRead = filters.isRead;
  }

  if (filters.groupKey) {
    where.groupKey = filters.groupKey;
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) where.createdAt.gte = filters.fromDate;
    if (filters.toDate) where.createdAt.lte = filters.toDate;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: notifications,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function markAsRead(notificationId: string, tenantId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, tenantId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(tenantId: string, recipientId: string) {
  return prisma.notification.updateMany({
    where: { tenantId, recipientId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function dismissNotification(notificationId: string, tenantId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, tenantId },
    data: { isDismissed: true, dismissedAt: new Date() },
  });
}

export async function getUnreadCount(tenantId: string, recipientId: string) {
  return prisma.notification.count({
    where: { tenantId, recipientId, isRead: false, isDismissed: false },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// BULK NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function createBulkNotifications(input: BulkNotificationInput) {
  const channels = input.channels ?? [DeliveryChannel.IN_APP];

  const notifications = await prisma.$transaction(
    input.recipientIds.map((recipientId) =>
      prisma.notification.create({
        data: {
          tenantId: input.tenantId,
          recipientId,
          type: input.type,
          title: input.title,
          body: input.body,
          imageUrl: input.imageUrl,
          actionUrl: input.actionUrl,
          priority: input.priority ?? NotificationPriority.NORMAL,
          deliveries: {
            create: channels.map((channel) => ({
              channel,
              status: DeliveryStatus.PENDING,
            })),
          },
        },
      })
    )
  );

  return notifications;
}

// ══════════════════════════════════════════════════════════════════════════════
// DELIVERY TRACKING
// ══════════════════════════════════════════════════════════════════════════════

export async function updateDeliveryStatus(
  deliveryLogId: string,
  status: DeliveryStatus,
  details?: {
    providerMessageId?: string;
    errorCode?: string;
    errorMessage?: string;
  }
) {
  const updateData: Parameters<typeof prisma.deliveryLog.update>[0]['data'] = {
    status,
  };

  if (status === DeliveryStatus.SENT) {
    updateData.sentAt = new Date();
  } else if (status === DeliveryStatus.DELIVERED) {
    updateData.deliveredAt = new Date();
  }

  if (details?.providerMessageId) {
    updateData.providerMessageId = details.providerMessageId;
  }

  if (details?.errorCode) {
    updateData.errorCode = details.errorCode;
    updateData.errorMessage = details.errorMessage;
  }

  return prisma.deliveryLog.update({
    where: { id: deliveryLogId },
    data: updateData,
  });
}

export async function getPendingDeliveries(limit: number = 100) {
  return prisma.deliveryLog.findMany({
    where: {
      status: DeliveryStatus.PENDING,
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    include: {
      notification: true,
    },
    orderBy: [{ notification: { priority: 'desc' } }, { attemptedAt: 'asc' }],
    take: limit,
  });
}

export async function scheduleRetry(deliveryLogId: string, retryDelayMs: number = 60000) {
  return prisma.deliveryLog.update({
    where: { id: deliveryLogId },
    data: {
      retryCount: { increment: 1 },
      nextRetryAt: new Date(Date.now() + retryDelayMs),
      status: DeliveryStatus.PENDING,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ══════════════════════════════════════════════════════════════════════════════

export async function deleteExpiredNotifications() {
  const now = new Date();

  const result = await prisma.notification.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  return result.count;
}

export async function deleteOldNotifications(daysOld: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      isRead: true,
    },
  });

  return result.count;
}
