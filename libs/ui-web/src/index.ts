export { createGradeThemePlugin } from './tailwind/gradeThemePlugin';
export { GradeThemeProvider, useGradeTheme } from './theme/grade-theme';
export { AccessibilityProvider, useAccessibility } from './theme/accessibility';
export type { GradeBand } from './theme/tokens';

export { Button } from './components/button';
export { Card } from './components/card';
export { Badge } from './components/badge';
export { Heading } from './components/heading';
export { GradeThemeToggle } from './components/grade-theme-toggle';

// AI Components
export { LessonGenerator, AITutorChat, AIFeedback } from './components/ai';
export type { LessonGeneratorProps, AITutorChatProps, AIFeedbackProps } from './components/ai';

// Scratch Pad Components
export {
  ScratchPadCanvas,
  useScratchPad,
  ScratchPadProvider,
  useScratchPadContext,
  ScratchPadModal,
  ScratchPadDrawer,
  ScratchPadFAB,
  InlineScratchPad,
  useScratchPadPopup,
  MathQuestionWithScratchPad,
  MathActivityWithScratchPad,
} from './components/scratch-pad';
export type {
  ScratchPadCanvasProps,
  ScratchPadCanvasRef,
  UseScratchPadOptions,
  ScratchPadState,
  ScratchPadActions,
  ScratchPadProviderProps,
  ScratchPadModalProps,
  ScratchPadDrawerProps,
  ScratchPadFABProps,
  InlineScratchPadProps,
  UseScratchPadPopupReturn,
  MathQuestion,
  MathQuestionWithScratchPadProps,
  MathActivityWithScratchPadProps,
} from './components/scratch-pad';

// Games Components - Adaptive Games and Focus Games
export {
  AdaptiveGameCard,
  AdaptiveGameGrid,
  FocusGameCard,
  FocusGamePlayer,
  GameProgressTracker,
  GameDifficultySelector,
} from './components/games';
export type {
  AdaptiveGameCardProps,
  AdaptiveGameGridProps,
  FocusGameCardProps,
  FocusGamePlayerProps,
  GameProgressTrackerProps,
  GameDifficultySelectorProps,
  GameType,
  GameDifficulty,
  GameSession,
  FocusMetrics,
} from './components/games';

// Gamification Components - Teams and Competitions
export {
  TeamCard,
  TeamGrid,
  TeamLeaderboard,
  CompetitionCard,
  CompetitionBracket,
  TeamChallengeCreator,
  TeamProgressWidget,
} from './components/gamification';
export type {
  TeamCardProps,
  TeamGridProps,
  TeamLeaderboardProps,
  CompetitionCardProps,
  CompetitionBracketProps,
  TeamChallengeCreatorProps,
  TeamProgressWidgetProps,
  Team,
  TeamMember,
  Competition,
  CompetitionStatus,
} from './components/gamification';

// Notification Components
export {
  NotificationCenter,
  NotificationItem,
  NotificationFilters,
  NotificationBadge,
  NotificationPreferences,
  WebPushProvider,
  WebPushManager,
  NotificationApiClient,
} from './components/notifications';
