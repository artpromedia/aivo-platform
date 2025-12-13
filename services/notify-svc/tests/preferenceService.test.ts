/**
 * Preference Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before importing services
vi.mock('../src/prisma.js', () => ({
  prisma: {
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    deviceToken: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  NotificationType: {
    SYSTEM: 'SYSTEM',
    ACHIEVEMENT: 'ACHIEVEMENT',
    REMINDER: 'REMINDER',
    MESSAGE: 'MESSAGE',
  },
  DeliveryChannel: {
    IN_APP: 'IN_APP',
    PUSH: 'PUSH',
    EMAIL: 'EMAIL',
    SMS: 'SMS',
  },
}));

import { prisma, NotificationType, DeliveryChannel } from '../src/prisma.js';
import * as preferenceService from '../src/services/preferenceService.js';

describe('PreferenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      const mockPrefs = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        inAppEnabled: true,
        pushEnabled: false,
        emailEnabled: true,
        smsEnabled: false,
        typePreferences: {},
      };

      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(mockPrefs as any);

      const result = await preferenceService.getPreferences('tenant-1', 'user-1');

      expect(result.pushEnabled).toBe(false);
      expect(prisma.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return defaults when no preferences exist', async () => {
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(null);

      const result = await preferenceService.getPreferences('tenant-1', 'user-1');

      expect(result.inAppEnabled).toBe(true);
      expect(result.pushEnabled).toBe(true);
      expect(result.emailEnabled).toBe(true);
      expect(result.smsEnabled).toBe(false);
      expect(result.digestEnabled).toBe(false);
    });
  });

  describe('updatePreferences', () => {
    it('should update existing preferences', async () => {
      const mockUpdated = {
        userId: 'user-1',
        inAppEnabled: true,
        pushEnabled: false,
        emailEnabled: true,
        smsEnabled: false,
      };

      vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue(mockUpdated as any);

      const result = await preferenceService.updatePreferences('tenant-1', 'user-1', {
        pushEnabled: false,
      });

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          update: expect.objectContaining({ pushEnabled: false }),
        })
      );
      expect(result.pushEnabled).toBe(false);
    });

    it('should create preferences if none exist', async () => {
      const mockCreated = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: false,
        smsEnabled: false,
      };

      vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue(mockCreated as any);

      await preferenceService.updatePreferences('tenant-1', 'user-1', {
        emailEnabled: false,
      });

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            tenantId: 'tenant-1',
            userId: 'user-1',
            emailEnabled: false,
          }),
        })
      );
    });
  });

  describe('isChannelEnabled', () => {
    const prefs = {
      inAppEnabled: true,
      pushEnabled: true,
      emailEnabled: false,
      smsEnabled: false,
    };

    it('should return true for enabled channels', () => {
      expect(preferenceService.isChannelEnabled(prefs, 'IN_APP' as any)).toBe(true);
      expect(preferenceService.isChannelEnabled(prefs, 'PUSH' as any)).toBe(true);
    });

    it('should return false for disabled channels', () => {
      expect(preferenceService.isChannelEnabled(prefs, 'EMAIL' as any)).toBe(false);
      expect(preferenceService.isChannelEnabled(prefs, 'SMS' as any)).toBe(false);
    });
  });

  describe('isTypeEnabled', () => {
    it('should return true by default', () => {
      const prefs = { typePreferences: {} };
      expect(preferenceService.isTypeEnabled(prefs, NotificationType.ACHIEVEMENT)).toBe(true);
    });

    it('should return false if explicitly disabled', () => {
      const prefs = { typePreferences: { ACHIEVEMENT: false } };
      expect(preferenceService.isTypeEnabled(prefs, NotificationType.ACHIEVEMENT)).toBe(false);
    });

    it('should return true if explicitly enabled', () => {
      const prefs = { typePreferences: { REMINDER: true } };
      expect(preferenceService.isTypeEnabled(prefs, NotificationType.REMINDER)).toBe(true);
    });
  });

  describe('isInQuietHours', () => {
    it('should return false when no quiet hours set', () => {
      const prefs = {
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursTimezone: null,
      };

      expect(preferenceService.isInQuietHours(prefs)).toBe(false);
    });

    // Note: Testing time-based logic is tricky and depends on current time
    // In production, we'd use a time mocking library
    it('should handle quiet hours config', () => {
      const prefs = {
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        quietHoursTimezone: 'America/New_York',
      };

      // This test just verifies the function doesn't throw
      const result = preferenceService.isInQuietHours(prefs);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('registerDeviceToken', () => {
    it('should register new device token', async () => {
      const mockDevice = {
        id: 'device-1',
        userId: 'user-1',
        token: 'fcm-token-123',
        platform: 'android',
        isActive: true,
      };

      vi.mocked(prisma.deviceToken.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.deviceToken.upsert).mockResolvedValue(mockDevice as any);

      const result = await preferenceService.registerDeviceToken(
        'tenant-1',
        'user-1',
        'fcm-token-123',
        'android',
        'device-abc'
      );

      expect(prisma.deviceToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'fcm-token-123', userId: { not: 'user-1' } },
        data: { isActive: false },
      });

      expect(prisma.deviceToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: 'fcm-token-123' },
          create: expect.objectContaining({
            userId: 'user-1',
            platform: 'android',
            isActive: true,
          }),
        })
      );

      expect(result.token).toBe('fcm-token-123');
    });
  });

  describe('getActiveDeviceTokens', () => {
    it('should return active tokens for user', async () => {
      const mockTokens = [
        { token: 'token-1', platform: 'ios', isActive: true },
        { token: 'token-2', platform: 'android', isActive: true },
      ];

      vi.mocked(prisma.deviceToken.findMany).mockResolvedValue(mockTokens as any);

      const result = await preferenceService.getActiveDeviceTokens('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.deviceToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
      });
    });
  });

  describe('deactivateDeviceToken', () => {
    it('should deactivate token', async () => {
      vi.mocked(prisma.deviceToken.updateMany).mockResolvedValue({ count: 1 });

      await preferenceService.deactivateDeviceToken('old-token');

      expect(prisma.deviceToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'old-token' },
        data: { isActive: false },
      });
    });
  });
});
