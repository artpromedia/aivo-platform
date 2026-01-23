/**
 * API Module Exports
 *
 * Central export point for all API-related functionality.
 */

// Client
export { apiClient, ApiError, setAuthTokenGetter, isDevMode } from './client';
export type { ApiErrorCode, ApiErrorDetails, RequestOptions } from './client';

// Parent API
export { parentApi } from './parent.api';
export type {
  // Profile & Children
  ParentProfile,
  Child,
  EnhancedChild,
  // Student Summary
  StudentSummary,
  SubjectProgress,
  Activity,
  Assignment,
  TeacherNote,
  Achievement,
  DailyUsage,
  // Weekly
  WeeklySummary,
  WeeklyReport,
  // Homework
  HomeworkSession,
  // Messages
  Message,
  Conversation,
  ConversationMessage,
  // Difficulty
  DifficultyRecommendation,
  // AI
  AIInsight,
  TimelineActivity,
  Milestone,
  // Controls
  ParentalControls,
  NotificationSettings,
  SafetySettings,
  // Reports
  ProgressReport,
} from './parent.api';

// Community Support API
export * from './community-support-api';

// Resource Library API
export * from './resource-library-api';
