/**
 * ND-3.1: Parent Notification Preferences Service
 *
 * Manages CRUD operations for parent notification preferences.
 * Note: ESLint unsafe warnings are expected until Prisma migration is run.
 */

import type { PrismaClient, Prisma } from '../prisma.js';

import type {
  ParentNotificationPreferencesData,
  CategorySettings,
} from './parent-notification.types.js';
import {
  DEFAULT_URGENCY_SETTINGS,
  DEFAULT_CATEGORY_SETTINGS,
  DeliveryChannel,
} from './parent-notification.types.js';

interface CreatePreferencesInput {
  tenantId: string;
  parentId: string;
  learnerId: string;
  learnerName?: string;
  timezone?: string;
  language?: string;
}

interface UpdatePreferencesInput {
  urgencySettings?: ParentNotificationPreferencesData['urgencySettings'];
  categorySettings?: CategorySettings;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  inAppEnabled?: boolean;
  emailAddress?: string;
  smsPhoneNumber?: string;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursWeekendOnly?: boolean;
  digestEnabled?: boolean;
  digestFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  digestTime?: string;
  digestDayOfWeek?: number;
  maxNotificationsPerHour?: number;
  maxNotificationsPerDay?: number;
  timezone?: string;
  language?: string;
}

interface DeviceTokenInput {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
}

