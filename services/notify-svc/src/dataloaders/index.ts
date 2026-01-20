/**
 * Notification Service DataLoaders
 *
 * Provides batched, cached data loading for notification entities.
 * Addresses P1: N+1 Query Prevention for notify-svc.
 *
 * @module notify-svc/dataloaders
 */

import {
  createIdLoader,
  createRelationLoader,
  type DataLoader,
} from '@aivo/ts-api-utils';
import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface NotificationDataLoaders {
  /** Load notifications by ID */
  notificationById: DataLoader<string, NotificationEntity>;
  /** Load notifications by user ID (returns array) */
  notificationsByUserId: DataLoader<string, NotificationEntity[]>;
  /** Load preferences by user ID */
  preferencesByUserId: DataLoader<string, PreferenceEntity>;
  /** Load device tokens by user ID (returns array) */
  deviceTokensByUserId: DataLoader<string, DeviceTokenEntity[]>;
  /** Load delivery logs by notification ID (returns array) */
  deliveryLogsByNotificationId: DataLoader<string, DeliveryLogEntity[]>;
  /** Load templates by ID */
  templateById: DataLoader<string, TemplateEntity>;
}

interface NotificationEntity {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  priority: string;
  data: object | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

interface PreferenceEntity {
  id: string;
  userId: string;
  tenantId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  preferences: object;
  updatedAt: Date;
}

interface DeviceTokenEntity {
  id: string;
  userId: string;
  token: string;
  platform: string;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
}

interface DeliveryLogEntity {
  id: string;
  notificationId: string;
  channel: string;
  status: string;
  attemptedAt: Date;
  deliveredAt: Date | null;
  errorMessage: string | null;
}

interface TemplateEntity {
  id: string;
  tenantId: string | null;
  name: string;
  type: string;
  subject: string | null;
  body: string;
  variables: object | null;
  isActive: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOADER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create DataLoaders for notification service.
 * Call once per request to ensure request-scoped caching.
 *
 * @param tenantId - Tenant ID for tenant-scoped queries
 * @returns Object containing all notification DataLoaders
 *
 * @example
 * ```typescript
 * // In request hook
 * fastify.addHook('preHandler', async (request) => {
 *   const tenantId = request.user?.tenantId;
 *   if (tenantId) {
 *     request.loaders = createNotificationDataLoaders(tenantId);
 *   }
 * });
 *
 * // In route handler - batch load notifications for multiple users
 * const notifications = await Promise.all(
 *   userIds.map(id => request.loaders.notificationsByUserId.load(id))
 * );
 * ```
 */
export function createNotificationDataLoaders(tenantId: string): NotificationDataLoaders {
  return {
    /**
     * Load notifications by ID with tenant scoping
     */
    notificationById: createIdLoader<string, NotificationEntity>(
      async (ids: string[]) => {
        return prisma.notification.findMany({
          where: {
            id: { in: ids },
            tenantId,
          },
        }) as Promise<NotificationEntity[]>;
      },
      { name: 'NotificationByIdLoader' }
    ),

    /**
     * Load notifications for users (one-to-many)
     */
    notificationsByUserId: createRelationLoader<NotificationEntity>(
      async (userIds: string[]) => {
        return prisma.notification.findMany({
          where: {
            userId: { in: userIds },
            tenantId,
          },
          orderBy: { createdAt: 'desc' },
          take: 100, // Limit to avoid huge result sets
        }) as Promise<NotificationEntity[]>;
      },
      (notification) => notification.userId,
      { name: 'NotificationsByUserLoader' }
    ),

    /**
     * Load preferences for users
     */
    preferencesByUserId: createIdLoader<string, PreferenceEntity>(
      async (userIds: string[]) => {
        const prefs = await prisma.notificationPreference.findMany({
          where: {
            userId: { in: userIds },
            tenantId,
          },
        });

        // Map by userId for correct ordering
        const prefMap = new Map(prefs.map((p) => [p.userId, p]));
        return userIds.map((userId) => prefMap.get(userId) ?? null);
      },
      { name: 'PreferencesByUserLoader' }
    ),

    /**
     * Load device tokens for users (one-to-many)
     */
    deviceTokensByUserId: createRelationLoader<DeviceTokenEntity>(
      async (userIds: string[]) => {
        return prisma.deviceToken.findMany({
          where: {
            userId: { in: userIds },
            isActive: true,
          },
        }) as Promise<DeviceTokenEntity[]>;
      },
      (token) => token.userId,
      { name: 'DeviceTokensByUserLoader' }
    ),

    /**
     * Load delivery logs for notifications (one-to-many)
     */
    deliveryLogsByNotificationId: createRelationLoader<DeliveryLogEntity>(
      async (notificationIds: string[]) => {
        return prisma.deliveryLog.findMany({
          where: { notificationId: { in: notificationIds } },
          orderBy: { attemptedAt: 'desc' },
        }) as Promise<DeliveryLogEntity[]>;
      },
      (log) => log.notificationId,
      { name: 'DeliveryLogsByNotificationLoader' }
    ),

    /**
     * Load templates by ID (tenant-scoped + global)
     */
    templateById: createIdLoader<string, TemplateEntity>(
      async (ids: string[]) => {
        return prisma.notificationTemplate.findMany({
          where: {
            id: { in: ids },
            OR: [{ tenantId }, { tenantId: null }],
          },
        }) as Promise<TemplateEntity[]>;
      },
      { name: 'TemplateByIdLoader' }
    ),
  };
}

export type { DataLoader };
