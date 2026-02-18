/**
 * Dunning Email Integration Tests
 *
 * Verifies that the dunning service sends emails through notify-svc
 * using the correct template names, endpoints, and payloads.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock config
vi.mock('../src/config.js', () => ({
  config: {
    services: {
      notify: 'http://notify-svc:3000',
      auth: 'http://auth-svc:3000',
    },
  },
}));

// Mock prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    billingAccount: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    dunningRecord: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    paymentEvent: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: unknown) => {
      if (typeof fn === 'function') {
        return fn({
          subscription: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
          dunningRecord: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
        });
      }
      return Promise.resolve([]);
    }),
  },
}));

// Mock entitlements service (imported by dunning service)
vi.mock('../src/services/entitlements.service.js', () => ({
  entitlementsService: {
    syncEntitlements: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock billing event publisher
vi.mock('../src/events/billing.publisher.js', () => ({
  billingEventPublisher: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
  BillingEventType: {
    DUNNING_STARTED: 'DUNNING_STARTED',
    DUNNING_ESCALATED: 'DUNNING_ESCALATED',
    DUNNING_RESOLVED: 'DUNNING_RESOLVED',
    REMINDER_TRIAL_ENDING: 'REMINDER_TRIAL_ENDING',
  },
}));

import { prisma } from '../src/prisma.js';

// ============================================================================
// Tests
// ============================================================================

describe('Dunning Email Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{}'),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Send Dunning Notification via notify-svc', () => {
    it('should POST to /api/v1/email/send endpoint (not /internal/notifications)', async () => {
      // Import after mocks are set up
      const { dunningService } = await import('../src/services/dunning.service.js');

      // Access the private method via prototype
      const sendNotification = (dunningService as any).sendDunningNotification.bind(dunningService);

      // Mock subscription lookup
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: 'sub-123',
        billingAccount: {
          ownerUserId: 'user-123',
          billingEmail: 'admin@school.edu',
        },
      } as any);

      await sendNotification('tenant-123', 'day0', 'sub-123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('http://notify-svc:3000/api/v1/email/send');
      expect(url).not.toContain('/internal/notifications');
    });

    it('should use billing/payment-failed template for day0 stage', async () => {
      const { dunningService } = await import('../src/services/dunning.service.js');
      const sendNotification = (dunningService as any).sendDunningNotification.bind(dunningService);

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: 'sub-123',
        billingAccount: {
          ownerUserId: 'user-123',
          billingEmail: 'admin@school.edu',
        },
      } as any);

      await sendNotification('tenant-123', 'day0', 'sub-123');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.templateName).toBe('billing/payment-failed');
      expect(body.to).toBe('admin@school.edu');
      expect(body.category).toBe('billing');
      expect(body.tags).toContain('dunning');
    });

    it('should use billing/payment-reminder template for day3 stage', async () => {
      const { dunningService } = await import('../src/services/dunning.service.js');
      const sendNotification = (dunningService as any).sendDunningNotification.bind(dunningService);

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: 'sub-123',
        billingAccount: {
          ownerUserId: 'user-123',
          billingEmail: 'billing@school.edu',
        },
      } as any);

      await sendNotification('tenant-123', 'day3', 'sub-123');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.templateName).toBe('billing/payment-reminder');
      expect(body.to).toBe('billing@school.edu');
    });

    it('should use billing/limited-mode-activated template for day7 stage', async () => {
      const { dunningService } = await import('../src/services/dunning.service.js');
      const sendNotification = (dunningService as any).sendDunningNotification.bind(dunningService);

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: 'sub-123',
        billingAccount: {
          ownerUserId: 'user-123',
          billingEmail: 'billing@school.edu',
        },
      } as any);

      await sendNotification('tenant-123', 'day7', 'sub-123');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.templateName).toBe('billing/limited-mode-activated');
    });

    it('should use billing/payment-succeeded template for resolved stage', async () => {
      const { dunningService } = await import('../src/services/dunning.service.js');
      const sendNotification = (dunningService as any).sendDunningNotification.bind(dunningService);

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: 'sub-123',
        billingAccount: {
          ownerUserId: 'user-123',
          billingEmail: 'billing@school.edu',
        },
      } as any);

      await sendNotification('tenant-123', 'resolved', 'sub-123');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.templateName).toBe('billing/payment-succeeded');
    });

    it('should include billingPortalUrl in context', async () => {
      const { dunningService } = await import('../src/services/dunning.service.js');
      const sendNotification = (dunningService as any).sendDunningNotification.bind(dunningService);

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: 'sub-123',
        billingAccount: {
          ownerUserId: 'user-123',
          billingEmail: 'admin@school.edu',
        },
      } as any);

      await sendNotification('tenant-123', 'day0', 'sub-123');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.context.billingPortalUrl).toBe('http://auth-svc:3000/billing/portal');
    });

    it('should include X-Service-Name header', async () => {
      const { dunningService } = await import('../src/services/dunning.service.js');
      const sendNotification = (dunningService as any).sendDunningNotification.bind(dunningService);

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: 'sub-123',
        billingAccount: {
          ownerUserId: 'user-123',
          billingEmail: 'admin@school.edu',
        },
      } as any);

      await sendNotification('tenant-123', 'day0', 'sub-123');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['X-Service-Name']).toBe('billing-svc');
    });

    it('should not throw when billingEmail is null', async () => {
      const { dunningService } = await import('../src/services/dunning.service.js');
      const sendNotification = (dunningService as any).sendDunningNotification.bind(dunningService);

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: 'sub-123',
        billingAccount: {
          ownerUserId: 'user-123',
          billingEmail: null,
        },
      } as any);

      // Should return early without calling fetch
      await expect(sendNotification('tenant-123', 'day0', 'sub-123')).resolves.not.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not throw when fetch fails (non-blocking)', async () => {
      const { dunningService } = await import('../src/services/dunning.service.js');
      const sendNotification = (dunningService as any).sendDunningNotification.bind(dunningService);

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: 'sub-123',
        billingAccount: {
          ownerUserId: 'user-123',
          billingEmail: 'admin@school.edu',
        },
      } as any);

      mockFetch.mockRejectedValue(new Error('Connection refused'));

      await expect(sendNotification('tenant-123', 'day0', 'sub-123')).resolves.not.toThrow();
    });

    it('should not throw when fetch returns non-ok response', async () => {
      const { dunningService } = await import('../src/services/dunning.service.js');
      const sendNotification = (dunningService as any).sendDunningNotification.bind(dunningService);

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        id: 'sub-123',
        billingAccount: {
          ownerUserId: 'user-123',
          billingEmail: 'admin@school.edu',
        },
      } as any);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(sendNotification('tenant-123', 'day0', 'sub-123')).resolves.not.toThrow();
    });
  });
});
