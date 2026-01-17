/**
 * React hooks for training resources, best practices, and teaching strategies
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTrainingResources,
  getTrainingResource,
  completeResource,
  updateResourceProgress,
  toggleBookmark,
  getBestPractices,
  getBestPractice,
  toggleLike,
  getTeachingStrategies,
  getTeachingStrategy,
  saveStrategyNotes,
  getUserProgress,
  getLearningPaths,
  enrollInLearningPath,
  type ResourceType,
  type ResourceCategory,
  type DifficultyLevel,
} from '@/lib/api/professional-development-api';

/**
 * Hook to fetch training resources
 */
export function useTrainingResources(filters?: {
  type?: ResourceType;
  category?: ResourceCategory;
  difficulty?: DifficultyLevel;
  search?: string;
}) {
  return useQuery({
    queryKey: ['training-resources', filters],
    queryFn: () => getTrainingResources(filters),
  });
}

/**
 * Hook to fetch a single training resource
 */
export function useTrainingResource(id: string) {
  return useQuery({
    queryKey: ['training-resource', id],
    queryFn: () => getTrainingResource(id),
    enabled: !!id,
  });
}

/**
 * Hook to complete a resource
 */
export function useCompleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-resources'] });
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
    },
  });
}

/**
 * Hook to update resource progress
 */
export function useUpdateResourceProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceId, progress }: { resourceId: string; progress: number }) =>
      updateResourceProgress(resourceId, progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-resources'] });
    },
  });
}

/**
 * Hook to toggle bookmark
 */
export function useToggleBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceId, type }: { resourceId: string; type: 'resource' | 'practice' | 'strategy' }) =>
      toggleBookmark(resourceId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-resources'] });
      queryClient.invalidateQueries({ queryKey: ['best-practices'] });
      queryClient.invalidateQueries({ queryKey: ['teaching-strategies'] });
    },
  });
}

/**
 * Hook to fetch best practices
 */
export function useBestPractices(filters?: {
  category?: ResourceCategory;
  evidenceLevel?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['best-practices', filters],
    queryFn: () => getBestPractices(filters),
  });
}

/**
 * Hook to fetch a single best practice
 */
export function useBestPractice(id: string) {
  return useQuery({
    queryKey: ['best-practice', id],
    queryFn: () => getBestPractice(id),
    enabled: !!id,
  });
}

/**
 * Hook to toggle like on a best practice
 */
export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleLike,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['best-practices'] });
    },
  });
}

/**
 * Hook to fetch teaching strategies
 */
export function useTeachingStrategies(filters?: {
  category?: ResourceCategory;
  difficulty?: DifficultyLevel;
  grade?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['teaching-strategies', filters],
    queryFn: () => getTeachingStrategies(filters),
  });
}

/**
 * Hook to fetch a single teaching strategy
 */
export function useTeachingStrategy(id: string) {
  return useQuery({
    queryKey: ['teaching-strategy', id],
    queryFn: () => getTeachingStrategy(id),
    enabled: !!id,
  });
}

/**
 * Hook to save strategy notes
 */
export function useSaveStrategyNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ strategyId, notes }: { strategyId: string; notes: string }) =>
      saveStrategyNotes(strategyId, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teaching-strategy', variables.strategyId] });
    },
  });
}

/**
 * Hook to fetch user progress
 */
export function useUserProgress() {
  return useQuery({
    queryKey: ['user-progress'],
    queryFn: getUserProgress,
  });
}

/**
 * Hook to fetch learning paths
 */
export function useLearningPaths() {
  return useQuery({
    queryKey: ['learning-paths'],
    queryFn: getLearningPaths,
  });
}

/**
 * Hook to enroll in a learning path
 */
export function useEnrollInLearningPath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enrollInLearningPath,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-paths'] });
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
    },
  });
}
