/**
 * Email Service
 *
 * High-level email sending service that coordinates:
 * - Template rendering
 * - Provider selection and failover
 * - Suppression list checking
 * - Rate limiting
 * - Delivery logging
 * - Queue management for bulk sends
 */

import { RateLimiterMemory } from 'rate-limiter-flexible';

import type { PrismaClient, SuppressionReason } from '../../../generated/prisma-client/index.js';

import { config } from '../../config.js';

import { emailProviderManager } from './email-provider.factory.js';
import { emailValidator } from './email-validator.js';
import {
  hasOonruMailTemplate,
  getOonruMailMapping,
  resolveOonruMailTemplateId,
} from './oonrumail-template-map.js';
import { emailTemplateEngine, renderEmailTemplate } from './template-engine.js';
import type {
  BatchEmailResult,
  EmailResult,
  EmailTemplateContext,
  SendEmailOptions,
  SupportedLocale,
  TemplateEmailOptions,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface SendTemplatedEmailOptions {
  templateName: string;
  to: string | string[];
  context: EmailTemplateContext;
  locale?: SupportedLocale;
  category?: string;
  tags?: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: SendEmailOptions['attachments'];
  scheduledAt?: Date;
}

interface BulkSendOptions {
  templateName: string;
  recipients: {
    email: string;
    context: EmailTemplateContext;
    locale?: SupportedLocale;
  }[];
  category?: string;
  tags?: string[];
}

interface EmailServiceOptions {
  prisma?: PrismaClient;
  skipValidation?: boolean;
  skipSuppressionCheck?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER
// ══════════════════════════════════════════════════════════════════════════════

const rateLimiter = new RateLimiterMemory({
  points: config.email.rateLimit.perSecond || 100,
  duration: 1,
});

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL SERVICE
// ══════════════════════════════════════════════════════════════════════════════

class EmailService {
  private prisma: PrismaClient | null = null;
  private _isInitialized = false;

  /**
   * Initialize the email service
   */
  async initialize(prisma?: PrismaClient): Promise<boolean> {
    if (this._isInitialized) {
      return true;
    }

    console.log('[EmailService] Initializing...');

    this.prisma = prisma || null;

    // Initialize template engine
    await emailTemplateEngine.initialize();

    // Initialize providers
    const providersReady = await emailProviderManager.initialize();

    this._isInitialized = true;
    console.log('[EmailService] Initialized', {
      providersReady,
      templates: emailTemplateEngine.getAvailableTemplates().length,
    });

    return providersReady;
  }

  /**
   * Shutdown the email service
   */
  async shutdown(): Promise<void> {
    console.log('[EmailService] Shutting down...');
    await emailProviderManager.shutdown();
    this._isInitialized = false;
  }

  /**
   * Send a simple email (no template)
   */
  async send(
    options: SendEmailOptions,
    serviceOptions: EmailServiceOptions = {}
  ): Promise<EmailResult> {
    // Ensure service is initialized
    if (!this._isInitialized) {
      await this.initialize(serviceOptions.prisma);
    }

    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const primaryRecipient = recipients[0];

    if (!primaryRecipient) {
      return {
        success: false,
        provider: 'none',
        errorCode: 'NO_RECIPIENT',
        errorMessage: 'No recipient provided',
        timestamp: new Date(),
      };
    }

    try {
      // Rate limiting
      await this.checkRateLimit(primaryRecipient);

      // Email validation (optional)
      if (!serviceOptions.skipValidation) {
        const validation = await emailValidator.validate(primaryRecipient);
        if (!validation.isValid) {
          return {
            success: false,
            provider: 'none',
            errorCode: 'INVALID_EMAIL',
            errorMessage: validation.reason || 'Invalid email address',
            timestamp: new Date(),
          };
        }
      }

      // Suppression check
      if (!serviceOptions.skipSuppressionCheck) {
        const suppressed = await this.checkSuppression(primaryRecipient);
        if (suppressed) {
          return {
            success: false,
            provider: 'none',
            errorCode: 'SUPPRESSED',
            errorMessage: `Email is suppressed: ${suppressed.reason}`,
            timestamp: new Date(),
          };
        }
      }

      // Send via provider manager
      const result = await emailProviderManager.send(options);

      // Log delivery
      await this.logDelivery(primaryRecipient, options.subject, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] Send error:', errorMessage);

      return {
        success: false,
        provider: 'none',
        errorCode: 'SEND_ERROR',
        errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send a templated email
   */
  async sendTemplated(
    options: SendTemplatedEmailOptions,
    serviceOptions: EmailServiceOptions = {}
  ): Promise<EmailResult> {
    // Ensure service is initialized
    if (!this._isInitialized) {
      await this.initialize(serviceOptions.prisma);
    }

    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const primaryRecipient = recipients[0];

    if (!primaryRecipient) {
      return {
        success: false,
        provider: 'none',
        errorCode: 'NO_RECIPIENT',
        errorMessage: 'No recipient provided',
        timestamp: new Date(),
      };
    }

    try {
      // Rate limiting
      await this.checkRateLimit(primaryRecipient);

      // Email validation
      if (!serviceOptions.skipValidation) {
        const validation = await emailValidator.validate(primaryRecipient);
        if (!validation.isValid) {
          return {
            success: false,
            provider: 'none',
            errorCode: 'INVALID_EMAIL',
            errorMessage: validation.reason || 'Invalid email address',
            timestamp: new Date(),
          };
        }
      }

      // Suppression check
      if (!serviceOptions.skipSuppressionCheck) {
        const suppressed = await this.checkSuppression(primaryRecipient);
        if (suppressed) {
          return {
            success: false,
            provider: 'none',
            errorCode: 'SUPPRESSED',
            errorMessage: `Email is suppressed: ${suppressed.reason}`,
            timestamp: new Date(),
          };
        }
      }

      // ── OonruMail server-template fast-path ────────────────────────────
      // When OonruMail is the active provider AND useServerTemplates is on
      // AND this template has a server-side mapping with a configured ID,
      // skip local HBS rendering and delegate to the server template.
      if (this.shouldUseServerTemplate(options.templateName)) {
        return await this.sendViaServerTemplate(options, primaryRecipient);
      }

      // ── Local HBS rendering (default path) ─────────────────────────────
      // Render template
      const { html, text } = await renderEmailTemplate(
        options.templateName,
        options.context,
        ...(options.locale ? [{ locale: options.locale }] : [{}])
      );

      // Build send options
      const sendOptions: SendEmailOptions = {
        to: options.to,
        subject: (options.context.subject as string) || 'Notification',
        html,
        text,
        ...(options.category ? { category: options.category } : {}),
        ...(options.tags ? { tags: options.tags } : {}),
        ...(options.cc ? { cc: options.cc } : {}),
        ...(options.bcc ? { bcc: options.bcc } : {}),
        ...(options.replyTo ? { replyTo: options.replyTo } : {}),
        ...(options.attachments ? { attachments: options.attachments } : {}),
        ...(options.scheduledAt ? { scheduledAt: options.scheduledAt } : {}),
      };

      // Send via provider manager
      const result = await emailProviderManager.send(sendOptions);

      // Log delivery
      await this.logDelivery(primaryRecipient, sendOptions.subject, result, options.templateName);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] SendTemplated error:', errorMessage);

      return {
        success: false,
        provider: 'none',
        errorCode: 'SEND_ERROR',
        errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send bulk templated emails
   */
  async sendBulk(
    options: BulkSendOptions,
    serviceOptions: EmailServiceOptions = {}
  ): Promise<BatchEmailResult> {
    // Ensure service is initialized
    if (!this._isInitialized) {
      await this.initialize(serviceOptions.prisma);
    }

    const results: BatchEmailResult['results'] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Process each recipient
    for (const recipient of options.recipients) {
      try {
        // Rate limiting
        await this.checkRateLimit(recipient.email);

        // Suppression check (skip validation for bulk to improve performance)
        if (!serviceOptions.skipSuppressionCheck) {
          const suppressed = await this.checkSuppression(recipient.email);
          if (suppressed) {
            results.push({
              to: recipient.email,
              success: false,
              errorCode: 'SUPPRESSED',
              errorMessage: `Email is suppressed: ${suppressed.reason}`,
            });
            totalFailed++;
            continue;
          }
        }

        // Render template for this recipient
        const { html, text } = await renderEmailTemplate(
          options.templateName,
          recipient.context,
          ...(recipient.locale ? [{ locale: recipient.locale }] : [{}])
        );

        const sendOptions: SendEmailOptions = {
          to: recipient.email,
          subject: (recipient.context.subject as string) || 'Notification',
          html,
          text,
          ...(options.category ? { category: options.category } : {}),
          ...(options.tags ? { tags: options.tags } : {}),
        };

        // Send
        const result = await emailProviderManager.send(sendOptions);

        results.push({
          to: recipient.email,
          success: result.success,
          ...(result.messageId ? { messageId: result.messageId } : {}),
          ...(result.errorCode ? { errorCode: result.errorCode } : {}),
          ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
        });

        if (result.success) {
          totalSent++;
        } else {
          totalFailed++;
        }

        // Log delivery
        await this.logDelivery(recipient.email, sendOptions.subject, result, options.templateName);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          to: recipient.email,
          success: false,
          errorCode: 'SEND_ERROR',
          errorMessage,
        });
        totalFailed++;
      }
    }

    console.log('[EmailService] Bulk send complete:', {
      template: options.templateName,
      totalRecipients: options.recipients.length,
      totalSent,
      totalFailed,
    });

    return {
      provider: emailProviderManager.getActiveProvider()?.name || 'none',
      totalSent,
      totalFailed,
      results,
    };
  }

  /**
   * Add email to suppression list
   */
  async addToSuppressionList(
    email: string,
    reason: SuppressionReason,
    source = 'manual'
  ): Promise<void> {
    if (!this.prisma) {
      console.warn('[EmailService] No Prisma client, skipping suppression');
      return;
    }

    try {
      await this.prisma.emailSuppression.upsert({
        where: { email },
        create: {
          email,
          reason,
          source,
          createdAt: new Date(),
        },
        update: {
          reason,
          source,
          updatedAt: new Date(),
        },
      });

      console.log('[EmailService] Added to suppression list:', {
        email: this.maskEmail(email),
        reason,
      });
    } catch (error) {
      console.error('[EmailService] Failed to add to suppression list:', error);
    }
  }

  /**
   * Remove email from suppression list
   */
  async removeFromSuppressionList(email: string): Promise<boolean> {
    if (!this.prisma) {
      console.warn('[EmailService] No Prisma client');
      return false;
    }

    try {
      await this.prisma.emailSuppression.delete({
        where: { email },
      });

      console.log('[EmailService] Removed from suppression list:', this.maskEmail(email));
      return true;
    } catch (error) {
      // Email might not be in suppression list - this is expected
      console.debug('[EmailService] Email not in suppression list or delete failed:', error);
      return false;
    }
  }

  /**
   * Get provider health status
   */
  getHealthStatus(): Record<string, unknown> {
    return {
      initialized: this._isInitialized,
      providers: emailProviderManager.getHealthStatus(),
      templates: emailTemplateEngine.getAvailableTemplates().length,
      locales: emailTemplateEngine.getAvailableLocales(),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Determine whether a given template should use OonruMail server rendering.
   * Checks: OonruMail enabled → useServerTemplates flag → mapping exists → template ID configured.
   * Also checks per-template override in config when available.
   */
  private shouldUseServerTemplate(templateName: string): boolean {
    // OonruMail must be enabled and be the active provider
    if (!config.email.oonrumail.enabled) {
      return false;
    }

    // Check per-template override first (opt-in or opt-out)
    const overrides = (config.email.oonrumail as Record<string, unknown>).serverTemplateOverrides as
      | Record<string, boolean>
      | undefined;
    if (overrides && templateName in overrides) {
      // Even with override=true, a mapping must exist
      if (!overrides[templateName]) {
        return false;
      }
      return hasOonruMailTemplate(templateName);
    }

    // Global toggle
    if (!config.email.oonrumail.useServerTemplates) {
      return false;
    }

    // Check mapping & configured ID
    return hasOonruMailTemplate(templateName);
  }

  /**
   * Send an email using OonruMail server-side template rendering.
   * Transforms the caller-provided context into OonruMail template variables
   * and delegates to the provider manager's sendTemplate path.
   */
  private async sendViaServerTemplate(
    options: SendTemplatedEmailOptions,
    primaryRecipient: string,
  ): Promise<EmailResult> {
    const mapping = getOonruMailMapping(options.templateName);
    const serverTemplateId = resolveOonruMailTemplateId(options.templateName);

    // This should not happen since shouldUseServerTemplate already checks,
    // but guard defensively.
    if (!mapping || !serverTemplateId) {
      console.warn(
        '[EmailService] Server template mapping not found, falling back to HBS:',
        options.templateName,
      );
      return this.sendViaHbs(options, primaryRecipient);
    }

    // Transform context to OonruMail template variables
    const templateData = mapping.transformContext(options.context);

    const templateOptions: TemplateEmailOptions = {
      to: options.to,
      templateId: serverTemplateId,
      dynamicTemplateData: templateData,
      ...(options.cc ? { cc: options.cc } : {}),
      ...(options.bcc ? { bcc: options.bcc } : {}),
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
      ...(options.category ? { category: options.category } : {}),
      ...(options.tags ? { tags: options.tags } : {}),
      ...(options.attachments
        ? { attachments: options.attachments }
        : {}),
      ...(options.scheduledAt
        ? { scheduledAt: options.scheduledAt }
        : {}),
    };

    console.log('[EmailService] Using OonruMail server template:', {
      templateName: options.templateName,
      serverTemplateId,
      to: this.maskEmail(primaryRecipient),
    });

    const result = await emailProviderManager.sendTemplate(templateOptions);

    // Log delivery
    await this.logDelivery(primaryRecipient, `[server-tpl] ${options.templateName}`, result, options.templateName);

    return result;
  }

  /**
   * Fallback: render HBS locally and send pre-rendered HTML.
   * Extracted so sendViaServerTemplate can fall back gracefully.
   */
  private async sendViaHbs(
    options: SendTemplatedEmailOptions,
    primaryRecipient: string,
  ): Promise<EmailResult> {
    const { html, text } = await renderEmailTemplate(
      options.templateName,
      options.context,
      ...(options.locale ? [{ locale: options.locale }] : [{}]),
    );

    const sendOptions: SendEmailOptions = {
      to: options.to,
      subject: (options.context.subject as string) || 'Notification',
      html,
      text,
      ...(options.category ? { category: options.category } : {}),
      ...(options.tags ? { tags: options.tags } : {}),
      ...(options.cc ? { cc: options.cc } : {}),
      ...(options.bcc ? { bcc: options.bcc } : {}),
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
      ...(options.attachments ? { attachments: options.attachments } : {}),
      ...(options.scheduledAt ? { scheduledAt: options.scheduledAt } : {}),
    };

    const result = await emailProviderManager.send(sendOptions);
    await this.logDelivery(primaryRecipient, sendOptions.subject, result, options.templateName);
    return result;
  }

  private async checkRateLimit(email: string): Promise<void> {
    try {
      await rateLimiter.consume(email);
    } catch (error) {
      console.debug('[EmailService] Rate limit exceeded for:', email, error);
      throw new Error('Rate limit exceeded');
    }
  }

  private async checkSuppression(
    email: string
  ): Promise<{ reason: SuppressionReason } | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const suppression = await this.prisma.emailSuppression.findUnique({
        where: { email },
        select: { reason: true },
      });

      if (suppression) {
        return { reason: suppression.reason };
      }

      return null;
    } catch (error) {
      console.error('[EmailService] Suppression check error:', error);
      return null;
    }
  }

  private async logDelivery(
    to: string,
    subject: string,
    result: EmailResult,
    templateName?: string
  ): Promise<void> {
    if (!this.prisma) {
      return;
    }

    try {
      await this.prisma.emailLog.create({
        data: {
          toEmail: to,
          subject,
          provider: result.provider as 'SENDGRID' | 'SES',
          status: result.success ? 'SENT' : 'FAILED',
          sentAt: result.timestamp,
          ...(templateName ? { templateName } : {}),
          ...(result.messageId ? { messageId: result.messageId } : {}),
          ...(result.errorCode ? { errorCode: result.errorCode } : {}),
          ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
        },
      });
    } catch (error) {
      console.error('[EmailService] Failed to log delivery:', error);
    }
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || local.length <= 3) {
      return `***@${domain}`;
    }
    return `${local.substring(0, 2)}***@${domain}`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

export const emailService = new EmailService();

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export async function initializeEmailService(prisma?: PrismaClient): Promise<boolean> {
  return emailService.initialize(prisma);
}

export async function shutdownEmailService(): Promise<void> {
  await emailService.shutdown();
}

export async function sendEmail(
  options: SendEmailOptions,
  serviceOptions?: EmailServiceOptions
): Promise<EmailResult> {
  return emailService.send(options, serviceOptions);
}

export async function sendTemplatedEmail(
  options: SendTemplatedEmailOptions,
  serviceOptions?: EmailServiceOptions
): Promise<EmailResult> {
  return emailService.sendTemplated(options, serviceOptions);
}

export async function sendBulkEmail(
  options: BulkSendOptions,
  serviceOptions?: EmailServiceOptions
): Promise<BatchEmailResult> {
  return emailService.sendBulk(options, serviceOptions);
}
