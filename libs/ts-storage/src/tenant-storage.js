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
import { StorageService } from './storage.service.js';
// ============================================================================
// TenantStorage Class
// ============================================================================
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
export class TenantStorage {
    storage;
    config;
    constructor(config, virusScanner) {
        this.config = config;
        this.storage = new StorageService(config, virusScanner);
    }
    // --------------------------------------------------------------------------
    // Path Utilities
    // --------------------------------------------------------------------------
    /**
     * Build a tenant-scoped path prefix
     */
    buildTenantPrefix(tenantId) {
        return `${tenantId}/`;
    }
    /**
     * Build a full path for a learner's files
     */
    buildLearnerPath(tenantId, learnerId, category) {
        const parts = [tenantId, 'learner', learnerId];
        if (category) {
            parts.push(category);
        }
        return parts.join('/');
    }
    /**
     * Build a full path for a user's files
     */
    buildUserPath(tenantId, userId, category) {
        const parts = [tenantId, 'user', userId];
        if (category) {
            parts.push(category);
        }
        return parts.join('/');
    }
    /**
     * Build a full path for tenant-wide files
     */
    buildTenantPath(tenantId, category) {
        const parts = [tenantId, 'tenant', tenantId];
        if (category) {
            parts.push(category);
        }
        return parts.join('/');
    }
    /**
     * Parse an S3 key to extract tenant information
     */
    parsePath(s3Key) {
        const parts = s3Key.split('/');
        if (parts.length < 4) {
            return { valid: false, error: 'Invalid path format' };
        }
        const [tenantId, ownerType, ownerId, category] = parts;
        if (!tenantId || !ownerType || !ownerId || !category) {
            return { valid: false, error: 'Missing required path components' };
        }
        return {
            valid: true,
            tenantId,
            ownerType,
            ownerId,
            category,
        };
    }
    /**
     * Validate that a path belongs to a tenant
     *
     * @throws Error if path doesn't belong to tenant (prevents cross-tenant access)
     */
    validatePath(s3Key, tenantId) {
        const parsed = this.parsePath(s3Key);
        if (!parsed.valid) {
            throw new CrossTenantAccessError(tenantId, undefined, s3Key);
        }
        if (parsed.tenantId !== tenantId) {
            throw new CrossTenantAccessError(tenantId, parsed.tenantId, s3Key);
        }
    }
    // --------------------------------------------------------------------------
    // Presigned URLs
    // --------------------------------------------------------------------------
    /**
     * Generate a presigned upload URL with automatic tenant path
     */
    async getUploadUrl(context, options, urlOptions) {
        // Determine owner
        const ownerId = options.ownerId ?? context.userId;
        const ownerType = (options.ownerType ?? 'user');
        const uploadOptions = {
            tenantId: context.tenantId,
            ownerId,
            ...(ownerType && { ownerType }),
            filename: options.filename,
            mimeType: options.mimeType,
            category: options.category,
            ...(options.contentLength !== undefined && { contentLength: options.contentLength }),
            metadata: {
                ...options.metadata,
                uploadedBy: context.userId,
                uploadedByRole: context.userRole ?? 'unknown',
            },
        };
        return this.storage.getPresignedUploadUrl(uploadOptions, urlOptions);
    }
    /**
     * Generate a presigned download URL with tenant validation
     */
    async getDownloadUrl(context, options, urlOptions) {
        // Always validate tenant access
        if (options.validateTenantId !== false) {
            this.validatePath(options.s3Key, context.tenantId);
        }
        return this.storage.getPresignedDownloadUrl(options.s3Key, context.tenantId, urlOptions);
    }
    // --------------------------------------------------------------------------
    // File Operations
    // --------------------------------------------------------------------------
    /**
     * List files for a learner within the tenant
     */
    async listLearnerFiles(context, learnerId, category, options) {
        const prefix = this.buildLearnerPath(context.tenantId, learnerId, category);
        return this.storage.listFiles({
            tenantId: context.tenantId,
            prefix,
            ...(options?.maxResults !== undefined && { maxResults: options.maxResults }),
            ...(options?.continuationToken !== undefined && { continuationToken: options.continuationToken }),
        });
    }
    /**
     * List files for a user within the tenant
     */
    async listUserFiles(context, userId, category, options) {
        const targetUserId = userId ?? context.userId;
        const prefix = this.buildUserPath(context.tenantId, targetUserId, category);
        return this.storage.listFiles({
            tenantId: context.tenantId,
            prefix,
            ...(options?.maxResults !== undefined && { maxResults: options.maxResults }),
            ...(options?.continuationToken !== undefined && { continuationToken: options.continuationToken }),
        });
    }
    /**
     * Delete a file with tenant validation
     */
    async deleteFile(context, s3Key) {
        // Validate tenant access
        this.validatePath(s3Key, context.tenantId);
        await this.storage.deleteFile(s3Key, context.tenantId);
    }
    /**
     * Copy a file within the same tenant
     */
    async copyFile(context, sourceKey, destinationKey) {
        // Validate source belongs to tenant
        this.validatePath(sourceKey, context.tenantId);
        // Validate destination is within same tenant
        this.validatePath(destinationKey, context.tenantId);
        await this.storage.copyFile(sourceKey, destinationKey, context.tenantId);
    }
    /**
     * Get file metadata with tenant validation
     */
    async getFileMetadata(context, s3Key) {
        // Validate tenant access
        this.validatePath(s3Key, context.tenantId);
        return this.storage.getFileMetadata(s3Key, context.tenantId);
    }
    // --------------------------------------------------------------------------
    // Quota Checking
    // --------------------------------------------------------------------------
    /**
     * Calculate storage used by a tenant
     *
     * Note: This can be expensive for large tenants. Consider caching.
     */
    async calculateTenantStorage(tenantId) {
        const prefix = this.buildTenantPrefix(tenantId);
        let totalBytes = 0;
        let fileCount = 0;
        let continuationToken;
        do {
            const result = await this.storage.listFiles({
                tenantId,
                prefix,
                maxResults: 1000,
                continuationToken,
            });
            for (const file of result.files) {
                totalBytes += file.size;
                fileCount++;
            }
            continuationToken = result.continuationToken;
        } while (continuationToken);
        return { totalBytes, fileCount };
    }
    /**
     * Get the underlying storage service (for advanced operations)
     */
    getStorageService() {
        return this.storage;
    }
}
// ============================================================================
// Errors
// ============================================================================
/**
 * Error thrown when attempting to access files from another tenant
 */
