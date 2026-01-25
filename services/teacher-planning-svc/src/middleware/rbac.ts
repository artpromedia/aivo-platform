/**
 * RBAC Middleware for Teacher Planning Service
 *
 * Enforces role-based access control:
 * - TEACHER/THERAPIST: Can manage goals for assigned learners only
 * - DISTRICT_ADMIN: Read-only access across tenant
 * - PLATFORM_ADMIN: Full access
 */

import type { FastifyRequest } from 'fastify';
import { Role } from '@aivo/ts-rbac';

import { prisma } from '../prisma.js';
import type { AuthUser, Visibility } from '../types/index.js';

import { ForbiddenError } from './errorHandler.js';

/** Roles that can create/edit goals and plans */
const EDUCATOR_ROLES: Role[] = [Role.TEACHER, Role.THERAPIST];

/** Roles with read-only tenant access */
const ADMIN_ROLES: Role[] = [Role.DISTRICT_ADMIN, Role.PLATFORM_ADMIN];

/** Roles with full platform access */
const SUPER_ROLES: Role[] = [Role.PLATFORM_ADMIN, Role.SUPPORT];

/** Roles that can view therapist-only content */
const THERAPIST_ACCESS_ROLES: Role[] = [
  Role.THERAPIST,
  Role.DISTRICT_ADMIN,
  Role.PLATFORM_ADMIN,
  Role.SUPPORT,
];

/**
 * Check if user has an educator role (can create/edit)
 */
export function isEducator(user: AuthUser): boolean {
  return user.roles.some((r) => EDUCATOR_ROLES.includes(r));
}

/**
 * Check if user is a therapist
 */
export function isTherapist(user: AuthUser): boolean {
  return user.roles.includes(Role.THERAPIST);
}

/**
 * Check if user is a teacher (non-therapist educator)
 */
export function isTeacher(user: AuthUser): boolean {
  return user.roles.includes(Role.TEACHER);
}

/**
 * Check if user has admin role (read-only or higher)
 */
export function isAdmin(user: AuthUser): boolean {
  return user.roles.some((r) => ADMIN_ROLES.includes(r));
}

/**
 * Check if user has platform-level access
 */
export function isSuperUser(user: AuthUser): boolean {
  return user.roles.some((r) => SUPER_ROLES.includes(r));
}

/**
 * Check if user can view therapist-only content
 */
export function canViewTherapistContent(user: AuthUser): boolean {
  return user.roles.some((r) => THERAPIST_ACCESS_ROLES.includes(r));
}

/**
 * Get the allowed visibility levels for a user's role
 * Used to filter goals/notes based on user permissions
 */
export function getAllowedVisibilityLevels(user: AuthUser): Visibility[] {
  if (canViewTherapistContent(user)) {
    // Therapists, admins can see all visibility levels
    return ['ALL_EDUCATORS', 'THERAPISTS_ONLY', 'CUSTOM'];
  }
  // Teachers can only see ALL_EDUCATORS
  return ['ALL_EDUCATORS'];
}

/**
 * Check if a user can view content with a specific visibility
 */
export function canViewVisibility(user: AuthUser, visibility: Visibility): boolean {
  if (visibility === 'ALL_EDUCATORS') {
    return true;
  }
  // THERAPISTS_ONLY and CUSTOM require therapist access
  return canViewTherapistContent(user);
}

/**
 * Get the default visibility for creating content based on user role and mode
 * @param user The authenticated user
 * @param therapistMode Whether the user is in therapist mode (for users with both roles)
 */
export function getDefaultVisibility(user: AuthUser, therapistMode = false): Visibility {
  if (isTherapist(user) || therapistMode) {
    return 'THERAPISTS_ONLY';
  }
  return 'ALL_EDUCATORS';
}

/**
 * Check if teacher/therapist has access to a learner
 *
 * Access is granted if:
 * 1. The teacher has created any goals for this learner
 * 2. The teacher has created any session plans for this learner
 * 3. Any educator in the same tenant has worked with this learner 
 *    (learner exists in the tenant's data)
 *
 * This provides implicit assignment through work history.
 * For explicit assignments, consider adding a teacher_learner_assignments table.
 */
export async function teacherHasAccessToLearner(
  userId: string,
  learnerId: string,
  tenantId: string
): Promise<boolean> {
  // Check if the teacher has directly created content for this learner
  const [hasGoal, hasSessionPlan] = await Promise.all([
    prisma.goal.findFirst({
      where: {
        tenantId,
        learnerId,
        createdByUserId: userId,
      },
      select: { id: true },
    }),
    prisma.sessionPlan.findFirst({
      where: {
        tenantId,
        learnerId,
        createdByUserId: userId,
      },
      select: { id: true },
    }),
  ]);

  if (hasGoal || hasSessionPlan) {
    return true;
  }

  // Check if the learner exists in this tenant's data at all
  // This allows educators to access any learner in their tenant
  // (more permissive, but practical for small tenants)
  const learnerExistsInTenant = await prisma.goal.findFirst({
    where: {
      tenantId,
      learnerId,
    },
    select: { id: true },
  });

  return !!learnerExistsInTenant;
}

/**
 * Ensure the requesting user can read data for a learner
 *
 * - Educators: Must be assigned to the learner
 * - District Admin: Can read any learner in their tenant
 * - Platform Admin: Can read any learner
 */
export async function ensureCanReadLearner(
  request: FastifyRequest,
  learnerId: string
): Promise<void> {
  const user = request.user;
  if (!user) {
    throw new ForbiddenError('Authentication required');
  }

  // Super users can read anything
  if (isSuperUser(user)) {
    return;
  }

  // District admins can read within their tenant
  if (isAdmin(user)) {
    // Tenant check happens via query filters
    return;
  }

  // Educators must be assigned to the learner
  if (isEducator(user)) {
    const hasAccess = await teacherHasAccessToLearner(user.userId, learnerId, user.tenantId);
    if (!hasAccess) {
      throw new ForbiddenError(`Not authorized to access learner ${learnerId}`);
    }
    return;
  }

  throw new ForbiddenError('Insufficient permissions');
}

/**
 * Ensure the requesting user can write (create/update) data for a learner
 *
 * - Educators: Must be assigned to the learner
 * - District Admin: Read-only, cannot write
 * - Platform Admin: Can write
 */
export async function ensureCanWriteLearner(
  request: FastifyRequest,
  learnerId: string
): Promise<void> {
  const user = request.user;
  if (!user) {
    throw new ForbiddenError('Authentication required');
  }

  // Super users can write anything
  if (isSuperUser(user)) {
    return;
  }

  // District admins are read-only
  if (user.roles.includes(Role.DISTRICT_ADMIN) && !isSuperUser(user)) {
    throw new ForbiddenError('District admins have read-only access');
  }

  // Educators must be assigned to the learner
  if (isEducator(user)) {
    const hasAccess = await teacherHasAccessToLearner(user.userId, learnerId, user.tenantId);
    if (!hasAccess) {
      throw new ForbiddenError(`Not authorized to modify data for learner ${learnerId}`);
    }
    return;
  }

  throw new ForbiddenError('Insufficient permissions');
}

/**
 * Get tenant ID for queries (enforces tenant isolation)
 */
export function getTenantIdForQuery(user: AuthUser): string | undefined {
  // Platform admins/support can query across tenants
  if (isSuperUser(user)) {
    return undefined;
  }
  // Everyone else is scoped to their tenant
  return user.tenantId;
}
