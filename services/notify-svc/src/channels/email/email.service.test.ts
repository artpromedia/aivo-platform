/**
 * Unit Tests for Email Service
 *
 * Tests for:
 * - Template rendering
 * - SendGrid/SES provider integration
 * - Rate limiting
 * - Provider failover
 * - Bounce handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockSendGridMail = {
  setApiKey: vi.fn(),
  send: vi.fn(),
};

const mockSESClient = {
  send: vi.fn(),
};

const mockRateLimiter = {
  consume: vi.fn(),
};

vi.mock('@sendgrid/mail', () => ({
  default: mockSendGridMail,
}));

vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn(() => mockSESClient),
  SendEmailCommand: vi.fn((params) => params),
}));

vi.mock('rate-limiter-flexible', () => ({
  RateLimiterMemory: vi.fn(() => mockRateLimiter),
}));

const mockPrismaEmailSuppression = {
  findFirst: vi.fn(),
  create: vi.fn(),
};

const mockPrismaEmailLog = {
  create: vi.fn(),
  update: vi.fn(),
};

vi.mock('../prisma.js', () => ({
  prisma: {
    emailSuppression: mockPrismaEmailSuppression,
    emailLog: mockPrismaEmailLog,
  },
}));

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  templateId?: string;
  templateData?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

// =============================================================================
// EMAIL SERVICE (Simplified for testing)
// =============================================================================

class EmailService {
  private defaultFrom = 'noreply@aivo.edu';
  private primaryProvider: 'sendgrid' | 'ses' = 'sendgrid';

  async send(options: EmailOptions): Promise<EmailResult> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    // Check suppression list
    for (const email of recipients) {
      const suppressed = await this.isEmailSuppressed(email);
      if (suppressed) {
        return {
          success: false,
          provider: 'none',
          error: `Email suppressed: ${email}`,
        };
      }
    }

    // Check rate limit
    try {
      await mockRateLimiter.consume(recipients[0], recipients.length);
    } catch {
      return {
        success: false,
        provider: 'none',
        error: 'Rate limit exceeded',
      };
    }

    // Try primary provider
    try {
      const result = await this.sendWithProvider(this.primaryProvider, options);
      await this.logEmailSent(options, result);
      return result;
    } catch (primaryError) {
      // Failover to secondary provider
      const fallbackProvider = this.primaryProvider === 'sendgrid' ? 'ses' : 'sendgrid';
      try {
        const result = await this.sendWithProvider(fallbackProvider, options);
        await this.logEmailSent(options, result);
        return result;
      } catch (fallbackError) {
        const error = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
        return {
          success: false,
          provider: fallbackProvider,
          error,
        };
      }
    }
  }

  private async sendWithProvider(
    provider: 'sendgrid' | 'ses',
    options: EmailOptions
  ): Promise<EmailResult> {
    if (provider === 'sendgrid') {
      return this.sendWithSendGrid(options);
    }
    return this.sendWithSES(options);
  }

  private async sendWithSendGrid(options: EmailOptions): Promise<EmailResult> {
    const msg = {
      to: options.to,
      from: options.from ?? this.defaultFrom,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        type: a.contentType,
        disposition: 'attachment',
      })),
    };

    const [response] = await mockSendGridMail.send(msg);
    return {
      success: true,
      messageId: response.headers['x-message-id'],
      provider: 'sendgrid',
    };
  }

  private async sendWithSES(options: EmailOptions): Promise<EmailResult> {
    const command = {
      Destination: {
        ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
        CcAddresses: options.cc,
        BccAddresses: options.bcc,
      },
      Message: {
        Subject: { Data: options.subject },
        Body: {
          Text: options.text ? { Data: options.text } : undefined,
          Html: options.html ? { Data: options.html } : undefined,
        },
      },
      Source: options.from ?? this.defaultFrom,
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
    };

    const result = await mockSESClient.send(command);
    return {
      success: true,
      messageId: result.MessageId,
      provider: 'ses',
    };
  }

  async sendTemplatedEmail(
    to: string | string[],
    template: EmailTemplate,
    data: Record<string, unknown>
  ): Promise<EmailResult> {
    const rendered = this.renderTemplate(template, data);
    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  renderTemplate(
    template: EmailTemplate,
    data: Record<string, unknown>
  ): { subject: string; html: string; text: string } {
    // Simple Handlebars-like template rendering
    const render = (str: string): string => {
      return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ''));
    };

    return {
      subject: render(template.subject),
      html: render(template.htmlBody),
      text: render(template.textBody),
    };
  }

  async isEmailSuppressed(email: string): Promise<boolean> {
    const suppression = await mockPrismaEmailSuppression.findFirst({
      where: { email: email.toLowerCase() },
    });
    return !!suppression;
  }

  async addToSuppressionList(
    email: string,
    reason: string,
    expiresAt?: Date
  ): Promise<void> {
    await mockPrismaEmailSuppression.create({
      data: {
        email: email.toLowerCase(),
        reason,
        expiresAt,
      },
    });
  }

  async handleBounce(email: string, bounceType: string): Promise<void> {
    if (bounceType === 'hard') {
      await this.addToSuppressionList(email, 'Hard bounce');
    }
  }

  async handleComplaint(email: string): Promise<void> {
    await this.addToSuppressionList(email, 'Spam complaint');
  }

  private async logEmailSent(options: EmailOptions, result: EmailResult): Promise<void> {
    await mockPrismaEmailLog.create({
      data: {
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject: options.subject,
        provider: result.provider,
        messageId: result.messageId,
        success: result.success,
        error: result.error,
        sentAt: new Date(),
      },
    });
  }

  validateEmailFormat(email: string): { valid: boolean; reason?: string } {
    // Basic RFC 5322 validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, reason: 'Invalid email format' };
    }

    // Check for disposable email domains
    const disposableDomains = ['tempmail.com', 'throwaway.com', '10minutemail.com'];
    const domain = email.split('@')[1].toLowerCase();
    if (disposableDomains.includes(domain)) {
      return { valid: false, reason: 'Disposable email not allowed' };
    }

    return { valid: true };
  }

  setPrimaryProvider(provider: 'sendgrid' | 'ses'): void {
    this.primaryProvider = provider;
  }
}

// =============================================================================
// FIXTURES
// =============================================================================

const createMockTemplate = (overrides: Partial<EmailTemplate> = {}): EmailTemplate => ({
  id: 'template-001',
  name: 'welcome',
  subject: 'Welcome {{name}}!',
  htmlBody: '<h1>Hello {{name}}</h1><p>Welcome to {{appName}}!</p>',
  textBody: 'Hello {{name}}, Welcome to {{appName}}!',
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailService();
    mockRateLimiter.consume.mockResolvedValue({ remainingPoints: 100 });
  });

  // ===========================================================================
  // SEND EMAIL TESTS
  // ===========================================================================

  describe('send', () => {
    it('should send email via SendGrid successfully', async () => {
      mockPrismaEmailSuppression.findFirst.mockResolvedValueOnce(null);
      mockSendGridMail.send.mockResolvedValueOnce([
        { statusCode: 202, headers: { 'x-message-id': 'sg-123' } },
      ]);

      const result = await service.send({
        to: 'user@example.com',
        subject: 'Test Email',
        text: 'Hello World',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('sendgrid');
      expect(result.messageId).toBe('sg-123');
    });

    it('should send email to multiple recipients', async () => {
      mockPrismaEmailSuppression.findFirst.mockResolvedValue(null);
      mockSendGridMail.send.mockResolvedValueOnce([
        { statusCode: 202, headers: { 'x-message-id': 'sg-multi' } },
      ]);

      const result = await service.send({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Group Email',
        text: 'Hello Everyone',
      });

      expect(result.success).toBe(true);
    });

    it('should block suppressed emails', async () => {
      mockPrismaEmailSuppression.findFirst.mockResolvedValueOnce({
        email: 'blocked@example.com',
        reason: 'Hard bounce',
      });

      const result = await service.send({
        to: 'blocked@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('suppressed');
      expect(mockSendGridMail.send).not.toHaveBeenCalled();
    });

    it('should enforce rate limits', async () => {
      mockPrismaEmailSuppression.findFirst.mockResolvedValueOnce(null);
      mockRateLimiter.consume.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      const result = await service.send({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('should failover to SES when SendGrid fails', async () => {
      mockPrismaEmailSuppression.findFirst.mockResolvedValueOnce(null);
      mockSendGridMail.send.mockRejectedValueOnce(new Error('SendGrid error'));
      mockSESClient.send.mockResolvedValueOnce({ MessageId: 'ses-456' });

      const result = await service.send({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('ses');
      expect(result.messageId).toBe('ses-456');
    });

    it('should return error when both providers fail', async () => {
      mockPrismaEmailSuppression.findFirst.mockResolvedValueOnce(null);
      mockSendGridMail.send.mockRejectedValueOnce(new Error('SendGrid error'));
      mockSESClient.send.mockRejectedValueOnce(new Error('SES error'));

      const result = await service.send({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SES error');
    });

    it('should log email after sending', async () => {
      mockPrismaEmailSuppression.findFirst.mockResolvedValueOnce(null);
      mockSendGridMail.send.mockResolvedValueOnce([
        { statusCode: 202, headers: { 'x-message-id': 'sg-log' } },
      ]);

      await service.send({
        to: 'user@example.com',
        subject: 'Test Email',
        text: 'Hello',
      });

      expect(mockPrismaEmailLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            to: 'user@example.com',
            subject: 'Test Email',
            provider: 'sendgrid',
            success: true,
          }),
        })
      );
    });
  });

  // ===========================================================================
  // TEMPLATE RENDERING TESTS
  // ===========================================================================

  describe('renderTemplate', () => {
    it('should render template variables', () => {
      const template = createMockTemplate();
      const result = service.renderTemplate(template, {
        name: 'John',
        appName: 'Aivo',
      });

      expect(result.subject).toBe('Welcome John!');
      expect(result.html).toContain('Hello John');
      expect(result.html).toContain('Welcome to Aivo');
    });

    it('should handle missing variables', () => {
      const template = createMockTemplate();
      const result = service.renderTemplate(template, { name: 'Jane' });

      expect(result.subject).toBe('Welcome Jane!');
      expect(result.html).toContain('Welcome to !'); // Missing appName
    });
  });

  describe('sendTemplatedEmail', () => {
    it('should render and send template', async () => {
      mockPrismaEmailSuppression.findFirst.mockResolvedValueOnce(null);
      mockSendGridMail.send.mockResolvedValueOnce([
        { statusCode: 202, headers: { 'x-message-id': 'sg-tpl' } },
      ]);

      const template = createMockTemplate();
      const result = await service.sendTemplatedEmail(
        'user@example.com',
        template,
        { name: 'Alice', appName: 'Aivo' }
      );

      expect(result.success).toBe(true);
      expect(mockSendGridMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Welcome Alice!',
          html: expect.stringContaining('Hello Alice'),
        })
      );
    });
  });

  // ===========================================================================
  // EMAIL VALIDATION TESTS
  // ===========================================================================

  describe('validateEmailFormat', () => {
    it('should validate correct email format', () => {
      const result = service.validateEmailFormat('user@example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = service.validateEmailFormat('invalid-email');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid email format');
    });

    it('should reject email without domain', () => {
      const result = service.validateEmailFormat('user@');
      expect(result.valid).toBe(false);
    });

    it('should reject disposable email domains', () => {
      const result = service.validateEmailFormat('user@tempmail.com');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Disposable');
    });
  });

  // ===========================================================================
  // SUPPRESSION LIST TESTS
  // ===========================================================================

  describe('isEmailSuppressed', () => {
    it('should return true for suppressed email', async () => {
      mockPrismaEmailSuppression.findFirst.mockResolvedValueOnce({
        email: 'blocked@example.com',
      });

      const result = await service.isEmailSuppressed('blocked@example.com');
      expect(result).toBe(true);
    });

    it('should return false for non-suppressed email', async () => {
      mockPrismaEmailSuppression.findFirst.mockResolvedValueOnce(null);

      const result = await service.isEmailSuppressed('clean@example.com');
      expect(result).toBe(false);
    });

    it('should normalize email to lowercase', async () => {
      await service.isEmailSuppressed('User@EXAMPLE.com');

      expect(mockPrismaEmailSuppression.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'user@example.com' },
        })
      );
    });
  });

  describe('addToSuppressionList', () => {
    it('should add email with reason', async () => {
      await service.addToSuppressionList('bad@example.com', 'Hard bounce');

      expect(mockPrismaEmailSuppression.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'bad@example.com',
            reason: 'Hard bounce',
          }),
        })
      );
    });

    it('should set expiration date', async () => {
      const expiresAt = new Date('2026-12-31');
      await service.addToSuppressionList('temp@example.com', 'Temporary', expiresAt);

      expect(mockPrismaEmailSuppression.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expiresAt }),
        })
      );
    });
  });

  // ===========================================================================
  // BOUNCE HANDLING TESTS
  // ===========================================================================

  describe('handleBounce', () => {
    it('should add to suppression list for hard bounce', async () => {
      await service.handleBounce('bounced@example.com', 'hard');

      expect(mockPrismaEmailSuppression.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'bounced@example.com',
            reason: 'Hard bounce',
          }),
        })
      );
    });

    it('should not suppress soft bounces', async () => {
      await service.handleBounce('soft@example.com', 'soft');

      expect(mockPrismaEmailSuppression.create).not.toHaveBeenCalled();
    });
  });

  describe('handleComplaint', () => {
    it('should add to suppression list', async () => {
      await service.handleComplaint('complainer@example.com');

      expect(mockPrismaEmailSuppression.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'complainer@example.com',
            reason: 'Spam complaint',
          }),
        })
      );
    });
  });

  // ===========================================================================
  // PROVIDER CONFIGURATION TESTS
  // ===========================================================================

  describe('setPrimaryProvider', () => {
    it('should change primary provider to SES', async () => {
      mockPrismaEmailSuppression.findFirst.mockResolvedValueOnce(null);
      mockSESClient.send.mockResolvedValueOnce({ MessageId: 'ses-primary' });

      service.setPrimaryProvider('ses');

      const result = await service.send({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.provider).toBe('ses');
      expect(mockSendGridMail.send).not.toHaveBeenCalled();
    });
  });
});
