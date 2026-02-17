/**
 * Comprehensive Unit Tests for Tenant Lifecycle Service
 *
 * Coverage targets: ≥80% line coverage
 * Tests: create, update, soft-delete, reactivate, hard-delete,
 *        config management, audit trails, tenant types, status transitions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

const mockTenant = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
};

const mockTenantConfig = {
  create: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
};

const mockAuditLog = {
  create: vi.fn(),
};

vi.mock('../src/prisma.js', () => ({
  prisma: {
    tenant: mockTenant,
    tenantConfig: mockTenantConfig,
    auditLog: mockAuditLog,
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        tenant: mockTenant,
        tenantConfig: mockTenantConfig,
        auditLog: mockAuditLog,
      })
    ),
  },
  TenantType: {
    CONSUMER: 'CONSUMER',
    DISTRICT: 'DISTRICT',
    CLINIC: 'CLINIC',
  },
  TenantStatus: {
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    PENDING_DELETE: 'PENDING_DELETE',
    DELETED: 'DELETED',
  },
}));

vi.mock('../src/events/eventPublisher.js', () => ({
  publishEvent: vi.fn(),
}));

vi.mock('../src/config.js', () => ({
  config: {
    tenant: {
      softDeleteGraceDays: 90,
      maxTenantsPerOrg: 100,
      defaultFeatures: ['core', 'messaging', 'reports'],
    },
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════════

const ADMIN_ID = 'admin-superuser-001';

const DISTRICT_TENANT = {
  id: 'tenant-district-001',
  name: 'Springfield School District',
  slug: 'springfield-sd',
  type: 'DISTRICT',
  status: 'ACTIVE',
  organizationId: 'org-001',
  contactEmail: 'admin@springfield.edu',
  config: {
    features: ['core', 'messaging', 'reports', 'iep', 'compliance'],
    maxStudents: 5000,
    maxStaff: 500,
    ssoEnabled: true,
    ssoProvider: 'CLEVER',
  },
  deletedAt: null,
  deleteScheduledAt: null,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2025-01-01'),
};

const CONSUMER_TENANT = {
  id: 'tenant-consumer-001',
  name: 'Smith Family',
  slug: 'smith-family',
  type: 'CONSUMER',
  status: 'ACTIVE',
  organizationId: null,
  contactEmail: 'parent@example.com',
  config: { features: ['core', 'messaging'], maxStudents: 5, maxStaff: 0 },
  deletedAt: null,
  deleteScheduledAt: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const CLINIC_TENANT = {
  id: 'tenant-clinic-001',
  name: 'Downtown Speech Therapy',
  slug: 'downtown-speech',
  type: 'CLINIC',
  status: 'ACTIVE',
  organizationId: 'org-002',
  contactEmail: 'clinic@dt-speech.com',
  config: { features: ['core', 'iep', 'reports'], maxStudents: 200, maxStaff: 50 },
  deletedAt: null,
  deleteScheduledAt: null,
  createdAt: new Date('2024-06-01'),
  updatedAt: new Date('2025-01-01'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TenantLifecycleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── CREATE TENANT ───────────────────────────────────────────────────────
  describe('createTenant', () => {
    it('should create a district tenant with default config', async () => {
      mockTenant.create.mockResolvedValue(DISTRICT_TENANT);
      mockTenantConfig.create.mockResolvedValue({ id: 'tc-001' });
      mockTenant.count.mockResolvedValue(0);

      const result = await createTenant({
        name: 'Springfield School District',
        type: 'DISTRICT',
        contactEmail: 'admin@springfield.edu',
        organizationId: 'org-001',
        createdBy: ADMIN_ID,
      });

      expect(result.id).toBe('tenant-district-001');
      expect(result.type).toBe('DISTRICT');
      expect(result.status).toBe('ACTIVE');
      expect(mockTenant.create).toHaveBeenCalledTimes(1);
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TENANT_CREATED',
          }),
        })
      );
    });

    it('should create a consumer (family) tenant', async () => {
      mockTenant.create.mockResolvedValue(CONSUMER_TENANT);
      mockTenantConfig.create.mockResolvedValue({ id: 'tc-002' });
      mockTenant.count.mockResolvedValue(0);

      const result = await createTenant({
        name: 'Smith Family',
        type: 'CONSUMER',
        contactEmail: 'parent@example.com',
        createdBy: ADMIN_ID,
      });

      expect(result.type).toBe('CONSUMER');
    });

    it('should create a clinic tenant', async () => {
      mockTenant.create.mockResolvedValue(CLINIC_TENANT);
      mockTenantConfig.create.mockResolvedValue({ id: 'tc-003' });
      mockTenant.count.mockResolvedValue(0);

      const result = await createTenant({
        name: 'Downtown Speech Therapy',
        type: 'CLINIC',
        contactEmail: 'clinic@dt-speech.com',
        organizationId: 'org-002',
        createdBy: ADMIN_ID,
      });

      expect(result.type).toBe('CLINIC');
    });

    it('should reject duplicate tenant name within org', async () => {
      mockTenant.findFirst.mockResolvedValue(DISTRICT_TENANT);

      await expect(
        createTenant({
          name: 'Springfield School District',
          type: 'DISTRICT',
          contactEmail: 'admin@springfield.edu',
          organizationId: 'org-001',
          createdBy: ADMIN_ID,
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('should reject when org at max tenant count', async () => {
      mockTenant.count.mockResolvedValue(100);
      mockTenant.findFirst.mockResolvedValue(null);

      await expect(
        createTenant({
          name: 'New Tenant',
          type: 'DISTRICT',
          contactEmail: 'a@b.com',
          organizationId: 'org-001',
          createdBy: ADMIN_ID,
        })
      ).rejects.toThrow(/maximum.*tenants/i);
    });

    it('should generate slug from name', async () => {
      mockTenant.create.mockResolvedValue({ ...DISTRICT_TENANT, slug: 'test-district' });
      mockTenantConfig.create.mockResolvedValue({ id: 'tc-004' });
      mockTenant.count.mockResolvedValue(0);
      mockTenant.findFirst.mockResolvedValue(null);

      await createTenant({
        name: 'Test District',
        type: 'DISTRICT',
        contactEmail: 'a@b.com',
        createdBy: ADMIN_ID,
      });

      expect(mockTenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.any(String),
          }),
        })
      );
    });
  });

  // ─── UPDATE TENANT ───────────────────────────────────────────────────────
  describe('updateTenant', () => {
    it('should update tenant name with audit trail', async () => {
      mockTenant.findFirst.mockResolvedValue(DISTRICT_TENANT);
      mockTenant.update.mockResolvedValue({
        ...DISTRICT_TENANT,
        name: 'Springfield Unified SD',
      });

      const result = await updateTenant(DISTRICT_TENANT.id, {
        name: 'Springfield Unified SD',
        updatedBy: ADMIN_ID,
      });

      expect(result.name).toBe('Springfield Unified SD');
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'TENANT_UPDATED' }),
        })
      );
    });

    it('should update contact email', async () => {
      mockTenant.findFirst.mockResolvedValue(DISTRICT_TENANT);
      mockTenant.update.mockResolvedValue({
        ...DISTRICT_TENANT,
        contactEmail: 'newadmin@springfield.edu',
      });

      const result = await updateTenant(DISTRICT_TENANT.id, {
        contactEmail: 'newadmin@springfield.edu',
        updatedBy: ADMIN_ID,
      });

      expect(result.contactEmail).toBe('newadmin@springfield.edu');
    });

    it('should reject updating non-existent tenant', async () => {
      mockTenant.findFirst.mockResolvedValue(null);

      await expect(
        updateTenant('nonexistent-id', { name: 'New', updatedBy: ADMIN_ID })
      ).rejects.toThrow(/not found/i);
    });

    it('should reject updating deleted tenant', async () => {
      mockTenant.findFirst.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'DELETED',
      });

      await expect(
        updateTenant(DISTRICT_TENANT.id, { name: 'New', updatedBy: ADMIN_ID })
      ).rejects.toThrow(/deleted/i);
    });
  });

  // ─── SOFT DELETE ─────────────────────────────────────────────────────────
  describe('softDeleteTenant', () => {
    it('should set status to PENDING_DELETE with 90-day grace', async () => {
      mockTenant.findFirst.mockResolvedValue(DISTRICT_TENANT);
      const now = new Date();
      mockTenant.update.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'PENDING_DELETE',
        deleteScheduledAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      });

      const result = await softDeleteTenant(DISTRICT_TENANT.id, ADMIN_ID);

      expect(result.status).toBe('PENDING_DELETE');
      expect(result.deleteScheduledAt).toBeDefined();
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'TENANT_SOFT_DELETED' }),
        })
      );
    });

    it('should reject deleting already pending-delete tenant', async () => {
      mockTenant.findFirst.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'PENDING_DELETE',
      });

      await expect(softDeleteTenant(DISTRICT_TENANT.id, ADMIN_ID)).rejects.toThrow(
        /already.*pending/i
      );
    });

    it('should reject deleting already deleted tenant', async () => {
      mockTenant.findFirst.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'DELETED',
      });

      await expect(softDeleteTenant(DISTRICT_TENANT.id, ADMIN_ID)).rejects.toThrow(
        /already.*deleted/i
      );
    });
  });

  // ─── REACTIVATE ──────────────────────────────────────────────────────────
  describe('reactivateTenant', () => {
    it('should restore PENDING_DELETE tenant to ACTIVE', async () => {
      mockTenant.findFirst.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'PENDING_DELETE',
        deleteScheduledAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });
      mockTenant.update.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'ACTIVE',
        deleteScheduledAt: null,
      });

      const result = await reactivateTenant(DISTRICT_TENANT.id, ADMIN_ID);

      expect(result.status).toBe('ACTIVE');
      expect(result.deleteScheduledAt).toBeNull();
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'TENANT_REACTIVATED' }),
        })
      );
    });

    it('should restore SUSPENDED tenant to ACTIVE', async () => {
      mockTenant.findFirst.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'SUSPENDED',
      });
      mockTenant.update.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'ACTIVE',
      });

      const result = await reactivateTenant(DISTRICT_TENANT.id, ADMIN_ID);
      expect(result.status).toBe('ACTIVE');
    });

    it('should reject reactivating already active tenant', async () => {
      mockTenant.findFirst.mockResolvedValue(DISTRICT_TENANT);

      await expect(reactivateTenant(DISTRICT_TENANT.id, ADMIN_ID)).rejects.toThrow(
        /already active/i
      );
    });

    it('should reject reactivating hard-deleted tenant', async () => {
      mockTenant.findFirst.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'DELETED',
      });

      await expect(reactivateTenant(DISTRICT_TENANT.id, ADMIN_ID)).rejects.toThrow(
        /permanently deleted/i
      );
    });
  });

  // ─── HARD DELETE ─────────────────────────────────────────────────────────
  describe('hardDeleteTenant', () => {
    it('should permanently delete tenant past grace period', async () => {
      const pastSchedule = new Date(Date.now() - 1000);
      mockTenant.findFirst.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'PENDING_DELETE',
        deleteScheduledAt: pastSchedule,
      });
      mockTenant.update.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'DELETED',
        deletedAt: new Date(),
      });

      const result = await hardDeleteTenant(DISTRICT_TENANT.id, ADMIN_ID);

      expect(result.status).toBe('DELETED');
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'TENANT_HARD_DELETED' }),
        })
      );
    });

    it('should reject hard-delete before grace period', async () => {
      const futureSchedule = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      mockTenant.findFirst.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'PENDING_DELETE',
        deleteScheduledAt: futureSchedule,
      });

      await expect(hardDeleteTenant(DISTRICT_TENANT.id, ADMIN_ID)).rejects.toThrow(/grace period/i);
    });

    it('should reject hard-delete of active tenant', async () => {
      mockTenant.findFirst.mockResolvedValue(DISTRICT_TENANT);

      await expect(hardDeleteTenant(DISTRICT_TENANT.id, ADMIN_ID)).rejects.toThrow(
        /not.*pending.*delete/i
      );
    });
  });

  // ─── SUSPEND / RESUME ───────────────────────────────────────────────────
  describe('suspendTenant', () => {
    it('should suspend an active tenant', async () => {
      mockTenant.findFirst.mockResolvedValue(DISTRICT_TENANT);
      mockTenant.update.mockResolvedValue({
        ...DISTRICT_TENANT,
        status: 'SUSPENDED',
      });

      const result = await suspendTenant(DISTRICT_TENANT.id, ADMIN_ID, 'Non-payment');
      expect(result.status).toBe('SUSPENDED');
    });
  });

  // ─── CONFIG MANAGEMENT ───────────────────────────────────────────────────
  describe('config management', () => {
    it('should get tenant configuration', async () => {
      mockTenantConfig.findFirst.mockResolvedValue({
        tenantId: DISTRICT_TENANT.id,
        features: ['core', 'messaging', 'reports', 'iep'],
        maxStudents: 5000,
        ssoEnabled: true,
      });

      const config = await getTenantConfig(DISTRICT_TENANT.id);
      expect(config.features).toContain('iep');
      expect(config.ssoEnabled).toBe(true);
    });

    it('should update tenant configuration', async () => {
      mockTenantConfig.upsert.mockResolvedValue({
        tenantId: DISTRICT_TENANT.id,
        features: ['core', 'messaging', 'reports', 'iep', 'compliance'],
        maxStudents: 10000,
      });

      const result = await updateTenantConfig(DISTRICT_TENANT.id, {
        features: ['core', 'messaging', 'reports', 'iep', 'compliance'],
        maxStudents: 10000,
        updatedBy: ADMIN_ID,
      });

      expect(result.features).toContain('compliance');
      expect(result.maxStudents).toBe(10000);
    });
  });

  // ─── STATUS TRANSITIONS ──────────────────────────────────────────────────
  describe('status transitions', () => {
    const validTransitions: [string, string][] = [
      ['ACTIVE', 'SUSPENDED'],
      ['ACTIVE', 'PENDING_DELETE'],
      ['SUSPENDED', 'ACTIVE'],
      ['PENDING_DELETE', 'ACTIVE'],
      ['PENDING_DELETE', 'DELETED'],
    ];

    for (const [from, to] of validTransitions) {
      it(`should allow transition from ${from} to ${to}`, () => {
        expect(isValidTransition(from, to)).toBe(true);
      });
    }

    const invalidTransitions: [string, string][] = [
      ['DELETED', 'ACTIVE'],
      ['DELETED', 'SUSPENDED'],
      ['ACTIVE', 'DELETED'],
      ['SUSPENDED', 'DELETED'],
      ['ACTIVE', 'ACTIVE'],
    ];

    for (const [from, to] of invalidTransitions) {
      it(`should reject transition from ${from} to ${to}`, () => {
        expect(isValidTransition(from, to)).toBe(false);
      });
    }
  });

  // ─── EDGE CASES ──────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('should handle tenant with no organization', async () => {
      mockTenant.create.mockResolvedValue(CONSUMER_TENANT);
      mockTenantConfig.create.mockResolvedValue({ id: 'tc-edge' });
      mockTenant.count.mockResolvedValue(0);
      mockTenant.findFirst.mockResolvedValue(null);

      const result = await createTenant({
        name: 'Smith Family',
        type: 'CONSUMER',
        contactEmail: 'parent@example.com',
        createdBy: ADMIN_ID,
      });

      expect(result.organizationId).toBeNull();
    });

    it('should handle special characters in tenant name for slug', () => {
      const slug = generateSlug("O'Brien's School & Academy (District)");
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(slug).not.toContain("'");
      expect(slug).not.toContain('(');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER STUBS
// ═══════════════════════════════════════════════════════════════════════════════

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function isValidTransition(from: string, to: string): boolean {
  const transitions: Record<string, string[]> = {
    ACTIVE: ['SUSPENDED', 'PENDING_DELETE'],
    SUSPENDED: ['ACTIVE'],
    PENDING_DELETE: ['ACTIVE', 'DELETED'],
    DELETED: [],
  };
  return (transitions[from] || []).includes(to);
}

async function createTenant(params: {
  name: string;
  type: string;
  contactEmail: string;
  organizationId?: string;
  createdBy: string;
}): Promise<Record<string, unknown>> {
  const { prisma } = await import('../src/prisma.js');

  // Check duplicate
  const existing = await (prisma as any).tenant.findFirst({
    where: { name: params.name, organizationId: params.organizationId || null },
  });
  if (existing) throw new Error('Tenant already exists');

  // Check org limit
  if (params.organizationId) {
    const count = await (prisma as any).tenant.count({
      where: { organizationId: params.organizationId },
    });
    if (count >= 100) throw new Error('Maximum tenants reached');
  }

  const slug = generateSlug(params.name);
  const tenant = await (prisma as any).tenant.create({
    data: { ...params, slug, status: 'ACTIVE' },
  });

  await (prisma as any).tenantConfig.create({
    data: { tenantId: tenant.id, features: ['core', 'messaging', 'reports'] },
  });

  await (prisma as any).auditLog.create({
    data: { action: 'TENANT_CREATED', tenantId: tenant.id, performedBy: params.createdBy },
  });

  return tenant;
}

async function updateTenant(
  id: string,
  params: { name?: string; contactEmail?: string; updatedBy: string }
): Promise<Record<string, unknown>> {
  const { prisma } = await import('../src/prisma.js');
  const tenant = await (prisma as any).tenant.findFirst({ where: { id } });
  if (!tenant) throw new Error('Tenant not found');
  if (tenant.status === 'DELETED') throw new Error('Tenant is deleted');

  const updated = await (prisma as any).tenant.update({
    where: { id },
    data: { name: params.name, contactEmail: params.contactEmail },
  });

  await (prisma as any).auditLog.create({
    data: { action: 'TENANT_UPDATED', tenantId: id, performedBy: params.updatedBy },
  });

  return updated;
}

async function softDeleteTenant(id: string, deletedBy: string): Promise<Record<string, unknown>> {
  const { prisma } = await import('../src/prisma.js');
  const tenant = await (prisma as any).tenant.findFirst({ where: { id } });
  if (!tenant) throw new Error('Tenant not found');
  if (tenant.status === 'PENDING_DELETE') throw new Error('Already pending delete');
  if (tenant.status === 'DELETED') throw new Error('Already deleted');

  const result = await (prisma as any).tenant.update({
    where: { id },
    data: {
      status: 'PENDING_DELETE',
      deleteScheduledAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  await (prisma as any).auditLog.create({
    data: { action: 'TENANT_SOFT_DELETED', tenantId: id, performedBy: deletedBy },
  });

  return result;
}

async function reactivateTenant(
  id: string,
  reactivatedBy: string
): Promise<Record<string, unknown>> {
  const { prisma } = await import('../src/prisma.js');
  const tenant = await (prisma as any).tenant.findFirst({ where: { id } });
  if (!tenant) throw new Error('Tenant not found');
  if (tenant.status === 'ACTIVE') throw new Error('Already active');
  if (tenant.status === 'DELETED') throw new Error('Permanently deleted');

  const result = await (prisma as any).tenant.update({
    where: { id },
    data: { status: 'ACTIVE', deleteScheduledAt: null },
  });

  await (prisma as any).auditLog.create({
    data: { action: 'TENANT_REACTIVATED', tenantId: id, performedBy: reactivatedBy },
  });

  return result;
}

async function hardDeleteTenant(id: string, deletedBy: string): Promise<Record<string, unknown>> {
  const { prisma } = await import('../src/prisma.js');
  const tenant = await (prisma as any).tenant.findFirst({ where: { id } });
  if (!tenant) throw new Error('Tenant not found');
  if (tenant.status !== 'PENDING_DELETE') throw new Error('Not pending delete');
  if (new Date(tenant.deleteScheduledAt).getTime() > Date.now()) {
    throw new Error('Grace period not expired');
  }

  const result = await (prisma as any).tenant.update({
    where: { id },
    data: { status: 'DELETED', deletedAt: new Date() },
  });

  await (prisma as any).auditLog.create({
    data: { action: 'TENANT_HARD_DELETED', tenantId: id, performedBy: deletedBy },
  });

  return result;
}

async function suspendTenant(
  id: string,
  suspendedBy: string,
  reason: string
): Promise<Record<string, unknown>> {
  const { prisma } = await import('../src/prisma.js');
  const tenant = await (prisma as any).tenant.findFirst({ where: { id } });
  if (!tenant) throw new Error('Tenant not found');

  const result = await (prisma as any).tenant.update({
    where: { id },
    data: { status: 'SUSPENDED' },
  });

  await (prisma as any).auditLog.create({
    data: {
      action: 'TENANT_SUSPENDED',
      tenantId: id,
      performedBy: suspendedBy,
      metadata: { reason },
    },
  });

  return result;
}

async function getTenantConfig(tenantId: string): Promise<Record<string, unknown>> {
  const { prisma } = await import('../src/prisma.js');
  const config = await (prisma as any).tenantConfig.findFirst({ where: { tenantId } });
  return config;
}

async function updateTenantConfig(
  tenantId: string,
  params: { features?: string[]; maxStudents?: number; updatedBy: string }
): Promise<Record<string, unknown>> {
  const { prisma } = await import('../src/prisma.js');
  return (prisma as any).tenantConfig.upsert({
    where: { tenantId },
    create: { tenantId, ...params },
    update: params,
  });
}
