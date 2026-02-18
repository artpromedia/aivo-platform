/**
 * Reminder Email Integration Tests
 *
 * Verifies that the reminder service sends trial-ending emails
 * through notify-svc using the unified billing/trial-ending template.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock fetch globally before importing modules
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
    },
    billingAccount: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    trialReminder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    pilotReminder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    pilotProgram: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: unknown) => {
      if (typeof fn === 'function') {
        return fn({
          trialReminder: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
          pilotReminder: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
        });
      }
      return Promise.resolve([]);
    }),
  },
}));

// Mock billing event publisher
const mockPublish = vi.fn().mockResolvedValue(undefined);
vi.mock('../src/events/billing.publisher.js', () => ({
  billingEventPublisher: {
    publish: mockPublish,
  },
  BillingEventType: {
    REMINDER_TRIAL_ENDING: 'REMINDER_TRIAL_ENDING',
    REMINDER_PILOT_ENDING: 'REMINDER_PILOT_ENDING',
  },
}));

// ============================================================================
// Tests
// ============================================================================

describe('Reminder Email Integration', () => {
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

  describe('sendTrialReminderNotification', () => {
    const makeReminder = (overrides: Record<string, unknown> = {}) => ({
      id: 'rem-123',
      subscriptionId: 'sub-123',
      tenantId: 'tenant-123',
      userId: 'user-123',
      type: 'TRIAL_ENDING_14_DAYS' as const,
      emailAddress: 'teacher@school.edu',
      hasPaymentMethod: false,
      chargeAmountCents: 2999,
      trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      metadataJson: null,
      ...overrides,
    });

    it('should POST to /api/v1/email/send with billing/trial-ending template', async () => {
      const { reminderService } = await import('../src/services/reminder.service.js');
      const sendNotification = (reminderService as any).sendTrialReminderNotification.bind(
        reminderService
      );

      await sendNotification(makeReminder());

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('http://notify-svc:3000/api/v1/email/send');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.templateName).toBe('billing/trial-ending');
      expect(body.to).toBe('teacher@school.edu');
    });

    it('should use unified billing/trial-ending template for all reminder types', async () => {
      const { reminderService } = await import('../src/services/reminder.service.js');
      const sendNotification = (reminderService as any).sendTrialReminderNotification.bind(
        reminderService
      );

      const types = [
        'TRIAL_ENDING_14_DAYS',
        'TRIAL_ENDING_7_DAYS',
        'TRIAL_ENDING_48_HOURS',
      ] as const;

      for (const type of types) {
        vi.clearAllMocks();
        mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('{}') });

        await sendNotification(makeReminder({ type }));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.templateName).toBe('billing/trial-ending');
      }
    });

    it('should include daysRemaining and trialEndDate in context', async () => {
      const { reminderService } = await import('../src/services/reminder.service.js');
      const sendNotification = (reminderService as any).sendTrialReminderNotification.bind(
        reminderService
      );

      const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await sendNotification(makeReminder({ trialEndDate }));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.context.daysRemaining).toBeGreaterThanOrEqual(6);
      expect(body.context.daysRemaining).toBeLessThanOrEqual(8);
      expect(body.context.trialEndDate).toBeTruthy();
    });

    it('should include hasPaymentMethod and chargeAmount in context', async () => {
      const { reminderService } = await import('../src/services/reminder.service.js');
      const sendNotification = (reminderService as any).sendTrialReminderNotification.bind(
        reminderService
      );

      await sendNotification(
        makeReminder({ hasPaymentMethod: true, chargeAmountCents: 4999 })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.context.hasPaymentMethod).toBe(true);
      expect(body.context.chargeAmount).toBe('$49.99');
    });

    it('should include billingPortalUrl in context', async () => {
      const { reminderService } = await import('../src/services/reminder.service.js');
      const sendNotification = (reminderService as any).sendTrialReminderNotification.bind(
        reminderService
      );

      await sendNotification(makeReminder());

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.context.billingPortalUrl).toBe('http://auth-svc:3000/billing/portal');
    });

    it('should also publish event on billing event bus', async () => {
      const { reminderService } = await import('../src/services/reminder.service.js');
      const sendNotification = (reminderService as any).sendTrialReminderNotification.bind(
        reminderService
      );

      await sendNotification(makeReminder());

      expect(mockPublish).toHaveBeenCalledTimes(1);
      const publishArgs = mockPublish.mock.calls[0];
      expect(publishArgs[0]).toBe('REMINDER_TRIAL_ENDING');
      expect(publishArgs[2].template).toBe('billing/trial-ending');
    });

    it('should skip email when emailAddress is null', async () => {
      const { reminderService } = await import('../src/services/reminder.service.js');
      const sendNotification = (reminderService as any).sendTrialReminderNotification.bind(
        reminderService
      );

      await sendNotification(makeReminder({ emailAddress: null }));

      // Should not call fetch but should still publish event
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockPublish).toHaveBeenCalledTimes(1);
    });

    it('should not throw when email send fails (non-blocking)', async () => {
      const { reminderService } = await import('../src/services/reminder.service.js');
      const sendNotification = (reminderService as any).sendTrialReminderNotification.bind(
        reminderService
      );

      mockFetch.mockRejectedValue(new Error('Connection refused'));

      // Should not throw — email is non-blocking
      await expect(sendNotification(makeReminder())).resolves.not.toThrow();
      // Event should still be published
      expect(mockPublish).toHaveBeenCalledTimes(1);
    });

    it('should include billing category and trial-reminder tag', async () => {
      const { reminderService } = await import('../src/services/reminder.service.js');
      const sendNotification = (reminderService as any).sendTrialReminderNotification.bind(
        reminderService
      );

      await sendNotification(makeReminder());

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.category).toBe('billing');
      expect(body.tags).toContain('trial-reminder');
    });
  });
});
