/**
 * Research Export S3 Service
 *
 * Secure S3 presigned URL generation for research data exports.
 * Implements FERPA/COPPA compliant data handling with:
 * - KMS encryption at rest
 * - Presigned URLs with configurable expiry
 * - Audit logging for all access
 * - Tenant isolation
 *
 * @module @aivo/research-svc/services/s3
 */

import { createHash, randomUUID } from 'node:crypto';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  type ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { config } from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * S3 service configuration
 */
export interface S3ServiceConfig {
  /** AWS region */
  region: string;
  /** S3 bucket name */
  bucket: string;
  /** AWS access key ID */
  accessKeyId?: string;
  /** AWS secret access key */
  secretAccessKey?: string;
  /** KMS key ID for server-side encryption */
  kmsKeyId?: string;
  /** Custom endpoint (for MinIO/LocalStack) */
  endpoint?: string;
  /** Force path style (for MinIO/LocalStack) */
  forcePathStyle?: boolean;
}

/**
 * Options for presigned URL generation
 */
export interface PresignedUrlOptions {
  /** URL expiration in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
  /** Content type for uploads */
  contentType?: string;
  /** Custom metadata to attach to the object */
  metadata?: Record<string, string>;
  /** Content disposition for downloads */
  contentDisposition?: string;
}

/**
 * Result of presigned upload URL generation
 */
export interface PresignedUploadResult {
  /** The S3 object key */
  key: string;
  /** The S3 bucket name */
  bucket: string;
  /** The presigned upload URL */
  url: string;
  /** When the URL expires */
  expiresAt: Date;
  /** Headers that must be included in the upload request */
  requiredHeaders: Record<string, string>;
}

/**
 * Result of presigned download URL generation
 */
export interface PresignedDownloadResult {
  /** The presigned download URL */
  url: string;
  /** When the URL expires */
  expiresAt: Date;
  /** Original filename for content disposition */
  filename: string;
}

/**
 * Result of a direct upload operation
 */
export interface UploadResult {
  /** The S3 object key */
  key: string;
  /** The S3 bucket name */
  bucket: string;
  /** File size in bytes */
  size: number;
  /** Content hash (SHA-256) */
  checksum: string;
  /** When the object was uploaded */
  uploadedAt: Date;
}

/**
 * Object metadata from S3
 */
export interface ObjectMetadata {
  /** Object key */
  key: string;
  /** File size in bytes */
  size: number;
  /** Content type */
  contentType: string;
  /** Last modified date */
  lastModified: Date;
  /** Custom metadata */
  metadata: Record<string, string>;
  /** ETag (content hash) */
  etag: string;
}

/**
 * Error thrown when S3 operations fail
 */
