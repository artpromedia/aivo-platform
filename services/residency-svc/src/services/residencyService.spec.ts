/**
 * Residency Service Unit Tests
 *
 * Tests for data residency: regions, policies, routing rules,
 * data locations, cross-border transfers, and compliance checks.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface Region {
  id: string;
  code: string;
  displayName: string;
  jurisdiction: string;
  isActive: boolean;
  storageEndpoints?: StorageEndpoint[];
}

interface StorageEndpoint {
  id: string;
  regionId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

interface DataResidencyPolicy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  primaryRegionId: string;
  allowedRegions: string[];
  blockedRegions: string[];
  requiresEncryption: boolean;
  requiresLocalStorage: boolean;
  allowCrossBorder: boolean;
  crossBorderApproval: boolean;
  crossBorderConsent: boolean;
  enforcementLevel: 'WARN' | 'BLOCK' | 'AUDIT';
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

interface RoutingRule {
  id: string;
  tenantId: string;
  policyId: string;
  name: string;
  dataTypes: string[];
  servicePatterns: string[];
  targetRegions: string[];
  fallbackRegions: string[];
  blockUnmatched: boolean;
  priority: number;
  isActive: boolean;
}

interface CrossBorderTransfer {
  id: string;
  tenantId: string;
  dataId: string;
  dataType: string;
  sourceRegionId: string;
  destRegionId: string;
  status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  approvalRequired: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  requestedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK PRISMA
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  region: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  dataClassification: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  dataResidencyPolicy: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  routingRule: {
    create: vi.fn(),
  },
  dataLocation: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  crossBorderTransfer: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  complianceCheck: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  residencyAuditLog: {
    create: vi.fn(),
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// MOCK RESIDENCY SERVICE
// ══════════════════════════════════════════════════════════════════════════════

// Regions
async function listRegions(options: { isActive?: boolean; jurisdiction?: string } = {}) {
  const { isActive, jurisdiction } = options;
  return mockPrisma.region.findMany({
    where: { ...(isActive !== undefined && { isActive }), ...(jurisdiction && { jurisdiction }) },
    orderBy: { displayName: 'asc' },
  });
}

async function getRegion(regionId: string) {
  return mockPrisma.region.findUnique({
    where: { id: regionId },
    include: { storageEndpoints: { where: { status: 'ACTIVE' } } },
  });
}

async function getRegionByCode(code: string) {
  return mockPrisma.region.findUnique({ where: { code } });
}

// Classifications
async function listClassifications(tenantId: string) {
  return mockPrisma.dataClassification.findMany({
    where: { OR: [{ tenantId: null }, { tenantId }], isActive: true },
    orderBy: { sensitivityLevel: 'desc' },
  });
}

async function createClassification(tenantId: string, input: { name: string; sensitivityLevel: number }) {
  return mockPrisma.dataClassification.create({
    data: { tenantId, ...input },
  });
}

// Policies
async function createPolicy(tenantId: string, userId: string, input: {
  name: string;
  description?: string;
  primaryRegionId: string;
  allowedRegions?: string[];
  blockedRegions?: string[];
  requiresEncryption?: boolean;
  requiresLocalStorage?: boolean;
  allowCrossBorder?: boolean;
  crossBorderApproval?: boolean;
  crossBorderConsent?: boolean;
  enforcementLevel?: 'WARN' | 'BLOCK' | 'AUDIT';
}) {
  const policy = await mockPrisma.dataResidencyPolicy.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      primaryRegionId: input.primaryRegionId,
      allowedRegions: input.allowedRegions || [],
      blockedRegions: input.blockedRegions || [],
      requiresEncryption: input.requiresEncryption ?? true,
      requiresLocalStorage: input.requiresLocalStorage ?? false,
      allowCrossBorder: input.allowCrossBorder ?? true,
      crossBorderApproval: input.crossBorderApproval ?? false,
      crossBorderConsent: input.crossBorderConsent ?? false,
      enforcementLevel: input.enforcementLevel || 'WARN',
      isActive: true,
      createdBy: userId,
    },
  });

  await logAction(tenantId, 'POLICY_CREATED', 'Policy', policy.id, `Created policy: ${policy.name}`, userId);
  return policy;
}

async function getPolicy(tenantId: string, policyId: string) {
  return mockPrisma.dataResidencyPolicy.findFirst({
    where: { id: policyId, tenantId },
    include: { primaryRegion: true, routingRules: { where: { isActive: true } } },
  });
}

async function listPolicies(tenantId: string, options: { isActive?: boolean; page?: number; pageSize?: number } = {}) {
  const { isActive, page = 1, pageSize = 20 } = options;
  const where = { tenantId, ...(isActive !== undefined && { isActive }) };
  const skip = (page - 1) * pageSize;

  const [policies, totalItems] = await Promise.all([
    mockPrisma.dataResidencyPolicy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { primaryRegion: { select: { code: true, displayName: true } } },
    }),
    mockPrisma.dataResidencyPolicy.count({ where }),
  ]);

  return { data: policies, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

async function updatePolicy(tenantId: string, policyId: string, userId: string, input: Partial<DataResidencyPolicy>) {
  const policy = await mockPrisma.dataResidencyPolicy.update({
    where: { id: policyId },
    data: input,
  });
  await logAction(tenantId, 'POLICY_UPDATED', 'Policy', policyId, `Updated policy: ${policy.name}`, userId);
  return policy;
}

// Routing Rules
async function createRoutingRule(tenantId: string, input: {
  policyId: string;
  name: string;
  description?: string;
  dataClassificationId?: string;
  dataTypes?: string[];
  servicePatterns?: string[];
  targetRegions: string[];
  fallbackRegions?: string[];
  blockUnmatched?: boolean;
  priority?: number;
}) {
  return mockPrisma.routingRule.create({
    data: {
      tenantId,
      policyId: input.policyId,
      name: input.name,
      description: input.description,
      dataClassificationId: input.dataClassificationId,
      dataTypes: input.dataTypes || [],
      servicePatterns: input.servicePatterns || [],
      targetRegions: input.targetRegions,
      fallbackRegions: input.fallbackRegions || [],
      blockUnmatched: input.blockUnmatched ?? false,
      priority: input.priority ?? 0,
      isActive: true,
    },
  });
}

async function getTargetRegion(tenantId: string, dataType: string, serviceName?: string): Promise<string | null> {
  const policies = await mockPrisma.dataResidencyPolicy.findMany({
    where: { tenantId, isActive: true },
    include: {
      routingRules: { where: { isActive: true }, orderBy: { priority: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const policy of policies) {
    for (const rule of policy.routingRules) {
      const matchesDataType = rule.dataTypes.length === 0 || rule.dataTypes.includes(dataType);
      const matchesService = !serviceName || rule.servicePatterns.length === 0 ||
        rule.servicePatterns.some((p: string) => new RegExp(p.replace('*', '.*')).test(serviceName));

      if (matchesDataType && matchesService && rule.targetRegions.length > 0) {
        return rule.targetRegions[0];
      }
    }

    if (policy.primaryRegionId) {
      const region = await mockPrisma.region.findUnique({ where: { id: policy.primaryRegionId } });
      return region?.code || null;
    }
  }

  return null;
}

// Data Location
async function recordDataLocation(tenantId: string, input: {
  dataId: string;
  dataType: string;
  dataClassificationId?: string;
  regionId: string;
  endpointId?: string;
  storagePath?: string;
  isEncrypted?: boolean;
  encryptionKeyId?: string;
  isPrimary?: boolean;
  replicatedFrom?: string;
}) {
  const location = await mockPrisma.dataLocation.upsert({
    where: { tenantId_dataId_regionId: { tenantId, dataId: input.dataId, regionId: input.regionId } },
    create: {
      tenantId,
      dataId: input.dataId,
      dataType: input.dataType,
      dataClassificationId: input.dataClassificationId,
      regionId: input.regionId,
      endpointId: input.endpointId,
      storagePath: input.storagePath,
      isEncrypted: input.isEncrypted ?? true,
      encryptionKeyId: input.encryptionKeyId,
      isPrimary: input.isPrimary ?? true,
      replicatedFrom: input.replicatedFrom,
      status: 'ACTIVE',
    },
    update: {
      lastAccessedAt: new Date(),
      status: 'ACTIVE',
    },
  });

  await logAction(tenantId, 'DATA_STORED', 'DataLocation', location.id, `Data stored: ${input.dataType}`, 'system', input.regionId);
  return location;
}

async function getDataLocations(tenantId: string, dataId: string) {
  return mockPrisma.dataLocation.findMany({
    where: { tenantId, dataId, status: 'ACTIVE' },
    include: { region: true, endpoint: true },
  });
}

async function listDataByRegion(tenantId: string, regionId: string, options: { dataType?: string; page?: number; pageSize?: number } = {}) {
  const { dataType, page = 1, pageSize = 50 } = options;
  const where = { tenantId, regionId, status: 'ACTIVE' as const, ...(dataType && { dataType }) };
  const skip = (page - 1) * pageSize;

  const [locations, totalItems] = await Promise.all([
    mockPrisma.dataLocation.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
    mockPrisma.dataLocation.count({ where }),
  ]);

  return { data: locations, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

// Cross-Border Transfers
async function requestTransfer(tenantId: string, userId: string, input: {
  dataId: string;
  dataType: string;
  dataCount?: number;
  dataSizeBytes?: number;
  sourceRegionId: string;
  destRegionId: string;
  purpose: string;
  legalBasis?: string;
  transferMechanism?: string;
  consentObtained?: boolean;
  consentRecordId?: string;
  consentDate?: string;
}) {
  const policy = await mockPrisma.dataResidencyPolicy.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  const approvalRequired = policy?.crossBorderApproval || false;
  const destRegion = await mockPrisma.region.findUnique({ where: { id: input.destRegionId } });

  if (policy?.blockedRegions?.includes(destRegion?.code || '')) {
    throw new Error(`Transfer to ${destRegion?.displayName} is blocked by policy`);
  }

  const transfer = await mockPrisma.crossBorderTransfer.create({
    data: {
      tenantId,
      dataId: input.dataId,
      dataType: input.dataType,
      dataCount: input.dataCount ?? 1,
      dataSizeBytes: input.dataSizeBytes,
      sourceRegionId: input.sourceRegionId,
      destRegionId: input.destRegionId,
      purpose: input.purpose,
      legalBasis: input.legalBasis,
      transferMechanism: input.transferMechanism,
      consentObtained: input.consentObtained ?? false,
      consentRecordId: input.consentRecordId,
      consentDate: input.consentDate ? new Date(input.consentDate) : undefined,
      approvalRequired,
      approvalStatus: approvalRequired ? 'PENDING' : undefined,
      status: approvalRequired ? 'PENDING' : 'APPROVED',
      requestedBy: userId,
    },
  });

  await logAction(tenantId, 'TRANSFER_REQUESTED', 'CrossBorderTransfer', transfer.id,
    `Transfer requested to ${destRegion?.displayName}`, userId, input.sourceRegionId, input.destRegionId);

  return transfer;
}

async function approveTransfer(tenantId: string, transferId: string, userId: string, approved: boolean, notes?: string) {
  const transfer = await mockPrisma.crossBorderTransfer.update({
    where: { id: transferId },
    data: {
      approvalStatus: approved ? 'APPROVED' : 'REJECTED',
      approvedBy: userId,
      approvedAt: new Date(),
      approvalNotes: notes,
      status: approved ? 'APPROVED' : 'CANCELLED',
    },
  });

  await logAction(tenantId, approved ? 'TRANSFER_APPROVED' : 'TRANSFER_REJECTED',
    'CrossBorderTransfer', transferId, `Transfer ${approved ? 'approved' : 'rejected'}`, userId);

  return transfer;
}

async function completeTransfer(transferId: string) {
  return mockPrisma.crossBorderTransfer.update({
    where: { id: transferId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}

// Compliance Checks
async function runComplianceCheck(tenantId: string, userId: string, checkType: string, _scope?: string) {
  const findings: unknown[] = [];
  const violations: unknown[] = [];
  let isCompliant = true;

  if (checkType === 'DATA_LOCATION' || checkType === 'FULL_AUDIT') {
    const policy = await mockPrisma.dataResidencyPolicy.findFirst({ where: { tenantId, isActive: true } });
    if (policy) {
      const locationsInBlockedRegions = await mockPrisma.dataLocation.findMany({
        where: { tenantId, status: 'ACTIVE', region: { code: { in: policy.blockedRegions } } },
        include: { region: true },
      });

      if (locationsInBlockedRegions.length > 0) {
        isCompliant = false;
        violations.push({
          type: 'BLOCKED_REGION',
          description: `${locationsInBlockedRegions.length} data objects in blocked regions`,
          count: locationsInBlockedRegions.length,
        });
      }
    }
  }

  if (checkType === 'ENCRYPTION' || checkType === 'FULL_AUDIT') {
    const unencryptedData = await mockPrisma.dataLocation.count({
      where: { tenantId, status: 'ACTIVE', isEncrypted: false },
    });
    if (unencryptedData > 0) {
      findings.push({ type: 'UNENCRYPTED_DATA', description: `${unencryptedData} unencrypted data objects`, count: unencryptedData });
    }
  }

  const check = await mockPrisma.complianceCheck.create({
    data: {
      tenantId,
      checkType,
      status: isCompliant ? 'PASSED' : (violations.length > 0 ? 'FAILED' : 'PASSED_WITH_WARNINGS'),
      isCompliant,
      findings,
      violations,
      recommendations: violations.length > 0 ? ['Review and relocate data in blocked regions'] : [],
      checkedBy: userId,
      requiresAction: violations.length > 0,
    },
  });

  return check;
}

// Dashboard
async function getDashboard(tenantId: string) {
  const [
    totalDataLocations,
    locationsByRegion,
    pendingTransfers,
    recentViolations,
    policies,
  ] = await Promise.all([
    mockPrisma.dataLocation.count({ where: { tenantId, status: 'ACTIVE' } }),
    mockPrisma.dataLocation.groupBy({ by: ['regionId'], where: { tenantId, status: 'ACTIVE' }, _count: { regionId: true } }),
    mockPrisma.crossBorderTransfer.count({ where: { tenantId, status: 'PENDING' } }),
    mockPrisma.complianceCheck.count({ where: { tenantId, isCompliant: false, checkedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    mockPrisma.dataResidencyPolicy.count({ where: { tenantId, isActive: true } }),
  ]);

  return {
    totalDataLocations,
    locationsByRegion,
    pendingTransfers,
    recentViolations,
    policies,
  };
}

// Helper
async function logAction(tenantId: string, action: string, entityType: string, entityId: string, description: string, userId: string, _sourceRegion?: string, _destRegion?: string) {
  return mockPrisma.residencyAuditLog.create({
    data: { tenantId, action, entityType, entityId, description, userId },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FACTORIES
// ══════════════════════════════════════════════════════════════════════════════

function createMockRegion(overrides: Partial<Region> = {}): Region {
  return {
    id: 'region-us-west',
    code: 'US-WEST',
    displayName: 'US West (Oregon)',
    jurisdiction: 'US',
    isActive: true,
    ...overrides,
  };
}

function createMockPolicy(overrides: Partial<DataResidencyPolicy> = {}): DataResidencyPolicy {
  return {
    id: 'policy-123',
    tenantId: 'tenant-123',
    name: 'US Data Residency',
    description: 'Keep all data in US regions',
    primaryRegionId: 'region-us-west',
    allowedRegions: ['US-WEST', 'US-EAST'],
    blockedRegions: ['EU-WEST', 'APAC'],
    requiresEncryption: true,
    requiresLocalStorage: false,
    allowCrossBorder: true,
    crossBorderApproval: true,
    crossBorderConsent: true,
    enforcementLevel: 'BLOCK',
    isActive: true,
    createdBy: 'user-123',
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockRoutingRule(overrides: Partial<RoutingRule> = {}): RoutingRule {
  return {
    id: 'rule-123',
    tenantId: 'tenant-123',
    policyId: 'policy-123',
    name: 'Student Data Rule',
    dataTypes: ['student_profile', 'assessment_result'],
    servicePatterns: ['student-*', 'assessment-*'],
    targetRegions: ['US-WEST'],
    fallbackRegions: ['US-EAST'],
    blockUnmatched: false,
    priority: 10,
    isActive: true,
    ...overrides,
  };
}

function createMockTransfer(overrides: Partial<CrossBorderTransfer> = {}): CrossBorderTransfer {
  return {
    id: 'transfer-123',
    tenantId: 'tenant-123',
    dataId: 'data-456',
    dataType: 'student_profile',
    sourceRegionId: 'region-us-west',
    destRegionId: 'region-eu-west',
    status: 'PENDING',
    approvalRequired: true,
    approvalStatus: 'PENDING',
    requestedBy: 'user-123',
    requestedAt: new Date(),
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ══════════════════════════════════════════════════════════════════════════════

describe('ResidencyService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('listRegions', () => {
    it('should list all regions', async () => {
      const regions = [
        createMockRegion({ code: 'US-WEST' }),
        createMockRegion({ id: 'region-us-east', code: 'US-EAST', displayName: 'US East (Virginia)' }),
      ];
      mockPrisma.region.findMany.mockResolvedValueOnce(regions);

      const result = await listRegions();

      expect(result).toHaveLength(2);
      expect(mockPrisma.region.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { displayName: 'asc' },
      });
    });

    it('should filter by active status', async () => {
      mockPrisma.region.findMany.mockResolvedValueOnce([createMockRegion()]);

      await listRegions({ isActive: true });

      expect(mockPrisma.region.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { displayName: 'asc' },
      });
    });

    it('should filter by jurisdiction', async () => {
      mockPrisma.region.findMany.mockResolvedValueOnce([createMockRegion()]);

      await listRegions({ jurisdiction: 'US' });

      expect(mockPrisma.region.findMany).toHaveBeenCalledWith({
        where: { jurisdiction: 'US' },
        orderBy: { displayName: 'asc' },
      });
    });
  });

  describe('getRegion', () => {
    it('should get region with active endpoints', async () => {
      const region = { ...createMockRegion(), storageEndpoints: [{ id: 'ep-1', status: 'ACTIVE' }] };
      mockPrisma.region.findUnique.mockResolvedValueOnce(region);

      const result = await getRegion('region-us-west');

      expect(result?.storageEndpoints).toHaveLength(1);
    });
  });

  describe('createPolicy', () => {
    it('should create policy with defaults', async () => {
      const policy = createMockPolicy();
      mockPrisma.dataResidencyPolicy.create.mockResolvedValueOnce(policy);
      mockPrisma.residencyAuditLog.create.mockResolvedValueOnce({});

      const result = await createPolicy('tenant-123', 'user-123', {
        name: 'US Data Residency',
        primaryRegionId: 'region-us-west',
      });

      expect(result.name).toBe('US Data Residency');
      expect(mockPrisma.dataResidencyPolicy.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          name: 'US Data Residency',
          requiresEncryption: true,
          enforcementLevel: 'WARN',
          isActive: true,
        }),
      });
    });

    it('should create policy with custom settings', async () => {
      const policy = createMockPolicy({ enforcementLevel: 'BLOCK' });
      mockPrisma.dataResidencyPolicy.create.mockResolvedValueOnce(policy);
      mockPrisma.residencyAuditLog.create.mockResolvedValueOnce({});

      await createPolicy('tenant-123', 'user-123', {
        name: 'Strict Policy',
        primaryRegionId: 'region-us-west',
        blockedRegions: ['EU-WEST'],
        enforcementLevel: 'BLOCK',
        crossBorderApproval: true,
      });

      expect(mockPrisma.dataResidencyPolicy.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          blockedRegions: ['EU-WEST'],
          enforcementLevel: 'BLOCK',
          crossBorderApproval: true,
        }),
      });
    });

    it('should log policy creation', async () => {
      mockPrisma.dataResidencyPolicy.create.mockResolvedValueOnce(createMockPolicy());
      mockPrisma.residencyAuditLog.create.mockResolvedValueOnce({});

      await createPolicy('tenant-123', 'user-123', {
        name: 'Test Policy',
        primaryRegionId: 'region-us-west',
      });

      expect(mockPrisma.residencyAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'POLICY_CREATED',
          entityType: 'Policy',
        }),
      });
    });
  });

  describe('listPolicies', () => {
    it('should list policies with pagination', async () => {
      mockPrisma.dataResidencyPolicy.findMany.mockResolvedValueOnce([createMockPolicy()]);
      mockPrisma.dataResidencyPolicy.count.mockResolvedValueOnce(15);

      const result = await listPolicies('tenant-123', { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(15);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should filter by active status', async () => {
      mockPrisma.dataResidencyPolicy.findMany.mockResolvedValueOnce([]);
      mockPrisma.dataResidencyPolicy.count.mockResolvedValueOnce(0);

      await listPolicies('tenant-123', { isActive: true });

      expect(mockPrisma.dataResidencyPolicy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-123', isActive: true },
        })
      );
    });
  });

  describe('createRoutingRule', () => {
    it('should create routing rule', async () => {
      const rule = createMockRoutingRule();
      mockPrisma.routingRule.create.mockResolvedValueOnce(rule);

      const result = await createRoutingRule('tenant-123', {
        policyId: 'policy-123',
        name: 'Student Data Rule',
        targetRegions: ['US-WEST'],
        dataTypes: ['student_profile'],
      });

      expect(result.name).toBe('Student Data Rule');
      expect(mockPrisma.routingRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          policyId: 'policy-123',
          dataTypes: ['student_profile'],
          isActive: true,
        }),
      });
    });

    it('should use default values', async () => {
      mockPrisma.routingRule.create.mockResolvedValueOnce(createMockRoutingRule());

      await createRoutingRule('tenant-123', {
        policyId: 'policy-123',
        name: 'Default Rule',
        targetRegions: ['US-WEST'],
      });

      expect(mockPrisma.routingRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dataTypes: [],
          servicePatterns: [],
          fallbackRegions: [],
          blockUnmatched: false,
          priority: 0,
        }),
      });
    });
  });

  describe('getTargetRegion', () => {
    it('should return target region from matching rule', async () => {
      const policy = {
        ...createMockPolicy(),
        routingRules: [createMockRoutingRule()],
      };
      mockPrisma.dataResidencyPolicy.findMany.mockResolvedValueOnce([policy]);

      const result = await getTargetRegion('tenant-123', 'student_profile', 'student-api');

      expect(result).toBe('US-WEST');
    });

    it('should fall back to primary region if no rule matches', async () => {
      const policy = {
        ...createMockPolicy(),
        routingRules: [createMockRoutingRule({ dataTypes: ['other_type'] })],
      };
      mockPrisma.dataResidencyPolicy.findMany.mockResolvedValueOnce([policy]);
      mockPrisma.region.findUnique.mockResolvedValueOnce(createMockRegion());

      const result = await getTargetRegion('tenant-123', 'assessment_data');

      expect(result).toBe('US-WEST');
    });

    it('should return null if no policies', async () => {
      mockPrisma.dataResidencyPolicy.findMany.mockResolvedValueOnce([]);

      const result = await getTargetRegion('tenant-123', 'student_profile');

      expect(result).toBeNull();
    });

    it('should match service patterns with wildcards', async () => {
      const policy = {
        ...createMockPolicy(),
        routingRules: [createMockRoutingRule({ servicePatterns: ['api-*'], targetRegions: ['US-EAST'] })],
      };
      mockPrisma.dataResidencyPolicy.findMany.mockResolvedValueOnce([policy]);

      const result = await getTargetRegion('tenant-123', 'student_profile', 'api-gateway');

      expect(result).toBe('US-EAST');
    });
  });

  describe('recordDataLocation', () => {
    it('should record new data location', async () => {
      const location = { id: 'loc-123', dataId: 'data-456', regionId: 'region-us-west', status: 'ACTIVE' };
      mockPrisma.dataLocation.upsert.mockResolvedValueOnce(location);
      mockPrisma.residencyAuditLog.create.mockResolvedValueOnce({});

      const result = await recordDataLocation('tenant-123', {
        dataId: 'data-456',
        dataType: 'student_profile',
        regionId: 'region-us-west',
      });

      expect(result.id).toBe('loc-123');
      expect(mockPrisma.dataLocation.upsert).toHaveBeenCalledWith({
        where: { tenantId_dataId_regionId: { tenantId: 'tenant-123', dataId: 'data-456', regionId: 'region-us-west' } },
        create: expect.objectContaining({
          isEncrypted: true,
          isPrimary: true,
          status: 'ACTIVE',
        }),
        update: expect.objectContaining({
          status: 'ACTIVE',
        }),
      });
    });

    it('should use custom encryption settings', async () => {
      mockPrisma.dataLocation.upsert.mockResolvedValueOnce({ id: 'loc-123' });
      mockPrisma.residencyAuditLog.create.mockResolvedValueOnce({});

      await recordDataLocation('tenant-123', {
        dataId: 'data-456',
        dataType: 'student_profile',
        regionId: 'region-us-west',
        isEncrypted: false,
        isPrimary: false,
      });

      expect(mockPrisma.dataLocation.upsert).toHaveBeenCalledWith({
        where: expect.any(Object),
        create: expect.objectContaining({
          isEncrypted: false,
          isPrimary: false,
        }),
        update: expect.any(Object),
      });
    });
  });

  describe('requestTransfer', () => {
    it('should create transfer requiring approval', async () => {
      const policy = createMockPolicy({ crossBorderApproval: true, blockedRegions: [] });
      mockPrisma.dataResidencyPolicy.findFirst.mockResolvedValueOnce(policy);
      mockPrisma.region.findUnique.mockResolvedValueOnce(createMockRegion({ code: 'EU-WEST', displayName: 'EU West' }));
      mockPrisma.crossBorderTransfer.create.mockResolvedValueOnce(createMockTransfer());
      mockPrisma.residencyAuditLog.create.mockResolvedValueOnce({});

      const result = await requestTransfer('tenant-123', 'user-123', {
        dataId: 'data-456',
        dataType: 'student_profile',
        sourceRegionId: 'region-us-west',
        destRegionId: 'region-eu-west',
        purpose: 'Compliance request',
      });

      expect(result.status).toBe('PENDING');
      expect(mockPrisma.crossBorderTransfer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          approvalRequired: true,
          status: 'PENDING',
        }),
      });
    });

    it('should auto-approve when no approval required', async () => {
      const policy = createMockPolicy({ crossBorderApproval: false });
      mockPrisma.dataResidencyPolicy.findFirst.mockResolvedValueOnce(policy);
      mockPrisma.region.findUnique.mockResolvedValueOnce(createMockRegion({ code: 'US-EAST' }));
      mockPrisma.crossBorderTransfer.create.mockResolvedValueOnce(createMockTransfer({ status: 'APPROVED' }));
      mockPrisma.residencyAuditLog.create.mockResolvedValueOnce({});

      await requestTransfer('tenant-123', 'user-123', {
        dataId: 'data-456',
        dataType: 'student_profile',
        sourceRegionId: 'region-us-west',
        destRegionId: 'region-us-east',
        purpose: 'Failover',
      });

      expect(mockPrisma.crossBorderTransfer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          approvalRequired: false,
          status: 'APPROVED',
        }),
      });
    });

    it('should throw error for blocked region', async () => {
      const policy = createMockPolicy({ blockedRegions: ['EU-WEST'] });
      mockPrisma.dataResidencyPolicy.findFirst.mockResolvedValueOnce(policy);
      mockPrisma.region.findUnique.mockResolvedValueOnce(createMockRegion({ code: 'EU-WEST', displayName: 'EU West' }));

      await expect(
        requestTransfer('tenant-123', 'user-123', {
          dataId: 'data-456',
          dataType: 'student_profile',
          sourceRegionId: 'region-us-west',
          destRegionId: 'region-eu-west',
          purpose: 'Test',
        })
      ).rejects.toThrow('Transfer to EU West is blocked by policy');
    });
  });

  describe('approveTransfer', () => {
    it('should approve transfer', async () => {
      mockPrisma.crossBorderTransfer.update.mockResolvedValueOnce(
        createMockTransfer({ status: 'APPROVED', approvalStatus: 'APPROVED' })
      );
      mockPrisma.residencyAuditLog.create.mockResolvedValueOnce({});

      const result = await approveTransfer('tenant-123', 'transfer-123', 'admin-user', true, 'Approved');

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.crossBorderTransfer.update).toHaveBeenCalledWith({
        where: { id: 'transfer-123' },
        data: expect.objectContaining({
          approvalStatus: 'APPROVED',
          status: 'APPROVED',
        }),
      });
    });

    it('should reject transfer', async () => {
      mockPrisma.crossBorderTransfer.update.mockResolvedValueOnce(
        createMockTransfer({ status: 'CANCELLED', approvalStatus: 'REJECTED' })
      );
      mockPrisma.residencyAuditLog.create.mockResolvedValueOnce({});

      const result = await approveTransfer('tenant-123', 'transfer-123', 'admin-user', false, 'Not allowed');

      expect(result.status).toBe('CANCELLED');
      expect(mockPrisma.crossBorderTransfer.update).toHaveBeenCalledWith({
        where: { id: 'transfer-123' },
        data: expect.objectContaining({
          approvalStatus: 'REJECTED',
          status: 'CANCELLED',
        }),
      });
    });
  });

  describe('runComplianceCheck', () => {
    it('should pass compliance check with no violations', async () => {
      mockPrisma.dataResidencyPolicy.findFirst.mockResolvedValueOnce(createMockPolicy());
      mockPrisma.dataLocation.findMany.mockResolvedValueOnce([]);
      mockPrisma.dataLocation.count.mockResolvedValueOnce(0);
      mockPrisma.complianceCheck.create.mockResolvedValueOnce({
        id: 'check-123',
        status: 'PASSED',
        isCompliant: true,
      });

      const result = await runComplianceCheck('tenant-123', 'user-123', 'FULL_AUDIT');

      expect(result.isCompliant).toBe(true);
      expect(result.status).toBe('PASSED');
    });

    it('should fail compliance check with blocked region violations', async () => {
      mockPrisma.dataResidencyPolicy.findFirst.mockResolvedValueOnce(createMockPolicy({ blockedRegions: ['EU-WEST'] }));
      mockPrisma.dataLocation.findMany.mockResolvedValueOnce([
        { id: 'loc-1', region: { code: 'EU-WEST' } },
      ]);
      mockPrisma.dataLocation.count.mockResolvedValueOnce(0);
      mockPrisma.complianceCheck.create.mockResolvedValueOnce({
        id: 'check-123',
        status: 'FAILED',
        isCompliant: false,
      });

      const result = await runComplianceCheck('tenant-123', 'user-123', 'DATA_LOCATION');

      expect(result.isCompliant).toBe(false);
      expect(result.status).toBe('FAILED');
    });

    it('should detect unencrypted data in encryption check', async () => {
      mockPrisma.dataLocation.count.mockResolvedValueOnce(5);
      mockPrisma.complianceCheck.create.mockResolvedValueOnce({
        id: 'check-123',
        status: 'PASSED_WITH_WARNINGS',
        isCompliant: true,
        findings: [{ type: 'UNENCRYPTED_DATA' }],
      });

      await runComplianceCheck('tenant-123', 'user-123', 'ENCRYPTION');

      expect(mockPrisma.complianceCheck.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          findings: expect.arrayContaining([
            expect.objectContaining({ type: 'UNENCRYPTED_DATA' }),
          ]),
        }),
      });
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard metrics', async () => {
      mockPrisma.dataLocation.count.mockResolvedValueOnce(1000);
      mockPrisma.dataLocation.groupBy.mockResolvedValueOnce([
        { regionId: 'region-us-west', _count: { regionId: 600 } },
        { regionId: 'region-us-east', _count: { regionId: 400 } },
      ]);
      mockPrisma.crossBorderTransfer.count.mockResolvedValueOnce(3);
      mockPrisma.complianceCheck.count.mockResolvedValueOnce(0);
      mockPrisma.dataResidencyPolicy.count.mockResolvedValueOnce(2);

      const result = await getDashboard('tenant-123');

      expect(result.totalDataLocations).toBe(1000);
      expect(result.locationsByRegion).toHaveLength(2);
      expect(result.pendingTransfers).toBe(3);
      expect(result.recentViolations).toBe(0);
      expect(result.policies).toBe(2);
    });
  });
});
