import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('DataResidencyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports DataResidencyService class', async () => {
    const mod = await import('../src/services/data-residency.service');
    expect(mod.DataResidencyService).toBeDefined();
  });

  describe('resolveRegion', () => {
    it('returns the tenant configured region', async () => {
      const mockDb = {
        tenant: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ten-1',
            dataRegion: 'eu-west-1',
          }),
        },
      };
      const { DataResidencyService } = await import('../src/services/data-residency.service');
      const svc = new DataResidencyService(mockDb);
      const result = await svc.resolveRegion('ten-1');
      expect(result.region).toBe('eu-west-1');
      expect(result.apiEndpoint).toBeDefined();
      expect(result.storageEndpoint).toBeDefined();
    });

    it('returns us-east-1 for tenant with us-east-1 region', async () => {
      const mockDb = {
        tenant: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'ten-2',
            dataRegion: 'us-east-1',
          }),
        },
      };
      const { DataResidencyService } = await import('../src/services/data-residency.service');
      const svc = new DataResidencyService(mockDb);
      const result = await svc.resolveRegion('ten-2');
      expect(result.region).toBe('us-east-1');
    });
  });

  describe('static isValidRegion', () => {
    it('validates known regions', async () => {
      const { DataResidencyService } = await import('../src/services/data-residency.service');
      expect(DataResidencyService.isValidRegion('us-east-1')).toBe(true);
      expect(DataResidencyService.isValidRegion('eu-west-1')).toBe(true);
      expect(DataResidencyService.isValidRegion('ap-southeast-1')).toBe(true);
    });

    it('rejects invalid regions', async () => {
      const { DataResidencyService } = await import('../src/services/data-residency.service');
      expect(DataResidencyService.isValidRegion('moon-1')).toBe(false);
      expect(DataResidencyService.isValidRegion('')).toBe(false);
    });
  });

  describe('static suggestRegion', () => {
    it('suggests US region for US country code', async () => {
      const { DataResidencyService } = await import('../src/services/data-residency.service');
      const region = DataResidencyService.suggestRegion('US');
      expect(region).toMatch(/^us-/);
    });

    it('suggests EU region for European country codes', async () => {
      const { DataResidencyService } = await import('../src/services/data-residency.service');
      const region = DataResidencyService.suggestRegion('DE');
      expect(region).toMatch(/^eu-/);
    });

    it('suggests AP region for Asia-Pacific country codes', async () => {
      const { DataResidencyService } = await import('../src/services/data-residency.service');
      const region = DataResidencyService.suggestRegion('SG');
      expect(region).toMatch(/^ap-/);
    });
  });

  describe('enforceResidency', () => {
    it('exports enforceResidency preHandler hook', async () => {
      const { DataResidencyService } = await import('../src/services/data-residency.service');
      const mockDb = { tenant: { findUnique: vi.fn() } };
      const svc = new DataResidencyService(mockDb);
      expect(typeof svc.enforceResidency).toBe('function');
    });
  });
});

describe('TenantConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports TenantConfigService class', async () => {
    const mod = await import('../src/services/tenant-config.service');
    expect(mod.TenantConfigService).toBeDefined();
  });

  describe('getTenantConfig', () => {
    it('returns cached config when available', async () => {
      const mockPrisma = {
        tenantConfig: {
          findUnique: vi.fn().mockResolvedValue({
            tenantId: 'ten-1',
            aiEnabled: true,
            llmDailyLimit: 1000,
          }),
        },
      };
      const mockRedis = {
        get: vi.fn().mockResolvedValue(
          JSON.stringify({ tenantId: 'ten-1', aiEnabled: true }),
        ),
        setex: vi.fn(),
      };

      const { TenantConfigService } = await import('../src/services/tenant-config.service');
      const svc = new TenantConfigService({ prisma: mockPrisma, redis: mockRedis });
      const config = await svc.getTenantConfig('ten-1');
      expect(config).toBeDefined();
    });
  });

  describe('isFeatureEnabled', () => {
    it('checks feature flag status', async () => {
      const mockPrisma = {
        tenantConfig: {
          findUnique: vi.fn().mockResolvedValue({
            tenantId: 'ten-1',
            features: { homework_helper: true, ai_tutor: false },
          }),
        },
      };
      const mockRedis = { get: vi.fn().mockResolvedValue(null), setex: vi.fn() };

      const { TenantConfigService } = await import('../src/services/tenant-config.service');
      const svc = new TenantConfigService({ prisma: mockPrisma, redis: mockRedis });
      const enabled = await svc.isFeatureEnabled('ten-1', 'homework_helper');
      expect(typeof enabled).toBe('boolean');
    });
  });

  describe('upsertTenantConfig', () => {
    it('creates or updates tenant config', async () => {
      const mockPrisma = {
        tenantConfig: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            tenantId: 'ten-1',
            aiEnabled: true,
            allowedAIProviders: ['openai'],
            defaultAIProvider: 'openai',
            dataResidencyRegion: 'us-east-1',
          }),
          upsert: vi.fn().mockResolvedValue({
            tenantId: 'ten-1',
            aiEnabled: true,
          }),
        },
      };
      const mockRedis = { get: vi.fn().mockResolvedValue(null), setex: vi.fn(), del: vi.fn() };

      const { TenantConfigService } = await import('../src/services/tenant-config.service');
      const svc = new TenantConfigService({ prisma: mockPrisma, redis: mockRedis });
      const config = await svc.upsertTenantConfig('ten-1', { aiEnabled: true });
      expect(config).toBeDefined();
    });
  });
});

