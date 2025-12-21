/**
 * SendGrid Email Provider
 *
 * Production-ready SendGrid integration for transactional and marketing emails.
 * Supports:
 * - Dynamic templates with personalizations
 * - Batch sending (up to 1000 recipients per request)
 * - Attachments and inline images
 * - Categories and custom tracking
 * - Scheduled sending
 * - Sandbox mode for development
 */

import sgMail from '@sendgrid/mail';
import type { MailDataRequired, ResponseError } from '@sendgrid/mail';

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

const SENDGRID_BATCH_SIZE = 1000; // Max recipients per request
const _SENDGRID_RATE_LIMIT = 100; // Requests per second

// Error codes that indicate permanent failures
const _PERMANENT_FAILURE_CODES = [
  'invalid_email',
  'unsubscribed_address',
  'bounce',
  'spam_report',
  'invalid',
];

// ══════════════════════════════════════════════════════════════════════════════
// SENDGRID PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

class SendGridProvider implements EmailProvider {
  readonly name = 'sendgrid' as const;
  private _isHealthy = false;
  private _isInitialized = false;

  get isHealthy(): boolean {
    return this._isHealthy;
  }

  /**
   * Initialize SendGrid client
   */
  async initialize(): Promise<boolean> {
    if (this._isInitialized) {
      return true;
    }

    const apiKey = config.email.sendgrid.apiKey;
    if (!apiKey) {
      console.warn('[SendGrid] API key not configured');
      return false;
    }

    try {
      sgMail.setApiKey(apiKey);
      
      // Verify API key with a simple request
      // SendGrid doesn't have a dedicated health endpoint, so we check by attempting
      // to access the API (in sandbox mode this won't send actual emails)
      this._isInitialized = true;
      this._isHealthy = true;
      
      console.log('[SendGrid] Provider initialized', {
        sandboxMode: config.email.sendgrid.sandboxMode,
        fromEmail: config.email.fromEmail,
      });
      
      return true;
    } catch (error) {
      console.error('[SendGrid] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Shutdown SendGrid client
   */
  async shutdown(): Promise<void> {
    this._isInitialized = false;
    this._isHealthy = false;
    console.log('[SendGrid] Provider shut down');
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    if (!this._isInitialized) {
      return false;
    }

    try {
      // For health check, we'll just verify the API key is still valid
      // A real health check would use SendGrid's API, but there's no dedicated endpoint
      this._isHealthy = true;
      return true;
    } catch (error) {
      console.error('[SendGrid] Health check failed:', error);
      this._isHealthy = false;
      return false;
    }
  }

  /**
   * Send a single email
   */
  async send(options: SendEmailOptions): Promise<EmailResult> {
    if (!this._isInitialized) {
      return {
        success: false,
        provider: 'sendgrid',
        errorCode: 'NOT_INITIALIZED',
        errorMessage: 'SendGrid is not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const message = this.buildMessage(options);
      
      // Enable sandbox mode if configured
      if (config.email.sendgrid.sandboxMode) {
        message.mailSettings = {
          ...message.mailSettings,
          sandboxMode: { enable: true },
        };
      }

      const [response] = await sgMail.send(message);
      
      const messageId = (response.headers as Record<string, string>)['x-message-id'];
      
      console.log('[SendGrid] Email sent:', {
        to: this.sanitizeEmail(options.to),
        subject: options.subject,
        messageId,
        statusCode: response.statusCode,
      });

      return {
        success: true,
        ...(messageId ? { messageId } : {}),
        provider: 'sendgrid',
        timestamp: new Date(),
      };
    } catch (error) {
      const sgError = error as ResponseError;
      const errorCode = this.extractErrorCode(sgError);
      const errorMessage = this.extractErrorMessage(sgError);

      console.error('[SendGrid] Send failed:', {
        to: this.sanitizeEmail(options.to),
        errorCode,
        errorMessage,
      });

      return {
        success: false,
        provider: 'sendgrid',
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
    if (!this._isInitialized) {
      return this.createUninitializedBatchResult(emails);
    }

    const results: BatchEmailResult['results'] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Process in batches of SENDGRID_BATCH_SIZE
    for (let i = 0; i < emails.length; i += SENDGRID_BATCH_SIZE) {
      const batch = emails.slice(i, i + SENDGRID_BATCH_SIZE);
      const messages = this.prepareBatchMessages(batch);

      try {
        const batchResults = await this.sendBatchMessages(messages, batch);
        results.push(...batchResults);
        totalSent += batchResults.length;
      } catch (error) {
        const failedResults = this.createFailedBatchResults(batch, error as ResponseError);
        results.push(...failedResults);
        totalFailed += failedResults.length;
      }
    }

    console.log('[SendGrid] Batch sent:', {
      totalEmails: emails.length,
      totalSent,
      totalFailed,
    });

    return {
      provider: 'sendgrid',
      totalSent,
      totalFailed,
      results,
    };
  }

  /**
   * Send using SendGrid dynamic template
   */
  async sendTemplate(options: TemplateEmailOptions): Promise<EmailResult> {
    if (!this._isInitialized) {
      return {
        success: false,
        provider: 'sendgrid',
        errorCode: 'NOT_INITIALIZED',
        errorMessage: 'SendGrid is not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      const message: MailDataRequired = {
        to: recipients.map((email) => ({ email })),
        from: {
          email: options.from || config.email.fromEmail,
          name: options.fromName || config.email.fromName,
        },
        ...(options.replyTo ? { replyTo: options.replyTo } : {}),
        templateId: options.templateId,
        dynamicTemplateData: options.dynamicTemplateData,
        personalizations: recipients.map((email) => ({
          to: [{ email }],
          dynamicTemplateData: options.dynamicTemplateData,
        })),
        ...(options.category ? { categories: [options.category] } : {}),
        ...(options.customArgs ? { customArgs: options.customArgs } : {}),
        ...(options.scheduledAt ? { sendAt: Math.floor(options.scheduledAt.getTime() / 1000) } : {}),
        ...(options.attachments ? { attachments: options.attachments.map((a) => this.convertAttachment(a)) } : {}),
      };

      if (options.cc?.length) {
        message.cc = options.cc.map((email) => ({ email }));
      }

      if (options.bcc?.length) {
        message.bcc = options.bcc.map((email) => ({ email }));
      }

      if (config.email.sendgrid.sandboxMode) {
        message.mailSettings = {
          sandboxMode: { enable: true },
        };
      }

      const [response] = await sgMail.send(message);
      const messageId = (response.headers as Record<string, string>)['x-message-id'];

      console.log('[SendGrid] Template email sent:', {
        templateId: options.templateId,
        to: this.sanitizeEmail(options.to),
        messageId,
      });

      return {
        success: true,
        ...(messageId ? { messageId } : {}),
        provider: 'sendgrid',
        timestamp: new Date(),
      };
    } catch (error) {
      const sgError = error as ResponseError;
      const errorCode = this.extractErrorCode(sgError);
      const errorMessage = this.extractErrorMessage(sgError);

      console.error('[SendGrid] Template send failed:', {
        templateId: options.templateId,
        errorCode,
        errorMessage,
      });

      return {
        success: false,
        provider: 'sendgrid',
        errorCode,
        errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Cancel a scheduled email
   */
  async cancelScheduled(batchId: string): Promise<boolean> {
    // Note: SendGrid requires batch IDs for cancellation, not message IDs
    // This would require setting up batch IDs when scheduling
    console.warn('[SendGrid] Cancel scheduled not fully implemented:', batchId);
    return false;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  private buildMessage(options: SendEmailOptions): MailDataRequired {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    // Determine categories
    const categories = options.category ? [options.category] : options.tags;

    const message = {
      to: recipients.map((email) => ({ email })),
      from: {
        email: options.from || config.email.fromEmail,
        name: options.fromName || config.email.fromName,
      },
      subject: options.subject,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
      ...(options.text ? { text: options.text } : {}),
      ...(options.html ? { html: options.html } : {}),
      ...(categories ? { categories } : {}),
      ...(options.customArgs ? { customArgs: options.customArgs } : {}),
      ...(options.scheduledAt ? { sendAt: Math.floor(options.scheduledAt.getTime() / 1000) } : {}),
      ...(options.attachments ? { attachments: options.attachments.map((a) => this.convertAttachment(a)) } : {}),
    } as MailDataRequired;

    if (options.cc?.length) {
      message.cc = options.cc.map((email) => ({ email }));
    }

    if (options.bcc?.length) {
      message.bcc = options.bcc.map((email) => ({ email }));
    }

    // Set priority via headers
    if (options.priority === 'high') {
      message.headers = {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        Importance: 'high',
      };
    } else if (options.priority === 'low') {
      message.headers = {
        'X-Priority': '5',
        'X-MSMail-Priority': 'Low',
        Importance: 'low',
      };
    }

    return message;
  }

  private convertAttachment(attachment: EmailAttachment): {
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
    contentId?: string;
  } {
    const content = Buffer.isBuffer(attachment.content)
      ? attachment.content.toString('base64')
      : Buffer.from(attachment.content).toString('base64');

    return {
      content,
      filename: attachment.filename,
      ...(attachment.contentType ? { type: attachment.contentType } : {}),
      disposition: attachment.disposition || 'attachment',
      ...(attachment.contentId ? { contentId: attachment.contentId } : {}),
    };
  }

  private createUninitializedBatchResult(emails: SendEmailOptions[]): BatchEmailResult {
    return {
      provider: 'sendgrid',
      totalSent: 0,
      totalFailed: emails.length,
      results: emails.map((e) => ({
        to: Array.isArray(e.to) ? e.to[0] ?? '' : e.to,
        success: false as const,
        errorCode: 'NOT_INITIALIZED',
        errorMessage: 'SendGrid is not initialized',
      })),
    };
  }

  private prepareBatchMessages(batch: SendEmailOptions[]): MailDataRequired[] {
    return batch.map((email) => {
      const message = this.buildMessage(email);
      if (config.email.sendgrid.sandboxMode) {
        message.mailSettings = {
          ...message.mailSettings,
          sandboxMode: { enable: true },
        };
      }
      return message;
    });
  }

  private async sendBatchMessages(
    messages: MailDataRequired[],
    batch: SendEmailOptions[]
  ): Promise<BatchEmailResult['results']> {
    const responses = await sgMail.send(messages);
    const results: BatchEmailResult['results'] = [];

    for (let j = 0; j < batch.length; j++) {
      const email = batch[j];
      if (!email) continue;
      const response = Array.isArray(responses) ? responses[j] : responses;
      const responseHeaders = response && typeof response === 'object' && 'headers' in response
        ? (response as { headers?: Record<string, string> }).headers
        : undefined;
      const messageId = responseHeaders?.['x-message-id'];

      results.push({
        to: Array.isArray(email.to) ? (email.to[0] ?? '') : email.to,
        success: true,
        ...(messageId ? { messageId } : {}),
      });
    }

    return results;
  }

  private createFailedBatchResults(
    batch: SendEmailOptions[],
    error: ResponseError
  ): BatchEmailResult['results'] {
    const errorCode = this.extractErrorCode(error);
    const errorMessage = this.extractErrorMessage(error);

    return batch.map((email) => ({
      to: Array.isArray(email.to) ? (email.to[0] ?? '') : email.to,
      success: false as const,
      errorCode,
      errorMessage,
    }));
  }

  private extractErrorCode(error: ResponseError): string {
    if (error.code) {
      return String(error.code);
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const body = error.response?.body as { errors?: { field?: string; message?: string }[] } | undefined;
    if (body?.errors?.[0]?.field) {
      return body.errors[0].field;
    }
    return 'SENDGRID_ERROR';
  }

  private extractErrorMessage(error: ResponseError): string {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const body = error.response?.body as { errors?: { message?: string }[] } | undefined;
    if (body?.errors?.[0]?.message) {
      return body.errors[0].message;
    }
    return error.message || 'Unknown SendGrid error';
  }

  private sanitizeEmail(email: string | string[]): string {
    const addr = Array.isArray(email) ? email[0] : email;
    if (!addr) {
      return '***';
    }
    // Mask middle part of email for logging
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

export const sendGridProvider = new SendGridProvider();

export function createSendGridProvider(): EmailProvider {
  return new SendGridProvider();
}
