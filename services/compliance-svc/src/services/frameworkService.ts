/**
 * AIVO Compliance Service - Framework Service
 *
 * Business logic for compliance framework management.
 */

import { prisma } from '../prisma.js';
import type { EnableFrameworkInput, UpdateFrameworkInput, Framework } from '../types/index.js';

/**
 * Enable a compliance framework for a tenant.
 */
export async function enableFramework(
  tenantId: string,
  enabledBy: string,
  input: EnableFrameworkInput
) {
  return prisma.tenantFramework.create({
    data: {
      tenantId,
      framework: input.framework,
      displayName: input.displayName || input.framework,
      description: input.description,
      priority: input.priority ?? 0,
      applicableFrom: input.applicableFrom ? new Date(input.applicableFrom) : new Date(),
      applicableUntil: input.applicableUntil ? new Date(input.applicableUntil) : null,
      enabledBy,
    },
    include: {
      _count: {
        select: { controls: true, assessments: true },
      },
    },
  });
}

/**
 * Get all frameworks for a tenant.
 */
export async function getFrameworks(tenantId: string, includeInactive: boolean = false) {
  const where: any = { tenantId };

  if (!includeInactive) {
    where.isActive = true;
  }

  return prisma.tenantFramework.findMany({
    where,
    include: {
      _count: {
        select: { controls: true, assessments: true },
      },
    },
    orderBy: [{ priority: 'desc' }, { framework: 'asc' }],
  });
}

/**
 * Get a framework by ID.
 */
export async function getFrameworkById(tenantId: string, frameworkId: string) {
  return prisma.tenantFramework.findFirst({
    where: { id: frameworkId, tenantId },
    include: {
      controls: {
        select: {
          id: true,
          controlId: true,
          title: true,
          category: true,
          status: true,
          isMandatory: true,
        },
        orderBy: { controlId: 'asc' },
      },
      _count: {
        select: { controls: true, assessments: true },
      },
    },
  });
}

/**
 * Get a framework by type.
 */
export async function getFrameworkByType(tenantId: string, framework: Framework) {
  return prisma.tenantFramework.findFirst({
    where: { tenantId, framework },
    include: {
      _count: {
        select: { controls: true, assessments: true },
      },
    },
  });
}

/**
 * Update a framework.
 */
export async function updateFramework(
  tenantId: string,
  frameworkId: string,
  input: UpdateFrameworkInput
) {
  return prisma.tenantFramework.update({
    where: { id: frameworkId, tenantId },
    data: {
      displayName: input.displayName,
      description: input.description,
      isActive: input.isActive,
      priority: input.priority,
    },
    include: {
      _count: {
        select: { controls: true, assessments: true },
      },
    },
  });
}

/**
 * Disable a framework.
 */
export async function disableFramework(tenantId: string, frameworkId: string) {
  return prisma.tenantFramework.update({
    where: { id: frameworkId, tenantId },
    data: { isActive: false },
  });
}

/**
 * Delete a framework (and all controls).
 */
export async function deleteFramework(tenantId: string, frameworkId: string) {
  // Check for assessments
  const assessmentCount = await prisma.assessment.count({
    where: { tenantFrameworkId: frameworkId },
  });

  if (assessmentCount > 0) {
    throw new Error('Cannot delete framework with existing assessments');
  }

  return prisma.tenantFramework.delete({
    where: { id: frameworkId, tenantId },
  });
}

/**
 * Get framework compliance summary.
 */
export async function getFrameworkSummary(tenantId: string, frameworkId: string) {
  const [framework, controlStats, findings] = await Promise.all([
    prisma.tenantFramework.findFirst({
      where: { id: frameworkId, tenantId },
    }),
    prisma.control.groupBy({
      by: ['status'],
      where: { tenantFrameworkId: frameworkId },
      _count: { status: true },
    }),
    prisma.finding.count({
      where: {
        tenantId,
        control: { tenantFrameworkId: frameworkId },
        status: { in: ['OPEN', 'IN_REMEDIATION'] },
      },
    }),
  ]);

  if (!framework) {
    throw new Error('Framework not found');
  }

  const statusCounts = Object.fromEntries(
    controlStats.map((s) => [s.status, s._count.status])
  );

  const totalControls = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const implemented = statusCounts['IMPLEMENTED'] || 0;
  const notApplicable = statusCounts['NOT_APPLICABLE'] || 0;
  const applicableControls = totalControls - notApplicable;
  const score = applicableControls > 0
    ? Math.round((implemented / applicableControls) * 100)
    : 100;

  return {
    framework: framework.framework,
    displayName: framework.displayName,
    score,
    totalControls,
    controlsByStatus: statusCounts,
    openFindings: findings,
  };
}
