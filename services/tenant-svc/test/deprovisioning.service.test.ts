import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockTx = {
  tenant: { update: vi.fn() },
  tenantAuditEvent: { create: vi.fn() },
  tenantFeatureFlag: { deleteMany: vi.fn() },
  tenantBranding: { deleteMany: vi.fn() },
  tenantCustomDomain: { deleteMany: vi.fn() },
  tenantIpAllowlist: { deleteMany: vi.fn() },
  tenantDomainVerification: { deleteMany: vi.fn() },
  tenantUsage: { deleteMany: vi.fn() },
  tenantConfig: { deleteMany: vi.fn() },
  tenantDataExport: { deleteMany: vi.fn() },
  tenantProvisioningJob: { deleteMany: vi.fn() },
  classroomLearner: { deleteMany: vi.fn() },
  classroomSessionCode: { deleteMany: vi.fn() },
  classroom: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
  school: { deleteMany: vi.fn() },
};

const mockPrisma = {
  tenant: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  tenantAuditEvent: { create: vi.fn() },
  tenantDataExport: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(async (fn: any) => fn(mockTx)),
};

const mockRedis = {
  del: vi.fn(),
};

async function createService(overrides: Record<string, unknown> = {}) {
  const { DeprovisioningService } = await import('../src/services/deprovisioning.service');
  return new DeprovisioningService({
    prisma: mockPrisma,
    redis: mockRedis,
    gracePeriodDays: 30,
    dataExportTtlDays: 7,
    ...overrides,
  });
}

const TENANT_ID = 'ten-abc';
const USER_ID = 'user-1';
const USER_EMAIL = 'admin@acme.edu';

