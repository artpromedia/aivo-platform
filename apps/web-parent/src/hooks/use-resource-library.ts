import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/resource-library-api';

// Resource hooks
export function useResources(filters?: {
  search?: string;
  type?: api.ResourceType;
  category?: api.ResourceCategory;
  ageGroup?: api.AgeGroup;
  difficulty?: api.DifficultyLevel;
}) {
  return useQuery({
    queryKey: ['resources', filters],
    queryFn: () => api.getResources(filters),
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: ['resource', id],
    queryFn: () => api.getResource(id),
    enabled: !!id,
  });
}

export function useTrackResourceView() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (resourceId: string) => api.trackResourceView(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
    },
  });
}

export function useUpdateResourceProgress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ resourceId, progress }: { resourceId: string; progress: number }) =>
      api.updateResourceProgress(resourceId, progress),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resource', variables.resourceId] });
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
    },
  });
}

export function useToggleResourceBookmark() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ resourceId, type }: { resourceId: string; type?: 'resource' | 'video' | 'guide' }) =>
      api.toggleResourceBookmark(resourceId, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resource', variables.resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
    },
  });
}

export function useToggleResourceFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (resourceId: string) => api.toggleResourceFavorite(resourceId),
    onSuccess: (_, resourceId) => {
      queryClient.invalidateQueries({ queryKey: ['resource', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
    },
  });
}

export function useDownloadResource() {
  return useMutation({
    mutationFn: (resourceId: string) => api.downloadResource(resourceId),
  });
}

// Video hooks
export function useVideos(filters?: {
  search?: string;
  category?: api.ResourceCategory;
  ageGroup?: api.AgeGroup;
}) {
  return useQuery({
    queryKey: ['videos', filters],
    queryFn: () => api.getVideos(filters),
  });
}

export function useVideo(id: string) {
  return useQuery({
    queryKey: ['video', id],
    queryFn: () => api.getVideo(id),
    enabled: !!id,
  });
}

export function useUpdateVideoProgress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ videoId, progress, position }: { videoId: string; progress: number; position: number }) =>
      api.updateVideoProgress(videoId, progress, position),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['video', variables.videoId] });
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
    },
  });
}

// Guide hooks
export function useGuides(filters?: {
  search?: string;
  category?: api.ResourceCategory;
  ageGroup?: api.AgeGroup;
  difficulty?: api.DifficultyLevel;
}) {
  return useQuery({
    queryKey: ['guides', filters],
    queryFn: () => api.getGuides(filters),
  });
}

export function useGuide(id: string) {
  return useQuery({
    queryKey: ['guide', id],
    queryFn: () => api.getGuide(id),
    enabled: !!id,
  });
}

// Collection hooks
export function useCollections(filters?: {
  search?: string;
  category?: api.ResourceCategory;
}) {
  return useQuery({
    queryKey: ['collections', filters],
    queryFn: () => api.getCollections(filters),
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: ['collection', id],
    queryFn: () => api.getCollection(id),
    enabled: !!id,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      category: api.ResourceCategory;
      isPublic: boolean;
    }) => api.createCollection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useAddToCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collectionId, resourceId }: { collectionId: string; resourceId: string }) =>
      api.addToCollection(collectionId, resourceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useRemoveFromCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ collectionId, resourceId }: { collectionId: string; resourceId: string }) =>
      api.removeFromCollection(collectionId, resourceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

// User Activity hooks
export function useUserActivity() {
  return useQuery({
    queryKey: ['user-activity'],
    queryFn: () => api.getUserActivity(),
  });
}
