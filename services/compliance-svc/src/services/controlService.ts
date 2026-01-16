/**
 * AIVO Compliance Service - Control Service
 *
 * Business logic for control management.
 */

import { prisma } from '../prisma.js';
import type {
  CreateControlInput,
  UpdateControlInput,
  UpdateControlStatusInput,
  ListControlsQuery,
  PaginatedResponse,
} from '../types/index.js';

/**
 * Create a control.
 */
export async function createControl(
  tenantFrameworkId: string,
  input: CreateControlInput
) {
  return prisma.control.create({
    data: {
      tenantFrameworkId,
      controlId: input.controlId,
      title: input.title,
      description: input.description,
      guidance: input.guidance,
      category: input.category,
      subcategory: input.subcategory,
      domain: input.domain,
      requirement: input.requirement,
      implementationSpec: input.implementationSpec,
      isMandatory: input.isMandatory ?? true,
      isAutomatable: input.isAutomatable ?? false,
      frequency: input.frequency,
      riskLevel: input.riskLevel,
      ownerId: input.ownerId,
      ownerEmail: input.ownerEmail,
    },
    include: {
      tenantFramework: {
        select: { framework: true, displayName: true },
      },
      _count: {
        select: { evidence: true, findings: true },
      },
    },
  });
}

/**
 * Bulk create controls (for importing framework templates).
 */
export async function bulkCreateControls(
  tenantFrameworkId: string,
  controls: CreateControlInput[]
) {
  const result = await prisma.control.createMany({
    data: controls.map((c) => ({
      tenantFrameworkId,
      controlId: c.controlId,
      title: c.title,
      description: c.description,
      guidance: c.guidance,
      category: c.category,
      subcategory: c.subcategory,
      domain: c.domain,
      requirement: c.requirement,
      implementationSpec: c.implementationSpec,
      isMandatory: c.isMandatory ?? true,
      isAutomatable: c.isAutomatable ?? false,
      frequency: c.frequency,
      riskLevel: c.riskLevel,
      ownerId: c.ownerId,
      ownerEmail: c.ownerEmail,
    })),
    skipDuplicates: true,
  });

  return { created: result.count };
}

/**
 * Get a control by ID.
 */
export async function getControlById(controlId: string) {
  return prisma.control.findUnique({
    where: { id: controlId },
    include: {
      tenantFramework: {
        select: { id: true, tenantId: true, framework: true, displayName: true },
      },
      evidence: {
        include: {
          evidence: true,
        },
        orderBy: { attachedAt: 'desc' },
      },
      findings: {
        where: { status: { in: ['OPEN', 'IN_REMEDIATION'] } },
        orderBy: { severity: 'asc' },
      },
      mappings: {
        include: {
          targetControl: {
            select: {
              id: true,
              controlId: true,
              title: true,
              tenantFramework: { select: { framework: true } },
            },
          },
        },
      },
      _count: {
        select: { evidence: true, findings: true, assessmentControls: true },
      },
    },
  });
}

/**
 * List controls for a framework.
 */
export async function listControls(
  tenantFrameworkId: string,
  query: ListControlsQuery
): Promise<PaginatedResponse<any>> {
  const {
    category,
    status,
    ownerId,
    isMandatory,
    search,
    page = 1,
    pageSize = 50,
  } = query;

  const where: any = { tenantFrameworkId };

  if (category) {
    where.category = category;
  }

  if (status) {
    where.status = status;
  }

  if (ownerId) {
    where.ownerId = ownerId;
  }

  if (typeof isMandatory === 'boolean') {
    where.isMandatory = isMandatory;
  }

  if (search) {
    where.OR = [
      { controlId: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, totalItems] = await Promise.all([
    prisma.control.findMany({
      where,
      include: {
        _count: {
          select: { evidence: true, findings: true },
        },
      },
      orderBy: { controlId: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.control.count({ where }),
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
 * Update a control.
 */
export async function updateControl(controlId: string, input: UpdateControlInput) {
  return prisma.control.update({
    where: { id: controlId },
    data: {
      title: input.title,
      description: input.description,
      guidance: input.guidance,
      category: input.category,
      subcategory: input.subcategory,
      requirement: input.requirement,
      implementationSpec: input.implementationSpec,
      isMandatory: input.isMandatory,
      isAutomatable: input.isAutomatable,
      frequency: input.frequency,
      riskLevel: input.riskLevel,
      ownerId: input.ownerId,
      ownerEmail: input.ownerEmail,
    },
    include: {
      _count: {
        select: { evidence: true, findings: true },
      },
    },
  });
}

/**
 * Update control status.
 */
export async function updateControlStatus(
  controlId: string,
  userId: string,
  input: UpdateControlStatusInput
) {
  const updateData: any = {
    status: input.status,
    statusUpdatedAt: new Date(),
    statusUpdatedBy: userId,
  };

  if (input.implementationNotes) {
    updateData.implementationNotes = input.implementationNotes;
  }

  if (input.status === 'IMPLEMENTED') {
    updateData.implementedAt = new Date();
    updateData.implementedBy = userId;
  }

  return prisma.control.update({
    where: { id: controlId },
    data: updateData,
    include: {
      tenantFramework: {
        select: { framework: true },
      },
    },
  });
}

/**
 * Attach evidence to a control.
 */
export async function attachEvidence(
  controlId: string,
  evidenceId: string,
  attachedBy: string,
  relevance?: string,
  isPrimary: boolean = false
) {
  return prisma.controlEvidence.create({
    data: {
      controlId,
      evidenceId,
      relevance,
      isPrimary,
      attachedBy,
    },
    include: {
      evidence: true,
    },
  });
}

/**
 * Detach evidence from a control.
 */
export async function detachEvidence(controlId: string, evidenceId: string) {
  return prisma.controlEvidence.delete({
    where: {
      controlId_evidenceId: { controlId, evidenceId },
    },
  });
}

/**
 * Get control categories for a framework.
 */
export async function getControlCategories(tenantFrameworkId: string) {
  const categories = await prisma.control.findMany({
    where: { tenantFrameworkId },
    select: { category: true },
    distinct: ['category'],
  });

  return categories
    .map((c) => c.category)
    .filter(Boolean)
    .sort();
}

/**
 * Delete a control.
 */
export async function deleteControl(controlId: string) {
  // Check for findings
  const findingsCount = await prisma.finding.count({
    where: { controlId },
  });

  if (findingsCount > 0) {
    throw new Error('Cannot delete control with existing findings');
  }

  return prisma.control.delete({
    where: { id: controlId },
  });
}
