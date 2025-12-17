/**
 * Assets API Module
 *
 * API calls for media asset management including upload, retrieval, and organization.
 */

import apiClient from './client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface Asset {
  id: string;
  tenantId: string | null;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata: AssetMetadata;
  folderId?: string;
  tags: string[];
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetMetadata {
  width?: number;
  height?: number;
  duration?: number; // For video/audio in seconds
  alt?: string;
  caption?: string;
  format?: string;
  bitrate?: number;
  [key: string]: unknown;
}

export interface AssetFolder {
  id: string;
  name: string;
  parentId?: string;
  path: string;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResult {
  asset: Asset;
  processingStatus?: 'pending' | 'processing' | 'complete' | 'failed';
}

export interface SignedUploadUrl {
  uploadUrl: string;
  assetId: string;
  expiresAt: string;
}

export interface ListAssetsParams {
  folderId?: string;
  mimeType?: string;
  search?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ListAssetsResponse {
  items: Asset[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkDeleteResult {
  deleted: number;
  failed: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSETS API
// ══════════════════════════════════════════════════════════════════════════════

const ASSETS_BASE = '/api/authoring/assets';

/**
 * List assets with optional filters
 */
export async function listAssets(params?: ListAssetsParams): Promise<ListAssetsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.folderId) searchParams.set('folderId', params.folderId);
  if (params?.mimeType) searchParams.set('mimeType', params.mimeType);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.tags?.length) searchParams.set('tags', params.tags.join(','));
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const query = searchParams.toString();
  const path = query ? `${ASSETS_BASE}?${query}` : ASSETS_BASE;

  return apiClient.get<ListAssetsResponse>(path);
}

/**
 * Get a single asset by ID
 */
export async function getAsset(id: string): Promise<Asset> {
  return apiClient.get<Asset>(`${ASSETS_BASE}/${id}`);
}

/**
 * Upload a file
 */
export async function uploadAsset(
  file: File,
  options?: {
    folderId?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  },
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  if (options?.folderId) {
    formData.append('folderId', options.folderId);
  }
  if (options?.tags?.length) {
    formData.append('tags', JSON.stringify(options.tags));
  }
  if (options?.metadata) {
    formData.append('metadata', JSON.stringify(options.metadata));
  }

  return apiClient.upload<UploadResult>(`${ASSETS_BASE}/upload`, formData, onProgress);
}

/**
 * Upload multiple files
 */
export async function uploadMultipleAssets(
  files: File[],
  options?: {
    folderId?: string;
    tags?: string[];
  },
  onProgress?: (fileIndex: number, percent: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    const result = await uploadAsset(file, options, (percent) => onProgress?.(i, percent));
    results.push(result);
  }

  return results;
}

/**
 * Upload from URL
 */
export async function uploadFromUrl(
  url: string,
  options?: {
    folderId?: string;
    filename?: string;
    tags?: string[];
  }
): Promise<UploadResult> {
  return apiClient.post<UploadResult>(`${ASSETS_BASE}/upload-url`, {
    url,
    ...options,
  });
}

/**
 * Get signed URL for direct upload (for large files)
 */
export async function getSignedUploadUrl(
  filename: string,
  mimeType: string,
  size?: number
): Promise<SignedUploadUrl> {
  return apiClient.post<SignedUploadUrl>(`${ASSETS_BASE}/signed-upload-url`, {
    filename,
    mimeType,
    size,
  });
}

/**
 * Confirm a direct upload
 */
export async function confirmUpload(assetId: string): Promise<Asset> {
  return apiClient.post<Asset>(`${ASSETS_BASE}/${assetId}/confirm-upload`);
}

/**
 * Update asset metadata
 */
export async function updateAsset(
  id: string,
  data: {
    filename?: string;
    metadata?: Partial<AssetMetadata>;
    tags?: string[];
    folderId?: string | null;
  }
): Promise<Asset> {
  return apiClient.patch<Asset>(`${ASSETS_BASE}/${id}`, data);
}

/**
 * Delete an asset
 */
export async function deleteAsset(id: string): Promise<void> {
  return apiClient.delete(`${ASSETS_BASE}/${id}`);
}

/**
 * Bulk delete assets
 */
export async function bulkDeleteAssets(ids: string[]): Promise<BulkDeleteResult> {
  return apiClient.post<BulkDeleteResult>(`${ASSETS_BASE}/bulk-delete`, { ids });
}

/**
 * Move assets to a folder
 */
export async function moveAssets(ids: string[], folderId: string | null): Promise<void> {
  return apiClient.post(`${ASSETS_BASE}/move`, { ids, folderId });
}

/**
 * Update tags for multiple assets
 */
export async function bulkUpdateTags(
  ids: string[],
  addTags?: string[],
  removeTags?: string[]
): Promise<void> {
  return apiClient.post(`${ASSETS_BASE}/bulk-tags`, { ids, addTags, removeTags });
}

// ══════════════════════════════════════════════════════════════════════════════
// FOLDERS API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * List folders
 */
export async function listFolders(parentId?: string): Promise<AssetFolder[]> {
  const path = parentId ? `${ASSETS_BASE}/folders?parentId=${parentId}` : `${ASSETS_BASE}/folders`;
  return apiClient.get<AssetFolder[]>(path);
}

/**
 * Get folder tree
 */
export async function getFolderTree(): Promise<AssetFolder[]> {
  return apiClient.get<AssetFolder[]>(`${ASSETS_BASE}/folders/tree`);
}

/**
 * Create a folder
 */
export async function createFolder(name: string, parentId?: string): Promise<AssetFolder> {
  return apiClient.post<AssetFolder>(`${ASSETS_BASE}/folders`, { name, parentId });
}

/**
 * Rename a folder
 */
export async function renameFolder(id: string, name: string): Promise<AssetFolder> {
  return apiClient.patch<AssetFolder>(`${ASSETS_BASE}/folders/${id}`, { name });
}

/**
 * Move a folder
 */
export async function moveFolder(id: string, parentId: string | null): Promise<AssetFolder> {
  return apiClient.patch<AssetFolder>(`${ASSETS_BASE}/folders/${id}`, { parentId });
}

/**
 * Delete a folder
 */
export async function deleteFolder(id: string, deleteContents = false): Promise<void> {
  const path = deleteContents
    ? `${ASSETS_BASE}/folders/${id}?deleteContents=true`
    : `${ASSETS_BASE}/folders/${id}`;
  return apiClient.delete(path);
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get file type category from MIME type
 */
export function getAssetCategory(
  mimeType: string
): 'image' | 'video' | 'audio' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('text/') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) {
    return 'document';
  }
  return 'other';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = sizes[i] ?? 'B';
  const value = Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${value} ${size}`;
}

/**
 * Check if file type is allowed for upload
 */
export function isAllowedFileType(mimeType: string, allowedTypes?: string[]): boolean {
  if (!allowedTypes || allowedTypes.length === 0) return true;

  return allowedTypes.some((allowed) => {
    if (allowed.endsWith('/*')) {
      const category = allowed.slice(0, -2);
      return mimeType.startsWith(category + '/');
    }
    return mimeType === allowed;
  });
}

/**
 * Default allowed file types for content authoring
 */
export const DEFAULT_ALLOWED_TYPES = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

/**
 * Max file size in bytes (default 100MB)
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;
