/**
 * ND-3.1: Notification Channels
 *
 * Implements delivery channels for parent notifications.
 * Note: ESLint unsafe warnings are expected until Prisma migration is run.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { PrismaClient } from '@prisma/client';

import {
  DeliveryChannel,
  ParentNotificationStatus,
  type NotificationContent,
} from './parent-notification.types.js';

interface DeliveryResult {
  success: boolean;
  channel: DeliveryChannel;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
  channelId?: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface SMSPayload {
  to: string;
  body: string;
}

/**
 * Base channel interface
 */
interface NotificationChannel {
  name: DeliveryChannel;
  send(recipientId: string, content: NotificationContent): Promise<DeliveryResult>;
}

/**
 * Push notification channel
 */
export class PushChannel implements NotificationChannel {
  name = DeliveryChannel.PUSH;

  constructor(
    private prisma: PrismaClient,
    private config: {
      fcmServerKey?: string;
      apnsKeyId?: string;
      apnsTeamId?: string;
    }
  ) {}

  async send(parentId: string, content: NotificationContent): Promise<DeliveryResult> {
    try {
      // Get active device tokens for the parent
      const tokens = await this.prisma.deviceToken.findMany({
        where: {
          userId: parentId,
          active: true,
        },
      });

      if (tokens.length === 0) {
        return {
          success: false,
          channel: DeliveryChannel.PUSH,
          error: 'no_device_tokens',
          timestamp: new Date(),
        };
      }

      const payload: PushNotificationPayload = {
        title: content.title,
        body: content.body,
        data: {
          category: content.category,
          urgency: content.urgency,
          learnerId: content.learnerId ?? '',
          notificationId: content.notificationId ?? '',
          ...(content.deepLink ? { deepLink: content.deepLink } : {}),
        },
        sound: content.urgency === 'critical' ? 'urgent.wav' : 'default',
        channelId: this.getAndroidChannelId(content.urgency),
      };

      // In production, this would send via FCM/APNs
      // For now, we'll simulate the send
      const messageId = await this.sendPushNotification(
        tokens.map((t) => t.token),
        payload
      );

      return {
        success: true,
        channel: DeliveryChannel.PUSH,
        messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        channel: DeliveryChannel.PUSH,
        error: error instanceof Error ? error.message : 'unknown_error',
        timestamp: new Date(),
      };
    }
  }

  private getAndroidChannelId(urgency: string): string {
    switch (urgency) {
      case 'critical':
        return 'aivo_critical';
      case 'high':
        return 'aivo_high';
      case 'medium':
        return 'aivo_medium';
      default:
        return 'aivo_default';
    }
  }

