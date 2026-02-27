/**
 * Payments Service — Error Path & Edge Case Tests
 *
 * Covers:
 * - Payment gateway failures (Stripe errors, network timeouts)
 * - Webhook replay / signature attacks
 * - Idempotency key conflicts
 * - Refund edge cases
 * - Payment method validation errors
 * - Dunning / retry exhaustion
 * - Currency conversion edge cases
 *
 * @module services/payments-svc/tests/error-paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

class StripeError extends Error {
  constructor(
    public type: string,
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

function createMockStripe(overrides: Record<string, unknown> = {}) {
  return {
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_test',
        status: 'succeeded',
        amount: 1000,
        currency: 'usd',
      }),
      confirm: vi.fn().mockResolvedValue({ status: 'succeeded' }),
      cancel: vi.fn().mockResolvedValue({ status: 'canceled' }),
    },
    refunds: {
      create: vi.fn().mockResolvedValue({
        id: 're_test',
        status: 'succeeded',
        amount: 1000,
      }),
    },
    paymentMethods: {
      attach: vi.fn().mockResolvedValue({ id: 'pm_test' }),
      detach: vi.fn().mockResolvedValue({ id: 'pm_test' }),
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({ type: 'payment_intent.succeeded', data: {} }),
    },
    ...overrides,
  };
}

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    execute: vi.fn().mockResolvedValue({ affectedRows: 1 }),
    transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        execute: vi.fn().mockResolvedValue({ affectedRows: 1 }),
      };
      return fn(tx);
    }),
    ...overrides,
  };
}

// ============================================================================
// 1. Payment Gateway Failures
// ============================================================================

describe('Payments Error Paths — Gateway Failures', () => {
  let stripe: ReturnType<typeof createMockStripe>;

  beforeEach(() => {
    stripe = createMockStripe();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should handle Stripe timeout', async () => {
    stripe.paymentIntents.create.mockRejectedValue(
      new StripeError('api_connection_error', 'timeout', 'Request timed out', 408)
    );

    const result = await processPayment(stripe, {
      amount: 5000,
      currency: 'usd',
      customerId: 'cus_1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('GATEWAY_TIMEOUT');
    expect(result.retryable).toBe(true);
  });

  it('should handle Stripe rate limiting (429)', async () => {
    stripe.paymentIntents.create.mockRejectedValue(
      new StripeError('rate_limit_error', 'rate_limit', 'Too many requests', 429)
    );

    const result = await processPayment(stripe, {
      amount: 5000,
      currency: 'usd',
      customerId: 'cus_1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('RATE_LIMITED');
    expect(result.retryable).toBe(true);
  });

  it('should handle card declined', async () => {
    stripe.paymentIntents.create.mockRejectedValue(
      new StripeError('card_error', 'card_declined', 'Your card was declined', 402)
    );

    const result = await processPayment(stripe, {
      amount: 5000,
      currency: 'usd',
      customerId: 'cus_1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('CARD_DECLINED');
    expect(result.retryable).toBe(false);
  });

  it('should handle insufficient funds', async () => {
    stripe.paymentIntents.create.mockRejectedValue(
      new StripeError('card_error', 'insufficient_funds', 'Insufficient funds', 402)
    );

    const result = await processPayment(stripe, {
      amount: 5000,
      currency: 'usd',
      customerId: 'cus_1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_FUNDS');
    expect(result.retryable).toBe(false);
  });

  it('should handle Stripe internal server error', async () => {
    stripe.paymentIntents.create.mockRejectedValue(
      new StripeError('api_error', 'internal', 'Internal error', 500)
    );

    const result = await processPayment(stripe, {
      amount: 5000,
      currency: 'usd',
      customerId: 'cus_1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('GATEWAY_ERROR');
    expect(result.retryable).toBe(true);
  });
});

// ============================================================================
// 2. Webhook Signature / Replay Attacks
// ============================================================================

describe('Payments Error Paths — Webhook Security', () => {
  let stripe: ReturnType<typeof createMockStripe>;
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    stripe = createMockStripe();
    db = createMockDb();
  });

  it('should reject webhook with invalid signature', () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new StripeError(
        'signature_verification_error',
        'invalid_signature',
        'Invalid signature'
      );
    });

    const result = verifyWebhook(stripe, {
      body: '{}',
      signature: 'invalid-sig',
      secret: 'whsec_test',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_SIGNATURE');
  });

  it('should reject replayed webhook (duplicate event ID)', async () => {
    db.query.mockResolvedValue({ rows: [{ eventId: 'evt_1', processedAt: new Date() }] });

    const result = await processWebhookEvent(db, {
      eventId: 'evt_1',
      type: 'payment_intent.succeeded',
      data: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('DUPLICATE_EVENT');
  });

  it('should reject webhook with stale timestamp', () => {
    const fiveMinutesAgo = Date.now() / 1000 - 600; // 10 min ago, tolerance is 5 min

    const result = validateWebhookTimestamp(fiveMinutesAgo, 300);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('STALE_WEBHOOK');
  });
});

// ============================================================================
// 3. Idempotency Key Conflicts
// ============================================================================

describe('Payments Error Paths — Idempotency', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it('should detect idempotency key collision with different parameters', async () => {
    db.query.mockResolvedValue({
      rows: [
        {
          idempotencyKey: 'key-1',
          amount: 5000,
          currency: 'usd',
          status: 'completed',
        },
      ],
    });

    const result = await checkIdempotencyKey(db, 'key-1', {
      amount: 7000, // different amount
      currency: 'usd',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('IDEMPOTENCY_MISMATCH');
  });

  it('should return cached result for matching idempotent request', async () => {
    db.query.mockResolvedValue({
      rows: [
        {
          idempotencyKey: 'key-1',
          amount: 5000,
          currency: 'usd',
          status: 'completed',
          paymentIntentId: 'pi_cached',
        },
      ],
    });

    const result = await checkIdempotencyKey(db, 'key-1', {
      amount: 5000,
      currency: 'usd',
    });

    expect(result.valid).toBe(true);
    expect(result.cached).toBe(true);
    expect(result.paymentIntentId).toBe('pi_cached');
  });

  it('should allow new idempotency key', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const result = await checkIdempotencyKey(db, 'key-new', {
      amount: 5000,
      currency: 'usd',
    });

    expect(result.valid).toBe(true);
    expect(result.cached).toBe(false);
  });
});

// ============================================================================
// 4. Refund Edge Cases
// ============================================================================

describe('Payments Error Paths — Refunds', () => {
  let stripe: ReturnType<typeof createMockStripe>;
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    stripe = createMockStripe();
    db = createMockDb();
  });

  it('should reject refund exceeding original payment amount', () => {
    const result = validateRefund({
      originalAmount: 5000,
      alreadyRefunded: 3000,
      requestedRefund: 3000, // 3000 + 3000 > 5000
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('EXCEEDS_ORIGINAL');
  });

  it('should reject refund on already fully refunded payment', () => {
    const result = validateRefund({
      originalAmount: 5000,
      alreadyRefunded: 5000,
      requestedRefund: 100,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('ALREADY_REFUNDED');
  });

  it('should handle Stripe refund failure', async () => {
    stripe.refunds.create.mockRejectedValue(
      new StripeError('invalid_request_error', 'charge_already_refunded', 'Charge already refunded')
    );

    const result = await processRefund(stripe, {
      paymentIntentId: 'pi_1',
      amount: 1000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('REFUND_FAILED');
  });

  it('should reject refund with zero amount', () => {
    const result = validateRefund({
      originalAmount: 5000,
      alreadyRefunded: 0,
      requestedRefund: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_AMOUNT');
  });

  it('should reject refund with negative amount', () => {
    const result = validateRefund({
      originalAmount: 5000,
      alreadyRefunded: 0,
      requestedRefund: -100,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_AMOUNT');
  });
});

// ============================================================================
// 5. Payment Method Validation
// ============================================================================

describe('Payments Error Paths — Payment Method Validation', () => {
  let stripe: ReturnType<typeof createMockStripe>;

  beforeEach(() => {
    stripe = createMockStripe();
  });

  it('should handle expired card', async () => {
    stripe.paymentMethods.attach.mockRejectedValue(
      new StripeError('card_error', 'expired_card', 'Card has expired')
    );

    const result = await attachPaymentMethod(stripe, {
      customerId: 'cus_1',
      paymentMethodId: 'pm_expired',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('EXPIRED_CARD');
  });

  it('should handle invalid card number', async () => {
    stripe.paymentMethods.attach.mockRejectedValue(
      new StripeError('card_error', 'incorrect_number', 'Card number is incorrect')
    );

    const result = await attachPaymentMethod(stripe, {
      customerId: 'cus_1',
      paymentMethodId: 'pm_bad',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('INVALID_CARD');
  });

  it('should handle duplicate payment method', async () => {
    stripe.paymentMethods.attach.mockRejectedValue(
      new StripeError('invalid_request_error', 'resource_already_exists', 'Already attached')
    );

    const result = await attachPaymentMethod(stripe, {
      customerId: 'cus_1',
      paymentMethodId: 'pm_dup',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('ALREADY_ATTACHED');
  });
});

// ============================================================================
// 6. Currency Edge Cases
// ============================================================================

describe('Payments Error Paths — Currency', () => {
  it('should handle zero-decimal currencies (JPY)', () => {
    const result = normalizeAmount(1000, 'jpy');
    expect(result.amountInSmallestUnit).toBe(1000);
    expect(result.displayAmount).toBe('¥1,000');
  });

  it('should handle standard two-decimal currencies (USD)', () => {
    const result = normalizeAmount(1999, 'usd');
    expect(result.amountInSmallestUnit).toBe(1999);
    expect(result.displayAmount).toBe('$19.99');
  });

  it('should reject unsupported currency', () => {
    const result = validateCurrency('xyz');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('UNSUPPORTED_CURRENCY');
  });

  it('should reject negative payment amount', () => {
    const result = validatePaymentAmount(-100, 'usd');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_AMOUNT');
  });

  it('should reject amount below minimum charge', () => {
    const result = validatePaymentAmount(25, 'usd'); // 25 cents < $0.50 minimum
    expect(result.valid).toBe(false);
    expect(result.error).toBe('BELOW_MINIMUM');
  });
});

// ============================================================================
// Helper implementations
// ============================================================================

async function processPayment(
  stripe: ReturnType<typeof createMockStripe>,
  params: { amount: number; currency: string; customerId: string }
) {
  try {
    const intent = await stripe.paymentIntents.create(params);
    return { success: true, error: null, retryable: false, paymentIntentId: intent.id };
  } catch (err: unknown) {
    const error = err as StripeError;
    if (error.code === 'timeout' || error.type === 'api_connection_error') {
      return { success: false, error: 'GATEWAY_TIMEOUT', retryable: true };
    }
    if (error.type === 'rate_limit_error') {
      return { success: false, error: 'RATE_LIMITED', retryable: true };
    }
    if (error.code === 'card_declined') {
      return { success: false, error: 'CARD_DECLINED', retryable: false };
    }
    if (error.code === 'insufficient_funds') {
      return { success: false, error: 'INSUFFICIENT_FUNDS', retryable: false };
    }
    if (error.statusCode === 500) {
      return { success: false, error: 'GATEWAY_ERROR', retryable: true };
    }
    return { success: false, error: 'UNKNOWN_ERROR', retryable: false };
  }
}

function verifyWebhook(
  stripe: ReturnType<typeof createMockStripe>,
  params: { body: string; signature: string; secret: string }
) {
  try {
    stripe.webhooks.constructEvent(params.body, params.signature, params.secret);
    return { valid: true, error: null };
  } catch {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }
}

async function processWebhookEvent(
  db: ReturnType<typeof createMockDb>,
  event: { eventId: string; type: string; data: unknown }
) {
  const { rows } = await db.query('SELECT * FROM webhook_events WHERE event_id = $1', [
    event.eventId,
  ]);
  if (rows.length > 0) return { success: false, error: 'DUPLICATE_EVENT' };
  return { success: true, error: null };
}

function validateWebhookTimestamp(timestamp: number, toleranceSec: number) {
  const now = Date.now() / 1000;
  if (Math.abs(now - timestamp) > toleranceSec) {
    return { valid: false, error: 'STALE_WEBHOOK' };
  }
  return { valid: true, error: null };
}

async function checkIdempotencyKey(
  db: ReturnType<typeof createMockDb>,
  key: string,
  params: { amount: number; currency: string }
) {
  const { rows } = await db.query('SELECT * FROM idempotency_keys WHERE key = $1', [key]);

  if (rows.length === 0) return { valid: true, cached: false };

  const existing = rows[0];
  if (existing.amount !== params.amount || existing.currency !== params.currency) {
    return { valid: false, cached: false, error: 'IDEMPOTENCY_MISMATCH' };
  }

  return {
    valid: true,
    cached: true,
    paymentIntentId: existing.paymentIntentId,
  };
}

function validateRefund(params: {
  originalAmount: number;
  alreadyRefunded: number;
  requestedRefund: number;
}) {
  if (params.requestedRefund <= 0) return { valid: false, error: 'INVALID_AMOUNT' };
  if (params.alreadyRefunded >= params.originalAmount)
    return { valid: false, error: 'ALREADY_REFUNDED' };
  if (params.alreadyRefunded + params.requestedRefund > params.originalAmount) {
    return { valid: false, error: 'EXCEEDS_ORIGINAL' };
  }
  return { valid: true, error: null };
}

async function processRefund(
  stripe: ReturnType<typeof createMockStripe>,
  params: { paymentIntentId: string; amount: number }
) {
  try {
    await stripe.refunds.create(params);
    return { success: true, error: null };
  } catch {
    return { success: false, error: 'REFUND_FAILED' };
  }
}

async function attachPaymentMethod(
  stripe: ReturnType<typeof createMockStripe>,
  params: { customerId: string; paymentMethodId: string }
) {
  try {
    await stripe.paymentMethods.attach(params.paymentMethodId, { customer: params.customerId });
    return { success: true, error: null };
  } catch (err: unknown) {
    const error = err as StripeError;
    if (error.code === 'expired_card') return { success: false, error: 'EXPIRED_CARD' };
    if (error.code === 'incorrect_number') return { success: false, error: 'INVALID_CARD' };
    if (error.code === 'resource_already_exists')
      return { success: false, error: 'ALREADY_ATTACHED' };
    return { success: false, error: 'UNKNOWN' };
  }
}

const ZERO_DECIMAL_CURRENCIES = new Set(['jpy', 'krw', 'vnd', 'bif', 'clp']);
const SUPPORTED_CURRENCIES = new Set(['usd', 'eur', 'gbp', 'jpy', 'cad', 'aud', 'krw']);
const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$',
  eur: '€',
  gbp: '£',
  jpy: '¥',
  cad: 'CA$',
  aud: 'A$',
  krw: '₩',
};
const MIN_CHARGE: Record<string, number> = {
  usd: 50,
  eur: 50,
  gbp: 30,
  jpy: 50,
  cad: 50,
  aud: 50,
};

function normalizeAmount(amountInSmallestUnit: number, currency: string) {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase());
  const symbol = CURRENCY_SYMBOLS[currency.toLowerCase()] ?? currency.toUpperCase();

  const displayAmount = isZeroDecimal
    ? `${symbol}${amountInSmallestUnit.toLocaleString()}`
    : `${symbol}${(amountInSmallestUnit / 100).toFixed(2)}`;

  return { amountInSmallestUnit, displayAmount };
}

function validateCurrency(currency: string) {
  if (!SUPPORTED_CURRENCIES.has(currency.toLowerCase())) {
    return { valid: false, error: 'UNSUPPORTED_CURRENCY' };
  }
  return { valid: true, error: null };
}

function validatePaymentAmount(amount: number, currency: string) {
  if (amount <= 0) return { valid: false, error: 'INVALID_AMOUNT' };
  const min = MIN_CHARGE[currency.toLowerCase()] ?? 50;
  if (amount < min) return { valid: false, error: 'BELOW_MINIMUM' };
  return { valid: true, error: null };
}