export class CrossTenantAccessError extends Error {
    requestedTenantId;
    actualTenantId;
    s3Key;
    constructor(requestedTenantId, actualTenantId, s3Key) {
        super(`[SECURITY] Cross-tenant storage access denied: Tenant "${requestedTenantId}" ` +
            `attempted to access path belonging to tenant "${actualTenantId ?? 'unknown'}"`);
        this.requestedTenantId = requestedTenantId;
        this.actualTenantId = actualTenantId;
        this.s3Key = s3Key;
        this.name = 'CrossTenantAccessError';
    }
}
// ============================================================================
// Factory Function
// ============================================================================
/**
 * Create a TenantStorage instance from environment variables
 */
export function createTenantStorageFromEnv(virusScanner) {
    const endpoint = process.env.S3_ENDPOINT;
    const config = {
        bucket: process.env.S3_BUCKET ?? '',
        region: process.env.AWS_REGION ?? process.env.S3_REGION ?? 'us-east-1',
        ...(endpoint && { endpoint }),
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    };
    // Add credentials if provided
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_KEY;
    if (accessKeyId && secretAccessKey) {
        config.credentials = { accessKeyId, secretAccessKey };
    }
    if (!config.bucket) {
        throw new Error('S3_BUCKET environment variable is required');
    }
    return new TenantStorage(config, virusScanner);
}
//# sourceMappingURL=tenant-storage.js.map