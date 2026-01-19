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
  getMockAIInsights,
  getMockActivityTimeline,
  getMockMilestones,
  getMockWeeklyReport,
  getMockChildrenEnhanced,
  getMockProgressReport,
  type MockParentProfile,
  type MockStudentSummary,
  type MockWeeklySummary,
  type MockHomeworkSession,
  type MockMessage,
  type MockDifficultyRecommendation,
  type MockAIInsight,
  type MockTimelineActivity,
  type MockMilestone,
  type MockWeeklyReportData,
  type MockChildData,
  type MockProgressReportData,
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
  // Sprint 5: New query keys
  aiInsights: (studentId: string) => ['ai-insights', studentId] as const,
  activityTimeline: (studentId: string) => ['activity-timeline', studentId] as const,
  milestones: (studentId: string) => ['milestones', studentId] as const,
  weeklyReport: (studentId: string, weekStart?: string) => ['weekly-report', studentId, weekStart] as const,
  childrenEnhanced: ['children-enhanced'] as const,
  // Sprint 7: Progress Reports query keys
  progressReport: (studentId: string, dateRange?: { start: string; end: string }) =>
    ['progress-report', studentId, dateRange?.start, dateRange?.end] as const,
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

// ============================================================================
// Sprint 5: New Hooks for Parent Dashboard Enhancement
// ============================================================================

/**
 * Hook to fetch AI-powered insights for a student
 */
export function useAIInsights(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.aiInsights(studentId || ''),
    queryFn: async (): Promise<MockAIInsight[]> => {
      if (!studentId) {
        throw new Error('No student selected');
      }

      try {
        const data = await api.get<{ insights: MockAIInsight[] }>(`/api/ai/parent-insights/${studentId}`);
        return data.insights || [];
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock AI insights data');
          return getMockAIInsights(studentId);
        }
        throw error;
      }
    },
    enabled: !!studentId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 10 * 60 * 1000, // 10 minutes - insights don't change frequently
  });
}

/**
 * Hook to fetch activity timeline for a student
 */
export function useActivityTimeline(studentId: string | null, limit?: number) {
  return useQuery({
    queryKey: [...queryKeys.activityTimeline(studentId || ''), limit],
    queryFn: async (): Promise<MockTimelineActivity[]> => {
      if (!studentId) {
        throw new Error('No student selected');
      }

      try {
        const params = limit ? `?limit=${limit}` : '';
        const data = await api.get<{ activities: MockTimelineActivity[] }>(
          `/parent/students/${studentId}/activity-timeline${params}`
        );
        return data.activities || [];
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock activity timeline data');
          const activities = getMockActivityTimeline(studentId);
          return limit ? activities.slice(0, limit) : activities;
        }
        throw error;
      }
    },
    enabled: !!studentId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 1 * 60 * 1000, // 1 minute - activities update frequently
  });
}

/**
 * Hook to fetch upcoming milestones for a student
 */
export function useMilestones(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.milestones(studentId || ''),
    queryFn: async (): Promise<MockMilestone[]> => {
      if (!studentId) {
        throw new Error('No student selected');
      }

      try {
        const data = await api.get<{ milestones: MockMilestone[] }>(
          `/parent/students/${studentId}/milestones`
        );
        return data.milestones || [];
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock milestones data');
          return getMockMilestones(studentId);
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
 * Hook to fetch weekly report for a student
 */
export function useWeeklyReport(studentId: string | null, weekStart?: Date) {
  const weekStartStr = weekStart?.toISOString().split('T')[0];

  return useQuery({
    queryKey: queryKeys.weeklyReport(studentId || '', weekStartStr),
    queryFn: async (): Promise<MockWeeklyReportData> => {
      if (!studentId) {
        throw new Error('No student selected');
      }

      try {
        const params = weekStartStr ? `?weekStart=${weekStartStr}` : '';
        const data = await api.get<MockWeeklyReportData>(
          `/parent/students/${studentId}/weekly-report${params}`
        );
        return data;
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock weekly report data');
          return getMockWeeklyReport(studentId);
        }
        throw error;
      }
    },
    enabled: !!studentId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 15 * 60 * 1000, // 15 minutes - reports don't change often
  });
}

/**
 * Hook to fetch enhanced children data with status and progress
 */
export function useChildrenEnhanced() {
  return useQuery({
    queryKey: queryKeys.childrenEnhanced,
    queryFn: async (): Promise<MockChildData[]> => {
      try {
        const data = await api.get<{ children: MockChildData[] }>('/parent/children/enhanced');
        return data.children || [];
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock enhanced children data');
          return getMockChildrenEnhanced();
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
    staleTime: 1 * 60 * 1000, // 1 minute - status can change
    refetchInterval: 60000, // Refetch every minute for live status
  });
}

/**
 * Hook to dismiss an AI insight
 */
export function useDismissInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      insightId,
    }: {
      studentId: string;
      insightId: string;
    }) => {
      return api.post(`/api/ai/insights/${insightId}/dismiss`, { studentId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiInsights(variables.studentId) });
    },
  });
}

