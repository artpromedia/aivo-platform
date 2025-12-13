/**
 * Tenant-Scoped Storage Service
 *
 * S3-compatible storage with tenant isolation, presigned URLs,
 * and virus scanning integration.
 *
 * @module @aivo/ts-storage/storage-service
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import type {
  StorageConfig,
  StoredFile,
  UploadOptions,
  PresignedUrlOptions,
  VirusScanResult,
  FileCategory,
  VirusScanStatus,
} from './types.js';
import type { IVirusScanner } from './virus-scanner.js';

// ============================================================================
// Storage Service Types
// ============================================================================

/**
 * Result of a presigned URL generation
 */
export interface PresignedUploadResult {
  /** The presigned URL for uploading */
  uploadUrl: string;
  /** The S3 key where the file will be stored */
  s3Key: string;
  /** Expiration time of the URL */
  expiresAt: Date;
  /** Fields to include in the upload (for POST) */
  fields?: Record<string, string>;
}

/**
 * Result of a presigned download URL generation
 */
export interface PresignedDownloadResult {
  /** The presigned URL for downloading */
  downloadUrl: string;
  /** Expiration time of the URL */
  expiresAt: Date;
}

/**
 * Upload result after file is stored
 */
export interface UploadResult {
  /** The stored file record */
  file: StoredFile;
  /** Whether virus scan passed */
  scanPassed: boolean;
  /** Virus scan result details */
  scanResult?: VirusScanResult;
}

/**
 * Options for listing files
 */
export interface ListFilesOptions {
  tenantId: string;
  ownerId?: string;
  category?: FileCategory;
  prefix?: string;
  maxResults?: number;
  continuationToken?: string | undefined;
}

/**
 * Result of listing files (raw S3 structure)
 */
export interface S3ListFilesResult {
  files: { key: string; size: number; lastModified?: Date }[];
  isTruncated: boolean;
  continuationToken?: string;
}

// ============================================================================
// Storage Service
// ============================================================================

/**
 * Tenant-scoped storage service for S3-compatible backends
 */
export class StorageService {
  private readonly client: S3Client;
  private readonly config: StorageConfig;
  private readonly virusScanner: IVirusScanner | undefined;

  constructor(config: StorageConfig, virusScanner?: IVirusScanner) {
    this.config = config;
    this.virusScanner = virusScanner;

    // Build S3 client config without undefined optional properties
    const s3Config: ConstructorParameters<typeof S3Client>[0] = {
      region: config.region,
      forcePathStyle: config.forcePathStyle ?? false,
    };
    if (config.endpoint) {
      s3Config.endpoint = config.endpoint;
    }
    if (config.credentials) {
      s3Config.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
      };
    }

