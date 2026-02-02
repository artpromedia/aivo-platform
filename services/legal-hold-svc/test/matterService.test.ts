/**
 * AIVO Legal Hold Service - Matter Service Tests
 *
 * Comprehensive tests for legal matter management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../src/prisma.js', () => {
  const mockPrisma = {
    legalMatter: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    matterCustodian: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    matterNote: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    matterActivity: {
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

import { prisma } from '../src/prisma.js';
import * as matterService from '../src/services/matterService.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockTenantId = 'tenant-123';
const mockUserId = 'user-456';
const mockMatterId = 'matter-789';

const mockMatter = {
  id: mockMatterId,
  tenantId: mockTenantId,
  matterNumber: 'MATTER-001',
  name: 'Test Legal Matter',
  description: 'Test matter description',
  matterType: 'LITIGATION',
  status: 'ACTIVE',
  riskLevel: 'MEDIUM',
  openedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  holds: [],
  custodians: [],
  _count: { holds: 0, custodians: 0, documents: 0, notes: 0 },
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
// createMatter Tests
// =============================================================================

describe('matterService.createMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a matter successfully', async () => {
    (prisma.legalMatter.create as any).mockResolvedValue(mockMatter);
    (prisma.matterActivity.create as any).mockResolvedValue({});

    const input = {
      matterNumber: 'MATTER-001',
      name: 'Test Legal Matter',
      matterType: 'LITIGATION',
    };

    const result = await matterService.createMatter(mockTenantId, mockUserId, input);

    expect(result).toBeDefined();
    expect(result.id).toBe(mockMatterId);
    expect(prisma.legalMatter.create).toHaveBeenCalled();
    expect(prisma.matterActivity.create).toHaveBeenCalled();
  });

  it('should apply default risk level', async () => {
    (prisma.legalMatter.create as any).mockResolvedValue(mockMatter);
    (prisma.matterActivity.create as any).mockResolvedValue({});

    const input = {
      matterNumber: 'MATTER-002',
      name: 'Default Risk Matter',
      matterType: 'INVESTIGATION',
    };

    await matterService.createMatter(mockTenantId, mockUserId, input);

    expect(prisma.legalMatter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          riskLevel: 'MEDIUM', // Default
        }),
      })
    );
  });

  it('should handle optional fields', async () => {
    (prisma.legalMatter.create as any).mockResolvedValue(mockMatter);
    (prisma.matterActivity.create as any).mockResolvedValue({});

    const input = {
      matterNumber: 'MATTER-003',
      name: 'Full Matter',
      matterType: 'LITIGATION',
      description: 'Full description',
      leadCounsel: 'John Doe',
      outsideCounsel: 'Jane Smith Law',
      jurisdiction: 'Texas',
      caseNumber: 'CASE-2024-001',
      opposingParty: 'Acme Corp',
      claimAmount: 1000000,
      riskLevel: 'HIGH',
      tags: ['urgent', 'contract'],
      metadata: { customField: 'value' },
    };

    await matterService.createMatter(mockTenantId, mockUserId, input);

    expect(prisma.legalMatter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadCounsel: 'John Doe',
          jurisdiction: 'Texas',
          claimAmount: 1000000,
          riskLevel: 'HIGH',
          tags: ['urgent', 'contract'],
        }),
      })
    );
  });
});

// =============================================================================
// getMatter Tests
// =============================================================================

describe('matterService.getMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get a matter with related data', async () => {
    const matterWithRelations = {
      ...mockMatter,
      holds: [{ id: 'hold-1', name: 'Test Hold' }],
      custodians: [{ custodian: mockCustodian }],
    };
    (prisma.legalMatter.findFirst as any).mockResolvedValue(matterWithRelations);

    const result = await matterService.getMatter(mockTenantId, mockMatterId);

    expect(result).toBeDefined();
    expect(result?.holds).toHaveLength(1);
    expect(prisma.legalMatter.findFirst).toHaveBeenCalledWith({
      where: { id: mockMatterId, tenantId: mockTenantId },
      include: expect.any(Object),
    });
  });

  it('should return null if matter not found', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(null);

    const result = await matterService.getMatter(mockTenantId, 'nonexistent');

    expect(result).toBeNull();
  });
});

// =============================================================================
// listMatters Tests
// =============================================================================

describe('matterService.listMatters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list matters with pagination', async () => {
    const mockMatters = [mockMatter, { ...mockMatter, id: 'matter-2' }];
    (prisma.legalMatter.findMany as any).mockResolvedValue(mockMatters);
    (prisma.legalMatter.count as any).mockResolvedValue(2);

    const result = await matterService.listMatters(mockTenantId, {
      page: 1,
      pageSize: 20,
    });

    expect(result.data).toHaveLength(2);
    expect(result.pagination.totalItems).toBe(2);
  });

  it('should filter by status', async () => {
    (prisma.legalMatter.findMany as any).mockResolvedValue([]);
    (prisma.legalMatter.count as any).mockResolvedValue(0);

    await matterService.listMatters(mockTenantId, {
      status: 'ACTIVE',
    });

    expect(prisma.legalMatter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
        }),
      })
    );
  });

  it('should filter by matterType', async () => {
    (prisma.legalMatter.findMany as any).mockResolvedValue([]);
    (prisma.legalMatter.count as any).mockResolvedValue(0);

    await matterService.listMatters(mockTenantId, {
      matterType: 'LITIGATION',
    });

    expect(prisma.legalMatter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          matterType: 'LITIGATION',
        }),
      })
    );
  });

  it('should filter by riskLevel', async () => {
    (prisma.legalMatter.findMany as any).mockResolvedValue([]);
    (prisma.legalMatter.count as any).mockResolvedValue(0);

    await matterService.listMatters(mockTenantId, {
      riskLevel: 'HIGH',
    });

    expect(prisma.legalMatter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          riskLevel: 'HIGH',
        }),
      })
    );
  });

  it('should search by name, matterNumber, or description', async () => {
    (prisma.legalMatter.findMany as any).mockResolvedValue([]);
    (prisma.legalMatter.count as any).mockResolvedValue(0);

    await matterService.listMatters(mockTenantId, {
      search: 'test search',
    });

    expect(prisma.legalMatter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(Object) }),
            expect.objectContaining({ matterNumber: expect.any(Object) }),
            expect.objectContaining({ description: expect.any(Object) }),
          ]),
        }),
      })
    );
  });

  it('should filter by date range', async () => {
    (prisma.legalMatter.findMany as any).mockResolvedValue([]);
    (prisma.legalMatter.count as any).mockResolvedValue(0);

    await matterService.listMatters(mockTenantId, {
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
    });

    expect(prisma.legalMatter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          openedAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });
});

// =============================================================================
// updateMatter Tests
// =============================================================================

describe('matterService.updateMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update a matter successfully', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(mockMatter);
    (prisma.legalMatter.update as any).mockResolvedValue({
      ...mockMatter,
      name: 'Updated Name',
    });
    (prisma.matterActivity.create as any).mockResolvedValue({});

    const result = await matterService.updateMatter(mockTenantId, mockMatterId, mockUserId, {
      name: 'Updated Name',
    });

    expect(result.name).toBe('Updated Name');
    expect(prisma.matterActivity.create).toHaveBeenCalled();
  });

  it('should throw error if matter not found', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(null);

    await expect(
      matterService.updateMatter(mockTenantId, 'nonexistent', mockUserId, {
        name: 'Test',
      })
    ).rejects.toThrow('Matter not found');
  });

  it('should set closedAt when status is CLOSED', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(mockMatter);
    (prisma.legalMatter.update as any).mockResolvedValue({
      ...mockMatter,
      status: 'CLOSED',
      closedAt: new Date(),
    });
    (prisma.matterActivity.create as any).mockResolvedValue({});

    await matterService.updateMatter(mockTenantId, mockMatterId, mockUserId, {
      status: 'CLOSED',
    });

    expect(prisma.legalMatter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          closedAt: expect.any(Date),
        }),
      })
    );
  });
});

// =============================================================================
// closeMatter Tests
// =============================================================================

describe('matterService.closeMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should close a matter without active holds', async () => {
    const matterNoHolds = { ...mockMatter, holds: [] };
    (prisma.legalMatter.findFirst as any).mockResolvedValue(matterNoHolds);
    (prisma.legalMatter.update as any).mockResolvedValue({
      ...mockMatter,
      status: 'CLOSED',
      closedAt: new Date(),
    });
    (prisma.matterActivity.create as any).mockResolvedValue({});

    const result = await matterService.closeMatter(
      mockTenantId,
      mockMatterId,
      mockUserId,
      'Matter resolved'
    );

    expect(result.status).toBe('CLOSED');
    expect(prisma.matterActivity.create).toHaveBeenCalled();
  });

  it('should throw error if matter has active holds', async () => {
    const matterWithHolds = {
      ...mockMatter,
      holds: [{ id: 'hold-1', status: 'ACTIVE' }],
    };
    (prisma.legalMatter.findFirst as any).mockResolvedValue(matterWithHolds);

    await expect(matterService.closeMatter(mockTenantId, mockMatterId, mockUserId)).rejects.toThrow(
      'Cannot close matter with active holds'
    );
  });

  it('should throw error if matter not found', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(null);

    await expect(
      matterService.closeMatter(mockTenantId, 'nonexistent', mockUserId)
    ).rejects.toThrow('Matter not found');
  });
});

// =============================================================================
// addCustodianToMatter Tests
// =============================================================================

describe('matterService.addCustodianToMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a custodian to a matter', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(mockMatter);
    (prisma.custodian.findFirst as any).mockResolvedValue(mockCustodian);
    (prisma.matterCustodian.upsert as any).mockResolvedValue({
      matterId: mockMatterId,
      custodianId: mockCustodian.id,
      custodian: mockCustodian,
    });
    (prisma.matterActivity.create as any).mockResolvedValue({});

    const result = await matterService.addCustodianToMatter(
      mockTenantId,
      mockMatterId,
      mockCustodian.id,
      mockUserId,
      { role: 'KEY_WITNESS', relevance: 'HIGH' }
    );

    expect(result.custodianId).toBe(mockCustodian.id);
    expect(prisma.matterCustodian.upsert).toHaveBeenCalled();
  });

  it('should throw error if matter not found', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(null);
    (prisma.custodian.findFirst as any).mockResolvedValue(mockCustodian);

    await expect(
      matterService.addCustodianToMatter(mockTenantId, 'nonexistent', mockCustodian.id, mockUserId)
    ).rejects.toThrow('Matter not found');
  });

  it('should throw error if custodian not found', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(mockMatter);
    (prisma.custodian.findFirst as any).mockResolvedValue(null);

    await expect(
      matterService.addCustodianToMatter(
        mockTenantId,
        mockMatterId,
        'nonexistent-custodian',
        mockUserId
      )
    ).rejects.toThrow('Custodian not found');
  });
});

// =============================================================================
// removeCustodianFromMatter Tests
// =============================================================================

describe('matterService.removeCustodianFromMatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should remove a custodian from a matter', async () => {
    (prisma.matterCustodian.findFirst as any).mockResolvedValue({
      id: 'mc-123',
      matterId: mockMatterId,
      custodianId: mockCustodian.id,
      matter: { tenantId: mockTenantId },
      custodian: mockCustodian,
    });
    (prisma.matterCustodian.update as any).mockResolvedValue({});
    (prisma.matterActivity.create as any).mockResolvedValue({});

    await matterService.removeCustodianFromMatter(
      mockTenantId,
      mockMatterId,
      mockCustodian.id,
      mockUserId
    );

    expect(prisma.matterCustodian.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          removedAt: expect.any(Date),
          removedBy: mockUserId,
        }),
      })
    );
  });

  it('should throw error if matter custodian not found', async () => {
    (prisma.matterCustodian.findFirst as any).mockResolvedValue(null);

    await expect(
      matterService.removeCustodianFromMatter(mockTenantId, mockMatterId, 'nonexistent', mockUserId)
    ).rejects.toThrow('Matter custodian not found');
  });

  it('should throw error if tenant mismatch', async () => {
    (prisma.matterCustodian.findFirst as any).mockResolvedValue({
      id: 'mc-123',
      matter: { tenantId: 'different-tenant' },
      custodian: mockCustodian,
    });

    await expect(
      matterService.removeCustodianFromMatter(
        mockTenantId,
        mockMatterId,
        mockCustodian.id,
        mockUserId
      )
    ).rejects.toThrow('Matter custodian not found');
  });
});

// =============================================================================
// addMatterNote Tests
// =============================================================================

describe('matterService.addMatterNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a note to a matter', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(mockMatter);
    (prisma.matterNote.create as any).mockResolvedValue({
      id: 'note-123',
      matterId: mockMatterId,
      content: 'Test note',
      isPrivate: false,
    });

    const result = await matterService.addMatterNote(
      mockTenantId,
      mockMatterId,
      mockUserId,
      'Test note'
    );

    expect(result.content).toBe('Test note');
    expect(result.isPrivate).toBe(false);
  });

  it('should add a private note', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(mockMatter);
    (prisma.matterNote.create as any).mockResolvedValue({
      id: 'note-124',
      matterId: mockMatterId,
      content: 'Private note',
      isPrivate: true,
    });

    const result = await matterService.addMatterNote(
      mockTenantId,
      mockMatterId,
      mockUserId,
      'Private note',
      true
    );

    expect(result.isPrivate).toBe(true);
  });

  it('should throw error if matter not found', async () => {
    (prisma.legalMatter.findFirst as any).mockResolvedValue(null);

    await expect(
      matterService.addMatterNote(mockTenantId, 'nonexistent', mockUserId, 'Test note')
    ).rejects.toThrow('Matter not found');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('matterService edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle empty search results', async () => {
    (prisma.legalMatter.findMany as any).mockResolvedValue([]);
    (prisma.legalMatter.count as any).mockResolvedValue(0);

    const result = await matterService.listMatters(mockTenantId, {
      search: 'nonexistent matter xyz',
    });

    expect(result.data).toHaveLength(0);
    expect(result.pagination.totalItems).toBe(0);
  });

  it('should calculate correct pagination with many records', async () => {
    (prisma.legalMatter.findMany as any).mockResolvedValue([]);
    (prisma.legalMatter.count as any).mockResolvedValue(250);

    const result = await matterService.listMatters(mockTenantId, {
      page: 5,
      pageSize: 10,
    });

    expect(result.pagination.totalPages).toBe(25);
    expect(result.pagination.page).toBe(5);
    expect(prisma.legalMatter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 40, // (5-1) * 10
        take: 10,
      })
    );
  });

  it('should handle metadata as JSON', async () => {
    (prisma.legalMatter.create as any).mockResolvedValue(mockMatter);
    (prisma.matterActivity.create as any).mockResolvedValue({});

    const metadata = {
      externalCaseId: '12345',
      jurisdiction: { state: 'TX', county: 'Harris' },
      priority: 1,
    };

    await matterService.createMatter(mockTenantId, mockUserId, {
      matterNumber: 'MATTER-005',
      name: 'Metadata Matter',
      matterType: 'LITIGATION',
      metadata,
    });

    expect(prisma.legalMatter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata,
        }),
      })
    );
  });
});
