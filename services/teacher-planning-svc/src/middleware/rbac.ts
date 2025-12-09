/**
 * RBAC Middleware for Teacher Planning Service
 *
 * Enforces role-based access control:
 * - TEACHER/THERAPIST: Can manage goals for assigned learners only
 * - DISTRICT_ADMIN: Read-only access across tenant
 * - PLATFORM_ADMIN: Full access
 */

import type { FastifyRequest } from 'fastify';

import type { AuthUser, UserRole, Visibility } from '../types/index.js';

import { ForbiddenError } from './errorHandler.js';

/** Roles that can create/edit goals and plans */
const EDUCATOR_ROLES: UserRole[] = ['TEACHER', 'THERAPIST'];

/** Roles with read-only tenant access */
const ADMIN_ROLES: UserRole[] = ['DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

/** Roles with full platform access */
const SUPER_ROLES: UserRole[] = ['PLATFORM_ADMIN', 'SUPPORT'];

/** Roles that can view therapist-only content */
const THERAPIST_ACCESS_ROLES: UserRole[] = [
  'THERAPIST',
  'DISTRICT_ADMIN',
  'PLATFORM_ADMIN',
  'SUPPORT',
];

/**
 * Check if user has an educator role (can create/edit)
 */
export function isEducator(user: AuthUser): boolean {
  return EDUCATOR_ROLES.includes(user.role);
}

/**
 * Check if user is a therapist
 */
export function isTherapist(user: AuthUser): boolean {
  return user.role === 'THERAPIST';
}

/**
 * Check if user is a teacher (non-therapist educator)
 */
export function isTeacher(user: AuthUser): boolean {
  return user.role === 'TEACHER';
}

/**
 * Check if user has admin role (read-only or higher)
 */
export function isAdmin(user: AuthUser): boolean {
  return ADMIN_ROLES.includes(user.role);
}

/**
 * Check if user has platform-level access
 */
export function isSuperUser(user: AuthUser): boolean {
  return SUPER_ROLES.includes(user.role);
}

/**
 * Check if user can view therapist-only content
 */
export function canViewTherapistContent(user: AuthUser): boolean {
  return THERAPIST_ACCESS_ROLES.includes(user.role);
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
 * Stub: Check if teacher/therapist has access to a learner
 *
 * In production, this would query:
 * - teacher_learner_assignments table
 * - classroom_members table
 * - caseload assignments
 *
 * For now, returns true for educators (stub implementation).
 */
export async function teacherHasAccessToLearner(
  _userId: string,
  _learnerId: string,
  _tenantId: string
): Promise<boolean> {
  // TODO: Implement actual assignment lookup
  // Example query:
  // SELECT 1 FROM teacher_learner_assignments
  // WHERE teacher_user_id = $userId AND learner_id = $learnerId AND tenant_id = $tenantId
  // UNION
  // SELECT 1 FROM classroom_members cm
  // JOIN classroom_teachers ct ON ct.classroom_id = cm.classroom_id
  // WHERE ct.teacher_user_id = $userId AND cm.learner_id = $learnerId

  // Stub: Allow all educators for now
  return true;
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
  if (user.role === 'DISTRICT_ADMIN') {
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