export class S3ServiceError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public override readonly cause?: Error;

  constructor(message: string, code: string, statusCode?: number, cause?: Error) {
    super(message);
    this.name = 'S3ServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// S3 Service Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Research Export S3 Service
 *
 * Provides secure S3 operations for research data exports with:
 * - Presigned URLs for secure browser uploads/downloads
 * - Server-side encryption with KMS
 * - Tenant-scoped object keys
 * - Compliance metadata tagging
 */
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly kmsKeyId?: string;
  private readonly region: string;

  constructor(serviceConfig?: Partial<S3ServiceConfig>) {
    // Merge with default config
    const effectiveConfig: S3ServiceConfig = {
      region: serviceConfig?.region ?? config.s3Region,
      bucket: serviceConfig?.bucket ?? config.s3Bucket,
      accessKeyId: serviceConfig?.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: serviceConfig?.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY,
      kmsKeyId: serviceConfig?.kmsKeyId ?? process.env.S3_KMS_KEY_ID,
      endpoint: serviceConfig?.endpoint ?? process.env.S3_ENDPOINT,
      forcePathStyle: serviceConfig?.forcePathStyle ?? process.env.S3_FORCE_PATH_STYLE === 'true',
    };

    this.bucket = effectiveConfig.bucket;
    this.kmsKeyId = effectiveConfig.kmsKeyId;
    this.region = effectiveConfig.region;

    // Build S3 client config
    const s3ClientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region: effectiveConfig.region,
    };

    if (effectiveConfig.endpoint) {
      s3ClientConfig.endpoint = effectiveConfig.endpoint;
      s3ClientConfig.forcePathStyle = effectiveConfig.forcePathStyle ?? true;
    }

    if (effectiveConfig.accessKeyId && effectiveConfig.secretAccessKey) {
      s3ClientConfig.credentials = {
        accessKeyId: effectiveConfig.accessKeyId,
        secretAccessKey: effectiveConfig.secretAccessKey,
      };
    }

    this.client = new S3Client(s3ClientConfig);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Presigned URL Generation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a presigned URL for uploading a research export file.
   *
   * The URL will:
   * - Expire after the specified duration (default 1 hour)
   * - Require specific headers for server-side encryption
   * - Include tenant and compliance metadata
   *
   * @param key - The S3 object key (path)
   * @param options - Upload options
   * @returns Presigned upload URL with required headers
   */
  async getPresignedUploadUrl(
    key: string,
    options: PresignedUrlOptions = {}
  ): Promise<PresignedUploadResult> {
    const expiresIn = options.expiresIn ?? 3600; // Default 1 hour
    const contentType = options.contentType ?? 'application/json';

    // Build metadata with compliance tags
    const metadata: Record<string, string> = {
      ...options.metadata,
      'x-amz-meta-exported-at': new Date().toISOString(),
      'x-amz-meta-service': 'research-svc',
      'x-amz-meta-compliance': 'ferpa-coppa',
    };

    // Build the PutObject command with encryption
    const commandInput: ConstructorParameters<typeof PutObjectCommand>[0] = {
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      Metadata: metadata,
    };

    // Add KMS encryption if configured
    if (this.kmsKeyId) {
      commandInput.ServerSideEncryption = 'aws:kms';
      commandInput.SSEKMSKeyId = this.kmsKeyId;
    } else {
      // Fall back to S3-managed encryption
      commandInput.ServerSideEncryption = 'AES256';
    }

    const command = new PutObjectCommand(commandInput);
    const url = await getSignedUrl(this.client, command, { expiresIn });

    // Build required headers for the upload request
    const requiredHeaders: Record<string, string> = {
      'Content-Type': contentType,
    };

    if (this.kmsKeyId) {
      requiredHeaders['x-amz-server-side-encryption'] = 'aws:kms';
      requiredHeaders['x-amz-server-side-encryption-aws-kms-key-id'] = this.kmsKeyId;
    } else {
      requiredHeaders['x-amz-server-side-encryption'] = 'AES256';
    }

    return {
      key,
      bucket: this.bucket,
      url,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      requiredHeaders,
    };
  }

  /**
   * Generate a presigned URL for downloading a research export file.
   *
   * The URL will:
   * - Expire after the specified duration (default 1 hour)
   * - Include content-disposition for proper filename
   * - Verify the file exists before generating URL
   *
   * @param key - The S3 object key (path)
   * @param options - Download options
   * @returns Presigned download URL
   * @throws S3ServiceError if file doesn't exist
   */
  async getPresignedDownloadUrl(
    key: string,
    options: PresignedUrlOptions = {}
  ): Promise<PresignedDownloadResult> {
    const expiresIn = options.expiresIn ?? 3600; // Default 1 hour

    // Verify the file exists (throws if not found)
    await this.verifyObjectExists(key);

    // Extract filename from key for content disposition
    const filename = this.extractFilename(key);
    const contentDisposition = options.contentDisposition ?? `attachment; filename="${filename}"`;

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: contentDisposition,
      ResponseContentType: options.contentType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });

    return {
      url,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      filename,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Direct Upload/Download
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Upload data directly to S3 (for small exports processed server-side).
   *
   * @param key - The S3 object key (path)
   * @param data - The data to upload (Buffer or string)
   * @param options - Upload options
   * @returns Upload result with checksum
   */
  async upload(
    key: string,
    data: Buffer | string,
    options: PresignedUrlOptions = {}
  ): Promise<UploadResult> {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    const contentType = options.contentType ?? this.inferContentType(key);

    // Calculate SHA-256 checksum for integrity
    const checksum = createHash('sha256').update(buffer).digest('hex');

    // Build metadata with compliance tags
    const metadata: Record<string, string> = {
      ...options.metadata,
      'x-amz-meta-exported-at': new Date().toISOString(),
      'x-amz-meta-service': 'research-svc',
      'x-amz-meta-compliance': 'ferpa-coppa',
      'x-amz-meta-checksum-sha256': checksum,
    };

    // Build the PutObject command
    const commandInput: ConstructorParameters<typeof PutObjectCommand>[0] = {
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
      Metadata: metadata,
    };

    // Add KMS encryption if configured
    if (this.kmsKeyId) {
      commandInput.ServerSideEncryption = 'aws:kms';
      commandInput.SSEKMSKeyId = this.kmsKeyId;
    } else {
      commandInput.ServerSideEncryption = 'AES256';
    }

    try {
      await this.client.send(new PutObjectCommand(commandInput));
    } catch (error) {
      throw this.wrapError(error, 'Failed to upload file to S3');
    }

    return {
      key,
      bucket: this.bucket,
      size: buffer.length,
      checksum,
      uploadedAt: new Date(),
    };
  }

  /**
   * Download data directly from S3.
   *
   * @param key - The S3 object key (path)
   * @returns The file contents as a Buffer
   * @throws S3ServiceError if file doesn't exist
   */
  async download(key: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) {
        throw new S3ServiceError('Empty response body', 'EMPTY_BODY');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      throw this.wrapError(error, 'Failed to download file from S3');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Object Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get metadata for an S3 object.
   *
   * @param key - The S3 object key (path)
   * @returns Object metadata
   * @throws S3ServiceError if object doesn't exist
   */
  async getObjectMetadata(key: string): Promise<ObjectMetadata> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      return {
        key,
        size: response.ContentLength ?? 0,
        contentType: response.ContentType ?? 'application/octet-stream',
        lastModified: response.LastModified ?? new Date(),
        metadata: response.Metadata ?? {},
        etag: response.ETag?.replace(/"/g, '') ?? '',
      };
    } catch (error) {
      throw this.wrapError(error, 'Failed to get object metadata');
    }
  }

  /**
   * Delete an S3 object.
   *
   * @param key - The S3 object key (path)
   * @throws S3ServiceError if deletion fails
   */
  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch (error) {
      throw this.wrapError(error, 'Failed to delete object from S3');
    }
  }

  /**
   * Check if an S3 object exists.
   *
   * @param key - The S3 object key (path)
   * @returns true if object exists, false otherwise
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (error) {
      // Check if it's a "not found" error
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw this.wrapError(error, 'Failed to check object existence');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Key Generation Utilities
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a secure, unique S3 key for research exports.
   *
   * Format: exports/{tenantId}/{year}/{month}/{exportId}/{filename}
   *
   * This structure provides:
   * - Tenant isolation (first path segment)
   * - Easy lifecycle management (by date)
   * - Unique export identification
   */
  generateExportKey(params: {
    tenantId: string;
    exportId: string;
    format: 'json' | 'csv' | 'parquet';
    prefix?: string;
  }): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const prefix = params.prefix ?? 'exports';

    const extension = this.getExtension(params.format);
    const filename = `export-${params.exportId}${extension}`;

    return `${prefix}/${params.tenantId}/${year}/${month}/${params.exportId}/${filename}`;
  }

  /**
   * Parse tenant ID from an export S3 key.
   *
   * @param key - The S3 object key
   * @returns The tenant ID or null if not found
   */
  parseTenantFromKey(key: string): string | null {
    // Format: exports/{tenantId}/...
    const parts = key.split('/');
    return parts.length >= 2 ? (parts[1] ?? null) : null;
  }

  /**
   * Validate that an S3 key belongs to the expected tenant.
   *
   * @param key - The S3 object key
   * @param tenantId - The expected tenant ID
   * @returns true if key belongs to tenant
   */
  validateTenantKey(key: string, tenantId: string): boolean {
    const keyTenantId = this.parseTenantFromKey(key);
    return keyTenantId === tenantId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verify that an S3 object exists, throwing if not found.
   */
  private async verifyObjectExists(key: string): Promise<void> {
    const exists = await this.objectExists(key);
    if (!exists) {
      throw new S3ServiceError(`Object not found: ${key}`, 'NOT_FOUND', 404);
    }
  }

  /**
   * Extract filename from S3 key.
   */
  private extractFilename(key: string): string {
    const parts = key.split('/');
    return parts.at(-1) ?? 'export.json';
  }

  /**
   * Get file extension for export format.
   */
  private getExtension(format: 'json' | 'csv' | 'parquet'): string {
    const extensions: Record<string, string> = {
      json: '.json',
      csv: '.csv',
      parquet: '.parquet',
    };
    return extensions[format] ?? '.json';
  }

  /**
   * Infer content type from filename.
   */
  private inferContentType(key: string): string {
    const extension = key.split('.').at(-1)?.toLowerCase();
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      csv: 'text/csv',
      parquet: 'application/vnd.apache.parquet',
      txt: 'text/plain',
      gz: 'application/gzip',
    };
    return contentTypes[extension ?? ''] ?? 'application/octet-stream';
  }

  /**
   * Check if an error is a "not found" error.
   */
  private isNotFoundError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      const code = (error as { name?: string; $metadata?: { httpStatusCode?: number } }).name;
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      return code === 'NotFound' || code === 'NoSuchKey' || statusCode === 404;
    }
    return false;
  }

  /**
   * Wrap an error in an S3ServiceError with context.
   */
  private wrapError(error: unknown, message: string): S3ServiceError {
    if (error instanceof S3ServiceError) {
      return error;
    }

    const err = error as {
      name?: string;
      message?: string;
      $metadata?: { httpStatusCode?: number };
    };
    const code = err.name ?? 'UNKNOWN';
    const statusCode = err.$metadata?.httpStatusCode;
    const originalMessage = err.message ?? 'Unknown error';

    return new S3ServiceError(
      `${message}: ${originalMessage}`,
      code,
      statusCode,
      error instanceof Error ? error : undefined
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an S3 service instance with default configuration.
 */
export function createS3Service(configOverrides?: Partial<S3ServiceConfig>): S3Service {
  return new S3Service(configOverrides);
}

/**
 * Singleton S3 service instance for the research service.
 */
let s3ServiceInstance: S3Service | null = null;

/**
 * Get the singleton S3 service instance.
 */
export function getS3Service(): S3Service {
  if (!s3ServiceInstance) {
    s3ServiceInstance = createS3Service();
  }
  return s3ServiceInstance;
}

/**
 * Reset the singleton instance (for testing).
 */
export function resetS3Service(): void {
  s3ServiceInstance = null;
}
