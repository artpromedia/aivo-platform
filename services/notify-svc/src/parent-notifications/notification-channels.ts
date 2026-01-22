/**
 * ND-3.1: Notification Channels
 *
 * Implements delivery channels for parent notifications.
 * Note: ESLint unsafe warnings are expected until Prisma migration is run.
 */

import { createLogger } from '@aivo/ts-api-utils';
import type { PrismaClient } from '@prisma/client';
import type { App as FirebaseApp } from 'firebase-admin/app';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';

const logger = createLogger('notification-channels');

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
 * Push notification channel using Firebase Cloud Messaging (FCM)
 */
export class PushChannel implements NotificationChannel {
  name = DeliveryChannel.PUSH;
  private firebaseApp: FirebaseApp | null = null;

  constructor(
    private prisma: PrismaClient,
    private config: {
      fcmServiceAccountPath?: string;
      fcmServiceAccountJson?: string;
    }
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      // Check if Firebase is already initialized
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.firebaseApp = existingApps[0];
        return;
      }

      // Initialize Firebase with service account
      if (this.config.fcmServiceAccountJson) {
        const serviceAccount = JSON.parse(this.config.fcmServiceAccountJson);
        this.firebaseApp = initializeApp({
          credential: cert(serviceAccount),
        });
      } else if (this.config.fcmServiceAccountPath) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require(this.config.fcmServiceAccountPath);
        this.firebaseApp = initializeApp({
          credential: cert(serviceAccount),
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Firebase will auto-detect credentials from environment
        this.firebaseApp = initializeApp();
      } else {
        logger.warn('Firebase credentials not configured - push notifications will fail');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase', { err: error });
    }
  }

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
      logger.error('Failed to send push notification', { err: error, parentId });
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
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized - check FCM configuration');
    }

    const messaging = getMessaging(this.firebaseApp);

    // Build FCM multicast message
    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        notification: {
          channelId: payload.channelId,
          sound: payload.sound,
          priority: payload.data?.urgency === 'critical' ? 'max' : 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: payload.sound,
            badge: payload.badge,
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          const errorCode = resp.error?.code;
          // Mark invalid tokens as inactive
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            this.prisma.deviceToken
              .updateMany({
                where: { token: tokens[idx] },
                data: { active: false },
              })
              .catch((err) => {
                logger.warn('Failed to deactivate invalid token', { err, token: tokens[idx] });
              });
          }
        }
      });
      logger.warn('Some push notifications failed', {
        failedCount: response.failureCount,
        successCount: response.successCount,
      });
    }

    logger.info('Push notifications sent via FCM', {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return `fcm_batch_${Date.now()}_${response.successCount}ok_${response.failureCount}fail`;
  }
}

/**
 * Email notification channel using SendGrid or SMTP
 */
export class EmailChannel implements NotificationChannel {
  name = DeliveryChannel.EMAIL;
  private sendgridApiKey?: string;

  constructor(
    private config: {
      sendgridApiKey?: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPass?: string;
      fromAddress?: string;
      fromName?: string;
    }
  ) {
    this.sendgridApiKey = config.sendgridApiKey || process.env.SENDGRID_API_KEY;

    if (!this.sendgridApiKey && !config.smtpHost) {
      logger.warn('Email channel not configured - set SENDGRID_API_KEY or SMTP settings');
    }
  }

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

      const messageId = await this.sendEmail(payload);

      return {
        success: true,
        channel: DeliveryChannel.EMAIL,
        messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to send email notification', { err: error, parentId });
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
      <p style="margin: 0;">This notification was sent by Aivo. <a href="https://app.aivolearning.com/settings/notifications">Manage your preferences</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private async sendEmail(payload: EmailPayload): Promise<string> {
    if (this.sendgridApiKey) {
      return this.sendViaSendGrid(payload);
    } else if (this.config.smtpHost) {
      return this.sendViaSmtp(payload);
    } else {
      throw new Error('Email channel not configured - set SENDGRID_API_KEY or SMTP settings');
    }
  }

  private async sendViaSendGrid(payload: EmailPayload): Promise<string> {
    const fromAddress =
      this.config.fromAddress || process.env.EMAIL_FROM_ADDRESS || 'notifications@aivolearning.com';
    const fromName = this.config.fromName || process.env.EMAIL_FROM_NAME || 'Aivo Learning';

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: payload.to }],
            subject: payload.subject,
          },
        ],
        from: {
          email: fromAddress,
          name: fromName,
        },
        content: [
          { type: 'text/plain', value: payload.text },
          { type: 'text/html', value: payload.html },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
    }

    // SendGrid returns message ID in headers
    const messageId = response.headers.get('x-message-id') || `sg_${Date.now()}`;
    logger.info('Email sent via SendGrid', { to: payload.to, messageId });
    return messageId;
  }

  private async sendViaSmtp(payload: EmailPayload): Promise<string> {
    // Dynamic import for nodemailer to avoid loading it if not needed
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort || 587,
      secure: this.config.smtpPort === 465,
      auth: this.config.smtpUser
        ? {
            user: this.config.smtpUser,
            pass: this.config.smtpPass,
          }
        : undefined,
    });

    const fromAddress =
      this.config.fromAddress || process.env.EMAIL_FROM_ADDRESS || 'notifications@aivolearning.com';
    const fromName = this.config.fromName || process.env.EMAIL_FROM_NAME || 'Aivo Learning';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    logger.info('Email sent via SMTP', { to: payload.to, messageId: info.messageId });
    return info.messageId;
  }
}

/**
 * SMS notification channel using Twilio
 */
export class SMSChannel implements NotificationChannel {
  name = DeliveryChannel.SMS;
  private accountSid?: string;
  private authToken?: string;
  private fromNumber?: string;

  constructor(
    private config: {
      twilioAccountSid?: string;
      twilioAuthToken?: string;
      twilioFromNumber?: string;
    }
  ) {
    this.accountSid = config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
    this.authToken = config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = config.twilioFromNumber || process.env.TWILIO_FROM_NUMBER;

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      logger.warn(
        'Twilio SMS not configured - set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER'
      );
    }
  }

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

      const messageId = await this.sendSMS(payload);

      return {
        success: true,
        channel: DeliveryChannel.SMS,
        messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to send SMS notification', { err: error, parentId });
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
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error(
        'Twilio SMS not configured - set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER'
      );
    }

    // Use Twilio REST API directly to avoid heavy SDK dependency
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const formData = new URLSearchParams({
      To: payload.to,
      From: this.fromNumber,
      Body: payload.body,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Twilio API error: ${response.status} - ${(errorData as { message?: string }).message || 'Unknown error'}`
      );
    }

    const result = (await response.json()) as { sid: string; status: string };
    logger.info('SMS sent via Twilio', { to: payload.to, sid: result.sid, status: result.status });
    return result.sid;
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
    push?: { fcmServiceAccountPath?: string; fcmServiceAccountJson?: string };
    email?: {
      sendgridApiKey?: string;
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
