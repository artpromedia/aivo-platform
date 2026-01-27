/**
 * AIVO Residency Service - Core Residency Service
 */

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// REGIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function listRegions(options: any = {}) {
  const { isActive, jurisdiction } = options;
  return prisma.region.findMany({
    where: { ...(isActive !== undefined && { isActive }), ...(jurisdiction && { jurisdiction }) },
    orderBy: { displayName: 'asc' },
  });
}

export async function getRegion(regionId: string) {
  return prisma.region.findUnique({
    where: { id: regionId },
    include: { storageEndpoints: { where: { status: 'ACTIVE' } } },
  });
}

export async function getRegionByCode(code: string) {
  return prisma.region.findUnique({ where: { code } });
}

// ══════════════════════════════════════════════════════════════════════════════
// DATA CLASSIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function listClassifications(tenantId: string) {
  return prisma.dataClassification.findMany({
    where: { OR: [{ tenantId: null }, { tenantId }], isActive: true },
    orderBy: { sensitivityLevel: 'desc' },
  });
}

export async function createClassification(tenantId: string, input: any) {
  return prisma.dataClassification.create({
    data: { tenantId, ...input },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// RESIDENCY POLICIES
// ══════════════════════════════════════════════════════════════════════════════

export async function createPolicy(tenantId: string, userId: string, input: any) {
  const policy = await prisma.dataResidencyPolicy.create({
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

export async function getPolicy(tenantId: string, policyId: string) {
  return prisma.dataResidencyPolicy.findFirst({
    where: { id: policyId, tenantId },
    include: { primaryRegion: true, routingRules: { where: { isActive: true } } },
  });
}

export async function listPolicies(tenantId: string, options: any = {}) {
  const { isActive, page = 1, pageSize = 20 } = options;
  const where = { tenantId, ...(isActive !== undefined && { isActive }) };
  const skip = (page - 1) * pageSize;

  const [policies, totalItems] = await Promise.all([
    prisma.dataResidencyPolicy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { primaryRegion: { select: { code: true, displayName: true } } },
    }),
    prisma.dataResidencyPolicy.count({ where }),
  ]);

  return { data: policies, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

export async function updatePolicy(tenantId: string, policyId: string, userId: string, input: any) {
  const policy = await prisma.dataResidencyPolicy.update({
    where: { id: policyId },
    data: input,
  });
  await logAction(tenantId, 'POLICY_UPDATED', 'Policy', policyId, `Updated policy: ${policy.name}`, userId);
  return policy;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTING RULES
// ══════════════════════════════════════════════════════════════════════════════

export async function createRoutingRule(tenantId: string, input: any) {
  return prisma.routingRule.create({
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
      conditions: input.conditions,
      priority: input.priority ?? 0,
      isActive: true,
    },
  });
}

export async function getTargetRegion(tenantId: string, dataType: string, serviceName?: string): Promise<string | null> {
  const policies = await prisma.dataResidencyPolicy.findMany({
    where: { tenantId, isActive: true },
    include: {
      routingRules: {
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const policy of policies) {
    for (const rule of policy.routingRules) {
      // Check if rule matches
      const matchesDataType = rule.dataTypes.length === 0 || rule.dataTypes.includes(dataType);
      const matchesService = !serviceName || rule.servicePatterns.length === 0 ||
        rule.servicePatterns.some((p) => new RegExp(p.replace('*', '.*')).test(serviceName));

      if (matchesDataType && matchesService && rule.targetRegions.length > 0) {
        return rule.targetRegions[0] ?? null;
      }
    }

    // Fall back to primary region
    if (policy.primaryRegionId) {
      const region = await prisma.region.findUnique({ where: { id: policy.primaryRegionId } });
      return region?.code || null;
    }
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// DATA LOCATION
// ══════════════════════════════════════════════════════════════════════════════

export async function recordDataLocation(tenantId: string, input: any) {
  const location = await prisma.dataLocation.upsert({
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

export async function getDataLocations(tenantId: string, dataId: string) {
  return prisma.dataLocation.findMany({
    where: { tenantId, dataId, status: 'ACTIVE' },
    include: { region: true, endpoint: true },
  });
}

export async function listDataByRegion(tenantId: string, regionId: string, options: any = {}) {
  const { dataType, page = 1, pageSize = 50 } = options;
  const where = { tenantId, regionId, status: 'ACTIVE' as const, ...(dataType && { dataType }) };
  const skip = (page - 1) * pageSize;

  const [locations, totalItems] = await Promise.all([
    prisma.dataLocation.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
    prisma.dataLocation.count({ where }),
  ]);

  return { data: locations, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

// ══════════════════════════════════════════════════════════════════════════════
// CROSS-BORDER TRANSFERS
// ══════════════════════════════════════════════════════════════════════════════

export async function requestTransfer(tenantId: string, userId: string, input: any) {
  // Check if transfer is allowed
  const policy = await prisma.dataResidencyPolicy.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  const approvalRequired = policy?.crossBorderApproval || false;
  const destRegion = await prisma.region.findUnique({ where: { id: input.destRegionId } });

  // Check blocked regions
  if (policy?.blockedRegions?.includes(destRegion?.code || '')) {
    throw new Error(`Transfer to ${destRegion?.displayName} is blocked by policy`);
  }

  const transfer = await prisma.crossBorderTransfer.create({
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
      ...(input.consentDate && { consentDate: new Date(input.consentDate) }),
      approvalRequired,
      ...(approvalRequired && { approvalStatus: 'PENDING' as const }),
      status: approvalRequired ? 'PENDING' : 'APPROVED',
      requestedBy: userId,
    },
  });

  await logAction(tenantId, 'TRANSFER_REQUESTED', 'CrossBorderTransfer', transfer.id,
    `Transfer requested to ${destRegion?.displayName}`, userId, input.sourceRegionId, input.destRegionId);

  return transfer;
}

export async function approveTransfer(tenantId: string, transferId: string, userId: string, approved: boolean, notes?: string) {
  const transfer = await prisma.crossBorderTransfer.update({
    where: { id: transferId },
    data: {
      approvalStatus: approved ? 'APPROVED' : 'REJECTED',
      approvedBy: userId,
      approvedAt: new Date(),
      ...(notes && { approvalNotes: notes }),
      status: approved ? 'APPROVED' : 'CANCELLED',
    },
  });

  await logAction(tenantId, approved ? 'TRANSFER_APPROVED' : 'TRANSFER_REJECTED',
    'CrossBorderTransfer', transferId, `Transfer ${approved ? 'approved' : 'rejected'}`, userId);

  return transfer;
}

export async function completeTransfer(transferId: string) {
  return prisma.crossBorderTransfer.update({
    where: { id: transferId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}

export async function listTransfers(tenantId: string, options: any = {}) {
  const { status, sourceRegionId, destRegionId, page = 1, pageSize = 20 } = options;
  const where = { tenantId, ...(status && { status }), ...(sourceRegionId && { sourceRegionId }), ...(destRegionId && { destRegionId }) };
  const skip = (page - 1) * pageSize;

  const [transfers, totalItems] = await Promise.all([
    prisma.crossBorderTransfer.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip,
      take: pageSize,
      include: { sourceRegion: true, destRegion: true },
    }),
    prisma.crossBorderTransfer.count({ where }),
  ]);

  return { data: transfers, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE CHECKS
// ══════════════════════════════════════════════════════════════════════════════

export async function runComplianceCheck(tenantId: string, userId: string, checkType: string, scope?: string) {
  const findings: any[] = [];
  const violations: any[] = [];
  let isCompliant = true;

  if (checkType === 'DATA_LOCATION' || checkType === 'FULL_AUDIT') {
    // Check data locations against policies
    const policy = await prisma.dataResidencyPolicy.findFirst({ where: { tenantId, isActive: true } });
    if (policy) {
      const locationsInBlockedRegions = await prisma.dataLocation.findMany({
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
    const unencryptedData = await prisma.dataLocation.count({
      where: { tenantId, status: 'ACTIVE', isEncrypted: false },
    });
    if (unencryptedData > 0) {
      findings.push({ type: 'UNENCRYPTED_DATA', description: `${unencryptedData} unencrypted data objects`, count: unencryptedData });
    }
  }

  const check = await prisma.complianceCheck.create({
    data: {
      tenantId,
      checkType: checkType as any,
      scope: scope ?? null,
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

export async function listComplianceChecks(tenantId: string, options: any = {}) {
  const { checkType, status, page = 1, pageSize = 20 } = options;
  const where = { tenantId, ...(checkType && { checkType }), ...(status && { status }) };
  const skip = (page - 1) * pageSize;

  const [checks, totalItems] = await Promise.all([
    prisma.complianceCheck.findMany({ where, orderBy: { checkedAt: 'desc' }, skip, take: pageSize }),
    prisma.complianceCheck.count({ where }),
  ]);

  return { data: checks, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

export async function getDashboard(tenantId: string) {
  const [
    totalDataLocations,
    locationsByRegion,
    pendingTransfers,
    recentViolations,
    policies,
  ] = await Promise.all([
    prisma.dataLocation.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.dataLocation.groupBy({ by: ['regionId'], where: { tenantId, status: 'ACTIVE' }, _count: { regionId: true } }),
    prisma.crossBorderTransfer.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.complianceCheck.count({ where: { tenantId, isCompliant: false, checkedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    prisma.dataResidencyPolicy.count({ where: { tenantId, isActive: true } }),
  ]);

  const regions = await prisma.region.findMany({ where: { isActive: true }, select: { id: true, displayName: true } });
  const regionMap = new Map(regions.map((r) => [r.id, r.displayName]));

  return {
    totalDataLocations,
    locationsByRegion: locationsByRegion.map((l) => ({ region: regionMap.get(l.regionId) || l.regionId, count: l._count.regionId })),
    pendingTransfers,
    recentViolations,
    activePolicies: policies,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ══════════════════════════════════════════════════════════════════════════════

async function logAction(tenantId: string, action: string, resourceType: string, resourceId: string | null, description: string, performedBy: string, sourceRegion?: string, destRegion?: string) {
  await prisma.residencyAuditLog.create({
    data: { tenantId, action, resourceType, resourceId, description, performedBy, sourceRegion: sourceRegion ?? null, destRegion: destRegion ?? null },
  });
}

export async function getAuditLog(tenantId: string, options: any = {}) {
  const { action, resourceType, page = 1, pageSize = 50 } = options;
  const where = { tenantId, ...(action && { action }), ...(resourceType && { resourceType }) };
  const skip = (page - 1) * pageSize;

  const [logs, totalItems] = await Promise.all([
    prisma.residencyAuditLog.findMany({ where, orderBy: { performedAt: 'desc' }, skip, take: pageSize }),
    prisma.residencyAuditLog.count({ where }),
  ]);

  return { data: logs, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}
