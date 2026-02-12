import { Role } from './roles';

export enum Permission {
  TenantRead = 'tenant:read',
  TenantManage = 'tenant:manage',
  SchoolManage = 'school:manage',
  ClassroomManage = 'classroom:manage',
  UserManage = 'user:manage',
  // Content permissions
  ContentCreate = 'content:create',
  ContentEdit = 'content:edit',
  ContentReview = 'content:review',
  ContentPublish = 'content:publish',
  ContentAdmin = 'content:admin',
}

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.PLATFORM_ADMIN]: [
    Permission.TenantRead,
    Permission.TenantManage,
    Permission.SchoolManage,
    Permission.ClassroomManage,
    Permission.UserManage,
    Permission.ContentCreate,
    Permission.ContentEdit,
    Permission.ContentReview,
    Permission.ContentPublish,
    Permission.ContentAdmin,
  ],
  [Role.DISTRICT_ADMIN]: [
    Permission.TenantRead,
    Permission.SchoolManage,
    Permission.ClassroomManage,
  ],
  [Role.DISTRICT_CONTENT_ADMIN]: [
    Permission.TenantRead,
    Permission.ContentCreate,
    Permission.ContentEdit,
    Permission.ContentReview,
    Permission.ContentPublish,
    Permission.ContentAdmin,
  ],
  [Role.CURRICULUM_AUTHOR]: [
    Permission.TenantRead,
    Permission.ContentCreate,
    Permission.ContentEdit,
  ],
  [Role.CURRICULUM_REVIEWER]: [Permission.TenantRead, Permission.ContentReview],
  [Role.SUPPORT]: [Permission.TenantRead],
  [Role.TEACHER]: [Permission.ClassroomManage],
  [Role.THERAPIST]: [Permission.ClassroomManage],
  [Role.LEARNER]: [],
  [Role.PARENT]: [],
};

export function hasPermission(roles: Role[] | undefined, permission: Permission): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => rolePermissions[role]?.includes(permission));
}
