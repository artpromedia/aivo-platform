/**
 * Usage Tracking Service Tests
 *
 * Tests for event-driven usage counters:
 * - Increment / decrement / set / get operations
 * - Monthly counter resets
 * - Seat reconciliation
 * - Period expiry detection
 * - Floor-at-zero guarantee
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  UsageTrackingService,
  MONTHLY_COUNTERS,
  LIMIT_TO_COUNTER,
} from '../src/services/usage-tracking.service.js';
import { prisma } from '../src/prisma.js';

// ============================================================================
// Mock Prisma
// ============================================================================

vi.mock('../src/prisma.js', () => ({
  prisma: {
    usageCounter: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

// ============================================================================
// Helpers
// ============================================================================

const TENANT = 'tenant-t1';

function counterRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'uc-1',
    tenantId: TENANT,
    counterType: 'learners',
    currentValue: 5,
    periodStart: null,
    periodEnd: null,
    reconciledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('UsageTrackingService', () => {
  let service: UsageTrackingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsageTrackingService();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // increment
  // ──────────────────────────────────────────────────────────────────────────

  describe('increment', () => {
    it('should upsert and return new value', async () => {
      vi.mocked(prisma.usageCounter.upsert).mockResolvedValue(counterRow({ currentValue: 6 }) as any);

      const result = await service.increment(TENANT, 'learners');

      expect(prisma.usageCounter.upsert).toHaveBeenCalledOnce();
      expect(result).toBe(6);
    });

    it('should accept a custom delta', async () => {
      vi.mocked(prisma.usageCounter.upsert).mockResolvedValue(counterRow({ currentValue: 15 }) as any);

      const result = await service.increment(TENANT, 'sessionsThisMonth', 10);

      expect(result).toBe(15);
      const call = vi.mocked(prisma.usageCounter.upsert).mock.calls[0]![0];
      expect(call.update).toEqual(expect.objectContaining({ currentValue: { increment: 10 } }));
    });

    it('should forward period when provided', async () => {
      vi.mocked(prisma.usageCounter.upsert).mockResolvedValue(counterRow({ currentValue: 1 }) as any);

      const start = new Date('2026-01-01');
      const end = new Date('2026-02-01');
      await service.increment(TENANT, 'apiCallsThisMonth', 1, { start, end });

      const call = vi.mocked(prisma.usageCounter.upsert).mock.calls[0]![0];
      expect(call.create.periodStart).toEqual(start);
      expect(call.create.periodEnd).toEqual(end);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // decrement
  // ──────────────────────────────────────────────────────────────────────────

  describe('decrement', () => {
    it('should return new value from raw query', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ current_value: 4 }] as any);

      const result = await service.decrement(TENANT, 'learners');

      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
      expect(result).toBe(4);
    });

    it('should return 0 when result is empty', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([] as any);

      const result = await service.decrement(TENANT, 'teachers');

      expect(result).toBe(0);
    });

    it('should accept a custom delta', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ current_value: 0 }] as any);

      const result = await service.decrement(TENANT, 'admins', 5);

      expect(result).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // set
  // ──────────────────────────────────────────────────────────────────────────

  describe('set', () => {
    it('should upsert with absolute value and reconcile timestamp', async () => {
      vi.mocked(prisma.usageCounter.upsert).mockResolvedValue(counterRow({ currentValue: 10 }) as any);

      await service.set(TENANT, 'contentItems', 10);

      const call = vi.mocked(prisma.usageCounter.upsert).mock.calls[0]![0];
      expect(call.create.currentValue).toBe(10);
      expect(call.update.currentValue).toBe(10);
      expect(call.update.reconciledAt).toBeInstanceOf(Date);
    });

    it('should floor negative values to 0', async () => {
      vi.mocked(prisma.usageCounter.upsert).mockResolvedValue(counterRow({ currentValue: 0 }) as any);

      await service.set(TENANT, 'assessments', -5);

      const call = vi.mocked(prisma.usageCounter.upsert).mock.calls[0]![0];
      expect(call.create.currentValue).toBe(0);
      expect(call.update.currentValue).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // get
  // ──────────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should return currentValue when row exists', async () => {
      vi.mocked(prisma.usageCounter.findUnique).mockResolvedValue(counterRow({ currentValue: 42 }) as any);

      const result = await service.get(TENANT, 'storageBytes');

      expect(result).toBe(42);
    });

    it('should return 0 when no row exists', async () => {
      vi.mocked(prisma.usageCounter.findUnique).mockResolvedValue(null);

      const result = await service.get(TENANT, 'learners');

      expect(result).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getAllCounters
  // ──────────────────────────────────────────────────────────────────────────

  describe('getAllCounters', () => {
    it('should return all counters for a tenant', async () => {
      vi.mocked(prisma.usageCounter.findMany).mockResolvedValue([
        counterRow({ counterType: 'learners', currentValue: 3 }),
        counterRow({ counterType: 'teachers', currentValue: 1 }),
      ] as any);

      const summary = await service.getAllCounters(TENANT);

      expect(summary.tenantId).toBe(TENANT);
      expect(summary.counters).toHaveLength(2);
      expect(summary.counters[0]!.counterType).toBe('learners');
      expect(summary.counters[0]!.currentValue).toBe(3);
    });

    it('should return empty array for unknown tenant', async () => {
      vi.mocked(prisma.usageCounter.findMany).mockResolvedValue([]);

      const summary = await service.getAllCounters('unknown');

      expect(summary.counters).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // resetMonthlyCounters
  // ──────────────────────────────────────────────────────────────────────────

  describe('resetMonthlyCounters', () => {
    it('should update monthly counters to 0 with new period', async () => {
      vi.mocked(prisma.usageCounter.updateMany).mockResolvedValue({ count: 2 });

      const start = new Date('2026-02-01');
      const end = new Date('2026-03-01');
      await service.resetMonthlyCounters(TENANT, { start, end });

      expect(prisma.usageCounter.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT,
          counterType: { in: [...MONTHLY_COUNTERS] },
        },
        data: {
          currentValue: 0,
          periodStart: start,
          periodEnd: end,
        },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // resetExpiredPeriods
  // ──────────────────────────────────────────────────────────────────────────

  describe('resetExpiredPeriods', () => {
    it('should reset counters with expired periods', async () => {
      vi.mocked(prisma.usageCounter.updateMany).mockResolvedValue({ count: 5 });

      const result = await service.resetExpiredPeriods();

      expect(result).toBe(5);
      expect(prisma.usageCounter.updateMany).toHaveBeenCalledOnce();
    });

    it('should return 0 when no counters expired', async () => {
      vi.mocked(prisma.usageCounter.updateMany).mockResolvedValue({ count: 0 });

      const result = await service.resetExpiredPeriods();

      expect(result).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // reconcileSeats
  // ──────────────────────────────────────────────────────────────────────────

  describe('reconcileSeats', () => {
    it('should set all three seat counters', async () => {
      vi.mocked(prisma.usageCounter.upsert).mockResolvedValue(counterRow() as any);

      await service.reconcileSeats(TENANT, { learners: 10, teachers: 3, admins: 1 });

      expect(prisma.usageCounter.upsert).toHaveBeenCalledTimes(3);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // LIMIT_TO_COUNTER mapping
  // ──────────────────────────────────────────────────────────────────────────

  describe('LIMIT_TO_COUNTER', () => {
    it('should map sessionsPerMonth → sessionsThisMonth', () => {
      expect(LIMIT_TO_COUNTER['sessionsPerMonth']).toBe('sessionsThisMonth');
    });

    it('should map contentItems → contentItems', () => {
      expect(LIMIT_TO_COUNTER['contentItems']).toBe('contentItems');
    });

    it('should map assessments → assessments', () => {
      expect(LIMIT_TO_COUNTER['assessments']).toBe('assessments');
    });

    it('should map storageGb → storageBytes', () => {
      expect(LIMIT_TO_COUNTER['storageGb']).toBe('storageBytes');
    });

    it('should map apiCallsPerMonth → apiCallsThisMonth', () => {
      expect(LIMIT_TO_COUNTER['apiCallsPerMonth']).toBe('apiCallsThisMonth');
    });

    it('should not have a mapping for dataRetentionDays', () => {
      expect(LIMIT_TO_COUNTER['dataRetentionDays']).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // MONTHLY_COUNTERS
  // ──────────────────────────────────────────────────────────────────────────

  describe('MONTHLY_COUNTERS', () => {
    it('should include sessionsThisMonth and apiCallsThisMonth', () => {
      expect(MONTHLY_COUNTERS).toContain('sessionsThisMonth');
      expect(MONTHLY_COUNTERS).toContain('apiCallsThisMonth');
    });

    it('should NOT include seat counters', () => {
      expect(MONTHLY_COUNTERS).not.toContain('learners');
      expect(MONTHLY_COUNTERS).not.toContain('teachers');
      expect(MONTHLY_COUNTERS).not.toContain('admins');
    });
  });
});
