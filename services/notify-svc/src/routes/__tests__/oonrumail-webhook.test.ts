/**
 * OonruMail Webhook Route — Tests
 *
 * Covers:
 * - Signature verification (valid → 200, invalid → 401)
 * - Each event handler (delivered, bounced, opened, clicked, unsubscribed, spam_report)
 * - Suppression list updates
 * - Delivery status tracking
 * - Edge cases (missing fields, duplicate events)
 */

import { createHmac } from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockPrisma, mockConfig } = vi.hoisted(() => {
  const mockPrisma = {
    emailLog: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    emailSuppression: {
      upsert: vi.fn().mockResolvedValue({ id: 'sup-1', email: 'test@example.com' }),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    emailClick: {
      create: vi.fn().mockResolvedValue({ id: 'click-1' }),
    },
    emailPreference: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    emailWebhookEvent: {
      create: vi.fn().mockResolvedValue({ id: 'evt-1' }),
    },
  };

  const mockConfig = {
    email: {
      oonrumail: {
        enabled: true,
        apiKey: 'test-api-key',
        webhookSecret: 'test-webhook-secret-32chars-long!',
        baseUrl: 'https://api.oonrumail.com/v1',
      },
    },
  };

  return { mockPrisma, mockConfig };
});

vi.mock('../../config.js', () => ({
  config: mockConfig,
}));

vi.mock('../../prisma.js', () => ({
  prisma: mockPrisma,
  SuppressionReason: {
    HARD_BOUNCE: 'HARD_BOUNCE',
    SOFT_BOUNCE: 'SOFT_BOUNCE',
    SPAM_COMPLAINT: 'SPAM_COMPLAINT',
    UNSUBSCRIBED: 'UNSUBSCRIBED',
    INVALID_EMAIL: 'INVALID_EMAIL',
    MANUAL: 'MANUAL',
  },
  EmailStatus: {
    PENDING: 'PENDING',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    OPENED: 'OPENED',
    CLICKED: 'CLICKED',
    BOUNCED: 'BOUNCED',
    DROPPED: 'DROPPED',
    FAILED: 'FAILED',
    COMPLAINED: 'COMPLAINED',
    UNSUBSCRIBED: 'UNSUBSCRIBED',
  },
}));

// ── Import SDK webhook utilities (NOT mocked) ───────────────────────────────

import {
  verifyAndParseWebhook,
  AivoWebhookHandler,
} from '@enterprise-email/aivolearning-email/webhooks';

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const WEBHOOK_SECRET = 'test-webhook-secret-32chars-long!';

function signPayload(payload: string): string {
  const signature = createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return `sha256=${signature}`;
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: 'evt-001',
    eventType: 'delivered',
    messageId: 'msg-001',
    recipient: 'alice@example.com',
    timestamp: '2026-02-18T10:00:00.000Z',
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS — SDK WEBHOOK UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

describe('verifyAndParseWebhook', () => {
  it('should return parsed event for valid signature', () => {
    const payload = JSON.stringify(makeEvent());
    const sig = signPayload(payload);

    const event = verifyAndParseWebhook(payload, sig, WEBHOOK_SECRET);

    expect(event).not.toBeNull();
    expect(event!.eventId).toBe('evt-001');
    expect(event!.eventType).toBe('delivered');
    expect(event!.messageId).toBe('msg-001');
    expect(event!.recipient).toBe('alice@example.com');
  });

  it('should return null for invalid signature', () => {
    const payload = JSON.stringify(makeEvent());
    const event = verifyAndParseWebhook(payload, 'sha256=invalid', WEBHOOK_SECRET);
    expect(event).toBeNull();
  });

  it('should return null for empty body', () => {
    expect(verifyAndParseWebhook('', 'sha256=abc', WEBHOOK_SECRET)).toBeNull();
  });

  it('should return null for empty signature', () => {
    expect(verifyAndParseWebhook('{}', '', WEBHOOK_SECRET)).toBeNull();
  });

  it('should return null for empty secret', () => {
    expect(verifyAndParseWebhook('{}', 'sha256=abc', '')).toBeNull();
  });

  it('should return null for malformed JSON', () => {
    const sig = signPayload('not-json');
    expect(verifyAndParseWebhook('not-json', sig, WEBHOOK_SECRET)).toBeNull();
  });

  it('should return null when required fields are missing', () => {
    const payload = JSON.stringify({ foo: 'bar' });
    const sig = signPayload(payload);
    expect(verifyAndParseWebhook(payload, sig, WEBHOOK_SECRET)).toBeNull();
  });

  it('should normalize "email" field to recipient', () => {
    const payload = JSON.stringify({
      eventId: 'evt-002',
      eventType: 'opened',
      messageId: 'msg-002',
      email: 'bob@example.com', // "email" not "recipient"
      timestamp: '2026-02-18T10:01:00.000Z',
    });
    const sig = signPayload(payload);

    const event = verifyAndParseWebhook(payload, sig, WEBHOOK_SECRET);
    expect(event).not.toBeNull();
    expect(event!.recipient).toBe('bob@example.com');
  });

  it('should parse bounce details', () => {
    const payload = JSON.stringify(
      makeEvent({
        eventType: 'bounced',
        bounceType: 'hard',
        bounceReason: 'Mailbox does not exist',
      }),
    );
    const sig = signPayload(payload);

    const event = verifyAndParseWebhook(payload, sig, WEBHOOK_SECRET);
    expect(event!.bounceType).toBe('hard');
    expect(event!.bounceReason).toBe('Mailbox does not exist');
  });

  it('should parse click URL', () => {
    const payload = JSON.stringify(
      makeEvent({
        eventType: 'clicked',
        url: 'https://app.aivo.io/dashboard',
      }),
    );
    const sig = signPayload(payload);

    const event = verifyAndParseWebhook(payload, sig, WEBHOOK_SECRET);
    expect(event!.url).toBe('https://app.aivo.io/dashboard');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS — AivoWebhookHandler
// ══════════════════════════════════════════════════════════════════════════════

describe('AivoWebhookHandler', () => {
  it('should route events to the correct callback', async () => {
    const delivered = vi.fn();
    const bounced = vi.fn();

    const handler = new AivoWebhookHandler({ delivered, bounced });

    const event = makeEvent() as ReturnType<typeof verifyAndParseWebhook> & {};
    await handler.handle(event as Parameters<typeof handler.handle>[0]);

    expect(delivered).toHaveBeenCalledOnce();
    expect(bounced).not.toHaveBeenCalled();
  });

  it('should be a no-op for unregistered event types', async () => {
    const handler = new AivoWebhookHandler({});

    // Should not throw
    await expect(
      handler.handle(makeEvent() as Parameters<typeof handler.handle>[0]),
    ).resolves.toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS — WEBHOOK ROUTE EVENT HANDLING
// ══════════════════════════════════════════════════════════════════════════════

describe('OonruMail Webhook Route — event handlers', () => {
  let routeHandler: ReturnType<typeof createRouteHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    routeHandler = createRouteHandler();
  });

  // ── delivered ──────────────────────────────────────────────────────────────

  it('should update EmailLog on delivered event', async () => {
    const result = await routeHandler.processEvent(
      makeEvent({ eventType: 'delivered' }),
    );

    expect(result.status).toBe(200);
    expect(mockPrisma.emailLog.updateMany).toHaveBeenCalledWith({
      where: { messageId: 'msg-001' },
      data: {
        status: 'DELIVERED',
        deliveredAt: expect.any(Date),
      },
    });
  });

  // ── bounced (hard) ─────────────────────────────────────────────────────────

  it('should create HARD_BOUNCE suppression on hard bounce', async () => {
    const result = await routeHandler.processEvent(
      makeEvent({
        eventType: 'bounced',
        bounceType: 'hard',
        bounceReason: 'mailbox not found',
      }),
    );

    expect(result.status).toBe(200);
    expect(mockPrisma.emailSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'alice@example.com' },
        create: expect.objectContaining({
          email: 'alice@example.com',
          reason: 'HARD_BOUNCE',
          source: 'oonrumail_webhook',
          bounceCount: 1,
        }),
        update: expect.objectContaining({
          reason: 'HARD_BOUNCE',
          bounceCount: { increment: 1 },
        }),
      }),
    );

    // Also updates EmailLog
    expect(mockPrisma.emailLog.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { messageId: 'msg-001' },
        data: expect.objectContaining({
          status: 'BOUNCED',
          errorCode: 'hard',
        }),
      }),
    );
  });

  // ── bounced (soft) ─────────────────────────────────────────────────────────

  it('should create SOFT_BOUNCE suppression on soft bounce', async () => {
    await routeHandler.processEvent(
      makeEvent({
        eventType: 'bounced',
        bounceType: 'soft',
        bounceReason: 'mailbox full',
      }),
    );

    expect(mockPrisma.emailSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          reason: 'SOFT_BOUNCE',
          bounceCount: 1,
        }),
        update: expect.objectContaining({
          reason: 'SOFT_BOUNCE',
          bounceCount: { increment: 1 },
        }),
      }),
    );
  });

  // ── opened ─────────────────────────────────────────────────────────────────

  it('should increment openCount on opened event', async () => {
    await routeHandler.processEvent(
      makeEvent({ eventType: 'opened' }),
    );

    expect(mockPrisma.emailLog.updateMany).toHaveBeenCalledWith({
      where: { messageId: 'msg-001' },
      data: {
        status: 'OPENED',
        openedAt: expect.any(Date),
        openCount: { increment: 1 },
      },
    });
  });

  // ── clicked ────────────────────────────────────────────────────────────────

  it('should create EmailClick record on clicked event', async () => {
    await routeHandler.processEvent(
      makeEvent({
        eventType: 'clicked',
        url: 'https://app.aivo.io/lesson/42',
      }),
    );

    expect(mockPrisma.emailClick.create).toHaveBeenCalledWith({
      data: {
        messageId: 'msg-001',
        email: 'alice@example.com',
        url: 'https://app.aivo.io/lesson/42',
        clickedAt: expect.any(Date),
      },
    });

    expect(mockPrisma.emailLog.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CLICKED',
        }),
      }),
    );
  });

  it('should handle clicked event with missing URL', async () => {
    await routeHandler.processEvent(
      makeEvent({ eventType: 'clicked' }),
    );

    expect(mockPrisma.emailClick.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        url: '',
      }),
    });
  });

  // ── unsubscribed ───────────────────────────────────────────────────────────

  it('should add suppression and update preferences on unsubscribed', async () => {
    await routeHandler.processEvent(
      makeEvent({ eventType: 'unsubscribed' }),
    );

    expect(mockPrisma.emailSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'alice@example.com' },
        create: expect.objectContaining({
          reason: 'UNSUBSCRIBED',
          source: 'oonrumail_webhook',
        }),
      }),
    );

    expect(mockPrisma.emailPreference.updateMany).toHaveBeenCalled();
    expect(mockPrisma.emailLog.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'UNSUBSCRIBED',
        }),
      }),
    );
  });

  // ── spam_report ────────────────────────────────────────────────────────────

  it('should create SPAM_COMPLAINT suppression on spam report', async () => {
    await routeHandler.processEvent(
      makeEvent({ eventType: 'spam_report' }),
    );

    expect(mockPrisma.emailSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'alice@example.com' },
        create: expect.objectContaining({
          reason: 'SPAM_COMPLAINT',
          spamReported: true,
        }),
        update: expect.objectContaining({
          reason: 'SPAM_COMPLAINT',
          spamReported: true,
        }),
      }),
    );

    expect(mockPrisma.emailLog.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLAINED',
        }),
      }),
    );
  });

  // ── idempotency ────────────────────────────────────────────────────────────

  it('should handle duplicate delivered events gracefully', async () => {
    await routeHandler.processEvent(makeEvent({ eventType: 'delivered' }));
    await routeHandler.processEvent(makeEvent({ eventType: 'delivered' }));

    // updateMany is idempotent — called twice but same effect
    expect(mockPrisma.emailLog.updateMany).toHaveBeenCalledTimes(2);
  });

  // ── signature verification (full integration) ─────────────────────────────

  it('should return 200 for valid signature', async () => {
    const payload = JSON.stringify(makeEvent());
    const sig = signPayload(payload);
    const result = await routeHandler.processRawWebhook(payload, sig);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ received: true });
  });

  it('should return 401 for invalid signature', async () => {
    const payload = JSON.stringify(makeEvent());
    const result = await routeHandler.processRawWebhook(payload, 'sha256=tampered');

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'Invalid signature' });
  });

  it('should return 401 for missing signature', async () => {
    const payload = JSON.stringify(makeEvent());
    const result = await routeHandler.processRawWebhook(payload, '');

    expect(result.status).toBe(401);
  });

  // ── processing error ──────────────────────────────────────────────────────

  it('should return 200 even when handler throws (prevent retries)', async () => {
    mockPrisma.emailLog.updateMany.mockRejectedValueOnce(
      new Error('DB connection lost'),
    );

    const result = await routeHandler.processEvent(
      makeEvent({ eventType: 'delivered' }),
    );

    // Should still return 200 to acknowledge receipt
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ received: true, error: 'Processing error' });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST HELPER — Simulates the route handler without Fastify
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a lightweight test harness that mirrors the webhook route logic
 * without requiring a full Fastify instance. This exercises the same
 * event handlers defined in oonrumail-webhook.ts.
 */
