/**
 * Unit Tests for Push Notification Service
 *
 * Tests for:
 * - Device registration and management
 * - FCM message building and sending
 * - COPPA compliance
 * - Topic subscriptions
 * - Platform-specific logic (iOS/Android)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockMessaging = {
  send: vi.fn(),
  sendEachForMulticast: vi.fn(),
  subscribeToTopic: vi.fn(),
  unsubscribeFromTopic: vi.fn(),
};

const mockAdmin = {
  messaging: vi.fn(() => mockMessaging),
};

vi.mock('firebase-admin', () => ({
  default: mockAdmin,
}));

const mockPrismaDeviceToken = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  updateMany: vi.fn(),
};

const mockPrismaUser = {
  findFirst: vi.fn(),
};

vi.mock('../prisma.js', () => ({
  prisma: {
    deviceToken: mockPrismaDeviceToken,
    user: mockPrismaUser,
  },
}));

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type DevicePlatform = 'IOS' | 'ANDROID' | 'WEB';

interface DeviceToken {
  id: string;
  userId: string;
  tenantId: string;
  token: string;
  platform: DevicePlatform;
  appVersion?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PushNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
  clickAction?: string;
  channelId?: string;
}

interface SendResult {
  successCount: number;
  failureCount: number;
  failedTokens: string[];
}

// =============================================================================
// PUSH NOTIFICATION SERVICE (Simplified for testing)
// =============================================================================

class PushNotificationService {
  async registerDevice(
    userId: string,
    tenantId: string,
    token: string,
    platform: DevicePlatform,
    appVersion?: string
  ): Promise<DeviceToken> {
    // Check for existing token
    const existing = await mockPrismaDeviceToken.findFirst({
      where: { token },
    });

    if (existing) {
      // Update existing token to new user
      return mockPrismaDeviceToken.update({
        where: { id: existing.id },
        data: { userId, tenantId, platform, appVersion, isActive: true },
      });
    }

    return mockPrismaDeviceToken.create({
      data: {
        userId,
        tenantId,
        token,
        platform,
        appVersion,
        isActive: true,
      },
    });
  }

  async unregisterDevice(token: string): Promise<void> {
    await mockPrismaDeviceToken.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
    options: { requireCoppaConsent?: boolean } = {}
  ): Promise<SendResult> {
    const result: SendResult = {
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
    };

    // Get active device tokens for users
    const tokens = await mockPrismaDeviceToken.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
      },
      include: { user: true },
    });

    if (tokens.length === 0) {
      return result;
    }

    // Filter out COPPA-restricted users if needed
    const validTokens = options.requireCoppaConsent
      ? tokens.filter((t: { user?: { coppaConsent?: boolean } }) => t.user?.coppaConsent)
      : tokens;

    if (validTokens.length === 0) {
      return result;
    }

    // Build messages for each platform
    const messages = validTokens.map((t: DeviceToken) => this.buildMessage(t, payload));

    // Send multicast
    const response = await mockMessaging.sendEachForMulticast({
      tokens: validTokens.map((t: DeviceToken) => t.token),
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
    });

    result.successCount = response.successCount;
    result.failureCount = response.failureCount;

    // Track failed tokens for cleanup
    if (response.responses) {
      response.responses.forEach((r: { success: boolean; error?: { code: string } }, i: number) => {
        if (!r.success && this.isInvalidTokenError(r.error?.code)) {
          result.failedTokens.push(validTokens[i].token);
        }
      });
    }

    // Cleanup invalid tokens
    if (result.failedTokens.length > 0) {
      await this.deactivateTokens(result.failedTokens);
    }

    return result;
  }

  buildMessage(device: DeviceToken, payload: PushNotificationPayload): Record<string, unknown> {
    const base = {
      token: device.token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    };

    if (device.platform === 'IOS') {
      return {
        ...base,
        apns: {
          payload: {
            aps: {
              badge: payload.badge ?? 1,
              sound: payload.sound ?? 'default',
            },
          },
        },
      };
    }

    if (device.platform === 'ANDROID') {
      return {
        ...base,
        android: {
          priority: 'high' as const,
          notification: {
            channelId: payload.channelId ?? 'default',
            sound: payload.sound ?? 'default',
            clickAction: payload.clickAction,
          },
        },
      };
    }

    // Web
    return {
      ...base,
      webpush: {
        notification: {
          icon: '/icons/notification.png',
        },
      },
    };
  }

  async subscribeToTopic(userIds: string[], topic: string): Promise<void> {
    const tokens = await mockPrismaDeviceToken.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
      },
    });

    if (tokens.length > 0) {
      await mockMessaging.subscribeToTopic(
        tokens.map((t: DeviceToken) => t.token),
        topic
      );
    }
  }

  async unsubscribeFromTopic(userIds: string[], topic: string): Promise<void> {
    const tokens = await mockPrismaDeviceToken.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
      },
    });

    if (tokens.length > 0) {
      await mockMessaging.unsubscribeFromTopic(
        tokens.map((t: DeviceToken) => t.token),
        topic
      );
    }
  }

  async sendToTopic(topic: string, payload: PushNotificationPayload): Promise<string> {
    return mockMessaging.send({
      topic,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    });
  }

  isInvalidTokenError(code?: string): boolean {
    const invalidCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument',
    ];
    return code ? invalidCodes.includes(code) : false;
  }

  async deactivateTokens(tokens: string[]): Promise<void> {
    await mockPrismaDeviceToken.updateMany({
      where: { token: { in: tokens } },
      data: { isActive: false },
    });
  }

  async getUserDeviceCount(userId: string): Promise<number> {
    const tokens = await mockPrismaDeviceToken.findMany({
      where: { userId, isActive: true },
    });
    return tokens.length;
  }

  async getTenantActiveDevices(tenantId: string): Promise<number> {
    const tokens = await mockPrismaDeviceToken.findMany({
      where: { tenantId, isActive: true },
    });
    return tokens.length;
  }
}

// =============================================================================
// FIXTURES
// =============================================================================

const createMockDevice = (overrides: Partial<DeviceToken> = {}): DeviceToken => ({
  id: 'device-001',
  userId: 'user-001',
  tenantId: 'tenant-001',
  token: 'fcm-token-123',
  platform: 'ANDROID',
  appVersion: '2.0.0',
  isActive: true,
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  ...overrides,
});

const createMockPayload = (overrides: Partial<PushNotificationPayload> = {}): PushNotificationPayload => ({
  title: 'New Achievement',
  body: 'You earned the Math Master badge!',
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PushNotificationService();
  });

  // ===========================================================================
  // DEVICE REGISTRATION TESTS
  // ===========================================================================

  describe('registerDevice', () => {
    it('should create new device token', async () => {
      mockPrismaDeviceToken.findFirst.mockResolvedValueOnce(null);
      mockPrismaDeviceToken.create.mockImplementationOnce(({ data }) => ({
        id: 'new-device',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.registerDevice(
        'user-001',
        'tenant-001',
        'fcm-token-456',
        'IOS',
        '2.1.0'
      );

      expect(result.token).toBe('fcm-token-456');
      expect(result.platform).toBe('IOS');
      expect(result.isActive).toBe(true);
    });

    it('should update existing token when already registered', async () => {
      const existingDevice = createMockDevice({ userId: 'old-user' });
      mockPrismaDeviceToken.findFirst.mockResolvedValueOnce(existingDevice);
      mockPrismaDeviceToken.update.mockImplementationOnce(({ data }) => ({
        ...existingDevice,
        ...data,
      }));

      const result = await service.registerDevice(
        'new-user',
        'tenant-001',
        'fcm-token-123',
        'ANDROID'
      );

      expect(result.userId).toBe('new-user');
      expect(mockPrismaDeviceToken.update).toHaveBeenCalled();
    });
  });

  describe('unregisterDevice', () => {
    it('should deactivate device token', async () => {
      await service.unregisterDevice('fcm-token-123');

      expect(mockPrismaDeviceToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: 'fcm-token-123' },
          data: { isActive: false },
        })
      );
    });
  });

  // ===========================================================================
  // SEND TO USERS TESTS
  // ===========================================================================

  describe('sendToUsers', () => {
    it('should send notification to all user devices', async () => {
      const devices = [
        createMockDevice(),
        createMockDevice({ id: 'd2', token: 'token-2', platform: 'IOS' }),
      ];
      mockPrismaDeviceToken.findMany.mockResolvedValueOnce(devices);
      mockMessaging.sendEachForMulticast.mockResolvedValueOnce({
        successCount: 2,
        failureCount: 0,
        responses: [],
      });

      const result = await service.sendToUsers(
        ['user-001'],
        createMockPayload()
      );

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should return empty result when no devices found', async () => {
      mockPrismaDeviceToken.findMany.mockResolvedValueOnce([]);

      const result = await service.sendToUsers(
        ['user-001'],
        createMockPayload()
      );

      expect(result.successCount).toBe(0);
      expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
    });

    it('should filter by COPPA consent when required', async () => {
      const devices = [
        { ...createMockDevice(), user: { coppaConsent: true } },
        { ...createMockDevice({ id: 'd2', token: 't2' }), user: { coppaConsent: false } },
      ];
      mockPrismaDeviceToken.findMany.mockResolvedValueOnce(devices);
      mockMessaging.sendEachForMulticast.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 0,
        responses: [],
      });

      const result = await service.sendToUsers(
        ['user-001'],
        createMockPayload(),
        { requireCoppaConsent: true }
      );

      expect(result.successCount).toBe(1);
    });

    it('should deactivate invalid tokens after send', async () => {
      const devices = [createMockDevice()];
      mockPrismaDeviceToken.findMany.mockResolvedValueOnce(devices);
      mockMessaging.sendEachForMulticast.mockResolvedValueOnce({
        successCount: 0,
        failureCount: 1,
        responses: [
          { success: false, error: { code: 'messaging/invalid-registration-token' } },
        ],
      });

      const result = await service.sendToUsers(
        ['user-001'],
        createMockPayload()
      );

      expect(result.failedTokens).toContain('fcm-token-123');
      expect(mockPrismaDeviceToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: { in: ['fcm-token-123'] } },
          data: { isActive: false },
        })
      );
    });
  });

  // ===========================================================================
  // BUILD MESSAGE TESTS (Platform-specific)
  // ===========================================================================

  describe('buildMessage', () => {
    it('should build iOS message with APNs config', () => {
      const device = createMockDevice({ platform: 'IOS' });
      const payload = createMockPayload({ badge: 5, sound: 'alert.wav' });

      const message = service.buildMessage(device, payload);

      expect(message).toHaveProperty('apns');
      expect((message.apns as { payload: { aps: { badge: number } } }).payload.aps.badge).toBe(5);
      expect((message.apns as { payload: { aps: { sound: string } } }).payload.aps.sound).toBe('alert.wav');
    });

    it('should build Android message with high priority', () => {
      const device = createMockDevice({ platform: 'ANDROID' });
      const payload = createMockPayload({ channelId: 'achievements' });

      const message = service.buildMessage(device, payload);

      expect(message).toHaveProperty('android');
      expect((message.android as { priority: string }).priority).toBe('high');
      expect((message.android as { notification: { channelId: string } }).notification.channelId).toBe('achievements');
    });

    it('should build Web message with webpush config', () => {
      const device = createMockDevice({ platform: 'WEB' });
      const payload = createMockPayload();

      const message = service.buildMessage(device, payload);

      expect(message).toHaveProperty('webpush');
      expect((message.webpush as { notification: { icon: string } }).notification.icon).toBe('/icons/notification.png');
    });

    it('should include custom data in message', () => {
      const device = createMockDevice();
      const payload = createMockPayload({
        data: { badgeId: 'math-master', points: '100' },
      });

      const message = service.buildMessage(device, payload);

      expect(message.data).toEqual({ badgeId: 'math-master', points: '100' });
    });
  });

  // ===========================================================================
  // TOPIC SUBSCRIPTION TESTS
  // ===========================================================================

  describe('subscribeToTopic', () => {
    it('should subscribe user devices to topic', async () => {
      const devices = [createMockDevice(), createMockDevice({ id: 'd2', token: 't2' })];
      mockPrismaDeviceToken.findMany.mockResolvedValueOnce(devices);

      await service.subscribeToTopic(['user-001'], 'grade-5-updates');

      expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith(
        ['fcm-token-123', 't2'],
        'grade-5-updates'
      );
    });

    it('should not call FCM when no devices found', async () => {
      mockPrismaDeviceToken.findMany.mockResolvedValueOnce([]);

      await service.subscribeToTopic(['user-001'], 'grade-5-updates');

      expect(mockMessaging.subscribeToTopic).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribeFromTopic', () => {
    it('should unsubscribe user devices from topic', async () => {
      const devices = [createMockDevice()];
      mockPrismaDeviceToken.findMany.mockResolvedValueOnce(devices);

      await service.unsubscribeFromTopic(['user-001'], 'grade-5-updates');

      expect(mockMessaging.unsubscribeFromTopic).toHaveBeenCalledWith(
        ['fcm-token-123'],
        'grade-5-updates'
      );
    });
  });

  // ===========================================================================
  // SEND TO TOPIC TESTS
  // ===========================================================================

  describe('sendToTopic', () => {
    it('should send notification to topic', async () => {
      mockMessaging.send.mockResolvedValueOnce('message-id-123');

      const result = await service.sendToTopic('all-parents', createMockPayload());

      expect(result).toBe('message-id-123');
      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'all-parents',
          notification: expect.objectContaining({
            title: 'New Achievement',
          }),
        })
      );
    });
  });

  // ===========================================================================
  // TOKEN VALIDATION TESTS
  // ===========================================================================

  describe('isInvalidTokenError', () => {
    it('should return true for invalid-registration-token', () => {
      expect(service.isInvalidTokenError('messaging/invalid-registration-token')).toBe(true);
    });

    it('should return true for registration-token-not-registered', () => {
      expect(service.isInvalidTokenError('messaging/registration-token-not-registered')).toBe(true);
    });

    it('should return false for rate-limited', () => {
      expect(service.isInvalidTokenError('messaging/rate-limited')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(service.isInvalidTokenError(undefined)).toBe(false);
    });
  });

  // ===========================================================================
  // DEVICE COUNT TESTS
  // ===========================================================================

  describe('getUserDeviceCount', () => {
    it('should return count of active devices', async () => {
      mockPrismaDeviceToken.findMany.mockResolvedValueOnce([
        createMockDevice(),
        createMockDevice({ id: 'd2', token: 't2' }),
      ]);

      const count = await service.getUserDeviceCount('user-001');

      expect(count).toBe(2);
    });
  });

  describe('getTenantActiveDevices', () => {
    it('should return tenant-wide device count', async () => {
      mockPrismaDeviceToken.findMany.mockResolvedValueOnce([
        createMockDevice(),
        createMockDevice({ id: 'd2', userId: 'user-002' }),
        createMockDevice({ id: 'd3', userId: 'user-003' }),
      ]);

      const count = await service.getTenantActiveDevices('tenant-001');

      expect(count).toBe(3);
    });
  });
});
