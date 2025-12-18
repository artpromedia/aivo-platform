/**
 * ND-3.1: Notification Scheduler
 *
 * Handles timed delivery and digest scheduling.
 * Note: ESLint unsafe warnings are expected until Prisma migration is run.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { PrismaClient } from '@prisma/client';

import type { NotificationAggregator } from './notification-aggregator.js';
import type { NotificationPreferencesService } from './notification-preferences.service.js';
import {
  ParentNotificationUrgency,
  ParentNotificationStatus,
} from './parent-notification.types.js';

interface ScheduledDelivery {
  notificationId: string;
  parentId: string;
  learnerId: string;
  scheduledTime: Date;
  urgency: ParentNotificationUrgency;
}

interface RateLimitStatus {
  hourlyCount: number;
  dailyCount: number;
  hourlyRemaining: number;
  dailyRemaining: number;
  isRateLimited: boolean;
}

export class NotificationScheduler {
  private digestIntervals = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    private prisma: PrismaClient,
    private aggregator: NotificationAggregator,
    private preferencesService: NotificationPreferencesService
  ) {}

  /**
   * Schedule a notification for delivery
   */
  async scheduleNotification(
    notificationId: string,
    parentId: string,
    learnerId: string,
    urgency: ParentNotificationUrgency
  ): Promise<{ scheduled: boolean; scheduledTime?: Date; reason?: string }> {
    const preferences = await this.preferencesService.getPreferences(parentId, learnerId);
    if (!preferences) {
      return { scheduled: false, reason: 'preferences_not_found' };
    }

    // Check rate limiting
    const rateLimitStatus = await this.checkRateLimit(parentId);
    if (rateLimitStatus.isRateLimited) {
      // Queue for digest instead
      await this.prisma.parentNotificationQueue.update({
        where: { id: notificationId },
        data: {
          status: ParentNotificationStatus.RATE_LIMITED,
          scheduledFor: null,
        },
      });
      return { scheduled: false, reason: 'rate_limited' };
    }

    // Check quiet hours
    const isQuietHours = await this.preferencesService.isInQuietHours(parentId, learnerId);
    if (isQuietHours) {
      // Critical notifications can bypass quiet hours
      if (urgency === ParentNotificationUrgency.CRITICAL && preferences.quietHoursBypassCritical) {
        // Allow immediate delivery
        const scheduledTime = new Date();
        await this.prisma.parentNotificationQueue.update({
          where: { id: notificationId },
          data: {
            status: ParentNotificationStatus.SCHEDULED,
            scheduledFor: scheduledTime,
          },
        });
        return { scheduled: true, scheduledTime };
      }

      // Schedule for after quiet hours
      const scheduledTime = this.getNextAvailableTime(
        preferences.quietHoursEnd,
        preferences.timezone
      );
      await this.prisma.parentNotificationQueue.update({
        where: { id: notificationId },
        data: {
          status: ParentNotificationStatus.SCHEDULED,
          scheduledFor: scheduledTime,
        },
      });
      return { scheduled: true, scheduledTime };
    }

    // Immediate delivery for high urgency
    if (
      urgency === ParentNotificationUrgency.CRITICAL ||
      urgency === ParentNotificationUrgency.HIGH
    ) {
      const scheduledTime = new Date();
      await this.prisma.parentNotificationQueue.update({
        where: { id: notificationId },
        data: {
          status: ParentNotificationStatus.SCHEDULED,
          scheduledFor: scheduledTime,
        },
      });
      return { scheduled: true, scheduledTime };
    }

    // Check if digest mode is enabled
    if (preferences.digestEnabled && preferences.digestFrequency !== 'realtime') {
      // Queue for digest
      await this.prisma.parentNotificationQueue.update({
        where: { id: notificationId },
        data: {
          status: ParentNotificationStatus.PENDING,
        },
      });
      return { scheduled: false, reason: 'queued_for_digest' };
    }

    // Schedule immediate delivery
    const scheduledTime = new Date();
    await this.prisma.parentNotificationQueue.update({
      where: { id: notificationId },
      data: {
        status: ParentNotificationStatus.SCHEDULED,
        scheduledFor: scheduledTime,
      },
    });
    return { scheduled: true, scheduledTime };
  }

  /**
   * Check rate limit status for a parent
   */
  async checkRateLimit(parentId: string): Promise<RateLimitStatus> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get preferences for any learner (rate limits are per-parent)
    const anyPreferences = await this.prisma.parentNotificationPreferences.findFirst({
      where: { parentId },
    });

    const maxPerHour = anyPreferences?.maxNotificationsPerHour ?? 10;
    const maxPerDay = anyPreferences?.maxNotificationsPerDay ?? 50;

    // Count recent deliveries
    const [hourlyCount, dailyCount] = await Promise.all([
      this.prisma.parentNotificationLog.count({
        where: {
          parentId,
          deliveredAt: { gte: oneHourAgo },
          status: ParentNotificationStatus.DELIVERED,
        },
      }),
      this.prisma.parentNotificationLog.count({
        where: {
          parentId,
          deliveredAt: { gte: oneDayAgo },
          status: ParentNotificationStatus.DELIVERED,
        },
      }),
    ]);

    return {
      hourlyCount,
      dailyCount,
      hourlyRemaining: Math.max(0, maxPerHour - hourlyCount),
      dailyRemaining: Math.max(0, maxPerDay - dailyCount),
      isRateLimited: hourlyCount >= maxPerHour || dailyCount >= maxPerDay,
    };
  }

  /**
   * Get the next available time after quiet hours end
   */
  getNextAvailableTime(quietHoursEnd: string, timezone: string): Date {
    const now = new Date();

    // Parse quiet hours end time
    const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);

    // Create a date for today at the end of quiet hours in the target timezone
    const localDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    localDate.setHours(endHour, endMinute, 0, 0);

    // If we're already past quiet hours end, use current time
    const currentLocal = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

    if (currentLocal > localDate) {
      // Schedule for tomorrow
      localDate.setDate(localDate.getDate() + 1);
    }

    // Convert back to UTC
    const offset = this.getTimezoneOffset(timezone);
    return new Date(localDate.getTime() + offset);
  }

  /**
   * Get timezone offset in milliseconds
   */
  private getTimezoneOffset(timezone: string): number {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return utcDate.getTime() - tzDate.getTime();
  }

  /**
   * Get notifications scheduled for delivery
   */
  async getScheduledNotifications(): Promise<ScheduledDelivery[]> {
    const now = new Date();

    const scheduled = await this.prisma.parentNotificationQueue.findMany({
      where: {
        status: ParentNotificationStatus.SCHEDULED,
        scheduledFor: { lte: now },
      },
      orderBy: [{ urgency: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    });

    return scheduled.map((n) => ({
      notificationId: n.id,
      parentId: n.parentId,
      learnerId: n.learnerId,
      scheduledTime: n.scheduledFor ?? new Date(),
      urgency: n.urgency as ParentNotificationUrgency,
    }));
  }

  /**
   * Start the digest scheduler
   */
  startDigestScheduler(): void {
    // Run digest processor every 5 minutes
    const interval = setInterval(() => void this.processDigests(), 5 * 60 * 1000);
    this.digestIntervals.set('digest-processor', interval);
  }

  /**
   * Process pending digests
   */
  async processDigests(): Promise<void> {
    // Find parents who need digests created
    const preferences = await this.prisma.parentNotificationPreferences.findMany({
      where: {
        digestEnabled: true,
        digestFrequency: { not: 'realtime' },
      },
      select: {
        parentId: true,
        digestFrequency: true,
        digestTime: true,
        digestDay: true,
        timezone: true,
      },
    });

    for (const pref of preferences) {
      const shouldCreateDigest = this.shouldCreateDigest(
        pref.digestFrequency as 'hourly' | 'daily' | 'weekly',
        pref.digestTime,
        pref.digestDay,
        pref.timezone
      );

      if (shouldCreateDigest) {
        const period = pref.digestFrequency as 'hourly' | 'daily' | 'weekly';
        const { startTime, endTime } = this.getDigestPeriod(period, pref.timezone);

        await this.aggregator.createDigest({
          parentId: pref.parentId,
          period,
          startTime,
          endTime,
        });
      }
    }
  }

  /**
   * Check if a digest should be created now
   */
  shouldCreateDigest(
    frequency: 'hourly' | 'daily' | 'weekly',
    digestTime: string,
    digestDay: number,
    timezone: string
  ): boolean {
    const now = new Date();
    const localTime = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const localDay = now.toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });

    const [digestHour, digestMinute] = digestTime.split(':').map(Number);
    const [currentHour, currentMinute] = localTime.split(':').map(Number);

    // Check time match (within 5 minute window)
    const safeDigestMinute = digestMinute ?? 0;
    const timeMatch =
      currentHour === digestHour &&
      currentMinute >= safeDigestMinute &&
      currentMinute < safeDigestMinute + 5;

    switch (frequency) {
      case 'hourly':
        return currentMinute >= 0 && currentMinute < 5;

      case 'daily':
        return timeMatch;

      case 'weekly': {
        const dayMap: Record<string, number> = {
          Sun: 0,
          Mon: 1,
          Tue: 2,
          Wed: 3,
          Thu: 4,
          Fri: 5,
          Sat: 6,
        };
        return timeMatch && dayMap[localDay] === digestDay;
      }

      default:
        return false;
    }
  }

  /**
   * Get the time period for a digest
   */
  getDigestPeriod(
    period: 'hourly' | 'daily' | 'weekly',
    _timezone: string
  ): { startTime: Date; endTime: Date } {
    const now = new Date();
    let startTime: Date;

    switch (period) {
      case 'hourly':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    return { startTime, endTime: now };
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    for (const interval of this.digestIntervals.values()) {
      clearInterval(interval);
    }
    this.digestIntervals.clear();
  }
}
