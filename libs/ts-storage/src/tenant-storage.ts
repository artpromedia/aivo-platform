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

import type {
  StorageConfig,
  FileCategory,
  UploadOptions,
  PresignedUrlOptions,
  OwnerType,
} from './types.js';
import { StorageService, type PresignedUploadResult, type PresignedDownloadResult } from './storage.service.js';
import type { IVirusScanner } from './virus-scanner.js';

// ============================================================================
// Types
// ============================================================================

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
  private readonly storage: StorageService;
  private readonly config: StorageConfig;

  constructor(config: StorageConfig, virusScanner?: IVirusScanner) {
    this.config = config;
    this.storage = new StorageService(config, virusScanner);
  }

  // --------------------------------------------------------------------------
  // Path Utilities
  // --------------------------------------------------------------------------

  /**
   * Build a tenant-scoped path prefix
   */
  buildTenantPrefix(tenantId: string): string {
    return `${tenantId}/`;
  }

  /**
   * Build a full path for a learner's files
   */
  buildLearnerPath(tenantId: string, learnerId: string, category?: FileCategory): string {
    const parts = [tenantId, 'learner', learnerId];
    if (category) {
      parts.push(category);
    }
    return parts.join('/');
  }

  /**
   * Build a full path for a user's files
   */
  buildUserPath(tenantId: string, userId: string, category?: FileCategory): string {
    const parts = [tenantId, 'user', userId];
    if (category) {
      parts.push(category);
    }
    return parts.join('/');
  }

  /**
   * Build a full path for tenant-wide files
   */
  buildTenantPath(tenantId: string, category?: FileCategory): string {
    const parts = [tenantId, 'tenant', tenantId];
    if (category) {
      parts.push(category);
    }
    return parts.join('/');
  }

  /**
   * Parse an S3 key to extract tenant information
   */
  parsePath(s3Key: string): PathValidationResult {
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
  validatePath(s3Key: string, tenantId: string): void {
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
  async getUploadUrl(
    context: TenantStorageContext,
    options: TenantUploadOptions,
    urlOptions?: PresignedUrlOptions
  ): Promise<PresignedUploadResult> {
    // Determine owner
    const ownerId = options.ownerId ?? context.userId;
    const ownerType = (options.ownerType ?? 'user') as OwnerType;

    const uploadOptions: UploadOptions = {
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
  async getDownloadUrl(
    context: TenantStorageContext,
    options: TenantDownloadOptions,
    urlOptions?: PresignedUrlOptions
  ): Promise<PresignedDownloadResult> {
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
  async listLearnerFiles(
    context: TenantStorageContext,
    learnerId: string,
    category?: FileCategory,
    options?: { maxResults?: number; continuationToken?: string }
  ) {
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
  async listUserFiles(
    context: TenantStorageContext,
    userId?: string,
    category?: FileCategory,
    options?: { maxResults?: number; continuationToken?: string }
  ) {
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
  async deleteFile(context: TenantStorageContext, s3Key: string): Promise<void> {
    // Validate tenant access
    this.validatePath(s3Key, context.tenantId);

    await this.storage.deleteFile(s3Key, context.tenantId);
  }

  /**
   * Copy a file within the same tenant
   */
  async copyFile(
    context: TenantStorageContext,
    sourceKey: string,
    destinationKey: string
  ): Promise<void> {
    // Validate source belongs to tenant
    this.validatePath(sourceKey, context.tenantId);

    // Validate destination is within same tenant
    this.validatePath(destinationKey, context.tenantId);

    await this.storage.copyFile(sourceKey, destinationKey, context.tenantId);
  }

  /**
   * Get file metadata with tenant validation
   */
  async getFileMetadata(context: TenantStorageContext, s3Key: string) {
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
  async calculateTenantStorage(tenantId: string): Promise<{ totalBytes: number; fileCount: number }> {
    const prefix = this.buildTenantPrefix(tenantId);
    let totalBytes = 0;
    let fileCount = 0;
    let continuationToken: string | undefined;

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
  getStorageService(): StorageService {
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
  constructor(
    public readonly requestedTenantId: string,
    public readonly actualTenantId: string | undefined,
    public readonly s3Key: string
  ) {
    super(
      `[SECURITY] Cross-tenant storage access denied: Tenant "${requestedTenantId}" ` +
        `attempted to access path belonging to tenant "${actualTenantId ?? 'unknown'}"`
    );
    this.name = 'CrossTenantAccessError';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a TenantStorage instance from environment variables
 */
export function createTenantStorageFromEnv(virusScanner?: IVirusScanner): TenantStorage {
  const endpoint = process.env.S3_ENDPOINT;
  const config: StorageConfig = {
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