describe('DeprovisioningService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── initiateDeletion ────────────────────────────────────────────────────
  describe('initiateDeletion', () => {
    it('throws when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      const svc = await createService();
      await expect(
        svc.initiateDeletion({ tenantId: TENANT_ID, requestedBy: USER_ID }),
      ).rejects.toThrow('Tenant not found');
    });

    it('throws when tenant already permanently deleted', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID, status: 'DELETED' });
      const svc = await createService();
      await expect(
        svc.initiateDeletion({ tenantId: TENANT_ID, requestedBy: USER_ID }),
      ).rejects.toThrow('already been permanently deleted');
    });

    it('returns existing status when already PENDING_DELETE', async () => {
      const now = new Date();
      const graceEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'Acme',
        status: 'PENDING_DELETE',
        deletedAt: now,
        deleteGraceEndsAt: graceEnd,
      });
      mockPrisma.tenantDataExport.findFirst.mockResolvedValue(null);

      const svc = await createService();
      const result = await svc.initiateDeletion({ tenantId: TENANT_ID, requestedBy: USER_ID });
      expect(result.status).toBe('PENDING_DELETE');
      expect(result.canCancel).toBe(true);
    });

    it('sets PENDING_DELETE via transaction and clears Redis cache', async () => {
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce({ id: TENANT_ID, status: 'ACTIVE', subdomain: 'acme' })
        .mockResolvedValueOnce({
          id: TENANT_ID,
          name: 'Acme',
          status: 'PENDING_DELETE',
          deletedAt: new Date(),
          deleteGraceEndsAt: new Date(Date.now() + 30 * 86400000),
        });
      mockPrisma.tenantDataExport.findFirst.mockResolvedValue(null);

      const svc = await createService();
      await svc.initiateDeletion({
        tenantId: TENANT_ID,
        requestedBy: USER_ID,
        requestedByEmail: USER_EMAIL,
        reason: 'Closing district',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith(`tenant:${TENANT_ID}`);
      expect(mockRedis.del).toHaveBeenCalledWith('tenant:subdomain:acme');
    });
  });

  // ── cancelDeletion ──────────────────────────────────────────────────────
  describe('cancelDeletion', () => {
    it('throws when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      const svc = await createService();
      await expect(svc.cancelDeletion(TENANT_ID, USER_ID)).rejects.toThrow('Tenant not found');
    });

    it('throws when tenant is not PENDING_DELETE', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID, status: 'ACTIVE' });
      const svc = await createService();
      await expect(svc.cancelDeletion(TENANT_ID, USER_ID)).rejects.toThrow('Cannot cancel deletion');
    });

    it('reactivates tenant and invalidates cache', async () => {
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce({ id: TENANT_ID, status: 'PENDING_DELETE' })
        .mockResolvedValueOnce({
          id: TENANT_ID,
          name: 'Acme',
          status: 'ACTIVE',
          deletedAt: null,
          deleteGraceEndsAt: null,
        });
      mockPrisma.tenantDataExport.findFirst.mockResolvedValue(null);

      const svc = await createService();
      const result = await svc.cancelDeletion(TENANT_ID, USER_ID, USER_EMAIL);

      expect(result.status).toBe('ACTIVE');
      expect(result.canCancel).toBe(false);
      expect(mockRedis.del).toHaveBeenCalledWith(`tenant:${TENANT_ID}`);
    });
  });

  // ── getDeletionStatus ───────────────────────────────────────────────────
  describe('getDeletionStatus', () => {
    it('throws when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      const svc = await createService();
      await expect(svc.getDeletionStatus('nope')).rejects.toThrow('Tenant not found');
    });

    it('returns correct days remaining and export info', async () => {
      const graceEnd = new Date(Date.now() + 15 * 86400000);
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'Acme',
        status: 'PENDING_DELETE',
        deletedAt: new Date(),
        deleteGraceEndsAt: graceEnd,
      });
      mockPrisma.tenantDataExport.findFirst.mockResolvedValue({
        id: 'exp-1',
        status: 'COMPLETED',
        downloadUrl: 'https://s3.example.com/export.zip',
        downloadExpiresAt: new Date(Date.now() + 86400000),
      });

      const svc = await createService();
      const status = await svc.getDeletionStatus(TENANT_ID);

      expect(status.daysUntilPermanentDelete).toBeGreaterThanOrEqual(14);
      expect(status.daysUntilPermanentDelete).toBeLessThanOrEqual(16);
      expect(status.dataExport?.requested).toBe(true);
      expect(status.dataExport?.status).toBe('COMPLETED');
      expect(status.canPermanentlyDelete).toBe(false);
    });

    it('canPermanentlyDelete is true when grace period has expired', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'X',
        status: 'PENDING_DELETE',
        deletedAt: new Date(Date.now() - 40 * 86400000),
        deleteGraceEndsAt: new Date(Date.now() - 10 * 86400000),
      });
      mockPrisma.tenantDataExport.findFirst.mockResolvedValue(null);

      const svc = await createService();
      const status = await svc.getDeletionStatus(TENANT_ID);

      expect(status.daysUntilPermanentDelete).toBe(0);
      expect(status.canPermanentlyDelete).toBe(true);
    });
  });

  // ── requestDataExport ───────────────────────────────────────────────────
  describe('requestDataExport', () => {
    it('throws when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      const svc = await createService();
      await expect(svc.requestDataExport(TENANT_ID, USER_ID)).rejects.toThrow('Tenant not found');
    });

    it('returns existing export if one is already PENDING or IN_PROGRESS', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
      mockPrisma.tenantDataExport.findFirst.mockResolvedValue({
        id: 'exp-2',
        status: 'IN_PROGRESS',
        format: 'json',
        createdAt: new Date(),
      });

      const svc = await createService();
      const result = await svc.requestDataExport(TENANT_ID, USER_ID);

      expect(result.exportId).toBe('exp-2');
      expect(result.status).toBe('IN_PROGRESS');
      expect(mockPrisma.tenantDataExport.create).not.toHaveBeenCalled();
    });

    it('creates new export and audit event', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: TENANT_ID });
      mockPrisma.tenantDataExport.findFirst.mockResolvedValue(null);
      mockPrisma.tenantDataExport.create.mockResolvedValue({
        id: 'exp-3',
        tenantId: TENANT_ID,
        status: 'PENDING',
        format: 'csv',
        createdAt: new Date(),
      });

      const svc = await createService();
      const result = await svc.requestDataExport(TENANT_ID, USER_ID, USER_EMAIL, 'csv');

      expect(result.format).toBe('csv');
      expect(result.status).toBe('PENDING');
      expect(mockPrisma.tenantAuditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'DATA_EXPORT_REQUESTED' }),
        }),
      );
    });
  });

  // ── getDataExportStatus ─────────────────────────────────────────────────
  describe('getDataExportStatus', () => {
    it('throws when export not found', async () => {
      mockPrisma.tenantDataExport.findUnique.mockResolvedValue(null);
      const svc = await createService();
      await expect(svc.getDataExportStatus('nope')).rejects.toThrow('Data export not found');
    });

    it('returns mapped export data', async () => {
      mockPrisma.tenantDataExport.findUnique.mockResolvedValue({
        id: 'exp-4',
        tenantId: TENANT_ID,
        status: 'COMPLETED',
        format: 'json',
        createdAt: new Date(),
        downloadUrl: 'https://s3/data.zip',
        downloadExpiresAt: new Date(),
      });

      const svc = await createService();
      const result = await svc.getDataExportStatus('exp-4');
      expect(result.downloadUrl).toBe('https://s3/data.zip');
    });
  });

  // ── processPermanentDeletions ───────────────────────────────────────────
  describe('processPermanentDeletions', () => {
    it('deletes tenants whose grace period has ended', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 't-1' },
        { id: 't-2' },
      ]);
      // permanentlyDeleteTenant will do findUnique for each
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce({
          id: 't-1',
          name: 'A',
          status: 'PENDING_DELETE',
          schools: [],
        })
        .mockResolvedValueOnce({
          id: 't-2',
          name: 'B',
          status: 'PENDING_DELETE',
          schools: [],
        });

      const svc = await createService();
      const result = await svc.processPermanentDeletions();

      expect(result.deleted).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('captures errors without stopping batch', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([{ id: 't-err' }]);
      mockPrisma.tenant.findUnique.mockResolvedValue(null); // will throw "Tenant not found"

      const svc = await createService();
      const result = await svc.processPermanentDeletions();

      expect(result.deleted).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('t-err');
    });
  });

  // ── permanentlyDeleteTenant ─────────────────────────────────────────────
  describe('permanentlyDeleteTenant', () => {
    it('throws when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      const svc = await createService();
      await expect(svc.permanentlyDeleteTenant('nope')).rejects.toThrow('Tenant not found');
    });

    it('throws when tenant is not PENDING_DELETE', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 't-a',
        status: 'ACTIVE',
        schools: [],
      });
      const svc = await createService();
      await expect(svc.permanentlyDeleteTenant('t-a')).rejects.toThrow('must be in PENDING_DELETE');
    });

    it('purges all related data within a transaction', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        name: 'Acme',
        status: 'PENDING_DELETE',
        subdomain: 'acme',
        schools: [{ id: 'sch-1' }],
        config: { id: 'cfg-1' },
        branding: { id: 'br-1' },
        usageRecords: [{ id: 'u-1' }],
        customDomains: [],
      });

      const svc = await createService();
      await svc.permanentlyDeleteTenant(TENANT_ID);

      // Audit event should have been created
      expect(mockPrisma.tenantAuditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'DEPROVISIONING_COMPLETED' }),
        }),
      );
      // Transaction should have been invoked
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      // Redis caches cleared
      expect(mockRedis.del).toHaveBeenCalledWith(`tenant:${TENANT_ID}`);
      expect(mockRedis.del).toHaveBeenCalledWith('tenant:subdomain:acme');
    });
  });
});
