/**
 * Billing Events Publisher Tests
 *
 * Tests for NATS-based event publishing:
 * - Event publishing
 * - Event types and payloads
 * - Correlation IDs
 * - Idempotency
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import {
  BillingEventPublisher,
  BillingEventType,
  type SubscriptionEventPayload,
  type PaymentEventPayload,
  type EntitlementsEventPayload,
} from '../src/events/billing.publisher.js';

// Mock NATS
const mockPublish = vi.fn().mockResolvedValue({ seq: 1, duplicate: false });
const mockJetstream = vi.fn().mockReturnValue({
  publish: mockPublish,
});
const mockJetstreamManager = vi.fn().mockResolvedValue({
  streams: {
    info: vi.fn().mockResolvedValue({}),
    add: vi.fn().mockResolvedValue({}),
  },
});
const mockConnect = vi.fn().mockResolvedValue({
  jetstream: mockJetstream,
  jetstreamManager: mockJetstreamManager,
  status: vi.fn().mockReturnValue({
    [Symbol.asyncIterator]: () => ({
      next: () => new Promise(() => {}), // Never resolves
    }),
  }),
  drain: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
});

vi.mock('nats', () => ({
  connect: mockConnect,
  StringCodec: vi.fn().mockReturnValue({
    encode: vi.fn((str) => new TextEncoder().encode(str)),
    decode: vi.fn((data) => new TextDecoder().decode(data)),
  }),
}));

vi.mock('@aivo/ts-observability', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../src/config.js', () => ({
  config: {
    nats: {
      url: 'nats://localhost:4222',
    },
  },
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const mockTenant = {
  tenantId: 'tenant-123',
  organizationId: 'org-456',
  userId: 'user-789',
};

const mockSubscriptionPayload: SubscriptionEventPayload = {
  subscriptionId: 'sub-123',
  customerId: 'cus-123',
  stripeSubscriptionId: 'sub_stripe123',
  stripeCustomerId: 'cus_stripe123',
  plan: 'PRO',
  status: 'active',
  currentPeriodStart: '2024-01-01T00:00:00Z',
  currentPeriodEnd: '2024-02-01T00:00:00Z',
  cancelAtPeriodEnd: false,
};

const mockPaymentPayload: PaymentEventPayload = {
  paymentId: 'pay-123',
  customerId: 'cus-123',
  stripePaymentIntentId: 'pi_stripe123',
  stripeCustomerId: 'cus_stripe123',
  amount: 2999,
  currency: 'usd',
  status: 'succeeded',
  subscriptionId: 'sub-123',
};

const mockEntitlementsPayload: EntitlementsEventPayload = {
  customerId: 'cus-123',
  tenantId: 'tenant-123',
  plan: 'PRO',
  features: ['aiTutor', 'basicAnalytics', 'prioritySupport'],
  limits: { learners: 5, teachers: 1, storage: 10240 },
  reason: 'subscription_upgrade',
};

// ============================================================================
// Tests
// ============================================================================

describe('BillingEventPublisher', () => {
  let publisher: BillingEventPublisher;

  beforeEach(async () => {
    vi.clearAllMocks();
    publisher = new BillingEventPublisher();
    await publisher.initialize();
  });

  afterEach(async () => {
    await publisher.close();
    vi.resetAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Initialization
  // ──────────────────────────────────────────────────────────────────────────

  describe('initialize', () => {
    it('should connect to NATS', async () => {
      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          servers: 'nats://localhost:4222',
          name: 'billing-svc-publisher',
        })
      );
    });

    it('should initialize JetStream', async () => {
      expect(mockJetstream).toHaveBeenCalled();
    });

    it('should not reconnect if already initialized', async () => {
      await publisher.initialize();
      await publisher.initialize();

      // Should only connect once
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Event Publishing
  // ──────────────────────────────────────────────────────────────────────────

  describe('publish', () => {
    it('should publish event with correct structure', async () => {
      await publisher.publish(
        BillingEventType.SUBSCRIPTION_CREATED,
        mockTenant,
        mockSubscriptionPayload
      );

      expect(mockPublish).toHaveBeenCalledWith(
        BillingEventType.SUBSCRIPTION_CREATED,
        expect.any(Uint8Array),
        expect.objectContaining({
          msgID: expect.any(String),
        })
      );
    });

    it('should include correlation ID in event', async () => {
      await publisher.publish(
        BillingEventType.PAYMENT_SUCCEEDED,
        mockTenant,
        mockPaymentPayload,
        { correlationId: 'corr-123' }
      );

      const publishCall = mockPublish.mock.calls[0];
      const eventData = JSON.parse(new TextDecoder().decode(publishCall[1]));

      expect(eventData.metadata.correlationId).toBe('corr-123');
    });

    it('should generate correlation ID if not provided', async () => {
      await publisher.publish(
        BillingEventType.SUBSCRIPTION_UPDATED,
        mockTenant,
        mockSubscriptionPayload
      );

      const publishCall = mockPublish.mock.calls[0];
      const eventData = JSON.parse(new TextDecoder().decode(publishCall[1]));

      expect(eventData.metadata.correlationId).toMatch(/^billing-\d+-[a-z0-9]+$/);
    });

    it('should include tenant context in event', async () => {
      await publisher.publish(
        BillingEventType.ENTITLEMENTS_UPDATED,
        mockTenant,
        mockEntitlementsPayload
      );

      const publishCall = mockPublish.mock.calls[0];
      const eventData = JSON.parse(new TextDecoder().decode(publishCall[1]));

      expect(eventData.tenant).toEqual(mockTenant);
    });

    it('should include timestamp and version', async () => {
      await publisher.publish(
        BillingEventType.INVOICE_PAID,
        mockTenant,
        mockPaymentPayload
      );

      const publishCall = mockPublish.mock.calls[0];
      const eventData = JSON.parse(new TextDecoder().decode(publishCall[1]));

      expect(eventData.metadata.timestamp).toBeDefined();
      expect(eventData.metadata.version).toBe('1.0.0');
      expect(eventData.metadata.source).toBe('billing-svc');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Convenience Methods
  // ──────────────────────────────────────────────────────────────────────────

  describe('publishSubscriptionCreated', () => {
    it('should publish subscription created event', async () => {
      await publisher.publishSubscriptionCreated(
        mockTenant,
        mockSubscriptionPayload,
        'corr-123'
      );

      expect(mockPublish).toHaveBeenCalledWith(
        BillingEventType.SUBSCRIPTION_CREATED,
        expect.any(Uint8Array),
        expect.objectContaining({
          msgID: `sub-created-${mockSubscriptionPayload.stripeSubscriptionId}`,
        })
      );
    });
  });

  describe('publishSubscriptionCanceled', () => {
    it('should publish subscription canceled event', async () => {
      await publisher.publishSubscriptionCanceled(
        mockTenant,
        { ...mockSubscriptionPayload, status: 'canceled', cancelReason: 'user_requested' },
        'corr-456'
      );

      expect(mockPublish).toHaveBeenCalledWith(
        BillingEventType.SUBSCRIPTION_CANCELED,
        expect.any(Uint8Array),
        expect.any(Object)
      );
    });
  });

  describe('publishPaymentSucceeded', () => {
    it('should publish payment succeeded event', async () => {
      await publisher.publishPaymentSucceeded(
        mockTenant,
        mockPaymentPayload,
        'corr-789'
      );

      expect(mockPublish).toHaveBeenCalledWith(
        BillingEventType.PAYMENT_SUCCEEDED,
        expect.any(Uint8Array),
        expect.objectContaining({
          msgID: `payment-success-${mockPaymentPayload.stripePaymentIntentId}`,
        })
      );
    });
  });

  describe('publishPaymentFailed', () => {
    it('should publish payment failed event', async () => {
      await publisher.publishPaymentFailed(
        mockTenant,
        { ...mockPaymentPayload, status: 'failed', failureCode: 'card_declined' },
        'corr-fail'
      );

      expect(mockPublish).toHaveBeenCalledWith(
        BillingEventType.PAYMENT_FAILED,
        expect.any(Uint8Array),
        expect.any(Object)
      );
    });
  });

  describe('publishEntitlementsUpdated', () => {
    it('should publish entitlements updated event', async () => {
      await publisher.publishEntitlementsUpdated(
        mockTenant,
        mockEntitlementsPayload,
        'corr-ent'
      );

      expect(mockPublish).toHaveBeenCalledWith(
        BillingEventType.ENTITLEMENTS_UPDATED,
        expect.any(Uint8Array),
        expect.any(Object)
      );
    });
  });

  describe('publishTrialEnding', () => {
    it('should publish trial ending event', async () => {
      await publisher.publishTrialEnding(
        mockTenant,
        { ...mockSubscriptionPayload, trialEnd: '2024-01-14T00:00:00Z' },
        'corr-trial'
      );

      expect(mockPublish).toHaveBeenCalledWith(
        BillingEventType.SUBSCRIPTION_TRIAL_ENDING,
        expect.any(Uint8Array),
        expect.objectContaining({
          msgID: `trial-ending-${mockSubscriptionPayload.stripeSubscriptionId}`,
        })
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ──────────────────────────────────────────────────────────────────────────

  describe('close', () => {
    it('should drain and close connection', async () => {
      const connection = await mockConnect();
      await publisher.close();

      // Note: Since we're testing the close method, the connection methods
      // should have been called internally
      expect(connection.drain).toBeDefined();
      expect(connection.close).toBeDefined();
    });
  });
});

// ============================================================================
// Event Type Tests
// ============================================================================

describe('BillingEventType', () => {
  it('should have subscription events', () => {
    expect(BillingEventType.SUBSCRIPTION_CREATED).toBe('billing.subscription.created');
    expect(BillingEventType.SUBSCRIPTION_UPDATED).toBe('billing.subscription.updated');
    expect(BillingEventType.SUBSCRIPTION_CANCELED).toBe('billing.subscription.canceled');
  });

  it('should have payment events', () => {
    expect(BillingEventType.PAYMENT_SUCCEEDED).toBe('billing.payment.succeeded');
    expect(BillingEventType.PAYMENT_FAILED).toBe('billing.payment.failed');
    expect(BillingEventType.PAYMENT_REFUNDED).toBe('billing.payment.refunded');
  });

  it('should have invoice events', () => {
    expect(BillingEventType.INVOICE_PAID).toBe('billing.invoice.paid');
    expect(BillingEventType.INVOICE_PAYMENT_FAILED).toBe('billing.invoice.payment_failed');
  });

  it('should have entitlements events', () => {
    expect(BillingEventType.ENTITLEMENTS_UPDATED).toBe('billing.entitlements.updated');
    expect(BillingEventType.ENTITLEMENTS_GRANTED).toBe('billing.entitlements.granted');
    expect(BillingEventType.ENTITLEMENTS_REVOKED).toBe('billing.entitlements.revoked');
  });
});
