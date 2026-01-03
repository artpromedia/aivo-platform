/**
 * In-App Notification Types
 */

import type { NotificationType, NotificationPriority } from '../../prisma.js';

export interface InAppNotification {
  id: string;
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  actionData?: Record<string, unknown>;
  priority: NotificationPriority;
  groupKey?: string;
  collapseKey?: string;
  sourceType?: string;
  sourceId?: string;
  isRead: boolean;
  readAt?: Date;
  isDismissed: boolean;
  dismissedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInAppNotificationInput {
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  actionData?: Record<string, unknown>;
  priority?: NotificationPriority;
  groupKey?: string;
  collapseKey?: string;
  sourceType?: string;
  sourceId?: string;
  expiresAt?: Date;
}

export interface InAppNotificationFilters {
  tenantId: string;
  recipientId: string;
  type?: NotificationType | NotificationType[];
  isRead?: boolean;
  isDismissed?: boolean;
  groupKey?: string;
  sourceType?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface InAppNotificationListResult {
  notifications: InAppNotification[];
  total: number;
  unreadCount: number;
}

export interface MarkReadResult {
  success: boolean;
  updatedCount: number;
}

export interface InAppDeliveryResult {
  success: boolean;
  notificationId?: string;
  error?: string;
  deliveredAt?: Date;
}

export interface NotificationGroupSummary {
  groupKey: string;
  count: number;
  latestNotification: InAppNotification;
  hasUnread: boolean;
}

export type RealtimeEvent = 
  | { type: 'notification:new'; notification: InAppNotification }
  | { type: 'notification:read'; notificationId: string }
  | { type: 'notification:dismissed'; notificationId: string }
  | { type: 'notifications:all_read'; count: number }
  | { type: 'unread_count:updated'; count: number };

export interface RealtimeHandler {
  emit(userId: string, event: RealtimeEvent): Promise<void>;
}
