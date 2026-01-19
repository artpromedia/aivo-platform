// =============================================================================
// Re-export shared components from @aivo/ui
// =============================================================================

// This file re-exports components from the shared @aivo/ui package
// for easier imports within the web-learner app.

// GamePicker
export {
  GamePicker,
  GameCard,
  type GamePickerProps,
  type GameCardProps,
} from '@aivo/ui/components';

// FocusTimer
export {
  FocusTimer,
  FocusModeSelector,
  BreakActivities,
  type FocusTimerProps,
  type FocusModeSelectorProps,
  type BreakActivitiesProps,
} from '@aivo/ui/components';

// SubjectCard
export {
  SubjectCard,
  type SubjectCardProps,
} from '@aivo/ui/components';

// ProgressDashboard
export {
  ProgressDashboard,
  GoalProgress,
  LearningCard,
  AchievementBadge,
  StreakDisplay,
  type ProgressDashboardProps,
  type GoalProgressProps,
  type LearningCardProps,
  type AchievementBadgeProps,
  type StreakDisplayProps,
} from '@aivo/ui/components';

// Assessment
export {
  AssessmentFlow,
  AssessmentCard,
  QuestionRenderer,
  ProgressIndicator,
  GameBreak,
  type AssessmentFlowProps,
  type AssessmentCardProps,
  type QuestionRendererProps,
  type ProgressIndicatorProps,
  type GameBreakProps,
} from '@aivo/ui/components';

// Re-export types
export type {
  GameType,
  GameDifficulty,
  GameCategory,
  FocusMode,
  FocusState,
  FocusSession,
  FocusPreferences,
  AssessmentDomain,
  AssessmentQuestion,
  DomainInfo,
  DailyGoal,
  LearningLesson,
  Achievement,
  SubjectInfo,
  ThemeVariant,
} from '@aivo/ui';
