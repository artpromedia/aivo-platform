import { Role } from './roles';
export var Permission;
(function (Permission) {
    Permission["TenantRead"] = "tenant:read";
    Permission["TenantManage"] = "tenant:manage";
    Permission["SchoolManage"] = "school:manage";
    Permission["ClassroomManage"] = "classroom:manage";
    Permission["UserManage"] = "user:manage";
    // Content permissions
    Permission["ContentCreate"] = "content:create";
    Permission["ContentEdit"] = "content:edit";
    Permission["ContentReview"] = "content:review";
    Permission["ContentPublish"] = "content:publish";
    Permission["ContentAdmin"] = "content:admin";
})(Permission || (Permission = {}));
export const rolePermissions = {
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
export function hasPermission(roles, permission) {
    if (!roles || roles.length === 0)
        return false;
    return roles.some((role) => rolePermissions[role]?.includes(permission));
}
//# sourceMappingURL=permissions.js.map