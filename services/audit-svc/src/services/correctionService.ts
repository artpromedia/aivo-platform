/**
 * AIVO Audit Service - Correction Request Service
 *
 * PRD: FERPA right-to-correction workflow.
 * Parents/students can request corrections to their educational records.
 * Requests must be reviewed and either approved or denied with written justification.
 */

import { prisma } from '../prisma.js';

export interface CreateCorrectionRequest {
  targetType: string;
  targetId: string;
  fieldName: string;
  currentValue?: string;
  requestedValue?: string;
  reason: string;
  supportingDocs?: Record<string, unknown>;
}

export interface ReviewCorrectionRequest {
  status: 'APPROVED' | 'DENIED';
  reviewNotes?: string;
  denialReason?: string;
}

/**
 * Create a correction request (parent/student initiated).
 */
export async function createCorrectionRequest(
  tenantId: string,
  requestedById: string,
  requestedByEmail: string | undefined,
  input: CreateCorrectionRequest
) {
  return prisma.correctionRequest.create({
    data: {
      tenantId,
      requestedById,
      requestedByEmail,
      targetType: input.targetType,
      targetId: input.targetId,
      fieldName: input.fieldName,
      currentValue: input.currentValue,
      requestedValue: input.requestedValue,
      reason: input.reason,
      supportingDocs: input.supportingDocs ?? undefined,
      status: 'PENDING',
    },
  });
}

/**
 * List correction requests for a tenant.
 */
export async function listCorrectionRequests(
  tenantId: string,
  options: {
    status?: string;
    requestedById?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { status, requestedById, page = 1, pageSize = 20 } = options;

  const where: any = {
    tenantId,
    ...(status && { status }),
    ...(requestedById && { requestedById }),
  };

  const skip = (page - 1) * pageSize;

  const [data, totalItems] = await Promise.all([
    prisma.correctionRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.correctionRequest.count({ where }),
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
 * Get a single correction request by ID.
 */
export async function getCorrectionRequest(tenantId: string, id: string) {
  return prisma.correctionRequest.findFirst({
    where: { id, tenantId },
  });
}

/**
 * Review (approve or deny) a correction request.
 * PRD: Denial must include written justification per FERPA.
 */
export async function reviewCorrectionRequest(
  tenantId: string,
  id: string,
  reviewedById: string,
  reviewedByEmail: string | undefined,
  input: ReviewCorrectionRequest
) {
  const request = await prisma.correctionRequest.findFirst({
    where: { id, tenantId, status: 'PENDING' },
  });

  if (!request) {
    throw new Error('Correction request not found or already reviewed');
  }

  if (input.status === 'DENIED' && !input.denialReason) {
    throw new Error('FERPA requires a written justification when denying a correction request');
  }

  return prisma.correctionRequest.update({
    where: { id },
    data: {
      status: input.status,
      reviewedById,
      reviewedByEmail,
      reviewedAt: new Date(),
      reviewNotes: input.reviewNotes,
      denialReason: input.denialReason,
      completedAt: input.status === 'APPROVED' ? new Date() : undefined,
    },
  });
}
