/**
 * OonruMail Email Provider
 *
 * Production-ready OonruMail integration for transactional emails.
 * Uses the @enterprise-email/aivolearning-email SDK.
 * Supports:
 * - Custom HTML/text emails via SDK
 * - Server-side templates (when configured)
 * - Batch sending (up to 1000 recipients per request)
 * - Attachments and inline images
 * - Scheduled sending
 * - Webhook signature verification
 * - Automatic error classification for failover
 */

import {
  AivolearningEmail,
  OonruMailError,
  OonruMailTimeoutError,
  OonruMailAuthError,
  OonruMailRateLimitError,
  type OonruMailMessage,
  type OonruMailAttachment,
  type OonruMailTemplateMessage,
} from '@enterprise-email/aivolearning-email';

import { config } from '../../config.js';

import type {
  EmailProvider,
  EmailResult,
  BatchEmailResult,
  SendEmailOptions,
  TemplateEmailOptions,
  EmailAttachment,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const OONRUMAIL_BATCH_SIZE = 1000; // Max messages per batch request

// Template ID mapping: local template name → OonruMail server template ID
// These map to entries in config.email.oonrumail.templates
const TEMPLATE_NAME_MAP: Record<string, keyof typeof config.email.oonrumail.templates> = {
  welcome: 'welcome',
  'email-verification': 'emailVerification',
  'email_verification': 'emailVerification',
  'password-reset': 'passwordReset',
  'password_reset': 'passwordReset',
  'payment-receipt': 'paymentReceipt',
  'payment_receipt': 'paymentReceipt',
  'lesson-reminder': 'lessonReminder',
  'lesson_reminder': 'lessonReminder',
  'course-completion': 'courseCompletion',
  'course_completion': 'courseCompletion',
  'assignment-submitted': 'assignmentSubmitted',
  'assignment_submitted': 'assignmentSubmitted',
  'assignment-graded': 'assignmentGraded',
  'assignment_graded': 'assignmentGraded',
  'instructor-new-enrollment': 'instructorNewEnrollment',
  'instructor_new_enrollment': 'instructorNewEnrollment',
};

// ══════════════════════════════════════════════════════════════════════════════
// OONRUMAIL PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

class OonruMailProvider implements EmailProvider {
  readonly name = 'oonrumail' as const;
  private client: AivolearningEmail | null = null;
  private _isHealthy = false;
  private _isInitialized = false;

  get isHealthy(): boolean {
    return this._isHealthy;
  }

  /**
   * Initialize OonruMail client
   */
  async initialize(): Promise<boolean> {
    if (this._isInitialized) {
      return true;
    }

    const { apiKey, baseUrl, timeout } = config.email.oonrumail;

    if (!apiKey) {
      console.warn('[OonruMail] API key not configured');
      return false;
    }

    try {
      this.client = new AivolearningEmail({
        apiKey,
        ...(baseUrl ? { baseUrl } : {}),
        ...(timeout ? { timeout } : {}),
      });

      // Verify connectivity with a health check
      const healthResponse = await this.client.health();
      if (healthResponse.status === 'down') {
        console.error('[OonruMail] API reports status: down');
        return false;
      }

      this._isInitialized = true;
      this._isHealthy = true;

      console.log('[OonruMail] Provider initialized', {
        baseUrl: baseUrl || 'https://api.oonrumail.com/v1',
        useServerTemplates: config.email.oonrumail.useServerTemplates,
        fromEmail: config.email.fromEmail,
        status: healthResponse.status,
      });

      return true;
    } catch (error) {
      console.error('[OonruMail] Failed to initialize:', error);
      // If health check fails but we have credentials, still mark as initialized
      // The provider might recover - health monitoring will handle it
      if (apiKey) {
        this.client = new AivolearningEmail({
          apiKey,
          ...(baseUrl ? { baseUrl } : {}),
          ...(timeout ? { timeout } : {}),
        });
        this._isInitialized = true;
        this._isHealthy = false;
        console.warn('[OonruMail] Initialized in degraded state (health check failed)');
        return true;
      }
      return false;
    }
  }

  /**
   * Shutdown OonruMail client
   */
  async shutdown(): Promise<void> {
    this._isInitialized = false;
    this._isHealthy = false;
    this.client = null;
    console.log('[OonruMail] Provider shut down');
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    if (!this._isInitialized || !this.client) {
      return false;
    }

    try {
      const health = await this.client.health();
      this._isHealthy = health.status !== 'down';
      return this._isHealthy;
    } catch (error) {
      console.error('[OonruMail] Health check failed:', error);
      this._isHealthy = false;
      return false;
    }
  }

  /**
   * Send a single email
   */
  async send(options: SendEmailOptions): Promise<EmailResult> {
    if (!this._isInitialized || !this.client) {
      return {
        success: false,
        provider: 'oonrumail',
        errorCode: 'NOT_INITIALIZED',
        errorMessage: 'OonruMail is not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const message = this.buildMessage(options);
      const result = await this.client.send(message);

      console.log('[OonruMail] Email sent:', {
        to: this.sanitizeEmail(options.to),
        subject: options.subject,
        messageId: result.messageId,
        status: result.status,
      });

      return {
        success: true,
        messageId: result.messageId,
        provider: 'oonrumail',
        timestamp: new Date(),
      };
    } catch (error) {
      const { errorCode, errorMessage } = this.classifyError(error);

      console.error('[OonruMail] Send failed:', {
        to: this.sanitizeEmail(options.to),
        errorCode,
        errorMessage,
      });

      return {
        success: false,
        provider: 'oonrumail',
        errorCode,
        errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send batch emails
   */
  async sendBatch(emails: SendEmailOptions[]): Promise<BatchEmailResult> {
    if (!this._isInitialized || !this.client) {
      return this.createUninitializedBatchResult(emails);
    }

    const results: BatchEmailResult['results'] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Process in batches of OONRUMAIL_BATCH_SIZE
    for (let i = 0; i < emails.length; i += OONRUMAIL_BATCH_SIZE) {
      const batch = emails.slice(i, i + OONRUMAIL_BATCH_SIZE);
      const messages = batch.map((email) => this.buildMessage(email));

      try {
        const batchResult = await this.client.sendBatch(messages);

        for (const item of batchResult.results) {
          if (item.status === 'accepted') {
            totalSent++;
            results.push({
              to: item.to,
              success: true,
              messageId: item.messageId,
            });
          } else {
            totalFailed++;
            results.push({
              to: item.to,
              success: false,
              errorCode: 'REJECTED',
              errorMessage: item.error ?? 'Message rejected',
            });
          }
        }
      } catch (error) {
        const { errorCode, errorMessage } = this.classifyError(error);
        totalFailed += batch.length;

        for (const email of batch) {
          results.push({
            to: Array.isArray(email.to) ? (email.to[0] ?? '') : email.to,
            success: false,
            errorCode,
            errorMessage,
          });
        }
      }
    }

    console.log('[OonruMail] Batch sent:', {
      totalEmails: emails.length,
      totalSent,
      totalFailed,
    });

    return {
      provider: 'oonrumail',
      totalSent,
      totalFailed,
      results,
    };
  }

  /**
   * Send using OonruMail server-side template or custom template data
   */
  async sendTemplate(options: TemplateEmailOptions): Promise<EmailResult> {
    if (!this._isInitialized || !this.client) {
      return {
        success: false,
        provider: 'oonrumail',
        errorCode: 'NOT_INITIALIZED',
        errorMessage: 'OonruMail is not initialized',
        timestamp: new Date(),
      };
    }

    try {
      // Resolve the OonruMail server template ID
      const resolvedTemplateId = this.resolveTemplateId(options.templateId);

      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      const templateMessage: OonruMailTemplateMessage = {
        to: recipients,
        from: options.from ?? config.email.fromEmail,
        fromName: options.fromName ?? config.email.fromName,
        templateId: resolvedTemplateId,
        templateData: options.dynamicTemplateData,
        ...(options.replyTo ? { replyTo: options.replyTo } : {}),
        ...(options.cc?.length ? { cc: options.cc } : {}),
        ...(options.bcc?.length ? { bcc: options.bcc } : {}),
        ...(options.tags ? { tags: options.tags } : {}),
        ...(options.attachments ? { attachments: options.attachments.map((a) => this.convertAttachment(a)) } : {}),
        ...(options.scheduledAt ? { scheduledAt: options.scheduledAt.toISOString() } : {}),
        ...(options.customArgs ? { metadata: options.customArgs } : {}),
      };

      const result = await this.client.sendTemplate(templateMessage);

      console.log('[OonruMail] Template email sent:', {
        templateId: resolvedTemplateId,
        originalTemplateId: options.templateId,
        to: this.sanitizeEmail(options.to),
        messageId: result.messageId,
      });

      return {
        success: true,
        messageId: result.messageId,
        provider: 'oonrumail',
        timestamp: new Date(),
      };
    } catch (error) {
      const { errorCode, errorMessage } = this.classifyError(error);

      console.error('[OonruMail] Template send failed:', {
        templateId: options.templateId,
        errorCode,
        errorMessage,
      });

      return {
        success: false,
        provider: 'oonrumail',
        errorCode,
        errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Cancel a scheduled email
   */
  async cancelScheduled(messageId: string): Promise<boolean> {
    if (!this._isInitialized || !this.client) {
      console.warn('[OonruMail] Cannot cancel - not initialized');
      return false;
    }

    try {
      const result = await this.client.cancelScheduled(messageId);
      console.log('[OonruMail] Cancelled scheduled message:', messageId, result.cancelled);
      return result.cancelled;
    } catch (error) {
      console.error('[OonruMail] Cancel scheduled failed:', error);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STATIC METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Verify an OonruMail webhook signature
   */
  static verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    const secret = config.email.oonrumail.webhookSecret;
    if (!secret) {
      console.warn('[OonruMail] Webhook secret not configured');
      return false;
    }

    return AivolearningEmail.verifyWebhookSignature(payload, signature, secret);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  private buildMessage(options: SendEmailOptions): OonruMailMessage {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    const message: OonruMailMessage = {
      to: recipients,
      from: options.from ?? config.email.fromEmail,
      fromName: options.fromName ?? config.email.fromName,
      subject: options.subject,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
      ...(options.text ? { text: options.text } : {}),
      ...(options.html ? { html: options.html } : {}),
      ...(options.tags ? { tags: options.tags } : {}),
      ...(options.attachments ? { attachments: options.attachments.map((a) => this.convertAttachment(a)) } : {}),
      ...(options.scheduledAt ? { scheduledAt: options.scheduledAt.toISOString() } : {}),
    };

    // Map category as a tag
    if (options.category && !options.tags?.includes(options.category)) {
      message.tags = [...(message.tags ?? []), options.category];
    }

    // Map customArgs to metadata
    if (options.customArgs) {
      message.metadata = { ...message.metadata, ...options.customArgs };
    }

    // Set cc/bcc
    if (options.cc?.length) {
      message.cc = options.cc;
    }
    if (options.bcc?.length) {
      message.bcc = options.bcc;
    }

    // Set priority via metadata
    if (options.priority && options.priority !== 'normal') {
      message.metadata = { ...message.metadata, priority: options.priority };
    }

    return message;
  }

  private convertAttachment(attachment: EmailAttachment): OonruMailAttachment {
    const content = Buffer.isBuffer(attachment.content)
      ? attachment.content.toString('base64')
      : Buffer.from(attachment.content).toString('base64');

    return {
      filename: attachment.filename,
      content,
      ...(attachment.contentType ? { contentType: attachment.contentType } : {}),
      ...(attachment.contentId ? { contentId: attachment.contentId } : {}),
      disposition: attachment.disposition ?? 'attachment',
    };
  }

  /**
   * Resolve a template name/ID to an OonruMail server template ID.
   * If useServerTemplates is enabled and a mapping exists, return the server template ID.
   * Otherwise, passthrough the templateId as-is.
   */
  private resolveTemplateId(templateId: string): string {
    if (!config.email.oonrumail.useServerTemplates) {
      return templateId;
    }

    // Check if there's a mapping from the template name to a config key
    const configKey = TEMPLATE_NAME_MAP[templateId];
    if (configKey) {
      const serverTemplateId = config.email.oonrumail.templates[configKey];
      if (serverTemplateId) {
        return serverTemplateId;
      }
    }

    // If the templateId is already an OonruMail template ID, use it directly
    return templateId;
  }

  /**
   * Classify SDK errors into error codes compatible with the failover system
   */
  private classifyError(error: unknown): { errorCode: string; errorMessage: string } {
    if (error instanceof OonruMailAuthError) {
      return { errorCode: 'AUTH_ERROR', errorMessage: error.message };
    }

    if (error instanceof OonruMailRateLimitError) {
      return { errorCode: 'RATE_LIMITED', errorMessage: error.message };
    }

    if (error instanceof OonruMailTimeoutError) {
      return { errorCode: 'TIMEOUT', errorMessage: error.message };
    }

    if (error instanceof OonruMailError) {
      // Map SDK error codes to our standard codes
      if (error.errorCode) {
        return { errorCode: error.errorCode, errorMessage: error.message };
      }

      if (error.statusCode && error.statusCode >= 500) {
        return { errorCode: 'SERVICE_UNAVAILABLE', errorMessage: error.message };
      }

      return {
        errorCode: error.retryable ? 'CONNECTION_ERROR' : 'OONRUMAIL_ERROR',
        errorMessage: error.message,
      };
    }

    // Unknown error
    const msg = error instanceof Error ? error.message : 'Unknown OonruMail error';
    return { errorCode: 'OONRUMAIL_ERROR', errorMessage: msg };
  }

  private createUninitializedBatchResult(emails: SendEmailOptions[]): BatchEmailResult {
    return {
      provider: 'oonrumail',
      totalSent: 0,
      totalFailed: emails.length,
      results: emails.map((e) => ({
        to: Array.isArray(e.to) ? (e.to[0] ?? '') : e.to,
        success: false as const,
        errorCode: 'NOT_INITIALIZED',
        errorMessage: 'OonruMail is not initialized',
      })),
    };
  }

  private sanitizeEmail(email: string | string[]): string {
    const addr = Array.isArray(email) ? email[0] : email;
    if (!addr) {
      return '***';
    }
    const parts = addr.split('@');
    const local = parts[0];
    const domain = parts[1];
    if (!local || local.length <= 3) {
      return `***@${domain ?? ''}`;
    }
    return `${local.substring(0, 2)}***@${domain ?? ''}`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const oonruMailProvider = new OonruMailProvider();

export function createOonruMailProvider(): EmailProvider {
  return new OonruMailProvider();
}
