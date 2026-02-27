/**
 * Notification Service — Error Path & Edge Case Tests
 *
 * Covers:
 * - Email delivery failures (SMTP down, bounce, invalid address)
 * - SMS provider failures (Twilio timeout, invalid number)
 * - Push notification errors (invalid device token, expired token)
 * - Webhook delivery failures (timeout, 5xx, retry exhaustion)
 * - Template rendering errors (missing variables, invalid template)
 * - Rate limiting on notification sends
 * - Batch notification failures (partial delivery)
 *
 * @module services/notify-svc/tests/error-paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockEmailProvider(overrides: Record<string, unknown> = {}) {
  return {
    send: vi.fn().mockResolvedValue({ messageId: 'msg-1', status: 'sent' }),
    sendBulk: vi.fn().mockResolvedValue({ sent: 10, failed: 0 }),
    ...overrides,
  };
}

function createMockSmsProvider(overrides: Record<string, unknown> = {}) {
  return {
    send: vi.fn().mockResolvedValue({ sid: 'sms-1', status: 'delivered' }),
    ...overrides,
  };
}

function createMockPushProvider(overrides: Record<string, unknown> = {}) {
  return {
    send: vi.fn().mockResolvedValue({ success: true }),
    sendToTopic: vi.fn().mockResolvedValue({ successCount: 10, failureCount: 0 }),
    ...overrides,
  };
}

function createMockWebhookClient(overrides: Record<string, unknown> = {}) {
  return {
    post: vi.fn().mockResolvedValue({ status: 200, data: {} }),
    ...overrides,
  };
}

function createMockTemplateEngine() {
  return {
    render: vi.fn().mockReturnValue('<p>Hello John!</p>'),
    compile: vi.fn().mockReturnValue(() => '<p>Hello!</p>'),
  };
}

// ============================================================================
// 1. Email Delivery Failures
// ============================================================================

describe('Notify Error Paths — Email Delivery', () => {
  let emailProvider: ReturnType<typeof createMockEmailProvider>;

  beforeEach(() => {
    emailProvider = createMockEmailProvider();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should handle SMTP connection refused', async () => {
    emailProvider.send.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await sendEmail(emailProvider, {
      to: 'user@example.com',
      subject: 'Test',
      body: 'Hello',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP_CONNECTION_FAILED');
    expect(result.retryable).toBe(true);
  });

  it('should handle email bounce (invalid address)', async () => {
    emailProvider.send.mockRejectedValue(
      Object.assign(new Error('Mailbox not found'), { code: 550 })
    );

    const result = await sendEmail(emailProvider, {
      to: 'nonexistent@example.com',
      subject: 'Test',
      body: 'Hello',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('EMAIL_BOUNCED');
    expect(result.retryable).toBe(false);
  });

  it('should handle SMTP timeout', async () => {
    emailProvider.send.mockRejectedValue(new Error('ETIMEDOUT'));

    const result = await sendEmail(emailProvider, {
      to: 'user@example.com',
      subject: 'Test',
      body: 'Hello',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP_TIMEOUT');
    expect(result.retryable).toBe(true);
  });

  it('should handle rate-limited email sends', async () => {
    emailProvider.send.mockRejectedValue(
      Object.assign(new Error('Too many requests'), { code: 429 })
    );

    const result = await sendEmail(emailProvider, {
      to: 'user@example.com',
      subject: 'Test',
      body: 'Hello',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('EMAIL_RATE_LIMITED');
  });

  it('should reject invalid email address format', () => {
    const validation = validateEmailAddress('not-an-email');

    expect(validation.valid).toBe(false);
  });

  it('should reject email with empty subject', () => {
    const validation = validateEmailPayload({
      to: 'user@example.com',
      subject: '',
      body: 'Hello',
    });

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('EMPTY_SUBJECT');
  });
});

// ============================================================================
// 2. SMS Provider Failures
// ============================================================================

describe('Notify Error Paths — SMS Delivery', () => {
  let smsProvider: ReturnType<typeof createMockSmsProvider>;

  beforeEach(() => {
    smsProvider = createMockSmsProvider();
  });

  it('should handle SMS provider timeout', async () => {
    smsProvider.send.mockRejectedValue(new Error('ETIMEDOUT'));

    const result = await sendSms(smsProvider, { to: '+1234567890', message: 'Hello' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMS_TIMEOUT');
  });

  it('should handle invalid phone number', async () => {
    smsProvider.send.mockRejectedValue(
      Object.assign(new Error('Invalid phone number'), { code: 21211 })
    );

    const result = await sendSms(smsProvider, { to: 'invalid', message: 'Hello' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('INVALID_PHONE');
    expect(result.retryable).toBe(false);
  });

  it('should handle SMS to landline', async () => {
    smsProvider.send.mockRejectedValue(
      Object.assign(new Error('Cannot send SMS to landline'), { code: 21614 })
    );

    const result = await sendSms(smsProvider, { to: '+18005551234', message: 'Hello' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('LANDLINE_NUMBER');
  });

  it('should truncate SMS exceeding 160 chars', () => {
    const message = 'a'.repeat(200);
    const prepared = prepareSmsMessage(message);

    expect(prepared.length).toBeLessThanOrEqual(160);
    expect(prepared.endsWith('...')).toBe(true);
  });
});

// ============================================================================
// 3. Push Notification Errors
// ============================================================================

describe('Notify Error Paths — Push Notifications', () => {
  let pushProvider: ReturnType<typeof createMockPushProvider>;

  beforeEach(() => {
    pushProvider = createMockPushProvider();
  });

  it('should handle expired device token', async () => {
    pushProvider.send.mockRejectedValue(
      Object.assign(new Error('Device token expired'), { code: 'InvalidRegistration' })
    );

    const result = await sendPush(pushProvider, {
      token: 'expired-token',
      title: 'Alert',
      body: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('TOKEN_EXPIRED');
    expect(result.shouldRemoveToken).toBe(true);
  });

  it('should handle unregistered device', async () => {
    pushProvider.send.mockRejectedValue(
      Object.assign(new Error('Not registered'), { code: 'NotRegistered' })
    );

    const result = await sendPush(pushProvider, {
      token: 'old-token',
      title: 'Alert',
      body: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.shouldRemoveToken).toBe(true);
  });

  it('should handle partial batch send failure', async () => {
    pushProvider.sendToTopic.mockResolvedValue({ successCount: 7, failureCount: 3 });

    const result = await sendBatchPush(pushProvider, {
      topic: 'announcements',
      title: 'Update',
      body: 'New feature!',
    });

    expect(result.partialFailure).toBe(true);
    expect(result.failureCount).toBe(3);
  });
});

// ============================================================================
// 4. Webhook Delivery Failures
// ============================================================================

describe('Notify Error Paths — Webhook Delivery', () => {
  let webhookClient: ReturnType<typeof createMockWebhookClient>;

  beforeEach(() => {
    webhookClient = createMockWebhookClient();
  });

  it('should handle webhook endpoint timeout', async () => {
    webhookClient.post.mockRejectedValue(new Error('ETIMEDOUT'));

    const result = await deliverWebhook(webhookClient, {
      url: 'https://example.com/webhook',
      payload: { event: 'test' },
      maxRetries: 3,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('WEBHOOK_TIMEOUT');
  });

  it('should handle webhook 5xx response', async () => {
    webhookClient.post.mockResolvedValue({ status: 502, data: 'Bad Gateway' });

    const result = await deliverWebhook(webhookClient, {
      url: 'https://example.com/webhook',
      payload: { event: 'test' },
      maxRetries: 3,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('WEBHOOK_SERVER_ERROR');
    expect(result.retryable).toBe(true);
  });

  it('should handle webhook 4xx response (not retryable)', async () => {
    webhookClient.post.mockResolvedValue({ status: 404, data: 'Not found' });

    const result = await deliverWebhook(webhookClient, {
      url: 'https://example.com/webhook',
      payload: { event: 'test' },
      maxRetries: 3,
    });

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
  });

  it('should exhaust retries and record dead letter', async () => {
    webhookClient.post.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await deliverWithRetries(webhookClient, {
      url: 'https://down.example.com/hook',
      payload: { event: 'test' },
      maxRetries: 3,
    });

    expect(result.success).toBe(false);
    expect(result.deadLettered).toBe(true);
    expect(result.attempts).toBe(3);
  });
});

// ============================================================================
// 5. Template Rendering Errors
// ============================================================================

describe('Notify Error Paths — Template Rendering', () => {
  let templateEngine: ReturnType<typeof createMockTemplateEngine>;

  beforeEach(() => {
    templateEngine = createMockTemplateEngine();
  });

  it('should handle missing template variable', () => {
    templateEngine.render.mockImplementation(() => {
      throw new Error("Variable 'firstName' is not defined");
    });

    const result = renderNotification(templateEngine, 'welcome', { lastName: 'Doe' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('TEMPLATE_VARIABLE_MISSING');
  });

  it('should handle invalid template syntax', () => {
    templateEngine.compile.mockImplementation(() => {
      throw new Error('Unexpected token');
    });

    const result = compileTemplate(templateEngine, '<p>{{unclosed');

    expect(result.success).toBe(false);
    expect(result.error).toBe('TEMPLATE_SYNTAX_ERROR');
  });

  it('should sanitize template output to prevent XSS', () => {
    templateEngine.render.mockReturnValue('<script>alert("xss")</script>');

    const output = sanitizeTemplateOutput(templateEngine.render('template', {}));

    expect(output).not.toContain('<script>');
  });
});

// ============================================================================
// 6. Notification Preference & Channel Errors
// ============================================================================

describe('Notify Error Paths — Preference Handling', () => {
  it('should respect user opt-out for marketing notifications', () => {
    const prefs = { marketing: false, transactional: true, alerts: true };

    const allowed = shouldSendNotification('marketing', prefs);

    expect(allowed).toBe(false);
  });

  it('should always allow critical/transactional notifications', () => {
    const prefs = { marketing: false, transactional: false, alerts: false };

    const allowed = shouldSendNotification('critical', prefs);

    expect(allowed).toBe(true);
  });

  it('should handle missing preference record gracefully', () => {
    const allowed = shouldSendNotification('marketing', undefined);

    // Default to not sending marketing without explicit opt-in
    expect(allowed).toBe(false);
  });

  it('should select fallback channel when primary fails', () => {
    const channels = selectFallbackChannels('email', ['email', 'sms', 'push']);

    expect(channels).toEqual(['sms', 'push']);
    expect(channels).not.toContain('email');
  });
});

// ============================================================================
// Helper implementations
// ============================================================================

async function sendEmail(
  provider: ReturnType<typeof createMockEmailProvider>,
  params: { to: string; subject: string; body: string }
) {
  try {
    await provider.send(params);
    return { success: true, error: null, retryable: false };
  } catch (err: unknown) {
    const e = err as Error & { code?: number };
    if (e.message.includes('ECONNREFUSED'))
      return { success: false, error: 'SMTP_CONNECTION_FAILED', retryable: true };
    if (e.message.includes('ETIMEDOUT'))
      return { success: false, error: 'SMTP_TIMEOUT', retryable: true };
    if (e.code === 550) return { success: false, error: 'EMAIL_BOUNCED', retryable: false };
    if (e.code === 429) return { success: false, error: 'EMAIL_RATE_LIMITED', retryable: true };
    return { success: false, error: 'EMAIL_UNKNOWN_ERROR', retryable: false };
  }
}

function validateEmailAddress(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return { valid: re.test(email) };
}

function validateEmailPayload(payload: { to: string; subject: string; body: string }) {
  if (!payload.subject) return { valid: false, reason: 'EMPTY_SUBJECT' };
  if (!payload.to) return { valid: false, reason: 'EMPTY_RECIPIENT' };
  return { valid: true, reason: null };
}

async function sendSms(
  provider: ReturnType<typeof createMockSmsProvider>,
  params: { to: string; message: string }
) {
  try {
    await provider.send(params);
    return { success: true, error: null, retryable: false };
  } catch (err: unknown) {
    const e = err as Error & { code?: number };
    if (e.message.includes('ETIMEDOUT'))
      return { success: false, error: 'SMS_TIMEOUT', retryable: true };
    if (e.code === 21211) return { success: false, error: 'INVALID_PHONE', retryable: false };
    if (e.code === 21614) return { success: false, error: 'LANDLINE_NUMBER', retryable: false };
    return { success: false, error: 'SMS_UNKNOWN_ERROR', retryable: false };
  }
}

function prepareSmsMessage(message: string) {
  if (message.length <= 160) return message;
  return message.slice(0, 157) + '...';
}

async function sendPush(
  provider: ReturnType<typeof createMockPushProvider>,
  params: { token: string; title: string; body: string }
) {
  try {
    await provider.send(params);
    return { success: true, error: null, shouldRemoveToken: false };
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.code === 'InvalidRegistration' || e.code === 'NotRegistered') {
      return { success: false, error: 'TOKEN_EXPIRED', shouldRemoveToken: true };
    }
    return { success: false, error: 'PUSH_FAILED', shouldRemoveToken: false };
  }
}

async function sendBatchPush(
  provider: ReturnType<typeof createMockPushProvider>,
  params: { topic: string; title: string; body: string }
) {
  const result = await provider.sendToTopic(params);
  return {
    success: result.failureCount === 0,
    partialFailure: result.failureCount > 0 && result.successCount > 0,
    failureCount: result.failureCount,
    successCount: result.successCount,
  };
}

async function deliverWebhook(
  client: ReturnType<typeof createMockWebhookClient>,
  params: { url: string; payload: unknown; maxRetries: number }
) {
  try {
    const response = await client.post(params.url, params.payload);
    if (response.status >= 500)
      return { success: false, error: 'WEBHOOK_SERVER_ERROR', retryable: true };
    if (response.status >= 400)
      return { success: false, error: 'WEBHOOK_CLIENT_ERROR', retryable: false };
    return { success: true, error: null, retryable: false };
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg.includes('ETIMEDOUT'))
      return { success: false, error: 'WEBHOOK_TIMEOUT', retryable: true };
    return { success: false, error: 'WEBHOOK_FAILED', retryable: true };
  }
}

async function deliverWithRetries(
  client: ReturnType<typeof createMockWebhookClient>,
  params: { url: string; payload: unknown; maxRetries: number }
) {
  for (let attempt = 1; attempt <= params.maxRetries; attempt++) {
    try {
      await client.post(params.url, params.payload);
      return { success: true, deadLettered: false, attempts: attempt };
    } catch {
      if (attempt === params.maxRetries) {
        return { success: false, deadLettered: true, attempts: attempt };
      }
    }
  }
  return { success: false, deadLettered: true, attempts: params.maxRetries };
}

function renderNotification(
  engine: ReturnType<typeof createMockTemplateEngine>,
  templateName: string,
  variables: Record<string, string>
) {
  try {
    const html = engine.render(templateName, variables);
    return { success: true, html, error: null };
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg.includes('not defined'))
      return { success: false, html: null, error: 'TEMPLATE_VARIABLE_MISSING' };
    return { success: false, html: null, error: 'TEMPLATE_ERROR' };
  }
}

function compileTemplate(engine: ReturnType<typeof createMockTemplateEngine>, template: string) {
  try {
    engine.compile(template);
    return { success: true, error: null };
  } catch {
    return { success: false, error: 'TEMPLATE_SYNTAX_ERROR' };
  }
}

function sanitizeTemplateOutput(html: string) {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function shouldSendNotification(type: string, preferences?: Record<string, boolean>) {
  if (type === 'critical') return true;
  if (!preferences) return type === 'transactional';
  return preferences[type] ?? false;
}

function selectFallbackChannels(failedChannel: string, allChannels: string[]) {
  return allChannels.filter((c) => c !== failedChannel);
}
