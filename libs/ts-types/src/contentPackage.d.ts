/**
 * Content Package & Delta Update Types
 *
 * Content packages are bundles of Learning Object versions optimized for:
 * - Bulk preloading onto devices (school labs, iPads)
 * - Efficient delta updates (only changed LOs)
 * - Morning connect windows for school deployment
 *
 * Package Lifecycle:
 * 1. School admin requests package for tenant/grades/subjects/date range
 * 2. Backend builds manifest with LO versions matching criteria
 * 3. Manifest + content URLs stored in S3
 * 4. Client downloads manifest, then content items with checksum validation
 * 5. Delta updates fetch only items changed since last sync
 */
import type { LearningObjectGradeBand, LearningObjectSubject } from './learningObject.js';
/** Package generation status */
export type ContentPackageStatus = 'PENDING' | 'BUILDING' | 'READY' | 'EXPIRED' | 'FAILED';
/** Content locale for internationalization */
export type ContentLocale = 'en' | 'es' | 'fr' | 'zh' | 'ar';
/**
 * Single item in a content package manifest.
 * Represents one Learning Object Version with its content location.
 */
export interface ManifestItem {
    /** LO version UUID */
    loVersionId: string;
    /** Parent LO UUID */
    learningObjectId: string;
    /** Cache key format: "LO_VERSION:{loVersionId}:locale:{locale}" */
    contentKey: string;
    /** SHA-256 checksum for integrity validation */
    checksum: string;
    /** Pre-signed URL for content download */
    contentUrl: string;
    /** Content size in bytes (for progress tracking) */
    sizeBytes: number;
    /** Subject for client-side filtering */
    subject: LearningObjectSubject;
    /** Grade band for client-side filtering */
    gradeBand: LearningObjectGradeBand;
    /** Version number within the LO */
    versionNumber: number;
    /** Content locale */
    locale: ContentLocale;
    /** When this version was published */
    publishedAt: string;
    /** When this version was last updated */
    updatedAt: string;
}
/**
 * Content package manifest - the index of all items in a package.
 * Downloaded first by clients to know what content to fetch.
 */
export interface ContentPackageManifest {
    /** Unique package identifier */
    packageId: string;
    /** Manifest schema version for backward compatibility */
    manifestVersion: string;
    /** Tenant this package belongs to */
    tenantId: string;
    /** Grade bands included in this package */
    gradeBands: LearningObjectGradeBand[];
    /** Subjects included in this package */
    subjects: LearningObjectSubject[];
    /** Locales included in this package */
    locales: ContentLocale[];
    /** When this manifest was generated */
    generatedAt: string;
    /** Manifest expiration time (pre-signed URLs expire) */
    expiresAt: string;
    /** Total count of items in manifest */
    totalItems: number;
    /** Total size of all content in bytes */
    totalSizeBytes: number;
    /** Individual content items */
    items: ManifestItem[];
}
/**
 * Content package metadata (stored in DB, excludes full item list).
 */
export interface ContentPackage {
    /** Unique package identifier */
    id: string;
    /** Tenant this package belongs to */
    tenantId: string;
    /** Grade bands included */
    gradeBands: LearningObjectGradeBand[];
    /** Subjects included */
    subjects: LearningObjectSubject[];
    /** Locales included */
    locales: ContentLocale[];
    /** Current package status */
    status: ContentPackageStatus;
    /** URL to download the manifest JSON */
    manifestUrl: string | null;
    /** Total count of items */
    totalItems: number;
    /** Total size in bytes */
    totalSizeBytes: number;
    /** When package was requested */
    requestedAt: string;
    /** When package finished building */
    completedAt: string | null;
    /** When package expires */
    expiresAt: string | null;
    /** User who requested the package */
    requestedByUserId: string;
    /** Error message if build failed */
    errorMessage: string | null;
}
/**
 * Delta update item - represents a change since last sync.
 */
export interface DeltaItem {
    /** LO version UUID */
    loVersionId: string;
    /** Parent LO UUID */
    learningObjectId: string;
    /** Cache key */
    contentKey: string;
    /** Change type */
    changeType: 'ADDED' | 'UPDATED' | 'REMOVED';
    /** SHA-256 checksum (null if removed) */
    checksum: string | null;
    /** Pre-signed URL (null if removed) */
    contentUrl: string | null;
    /** Size in bytes (null if removed) */
    sizeBytes: number | null;
    /** Subject */
    subject: LearningObjectSubject;
    /** Grade band */
    gradeBand: LearningObjectGradeBand;
    /** Version number */
    versionNumber: number;
    /** Locale */
    locale: ContentLocale;
    /** When this change occurred */
    changedAt: string;
}
/**
 * Delta update response - changes since a given timestamp.
 */
