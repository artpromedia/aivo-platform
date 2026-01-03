/**
 * In-App Notification Repository
 *
 * Database operations for in-app notifications
 */

import { prisma, NotificationPriority, DeliveryChannel, DeliveryStatus } from '../../prisma.js';
import type { NotificationType, Notification } from '../../prisma.js';

import type {
  InAppNotification,
  CreateInAppNotificationInput,
  InAppNotificationFilters,
  InAppNotificationListResult,
  MarkReadResult,
  NotificationGroupSummary,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CREATE OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new in-app notification
 */
export async function createInAppNotification(
  input: CreateInAppNotificationInput
): Promise<InAppNotification> {
  const notification = await prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      imageUrl: input.imageUrl ?? null,
      actionUrl: input.actionUrl ?? null,
      actionData: input.actionData as object,
      priority: input.priority ?? NotificationPriority.NORMAL,
      groupKey: input.groupKey ?? null,
      collapseKey: input.collapseKey ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      expiresAt: input.expiresAt ?? null,
      deliveries: {
        create: {
          channel: DeliveryChannel.IN_APP,
          status: DeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      },
    },
  });

  return mapToInAppNotification(notification);
}

/**
 * Create multiple in-app notifications
 */
export async function createBulkInAppNotifications(
  inputs: CreateInAppNotificationInput[]
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;

  // Use transaction for bulk creation
  await prisma.$transaction(async (tx) => {
    for (const input of inputs) {
      try {
        await tx.notification.create({
          data: {
            tenantId: input.tenantId,
            recipientId: input.recipientId,
            type: input.type,
            title: input.title,
            body: input.body,
            imageUrl: input.imageUrl ?? null,
            actionUrl: input.actionUrl ?? null,
            actionData: input.actionData as object,
            priority: input.priority ?? NotificationPriority.NORMAL,
            groupKey: input.groupKey ?? null,
            collapseKey: input.collapseKey ?? null,
            sourceType: input.sourceType ?? null,
            sourceId: input.sourceId ?? null,
            expiresAt: input.expiresAt ?? null,
            deliveries: {
              create: {
                channel: DeliveryChannel.IN_APP,
                status: DeliveryStatus.DELIVERED,
                deliveredAt: new Date(),
              },
            },
          },
        });
        created++;
      } catch (error) {
        console.error('[InAppRepository] Failed to create notification', { error });
        failed++;
      }
    }
  });

  return { created, failed };
}

// ══════════════════════════════════════════════════════════════════════════════
// READ OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get notification by ID
 */
export async function getInAppNotificationById(
  id: string,
  tenantId: string
): Promise<InAppNotification | null> {
  const notification = await prisma.notification.findFirst({
    where: { id, tenantId },
  });

  return notification ? mapToInAppNotification(notification) : null;
}

/**
 * List notifications with filters
 */
export async function listInAppNotifications(
  filters: InAppNotificationFilters,
  pagination: { page?: number; pageSize?: number } = {}
): Promise<InAppNotificationListResult> {
  const { page = 1, pageSize = 20 } = pagination;
  const skip = (page - 1) * pageSize;

  const where = buildWhereClause(filters);

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        ...where,
        isRead: false,
        isDismissed: false,
      },
    }),
  ]);

  return {
    notifications: notifications.map(mapToInAppNotification),
    total,
    unreadCount,
  };
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(
  tenantId: string,
  recipientId: string
): Promise<number> {
  return prisma.notification.count({
    where: {
      tenantId,
      recipientId,
      isRead: false,
      isDismissed: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });
}

/**
 * Get grouped notifications
 */
export async function getGroupedNotifications(
  tenantId: string,
  recipientId: string,
  limit = 10
): Promise<NotificationGroupSummary[]> {
  // Get distinct group keys with their latest notification
  const groups = await prisma.notification.groupBy({
    by: ['groupKey'],
    where: {
      tenantId,
      recipientId,
      groupKey: { not: null },
      isDismissed: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  });

  const summaries: NotificationGroupSummary[] = [];

  for (const group of groups) {
    if (!group.groupKey) continue;

    const [latest, unreadCount] = await Promise.all([
      prisma.notification.findFirst({
        where: {
          tenantId,
          recipientId,
          groupKey: group.groupKey,
          isDismissed: false,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: {
          tenantId,
          recipientId,
          groupKey: group.groupKey,
          isRead: false,
          isDismissed: false,
        },
      }),
    ]);

    if (latest) {
      summaries.push({
        groupKey: group.groupKey,
        count: group._count.id,
        latestNotification: mapToInAppNotification(latest),
        hasUnread: unreadCount > 0,
      });
    }
  }

  return summaries;
}

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Mark notification as read
 */
export async function markAsRead(
  id: string,
  tenantId: string,
  recipientId: string
): Promise<MarkReadResult> {
  const result = await prisma.notification.updateMany({
    where: {
      id,
      tenantId,
      recipientId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    success: result.count > 0,
    updatedCount: result.count,
  };
}

/**
 * Mark multiple notifications as read
 */
export async function markMultipleAsRead(
  ids: string[],
  tenantId: string,
  recipientId: string
): Promise<MarkReadResult> {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: ids },
      tenantId,
      recipientId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    success: result.count > 0,
    updatedCount: result.count,
  };
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
  tenantId: string,
  recipientId: string,
  types?: NotificationType[]
): Promise<MarkReadResult> {
  const where: Parameters<typeof prisma.notification.updateMany>[0]['where'] = {
    tenantId,
    recipientId,
    isRead: false,
    isDismissed: false,
  };

  if (types?.length) {
    where.type = { in: types };
  }

  const result = await prisma.notification.updateMany({
    where,
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    success: result.count > 0,
    updatedCount: result.count,
  };
}

/**
 * Dismiss notification (archive)
 */
export async function dismissNotification(
  id: string,
  tenantId: string,
  recipientId: string
): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: {
      id,
      tenantId,
      recipientId,
      isDismissed: false,
    },
    data: {
      isDismissed: true,
      dismissedAt: new Date(),
    },
  });

  return result.count > 0;
}

/**
 * Dismiss all notifications for a user
 */
export async function dismissAllNotifications(
  tenantId: string,
  recipientId: string
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      tenantId,
      recipientId,
      isDismissed: false,
    },
    data: {
      isDismissed: true,
      dismissedAt: new Date(),
    },
  });

  return result.count;
}