/**
 * Hook to share a weekly report
 */
export function useShareWeeklyReport() {
  return useMutation({
    mutationFn: async ({
      studentId,
      weekStart,
      recipientEmail,
    }: {
      studentId: string;
      weekStart: string;
      recipientEmail?: string;
    }) => {
      return api.post(`/parent/students/${studentId}/weekly-report/share`, {
        weekStart,
        recipientEmail,
      });
    },
  });
}

// ============================================================================
// Sprint 6: Messaging & Parental Controls Hooks
// ============================================================================

/**
 * Types for messaging
 */
export interface Conversation {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar?: string;
  teacherSubject?: string;
  studentId: string;
  studentName: string;
  subject: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  archived: boolean;
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  senderType: 'parent' | 'teacher';
  senderName: string;
  senderAvatar?: string;
  content: string;
  sentAt: string;
  readAt?: string;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
  }[];
}

/**
 * Types for parental controls
 */
export interface ParentalControlSettings {
  screenTime: ScreenTimeSettings;
  contentFilter: ContentFilterSettings;
  subjectAccess: SubjectAccessSettings;
  notifications: NotificationControlSettings;
  safety: SafetyControlSettings;
}

export interface ScreenTimeSettings {
  dailyLimit: number;
  scheduleEnabled: boolean;
  schedule: Record<string, { start: string; end: string; enabled: boolean }>;
  breakReminders: boolean;
  breakInterval: number;
  breakDuration: number;
}

export interface ContentFilterSettings {
  restrictionLevel: 'strict' | 'moderate' | 'minimal';
  blockExternalLinks: boolean;
  safeSearch: boolean;
  hideAchievementLeaderboards: boolean;
  restrictChat: boolean;
  blockedTopics: string[];
  allowedTopics: string[];
}

export interface SubjectAccessSettings {
  subjects: Record<string, { enabled: boolean; maxLevel?: number }>;
  requireParentApprovalForNewSubjects: boolean;
  allowAdvancedContent: boolean;
}

export interface NotificationControlSettings {
  email: {
    enabled: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
    achievements: boolean;
    concerns: boolean;
    teacherMessages: boolean;
  };
  push: {
    enabled: boolean;
    achievements: boolean;
    milestones: boolean;
    concerns: boolean;
    teacherMessages: boolean;
    screenTimeAlerts: boolean;
  };
  inApp: {
    enabled: boolean;
    achievements: boolean;
    progress: boolean;
    recommendations: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface SafetyControlSettings {
  privacy: {
    hideFromClassmates: boolean;
    hideProfilePhoto: boolean;
    hideProgress: boolean;
    anonymousMode: boolean;
  };
  data: {
    allowAnalytics: boolean;
    allowPersonalization: boolean;
    allowThirdPartySharing: boolean;
  };
  access: {
    requirePinForSettings: boolean;
    pin?: string;
    allowAccountDeletion: boolean;
    twoFactorEnabled: boolean;
  };
  emergency: {
    emergencyContactEnabled: boolean;
    emergencyEmail?: string;
    emergencyPhone?: string;
  };
}

// Query keys for messaging and controls
export const messagingQueryKeys = {
  conversations: (includeArchived?: boolean) => ['conversations', { includeArchived }] as const,
  conversationMessages: (conversationId: string) => ['messages', conversationId] as const,
  childrenWithTeachers: ['children-with-teachers'] as const,
};

export const controlsQueryKeys = {
  parentalControls: (childId: string) => ['parental-controls', childId] as const,
};

/**
 * Hook to fetch conversations
 */
export function useConversations(includeArchived = false) {
  return useQuery({
    queryKey: messagingQueryKeys.conversations(includeArchived),
    queryFn: async (): Promise<Conversation[]> => {
      try {
        const data = await api.get<Conversation[]>(
          `/messages/conversations?includeArchived=${includeArchived}`
        );
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock conversations data');
          return [];
        }
        throw error;
      }
    },
    refetchInterval: 30000,
    retry: isDevMode() ? 0 : 3,
  });
}

/**
 * Hook to fetch messages for a conversation
 */
export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: messagingQueryKeys.conversationMessages(conversationId || ''),
    queryFn: async (): Promise<{ messages: ConversationMessage[]; conversation: Conversation }> => {
      if (!conversationId) {
        throw new Error('No conversation selected');
      }
      try {
        const data = await api.get<{ messages: ConversationMessage[]; conversation: Conversation }>(
          `/messages/conversations/${conversationId}`
        );
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock messages data');
          return { messages: [], conversation: {} as Conversation };
        }
        throw error;
      }
    },
    enabled: !!conversationId,
    refetchInterval: 10000,
    retry: isDevMode() ? 0 : 3,
  });
}

