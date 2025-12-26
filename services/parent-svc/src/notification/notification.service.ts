/**
 * Notification Service
 *
 * Handles sending notifications to parents via multiple channels:
 * - Email
 * - Push notifications (web, iOS, Android)
 * - SMS (optional)
 */

import { Injectable } from '@nestjs/common';
import { logger, metrics } from '@aivo/ts-observability';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { I18nService } from '../i18n/i18n.service.js';
import { config } from '../config.js';

interface SendNotificationOptions {
  userId: string;
  userType: 'parent' | 'teacher';
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface SendEmailOptions {
  to: string;
  template: string;
  language: string;
  data: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Send a notification to a user
   */
  async send(options: SendNotificationOptions): Promise<void> {
    const { userId, userType, type, title, body, data } = options;

    try {
      if (userType === 'parent') {
        // Get parent and their preferences
        const parent = await this.prisma.parent.findUnique({
          where: { id: userId },
          include: {
            pushSubscriptions: {
              where: { active: true },
            },
          },
        });

        if (!parent) return;

        const prefs = parent.notificationPreferences as Record<string, boolean> | null;

        // Store notification in database
        await this.prisma.parentNotification.create({
          data: {
            parentId: userId,
            type,
            title,
            body,
            data,
          },
        });

        // Send push notification if enabled
        if (prefs?.pushEnabled !== false) {
          await this.sendPushNotification(parent.pushSubscriptions, title, body, data);
        }
      }

      metrics.increment('notification.sent', { type, userType });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send notification', {
        userId,
        type,
        error: message,
      });
    }
  }

  /**
   * Send an email using a template
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, template, language, data } = options;

    try {
      const subject = this.i18n.t(`email.${template}.subject`, language, data);
      const html = await this.renderEmailTemplate(template, language, data);

      await this.email.send({
        to,
        subject,
        html,
        tags: [template],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send template email', {
        to,
        template,
        error: message,
      });
      throw error;
    }
  }

  /**
   * Send push notifications to all subscribed devices
   */
  private async sendPushNotification(
    subscriptions: Array<{ platform: string; token?: string | null; endpoint: string }>,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    for (const sub of subscriptions) {
      try {
        // TODO: Integrate with Firebase Cloud Messaging or other push service
        if (config.environment === 'development') {
          logger.info('Push notification (dev mode)', {
            platform: sub.platform,
            title,
          });
          continue;
        }

        // Example with FCM:
        // await admin.messaging().send({
        //   token: sub.token,
        //   notification: { title, body },
        //   data: data as Record<string, string>,
        // });

        metrics.increment('push.sent', { platform: sub.platform });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to send push notification', {
          endpoint: sub.endpoint,
          error: message,
        });
      }
    }
  }

  /**
   * Render an email template
   */
  private async renderEmailTemplate(
    template: string,
    language: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const t = (key: string) => this.i18n.t(`email.${template}.${key}`, language, data);

    // Common email wrapper
    const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('subject')}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { width: 120px; margin-bottom: 16px; }
    h1 { color: #1a1a2e; font-size: 24px; margin: 0 0 16px; }
    p { margin: 0 0 16px; color: #4a4a4a; }
    .cta-button {
      display: inline-block;
      background-color: #4CAF50;
      color: white;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 16px 0;
    }
    .footer {
      text-align: center;
      color: #999;
      font-size: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${config.appUrl}/images/logo.png" alt="AIVO" class="logo">
    </div>
    <h1>${t('greeting')}</h1>
    <p>${t('body')}</p>
    ${this.renderTemplateContent(template, t, data)}
    <div class="footer">
      <p>© ${new Date().getFullYear()} AIVO Learning</p>
    </div>
  </div>
</body>
</html>
`;

    return html;
  }

  /**
   * Render template-specific content
   */
  private renderTemplateContent(
    template: string,
    t: (key: string) => string,
    data: Record<string, unknown>
  ): string {
    switch (template) {
      case 'parent-invite':
        return `
          <a href="${data.inviteUrl}" class="cta-button">${t('cta')}</a>
          <p style="color: #999; font-size: 14px;">${t('expires')}</p>
        `;

      case 'verify-email':
        return `
          <a href="${data.verifyUrl}" class="cta-button">${t('cta')}</a>
        `;

      default:
        return '';
    }
  }
}