// ══════════════════════════════════════════════════════════════════════════════
// DELETE OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Delete notification
 */
export async function deleteNotification(
  id: string,
  tenantId: string,
  recipientId: string
): Promise<boolean> {
  try {
    await prisma.notification.delete({
      where: {
        id,
        tenantId,
        recipientId,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete expired notifications
 */
export async function deleteExpiredNotifications(): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: {
      expiresAt: { lte: new Date() },
    },
  });

  return result.count;
}

/**
 * Delete old dismissed notifications (cleanup)
 */
export async function deleteOldDismissedNotifications(
  olderThanDays = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await prisma.notification.deleteMany({
    where: {
      isDismissed: true,
      dismissedAt: { lte: cutoffDate },
    },
  });

  return result.count;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

interface NotificationWhereInput {
  tenantId?: string;
  recipientId?: string;
  type?: NotificationType | { in: NotificationType[] };
  isRead?: boolean;
  isDismissed?: boolean;
  groupKey?: string;
  sourceType?: string;
  createdAt?: { gte?: Date; lte?: Date };
  OR?: ({ expiresAt: null } | { expiresAt: { gt: Date } })[];
}

function buildWhereClause(
  filters: InAppNotificationFilters
): NotificationWhereInput {
  const where: NotificationWhereInput = {
    tenantId: filters.tenantId,
    recipientId: filters.recipientId,
  };

  if (filters.type) {
    where.type = Array.isArray(filters.type)
      ? { in: filters.type }
      : filters.type;
  }

  if (filters.isRead !== undefined) {
    where.isRead = filters.isRead;
  }

  if (filters.isDismissed === undefined) {
    // By default, don't show dismissed notifications
    where.isDismissed = false;
  } else {
    where.isDismissed = filters.isDismissed;
  }

  if (filters.groupKey) {
    where.groupKey = filters.groupKey;
  }

  if (filters.sourceType) {
    where.sourceType = filters.sourceType;
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) { where.createdAt.gte = filters.fromDate; }
    if (filters.toDate) { where.createdAt.lte = filters.toDate; }
  }

  // Exclude expired notifications
  where.OR = [
    { expiresAt: null },
    { expiresAt: { gt: new Date() } },
  ];

  return where;
}

function mapToInAppNotification(notification: Notification): InAppNotification {
  const result: InAppNotification = {
    id: notification.id,
    tenantId: notification.tenantId,
    recipientId: notification.recipientId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    priority: notification.priority,
    isRead: notification.isRead,
    isDismissed: notification.isDismissed,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };

  if (notification.imageUrl !== null) {
    result.imageUrl = notification.imageUrl;
  }
  if (notification.actionUrl !== null) {
    result.actionUrl = notification.actionUrl;
  }
  if (notification.actionData !== null) {
    result.actionData = notification.actionData as Record<string, unknown>;
  }
  if (notification.groupKey !== null) {
    result.groupKey = notification.groupKey;
  }
  if (notification.collapseKey !== null) {
    result.collapseKey = notification.collapseKey;
  }
  if (notification.sourceType !== null) {
    result.sourceType = notification.sourceType;
  }
  if (notification.sourceId !== null) {
    result.sourceId = notification.sourceId;
  }
  if (notification.readAt !== null) {
    result.readAt = notification.readAt;
  }
  if (notification.dismissedAt !== null) {
    result.dismissedAt = notification.dismissedAt;
  }
  if (notification.expiresAt !== null) {
    result.expiresAt = notification.expiresAt;
  }

  return result;
}
