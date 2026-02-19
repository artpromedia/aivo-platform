/**
 * AIVO Audit Service - Correction Request Service
 *
 * PRD: FERPA right-to-correction workflow.
 * Parents/students can request corrections to their educational records.
 * Requests must be reviewed and either approved or denied with written justification.
 *
 * FERPA SLA Requirements:
 * - 45-day response deadline from date of request
 * - 40-day auto-escalation if request is still PENDING
 */

import { prisma } from '../prisma.js';

// FERPA compliance constants
const FERPA_RESPONSE_DEADLINE_DAYS = 45;
const FERPA_ESCALATION_TRIGGER_DAYS = 40;

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
 * Add days to a date, returning a new Date.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Create a correction request (parent/student initiated).
 * Automatically sets 45-day FERPA response deadline and 40-day escalation date.
 */
export async function createCorrectionRequest(
  tenantId: string,
  requestedById: string,
  requestedByEmail: string | undefined,
  input: CreateCorrectionRequest
) {
  const now = new Date();
  const responseDeadline = addDays(now, FERPA_RESPONSE_DEADLINE_DAYS);
  const escalationDate = addDays(now, FERPA_ESCALATION_TRIGGER_DAYS);

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
      supportingDocs: (input.supportingDocs ?? undefined) as any,
      status: 'PENDING',
      responseDeadline,
      escalationDate,
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

/**
 * Process escalations for correction requests approaching their FERPA deadline.
 *
 * This function should be called periodically (e.g., daily cron or scheduled task).
 * It finds all PENDING requests where:
 *   - escalationDate has passed AND isEscalated is false → marks as escalated
 *   - responseDeadline has passed → marks as overdue
 *
 * Returns the counts of escalated and overdue requests for logging/monitoring.
 */
export async function processCorrectionsEscalation(): Promise<{
  escalated: number;
  overdue: number;
}> {
  const now = new Date();

  // Find requests that need escalation (past 40-day mark, not yet escalated)
  const toEscalate = await prisma.correctionRequest.findMany({
    where: {
      status: 'PENDING',
      isEscalated: false,
      escalationDate: { lte: now },
    },
  });

  // Mark them as escalated
  if (toEscalate.length > 0) {
    await prisma.correctionRequest.updateMany({
      where: {
        id: { in: toEscalate.map((r) => r.id) },
      },
      data: {
        isEscalated: true,
        escalatedAt: now,
        status: 'UNDER_REVIEW',
      },
    });
  }

  // Find requests that are overdue (past 45-day deadline, still not completed)
  const toMarkOverdue = await prisma.correctionRequest.findMany({
    where: {
      status: { in: ['PENDING', 'UNDER_REVIEW'] },
      isOverdue: false,
      responseDeadline: { lte: now },
    },
  });

  if (toMarkOverdue.length > 0) {
    await prisma.correctionRequest.updateMany({
      where: {
        id: { in: toMarkOverdue.map((r) => r.id) },
      },
      data: {
        isOverdue: true,
      },
    });
  }

  return {
    escalated: toEscalate.length,
    overdue: toMarkOverdue.length,
  };
}
