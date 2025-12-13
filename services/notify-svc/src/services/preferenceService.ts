/**
 * Preference Service
 *
 * Manages user notification preferences.
 */

import { prisma, NotificationType, DeliveryChannel } from '../prisma.js';
import type { NotificationPreferencesInput } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// PREFERENCES
// ══════════════════════════════════════════════════════════════════════════════

export async function getPreferences(tenantId: string, userId: string) {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!prefs) {
    // Return defaults
    return {
      userId,
      tenantId,
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
  }

  return prefs;
}

export async function updatePreferences(
  tenantId: string,
  userId: string,
  input: NotificationPreferencesInput
) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {
      ...(input.inAppEnabled !== undefined && { inAppEnabled: input.inAppEnabled }),
      ...(input.pushEnabled !== undefined && { pushEnabled: input.pushEnabled }),
      ...(input.emailEnabled !== undefined && { emailEnabled: input.emailEnabled }),
      ...(input.smsEnabled !== undefined && { smsEnabled: input.smsEnabled }),
      ...(input.typePreferences !== undefined && { typePreferences: input.typePreferences }),
      ...(input.quietHoursStart !== undefined && { quietHoursStart: input.quietHoursStart }),
      ...(input.quietHoursEnd !== undefined && { quietHoursEnd: input.quietHoursEnd }),
      ...(input.quietHoursTimezone !== undefined && { quietHoursTimezone: input.quietHoursTimezone }),
      ...(input.digestEnabled !== undefined && { digestEnabled: input.digestEnabled }),
      ...(input.digestFrequency !== undefined && { digestFrequency: input.digestFrequency }),
      ...(input.digestTime !== undefined && { digestTime: input.digestTime }),
    },
    create: {
      tenantId,
      userId,
      inAppEnabled: input.inAppEnabled ?? true,
      pushEnabled: input.pushEnabled ?? true,
      emailEnabled: input.emailEnabled ?? true,
      smsEnabled: input.smsEnabled ?? false,
      typePreferences: input.typePreferences ?? {},
      quietHoursStart: input.quietHoursStart ?? null,
      quietHoursEnd: input.quietHoursEnd ?? null,
      quietHoursTimezone: input.quietHoursTimezone ?? null,
      digestEnabled: input.digestEnabled ?? false,
      digestFrequency: input.digestFrequency ?? null,
      digestTime: input.digestTime ?? null,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CHANNEL CHECKS
// ══════════════════════════════════════════════════════════════════════════════

export function isChannelEnabled(
  prefs: { inAppEnabled: boolean; pushEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean },
  channel: DeliveryChannel
): boolean {
  switch (channel) {
    case 'IN_APP':
      return prefs.inAppEnabled;
    case 'PUSH':
      return prefs.pushEnabled;
    case 'EMAIL':
      return prefs.emailEnabled;
    case 'SMS':
      return prefs.smsEnabled;
    default:
      return false;
  }
}

export function isTypeEnabled(
  prefs: { typePreferences: Record<string, boolean> },
  type: NotificationType
): boolean {
  const pref = prefs.typePreferences[type];
  // Default to enabled if not explicitly set
  return pref !== false;
}

export function isInQuietHours(
  prefs: { quietHoursStart: string | null; quietHoursEnd: string | null; quietHoursTimezone: string | null }
): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const tz = prefs.quietHoursTimezone || 'UTC';

  // Parse time strings (HH:mm format)
  const [startHour, startMin] = prefs.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = prefs.quietHoursEnd.split(':').map(Number);

  // Get current time in user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const currentHour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const currentMin = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);

  const currentMinutes = currentHour * 60 + currentMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ══════════════════════════════════════════════════════════════════════════════
// DEVICE TOKENS
// ══════════════════════════════════════════════════════════════════════════════

export async function registerDeviceToken(
  tenantId: string,
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web',
  deviceId?: string,
  appVersion?: string
) {
  // Deactivate old token if it exists for different user
  await prisma.deviceToken.updateMany({
    where: { token, userId: { not: userId } },
    data: { isActive: false },
  });

  return prisma.deviceToken.upsert({
    where: { token },
    update: {
      isActive: true,
      lastUsedAt: new Date(),
      deviceId,
      appVersion,
    },
    create: {
      tenantId,
      userId,
      token,
      platform,
      deviceId,
      appVersion,
      isActive: true,
      lastUsedAt: new Date(),
    },
  });
}

export async function getActiveDeviceTokens(userId: string) {
  return prisma.deviceToken.findMany({
    where: { userId, isActive: true },
  });
}

export async function deactivateDeviceToken(token: string) {
  return prisma.deviceToken.updateMany({
    where: { token },
    data: { isActive: false },
  });
}

export async function cleanupStaleTokens(daysInactive: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  const result = await prisma.deviceToken.deleteMany({
    where: {
      lastUsedAt: { lt: cutoffDate },
    },
  });

  return result.count;
}
