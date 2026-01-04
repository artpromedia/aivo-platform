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
