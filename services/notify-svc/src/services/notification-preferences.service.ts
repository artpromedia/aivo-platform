/**
 * Notification Preferences Service
 *
 * Manages user notification preferences including:
 * - Channel preferences (push, email, SMS, in-app)
 * - Notification type preferences
 * - Quiet hours configuration
 * - COPPA compliance (route child notifications to parent)
 */

import { DateTime } from 'luxon';

import { prisma } from '../prisma.js';
import type { NotificationPreference, NotificationType, DeliveryChannel } from '../prisma.js';
import type { NotificationPreferencesInput } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface UserPreferences {
  id: string;
  userId: string;
  tenantId: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  typePreferences: Record<string, boolean>;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string | null;
  digestEnabled: boolean;
  digestFrequency: string | null;
  digestTime: string | null;
}

export interface CoppaRoutingConfig {
  learnerId: string;
  learnerAge: number;
  parentUserId: string | null;
  parentDeviceTokens: string[];
}

export interface DeliveryDecision {
  shouldDeliver: boolean;
  channels: DeliveryChannel[];
  recipientUserId: string; // May be parent for COPPA
  isQuietHours: boolean;
  queueForDigest: boolean;
  reason?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const COPPA_AGE_THRESHOLD = 13;
const DEFAULT_TIMEZONE = 'America/New_York';

// Notification types that should always go to parents for young learners
const PARENT_ONLY_NOTIFICATION_TYPES: NotificationType[] = [
  'CONSENT_REQUEST',
  'ALERT',
];

// Notification types that can be sent during quiet hours
const URGENT_NOTIFICATION_TYPES: NotificationType[] = [
  'ALERT',
];

// ══════════════════════════════════════════════════════════════════════════════
// PREFERENCES CRUD
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get or create notification preferences for a user
 */
export async function getOrCreatePreferences(
  userId: string,
  tenantId: string
): Promise<UserPreferences> {
  let preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!preferences) {
    preferences = await prisma.notificationPreference.create({
      data: {
        userId,
        tenantId,
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        typePreferences: getDefaultTypePreferences(),
        digestEnabled: false,
      },
    });

    console.log('[PreferencesService] Created default preferences:', { userId });
  }

  return mapToUserPreferences(preferences);
}

/**
 * Get preferences for a user (returns null if not found)
 */
export async function getPreferences(userId: string): Promise<UserPreferences | null> {
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  return preferences ? mapToUserPreferences(preferences) : null;
}

/**
 * Update notification preferences
 */
export async function updatePreferences(
  userId: string,
  tenantId: string,
  input: NotificationPreferencesInput
): Promise<UserPreferences> {
  const existing = await getOrCreatePreferences(userId, tenantId);

  // Merge type preferences
  let typePreferences = existing.typePreferences;
  if (input.typePreferences) {
    typePreferences = {
      ...existing.typePreferences,
      ...input.typePreferences,
    };
  }

  const updated = await prisma.notificationPreference.update({
    where: { userId },
    data: {
      ...(input.inAppEnabled !== undefined && { inAppEnabled: input.inAppEnabled }),
      ...(input.pushEnabled !== undefined && { pushEnabled: input.pushEnabled }),
      ...(input.emailEnabled !== undefined && { emailEnabled: input.emailEnabled }),
      ...(input.smsEnabled !== undefined && { smsEnabled: input.smsEnabled }),
      typePreferences,
      ...(input.quietHoursStart !== undefined && { quietHoursStart: input.quietHoursStart }),
      ...(input.quietHoursEnd !== undefined && { quietHoursEnd: input.quietHoursEnd }),
      ...(input.quietHoursTimezone !== undefined && { quietHoursTimezone: input.quietHoursTimezone }),
      ...(input.digestEnabled !== undefined && { digestEnabled: input.digestEnabled }),
      ...(input.digestFrequency !== undefined && { digestFrequency: input.digestFrequency }),
      ...(input.digestTime !== undefined && { digestTime: input.digestTime }),
    },
  });

  console.log('[PreferencesService] Preferences updated:', { userId });

  return mapToUserPreferences(updated);
}

/**
 * Delete preferences for a user
 */