describe('DistrictLookupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports DistrictLookupService class', async () => {
    const mod = await import('../src/services/district-lookup.service');
    expect(mod.DistrictLookupService).toBeDefined();
  });

  describe('lookupByZipCode', () => {
    it('returns districts matching zip code', async () => {
      const mockPrisma = {
        zipCodeDistrict: {
          findUnique: vi.fn().mockResolvedValue({
            zipCode: '90210',
            ncesDistrictIds: ['0123456'],
            stateCode: 'CA',
            primaryDistrictId: '0123456',
          }),
        },
        districtLookup: {
          findMany: vi.fn().mockResolvedValue([
            { ncesDistrictId: '0123456', districtName: 'Springfield USD', stateCode: 'CA', stateName: 'California' },
          ]),
        },
        stateCurriculumStandards: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      const { DistrictLookupService } = await import('../src/services/district-lookup.service');
      const svc = new DistrictLookupService(mockPrisma as any);
      const result = await svc.lookupByZipCode('90210');

      expect(result.success).toBe(true);
      expect(result.districts).toHaveLength(1);
      expect(result.districts[0].districtName).toBe('Springfield USD');
    });

    it('returns not-found result when no zip mapping exists', async () => {
      const mockPrisma = {
        zipCodeDistrict: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        districtLookup: {
          findMany: vi.fn(),
        },
        stateCurriculumStandards: {
          findUnique: vi.fn(),
        },
      };

      const { DistrictLookupService } = await import('../src/services/district-lookup.service');
      const svc = new DistrictLookupService(mockPrisma as any);
      const result = await svc.lookupByZipCode('00000');
      expect(result.success).toBe(false);
      expect(result.districts).toHaveLength(0);
    });
  });

  describe('lookupByState', () => {
    it('returns districts for state code', async () => {
      const mockPrisma = {
        districtLookup: {
          findMany: vi.fn().mockResolvedValue([
            { ncesDistrictId: '1', districtName: 'LA CUSD', stateCode: 'CA', stateName: 'California' },
            { ncesDistrictId: '2', districtName: 'SF USD', stateCode: 'CA', stateName: 'California' },
          ]),
          count: vi.fn().mockResolvedValue(2),
        },
        stateCurriculumStandards: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      const { DistrictLookupService } = await import('../src/services/district-lookup.service');
      const svc = new DistrictLookupService(mockPrisma as any);
      const result = await svc.lookupByState('CA');
      expect(result.districts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getDistrictByNcesId', () => {
    it('returns specific district by NCES ID', async () => {
      const mockPrisma = {
        districtLookup: {
          findUnique: vi.fn().mockResolvedValue({
            ncesDistrictId: '0654321',
            districtName: 'Test District',
            stateCode: 'CA',
            stateName: 'California',
          }),
        },
      };

      const { DistrictLookupService } = await import('../src/services/district-lookup.service');
      const svc = new DistrictLookupService(mockPrisma as any);
      const result = await svc.getDistrictByNcesId('0654321');
      expect(result?.districtName).toBe('Test District');
    });
  });
});

describe('CurriculumTriggerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports triggerCurriculumGeneration function', async () => {
    const mod = await import('../src/services/curriculum-trigger.service');
    expect(mod.triggerCurriculumGeneration).toBeDefined();
    expect(typeof mod.triggerCurriculumGeneration).toBe('function');
  });
});

describe('BrandingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('exports branding service functions', async () => {
    const mod = await import('../src/services/branding.service');
    expect(mod).toBeDefined();
  });
});
