import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Full usage record template matching mapToUsageData requirements ──────────
const now = new Date();

function makeUsageRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u-1',
    tenantId: 'ten-1',
    usageDate: now,
    llmCallCount: 0,
    llmTokensUsed: 0,          // number → BigInt via mapToUsageData
    llmCostCents: 0,
    tutorTurnCount: 0,
    sessionCount: 0,
    activeUsers: 0,
    storageUsedMB: 0,
    filesUploaded: 0,
    llmQuotaReached: false,
    tutorQuotaReached: false,
    quotaWarningAt: null,
    quotaBlockedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = {
  tenantUsage: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  tenant: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  tenantConfig: {
    findUnique: vi.fn(),
  },
};

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  incrby: vi.fn(),
  pipeline: vi.fn(() => ({
    incr: vi.fn().mockReturnThis(),
    incrby: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  })),
};

async function createService(overrides: Record<string, unknown> = {}) {
  const { TenantUsageService } = await import('../src/services/tenant-usage.service');
  return new TenantUsageService({
    prisma: mockPrisma as any,
    redis: mockRedis as any,
    ...overrides,
  } as any);
}

const TENANT_ID = 'ten-1';

const LIMITS = {
  dailyLLMCallLimit: 1000,
  dailyTutorTurnLimit: 500,
  storageQuotaGB: 10,
};