export async function deletePreferences(userId: string): Promise<boolean> {
  try {
    await prisma.notificationPreference.delete({
      where: { userId },
    });
    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DELIVERY DECISION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Determine if and how to deliver a notification
 * Handles preferences, quiet hours, and COPPA routing
 */
export async function makeDeliveryDecision(
  userId: string,
  tenantId: string,
  notificationType: NotificationType,
  requestedChannels: DeliveryChannel[],
  coppaConfig?: CoppaRoutingConfig
): Promise<DeliveryDecision> {
  const preferences = await getOrCreatePreferences(userId, tenantId);

  // Check if notification type is enabled
  const typeEnabled = isNotificationTypeEnabled(preferences, notificationType);
  if (!typeEnabled) {
    return {
      shouldDeliver: false,
      channels: [],
      recipientUserId: userId,
      isQuietHours: false,
      queueForDigest: false,
      reason: 'Notification type disabled by user',
    };
  }

  // COPPA routing - route to parent for children under 13
  let recipientUserId = userId;
  let recipientPreferences = preferences;

  if (coppaConfig && coppaConfig.learnerAge < COPPA_AGE_THRESHOLD) {
    if (!coppaConfig.parentUserId) {
      // No parent configured, cannot deliver to child
      return {
        shouldDeliver: false,
        channels: [],
        recipientUserId: userId,
        isQuietHours: false,
        queueForDigest: false,
        reason: 'COPPA: No parent configured for minor',
      };
    }

    // Route to parent
    recipientUserId = coppaConfig.parentUserId;
    const parentPrefs = await getPreferences(coppaConfig.parentUserId);
    if (parentPrefs) {
      recipientPreferences = parentPrefs;
    }

    console.log('[PreferencesService] COPPA routing to parent:', {
      learnerId: coppaConfig.learnerId,
      parentUserId: coppaConfig.parentUserId,
    });
  }

  // Filter channels based on preferences
  const enabledChannels = filterChannelsByPreferences(
    requestedChannels,
    recipientPreferences
  );

  if (enabledChannels.length === 0) {
    return {
      shouldDeliver: false,
      channels: [],
      recipientUserId,
      isQuietHours: false,
      queueForDigest: false,
      reason: 'All requested channels disabled by user',
    };
  }

  // Check quiet hours
  const isQuietHours = checkQuietHours(recipientPreferences);
  const isUrgent = URGENT_NOTIFICATION_TYPES.includes(notificationType);

  if (isQuietHours && !isUrgent) {
    // Check if user wants digest
    if (recipientPreferences.digestEnabled) {
      return {
        shouldDeliver: false,
        channels: enabledChannels,
        recipientUserId,
        isQuietHours: true,
        queueForDigest: true,
        reason: 'Quiet hours - queued for digest',
      };
    }

    // Filter out push during quiet hours
    const quietHoursChannels = enabledChannels.filter(
      (c) => c !== 'PUSH'
    ) as DeliveryChannel[];

    if (quietHoursChannels.length === 0) {
      return {
        shouldDeliver: false,
        channels: [],
        recipientUserId,
        isQuietHours: true,
        queueForDigest: false,
        reason: 'Quiet hours - push disabled, no other channels available',
      };
    }

    return {
      shouldDeliver: true,
      channels: quietHoursChannels,
      recipientUserId,
      isQuietHours: true,
      queueForDigest: false,
    };
  }

  return {
    shouldDeliver: true,
    channels: enabledChannels,
    recipientUserId,
    isQuietHours: false,
    queueForDigest: false,
  };
}

/**
 * Check if it's currently quiet hours for a user
 */
export function checkQuietHours(preferences: UserPreferences): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
    return false;
  }

  const timezone = preferences.quietHoursTimezone || DEFAULT_TIMEZONE;
  const now = DateTime.now().setZone(timezone);
  
  const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);

  const currentMinutes = now.hour * 60 + now.minute;
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startMinutes > endMinutes) {
    // Quiet hours span midnight
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  // Same day quiet hours
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Get the next delivery time after quiet hours end
 */
export function getNextDeliveryTime(preferences: UserPreferences): Date | null {
  if (!preferences.quietHoursEnd) {
    return null;
  }

  const timezone = preferences.quietHoursTimezone || DEFAULT_TIMEZONE;
  const now = DateTime.now().setZone(timezone);
  
  const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
  
  let deliveryTime = now.set({ hour: endHour, minute: endMinute, second: 0, millisecond: 0 });
  
  // If end time has passed today, schedule for tomorrow
  if (deliveryTime <= now) {
    deliveryTime = deliveryTime.plus({ days: 1 });
  }

  return deliveryTime.toJSDate();
}

// ══════════════════════════════════════════════════════════════════════════════
// COPPA HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a notification should be routed to parent
 */
export function shouldRouteToParent(
  notificationType: NotificationType,
  learnerAge: number
): boolean {
  // Always route to parent for children under 13
  if (learnerAge < COPPA_AGE_THRESHOLD) {
    return true;
  }

  // Route parent-only notification types regardless of age
  if (PARENT_ONLY_NOTIFICATION_TYPES.includes(notificationType)) {
    return true;
  }

  return false;
}

/**
 * Get parent notification preferences for a learner
 */
export async function getParentPreferencesForLearner(
  learnerId: string,
  tenantId: string
): Promise<{
  parentId: string | null;
  preferences: UserPreferences | null;
}> {
  // Query parent notification preferences model
  const parentPrefs = await prisma.parentNotificationPreferences.findFirst({
    where: {
      learnerId,
      tenantId,
      notificationsEnabled: true,
    },
  });

  if (!parentPrefs) {
    return { parentId: null, preferences: null };
  }

  const preferences = await getPreferences(parentPrefs.parentId);

  return {
    parentId: parentPrefs.parentId,
    preferences,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function mapToUserPreferences(pref: NotificationPreference): UserPreferences {
  return {
    id: pref.id,
    userId: pref.userId,
    tenantId: pref.tenantId,
    inAppEnabled: pref.inAppEnabled,
    pushEnabled: pref.pushEnabled,
    emailEnabled: pref.emailEnabled,
    smsEnabled: pref.smsEnabled,
    typePreferences: (pref.typePreferences as Record<string, boolean>) || {},
    quietHoursStart: pref.quietHoursStart,
    quietHoursEnd: pref.quietHoursEnd,
    quietHoursTimezone: pref.quietHoursTimezone,
    digestEnabled: pref.digestEnabled,
    digestFrequency: pref.digestFrequency,
    digestTime: pref.digestTime,
  };
}

function getDefaultTypePreferences(): Record<string, boolean> {
  return {
    SYSTEM: true,
    ACHIEVEMENT: true,
    REMINDER: true,
    GOAL_UPDATE: true,
    SESSION_SUMMARY: true,
    CONSENT_REQUEST: true,
    MESSAGE: true,
    ALERT: true,
  };
}

function isNotificationTypeEnabled(
  preferences: UserPreferences,
  notificationType: NotificationType
): boolean {
  const typePrefs = preferences.typePreferences || {};
  
  // Default to enabled if not explicitly set
  if (!(notificationType in typePrefs)) {
    return true;
  }

  return typePrefs[notificationType] === true;
}

function filterChannelsByPreferences(
  requestedChannels: DeliveryChannel[],
  preferences: UserPreferences
): DeliveryChannel[] {
  return requestedChannels.filter((channel) => {
    switch (channel) {
      case 'IN_APP':
        return preferences.inAppEnabled;
      case 'PUSH':
        return preferences.pushEnabled;
      case 'EMAIL':
        return preferences.emailEnabled;
      case 'SMS':
        return preferences.smsEnabled;
      default:
        return true;
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get preferences for multiple users
 */
export async function getPreferencesForUsers(
  userIds: string[]
): Promise<Map<string, UserPreferences>> {
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      userId: { in: userIds },
    },
  });

  const prefMap = new Map<string, UserPreferences>();
  for (const pref of preferences) {
    prefMap.set(pref.userId, mapToUserPreferences(pref));
  }

  return prefMap;
}

/**
 * Get users who have a specific channel enabled
 */
export async function getUsersWithChannelEnabled(
  tenantId: string,
  channel: DeliveryChannel
): Promise<string[]> {
  const field = getChannelField(channel);
  if (!field) return [];

  const preferences = await prisma.notificationPreference.findMany({
    where: {
      tenantId,
      [field]: true,
    },
    select: {
      userId: true,
    },
  });

  return preferences.map((p) => p.userId);
}

function getChannelField(channel: DeliveryChannel): string | null {
  switch (channel) {
    case 'IN_APP':
      return 'inAppEnabled';
    case 'PUSH':
      return 'pushEnabled';
    case 'EMAIL':
      return 'emailEnabled';
    case 'SMS':
      return 'smsEnabled';
    default:
      return null;
  }
}
