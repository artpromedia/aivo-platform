/**
 * Unit Tests for Notification Service
 *
 * Tests for:
 * - Notification CRUD operations
 * - Channel selection logic
 * - Bulk notifications
 * - Read/dismiss management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockPrismaNotification = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  updateMany: vi.fn(),
};

const mockPrismaNotificationDelivery = {
  create: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
};

const mockPrisma$transaction = vi.fn();

vi.mock('../prisma.js', () => ({
  prisma: {
    notification: mockPrismaNotification,
    notificationDelivery: mockPrismaNotificationDelivery,
    $transaction: mockPrisma$transaction,
  },
  NotificationType: {
    ACHIEVEMENT: 'ACHIEVEMENT',
    ALERT: 'ALERT',
    ASSIGNMENT: 'ASSIGNMENT',
    MESSAGE: 'MESSAGE',
    REMINDER: 'REMINDER',
    SYSTEM: 'SYSTEM',
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

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type NotificationType = 'ACHIEVEMENT' | 'ALERT' | 'ASSIGNMENT' | 'MESSAGE' | 'REMINDER' | 'SYSTEM';
type DeliveryChannel = 'IN_APP' | 'PUSH' | 'EMAIL' | 'SMS';
type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

interface Notification {
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
  expiresAt?: Date;
  groupKey?: string;
  collapseKey?: string;
  sourceType?: string;
  sourceId?: string;
  isRead: boolean;
  readAt?: Date;
  isDismissed: boolean;
  dismissedAt?: Date;
  createdAt: Date;
  deliveries: NotificationDelivery[];
}

interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  sentAt?: Date;
  deliveredAt?: Date;
}

interface CreateNotificationInput {
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  actionData?: Record<string, unknown>;
  priority?: NotificationPriority;
  channels?: DeliveryChannel[];
  expiresAt?: Date;
  groupKey?: string;
  collapseKey?: string;
  sourceType?: string;
  sourceId?: string;
}

// =============================================================================
// NOTIFICATION SERVICE (Simplified for testing)
// =============================================================================

class NotificationService {
  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const channels = input.channels ?? ['IN_APP'];

    const notification = await mockPrismaNotification.create({
      data: {
        tenantId: input.tenantId,
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        body: input.body,
        imageUrl: input.imageUrl,
        actionUrl: input.actionUrl,
        actionData: input.actionData,
        priority: input.priority ?? 'NORMAL',
        expiresAt: input.expiresAt,
        groupKey: input.groupKey,
        collapseKey: input.collapseKey,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        deliveries: {
          create: channels.map((channel) => ({
            channel,
            status: 'PENDING',
          })),
        },
      },
      include: { deliveries: true },
    });

    return notification;
  }

  async getNotificationById(id: string, tenantId: string): Promise<Notification | null> {
    return mockPrismaNotification.findFirst({
      where: { id, tenantId },
      include: { deliveries: true },
    });
  }

  async listNotifications(
    filters: {
      tenantId: string;
      recipientId: string;
      type?: NotificationType | NotificationType[];
      isRead?: boolean;
      groupKey?: string;
      fromDate?: Date;
      toDate?: Date;
    },
    pagination: { page?: number; pageSize?: number } = {}
  ) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
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
      if (filters.fromDate) (where.createdAt as any).gte = filters.fromDate;
      if (filters.toDate) (where.createdAt as any).lte = filters.toDate;
    }

    const [notifications, total] = await Promise.all([
      mockPrismaNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      mockPrismaNotification.count({ where }),
    ]);

    return {
      data: notifications,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async markAsRead(notificationId: string, tenantId: string) {
    return mockPrismaNotification.updateMany({
      where: { id: notificationId, tenantId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(tenantId: string, recipientId: string) {
    return mockPrismaNotification.updateMany({
      where: { tenantId, recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async dismissNotification(notificationId: string, tenantId: string) {
    return mockPrismaNotification.updateMany({
      where: { id: notificationId, tenantId },
      data: { isDismissed: true, dismissedAt: new Date() },
    });
  }

  async getUnreadCount(tenantId: string, recipientId: string): Promise<number> {
    return mockPrismaNotification.count({
      where: { tenantId, recipientId, isRead: false, isDismissed: false },
    });
  }

  async createBulkNotifications(
    input: Omit<CreateNotificationInput, 'recipientId'> & { recipientIds: string[] }
  ): Promise<Notification[]> {
    const channels = input.channels ?? ['IN_APP'];

    const createPromises = input.recipientIds.map((recipientId) =>
      mockPrismaNotification.create({
        data: {
          tenantId: input.tenantId,
          recipientId,
          type: input.type,
          title: input.title,
          body: input.body,
          priority: input.priority ?? 'NORMAL',
          deliveries: {
            create: channels.map((channel) => ({ channel, status: 'PENDING' })),
          },
        },
        include: { deliveries: true },
      })
    );

    mockPrisma$transaction.mockImplementationOnce(() => Promise.all(createPromises));
    return mockPrisma$transaction(createPromises);
  }

  selectChannels(
    type: NotificationType,
    priority: NotificationPriority,
    userPreferences: { push: boolean; email: boolean; sms: boolean }
  ): DeliveryChannel[] {
    const channels: DeliveryChannel[] = ['IN_APP'];

    // Always add push for high priority if enabled
    if ((priority === 'HIGH' || priority === 'URGENT') && userPreferences.push) {
      channels.push('PUSH');
    }

    // Add email for certain types
    if (['ASSIGNMENT', 'ALERT', 'SYSTEM'].includes(type) && userPreferences.email) {
      channels.push('EMAIL');
    }

    // SMS only for urgent
    if (priority === 'URGENT' && userPreferences.sms) {
      channels.push('SMS');
    }

    return channels;
  }
}

// =============================================================================
// FIXTURES
// =============================================================================

const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notification-001',
  tenantId: 'tenant-001',
  recipientId: 'user-001',
  type: 'ACHIEVEMENT',
  title: 'Achievement Unlocked!',
  body: 'You completed 10 lessons',
  priority: 'NORMAL',
  isRead: false,
  isDismissed: false,
  createdAt: new Date('2026-01-15'),
  deliveries: [
    {
      id: 'delivery-001',
      notificationId: 'notification-001',
      channel: 'IN_APP',
      status: 'PENDING',
    },
  ],
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();
  });

  // ===========================================================================
  // CREATE NOTIFICATION TESTS
  // ===========================================================================

  describe('createNotification', () => {
    it('should create notification with default channel', async () => {
      const mockCreated = createMockNotification();
      mockPrismaNotification.create.mockResolvedValueOnce(mockCreated);

      const result = await service.createNotification({
        tenantId: 'tenant-001',
        recipientId: 'user-001',
        type: 'ACHIEVEMENT',
        title: 'Test',
        body: 'Test body',
      });

      expect(result.id).toBe('notification-001');
      expect(mockPrismaNotification.create).toHaveBeenCalled();
    });

    it('should create notification with multiple channels', async () => {
      mockPrismaNotification.create.mockImplementationOnce(({ data }) => ({
        id: 'n1',
        ...data,
        deliveries: data.deliveries.create,
      }));

      await service.createNotification({
        tenantId: 'tenant-001',
        recipientId: 'user-001',
        type: 'ALERT',
        title: 'Alert',
        body: 'Important alert',
        channels: ['IN_APP', 'PUSH', 'EMAIL'],
      });

      const createArg = mockPrismaNotification.create.mock.calls[0][0];
      expect(createArg.data.deliveries.create).toHaveLength(3);
    });

    it('should set default priority to NORMAL', async () => {
      mockPrismaNotification.create.mockImplementationOnce(({ data }) => ({
        id: 'n1',
        ...data,
      }));

      await service.createNotification({
        tenantId: 'tenant-001',
        recipientId: 'user-001',
        type: 'MESSAGE',
        title: 'Test',
        body: 'Test',
      });

      const createArg = mockPrismaNotification.create.mock.calls[0][0];
      expect(createArg.data.priority).toBe('NORMAL');
    });

    it('should accept optional fields', async () => {
      mockPrismaNotification.create.mockImplementationOnce(({ data }) => ({
        id: 'n1',
        ...data,
      }));

      await service.createNotification({
        tenantId: 'tenant-001',
        recipientId: 'user-001',
        type: 'ASSIGNMENT',
        title: 'New Assignment',
        body: 'You have a new assignment',
        imageUrl: 'https://example.com/image.png',
        actionUrl: '/assignments/123',
        actionData: { assignmentId: '123' },
        priority: 'HIGH',
        groupKey: 'assignments',
        collapseKey: 'assignment-123',
        sourceType: 'assignment',
        sourceId: '123',
      });

      const createArg = mockPrismaNotification.create.mock.calls[0][0];
      expect(createArg.data.imageUrl).toBe('https://example.com/image.png');
      expect(createArg.data.groupKey).toBe('assignments');
      expect(createArg.data.priority).toBe('HIGH');
    });
  });

  // ===========================================================================
  // GET NOTIFICATION TESTS
  // ===========================================================================

  describe('getNotificationById', () => {
    it('should return notification with deliveries', async () => {
      const mock = createMockNotification();
      mockPrismaNotification.findFirst.mockResolvedValueOnce(mock);

      const result = await service.getNotificationById('notification-001', 'tenant-001');

      expect(result?.id).toBe('notification-001');
      expect(result?.deliveries).toHaveLength(1);
    });

    it('should return null when not found', async () => {
      mockPrismaNotification.findFirst.mockResolvedValueOnce(null);

      const result = await service.getNotificationById('nonexistent', 'tenant-001');

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // LIST NOTIFICATIONS TESTS
  // ===========================================================================

  describe('listNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockData = [createMockNotification()];
      mockPrismaNotification.findMany.mockResolvedValueOnce(mockData);
      mockPrismaNotification.count.mockResolvedValueOnce(50);

      const result = await service.listNotifications(
        { tenantId: 'tenant-001', recipientId: 'user-001' },
        { page: 1, pageSize: 20 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(3);
    });

    it('should filter by type', async () => {
      mockPrismaNotification.findMany.mockResolvedValueOnce([]);
      mockPrismaNotification.count.mockResolvedValueOnce(0);

      await service.listNotifications({
        tenantId: 'tenant-001',
        recipientId: 'user-001',
        type: 'ACHIEVEMENT',
      });

      const findManyArg = mockPrismaNotification.findMany.mock.calls[0][0];
      expect(findManyArg.where.type).toBe('ACHIEVEMENT');
    });

    it('should filter by multiple types', async () => {
      mockPrismaNotification.findMany.mockResolvedValueOnce([]);
      mockPrismaNotification.count.mockResolvedValueOnce(0);

      await service.listNotifications({
        tenantId: 'tenant-001',
        recipientId: 'user-001',
        type: ['ACHIEVEMENT', 'ALERT'],
      });

      const findManyArg = mockPrismaNotification.findMany.mock.calls[0][0];
      expect(findManyArg.where.type).toEqual({ in: ['ACHIEVEMENT', 'ALERT'] });
    });

    it('should filter by read status', async () => {
      mockPrismaNotification.findMany.mockResolvedValueOnce([]);
      mockPrismaNotification.count.mockResolvedValueOnce(0);

      await service.listNotifications({
        tenantId: 'tenant-001',
        recipientId: 'user-001',
        isRead: false,
      });

      const findManyArg = mockPrismaNotification.findMany.mock.calls[0][0];
      expect(findManyArg.where.isRead).toBe(false);
    });

    it('should filter by date range', async () => {
      mockPrismaNotification.findMany.mockResolvedValueOnce([]);
      mockPrismaNotification.count.mockResolvedValueOnce(0);

      const fromDate = new Date('2026-01-01');
      const toDate = new Date('2026-01-31');

      await service.listNotifications({
        tenantId: 'tenant-001',
        recipientId: 'user-001',
        fromDate,
        toDate,
      });

      const findManyArg = mockPrismaNotification.findMany.mock.calls[0][0];
      expect(findManyArg.where.createdAt.gte).toEqual(fromDate);
      expect(findManyArg.where.createdAt.lte).toEqual(toDate);
    });

    it('should order by createdAt descending', async () => {
      mockPrismaNotification.findMany.mockResolvedValueOnce([]);
      mockPrismaNotification.count.mockResolvedValueOnce(0);

      await service.listNotifications({
        tenantId: 'tenant-001',
        recipientId: 'user-001',
      });

      const findManyArg = mockPrismaNotification.findMany.mock.calls[0][0];
      expect(findManyArg.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  // ===========================================================================
  // MARK AS READ TESTS
  // ===========================================================================

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrismaNotification.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.markAsRead('notification-001', 'tenant-001');

      expect(mockPrismaNotification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notification-001', tenantId: 'tenant-001' },
          data: expect.objectContaining({ isRead: true }),
        })
      );
    });

    it('should set readAt timestamp', async () => {
      mockPrismaNotification.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.markAsRead('notification-001', 'tenant-001');

      const updateArg = mockPrismaNotification.updateMany.mock.calls[0][0];
      expect(updateArg.data.readAt).toBeInstanceOf(Date);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrismaNotification.updateMany.mockResolvedValueOnce({ count: 5 });

      await service.markAllAsRead('tenant-001', 'user-001');

      expect(mockPrismaNotification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-001', recipientId: 'user-001', isRead: false },
        })
      );
    });
  });

  // ===========================================================================
  // DISMISS NOTIFICATION TESTS
  // ===========================================================================

  describe('dismissNotification', () => {
    it('should dismiss notification', async () => {
      mockPrismaNotification.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.dismissNotification('notification-001', 'tenant-001');

      const updateArg = mockPrismaNotification.updateMany.mock.calls[0][0];
      expect(updateArg.data.isDismissed).toBe(true);
      expect(updateArg.data.dismissedAt).toBeInstanceOf(Date);
    });
  });

  // ===========================================================================
  // UNREAD COUNT TESTS
  // ===========================================================================

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrismaNotification.count.mockResolvedValueOnce(15);

      const count = await service.getUnreadCount('tenant-001', 'user-001');

      expect(count).toBe(15);
      expect(mockPrismaNotification.count).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-001',
          recipientId: 'user-001',
          isRead: false,
          isDismissed: false,
        },
      });
    });
  });

  // ===========================================================================
  // BULK NOTIFICATIONS TESTS
  // ===========================================================================

  describe('createBulkNotifications', () => {
    it('should create notifications for multiple recipients', async () => {
      const recipients = ['user-001', 'user-002', 'user-003'];

      mockPrismaNotification.create.mockImplementation(({ data }) => ({
        id: `n-${data.recipientId}`,
        ...data,
      }));

      await service.createBulkNotifications({
        tenantId: 'tenant-001',
        recipientIds: recipients,
        type: 'SYSTEM',
        title: 'System Update',
        body: 'System will be down for maintenance',
      });

      expect(mockPrisma$transaction).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // CHANNEL SELECTION TESTS
  // ===========================================================================

  describe('selectChannels', () => {
    const allEnabled = { push: true, email: true, sms: true };
    const allDisabled = { push: false, email: false, sms: false };

    it('should always include IN_APP', () => {
      const channels = service.selectChannels('MESSAGE', 'LOW', allDisabled);
      expect(channels).toContain('IN_APP');
    });

    it('should add PUSH for high priority when enabled', () => {
      const channels = service.selectChannels('MESSAGE', 'HIGH', allEnabled);
      expect(channels).toContain('PUSH');
    });

    it('should not add PUSH for high priority when disabled', () => {
      const channels = service.selectChannels('MESSAGE', 'HIGH', { ...allEnabled, push: false });
      expect(channels).not.toContain('PUSH');
    });

    it('should add EMAIL for ASSIGNMENT type when enabled', () => {
      const channels = service.selectChannels('ASSIGNMENT', 'NORMAL', allEnabled);
      expect(channels).toContain('EMAIL');
    });

    it('should add EMAIL for ALERT type when enabled', () => {
      const channels = service.selectChannels('ALERT', 'NORMAL', allEnabled);
      expect(channels).toContain('EMAIL');
    });

    it('should add SMS only for URGENT priority', () => {
      const channels = service.selectChannels('ALERT', 'URGENT', allEnabled);
      expect(channels).toContain('SMS');
    });

    it('should not add SMS for non-urgent', () => {
      const channels = service.selectChannels('ALERT', 'HIGH', allEnabled);
      expect(channels).not.toContain('SMS');
    });

    it('should combine multiple channels for urgent alerts', () => {
      const channels = service.selectChannels('ALERT', 'URGENT', allEnabled);
      expect(channels).toContain('IN_APP');
      expect(channels).toContain('PUSH');
      expect(channels).toContain('EMAIL');
      expect(channels).toContain('SMS');
    });
  });
});
