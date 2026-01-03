import { Role } from './roles';
export declare enum Permission {
    TenantRead = "tenant:read",
    TenantManage = "tenant:manage",
    SchoolManage = "school:manage",
    ClassroomManage = "classroom:manage",
    UserManage = "user:manage",
    ContentCreate = "content:create",
    ContentEdit = "content:edit",
    ContentReview = "content:review",
    ContentPublish = "content:publish",
    ContentAdmin = "content:admin"
}
export declare const rolePermissions: Record<Role, Permission[]>;
export declare function hasPermission(roles: Role[] | undefined, permission: Permission): boolean;
//# sourceMappingURL=permissions.d.ts.map