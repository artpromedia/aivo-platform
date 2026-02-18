/**
 * Email Service — OonruMail Server Template Integration Tests
 *
 * Tests that sendTemplated() correctly routes to OonruMail server
 * templates when enabled, and falls back to HBS rendering when not.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockProviderSend,
  mockProviderSendTemplate,
  mockProviderInitialize,
  mockProviderShutdown,
  mockValidate,
  mockRenderEmailTemplate,
  mockTemplateEngineInit,
} = vi.hoisted(() => ({
  mockProviderSend: vi.fn(),
  mockProviderSendTemplate: vi.fn(),
  mockProviderInitialize: vi.fn().mockResolvedValue(true),
  mockProviderShutdown: vi.fn().mockResolvedValue(undefined),
  mockValidate: vi.fn().mockResolvedValue({ isValid: true }),
  mockRenderEmailTemplate: vi.fn().mockResolvedValue({ html: '<p>Hello</p>', text: 'Hello' }),
  mockTemplateEngineInit: vi.fn().mockResolvedValue(undefined),
}));

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    appUrl: 'https://app.aivo.io',
    email: {
      enabled: true,
      fromEmail: 'noreply@aivo.app',
      fromName: 'AIVO',
      primaryProvider: 'oonrumail',
      fallbackProvider: 'ses',
      fallbackEnabled: true,
      rateLimit: { perSecond: 100, perMinute: 1000, perHour: 10000 },
      oonrumail: {
        enabled: true,
        apiKey: 'test-key',
        baseUrl: 'https://api.oonrumail.com/v1',
        webhookSecret: 'secret',
        useServerTemplates: true,
        timeout: 30000,
        sandboxMode: false,
        serverTemplateOverrides: undefined as Record<string, boolean> | undefined,
        templates: {
          welcome: 'tpl_welcome_001',
          emailVerification: 'tpl_verify_002',
          passwordReset: 'tpl_reset_003',
          paymentReceipt: 'tpl_payment_004',
          lessonReminder: 'tpl_lesson_005',
          courseCompletion: 'tpl_course_006',
          assignmentSubmitted: 'tpl_assign_007',
          assignmentGraded: 'tpl_assign_grade_008',
          instructorNewEnrollment: 'tpl_instr_009',
        },
      },
    },
  },
}));

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../../config.js', () => ({
  config: mockConfig,
}));

vi.mock('../email-provider.factory.js', () => ({
  emailProviderManager: {
    initialize: mockProviderInitialize,
    shutdown: mockProviderShutdown,
    send: mockProviderSend,
    sendTemplate: mockProviderSendTemplate,
    getHealthStatus: vi.fn().mockReturnValue({}),
  },
}));

vi.mock('../email-validator.js', () => ({
  emailValidator: {
    validate: mockValidate,
  },
}));

vi.mock('../template-engine.js', () => ({
  emailTemplateEngine: {
    initialize: mockTemplateEngineInit,
    getAvailableTemplates: vi.fn().mockReturnValue([]),
    getAvailableLocales: vi.fn().mockReturnValue(['en']),
  },
  renderEmailTemplate: mockRenderEmailTemplate,
}));

// We do NOT mock oonrumail-template-map — we test the real mapping logic

// ── Import under test ────────────────────────────────────────────────────────

import { sendTemplatedEmail } from '../email.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('EmailService — OonruMail server template routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: provider.sendTemplate succeeds
    mockProviderSendTemplate.mockResolvedValue({
      success: true,
      messageId: 'msg-tpl-001',
      provider: 'oonrumail',
      timestamp: new Date(),
    });
    // Default: provider.send succeeds
    mockProviderSend.mockResolvedValue({
      success: true,
      messageId: 'msg-001',
      provider: 'oonrumail',
      timestamp: new Date(),
    });
    // Reset config
    mockConfig.email.oonrumail.useServerTemplates = true;
    mockConfig.email.oonrumail.enabled = true;
    mockConfig.email.oonrumail.serverTemplateOverrides = undefined;
    mockConfig.email.oonrumail.templates.welcome = 'tpl_welcome_001';
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Server template path
  // ──────────────────────────────────────────────────────────────────────────

  it('should use sendTemplate when oonrumail enabled, useServerTemplates=true, and mapping exists', async () => {
    const result = await sendTemplatedEmail({
      templateName: 'transactional/welcome',
      to: 'alice@example.com',
      context: {
        appName: 'Aivo',
        appUrl: 'https://app.aivo.io',
        supportEmail: 'support@aivolearning.com',
        currentYear: 2025,
        userName: 'Alice',
        tenantName: 'Springfield School',
        activationUrl: 'https://app.aivo.io/activate?token=abc',
      },
    });

    expect(result.success).toBe(true);
    expect(mockProviderSendTemplate).toHaveBeenCalledOnce();
    expect(mockProviderSend).not.toHaveBeenCalled();
    expect(mockRenderEmailTemplate).not.toHaveBeenCalled();

    // Verify the template data was transformed
    const callArgs = mockProviderSendTemplate.mock.calls[0][0];
    expect(callArgs.templateId).toBe('tpl_welcome_001');
    expect(callArgs.dynamicTemplateData.user_name).toBe('Alice');
    expect(callArgs.dynamicTemplateData.tenant_name).toBe('Springfield School');
    expect(callArgs.dynamicTemplateData.activation_url).toBe('https://app.aivo.io/activate?token=abc');
  });

  it('should use alias "welcome" without prefix', async () => {
    const result = await sendTemplatedEmail({
      templateName: 'welcome',
      to: 'bob@example.com',
      context: {
        appName: 'Aivo',
        appUrl: 'https://app.aivo.io',
        supportEmail: 'support@aivolearning.com',
        currentYear: 2025,
        userName: 'Bob',
      },
    });

    expect(result.success).toBe(true);
    expect(mockProviderSendTemplate).toHaveBeenCalledOnce();
    const callArgs = mockProviderSendTemplate.mock.calls[0][0];
    expect(callArgs.templateId).toBe('tpl_welcome_001');
    expect(callArgs.dynamicTemplateData.user_name).toBe('Bob');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Fallback to HBS
  // ──────────────────────────────────────────────────────────────────────────

  it('should fall back to HBS when useServerTemplates=false', async () => {
    mockConfig.email.oonrumail.useServerTemplates = false;

    const result = await sendTemplatedEmail({
      templateName: 'transactional/welcome',
      to: 'carol@example.com',
      context: {
        appName: 'Aivo',
        appUrl: 'https://app.aivo.io',
        supportEmail: 'support@aivolearning.com',
        currentYear: 2025,
        userName: 'Carol',
      },
    });

    expect(result.success).toBe(true);
    expect(mockProviderSendTemplate).not.toHaveBeenCalled();
    expect(mockRenderEmailTemplate).toHaveBeenCalledOnce();
    expect(mockProviderSend).toHaveBeenCalledOnce();
  });

  it('should fall back to HBS when OonruMail is not enabled', async () => {
    mockConfig.email.oonrumail.enabled = false;

    const result = await sendTemplatedEmail({
      templateName: 'transactional/welcome',
      to: 'dave@example.com',
      context: {
        appName: 'Aivo',
        appUrl: 'https://app.aivo.io',
        supportEmail: 'support@aivolearning.com',
        currentYear: 2025,
      },
    });

    expect(result.success).toBe(true);
    expect(mockProviderSendTemplate).not.toHaveBeenCalled();
    expect(mockRenderEmailTemplate).toHaveBeenCalledOnce();
    expect(mockProviderSend).toHaveBeenCalledOnce();
  });

  it('should fall back to HBS when template has no mapping', async () => {
    const result = await sendTemplatedEmail({
      templateName: 'compliance/annual-ferpa-notification',
      to: 'eve@example.com',
      context: {
        appName: 'Aivo',
        appUrl: 'https://app.aivo.io',
        supportEmail: 'support@aivolearning.com',
        currentYear: 2025,
      },
    });

    expect(result.success).toBe(true);
    expect(mockProviderSendTemplate).not.toHaveBeenCalled();
    expect(mockRenderEmailTemplate).toHaveBeenCalledOnce();
    expect(mockProviderSend).toHaveBeenCalledOnce();
  });

  it('should fall back to HBS when configured template ID is empty', async () => {
    mockConfig.email.oonrumail.templates.welcome = '';

    const result = await sendTemplatedEmail({
      templateName: 'transactional/welcome',
      to: 'frank@example.com',
      context: {
        appName: 'Aivo',
        appUrl: 'https://app.aivo.io',
        supportEmail: 'support@aivolearning.com',
        currentYear: 2025,
      },
    });

    expect(result.success).toBe(true);
    expect(mockProviderSendTemplate).not.toHaveBeenCalled();
    expect(mockRenderEmailTemplate).toHaveBeenCalledOnce();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Per-template overrides
  // ──────────────────────────────────────────────────────────────────────────

  it('should use server template when per-template override is true (even if global is false)', async () => {
    mockConfig.email.oonrumail.useServerTemplates = false;
    mockConfig.email.oonrumail.serverTemplateOverrides = {
      'transactional/welcome': true,
    };

    const result = await sendTemplatedEmail({
      templateName: 'transactional/welcome',
      to: 'grace@example.com',
      context: {
        appName: 'Aivo',
        appUrl: 'https://app.aivo.io',
        supportEmail: 'support@aivolearning.com',
        currentYear: 2025,
        userName: 'Grace',
      },
    });

    expect(result.success).toBe(true);
    expect(mockProviderSendTemplate).toHaveBeenCalledOnce();
    expect(mockRenderEmailTemplate).not.toHaveBeenCalled();
  });

  it('should fall back to HBS when per-template override is false (even if global is true)', async () => {
    mockConfig.email.oonrumail.useServerTemplates = true;
    mockConfig.email.oonrumail.serverTemplateOverrides = {
      'transactional/welcome': false,
    };

    const result = await sendTemplatedEmail({
      templateName: 'transactional/welcome',
      to: 'heidi@example.com',
      context: {
        appName: 'Aivo',
        appUrl: 'https://app.aivo.io',
        supportEmail: 'support@aivolearning.com',
        currentYear: 2025,
      },
    });

    expect(result.success).toBe(true);
    expect(mockProviderSendTemplate).not.toHaveBeenCalled();
    expect(mockRenderEmailTemplate).toHaveBeenCalledOnce();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Additional templates
  // ──────────────────────────────────────────────────────────────────────────

  it('should route email-verification to server template', async () => {
    const result = await sendTemplatedEmail({
      templateName: 'transactional/email-verification',
      to: 'ivan@example.com',
      context: {
        appName: 'Aivo',
        appUrl: 'https://app.aivo.io',
        supportEmail: 'support@aivolearning.com',
        currentYear: 2025,
        userName: 'Ivan',
        verificationUrl: 'https://app.aivo.io/verify?token=xyz',
        verificationCode: '123456',
        codeExpiryMinutes: 15,
      },
    });

    expect(result.success).toBe(true);
    const callArgs = mockProviderSendTemplate.mock.calls[0][0];
    expect(callArgs.templateId).toBe('tpl_verify_002');
    expect(callArgs.dynamicTemplateData.verification_code).toBe('123456');
  });

  it('should route password-reset to server template', async () => {
    const result = await sendTemplatedEmail({
      templateName: 'password-reset',
      to: 'jane@example.com',
      context: {
        appName: 'Aivo',
        appUrl: 'https://app.aivo.io',
        supportEmail: 'support@aivolearning.com',
        currentYear: 2025,
        userEmail: 'jane@example.com',
        resetUrl: 'https://app.aivo.io/reset?token=abc',
        expiryMinutes: 60,
      },
    });

    expect(result.success).toBe(true);
    const callArgs = mockProviderSendTemplate.mock.calls[0][0];
    expect(callArgs.templateId).toBe('tpl_reset_003');
    expect(callArgs.dynamicTemplateData.user_email).toBe('jane@example.com');
    expect(callArgs.dynamicTemplateData.reset_url).toBe('https://app.aivo.io/reset?token=abc');
  });
});
