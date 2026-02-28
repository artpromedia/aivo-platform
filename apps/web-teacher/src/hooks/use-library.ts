/**
 * Library Resource Hooks
 *
 * React Query hooks for fetching, uploading, and deleting
 * teacher resources via /api/library/resources proxy → content-svc.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ResourceType =
  | 'lesson_plan'
  | 'activity'
  | 'assessment'
  | 'template'
  | 'media'
  | 'document'
  | 'presentation'
  | 'worksheet';

export type ResourceCategory =
  | 'all'
  | 'lesson_plans'
  | 'activities'
  | 'assessments'
  | 'templates'
  | 'media';

export interface LibraryResource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  subject: string;
  gradeLevel: string;
  category: ResourceCategory;
  author: string;
  authorId: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  mimeType?: string;
  downloads: number;
  rating: number;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryFilters {
  type?: ResourceType;
  subject?: string;
  grade?: string;
  category?: ResourceCategory;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface LibraryResourcesResponse {
  resources: LibraryResource[];
  total: number;
}

export interface UploadResourcePayload {
  title: string;
  description: string;
  type: ResourceType;
  subject: string;
  gradeLevel: string;
  category: ResourceCategory;
  tags: string[];
  isPublic: boolean;
  file?: File;
}

// ══════════════════════════════════════════════════════════════════════════════
// FETCH HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function fetchResources(filters: LibraryFilters): Promise<LibraryResourcesResponse> {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.subject) params.set('subject', filters.subject);
  if (filters.grade) params.set('grade', filters.grade);
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.search) params.set('q', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

  const res = await fetch(`/api/library/resources?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch library resources');
  return res.json() as Promise<LibraryResourcesResponse>;
}

async function uploadResource(payload: UploadResourcePayload): Promise<LibraryResource> {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('description', payload.description);
  formData.append('type', payload.type);
  formData.append('subject', payload.subject);
  formData.append('gradeLevel', payload.gradeLevel);
  formData.append('category', payload.category);
  formData.append('tags', JSON.stringify(payload.tags));
  formData.append('isPublic', String(payload.isPublic));
  if (payload.file) {
    formData.append('file', payload.file);
  }

  const res = await fetch('/api/library/resources', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Failed to upload resource');
  return res.json() as Promise<LibraryResource>;
}

async function deleteResource(resourceId: string): Promise<void> {
  const res = await fetch(`/api/library/resources?id=${resourceId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete resource');
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Hook to fetch library resources with optional filters.
 * Supports pagination and category/type/subject filtering.
 */
export function useLibraryResources(filters: LibraryFilters = {}) {
  const query = useQuery({
    queryKey: ['library-resources', filters],
    queryFn: () => fetchResources(filters),
    staleTime: 60_000, // 1 minute
  });

  return {
    resources: query.data?.resources ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Mutation hook to upload a new resource.
 * Invalidates the resource list on success.
 */
export function useUploadResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-resources'] });
    },
  });
}

/**
 * Mutation hook to delete a resource by ID.
 * Invalidates the resource list on success.
 */
export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-resources'] });
    },
  });
}
