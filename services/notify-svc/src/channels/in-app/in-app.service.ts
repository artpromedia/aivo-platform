/**
 * In-App Notification Service
 *
 * High-level service for in-app notifications:
 * - Real-time delivery via WebSocket/SSE
 * - Notification center management
 * - Read/unread status tracking
 * - Notification grouping and collapsing
 * - Unread count management with caching
 */

import { EventEmitter } from 'node:events';

import type { NotificationType } from '../../prisma.js';

import * as repository from './in-app.repository.js';
import type {
  InAppNotification,
  CreateInAppNotificationInput,
  InAppNotificationFilters,
  InAppNotificationListResult,
  MarkReadResult,
  NotificationGroupSummary,
  InAppDeliveryResult,
  RealtimeEvent,
  RealtimeHandler,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// IN-APP SERVICE
// ══════════════════════════════════════════════════════════════════════════════

class InAppNotificationService {
  private realtimeHandler: RealtimeHandler | undefined;
  private readonly eventEmitter = new EventEmitter();
  private readonly unreadCountCache = new Map<string, { count: number; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  /**
   * Set the realtime handler for pushing notifications
   */
  setRealtimeHandler(handler: RealtimeHandler): void {
    this.realtimeHandler = handler;
  }

  /**
   * Send an in-app notification
   */
  async send(input: CreateInAppNotificationInput): Promise<InAppDeliveryResult> {
    try {
      const notification = await repository.createInAppNotification(input);

      // Invalidate unread count cache
      this.invalidateUnreadCache(input.tenantId, input.recipientId);

      // Emit real-time event
      await this.emitRealtimeEvent(input.recipientId, {
        type: 'notification:new',
        notification,
      });

      // Emit internal event for tracking
      this.eventEmitter.emit('notification:created', notification);

      console.log('[InAppService] Notification sent', {
        id: notification.id,
        recipientId: input.recipientId,
        type: input.type,
      });

      return {
        success: true,
        notificationId: notification.id,
        deliveredAt: new Date(),
      };
    } catch (error) {
      console.error('[InAppService] Failed to send notification', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk in-app notifications
   */
  async sendBulk(inputs: CreateInAppNotificationInput[]): Promise<{ sent: number; failed: number }> {
    const result = await repository.createBulkInAppNotifications(inputs);

    // Invalidate cache for all recipients
    const recipientSet = new Set(inputs.map((i) => `${i.tenantId}:${i.recipientId}`));
    for (const key of recipientSet) {
      const [tenantId, recipientId] = key.split(':') as [string, string];
      if (tenantId && recipientId) {
        this.invalidateUnreadCache(tenantId, recipientId);
      }
    }

    return { sent: result.created, failed: result.failed };
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    filters: InAppNotificationFilters,
    pagination?: { page?: number; pageSize?: number }
  ): Promise<InAppNotificationListResult> {
    return repository.listInAppNotifications(filters, pagination);
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(
    id: string,
    tenantId: string
  ): Promise<InAppNotification | null> {
    return repository.getInAppNotificationById(id, tenantId);
  }

  /**
   * Get unread count for a user (with caching)
   */
  async getUnreadCount(tenantId: string, recipientId: string): Promise<number> {
    const cacheKey = this.getCacheKey(tenantId, recipientId);
    const cached = this.unreadCountCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.count;
    }

    const count = await repository.getUnreadCount(tenantId, recipientId);

    this.unreadCountCache.set(cacheKey, {
      count,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return count;
  }

  /**
   * Get grouped notifications
   */
  async getGroupedNotifications(
    tenantId: string,
    recipientId: string,
    limit?: number
  ): Promise<NotificationGroupSummary[]> {
    return repository.getGroupedNotifications(tenantId, recipientId, limit);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    id: string,
    tenantId: string,
    recipientId: string
  ): Promise<MarkReadResult> {
    const result = await repository.markAsRead(id, tenantId, recipientId);

    if (result.success) {
      this.invalidateUnreadCache(tenantId, recipientId);

      await this.emitRealtimeEvent(recipientId, {
        type: 'notification:read',
        notificationId: id,
      });

      // Emit updated unread count
      const newCount = await this.getUnreadCount(tenantId, recipientId);
      await this.emitRealtimeEvent(recipientId, {
        type: 'unread_count:updated',
        count: newCount,
      });
    }

    return result;
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(
    ids: string[],
    tenantId: string,
    recipientId: string
  ): Promise<MarkReadResult> {
    const result = await repository.markMultipleAsRead(ids, tenantId, recipientId);

    if (result.success) {
      this.invalidateUnreadCache(tenantId, recipientId);

      const newCount = await this.getUnreadCount(tenantId, recipientId);
      await this.emitRealtimeEvent(recipientId, {
        type: 'unread_count:updated',
        count: newCount,
      });
    }

    return result;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(
    tenantId: string,
    recipientId: string,
    types?: NotificationType[]
  ): Promise<MarkReadResult> {
    const result = await repository.markAllAsRead(tenantId, recipientId, types);

    if (result.success) {
      this.invalidateUnreadCache(tenantId, recipientId);

      await this.emitRealtimeEvent(recipientId, {
        type: 'notifications:all_read',
        count: result.updatedCount,
      });

      await this.emitRealtimeEvent(recipientId, {
        type: 'unread_count:updated',
        count: 0,
      });
    }

    return result;
  }

  /**
   * Dismiss (archive) a notification
   */
  async dismiss(
    id: string,
    tenantId: string,
    recipientId: string
  ): Promise<boolean> {
    const success = await repository.dismissNotification(id, tenantId, recipientId);

    if (success) {
      this.invalidateUnreadCache(tenantId, recipientId);

      await this.emitRealtimeEvent(recipientId, {
        type: 'notification:dismissed',
        notificationId: id,
      });

      const newCount = await this.getUnreadCount(tenantId, recipientId);
      await this.emitRealtimeEvent(recipientId, {
        type: 'unread_count:updated',
        count: newCount,
      });
    }

    return success;
  }

  /**
   * Dismiss all notifications
   */
  async dismissAll(tenantId: string, recipientId: string): Promise<number> {
    const count = await repository.dismissAllNotifications(tenantId, recipientId);

    if (count > 0) {
      this.invalidateUnreadCache(tenantId, recipientId);

      await this.emitRealtimeEvent(recipientId, {
        type: 'unread_count:updated',
        count: 0,
      });
    }

    return count;
  }

  /**
   * Delete a notification
   */
  async delete(
    id: string,
    tenantId: string,
    recipientId: string
  ): Promise<boolean> {
    const success = await repository.deleteNotification(id, tenantId, recipientId);

    if (success) {
      this.invalidateUnreadCache(tenantId, recipientId);
    }

    return success;
  }

  /**
   * Cleanup expired notifications
   */
  async cleanupExpired(): Promise<number> {
    const count = await repository.deleteExpiredNotifications();
    console.log('[InAppService] Deleted expired notifications', { count });
    return count;
  }

  /**
   * Cleanup old dismissed notifications
   */
  async cleanupOldDismissed(olderThanDays = 30): Promise<number> {
    const count = await repository.deleteOldDismissedNotifications(olderThanDays);
    console.log('[InAppService] Deleted old dismissed notifications', { count });
    return count;
  }

  /**
   * Subscribe to internal events
   */
  on(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribe from internal events
   */
  off(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private getCacheKey(tenantId: string, recipientId: string): string {
    return `${tenantId}:${recipientId}`;
  }

  private invalidateUnreadCache(tenantId: string, recipientId: string): void {
    const key = this.getCacheKey(tenantId, recipientId);
    this.unreadCountCache.delete(key);
  }

  private async emitRealtimeEvent(userId: string, event: RealtimeEvent): Promise<void> {
    if (this.realtimeHandler !== undefined) {
      try {
        await this.realtimeHandler.emit(userId, event);
      } catch (error) {
        console.error('[InAppService] Failed to emit realtime event', { error });
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const inAppService = new InAppNotificationService();
