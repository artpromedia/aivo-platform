/**
 * Email Service
 *
 * Handles sending transactional emails with template support.
 * Uses nodemailer for SMTP delivery in production environments.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { logger, metrics } from '@aivo/ts-observability';
import { config } from '../config.js';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
}

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

  onModuleInit() {
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

      logger.info('Email transporter initialized', {
        host: config.smtpHost,
        port: config.smtpPort,
      });
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
        logger.info('Email sent (dev mode - no SMTP configured)', {
          to,
          subject,
          tags,
        });

        return { messageId: `dev-${Date.now()}` };
      }

      // Verify transporter is configured for production
      if (!this.transporter) {
        const errorMsg = 'Email transporter not configured';
        logger.error(errorMsg, { to, subject });
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

      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: result.messageId,
        tags,
      });

      metrics.increment('email.sent', { template: tags?.[0] || 'unknown' });

      return { messageId: result.messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send email', {
        to,
        subject,
        error: message,
      });
      metrics.increment('email.failed');
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