    // Initialize S3 client
    this.client = new S3Client(s3Config);
  }

  // --------------------------------------------------------------------------
  // Key Generation
  // --------------------------------------------------------------------------

  /**
   * Generate a tenant-scoped S3 key
   *
   * Format: {tenantId}/{ownerType}/{ownerId}/{category}/{uuid}/{filename}
   */
  generateKey(options: UploadOptions): string {
    const fileId = randomUUID();
    const sanitizedFilename = this.sanitizeFilename(options.filename);
    const ownerType = options.ownerType ?? 'user';

    return [
      options.tenantId,
      ownerType,
      options.ownerId,
      options.category,
      fileId,
      sanitizedFilename,
    ].join('/');
  }

  /**
   * Parse a tenant ID from an S3 key
   */
  parseTenantId(s3Key: string): string | null {
    const parts = s3Key.split('/');
    return parts[0] ?? null;
  }

  /**
   * Validate that an S3 key belongs to the expected tenant
   */
  validateTenantKey(s3Key: string, tenantId: string): boolean {
    const keyTenantId = this.parseTenantId(s3Key);
    return keyTenantId === tenantId;
  }

  // --------------------------------------------------------------------------
  // Presigned URLs
  // --------------------------------------------------------------------------

  /**
   * Generate a presigned URL for uploading a file
   */
  async getPresignedUploadUrl(
    options: UploadOptions,
    urlOptions?: PresignedUrlOptions
  ): Promise<PresignedUploadResult> {
    const s3Key = this.generateKey(options);
    const expiresIn = urlOptions?.expiresInSeconds ?? 3600; // Default 1 hour

    const metadata: Record<string, string> = {
      tenantId: options.tenantId,
      ownerId: options.ownerId,
      ownerType: options.ownerType ?? 'user',
      category: options.category,
      originalFilename: options.filename,
      ...options.metadata,
    };

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: s3Key,
      ContentType: options.mimeType,
      ContentLength: options.contentLength,
      Metadata: metadata,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      uploadUrl,
      s3Key,
      expiresAt,
    };
  }

  /**
   * Generate a presigned URL for downloading a file
   */
  async getPresignedDownloadUrl(
    s3Key: string,
    tenantId: string,
    options?: PresignedUrlOptions
  ): Promise<PresignedDownloadResult> {
    // Validate tenant isolation
    if (!this.validateTenantKey(s3Key, tenantId)) {
      throw new Error('Cross-tenant file access is not allowed');
    }

    const expiresIn = options?.expiresInSeconds ?? 3600;

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: s3Key,
      ResponseContentDisposition: options?.responseContentDisposition,
    });

    const downloadUrl = await getSignedUrl(this.client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      downloadUrl,
      expiresAt,
    };
  }

  // --------------------------------------------------------------------------
  // Direct Upload/Download
  // --------------------------------------------------------------------------

  /**
   * Upload a file directly (server-side upload)
   */
  async uploadFile(
    content: Buffer,
    options: UploadOptions,
    skipVirusScan = false
  ): Promise<UploadResult> {
    // Run virus scan if configured and not skipped
    let scanResult: VirusScanResult | undefined;
    if (this.virusScanner && !skipVirusScan) {
      scanResult = await this.virusScanner.scanBuffer(content, options.filename);
      if (!scanResult.isClean) {
        return {
          file: this.createPendingFile(options, scanResult),
          scanPassed: false,
          scanResult,
        };
      }
    }

    const s3Key = this.generateKey(options);

    // Upload to S3
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: s3Key,
        Body: content,
        ContentType: options.mimeType,
        ContentLength: content.length,
        Metadata: {
          tenantId: options.tenantId,
          ownerId: options.ownerId,
          ownerType: options.ownerType ?? 'user',
          category: options.category,
          originalFilename: options.filename,
          ...(options.metadata ?? {}),
        },
      })
    );

    const file = this.createStoredFile(s3Key, content.length, options, scanResult);

    const result: UploadResult = {
      file,
      scanPassed: true,
    };
    if (scanResult) {
      result.scanResult = scanResult;
    }
    return result;
  }

  /**
   * Download a file directly (server-side download)
   */
  async downloadFile(s3Key: string, tenantId: string): Promise<Buffer> {
    // Validate tenant isolation
    if (!this.validateTenantKey(s3Key, tenantId)) {
      throw new Error('Cross-tenant file access is not allowed');
    }

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: s3Key,
      })
    );

    if (!response.Body) {
      throw new Error('File not found or empty');
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  // --------------------------------------------------------------------------
  // File Operations
  // --------------------------------------------------------------------------

  /**
   * Check if a file exists
   */
  async fileExists(s3Key: string, tenantId: string): Promise<boolean> {
    if (!this.validateTenantKey(s3Key, tenantId)) {
      return false;
    }

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: s3Key,
        })
      );
      return true;
    } catch (error) {
      if ((error as Error).name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(
    s3Key: string,
    tenantId: string
  ): Promise<{
    contentType?: string;
    contentLength?: number;
    metadata?: Record<string, string>;
    lastModified?: Date;
  }> {
    if (!this.validateTenantKey(s3Key, tenantId)) {
      throw new Error('Cross-tenant file access is not allowed');
    }

    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: s3Key,
      })
    );

    const result: {
      contentType?: string;
      contentLength?: number;
      metadata?: Record<string, string>;
      lastModified?: Date;
    } = {};
    if (response.ContentType) {
      result.contentType = response.ContentType;
    }
    if (response.ContentLength !== undefined) {
      result.contentLength = response.ContentLength;
    }
    if (response.Metadata) {
      result.metadata = response.Metadata;
    }
    if (response.LastModified) {
      result.lastModified = response.LastModified;
    }
    return result;
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(s3Key: string, tenantId: string): Promise<void> {
    if (!this.validateTenantKey(s3Key, tenantId)) {
      throw new Error('Cross-tenant file access is not allowed');
    }

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: s3Key,
      })
    );
  }

  /**
   * Copy a file within the same tenant
   */
  async copyFile(
    sourceKey: string,
    destinationKey: string,
    tenantId: string
  ): Promise<void> {
    // Validate both keys belong to tenant
    if (!this.validateTenantKey(sourceKey, tenantId)) {
      throw new Error('Source file cross-tenant access is not allowed');
    }
    if (!this.validateTenantKey(destinationKey, tenantId)) {
      throw new Error('Destination must be within same tenant');
    }

    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${sourceKey}`,
        Key: destinationKey,
      })
    );
  }

  /**
   * List files with optional filters
   */
  async listFiles(options: ListFilesOptions): Promise<S3ListFilesResult> {
    // Build prefix for tenant-scoped listing
    const prefixParts = [options.tenantId];

    if (options.ownerId) {
      prefixParts.push('user', options.ownerId);
    }
    if (options.category) {
      prefixParts.push(options.category);
    }
    if (options.prefix) {
      prefixParts.push(options.prefix);
    }

    const prefix = prefixParts.join('/') + '/';

    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: options.maxResults ?? 100,
        ContinuationToken: options.continuationToken,
      })
    );

    const contents = response.Contents ?? [];
    const result: S3ListFilesResult = {
      files: contents.map((obj) => {
        const file: { key: string; size: number; lastModified?: Date } = {
          key: obj.Key ?? '',
          size: obj.Size ?? 0,
        };
        if (obj.LastModified) {
          file.lastModified = obj.LastModified;
        }
        return file;
      }),
      isTruncated: response.IsTruncated ?? false,
    };
    if (response.NextContinuationToken) {
      result.continuationToken = response.NextContinuationToken;
    }
    return result;
  }

  // --------------------------------------------------------------------------
  // Virus Scanning
  // --------------------------------------------------------------------------

  /**
   * Scan an already-uploaded file for viruses
   */
  async scanFile(s3Key: string, tenantId: string): Promise<VirusScanResult> {
    if (!this.virusScanner) {
      throw new Error('Virus scanner not configured');
    }

    const content = await this.downloadFile(s3Key, tenantId);
    const filename = s3Key.split('/').pop() ?? 'unknown';

    return this.virusScanner.scanBuffer(content, filename);
  }

  /**
   * Finalize an upload after client-side upload (verify and scan)
   */
  async finalizeUpload(
    s3Key: string,
    tenantId: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    // Verify file exists and get metadata
    const metadata = await this.getFileMetadata(s3Key, tenantId);

    // Run virus scan if configured
    let scanResult: VirusScanResult | undefined;
    if (this.virusScanner) {
      scanResult = await this.scanFile(s3Key, tenantId);

      if (!scanResult.isClean) {
        // Delete infected file
        await this.deleteFile(s3Key, tenantId);

        return {
          file: this.createPendingFile(options, scanResult),
          scanPassed: false,
          scanResult,
        };
      }
    }

    const file = this.createStoredFile(
      s3Key,
      metadata.contentLength ?? 0,
      options,
      scanResult
    );

    const result: UploadResult = {
      file,
      scanPassed: true,
    };
    if (scanResult) {
      result.scanResult = scanResult;
    }
    return result;
  }

  // --------------------------------------------------------------------------
  // Lifecycle Management
  // --------------------------------------------------------------------------

  /**
   * Delete files older than the specified date
   */
  async cleanupExpiredFiles(
    tenantId: string,
    category: FileCategory,
    olderThan: Date
  ): Promise<number> {
    let deletedCount = 0;
    let continuationToken: string | undefined;

    do {
      const result = await this.listFiles({
        tenantId,
        category,
        continuationToken,
        maxResults: 1000,
      });

      for (const file of result.files) {
        if (file.lastModified && file.lastModified < olderThan) {
          await this.deleteFile(file.key, tenantId);
          deletedCount++;
        }
      }

      continuationToken = result.continuationToken;
    } while (continuationToken);

    return deletedCount;
  }

  /**
   * Get total storage usage for a tenant
   */
  async getTenantStorageUsage(tenantId: string): Promise<{
    totalBytes: number;
    fileCount: number;
    byCategory: Record<string, { bytes: number; count: number }>;
  }> {
    let totalBytes = 0;
    let fileCount = 0;
    const byCategory: Record<string, { bytes: number; count: number }> = {};
    let continuationToken: string | undefined;

    do {
      const result = await this.listFiles({
        tenantId,
        continuationToken,
        maxResults: 1000,
      });

      for (const file of result.files) {
        totalBytes += file.size;
        fileCount++;

        // Extract category from key
        const parts = file.key.split('/');
        const category = parts[3] ?? 'UNKNOWN';

        byCategory[category] ??= { bytes: 0, count: 0 };
        byCategory[category].bytes += file.size;
        byCategory[category].count++;
      }

      continuationToken = result.continuationToken;
    } while (continuationToken);

    return { totalBytes, fileCount, byCategory };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private sanitizeFilename(filename: string): string {
    // Remove path separators and special characters
    return filename
      .replaceAll(/[/\\]/g, '_')
      .replaceAll(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255);
  }

  private createStoredFile(
    s3Key: string,
    size: number,
    options: UploadOptions,
    scanResult?: VirusScanResult
  ): StoredFile {
    const now = new Date();
    const parts = s3Key.split('/');
    const fileId = parts[4] ?? randomUUID();

    let virusScanStatus: VirusScanStatus = 'PENDING';
    if (scanResult) {
      virusScanStatus = scanResult.isClean ? 'CLEAN' : 'INFECTED';
    }

    const file: StoredFile = {
      id: fileId,
      tenantId: options.tenantId,
      ownerId: options.ownerId,
      ownerType: options.ownerType ?? 'user',
      category: options.category,
      filename: options.filename,
      mimeType: options.mimeType,
      sizeBytes: size,
      s3Bucket: this.config.bucket,
      s3Key,
      virusScanStatus,
      isDeleted: false,
      metadata: options.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    if (scanResult) {
      file.virusScannedAt = now;
      file.virusScanResult = JSON.stringify(scanResult);
    }

    return file;
  }

  private createPendingFile(
    options: UploadOptions,
    scanResult: VirusScanResult
  ): StoredFile {
    const now = new Date();

    return {
      id: randomUUID(),
      tenantId: options.tenantId,
      ownerId: options.ownerId,
      ownerType: options.ownerType ?? 'user',
      category: options.category,
      filename: options.filename,
      mimeType: options.mimeType,
      sizeBytes: 0,
      s3Bucket: this.config.bucket,
      s3Key: '',
      virusScanStatus: 'INFECTED',
      virusScannedAt: now,
      virusScanResult: JSON.stringify(scanResult),
      isDeleted: true,
      metadata: options.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a storage service from environment variables
 */
export function createStorageServiceFromEnv(virusScanner?: IVirusScanner): StorageService {
  const config: StorageConfig = {
    bucket: process.env.S3_BUCKET ?? 'aivo-files',
    region: process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  };

  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
  }

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  return new StorageService(config, virusScanner);
}

// ============================================================================
// Exports
// ============================================================================

export type { StorageConfig, StoredFile, UploadOptions, PresignedUrlOptions } from './types.js';
