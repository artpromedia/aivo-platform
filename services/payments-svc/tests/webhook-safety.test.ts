import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// ══════════════════════════════════════════════════════════════════════════════
// Mocks
// ══════════════════════════════════════════════════════════════════════════════

vi.mock('./config.js', () => ({
  config: { entitlementsSvcUrl: 'http://entitlements:3000' },
}));

import {
  generateIdempotencyKey,
  createWebhookEventStore,
  entitlementsSync,
  type DbClient,
} from '../src/webhook-safety.js';

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('generateIdempotencyKey', () => {
  it('should return a deterministic 32-char hex string', () => {
    const key = generateIdempotencyKey({
      operation: 'create_subscription',
      billingAccountId: 'ba-1',
    });
    expect(key).toHaveLength(32);
    expect(/^[0-9a-f]{32}$/.test(key)).toBe(true);
  });

  it('should produce the same key for the same params', () => {
    const params = { operation: 'pay', billingAccountId: 'ba-1', amount: 100 };
    expect(generateIdempotencyKey(params)).toBe(generateIdempotencyKey(params));
  });

  it('should produce different keys for different params', () => {
    const k1 = generateIdempotencyKey({ operation: 'pay', billingAccountId: 'ba-1' });
    const k2 = generateIdempotencyKey({ operation: 'refund', billingAccountId: 'ba-1' });
    expect(k1).not.toBe(k2);
  });

  it('should be order-independent (sorted keys)', () => {
    const k1 = generateIdempotencyKey({ operation: 'x', billingAccountId: 'y', z: 1 });
    const k2 = generateIdempotencyKey({ z: 1, billingAccountId: 'y', operation: 'x' });
    expect(k1).toBe(k2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────

describe('createWebhookEventStore', () => {
  let db: DbClient;

  beforeEach(() => {
    db = {
      getPaymentEventByProviderId: vi.fn().mockResolvedValue(null),
      createPaymentEvent: vi.fn().mockResolvedValue({ id: 'pe-1' }),
    };
  });

  it('isEventProcessed should return false for new event', async () => {
    const store = createWebhookEventStore(db);
    expect(await store.isEventProcessed('evt_new')).toBe(false);
    expect(db.getPaymentEventByProviderId).toHaveBeenCalledWith('evt_new');
  });

  it('isEventProcessed should return true after markProcessed', async () => {
    const store = createWebhookEventStore(db);
    await store.markEventProcessed('evt_1', 'payment_intent.succeeded');

    expect(await store.isEventProcessed('evt_1')).toBe(true);
    // Should hit cache, no DB query
    expect(db.getPaymentEventByProviderId).not.toHaveBeenCalledWith('evt_1');
  });

  it('should check DB on cache miss', async () => {
    (db.getPaymentEventByProviderId as any).mockResolvedValue({ id: 'existing' });
    const store = createWebhookEventStore(db);

    expect(await store.isEventProcessed('evt_old')).toBe(true);
    expect(db.getPaymentEventByProviderId).toHaveBeenCalledWith('evt_old');
  });

  it('should return false on DB error (safe to retry)', async () => {
    (db.getPaymentEventByProviderId as any).mockRejectedValue(new Error('DB down'));
    const store = createWebhookEventStore(db);

    expect(await store.isEventProcessed('evt_err')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────

describe('entitlementsSync', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('triggerRecalculation', () => {
    it('should POST to entitlements service', async () => {
      (fetch as any).mockResolvedValue({ ok: true });

      await entitlementsSync.triggerRecalculation('t-1', 'SCHOOL', 'corr-1');

      expect(fetch).toHaveBeenCalledWith(
        'http://entitlements:3000/internal/recalculate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ tenantId: 't-1', tenantType: 'SCHOOL' }),
        })
      );
    });

    it('should not throw on fetch failure', async () => {
      (fetch as any).mockRejectedValue(new Error('network'));
      await expect(
        entitlementsSync.triggerRecalculation('t-1', 'SCHOOL', 'c-1')
      ).resolves.toBeUndefined();
    });
  });

  describe('validateSubscriptionCount', () => {
    it('should return true when counts match', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ subscriptionCount: 3 }),
      });

      const valid = await entitlementsSync.validateSubscriptionCount('t-1', 3, 'c-1');
      expect(valid).toBe(true);
    });

    it('should return false when counts differ', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ subscriptionCount: 2 }),
      });

      expect(await entitlementsSync.validateSubscriptionCount('t-1', 3, 'c-1')).toBe(false);
    });

    it('should return false on error', async () => {
      (fetch as any).mockRejectedValue(new Error('network'));
      expect(await entitlementsSync.validateSubscriptionCount('t-1', 3, 'c-1')).toBe(false);
    });
  });
});
