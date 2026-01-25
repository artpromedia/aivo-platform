/**
 * AIVO Legal Hold Service - Hold Service
 *
 * Manages legal holds and preservation orders.
 */

import { config } from '../config.js';
import { prisma, Prisma } from '../prisma.js';
import type {
  CreateHoldInput,
  UpdateHoldInput,
  IssueHoldInput,
  ReleaseHoldInput,
  ListHoldsQuery,
  PaginatedResponse,
  HoldComplianceSummary,
} from '../types/index.js';

/**
 * Create a new legal hold.
 */
export async function createHold(
  tenantId: string,
  userId: string,
  input: CreateHoldInput
) {
  // Verify matter exists
  const matter = await prisma.legalMatter.findFirst({
    where: { id: input.matterId, tenantId },
  });

  if (!matter) {
    throw new Error('Matter not found');
  }

  const hold = await prisma.legalHold.create({
    data: {
      tenantId,
      matterId: input.matterId,
      holdNumber: input.holdNumber,
      name: input.name,
      description: input.description,
      status: 'DRAFT',
      scopeDescription: input.scopeDescription,
      dataTypes: input.dataTypes || [],
      dateRangeStart: input.dateRangeStart ? new Date(input.dateRangeStart) : undefined,
      dateRangeEnd: input.dateRangeEnd ? new Date(input.dateRangeEnd) : undefined,
      keywords: input.keywords || [],
      notificationSubject: input.notificationSubject,
      notificationBody: input.notificationBody,
      reminderFrequency: input.reminderFrequency ?? config.holds.defaultReminderDays,
      escalationAfter: input.escalationAfter ?? config.holds.defaultEscalationDays,
      acknowledgmentDue: input.acknowledgmentDue ? new Date(input.acknowledgmentDue) : undefined,
      complianceDeadline: input.complianceDeadline ? new Date(input.complianceDeadline) : undefined,
      isConfidential: input.isConfidential ?? false,
      priority: input.priority || 'NORMAL',
      tags: input.tags || [],
      metadata: input.metadata as Prisma.InputJsonValue,
      createdBy: userId,
    },
  });

  await logHoldAudit(hold.id, 'CREATED', 'Hold created', userId);

  return hold;
}

/**
 * Get a hold by ID.
 */
export async function getHold(tenantId: string, holdId: string) {
  return prisma.legalHold.findFirst({
    where: { id: holdId, tenantId },
    include: {
      matter: {
        select: {
          id: true,
          matterNumber: true,
          name: true,
          status: true,
        },
      },
      custodians: {
        include: {
          custodian: {
            select: {
              id: true,
              email: true,
              displayName: true,
              department: true,
              status: true,
            },
          },
        },
        orderBy: { addedAt: 'desc' },
      },
      dataSources: {
        include: {
          dataSource: {
            select: {
              id: true,
              name: true,
              sourceType: true,
            },
          },
        },
      },
      _count: {
        select: {
          custodians: true,
          notifications: true,
          acknowledgments: true,
        },
      },
    },
  });
}

/**
 * List holds with filtering.
 */
