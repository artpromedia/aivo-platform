import { Role } from '@aivo/ts-rbac';

import type { AuthContext, FieldClassification } from './types.js';

/** Classification map for learner fields aligned with docs/data_governance/classification_and_policies.md */
const learnerFieldClassification: Record<string, FieldClassification> = {
  id: 'INTERNAL',
  tenantId: 'INTERNAL',
  firstName: 'SENSITIVE',
  lastName: 'SENSITIVE',
  dateOfBirth: 'SENSITIVE',
  grade: 'CONFIDENTIAL',
  guardianContactId: 'CONFIDENTIAL',
  diagnosisFlagsJson: 'SENSITIVE',
  sensoryProfileJson: 'SENSITIVE',
  iepPlanJson: 'SENSITIVE', // planned
  preferencesJson: 'CONFIDENTIAL',
  notes: 'SENSITIVE',
  createdAt: 'INTERNAL',
  updatedAt: 'INTERNAL',
};

const sensitiveDisallowedForNonAdmins = new Set<string>(['notes']);
const sensitiveAllowedForEducators = new Set<string>([
  'firstName',
  'lastName',
  'dateOfBirth',
  'diagnosisFlagsJson',
  'sensoryProfileJson',
]);
const sensitiveAllowedForParents = new Set<string>([
  'firstName',
  'lastName',
  'dateOfBirth',
  'diagnosisFlagsJson',
  'sensoryProfileJson',
  'iepPlanJson',
]);

function hasRole(ctx: AuthContext, role: Role) {
  return ctx.roles.includes(role);
}

function isRelated(ctx: AuthContext, learnerId: string) {
  return ctx.relatedLearnerIds?.includes(learnerId) ?? false;
}

/**
 * Determine if caller may view a learner field by classification and role.
 * Rules (v1):
 * - PUBLIC/INTERNAL: any authenticated user in same tenant.
 * - CONFIDENTIAL: parents/teachers/therapists related to learner, district admins, platform admins.
 * - SENSITIVE:
 *   - Platform admin: allowed.
 *   - Parent related: allowed except disallowed list.
 *   - Teacher/Therapist related: allowed for defined subset (no free-text/notes).
 *   - District admin: default deny (they should use aggregates only).
 */
export function canViewLearnerField(
  authContext: AuthContext,
  learnerId: string,
  fieldClassification: FieldClassification,
  fieldName: string
): boolean {
  // Platform admin override
  if (hasRole(authContext, Role.PLATFORM_ADMIN)) return true;

  const classification = fieldClassification;

  if (classification === 'PUBLIC' || classification === 'INTERNAL') {
    return true;
  }

  const isParent = hasRole(authContext, Role.PARENT);
  const isTeacher = hasRole(authContext, Role.TEACHER);
  const isTherapist = hasRole(authContext, Role.THERAPIST);
  const isDistrictAdmin = hasRole(authContext, Role.DISTRICT_ADMIN);

  if (classification === 'CONFIDENTIAL') {
    if (isParent || isTeacher || isTherapist) {
      return isRelated(authContext, learnerId);
    }
    if (isDistrictAdmin) return true;
    return false;
  }

  // SENSITIVE
  if (isDistrictAdmin) return false;

  if (isParent && isRelated(authContext, learnerId)) {
    if (sensitiveDisallowedForNonAdmins.has(fieldName)) return false;
    return sensitiveAllowedForParents.has(fieldName);
  }

  if ((isTeacher || isTherapist) && isRelated(authContext, learnerId)) {
    if (sensitiveDisallowedForNonAdmins.has(fieldName)) return false;
    return sensitiveAllowedForEducators.has(fieldName);
  }

  return false;
}

/** Default classification when field is unknown: treat as CONFIDENTIAL. */
function getClassification(fieldName: string): FieldClassification {
  return learnerFieldClassification[fieldName] ?? 'CONFIDENTIAL';
}

/**
 * Filter a learner payload according to caller's permissions.
 * Unknown fields default to CONFIDENTIAL to fail closed.
 */
export function filterLearnerPayloadForCaller<T extends Record<string, unknown>>(
  authContext: AuthContext,
  learnerId: string,
  learnerPayload: T
): Partial<T> {
  const entries = Object.entries(learnerPayload);
  const filtered = entries.filter(([key]) => {
    const classification = getClassification(key);
    return canViewLearnerField(authContext, learnerId, classification, key);
  });
  return Object.fromEntries(filtered) as Partial<T>;
}

export const learnerFieldPolicy = {
  classification: learnerFieldClassification,
};
