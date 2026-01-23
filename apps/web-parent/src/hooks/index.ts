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
