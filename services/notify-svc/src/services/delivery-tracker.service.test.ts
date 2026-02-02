/**
 * Unit Tests for Delivery Tracker Service
 *
 * Tests for:
 * - Delivery status tracking
 * - Retry management
 * - Analytics and reporting
 * - Bounce/failure handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockPrismaNotificationDelivery = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  aggregate: vi.fn(),
  groupBy: vi.fn(),
};

const mockPrismaNotification = {
  update: vi.fn(),
  findFirst: vi.fn(),
};

vi.mock('../prisma.js', () => ({
  prisma: {
    notificationDelivery: mockPrismaNotificationDelivery,
    notification: mockPrismaNotification,
  },
  DeliveryChannel: {
    IN_APP: 'IN_APP',
    PUSH: 'PUSH',
    EMAIL: 'EMAIL',
    SMS: 'SMS',
  },
  DeliveryStatus: {
    PENDING: 'PENDING',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    FAILED: 'FAILED',
    BOUNCED: 'BOUNCED',
  },
}));

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type DeliveryChannel = 'IN_APP' | 'PUSH' | 'EMAIL' | 'SMS';
type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';

interface DeliveryRecord {
  id: string;
  notificationId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  providerName?: string;
  providerMessageId?: string;
  attemptedAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: Date;
}

interface DeliveryStatusUpdate {
  notificationId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  providerMessageId?: string;
  deliveredAt?: Date;
  errorCode?: string;
  errorMessage?: string;
}

// =============================================================================
// DELIVERY TRACKER SERVICE (Simplified for testing)
// =============================================================================

class DeliveryTrackerService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS_MS = [60000, 300000, 900000]; // 1min, 5min, 15min

  async recordDeliveryAttempt(
    notificationId: string,
    channel: DeliveryChannel,
    options: {
      providerName?: string;
      providerMessageId?: string;
      status?: DeliveryStatus;
    } = {}
  ): Promise<DeliveryRecord> {
    return mockPrismaNotificationDelivery.create({
      data: {
        notificationId,
        channel,
        status: options.status ?? 'PENDING',
        providerName: options.providerName,
        providerMessageId: options.providerMessageId,
        attemptedAt: new Date(),
        retryCount: 0,
      },
    });
  }

  async updateDeliveryStatus(update: DeliveryStatusUpdate): Promise<DeliveryRecord> {
    const delivery = await mockPrismaNotificationDelivery.findFirst({
      where: {
        notificationId: update.notificationId,
        channel: update.channel,
      },
    });

    if (!delivery) {
      throw new Error('Delivery record not found');
    }

    const updateData: Record<string, unknown> = {
      status: update.status,
    };

    if (update.status === 'SENT') {
      updateData.sentAt = new Date();
    }
    if (update.status === 'DELIVERED') {
      updateData.deliveredAt = update.deliveredAt ?? new Date();
    }
    if (update.errorCode) {
      updateData.errorCode = update.errorCode;
      updateData.errorMessage = update.errorMessage;
    }

    return mockPrismaNotificationDelivery.update({
      where: { id: delivery.id },
      data: updateData,
    });
  }

  async markAsFailed(
    notificationId: string,
    channel: DeliveryChannel,
    errorCode: string,
    errorMessage: string
  ): Promise<DeliveryRecord | null> {
    const delivery = await mockPrismaNotificationDelivery.findFirst({
      where: { notificationId, channel },
    });

    if (!delivery) return null;

    // Check if we should retry
    if (delivery.retryCount < this.MAX_RETRIES && this.isRetryableError(errorCode)) {
      const nextRetryDelay = this.RETRY_DELAYS_MS[delivery.retryCount] ?? 900000;
      return mockPrismaNotificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'PENDING',
          retryCount: delivery.retryCount + 1,
          nextRetryAt: new Date(Date.now() + nextRetryDelay),
          errorCode,
          errorMessage,
        },
      });
    }

    // Max retries reached or non-retryable error
    return mockPrismaNotificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'FAILED',
        errorCode,
        errorMessage,
      },
    });
  }

  isRetryableError(errorCode: string): boolean {
    const retryableCodes = [
      'TIMEOUT',
      'RATE_LIMITED',
      'TEMPORARY_FAILURE',
      'SERVICE_UNAVAILABLE',
      'CONNECTION_ERROR',
    ];
    return retryableCodes.includes(errorCode);
  }

  async getDeliveriesForRetry(limit: number = 100): Promise<DeliveryRecord[]> {
    return mockPrismaNotificationDelivery.findMany({
      where: {
        status: 'PENDING',
        retryCount: { gt: 0 },
        nextRetryAt: { lte: new Date() },
      },
      take: limit,
      orderBy: { nextRetryAt: 'asc' },
    });
  }

  async getDeliveryStats(
    tenantId: string,
    channel?: DeliveryChannel
  ): Promise<{
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
    deliveryRate: number;
  }> {
    const where: Record<string, unknown> = {
      notification: { tenantId },
    };
    if (channel) {
      where.channel = channel;
    }

    const result = await mockPrismaNotificationDelivery.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const stats = {
      total: 0,
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      deliveryRate: 0,
    };

    result.forEach((r: { status: string; _count: number }) => {
      stats.total += r._count;
      stats[r.status.toLowerCase() as keyof typeof stats] = r._count;
    });

    stats.deliveryRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
    return stats;
  }

  async handleBounce(providerMessageId: string, bounceType: string): Promise<void> {
    const delivery = await mockPrismaNotificationDelivery.findFirst({
      where: { providerMessageId },
    });

    if (delivery) {
      await mockPrismaNotificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'BOUNCED',
          errorCode: bounceType,
          errorMessage: `Email bounced: ${bounceType}`,
        },
      });
    }
  }
}

// =============================================================================
// FIXTURES
// =============================================================================

const createMockDelivery = (overrides: Partial<DeliveryRecord> = {}): DeliveryRecord => ({
  id: 'delivery-001',
  notificationId: 'notification-001',
  channel: 'EMAIL',
  status: 'PENDING',
  attemptedAt: new Date('2026-01-15'),
  retryCount: 0,
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('DeliveryTrackerService', () => {
  let service: DeliveryTrackerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DeliveryTrackerService();
  });

  // ===========================================================================
  // RECORD DELIVERY ATTEMPT TESTS
  // ===========================================================================

  describe('recordDeliveryAttempt', () => {
    it('should create delivery record with PENDING status', async () => {
      mockPrismaNotificationDelivery.create.mockImplementationOnce(({ data }) => ({
        id: 'new-delivery',
        ...data,
      }));

      const result = await service.recordDeliveryAttempt('notification-001', 'PUSH');

      expect(result.channel).toBe('PUSH');
      expect(result.status).toBe('PENDING');
      expect(result.retryCount).toBe(0);
    });

    it('should accept provider information', async () => {
      mockPrismaNotificationDelivery.create.mockImplementationOnce(({ data }) => ({
        id: 'new-delivery',
        ...data,
      }));

      const result = await service.recordDeliveryAttempt('notification-001', 'EMAIL', {
        providerName: 'sendgrid',
        providerMessageId: 'sg-msg-123',
        status: 'SENT',
      });

      expect(result.providerName).toBe('sendgrid');
      expect(result.providerMessageId).toBe('sg-msg-123');
      expect(result.status).toBe('SENT');
    });
  });

  // ===========================================================================
  // UPDATE DELIVERY STATUS TESTS
  // ===========================================================================

  describe('updateDeliveryStatus', () => {
    it('should update status to SENT with timestamp', async () => {
      const mockDelivery = createMockDelivery();
      mockPrismaNotificationDelivery.findFirst.mockResolvedValueOnce(mockDelivery);
      mockPrismaNotificationDelivery.update.mockImplementationOnce(({ data }) => ({
        ...mockDelivery,
        ...data,
      }));

      const result = await service.updateDeliveryStatus({
        notificationId: 'notification-001',
        channel: 'EMAIL',
        status: 'SENT',
      });

      expect(result.status).toBe('SENT');
      expect(mockPrismaNotificationDelivery.update.mock.calls[0][0].data.sentAt).toBeInstanceOf(
        Date
      );
    });

    it('should update status to DELIVERED with timestamp', async () => {
      const mockDelivery = createMockDelivery({ status: 'SENT' });
      mockPrismaNotificationDelivery.findFirst.mockResolvedValueOnce(mockDelivery);
      mockPrismaNotificationDelivery.update.mockImplementationOnce(({ data }) => ({
        ...mockDelivery,
        ...data,
      }));

      await service.updateDeliveryStatus({
        notificationId: 'notification-001',
        channel: 'EMAIL',
        status: 'DELIVERED',
      });

      const updateData = mockPrismaNotificationDelivery.update.mock.calls[0][0].data;
      expect(updateData.deliveredAt).toBeInstanceOf(Date);
    });

    it('should throw error when delivery not found', async () => {
      mockPrismaNotificationDelivery.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateDeliveryStatus({
          notificationId: 'nonexistent',
          channel: 'EMAIL',
          status: 'SENT',
        })
      ).rejects.toThrow('Delivery record not found');
    });
  });

  // ===========================================================================
  // MARK AS FAILED TESTS
  // ===========================================================================

  describe('markAsFailed', () => {
    it('should schedule retry for retryable error', async () => {
      const mockDelivery = createMockDelivery({ retryCount: 0 });
      mockPrismaNotificationDelivery.findFirst.mockResolvedValueOnce(mockDelivery);
      mockPrismaNotificationDelivery.update.mockImplementationOnce(({ data }) => ({
        ...mockDelivery,
        ...data,
      }));

      const result = await service.markAsFailed(
        'notification-001',
        'EMAIL',
        'TIMEOUT',
        'Connection timed out'
      );

      expect(result?.status).toBe('PENDING');
      expect(result?.retryCount).toBe(1);
      expect(result?.nextRetryAt).toBeDefined();
    });

    it('should mark as FAILED after max retries', async () => {
      const mockDelivery = createMockDelivery({ retryCount: 3 }); // Already at max
      mockPrismaNotificationDelivery.findFirst.mockResolvedValueOnce(mockDelivery);
      mockPrismaNotificationDelivery.update.mockImplementationOnce(({ data }) => ({
        ...mockDelivery,
        ...data,
      }));

      const result = await service.markAsFailed(
        'notification-001',
        'EMAIL',
        'TIMEOUT',
        'Connection timed out'
      );

      expect(result?.status).toBe('FAILED');
    });

    it('should mark as FAILED for non-retryable error', async () => {
      const mockDelivery = createMockDelivery({ retryCount: 0 });
      mockPrismaNotificationDelivery.findFirst.mockResolvedValueOnce(mockDelivery);
      mockPrismaNotificationDelivery.update.mockImplementationOnce(({ data }) => ({
        ...mockDelivery,
        ...data,
      }));

      const result = await service.markAsFailed(
        'notification-001',
        'EMAIL',
        'INVALID_RECIPIENT',
        'Email address is invalid'
      );

      expect(result?.status).toBe('FAILED');
    });

    it('should return null when delivery not found', async () => {
      mockPrismaNotificationDelivery.findFirst.mockResolvedValueOnce(null);

      const result = await service.markAsFailed(
        'nonexistent',
        'EMAIL',
        'TIMEOUT',
        'Error'
      );

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // RETRYABLE ERROR TESTS
  // ===========================================================================

  describe('isRetryableError', () => {
    it('should return true for TIMEOUT', () => {
      expect(service.isRetryableError('TIMEOUT')).toBe(true);
    });

    it('should return true for RATE_LIMITED', () => {
      expect(service.isRetryableError('RATE_LIMITED')).toBe(true);
    });

    it('should return true for TEMPORARY_FAILURE', () => {
      expect(service.isRetryableError('TEMPORARY_FAILURE')).toBe(true);
    });

    it('should return true for SERVICE_UNAVAILABLE', () => {
      expect(service.isRetryableError('SERVICE_UNAVAILABLE')).toBe(true);
    });

    it('should return false for INVALID_RECIPIENT', () => {
      expect(service.isRetryableError('INVALID_RECIPIENT')).toBe(false);
    });

    it('should return false for INVALID_CONTENT', () => {
      expect(service.isRetryableError('INVALID_CONTENT')).toBe(false);
    });
  });

  // ===========================================================================
  // GET DELIVERIES FOR RETRY TESTS
  // ===========================================================================

  describe('getDeliveriesForRetry', () => {
    it('should return deliveries ready for retry', async () => {
      const mockDeliveries = [
        createMockDelivery({ retryCount: 1, nextRetryAt: new Date(Date.now() - 1000) }),
        createMockDelivery({
          id: 'd2',
          retryCount: 2,
          nextRetryAt: new Date(Date.now() - 1000),
        }),
      ];
      mockPrismaNotificationDelivery.findMany.mockResolvedValueOnce(mockDeliveries);

      const result = await service.getDeliveriesForRetry(100);

      expect(result).toHaveLength(2);
      expect(mockPrismaNotificationDelivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            retryCount: { gt: 0 },
          }),
        })
      );
    });
  });

  // ===========================================================================
  // GET DELIVERY STATS TESTS
  // ===========================================================================

  describe('getDeliveryStats', () => {
    it('should return aggregated delivery statistics', async () => {
      mockPrismaNotificationDelivery.groupBy.mockResolvedValueOnce([
        { status: 'PENDING', _count: 10 },
        { status: 'SENT', _count: 20 },
        { status: 'DELIVERED', _count: 65 },
        { status: 'FAILED', _count: 5 },
      ]);

      const result = await service.getDeliveryStats('tenant-001');

      expect(result.total).toBe(100);
      expect(result.delivered).toBe(65);
      expect(result.deliveryRate).toBe(65);
    });

    it('should filter by channel', async () => {
      mockPrismaNotificationDelivery.groupBy.mockResolvedValueOnce([]);

      await service.getDeliveryStats('tenant-001', 'EMAIL');

      expect(mockPrismaNotificationDelivery.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ channel: 'EMAIL' }),
        })
      );
    });

    it('should handle zero deliveries', async () => {
      mockPrismaNotificationDelivery.groupBy.mockResolvedValueOnce([]);

      const result = await service.getDeliveryStats('tenant-001');

      expect(result.total).toBe(0);
      expect(result.deliveryRate).toBe(0);
    });
  });

  // ===========================================================================
  // BOUNCE HANDLING TESTS
  // ===========================================================================

  describe('handleBounce', () => {
    it('should mark delivery as BOUNCED', async () => {
      const mockDelivery = createMockDelivery({ providerMessageId: 'sg-123' });
      mockPrismaNotificationDelivery.findFirst.mockResolvedValueOnce(mockDelivery);

      await service.handleBounce('sg-123', 'hard_bounce');

      expect(mockPrismaNotificationDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'BOUNCED',
            errorCode: 'hard_bounce',
          }),
        })
      );
    });

    it('should do nothing when delivery not found', async () => {
      mockPrismaNotificationDelivery.findFirst.mockResolvedValueOnce(null);

      await service.handleBounce('nonexistent', 'hard_bounce');

      expect(mockPrismaNotificationDelivery.update).not.toHaveBeenCalled();
    });
  });
});
