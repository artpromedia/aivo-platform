/**
 * AIVO Compliance Service - Assessment Service
 *
 * Business logic for compliance assessments/audits.
 */

import { prisma } from '../prisma.js';
import type {
  CreateAssessmentInput,
  UpdateAssessmentInput,
  ListAssessmentsQuery,
  PaginatedResponse,
  AssessmentStatus,
} from '../types/index.js';

/**
 * Create an assessment.
 */
export async function createAssessment(
  tenantId: string,
  createdBy: string,
  input: CreateAssessmentInput
) {
  const assessment = await prisma.assessment.create({
    data: {
      tenantId,
      tenantFrameworkId: input.tenantFrameworkId,
      name: input.name,
      description: input.description,
      assessmentType: input.assessmentType,
      scopeDescription: input.scopeDescription,
      inScopeServices: input.inScopeServices || [],
      excludedServices: input.excludedServices || [],
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(input.periodEnd),
      leadAssessorId: input.leadAssessorId,
      leadAssessorEmail: input.leadAssessorEmail,
      createdBy,
    },
    include: {
      tenantFramework: {
        select: { framework: true, displayName: true },
      },
    },
  });

  // Initialize assessment controls from framework controls
  const controls = await prisma.control.findMany({
    where: { tenantFrameworkId: input.tenantFrameworkId },
    select: { id: true },
  });

  if (controls.length > 0) {
    await prisma.assessmentControl.createMany({
      data: controls.map((c) => ({
        assessmentId: assessment.id,
        controlId: c.id,
      })),
    });

    // Update control count
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { totalControls: controls.length },
    });
  }

  return getAssessmentById(tenantId, assessment.id);
}

/**
 * Get an assessment by ID.
 */
export async function getAssessmentById(tenantId: string, assessmentId: string) {
  return prisma.assessment.findFirst({
    where: { id: assessmentId, tenantId },
    include: {
      tenantFramework: {
        select: { id: true, framework: true, displayName: true },
      },
      controls: {
        include: {
          control: {
            select: {
              id: true,
              controlId: true,
              title: true,
              category: true,
              isMandatory: true,
            },
          },
        },
        orderBy: { control: { controlId: 'asc' } },
      },
      findings: {
        where: { status: { in: ['OPEN', 'IN_REMEDIATION'] } },
        select: { id: true, title: true, severity: true, status: true },
      },
      _count: {
        select: { controls: true, findings: true },
      },
    },
  });
}

/**
 * List assessments.
 */
export async function listAssessments(
  tenantId: string,
  query: ListAssessmentsQuery
): Promise<PaginatedResponse<any>> {
  const {
    tenantFrameworkId,
    status,
    page = 1,
    pageSize = 20,
  } = query;

  const where: any = { tenantId };

  if (tenantFrameworkId) {
    where.tenantFrameworkId = tenantFrameworkId;
  }

  if (status) {
    where.status = status;
  }

  const [data, totalItems] = await Promise.all([
    prisma.assessment.findMany({
      where,
      include: {
        tenantFramework: {
          select: { framework: true, displayName: true },
        },
        _count: {
          select: { controls: true, findings: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.assessment.count({ where }),
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
 * Update an assessment.
 */
export async function updateAssessment(
  tenantId: string,
  assessmentId: string,
  input: UpdateAssessmentInput
) {
  return prisma.assessment.update({
    where: { id: assessmentId, tenantId },
    data: {
      name: input.name,
      description: input.description,
      scopeDescription: input.scopeDescription,
      inScopeServices: input.inScopeServices,
      excludedServices: input.excludedServices,
      periodStart: input.periodStart ? new Date(input.periodStart) : undefined,
      periodEnd: input.periodEnd ? new Date(input.periodEnd) : undefined,
      leadAssessorId: input.leadAssessorId,
      leadAssessorEmail: input.leadAssessorEmail,
    },
    include: {
      tenantFramework: {
        select: { framework: true, displayName: true },
      },
    },
  });
}

/**
 * Update assessment status.
 */
export async function updateAssessmentStatus(
  tenantId: string,
  assessmentId: string,
  userId: string,
  status: AssessmentStatus
) {
  const updateData: any = {
    status,
    statusChangedAt: new Date(),
    statusChangedBy: userId,
  };

  if (status === 'IN_PROGRESS' && !updateData.startedAt) {
    updateData.startedAt = new Date();
  }

  if (status === 'COMPLETED') {
    updateData.completedAt = new Date();

    // Calculate final scores
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId },
      include: {
        controls: {
          select: { status: true },
        },
      },
    });

    if (assessment) {
      const passed = assessment.controls.filter((c) => c.status === 'IMPLEMENTED').length;
      const failed = assessment.controls.filter(
        (c) => c.status === 'NOT_STARTED' || c.status === 'PARTIALLY_IMPLEMENTED'
      ).length;
      const na = assessment.controls.filter((c) => c.status === 'NOT_APPLICABLE').length;

      const applicableControls = assessment.controls.length - na;
      const complianceScore = applicableControls > 0
        ? (passed / applicableControls) * 100
        : 100;

      updateData.passedControls = passed;
      updateData.failedControls = failed;
      updateData.naControls = na;
      updateData.complianceScore = complianceScore;
    }
  }

  return prisma.assessment.update({
    where: { id: assessmentId, tenantId },
    data: updateData,
    include: {
      tenantFramework: {
        select: { framework: true, displayName: true },
      },
    },
  });
}

/**
 * Update a control within an assessment.
 */
export async function updateAssessmentControl(
  assessmentId: string,
  controlId: string,
  userId: string,
  data: {
    status?: string;
    evaluationNotes?: string;
    testProcedure?: string;
    testResult?: string;
    testEvidence?: string;
  }
) {
  return prisma.assessmentControl.update({
    where: {
      assessmentId_controlId: { assessmentId, controlId },
    },
    data: {
      status: data.status as any,
      evaluationNotes: data.evaluationNotes,
      testProcedure: data.testProcedure,
      testResult: data.testResult,
      testEvidence: data.testEvidence,
      testedAt: data.testResult ? new Date() : undefined,
      testedBy: data.testResult ? userId : undefined,
    },
    include: {
      control: {
        select: { controlId: true, title: true },
      },
    },
  });
}

/**
 * Sign off on an assessment.
 */
export async function signOffAssessment(
  tenantId: string,
  assessmentId: string,
  signedOffBy: string
) {
  return prisma.assessment.update({
    where: { id: assessmentId, tenantId },
    data: {
      signedOffAt: new Date(),
      signedOffBy,
    },
  });
}

/**
 * Delete an assessment.
 */
export async function deleteAssessment(tenantId: string, assessmentId: string) {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, tenantId },
    select: { status: true },
  });

  if (assessment?.status === 'COMPLETED') {
    throw new Error('Cannot delete completed assessments');
  }

  return prisma.assessment.delete({
    where: { id: assessmentId, tenantId },
  });
}

/**
 * Get assessment statistics.
 */
export async function getAssessmentStats(tenantId: string) {
  const [
    total,
    byStatus,
    avgScore,
  ] = await Promise.all([
    prisma.assessment.count({ where: { tenantId } }),
    prisma.assessment.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.assessment.aggregate({
      where: { tenantId, status: 'COMPLETED' },
      _avg: { complianceScore: true },
    }),
  ]);

  return {
    total,
    byStatus: Object.fromEntries(
      byStatus.map((s) => [s.status, s._count.status])
    ),
    averageScore: avgScore._avg.complianceScore || null,
  };
}
