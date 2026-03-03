/**
 * Notification Service
 *
 * Handles sending notifications to parents via multiple channels:
 * - Email (delegated to notify-svc via HTTP API / OonruMail)
 * - Push notifications (web, iOS, Android)
 * - SMS (optional)
 */

import { logger } from '@aivo/ts-observability';

import type { Prisma } from '../../generated/prisma-client/index.js';
import { config } from '../config.js';
import type { EmailService } from '../email/email.service.js';
import type { FirebaseService } from '../firebase/firebase.service.js';
import type { I18nService } from '../i18n/i18n.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

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

// ---------------------------------------------------------------------------
// Template name mapping: parent-svc name → notify-svc templateName
// notify-svc registers Handlebars templates as "<category>/<name>" based on
// the filesystem layout under templates/.  parent-svc historically used
// short, flat names.  This map bridges the two.
// ---------------------------------------------------------------------------
const TEMPLATE_NAME_MAP: Record<string, string> = {
  'verify-email': 'transactional/email-verification',
  'welcome': 'welcome',
  'password-reset': 'transactional/password-reset',
  'parent-invite': 'parent-invite',
  'caregiver-verify-email': 'caregiver/caregiver-verify-email',
  'caregiver-welcome': 'caregiver/caregiver-welcome',
  'caregiver-learner-linked': 'caregiver/caregiver-learner-linked',
  'caregiver-verification-pending': 'caregiver/caregiver-verification-pending',
  'caregiver-invite': 'caregiver-invite',
  'caregiver-verification': 'caregiver-verification',
  'caregiver-access-revoked': 'caregiver-access-revoked',
  'data-export-confirmation': 'data-export-confirmation',
  'correction-request-confirmation': 'correction-request-confirmation',
};

// ---------------------------------------------------------------------------
// Context field mapping: translate parent-svc field names to the names
// expected by notify-svc Handlebars / OonruMail templates.
// ---------------------------------------------------------------------------
function mapEmailContext(
  template: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = { ...data };

  // firstName → userName (most templates use userName)
  if ('firstName' in mapped && !('userName' in mapped)) {
    mapped.userName = mapped.firstName;
  }

  // verifyUrl → verificationUrl (email-verification template)
  if ('verifyUrl' in mapped && !('verificationUrl' in mapped)) {
    mapped.verificationUrl = mapped.verifyUrl;
  }

  // dashboardUrl → activationUrl (welcome template)
  if ('dashboardUrl' in mapped && !('activationUrl' in mapped)) {
    mapped.activationUrl = mapped.dashboardUrl;
  }

  return mapped;
}

export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly i18n: I18nService,
    private readonly firebase: FirebaseService
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
            data: data as unknown as Prisma.InputJsonValue,
          },
        });

        // Send push notification if enabled
        if (prefs?.pushEnabled !== false) {
          await this.sendPushNotification(parent.pushSubscriptions, title, body, data);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        {
          userId,
          type,
          error: message,
        },
        'Failed to send notification'
      );
    }
  }

  /**
   * Send an email using a template — delegates to notify-svc via HTTP API.
   *
   * notify-svc handles template rendering (Handlebars) and delivery through
   * the configured provider (OonruMail transactional API, SendGrid, SES).
   *
   * Falls back to the local SMTP-based email service if notify-svc is
   * unreachable so that development / offline scenarios still work.
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, template, language, data } = options;

    // Resolve template name for notify-svc
    const templateName = TEMPLATE_NAME_MAP[template] ?? template;
    // Map context fields to what the Handlebars templates expect
    const context = mapEmailContext(template, data);

    try {
      const notifySvcUrl = config.notifySvcUrl;

      const response = await fetch(`${notifySvcUrl}/api/v1/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-name': 'parent-svc',
        },
        body: JSON.stringify({
          templateName,
          to,
          context,
          locale: language || 'en',
          category: 'transactional',
          tags: [template],
        }),
        signal: AbortSignal.timeout(15_000), // 15 s timeout
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(
          `notify-svc responded ${response.status}: ${errBody}`,
        );
      }

      const result = await response.json() as { data?: { success?: boolean; messageId?: string } };
      logger.info(
        {
          to,
          template: templateName,
          messageId: result?.data?.messageId,
          provider: 'notify-svc',
        },
        'Email sent via notify-svc',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(
        {
          to,
          template,
          error: message,
        },
        'notify-svc email delivery failed, falling back to local SMTP',
      );

      // ── Fallback: render locally and send via SMTP ─────────────────────
      try {
        const subject = this.i18n.t(`email.${template}.subject`, language, data);
        const html = await this.renderEmailTemplate(template, language, data);

        await this.email.send({
          to,
          subject,
          html,
          tags: [template],
        });
      } catch (fallbackErr) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error';
        logger.error(
          {
            to,
            template,
            error: fallbackMsg,
          },
          'Failed to send template email (both notify-svc and SMTP fallback failed)',
        );
        throw fallbackErr;
      }
    }
  }

  /**
   * Send push notifications to all subscribed devices
   */
  private async sendPushNotification(
    subscriptions: { platform: string; token?: string | null; endpoint: string }[],
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    // Filter subscriptions that have valid tokens
    const validTokens = subscriptions
      .filter((sub): sub is { platform: string; token: string; endpoint: string } => !!sub.token)
      .map((sub) => ({ platform: sub.platform, token: sub.token, endpoint: sub.endpoint }));

    if (validTokens.length === 0) {
      logger.debug('No valid push tokens to send to');
      return;
    }

    // In development mode without Firebase configured, just log
    if (config.environment === 'development' && !this.firebase.isConfigured()) {
      for (const sub of validTokens) {
        logger.info(
          {
            platform: sub.platform,
            title,
          },
          'Push notification (dev mode, Firebase not configured)'
        );
      }
      return;
    }

    // Convert data values to strings (FCM requires string values)
    const stringData = data
      ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
      : undefined;

    // Send to all tokens using multicast
    const tokens = validTokens.map((sub) => sub.token);
    const result = await this.firebase.sendMulticast(tokens, title, body, stringData);

    // Mark invalid tokens as inactive
    if (result.invalidTokens.length > 0) {
      logger.info(
        {
          count: result.invalidTokens.length,
        },
        'Deactivating invalid push tokens'
      );
      await this.prisma.pushSubscription.updateMany({
        where: {
          token: { in: result.invalidTokens },
        },
        data: { active: false },
      });
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

      case 'welcome':
        return `
          <p style="margin-bottom: 24px;">${t('features')}</p>
          <ul style="list-style: none; padding: 0; margin: 0 0 24px;">
            <li style="margin-bottom: 12px; padding-left: 8px;">${t('feature1')}</li>
            <li style="margin-bottom: 12px; padding-left: 8px;">${t('feature2')}</li>
            <li style="margin-bottom: 12px; padding-left: 8px;">${t('feature3')}</li>
            <li style="margin-bottom: 12px; padding-left: 8px;">${t('feature4')}</li>
          </ul>
          <a href="${data.dashboardUrl}" class="cta-button">${t('cta')}</a>
        `;

      default:
        return '';
    }
  }
}
