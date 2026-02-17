/**
 * AIVO Compliance Service - Legal Hold Module – Matter Service
 *
 * Manages legal matters and cases.
 */

import { prisma, Prisma } from '../../../prisma.js';
import type {
  CreateMatterInput,
  UpdateMatterInput,
  ListMattersQuery,
  PaginatedResponse,
  MatterSummary,
} from '../types.js';

/**
 * Create a new legal matter.
 */
export async function createMatter(
  tenantId: string,
  userId: string,
  input: CreateMatterInput,
) {
  const matter = await prisma.legalMatter.create({
    data: {
      tenantId,
      matterNumber: input.matterNumber,
      name: input.name,
      description: input.description,
      matterType: input.matterType,
      anticipatedEnd: input.anticipatedEnd ? new Date(input.anticipatedEnd) : undefined,
      leadCounsel: input.leadCounsel,
      outsideCounsel: input.outsideCounsel,
      paralegal: input.paralegal,
      jurisdiction: input.jurisdiction,
      caseNumber: input.caseNumber,
      opposingParty: input.opposingParty,
      claimAmount: input.claimAmount,
      riskLevel: input.riskLevel || 'MEDIUM',
      riskNotes: input.riskNotes,
      tags: input.tags || [],
      metadata: input.metadata as Prisma.InputJsonValue,
      createdBy: userId,
    },
  });

  await logMatterActivity(matter.id, 'CREATED', 'Matter created', userId);
  return matter;
}

/**
 * Get a matter by ID.
 */
export async function getMatter(tenantId: string, matterId: string) {
  return prisma.legalMatter.findFirst({
    where: { id: matterId, tenantId },
    include: {
      holds: {
        select: {
          id: true,
          holdNumber: true,
          name: true,
          status: true,
          issuedAt: true,
          _count: { select: { custodians: true } },
        },
        orderBy: { createdAt: 'desc' },
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
      },
      _count: {
        select: {
          holds: true,
          custodians: true,
          documents: true,
          notes: true,
        },
      },
    },
  });
}

/**
 * List matters with filtering.
 */
