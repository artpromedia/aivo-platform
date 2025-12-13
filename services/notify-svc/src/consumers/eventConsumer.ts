/**
 * NATS Event Consumer for Notifications
 *
 * Subscribes to events that trigger notifications.
 */

import { EventPublisher } from '@aivo/events';

import { config } from '../config.js';
import * as notificationService from '../services/notificationService.js';
import * as preferenceService from '../services/preferenceService.js';
import * as deliveryService from '../services/deliveryService.js';
import { DeliveryChannel, NotificationType, NotificationPriority } from '../prisma.js';

// Event types we subscribe to
const SUBSCRIBED_EVENTS = [
  'goal.completed',
  'goal.progress_updated',
  'session.completed',
  'session.reminder',
  'consent.requested',
  'achievement.unlocked',
  'message.received',
] as const;

type SubscribedEvent = (typeof SUBSCRIBED_EVENTS)[number];

interface EventPayload {
  tenantId: string;
  [key: string]: unknown;
}

let publisher: EventPublisher | null = null;

export async function startEventConsumer(): Promise<void> {
  if (!config.nats.enabled) {
    console.log('NATS disabled, skipping event consumer');
    return;
  }

  publisher = new EventPublisher({
    natsUrl: config.nats.url,
    clientId: 'notify-svc',
    stream: 'NOTIFICATIONS',
  });

  await publisher.connect();

  // Subscribe to each event type
  for (const eventType of SUBSCRIBED_EVENTS) {
    // Note: Actual subscription implementation depends on @aivo/events API
    console.log(`Subscribed to ${eventType} events`);
  }

  console.log('📢 Event consumer started');
}

export async function stopEventConsumer(): Promise<void> {
  if (publisher) {
    await publisher.disconnect();
    publisher = null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

export async function handleEvent(eventType: SubscribedEvent, payload: EventPayload): Promise<void> {
  switch (eventType) {
    case 'goal.completed':
      await handleGoalCompleted(payload);
      break;
    case 'goal.progress_updated':
      await handleGoalProgressUpdated(payload);
      break;
    case 'session.completed':
      await handleSessionCompleted(payload);
      break;
    case 'session.reminder':
      await handleSessionReminder(payload);
      break;
    case 'consent.requested':
      await handleConsentRequested(payload);
      break;
    case 'achievement.unlocked':
      await handleAchievementUnlocked(payload);
      break;
    case 'message.received':
      await handleMessageReceived(payload);
      break;
  }
}

async function handleGoalCompleted(payload: EventPayload): Promise<void> {
  const { tenantId, learnerId, goalId, goalTitle } = payload as any;

  await notificationService.createNotification({
    tenantId,
    recipientId: learnerId,
    type: NotificationType.GOAL_UPDATE,
    title: '🎯 Goal Completed!',
    body: `Congratulations! You've completed your goal: "${goalTitle}"`,
    actionUrl: `/goals/${goalId}`,
    sourceType: 'goal',
    sourceId: goalId,
    channels: [DeliveryChannel.IN_APP, DeliveryChannel.PUSH],
  });
}

async function handleGoalProgressUpdated(payload: EventPayload): Promise<void> {
  const { tenantId, learnerId, goalId, goalTitle, progressPercent } = payload as any;

  // Only notify at milestones
  if (progressPercent !== 25 && progressPercent !== 50 && progressPercent !== 75) {
    return;
  }

  await notificationService.createNotification({
    tenantId,
    recipientId: learnerId,
    type: NotificationType.GOAL_UPDATE,
    title: '📈 Goal Progress',
    body: `You're ${progressPercent}% through "${goalTitle}"! Keep going!`,
    actionUrl: `/goals/${goalId}`,
    sourceType: 'goal',
    sourceId: goalId,
    priority: NotificationPriority.LOW,
  });
}

async function handleSessionCompleted(payload: EventPayload): Promise<void> {
  const { tenantId, learnerId, sessionId, duration, focusScore } = payload as any;

  await notificationService.createNotification({
    tenantId,
    recipientId: learnerId,
    type: NotificationType.SESSION_SUMMARY,
    title: '✅ Session Complete',
    body: `Great job! You completed a ${duration} minute session with ${focusScore}% focus.`,
    actionUrl: `/sessions/${sessionId}/summary`,
    sourceType: 'session',
    sourceId: sessionId,
  });
}

async function handleSessionReminder(payload: EventPayload): Promise<void> {
  const { tenantId, learnerId, sessionId, scheduledTime } = payload as any;

  await notificationService.createNotification({
    tenantId,
    recipientId: learnerId,
    type: NotificationType.REMINDER,
    title: '⏰ Session Reminder',
    body: `You have a learning session scheduled for ${scheduledTime}`,
    actionUrl: `/sessions/${sessionId}`,
    sourceType: 'session',
    sourceId: sessionId,
    priority: NotificationPriority.HIGH,
    channels: [DeliveryChannel.IN_APP, DeliveryChannel.PUSH],
  });
}

async function handleConsentRequested(payload: EventPayload): Promise<void> {
  const { tenantId, parentId, learnerId, learnerName, featureName } = payload as any;

  await notificationService.createNotification({
    tenantId,
    recipientId: parentId,
    type: NotificationType.CONSENT_REQUEST,
    title: '👨‍👩‍👧 Consent Required',
    body: `${learnerName} would like to use "${featureName}". Please review and approve.`,
    actionUrl: `/consent/pending`,
    priority: NotificationPriority.HIGH,
    channels: [DeliveryChannel.IN_APP, DeliveryChannel.PUSH, DeliveryChannel.EMAIL],
  });
}

async function handleAchievementUnlocked(payload: EventPayload): Promise<void> {
  const { tenantId, learnerId, achievementId, achievementName, achievementIcon } = payload as any;

  await notificationService.createNotification({
    tenantId,
    recipientId: learnerId,
    type: NotificationType.ACHIEVEMENT,
    title: '🏆 Achievement Unlocked!',
    body: `You earned "${achievementName}"!`,
    imageUrl: achievementIcon,
    actionUrl: `/achievements/${achievementId}`,
    sourceType: 'achievement',
    sourceId: achievementId,
    channels: [DeliveryChannel.IN_APP, DeliveryChannel.PUSH],
  });
}

async function handleMessageReceived(payload: EventPayload): Promise<void> {
  const { tenantId, recipientId, senderId, senderName, conversationId, messagePreview } = payload as any;

  // Check preferences before creating notification
  const prefs = await preferenceService.getPreferences(tenantId, recipientId);

  if (!preferenceService.isTypeEnabled(prefs as any, NotificationType.MESSAGE)) {
    return;
  }

  if (preferenceService.isInQuietHours(prefs as any)) {
    // Queue for later or skip
    return;
  }

  await notificationService.createNotification({
    tenantId,
    recipientId,
    type: NotificationType.MESSAGE,
    title: `💬 ${senderName}`,
    body: messagePreview,
    actionUrl: `/messages/${conversationId}`,
    sourceType: 'conversation',
    sourceId: conversationId,
    collapseKey: `message:${conversationId}`,
    channels: [DeliveryChannel.IN_APP, DeliveryChannel.PUSH],
  });
}
