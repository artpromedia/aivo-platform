import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ProvisioningInput, ProvisioningServiceConfig } from '../src/services/provisioning.service';

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockPrisma = {
  tenantProvisioningJob: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  tenant: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  tenantConfig: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  tenantFeatureFlag: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  tenantBranding: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  tenantAuditEvent: {
    create: vi.fn(),
  },
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

async function makeService(overrides: Partial<ProvisioningServiceConfig> = {}) {
  const { ProvisioningService } = await import('../src/services/provisioning.service');
  return new ProvisioningService({
    prisma: mockPrisma,
    redis: mockRedis,
    trialDurationDays: 30,
    maxRetries: 3,
    ...overrides,
  }) as InstanceType<typeof ProvisioningService>;
}

const INPUT: ProvisioningInput = {
  organizationName: 'Acme School District',
  adminEmail: 'admin@acme.edu',
  adminName: 'Jane Doe',
  organizationType: 'DISTRICT',
  districtSize: 'MEDIUM',
  stateCode: 'CA',
  zipCode: '90210',
};

describe('ProvisioningService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── startProvisioningJob ────────────────────────────────────────────────
  describe('startProvisioningJob', () => {
    it('returns existing job when idempotency key matches', async () => {
      const existingJob = {
        id: 'job-1',
        tenantId: 'ten-1',
        status: 'COMPLETED',
        currentStep: 10,
        totalSteps: 10,
        stepLog: [],
        completedAt: new Date(),
        organizationName: INPUT.organizationName,
        adminEmail: INPUT.adminEmail,
      };
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue(existingJob);

      const svc = await makeService();
      const result = await svc.startProvisioningJob({
        ...INPUT,
        idempotencyKey: 'idem-1',
      });

      expect(result.jobId).toBe('job-1');
      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.tenantProvisioningJob.create).not.toHaveBeenCalled();
    });

    it('creates a new job when no idempotency match exists', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue(null);
      mockPrisma.tenantProvisioningJob.create.mockResolvedValue({
        id: 'job-2',
        tenantId: null,
        status: 'PENDING',
        currentStep: 0,
        totalSteps: 10,
        stepLog: [],
        completedAt: null,
        organizationName: INPUT.organizationName,
        adminEmail: INPUT.adminEmail,
      });

      const svc = await makeService();
      const result = await svc.startProvisioningJob(INPUT);

      expect(result.status).toBe('PENDING');
      expect(result.tenantId).toBeNull();
      expect(mockPrisma.tenantProvisioningJob.create).toHaveBeenCalledTimes(1);
    });

    it('normalises admin email to lowercase and trimmed', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue(null);
      mockPrisma.tenantProvisioningJob.create.mockImplementation(({ data }: any) => ({
        id: 'job-3',
        ...data,
        completedAt: null,
      }));

      const svc = await makeService();
      await svc.startProvisioningJob({
        ...INPUT,
        adminEmail: '  Admin@Acme.Edu  ',
      });

      const callData = mockPrisma.tenantProvisioningJob.create.mock.calls[0][0].data;
      expect(callData.adminEmail).toBe('admin@acme.edu');
    });
  });

  // ── executeJob ──────────────────────────────────────────────────────────
  describe('executeJob', () => {
    it('throws when job not found', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue(null);
      const svc = await makeService();
      await expect(svc.executeJob('missing')).rejects.toThrow('not found');
    });

    it('returns immediately when job already completed', async () => {
      const completedJob = {
        id: 'j1',
        status: 'COMPLETED',
        currentStep: 10,
        totalSteps: 10,
        stepLog: [],
        completedAt: new Date(),
        organizationName: 'X',
        adminEmail: 'x@y.com',
        tenantId: 't1',
      };
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue(completedJob);

      const svc = await makeService();
      const result = await svc.executeJob('j1');
      expect(result.status).toBe('COMPLETED');
    });

    it('throws for rolled-back jobs', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue({
        id: 'j2',
        status: 'ROLLED_BACK',
      });

      const svc = await makeService();
      await expect(svc.executeJob('j2')).rejects.toThrow('rolled back');
    });

    it('throws when max retries exceeded', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue({
        id: 'j3',
        status: 'FAILED',
        retryCount: 5,
        maxRetries: 3,
      });

      const svc = await makeService();
      await expect(svc.executeJob('j3')).rejects.toThrow('exceeded maximum retries');
    });
  });

  // ── retryJob ────────────────────────────────────────────────────────────
  describe('retryJob', () => {
    it('throws when job not found', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue(null);
      const svc = await makeService();
      await expect(svc.retryJob('nope')).rejects.toThrow('not found');
    });

    it('throws when job is not in FAILED status', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue({
        id: 'ok',
        status: 'COMPLETED',
      });

      const svc = await makeService();
      await expect(svc.retryJob('ok')).rejects.toThrow('not in FAILED status');
    });

    it('throws when retries exhausted', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue({
        id: 'r1',
        status: 'FAILED',
        retryCount: 3,
        maxRetries: 3,
      });

      const svc = await makeService();
      await expect(svc.retryJob('r1')).rejects.toThrow('exceeded maximum retries');
    });
  });

  // ── getJobStatus ────────────────────────────────────────────────────────
  describe('getJobStatus', () => {
    it('returns mapped job result', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue({
        id: 'gs1',
        tenantId: 't1',
        status: 'SEEDING_DEFAULT_DATA',
        currentStep: 3,
        totalSteps: 10,
        stepLog: [],
        completedAt: null,
        organizationName: 'O',
        adminEmail: 'o@o.com',
      });

      const svc = await makeService();
      const result = await svc.getJobStatus('gs1');
      expect(result.jobId).toBe('gs1');
      expect(result.currentStep).toBe(3);
    });

    it('throws when job not found', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue(null);
      const svc = await makeService();
      await expect(svc.getJobStatus('x')).rejects.toThrow('not found');
    });
  });

  // ── rollbackJob ─────────────────────────────────────────────────────────
  describe('rollbackJob', () => {
    it('throws when job not found', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue(null);
      const svc = await makeService();
      await expect(svc.rollbackJob('nope')).rejects.toThrow('not found');
    });

    it('throws when job is not FAILED', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue({
        id: 'rb1',
        status: 'COMPLETED',
      });

      const svc = await makeService();
      await expect(svc.rollbackJob('rb1')).rejects.toThrow('Only failed jobs');
    });

    it('marks DELETED and updates job when tenant exists', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue({
        id: 'rb2',
        status: 'FAILED',
        tenantId: 't1',
        adminEmail: 'a@b.com',
        organizationName: 'X',
      });
      mockPrisma.tenant.update.mockResolvedValue({});
      mockPrisma.tenantAuditEvent.create.mockResolvedValue({});
      mockPrisma.tenantProvisioningJob.update.mockResolvedValue({});

      const svc = await makeService();
      await svc.rollbackJob('rb2');

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: expect.objectContaining({ status: 'DELETED', isActive: false }),
        }),
      );
      expect(mockPrisma.tenantProvisioningJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ROLLED_BACK' }),
        }),
      );
    });

    it('skips tenant update when no tenantId on the job', async () => {
      mockPrisma.tenantProvisioningJob.findUnique.mockResolvedValue({
        id: 'rb3',
        status: 'FAILED',
        tenantId: null,
        adminEmail: 'a@b.com',
        organizationName: 'Y',
      });
      mockPrisma.tenantProvisioningJob.update.mockResolvedValue({});

      const svc = await makeService();
      await svc.rollbackJob('rb3');

      expect(mockPrisma.tenant.update).not.toHaveBeenCalled();
      expect(mockPrisma.tenantAuditEvent.create).not.toHaveBeenCalled();
    });
  });
});
