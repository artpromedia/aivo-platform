/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unused-vars */
import { logger, metrics } from '@aivo/ts-observability';
import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

import type { PrismaService } from '../prisma/prisma.service';

interface SendNotificationOptions {
  userId?: string;
  userIds?: string[];
  topic?: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
  imageUrl?: string;
  actionUrl?: string;
  sound?: string;
  badge?: number;
  // COPPA compliance
  isChildRecipient?: boolean;
}

interface NotificationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors?: { token: string; error: string }[];
}

@Injectable()
export class PushNotificationService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      logger.info('Firebase Admin initialized');
    }
  }

  /**
   * Send notification to specific user(s)
   */
  async sendToUsers(options: SendNotificationOptions): Promise<NotificationResult> {
    const userIds = options.userIds || (options.userId ? [options.userId] : []);

    if (userIds.length === 0) {
      return { success: false, successCount: 0, failureCount: 0 };
    }

    // Get device tokens for users
    const devices = await this.prisma.deviceToken.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
      },
    });

    if (devices.length === 0) {
      logger.warn('No active devices found for users', { userIds });
      return { success: false, successCount: 0, failureCount: 0 };
    }

    // Check notification preferences
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId: { in: userIds } },
    });

    const preferenceMap = new Map(preferences.map((p) => [p.userId, p]));

    // Filter devices based on preferences and quiet hours
    const eligibleDevices = devices.filter((device) => {
      const pref = preferenceMap.get(device.userId);
      if (!pref?.pushEnabled) return false;
      if (this.isInQuietHours(pref)) return false;
      if (!this.isNotificationTypeEnabled(pref, options.type)) return false;
      return true;
    });

    if (eligibleDevices.length === 0) {
      return { success: true, successCount: 0, failureCount: 0 };
    }

    // COPPA compliance check for child recipients
    if (options.isChildRecipient) {
      if (!this.validateCoppaCompliance(options)) {
        logger.error('Notification failed COPPA compliance check', {
          type: options.type,
        });
        throw new Error('Notification content not COPPA compliant');
      }
    }

    // Build message
    const message = this.buildMessage(options);

    // Send to all tokens
    const tokens = eligibleDevices.map((d) => d.token);
    const response = await this.sendMulticast(tokens, message);

    // Handle failed tokens
    await this.handleFailedTokens(response, eligibleDevices);

    // Log notification
    await this.logNotifications(options, eligibleDevices, response);

    return response;
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(options: SendNotificationOptions): Promise<void> {
    if (!options.topic) {
      throw new Error('Topic is required');
    }

    // COPPA compliance for learner topics
    if (options.topic.includes('learner') && options.topic.includes('educational')) {
      if (!this.validateCoppaCompliance(options)) {
        logger.error('Topic notification failed COPPA compliance', {
          topic: options.topic,
        });
        throw new Error('Notification content not COPPA compliant');
      }
    }

    const message = this.buildMessage(options);

    try {
      await admin.messaging().send({
        ...message,
        topic: options.topic,
      });

      metrics.increment('push_notification.topic.sent', { topic: options.topic });
      logger.info('Topic notification sent', { topic: options.topic });
    } catch (error) {
      logger.error('Failed to send topic notification', {
        topic: options.topic,
        error,
      });
      metrics.increment('push_notification.topic.failed', {
        topic: options.topic,
      });
      throw error;
    }
  }

  /**
   * Send session completion notification to parent
   */
  async notifyParentSessionComplete(
    parentId: string,
    childId: string,
    childName: string,
    sessionSummary: {
      duration: number;
      activitiesCompleted: number;
      xpEarned: number;
      achievements: string[];
    }
  ): Promise<void> {
    const achievementText =
      sessionSummary.achievements.length > 0 ? ` 🏆 Earned: ${sessionSummary.achievements[0]}` : '';

    await this.sendToUsers({
      userId: parentId,
      title: `${childName} completed a session! 🎉`,
      body: `${sessionSummary.activitiesCompleted} activities · ${sessionSummary.xpEarned} XP${achievementText}`,
      type: 'session_completed',
      data: {
        child_id: childId,
        child_name: childName,
        duration: String(sessionSummary.duration),
        xp_earned: String(sessionSummary.xpEarned),
      },
      priority: 'normal',
    });
  }

  /**
   * Send struggling student alert to teacher
   */
  async notifyTeacherStudentStruggling(
    teacherId: string,
    studentId: string,
    studentName: string,
    sessionId: string,
    alertType: string
  ): Promise<void> {
    const alertMessages: Record<string, string> = {
      low_progress: 'is making little progress',
      frustrated: 'appears frustrated',
      disengaged: 'seems disengaged',
      repeated_errors: 'is struggling with similar problems',
      needs_help: 'requested help',
      off_task: 'may be off-task',
    };

    await this.sendToUsers({
      userId: teacherId,
      title: `⚠️ ${studentName} needs help`,
      body: `${studentName} ${alertMessages[alertType] || 'may need assistance'}`,
      type: 'student_struggling',
      data: {
        student_id: studentId,
        student_name: studentName,
        session_id: sessionId,
        alert_type: alertType,
      },
      priority: 'high',
    });
  }

  /**
   * Send achievement notification to learner (COPPA compliant)
   */
  async notifyLearnerAchievement(
    learnerId: string,
    userId: string,
    achievementName: string,
    achievementDescription: string
  ): Promise<void> {
    // Verify learner has notifications enabled (parent controlled)
    const learner = await this.prisma.profile.findUnique({
      where: { id: learnerId },
      include: { notificationSettings: true },
    });

    if (!learner?.notificationSettings?.achievementNotifications) {
      return;
    }

    await this.sendToUsers({
      userId: userId,
      title: '🌟 Achievement Unlocked!',
      body: `You earned "${achievementName}"! ${achievementDescription}`,
      type: 'achievement_unlocked',
      data: {
        learner_id: learnerId,
        achievement_name: achievementName,
      },
      isChildRecipient: true,
      sound: 'achievement_sound',
    });
  }

  /**
   * Send streak milestone notification to learner (COPPA compliant)
   */
  async notifyLearnerStreakMilestone(
    learnerId: string,
    userId: string,
    streakDays: number
  ): Promise<void> {
    const learner = await this.prisma.profile.findUnique({
      where: { id: learnerId },
      include: { notificationSettings: true },
    });

    if (!learner?.notificationSettings?.achievementNotifications) {
      return;
    }

    await this.sendToUsers({
      userId: userId,
      title: `🔥 ${streakDays} Day Streak!`,
      body: `Amazing! You've been learning for ${streakDays} days in a row!`,
      type: 'streak_milestone',
      data: {
        learner_id: learnerId,
        streak_days: String(streakDays),
      },
      isChildRecipient: true,
    });
  }

  /**
   * Send IEP update notification to parent
   */
  async notifyParentIepUpdate(
    parentId: string,
    childId: string,
    childName: string,
    updateType: string,
    goalDescription: string
  ): Promise<void> {
    const typeMessages: Record<string, string> = {
      goal_progress: 'made progress on an IEP goal',
      goal_completed: 'completed an IEP goal! 🎉',
      goal_added: 'has a new IEP goal',
      accommodation_updated: 'has updated accommodations',
    };

    await this.sendToUsers({
      userId: parentId,
      title: `IEP Update: ${childName}`,
      body: `${childName} ${typeMessages[updateType] || 'has an IEP update'}: ${goalDescription}`,
      type: 'iep_update',
      data: {
        child_id: childId,
        child_name: childName,
        update_type: updateType,
      },
      priority: 'normal',
    });
  }

  /**
   * Send parent message notification to teacher
   */
  async notifyTeacherParentMessage(
    teacherId: string,
    parentName: string,
    studentName: string,
    conversationId: string,
    messagePreview: string
  ): Promise<void> {
    await this.sendToUsers({
      userId: teacherId,
      title: `Message from ${parentName}`,
      body: `About ${studentName}: ${messagePreview}`,
      type: 'parent_message',
      data: {
        conversation_id: conversationId,
        parent_name: parentName,
        student_name: studentName,
      },
      priority: 'high',
    });
  }

  /**
   * Send teacher message notification to parent
   */
  async notifyParentTeacherMessage(
    parentId: string,
    teacherName: string,
    childName: string,
    conversationId: string,
    messagePreview: string
  ): Promise<void> {
    await this.sendToUsers({
      userId: parentId,
      title: `Message from ${teacherName}`,
      body: `About ${childName}: ${messagePreview}`,
      type: 'teacher_message',
      data: {
        conversation_id: conversationId,
        teacher_name: teacherName,
        child_name: childName,
      },
      priority: 'high',
    });
  }

  /**
   * Send billing notification
   */
  async notifyBillingEvent(
    userId: string,
    eventType: 'payment_success' | 'payment_failed' | 'subscription_expiring',
    details: {
      amount?: number;
      currency?: string;
      daysUntilExpiry?: number;
      failureReason?: string;
    }
  ): Promise<void> {
    const messages: Record<string, { title: string; body: string }> = {
      payment_success: {
        title: 'Payment Successful ✓',
        body: `Your payment of ${details.currency || '$'}${details.amount?.toFixed(2)} was processed successfully.`,
      },
      payment_failed: {
        title: 'Payment Failed',
        body: `Your payment could not be processed. ${details.failureReason || 'Please update your payment method.'}`,
      },
      subscription_expiring: {
        title: 'Subscription Expiring Soon',
        body: `Your subscription expires in ${details.daysUntilExpiry} days. Renew to continue learning!`,
      },
    };

    const msg = messages[eventType];

    await this.sendToUsers({
      userId,
      title: msg.title,
      body: msg.body,
      type: eventType,
      data: {
        event_type: eventType,
        amount: details.amount?.toString() || '',
        currency: details.currency || '',
      },
      priority: eventType === 'payment_failed' ? 'high' : 'normal',
    });
  }

  private buildMessage(options: SendNotificationOptions): admin.messaging.Message {
    return {
      notification: {
        title: options.title,
        body: options.body,
        imageUrl: options.imageUrl,
      },
      data: {
        type: options.type,
        ...options.data,
        action_url: options.actionUrl || '',
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: options.priority === 'high' ? 'high' : 'normal',
        notification: {
          channelId: this.getChannelForType(options.type),
          sound: options.sound || 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        headers: {
          'apns-priority': options.priority === 'high' ? '10' : '5',
        },
        payload: {
          aps: {
            sound: options.sound || 'default',
            badge: options.badge,
            'mutable-content': 1,
            'thread-id': options.type,
          },
        },
      },
    } as admin.messaging.Message;
  }

  private async sendMulticast(
    tokens: string[],
    message: admin.messaging.Message
  ): Promise<NotificationResult> {
    const batchSize = 500; // FCM limit
    let successCount = 0;
    let failureCount = 0;
    const errors: { token: string; error: string }[] = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const response = await admin.messaging().sendEachForMulticast({
        tokens: batch,
        ...message,
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          errors.push({
            token: batch[idx],
            error: resp.error.message,
          });
        }
      });
    }

    metrics.increment('push_notification.sent', { count: String(successCount) });
    metrics.increment('push_notification.failed', { count: String(failureCount) });

    return {
      success: failureCount === 0,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async handleFailedTokens(
    result: NotificationResult,
    devices: { id: string; token: string }[]
  ): Promise<void> {
    if (!result.errors) return;

    const invalidTokenErrors = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
    ];

    const tokensToDeactivate = result.errors
      .filter((e) => invalidTokenErrors.some((err) => e.error.includes(err)))
      .map((e) => e.token);

    if (tokensToDeactivate.length > 0) {
      await this.prisma.deviceToken.updateMany({
        where: { token: { in: tokensToDeactivate } },
        data: { isActive: false },
      });

      logger.info('Deactivated invalid tokens', {
        count: tokensToDeactivate.length,
      });
    }
  }

  private isInQuietHours(pref: {
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
    quietHoursTimezone?: string | null;
  }): boolean {
    if (!pref.quietHoursStart || !pref.quietHoursEnd) return false;

    const now = new Date();
    const [startHour, startMin] = pref.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = pref.quietHoursEnd.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Spans midnight
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  private isNotificationTypeEnabled(
    pref: { preferences?: Record<string, boolean> | null },
    type: string
  ): boolean {
    if (!pref.preferences) return true;

    const typePreference = pref.preferences[type];
    return typePreference !== false;
  }

  private validateCoppaCompliance(options: SendNotificationOptions): boolean {
    const blockedTerms = [
      'buy',
      'purchase',
      'subscribe',
      'upgrade',
      'premium',
      'limited time',
      'act now',
      "don't miss",
      'hurry',
      'sale',
      'discount',
      'offer',
      'free trial',
      'pay',
      'cost',
      'price',
      'money',
    ];

    const content = `${options.title} ${options.body}`.toLowerCase();

    for (const term of blockedTerms) {
      if (content.includes(term)) {
        return false;
      }
    }

    // Validate type is allowed for children
    const allowedChildTypes = [
      'achievement_unlocked',
      'streak_milestone',
      'session_reminder',
      'encouragement',
      'level_up',
      'progress_milestone',
    ];

    return allowedChildTypes.includes(options.type);
  }

  private getChannelForType(type: string): string {
    const channelMap: Record<string, string> = {
      session_started: 'session_updates',
      session_completed: 'session_updates',
      session_summary: 'session_updates',
      achievement_unlocked: 'achievements',
      streak_milestone: 'achievements',
      level_up: 'achievements',
      teacher_message: 'messages',
      parent_message: 'messages',
      session_reminder: 'reminders',
      streak_reminder: 'reminders',
      assignment_due: 'reminders',
      student_struggling: 'alerts',
      iep_update: 'alerts',
      iep_goal_due: 'alerts',
      payment_success: 'billing',
      payment_failed: 'billing',
      subscription_expiring: 'billing',
      encouragement: 'encouragement',
    };

    return channelMap[type] || 'session_updates';
  }

  private async logNotifications(
    options: SendNotificationOptions,
    devices: { userId: string }[],
    result: NotificationResult
  ): Promise<void> {
    const logs = devices.map((device) => ({
      userId: device.userId,
      channel: 'PUSH' as const,
      notificationType: options.type,
      title: options.title,
      body: options.body,
      data: options.data || {},
      status: result.success ? 'SENT' : 'FAILED',
      sentAt: new Date(),
    }));

    await this.prisma.notificationLog.createMany({ data: logs });
  }
}
