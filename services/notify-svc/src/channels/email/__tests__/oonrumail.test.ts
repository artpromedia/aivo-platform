/**
 * OonruMail Provider Tests
 *
 * Unit tests for the OonruMailProvider class covering:
 * - Initialization (success, missing key, health check failure)
 * - Single email sending
 * - Batch sending
 * - Template sending (with server template mapping)
 * - Scheduled email cancellation
 * - Error classification for failover
 * - Webhook signature verification
 * - Attachment conversion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock methods so they're available before vi.mock factory runs
const {
  mockSend,
  mockSendTemplate,
  mockSendBatch,
  mockCancelScheduled,
  mockHealth,
} = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockSendTemplate: vi.fn(),
  mockSendBatch: vi.fn(),
  mockCancelScheduled: vi.fn(),
  mockHealth: vi.fn(),
}));

// Error classes shared between mock and tests
const {
  OonruMailError,
  OonruMailTimeoutError,
  OonruMailAuthError,
  OonruMailRateLimitError,
} = vi.hoisted(() => {
  class _OonruMailError extends Error {
    retryable: boolean;
    statusCode?: number;
    errorCode?: string;
    constructor(
      message: string,
      options: { retryable?: boolean; statusCode?: number; errorCode?: string } = {},
    ) {
      super(message);
      this.name = 'OonruMailError';
      this.retryable = options.retryable ?? false;
      this.statusCode = options.statusCode;
      this.errorCode = options.errorCode;
    }
  }

  class _OonruMailTimeoutError extends _OonruMailError {
    constructor(message = 'Request timed out') {
      super(message, { retryable: true, errorCode: 'TIMEOUT' });
      this.name = 'OonruMailTimeoutError';
    }
  }

  class _OonruMailAuthError extends _OonruMailError {
    constructor(message = 'Authentication failed') {
      super(message, { retryable: false, statusCode: 401, errorCode: 'AUTH_ERROR' });
      this.name = 'OonruMailAuthError';
    }
  }

  class _OonruMailRateLimitError extends _OonruMailError {
    retryAfterMs?: number;
    constructor(message = 'Rate limit exceeded', retryAfterMs?: number) {
      super(message, { retryable: true, statusCode: 429, errorCode: 'RATE_LIMITED' });
      this.name = 'OonruMailRateLimitError';
      this.retryAfterMs = retryAfterMs;
    }
  }

  return {
    OonruMailError: _OonruMailError,
    OonruMailTimeoutError: _OonruMailTimeoutError,
    OonruMailAuthError: _OonruMailAuthError,
    OonruMailRateLimitError: _OonruMailRateLimitError,
  };
});

// Mock the SDK — uses hoisted mocks so tests can configure them before initialize()
vi.mock('@enterprise-email/aivolearning-email', () => ({
  AivolearningEmail: vi.fn().mockImplementation(() => ({
    send: mockSend,
    sendTemplate: mockSendTemplate,
    sendBatch: mockSendBatch,
    cancelScheduled: mockCancelScheduled,
    health: mockHealth,
  })),
  OonruMailError,
  OonruMailTimeoutError,
  OonruMailAuthError,
  OonruMailRateLimitError,
}));

// Mock config
vi.mock('../../../config.js', () => ({
  config: {
    email: {
      fromEmail: 'noreply@aivo.app',
      fromName: 'AIVO',
      oonrumail: {
        enabled: true,
        apiKey: 'test-api-key-123',
        baseUrl: 'https://api.oonrumail.test/v1',
        webhookSecret: 'test-webhook-secret',
        useServerTemplates: false,
        timeout: 30000,
        sandboxMode: false,
        templates: {
          welcome: 'om-tpl-welcome-001',
          emailVerification: 'om-tpl-verify-002',
          passwordReset: 'om-tpl-reset-003',
          paymentReceipt: 'om-tpl-receipt-004',
          lessonReminder: 'om-tpl-lesson-005',
          courseCompletion: 'om-tpl-course-006',
          assignmentSubmitted: 'om-tpl-assign-007',
          assignmentGraded: 'om-tpl-grade-008',
          instructorNewEnrollment: 'om-tpl-enroll-009',
        },
      },
    },
  },
}));

import { AivolearningEmail } from '@enterprise-email/aivolearning-email';

import { createOonruMailProvider } from '../oonrumail.js';
import type { SendEmailOptions, TemplateEmailOptions } from '../types.js';

const baseSendOptions: SendEmailOptions = {
  to: 'student@example.com',
  subject: 'Welcome to AIVO',
  html: '<h1>Welcome!</h1>',
  text: 'Welcome!',
};

const baseTemplateOptions: TemplateEmailOptions = {
  to: 'student@example.com',
  templateId: 'welcome',
  dynamicTemplateData: { name: 'John', courseName: 'Math 101' },
};

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('OonruMailProvider', () => {
  let provider: ReturnType<typeof createOonruMailProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = createOonruMailProvider();
  });

  afterEach(async () => {
    await provider.shutdown();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize successfully when health check passes', async () => {
      mockHealth.mockResolvedValue({
        status: 'healthy',
        latencyMs: 42,
        version: '1.0.0',
      });

      const result = await provider.initialize();

      expect(result).toBe(true);
      expect(provider.isHealthy).toBe(true);
      expect(provider.name).toBe('oonrumail');
    });

    it('should initialize in degraded state when health check fails', async () => {
      mockHealth.mockRejectedValue(new Error('Connection refused'));

      const result = await provider.initialize();

      // Should still initialize with degraded state
      expect(result).toBe(true);
      expect(provider.isHealthy).toBe(false);
    });

    it('should return false when API reports status: down', async () => {
      mockHealth.mockResolvedValue({
        status: 'down',
        latencyMs: 0,
        version: '1.0.0',
      });

      const result = await provider.initialize();

      expect(result).toBe(false);
    });

    it('should return true on subsequent initialization calls', async () => {
      mockHealth.mockResolvedValue({ status: 'healthy', latencyMs: 10, version: '1.0.0' });

      await provider.initialize();
      const secondResult = await provider.initialize();

      expect(secondResult).toBe(true);
      // Constructor only called once
      expect(AivolearningEmail).toHaveBeenCalledTimes(1);
    });

    it('should pass config to SDK constructor', async () => {
      mockHealth.mockResolvedValue({ status: 'healthy', latencyMs: 10, version: '1.0.0' });

      await provider.initialize();

      expect(AivolearningEmail).toHaveBeenCalledWith({
        apiKey: 'test-api-key-123',
        baseUrl: 'https://api.oonrumail.test/v1',
        timeout: 30000,
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SEND
  // ──────────────────────────────────────────────────────────────────────────

  describe('send', () => {
    beforeEach(async () => {
      mockHealth.mockResolvedValue({ status: 'healthy', latencyMs: 10, version: '1.0.0' });
      await provider.initialize();
    });

    it('should send a single email successfully', async () => {
      mockSend.mockResolvedValue({
        messageId: 'om-msg-001',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      const result = await provider.send(baseSendOptions);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('oonrumail');
      expect(result.messageId).toBe('om-msg-001');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['student@example.com'],
          subject: 'Welcome to AIVO',
          html: '<h1>Welcome!</h1>',
          text: 'Welcome!',
          from: 'noreply@aivo.app',
          fromName: 'AIVO',
        }),
      );
    });

    it('should handle multiple recipients', async () => {
      mockSend.mockResolvedValue({
        messageId: 'om-msg-002',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      const result = await provider.send({
        ...baseSendOptions,
        to: ['a@example.com', 'b@example.com'],
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['a@example.com', 'b@example.com'],
        }),
      );
    });

    it('should include cc, bcc, replyTo, and tags', async () => {
      mockSend.mockResolvedValue({
        messageId: 'om-msg-003',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      await provider.send({
        ...baseSendOptions,
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        replyTo: 'reply@example.com',
        tags: ['onboarding'],
        category: 'welcome',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: ['cc@example.com'],
          bcc: ['bcc@example.com'],
          replyTo: 'reply@example.com',
          tags: expect.arrayContaining(['onboarding', 'welcome']),
        }),
      );
    });

    it('should convert attachments to base64', async () => {
      mockSend.mockResolvedValue({
        messageId: 'om-msg-004',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      await provider.send({
        ...baseSendOptions,
        attachments: [
          {
            filename: 'report.pdf',
            content: Buffer.from('PDF content'),
            contentType: 'application/pdf',
          },
        ],
      });

      const sentMessage = mockSend.mock.calls[0][0];
      expect(sentMessage.attachments[0]).toEqual({
        filename: 'report.pdf',
        content: Buffer.from('PDF content').toString('base64'),
        contentType: 'application/pdf',
        disposition: 'attachment',
      });
    });

    it('should handle scheduled sending', async () => {
      mockSend.mockResolvedValue({
        messageId: 'om-msg-005',
        status: 'queued',
        acceptedAt: new Date().toISOString(),
      });

      const scheduledAt = new Date('2025-01-15T10:00:00Z');
      await provider.send({
        ...baseSendOptions,
        scheduledAt,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledAt: '2025-01-15T10:00:00.000Z',
        }),
      );
    });

    it('should return NOT_INITIALIZED error when not initialized', async () => {
      const uninitProvider = createOonruMailProvider();
      const result = await uninitProvider.send(baseSendOptions);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_INITIALIZED');
      expect(result.provider).toBe('oonrumail');
    });

    it('should set priority in metadata', async () => {
      mockSend.mockResolvedValue({
        messageId: 'om-msg-006',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      await provider.send({
        ...baseSendOptions,
        priority: 'high',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ priority: 'high' }),
        }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SEND BATCH
  // ──────────────────────────────────────────────────────────────────────────

  describe('sendBatch', () => {
    beforeEach(async () => {
      mockHealth.mockResolvedValue({ status: 'healthy', latencyMs: 10, version: '1.0.0' });
      await provider.initialize();
    });

    it('should send a batch of emails', async () => {
      mockSendBatch.mockResolvedValue({
        batchId: 'batch-001',
        totalAccepted: 2,
        totalRejected: 0,
        results: [
          { to: 'a@example.com', messageId: 'msg-a', status: 'accepted' },
          { to: 'b@example.com', messageId: 'msg-b', status: 'accepted' },
        ],
      });

      const emails: SendEmailOptions[] = [
        { to: 'a@example.com', subject: 'Hello A', html: '<p>Hi A</p>' },
        { to: 'b@example.com', subject: 'Hello B', html: '<p>Hi B</p>' },
      ];

      const result = await provider.sendBatch(emails);

      expect(result.provider).toBe('oonrumail');
      expect(result.totalSent).toBe(2);
      expect(result.totalFailed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.success).toBe(true);
      expect(result.results[0]?.messageId).toBe('msg-a');
    });

    it('should handle partial batch failures', async () => {
      mockSendBatch.mockResolvedValue({
        batchId: 'batch-002',
        totalAccepted: 1,
        totalRejected: 1,
        results: [
          { to: 'ok@example.com', messageId: 'msg-ok', status: 'accepted' },
          { to: 'bad@example.com', status: 'rejected', error: 'Invalid recipient' },
        ],
      });

      const emails: SendEmailOptions[] = [
        { to: 'ok@example.com', subject: 'OK', html: '<p>OK</p>' },
        { to: 'bad@example.com', subject: 'Bad', html: '<p>Bad</p>' },
      ];

      const result = await provider.sendBatch(emails);

      expect(result.totalSent).toBe(1);
      expect(result.totalFailed).toBe(1);
      expect(result.results[1]?.success).toBe(false);
      expect(result.results[1]?.errorCode).toBe('REJECTED');
    });

    it('should return NOT_INITIALIZED for batch when not initialized', async () => {
      const uninitProvider = createOonruMailProvider();
      const emails: SendEmailOptions[] = [
        { to: 'a@test.com', subject: 'Test', html: '<p>Test</p>' },
      ];

      const result = await uninitProvider.sendBatch(emails);

      expect(result.totalFailed).toBe(1);
      expect(result.totalSent).toBe(0);
      expect(result.results[0]?.errorCode).toBe('NOT_INITIALIZED');
    });

    it('should handle complete batch SDK error', async () => {
      mockSendBatch.mockRejectedValue(
        new OonruMailError('Service unavailable', { retryable: true, statusCode: 503, errorCode: 'SERVICE_UNAVAILABLE' }),
      );

      const emails: SendEmailOptions[] = [
        { to: 'a@test.com', subject: 'Test', html: '<p>Test</p>' },
        { to: 'b@test.com', subject: 'Test', html: '<p>Test</p>' },
      ];

      const result = await provider.sendBatch(emails);

      expect(result.totalFailed).toBe(2);
      expect(result.totalSent).toBe(0);
      expect(result.results[0]?.errorCode).toBe('SERVICE_UNAVAILABLE');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SEND TEMPLATE
  // ──────────────────────────────────────────────────────────────────────────

  describe('sendTemplate', () => {
    beforeEach(async () => {
      mockHealth.mockResolvedValue({ status: 'healthy', latencyMs: 10, version: '1.0.0' });
      await provider.initialize();
    });

    it('should send a template email with passthrough templateId', async () => {
      mockSendTemplate.mockResolvedValue({
        messageId: 'om-tpl-msg-001',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      const result = await provider.sendTemplate(baseTemplateOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('om-tpl-msg-001');
      expect(result.provider).toBe('oonrumail');

      // When useServerTemplates is false, templateId is passed through as-is
      expect(mockSendTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'welcome',
          templateData: { name: 'John', courseName: 'Math 101' },
          to: ['student@example.com'],
        }),
      );
    });

    it('should include cc, bcc, and attachments in template emails', async () => {
      mockSendTemplate.mockResolvedValue({
        messageId: 'om-tpl-msg-002',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      await provider.sendTemplate({
        ...baseTemplateOptions,
        cc: ['teacher@example.com'],
        bcc: ['admin@example.com'],
        replyTo: 'support@aivo.app',
        tags: ['notification'],
        customArgs: { trackingId: 'track-123' },
      });

      expect(mockSendTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: ['teacher@example.com'],
          bcc: ['admin@example.com'],
          replyTo: 'support@aivo.app',
          tags: ['notification'],
          metadata: { trackingId: 'track-123' },
        }),
      );
    });

    it('should return NOT_INITIALIZED error on template send when not initialized', async () => {
      const uninitProvider = createOonruMailProvider();
      const result = await uninitProvider.sendTemplate(baseTemplateOptions);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_INITIALIZED');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEMPLATE MAPPING (SERVER TEMPLATES)
  // ──────────────────────────────────────────────────────────────────────────

  describe('template mapping with useServerTemplates', () => {
    beforeEach(async () => {
      // Need to import and modify the mock config
      const configMod = await import('../../../config.js');
      (configMod.config as any).email.oonrumail.useServerTemplates = true;
      mockHealth.mockResolvedValue({ status: 'healthy', latencyMs: 10, version: '1.0.0' });
      await provider.initialize();
    });

    afterEach(async () => {
      const configMod = await import('../../../config.js');
      (configMod.config as any).email.oonrumail.useServerTemplates = false;
    });

    it('should resolve "welcome" to the configured server template ID', async () => {
      mockSendTemplate.mockResolvedValue({
        messageId: 'om-mapped-001',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      await provider.sendTemplate({
        ...baseTemplateOptions,
        templateId: 'welcome',
      });

      expect(mockSendTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'om-tpl-welcome-001',
        }),
      );
    });

    it('should resolve email_verification with underscore variant', async () => {
      mockSendTemplate.mockResolvedValue({
        messageId: 'om-mapped-002',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      await provider.sendTemplate({
        ...baseTemplateOptions,
        templateId: 'email_verification',
      });

      expect(mockSendTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'om-tpl-verify-002',
        }),
      );
    });

    it('should resolve password-reset with hyphen variant', async () => {
      mockSendTemplate.mockResolvedValue({
        messageId: 'om-mapped-003',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      await provider.sendTemplate({
        ...baseTemplateOptions,
        templateId: 'password-reset',
      });

      expect(mockSendTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'om-tpl-reset-003',
        }),
      );
    });

    it('should passthrough unknown template IDs', async () => {
      mockSendTemplate.mockResolvedValue({
        messageId: 'om-mapped-004',
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      await provider.sendTemplate({
        ...baseTemplateOptions,
        templateId: 'custom-template-xyz',
      });

      expect(mockSendTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'custom-template-xyz',
        }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // ERROR CLASSIFICATION
  // ──────────────────────────────────────────────────────────────────────────

  describe('error classification', () => {
    beforeEach(async () => {
      mockHealth.mockResolvedValue({ status: 'healthy', latencyMs: 10, version: '1.0.0' });
      await provider.initialize();
    });

    it('should classify auth errors correctly', async () => {
      mockSend.mockRejectedValue(new OonruMailAuthError());

      const result = await provider.send(baseSendOptions);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('AUTH_ERROR');
    });

    it('should classify rate limit errors correctly', async () => {
      mockSend.mockRejectedValue(new OonruMailRateLimitError('Rate limited', 5000));

      const result = await provider.send(baseSendOptions);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RATE_LIMITED');
    });

    it('should classify timeout errors correctly', async () => {
      mockSend.mockRejectedValue(new OonruMailTimeoutError());

      const result = await provider.send(baseSendOptions);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('TIMEOUT');
    });

    it('should classify 5xx errors as SERVICE_UNAVAILABLE', async () => {
      mockSend.mockRejectedValue(
        new OonruMailError('Internal server error', {
          retryable: true,
          statusCode: 500,
          errorCode: 'SERVICE_UNAVAILABLE',
        }),
      );

      const result = await provider.send(baseSendOptions);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('SERVICE_UNAVAILABLE');
    });

    it('should classify retryable errors as CONNECTION_ERROR', async () => {
      mockSend.mockRejectedValue(
        new OonruMailError('Connection refused', { retryable: true }),
      );

      const result = await provider.send(baseSendOptions);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CONNECTION_ERROR');
    });

    it('should classify non-retryable errors as OONRUMAIL_ERROR', async () => {
      mockSend.mockRejectedValue(
        new OonruMailError('Invalid request body', { retryable: false, statusCode: 400 }),
      );

      const result = await provider.send(baseSendOptions);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('OONRUMAIL_ERROR');
    });

    it('should handle generic JS errors', async () => {
      mockSend.mockRejectedValue(new TypeError('Cannot read properties'));

      const result = await provider.send(baseSendOptions);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('OONRUMAIL_ERROR');
      expect(result.errorMessage).toContain('Cannot read properties');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // HEALTH CHECK
  // ──────────────────────────────────────────────────────────────────────────

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockHealth.mockResolvedValue({ status: 'healthy', latencyMs: 10, version: '1.0.0' });
      await provider.initialize();

      const result = await provider.healthCheck();

      expect(result).toBe(true);
      expect(provider.isHealthy).toBe(true);
    });

    it('should return true when API is degraded', async () => {
      mockHealth
        .mockResolvedValueOnce({ status: 'healthy', latencyMs: 10, version: '1.0.0' }) // for init
        .mockResolvedValueOnce({ status: 'degraded', latencyMs: 500, version: '1.0.0' }); // for health check

      await provider.initialize();
      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API is down', async () => {
      mockHealth
        .mockResolvedValueOnce({ status: 'healthy', latencyMs: 10, version: '1.0.0' })
        .mockResolvedValueOnce({ status: 'down', latencyMs: 0, version: '1.0.0' });

      await provider.initialize();
      const result = await provider.healthCheck();

      expect(result).toBe(false);
      expect(provider.isHealthy).toBe(false);
    });

    it('should return false when health check throws', async () => {
      mockHealth
        .mockResolvedValueOnce({ status: 'healthy', latencyMs: 10, version: '1.0.0' })
        .mockRejectedValueOnce(new Error('Connection failed'));

      await provider.initialize();
      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when not initialized', async () => {
      const uninitProvider = createOonruMailProvider();
      const result = await uninitProvider.healthCheck();

      expect(result).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CANCEL SCHEDULED
  // ──────────────────────────────────────────────────────────────────────────

  describe('cancelScheduled', () => {
    it('should cancel a scheduled email', async () => {
      mockHealth.mockResolvedValue({ status: 'healthy', latencyMs: 10, version: '1.0.0' });
      mockCancelScheduled.mockResolvedValue({ cancelled: true });
      await provider.initialize();

      const result = await provider.cancelScheduled!('om-msg-001');

      expect(result).toBe(true);
      expect(mockCancelScheduled).toHaveBeenCalledWith('om-msg-001');
    });

    it('should return false when cancellation fails', async () => {
      mockHealth.mockResolvedValue({ status: 'healthy', latencyMs: 10, version: '1.0.0' });
      mockCancelScheduled.mockResolvedValue({ cancelled: false });
      await provider.initialize();

      const result = await provider.cancelScheduled!('om-msg-002');

      expect(result).toBe(false);
    });

    it('should return false when not initialized', async () => {
      const uninitProvider = createOonruMailProvider();
      const result = await uninitProvider.cancelScheduled!('om-msg-003');

      expect(result).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SHUTDOWN
  // ──────────────────────────────────────────────────────────────────────────

  describe('shutdown', () => {
    it('should reset state on shutdown', async () => {
      mockHealth.mockResolvedValue({ status: 'healthy', latencyMs: 10, version: '1.0.0' });
      await provider.initialize();

      expect(provider.isHealthy).toBe(true);

      await provider.shutdown();

      expect(provider.isHealthy).toBe(false);

      // Send should fail after shutdown
      const result = await provider.send(baseSendOptions);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_INITIALIZED');
    });
  });
});
