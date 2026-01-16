/**
 * AIVO Compliance Service - Finding Service
 *
 * Business logic for compliance findings/gaps.
 */

import { prisma } from '../prisma.js';
import type {
  CreateFindingInput,
  UpdateFindingInput,
  UpdateFindingStatusInput,
  ListFindingsQuery,
  PaginatedResponse,
} from '../types/index.js';

/**
 * Create a finding.
 */
export async function createFinding(
  tenantId: string,
  identifiedBy: string,
  input: CreateFindingInput
) {
  return prisma.finding.create({
    data: {
      tenantId,
      assessmentId: input.assessmentId,
      controlId: input.controlId,
      title: input.title,
      description: input.description,
      severity: input.severity,
      rootCause: input.rootCause,
      impact: input.impact,
      likelihood: input.likelihood,
      affectedSystems: input.affectedSystems || [],
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      identifiedBy,
    },
    include: {
      assessment: {
        select: { id: true, name: true },
      },
      control: {
        select: {
          id: true,
          controlId: true,
          title: true,
          tenantFramework: { select: { framework: true } },
        },
      },
      _count: {
        select: { remediations: true },
      },
    },
  });
}

/**
 * Get a finding by ID.
 */
export async function getFindingById(tenantId: string, findingId: string) {
  return prisma.finding.findFirst({
    where: { id: findingId, tenantId },
    include: {
      assessment: {
        select: { id: true, name: true, status: true },
      },
      control: {
        select: {
          id: true,
          controlId: true,
          title: true,
          category: true,
          tenantFramework: { select: { framework: true, displayName: true } },
        },
      },
      remediations: {
        orderBy: { createdAt: 'desc' },
        include: {
          tasks: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      },
    },
  });
}

/**
 * List findings.
 */
export async function listFindings(
  tenantId: string,
  query: ListFindingsQuery
): Promise<PaginatedResponse<any>> {
  const {
    assessmentId,
    controlId,
    severity,
    status,
    overdue,
    page = 1,
    pageSize = 20,
  } = query;

  const where: any = { tenantId };

  if (assessmentId) {
    where.assessmentId = assessmentId;
  }

  if (controlId) {
    where.controlId = controlId;
  }

  if (severity) {
    where.severity = severity;
  }

  if (status) {
    where.status = status;
  }

  if (overdue) {
    where.dueDate = { lt: new Date() };
    where.status = { in: ['OPEN', 'IN_REMEDIATION'] };
  }

  const [data, totalItems] = await Promise.all([
    prisma.finding.findMany({
      where,
      include: {
        control: {
          select: {
            controlId: true,
            title: true,
            tenantFramework: { select: { framework: true } },
          },
        },
        _count: {
          select: { remediations: true },
        },
      },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.finding.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Update a finding.
 */
export async function updateFinding(
  tenantId: string,
  findingId: string,
  input: UpdateFindingInput
) {
  return prisma.finding.update({
    where: { id: findingId, tenantId },
    data: {
      title: input.title,
      description: input.description,
      severity: input.severity,
      rootCause: input.rootCause,
      impact: input.impact,
      likelihood: input.likelihood,
      affectedSystems: input.affectedSystems,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    },
    include: {
      _count: {
        select: { remediations: true },
      },
    },
  });
}

/**
 * Update finding status.
 */
export async function updateFindingStatus(
  tenantId: string,
  findingId: string,
  userId: string,
  input: UpdateFindingStatusInput
) {
  const updateData: any = { status: input.status };

  switch (input.status) {
    case 'REMEDIATED':
    case 'CLOSED':
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = userId;
      if (input.resolution) {
        updateData.resolution = input.resolution;
      }
      break;
    case 'ACCEPTED_RISK':
      updateData.riskAcceptedAt = new Date();
      updateData.riskAcceptedBy = userId;
      updateData.riskAcceptReason = input.riskAcceptReason;
      break;
  }

  return prisma.finding.update({
    where: { id: findingId, tenantId },
    data: updateData,
    include: {
      control: {
        select: { controlId: true, title: true },
      },
    },
  });
}

/**
 * Verify a remediated finding.
 */
export async function verifyFinding(
  tenantId: string,
  findingId: string,
  verifiedBy: string
) {
  return prisma.finding.update({
    where: { id: findingId, tenantId },
    data: {
      verifiedAt: new Date(),
      verifiedBy,
      status: 'CLOSED',
    },
  });
}

/**
 * Get finding statistics.
 */
export async function getFindingStats(tenantId: string) {
  const [
    total,
    bySeverity,
    byStatus,
    overdue,
  ] = await Promise.all([
    prisma.finding.count({ where: { tenantId } }),
    prisma.finding.groupBy({
      by: ['severity'],
      where: { tenantId },
      _count: { severity: true },
    }),
    prisma.finding.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.finding.count({
      where: {
        tenantId,
        dueDate: { lt: new Date() },
        status: { in: ['OPEN', 'IN_REMEDIATION'] },
      },
    }),
  ]);

  return {
    total,
    overdue,
    bySeverity: Object.fromEntries(
      bySeverity.map((s) => [s.severity, s._count.severity])
    ),
    byStatus: Object.fromEntries(
      byStatus.map((s) => [s.status, s._count.status])
    ),
  };
}

/**
 * Delete a finding.
 */
export async function deleteFinding(tenantId: string, findingId: string) {
  return prisma.finding.delete({
    where: { id: findingId, tenantId },
  });
}
