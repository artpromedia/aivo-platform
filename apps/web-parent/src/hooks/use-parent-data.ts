/**
 * Parent Dashboard Data Hooks
 *
 * React Query hooks for fetching parent dashboard data.
 * These hooks handle loading states, caching, and error recovery.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { parentApi } from '@/lib/api/parent.api';
import type { ParentalControls } from '@/lib/api/parent.api';

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  // Profile
  parentProfile: ['parent-profile'] as const,

  // Students
  studentSummary: (studentId: string) => ['student-summary', studentId] as const,
  weeklySummary: (studentId: string) => ['weekly-summary', studentId] as const,
  weeklyReport: (studentId: string, weekStart?: string) =>
    ['weekly-report', studentId, weekStart] as const,

  // Activities & Progress
  activityTimeline: (studentId: string) => ['activity-timeline', studentId] as const,
  milestones: (studentId: string) => ['milestones', studentId] as const,
  achievements: (studentId: string) => ['achievements', studentId] as const,
  activities: (studentId: string) => ['activities', studentId] as const,

  // AI & Insights
  aiInsights: (studentId: string) => ['ai-insights', studentId] as const,

  // Homework
  homeworkSessions: (studentId: string) => ['homework-sessions', studentId] as const,

  // Messages
  messages: ['messages'] as const,
  conversations: (includeArchived?: boolean) => ['conversations', { includeArchived }] as const,
  conversationMessages: (conversationId: string) =>
    ['conversation-messages', conversationId] as const,

  // Difficulty
  difficultyRecommendations: (studentId: string) =>
    ['difficulty-recommendations', studentId] as const,

  // Children
  childrenEnhanced: ['children-enhanced'] as const,
  childrenWithTeachers: ['children-with-teachers'] as const,

  // Controls
  parentalControls: (childId: string) => ['parental-controls', childId] as const,

  // Reports
  progressReport: (studentId: string, dateRange?: { start: string; end: string }) =>
    ['progress-report', studentId, dateRange?.start, dateRange?.end] as const,

  // Notifications
  notifications: ['notifications'] as const,
} as const;

// ============================================================================
// Configuration
// ============================================================================

const STALE_TIMES = {
  short: 1 * 60 * 1000, // 1 minute - frequently changing data
  medium: 5 * 60 * 1000, // 5 minutes - moderately changing data
  long: 10 * 60 * 1000, // 10 minutes - rarely changing data
  veryLong: 30 * 60 * 1000, // 30 minutes - static data
};

// ============================================================================
// Profile Hooks
// ============================================================================

/**
 * Fetch parent profile with linked students
 */
export function useParentProfile() {
  return useQuery({
    queryKey: queryKeys.parentProfile,
    queryFn: () => parentApi.getProfile(),
    staleTime: STALE_TIMES.medium,
    retry: 3,
  });
}

// ============================================================================
// Student Summary Hooks
// ============================================================================

/**
 * Fetch student summary for dashboard
 */
export function useStudentSummary(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.studentSummary(studentId || ''),
    queryFn: () => {
      if (!studentId) throw new Error('No student selected');
      return parentApi.getStudentSummary(studentId);
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.short,
    retry: 3,
  });
}

/**
 * Fetch weekly summary
 */
export function useWeeklySummary(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.weeklySummary(studentId || ''),
    queryFn: () => {
      if (!studentId) throw new Error('No student selected');
      return parentApi.getWeeklySummary(studentId);
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.medium,
    retry: 3,
  });
}

/**
 * Fetch weekly report with detailed breakdown
 */
