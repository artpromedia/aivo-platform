/**
 * RBAC helpers for access control in reports service.
 * Ensures parents only see their children's reports,
 * teachers only see their classrooms, etc.
 */

import type { AuthenticatedUser } from '../types.js';

/**
 * Check if user can access a learner's report.
 * - Parents can access only their children's reports
 * - Teachers/therapists can access learners in their classrooms
 * - District admins can access any learner in their tenant
 */
export function canAccessLearnerReport(
  user: AuthenticatedUser,
  learnerId: string,
  tenantId: string
): boolean {
  // Must be same tenant
  if (user.tenantId !== tenantId) {
    return false;
  }

  switch (user.role) {
    case 'parent':
      // Parents can only access their own children
      return user.childrenIds?.includes(learnerId) ?? false;

    case 'teacher':
    case 'therapist':
      // Teachers/therapists need classroom-level access verification
      // This is handled at the classroom level, but they can access
      // any learner in classrooms they're assigned to
      return true; // Classroom membership checked separately

    case 'district_admin':
    case 'admin':
      // Admins can access any learner in their tenant
      return true;

    case 'service':
      // Service accounts have full access
      return true;

    default:
      return false;
  }
}

/**
 * Check if user can access a classroom summary.
 * - Teachers can access only their assigned classrooms
 * - District admins can access any classroom in their tenant
 */
export function canAccessClassroomReport(
  user: AuthenticatedUser,
  classroomId: string,
  tenantId: string
): boolean {
  // Must be same tenant
  if (user.tenantId !== tenantId) {
    return false;
  }

  switch (user.role) {
    case 'teacher':
    case 'therapist':
      // Teachers can only access their assigned classrooms
      return user.classroomIds?.includes(classroomId) ?? false;

    case 'district_admin':
    case 'admin':
      // Admins can access any classroom in their tenant
      return true;

    case 'service':
      // Service accounts have full access
      return true;

    case 'parent':
    default:
      // Parents cannot access classroom reports
      return false;
  }
}

/**
 * Filter data to exclude therapist-only private notes.
 * Used when generating parent-facing reports.
 */
export function shouldExcludeFromParentReport(
  visibility: 'ALL' | 'THERAPIST_ONLY' | 'TEACHERS' | 'PARENTS',
  userRole: string
): boolean {
  if (userRole === 'parent') {
    // Parents can only see items with PARENTS or ALL visibility
    return visibility !== 'ALL' && visibility !== 'PARENTS';
  }

  if (userRole === 'teacher') {
    // Teachers can see TEACHERS, PARENTS, and ALL
    return visibility === 'THERAPIST_ONLY';
  }

  // Therapists, admins can see everything
  return false;
}
