/**
 * Notification Service Types
 */

import type {
  NotificationType,
  DeliveryChannel,
  NotificationPriority,
} from './prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateNotificationInput {
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  actionData?: Record<string, unknown>;
  priority?: NotificationPriority;
  expiresAt?: Date;
  groupKey?: string;
  collapseKey?: string;
  sourceType?: string;
  sourceId?: string;
  channels?: DeliveryChannel[];
}

export interface NotificationFilters {
  tenantId: string;
  recipientId: string;
  type?: NotificationType | NotificationType[];
  isRead?: boolean;
  groupKey?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface BulkNotificationInput {
  tenantId: string;
  recipientIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  priority?: NotificationPriority;
  channels?: DeliveryChannel[];
}

// ══════════════════════════════════════════════════════════════════════════════
// PREFERENCE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface NotificationPreferencesInput {
  inAppEnabled?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  typePreferences?: Record<NotificationType, boolean>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
  digestEnabled?: boolean;
  digestFrequency?: 'daily' | 'weekly';
  digestTime?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// DEVICE TOKEN TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface RegisterDeviceInput {
  tenantId: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
  appVersion?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// DELIVERY TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface DeliveryResult {
  channel: DeliveryChannel;
  success: boolean;
  providerMessageId?: string;
  providerName?: string;
  errorCode?: string;
  errorMessage?: string;
  shouldRemoveToken?: boolean;
}

export interface BatchDeliveryResult {
  channel: DeliveryChannel;
  totalSent: number;
  totalFailed: number;
  results: Array<{
    token: string;
    success: boolean;
    messageId?: string;
    errorCode?: string;
    errorMessage?: string;
    shouldRemoveToken?: boolean;
  }>;
  invalidTokens?: string[];
}

export interface PushPayload {
  token: string;
  platform: 'ios' | 'android' | 'web';
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
  // Advanced options
  channelId?: string;
  clickAction?: string;
  collapseKey?: string;
  ttlSeconds?: number;
  contentAvailable?: boolean;
  mutableContent?: boolean;
  threadId?: string;
  category?: string;
  icon?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

export interface SmsPayload {
  to: string;
  body: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface TemplateContext {
  [key: string]: string | number | boolean | undefined;
}

export interface CreateTemplateInput {
  tenantId?: string;
  templateKey: string;
  type: NotificationType;
  channel: DeliveryChannel;
  locale?: string;
  titleTemplate: string;
  bodyTemplate: string;
  imageUrlTemplate?: string;
  actionUrlTemplate?: string;
  emailSubject?: string;
  emailHtmlTemplate?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULED NOTIFICATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ScheduleNotificationInput {
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  scheduledFor: Date;
  channels: DeliveryChannel[];
  templateKey?: string;
  templateData?: Record<string, unknown>;
  title?: string;
  body?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface NotificationEvent {
  eventType:
    | 'notification.created'
    | 'notification.delivered'
    | 'notification.read'
    | 'notification.failed';
  tenantId: string;
  notificationId: string;
  recipientId: string;
  channel?: DeliveryChannel;
  timestamp: string;
}
