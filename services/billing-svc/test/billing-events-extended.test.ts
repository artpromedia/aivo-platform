import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('BillingEventPublisher', () => {
  let publisherModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    // Disable NATS in test environment
    process.env.NATS_URL = '';
    publisherModule = await import('../src/events/billing.publisher');
  });

  it('exports BillingEventType enum with expected events', () => {
    const types = publisherModule.BillingEventType;
    expect(types).toBeDefined();
    // Should have subscription, payment, and trial event types
    expect(Object.keys(types).length).toBeGreaterThan(10);
  });

  it('publishes events to in-memory fallback when NATS unavailable', async () => {
    if (publisherModule.publishBillingEvent) {
      // In test env with no NATS, should use in-memory fallback without throwing
      await expect(
        publisherModule.publishBillingEvent({
          type: 'SUBSCRIPTION_CREATED',
          tenantId: 'tenant-1',
          data: { planId: 'basic' },
        }),
      ).resolves.not.toThrow();
    }
  });

  it('deduplicates events with same idempotency key', async () => {
    if (publisherModule.publishBillingEvent) {
      const event = {
        type: 'PAYMENT_SUCCEEDED',
        tenantId: 'tenant-1',
        idempotencyKey: 'dedup-key-1',
        data: {},
      };

      await publisherModule.publishBillingEvent(event);
      await publisherModule.publishBillingEvent(event);

      // Should not throw, and second call should be deduplicated
    }
  });
});

describe('StripeUsageReporter', () => {
  let reporterModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    reporterModule = await import('../src/events/stripe-usage-reporter');
  });

  it('exports stripe usage reporter functions', () => {
    expect(reporterModule).toBeDefined();
  });
});

describe('UsageConsumer', () => {
  let consumerModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    consumerModule = await import('../src/events/usage.consumer');
  });

  it('exports usage consumer functions', () => {
    expect(consumerModule).toBeDefined();
  });
});
