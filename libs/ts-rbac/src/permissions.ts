import { Role } from './roles.js';

export enum Permission {
  TenantRead = 'tenant:read',
  TenantManage = 'tenant:manage',
  SchoolManage = 'school:manage',
  ClassroomManage = 'classroom:manage',
  UserManage = 'user:manage',
}

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.PLATFORM_ADMIN]: [
    Permission.TenantRead,
    Permission.TenantManage,
    Permission.SchoolManage,
    Permission.ClassroomManage,
    Permission.UserManage,
  ],
  [Role.DISTRICT_ADMIN]: [
    Permission.TenantRead,
    Permission.SchoolManage,
    Permission.ClassroomManage,
  ],
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
