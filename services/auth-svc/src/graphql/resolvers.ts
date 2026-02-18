/**
 * AIVO Auth Service - GraphQL Resolvers
 *
 * Implements the verifyLearnerScope query resolver for Apollo Federation.
 * PRD: Cross-child access enforcement — unauthorized IEP access → 403 + audit log.
 *
 * Relationships checked:
 *   1. Parent → child (via StudentParent join table or auth-svc relationship records)
 *   2. Teacher → student (via active IEP case management or classroom assignment)
 *   3. District admin → any student in their tenant
 *   4. Platform admin / Support → any student (super access)
 */

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

interface ScopeVerificationResult {
  authorized: boolean;
  relationship: string | null;
  reason: string | null;
}

interface UserWithRoles {
  id: string;
  tenantId: string;
  roles: Array<{ role: string }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// Resolver Logic
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Verify if a user has legitimate access to a learner's data.
 *
 * Access rules (PRD Section R1.5):
 * - PLATFORM_ADMIN / SUPPORT: global access
 * - DISTRICT_ADMIN: access to any learner in their tenant
 * - TEACHER / THERAPIST: access to learners they are assigned to (via IEP or classroom)
 * - PARENT: access to their own children only
 * - All others: denied
 */
export async function verifyLearnerScope(
  userId: string,
  learnerId: string,
): Promise<ScopeVerificationResult> {
  // 1. Look up the requesting user with roles
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { select: { role: true } } },
  }) as UserWithRoles | null;

  if (!user) {
    return {
      authorized: false,
      relationship: null,
      reason: 'User not found',
    };
  }

  const userRoles = user.roles.map((r) => r.role);

  // 2. Platform-level super access
  if (userRoles.includes('PLATFORM_ADMIN') || userRoles.includes('SUPPORT')) {
    return {
      authorized: true,
      relationship: 'platform_admin',
      reason: null,
    };
  }

  // 3. Look up the learner to check tenant isolation
  const learner = await prisma.user.findUnique({
    where: { id: learnerId },
    select: { id: true, tenantId: true },
  });

  if (!learner) {
    return {
      authorized: false,
      relationship: null,
      reason: 'Learner not found',
    };
  }

  // Enforce tenant isolation — users cannot access learners in other tenants
  if (user.tenantId !== learner.tenantId) {
    return {
      authorized: false,
      relationship: null,
      reason: 'Cross-tenant access denied',
    };
  }

  // 4. District admin: access to any learner within their tenant
  if (userRoles.includes('DISTRICT_ADMIN') || userRoles.includes('SCHOOL_ADMIN')) {
    return {
      authorized: true,
      relationship: 'district_admin',
      reason: null,
    };
  }

  // 5. Teacher / Therapist: check assignment relationship
  if (userRoles.includes('TEACHER') || userRoles.includes('THERAPIST')) {
    const hasAssignment = await checkTeacherAssignment(userId, learnerId, user.tenantId);
    if (hasAssignment) {
      return {
        authorized: true,
        relationship: 'teacher_assigned',
        reason: null,
      };
    }

    return {
      authorized: false,
      relationship: null,
      reason: 'Teacher is not assigned to this learner',
    };
  }

  // 6. Parent: check parent-child relationship
  if (userRoles.includes('PARENT')) {
    const isParent = await checkParentRelationship(userId, learnerId, user.tenantId);
    if (isParent) {
      return {
        authorized: true,
        relationship: 'parent',
        reason: null,
      };
    }

    return {
      authorized: false,
      relationship: null,
      reason: 'Not a parent/guardian of this learner',
    };
  }

  // 7. Default deny
  return {
    authorized: false,
    relationship: null,
    reason: 'Insufficient role for learner data access',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Relationship Checks
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a teacher/therapist is assigned to a learner.
 * Queries IEP service internal API for case management assignment,
 * or falls back to a direct DB check for classroom relationships.
 */
async function checkTeacherAssignment(
  teacherId: string,
  learnerId: string,
  tenantId: string,
): Promise<boolean> {
  const IEP_SVC_URL = process.env.IEP_SVC_URL ?? 'http://localhost:4070';

  try {
    const response = await fetch(
      `${IEP_SVC_URL}/internal/check-assignment?teacherId=${teacherId}&studentId=${learnerId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-service-name': 'auth-svc',
          'x-tenant-id': tenantId,
        },
      },
    );

    if (response.ok) {
      const data = (await response.json()) as { assigned: boolean };
      return data.assigned;
    }
  } catch {
    // IEP service unavailable — fall through to deny
  }

  return false;
}

/**
 * Check if a user is the parent/guardian of a learner.
 * Queries parent-svc or falls back to auth-svc relationship records.
 */
async function checkParentRelationship(
  parentId: string,
  learnerId: string,
  tenantId: string,
): Promise<boolean> {
  const PARENT_SVC_URL = process.env.PARENT_SVC_URL ?? 'http://localhost:3010';

  try {
    const response = await fetch(
      `${PARENT_SVC_URL}/internal/check-relationship?parentId=${parentId}&learnerId=${learnerId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-service-name': 'auth-svc',
          'x-tenant-id': tenantId,
        },
      },
    );

    if (response.ok) {
      const data = (await response.json()) as { isParent: boolean };
      return data.isParent;
    }
  } catch {
    // Parent service unavailable — fall through to deny
  }

  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// REST Endpoint (non-GraphQL access for internal services)
// ══════════════════════════════════════════════════════════════════════════════

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function registerScopeRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /auth/verify-learner-scope
   * Verify if user has access to a learner's data.
   * Used by other services to enforce cross-child access controls.
   */
  fastify.get(
    '/verify-learner-scope',
    async (
      request: FastifyRequest<{
        Querystring: { userId: string; learnerId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { userId, learnerId } = request.query;

      if (!userId || !learnerId) {
        return reply.status(400).send({
          error: 'Missing required query parameters: userId, learnerId',
        });
      }

      const result = await verifyLearnerScope(userId, learnerId);

      // PRD: Unauthorized access → 403 + audit log
      if (!result.authorized) {
        // Emit audit event for unauthorized access attempt
        const AUDIT_SVC_URL = process.env.AUDIT_SVC_URL ?? 'http://localhost:4050';
        void fetch(`${AUDIT_SVC_URL}/audit/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-name': 'auth-svc',
            'x-tenant-id': request.headers['x-tenant-id'] as string || '',
          },
          body: JSON.stringify({
            eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
            category: 'SECURITY',
            severity: 'HIGH',
            action: 'VERIFY_LEARNER_SCOPE',
            description: `Unauthorized access attempt: user ${userId} tried to access learner ${learnerId}. Reason: ${result.reason}`,
            actorId: userId,
            targetId: learnerId,
            targetType: 'LEARNER',
            outcome: 'DENIED',
            purpose: 'IEP data access verification',
            dataAccessed: ['learner_scope'],
          }),
        }).catch(() => {});

        return reply.status(403).send({
          error: 'Access denied',
          reason: result.reason,
        });
      }

      return reply.send({ data: result });
    },
  );
}