export function useWeeklyReport(studentId: string | null, weekStart?: Date) {
  const weekStartStr = weekStart?.toISOString().split('T')[0];

  return useQuery({
    queryKey: queryKeys.weeklyReport(studentId || '', weekStartStr),
    queryFn: () => {
      if (!studentId) throw new Error('No student selected');
      return parentApi.getWeeklyReport(studentId, weekStartStr);
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.long,
    retry: 3,
  });
}

// ============================================================================
// Activity & Progress Hooks
// ============================================================================

/**
 * Fetch activity timeline for a student
 */
export function useActivityTimeline(studentId: string | null, limit?: number) {
  return useQuery({
    queryKey: [...queryKeys.activityTimeline(studentId || ''), limit],
    queryFn: async () => {
      if (!studentId) throw new Error('No student selected');
      const data = await parentApi.getActivityTimeline(studentId, limit);
      return data.activities;
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.short,
    retry: 3,
  });
}

/**
 * Fetch all activities for activity page
 */
export function useActivities(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.activities(studentId || ''),
    queryFn: async () => {
      if (!studentId) throw new Error('No student selected');
      // Activity page uses timeline with no limit
      const data = await parentApi.getActivityTimeline(studentId);
      return data.activities;
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.short,
    retry: 3,
  });
}

/**
 * Fetch upcoming milestones
 */
export function useMilestones(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.milestones(studentId || ''),
    queryFn: async () => {
      if (!studentId) throw new Error('No student selected');
      const data = await parentApi.getMilestones(studentId);
      return data.milestones;
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.medium,
    retry: 3,
  });
}

/**
 * Fetch achievements for a student
 */
export function useAchievements(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.achievements(studentId || ''),
    queryFn: async () => {
      if (!studentId) throw new Error('No student selected');
      const data = await parentApi.getAchievements(studentId);
      return data.achievements;
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.medium,
    retry: 3,
  });
}

// ============================================================================
// AI Insights Hooks
// ============================================================================

/**
 * Fetch AI-powered insights for a student
 */
export function useAIInsights(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.aiInsights(studentId || ''),
    queryFn: async () => {
      if (!studentId) throw new Error('No student selected');
      const data = await parentApi.getAIInsights(studentId);
      return data.insights;
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.long,
    retry: 3,
  });
}

/**
 * Dismiss an AI insight
 */
export function useDismissInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, insightId }: { studentId: string; insightId: string }) =>
      parentApi.dismissInsight(insightId, studentId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiInsights(variables.studentId) });
    },
  });
}

// ============================================================================
// Homework Hooks
// ============================================================================

/**
 * Fetch homework sessions for a student
 */
export function useHomeworkSessions(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.homeworkSessions(studentId || ''),
    queryFn: () => {
      if (!studentId) throw new Error('No student selected');
      return parentApi.getHomeworkSessions(studentId);
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.short,
    retry: 3,
  });
}

// ============================================================================
// Messages Hooks
// ============================================================================

/**
 * Fetch message previews for dashboard
 */
export function useMessages() {
  return useQuery({
    queryKey: queryKeys.messages,
    queryFn: async () => {
      const data = await parentApi.getMessages();
      return data.conversations;
    },
    staleTime: STALE_TIMES.short,
    retry: 3,
  });
}

/**
 * Fetch conversations list
 */
export function useConversations(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.conversations(includeArchived),
    queryFn: () => parentApi.getConversations(includeArchived),
    staleTime: STALE_TIMES.short,
    refetchInterval: 30000, // Poll every 30 seconds for new messages
    retry: 3,
  });
}

/**
 * Fetch messages in a conversation
 */
export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.conversationMessages(conversationId || ''),
    queryFn: () => {
      if (!conversationId) throw new Error('No conversation selected');
      return parentApi.getConversationMessages(conversationId);
    },
    enabled: !!conversationId,
    staleTime: STALE_TIMES.short,
    refetchInterval: 10000, // Poll every 10 seconds for new messages
    retry: 3,
  });
}

/**
 * Send a message in a conversation
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      parentApi.sendMessage(conversationId, content),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversationMessages(variables.conversationId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    },
  });
}

/**
 * Create a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      teacherId: string;
      studentId: string;
      subject: string;
      message?: string;
    }) => parentApi.createConversation(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    },
  });
}

/**
 * Mark conversation as read
 */
export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => parentApi.markConversationRead(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    },
  });
}

// ============================================================================
// Difficulty Hooks
// ============================================================================

/**
 * Fetch difficulty recommendations
 */
export function useDifficultyRecommendations(studentId: string | null) {
  return useQuery({
    queryKey: queryKeys.difficultyRecommendations(studentId || ''),
    queryFn: async () => {
      if (!studentId) throw new Error('No student selected');
      const data = await parentApi.getDifficultyRecommendations(studentId);
      return data.recommendations;
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.medium,
    retry: 3,
  });
}

/**
 * Respond to a difficulty recommendation
 */
export function useRespondToRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      recommendationId: string;
      action: 'approve' | 'modify' | 'deny';
      modifiedLevel?: number;
      parentNotes?: string;
    }) => parentApi.respondToRecommendation(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['difficulty-recommendations'] });
    },
  });
}

