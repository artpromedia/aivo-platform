/**
 * useReview Hook
 *
 * React hook for review queue operations with:
 * - Review queue listing and filtering
 * - Review submission
 * - Comment management
 * - Real-time updates
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';

import {
  getReviewQueue,
  getReviewItem,
  assignReviewToMe,
  unassignReview,
  setReviewPriority,
  submitReview,
  getReviewHistory,
  getReviewStats,
  getVersionComments,
  addComment,
  updateComment,
  deleteComment,
  resolveComment,
  unresolveComment,
} from '../api/review';
import type {
  ListReviewQueueParams,
  SubmitReviewRequest,
  ReviewRecord,
  ReviewPriority,
} from '../api/review';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface UseReviewQueueOptions {
  initialParams?: ListReviewQueueParams;
  enabled?: boolean;
  refreshInterval?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// REVIEW QUEUE HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useReviewQueue(options: UseReviewQueueOptions = {}) {
  const {
    initialParams = {},
    enabled = true,
    refreshInterval = 30000, // 30 seconds
  } = options;

  // Filters state
  const [params, setParams] = useState<ListReviewQueueParams>(initialParams);

  // Build cache key
  const cacheKey = useMemo(() => {
    if (!enabled) return null;
    return ['review-queue', JSON.stringify(params)];
  }, [enabled, params]);

  // Fetch data
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Awaited<ReturnType<typeof getReviewQueue>>,
    Error
  >(cacheKey, () => getReviewQueue(params), {
    refreshInterval,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  // Fetch stats
  const { data: stats, mutate: mutateStats } = useSWR(
    enabled ? 'review-stats' : null,
    getReviewStats,
    { refreshInterval: 60000 }
  );

  // Update filters
  const setFilters = useCallback((newParams: Partial<ListReviewQueueParams>) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
      offset: 0, // Reset pagination on filter change
    }));
  }, []);

  // Pagination
  const setPage = useCallback(
    (page: number) => {
      const limit = params.limit || 20;
      setParams((prev) => ({
        ...prev,
        offset: page * limit,
      }));
    },
    [params.limit]
  );

  // Actions
  const assign = useCallback(
    async (versionId: string) => {
      const updated = await assignReviewToMe(versionId);
      await mutate();
      await mutateStats();
      return updated;
    },
    [mutate, mutateStats]
  );

  const unassign = useCallback(
    async (versionId: string) => {
      const updated = await unassignReview(versionId);
      await mutate();
      await mutateStats();
      return updated;
    },
    [mutate, mutateStats]
  );

  const setPriority = useCallback(
    async (versionId: string, priority: ReviewPriority) => {
      const updated = await setReviewPriority(versionId, priority);
      await mutate();
      return updated;
    },
    [mutate]
  );

  const refresh = useCallback(async () => {
    await Promise.all([mutate(), mutateStats()]);
  }, [mutate, mutateStats]);

  // Computed
  const currentPage = useMemo(() => {
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    return Math.floor(offset / limit);
  }, [params.limit, params.offset]);

  const totalPages = useMemo(() => {
    if (!data) return 0;
    const limit = params.limit || 20;
    return Math.ceil(data.pagination.total / limit);
  }, [data, params.limit]);

  return {
    // Data
    items: data?.items || [],
    total: data?.pagination.total || 0,
    stats,

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
    assign,
    unassign,
    setPriority,
    refresh,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// REVIEW DETAIL HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useReview(versionId: string | null, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  // Review item
  const {
    data: reviewItem,
    error: reviewError,
    isLoading: reviewLoading,
    mutate: mutateReview,
  } = useSWR<Awaited<ReturnType<typeof getReviewItem>>, Error>(
    enabled && versionId ? ['review-item', versionId] : null,
    ([, id]) => getReviewItem(id as string)
  );

  // Review history
  const {
    data: history,
    error: historyError,
    isLoading: historyLoading,
    mutate: mutateHistory,
  } = useSWR<Awaited<ReturnType<typeof getReviewHistory>>, Error>(
    enabled && versionId ? ['review-history', versionId] : null,
    ([, id]) => getReviewHistory(id as string)
  );

  // Comments
  const {
    data: comments,
    error: commentsError,
    isLoading: commentsLoading,
    mutate: mutateComments,
  } = useSWR<Awaited<ReturnType<typeof getVersionComments>>, Error>(
    enabled && versionId ? ['review-comments', versionId] : null,
    ([, id]) => getVersionComments(id as string)
  );

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);

  // Actions
  const submit = useCallback(
    async (review: SubmitReviewRequest): Promise<ReviewRecord> => {
      if (!versionId) throw new Error('No version ID');

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const record = await submitReview(versionId, review);
        await mutateReview();
        await mutateHistory();

        // Invalidate queue
        void globalMutate((key) => Array.isArray(key) && key[0] === 'review-queue', undefined, {
          revalidate: true,
        });

        return record;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Review submission failed');
        setSubmitError(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [versionId, mutateReview, mutateHistory]
  );

  const assign = useCallback(async () => {
    if (!versionId) throw new Error('No version ID');
    const updated = await assignReviewToMe(versionId);
    await mutateReview();
    return updated;
  }, [versionId, mutateReview]);

  const unassign = useCallback(async () => {
    if (!versionId) throw new Error('No version ID');
    const updated = await unassignReview(versionId);
    await mutateReview();
    return updated;
  }, [versionId, mutateReview]);

  // Comment actions
  const addNewComment = useCallback(
    async (content: string, blockId?: string, parentId?: string) => {
      if (!versionId) throw new Error('No version ID');
      const commentData: { content: string; blockId?: string; parentId?: string } = { content };
      if (blockId) {
        commentData.blockId = blockId;
      }
      if (parentId) {
        commentData.parentId = parentId;
      }
      const comment = await addComment(versionId, commentData);
      await mutateComments();
      return comment;
    },
    [versionId, mutateComments]
  );

  const editComment = useCallback(
    async (commentId: string, content: string) => {
      if (!versionId) throw new Error('No version ID');
      const comment = await updateComment(versionId, commentId, content);
      await mutateComments();
      return comment;
    },
    [versionId, mutateComments]
  );

  const removeComment = useCallback(
    async (commentId: string) => {
      if (!versionId) throw new Error('No version ID');
      await deleteComment(versionId, commentId);
      await mutateComments();
    },
    [versionId, mutateComments]
  );

  const resolve = useCallback(
    async (commentId: string) => {
      if (!versionId) throw new Error('No version ID');
      const comment = await resolveComment(versionId, commentId);
      await mutateComments();
      return comment;
    },
    [versionId, mutateComments]
  );

  const unresolve = useCallback(
    async (commentId: string) => {
      if (!versionId) throw new Error('No version ID');
      const comment = await unresolveComment(versionId, commentId);
      await mutateComments();
      return comment;
    },
    [versionId, mutateComments]
  );

  // Refresh
  const refresh = useCallback(async () => {
    await Promise.all([mutateReview(), mutateHistory(), mutateComments()]);
  }, [mutateReview, mutateHistory, mutateComments]);

  // Computed
  const unresolvedCommentCount = useMemo(() => {
    if (!comments) return 0;
    return comments.filter((c) => !c.resolved).length;
  }, [comments]);

  return {
    // Data
    reviewItem,
    history: history || [],
    comments: comments || [],
    unresolvedCommentCount,

    // State
    isLoading: reviewLoading || historyLoading || commentsLoading,
    error: reviewError ?? historyError ?? commentsError ?? null,
    isSubmitting,
    submitError,

    // Review actions
    submit,
    assign,
    unassign,

    // Comment actions
    addComment: addNewComment,
    editComment,
    removeComment,
    resolveComment: resolve,
    unresolveComment: unresolve,

    // Refresh
    refresh,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export type {
  ListReviewQueueParams,
  SubmitReviewRequest,
  ReviewQueueItem,
  ReviewComment,
  ReviewRecord,
  ReviewStats,
  ReviewPriority,
} from '../api/review';
