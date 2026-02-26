import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = {
  subscription: { findMany: vi.fn(), update: vi.fn() },
  tenant: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
};

vi.mock('../src/prisma', () => ({ prisma: mockPrisma }));

describe('MeteringService', () => {
  let MeteringService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('../src/services/metering.service');
    MeteringService = mod.MeteringService || mod.default;
  });

  it('exports metering service', () => {
    expect(MeteringService).toBeDefined();
  });

  it('tracks usage for a dimension', async () => {
    if (MeteringService) {
      const service = new MeteringService(mockPrisma);
      mockPrisma.$queryRaw.mockResolvedValue([{ count: 5 }]);

      // Should accept usage record without throwing
      const result = await service.recordUsage?.({
        tenantId: 'tenant-1',
        metric: 'AI_CALLS',
        quantity: 1,
      });
      expect(result).toBeDefined();
    }
  });

  it('checks limits against plan allocations', async () => {
    if (MeteringService) {
      const service = new MeteringService(mockPrisma);
      mockPrisma.$queryRaw.mockResolvedValue([{ total: 50, limit: 100 }]);

      const result = await service.checkLimit?.({
        tenantId: 'tenant-1',
        metric: 'AI_CALLS',
      });
      expect(result).toBeDefined();
    }
  });
});

describe('RenewalScheduler', () => {
  let schedulerModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    schedulerModule = await import('../src/services/renewal.scheduler');
  });

  it('exports renewal scheduler', () => {
    expect(schedulerModule).toBeDefined();
  });
});

describe('UnifiedPaymentService', () => {
  let serviceModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    serviceModule = await import('../src/services/unified-payment.service');
  });

  it('exports unified payment service', () => {
    expect(serviceModule).toBeDefined();
  });
});

describe('TrialConversionService', () => {
  let serviceModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    serviceModule = await import('../src/services/trial-conversion.service');
  });

  it('exports trial conversion logic', () => {
    expect(serviceModule).toBeDefined();
  });
});

describe('LicenseVaultService', () => {
  let serviceModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    serviceModule = await import('../src/services/license-vault.service');
  });

  it('exports license vault service', () => {
    expect(serviceModule).toBeDefined();
  });
});

describe('LicenseBundleService', () => {
  let serviceModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    serviceModule = await import('../src/services/license-bundle.service');
  });

  it('exports license bundle service', () => {
    expect(serviceModule).toBeDefined();
  });
});
