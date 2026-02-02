/**
 * AIVO Legal Hold Service - Hold Service Tests
 *
 * Comprehensive tests for the hold management functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma before importing services
vi.mock('../src/prisma.js', () => {
  const mockPrisma = {
    legalMatter: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    legalHold: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    holdCustodian: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    holdDataSource: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    holdRelease: {
      create: vi.fn(),
    },
    holdAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    custodian: {
      findFirst: vi.fn(),
    },
  };

  return { prisma: mockPrisma, Prisma: {} };
});

// Mock config
vi.mock('../src/config.js', () => ({
  config: {
    holds: {
      defaultReminderDays: 7,
      defaultEscalationDays: 14,
      acknowledgmentDeadlineDays: 30,
    },
  },
}));

import { prisma } from '../src/prisma.js';
import * as holdService from '../src/services/holdService.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockTenantId = 'tenant-123';
const mockUserId = 'user-456';
const mockMatterId = 'matter-789';
const mockHoldId = 'hold-abc';

const mockMatter = {
  id: mockMatterId,
  tenantId: mockTenantId,
  matterNumber: 'MATTER-001',
  name: 'Test Matter',
  status: 'ACTIVE',
};

const mockHold = {
  id: mockHoldId,
  tenantId: mockTenantId,
  matterId: mockMatterId,
  holdNumber: 'HOLD-001',
  name: 'Test Legal Hold',
  description: 'Test description',
  status: 'DRAFT',
  priority: 'NORMAL',
  createdAt: new Date(),
  updatedAt: new Date(),
  issuedAt: null,
  releasedAt: null,
  acknowledgmentDue: null,
  matter: {
    id: mockMatterId,
    matterNumber: 'MATTER-001',
    name: 'Test Matter',
    status: 'ACTIVE',
  },
  custodians: [],
  dataSources: [],
  _count: { custodians: 0, notifications: 0, acknowledgments: 0 },
};

const mockCustodian = {
  id: 'custodian-111',
  tenantId: mockTenantId,
  email: 'test@example.com',
  displayName: 'Test User',
  department: 'Engineering',
  status: 'ACTIVE',
};

// =============================================================================
// createHold Tests
// =============================================================================

describe('holdService.createHold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a hold successfully', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(mockMatter);
    (prisma.legalHold.create as any).mockResolvedValue(mockHold);
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    const input = {
      matterId: mockMatterId,
      holdNumber: 'HOLD-001',
      name: 'Test Legal Hold',
      description: 'Test description',
    };

    const result = await holdService.createHold(mockTenantId, mockUserId, input);

    expect(result).toBeDefined();
    expect(result.id).toBe(mockHoldId);
    expect(prisma.legalMatter.findFirst).toHaveBeenCalledWith({
      where: { id: mockMatterId, tenantId: mockTenantId },
    });
    expect(prisma.legalHold.create).toHaveBeenCalled();
    expect(prisma.holdAuditLog.create).toHaveBeenCalled();
  });

  it('should throw error if matter not found', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(null);

    const input = {
      matterId: 'nonexistent-matter',
      holdNumber: 'HOLD-001',
      name: 'Test Hold',
    };

    await expect(holdService.createHold(mockTenantId, mockUserId, input)).rejects.toThrow(
      'Matter not found'
    );
  });

  it('should apply default values for optional fields', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(mockMatter);
    (prisma.legalHold.create as any).mockResolvedValue(mockHold);
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    const input = {
      matterId: mockMatterId,
      holdNumber: 'HOLD-002',
      name: 'Minimal Hold',
    };

    await holdService.createHold(mockTenantId, mockUserId, input);

    expect(prisma.legalHold.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DRAFT',
          reminderFrequency: 7, // Default from config
          escalationAfter: 14, // Default from config
          isConfidential: false, // Default
          priority: 'NORMAL', // Default
        }),
      })
    );
  });
});

// =============================================================================
// getHold Tests
// =============================================================================

describe('holdService.getHold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get a hold with all related data', async () => {
    const holdWithRelations = {
      ...mockHold,
      matter: mockMatter,
      custodians: [],
      dataSources: [],
    };
    (prisma.legalHold.findFirst as any).mockResolvedValue(holdWithRelations);

    const result = await holdService.getHold(mockTenantId, mockHoldId);

    expect(result).toBeDefined();
    expect(result?.id).toBe(mockHoldId);
    expect(prisma.legalHold.findFirst).toHaveBeenCalledWith({
      where: { id: mockHoldId, tenantId: mockTenantId },
      include: expect.objectContaining({
        matter: expect.any(Object),
        custodians: expect.any(Object),
        dataSources: expect.any(Object),
        _count: expect.any(Object),
      }),
    });
  });

  it('should return null if hold not found', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(null);

    const result = await holdService.getHold(mockTenantId, 'nonexistent');

    expect(result).toBeNull();
  });
});

// =============================================================================
// listHolds Tests
// =============================================================================

describe('holdService.listHolds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list holds with pagination', async () => {
    const mockHolds = [mockHold, { ...mockHold, id: 'hold-def' }];
    (prisma.legalHold.findMany as any).mockResolvedValue(mockHolds);
    (prisma.legalHold.count as any).mockResolvedValue(2);

    const result = await holdService.listHolds(mockTenantId, {
      page: 1,
      pageSize: 20,
    });

    expect(result.data).toHaveLength(2);
    expect(result.pagination.totalItems).toBe(2);
    expect(result.pagination.page).toBe(1);
  });

  it('should filter by status', async () => {
    (prisma.legalHold.findMany as any).mockResolvedValue([]);
    (prisma.legalHold.count as any).mockResolvedValue(0);

    await holdService.listHolds(mockTenantId, {
      status: 'ACTIVE',
    });

    expect(prisma.legalHold.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: mockTenantId,
          status: 'ACTIVE',
        }),
      })
    );
  });

  it('should filter by matterId', async () => {
    (prisma.legalHold.findMany as any).mockResolvedValue([]);
    (prisma.legalHold.count as any).mockResolvedValue(0);

    await holdService.listHolds(mockTenantId, {
      matterId: mockMatterId,
    });

    expect(prisma.legalHold.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          matterId: mockMatterId,
        }),
      })
    );
  });

  it('should search by name, holdNumber, or description', async () => {
    (prisma.legalHold.findMany as any).mockResolvedValue([]);
    (prisma.legalHold.count as any).mockResolvedValue(0);

    await holdService.listHolds(mockTenantId, {
      search: 'test search',
    });

    expect(prisma.legalHold.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(Object) }),
            expect.objectContaining({ holdNumber: expect.any(Object) }),
            expect.objectContaining({ description: expect.any(Object) }),
          ]),
        }),
      })
    );
  });

  it('should calculate correct pagination', async () => {
    (prisma.legalHold.findMany as any).mockResolvedValue([]);
    (prisma.legalHold.count as any).mockResolvedValue(45);

    const result = await holdService.listHolds(mockTenantId, {
      page: 2,
      pageSize: 20,
    });

    expect(result.pagination.totalPages).toBe(3);
    expect(prisma.legalHold.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
      })
    );
  });
});

// =============================================================================
// updateHold Tests
// =============================================================================

describe('holdService.updateHold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update a draft hold', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(mockHold);
    (prisma.legalHold.update as any).mockResolvedValue({ ...mockHold, name: 'Updated Name' });
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    const result = await holdService.updateHold(mockTenantId, mockHoldId, mockUserId, {
      name: 'Updated Name',
    });

    expect(result.name).toBe('Updated Name');
    expect(prisma.holdAuditLog.create).toHaveBeenCalled();
  });

  it('should throw error if hold not found', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(null);

    await expect(
      holdService.updateHold(mockTenantId, 'nonexistent', mockUserId, { name: 'Test' })
    ).rejects.toThrow('Hold not found');
  });

  it('should prevent updating restricted fields on active hold', async () => {
    const activeHold = { ...mockHold, status: 'ACTIVE' };
    (prisma.legalHold.findFirst as any).mockResolvedValue(activeHold);

    await expect(
      holdService.updateHold(mockTenantId, mockHoldId, mockUserId, {
        scopeDescription: 'New scope',
      })
    ).rejects.toThrow('Cannot modify scopeDescription on an active hold');
  });

  it('should allow updating non-restricted fields on active hold', async () => {
    const activeHold = { ...mockHold, status: 'ACTIVE' };
    (prisma.legalHold.findFirst as any).mockResolvedValue(activeHold);
    (prisma.legalHold.update as any).mockResolvedValue({ ...activeHold, name: 'New Name' });
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    const result = await holdService.updateHold(mockTenantId, mockHoldId, mockUserId, {
      name: 'New Name',
      description: 'Updated description',
    });

    expect(result.name).toBe('New Name');
  });
});

// =============================================================================
// issueHold Tests
// =============================================================================

describe('holdService.issueHold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should issue a draft hold to custodians', async () => {
    const custodianIds = ['custodian-111', 'custodian-222'];
    (prisma.legalHold.findFirst as any).mockResolvedValue(mockHold);
    (prisma.holdCustodian.upsert as any).mockResolvedValue({});
    (prisma.holdDataSource.upsert as any).mockResolvedValue({});
    (prisma.legalHold.update as any).mockResolvedValue({
      ...mockHold,
      status: 'ISSUED',
      issuedAt: new Date(),
    });
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    const result = await holdService.issueHold(mockTenantId, mockHoldId, mockUserId, {
      custodianIds,
    });

    expect(result.status).toBe('ISSUED');
    expect(prisma.holdCustodian.upsert).toHaveBeenCalledTimes(custodianIds.length);
  });

  it('should throw error if hold not found', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(null);

    await expect(
      holdService.issueHold(mockTenantId, 'nonexistent', mockUserId, { custodianIds: [] })
    ).rejects.toThrow('Hold not found');
  });

  it('should throw error if hold is already released', async () => {
    const releasedHold = { ...mockHold, status: 'RELEASED' };
    (prisma.legalHold.findFirst as any).mockResolvedValue(releasedHold);

    await expect(
      holdService.issueHold(mockTenantId, mockHoldId, mockUserId, { custodianIds: [] })
    ).rejects.toThrow('Cannot issue hold in RELEASED status');
  });

  it('should add data sources when specified', async () => {
    const dataSourceIds = ['source-1', 'source-2'];
    (prisma.legalHold.findFirst as any).mockResolvedValue(mockHold);
    (prisma.holdCustodian.upsert as any).mockResolvedValue({});
    (prisma.holdDataSource.upsert as any).mockResolvedValue({});
    (prisma.legalHold.update as any).mockResolvedValue({
      ...mockHold,
      status: 'ISSUED',
    });
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    await holdService.issueHold(mockTenantId, mockHoldId, mockUserId, {
      custodianIds: ['custodian-111'],
      dataSourceIds,
    });

    expect(prisma.holdDataSource.upsert).toHaveBeenCalledTimes(dataSourceIds.length);
  });
});

// =============================================================================
// releaseHold Tests
// =============================================================================

describe('holdService.releaseHold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fully release an active hold', async () => {
    const activeHold = {
      ...mockHold,
      status: 'ACTIVE',
      custodians: [{ custodianId: 'c1' }, { custodianId: 'c2' }],
      dataSources: [{ dataSourceId: 's1' }],
    };
    (prisma.legalHold.findFirst as any).mockResolvedValue(activeHold);
    (prisma.holdRelease.create as any).mockResolvedValue({ id: 'release-123' });
    (prisma.holdCustodian.updateMany as any).mockResolvedValue({ count: 2 });
    (prisma.holdDataSource.updateMany as any).mockResolvedValue({ count: 1 });
    (prisma.legalHold.update as any).mockResolvedValue({
      ...activeHold,
      status: 'RELEASED',
    });
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    const result = await holdService.releaseHold(mockTenantId, mockHoldId, mockUserId, {
      releaseType: 'FULL',
      reason: 'Matter concluded',
    });

    expect(result.id).toBe('release-123');
    expect(prisma.holdCustodian.updateMany).toHaveBeenCalled();
    expect(prisma.holdDataSource.updateMany).toHaveBeenCalled();
    expect(prisma.legalHold.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'RELEASED',
        }),
      })
    );
  });

  it('should throw error if hold not in releasable status', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(mockHold); // DRAFT status

    await expect(
      holdService.releaseHold(mockTenantId, mockHoldId, mockUserId, {
        releaseType: 'FULL',
        reason: 'Test',
      })
    ).rejects.toThrow('Cannot release hold in DRAFT status');
  });

  it('should partially release specific custodians', async () => {
    const activeHold = {
      ...mockHold,
      status: 'ACTIVE',
      custodians: [],
      dataSources: [],
    };
    (prisma.legalHold.findFirst as any).mockResolvedValue(activeHold);
    (prisma.holdRelease.create as any).mockResolvedValue({ id: 'release-123' });
    (prisma.holdCustodian.updateMany as any).mockResolvedValue({ count: 1 });
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    await holdService.releaseHold(mockTenantId, mockHoldId, mockUserId, {
      releaseType: 'PARTIAL_CUSTODIAN',
      reason: 'Left company',
      custodianIds: ['custodian-111'],
    });

    expect(prisma.holdCustodian.updateMany).toHaveBeenCalledWith({
      where: {
        holdId: mockHoldId,
        custodianId: { in: ['custodian-111'] },
      },
      data: expect.objectContaining({
        status: 'RELEASED',
      }),
    });
  });
});

// =============================================================================
// addCustodianToHold Tests
// =============================================================================

describe('holdService.addCustodianToHold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a custodian to a hold', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(mockHold);
    (prisma.custodian.findFirst as any).mockResolvedValue(mockCustodian);
    (prisma.holdCustodian.upsert as any).mockResolvedValue({
      holdId: mockHoldId,
      custodianId: mockCustodian.id,
      custodian: mockCustodian,
    });
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    const result = await holdService.addCustodianToHold(
      mockTenantId,
      mockHoldId,
      mockCustodian.id,
      mockUserId
    );

    expect(result.custodianId).toBe(mockCustodian.id);
    expect(prisma.holdAuditLog.create).toHaveBeenCalled();
  });

  it('should throw error if hold not found', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(null);
    (prisma.custodian.findFirst as any).mockResolvedValue(mockCustodian);

    await expect(
      holdService.addCustodianToHold(mockTenantId, 'nonexistent', mockCustodian.id, mockUserId)
    ).rejects.toThrow('Hold not found');
  });

  it('should throw error if custodian not found', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(mockHold);
    (prisma.custodian.findFirst as any).mockResolvedValue(null);

    await expect(
      holdService.addCustodianToHold(mockTenantId, mockHoldId, 'nonexistent-custodian', mockUserId)
    ).rejects.toThrow('Custodian not found');
  });
});

// =============================================================================
// removeCustodianFromHold Tests
// =============================================================================

describe('holdService.removeCustodianFromHold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should release a custodian from a hold', async () => {
    (prisma.holdCustodian.findFirst as any).mockResolvedValue({
      id: 'hc-123',
      holdId: mockHoldId,
      custodianId: mockCustodian.id,
      hold: { tenantId: mockTenantId },
      custodian: mockCustodian,
    });
    (prisma.holdCustodian.update as any).mockResolvedValue({});
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    await holdService.removeCustodianFromHold(
      mockTenantId,
      mockHoldId,
      mockCustodian.id,
      mockUserId,
      'Employee left company'
    );

    expect(prisma.holdCustodian.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'RELEASED',
          releaseReason: 'Employee left company',
        }),
      })
    );
  });

  it('should throw error if hold custodian not found', async () => {
    (prisma.holdCustodian.findFirst as any).mockResolvedValue(null);

    await expect(
      holdService.removeCustodianFromHold(
        mockTenantId,
        mockHoldId,
        'nonexistent',
        mockUserId,
        'Reason'
      )
    ).rejects.toThrow('Hold custodian not found');
  });

  it('should throw error if tenant mismatch', async () => {
    (prisma.holdCustodian.findFirst as any).mockResolvedValue({
      id: 'hc-123',
      hold: { tenantId: 'different-tenant' },
      custodian: mockCustodian,
    });

    await expect(
      holdService.removeCustodianFromHold(
        mockTenantId,
        mockHoldId,
        mockCustodian.id,
        mockUserId,
        'Reason'
      )
    ).rejects.toThrow('Hold custodian not found');
  });
});

// =============================================================================
// getHoldCompliance Tests
// =============================================================================

describe('holdService.getHoldCompliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate compliance summary correctly', async () => {
    const holdWithCustodians = {
      ...mockHold,
      id: mockHoldId,
      name: 'Compliance Test Hold',
      custodians: [
        { status: 'ACKNOWLEDGED' },
        { status: 'ACKNOWLEDGED' },
        { status: 'PENDING' },
        { status: 'NON_COMPLIANT' },
        { status: 'ESCALATED' },
      ],
    };
    (prisma.legalHold.findFirst as any).mockResolvedValue(holdWithCustodians);

    const result = await holdService.getHoldCompliance(mockTenantId, mockHoldId);

    expect(result).toBeDefined();
    expect(result?.totalCustodians).toBe(5);
    expect(result?.acknowledged).toBe(2);
    expect(result?.pending).toBe(1);
    expect(result?.nonCompliant).toBe(1);
    expect(result?.escalated).toBe(1);
    expect(result?.complianceRate).toBe(40); // 2/5 = 40%
  });

  it('should return null if hold not found', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(null);

    const result = await holdService.getHoldCompliance(mockTenantId, 'nonexistent');

    expect(result).toBeNull();
  });

  it('should return 100% compliance for holds with no custodians', async () => {
    const holdNoCustodians = {
      ...mockHold,
      custodians: [],
    };
    (prisma.legalHold.findFirst as any).mockResolvedValue(holdNoCustodians);

    const result = await holdService.getHoldCompliance(mockTenantId, mockHoldId);

    expect(result?.complianceRate).toBe(100);
    expect(result?.totalCustodians).toBe(0);
  });
});

// =============================================================================
// getHoldAuditLog Tests
// =============================================================================

describe('holdService.getHoldAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return paginated audit log', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(mockHold);
    (prisma.holdAuditLog.findMany as any).mockResolvedValue([
      { id: '1', action: 'CREATED', description: 'Hold created' },
      { id: '2', action: 'UPDATED', description: 'Hold updated' },
    ]);
    (prisma.holdAuditLog.count as any).mockResolvedValue(2);

    const result = await holdService.getHoldAuditLog(mockTenantId, mockHoldId);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.totalItems).toBe(2);
  });

  it('should throw error if hold not found', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(null);

    await expect(holdService.getHoldAuditLog(mockTenantId, 'nonexistent')).rejects.toThrow(
      'Hold not found'
    );
  });

  it('should respect pagination options', async () => {
    (prisma.legalHold.findFirst as any).mockResolvedValue(mockHold);
    (prisma.holdAuditLog.findMany as any).mockResolvedValue([]);
    (prisma.holdAuditLog.count as any).mockResolvedValue(100);

    const result = await holdService.getHoldAuditLog(mockTenantId, mockHoldId, {
      page: 3,
      pageSize: 25,
    });

    expect(result.pagination.page).toBe(3);
    expect(result.pagination.pageSize).toBe(25);
    expect(result.pagination.totalPages).toBe(4);
    expect(prisma.holdAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 50, // (3-1) * 25
        take: 25,
      })
    );
  });
});

// =============================================================================
// getHoldsDashboard Tests
// =============================================================================

describe('holdService.getHoldsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return dashboard summary', async () => {
    (prisma.legalHold.groupBy as any)
      .mockResolvedValueOnce([
        { status: 'DRAFT', _count: { status: 5 } },
        { status: 'ACTIVE', _count: { status: 10 } },
        { status: 'RELEASED', _count: { status: 3 } },
      ])
      .mockResolvedValueOnce([
        { priority: 'HIGH', _count: { priority: 3 } },
        { priority: 'NORMAL', _count: { priority: 7 } },
      ]);
    (prisma.legalHold.count as any).mockResolvedValue(2); // overdue
    (prisma.legalHold.findMany as any).mockResolvedValue([mockHold]);

    const result = await holdService.getHoldsDashboard(mockTenantId);

    expect(result.byStatus.DRAFT).toBe(5);
    expect(result.byStatus.ACTIVE).toBe(10);
    expect(result.byPriority.HIGH).toBe(3);
    expect(result.overdueHolds).toBe(2);
    expect(result.recentHolds).toHaveLength(1);
  });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('holdService edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle empty search results', async () => {
    (prisma.legalHold.findMany as any).mockResolvedValue([]);
    (prisma.legalHold.count as any).mockResolvedValue(0);

    const result = await holdService.listHolds(mockTenantId, {
      search: 'nonexistent term xyz',
    });

    expect(result.data).toHaveLength(0);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it('should handle date ranges in create', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(mockMatter);
    (prisma.legalHold.create as any).mockResolvedValue(mockHold);
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    await holdService.createHold(mockTenantId, mockUserId, {
      matterId: mockMatterId,
      holdNumber: 'HOLD-003',
      name: 'Date Range Hold',
      dateRangeStart: '2024-01-01',
      dateRangeEnd: '2024-12-31',
    });

    expect(prisma.legalHold.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dateRangeStart: expect.any(Date),
          dateRangeEnd: expect.any(Date),
        }),
      })
    );
  });

  it('should handle metadata as JSON', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(mockMatter);
    (prisma.legalHold.create as any).mockResolvedValue(mockHold);
    (prisma.holdAuditLog.create as any).mockResolvedValue({});

    const metadata = { customField: 'value', nested: { data: 123 } };

    await holdService.createHold(mockTenantId, mockUserId, {
      matterId: mockMatterId,
      holdNumber: 'HOLD-004',
      name: 'Metadata Hold',
      metadata,
    });

    expect(prisma.legalHold.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata,
        }),
      })
    );
  });
});
