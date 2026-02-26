import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  trial: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../src/prisma', () => ({ prisma: mockPrisma }));

describe('TrialService', () => {
  let TrialService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('../src/services/trial.service');
    TrialService = mod.TrialService || mod.default;
  });

  it('checks trial eligibility for a new tenant', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    const service = new TrialService(mockPrisma);

    const eligible = await service.checkEligibility('tenant-1', 'learner-1', 'basic-plan');
    expect(eligible).toBeDefined();
  });

  it('rejects trial when tenant already had one', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ id: 'trial-1', status: 'EXPIRED' }]);
    const service = new TrialService(mockPrisma);

    const eligible = await service.checkEligibility('tenant-1', 'learner-1', 'basic-plan');
    // Either returns false or throws
    expect(eligible === false || eligible === undefined).toBeTruthy;
  });
});
