/**
 * Type definitions for tenant-scoped file storage
 *
 * @module @aivo/ts-storage/types
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * File categories supported by the storage system.
 * Each category has specific size limits and allowed MIME types.
 */
export type FileCategory =
  | 'IEP_DOCUMENT'
  | 'HOMEWORK_IMAGE'
  | 'ASSESSMENT_AUDIO'
  | 'ASSESSMENT_VIDEO'
  | 'AVATAR_IMAGE'
  | 'EXPORTED_REPORT'
  | 'ATTACHMENT'
  | 'OTHER';

/**
 * Owner types for file ownership
 */
export type OwnerType = 'user' | 'system' | 'tenant';

/**
 * Virus scan status
 */
export type VirusScanStatus = 'PENDING' | 'SCANNING' | 'CLEAN' | 'INFECTED' | 'ERROR';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Storage service configuration
 */
export interface StorageConfig {
  /** S3 bucket name */
  bucket: string;
  /** AWS region */
  region: string;
  /** S3-compatible endpoint (MinIO, R2, DigitalOcean Spaces) */
  endpoint?: string;
  /** Force path-style URLs (required for MinIO) */
  forcePathStyle?: boolean;
  /** AWS credentials (optional - will use default credential chain if not provided) */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  /** Default presigned URL expiration in seconds */
  defaultUrlExpirationSeconds?: number;
}

/**
 * Virus scanner configuration
 */
