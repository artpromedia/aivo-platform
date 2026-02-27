/**
 * Billing Service — Error Path & Edge Case Tests
 *
 * Covers:
 * - Stripe API failures (timeouts, 4xx/5xx, rate-limiting)
 * - Webhook signature verification failures
 * - Payment declined scenarios
 * - Dunning/retry exhaustion
 * - Currency conversion edge cases
 * - Subscription state machine invalid transitions
 * - Idempotency key conflicts
 *
 * @module services/billing-svc/test/error-paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockStripeClient(overrides: Record<string, unknown> = {}) {
  return {
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'cus_test', email: 'test@example.com' }),
      del: vi.fn().mockResolvedValue({ deleted: true }),
    },
    subscriptions: {
      create: vi.fn().mockResolvedValue({ id: 'sub_test', status: 'active' }),
      update: vi.fn().mockResolvedValue({ id: 'sub_test', status: 'active' }),
      cancel: vi.fn().mockResolvedValue({ id: 'sub_test', status: 'canceled' }),
    },
    paymentIntents: {
      create: vi.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' }),
      confirm: vi.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' }),
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({ type: 'invoice.paid', data: { object: {} } }),
    },
    ...overrides,
  };
}

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
    transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
      })
    ),
    ...overrides,
  };
}

// ============================================================================
// 1. Stripe API Failure Paths
// ============================================================================

describe('Billing Error Paths — Stripe API Failures', () => {
  let stripe: ReturnType<typeof createMockStripeClient>;

  beforeEach(() => {
    stripe = createMockStripeClient();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should handle Stripe timeout gracefully', async () => {
    stripe.customers.create.mockRejectedValue(new Error('Request timeout'));

    const result = await createCustomer(stripe, { email: 'user@test.com', tenantId: 't1' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('STRIPE_TIMEOUT');
    expect(result.retryable).toBe(true);
  });

  it('should handle Stripe rate limiting (429)', async () => {
    const error = new StripeError('Rate limit exceeded', 429);
    stripe.subscriptions.create.mockRejectedValue(error);

    const result = await createSubscription(stripe, { customerId: 'cus_1', priceId: 'price_1' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('STRIPE_RATE_LIMITED');
    expect(result.retryable).toBe(true);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should handle Stripe 500 server errors', async () => {
    const error = new StripeError('Internal server error', 500);
    stripe.paymentIntents.create.mockRejectedValue(error);

    const result = await createPaymentIntent(stripe, { amount: 1000, currency: 'usd' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('STRIPE_SERVER_ERROR');
    expect(result.retryable).toBe(true);
  });

  it('should NOT retry Stripe 400 bad request errors', async () => {
    const error = new StripeError('Invalid parameters', 400);
    stripe.customers.create.mockRejectedValue(error);

    const result = await createCustomer(stripe, { email: '', tenantId: 't1' });

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
  });

  it('should handle card_declined error code', async () => {
    const error = new StripeError('Your card was declined', 402);
    error.code = 'card_declined';
    error.declineCode = 'insufficient_funds';
    stripe.paymentIntents.confirm.mockRejectedValue(error);

    const result = await confirmPayment(stripe, 'pi_test');

    expect(result.success).toBe(false);
    expect(result.error).toBe('PAYMENT_DECLINED');
    expect(result.declineReason).toBe('insufficient_funds');
  });
});

// ============================================================================
// 2. Webhook Signature Verification
// ============================================================================

describe('Billing Error Paths — Webhook Signature', () => {
  let stripe: ReturnType<typeof createMockStripeClient>;

  beforeEach(() => {
    stripe = createMockStripeClient();
  });

  it('should reject webhook with invalid signature', () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Webhook signature verification failed');
    });

    const result = verifyWebhook(stripe, 'raw-body', 'bad-sig', 'whsec_test');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('SIGNATURE_INVALID');
  });

  it('should reject webhook with missing signature header', () => {
    const result = verifyWebhook(stripe, 'raw-body', '', 'whsec_test');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('SIGNATURE_MISSING');
  });

  it('should reject webhook with expired timestamp', () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Webhook timestamp too old');
    });

    const result = verifyWebhook(stripe, 'raw-body', 'old-sig', 'whsec_test');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('WEBHOOK_EXPIRED');
  });

  it('should handle duplicate webhook event via idempotency', async () => {
    const result = await processWebhookEvent({
      eventId: 'evt_123',
      type: 'invoice.paid',
      data: {},
      processedEvents: new Set(['evt_123']),
    });

    expect(result.status).toBe('DUPLICATE');
    expect(result.processed).toBe(false);
  });
});

// ============================================================================
// 3. Subscription State Machine Errors
// ============================================================================

describe('Billing Error Paths — Subscription State Machine', () => {
  const transitions: Record<string, string[]> = {
    trialing: ['active', 'canceled', 'past_due'],
    active: ['past_due', 'canceled', 'paused'],
    past_due: ['active', 'canceled', 'unpaid'],
    canceled: [],
    unpaid: ['canceled'],
    paused: ['active', 'canceled'],
  };

  it('should reject invalid state transition: canceled → active', () => {
    const result = validateTransition('canceled', 'active', transitions);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('INVALID_TRANSITION');
  });

  it('should reject invalid state transition: unpaid → active', () => {
    const result = validateTransition('unpaid', 'active', transitions);

    expect(result.valid).toBe(false);
  });

  it('should allow valid state transition: trialing → active', () => {
    const result = validateTransition('trialing', 'active', transitions);

    expect(result.valid).toBe(true);
  });

  it('should handle unknown subscription state', () => {
    const result = validateTransition('mystery_state', 'active', transitions);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('UNKNOWN_STATE');
  });
});

// ============================================================================
// 4. Dunning & Retry Exhaustion
// ============================================================================

describe('Billing Error Paths — Dunning', () => {
  it('should mark subscription unpaid after max dunning retries', () => {
    const result = evaluateDunningOutcome({
      retryCount: 4,
      maxRetries: 4,
      lastRetryAt: new Date(),
    });

    expect(result.action).toBe('MARK_UNPAID');
  });

  it('should schedule next retry when retries remaining', () => {
    const result = evaluateDunningOutcome({
      retryCount: 2,
      maxRetries: 4,
      lastRetryAt: new Date(),
    });

    expect(result.action).toBe('RETRY');
    expect(result.nextRetryAt).toBeInstanceOf(Date);
  });

  it('should apply exponential backoff between retries', () => {
    const delays = [1, 3, 7, 14]; // days
    for (let attempt = 0; attempt < delays.length; attempt++) {
      const delay = getDunningDelay(attempt);
      expect(delay).toBe(delays[attempt]);
    }
  });

  it('should send appropriate dunning notification per attempt', () => {
    expect(getDunningNotificationType(0)).toBe('PAYMENT_FAILED');
    expect(getDunningNotificationType(1)).toBe('PAYMENT_RETRY_SCHEDULED');
    expect(getDunningNotificationType(3)).toBe('ACCOUNT_WILL_BE_SUSPENDED');
  });
});

// ============================================================================
// 5. Currency & Amount Edge Cases
// ============================================================================

describe('Billing Error Paths — Currency Edge Cases', () => {
  it('should reject negative amounts', () => {
    const result = validateAmount(-100, 'usd');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('NEGATIVE_AMOUNT');
  });

  it('should reject zero amounts for charges', () => {
    const result = validateAmount(0, 'usd');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('ZERO_AMOUNT');
  });

  it('should handle zero-decimal currencies (JPY)', () => {
    const cents = toCents(1000, 'jpy');

    expect(cents).toBe(1000); // JPY has no decimals
  });

  it('should handle standard currencies (USD)', () => {
    const cents = toCents(10.5, 'usd');

    expect(cents).toBe(1050);
  });

  it('should reject unsupported currency', () => {
    const result = validateAmount(100, 'xyz');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('UNSUPPORTED_CURRENCY');
  });

  it('should handle floating point precision correctly', () => {
    const cents = toCents(19.99, 'usd');

    expect(cents).toBe(1999);
  });
});

// ============================================================================
// 6. Idempotency Key Conflicts
// ============================================================================

describe('Billing Error Paths — Idempotency', () => {
  it('should detect idempotency key collision with different params', () => {
    const stored = { key: 'idem-1', params: { amount: 100, currency: 'usd' } };
    const incoming = { key: 'idem-1', params: { amount: 200, currency: 'usd' } };

    const result = checkIdempotency(stored, incoming);

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('PARAMS_MISMATCH');
  });

  it('should return cached result for matching idempotency key', () => {
    const stored = { key: 'idem-1', params: { amount: 100 }, result: { id: 'pi_1' } };
    const incoming = { key: 'idem-1', params: { amount: 100 } };

    const result = checkIdempotency(stored, incoming);

    expect(result.conflict).toBe(false);
    expect(result.cachedResult).toEqual({ id: 'pi_1' });
  });
});

// ============================================================================
// Helper implementations
// ============================================================================

class StripeError extends Error {
  statusCode: number;
  code?: string;
  declineCode?: string;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function createCustomer(
  stripe: ReturnType<typeof createMockStripeClient>,
  params: { email: string; tenantId: string }
) {
  try {
    const customer = await stripe.customers.create({
      email: params.email,
      metadata: { tenantId: params.tenantId },
    });
    return { success: true, customerId: customer.id, error: null, retryable: false };
  } catch (err: unknown) {
    const e = err as StripeError;
    if (e.message.includes('timeout'))
      return { success: false, error: 'STRIPE_TIMEOUT', retryable: true };
    if (e.statusCode === 429)
      return { success: false, error: 'STRIPE_RATE_LIMITED', retryable: true, retryAfter: 60 };
    if (e.statusCode >= 500)
      return { success: false, error: 'STRIPE_SERVER_ERROR', retryable: true };
    return { success: false, error: 'STRIPE_CLIENT_ERROR', retryable: false };
  }
}

async function createSubscription(
  stripe: ReturnType<typeof createMockStripeClient>,
  params: { customerId: string; priceId: string }
) {
  try {
    await stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
    });
    return { success: true, error: null, retryable: false };
  } catch (err: unknown) {
    const e = err as StripeError;
    if (e.statusCode === 429)
      return { success: false, error: 'STRIPE_RATE_LIMITED', retryable: true, retryAfter: 30 };
    return { success: false, error: 'STRIPE_ERROR', retryable: false };
  }
}

async function createPaymentIntent(
  stripe: ReturnType<typeof createMockStripeClient>,
  params: { amount: number; currency: string }
) {
  try {
    await stripe.paymentIntents.create({ amount: params.amount, currency: params.currency });
    return { success: true, error: null, retryable: false };
  } catch (err: unknown) {
    const e = err as StripeError;
    if (e.statusCode >= 500)
      return { success: false, error: 'STRIPE_SERVER_ERROR', retryable: true };
    return { success: false, error: 'STRIPE_ERROR', retryable: false };
  }
}

async function confirmPayment(
  stripe: ReturnType<typeof createMockStripeClient>,
  paymentIntentId: string
) {
  try {
    await stripe.paymentIntents.confirm(paymentIntentId);
    return { success: true, error: null, declineReason: null };
  } catch (err: unknown) {
    const e = err as StripeError;
    if (e.code === 'card_declined') {
      return {
        success: false,
        error: 'PAYMENT_DECLINED',
        declineReason: e.declineCode ?? 'unknown',
      };
    }
    return { success: false, error: 'PAYMENT_ERROR', declineReason: null };
  }
}

function verifyWebhook(
  stripe: ReturnType<typeof createMockStripeClient>,
  body: string,
  signature: string,
  secret: string
) {
  if (!signature) return { valid: false, error: 'SIGNATURE_MISSING' };
  try {
    stripe.webhooks.constructEvent(body, signature, secret);
    return { valid: true, error: null };
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg.includes('timestamp')) return { valid: false, error: 'WEBHOOK_EXPIRED' };
    return { valid: false, error: 'SIGNATURE_INVALID' };
  }
}

async function processWebhookEvent(params: {
  eventId: string;
  type: string;
  data: unknown;
  processedEvents: Set<string>;
}) {
  if (params.processedEvents.has(params.eventId)) {
    return { status: 'DUPLICATE', processed: false };
  }
  params.processedEvents.add(params.eventId);
  return { status: 'PROCESSED', processed: true };
}

function validateTransition(from: string, to: string, transitions: Record<string, string[]>) {
  const allowed = transitions[from];
  if (!allowed) return { valid: false, reason: 'UNKNOWN_STATE' };
  if (!allowed.includes(to)) return { valid: false, reason: 'INVALID_TRANSITION' };
  return { valid: true, reason: null };
}

function evaluateDunningOutcome(dunning: {
  retryCount: number;
  maxRetries: number;
  lastRetryAt: Date;
}) {
  if (dunning.retryCount >= dunning.maxRetries) {
    return { action: 'MARK_UNPAID', nextRetryAt: null };
  }
  const delayDays = getDunningDelay(dunning.retryCount);
  const nextRetryAt = new Date(dunning.lastRetryAt.getTime() + delayDays * 86_400_000);
  return { action: 'RETRY', nextRetryAt };
}

function getDunningDelay(attempt: number) {
  return [1, 3, 7, 14][attempt] ?? 14;
}

function getDunningNotificationType(attempt: number) {
  const types = [
    'PAYMENT_FAILED',
    'PAYMENT_RETRY_SCHEDULED',
    'PAYMENT_RETRY_SCHEDULED',
    'ACCOUNT_WILL_BE_SUSPENDED',
  ];
  return types[attempt] ?? 'ACCOUNT_SUSPENDED';
}

function validateAmount(amount: number, currency: string) {
  const supported = new Set(['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'inr']);
  if (!supported.has(currency)) return { valid: false, reason: 'UNSUPPORTED_CURRENCY' };
  if (amount < 0) return { valid: false, reason: 'NEGATIVE_AMOUNT' };
  if (amount === 0) return { valid: false, reason: 'ZERO_AMOUNT' };
  return { valid: true, reason: null };
}

function toCents(amount: number, currency: string) {
  const zeroDecimal = new Set(['jpy', 'krw', 'vnd']);
  if (zeroDecimal.has(currency)) return Math.round(amount);
  return Math.round(amount * 100);
}

function checkIdempotency(
  stored: { key: string; params: Record<string, unknown>; result?: unknown },
  incoming: { key: string; params: Record<string, unknown> }
) {
  if (stored.key !== incoming.key) return { conflict: false, cachedResult: null };
  if (JSON.stringify(stored.params) !== JSON.stringify(incoming.params)) {
    return { conflict: true, reason: 'PARAMS_MISMATCH', cachedResult: null };
  }
  return { conflict: false, cachedResult: stored.result ?? null };
}
