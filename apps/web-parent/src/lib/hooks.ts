/**
 * React Query Hooks for Parent Dashboard
 *
 * These hooks fetch data from the parent API service and fall back
 * to mock data in development mode when the API is unavailable.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import {
  isDevMode,
  getMockParentProfile,
  getMockStudentSummary,
  getMockWeeklySummary,
  getMockHomeworkSessions,
  getMockMessages,
  getMockDifficultyRecommendations,
  type MockParentProfile,
  type MockStudentSummary,
  type MockWeeklySummary,
  type MockHomeworkSession,
  type MockMessage,
  type MockDifficultyRecommendation,
} from './mock-data';

// Query keys for cache management
export const queryKeys = {
  parentProfile: ['parent-profile'] as const,
  studentSummary: (studentId: string) => ['student-summary', studentId] as const,
  weeklySummary: (studentId: string) => ['weekly-summary', studentId] as const,
  homeworkSessions: (studentId: string) => ['homework-sessions', studentId] as const,
  messages: ['messages'] as const,
  difficultyRecommendations: (studentId: string) => ['difficulty-recommendations', studentId] as const,
  notifications: ['notifications'] as const,
};

/**
 * Hook to fetch parent profile with linked students
 */
export function useParentProfile() {
  return useQuery({
    queryKey: queryKeys.parentProfile,
    queryFn: async (): Promise<MockParentProfile> => {
      try {
        const data = await api.get<MockParentProfile>('/parent/profile');
        return data;
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock parent profile data');
          return getMockParentProfile();
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch student summary for dashboard
 */
export function useStudentSummary(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.studentSummary(studentId || ''),
    queryFn: async (): Promise<MockStudentSummary> => {
      if (!studentId) {
        throw new Error('No student selected');
      }

      try {
        const data = await api.get<MockStudentSummary>(`/parent/students/${studentId}/summary`);
        return data;
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock student summary data');
          return getMockStudentSummary(studentId);
        }
        throw error;
      }
    },
    enabled: !!studentId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch weekly summary
 */
export function useWeeklySummary(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.weeklySummary(studentId || ''),
    queryFn: async (): Promise<MockWeeklySummary> => {
      if (!studentId) {
        throw new Error('No student selected');
      }

      try {
        const data = await api.get<MockWeeklySummary>(`/parent/students/${studentId}/weekly-summary`);
        return data;
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock weekly summary data');
          return getMockWeeklySummary(studentId);
        }
        throw error;
      }
    },
    enabled: !!studentId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch homework helper sessions
 */
export function useHomeworkSessions(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.homeworkSessions(studentId || ''),
    queryFn: async (): Promise<MockHomeworkSession[]> => {
      if (!studentId) {
        throw new Error('No student selected');
      }

      try {
        const data = await api.get<MockHomeworkSession[]>(`/parent/homework/students/${studentId}`);
        return data;
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock homework sessions data');
          return getMockHomeworkSessions(studentId);
        }
        throw error;
      }
    },
    enabled: !!studentId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch parent messages
 */
export function useMessages() {
  return useQuery({
    queryKey: queryKeys.messages,
    queryFn: async (): Promise<MockMessage[]> => {
      try {
        const data = await api.get<{ conversations: MockMessage[] }>('/parent/messages/conversations');
        return data.conversations || [];
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock messages data');
          return getMockMessages();
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch difficulty recommendations
 */
export function useDifficultyRecommendations(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.difficultyRecommendations(studentId || ''),
    queryFn: async (): Promise<MockDifficultyRecommendation[]> => {
      if (!studentId) {
        throw new Error('No student selected');
      }

      try {
        const data = await api.get<{ recommendations: MockDifficultyRecommendation[] }>(
          `/parent/students/${studentId}/difficulty/recommendations`
        );
        return data.recommendations || [];
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock difficulty recommendations data');
          return getMockDifficultyRecommendations(studentId);
        }
        throw error;
      }
    },
    enabled: !!studentId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to respond to difficulty recommendation
 */
export function useRespondToRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recommendationId,
      action,
      modifiedLevel,
      parentNotes,
    }: {
      recommendationId: string;
      action: 'approve' | 'modify' | 'deny';
      modifiedLevel?: number;
      parentNotes?: string;
    }) => {
      return api.post('/parent/difficulty/recommendations/respond', {
        recommendationId,
        action,
        modifiedLevel,
        parentNotes,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate recommendations queries to refetch
      queryClient.invalidateQueries({ queryKey: ['difficulty-recommendations'] });
    },
  });
}

/**
 * Hook to update daily learning goal
 */
export function useUpdateDailyGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      goalMinutes,
    }: {
      studentId: string;
      goalMinutes: number;
    }) => {
      return api.put(`/parent/students/${studentId}/settings`, {
        dailyGoalMinutes: goalMinutes,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate student summary to refetch with new goal
      queryClient.invalidateQueries({ queryKey: queryKeys.studentSummary(variables.studentId) });
    },
  });
}

/**
 * Hook to download progress report
 */
export function useDownloadReport() {
  return useMutation({
    mutationFn: async ({
      studentId,
      studentName,
    }: {
      studentId: string;
      studentName: string;
    }) => {
      const blob = await api.getBlob(`/reports/students/${studentId}/progress.pdf`);
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progress-report-${studentName.toLowerCase().replaceAll(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);
    },
  });
}

/**
 * Hook to mark messages as read
 */
export function useMarkMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      return api.put(`/parent/messages/conversations/${conversationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages });
    },
  });
}
