/**
 * @aivo/ts-storage
 *
 * Tenant-scoped file storage library for the AIVO learning platform.
 *
 * Features:
 * - S3-compatible storage with tenant isolation
 * - Presigned URLs for secure client-side uploads/downloads
 * - Virus scanning integration (ClamAV, VirusTotal)
 * - Role-based access control for files
 *
 * @example
 * ```typescript
 * import {
 *   StorageService,
 *   createVirusScanner,
 *   FileAccessControl,
 * } from '@aivo/ts-storage';
 *
 * // Create scanner
 * const scanner = createVirusScanner({ provider: 'clamav' });
 *
 * // Create storage service
 * const storage = new StorageService({
 *   bucket: 'my-bucket',
 *   region: 'us-east-1',
 * }, scanner);
 *
 * // Create access control
 * const accessControl = new FileAccessControl();
 * ```
 *
 * @module @aivo/ts-storage
 */
export type { FileCategory, StoredFile, StorageConfig, UploadOptions, PresignedUrlOptions, VirusScanResult, VirusScannerConfig, FileAccessContext, CreateStoredFileInput, VirusScanStatus, } from './types.js';
export { StorageService, createStorageServiceFromEnv, type PresignedUploadResult, type PresignedDownloadResult, type UploadResult, type ListFilesOptions, type S3ListFilesResult, } from './storage.service.js';
export { TenantStorage, createTenantStorageFromEnv, CrossTenantAccessError, type TenantStorageContext, type TenantUploadOptions, type TenantDownloadOptions, type PathValidationResult, } from './tenant-storage.js';
export { type IVirusScanner, ClamAVScanner, VirusTotalScanner, MockVirusScanner, createVirusScanner, } from './virus-scanner.js';
export { FileOperation, type AccessCheckResult, type CategoryPolicy, type AccessControlConfig, DEFAULT_POLICY, DEFAULT_CATEGORY_POLICIES, FileAccessControl, createAccessContext, hasRole, hasAnyRole, hasAllRoles, } from './access-control.js';
//# sourceMappingURL=index.d.ts.map