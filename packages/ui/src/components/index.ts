// =============================================================================
// @aivo/ui Component Exports
// =============================================================================

// GamePicker
export { GamePicker, GameCard } from './GamePicker';
export type { GamePickerProps, GameCardProps } from './GamePicker/types';

// FocusTimer
export { FocusTimer, FocusModeSelector, BreakActivities } from './FocusTimer';
export type {
  FocusTimerProps,
  FocusModeSelectorProps,
  BreakActivitiesProps,
} from './FocusTimer/types';

// SubjectCard
export { SubjectCard } from './SubjectCard';
export type { SubjectCardProps } from './SubjectCard/types';

// ProgressDashboard
export {
  ProgressDashboard,
  GoalProgress,
  LearningCard,
  AchievementBadge,
  StreakDisplay,
} from './ProgressDashboard';
export type {
  ProgressDashboardProps,
  GoalProgressProps,
  LearningCardProps,
  AchievementBadgeProps,
  StreakDisplayProps,
} from './ProgressDashboard/types';

// Assessment
export {
  AssessmentFlow,
  AssessmentCard,
  QuestionRenderer,
  ProgressIndicator,
  GameBreak,
} from './Assessment';
export type {
  AssessmentFlowProps,
  AssessmentCardProps,
  QuestionRendererProps,
  ProgressIndicatorProps,
  GameBreakProps,
} from './Assessment/types';

// ErrorBoundary (Sprint 4.2)
export {
  // Error Boundary
  ErrorBoundary,
  DefaultErrorFallback,
  PageErrorFallback,
  // API Error
  ApiErrorDisplay,
  InlineError,
  // Network Error
  NetworkErrorDisplay,
  OfflineBanner,
  useNetworkStatus,
  // Retry Button
  RetryButton,
  useRetry,
  fetchWithRetry,
  // Error Reporter
  reportError,
  reportMessage,
  initErrorReporter,
  addBreadcrumb,
  setUser,
} from './ErrorBoundary';
export type {
  ErrorBoundaryProps,
  ErrorFallbackProps,
  PageErrorFallbackProps,
  ApiErrorProps,
  ApiError,
  NetworkErrorProps,
  OfflineBannerProps,
  RetryButtonProps,
  UseRetryOptions,
  FetchWithRetryOptions,
  ErrorContext,
  Breadcrumb,
} from './ErrorBoundary';
