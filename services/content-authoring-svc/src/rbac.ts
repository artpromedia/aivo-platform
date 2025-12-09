/**
 * Content Authoring Roles & Permissions
 *
 * Role and permission definitions for the content authoring workflow.
 */

// Content-specific role types
export type ContentRole =
  | 'CURRICULUM_AUTHOR'
  | 'CURRICULUM_REVIEWER'
  | 'DISTRICT_CONTENT_ADMIN'
  | 'PLATFORM_ADMIN';

// Content-specific role lists for convenience
export const AUTHOR_ROLES: ContentRole[] = [
  'CURRICULUM_AUTHOR',
  'DISTRICT_CONTENT_ADMIN',
  'PLATFORM_ADMIN',
];

export const REVIEWER_ROLES: ContentRole[] = [
  'CURRICULUM_REVIEWER',
  'DISTRICT_CONTENT_ADMIN',
  'PLATFORM_ADMIN',
];

export const PUBLISHER_ROLES: ContentRole[] = ['DISTRICT_CONTENT_ADMIN', 'PLATFORM_ADMIN'];

// Check if user has any of the specified roles
export function hasAnyRole(userRoles: string[], allowedRoles: ContentRole[]): boolean {
  return userRoles.some((role) => allowedRoles.includes(role as ContentRole));
}

// Check if user can access a specific tenant's content
export function canAccessTenant(
  userTenantId: string | undefined,
  targetTenantId: string | null,
  userRoles: string[]
): boolean {
  // Platform admins can access any tenant
  if (userRoles.includes('PLATFORM_ADMIN')) return true;

  // Global content (null tenant) is accessible by all authors
  if (targetTenantId === null) return true;

  // User must belong to the target tenant
  return userTenantId === targetTenantId;
}

// Check if user can edit a specific version
export function canEditVersion(
  userId: string,
  versionCreatedBy: string,
  versionState: string,
  userRoles: string[]
): boolean {
  // Platform admins can edit anything
  if (userRoles.includes('PLATFORM_ADMIN')) return true;

  // Only DRAFT versions can be edited
  if (versionState !== 'DRAFT') return false;

  // District content admins can edit any version in their tenant
  if (userRoles.includes('DISTRICT_CONTENT_ADMIN')) return true;

  // Authors can only edit their own versions
  return userId === versionCreatedBy;
}
