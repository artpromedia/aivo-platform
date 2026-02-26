import { describe, it, expect, vi, beforeEach } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// Mocks
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  tenant: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  tenantAuditEvent: {
    create: vi.fn(),
  },
  tenantConfig: {
    updateMany: vi.fn(),
  },
};

import { TrialManagementService } from '../src/services/trial-management.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('TrialManagementService', () => {
  let service: TrialManagementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TrialManagementService({
      prisma: mockPrisma as any,
      trialDurationDays: 30,
      expiryWarningDays: 7,
      gracePeriodDays: 7,
    });
  });

  // ── getTrialInfo ──────────────────────────────────────────────────────

  describe('getTrialInfo', () => {
    it('should return trial info for an active trial', async () => {
      const trialEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-1',
        name: 'Test School',
        trialStatus: 'ACTIVE',
        trialEndsAt,
        planType: 'TRIAL',
      });

      const info = await service.getTrialInfo('t-1');
      expect(info.tenantId).toBe('t-1');
      expect(info.trialStatus).toBe('ACTIVE');
      expect(info.daysRemaining).toBeGreaterThanOrEqual(14);
      expect(info.canConvert).toBe(true);
      expect(info.features.maxLearners).toBe(500);
      expect(info.features.maxSchools).toBe(10);
    });

    it('should throw when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.getTrialInfo('bad-id')).rejects.toThrow('Tenant not found');
    });

    it('should detect grace period for expired trials', async () => {
      const trialEndsAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-2',
        name: 'Expired School',
        trialStatus: 'EXPIRED',
        trialEndsAt,
        planType: 'TRIAL',
      });

      const info = await service.getTrialInfo('t-2');
      expect(info.isInGracePeriod).toBe(true);
      expect(info.gracePeriodEndsAt).toBeDefined();
      expect(info.canConvert).toBe(true);
    });

    it('should show EXPIRING_SOON as convertible', async () => {
      const trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-3',
        name: 'Soon Expiring',
        trialStatus: 'EXPIRING_SOON',
        trialEndsAt,
        planType: 'TRIAL',
      });

      const info = await service.getTrialInfo('t-3');
      expect(info.trialStatus).toBe('EXPIRING_SOON');
      expect(info.canConvert).toBe(true);
    });

    it('should use FREE plan limits for free tenants', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-4',
        name: 'Free School',
        trialStatus: null,
        trialEndsAt: null,
        planType: 'FREE',
      });

      const info = await service.getTrialInfo('t-4');
      expect(info.features.maxLearners).toBe(25);
      expect(info.features.maxSchools).toBe(1);
      expect(info.features.storageGB).toBe(1);
    });
  });

  // ── convertToPaid ─────────────────────────────────────────────────────

  describe('convertToPaid', () => {
    it('should convert trial to paid (no Stripe)', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-1',
        name: 'Test',
        trialStatus: 'ACTIVE',
        planType: 'TRIAL',
      });
      mockPrisma.tenant.update.mockResolvedValue({ id: 't-1' });
      mockPrisma.tenantAuditEvent.create.mockResolvedValue({});

      const result = await service.convertToPaid('t-1', 'PROFESSIONAL');
      expect(result.success).toBe(true);
      expect(result.newPlanType).toBe('PROFESSIONAL');
    });

    it('should throw when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.convertToPaid('bad', 'STARTER')).rejects.toThrow('Tenant not found');
    });

    it('should return existing subscription if already converted', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-1',
        trialStatus: 'CONVERTED',
        planType: 'PROFESSIONAL',
        stripeSubscriptionId: 'sub_existing',
      });

      const result = await service.convertToPaid('t-1', 'STARTER');
      expect(result.success).toBe(true);
      expect(result.stripeSubscriptionId).toBe('sub_existing');
    });
  });

  // ── processTrialExpirations ───────────────────────────────────────────

  describe('processTrialExpirations', () => {
    it('should warn, expire, and downgrade trials', async () => {
      // Expiring soon — 2 tenants
      mockPrisma.tenant.findMany
        .mockResolvedValueOnce([
          { id: 'warn-1', trialEndsAt: new Date(Date.now() + 3 * 86400000) },
          { id: 'warn-2', trialEndsAt: new Date(Date.now() + 5 * 86400000) },
        ])
        // Expired — 1 tenant
        .mockResolvedValueOnce([
          { id: 'exp-1' },
        ])
        // Past grace — 1 tenant
        .mockResolvedValueOnce([
          { id: 'down-1', planType: 'TRIAL' },
        ]);

      mockPrisma.tenant.update.mockResolvedValue({});
      mockPrisma.tenantAuditEvent.create.mockResolvedValue({});
      mockPrisma.tenantConfig.updateMany.mockResolvedValue({});

      const result = await service.processTrialExpirations();
      expect(result.warned).toBe(2);
      expect(result.expired).toBe(1);
      expect(result.downgraded).toBe(1);
    });

    it('should handle empty results gracefully', async () => {
      mockPrisma.tenant.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.processTrialExpirations();
      expect(result).toEqual({ warned: 0, expired: 0, downgraded: 0 });
    });
  });

  // ── extendTrial ───────────────────────────────────────────────────────

  describe('extendTrial', () => {
    it('should extend trial by N days', async () => {
      const trialEndsAt = new Date(Date.now() + 5 * 86400000);
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-1',
        name: 'Ext School',
        trialStatus: 'EXPIRING_SOON',
        trialEndsAt,
        planType: 'TRIAL',
      });
      mockPrisma.tenant.update.mockResolvedValue({});
      mockPrisma.tenantAuditEvent.create.mockResolvedValue({});

      // Mock getTrialInfo call after extension
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-1',
        name: 'Ext School',
        trialStatus: 'ACTIVE',
        trialEndsAt: new Date(trialEndsAt.getTime() + 14 * 86400000),
        planType: 'TRIAL',
      });

      const info = await service.extendTrial('t-1', 14, 'Sales negotiation');
      expect(info.trialStatus).toBe('ACTIVE');
      expect(info.daysRemaining).toBeGreaterThanOrEqual(18);
    });

    it('should throw for unknown tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.extendTrial('bad', 7)).rejects.toThrow('Tenant not found');
    });
  });
});