  private async sendPushNotification(
    tokens: string[],
    payload: PushNotificationPayload
  ): Promise<string> {
    // Placeholder for actual FCM/APNs implementation
    // In production, integrate with Firebase Admin SDK or APNs
    console.log('Sending push notification:', { tokens: tokens.length, payload });

    // Simulate message ID
    return `push_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Email notification channel
 */
export class EmailChannel implements NotificationChannel {
  name = DeliveryChannel.EMAIL;

  constructor(
    private config: {
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPass?: string;
      fromAddress?: string;
      fromName?: string;
    }
  ) {}

  async send(parentId: string, content: NotificationContent): Promise<DeliveryResult> {
    try {
      const email = content.recipientEmail;
      if (!email) {
        return {
          success: false,
          channel: DeliveryChannel.EMAIL,
          error: 'no_email_address',
          timestamp: new Date(),
        };
      }

      const payload: EmailPayload = {
        to: email,
        subject: content.title,
        text: content.body,
        html: this.buildEmailHtml(content),
      };

      // In production, this would send via SMTP or email service
      const messageId = await this.sendEmail(payload);

      return {
        success: true,
        channel: DeliveryChannel.EMAIL,
        messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        channel: DeliveryChannel.EMAIL,
        error: error instanceof Error ? error.message : 'unknown_error',
        timestamp: new Date(),
      };
    }
  }

  private buildEmailHtml(content: NotificationContent): string {
    const urgencyColors: Record<string, string> = {
      critical: '#E53935',
      high: '#FF9800',
      medium: '#FFC107',
      low: '#4CAF50',
      info: '#2196F3',
    };

    const urgencyColor = urgencyColors[content.urgency] ?? '#9E9E9E';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: ${urgencyColor}; padding: 20px; color: white;">
      <h1 style="margin: 0; font-size: 20px;">${content.title}</h1>
      ${content.learnerName ? `<p style="margin: 5px 0 0 0; opacity: 0.9;">About ${content.learnerName}</p>` : ''}
    </div>
    <div style="padding: 20px;">
      <p style="margin: 0 0 15px 0; line-height: 1.6; color: #333;">${content.body}</p>
      ${
        content.deepLink
          ? `<a href="${content.deepLink}" style="display: inline-block; padding: 12px 24px; background: ${urgencyColor}; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px;">View Details</a>`
          : ''
      }
    </div>
    <div style="padding: 15px 20px; background: #f5f5f5; font-size: 12px; color: #666;">
      <p style="margin: 0;">This notification was sent by Aivo. <a href="https://app.aivo.com/settings/notifications">Manage your preferences</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private async sendEmail(payload: EmailPayload): Promise<string> {
    // Placeholder for actual email sending implementation
    // In production, integrate with SendGrid, SES, or SMTP
    console.log('Sending email:', { to: payload.to, subject: payload.subject });

    // Simulate message ID
    return `email_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * SMS notification channel
 */
export class SMSChannel implements NotificationChannel {
  name = DeliveryChannel.SMS;

  constructor(
    private config: {
      twilioAccountSid?: string;
      twilioAuthToken?: string;
      twilioFromNumber?: string;
    }
  ) {}

  async send(parentId: string, content: NotificationContent): Promise<DeliveryResult> {
    try {
      const phoneNumber = content.recipientPhone;
      if (!phoneNumber) {
        return {
          success: false,
          channel: DeliveryChannel.SMS,
          error: 'no_phone_number',
          timestamp: new Date(),
        };
      }

      // SMS has character limits, so we need to be concise
      const body = this.buildSMSBody(content);

      const payload: SMSPayload = {
        to: phoneNumber,
        body,
      };

      // In production, this would send via Twilio or similar
      const messageId = await this.sendSMS(payload);

      return {
        success: true,
        channel: DeliveryChannel.SMS,
        messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        channel: DeliveryChannel.SMS,
        error: error instanceof Error ? error.message : 'unknown_error',
        timestamp: new Date(),
      };
    }
  }

  private buildSMSBody(content: NotificationContent): string {
    // SMS should be under 160 characters ideally
    let body = `Aivo: ${content.title}`;

    if (content.learnerName) {
      body = `Aivo (${content.learnerName}): ${content.title}`;
    }

    // Truncate if too long
    if (body.length > 155) {
      body = body.substring(0, 152) + '...';
    }

    return body;
  }

  private async sendSMS(payload: SMSPayload): Promise<string> {
    // Placeholder for actual SMS sending implementation
    // In production, integrate with Twilio
    console.log('Sending SMS:', { to: payload.to, body: payload.body });

    // Simulate message ID
    return `sms_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * In-app notification channel
 */
export class InAppChannel implements NotificationChannel {
  name = DeliveryChannel.IN_APP;

  constructor(private prisma: PrismaClient) {}

  async send(parentId: string, content: NotificationContent): Promise<DeliveryResult> {
    try {
      // Create in-app notification record
      const notification = await this.prisma.notification.create({
        data: {
          userId: parentId,
          type: 'parent_notification',
          title: content.title,
          body: content.body,
          data: {
            category: content.category,
            urgency: content.urgency,
            learnerId: content.learnerId,
            learnerName: content.learnerName,
            deepLink: content.deepLink,
            richContent: content.richContent,
          },
          priority: this.mapUrgencyToPriority(content.urgency),
          read: false,
        },
      });

      return {
        success: true,
        channel: DeliveryChannel.IN_APP,
        messageId: notification.id,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        channel: DeliveryChannel.IN_APP,
        error: error instanceof Error ? error.message : 'unknown_error',
        timestamp: new Date(),
      };
    }
  }

  private mapUrgencyToPriority(urgency: string): string {
    switch (urgency) {
      case 'critical':
        return 'URGENT';
      case 'high':
        return 'HIGH';
      case 'medium':
        return 'NORMAL';
      default:
        return 'LOW';
    }
  }
}

/**
 * Channel manager that orchestrates delivery across channels
 */
export class ChannelManager {
  private channels = new Map<DeliveryChannel, NotificationChannel>();

  constructor(private prisma: PrismaClient) {}

  /**
   * Register a channel
   */
  registerChannel(channel: NotificationChannel): void {
    this.channels.set(channel.name, channel);
  }

  /**
   * Initialize all channels with configuration
   */
  initialize(config: {
    push?: { fcmServerKey?: string; apnsKeyId?: string; apnsTeamId?: string };
    email?: {
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPass?: string;
      fromAddress?: string;
      fromName?: string;
    };
    sms?: { twilioAccountSid?: string; twilioAuthToken?: string; twilioFromNumber?: string };
  }): void {
    this.registerChannel(new PushChannel(this.prisma, config.push ?? {}));
    this.registerChannel(new EmailChannel(config.email ?? {}));
    this.registerChannel(new SMSChannel(config.sms ?? {}));
    this.registerChannel(new InAppChannel(this.prisma));
  }

  /**
   * Send notification through specified channels
   */
  async send(
    parentId: string,
    content: NotificationContent,
    channels: DeliveryChannel[]
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (const channelType of channels) {
      const channel = this.channels.get(channelType);
      if (channel) {
        const result = await channel.send(parentId, content);
        results.push(result);

        // Log delivery attempt
        await this.logDelivery(parentId, content.notificationId ?? '', result);
      }
    }

    return results;
  }

  /**
   * Log delivery attempt to database
   */
  private async logDelivery(
    parentId: string,
    notificationId: string,
    result: DeliveryResult
  ): Promise<void> {
    if (!notificationId) return;

    await this.prisma.parentNotificationLog.create({
      data: {
        notificationId,
        parentId,
        channel: result.channel,
        status: result.success
          ? ParentNotificationStatus.DELIVERED
          : ParentNotificationStatus.FAILED,
        messageId: result.messageId,
        error: result.error,
        deliveredAt: result.success ? result.timestamp : null,
        failedAt: result.success ? null : result.timestamp,
      },
    });
  }
}
