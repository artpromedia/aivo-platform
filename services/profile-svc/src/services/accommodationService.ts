/**
 * Accommodation Service
 *
 * Business logic for learner accommodation management.
 */

import { prisma, type LearnerAccommodation } from '../prisma.js';
import type { CreateAccommodationRequest, UpdateAccommodationRequest, ListAccommodationsQuery } from '../schemas/index.js';
import type { AccommodationSummary, TenantContext } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// LIST ACCOMMODATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * List accommodations for a learner with optional filters
 */
export async function listAccommodations(
  tenantId: string,
  learnerId: string,
  query: ListAccommodationsQuery
): Promise<AccommodationSummary[]> {
  const includeInactive = query.includeInactive === 'true';

  const accommodations = await prisma.learnerAccommodation.findMany({
    where: {
      tenantId,
      learnerId,
      ...(query.category && { category: query.category }),
      ...(query.source && { source: query.source }),
      ...(query.isCritical !== undefined && { isCritical: query.isCritical === 'true' }),
      ...(!includeInactive && { isActive: true }),
    },
    orderBy: [{ isCritical: 'desc' }, { createdAt: 'desc' }],
  });

  return accommodations.map((a) => ({
    id: a.id,
    category: a.category,
    description: a.description,
    appliesToDomains: a.appliesToDomains,
    source: a.source,
    isCritical: a.isCritical,
    effectiveFrom: a.effectiveFrom,
    effectiveTo: a.effectiveTo,
    isActive: a.isActive,
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// CREATE ACCOMMODATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new accommodation for a learner
 */
export async function createAccommodation(
  tenantId: string,
  learnerId: string,
  data: CreateAccommodationRequest,
  context: TenantContext
): Promise<LearnerAccommodation> {
  // Get profile ID if exists
  const profile = await prisma.learnerProfile.findUnique({
    where: {
      tenantId_learnerId: { tenantId, learnerId },
    },
    select: { id: true },
  });

  const accommodation = await prisma.learnerAccommodation.create({
    data: {
      tenantId,
      learnerId,
      profileId: profile?.id,
      category: data.category,
      description: data.description,
      appliesToDomains: data.appliesToDomains ?? [],
      source: data.source ?? 'PARENT_PREFERENCE',
      isCritical: data.isCritical ?? false,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      createdByUserId: context.userId,
    },
  });

  return accommodation;
}

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE ACCOMMODATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Update an existing accommodation
 */
export async function updateAccommodation(
  tenantId: string,
  learnerId: string,
  accommodationId: string,
  data: UpdateAccommodationRequest,
  context: TenantContext
): Promise<LearnerAccommodation> {
  // Verify accommodation exists and belongs to learner
  const existing = await prisma.learnerAccommodation.findFirst({
    where: {
      id: accommodationId,
      tenantId,
      learnerId,
    },
  });

  if (!existing) {
    throw new Error('Accommodation not found');
  }

  const updated = await prisma.learnerAccommodation.update({
    where: { id: accommodationId },
    data: {
      ...(data.category !== undefined && { category: data.category }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.appliesToDomains !== undefined && { appliesToDomains: data.appliesToDomains }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.isCritical !== undefined && { isCritical: data.isCritical }),
      ...(data.effectiveFrom !== undefined && { effectiveFrom: new Date(data.effectiveFrom) }),
      ...(data.effectiveTo !== undefined && { effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null }),
      updatedByUserId: context.userId,
    },
  });

  return updated;
}

// ══════════════════════════════════════════════════════════════════════════════
// DELETE ACCOMMODATION (SOFT DELETE)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Soft delete an accommodation (mark as inactive)
 */
export async function deleteAccommodation(
  tenantId: string,
  learnerId: string,
  accommodationId: string,
  context: TenantContext
): Promise<void> {
  // Verify accommodation exists and belongs to learner
  const existing = await prisma.learnerAccommodation.findFirst({
    where: {
      id: accommodationId,
      tenantId,
      learnerId,
    },
  });

  if (!existing) {
    throw new Error('Accommodation not found');
  }

  await prisma.learnerAccommodation.update({
    where: { id: accommodationId },
    data: {
      isActive: false,
      effectiveTo: new Date(),
      updatedByUserId: context.userId,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// GET ACCOMMODATION BY ID
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get a single accommodation by ID
 */
export async function getAccommodation(
  tenantId: string,
  learnerId: string,
  accommodationId: string
): Promise<LearnerAccommodation | null> {
  return prisma.learnerAccommodation.findFirst({
    where: {
      id: accommodationId,
      tenantId,
      learnerId,
    },
  });
}
