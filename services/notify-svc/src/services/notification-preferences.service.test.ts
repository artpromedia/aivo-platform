/**
 * Unit Tests for Notification Preferences Service
 *
 * Tests for:
 * - User preference management
 * - Quiet hours configuration
 * - Channel-specific preferences
 * - COPPA compliance routing
 * - Preference inheritance (defaults, user overrides)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockPrismaNotificationPreference = {
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
};

const mockPrismaUser = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
};

vi.mock('../prisma.js', () => ({
  prisma: {
    notificationPreference: mockPrismaNotificationPreference,
    user: mockPrismaUser,
  },
  NotificationType: {
    ACHIEVEMENT: 'ACHIEVEMENT',
    LESSON_REMINDER: 'LESSON_REMINDER',
    PROGRESS_UPDATE: 'PROGRESS_UPDATE',
    PARENT_MESSAGE: 'PARENT_MESSAGE',
    SYSTEM_ALERT: 'SYSTEM_ALERT',
    MARKETING: 'MARKETING',
  },
  DeliveryChannel: {
    IN_APP: 'IN_APP',
    PUSH: 'PUSH',
    EMAIL: 'EMAIL',
    SMS: 'SMS',
  },
}));

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type NotificationType =
  | 'ACHIEVEMENT'
  | 'LESSON_REMINDER'
  | 'PROGRESS_UPDATE'
  | 'PARENT_MESSAGE'
  | 'SYSTEM_ALERT'
  | 'MARKETING';

type DeliveryChannel = 'IN_APP' | 'PUSH' | 'EMAIL' | 'SMS';

interface ChannelPreference {
  enabled: boolean;
  types?: NotificationType[];
}

interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:MM format
  endTime: string;
  timezone: string;
  daysOfWeek?: number[]; // 0=Sunday, 6=Saturday
}

interface NotificationPreference {
  id: string;
  userId: string;
  tenantId: string;
  channels: Record<DeliveryChannel, ChannelPreference>;
  quietHours: QuietHours | null;
  globalEnabled: boolean;
  disabledTypes: NotificationType[];
  parentRoutingEnabled: boolean; // COPPA: route child notifications to parent
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// NOTIFICATION PREFERENCES SERVICE (Simplified for testing)
// =============================================================================

class NotificationPreferencesService {
  private readonly DEFAULT_PREFERENCES: Omit<NotificationPreference, 'id' | 'userId' | 'tenantId' | 'createdAt' | 'updatedAt'> = {
    channels: {
      IN_APP: { enabled: true },
      PUSH: { enabled: true },
      EMAIL: { enabled: true },
      SMS: { enabled: false },
    },
    quietHours: null,
    globalEnabled: true,
    disabledTypes: [],
    parentRoutingEnabled: false,
  };

  async getOrCreatePreferences(userId: string, tenantId: string): Promise<NotificationPreference> {
    const existing = await mockPrismaNotificationPreference.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (existing) {
      return existing;
    }

    return mockPrismaNotificationPreference.create({
      data: {
        userId,
        tenantId,
        ...this.DEFAULT_PREFERENCES,
      },
    });
  }

  async updatePreferences(
    userId: string,
    tenantId: string,
    updates: Partial<Omit<NotificationPreference, 'id' | 'userId' | 'tenantId' | 'createdAt' | 'updatedAt'>>
  ): Promise<NotificationPreference> {
    return mockPrismaNotificationPreference.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: updates,
      create: {
        userId,
        tenantId,
        ...this.DEFAULT_PREFERENCES,
        ...updates,
      },
    });
  }

  async setChannelPreference(
    userId: string,
    tenantId: string,
    channel: DeliveryChannel,
    preference: ChannelPreference
  ): Promise<NotificationPreference> {
    const current = await this.getOrCreatePreferences(userId, tenantId);
    const updatedChannels = {
      ...current.channels,
      [channel]: preference,
    };

    return mockPrismaNotificationPreference.update({
      where: { id: current.id },
      data: { channels: updatedChannels },
    });
  }

  async setQuietHours(
    userId: string,
    tenantId: string,
    quietHours: QuietHours | null
  ): Promise<NotificationPreference> {
    const current = await this.getOrCreatePreferences(userId, tenantId);

    return mockPrismaNotificationPreference.update({
      where: { id: current.id },
      data: { quietHours },
    });
  }

  async disableNotificationType(
    userId: string,
    tenantId: string,
    type: NotificationType
  ): Promise<NotificationPreference> {
    const current = await this.getOrCreatePreferences(userId, tenantId);
    const disabledTypes = [...new Set([...current.disabledTypes, type])];

    return mockPrismaNotificationPreference.update({
      where: { id: current.id },
      data: { disabledTypes },
    });
  }

  async enableNotificationType(
    userId: string,
    tenantId: string,
    type: NotificationType
  ): Promise<NotificationPreference> {
    const current = await this.getOrCreatePreferences(userId, tenantId);
    const disabledTypes = current.disabledTypes.filter((t: NotificationType) => t !== type);

    return mockPrismaNotificationPreference.update({
      where: { id: current.id },
      data: { disabledTypes },
    });
  }

  isChannelEnabled(preferences: NotificationPreference, channel: DeliveryChannel): boolean {
    if (!preferences.globalEnabled) return false;
    return preferences.channels[channel]?.enabled ?? false;
  }

  isTypeEnabled(preferences: NotificationPreference, type: NotificationType): boolean {
    if (!preferences.globalEnabled) return false;
    return !preferences.disabledTypes.includes(type);
  }

  isInQuietHours(preferences: NotificationPreference, currentTime: Date = new Date()): boolean {
    const quietHours = preferences.quietHours;
    if (!quietHours?.enabled) return false;

    // Convert current time to user's timezone
    const userTime = new Date(
      currentTime.toLocaleString('en-US', { timeZone: quietHours.timezone })
    );

    const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);

    const currentMinutes = userTime.getHours() * 60 + userTime.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  getEnabledChannels(
    preferences: NotificationPreference,
    type: NotificationType
  ): DeliveryChannel[] {
    if (!preferences.globalEnabled) return [];
    if (preferences.disabledTypes.includes(type)) return [];

    return (Object.entries(preferences.channels) as [DeliveryChannel, ChannelPreference][])
      .filter(([, pref]) => {
        if (!pref.enabled) return false;
        // If channel has type-specific settings, check those
        if (pref.types && pref.types.length > 0) {
          return pref.types.includes(type);
        }
        return true;
      })
      .map(([channel]) => channel);
  }

  async setupCoppaRouting(childUserId: string, tenantId: string): Promise<void> {
    // Get child's parent
    const child = await mockPrismaUser.findFirst({
      where: { id: childUserId },
      include: { parent: true },
    });

    if (child?.parent) {
      // Enable parent routing for child
      await this.updatePreferences(childUserId, tenantId, {
        parentRoutingEnabled: true,
      });
    }
  }

  async getRoutingTarget(
    userId: string,
    tenantId: string
  ): Promise<{ userId: string; isParentRouted: boolean }> {
    const preferences = await this.getOrCreatePreferences(userId, tenantId);

    if (preferences.parentRoutingEnabled) {
      // Get parent user
      const user = await mockPrismaUser.findFirst({
        where: { id: userId },
        include: { parent: true },
      });

      if (user?.parent?.id) {
        return { userId: user.parent.id, isParentRouted: true };
      }
    }

    return { userId, isParentRouted: false };
  }

  async toggleGlobalNotifications(
    userId: string,
    tenantId: string,
    enabled: boolean
  ): Promise<NotificationPreference> {
    return this.updatePreferences(userId, tenantId, { globalEnabled: enabled });
  }
}

// =============================================================================
// FIXTURES
// =============================================================================

const createMockPreference = (overrides: Partial<NotificationPreference> = {}): NotificationPreference => ({
  id: 'pref-001',
  userId: 'user-001',
  tenantId: 'tenant-001',
  channels: {
    IN_APP: { enabled: true },
    PUSH: { enabled: true },
    EMAIL: { enabled: true },
    SMS: { enabled: false },
  },
  quietHours: null,
  globalEnabled: true,
  disabledTypes: [],
  parentRoutingEnabled: false,
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationPreferencesService();
  });

  // ===========================================================================
  // GET OR CREATE PREFERENCES TESTS
  // ===========================================================================

  describe('getOrCreatePreferences', () => {
    it('should return existing preferences', async () => {
      const mockPref = createMockPreference();
      mockPrismaNotificationPreference.findUnique.mockResolvedValueOnce(mockPref);

      const result = await service.getOrCreatePreferences('user-001', 'tenant-001');

      expect(result).toEqual(mockPref);
      expect(mockPrismaNotificationPreference.create).not.toHaveBeenCalled();
    });

    it('should create default preferences when none exist', async () => {
      mockPrismaNotificationPreference.findUnique.mockResolvedValueOnce(null);
      mockPrismaNotificationPreference.create.mockImplementationOnce(({ data }) => ({
        id: 'new-pref',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.getOrCreatePreferences('user-001', 'tenant-001');

      expect(result.globalEnabled).toBe(true);
      expect(result.channels.IN_APP.enabled).toBe(true);
      expect(result.channels.SMS.enabled).toBe(false);
    });
  });

  // ===========================================================================
  // UPDATE PREFERENCES TESTS
  // ===========================================================================

  describe('updatePreferences', () => {
    it('should update existing preferences', async () => {
      mockPrismaNotificationPreference.upsert.mockImplementationOnce(({ update }) => ({
        ...createMockPreference(),
        ...update,
      }));

      const result = await service.updatePreferences('user-001', 'tenant-001', {
        globalEnabled: false,
      });

      expect(result.globalEnabled).toBe(false);
    });

    it('should create with defaults when upserting', async () => {
      mockPrismaNotificationPreference.upsert.mockImplementationOnce(({ create }) => ({
        id: 'new-pref',
        ...create,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.updatePreferences('user-001', 'tenant-001', {
        disabledTypes: ['MARKETING'],
      });

      expect(result.channels.IN_APP.enabled).toBe(true); // Default preserved
      expect(result.disabledTypes).toContain('MARKETING'); // Override applied
    });
  });

  // ===========================================================================
  // SET CHANNEL PREFERENCE TESTS
  // ===========================================================================

  describe('setChannelPreference', () => {
    it('should update single channel preference', async () => {
      const mockPref = createMockPreference();
      mockPrismaNotificationPreference.findUnique.mockResolvedValueOnce(mockPref);
      mockPrismaNotificationPreference.update.mockImplementationOnce(({ data }) => ({
        ...mockPref,
        channels: data.channels,
      }));

      const result = await service.setChannelPreference('user-001', 'tenant-001', 'SMS', {
        enabled: true,
      });

      expect(result.channels.SMS.enabled).toBe(true);
      expect(result.channels.EMAIL.enabled).toBe(true); // Other channels unchanged
    });

    it('should set type-specific channel preferences', async () => {
      const mockPref = createMockPreference();
      mockPrismaNotificationPreference.findUnique.mockResolvedValueOnce(mockPref);
      mockPrismaNotificationPreference.update.mockImplementationOnce(({ data }) => ({
        ...mockPref,
        channels: data.channels,
      }));

      const result = await service.setChannelPreference('user-001', 'tenant-001', 'EMAIL', {
        enabled: true,
        types: ['ACHIEVEMENT', 'PROGRESS_UPDATE'],
      });

      expect(result.channels.EMAIL.types).toContain('ACHIEVEMENT');
      expect(result.channels.EMAIL.types).toContain('PROGRESS_UPDATE');
    });
  });

  // ===========================================================================
  // QUIET HOURS TESTS
  // ===========================================================================

  describe('setQuietHours', () => {
    it('should set quiet hours configuration', async () => {
      const mockPref = createMockPreference();
      mockPrismaNotificationPreference.findUnique.mockResolvedValueOnce(mockPref);
      mockPrismaNotificationPreference.update.mockImplementationOnce(({ data }) => ({
        ...mockPref,
        quietHours: data.quietHours,
      }));

      const quietHours: QuietHours = {
        enabled: true,
        startTime: '22:00',
        endTime: '07:00',
        timezone: 'Africa/Nairobi',
      };

      const result = await service.setQuietHours('user-001', 'tenant-001', quietHours);

      expect(result.quietHours?.enabled).toBe(true);
      expect(result.quietHours?.startTime).toBe('22:00');
    });

    it('should clear quiet hours when set to null', async () => {
      const mockPref = createMockPreference({
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '07:00',
          timezone: 'Africa/Nairobi',
        },
      });
      mockPrismaNotificationPreference.findUnique.mockResolvedValueOnce(mockPref);
      mockPrismaNotificationPreference.update.mockImplementationOnce(({ data }) => ({
        ...mockPref,
        quietHours: data.quietHours,
      }));

      const result = await service.setQuietHours('user-001', 'tenant-001', null);

      expect(result.quietHours).toBeNull();
    });
  });

  describe('isInQuietHours', () => {
    it('should return false when quiet hours disabled', () => {
      const pref = createMockPreference({ quietHours: null });
      expect(service.isInQuietHours(pref)).toBe(false);
    });

    it('should return true when within quiet hours', () => {
      const pref = createMockPreference({
        quietHours: {
          enabled: true,
          startTime: '00:00',
          endTime: '23:59',
          timezone: 'UTC',
        },
      });
      expect(service.isInQuietHours(pref)).toBe(true);
    });

    it('should handle overnight quiet hours', () => {
      const pref = createMockPreference({
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '07:00',
          timezone: 'UTC',
        },
      });

      // Test at 23:00 UTC (within quiet hours)
      const nightTime = new Date('2026-01-15T23:00:00Z');
      expect(service.isInQuietHours(pref, nightTime)).toBe(true);

      // Test at 12:00 UTC (outside quiet hours)
      const dayTime = new Date('2026-01-15T12:00:00Z');
      expect(service.isInQuietHours(pref, dayTime)).toBe(false);
    });
  });

  // ===========================================================================
  // NOTIFICATION TYPE ENABLE/DISABLE TESTS
  // ===========================================================================

  describe('disableNotificationType', () => {
    it('should add type to disabled list', async () => {
      const mockPref = createMockPreference();
      mockPrismaNotificationPreference.findUnique.mockResolvedValueOnce(mockPref);
      mockPrismaNotificationPreference.update.mockImplementationOnce(({ data }) => ({
        ...mockPref,
        disabledTypes: data.disabledTypes,
      }));

      const result = await service.disableNotificationType(
        'user-001',
        'tenant-001',
        'MARKETING'
      );

      expect(result.disabledTypes).toContain('MARKETING');
    });

    it('should not duplicate disabled types', async () => {
      const mockPref = createMockPreference({ disabledTypes: ['MARKETING'] });
      mockPrismaNotificationPreference.findUnique.mockResolvedValueOnce(mockPref);
      mockPrismaNotificationPreference.update.mockImplementationOnce(({ data }) => ({
        ...mockPref,
        disabledTypes: data.disabledTypes,
      }));

      const result = await service.disableNotificationType(
        'user-001',
        'tenant-001',
        'MARKETING'
      );

      expect(result.disabledTypes.filter((t: NotificationType) => t === 'MARKETING')).toHaveLength(1);
    });
  });

  describe('enableNotificationType', () => {
    it('should remove type from disabled list', async () => {
      const mockPref = createMockPreference({
        disabledTypes: ['MARKETING', 'PROGRESS_UPDATE'],
      });
      mockPrismaNotificationPreference.findUnique.mockResolvedValueOnce(mockPref);
      mockPrismaNotificationPreference.update.mockImplementationOnce(({ data }) => ({
        ...mockPref,
        disabledTypes: data.disabledTypes,
      }));

      const result = await service.enableNotificationType(
        'user-001',
        'tenant-001',
        'MARKETING'
      );

      expect(result.disabledTypes).not.toContain('MARKETING');
      expect(result.disabledTypes).toContain('PROGRESS_UPDATE');
    });
  });

  // ===========================================================================
  // CHANNEL/TYPE ENABLED CHECKS
  // ===========================================================================

  describe('isChannelEnabled', () => {
    it('should return true for enabled channel', () => {
      const pref = createMockPreference();
      expect(service.isChannelEnabled(pref, 'EMAIL')).toBe(true);
    });

    it('should return false for disabled channel', () => {
      const pref = createMockPreference();
      expect(service.isChannelEnabled(pref, 'SMS')).toBe(false);
    });

    it('should return false when global notifications disabled', () => {
      const pref = createMockPreference({ globalEnabled: false });
      expect(service.isChannelEnabled(pref, 'EMAIL')).toBe(false);
    });
  });

  describe('isTypeEnabled', () => {
    it('should return true for non-disabled type', () => {
      const pref = createMockPreference();
      expect(service.isTypeEnabled(pref, 'ACHIEVEMENT')).toBe(true);
    });

    it('should return false for disabled type', () => {
      const pref = createMockPreference({ disabledTypes: ['MARKETING'] });
      expect(service.isTypeEnabled(pref, 'MARKETING')).toBe(false);
    });

    it('should return false when global notifications disabled', () => {
      const pref = createMockPreference({ globalEnabled: false });
      expect(service.isTypeEnabled(pref, 'ACHIEVEMENT')).toBe(false);
    });
  });

  // ===========================================================================
  // GET ENABLED CHANNELS TESTS
  // ===========================================================================

  describe('getEnabledChannels', () => {
    it('should return all enabled channels for type', () => {
      const pref = createMockPreference();
      const channels = service.getEnabledChannels(pref, 'ACHIEVEMENT');

      expect(channels).toContain('IN_APP');
      expect(channels).toContain('PUSH');
      expect(channels).toContain('EMAIL');
      expect(channels).not.toContain('SMS');
    });

    it('should return empty array when global disabled', () => {
      const pref = createMockPreference({ globalEnabled: false });
      const channels = service.getEnabledChannels(pref, 'ACHIEVEMENT');

      expect(channels).toHaveLength(0);
    });

    it('should return empty array for disabled type', () => {
      const pref = createMockPreference({ disabledTypes: ['MARKETING'] });
      const channels = service.getEnabledChannels(pref, 'MARKETING');

      expect(channels).toHaveLength(0);
    });

    it('should filter by type-specific channel settings', () => {
      const pref = createMockPreference({
        channels: {
          IN_APP: { enabled: true },
          PUSH: { enabled: true },
          EMAIL: { enabled: true, types: ['ACHIEVEMENT'] },
          SMS: { enabled: false },
        },
      });

      const achievementChannels = service.getEnabledChannels(pref, 'ACHIEVEMENT');
      expect(achievementChannels).toContain('EMAIL');

      const progressChannels = service.getEnabledChannels(pref, 'PROGRESS_UPDATE');
      expect(progressChannels).not.toContain('EMAIL');
    });
  });

  // ===========================================================================
  // COPPA ROUTING TESTS
  // ===========================================================================

  describe('setupCoppaRouting', () => {
    it('should enable parent routing for child with parent', async () => {
      mockPrismaUser.findFirst.mockResolvedValueOnce({
        id: 'child-001',
        parent: { id: 'parent-001' },
      });
      mockPrismaNotificationPreference.upsert.mockImplementationOnce(({ update }) => ({
        ...createMockPreference(),
        ...update,
      }));

      await service.setupCoppaRouting('child-001', 'tenant-001');

      expect(mockPrismaNotificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ parentRoutingEnabled: true }),
        })
      );
    });

    it('should not enable routing when no parent exists', async () => {
      mockPrismaUser.findFirst.mockResolvedValueOnce({
        id: 'child-001',
        parent: null,
      });

      await service.setupCoppaRouting('child-001', 'tenant-001');

      expect(mockPrismaNotificationPreference.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getRoutingTarget', () => {
    it('should return parent when routing enabled', async () => {
      const mockPref = createMockPreference({ parentRoutingEnabled: true });
      mockPrismaNotificationPreference.findUnique.mockResolvedValueOnce(mockPref);
      mockPrismaUser.findFirst.mockResolvedValueOnce({
        id: 'child-001',
        parent: { id: 'parent-001' },
      });

      const result = await service.getRoutingTarget('child-001', 'tenant-001');

      expect(result.userId).toBe('parent-001');
      expect(result.isParentRouted).toBe(true);
    });

    it('should return original user when routing disabled', async () => {
      const mockPref = createMockPreference({ parentRoutingEnabled: false });
      mockPrismaNotificationPreference.findUnique.mockResolvedValueOnce(mockPref);

      const result = await service.getRoutingTarget('user-001', 'tenant-001');

      expect(result.userId).toBe('user-001');
      expect(result.isParentRouted).toBe(false);
    });
  });

  // ===========================================================================
  // GLOBAL TOGGLE TESTS
  // ===========================================================================

  describe('toggleGlobalNotifications', () => {
    it('should disable all notifications', async () => {
      mockPrismaNotificationPreference.upsert.mockImplementationOnce(({ update }) => ({
        ...createMockPreference(),
        ...update,
      }));

      const result = await service.toggleGlobalNotifications('user-001', 'tenant-001', false);

      expect(result.globalEnabled).toBe(false);
    });

    it('should enable all notifications', async () => {
      mockPrismaNotificationPreference.upsert.mockImplementationOnce(({ update }) => ({
        ...createMockPreference({ globalEnabled: false }),
        ...update,
      }));

      const result = await service.toggleGlobalNotifications('user-001', 'tenant-001', true);

      expect(result.globalEnabled).toBe(true);
    });
  });
});
