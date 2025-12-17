/**
 * useContent Hook
 *
 * React hook for content CRUD operations with:
 * - Content listing and filtering
 * - Content creation, update, and deletion
 * - Version management
 * - Optimistic updates
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';

import {
  listContent,
  getContent,
  createContent,
  updateContent,
  deleteContent,
  listVersions,
  getVersion,
  updateVersion,
  createNewVersion,
  submitForReview,
  approveVersion,
  rejectVersion,
  publishVersion,
  retireVersion,
  setVersionSkills,
} from '../api/content';
import type { ListContentParams, CreateContentRequest, UpdateVersionRequest } from '../api/content';
import type { LearningObject, LearningObjectVersion } from '../types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface UseContentListOptions {
  initialParams?: ListContentParams;
  enabled?: boolean;
  revalidateOnFocus?: boolean;
}

export interface UseContentDetailOptions {
  enabled?: boolean;
  includeVersions?: boolean;
}

export interface ContentListState {
  items: LearningObject[];
  total: number;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | null;
}

export interface ContentDetailState {
  content: LearningObject | null;
  versions: LearningObjectVersion[];
  currentVersion: LearningObjectVersion | null;
  isLoading: boolean;
  error: Error | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// LIST HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useContentList(options: UseContentListOptions = {}) {
  const { initialParams = {}, enabled = true, revalidateOnFocus = true } = options;

  // Filters state
  const [params, setParams] = useState<ListContentParams>(initialParams);

  // Build cache key from params
  const cacheKey = useMemo(() => {
    if (!enabled) return null;
    return ['content-list', JSON.stringify(params)];
  }, [enabled, params]);

  // Fetch data
  const {
    data,
    error: swrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<Awaited<ReturnType<typeof listContent>>, Error>(cacheKey, () => listContent(params), {
    revalidateOnFocus,
    keepPreviousData: true,
  });
  const error = swrError;

  // Update filters
  const setFilters = useCallback((newParams: Partial<ListContentParams>) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
      page: newParams.page ?? 1, // Reset pagination on filter change
    }));
  }, []);

  // Pagination
  const setPage = useCallback((page: number) => {
    setParams((prev) => ({
      ...prev,
      page: page + 1, // API uses 1-based pages
    }));
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    return mutate();
  }, [mutate]);

  // Computed
  const currentPage = useMemo(() => {
    const page = params.page ?? 1;
    return page - 1; // Convert to 0-based for UI
  }, [params.page]);

  const totalPages = useMemo(() => {
    if (!data) return 0;
    return data.pagination.totalPages;
  }, [data]);

  return {
    // Data
    items: data?.data ?? [],
    total: data?.pagination.total ?? 0,

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

    // Actions
    refresh,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// DETAIL HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useContent(contentId: string | null, options: UseContentDetailOptions = {}) {
  const { enabled = true, includeVersions = true } = options;

  // Content data
  const {
    data: content,
    error: contentError,
    isLoading: contentLoading,
    mutate: mutateContent,
  } = useSWR<Awaited<ReturnType<typeof getContent>>, Error>(
    enabled && contentId ? ['content', contentId] : null,
    ([, id]) => getContent(id as string)
  );

  // Versions data
  const {
    data: versions,
    error: versionsError,
    isLoading: versionsLoading,
    mutate: mutateVersions,
  } = useSWR<Awaited<ReturnType<typeof listVersions>>, Error>(
    enabled && contentId && includeVersions ? ['content-versions', contentId] : null,
    ([, id]) => listVersions(id as string)
  );

  // Current version state
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);

  // Selected version data
  const {
    data: selectedVersion,
    error: versionError,
    isLoading: versionLoading,
    mutate: mutateSelectedVersion,
  } = useSWR<Awaited<ReturnType<typeof getVersion>>, Error>(
    enabled && contentId && selectedVersionNumber
      ? ['version', contentId, selectedVersionNumber]
      : null,
    ([, id, versionNum]) => getVersion(id as string, versionNum as number)
  );

  // Actions
  const selectVersion = useCallback((versionNumber: number) => {
    setSelectedVersionNumber(versionNumber);
  }, []);

  const update = useCallback(
    async (data: Partial<LearningObject>) => {
      if (!contentId) throw new Error('No content ID');
      const updated = await updateContent(contentId, data);
      await mutateContent(updated, false);
      return updated;
    },
    [contentId, mutateContent]
  );

  const remove = useCallback(async () => {
    if (!contentId) throw new Error('No content ID');
    await deleteContent(contentId);
    // Invalidate list caches
    void globalMutate((key) => Array.isArray(key) && key[0] === 'content-list', undefined, {
      revalidate: true,
    });
  }, [contentId]);

  const saveVersion = useCallback(
    async (versionNumber: number, data: UpdateVersionRequest) => {
      if (!contentId) throw new Error('No content ID');
      const updated = await updateVersion(contentId, versionNumber, data);
      await mutateSelectedVersion(updated, false);
      await mutateVersions();
      return updated;
    },
    [contentId, mutateSelectedVersion, mutateVersions]
  );

  const createVersion = useCallback(async () => {
    if (!contentId) throw new Error('No content ID');
    const newVersion = await createNewVersion(contentId);
    await mutateVersions();
    setSelectedVersionNumber(newVersion.versionNumber);
    return newVersion;
  }, [contentId, mutateVersions]);

  // Workflow actions
  const submitVersion = useCallback(
    async (versionNumber: number) => {
      if (!contentId) throw new Error('No content ID');
      const updated = await submitForReview(contentId, versionNumber);
      await mutateSelectedVersion(updated, false);
      await mutateVersions();
      return updated;
    },
    [contentId, mutateSelectedVersion, mutateVersions]
  );

  const approve = useCallback(
    async (versionNumber: number) => {
      if (!contentId) throw new Error('No content ID');
      const updated = await approveVersion(contentId, versionNumber);
      await mutateSelectedVersion(updated, false);
      await mutateVersions();
      return updated;
    },
    [contentId, mutateSelectedVersion, mutateVersions]
  );

  const reject = useCallback(
    async (versionNumber: number, reason: string) => {
      if (!contentId) throw new Error('No content ID');
      const updated = await rejectVersion(contentId, versionNumber, reason);
      await mutateSelectedVersion(updated, false);
      await mutateVersions();
      return updated;
    },
    [contentId, mutateSelectedVersion, mutateVersions]
  );

  const publish = useCallback(
    async (versionNumber: number) => {
      if (!contentId) throw new Error('No content ID');
      const updated = await publishVersion(contentId, versionNumber);
      await mutateSelectedVersion(updated, false);
      await mutateVersions();
      await mutateContent();
      return updated;
    },
    [contentId, mutateSelectedVersion, mutateVersions, mutateContent]
  );

  const retire = useCallback(
    async (versionNumber: number) => {
      if (!contentId) throw new Error('No content ID');
      const updated = await retireVersion(contentId, versionNumber);
      await mutateSelectedVersion(updated, false);
      await mutateVersions();
      await mutateContent();
      return updated;
    },
    [contentId, mutateSelectedVersion, mutateVersions, mutateContent]
  );

  const updateSkills = useCallback(
    async (versionNumber: number, skills: { skillId: string; isPrimary: boolean }[]) => {
      if (!contentId) throw new Error('No content ID');
      const updated = await setVersionSkills(contentId, versionNumber, skills);
      await mutateSelectedVersion(updated, false);
      return updated;
    },
    [contentId, mutateSelectedVersion]
  );

  // Refresh
  const refresh = useCallback(async () => {
    await Promise.all([
      mutateContent(),
      mutateVersions(),
      selectedVersionNumber ? mutateSelectedVersion() : Promise.resolve(),
    ]);
  }, [mutateContent, mutateVersions, mutateSelectedVersion, selectedVersionNumber]);

  return {
    // Data
    content,
    versions: versions ?? [],
    selectedVersion,
    selectedVersionNumber,

    // State
    isLoading: contentLoading || versionsLoading,
    isVersionLoading: versionLoading,
    error: contentError ?? versionsError ?? versionError ?? null,

    // Version selection
    selectVersion,

    // Content actions
    update,
    remove,

    // Version actions
    saveVersion,
    createVersion,

    // Workflow actions
    submitVersion,
    approve,
    reject,
    publish,
    retire,
    updateSkills,

    // Refresh
    refresh,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CREATE HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useCreateContent() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: CreateContentRequest): Promise<LearningObject> => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await createContent(data);

      // Invalidate list caches
      void globalMutate((key) => Array.isArray(key) && key[0] === 'content-list', undefined, {
        revalidate: true,
      });

      return result.learningObject;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create content');
      setError(error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    create,
    isCreating,
    error,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export type {
  ListContentParams,
  CreateContentRequest,
  UpdateVersionRequest,
  ContentBlock,
} from '../api/content';
