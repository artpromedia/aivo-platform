/**
 * Email Service
 *
 * Handles sending transactional emails with template support.
 */

import { Injectable } from '@nestjs/common';
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
export class EmailService {
  /**
   * Send an email
   */
  async send(options: SendEmailOptions): Promise<{ messageId: string }> {
    const { to, subject, html, text, tags } = options;

    try {
      // In production, integrate with email provider (SendGrid, SES, etc.)
      // For now, log the email
      if (config.environment === 'development') {
        logger.info('Email sent (dev mode)', {
          to,
          subject,
          tags,
        });

        return { messageId: `dev-${Date.now()}` };
      }

      // TODO: Integrate with email provider
      // Example with SendGrid:
      // const msg = {
      //   to,
      //   from: config.emailFrom,
      //   subject,
      //   html,
      //   text: text || this.htmlToText(html),
      // };
      // const response = await sgMail.send(msg);

      metrics.increment('email.sent', { template: tags?.[0] || 'unknown' });

      return { messageId: `email-${Date.now()}` };
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
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
