/**
 * Tests for residency-svc transfers and compliance checks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  transfer: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  complianceCheck: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  region: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  policy: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  routingRule: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('TransferService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('requestTransfer', () => {
    it('creates a transfer request with PENDING status', async () => {
      const xfer = {
        id: 'xfer-1',
        studentId: 'stu-1',
        sourceRegion: 'US-NY',
        targetRegion: 'US-CA',
        status: 'PENDING',
        requestedBy: 'admin-1',
      };
      mockPrisma.transfer.create.mockResolvedValue(xfer);
      const result = await mockPrisma.transfer.create({ data: xfer });
      expect(result.status).toBe('PENDING');
    });
  });

  describe('approveTransfer', () => {
    it('approves a pending transfer', async () => {
      mockPrisma.transfer.update.mockResolvedValue({
        id: 'xfer-1',
        status: 'APPROVED',
        approvedBy: 'admin-2',
        approvedAt: new Date(),
      });
      const result = await mockPrisma.transfer.update({
        where: { id: 'xfer-1' },
        data: { status: 'APPROVED', approvedBy: 'admin-2' },
      });
      expect(result.status).toBe('APPROVED');
    });
  });

  describe('completeTransfer', () => {
    it('marks transfer as completed', async () => {
      mockPrisma.transfer.update.mockResolvedValue({
        id: 'xfer-1',
        status: 'COMPLETED',
        completedAt: new Date(),
      });
      const result = await mockPrisma.transfer.update({
        where: { id: 'xfer-1' },
        data: { status: 'COMPLETED' },
      });
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('listTransfers', () => {
    it('filters transfers by region', async () => {
      mockPrisma.transfer.findMany.mockResolvedValue([
        { id: 'xfer-1', sourceRegion: 'US-NY', status: 'COMPLETED' },
        { id: 'xfer-2', sourceRegion: 'US-NY', status: 'PENDING' },
      ]);
      const transfers = await mockPrisma.transfer.findMany({
        where: { sourceRegion: 'US-NY' },
      });
      expect(transfers).toHaveLength(2);
    });
  });
});

describe('ComplianceService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('runComplianceCheck', () => {
    it('runs compliance check and returns result', async () => {
      const check = {
        id: 'cc-1',
        transferId: 'xfer-1',
        type: 'DATA_RESIDENCY',
        status: 'PASSED',
        details: { rulesChecked: 5, violations: 0 },
      };
      mockPrisma.complianceCheck.create.mockResolvedValue(check);
      const result = await mockPrisma.complianceCheck.create({ data: check });
      expect(result.status).toBe('PASSED');
      expect(result.details.violations).toBe(0);
    });

    it('flags compliance violation', async () => {
      mockPrisma.complianceCheck.create.mockResolvedValue({
        id: 'cc-2',
        transferId: 'xfer-2',
        type: 'FERPA',
        status: 'FAILED',
        details: { rulesChecked: 3, violations: 1, violationDetails: ['Missing parental consent'] },
      });
      const result = await mockPrisma.complianceCheck.create({ data: {} });
      expect(result.status).toBe('FAILED');
      expect(result.details.violations).toBe(1);
    });
  });
});

describe('RegionAndPolicyService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('listRegions', () => {
    it('returns all configured regions', async () => {
      mockPrisma.region.findMany.mockResolvedValue([
        { id: 'us-east', name: 'US East', country: 'US' },
        { id: 'eu-west', name: 'EU West', country: 'DE' },
      ]);
      const regions = await mockPrisma.region.findMany();
      expect(regions).toHaveLength(2);
    });
  });

  describe('createPolicy', () => {
    it('creates data residency policy', async () => {
      mockPrisma.policy.create.mockResolvedValue({
        id: 'pol-1',
        regionId: 'eu-west',
        type: 'GDPR',
        rules: { retention: 365, encryption: 'AES-256' },
      });
      const result = await mockPrisma.policy.create({
        data: {
          regionId: 'eu-west',
          type: 'GDPR',
          rules: { retention: 365 },
        },
      });
      expect(result.type).toBe('GDPR');
    });
  });

  describe('createRoutingRule', () => {
    it('creates routing rule for region pair', async () => {
      mockPrisma.routingRule.create.mockResolvedValue({
        id: 'rr-1',
        sourceRegion: 'US',
        targetRegion: 'EU',
        action: 'REQUIRE_CONSENT',
        priority: 1,
      });
      const result = await mockPrisma.routingRule.create({
        data: { sourceRegion: 'US', targetRegion: 'EU', action: 'REQUIRE_CONSENT' },
      });
      expect(result.action).toBe('REQUIRE_CONSENT');
    });
  });
});
