/**
 * AWS SES Email Provider
 *
 * Production-ready AWS Simple Email Service integration.
 * Used as fallback when SendGrid is unavailable.
 * Supports:
 * - Raw and templated emails
 * - Bulk sending with destinations
 * - Configuration sets for tracking
 * - SES templates
 * - Attachments via raw email
 */

import {
  SESClient,
  SendEmailCommand,
  SendRawEmailCommand,
  SendTemplatedEmailCommand,
  GetSendQuotaCommand,
  type SendEmailCommandOutput,
} from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer/index.js';

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

const _SES_BATCH_SIZE = 50; // Max destinations per bulk request
const _SES_RATE_LIMIT = 14; // Default sandbox: 1 email/sec, production varies

// ══════════════════════════════════════════════════════════════════════════════
// SES PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

class SESProvider implements EmailProvider {
  readonly name = 'ses' as const;
  private client: SESClient | null = null;
  private _isHealthy = false;
  private _isInitialized = false;

  get isHealthy(): boolean {
    return this._isHealthy;
  }

  /**
   * Initialize SES client
   */
  async initialize(): Promise<boolean> {
    if (this._isInitialized) {
      return true;
    }

    const { region, accessKeyId, secretAccessKey } = config.email.ses;
    
    if (!region || !accessKeyId || !secretAccessKey) {
      console.warn('[SES] AWS credentials not configured');
      return false;
    }

    try {
      this.client = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      // Verify credentials with a simple API call
      const command = new GetSendQuotaCommand({});
      await this.client.send(command);

      this._isInitialized = true;
      this._isHealthy = true;

      console.log('[SES] Provider initialized', {
        region,
        fromEmail: config.email.fromEmail,
      });

      return true;
    } catch (error) {
      console.error('[SES] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Shutdown SES client
   */
  async shutdown(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
    this._isInitialized = false;
    this._isHealthy = false;
    console.log('[SES] Provider shut down');
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    if (!this._isInitialized || !this.client) {
      return false;
    }

    try {
      const command = new GetSendQuotaCommand({});
      await this.client.send(command);
      this._isHealthy = true;
      return true;
    } catch (error) {
      console.error('[SES] Health check failed:', error);
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
        provider: 'ses',
        errorCode: 'NOT_INITIALIZED',
        errorMessage: 'SES is not initialized',
        timestamp: new Date(),
      };
    }

    try {
      // If attachments exist, use raw email via nodemailer
      if (options.attachments?.length) {
        return this.sendRawEmail(options);
      }

      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      const command = new SendEmailCommand({
        Source: this.formatAddress(
          options.from || config.email.fromEmail,
          options.fromName || config.email.fromName
        ),
        Destination: {
          ToAddresses: recipients,
          CcAddresses: options.cc,
          BccAddresses: options.bcc,
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: options.text ? { Data: options.text, Charset: 'UTF-8' } : undefined,
            Html: options.html ? { Data: options.html, Charset: 'UTF-8' } : undefined,
          },
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
        ConfigurationSetName: config.email.ses.configurationSetName,
        Tags: this.buildTags(options),
      });

      const response: SendEmailCommandOutput = await this.client.send(command);
      
      console.log('[SES] Email sent:', {
        to: this.sanitizeEmail(options.to),
        subject: options.subject,
        messageId: response.MessageId,
      });

      return {
        success: true,
        ...(response.MessageId ? { messageId: response.MessageId } : {}),
        provider: 'ses',
        timestamp: new Date(),
      };
    } catch (error) {
      const { errorCode, errorMessage } = this.extractError(error);

      console.error('[SES] Send failed:', {
        to: this.sanitizeEmail(options.to),
        errorCode,
        errorMessage,
      });

      return {
        success: false,
        provider: 'ses',
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
      return {
        provider: 'ses',
        totalSent: 0,
        totalFailed: emails.length,
        results: emails.map((e) => ({
          to: Array.isArray(e.to) ? (e.to[0] ?? '') : e.to,
          success: false as const,
          errorCode: 'NOT_INITIALIZED',
          errorMessage: 'SES is not initialized',
        })),
      };
    }

    const results: BatchEmailResult['results'] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // SES bulk email requires same template for all, so we fall back to individual sends
    // for mixed content. For real bulk, use sendBulkTemplate
    for (const email of emails) {
      const result = await this.send(email);
      results.push({
        to: Array.isArray(email.to) ? (email.to[0] ?? '') : email.to,
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
    }

    console.log('[SES] Batch sent:', {
      totalEmails: emails.length,
      totalSent,
      totalFailed,
    });

    return {
      provider: 'ses',
      totalSent,
      totalFailed,
      results,
    };
  }

  /**
   * Send using SES template
   */
  async sendTemplate(options: TemplateEmailOptions): Promise<EmailResult> {
    if (!this._isInitialized || !this.client) {
      return {
        success: false,
        provider: 'ses',
        errorCode: 'NOT_INITIALIZED',
        errorMessage: 'SES is not initialized',
        timestamp: new Date(),
      };
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      const command = new SendTemplatedEmailCommand({
        Source: this.formatAddress(
          options.from || config.email.fromEmail,
          options.fromName || config.email.fromName
        ),
        Destination: {
          ToAddresses: recipients,
          CcAddresses: options.cc,
          BccAddresses: options.bcc,
        },
        Template: options.templateId,
        TemplateData: JSON.stringify(options.dynamicTemplateData),
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
        ConfigurationSetName: config.email.ses.configurationSetName,
        Tags: this.buildTags(options),
      });

      const response = await this.client.send(command);

      console.log('[SES] Template email sent:', {
        templateId: options.templateId,
        to: this.sanitizeEmail(options.to),
        messageId: response.MessageId,
      });

      return {
        success: true,
        ...(response.MessageId ? { messageId: response.MessageId } : {}),
        provider: 'ses',
        timestamp: new Date(),
      };
    } catch (error) {
      const { errorCode, errorMessage } = this.extractError(error);

      console.error('[SES] Template send failed:', {
        templateId: options.templateId,
        errorCode,
        errorMessage,
      });

      return {
        success: false,
        provider: 'ses',
        errorCode,
        errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send bulk templated emails (SES-specific optimization)
   * Note: SES v1 API doesn't have bulk templated email, so we send individually
   */
  async sendBulkTemplate(
    templateId: string,
    destinations: {
      to: string;
      templateData: Record<string, unknown>;
    }[]
  ): Promise<BatchEmailResult> {
    if (!this._isInitialized || !this.client) {
      return {
        provider: 'ses',
        totalSent: 0,
        totalFailed: destinations.length,
        results: destinations.map((d) => ({
          to: d.to,
          success: false as const,
          errorCode: 'NOT_INITIALIZED',
          errorMessage: 'SES is not initialized',
        })),
      };
    }

    const results: BatchEmailResult['results'] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // SES v1 API doesn't have bulk templated email, send individually
    for (const dest of destinations) {
      try {
        const command = new SendTemplatedEmailCommand({
          Source: this.formatAddress(
            config.email.fromEmail,
            config.email.fromName
          ),
          Destination: {
            ToAddresses: [dest.to],
          },
          Template: templateId,
          TemplateData: JSON.stringify(dest.templateData),
          ConfigurationSetName: config.email.ses.configurationSetName,
        });

        const response = await this.client.send(command);

        results.push({
          to: dest.to,
          success: true,
          ...(response.MessageId ? { messageId: response.MessageId } : {}),
        });
        totalSent++;
      } catch (error) {
        const { errorCode, errorMessage } = this.extractError(error);
        results.push({
          to: dest.to,
          success: false,
          errorCode,
          errorMessage,
        });
        totalFailed++;
      }
    }

    console.log('[SES] Bulk template sent:', {
      templateId,
      totalDestinations: destinations.length,
      totalSent,
      totalFailed,
    });

    return {
      provider: 'ses',
      totalSent,
      totalFailed,
      results,
    };
  }

  /**
   * Cancel a scheduled email (not supported by SES)
   */
  async cancelScheduled(messageId: string): Promise<boolean> {
    console.warn('[SES] Cancel scheduled not supported:', messageId);
    return false;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Send raw email with attachments using nodemailer
   */
  private async sendRawEmail(options: SendEmailOptions): Promise<EmailResult> {
    if (!this.client) {
      return {
        success: false,
        provider: 'ses',
        errorCode: 'NOT_INITIALIZED',
        errorMessage: 'SES is not initialized',
        timestamp: new Date(),
      };
    }

    try {
      // Create SES transport via nodemailer - uses SES transport plugin
      const sesTransport = {
        SES: { ses: this.client, aws: { SendRawEmailCommand } },
      };
      const transporter = nodemailer.createTransport(
        sesTransport as Parameters<typeof nodemailer.createTransport>[0]
      );

      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      const info = await transporter.sendMail({
        from: this.formatAddress(
          options.from || config.email.fromEmail,
          options.fromName || config.email.fromName
        ),
        to: recipients.join(', '),
        cc: options.cc?.join(', '),
        bcc: options.bcc?.join(', '),
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments?.map((a) => this.convertAttachment(a)),
      });

      console.log('[SES] Raw email sent:', {
        to: this.sanitizeEmail(options.to),
        messageId: info.messageId,
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: 'ses',
        timestamp: new Date(),
      };
    } catch (error) {
      const { errorCode, errorMessage } = this.extractError(error);

      console.error('[SES] Raw email send failed:', {
        errorCode,
        errorMessage,
      });

      return {
        success: false,
        provider: 'ses',
        errorCode,
        errorMessage,
        timestamp: new Date(),
      };
    }
  }

  private formatAddress(email: string, name?: string): string {
    if (name) {
      return `${name} <${email}>`;
    }
    return email;
  }

  private buildTags(options: SendEmailOptions | TemplateEmailOptions): { Name: string; Value: string }[] {
    const tags: { Name: string; Value: string }[] = [];

    if (options.category) {
      tags.push({ Name: 'category', Value: options.category });
    }

    if (options.tags) {
      for (const tag of options.tags) {
        tags.push({ Name: 'tag', Value: tag });
      }
    }

    if (options.customArgs) {
      for (const [key, value] of Object.entries(options.customArgs)) {
        tags.push({ Name: key, Value: value });
      }
    }

    return tags;
  }

  private convertAttachment(attachment: EmailAttachment): Attachment {
    return {
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
      cid: attachment.contentId,
      contentDisposition: attachment.disposition || 'attachment',
    };
  }

  private extractError(error: unknown): { errorCode: string; errorMessage: string } {
    if (error && typeof error === 'object') {
      const err = error as { name?: string; message?: string; Code?: string };
      return {
        errorCode: err.Code || err.name || 'SES_ERROR',
        errorMessage: err.message || 'Unknown SES error',
      };
    }
    return {
      errorCode: 'SES_ERROR',
      errorMessage: 'Unknown SES error',
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

export const sesProvider = new SESProvider();

export function createSESProvider(): EmailProvider {
  return new SESProvider();
}