describe('TenantUsageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);   // bypass cache, hit DB
  });

  // ── getTodayUsage ─────────────────────────────────────────────────────────
  describe('getTodayUsage', () => {
    it('returns existing usage record for today', async () => {
      const record = makeUsageRecord({ llmCallCount: 100, tutorTurnCount: 50 });
      mockPrisma.tenantUsage.upsert.mockResolvedValue(record);

      const svc = await createService();
      const result = await svc.getTodayUsage(TENANT_ID);

      expect(result).toBeDefined();
      expect(result.llmCallCount).toBe(100);
      expect(result.tutorTurnCount).toBe(50);
    });

    it('returns zero counts when no prior usage today', async () => {
      mockPrisma.tenantUsage.upsert.mockResolvedValue(makeUsageRecord());

      const svc = await createService();
      const result = await svc.getTodayUsage(TENANT_ID);

      expect(result.llmCallCount).toBe(0);
      expect(result.tutorTurnCount).toBe(0);
    });
  });

  // ── incrementUsage ────────────────────────────────────────────────────────
  describe('incrementUsage', () => {
    it('increments specified fields', async () => {
      mockPrisma.tenantUsage.upsert.mockResolvedValue(
        makeUsageRecord({ llmCallCount: 5 }),
      );

      const svc = await createService();
      const result = await svc.incrementUsage(TENANT_ID, { llmCalls: 5 });

      expect(result).toBeDefined();
      expect(result.llmCallCount).toBe(5);
      expect(mockPrisma.tenantUsage.upsert).toHaveBeenCalled();
    });
  });

  // ── recordLLMCall ─────────────────────────────────────────────────────────
  describe('recordLLMCall', () => {
    it('records call and returns allowed when under quota', async () => {
      mockPrisma.tenantUsage.upsert.mockResolvedValue(
        makeUsageRecord({ llmCallCount: 100 }),
      );

      const svc = await createService();
      const result = await svc.recordLLMCall(TENANT_ID, 500, 2, LIMITS);

      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(100);
    });

    it('denies call when at quota limit', async () => {
      mockPrisma.tenantUsage.upsert.mockResolvedValue(
        makeUsageRecord({ llmCallCount: 1000, llmQuotaReached: true }),
      );

      const svc = await createService();
      const result = await svc.recordLLMCall(TENANT_ID, 500, 2, LIMITS);

      expect(result.allowed).toBe(false);
    });
  });

  // ── recordTutorTurn ───────────────────────────────────────────────────────
  describe('recordTutorTurn', () => {
    it('records turn and returns allowed when under quota', async () => {
      mockPrisma.tenantUsage.upsert.mockResolvedValue(
        makeUsageRecord({ tutorTurnCount: 50 }),
      );

      const svc = await createService();
      const result = await svc.recordTutorTurn(TENANT_ID, LIMITS);

      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
    });

    it('denies turn when at quota limit', async () => {
      mockPrisma.tenantUsage.upsert.mockResolvedValue(
        makeUsageRecord({ tutorTurnCount: 500, tutorQuotaReached: true }),
      );

      const svc = await createService();
      const result = await svc.recordTutorTurn(TENANT_ID, LIMITS);

      expect(result.allowed).toBe(false);
    });
  });

  // ── checkLLMQuota ─────────────────────────────────────────────────────────
  describe('checkLLMQuota', () => {
    it('returns allowed when under quota', async () => {
      mockPrisma.tenantUsage.upsert.mockResolvedValue(
        makeUsageRecord({ llmCallCount: 500 }),
      );

      const svc = await createService();
      const check = await svc.checkLLMQuota(TENANT_ID, LIMITS);

      expect(check.allowed).toBe(true);
      expect(check.currentUsage).toBe(500);
      expect(check.limit).toBe(1000);
      expect(check.usagePercent).toBe(0.5);
    });

    it('returns denied when at or over quota', async () => {
      mockPrisma.tenantUsage.upsert.mockResolvedValue(
        makeUsageRecord({ llmCallCount: 1000, llmQuotaReached: true }),
      );

      const svc = await createService();
      const check = await svc.checkLLMQuota(TENANT_ID, LIMITS);

      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('limit reached');
    });

    it('allows unlimited when limit is 0', async () => {
      const svc = await createService();
      const check = await svc.checkLLMQuota(TENANT_ID, {
        ...LIMITS,
        dailyLLMCallLimit: 0,
      });

      expect(check.allowed).toBe(true);
      expect(check.limit).toBe(0);
    });
  });

  // ── checkTutorQuota ───────────────────────────────────────────────────────
  describe('checkTutorQuota', () => {
    it('returns allowed when under tutor turn limit', async () => {
      mockPrisma.tenantUsage.upsert.mockResolvedValue(
        makeUsageRecord({ tutorTurnCount: 200 }),
      );

      const svc = await createService();
      const check = await svc.checkTutorQuota(TENANT_ID, LIMITS);

      expect(check.allowed).toBe(true);
      expect(check.currentUsage).toBe(200);
      expect(check.limit).toBe(500);
    });

    it('allows unlimited when limit is 0', async () => {
      const svc = await createService();
      const check = await svc.checkTutorQuota(TENANT_ID, {
        ...LIMITS,
        dailyTutorTurnLimit: 0,
      });

      expect(check.allowed).toBe(true);
    });
  });

  // ── checkStorageQuota ─────────────────────────────────────────────────────
  describe('checkStorageQuota', () => {
    it('returns allowed when under storage limit', async () => {
      mockPrisma.tenantUsage.upsert.mockResolvedValue(
        makeUsageRecord({ storageUsedMB: 500 }),
      );

      const svc = await createService();
      const check = await svc.checkStorageQuota(TENANT_ID, LIMITS);

      expect(check.allowed).toBe(true);
      // 10 GB = 10240 MB; 500/10240 ≈ 0.0488
      expect(check.currentUsage).toBe(500);
      expect(check.limit).toBe(10240);
    });

    it('denies when storage exceeds limit', async () => {
      mockPrisma.tenantUsage.upsert.mockResolvedValue(
        makeUsageRecord({ storageUsedMB: 11_000 }),
      );

      const svc = await createService();
      const check = await svc.checkStorageQuota(TENANT_ID, LIMITS);

      expect(check.allowed).toBe(false);
    });

    it('allows unlimited when limit is 0', async () => {
      const svc = await createService();
      const check = await svc.checkStorageQuota(TENANT_ID, {
        ...LIMITS,
        storageQuotaGB: 0,
      });

      expect(check.allowed).toBe(true);
    });
  });

  // ── getUsageHistory ───────────────────────────────────────────────────────
  describe('getUsageHistory', () => {
    it('returns usage records for date range', async () => {
      const records = [
        makeUsageRecord({ id: 'u-h1', usageDate: new Date('2025-01-01'), llmCallCount: 10 }),
        makeUsageRecord({ id: 'u-h2', usageDate: new Date('2025-01-02'), llmCallCount: 20 }),
      ];
      mockPrisma.tenantUsage.findMany.mockResolvedValue(records);

      const svc = await createService();
      const result = await svc.getUsageHistory(
        TENANT_ID,
        new Date('2025-01-01'),
        new Date('2025-01-02'),
      );

      expect(result).toHaveLength(2);
      expect(result[0].llmCallCount).toBe(10);
      expect(result[1].llmCallCount).toBe(20);
    });

    it('returns empty array when no records exist', async () => {
      mockPrisma.tenantUsage.findMany.mockResolvedValue([]);

      const svc = await createService();
      const result = await svc.getUsageHistory(
        TENANT_ID,
        new Date('2025-01-01'),
        new Date('2025-01-02'),
      );

      expect(result).toHaveLength(0);
    });
  });

  // ── getAggregatedUsage ────────────────────────────────────────────────────
  describe('getAggregatedUsage', () => {
    it('returns aggregated totals over a date range', async () => {
      const records = [
        makeUsageRecord({
          id: 'u-a1',
          llmCallCount: 600,
          llmTokensUsed: 5000,
          llmCostCents: 250,
          tutorTurnCount: 200,
          sessionCount: 10,
          activeUsers: 10,
          storageUsedMB: 100,
          filesUploaded: 5,
        }),
        makeUsageRecord({
          id: 'u-a2',
          llmCallCount: 400,
          llmTokensUsed: 3000,
          llmCostCents: 150,
          tutorTurnCount: 300,
          sessionCount: 15,
          activeUsers: 15,
          storageUsedMB: 200,
          filesUploaded: 3,
        }),
      ];
      mockPrisma.tenantUsage.findMany.mockResolvedValue(records);

      const svc = await createService();
      const result = await svc.getAggregatedUsage(
        TENANT_ID,
        new Date('2025-01-01'),
        new Date('2025-01-02'),
      );

      expect(result.totalLLMCalls).toBe(1000);
      expect(result.totalLLMTokens).toBe(BigInt(8000));
      expect(result.totalLLMCostCents).toBe(400);
      expect(result.totalTutorTurns).toBe(500);
      expect(result.totalSessions).toBe(25);
      expect(result.peakActiveUsers).toBe(15);
      expect(result.totalFilesUploaded).toBe(8);
    });

    it('returns zeros for empty history', async () => {
      mockPrisma.tenantUsage.findMany.mockResolvedValue([]);

      const svc = await createService();
      const result = await svc.getAggregatedUsage(
        TENANT_ID,
        new Date('2025-01-01'),
        new Date('2025-01-02'),
      );

      expect(result.totalLLMCalls).toBe(0);
      expect(result.totalTutorTurns).toBe(0);
    });
  });
});
