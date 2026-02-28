/**
 * Teacher Settings Hooks
 *
 * Fetch + mutate profile, grading, and notification preferences
 * using @tanstack/react-query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface TeacherProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  department?: string;
  title?: string;
}

export interface GradingSettings {
  gradingScale: string;
  lateWorkPolicy: string;
  dropLowest: boolean;
  roundingRule: string;
}

export interface NotificationPreferences {
  sessionUpdates: boolean;
  achievements: boolean;
  messages: boolean;
  reminders: boolean;
  alerts: boolean;
  weeklyDigest: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

// ════════════════════════════════════════════════════════════════════════════
// FETCH HELPERS
// ════════════════════════════════════════════════════════════════════════════

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function putJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ════════════════════════════════════════════════════════════════════════════
// PROFILE
// ════════════════════════════════════════════════════════════════════════════

export function useTeacherProfile() {
  return useQuery<TeacherProfile>({
    queryKey: ['teacher-profile'],
    queryFn: () => fetchJSON<TeacherProfile>('/api/teacher/profile'),
  });
}

export function useUpdateTeacherProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<TeacherProfile>) =>
      putJSON<TeacherProfile>('/api/teacher/profile', updates),
    onSuccess: (data) => {
      queryClient.setQueryData(['teacher-profile'], data);
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// GRADING
// ════════════════════════════════════════════════════════════════════════════

export function useGradingSettings() {
  return useQuery<GradingSettings>({
    queryKey: ['grading-settings'],
    queryFn: () => fetchJSON<GradingSettings>('/api/teacher/settings/grading'),
  });
}

export function useUpdateGradingSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<GradingSettings>) =>
      putJSON<GradingSettings>('/api/teacher/settings/grading', updates),
    onSuccess: (data) => {
      queryClient.setQueryData(['grading-settings'], data);
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ════════════════════════════════════════════════════════════════════════════

export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: ['notification-preferences'],
    queryFn: () =>
      fetchJSON<NotificationPreferences>('/api/teacher/settings/notifications'),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<NotificationPreferences>) =>
      putJSON<NotificationPreferences>(
        '/api/teacher/settings/notifications',
        updates,
      ),
    onMutate: async (updates) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notification-preferences'] });
      const previous = queryClient.getQueryData<NotificationPreferences>([
        'notification-preferences',
      ]);
      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(
          ['notification-preferences'],
          { ...previous, ...updates },
        );
      }
      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notification-preferences'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}