export class NotificationPreferencesService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get or create preferences for a parent-learner pair
   */
  async getOrCreatePreferences(
    tenantId: string,
    parentId: string,
    learnerId: string,
    learnerName?: string
  ): Promise<ParentNotificationPreferencesData> {
    const existing = await this.prisma.parentNotificationPreferences.findUnique({
      where: {
        tenantId_parentId_learnerId: { tenantId, parentId, learnerId },
      },
    });

    if (existing) {
      return this.mapToPreferencesData(existing);
    }

    return this.createDefaultPreferences({
      tenantId,
      parentId,
      learnerId,
      learnerName,
    });
  }

  /**
   * Create default preferences for a new parent-learner relationship
   */
  async createDefaultPreferences(
    input: CreatePreferencesInput
  ): Promise<ParentNotificationPreferencesData> {
    const preferences = await this.prisma.parentNotificationPreferences.create({
      data: {
        tenantId: input.tenantId,
        parentId: input.parentId,
        learnerId: input.learnerId,
        urgencySettings: DEFAULT_URGENCY_SETTINGS as unknown as Prisma.InputJsonValue,
        categorySettings: DEFAULT_CATEGORY_SETTINGS as unknown as Prisma.InputJsonValue,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        inAppEnabled: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        digestEnabled: true,
        digestFrequency: 'daily',
        digestTime: '18:00',
        digestDayOfWeek: 1, // Monday
        maxNotificationsPerHour: 10,
        maxNotificationsPerDay: 50,
        timezone: input.timezone ?? 'America/New_York',
        language: input.language ?? 'en',
      },
    });

    return this.mapToPreferencesData(preferences);
  }

  /**
   * Update preferences for a parent-learner pair
   */
  async updatePreferences(
    tenantId: string,
    parentId: string,
    learnerId: string,
    updates: UpdatePreferencesInput
  ): Promise<ParentNotificationPreferencesData> {
    // Build update data, only including provided fields
    const updateData: Record<string, unknown> = {};

    if (updates.urgencySettings !== undefined) {
      updateData.urgencySettings = updates.urgencySettings as unknown as Prisma.InputJsonValue;
    }
    if (updates.categorySettings !== undefined) {
      updateData.categorySettings = updates.categorySettings as unknown as Prisma.InputJsonValue;
    }
    if (updates.pushEnabled !== undefined) updateData.pushEnabled = updates.pushEnabled;
    if (updates.emailEnabled !== undefined) updateData.emailEnabled = updates.emailEnabled;
    if (updates.smsEnabled !== undefined) updateData.smsEnabled = updates.smsEnabled;
    if (updates.inAppEnabled !== undefined) updateData.inAppEnabled = updates.inAppEnabled;
    if (updates.emailAddress !== undefined) updateData.emailAddress = updates.emailAddress;
    if (updates.smsPhoneNumber !== undefined) updateData.smsPhoneNumber = updates.smsPhoneNumber;
    if (updates.quietHoursEnabled !== undefined)
      updateData.quietHoursEnabled = updates.quietHoursEnabled;
    if (updates.quietHoursStart !== undefined) updateData.quietHoursStart = updates.quietHoursStart;
    if (updates.quietHoursEnd !== undefined) updateData.quietHoursEnd = updates.quietHoursEnd;
    if (updates.quietHoursWeekendOnly !== undefined) {
      updateData.quietHoursWeekendOnly = updates.quietHoursWeekendOnly;
    }
    if (updates.digestEnabled !== undefined) updateData.digestEnabled = updates.digestEnabled;
    if (updates.digestFrequency !== undefined) updateData.digestFrequency = updates.digestFrequency;
    if (updates.digestTime !== undefined) updateData.digestTime = updates.digestTime;
    if (updates.digestDayOfWeek !== undefined) updateData.digestDayOfWeek = updates.digestDayOfWeek;
    if (updates.maxNotificationsPerHour !== undefined) {
      updateData.maxNotificationsPerHour = updates.maxNotificationsPerHour;
    }
    if (updates.maxNotificationsPerDay !== undefined) {
      updateData.maxNotificationsPerDay = updates.maxNotificationsPerDay;
    }
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.language !== undefined) updateData.language = updates.language;

    const preferences = await this.prisma.parentNotificationPreferences.update({
      where: {
        tenantId_parentId_learnerId: { tenantId, parentId, learnerId },
      },
      data: updateData,
    });

    return this.mapToPreferencesData(preferences);
  }

  /**
   * Get all preferences for a parent (across all learners)
   */
  async getPreferencesForParent(parentId: string): Promise<ParentNotificationPreferencesData[]> {
    const preferences = await this.prisma.parentNotificationPreferences.findMany({
      where: { parentId },
      orderBy: { learnerId: 'asc' },
    });

    return preferences.map((p) => this.mapToPreferencesData(p));
  }

  /**
   * Get preferences for a specific parent-learner pair
   */
  async getPreferences(
    tenantId: string,
    parentId: string,
    learnerId: string
  ): Promise<ParentNotificationPreferencesData | null> {
    const preferences = await this.prisma.parentNotificationPreferences.findUnique({
      where: {
        tenantId_parentId_learnerId: { tenantId, parentId, learnerId },
      },
    });

    return preferences ? this.mapToPreferencesData(preferences) : null;
  }

  /**
   * Register a device token for push notifications
   */
  async registerDeviceToken(
    tenantId: string,
    parentId: string,
    input: DeviceTokenInput
  ): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: {
        token: input.token,
      },
      create: {
        tenantId,
        userId: parentId,
        token: input.token,
        platform: input.platform,
        deviceId: input.deviceId,
        isActive: true,
      },
      update: {
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    await this.prisma.deviceToken.update({
      where: { token },
      data: { isActive: false },
    });
  }

  /**
   * Get active device tokens for a parent
   */
  async getActiveDeviceTokens(parentId: string): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        userId: parentId,
        isActive: true,
      },
      select: { token: true },
    });

    return tokens.map((t) => t.token);
  }

  /**
   * Check if a channel is enabled for a parent-learner pair
   */
  async isChannelEnabled(
    tenantId: string,
    parentId: string,
    learnerId: string,
    channel: DeliveryChannel
  ): Promise<boolean> {
    const preferences = await this.getPreferences(tenantId, parentId, learnerId);
    if (!preferences) return false;

    switch (channel) {
      case DeliveryChannel.PUSH:
        return preferences.pushEnabled;
      case DeliveryChannel.EMAIL:
        return preferences.emailEnabled;
      case DeliveryChannel.SMS:
        return preferences.smsEnabled;
      case DeliveryChannel.IN_APP:
        return preferences.inAppEnabled;
      default:
        return false;
    }
  }

  /**
   * Check if currently in quiet hours
   */
  async isInQuietHours(tenantId: string, parentId: string, learnerId: string): Promise<boolean> {
    const preferences = await this.getPreferences(tenantId, parentId, learnerId);
    if (!preferences?.quietHoursEnabled) return false;

    const now = new Date();
    const timezone = preferences.timezone;

    // Convert current time to parent's timezone
    const localTime = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const [currentHour, currentMinute] = localTime.split(':').map(Number);
    const currentMinutes = (currentHour ?? 0) * 60 + (currentMinute ?? 0);

    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
    const startMinutes = (startHour ?? 0) * 60 + (startMinute ?? 0);

    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
    const endMinutes = (endHour ?? 0) * 60 + (endMinute ?? 0);

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Map database record to preferences data.
   * The record parameter matches the Prisma ParentNotificationPreferences model output.
   * Fields not present in Prisma (learnerName, quietHoursBypassCritical) get default/fallback values.
   */
  private mapToPreferencesData(record: {
    id: string;
    parentId: string;
    learnerId: string;
    tenantId: string;
    notificationsEnabled: boolean;
    urgencySettings: unknown;
    categorySettings: unknown;
    preferredChannels: string[];
    pushEnabled: boolean;
    pushDeviceTokens: unknown;
    emailEnabled: boolean;
    emailAddress: string | null;
    emailFormat: string;
    smsEnabled: boolean;
    smsPhoneNumber: string | null;
    smsForCriticalOnly: boolean;
    inAppEnabled: boolean;
    inAppBadgeCount: boolean;
    timezone: string;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    quietHoursWeekendOnly: boolean;
    digestEnabled: boolean;
    digestFrequency: string;
    digestTime: string;
    digestDayOfWeek: number | null;
    digestIncludeDetails: boolean;
    maxNotificationsPerHour: number;
    maxNotificationsPerDay: number;
    cooldownMinutes: number;
    language: string;
    useSimpleLanguage: boolean;
    includeActionItems: boolean;
    includeResources: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ParentNotificationPreferencesData {
    return {
      id: record.id,
      parentId: record.parentId,
      learnerId: record.learnerId,
      tenantId: record.tenantId,
      notificationsEnabled: record.notificationsEnabled,
      urgencySettings:
        record.urgencySettings as ParentNotificationPreferencesData['urgencySettings'],
      categorySettings: record.categorySettings as CategorySettings,
      preferredChannels:
        record.preferredChannels as ParentNotificationPreferencesData['preferredChannels'],
      pushEnabled: record.pushEnabled,
      pushDeviceTokens: (record.pushDeviceTokens ??
        []) as ParentNotificationPreferencesData['pushDeviceTokens'],
      emailEnabled: record.emailEnabled,
      emailAddress: record.emailAddress ?? undefined,
      emailFormat: record.emailFormat as ParentNotificationPreferencesData['emailFormat'],
      smsEnabled: record.smsEnabled,
      smsPhoneNumber: record.smsPhoneNumber ?? undefined,
      smsForCriticalOnly: record.smsForCriticalOnly,
      inAppEnabled: record.inAppEnabled,
      inAppBadgeCount: record.inAppBadgeCount,
      timezone: record.timezone,
      quietHoursEnabled: record.quietHoursEnabled,
      quietHoursStart: record.quietHoursStart,
      quietHoursEnd: record.quietHoursEnd,
      quietHoursWeekendOnly: record.quietHoursWeekendOnly,
      quietHoursBypassCritical: undefined,
      digestEnabled: record.digestEnabled,
      digestFrequency:
        record.digestFrequency as ParentNotificationPreferencesData['digestFrequency'],
      digestTime: record.digestTime,
      digestDayOfWeek: record.digestDayOfWeek ?? undefined,
      digestIncludeDetails: record.digestIncludeDetails,
      maxNotificationsPerHour: record.maxNotificationsPerHour,
      maxNotificationsPerDay: record.maxNotificationsPerDay,
      cooldownMinutes: record.cooldownMinutes,
      language: record.language,
      useSimpleLanguage: record.useSimpleLanguage,
      includeActionItems: record.includeActionItems,
      includeResources: record.includeResources,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
