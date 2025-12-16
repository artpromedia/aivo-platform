/**
 * Access Grant Service
 * 
 * Manages researcher access to projects and their data.
 */

import type { AccessGrantScope, AccessGrantStatus } from '@prisma/client';

import { prisma } from '../prisma.js';
import { publishAccessGranted, publishAccessRevoked } from '../events/publisher.js';
import { recordAuditLog, type AuditContext } from './auditService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateAccessGrantInput {
  tenantId: string;
  researchProjectId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  scope: AccessGrantScope;
  expiresAt?: Date;
  createdByUserId: string;
}

export interface RevokeAccessGrantInput {
  grantId: string;
  revokedByUserId: string;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Grant access to a user for a research project
 */
export async function grantAccess(
  input: CreateAccessGrantInput,
  auditContext: AuditContext
) {
  // Check if project exists and is approved
  const project = await prisma.researchProject.findFirst({
    where: { id: input.researchProjectId, tenantId: input.tenantId },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  if (project.status !== 'APPROVED') {
    throw new Error('Can only grant access to approved projects');
  }

  // Check for existing grant
  const existing = await prisma.researchAccessGrant.findUnique({
    where: {
      researchProjectId_userId: {
        researchProjectId: input.researchProjectId,
        userId: input.userId,
      },
    },
  });

  if (existing && existing.status === 'ACTIVE') {
    throw new Error('User already has active access to this project');
  }

  // Create or update grant
  const grant = await prisma.researchAccessGrant.upsert({
    where: {
      researchProjectId_userId: {
        researchProjectId: input.researchProjectId,
        userId: input.userId,
      },
    },
    create: {
      tenantId: input.tenantId,
      researchProjectId: input.researchProjectId,
      userId: input.userId,
      userEmail: input.userEmail,
      userRole: input.userRole,
      scope: input.scope,
      status: 'ACTIVE',
      expiresAt: input.expiresAt,
      createdByUserId: input.createdByUserId,
    },
    update: {
      status: 'ACTIVE',
      scope: input.scope,
      expiresAt: input.expiresAt,
      revokedAt: null,
      revokedReason: null,
      revokedByUserId: null,
    },
  });

  await recordAuditLog(auditContext, 'ACCESS_GRANTED', input.researchProjectId, {
    grantId: grant.id,
    userId: input.userId,
    userEmail: input.userEmail,
    scope: input.scope,
  });

  await publishAccessGranted({
    grantId: grant.id,
    projectId: input.researchProjectId,
    tenantId: input.tenantId,
    userId: input.userId,
    userEmail: input.userEmail,
    scope: input.scope,
    grantedByUserId: input.createdByUserId,
    timestamp: new Date().toISOString(),
  });

  return grant;
}

/**
 * Revoke access from a user
 */
export async function revokeAccess(
  input: RevokeAccessGrantInput,
  auditContext: AuditContext
) {
  const grant = await prisma.researchAccessGrant.findUnique({
    where: { id: input.grantId },
  });

  if (!grant) {
    throw new Error('Access grant not found');
  }

  if (grant.status !== 'ACTIVE') {
    throw new Error('Access grant is not active');
  }

  const updated = await prisma.researchAccessGrant.update({
    where: { id: input.grantId },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      revokedByUserId: input.revokedByUserId,
      revokedReason: input.reason,
    },
  });

  await recordAuditLog(auditContext, 'ACCESS_REVOKED', grant.researchProjectId, {
    grantId: grant.id,
    userId: grant.userId,
    reason: input.reason,
  });

  await publishAccessRevoked({
    grantId: grant.id,
    projectId: grant.researchProjectId,
    tenantId: grant.tenantId,
    userId: grant.userId,
    revokedByUserId: input.revokedByUserId,
    reason: input.reason,
    timestamp: new Date().toISOString(),
  });

  return updated;
}

/**
 * Get access grants for a project
 */
export async function getProjectAccessGrants(
  researchProjectId: string,
  options: { status?: AccessGrantStatus[] } = {}
) {
  return prisma.researchAccessGrant.findMany({
    where: {
      researchProjectId,
      ...(options.status && options.status.length > 0 
        ? { status: { in: options.status } } 
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a user's active access grant for a project
 */
export async function getUserAccessGrant(
  researchProjectId: string,
  userId: string
) {
  return prisma.researchAccessGrant.findFirst({
    where: {
      researchProjectId,
      userId,
      status: 'ACTIVE',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });
}

/**
 * Check if user has required scope for an operation
 */
export async function validateUserAccess(
  researchProjectId: string,
  userId: string,
  requiredScope: AccessGrantScope
): Promise<{ valid: boolean; grant?: Awaited<ReturnType<typeof getUserAccessGrant>>; error?: string }> {
  const grant = await getUserAccessGrant(researchProjectId, userId);

  if (!grant) {
    return { valid: false, error: 'No active access grant for this project' };
  }

  // Check if grant scope is sufficient
  const scopeHierarchy: Record<AccessGrantScope, number> = {
    AGG_ONLY: 1,
    DEIDENTIFIED_LEARNER_LEVEL: 2,
    INTERNAL_FULL_ACCESS: 3,
  };

  if (scopeHierarchy[grant.scope] < scopeHierarchy[requiredScope]) {
    return {
      valid: false,
      grant,
      error: `Insufficient access scope. Required: ${requiredScope}, granted: ${grant.scope}`,
    };
  }

  return { valid: true, grant };
}

/**
 * Accept DUA for a grant
 */
export async function acceptDUA(
  grantId: string,
  duaVersion: number,
  auditContext: AuditContext
) {
  const grant = await prisma.researchAccessGrant.update({
    where: { id: grantId },
    data: {
      duaAcceptedAt: new Date(),
      duaVersion,
    },
  });

  await recordAuditLog(auditContext, 'DUA_ACCEPTED', grant.researchProjectId, {
    grantId: grant.id,
    duaVersion,
  });

  return grant;
}
