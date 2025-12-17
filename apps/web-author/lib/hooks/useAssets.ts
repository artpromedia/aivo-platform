/**
 * useAssets Hook
 *
 * React hook for asset management with:
 * - Asset listing and filtering
 * - File uploads with progress tracking
 * - Folder management
 * - Bulk operations
 */

'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';

import {
  listAssets,
  getAsset,
  uploadAsset,
  deleteAsset,
  updateAsset,
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  bulkDeleteAssets,
  moveAssets,
  bulkUpdateTags,
  type Asset,
  type AssetMetadata,
  type ListAssetsParams,
} from '../api/assets';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface UseAssetsOptions {
  initialParams?: ListAssetsParams;
  enabled?: boolean;
  folderId?: string | null;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  asset?: Asset;
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSETS LIST HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useAssets(options: UseAssetsOptions = {}) {
  const { initialParams = {}, enabled = true, folderId = null } = options;

  // State
  const [params, setParams] = useState<ListAssetsParams>(initialParams);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Build cache key
  const cacheKey = useMemo(() => {
    if (!enabled) return null;
    return ['assets', folderId || 'root', JSON.stringify(params)];
  }, [enabled, folderId, params]);

  // Fetch assets
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Awaited<ReturnType<typeof listAssets>>,
    Error
  >(
    cacheKey,
    () => {
      const queryParams: ListAssetsParams = { ...params };
      if (folderId) {
        queryParams.folderId = folderId;
      }
      return listAssets(queryParams);
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  // Fetch folders
  const { data: folders, mutate: mutateFolders } = useSWR(
    enabled ? ['asset-folders', folderId ?? 'root'] : null,
    () => (folderId ? listFolders(folderId) : listFolders())
  );

  // Filters
  const setFilters = useCallback((newParams: Partial<ListAssetsParams>) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
      page: 1, // Reset to first page on filter change
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setParams((prev) => ({
      ...prev,
      page: page + 1, // API uses 1-based pages
    }));
  }, []);

  // Selection
  const toggleSelect = useCallback((assetId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (data?.items) {
      setSelectedIds(new Set(data.items.map((a) => a.id)));
    }
  }, [data?.items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Actions
  const remove = useCallback(
    async (assetId: string) => {
      await deleteAsset(assetId);
      await mutate();
    },
    [mutate]
  );

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await bulkDeleteAssets(Array.from(selectedIds));
    setSelectedIds(new Set());
    await mutate();
  }, [selectedIds, mutate]);

  const move = useCallback(
    async (targetFolderId: string | null) => {
      if (selectedIds.size === 0) return;
      await moveAssets(Array.from(selectedIds), targetFolderId);
      setSelectedIds(new Set());
      await mutate();
    },
    [selectedIds, mutate]
  );

  const addTags = useCallback(
    async (tags: string[]) => {
      if (selectedIds.size === 0) return;
      await bulkUpdateTags(Array.from(selectedIds), tags);
      await mutate();
    },
    [selectedIds, mutate]
  );

  const removeTags = useCallback(
    async (tags: string[]) => {
      if (selectedIds.size === 0) return;
      await bulkUpdateTags(Array.from(selectedIds), undefined, tags);
      await mutate();
    },
    [selectedIds, mutate]
  );

  // Folder actions
  const addFolder = useCallback(
    async (name: string) => {
      const folder = await createFolder(name, folderId ?? undefined);
      await mutateFolders();
      return folder;
    },
    [folderId, mutateFolders]
  );

  const renameExistingFolder = useCallback(
    async (folderIdToRename: string, newName: string) => {
      const folder = await renameFolder(folderIdToRename, newName);
      await mutateFolders();
      return folder;
    },
    [mutateFolders]
  );

  const removeFolder = useCallback(
    async (folderIdToDelete: string) => {
      await deleteFolder(folderIdToDelete);
      await mutateFolders();
    },
    [mutateFolders]
  );

  const refresh = useCallback(async () => {
    await Promise.all([mutate(), mutateFolders()]);
  }, [mutate, mutateFolders]);

  // Computed
  const currentPage = useMemo(() => {
    const page = params.page ?? 1;
    return page - 1; // Convert to 0-based for UI
  }, [params.page]);

  const totalPages = useMemo(() => {
    if (!data) return 0;
    const pageSize = params.pageSize ?? 20;
    return Math.ceil(data.pagination.total / pageSize);
  }, [data, params.pageSize]);

  return {
    // Data
    assets: data?.items || [],
    total: data?.pagination.total || 0,
    folders: folders || [],

    // State
    isLoading,
    isValidating,
    error: error ?? null,

    // Filters
    params,
    setFilters,

    // Pagination
    currentPage,
    totalPages,
    setPage,

    // Selection
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,

    // Asset actions
    remove,
    bulkDelete,
    move,
    addTags,
    removeTags,

    // Folder actions
    addFolder,
    renameFolder: renameExistingFolder,
    removeFolder,

    // Refresh
    refresh,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE ASSET HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useAsset(assetId: string | null, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR<Awaited<ReturnType<typeof getAsset>>, Error>(
    enabled && assetId ? ['asset', assetId] : null,
    ([, id]) => getAsset(id as string)
  );

  const updateMetadata = useCallback(
    async (metadata: Partial<AssetMetadata>) => {
      if (!assetId) throw new Error('No asset ID');
      const updated = await updateAsset(assetId, { metadata });
      await mutate(updated, false);
      return updated;
    },
    [assetId, mutate]
  );

  const remove = useCallback(async () => {
    if (!assetId) throw new Error('No asset ID');
    await deleteAsset(assetId);
    // Invalidate list caches
    void globalMutate((key) => Array.isArray(key) && key[0] === 'assets', undefined, {
      revalidate: true,
    });
  }, [assetId]);

  return {
    asset: data,
    isLoading,
    error: error ?? null,
    updateMetadata,
    remove,
    refresh: mutate,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// UPLOAD HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useAssetUpload(options: { folderId?: string | null } = {}) {
  const { folderId = null } = options;

  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Generate unique file ID
  const generateFileId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }, []);

  // Upload single file
  const upload = useCallback(
    async (file: File, metadata?: Partial<AssetMetadata>): Promise<Asset> => {
      const fileId = generateFileId();

      setUploads((prev) => {
        const next = new Map(prev);
        next.set(fileId, {
          fileId,
          fileName: file.name,
          progress: 0,
          status: 'pending',
        });
        return next;
      });

      setIsUploading(true);

      try {
        const uploadOptions: {
          folderId?: string;
          tags?: string[];
          metadata?: Record<string, unknown>;
        } = {};
        if (folderId) {
          uploadOptions.folderId = folderId;
        }
        if (metadata) {
          uploadOptions.metadata = metadata as Record<string, unknown>;
        }

        const result = await uploadAsset(file, uploadOptions, (progress) => {
          setUploads((prev) => {
            const next = new Map(prev);
            next.set(fileId, {
              fileId,
              fileName: file.name,
              progress,
              status: 'uploading',
            });
            return next;
          });
        });

        setUploads((prev) => {
          const next = new Map(prev);
          next.set(fileId, {
            fileId,
            fileName: file.name,
            progress: 100,
            status: 'complete',
            asset: result.asset,
          });
          return next;
        });

        // Invalidate asset list
        void globalMutate((key) => Array.isArray(key) && key[0] === 'assets', undefined, {
          revalidate: true,
        });

        return result.asset;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Upload failed';

        setUploads((prev) => {
          const next = new Map(prev);
          next.set(fileId, {
            fileId,
            fileName: file.name,
            progress: 0,
            status: 'error',
            error,
          });
          return next;
        });

        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [folderId, generateFileId]
  );

  // Upload multiple files
  const uploadMultiple = useCallback(
    async (files: File[]): Promise<Asset[]> => {
      setIsUploading(true);

      const results: Asset[] = [];
      const errors: { file: string; error: string }[] = [];

      // Initialize all uploads as pending
      const fileIds: string[] = [];
      for (const file of files) {
        const fileId = generateFileId();
        fileIds.push(fileId);

        setUploads((prev) => {
          const next = new Map(prev);
          next.set(fileId, {
            fileId,
            fileName: file.name,
            progress: 0,
            status: 'pending',
          });
          return next;
        });
      }

      // Build upload options
      const uploadOptions: { folderId?: string; tags?: string[] } = {};
      if (folderId) {
        uploadOptions.folderId = folderId;
      }

      // Upload sequentially to avoid overwhelming the server
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = fileIds[i];

        // Skip if file or fileId is undefined (shouldn't happen but TypeScript requires check)
        if (!file || !fileId) continue;

        try {
          setUploads((prev) => {
            const next = new Map(prev);
            next.set(fileId, {
              fileId,
              fileName: file.name,
              progress: 0,
              status: 'uploading',
            });
            return next;
          });

          const result = await uploadAsset(file, uploadOptions, (progress) => {
            setUploads((prev) => {
              const next = new Map(prev);
              next.set(fileId, {
                fileId,
                fileName: file.name,
                progress,
                status: 'uploading',
              });
              return next;
            });
          });

          setUploads((prev) => {
            const next = new Map(prev);
            next.set(fileId, {
              fileId,
              fileName: file.name,
              progress: 100,
              status: 'complete',
              asset: result.asset,
            });
            return next;
          });

          results.push(result.asset);
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Upload failed';
          errors.push({ file: file.name, error });

          setUploads((prev) => {
            const next = new Map(prev);
            next.set(fileId, {
              fileId,
              fileName: file.name,
              progress: 0,
              status: 'error',
              error,
            });
            return next;
          });
        }
      }

      // Invalidate asset list
      void globalMutate((key) => Array.isArray(key) && key[0] === 'assets', undefined, {
        revalidate: true,
      });

      setIsUploading(false);

      if (errors.length > 0 && results.length === 0) {
        throw new Error(`All uploads failed: ${errors.map((e) => e.file).join(', ')}`);
      }

      return results;
    },
    [folderId, generateFileId]
  );

  // Cancel upload
  const cancelUpload = useCallback((fileId: string) => {
    const controller = abortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(fileId);
    }

    setUploads((prev) => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
  }, []);

  // Clear completed/errored uploads
  const clearCompleted = useCallback(() => {
    setUploads((prev) => {
      const next = new Map(prev);
      prev.forEach((upload, id) => {
        if (upload.status === 'complete' || upload.status === 'error') {
          next.delete(id);
        }
      });
      return next;
    });
  }, []);

  // Clear all uploads
  const clearAll = useCallback(() => {
    // Abort any in-progress uploads
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    setUploads(new Map());
  }, []);

  // Computed
  const uploadList = useMemo(() => Array.from(uploads.values()), [uploads]);

  const completedCount = useMemo(
    () => uploadList.filter((u) => u.status === 'complete').length,
    [uploadList]
  );

  const errorCount = useMemo(
    () => uploadList.filter((u) => u.status === 'error').length,
    [uploadList]
  );

  const totalProgress = useMemo(() => {
    if (uploadList.length === 0) return 0;
    const sum = uploadList.reduce((acc, u) => acc + u.progress, 0);
    return Math.round(sum / uploadList.length);
  }, [uploadList]);

  return {
    // State
    uploads: uploadList,
    isUploading,
    completedCount,
    errorCount,
    totalProgress,

    // Actions
    upload,
    uploadMultiple,
    cancelUpload,
    clearCompleted,
    clearAll,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export type { Asset, AssetFolder, AssetMetadata, ListAssetsParams } from '../api/assets';