export interface DeltaUpdateResponse {
    /** Tenant ID */
    tenantId: string;
    /** Timestamp used as baseline (from request) */
    sinceTimestamp: string;
    /** Current server timestamp (use for next delta request) */
    currentTimestamp: string;
    /** Whether there are more changes beyond this batch */
    hasMore: boolean;
    /** Cursor for pagination if hasMore is true */
    nextCursor: string | null;
    /** Total count of changes */
    totalChanges: number;
    /** Size of all additions/updates in bytes */
    totalSizeBytes: number;
    /** Individual change items */
    items: DeltaItem[];
}
/**
 * Request to create a new content package.
 */
export interface CreateContentPackageRequest {
    /** Tenant ID */
    tenantId: string;
    /** Grade bands to include */
    gradeBands: LearningObjectGradeBand[];
    /** Subjects to include */
    subjects: LearningObjectSubject[];
    /** Locales to include (defaults to ['en']) */
    locales?: ContentLocale[];
    /** Content published/updated since this date (optional filter) */
    updatedSince?: string;
    /** Pre-signed URL expiration in hours (default: 24, max: 168) */
    urlExpirationHours?: number;
}
/**
 * Response from package creation (async operation).
 */
export interface CreateContentPackageResponse {
    /** Package ID for status polling */
    packageId: string;
    /** Current status */
    status: ContentPackageStatus;
    /** Estimated completion time */
    estimatedCompletionAt: string | null;
    /** URL to poll for status updates */
    statusUrl: string;
}
/**
 * Request for delta updates.
 */
export interface GetDeltaUpdatesRequest {
    /** Tenant ID */
    tenantId: string;
    /** Grade bands to include */
    gradeBands: LearningObjectGradeBand[];
    /** Subjects to include */
    subjects: LearningObjectSubject[];
    /** Locales to include (defaults to ['en']) */
    locales?: ContentLocale[];
    /** Get changes since this timestamp */
    sinceTimestamp: string;
    /** Max items per response (default: 100, max: 1000) */
    limit?: number;
    /** Pagination cursor from previous response */
    cursor?: string;
}
/**
 * Package status response.
 */
export interface ContentPackageStatusResponse {
    /** Package metadata */
    package: ContentPackage;
    /** Download URL for manifest (only when READY) */
    manifestDownloadUrl: string | null;
    /** Direct download URL for packaged content (ZIP) */
    bundleDownloadUrl: string | null;
}
/**
 * Client-side sync checkpoint for tracking delta updates.
 */
export interface SyncCheckpoint {
    /** Tenant ID */
    tenantId: string;
    /** Grade bands in sync scope */
    gradeBands: LearningObjectGradeBand[];
    /** Subjects in sync scope */
    subjects: LearningObjectSubject[];
    /** Locales in sync scope */
    locales: ContentLocale[];
    /** Last successful sync timestamp */
    lastSyncTimestamp: string;
    /** Total items currently cached */
    cachedItemCount: number;
    /** Total cache size in bytes */
    cachedSizeBytes: number;
}
/**
 * Preload configuration for school deployment.
 */
export interface PreloadConfiguration {
    /** Whether preloading is enabled */
    enabled: boolean;
    /** Grade bands to preload */
    gradeBands: LearningObjectGradeBand[];
    /** Subjects to preload */
    subjects: LearningObjectSubject[];
    /** Locales to preload */
    locales: ContentLocale[];
    /** Preferred sync window start time (24h format, e.g., "06:00") */
    syncWindowStart: string;
    /** Preferred sync window end time (24h format, e.g., "08:00") */
    syncWindowEnd: string;
    /** Max storage allocation for preloaded content (bytes) */
    maxStorageBytes: number;
    /** WiFi-only downloads */
    wifiOnly: boolean;
    /** Auto-update when new content available */
    autoUpdate: boolean;
}
//# sourceMappingURL=contentPackage.d.ts.map