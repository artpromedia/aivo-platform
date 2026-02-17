/**
 * Email Service
 *
 * Handles sending transactional emails with template support.
 * Uses nodemailer for SMTP delivery in production environments.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
const { createTransport } = nodemailer;
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { logger } from '@aivo/ts-observability';

import { config } from '../config.js';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
}

export class EmailService {
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

  initialize() {
    // Initialize SMTP transporter if credentials are configured
    if (config.smtpHost && config.smtpUser && config.smtpPassword) {
      this.transporter = createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword,
        },
      });

      logger.info(
        {
          host: config.smtpHost,
          port: config.smtpPort,
        },
        'Email transporter initialized'
      );
    } else if (config.environment === 'production') {
      logger.warn(
        'SMTP not configured in production - emails will not be sent. ' +
          'Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD environment variables.'
      );
    }
  }

  /**
   * Send an email
   */
  async send(options: SendEmailOptions): Promise<{ messageId: string }> {
    const { to, subject, html, text, tags } = options;

    try {
      // In development without SMTP, just log the email
      if (config.environment === 'development' && !this.transporter) {
        logger.info(
          {
            to,
            subject,
            tags,
          },
          'Email sent (dev mode - no SMTP configured)'
        );

        return { messageId: `dev-${Date.now()}` };
      }

      // Verify transporter is configured for production
      if (!this.transporter) {
        const errorMsg = 'Email transporter not configured';
        logger.error({ to, subject }, errorMsg);
        throw new Error(errorMsg);
      }

      // Send email via SMTP
      const result = await this.transporter.sendMail({
        from: config.emailFrom,
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
        headers: tags?.length ? { 'X-Email-Tags': tags.join(',') } : undefined,
      });

      logger.info(
        {
          to,
          subject,
          messageId: result.messageId,
          tags,
        },
        'Email sent successfully'
      );

      return { messageId: result.messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        {
          to,
          subject,
          error: message,
        },
        'Failed to send email'
      );
      throw error;
    }
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replaceAll(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replaceAll(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replaceAll(/<[^>]+>/g, '')
      .replaceAll(/\s+/g, ' ')
      .trim();
  }
}
