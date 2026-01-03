/**
 * Access Control for Tenant-Scoped File Storage
 *
 * Implements role-based access control (RBAC) for file operations.
 * Integrates with the existing @aivo/ts-rbac and @aivo/ts-policy-engine libraries.
 *
 * @module @aivo/ts-storage/access-control
 */
import type { FileCategory, StoredFile, FileAccessContext } from './types.js';
/**
 * File operation types for access control decisions
 */
export declare enum FileOperation {
    READ = "read",
    WRITE = "write",
    DELETE = "delete",
    SHARE = "share",
    ADMIN = "admin"
}
/**
 * Result of an access control check
 */
export interface AccessCheckResult {
    allowed: boolean;
    reason?: string;
    requiredRoles?: string[];
}
/**
 * Access policy for a file category
 */
export interface CategoryPolicy {
    /** Roles that can read files in this category */
    readRoles: string[];
    /** Roles that can write files in this category */
    writeRoles: string[];
    /** Roles that can delete files in this category */
    deleteRoles: string[];
    /** Roles that can share files in this category */
    shareRoles: string[];
    /** Roles that can perform admin operations */
    adminRoles: string[];
    /** Whether the owner always has read access */
    ownerCanRead: boolean;
    /** Whether the owner always has write access */
    ownerCanWrite: boolean;
    /** Whether the owner can delete their own files */
    ownerCanDelete: boolean;
    /** Custom access check function */
    customCheck?: (file: StoredFile, context: FileAccessContext) => Promise<AccessCheckResult>;
}
/**
 * Access control configuration
 */
export interface AccessControlConfig {
    /** Policies by file category */
    categoryPolicies: Map<FileCategory, CategoryPolicy>;
    /** Default policy for unconfigured categories */
    defaultPolicy: CategoryPolicy;
    /** Roles that bypass all access checks (super admin) */
    superAdminRoles: string[];
}
/**
 * Default policy - restrictive by default
 */
export declare const DEFAULT_POLICY: CategoryPolicy;
/**
 * Default category policies for AIVO file types
 */
export declare const DEFAULT_CATEGORY_POLICIES: Map<FileCategory, CategoryPolicy>;
/**
 * File access control service
 */
export declare class FileAccessControl {
    private readonly config;
    constructor(config?: Partial<AccessControlConfig>);
    /**
     * Check if a user can perform an operation on a file
     */
    canAccess(file: StoredFile, operation: FileOperation, context: FileAccessContext): Promise<AccessCheckResult>;
    /**
     * Check if user can read a file
     */
    canRead(file: StoredFile, context: FileAccessContext): Promise<boolean>;
    /**
     * Check if user can write/update a file
     */
    canWrite(file: StoredFile, context: FileAccessContext): Promise<boolean>;
    /**
     * Check if user can delete a file
     */
    canDelete(file: StoredFile, context: FileAccessContext): Promise<boolean>;
    /**
     * Check if user can share a file
     */
    canShare(file: StoredFile, context: FileAccessContext): Promise<boolean>;
    /**
     * Check if user can create files in a category
     */
    canCreateInCategory(category: FileCategory, context: FileAccessContext): AccessCheckResult;
    /**
     * Filter a list of files to only those the user can access
     */
    filterAccessibleFiles(files: StoredFile[], operation: FileOperation, context: FileAccessContext): Promise<StoredFile[]>;
    /**
     * Get all categories a user can upload to
     */
    getUploadableCategories(context: FileAccessContext): FileCategory[];
    private isSuperAdmin;
    private getPolicy;
    private checkOwnerAccess;
    private checkRoleAccess;
    private getRequiredRoles;
}
/**
 * Create a file access context from request data
 */
export declare function createAccessContext(userId: string, tenantId: string, roles: string[], permissions?: string[]): FileAccessContext;
/**
 * Check if a user has a specific role
 */
export declare function hasRole(context: FileAccessContext, role: string): boolean;
/**
 * Check if a user has any of the specified roles
 */
export declare function hasAnyRole(context: FileAccessContext, roles: string[]): boolean;
/**
 * Check if a user has all of the specified roles
 */
export declare function hasAllRoles(context: FileAccessContext, roles: string[]): boolean;
export type { FileCategory, StoredFile, FileAccessContext } from './types.js';
//# sourceMappingURL=access-control.d.ts.map