// ============================================================================
// Children Hooks
// ============================================================================

/**
 * Fetch enhanced children data with status and progress
 */
export function useChildrenEnhanced() {
  return useQuery({
    queryKey: queryKeys.childrenEnhanced,
    queryFn: async () => {
      const data = await parentApi.getChildrenEnhanced();
      return data.children;
    },
    staleTime: STALE_TIMES.short,
    refetchInterval: 60000, // Poll every minute for live status
    retry: 3,
  });
}

/**
 * Fetch children with their teachers (for new message compose)
 */
export function useChildrenWithTeachers() {
  return useQuery({
    queryKey: queryKeys.childrenWithTeachers,
    queryFn: async () => {
      const data = await parentApi.getChildrenWithTeachers();
      return data.children;
    },
    staleTime: STALE_TIMES.long,
    retry: 3,
  });
}

// ============================================================================
// Parental Controls Hooks
// ============================================================================

/**
 * Fetch parental controls for a child
 */
export function useParentalControls(childId: string | null) {
  return useQuery({
    queryKey: queryKeys.parentalControls(childId || ''),
    queryFn: () => {
      if (!childId) throw new Error('No child selected');
      return parentApi.getParentalControls(childId);
    },
    enabled: !!childId,
    staleTime: STALE_TIMES.medium,
    retry: 3,
  });
}

/**
 * Update parental controls section
 */
export function useUpdateParentalControls<K extends keyof ParentalControls>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      childId,
      section,
      settings,
    }: {
      childId: string;
      section: K;
      settings: ParentalControls[K];
    }) => parentApi.updateParentalControls(childId, section, settings),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.parentalControls(variables.childId),
      });
    },
  });
}

// ============================================================================
// Reports Hooks
// ============================================================================

/**
 * Fetch comprehensive progress report
 */
export function useProgressReport(
  studentId: string | null,
  dateRange?: { start: string; end: string }
) {
  return useQuery({
    queryKey: queryKeys.progressReport(studentId || '', dateRange),
    queryFn: () => {
      if (!studentId) throw new Error('No student selected');
      return parentApi.getProgressReport(studentId, dateRange);
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.long,
    retry: 3,
  });
}

/**
 * Download progress report as PDF
 */
export function useDownloadReport() {
  return useMutation({
    mutationFn: ({
      studentId,
      studentName,
      dateRange,
    }: {
      studentId: string;
      studentName: string;
      dateRange?: { start: string; end: string };
    }) => parentApi.downloadProgressReportPDF(studentId, studentName, dateRange),
  });
}

/**
 * Share weekly report via email
 */
export function useShareWeeklyReport() {
  return useMutation({
    mutationFn: ({
      studentId,
      weekStart,
      recipientEmail,
    }: {
      studentId: string;
      weekStart: string;
      recipientEmail?: string;
    }) => parentApi.shareWeeklyReport(studentId, weekStart, recipientEmail),
  });
}

// ============================================================================
// Settings Hooks
// ============================================================================

/**
 * Update student settings (e.g., daily goal)
 */
export function useUpdateDailyGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, goalMinutes }: { studentId: string; goalMinutes: number }) =>
      parentApi.updateStudentSettings(studentId, { dailyGoalMinutes: goalMinutes }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.studentSummary(variables.studentId),
      });
    },
  });
}

/**
 * Mark messages as read (legacy)
 */
export function useMarkMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => parentApi.markConversationRead(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages });
    },
  });
}

// ============================================================================
// Gamification Hooks (Sprint 3.1)
// ============================================================================

import { gamificationApi } from '@/lib/api/gamification.api';

/** Extended query keys for gamification */
export const gamificationQueryKeys = {
  achievements: (studentId: string) => ['gamification', 'achievements', studentId] as const,
  studentTeam: (studentId: string) => ['gamification', 'team', studentId] as const,
  teamDetails: (teamId: string) => ['gamification', 'team-details', teamId] as const,
  leaderboard: (studentId: string, scope: string, timeFrame: string) =>
    ['gamification', 'leaderboard', studentId, scope, timeFrame] as const,
  competitions: (studentId: string) => ['gamification', 'competitions', studentId] as const,
  privacySettings: (studentId: string) => ['gamification', 'privacy-settings', studentId] as const,
} as const;

