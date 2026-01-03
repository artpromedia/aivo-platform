/**
 * Access Control for Tenant-Scoped File Storage
 *
 * Implements role-based access control (RBAC) for file operations.
 * Integrates with the existing @aivo/ts-rbac and @aivo/ts-policy-engine libraries.
 *
 * @module @aivo/ts-storage/access-control
 */
// ============================================================================
// Access Control Types
// ============================================================================
/**
 * File operation types for access control decisions
 */
export var FileOperation;
(function (FileOperation) {
    FileOperation["READ"] = "read";
    FileOperation["WRITE"] = "write";
    FileOperation["DELETE"] = "delete";
    FileOperation["SHARE"] = "share";
    FileOperation["ADMIN"] = "admin";
})(FileOperation || (FileOperation = {}));
// ============================================================================
// Default Policies
// ============================================================================
/**
 * Default policy - restrictive by default
 */
export const DEFAULT_POLICY = {
    readRoles: [],
    writeRoles: [],
    deleteRoles: [],
    shareRoles: [],
    adminRoles: ['platform_admin'],
    ownerCanRead: true,
    ownerCanWrite: false,
    ownerCanDelete: false,
};
/**
 * Default category policies for AIVO file types
 */
export const DEFAULT_CATEGORY_POLICIES = new Map([
    // IEP Documents - highly restricted, educators only
    [
        'IEP_DOCUMENT',
        {
            readRoles: ['teacher', 'special_education_coordinator', 'district_admin', 'platform_admin'],
            writeRoles: ['teacher', 'special_education_coordinator'],
            deleteRoles: ['special_education_coordinator', 'district_admin'],
            shareRoles: ['teacher', 'special_education_coordinator'],
            adminRoles: ['district_admin', 'platform_admin'],
            ownerCanRead: true,
            ownerCanWrite: false, // Only specific roles can upload IEP documents
            ownerCanDelete: false,
        },
    ],
    // Homework Images - student uploads
    [
        'HOMEWORK_IMAGE',
        {
            readRoles: ['teacher', 'parent', 'district_admin'],
            writeRoles: ['student'],
            deleteRoles: ['teacher'],
            shareRoles: [],
            adminRoles: ['teacher', 'district_admin'],
            ownerCanRead: true,
            ownerCanWrite: true,
            ownerCanDelete: true,
        },
    ],
    // Assessment Audio - recorded responses
    [
        'ASSESSMENT_AUDIO',
        {
            readRoles: ['teacher', 'assessment_admin', 'district_admin'],
            writeRoles: ['student'],
            deleteRoles: ['assessment_admin'],
            shareRoles: [],
            adminRoles: ['assessment_admin', 'district_admin'],
            ownerCanRead: true,
            ownerCanWrite: false,
            ownerCanDelete: false,
        },
    ],
    // Assessment Video - recorded responses
    [
        'ASSESSMENT_VIDEO',
        {
            readRoles: ['teacher', 'assessment_admin', 'district_admin'],
            writeRoles: ['student'],
            deleteRoles: ['assessment_admin'],
            shareRoles: [],
            adminRoles: ['assessment_admin', 'district_admin'],
            ownerCanRead: true,
            ownerCanWrite: false,
            ownerCanDelete: false,
        },
    ],
    // Avatar Images - user profile pictures
    [
        'AVATAR_IMAGE',
        {
            readRoles: ['*'], // Public within tenant
            writeRoles: [],
            deleteRoles: [],
            shareRoles: [],
            adminRoles: ['platform_admin'],
            ownerCanRead: true,
            ownerCanWrite: true,
            ownerCanDelete: true,
        },
    ],
    // Exported Reports - generated documents
    [
        'EXPORTED_REPORT',
        {
            readRoles: ['teacher', 'district_admin', 'platform_admin'],
            writeRoles: [], // System generated
            deleteRoles: ['district_admin'],
            shareRoles: ['teacher'],
            adminRoles: ['district_admin', 'platform_admin'],
            ownerCanRead: true,
            ownerCanWrite: false,
            ownerCanDelete: true,
        },
    ],
    // General Attachments
    [
        'ATTACHMENT',
        {
            readRoles: ['teacher', 'student', 'parent'],
            writeRoles: ['teacher', 'student'],
            deleteRoles: ['teacher'],
            shareRoles: ['teacher'],
            adminRoles: ['district_admin'],
            ownerCanRead: true,
            ownerCanWrite: true,
            ownerCanDelete: true,
        },
    ],
    // Other/Uncategorized
    [
        'OTHER',
        {
            readRoles: [],
            writeRoles: [],
            deleteRoles: [],
            shareRoles: [],
            adminRoles: ['platform_admin'],
            ownerCanRead: true,
            ownerCanWrite: true,
            ownerCanDelete: true,
        },
    ],
]);
// ============================================================================
// Access Control Service
// ============================================================================
/**
 * File access control service
 */
