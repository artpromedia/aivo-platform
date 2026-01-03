/**
 * Notification Service Client
 *
 * HTTP client for sending transactional emails via the notification service.
 */

import { config } from '../config.js';

// ============================================================================
// TYPES
// ============================================================================

interface SendEmailRequest {
  templateName: string;
  to: string;
  context: Record<string, unknown>;
  locale?: string;
  category?: string;
  tags?: string[];
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface PasswordResetEmailParams {
  email: string;
  resetToken: string;
  expiryMinutes?: number;
  requestInfo?: {
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
  };
}

interface EmailVerificationEmailParams {
  email: string;
  verificationToken: string;
  userName?: string;
}

// ============================================================================
// NOTIFY CLIENT
// ============================================================================

class NotifyClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    this.baseUrl = config.notifyServiceUrl || 'http://notify-svc:4040';
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<EmailResponse> {
    const resetUrl = `${config.webAppUrl}/auth/reset-password?token=${encodeURIComponent(params.resetToken)}`;

    const context: Record<string, unknown> = {
      subject: 'Reset Your Password',
      userEmail: params.email,
      resetUrl,
      expiryMinutes: params.expiryMinutes || 60,
      supportUrl: `${config.webAppUrl}/support`,
      brandColor: '#6366f1',
    };

    if (params.requestInfo) {
      context.requestInfo = {
        timestamp: params.requestInfo.timestamp,
        ipAddress: params.requestInfo.ipAddress || 'Unknown',
        browser: this.parseUserAgent(params.requestInfo.userAgent),
      };
    }

    return this.sendTemplatedEmail({
      templateName: 'transactional/password-reset',
      to: params.email,
      context,
      category: 'transactional',
      tags: ['password-reset'],
    });
  }

  /**
   * Send an email verification email
   */
  async sendEmailVerificationEmail(params: EmailVerificationEmailParams): Promise<EmailResponse> {
    const verificationUrl = `${config.webAppUrl}/auth/verify-email?token=${encodeURIComponent(params.verificationToken)}`;

    return this.sendTemplatedEmail({
      templateName: 'transactional/email-verification',
      to: params.email,
      context: {
        subject: 'Verify Your Email Address',
        userName: params.userName || 'there',
        verificationUrl,
        supportUrl: `${config.webAppUrl}/support`,
        brandColor: '#6366f1',
      },
      category: 'transactional',
      tags: ['email-verification'],
    });
  }

  /**
   * Send an account locked notification email
   */
  async sendAccountLockedEmail(email: string, unlockMinutes: number): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      templateName: 'transactional/account-locked',
      to: email,
      context: {
        subject: 'Account Temporarily Locked',
        userEmail: email,
        unlockMinutes,
        supportUrl: `${config.webAppUrl}/support`,
        brandColor: '#6366f1',
      },
      category: 'security',
      tags: ['account-locked'],
    });
  }

  /**
   * Generic method to send a templated email via the notification service
   */
  private async sendTemplatedEmail(request: SendEmailRequest): Promise<EmailResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'auth-svc',
          'X-Tenant-Id': 'system', // System-level emails
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[NotifyClient] Failed to send email:', {
          status: response.status,
          body: errorBody,
        });

        return {
          success: false,
          error: `HTTP ${response.status}: ${errorBody}`,
        };
      }

      const result = await response.json() as { data?: { messageId?: string } };

      return {
        success: true,
        messageId: result.data?.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NotifyClient] Email send error:', errorMessage);

      // Don't throw - email failures shouldn't break auth flows
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Parse user agent string to readable browser name
   */
  private parseUserAgent(userAgent?: string): string {
    if (!userAgent) return 'Unknown Browser';

    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';

    return 'Unknown Browser';
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const notifyClient = new NotifyClient();
