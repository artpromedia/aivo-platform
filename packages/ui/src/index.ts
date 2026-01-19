// =============================================================================
// @aivo/ui - Shared UI Component Library
// =============================================================================

// Components
export * from './components';

// Hooks
export * from './hooks';

// Utilities
export * from './utils';

// Types
export type {
  // Game Types
  GameType,
  GameDifficulty,
  GameCategory,
  DailyChallenge,
  // Focus Types
  FocusMode,
  FocusState,
  TimerState,
  FocusSession,
  FocusDistraction,
  FocusBreak,
  FocusPreferences,
  FocusStats,
  // Assessment Types
  AssessmentDomain,
  GradeBand,
  QuestionType,
  AssessmentQuestion,
  DomainInfo,
  DomainScore,
  AssessmentResult,
  AssessmentPhase,
  // Progress Types
  ProgressMetrics,
  DailyGoal,
  LearningLesson,
  Achievement,
  UpcomingItem,
  // Subject Types
  SubjectInfo,
  // Common Types
  BaseComponentProps,
  ThemeVariant,
  ThemedComponentProps,
} from './types';