export async function listMatters(
  tenantId: string,
  query: ListMattersQuery,
): Promise<PaginatedResponse<any>> {
  const {
    status,
    matterType,
    riskLevel,
    search,
    fromDate,
    toDate,
    page = 1,
    pageSize = 20,
  } = query;

  const where: any = {
    tenantId,
    ...(status && { status }),
    ...(matterType && { matterType }),
    ...(riskLevel && { riskLevel }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { matterNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(fromDate || toDate
      ? {
          openedAt: {
            ...(fromDate && { gte: new Date(fromDate) }),
            ...(toDate && { lte: new Date(toDate) }),
          },
        }
      : {}),
  };

  const skip = (page - 1) * pageSize;

  const [matters, totalItems] = await Promise.all([
    prisma.legalMatter.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        _count: { select: { holds: true, custodians: true } },
      },
    }),
    prisma.legalMatter.count({ where }),
  ]);

  return {
    data: matters,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

/**
 * Update a matter.
 */
export async function updateMatter(
  tenantId: string,
  matterId: string,
  userId: string,
  input: UpdateMatterInput,
) {
  const existing = await prisma.legalMatter.findFirst({
    where: { id: matterId, tenantId },
  });
  if (!existing) throw new Error('Matter not found');

  const matter = await prisma.legalMatter.update({
    where: { id: matterId },
    data: {
      name: input.name,
      description: input.description,
      status: input.status,
      anticipatedEnd: input.anticipatedEnd ? new Date(input.anticipatedEnd) : undefined,
      leadCounsel: input.leadCounsel,
      outsideCounsel: input.outsideCounsel,
      paralegal: input.paralegal,
      jurisdiction: input.jurisdiction,
      caseNumber: input.caseNumber,
      opposingParty: input.opposingParty,
      claimAmount: input.claimAmount,
      riskLevel: input.riskLevel,
      riskNotes: input.riskNotes,
      tags: input.tags,
      metadata: input.metadata as Prisma.InputJsonValue,
      closedAt: input.status === 'CLOSED' ? new Date() : undefined,
    },
  });

  await logMatterActivity(matterId, 'UPDATED', 'Matter updated', userId, {
    changes: Object.keys(input),
  });

  return matter;
}

/**
 * Close a matter.
 */
export async function closeMatter(
  tenantId: string,
  matterId: string,
  userId: string,
  reason?: string,
) {
  const matter = await prisma.legalMatter.findFirst({
    where: { id: matterId, tenantId },
    include: { holds: { where: { status: { in: ['ACTIVE', 'ISSUED'] } } } },
  });
  if (!matter) throw new Error('Matter not found');
  if (matter.holds.length > 0) throw new Error('Cannot close matter with active holds');

  const updated = await prisma.legalMatter.update({
    where: { id: matterId },
    data: { status: 'CLOSED', closedAt: new Date() },
  });

  await logMatterActivity(matterId, 'CLOSED', reason || 'Matter closed', userId);
  return updated;
}

/**
 * Add a custodian to a matter.
 */
export async function addCustodianToMatter(
  tenantId: string,
  matterId: string,
  custodianId: string,
  userId: string,
  options: { role?: string; relevance?: string; notes?: string } = {},
) {
  const [matter, custodian] = await Promise.all([
    prisma.legalMatter.findFirst({ where: { id: matterId, tenantId } }),
    prisma.custodian.findFirst({ where: { id: custodianId, tenantId } }),
  ]);

  if (!matter) throw new Error('Matter not found');
  if (!custodian) throw new Error('Custodian not found');

  const mc = await prisma.matterCustodian.upsert({
    where: { matterId_custodianId: { matterId, custodianId } },
    create: {
      matterId,
      custodianId,
      role: options.role,
      relevance: options.relevance,
      notes: options.notes,
      addedBy: userId,
    },
    update: {
      role: options.role,
      relevance: options.relevance,
      notes: options.notes,
      removedAt: null,
      removedBy: null,
    },
    include: { custodian: true },
  });

  await logMatterActivity(matterId, 'CUSTODIAN_ADDED', `Added custodian: ${custodian.displayName}`, userId);
  return mc;
}

/**
 * Remove a custodian from a matter.
 */
export async function removeCustodianFromMatter(
  tenantId: string,
  matterId: string,
  custodianId: string,
  userId: string,
) {
  const mc = await prisma.matterCustodian.findFirst({
    where: { matterId, custodianId },
    include: { custodian: true, matter: { select: { tenantId: true } } },
  });
  if (mc?.matter.tenantId !== tenantId) throw new Error('Matter custodian not found');

  await prisma.matterCustodian.update({
    where: { id: mc.id },
    data: { removedAt: new Date(), removedBy: userId },
  });

  await logMatterActivity(matterId, 'CUSTODIAN_REMOVED', `Removed custodian: ${mc.custodian.displayName}`, userId);
}

/**
 * Add a note to a matter.
 */
export async function addMatterNote(
  tenantId: string,
  matterId: string,
  userId: string,
  content: string,
  isPrivate = false,
) {
  const matter = await prisma.legalMatter.findFirst({
    where: { id: matterId, tenantId },
  });
  if (!matter) throw new Error('Matter not found');

  return prisma.matterNote.create({
    data: { matterId, content, isPrivate, createdBy: userId },
  });
}

/**
 * Get matter summary statistics.
 */
export async function getMatterSummary(
  tenantId: string,
  matterId: string,
): Promise<MatterSummary | null> {
  const matter = await prisma.legalMatter.findFirst({
    where: { id: matterId, tenantId },
    include: {
      holds: {
        where: { status: { in: ['ACTIVE', 'ISSUED'] } },
        include: { custodians: true },
      },
      custodians: { where: { removedAt: null } },
    },
  });
  if (!matter) return null;

  let totalAcknowledged = 0;
  let totalPending = 0;
  for (const hold of matter.holds) {
    for (const hc of hold.custodians) {
      if (hc.status === 'ACKNOWLEDGED') totalAcknowledged++;
      else if (['PENDING', 'NOTIFIED'].includes(hc.status)) totalPending++;
    }
  }

  const total = totalAcknowledged + totalPending;
  const complianceRate = total > 0 ? (totalAcknowledged / total) * 100 : 100;

  return {
    matterId: matter.id,
    matterNumber: matter.matterNumber,
    name: matter.name,
    activeHolds: matter.holds.length,
    totalCustodians: matter.custodians.length,
    overallCompliance: Math.round(complianceRate * 100) / 100,
    pendingAcknowledgments: totalPending,
  };
}

/**
 * Get matter activity history.
 */
export async function getMatterActivity(
  tenantId: string,
  matterId: string,
  options: { page?: number; pageSize?: number } = {},
) {
  const { page = 1, pageSize = 50 } = options;
  const matter = await prisma.legalMatter.findFirst({ where: { id: matterId, tenantId } });
  if (!matter) throw new Error('Matter not found');

  const skip = (page - 1) * pageSize;
  const [activities, totalItems] = await Promise.all([
    prisma.matterActivity.findMany({ where: { matterId }, orderBy: { performedAt: 'desc' }, skip, take: pageSize }),
    prisma.matterActivity.count({ where: { matterId } }),
  ]);

  return {
    data: activities,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

/**
 * Get dashboard statistics for matters.
 */
export async function getMatterDashboard(tenantId: string) {
  const [statusCounts, typeCounts, riskCounts, recentMatters] = await Promise.all([
    prisma.legalMatter.groupBy({ by: ['status'], where: { tenantId }, _count: { status: true } }),
    prisma.legalMatter.groupBy({ by: ['matterType'], where: { tenantId, status: 'ACTIVE' }, _count: { matterType: true } }),
    prisma.legalMatter.groupBy({ by: ['riskLevel'], where: { tenantId, status: 'ACTIVE' }, _count: { riskLevel: true } }),
    prisma.legalMatter.findMany({
      where: { tenantId },
      orderBy: { openedAt: 'desc' },
      take: 5,
      select: {
        id: true, matterNumber: true, name: true, status: true, riskLevel: true, openedAt: true,
        _count: { select: { holds: true } },
      },
    }),
  ]);

  return {
    byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count.status])),
    byType: Object.fromEntries(typeCounts.map((t) => [t.matterType, t._count.matterType])),
    byRisk: Object.fromEntries(riskCounts.map((r) => [r.riskLevel, r._count.riskLevel])),
    recentMatters,
  };
}

// ──────────────────────────── Internal helpers ────────────────────────────

async function logMatterActivity(
  matterId: string,
  activityType: string,
  description: string,
  performedBy: string,
  details?: Record<string, unknown>,
) {
  await prisma.matterActivity.create({
    data: {
      matterId,
      activityType,
      description,
      details: details as Prisma.InputJsonValue,
      performedBy,
    },
  });
}
