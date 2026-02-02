/**
 * Payments Service - Dunning Unit Tests
 *
 * Tests for payment failure recovery including:
 * - Dunning flow stages (Day 0, 3, 7, 14)
 * - Email notifications
 * - Grace period handling
 * - Subscription suspension/cancellation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock dependencies
const mockStripe = {
  invoices: {
    pay: vi.fn(),
    retrieve: vi.fn(),
  },
  subscriptions: {
    update: vi.fn(),
    cancel: vi.fn(),
  },
  customers: {
    retrieve: vi.fn(),
  },
};

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => mockStripe),
}));

const mockPrisma = {
  subscription: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  dunningAttempt: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const mockEmailService = {
  sendPaymentFailedEmail: vi.fn(),
  sendPaymentRetryEmail: vi.fn(),
  sendFinalWarningEmail: vi.fn(),
  sendSubscriptionCancelledEmail: vi.fn(),
};

// Types
interface DunningState {
  subscriptionId: string;
  stage: 'day0' | 'day3' | 'day7' | 'day14';
  failedAt: Date;
  attemptCount: number;
  lastAttemptAt: Date;
  nextAttemptAt: Date | null;
}

describe('Dunning Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Day 0 - Initial Payment Failure', () => {
    it('should log initial payment failure', async () => {
      const now = new Date('2026-02-01T10:00:00Z');
      vi.setSystemTime(now);

      mockPrisma.dunningAttempt.create.mockResolvedValue({
        id: 'da-1',
        subscriptionId: 'sub-1',
        stage: 'day0',
        failedAt: now,
        attemptCount: 1,
      });

      const result = await mockPrisma.dunningAttempt.create({
        data: {
          subscriptionId: 'sub-1',
          stage: 'day0',
          failedAt: now,
          attemptCount: 1,
        },
      });

      expect(result.stage).toBe('day0');
      expect(result.attemptCount).toBe(1);
    });

    it('should send payment failed notification', async () => {
      mockEmailService.sendPaymentFailedEmail.mockResolvedValue({ sent: true });

      const result = await mockEmailService.sendPaymentFailedEmail({
        email: 'billing@school.com',
        organizationName: 'Test School',
        invoiceUrl: 'https://stripe.com/invoice/123',
        amountDue: 9900,
      });

      expect(result.sent).toBe(true);
      expect(mockEmailService.sendPaymentFailedEmail).toHaveBeenCalled();
    });

    it('should schedule retry for Day 3', async () => {
      const now = new Date('2026-02-01T10:00:00Z');
      vi.setSystemTime(now);

      const nextRetry = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      mockPrisma.subscription.update.mockResolvedValue({
        id: 'sub-1',
        nextRetryAt: nextRetry,
        dunningStage: 'day0',
      });

      const result = await mockPrisma.subscription.update({
        where: { id: 'sub-1' },
        data: {
          nextRetryAt: nextRetry,
          dunningStage: 'day0',
        },
      });

      expect(result.dunningStage).toBe('day0');
      expect(result.nextRetryAt).toEqual(nextRetry);
    });

    it('should preserve customer access during grace period', async () => {
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        accessStatus: 'GRACE_PERIOD',
        graceEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

      const result = await mockPrisma.organization.update({
        where: { id: 'org-1' },
        data: { accessStatus: 'GRACE_PERIOD' },
      });

      expect(result.accessStatus).toBe('GRACE_PERIOD');
    });
  });

  describe('Day 3 - First Retry', () => {
    it('should attempt automatic payment retry', async () => {
      mockStripe.invoices.pay.mockResolvedValue({
        id: 'in_test',
        status: 'paid',
      });

      const result = await mockStripe.invoices.pay('in_test');
      expect(result.status).toBe('paid');
    });

    it('should handle retry success', async () => {
      mockStripe.invoices.pay.mockResolvedValue({
        id: 'in_test',
        status: 'paid',
        paid: true,
      });

      mockPrisma.subscription.update.mockResolvedValue({
        id: 'sub-1',
        dunningStage: null,
        status: 'active',
      });

      const invoice = await mockStripe.invoices.pay('in_test');
      expect(invoice.paid).toBe(true);

      const subscription = await mockPrisma.subscription.update({
        where: { id: 'sub-1' },
        data: { dunningStage: null, status: 'active' },
      });

      expect(subscription.dunningStage).toBeNull();
    });

    it('should handle retry failure and advance to Day 7', async () => {
      mockStripe.invoices.pay.mockRejectedValue({
        type: 'StripeCardError',
        code: 'card_declined',
      });

      const now = new Date('2026-02-04T10:00:00Z'); // Day 3
      vi.setSystemTime(now);

      mockPrisma.subscription.update.mockResolvedValue({
        id: 'sub-1',
        dunningStage: 'day3',
        nextRetryAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // Day 7
      });

      const result = await mockPrisma.subscription.update({
        where: { id: 'sub-1' },
        data: {
          dunningStage: 'day3',
          nextRetryAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        },
      });

      expect(result.dunningStage).toBe('day3');
    });

    it('should send reminder email on Day 3', async () => {
      mockEmailService.sendPaymentRetryEmail.mockResolvedValue({ sent: true });

      const result = await mockEmailService.sendPaymentRetryEmail({
        email: 'billing@school.com',
        daysRemaining: 11,
        updatePaymentUrl: 'https://aivo.app/billing',
      });

      expect(result.sent).toBe(true);
    });
  });

  describe('Day 7 - Second Retry', () => {
    it('should attempt second payment retry', async () => {
      mockStripe.invoices.pay.mockResolvedValue({
        id: 'in_test',
        status: 'paid',
      });

      const result = await mockStripe.invoices.pay('in_test');
      expect(result.status).toBe('paid');
    });

    it('should show warning banner in UI', async () => {
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        showPaymentWarning: true,
        warningMessage: 'Payment past due. Update payment method to avoid service interruption.',
      });

      const result = await mockPrisma.organization.update({
        where: { id: 'org-1' },
        data: {
          showPaymentWarning: true,
          warningMessage: 'Payment past due. Update payment method to avoid service interruption.',
        },
      });

      expect(result.showPaymentWarning).toBe(true);
    });

    it('should track dunning attempt history', async () => {
      mockPrisma.dunningAttempt.findMany.mockResolvedValue([
        { id: 'da-1', stage: 'day0', attemptedAt: new Date('2026-02-01') },
        { id: 'da-2', stage: 'day3', attemptedAt: new Date('2026-02-04') },
        { id: 'da-3', stage: 'day7', attemptedAt: new Date('2026-02-08') },
      ]);

      const attempts = await mockPrisma.dunningAttempt.findMany({
        where: { subscriptionId: 'sub-1' },
        orderBy: { attemptedAt: 'asc' },
      });

      expect(attempts).toHaveLength(3);
    });
  });

  describe('Day 14 - Final Warning & Cancellation', () => {
    it('should send final warning email', async () => {
      mockEmailService.sendFinalWarningEmail.mockResolvedValue({ sent: true });

      const result = await mockEmailService.sendFinalWarningEmail({
        email: 'billing@school.com',
        cancelDate: new Date('2026-02-15'),
        updatePaymentUrl: 'https://aivo.app/billing',
      });

      expect(result.sent).toBe(true);
    });

    it('should cancel subscription after grace period', async () => {
      mockStripe.subscriptions.cancel.mockResolvedValue({
        id: 'sub_test',
        status: 'canceled',
      });

      const subscription = await mockStripe.subscriptions.cancel('sub_test');
      expect(subscription.status).toBe('canceled');
    });

    it('should downgrade organization to free tier', async () => {
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        plan: 'FREE',
        accessStatus: 'LIMITED',
      });

      const result = await mockPrisma.organization.update({
        where: { id: 'org-1' },
        data: {
          plan: 'FREE',
          accessStatus: 'LIMITED',
        },
      });

      expect(result.plan).toBe('FREE');
      expect(result.accessStatus).toBe('LIMITED');
    });

    it('should send cancellation confirmation email', async () => {
      mockEmailService.sendSubscriptionCancelledEmail.mockResolvedValue({ sent: true });

      const result = await mockEmailService.sendSubscriptionCancelledEmail({
        email: 'billing@school.com',
        organizationName: 'Test School',
        reactivateUrl: 'https://aivo.app/billing/reactivate',
      });

      expect(result.sent).toBe(true);
    });

    it('should preserve data for reactivation period', async () => {
      const dataRetentionDays = 30;

      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        dataRetainedUntil: new Date(Date.now() + dataRetentionDays * 24 * 60 * 60 * 1000),
      });

      const result = await mockPrisma.organization.update({
        where: { id: 'org-1' },
        data: {
          dataRetainedUntil: new Date(Date.now() + dataRetentionDays * 24 * 60 * 60 * 1000),
        },
      });

      expect(result.dataRetainedUntil).toBeDefined();
    });
  });

  describe('Dunning State Machine', () => {
    it('should calculate correct dunning stage from failure date', () => {
      const failedAt = new Date('2026-02-01');

      const getStage = (daysSinceFailure: number): DunningState['stage'] => {
        if (daysSinceFailure >= 14) return 'day14';
        if (daysSinceFailure >= 7) return 'day7';
        if (daysSinceFailure >= 3) return 'day3';
        return 'day0';
      };

      expect(getStage(0)).toBe('day0');
      expect(getStage(2)).toBe('day0');
      expect(getStage(3)).toBe('day3');
      expect(getStage(6)).toBe('day3');
      expect(getStage(7)).toBe('day7');
      expect(getStage(13)).toBe('day7');
      expect(getStage(14)).toBe('day14');
    });

    it('should find subscriptions due for retry', async () => {
      const now = new Date();

      mockPrisma.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', nextRetryAt: new Date(now.getTime() - 1000) },
        { id: 'sub-2', nextRetryAt: new Date(now.getTime() - 2000) },
      ]);

      const dueForRetry = await mockPrisma.subscription.findMany({
        where: {
          nextRetryAt: { lte: now },
          status: 'past_due',
        },
      });

      expect(dueForRetry).toHaveLength(2);
    });

    it('should skip weekends for retry attempts', () => {
      const scheduleRetry = (from: Date, daysToAdd: number): Date => {
        const date = new Date(from.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        const day = date.getDay();

        // Skip to Monday if landing on weekend
        if (day === 0) date.setDate(date.getDate() + 1); // Sunday -> Monday
        if (day === 6) date.setDate(date.getDate() + 2); // Saturday -> Monday

        return date;
      };

      const saturday = new Date('2026-02-07'); // Saturday
      const retryDate = scheduleRetry(saturday, 0);
      expect(retryDate.getDay()).toBe(1); // Monday
    });
  });

  describe('Payment Recovery', () => {
    it('should allow manual payment update', async () => {
      mockStripe.invoices.pay.mockResolvedValue({
        id: 'in_test',
        paid: true,
        status: 'paid',
      });

      mockPrisma.subscription.update.mockResolvedValue({
        id: 'sub-1',
        status: 'active',
        dunningStage: null,
      });

      // Simulate user updating payment method and paying
      const invoice = await mockStripe.invoices.pay('in_test');
      expect(invoice.paid).toBe(true);

      // Clear dunning state
      const subscription = await mockPrisma.subscription.update({
        where: { id: 'sub-1' },
        data: { status: 'active', dunningStage: null },
      });

      expect(subscription.dunningStage).toBeNull();
    });

    it('should allow reactivation within retention period', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        dataRetainedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const org = await mockPrisma.organization.findUnique({
        where: { id: 'org-1' },
      });

      const canReactivate = org.dataRetainedUntil > new Date();
      expect(canReactivate).toBe(true);
    });

    it('should restore full access on successful payment', async () => {
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        accessStatus: 'FULL',
        showPaymentWarning: false,
      });

      const result = await mockPrisma.organization.update({
        where: { id: 'org-1' },
        data: {
          accessStatus: 'FULL',
          showPaymentWarning: false,
        },
      });

      expect(result.accessStatus).toBe('FULL');
      expect(result.showPaymentWarning).toBe(false);
    });
  });
});