export class FileAccessControl {
    config;
    constructor(config) {
        this.config = {
            categoryPolicies: config?.categoryPolicies ?? DEFAULT_CATEGORY_POLICIES,
            defaultPolicy: config?.defaultPolicy ?? DEFAULT_POLICY,
            superAdminRoles: config?.superAdminRoles ?? ['platform_super_admin'],
        };
    }
    /**
     * Check if a user can perform an operation on a file
     */
    async canAccess(file, operation, context) {
        // Validate tenant isolation first
        if (file.tenantId !== context.tenantId) {
            return {
                allowed: false,
                reason: 'Cross-tenant file access is not allowed',
            };
        }
        // Check for super admin bypass
        if (this.isSuperAdmin(context)) {
            return { allowed: true, reason: 'Super admin access' };
        }
        // Get policy for file category
        const policy = this.getPolicy(file.category);
        // Check owner permissions first
        const ownerCheck = this.checkOwnerAccess(file, operation, context, policy);
        if (ownerCheck.allowed) {
            return ownerCheck;
        }
        // Check role-based access
        const roleCheck = this.checkRoleAccess(operation, context, policy);
        if (roleCheck.allowed) {
            return roleCheck;
        }
        // Run custom check if defined
        if (policy.customCheck) {
            const customResult = await policy.customCheck(file, context);
            if (customResult.allowed) {
                return customResult;
            }
        }
        // Access denied
        const requiredRoles = this.getRequiredRoles(operation, policy);
        return {
            allowed: false,
            reason: `User does not have required roles for ${operation} operation`,
            requiredRoles,
        };
    }
    /**
     * Check if user can read a file
     */
    async canRead(file, context) {
        const result = await this.canAccess(file, FileOperation.READ, context);
        return result.allowed;
    }
    /**
     * Check if user can write/update a file
     */
    async canWrite(file, context) {
        const result = await this.canAccess(file, FileOperation.WRITE, context);
        return result.allowed;
    }
    /**
     * Check if user can delete a file
     */
    async canDelete(file, context) {
        const result = await this.canAccess(file, FileOperation.DELETE, context);
        return result.allowed;
    }
    /**
     * Check if user can share a file
     */
    async canShare(file, context) {
        const result = await this.canAccess(file, FileOperation.SHARE, context);
        return result.allowed;
    }
    /**
     * Check if user can create files in a category
     */
    canCreateInCategory(category, context) {
        // Tenant validation
        if (!context.tenantId) {
            return { allowed: false, reason: 'Tenant context is required' };
        }
        // Super admin can create anywhere
        if (this.isSuperAdmin(context)) {
            return { allowed: true, reason: 'Super admin access' };
        }
        const policy = this.getPolicy(category);
        const writeRoles = policy.writeRoles;
        // Check if user has any write role
        if (writeRoles.includes('*')) {
            return { allowed: true, reason: 'Open write access for category' };
        }
        const hasWriteRole = context.roles.some((role) => writeRoles.includes(role));
        if (hasWriteRole) {
            return { allowed: true, reason: 'User has write role for category' };
        }
        // Owners can always create their own files in most categories
        if (policy.ownerCanWrite && context.userId) {
            return { allowed: true, reason: 'Users can create their own files' };
        }
        return {
            allowed: false,
            reason: `Cannot create files in category ${category}`,
            requiredRoles: writeRoles,
        };
    }
    /**
     * Filter a list of files to only those the user can access
     */
    async filterAccessibleFiles(files, operation, context) {
        const results = await Promise.all(files.map(async (file) => ({
            file,
            canAccess: (await this.canAccess(file, operation, context)).allowed,
        })));
        return results.filter((r) => r.canAccess).map((r) => r.file);
    }
    /**
     * Get all categories a user can upload to
     */
    getUploadableCategories(context) {
        const categories = [];
        for (const [category] of this.config.categoryPolicies) {
            const check = this.canCreateInCategory(category, context);
            if (check.allowed) {
                categories.push(category);
            }
        }
        return categories;
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    isSuperAdmin(context) {
        return context.roles.some((role) => this.config.superAdminRoles.includes(role));
    }
    getPolicy(category) {
        return this.config.categoryPolicies.get(category) ?? this.config.defaultPolicy;
    }
    checkOwnerAccess(file, operation, context, policy) {
        const isOwner = file.ownerId === context.userId;
        if (!isOwner) {
            return { allowed: false };
        }
        switch (operation) {
            case FileOperation.READ:
                if (policy.ownerCanRead) {
                    return { allowed: true, reason: 'Owner can read their own files' };
                }
                break;
            case FileOperation.WRITE:
                if (policy.ownerCanWrite) {
                    return { allowed: true, reason: 'Owner can modify their own files' };
                }
                break;
            case FileOperation.DELETE:
                if (policy.ownerCanDelete) {
                    return { allowed: true, reason: 'Owner can delete their own files' };
                }
                break;
            case FileOperation.SHARE:
            case FileOperation.ADMIN:
                // Owner doesn't automatically get share/admin access
                break;
        }
        return { allowed: false };
    }
    checkRoleAccess(operation, context, policy) {
        const allowedRoles = this.getRequiredRoles(operation, policy);
        // Check for wildcard access
        if (allowedRoles.includes('*')) {
            return { allowed: true, reason: 'Open access for operation' };
        }
        // Check if user has any allowed role
        const hasRole = context.roles.some((role) => allowedRoles.includes(role));
        if (hasRole) {
            return { allowed: true, reason: `User has required role for ${operation}` };
        }
        return { allowed: false, requiredRoles: allowedRoles };
    }
    getRequiredRoles(operation, policy) {
        switch (operation) {
            case FileOperation.READ:
                return policy.readRoles;
            case FileOperation.WRITE:
                return policy.writeRoles;
            case FileOperation.DELETE:
                return policy.deleteRoles;
            case FileOperation.SHARE:
                return policy.shareRoles;
            case FileOperation.ADMIN:
                return policy.adminRoles;
            default:
                return [];
        }
    }
}
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Create a file access context from request data
 */
export function createAccessContext(userId, tenantId, roles, permissions) {
    return {
        userId,
        tenantId,
        roles,
        permissions: permissions ?? [],
    };
}
/**
 * Check if a user has a specific role
 */
export function hasRole(context, role) {
    return context.roles.includes(role);
}
/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(context, roles) {
    return roles.some((role) => context.roles.includes(role));
}
/**
 * Check if a user has all of the specified roles
 */
export function hasAllRoles(context, roles) {
    return roles.every((role) => context.roles.includes(role));
}
//# sourceMappingURL=access-control.js.map