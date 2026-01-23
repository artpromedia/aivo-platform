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

// Reports API
export {
  reportsApi,
  downloadBlob,
  generateReportFilename,
  generateMockProgressSummary,
} from './reports.api';
export type {
  DateRange,
  ReportOptions,
  ProgressSummary,
  ProgressPeriod,
  SubjectSummary,
  SubjectReport,
  StandardMastery,
  RecentLesson,
  SkillAnalysis,
  ActivityTimeline,
  TimelineActivity as ReportTimelineActivity,
  DailySummary,
  AssessmentHistory,
  Assessment as ReportAssessment,
  AssessmentSummary,
  TimeOnTaskReport,
  DailyTimeEntry,
  SubjectTimeEntry,
  ActivityTimeEntry,
  StrengthWeaknessAnalysis,
  SkillProfile,
  ExportFormat,
  ExportOptions,
} from './reports.api';

// Community Support API
export * from './community-support-api';

// Resource Library API
export * from './resource-library-api';

// Messaging API (Sprint 1.8)
export { messagingApi } from './messaging.api';
export type {
  Participant,
  StudentContext,
  Attachment,
  Message as MessagingMessage,
  Conversation as MessagingConversation,
  MessagePage,
  ConversationsPage,
  GetMessagesOptions,
  GetConversationsOptions,
  SendMessagePayload,
  CreateConversationPayload,
  Teacher as MessagingTeacher,
  ChildWithTeachers,
  TypingIndicator,
  ReadReceipt,
  UnreadCounts,
} from './messaging.api';

// Gamification API (Sprint 3.1)
export { gamificationApi } from './gamification.api';
export * from './gamification.api';

// AI API (Sprint 3.2)
export { aiApi } from './ai.api';
export * from './ai.api';

// Analytics API (Sprint 3.3)
export { analyticsApi } from './analytics.api';
export * from './analytics.api';

// Settings API (Sprint 3.4)
export { settingsApi } from './settings.api';
export * from './settings.api';
