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
// Storage Service
export { StorageService, createStorageServiceFromEnv, } from './storage.service.js';
// Tenant Storage Helper
export { TenantStorage, createTenantStorageFromEnv, CrossTenantAccessError, } from './tenant-storage.js';
// Virus Scanner
export { ClamAVScanner, VirusTotalScanner, MockVirusScanner, createVirusScanner, } from './virus-scanner.js';
// Access Control
export { FileOperation, DEFAULT_POLICY, DEFAULT_CATEGORY_POLICIES, FileAccessControl, createAccessContext, hasRole, hasAnyRole, hasAllRoles, } from './access-control.js';
//# sourceMappingURL=index.js.map