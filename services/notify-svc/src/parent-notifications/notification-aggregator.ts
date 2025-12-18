/**
 * ND-3.1: Notification Aggregator
 *
 * Compiles notifications into digests for summarized delivery.
 * Note: ESLint unsafe warnings are expected until Prisma migration is run.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { PrismaClient } from '@prisma/client';

import {
  ParentNotificationCategory,
  ParentNotificationUrgency,
  ParentNotificationStatus,
} from './parent-notification.types.js';

interface DigestNotification {
  id: string;
  category: ParentNotificationCategory;
  urgency: ParentNotificationUrgency;
  title: string;
  body: string;
  timestamp: Date;
  learnerId: string;
  learnerName: string;
  data?: Record<string, unknown>;
}

interface DigestSummary {
  totalNotifications: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  categoryBreakdown: Record<string, number>;
  highlightedItems: DigestNotification[];
  learnerSummaries: LearnerDigestSummary[];
}

interface LearnerDigestSummary {
  learnerId: string;
  learnerName: string;
  notificationCount: number;
  highlights: string[];
  emotionalStateUpdates: number;
  achievements: number;
  sessionsCompleted: number;
}

interface CreateDigestInput {
  parentId: string;
  period: 'hourly' | 'daily' | 'weekly';
  startTime: Date;
  endTime: Date;
}

export class NotificationAggregator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get pending notifications for a digest
   */
  async getPendingNotificationsForDigest(
    parentId: string,
    since: Date
  ): Promise<DigestNotification[]> {
    const notifications = await this.prisma.parentNotificationQueue.findMany({
      where: {
        parentId,
        status: ParentNotificationStatus.PENDING,
        createdAt: { gte: since },
        // Only include notifications that are not urgent enough for immediate delivery
        urgency: {
          in: [
            ParentNotificationUrgency.LOW,
            ParentNotificationUrgency.MEDIUM,
            ParentNotificationUrgency.INFO,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((n) => ({
      id: n.id,
      category: n.category as ParentNotificationCategory,
      urgency: n.urgency as ParentNotificationUrgency,
      title: n.title,
      body: n.body,
      timestamp: n.createdAt,
      learnerId: n.learnerId,
      learnerName: n.learnerName,
      data: n.data as Record<string, unknown> | undefined,
    }));
  }

  /**
   * Create a digest from pending notifications
   */
  async createDigest(input: CreateDigestInput): Promise<string> {
    const notifications = await this.getPendingNotificationsForDigest(
      input.parentId,
      input.startTime
    );

    if (notifications.length === 0) {
      // No notifications to digest
      return '';
    }

    const summary = this.buildDigestSummary(notifications);

    // Create digest record
    const digest = await this.prisma.parentNotificationDigest.create({
      data: {
        parentId: input.parentId,
        period: input.period,
        periodStart: input.startTime,
        periodEnd: input.endTime,
        notifications: notifications as unknown as object[],
        summary: summary as unknown as object,
        status: 'pending',
      },
    });

    // Mark notifications as digested
    await this.prisma.parentNotificationQueue.updateMany({
      where: {
        id: { in: notifications.map((n) => n.id) },
      },
      data: {
        status: ParentNotificationStatus.DIGESTED,
        digestedAt: new Date(),
      },
    });

    return digest.id;
  }

  /**
   * Build a summary for a digest
   */
  buildDigestSummary(notifications: DigestNotification[]): DigestSummary {
    const summary: DigestSummary = {
      totalNotifications: notifications.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      categoryBreakdown: {},
      highlightedItems: [],
      learnerSummaries: [],
    };

    const learnerMap = new Map<string, DigestNotification[]>();

    for (const notification of notifications) {
      // Count by urgency
      switch (notification.urgency) {
        case ParentNotificationUrgency.CRITICAL:
          summary.criticalCount++;
          break;
        case ParentNotificationUrgency.HIGH:
          summary.highCount++;
          break;
        case ParentNotificationUrgency.MEDIUM:
          summary.mediumCount++;
          break;
        case ParentNotificationUrgency.LOW:
          summary.lowCount++;
          break;
      }

      // Count by category
      const category = notification.category;
      summary.categoryBreakdown[category] = (summary.categoryBreakdown[category] ?? 0) + 1;

      // Group by learner
      if (!learnerMap.has(notification.learnerId)) {
        learnerMap.set(notification.learnerId, []);
      }
      learnerMap.get(notification.learnerId)!.push(notification);
    }

    // Get highlighted items (top priority notifications)
    summary.highlightedItems = notifications
      .filter(
        (n) =>
          n.urgency === ParentNotificationUrgency.CRITICAL ||
          n.urgency === ParentNotificationUrgency.HIGH
      )
      .slice(0, 5);

    // Build learner summaries
    for (const [learnerId, learnerNotifications] of learnerMap) {
      const learnerName = learnerNotifications[0]?.learnerName ?? 'Unknown';
      const learnerSummary: LearnerDigestSummary = {
        learnerId,
        learnerName,
        notificationCount: learnerNotifications.length,
        highlights: [],
        emotionalStateUpdates: 0,
        achievements: 0,
        sessionsCompleted: 0,
      };

      for (const notification of learnerNotifications) {
        switch (notification.category) {
          case ParentNotificationCategory.EMOTIONAL_STATE:
            learnerSummary.emotionalStateUpdates++;
            break;
          case ParentNotificationCategory.ACHIEVEMENT:
            learnerSummary.achievements++;
            break;
          case ParentNotificationCategory.SESSION_ACTIVITY:
            if (notification.data?.event === 'session_complete') {
              learnerSummary.sessionsCompleted++;
            }
            break;
        }

        // Add high-priority notifications as highlights
        if (
          notification.urgency === ParentNotificationUrgency.CRITICAL ||
          notification.urgency === ParentNotificationUrgency.HIGH
        ) {
          learnerSummary.highlights.push(notification.title);
        }
      }

      summary.learnerSummaries.push(learnerSummary);
    }

    return summary;
  }

  /**
   * Generate digest content for email/notification
   */
  generateDigestContent(
    summary: DigestSummary,
    period: 'hourly' | 'daily' | 'weekly'
  ): { title: string; body: string; html: string } {
    const periodLabel = period === 'hourly' ? 'Hour' : period === 'daily' ? 'Day' : 'Week';

    const title = `Your ${periodLabel}ly Summary: ${summary.totalNotifications} Updates`;

    // Build plain text body
    const bodyParts: string[] = [];
    bodyParts.push(
      `You have ${summary.totalNotifications} updates from the past ${periodLabel.toLowerCase()}.`
    );

    if (summary.criticalCount > 0 || summary.highCount > 0) {
      bodyParts.push('');
      bodyParts.push('Important Updates:');
      for (const item of summary.highlightedItems) {
        bodyParts.push(`• ${item.learnerName}: ${item.title}`);
      }
    }

    if (summary.learnerSummaries.length > 0) {
      bodyParts.push('');
      bodyParts.push('By Learner:');
      for (const learner of summary.learnerSummaries) {
        const parts: string[] = [];
        if (learner.sessionsCompleted > 0) {
          parts.push(`${learner.sessionsCompleted} sessions`);
        }
        if (learner.achievements > 0) {
          parts.push(`${learner.achievements} achievements`);
        }
        if (learner.emotionalStateUpdates > 0) {
          parts.push(`${learner.emotionalStateUpdates} emotional updates`);
        }
        bodyParts.push(`• ${learner.learnerName}: ${parts.join(', ') || 'No activity'}`);
      }
    }

    const body = bodyParts.join('\n');

    // Build HTML body
    const htmlParts: string[] = [];
    htmlParts.push(
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">'
    );
    htmlParts.push(`<h2>Your ${periodLabel}ly Summary</h2>`);
    htmlParts.push(`<p>You have <strong>${summary.totalNotifications}</strong> updates.</p>`);

    if (summary.highlightedItems.length > 0) {
      htmlParts.push('<h3>Important Updates</h3>');
      htmlParts.push('<ul>');
      for (const item of summary.highlightedItems) {
        const urgencyColor =
          item.urgency === ParentNotificationUrgency.CRITICAL ? '#E53935' : '#FF9800';
        htmlParts.push(
          `<li><strong style="color: ${urgencyColor}">${item.learnerName}</strong>: ${item.title}</li>`
        );
      }
      htmlParts.push('</ul>');
    }

    if (summary.learnerSummaries.length > 0) {
      htmlParts.push('<h3>Activity by Learner</h3>');
      for (const learner of summary.learnerSummaries) {
        htmlParts.push(
          `<div style="margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px;">`
        );
        htmlParts.push(`<strong>${learner.learnerName}</strong>`);
        htmlParts.push('<ul style="margin: 5px 0;">');
        if (learner.sessionsCompleted > 0) {
          htmlParts.push(
            `<li>✅ ${learner.sessionsCompleted} learning session${learner.sessionsCompleted > 1 ? 's' : ''} completed</li>`
          );
        }
        if (learner.achievements > 0) {
          htmlParts.push(
            `<li>🏆 ${learner.achievements} achievement${learner.achievements > 1 ? 's' : ''} earned</li>`
          );
        }
        if (learner.emotionalStateUpdates > 0) {
          htmlParts.push(
            `<li>💙 ${learner.emotionalStateUpdates} emotional state update${learner.emotionalStateUpdates > 1 ? 's' : ''}</li>`
          );
        }
        htmlParts.push('</ul>');
        htmlParts.push('</div>');
      }
    }

    htmlParts.push('<p style="margin-top: 20px; font-size: 12px; color: #666;">');
    htmlParts.push('You can customize your notification preferences in the Aivo app settings.');
    htmlParts.push('</p>');
    htmlParts.push('</div>');

    const html = htmlParts.join('\n');

    return { title, body, html };
  }

  /**
   * Get pending digests that need to be sent
   */
  async getPendingDigests(): Promise<
    {
      id: string;
      parentId: string;
      period: string;
      notifications: DigestNotification[];
      summary: DigestSummary;
    }[]
  > {
    const digests = await this.prisma.parentNotificationDigest.findMany({
      where: {
        status: 'pending',
      },
      orderBy: { createdAt: 'asc' },
    });

    return digests.map((d) => ({
      id: d.id,
      parentId: d.parentId,
      period: d.period,
      notifications: d.notifications as unknown as DigestNotification[],
      summary: d.summary as unknown as DigestSummary,
    }));
  }

  /**
   * Mark a digest as sent
   */
  async markDigestSent(digestId: string): Promise<void> {
    await this.prisma.parentNotificationDigest.update({
      where: { id: digestId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });
  }
}
