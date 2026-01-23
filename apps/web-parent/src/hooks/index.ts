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

  // Reports
  useProgressReport,
  useDownloadReport,
  useShareWeeklyReport,

  // Settings
  useUpdateDailyGoal,
  useMarkMessagesRead,
} from './use-parent-data';

// Community Support Hooks
export * from './use-community-support';

// Resource Library Hooks
export * from './use-resource-library';