/**
 * Fetch achievements for a student from gamification service
 */
export function useGamificationAchievements(studentId: string | null) {
  return useQuery({
    queryKey: gamificationQueryKeys.achievements(studentId || ''),
    queryFn: () => {
      if (!studentId) throw new Error('No student selected');
      return gamificationApi.getAchievements(studentId);
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.medium,
    retry: 3,
  });
}

/**
 * Fetch student's team
 */
export function useStudentTeam(studentId: string | null) {
  return useQuery({
    queryKey: gamificationQueryKeys.studentTeam(studentId || ''),
    queryFn: () => {
      if (!studentId) throw new Error('No student selected');
      return gamificationApi.getStudentTeam(studentId);
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.medium,
    retry: 3,
  });
}

/**
 * Fetch team details including members
 */
export function useTeamDetails(teamId: string | null) {
  return useQuery({
    queryKey: gamificationQueryKeys.teamDetails(teamId || ''),
    queryFn: () => {
      if (!teamId) throw new Error('No team specified');
      return gamificationApi.getTeamDetails(teamId);
    },
    enabled: !!teamId,
    staleTime: STALE_TIMES.medium,
    retry: 3,
  });
}

/**
 * Fetch leaderboard data
 */
export function useLeaderboard(options?: {
  scope?: 'class' | 'school' | 'global';
  period?: 'daily' | 'weekly' | 'monthly' | 'allTime';
  limit?: number;
  schoolId?: string;
  classId?: string;
}) {
  const scope = options?.scope || 'class';
  const period = options?.period || 'weekly';

  return useQuery({
    queryKey: gamificationQueryKeys.leaderboard('', scope, period),
    queryFn: () => {
      return gamificationApi.getLeaderboard({
        scope: scope,
        period: period,
        limit: options?.limit,
        schoolId: options?.schoolId,
        classId: options?.classId,
      });
    },
    staleTime: STALE_TIMES.short,
    retry: 3,
  });
}

/**
 * Fetch active competitions
 */
export function useActiveCompetitions(studentId: string | null) {
  return useQuery({
    queryKey: gamificationQueryKeys.competitions(studentId || ''),
    queryFn: () => {
      if (!studentId) throw new Error('No student selected');
      return gamificationApi.getActiveCompetitions({ studentId });
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.medium,
    retry: 3,
  });
}

/**
 * Fetch privacy settings for gamification
 */
export function useGamificationPrivacySettings(studentId: string | null) {
  return useQuery({
    queryKey: gamificationQueryKeys.privacySettings(studentId || ''),
    queryFn: () => {
      if (!studentId) throw new Error('No student selected');
      return gamificationApi.getPrivacySettings(studentId);
    },
    enabled: !!studentId,
    staleTime: STALE_TIMES.long,
    retry: 3,
  });
}

/**
 * Update privacy settings for gamification
 */
export function useUpdateGamificationPrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      studentId,
      settings,
    }: {
      studentId: string;
      settings: {
        showOnLeaderboard?: boolean;
        showProfileToOthers?: boolean;
        allowTeamInvites?: boolean;
        showAchievements?: boolean;
      };
    }) => gamificationApi.updatePrivacySettings(studentId, settings),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: gamificationQueryKeys.privacySettings(variables.studentId),
      });
    },
  });
}

/**
 * Join a team
 */
export function useJoinTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, teamId }: { studentId: string; teamId: string }) =>
      gamificationApi.joinTeam(studentId, teamId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: gamificationQueryKeys.studentTeam(variables.studentId),
      });
    },
  });
}

/**
 * Leave current team
 */
export function useLeaveTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, teamId }: { studentId: string; teamId: string }) =>
      gamificationApi.leaveTeam(studentId, teamId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: gamificationQueryKeys.studentTeam(variables.studentId),
      });
    },
  });
}

/**
 * Join a competition
 */
export function useJoinCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      studentId,
      competitionId,
      participantId,
    }: {
      studentId: string;
      competitionId: string;
      participantId?: string;
    }) =>
      gamificationApi.joinCompetition(competitionId, studentId, {
        participantId,
      }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: gamificationQueryKeys.competitions(variables.studentId),
      });
    },
  });
}