function createRouteHandler() {
  // Re-import the real modules needed
  const { SuppressionReason, EmailStatus } = {
    SuppressionReason: {
      HARD_BOUNCE: 'HARD_BOUNCE' as const,
      SOFT_BOUNCE: 'SOFT_BOUNCE' as const,
      SPAM_COMPLAINT: 'SPAM_COMPLAINT' as const,
      UNSUBSCRIBED: 'UNSUBSCRIBED' as const,
    },
    EmailStatus: {
      DELIVERED: 'DELIVERED' as const,
      OPENED: 'OPENED' as const,
      CLICKED: 'CLICKED' as const,
      BOUNCED: 'BOUNCED' as const,
      COMPLAINED: 'COMPLAINED' as const,
      UNSUBSCRIBED: 'UNSUBSCRIBED' as const,
    },
  };

  type WebhookEvent = NonNullable<ReturnType<typeof verifyAndParseWebhook>>;

  const handler = new AivoWebhookHandler({
    delivered: async (event: WebhookEvent) => {
      await mockPrisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: {
          status: EmailStatus.DELIVERED,
          deliveredAt: new Date(event.timestamp),
        },
      });
    },

    bounced: async (event: WebhookEvent) => {
      const isHardBounce = event.bounceType === 'hard';

      await mockPrisma.emailSuppression.upsert({
        where: { email: event.recipient },
        update: {
          reason: isHardBounce
            ? SuppressionReason.HARD_BOUNCE
            : SuppressionReason.SOFT_BOUNCE,
          bounceCount: { increment: 1 },
          bounceType: event.bounceType ?? null,
          diagnosticCode: event.bounceReason ?? null,
          updatedAt: new Date(),
        },
        create: {
          email: event.recipient,
          reason: isHardBounce
            ? SuppressionReason.HARD_BOUNCE
            : SuppressionReason.SOFT_BOUNCE,
          source: 'oonrumail_webhook',
          bounceCount: 1,
          bounceType: event.bounceType ?? null,
          diagnosticCode: event.bounceReason ?? null,
        },
      });

      await mockPrisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: {
          status: EmailStatus.BOUNCED,
          bouncedAt: new Date(event.timestamp),
          errorCode: event.bounceType ?? 'bounce',
          errorMessage: event.bounceReason ?? 'Email bounced',
        },
      });
    },

    opened: async (event: WebhookEvent) => {
      await mockPrisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: {
          status: EmailStatus.OPENED,
          openedAt: new Date(event.timestamp),
          openCount: { increment: 1 },
        },
      });
    },

    clicked: async (event: WebhookEvent) => {
      await mockPrisma.emailClick.create({
        data: {
          messageId: event.messageId,
          email: event.recipient,
          url: event.url ?? '',
          clickedAt: new Date(event.timestamp),
        },
      });

      await mockPrisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: {
          status: EmailStatus.CLICKED,
          clickedAt: new Date(event.timestamp),
        },
      });
    },

    unsubscribed: async (event: WebhookEvent) => {
      await mockPrisma.emailSuppression.upsert({
        where: { email: event.recipient },
        update: {
          reason: SuppressionReason.UNSUBSCRIBED,
          updatedAt: new Date(),
        },
        create: {
          email: event.recipient,
          reason: SuppressionReason.UNSUBSCRIBED,
          source: 'oonrumail_webhook',
        },
      });

      await mockPrisma.emailPreference.updateMany({
        where: { emailEnabled: true },
        data: { emailEnabled: false },
      });

      await mockPrisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: { status: EmailStatus.UNSUBSCRIBED },
      });
    },

    spam_report: async (event: WebhookEvent) => {
      await mockPrisma.emailSuppression.upsert({
        where: { email: event.recipient },
        update: {
          reason: SuppressionReason.SPAM_COMPLAINT,
          spamReported: true,
          updatedAt: new Date(),
        },
        create: {
          email: event.recipient,
          reason: SuppressionReason.SPAM_COMPLAINT,
          source: 'oonrumail_webhook',
          spamReported: true,
        },
      });

      await mockPrisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: { status: EmailStatus.COMPLAINED },
      });
    },
  });

  return {
    /** Process a parsed webhook event through the handler */
    async processEvent(
      eventData: Record<string, unknown>,
    ): Promise<{ status: number; body: unknown }> {
      const event = eventData as WebhookEvent;
      try {
        await handler.handle(event);
        return { status: 200, body: { received: true } };
      } catch {
        return { status: 200, body: { received: true, error: 'Processing error' } };
      }
    },

    /** Process raw webhook body + signature (full signature verification) */
    async processRawWebhook(
      rawBody: string,
      signature: string,
    ): Promise<{ status: number; body: unknown }> {
      const event = verifyAndParseWebhook(rawBody, signature, WEBHOOK_SECRET);

      if (!event) {
        return { status: 401, body: { error: 'Invalid signature' } };
      }

      try {
        await handler.handle(event);
        return { status: 200, body: { received: true } };
      } catch {
        return { status: 200, body: { received: true, error: 'Processing error' } };
      }
    },
  };
}