export interface VirusScannerConfig {
  /** Scanning provider */
  provider: 'clamav' | 'virustotal' | 'mock';
  /** ClamAV host */
  clamavHost?: string;
  /** ClamAV port */
  clamavPort?: number;
  /** VirusTotal API key */
  virustotalApiKey?: string;
  /** Whether to skip scanning in development */
  skipInDev?: boolean;
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Options for requesting an upload URL
 */
export interface UploadOptions {
  /** Tenant ID for isolation */
  tenantId: string;
  /** Owner ID (user or learner who owns the file) */
  ownerId: string;
  /** Type of owner */
  ownerType?: OwnerType;
  /** File category */
  category: FileCategory;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes (for validation) */
  contentLength?: number;
  /** Optional metadata */
  metadata?: Record<string, string>;
}

/**
 * Options for presigned download URL
 */
export interface PresignedUrlOptions {
  /** URL expiration in seconds (default: 3600) */
  expiresInSeconds?: number;
  /** Content-Disposition header for download */
  responseContentDisposition?: string;
  /** Content-Type header override */
  responseContentType?: string;
}

/**
 * Result of virus scanning
 */
export interface VirusScanResult {
  /** Whether the file is clean */
  isClean: boolean;
  /** Threat name if infected */
  threatName?: string;
  /** Scan duration in milliseconds */
  scanDurationMs: number;
  /** Scanner used */
  scanner: string;
  /** Raw scanner response */
  rawResponse?: unknown;
}

// ============================================================================
// Stored File Record
// ============================================================================

/**
 * Stored file record from database
 */
export interface StoredFile {
  id: string;
  tenantId: string;
  ownerId: string;
  ownerType: OwnerType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  s3Bucket: string;
  s3Key: string;
  category: FileCategory;
  virusScanStatus: VirusScanStatus;
  virusScannedAt?: Date;
  virusScanResult?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, string>;
}

/**
 * Input for creating a stored file record
 */
export interface CreateStoredFileInput {
  tenantId: string;
  ownerId: string;
  ownerType: OwnerType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  s3Bucket: string;
  s3Key: string;
  category: FileCategory;
  metadata?: Record<string, string>;
}

/**
 * Input for updating a stored file record
 */
export interface UpdateStoredFileInput {
  virusScanStatus?: VirusScanStatus;
  virusScannedAt?: Date;
  virusScanResult?: string;
  sizeBytes?: number;
  isDeleted?: boolean;
  deletedAt?: Date;
}

// ============================================================================
// File Access
// ============================================================================

/**
 * Context for checking file access
 */
export interface FileAccessContext {
  /** User requesting access */
  userId: string;
  /** Tenant of the user */
  tenantId: string;
  /** User's roles */
  roles: string[];
  /** User's permissions */
  permissions?: string[];
  /** Learner IDs the user has guardian access to */
  guardianOfLearnerIds?: string[];
}

/**
 * File access check result
 */
export interface FileAccessResult {
  /** Whether access is granted */
  granted: boolean;
  /** Reason for denial (if denied) */
  reason?: string;
  /** Access level granted */
  level?: 'read' | 'write' | 'admin';
}

// ============================================================================
// File Listing
// ============================================================================

/**
 * Options for listing files
 */
export interface ListFilesOptions {
  /** Filter by owner ID */
  ownerId?: string;
  /** Filter by owner type */
  ownerType?: OwnerType;
  /** Filter by category */
  category?: FileCategory;
  /** Include soft-deleted files */
  includeDeleted?: boolean;
  /** Pagination cursor */
  cursor?: string;
  /** Page size */
  limit?: number;
}

/**
 * Paginated file list result
 */
export interface ListFilesResult {
  files: StoredFile[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Result of file cleanup operation
 */
export interface CleanupResult {
  /** Number of files deleted */
  deleted: number;
  /** Number of errors encountered */
  errors: number;
  /** Error details */
  errorDetails?: Array<{
    fileId: string;
    error: string;
  }>;
  /** Duration in milliseconds */
  durationMs: number;
}

// ============================================================================
// Category Configuration
// ============================================================================

/**
 * Configuration for a file category
 */
export interface FileCategoryConfig {
  /** Category name */
  category: FileCategory;
  /** Maximum file size in bytes */
  maxSizeBytes: number;
  /** Allowed MIME types */
  allowedMimeTypes: string[];
  /** Default expiration in days (null = never expires) */
  defaultExpirationDays: number | null;
  /** Whether virus scanning is required */
  requireVirusScan: boolean;
}

/**
 * Default category configurations
 */
export const FILE_CATEGORY_CONFIGS: Record<FileCategory, FileCategoryConfig> = {
  IEP_DOCUMENT: {
    category: 'IEP_DOCUMENT',
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['application/pdf'],
    defaultExpirationDays: null,
    requireVirusScan: true,
  },
  HOMEWORK_IMAGE: {
    category: 'HOMEWORK_IMAGE',
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif'],
    defaultExpirationDays: 90,
    requireVirusScan: true,
  },
  ASSESSMENT_AUDIO: {
    category: 'ASSESSMENT_AUDIO',
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/mp4'],
    defaultExpirationDays: null,
    requireVirusScan: true,
  },
  ASSESSMENT_VIDEO: {
    category: 'ASSESSMENT_VIDEO',
    maxSizeBytes: 500 * 1024 * 1024, // 500MB
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    defaultExpirationDays: null,
    requireVirusScan: true,
  },
  AVATAR_IMAGE: {
    category: 'AVATAR_IMAGE',
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    defaultExpirationDays: null,
    requireVirusScan: true,
  },
  EXPORTED_REPORT: {
    category: 'EXPORTED_REPORT',
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    allowedMimeTypes: ['application/pdf'],
    defaultExpirationDays: 30,
    requireVirusScan: false, // Server-generated
  },
  ATTACHMENT: {
    category: 'ATTACHMENT',
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'text/plain',
    ],
    defaultExpirationDays: null,
    requireVirusScan: true,
  },
  OTHER: {
    category: 'OTHER',
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    allowedMimeTypes: ['*/*'],
    defaultExpirationDays: 30,
    requireVirusScan: true,
  },
};

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate file against category configuration
 */
export function validateFileForCategory(
  category: FileCategory,
  mimeType: string,
  size?: number
): { valid: boolean; error?: string } {
  const config = FILE_CATEGORY_CONFIGS[category];

  // Check size
  if (size !== undefined && size > config.maxSizeBytes) {
    return {
      valid: false,
      error: `File size ${size} exceeds maximum ${config.maxSizeBytes} bytes for category ${category}`,
    };
  }

  // Check MIME type
  if (!config.allowedMimeTypes.includes('*/*')) {
    const normalizedMime = mimeType.toLowerCase();
    const isAllowed = config.allowedMimeTypes.some((allowed) => {
      if (allowed.endsWith('/*')) {
        return normalizedMime.startsWith(allowed.slice(0, -1));
      }
      return normalizedMime === allowed;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `MIME type ${mimeType} not allowed for category ${category}. Allowed: ${config.allowedMimeTypes.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize filename to prevent path traversal and other issues
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  let sanitized = filename.replace(/[/\\:\0]/g, '_');
  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, '');
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.slice(sanitized.lastIndexOf('.'));
    sanitized = sanitized.slice(0, 255 - ext.length) + ext;
  }
  // Fallback if empty
  if (!sanitized || sanitized === '.') {
    sanitized = 'file';
  }
  return sanitized;
}
