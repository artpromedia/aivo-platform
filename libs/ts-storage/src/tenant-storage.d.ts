/**
 * Tenant Storage Helper
 *
 * Provides simplified, tenant-isolated file storage operations.
 * This helper enforces tenant paths and prevents cross-tenant access.
 *
 * Path convention: s3://bucket/{tenantId}/{ownerType}/{ownerId}/{category}/{fileId}/{filename}
 *
 * @module @aivo/ts-storage/tenant-storage
 */
import type { StorageConfig, FileCategory, PresignedUrlOptions } from './types.js';
import { StorageService, type PresignedUploadResult, type PresignedDownloadResult } from './storage.service.js';
import type { IVirusScanner } from './virus-scanner.js';
/**
 * Context for tenant-scoped operations
 */
export interface TenantStorageContext {
    tenantId: string;
    userId: string;
    userRole?: string;
    learnerId?: string;
}
/**
 * Options for generating upload URLs
 */
export interface TenantUploadOptions {
    filename: string;
    mimeType: string;
    category: FileCategory;
    /** Target owner (e.g., learnerId for learner files, or userId for user files) */
    ownerId?: string;
    ownerType?: 'learner' | 'user' | 'tenant' | 'system';
    contentLength?: number;
    metadata?: Record<string, string>;
}
/**
 * Options for generating download URLs
 */
export interface TenantDownloadOptions {
    s3Key: string;
    /** If provided, validates the file belongs to this tenant */
    validateTenantId?: boolean;
}
/**
 * Result of validating a file path
 */
export interface PathValidationResult {
    valid: boolean;
    tenantId?: string;
    ownerId?: string;
    ownerType?: string;
    category?: string;
    error?: string;
}
/**
 * Tenant-isolated storage wrapper
 *
 * Provides:
 * - Automatic tenant path prefixing
 * - Cross-tenant access prevention
 * - Role-based access hints
 * - Simplified API for common operations
 *
 * @example
 * ```typescript
 * const tenantStorage = new TenantStorage(
 *   { bucket: 'aivo-uploads', region: 'us-east-1' },
 *   virusScanner
 * );
 *
 * // Generate upload URL for learner homework
 * const result = await tenantStorage.getUploadUrl(
 *   { tenantId: 'tenant123', userId: 'user456' },
 *   {
 *     filename: 'homework.pdf',
 *     mimeType: 'application/pdf',
 *     category: 'HOMEWORK',
 *     ownerId: 'learner789',
 *     ownerType: 'learner',
 *   }
 * );
 *
 * // Trying to access another tenant's file will fail
 * const download = await tenantStorage.getDownloadUrl(
 *   { tenantId: 'tenant123', userId: 'user456' },
 *   { s3Key: 'different-tenant/...' }, // Error: Cross-tenant access denied
 * );
 * ```
 */
export declare class TenantStorage {
    private readonly storage;
    private readonly config;
    constructor(config: StorageConfig, virusScanner?: IVirusScanner);
    /**
     * Build a tenant-scoped path prefix
     */
    buildTenantPrefix(tenantId: string): string;
    /**
     * Build a full path for a learner's files
     */
    buildLearnerPath(tenantId: string, learnerId: string, category?: FileCategory): string;
    /**
     * Build a full path for a user's files
     */
    buildUserPath(tenantId: string, userId: string, category?: FileCategory): string;
    /**
     * Build a full path for tenant-wide files
     */
    buildTenantPath(tenantId: string, category?: FileCategory): string;
    /**
     * Parse an S3 key to extract tenant information
     */
    parsePath(s3Key: string): PathValidationResult;
    /**
     * Validate that a path belongs to a tenant
     *
     * @throws Error if path doesn't belong to tenant (prevents cross-tenant access)
     */
    validatePath(s3Key: string, tenantId: string): void;
    /**
     * Generate a presigned upload URL with automatic tenant path
     */
    getUploadUrl(context: TenantStorageContext, options: TenantUploadOptions, urlOptions?: PresignedUrlOptions): Promise<PresignedUploadResult>;
    /**
     * Generate a presigned download URL with tenant validation
     */
    getDownloadUrl(context: TenantStorageContext, options: TenantDownloadOptions, urlOptions?: PresignedUrlOptions): Promise<PresignedDownloadResult>;
    /**
     * List files for a learner within the tenant
     */
    listLearnerFiles(context: TenantStorageContext, learnerId: string, category?: FileCategory, options?: {
        maxResults?: number;
        continuationToken?: string;
    }): Promise<import("./storage.service.js").S3ListFilesResult>;
    /**
     * List files for a user within the tenant
     */
    listUserFiles(context: TenantStorageContext, userId?: string, category?: FileCategory, options?: {
        maxResults?: number;
        continuationToken?: string;
    }): Promise<import("./storage.service.js").S3ListFilesResult>;
    /**
     * Delete a file with tenant validation
     */
    deleteFile(context: TenantStorageContext, s3Key: string): Promise<void>;
    /**
     * Copy a file within the same tenant
     */
    copyFile(context: TenantStorageContext, sourceKey: string, destinationKey: string): Promise<void>;
    /**
     * Get file metadata with tenant validation
     */
    getFileMetadata(context: TenantStorageContext, s3Key: string): Promise<{
        contentType?: string;
        contentLength?: number;
        metadata?: Record<string, string>;
        lastModified?: Date;
    }>;
    /**
     * Calculate storage used by a tenant
     *
     * Note: This can be expensive for large tenants. Consider caching.
     */
    calculateTenantStorage(tenantId: string): Promise<{
        totalBytes: number;
        fileCount: number;
    }>;
    /**
     * Get the underlying storage service (for advanced operations)
     */
    getStorageService(): StorageService;
}
/**
 * Error thrown when attempting to access files from another tenant
 */
export declare class CrossTenantAccessError extends Error {
    readonly requestedTenantId: string;
    readonly actualTenantId: string | undefined;
    readonly s3Key: string;
    constructor(requestedTenantId: string, actualTenantId: string | undefined, s3Key: string);
}
/**
 * Create a TenantStorage instance from environment variables
 */
export declare function createTenantStorageFromEnv(virusScanner?: IVirusScanner): TenantStorage;
//# sourceMappingURL=tenant-storage.d.ts.map