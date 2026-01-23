/**
 * Hooks Module Exports
 *
 * Re-export all hooks for convenient importing.
 */

// Parent Data Hooks
export {
  // Query Keys
  queryKeys,

  // Profile
  useParentProfile,

  // Student Summary
  useStudentSummary,
  useWeeklySummary,
  useWeeklyReport,

  // Activities & Progress
  useActivityTimeline,
  useActivities,
  useMilestones,
  useAchievements,

  // AI Insights
  useAIInsights,
  useDismissInsight,

  // Homework
  useHomeworkSessions,

  // Messages
  useMessages,
  useConversations,
  useConversationMessages,
  useSendMessage,
  useCreateConversation,
  useMarkConversationRead,

  // Difficulty
  useDifficultyRecommendations,
  useRespondToRecommendation,

  // Children
  useChildrenEnhanced,
  useChildrenWithTeachers,

  // Controls
  useParentalControls,
  useUpdateParentalControls,

  // Reports (legacy)
  useProgressReport,
  useDownloadReport,
  useShareWeeklyReport,

  // Settings
  useUpdateDailyGoal,
  useMarkMessagesRead,

  // Gamification (Sprint 3.1)
  gamificationQueryKeys,
  useGamificationAchievements,
  useStudentTeam,
  useTeamDetails,
  useLeaderboard,
  useActiveCompetitions,
  useGamificationPrivacySettings,
  useUpdateGamificationPrivacy,
  useJoinTeam,
  useLeaveTeam,
  useJoinCompetition,
} from './use-parent-data';

// Reports Hooks (Sprint 1.7)
export {
  reportQueryKeys,
  useProgressSummary,
  useSubjectReport,
  useActivityTimeline as useReportActivityTimeline,
  useAssessmentHistory,
  useTimeOnTaskReport,
  useStrengthWeaknessAnalysis,
  useComprehensiveReport,
  useReportExport,
  usePDFExport,
  useCSVExport,
  usePrefetchProgressSummary,
} from './use-reports';

// Community Support Hooks
export * from './use-community-support';

// Resource Library Hooks
export * from './use-resource-library';

// Real-time Messaging Hooks (Sprint 1.8)
export {
  // Query Keys
  messagingQueryKeys,
  // Combined Hook
  useMessaging,
  // Individual Hooks
  useConversations as useMessagingConversations,
  useConversation,
  useMessages as useMessagingMessages,
  useInfiniteMessages,
  useSendMessage as useMessagingSendMessage,
  useMarkAsRead,
  useCreateConversation as useMessagingCreateConversation,
  useArchiveConversation,
  useUnarchiveConversation,
  useMuteConversation,
  useDeleteMessage,
  useEditMessage,
  useUnreadCounts,
  useChildrenWithTeachers as useMessagingChildrenWithTeachers,
  useSearchMessages,
} from './use-messaging';

export type {
  Conversation as MessagingConversation,
  Message as MessagingMessage,
  ConnectionState,
  TypingIndicator,
} from './use-messaging';
