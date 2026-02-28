/**
 * TanStack Query hooks for all learner-facing data.
 *
 * Each hook wraps a fetch function from api-client.ts and provides
 * typed loading / error / data states for use in client components.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LearnerSettings } from '../types';

import {
  fetchAssessments,
  fetchCourses,
  fetchDashboard,
  fetchGames,
  fetchGoals,
  fetchProfile,
  fetchProgress,
  fetchSettings,
  updateAvatar,
  updateSettings,
} from '../api-client';

// ── Query key constants ────────────────────────────────────

export const queryKeys = {
  dashboard: ['learner', 'dashboard'] as const,
  courses: ['learner', 'courses'] as const,
  games: ['learner', 'games'] as const,
  progress: ['learner', 'progress'] as const,
  profile: ['learner', 'profile'] as const,
  goals: ['learner', 'goals'] as const,
  assessments: ['learner', 'assessments'] as const,
  settings: ['learner', 'settings'] as const,
};

// ── Dashboard ──────────────────────────────────────────────

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboard,
  });
}

// ── Courses ────────────────────────────────────────────────

export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: fetchCourses,
  });
}

// ── Games ──────────────────────────────────────────────────

export function useGames() {
  return useQuery({
    queryKey: queryKeys.games,
    queryFn: fetchGames,
  });
}

// ── Progress ───────────────────────────────────────────────

export function useProgress() {
  return useQuery({
    queryKey: queryKeys.progress,
    queryFn: fetchProgress,
  });
}

// ── Profile ────────────────────────────────────────────────

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: fetchProfile,
  });
}

export function useUpdateAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (avatar: string) => updateAvatar(avatar),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

// ── Goals ──────────────────────────────────────────────────

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: fetchGoals,
  });
}

// ── Assessments ────────────────────────────────────────────

export function useAssessments() {
  return useQuery({
    queryKey: queryKeys.assessments,
    queryFn: fetchAssessments,
  });
}

// ── Settings ────────────────────────────────────────────────

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: fetchSettings,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<LearnerSettings>) => updateSettings(settings),
    onMutate: async (newSettings) => {
      await qc.cancelQueries({ queryKey: queryKeys.settings });
      const previous = qc.getQueryData<LearnerSettings>(queryKeys.settings);
      if (previous) {
        qc.setQueryData<LearnerSettings>(queryKeys.settings, {
          ...previous,
          ...newSettings,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.settings, context.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
}
