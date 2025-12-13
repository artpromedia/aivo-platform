/**
 * Notification Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before importing services
vi.mock('../src/prisma.js', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    deliveryLog: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  NotificationType: {
    SYSTEM: 'SYSTEM',
    ACHIEVEMENT: 'ACHIEVEMENT',
    REMINDER: 'REMINDER',
    GOAL_UPDATE: 'GOAL_UPDATE',
    MESSAGE: 'MESSAGE',
  },
  DeliveryChannel: {
    IN_APP: 'IN_APP',
    PUSH: 'PUSH',
    EMAIL: 'EMAIL',
    SMS: 'SMS',
  },
  NotificationPriority: {
    LOW: 'LOW',
    NORMAL: 'NORMAL',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
  },
  DeliveryStatus: {
    PENDING: 'PENDING',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    FAILED: 'FAILED',
  },
}));

import { prisma, NotificationType, DeliveryChannel, NotificationPriority, DeliveryStatus } from '../src/prisma.js';
import * as notificationService from '../src/services/notificationService.js';

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification with default channel', async () => {
      const mockNotification = {
        id: 'notif-1',
        tenantId: 'tenant-1',
        recipientId: 'user-1',
        type: NotificationType.ACHIEVEMENT,
        title: 'Great job!',
        body: 'You completed a goal',
        priority: NotificationPriority.NORMAL,
        deliveries: [{ id: 'del-1', channel: DeliveryChannel.IN_APP }],
      };

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any);

      const result = await notificationService.createNotification({
        tenantId: 'tenant-1',
        recipientId: 'user-1',
        type: NotificationType.ACHIEVEMENT,
        title: 'Great job!',
        body: 'You completed a goal',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          recipientId: 'user-1',
          type: NotificationType.ACHIEVEMENT,
          title: 'Great job!',
          body: 'You completed a goal',
          priority: NotificationPriority.NORMAL,
          deliveries: {
            create: [{ channel: DeliveryChannel.IN_APP, status: DeliveryStatus.PENDING }],
          },
        }),
        include: { deliveries: true },
      });

      expect(result.id).toBe('notif-1');
    });

    it('should create notification with multiple channels', async () => {
      const mockNotification = {
        id: 'notif-2',
        tenantId: 'tenant-1',
        recipientId: 'user-1',
        type: NotificationType.REMINDER,
        title: 'Reminder',
        body: 'You have a session',
        priority: NotificationPriority.HIGH,
        deliveries: [
          { channel: DeliveryChannel.IN_APP },
          { channel: DeliveryChannel.PUSH },
        ],
      };

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any);

      await notificationService.createNotification({
        tenantId: 'tenant-1',
        recipientId: 'user-1',
        type: NotificationType.REMINDER,
        title: 'Reminder',
        body: 'You have a session',
        priority: NotificationPriority.HIGH,
        channels: [DeliveryChannel.IN_APP, DeliveryChannel.PUSH],
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: NotificationPriority.HIGH,
            deliveries: {
              create: [
                { channel: DeliveryChannel.IN_APP, status: DeliveryStatus.PENDING },
                { channel: DeliveryChannel.PUSH, status: DeliveryStatus.PENDING },
              ],
            },
          }),
        })
      );
    });
  });

  describe('listNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'First' },
        { id: 'notif-2', title: 'Second' },
      ];

      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications as any);
      vi.mocked(prisma.notification.count).mockResolvedValue(10);

      const result = await notificationService.listNotifications(
        { tenantId: 'tenant-1', recipientId: 'user-1' },
        { page: 1, pageSize: 2 }
      );

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(5);
    });

    it('should filter by isRead', async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
      vi.mocked(prisma.notification.count).mockResolvedValue(0);

      await notificationService.listNotifications({
        tenantId: 'tenant-1',
        recipientId: 'user-1',
        isRead: false,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isRead: false,
          }),
        })
      );
    });

    it('should filter by type', async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
      vi.mocked(prisma.notification.count).mockResolvedValue(0);

      await notificationService.listNotifications({
        tenantId: 'tenant-1',
        recipientId: 'user-1',
        type: NotificationType.ACHIEVEMENT,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: NotificationType.ACHIEVEMENT,
          }),
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read with timestamp', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 });

      await notificationService.markAsRead('notif-1', 'tenant-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', tenantId: 'tenant-1' },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 });

      await notificationService.markAllAsRead('tenant-1', 'user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', recipientId: 'user-1', isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      vi.mocked(prisma.notification.count).mockResolvedValue(7);

      const count = await notificationService.getUnreadCount('tenant-1', 'user-1');

      expect(count).toBe(7);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', recipientId: 'user-1', isRead: false, isDismissed: false },
      });
    });
  });

  describe('dismissNotification', () => {
    it('should dismiss notification', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 });

      await notificationService.dismissNotification('notif-1', 'tenant-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', tenantId: 'tenant-1' },
        data: { isDismissed: true, dismissedAt: expect.any(Date) },
      });
    });
  });

  describe('createBulkNotifications', () => {
    it('should create notifications for multiple recipients', async () => {
      const recipientIds = ['user-1', 'user-2', 'user-3'];
      const mockNotifications = recipientIds.map((id, i) => ({
        id: `notif-${i}`,
        recipientId: id,
      }));

      vi.mocked(prisma.$transaction).mockResolvedValue(mockNotifications);

      const result = await notificationService.createBulkNotifications({
        tenantId: 'tenant-1',
        recipientIds,
        type: NotificationType.SYSTEM,
        title: 'System Update',
        body: 'New features available',
      });

      expect(result).toHaveLength(3);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
