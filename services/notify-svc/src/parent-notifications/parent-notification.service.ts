/**
 * ND-3.1: Parent Notification Service
 *
 * Main orchestration service for parent notifications with NATS event subscriptions.
 * Note: ESLint unsafe warnings are expected until Prisma migration is run.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import type { PrismaClient } from '@prisma/client';
import type { NatsConnection, Subscription } from 'nats';
import { StringCodec } from 'nats';

import type { NotificationAggregator } from './notification-aggregator.js';
import type { ChannelManager } from './notification-channels.js';
import type { NotificationPreferencesService } from './notification-preferences.service.js';
import type { NotificationScheduler } from './notification-scheduler.js';
import { NotificationTemplates } from './notification-templates.js';
import {
  ParentNotificationCategory,
  ParentNotificationUrgency,
  ParentNotificationStatus,
  DeliveryChannel,
  type NotificationPayload,
  type ParentNotificationPreferencesData,
  type EmotionalStateAlertEvent,
  type SessionCompletedEvent,
  type AchievementEvent,
  type SafetyConcernEvent,
  type GoalUpdateEvent,
  meetsUrgencyThreshold,
} from './parent-notification.types.js';
import { UrgencyClassifier } from './urgency-classifier.js';

interface ParentInfo {
  parentId: string;
  learnerId: string;
  learnerName: string;
}

interface NotificationResult {
  notificationId: string;
  status: 'queued' | 'scheduled' | 'delivered' | 'rate_limited' | 'filtered' | 'failed';
  channels?: DeliveryChannel[];
  scheduledFor?: Date;
  error?: string;
}

export class ParentNotificationService {
  private subscriptions: Subscription[] = [];
  private stringCodec = StringCodec();
  private urgencyClassifier: UrgencyClassifier;
  private templates: NotificationTemplates;

  constructor(
    private prisma: PrismaClient,
    private nats: NatsConnection,
    private preferencesService: NotificationPreferencesService,
    private aggregator: NotificationAggregator,
    private scheduler: NotificationScheduler,
    private channelManager: ChannelManager
  ) {
    this.urgencyClassifier = new UrgencyClassifier();
    this.templates = new NotificationTemplates();
  }

  /**
   * Initialize the service and subscribe to NATS events
   */
  async initialize(): Promise<void> {
    // Subscribe to all relevant NATS topics
    await this.subscribeToEmotionalStateEvents();
    await this.subscribeToSessionEvents();
    await this.subscribeToAchievementEvents();
    await this.subscribeToSafetyEvents();
    await this.subscribeToGoalEvents();
    await this.subscribeToCareTeamEvents();

    // Start the scheduler
    this.scheduler.startDigestScheduler();

    // Start processing scheduled notifications
    this.startNotificationProcessor();

    console.log('ParentNotificationService initialized');
  }

  /**
   * Subscribe to emotional state events
   */
  private async subscribeToEmotionalStateEvents(): Promise<void> {
    const sub = this.nats.subscribe('emotional.state.alert');
    this.subscriptions.push(sub);

    void (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.stringCodec.decode(msg.data)) as EmotionalStateAlertEvent;
          await this.handleEmotionalStateAlert(data);
        } catch (error) {
          console.error('Error processing emotional state alert:', error);
        }
      }
    })();
  }

  /**
   * Subscribe to session events
   */
  private async subscribeToSessionEvents(): Promise<void> {
    const sub = this.nats.subscribe('session.completed');
    this.subscriptions.push(sub);

    void (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.stringCodec.decode(msg.data)) as SessionCompletedEvent;
          await this.handleSessionCompleted(data);
        } catch (error) {
          console.error('Error processing session completed:', error);
        }
      }
    })();
  }

  /**
   * Subscribe to achievement events
   */
  private async subscribeToAchievementEvents(): Promise<void> {
    const subjects = [
      'engagement.badge.earned',
      'engagement.level.up',
      'engagement.streak.milestone',
      'goal.completed',
    ];

    for (const subject of subjects) {
      const sub = this.nats.subscribe(subject);
      this.subscriptions.push(sub);

      void (async () => {
        for await (const msg of sub) {
          try {
            const data = JSON.parse(this.stringCodec.decode(msg.data)) as AchievementEvent;
            await this.handleAchievement(subject, data);
          } catch (error) {
            console.error(`Error processing ${subject}:`, error);
          }
        }
      })();
    }
  }

  /**
   * Subscribe to safety events
   */
  private async subscribeToSafetyEvents(): Promise<void> {
    const sub = this.nats.subscribe('safety.concern.detected');
    this.subscriptions.push(sub);

    void (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.stringCodec.decode(msg.data)) as SafetyConcernEvent;
          await this.handleSafetyConcern(data);
        } catch (error) {
          console.error('Error processing safety concern:', error);
        }
      }
    })();
  }

  /**
   * Subscribe to goal events
   */
  private async subscribeToGoalEvents(): Promise<void> {
    const subjects = ['goal.created', 'goal.progress', 'goal.reminder'];

    for (const subject of subjects) {
      const sub = this.nats.subscribe(subject);
      this.subscriptions.push(sub);

      void (async () => {
        for await (const msg of sub) {
          try {
            const data = JSON.parse(this.stringCodec.decode(msg.data)) as GoalUpdateEvent;
            await this.handleGoalUpdate(subject.replace('goal.', ''), data);
          } catch (error) {
            console.error(`Error processing ${subject}:`, error);
          }
        }
      })();
    }
  }

  /**
   * Subscribe to care team events
   */
  private async subscribeToCareTeamEvents(): Promise<void> {
    const subjects = [
      'careteam.message.received',
      'careteam.meeting.scheduled',
      'careteam.iep.updated',
    ];

    for (const subject of subjects) {
      const sub = this.nats.subscribe(subject);
      this.subscriptions.push(sub);

      void (async () => {
        for await (const msg of sub) {
          try {
            const data = JSON.parse(this.stringCodec.decode(msg.data));
            await this.handleCareTeamEvent(
              subject.replace('careteam.', '').replace('.', '_'),
              data
            );
          } catch (error) {
            console.error(`Error processing ${subject}:`, error);
          }
        }
      })();
    }
  }

  /**
   * Handle emotional state alert
   */
  async handleEmotionalStateAlert(event: EmotionalStateAlertEvent): Promise<void> {
    const parents = await this.getParentsForLearner(event.learnerId);

    for (const parent of parents) {
      const urgency = this.urgencyClassifier.classify(
        ParentNotificationCategory.EMOTIONAL_STATE,
        'state_change',
        {
          state: event.currentState,
          intensity: event.intensity,
          urgency: event.urgency,
        }
      );

      await this.createNotification({
        parentId: parent.parentId,
        learnerId: event.learnerId,
        learnerName: parent.learnerName,
        category: ParentNotificationCategory.EMOTIONAL_STATE,
        event: event.currentState === 'meltdown_risk' ? 'meltdown_risk' : 'state_change',
        urgency,
        data: {
          state: event.currentState,
          previousState: event.previousState,
          intensity: event.intensity,
          trend: event.trend,
          sessionId: event.sessionId,
        },
      });
    }
  }

  /**
   * Handle session completed
   */
  async handleSessionCompleted(event: SessionCompletedEvent): Promise<void> {
    const parents = await this.getParentsForLearner(event.learnerId);

    for (const parent of parents) {
      const urgency = this.urgencyClassifier.classify(
        ParentNotificationCategory.SESSION_ACTIVITY,
        'session_complete',
        { durationMinutes: event.durationMinutes }
      );

      await this.createNotification({
        parentId: parent.parentId,
        learnerId: event.learnerId,
        learnerName: parent.learnerName,
        category: ParentNotificationCategory.SESSION_ACTIVITY,
        event: 'session_complete',
        urgency,
        data: {
          sessionId: event.sessionId,
          subject: event.subject,
          durationMinutes: event.durationMinutes,
          activitiesCompleted: event.activitiesCompleted,
          focusScore: event.focusScore,
          emotionalJourney: event.emotionalJourney,
        },
      });
    }
  }

  /**
   * Handle achievement
   */
  async handleAchievement(subject: string, event: AchievementEvent): Promise<void> {
    const parents = await this.getParentsForLearner(event.learnerId);
    const eventName = subject.split('.').pop() ?? 'achievement';

    for (const parent of parents) {
      const urgency = this.urgencyClassifier.classify(
        ParentNotificationCategory.ACHIEVEMENT,
        eventName,
        event
      );

      await this.createNotification({
        parentId: parent.parentId,
        learnerId: event.learnerId,
        learnerName: parent.learnerName,
        category: ParentNotificationCategory.ACHIEVEMENT,
        event:
          eventName === 'earned' ? 'badge_earned' : eventName === 'up' ? 'level_up' : eventName,
        urgency,
        data: event,
      });
    }
  }

  /**
   * Handle safety concern
   */
  async handleSafetyConcern(event: SafetyConcernEvent): Promise<void> {
    const parents = await this.getParentsForLearner(event.learnerId);

    for (const parent of parents) {
      // Safety concerns are always high priority
      const urgency = this.urgencyClassifier.classify(
        ParentNotificationCategory.SAFETY_CONCERN,
        event.type,
        { severity: event.severity }
      );

      await this.createNotification({
        parentId: parent.parentId,
        learnerId: event.learnerId,
        learnerName: parent.learnerName,
        category: ParentNotificationCategory.SAFETY_CONCERN,
        event: event.type === 'crisis' ? 'crisis_detected' : 'content_flag',
        urgency,
        data: {
          alertId: event.alertId,
          type: event.type,
          severity: event.severity,
          description: event.description,
        },
      });
    }
  }

  /**
   * Handle goal update
   */
  async handleGoalUpdate(event: string, data: GoalUpdateEvent): Promise<void> {
    const parents = await this.getParentsForLearner(data.learnerId);

    for (const parent of parents) {
      const urgency = this.urgencyClassifier.classify(
        ParentNotificationCategory.GOAL_UPDATE,
        event,
        data
      );

      await this.createNotification({
        parentId: parent.parentId,
        learnerId: data.learnerId,
        learnerName: parent.learnerName,
        category: ParentNotificationCategory.GOAL_UPDATE,
        event: `goal_${event}`,
        urgency,
        data,
      });
    }
  }

  /**
   * Handle care team event
   */
  async handleCareTeamEvent(
    event: string,
    data: { learnerId: string; [key: string]: unknown }
  ): Promise<void> {
    const parents = await this.getParentsForLearner(data.learnerId);

    for (const parent of parents) {
      await this.createNotification({
        parentId: parent.parentId,
        learnerId: data.learnerId,
        learnerName: parent.learnerName,
        category: ParentNotificationCategory.CARE_TEAM,
        event,
        urgency: ParentNotificationUrgency.MEDIUM,
        data,
      });
    }
  }

  /**
   * Create a notification
   */
  async createNotification(payload: NotificationPayload): Promise<NotificationResult> {
    // Get preferences
    const preferences = await this.preferencesService.getOrCreatePreferences(
      payload.parentId,
      payload.learnerId,
      payload.learnerName
    );

    // Check if category is enabled
    if (!this.isCategoryEnabled(preferences, payload.category)) {
      return {
        notificationId: '',
        status: 'filtered',
        error: 'category_disabled',
      };
    }

    // Check if urgency meets threshold
    const categorySettings = preferences.categorySettings[payload.category];
    if (
      categorySettings &&
      !meetsUrgencyThreshold(payload.urgency, categorySettings.minimumUrgency)
    ) {
      return {
        notificationId: '',
        status: 'filtered',
        error: 'below_urgency_threshold',
      };
    }

    // Generate content using template
    const content = this.templates.generate(payload.category, payload.event, {
      learnerName: payload.learnerName,
      learnerId: payload.learnerId,
      parentId: payload.parentId,
      ...payload.data,
    });

    // Create notification record
    const notification = await this.prisma.parentNotificationQueue.create({
      data: {
        parentId: payload.parentId,
        learnerId: payload.learnerId,
        learnerName: payload.learnerName,
        category: payload.category,
        event: payload.event,
        urgency: payload.urgency,
        title: content.title,
        body: content.body,
        data: payload.data as object,
        richContent: (content.richContent as object) ?? null,
        deepLink: content.deepLink,
        status: ParentNotificationStatus.PENDING,
      },
    });

    // Schedule notification
    const scheduleResult = await this.scheduler.scheduleNotification(
      notification.id,
      payload.parentId,
      payload.learnerId,
      payload.urgency
    );

    if (!scheduleResult.scheduled) {
      return {
        notificationId: notification.id,
        status: scheduleResult.reason === 'rate_limited' ? 'rate_limited' : 'queued',
      };
    }

    return {
      notificationId: notification.id,
      status: 'scheduled',
      scheduledFor: scheduleResult.scheduledTime,
    };
  }

  /**
   * Check if a category is enabled in preferences
   */
  private isCategoryEnabled(
    preferences: ParentNotificationPreferencesData,
    category: ParentNotificationCategory
  ): boolean {
    const categorySettings = preferences.categorySettings[category];
    return categorySettings?.enabled ?? true;
  }

  /**
   * Start processing scheduled notifications
   */
  private startNotificationProcessor(): void {
    // Process every 10 seconds
    setInterval(() => void this.processScheduledNotifications(), 10000);
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    const scheduled = await this.scheduler.getScheduledNotifications();

    for (const notification of scheduled) {
      try {
        await this.deliverNotification(notification.notificationId);
      } catch (error) {
        console.error(`Failed to deliver notification ${notification.notificationId}:`, error);
      }
    }
  }

  /**
   * Deliver a notification through appropriate channels
   */
  async deliverNotification(notificationId: string): Promise<void> {
    const notification = await this.prisma.parentNotificationQueue.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    const preferences = await this.preferencesService.getPreferences(
      notification.parentId,
      notification.learnerId
    );

    if (!preferences) {
      throw new Error(`Preferences not found for parent ${notification.parentId}`);
    }

    // Determine channels based on urgency and preferences
    const channels = this.getChannelsForUrgency(
      preferences,
      notification.urgency as ParentNotificationUrgency
    );

    if (channels.length === 0) {
      await this.prisma.parentNotificationQueue.update({
        where: { id: notificationId },
        data: {
          status: ParentNotificationStatus.FILTERED,
        },
      });
      return;
    }

    // Prepare content
    const content = {
      title: notification.title,
      body: notification.body,
      category: notification.category,
      urgency: notification.urgency,
      learnerId: notification.learnerId,
      learnerName: notification.learnerName,
      notificationId: notification.id,
      deepLink: notification.deepLink ?? undefined,
      richContent: notification.richContent as Record<string, unknown> | undefined,
      recipientEmail: preferences.email,
      recipientPhone: preferences.phoneNumber,
    };

    // Send through channels
    const results = await this.channelManager.send(notification.parentId, content, channels);

    // Update notification status
    const anySuccess = results.some((r) => r.success);
    await this.prisma.parentNotificationQueue.update({
      where: { id: notificationId },
      data: {
        status: anySuccess ? ParentNotificationStatus.DELIVERED : ParentNotificationStatus.FAILED,
        deliveredAt: anySuccess ? new Date() : null,
      },
    });
  }

  /**
   * Get appropriate channels for urgency level
   */
  private getChannelsForUrgency(
    preferences: ParentNotificationPreferencesData,
    urgency: ParentNotificationUrgency
  ): DeliveryChannel[] {
    const channels: DeliveryChannel[] = [];
    const urgencySettings = preferences.urgencySettings[urgency];

    if (!urgencySettings) {
      // Default to in-app only
      if (preferences.inAppEnabled) {
        channels.push(DeliveryChannel.IN_APP);
      }
      return channels;
    }

    if (urgencySettings.push && preferences.pushEnabled) {
      channels.push(DeliveryChannel.PUSH);
    }
    if (urgencySettings.email && preferences.emailEnabled) {
      channels.push(DeliveryChannel.EMAIL);
    }
    if (urgencySettings.sms && preferences.smsEnabled) {
      channels.push(DeliveryChannel.SMS);
    }
    if (urgencySettings.inApp && preferences.inAppEnabled) {
      channels.push(DeliveryChannel.IN_APP);
    }

    return channels;
  }

  /**
   * Get parents for a learner
   */
  private async getParentsForLearner(learnerId: string): Promise<ParentInfo[]> {
    // Query parent-learner relationships
    // This would typically come from a guardian/family relationship table
    const relationships = await this.prisma.parentNotificationPreferences.findMany({
      where: { learnerId },
      select: {
        parentId: true,
        learnerId: true,
        learnerName: true,
      },
    });

    // If no preferences exist yet, we need to look up from the user service
    // For now, return empty if no preferences exist
    return relationships.map((r) => ({
      parentId: r.parentId,
      learnerId: r.learnerId,
      learnerName: r.learnerName,
    }));
  }

  /**
   * Manually trigger a notification (for testing or admin use)
   */
  async sendManualNotification(
    parentId: string,
    learnerId: string,
    category: ParentNotificationCategory,
    event: string,
    data: Record<string, unknown>
  ): Promise<NotificationResult> {
    const preferences = await this.preferencesService.getPreferences(parentId, learnerId);
    if (!preferences) {
      return {
        notificationId: '',
        status: 'failed',
        error: 'preferences_not_found',
      };
    }

    const urgency = this.urgencyClassifier.classify(category, event, data);

    return this.createNotification({
      parentId,
      learnerId,
      learnerName: preferences.learnerName,
      category,
      event,
      urgency,
      data,
    });
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    // Unsubscribe from all NATS subscriptions
    for (const sub of this.subscriptions) {
      await sub.drain();
    }
    this.subscriptions = [];

    // Stop scheduler
    this.scheduler.stop();

    console.log('ParentNotificationService stopped');
  }
}
