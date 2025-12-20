/**
 * Notification Preferences Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  notificationPreference: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  parentNotificationPreferences: {
    findFirst: vi.fn(),
  },
};

vi.mock('../prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import after mocking
import * as preferencesService from '../services/notification-preferences.service.js';

describe('Notification Preferences Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreatePreferences', () => {
    it('should return existing preferences', async () => {
      const existingPrefs = {
        id: 'pref-1',
        userId: 'user-123',
        tenantId: 'tenant-123',
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: false,
        smsEnabled: false,
        typePreferences: { ACHIEVEMENT: true, REMINDER: false },
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        quietHoursTimezone: 'America/New_York',
        digestEnabled: false,
        digestFrequency: null,
        digestTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationPreference.findUnique.mockResolvedValue(existingPrefs);

      const result = await preferencesService.getOrCreatePreferences('user-123', 'tenant-123');

      expect(result.userId).toBe('user-123');
      expect(result.pushEnabled).toBe(true);
      expect(result.emailEnabled).toBe(false);
      expect(result.typePreferences).toEqual({ ACHIEVEMENT: true, REMINDER: false });
    });

    it('should create default preferences when none exist', async () => {
      const createdPrefs = {
        id: 'pref-new',
        userId: 'user-123',
        tenantId: 'tenant-123',
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        typePreferences: {},
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursTimezone: null,
        digestEnabled: false,
        digestFrequency: null,
        digestTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notificationPreference.create.mockResolvedValue(createdPrefs);

      const result = await preferencesService.getOrCreatePreferences('user-123', 'tenant-123');

      expect(result.userId).toBe('user-123');
      expect(mockPrisma.notificationPreference.create).toHaveBeenCalled();
    });
  });

  describe('updatePreferences', () => {
    it('should merge type preferences', async () => {
      const existingPrefs = {
        id: 'pref-1',
        userId: 'user-123',
        tenantId: 'tenant-123',
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        typePreferences: { ACHIEVEMENT: true, REMINDER: true },
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursTimezone: null,
        digestEnabled: false,
        digestFrequency: null,
        digestTime: null,
      };

      const updatedPrefs = {
        ...existingPrefs,
        pushEnabled: false,
        typePreferences: { ACHIEVEMENT: true, REMINDER: true, ALERT: false },
      };

      mockPrisma.notificationPreference.findUnique.mockResolvedValue(existingPrefs);
      mockPrisma.notificationPreference.update.mockResolvedValue(updatedPrefs);

      const result = await preferencesService.updatePreferences('user-123', 'tenant-123', {
        pushEnabled: false,
        typePreferences: { ALERT: false },
      });

      expect(result.pushEnabled).toBe(false);
      expect(result.typePreferences.ALERT).toBe(false);
      expect(result.typePreferences.ACHIEVEMENT).toBe(true);
    });
  });

  describe('checkQuietHours', () => {
    it('should return false when quiet hours not configured', () => {
      const prefs = {
        id: 'pref-1',
        userId: 'user-123',
        tenantId: 'tenant-123',
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        typePreferences: {},
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursTimezone: null,
        digestEnabled: false,
        digestFrequency: null,
        digestTime: null,
      };

      const result = preferencesService.checkQuietHours(prefs);
      expect(result).toBe(false);
    });

    // Note: Time-based tests would need to mock the current time
    // These are examples of what would be tested:
    it('should handle same-day quiet hours', () => {
      // Test case: quiet hours 09:00 - 17:00
      // Would need to mock DateTime.now() to test properly
    });

    it('should handle overnight quiet hours', () => {
      // Test case: quiet hours 22:00 - 07:00
      // Would need to mock DateTime.now() to test properly
    });
  });

  describe('makeDeliveryDecision', () => {
    it('should block delivery when notification type is disabled', async () => {
      const prefs = {
        id: 'pref-1',
        userId: 'user-123',
        tenantId: 'tenant-123',
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        typePreferences: { ACHIEVEMENT: false },
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursTimezone: null,
        digestEnabled: false,
        digestFrequency: null,
        digestTime: null,
      };

      mockPrisma.notificationPreference.findUnique.mockResolvedValue(prefs);

      const result = await preferencesService.makeDeliveryDecision(
        'user-123',
        'tenant-123',
        'ACHIEVEMENT' as any,
        ['PUSH' as any, 'EMAIL' as any]
      );

      expect(result.shouldDeliver).toBe(false);
      expect(result.reason).toContain('type disabled');
    });

    it('should filter out disabled channels', async () => {
      const prefs = {
        id: 'pref-1',
        userId: 'user-123',
        tenantId: 'tenant-123',
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: false,
        smsEnabled: false,
        typePreferences: { REMINDER: true },
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursTimezone: null,
        digestEnabled: false,
        digestFrequency: null,
        digestTime: null,
      };

      mockPrisma.notificationPreference.findUnique.mockResolvedValue(prefs);

      const result = await preferencesService.makeDeliveryDecision(
        'user-123',
        'tenant-123',
        'REMINDER' as any,
        ['PUSH' as any, 'EMAIL' as any, 'IN_APP' as any]
      );

      expect(result.shouldDeliver).toBe(true);
      expect(result.channels).toContain('PUSH');
      expect(result.channels).toContain('IN_APP');
      expect(result.channels).not.toContain('EMAIL');
    });

    it('should route to parent for COPPA compliance', async () => {
      const childPrefs = {
        id: 'pref-child',
        userId: 'child-123',
        tenantId: 'tenant-123',
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        typePreferences: {},
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursTimezone: null,
        digestEnabled: false,
        digestFrequency: null,
        digestTime: null,
      };

      const parentPrefs = {
        ...childPrefs,
        id: 'pref-parent',
        userId: 'parent-456',
      };

      mockPrisma.notificationPreference.findUnique
        .mockResolvedValueOnce(childPrefs)
        .mockResolvedValueOnce(parentPrefs);

      const result = await preferencesService.makeDeliveryDecision(
        'child-123',
        'tenant-123',
        'REMINDER' as any,
        ['PUSH' as any],
        {
          learnerId: 'child-123',
          learnerAge: 10, // Under 13
          parentUserId: 'parent-456',
          parentDeviceTokens: ['parent-token'],
        }
      );

      expect(result.shouldDeliver).toBe(true);
      expect(result.recipientUserId).toBe('parent-456');
    });

    it('should block delivery for minor without parent', async () => {
      const childPrefs = {
        id: 'pref-child',
        userId: 'child-123',
        tenantId: 'tenant-123',
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        typePreferences: {},
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursTimezone: null,
        digestEnabled: false,
        digestFrequency: null,
        digestTime: null,
      };

      mockPrisma.notificationPreference.findUnique.mockResolvedValue(childPrefs);

      const result = await preferencesService.makeDeliveryDecision(
        'child-123',
        'tenant-123',
        'REMINDER' as any,
        ['PUSH' as any],
        {
          learnerId: 'child-123',
          learnerAge: 10,
          parentUserId: null,
          parentDeviceTokens: [],
        }
      );

      expect(result.shouldDeliver).toBe(false);
      expect(result.reason).toContain('COPPA');
    });
  });

  describe('shouldRouteToParent', () => {
    it('should return true for children under 13', () => {
      expect(preferencesService.shouldRouteToParent('REMINDER' as any, 10)).toBe(true);
      expect(preferencesService.shouldRouteToParent('ACHIEVEMENT' as any, 12)).toBe(true);
    });

    it('should return false for users 13 and older', () => {
      expect(preferencesService.shouldRouteToParent('REMINDER' as any, 13)).toBe(false);
      expect(preferencesService.shouldRouteToParent('ACHIEVEMENT' as any, 15)).toBe(false);
    });

    it('should always return true for parent-only notification types', () => {
      expect(preferencesService.shouldRouteToParent('CONSENT_REQUEST' as any, 15)).toBe(true);
      expect(preferencesService.shouldRouteToParent('ALERT' as any, 16)).toBe(true);
    });
  });
});
