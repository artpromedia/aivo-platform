/**
 * Tenant-Scoped Storage Service
 *
 * S3-compatible storage with tenant isolation, presigned URLs,
 * and virus scanning integration.
 *
 * @module @aivo/ts-storage/storage-service
 */
import type { StorageConfig, StoredFile, UploadOptions, PresignedUrlOptions, VirusScanResult, FileCategory } from './types.js';
import type { IVirusScanner } from './virus-scanner.js';
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
    files: {
        key: string;
        size: number;
        lastModified?: Date;
    }[];
    isTruncated: boolean;
    continuationToken?: string;
}
/**
 * Tenant-scoped storage service for S3-compatible backends
 */
export declare class StorageService {
    private readonly client;
    private readonly config;
    private readonly virusScanner;
    constructor(config: StorageConfig, virusScanner?: IVirusScanner);
    /**
     * Generate a tenant-scoped S3 key
     *
     * Format: {tenantId}/{ownerType}/{ownerId}/{category}/{uuid}/{filename}
     */
    generateKey(options: UploadOptions): string;
    /**
     * Parse a tenant ID from an S3 key
     */
    parseTenantId(s3Key: string): string | null;
    /**
     * Validate that an S3 key belongs to the expected tenant
     */
    validateTenantKey(s3Key: string, tenantId: string): boolean;
    /**
     * Generate a presigned URL for uploading a file
     */
    getPresignedUploadUrl(options: UploadOptions, urlOptions?: PresignedUrlOptions): Promise<PresignedUploadResult>;
    /**
     * Generate a presigned URL for downloading a file
     */
    getPresignedDownloadUrl(s3Key: string, tenantId: string, options?: PresignedUrlOptions): Promise<PresignedDownloadResult>;
    /**
     * Upload a file directly (server-side upload)
     */
    uploadFile(content: Buffer, options: UploadOptions, skipVirusScan?: boolean): Promise<UploadResult>;
    /**
     * Download a file directly (server-side download)
     */
    downloadFile(s3Key: string, tenantId: string): Promise<Buffer>;
    /**
     * Check if a file exists
     */
    fileExists(s3Key: string, tenantId: string): Promise<boolean>;
    /**
     * Get file metadata from S3
     */
    getFileMetadata(s3Key: string, tenantId: string): Promise<{
        contentType?: string;
        contentLength?: number;
        metadata?: Record<string, string>;
        lastModified?: Date;
    }>;
    /**
     * Delete a file from S3
     */
    deleteFile(s3Key: string, tenantId: string): Promise<void>;
    /**
     * Copy a file within the same tenant
     */
    copyFile(sourceKey: string, destinationKey: string, tenantId: string): Promise<void>;
    /**
     * List files with optional filters
     */
    listFiles(options: ListFilesOptions): Promise<S3ListFilesResult>;
    /**
     * Scan an already-uploaded file for viruses
     */
    scanFile(s3Key: string, tenantId: string): Promise<VirusScanResult>;
    /**
     * Finalize an upload after client-side upload (verify and scan)
     */
    finalizeUpload(s3Key: string, tenantId: string, options: UploadOptions): Promise<UploadResult>;
    /**
     * Delete files older than the specified date
     */
    cleanupExpiredFiles(tenantId: string, category: FileCategory, olderThan: Date): Promise<number>;
    /**
     * Get total storage usage for a tenant
     */
    getTenantStorageUsage(tenantId: string): Promise<{
        totalBytes: number;
        fileCount: number;
        byCategory: Record<string, {
            bytes: number;
            count: number;
        }>;
    }>;
    private sanitizeFilename;
    private createStoredFile;
    private createPendingFile;
}
/**
 * Create a storage service from environment variables
 */
export declare function createStorageServiceFromEnv(virusScanner?: IVirusScanner): StorageService;
export type { StorageConfig, StoredFile, UploadOptions, PresignedUrlOptions } from './types.js';
//# sourceMappingURL=storage.service.d.ts.map