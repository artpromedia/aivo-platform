/**
 * ND-3.1: Parent Notification Preferences Service
 *
 * Manages CRUD operations for parent notification preferences.
 * Note: ESLint unsafe warnings are expected until Prisma migration is run.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { PrismaClient } from '@prisma/client';

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
  parentId: string;
  learnerId: string;
  learnerName: string;
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
  email?: string;
  phoneNumber?: string;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursBypassCritical?: boolean;
  digestEnabled?: boolean;
  digestFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  digestTime?: string;
  digestDay?: number;
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
    parentId: string,
    learnerId: string,
    learnerName: string
  ): Promise<ParentNotificationPreferencesData> {
    const existing = await this.prisma.parentNotificationPreferences.findUnique({
      where: {
        parentId_learnerId: { parentId, learnerId },
      },
    });

    if (existing) {
      return this.mapToPreferencesData(existing);
    }

    return this.createDefaultPreferences({
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
        parentId: input.parentId,
        learnerId: input.learnerId,
        learnerName: input.learnerName,
        urgencySettings: DEFAULT_URGENCY_SETTINGS as unknown as Record<string, unknown>,
        categorySettings: DEFAULT_CATEGORY_SETTINGS as unknown as Record<string, unknown>,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        inAppEnabled: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        quietHoursBypassCritical: true,
        digestEnabled: true,
        digestFrequency: 'daily',
        digestTime: '18:00',
        digestDay: 1, // Monday
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
    parentId: string,
    learnerId: string,
    updates: UpdatePreferencesInput
  ): Promise<ParentNotificationPreferencesData> {
    // Build update data, only including provided fields
    const updateData: Record<string, unknown> = {};

    if (updates.urgencySettings !== undefined) {
      updateData.urgencySettings = updates.urgencySettings as unknown as Record<string, unknown>;
    }
    if (updates.categorySettings !== undefined) {
      updateData.categorySettings = updates.categorySettings as unknown as Record<string, unknown>;
    }
    if (updates.pushEnabled !== undefined) updateData.pushEnabled = updates.pushEnabled;
    if (updates.emailEnabled !== undefined) updateData.emailEnabled = updates.emailEnabled;
    if (updates.smsEnabled !== undefined) updateData.smsEnabled = updates.smsEnabled;
    if (updates.inAppEnabled !== undefined) updateData.inAppEnabled = updates.inAppEnabled;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phoneNumber !== undefined) updateData.phoneNumber = updates.phoneNumber;
    if (updates.quietHoursEnabled !== undefined)
      updateData.quietHoursEnabled = updates.quietHoursEnabled;
    if (updates.quietHoursStart !== undefined) updateData.quietHoursStart = updates.quietHoursStart;
    if (updates.quietHoursEnd !== undefined) updateData.quietHoursEnd = updates.quietHoursEnd;
    if (updates.quietHoursBypassCritical !== undefined) {
      updateData.quietHoursBypassCritical = updates.quietHoursBypassCritical;
    }
    if (updates.digestEnabled !== undefined) updateData.digestEnabled = updates.digestEnabled;
    if (updates.digestFrequency !== undefined) updateData.digestFrequency = updates.digestFrequency;
    if (updates.digestTime !== undefined) updateData.digestTime = updates.digestTime;
    if (updates.digestDay !== undefined) updateData.digestDay = updates.digestDay;
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
        parentId_learnerId: { parentId, learnerId },
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
      orderBy: { learnerName: 'asc' },
    });

    return preferences.map((p) => this.mapToPreferencesData(p));
  }

  /**
   * Get preferences for a specific parent-learner pair
   */
  async getPreferences(
    parentId: string,
    learnerId: string
  ): Promise<ParentNotificationPreferencesData | null> {
    const preferences = await this.prisma.parentNotificationPreferences.findUnique({
      where: {
        parentId_learnerId: { parentId, learnerId },
      },
    });

    return preferences ? this.mapToPreferencesData(preferences) : null;
  }

  /**
   * Register a device token for push notifications
   */
  async registerDeviceToken(parentId: string, input: DeviceTokenInput): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: {
        token: input.token,
      },
      create: {
        userId: parentId,
        token: input.token,
        platform: input.platform,
        deviceId: input.deviceId,
        active: true,
      },
      update: {
        active: true,
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
      data: { active: false },
    });
  }

  /**
   * Get active device tokens for a parent
   */
  async getActiveDeviceTokens(parentId: string): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        userId: parentId,
        active: true,
      },
      select: { token: true },
    });

    return tokens.map((t) => t.token);
  }

  /**
   * Check if a channel is enabled for a parent-learner pair
   */
  async isChannelEnabled(
    parentId: string,
    learnerId: string,
    channel: DeliveryChannel
  ): Promise<boolean> {
    const preferences = await this.getPreferences(parentId, learnerId);
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
  async isInQuietHours(parentId: string, learnerId: string): Promise<boolean> {
    const preferences = await this.getPreferences(parentId, learnerId);
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
   * Map database record to preferences data
   */
  private mapToPreferencesData(record: {
    id: string;
    parentId: string;
    learnerId: string;
    learnerName: string;
    urgencySettings: unknown;
    categorySettings: unknown;
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    inAppEnabled: boolean;
    email: string | null;
    phoneNumber: string | null;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    quietHoursBypassCritical: boolean;
    digestEnabled: boolean;
    digestFrequency: string;
    digestTime: string;
    digestDay: number;
    maxNotificationsPerHour: number;
    maxNotificationsPerDay: number;
    timezone: string;
    language: string;
    createdAt: Date;
    updatedAt: Date;
  }): ParentNotificationPreferencesData {
    return {
      id: record.id,
      parentId: record.parentId,
      learnerId: record.learnerId,
      learnerName: record.learnerName,
      urgencySettings:
        record.urgencySettings as ParentNotificationPreferencesData['urgencySettings'],
      categorySettings: record.categorySettings as CategorySettings,
      pushEnabled: record.pushEnabled,
      emailEnabled: record.emailEnabled,
      smsEnabled: record.smsEnabled,
      inAppEnabled: record.inAppEnabled,
      email: record.email ?? undefined,
      phoneNumber: record.phoneNumber ?? undefined,
      quietHoursEnabled: record.quietHoursEnabled,
      quietHoursStart: record.quietHoursStart,
      quietHoursEnd: record.quietHoursEnd,
      quietHoursBypassCritical: record.quietHoursBypassCritical,
      digestEnabled: record.digestEnabled,
      digestFrequency: record.digestFrequency as 'realtime' | 'hourly' | 'daily' | 'weekly',
      digestTime: record.digestTime,
      digestDay: record.digestDay,
      maxNotificationsPerHour: record.maxNotificationsPerHour,
      maxNotificationsPerDay: record.maxNotificationsPerDay,
      timezone: record.timezone,
      language: record.language,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