export async function listHolds(
  tenantId: string,
  query: ListHoldsQuery
): Promise<PaginatedResponse<any>> {
  const { matterId, status, priority, search, page = 1, pageSize = 20 } = query;

  const where: any = {
    tenantId,
    ...(matterId && { matterId }),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { holdNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const skip = (page - 1) * pageSize;

  const [holds, totalItems] = await Promise.all([
    prisma.legalHold.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        matter: { select: { matterNumber: true, name: true } },
        _count: { select: { custodians: true, acknowledgments: true } },
      },
    }),
    prisma.legalHold.count({ where }),
  ]);

  return {
    data: holds,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Update a hold.
 */
export async function updateHold(
  tenantId: string,
  holdId: string,
  userId: string,
  input: UpdateHoldInput
) {
  const existing = await prisma.legalHold.findFirst({
    where: { id: holdId, tenantId },
  });

  if (!existing) {
    throw new Error('Hold not found');
  }

  // Cannot update certain fields if hold is active
  if (['ACTIVE', 'ISSUED'].includes(existing.status)) {
    const restrictedFields = ['scopeDescription', 'dataTypes', 'dateRangeStart', 'dateRangeEnd', 'keywords'];
    const attemptedRestricted = restrictedFields.filter((f) => f in input);
    if (attemptedRestricted.length > 0) {
      throw new Error(`Cannot modify ${attemptedRestricted.join(', ')} on an active hold`);
    }
  }

  const hold = await prisma.legalHold.update({
    where: { id: holdId },
    data: {
      name: input.name,
      description: input.description,
      status: input.status,
      scopeDescription: input.scopeDescription,
      dataTypes: input.dataTypes,
      dateRangeStart: input.dateRangeStart ? new Date(input.dateRangeStart) : undefined,
      dateRangeEnd: input.dateRangeEnd ? new Date(input.dateRangeEnd) : undefined,
      keywords: input.keywords,
      notificationSubject: input.notificationSubject,
      notificationBody: input.notificationBody,
      reminderFrequency: input.reminderFrequency,
      escalationAfter: input.escalationAfter,
      acknowledgmentDue: input.acknowledgmentDue ? new Date(input.acknowledgmentDue) : undefined,
      complianceDeadline: input.complianceDeadline ? new Date(input.complianceDeadline) : undefined,
      isConfidential: input.isConfidential,
      priority: input.priority,
      tags: input.tags,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });

  await logHoldAudit(holdId, 'UPDATED', 'Hold updated', userId, { changes: Object.keys(input) });

  return hold;
}

/**
 * Issue a hold (activate it).
 */
export async function issueHold(
  tenantId: string,
  holdId: string,
  userId: string,
  input: IssueHoldInput
) {
  const hold = await prisma.legalHold.findFirst({
    where: { id: holdId, tenantId },
  });

  if (!hold) {
    throw new Error('Hold not found');
  }

  if (!['DRAFT', 'APPROVED'].includes(hold.status)) {
    throw new Error(`Cannot issue hold in ${hold.status} status`);
  }

  // Add custodians to hold
  const custodianPromises = input.custodianIds.map((custodianId) =>
    prisma.holdCustodian.upsert({
      where: { holdId_custodianId: { holdId, custodianId } },
      create: {
        holdId,
        custodianId,
        status: 'PENDING',
        addedBy: userId,
      },
      update: {
        status: 'PENDING',
        releasedAt: null,
        releasedBy: null,
        releaseReason: null,
      },
    })
  );

  // Add data sources if specified
  const dataSourcePromises = (input.dataSourceIds || []).map((dataSourceId) =>
    prisma.holdDataSource.upsert({
      where: { holdId_dataSourceId: { holdId, dataSourceId } },
      create: {
        holdId,
        dataSourceId,
        status: 'PENDING',
      },
      update: {
        status: 'PENDING',
        releasedAt: null,
        releasedBy: null,
      },
    })
  );

  await Promise.all([...custodianPromises, ...dataSourcePromises]);

  // Update hold status
  const effectiveDate = input.effectiveAt ? new Date(input.effectiveAt) : new Date();
  const acknowledgmentDue = hold.acknowledgmentDue || new Date(
    effectiveDate.getTime() + config.holds.acknowledgmentDeadlineDays * 24 * 60 * 60 * 1000
  );

  const updatedHold = await prisma.legalHold.update({
    where: { id: holdId },
    data: {
      status: 'ISSUED',
      issuedAt: new Date(),
      effectiveAt: effectiveDate,
      acknowledgmentDue,
    },
  });

  await logHoldAudit(holdId, 'ISSUED', `Hold issued to ${input.custodianIds.length} custodians`, userId);

  return updatedHold;
}

/**
 * Release a hold.
 */
export async function releaseHold(
  tenantId: string,
  holdId: string,
  userId: string,
  input: ReleaseHoldInput
) {
  const hold = await prisma.legalHold.findFirst({
    where: { id: holdId, tenantId },
    include: {
      custodians: true,
      dataSources: true,
    },
  });

  if (!hold) {
    throw new Error('Hold not found');
  }

  if (!['ISSUED', 'ACTIVE'].includes(hold.status)) {
    throw new Error(`Cannot release hold in ${hold.status} status`);
  }

  // Create release record
  const release = await prisma.holdRelease.create({
    data: {
      holdId,
      releaseType: input.releaseType,
      reason: input.reason,
      notes: input.notes,
      approvedBy: userId,
      approvedAt: new Date(),
      executedAt: new Date(),
      executedBy: userId,
      affectedCustodians: input.custodianIds || hold.custodians.map((c) => c.custodianId),
      affectedSources: input.dataSourceIds || hold.dataSources.map((s) => s.dataSourceId),
    },
  });

  if (input.releaseType === 'FULL') {
    // Release all custodians and data sources
    await Promise.all([
      prisma.holdCustodian.updateMany({
        where: { holdId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
          releasedBy: userId,
          releaseReason: input.reason,
        },
      }),
      prisma.holdDataSource.updateMany({
        where: { holdId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
          releasedBy: userId,
        },
      }),
      prisma.legalHold.update({
        where: { id: holdId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
        },
      }),
    ]);
  } else if (input.releaseType === 'PARTIAL_CUSTODIAN' && input.custodianIds) {
    // Release specific custodians
    await prisma.holdCustodian.updateMany({
      where: {
        holdId,
        custodianId: { in: input.custodianIds },
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        releasedBy: userId,
        releaseReason: input.reason,
      },
    });
  } else if (input.releaseType === 'PARTIAL_SOURCE' && input.dataSourceIds) {
    // Release specific data sources
    await prisma.holdDataSource.updateMany({
      where: {
        holdId,
        dataSourceId: { in: input.dataSourceIds },
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        releasedBy: userId,
      },
    });
  }

  await logHoldAudit(holdId, 'RELEASED', `Hold ${input.releaseType} release: ${input.reason}`, userId);

  return release;
}

/**
 * Add a custodian to an existing hold.
 */
export async function addCustodianToHold(
  tenantId: string,
  holdId: string,
  custodianId: string,
  userId: string,
  options: { notes?: string; sendNotification?: boolean } = {}
) {
  const [hold, custodian] = await Promise.all([
    prisma.legalHold.findFirst({ where: { id: holdId, tenantId } }),
    prisma.custodian.findFirst({ where: { id: custodianId, tenantId } }),
  ]);

  if (!hold) throw new Error('Hold not found');
  if (!custodian) throw new Error('Custodian not found');

  const holdCustodian = await prisma.holdCustodian.upsert({
    where: { holdId_custodianId: { holdId, custodianId } },
    create: {
      holdId,
      custodianId,
      status: hold.status === 'DRAFT' ? 'PENDING' : 'PENDING',
      notes: options.notes,
      addedBy: userId,
    },
    update: {
      status: 'PENDING',
      notes: options.notes,
      releasedAt: null,
      releasedBy: null,
      releaseReason: null,
    },
    include: { custodian: true },
  });

  await logHoldAudit(holdId, 'CUSTODIAN_ADDED', `Added custodian: ${custodian.displayName}`, userId);

  return holdCustodian;
}

/**
 * Remove a custodian from a hold.
 */
export async function removeCustodianFromHold(
  tenantId: string,
  holdId: string,
  custodianId: string,
  userId: string,
  reason: string
) {
  const holdCustodian = await prisma.holdCustodian.findFirst({
    where: { holdId, custodianId },
    include: {
      hold: { select: { tenantId: true } },
      custodian: true,
    },
  });

  if (holdCustodian?.hold.tenantId !== tenantId) {
    throw new Error('Hold custodian not found');
  }

  await prisma.holdCustodian.update({
    where: { id: holdCustodian.id },
    data: {
      status: 'RELEASED',
      releasedAt: new Date(),
      releasedBy: userId,
      releaseReason: reason,
    },
  });

  await logHoldAudit(holdId, 'CUSTODIAN_RELEASED', `Released custodian: ${holdCustodian.custodian.displayName}`, userId);
}

/**
 * Get compliance summary for a hold.
 */
export async function getHoldCompliance(
  tenantId: string,
  holdId: string
): Promise<HoldComplianceSummary | null> {
  const hold = await prisma.legalHold.findFirst({
    where: { id: holdId, tenantId },
    include: {
      custodians: {
        where: { status: { not: 'RELEASED' } },
      },
    },
  });

  if (!hold) return null;

  const statusCounts = {
    acknowledged: 0,
    pending: 0,
    nonCompliant: 0,
    escalated: 0,
  };

  for (const hc of hold.custodians) {
    switch (hc.status) {
      case 'ACKNOWLEDGED':
        statusCounts.acknowledged++;
        break;
      case 'PENDING':
      case 'NOTIFIED':
        statusCounts.pending++;
        break;
      case 'NON_COMPLIANT':
        statusCounts.nonCompliant++;
        break;
      case 'ESCALATED':
        statusCounts.escalated++;
        break;
    }
  }

  const total = hold.custodians.length;
  const complianceRate = total > 0 ? (statusCounts.acknowledged / total) * 100 : 100;

  return {
    holdId: hold.id,
    holdName: hold.name,
    totalCustodians: total,
    acknowledged: statusCounts.acknowledged,
    pending: statusCounts.pending,
    nonCompliant: statusCounts.nonCompliant,
    escalated: statusCounts.escalated,
    complianceRate: Math.round(complianceRate * 100) / 100,
  };
}

/**
 * Get hold audit log.
 */
export async function getHoldAuditLog(
  tenantId: string,
  holdId: string,
  options: { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 50 } = options;

  const hold = await prisma.legalHold.findFirst({
    where: { id: holdId, tenantId },
  });

  if (!hold) throw new Error('Hold not found');

  const skip = (page - 1) * pageSize;

  const [logs, totalItems] = await Promise.all([
    prisma.holdAuditLog.findMany({
      where: { holdId },
      orderBy: { performedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.holdAuditLog.count({ where: { holdId } }),
  ]);

  return {
    data: logs,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Log hold audit entry.
 */
async function logHoldAudit(
  holdId: string,
  action: string,
  description: string,
  performedBy: string,
  details?: { previousState?: any; newState?: any; changes?: string[] }
) {
  await prisma.holdAuditLog.create({
    data: {
      holdId,
      action,
      description,
      previousState: details?.previousState,
      newState: details?.newState || (details?.changes ? { changes: details.changes } : undefined),
      performedBy,
    },
  });
}

/**
 * Get holds dashboard.
 */
export async function getHoldsDashboard(tenantId: string) {
  const [statusCounts, priorityCounts, overdueHolds, recentHolds] = await Promise.all([
    prisma.legalHold.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.legalHold.groupBy({
      by: ['priority'],
      where: { tenantId, status: { in: ['ACTIVE', 'ISSUED'] } },
      _count: { priority: true },
    }),
    prisma.legalHold.count({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'ISSUED'] },
        acknowledgmentDue: { lt: new Date() },
      },
    }),
    prisma.legalHold.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        matter: { select: { matterNumber: true } },
        _count: { select: { custodians: true } },
      },
    }),
  ]);

  return {
    byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count.status])),
    byPriority: Object.fromEntries(priorityCounts.map((p) => [p.priority, p._count.priority])),
    overdueHolds,
    recentHolds,
  };
}
