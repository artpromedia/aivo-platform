/**
 * AIVO IEP Service — Compliance Cron & Notifications Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mockPrisma, resetMocks, testData } from './setup.js';

// ────────────────────────────────────────────────────────────────────────────
// Mock node-cron  (vi.hoisted ensures the vars exist when the factory runs)
// ────────────────────────────────────────────────────────────────────────────
const { mockSchedule, mockValidate } = vi.hoisted(() => ({
  mockSchedule: vi.fn().mockReturnValue({ stop: vi.fn() }),
  mockValidate: vi.fn().mockReturnValue(true),
}));

vi.mock('node-cron', () => ({
  default: {
    schedule: mockSchedule,
    validate: mockValidate,
  },
}));

// ────────────────────────────────────────────────────────────────────────────
// Mock global fetch (for notify-svc calls)
// ────────────────────────────────────────────────────────────────────────────
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));
vi.stubGlobal('fetch', mockFetch);

// ────────────────────────────────────────────────────────────────────────────
// Mock iepService.checkCompliance
// ────────────────────────────────────────────────────────────────────────────
const { mockCheckComplianceFn } = vi.hoisted(() => ({
  mockCheckComplianceFn: vi.fn(),
}));

vi.mock('../services/iepService.js', () => ({
  checkCompliance: mockCheckComplianceFn,
  getComplianceAlerts: vi.fn(),
}));

// ────────────────────────────────────────────────────────────────────────────
// Import subjects under test (AFTER mocks are in place)
// ────────────────────────────────────────────────────────────────────────────
import {
  ComplianceCronScheduler,
  setComplianceCronScheduler,
  getComplianceCronScheduler,
} from '../services/compliance-cron.js';

import {
  sendComplianceNotifications,
  sendWeeklySummary,
} from '../services/compliance-notifications.js';
import { config } from '../config.js';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
const noopLogger: any = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => noopLogger,
};

function makeAlert(overrides: Record<string, unknown> = {}) {
  return {
    alertType: 'ANNUAL_REVIEW_DUE',
    severity: 'Medium',
    studentId: testData.student.id,
    iepId: testData.iep.id,
    description: 'Annual review due in 25 days',
    dueDate: new Date('2025-02-15'),
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ComplianceCronScheduler
// ════════════════════════════════════════════════════════════════════════════
describe('ComplianceCronScheduler', () => {
  let scheduler: ComplianceCronScheduler;

  beforeEach(() => {
    resetMocks();
    mockSchedule.mockClear();
    mockValidate.mockClear();
    mockValidate.mockReturnValue(true);
    mockFetch.mockReset();
    scheduler = new ComplianceCronScheduler(noopLogger);
  });

  afterEach(() => {
    scheduler.shutdown();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────
  describe('initialize / shutdown', () => {
    it('should schedule daily and weekly cron tasks', () => {
      scheduler.initialize();

      expect(mockValidate).toHaveBeenCalledTimes(2);
      expect(mockSchedule).toHaveBeenCalledTimes(2);

      // first call = daily, second = weekly
      expect(mockSchedule.mock.calls[0][0]).toBe('0 6 * * *');
      expect(mockSchedule.mock.calls[1][0]).toBe('0 6 * * 1');
    });

    it('should not double-initialise', () => {
      scheduler.initialize();
      scheduler.initialize(); // second call is a no-op

      expect(mockSchedule).toHaveBeenCalledTimes(2); // still only 2
    });

    it('should reject invalid cron expressions', () => {
      mockValidate.mockReturnValue(false);
      scheduler.initialize();

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('should stop tasks on shutdown', () => {
      const stopFn = vi.fn();
      mockSchedule.mockReturnValue({ stop: stopFn });

      scheduler.initialize();
      scheduler.shutdown();

      expect(stopFn).toHaveBeenCalledTimes(2);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Daily check
  // ──────────────────────────────────────────────────────────────────────
  describe('runDailyCheck', () => {
    it('should fetch distinct tenant IDs and run checkCompliance for each', async () => {
      mockPrisma.iEP.findMany.mockResolvedValue([
        { tenantId: 'tenant-A' },
        { tenantId: 'tenant-B' },
      ]);
      mockCheckComplianceFn.mockResolvedValue([]);
      // Mock fetch for notifications - won't be called but be safe
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      const result = await scheduler.runDailyCheck();

      expect(result.tenantCount).toBe(2);
      expect(mockCheckComplianceFn).toHaveBeenCalledWith('tenant-A');
      expect(mockCheckComplianceFn).toHaveBeenCalledWith('tenant-B');
    });

    it('should accumulate alert counts from all tenants', async () => {
      mockPrisma.iEP.findMany.mockResolvedValue([{ tenantId: 'tenant-A' }]);
      mockCheckComplianceFn.mockResolvedValue([makeAlert(), makeAlert()]);
      // Mock IEP lookup for notification emails
      mockPrisma.iEP.findUnique.mockResolvedValue({ createdBy: 'admin@district.edu' });
      mockFetch.mockResolvedValue({ ok: true, text: async () => '{}' });

      const result = await scheduler.runDailyCheck();

      expect(result.totalAlerts).toBe(2);
    });

    it('should isolate per-tenant errors without stopping the run', async () => {
      mockPrisma.iEP.findMany.mockResolvedValue([
        { tenantId: 'tenant-OK' },
        { tenantId: 'tenant-FAIL' },
      ]);
      mockCheckComplianceFn
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('DB timeout'));

      const result = await scheduler.runDailyCheck();

      expect(result.tenantCount).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('tenant-FAIL');
    });

    it('should skip when a previous run is still in progress', async () => {
      // Simulate a long-running check
      mockPrisma.iEP.findMany.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([{ tenantId: 'x' }]), 200))
      );
      mockCheckComplianceFn.mockResolvedValue([]);

      const first = scheduler.runDailyCheck();
      const second = await scheduler.runDailyCheck(); // immediate second call

      expect(second.errors).toContain('Skipped — previous run still in progress');

      await first; // let the first one finish
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Singleton accessor
  // ──────────────────────────────────────────────────────────────────────
  describe('singleton accessor', () => {
    it('should return null before set', () => {
      setComplianceCronScheduler(null as any);
      expect(getComplianceCronScheduler()).toBeNull();
    });

    it('should return the scheduler after set', () => {
      setComplianceCronScheduler(scheduler);
      expect(getComplianceCronScheduler()).toBe(scheduler);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Notification delivery
// ════════════════════════════════════════════════════════════════════════════
describe('Compliance Notifications', () => {
  beforeEach(() => {
    resetMocks();
    mockFetch.mockReset();
    // Enable notifications for tests (config is read at import time)
    config.notifications.enabled = true;
    // Default: IEP createdBy is an email address
    mockPrisma.iEP.findUnique.mockResolvedValue({ createdBy: 'teacher@school.edu' });
  });

  afterEach(() => {
    config.notifications.enabled = false;
  });

  describe('sendComplianceNotifications', () => {
    it('should send an email for each alert', async () => {
      mockFetch.mockResolvedValue({ ok: true, text: async () => '{}' });

      const alerts = [makeAlert(), makeAlert({ alertType: 'REEVALUATION_DUE' })];
      const { sent, failed } = await sendComplianceNotifications(
        testData.tenantId,
        alerts,
        noopLogger
      );

      expect(sent).toBe(2);
      expect(failed).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should escalate overdue alerts to district admin', async () => {
      mockFetch.mockResolvedValue({ ok: true, text: async () => '{}' });

      const alerts = [makeAlert({ alertType: 'ANNUAL_REVIEW_OVERDUE', severity: 'Critical' })];
      const { sent } = await sendComplianceNotifications(testData.tenantId, alerts, noopLogger);

      // 1 case-manager email + 1 escalation email
      expect(sent).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should record failures when notify-svc returns non-OK', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const alerts = [makeAlert()];
      const { sent, failed } = await sendComplianceNotifications(
        testData.tenantId,
        alerts,
        noopLogger
      );

      expect(sent).toBe(0);
      expect(failed).toBe(1);
    });

    it('should skip emails when notifications are disabled', async () => {
      config.notifications.enabled = false;

      const alerts = [makeAlert()];
      const { sent, failed } = await sendComplianceNotifications(
        testData.tenantId,
        alerts,
        noopLogger
      );

      // When disabled, sendEmail returns false, so failed++
      expect(sent).toBe(0);
    });

    it('should fall back to district admin when createdBy is not an email', async () => {
      mockPrisma.iEP.findUnique.mockResolvedValue({ createdBy: 'user-uuid-123' });
      mockFetch.mockResolvedValue({ ok: true, text: async () => '{}' });

      const alerts = [makeAlert()];
      await sendComplianceNotifications(testData.tenantId, alerts, noopLogger);

      // Should have used the district admin email
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.to).toBe('admin@district.edu');
    });
  });

  describe('sendWeeklySummary', () => {
    it('should query active IEPs and open alerts and send a summary email', async () => {
      mockPrisma.iEP.count.mockResolvedValue(10);
      mockPrisma.complianceAlert.findMany.mockResolvedValue([
        {
          alertType: 'ANNUAL_REVIEW_OVERDUE',
          severity: 'Critical',
          description: 'Overdue IEP',
          dueDate: new Date('2024-12-01'),
          iepId: testData.iep.id,
          status: 'OPEN',
        },
        {
          alertType: 'ANNUAL_REVIEW_DUE',
          severity: 'Medium',
          description: 'Upcoming review',
          dueDate: new Date('2026-06-01'),
          iepId: testData.iep.id,
          status: 'OPEN',
        },
      ]);
      mockPrisma.iEP.findUnique.mockResolvedValue({ createdBy: 'mgr@school.edu' });
      mockFetch.mockResolvedValue({ ok: true, text: async () => '{}' });

      const result = await sendWeeklySummary(testData.tenantId, noopLogger);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.templateName).toBe('compliance-weekly-summary');
      expect(body.context.totalActiveIEPs).toBe(10);
      expect(body.context.overdueCount).toBe(1);
    });
  });
});