/**
 * Hook to send a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      return api.post(`/messages/conversations/${conversationId}/messages`, { content });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.conversationMessages(variables.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.conversations(),
      });
    },
  });
}

/**
 * Hook to create a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      teacherId: string;
      childId: string;
      subject: string;
      content: string;
    }) => {
      return api.post<{ conversationId: string }>('/messages/conversations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.conversations(),
      });
    },
  });
}

/**
 * Hook to mark conversation as read
 */
export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      return api.put(`/messages/conversations/${conversationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.conversations(),
      });
    },
  });
}

/**
 * Hook to fetch parental controls for a child
 */
export function useParentalControls(childId: string | null) {
  return useQuery({
    queryKey: controlsQueryKeys.parentalControls(childId || ''),
    queryFn: async (): Promise<ParentalControlSettings> => {
      if (!childId) {
        throw new Error('No child selected');
      }
      try {
        const data = await api.get<ParentalControlSettings>(
          `/parent/children/${childId}/controls`
        );
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock parental controls data');
          return {
            screenTime: {
              dailyLimit: 120,
              scheduleEnabled: false,
              schedule: {},
              breakReminders: true,
              breakInterval: 30,
              breakDuration: 5,
            },
            contentFilter: {
              restrictionLevel: 'moderate',
              blockExternalLinks: true,
              safeSearch: true,
              hideAchievementLeaderboards: false,
              restrictChat: true,
              blockedTopics: [],
              allowedTopics: [],
            },
            subjectAccess: {
              subjects: {},
              requireParentApprovalForNewSubjects: true,
              allowAdvancedContent: false,
            },
            notifications: {
              email: {
                enabled: true,
                dailyDigest: false,
                weeklyReport: true,
                achievements: true,
                concerns: true,
                teacherMessages: true,
              },
              push: {
                enabled: true,
                achievements: true,
                milestones: true,
                concerns: true,
                teacherMessages: true,
                screenTimeAlerts: true,
              },
              inApp: {
                enabled: true,
                achievements: true,
                progress: true,
                recommendations: true,
              },
              quietHours: {
                enabled: false,
                start: '21:00',
                end: '07:00',
              },
            },
            safety: {
              privacy: {
                hideFromClassmates: false,
                hideProfilePhoto: false,
                hideProgress: false,
                anonymousMode: false,
              },
              data: {
                allowAnalytics: true,
                allowPersonalization: true,
                allowThirdPartySharing: false,
              },
              access: {
                requirePinForSettings: false,
                allowAccountDeletion: false,
                twoFactorEnabled: false,
              },
              emergency: {
                emergencyContactEnabled: false,
              },
            },
          };
        }
        throw error;
      }
    },
    enabled: !!childId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to update parental controls section
 */
export function useUpdateParentalControls() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      childId,
      section,
      settings,
    }: {
      childId: string;
      section: keyof ParentalControlSettings;
      settings: unknown;
    }) => {
      return api.put(`/parent/children/${childId}/controls/${section}`, settings);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: controlsQueryKeys.parentalControls(variables.childId),
      });
    },
  });
}

// ============================================================================
// Sprint 7: Progress Reports Hooks
// ============================================================================

/**
 * Hook to fetch comprehensive progress report for a student
 */
export function useProgressReport(
  studentId: string | null,
  dateRange?: { start: string; end: string }
) {
  return useQuery({
    queryKey: queryKeys.progressReport(studentId || '', dateRange),
    queryFn: async (): Promise<MockProgressReportData> => {
      if (!studentId) {
        throw new Error('No student selected');
      }

      try {
        const params = new URLSearchParams();
        if (dateRange?.start) params.append('start', dateRange.start);
        if (dateRange?.end) params.append('end', dateRange.end);
        const queryString = params.toString() ? `?${params.toString()}` : '';

        const data = await api.get<MockProgressReportData>(
          `/reports/students/${studentId}/progress${queryString}`
        );
        return data;
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock progress report data');
          return getMockProgressReport(studentId, dateRange);
        }
        throw error;
      }
    },
    enabled: !!studentId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 10 * 60 * 1000, // 10 minutes - reports don't change frequently
  });
}

/**
 * Hook to generate and export a PDF report
 */
export function useGenerateReportPDF() {
  return useMutation({
    mutationFn: async ({
      studentId,
      studentName,
      dateRange,
    }: {
      studentId: string;
      studentName: string;
      dateRange: { start: string; end: string };
    }) => {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);

      const blob = await api.getBlob(
        `/reports/students/${studentId}/progress.pdf?${params.toString()}`
      );
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progress-report-${studentName.toLowerCase().replaceAll(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);
    },
  });
}
