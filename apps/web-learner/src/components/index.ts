// =============================================================================
// Re-export shared components from @aivo/ui-web
// =============================================================================

// This file re-exports components and creates stubs for ones not yet available
// in the shared @aivo/ui-web package.

import React from 'react';

// Re-export games components from ui-web
export {
  AdaptiveGameCard,
  AdaptiveGameGrid,
  FocusGameCard,
  FocusGamePlayer,
  GameProgressTracker,
  GameDifficultySelector,
  type AdaptiveGameCardProps,
  type AdaptiveGameGridProps,
  type FocusGameCardProps,
  type FocusGamePlayerProps,
  type GameProgressTrackerProps,
  type GameDifficultySelectorProps,
  type GameType,
  type GameDifficulty,
  type GameSession,
} from '@aivo/ui-web';

// Re-export common UI components
export {
  Button,
  Card,
  Badge,
  Progress,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@aivo/ui-web';

// Re-export theme utilities
export { GradeThemeProvider, useGradeTheme } from '@aivo/ui-web';
export type { GradeBand } from '@aivo/ui-web';

// Placeholder types for components not yet implemented
export type GamePickerProps = Record<string, unknown>;
export type GameCardProps = Record<string, unknown>;
export type FocusTimerProps = Record<string, unknown>;
export type FocusModeSelectorProps = Record<string, unknown>;
export type BreakActivitiesProps = Record<string, unknown>;
export type SubjectCardProps = Record<string, unknown>;
export type ProgressDashboardProps = Record<string, unknown>;
export type GoalProgressProps = Record<string, unknown>;
export type LearningCardProps = Record<string, unknown>;
export type AchievementBadgeProps = Record<string, unknown>;
export type StreakDisplayProps = Record<string, unknown>;
export type AssessmentFlowProps = Record<string, unknown>;
export type AssessmentCardProps = Record<string, unknown>;
export type QuestionRendererProps = Record<string, unknown>;
export type ProgressIndicatorProps = Record<string, unknown>;
export type GameBreakProps = Record<string, unknown>;
export type GameCategory = string;
export type FocusMode = string;
export type FocusState = string;
export type FocusSession = Record<string, unknown>;
export type FocusPreferences = Record<string, unknown>;
export type AssessmentDomain = string;
export type AssessmentQuestion = Record<string, unknown>;
export type DomainInfo = Record<string, unknown>;
export type DailyGoal = Record<string, unknown>;
export type LearningLesson = Record<string, unknown>;
export type Achievement = Record<string, unknown>;
export type SubjectInfo = Record<string, unknown>;
export type ThemeVariant = string;

// Placeholder components for those not yet implemented
export const GamePicker: React.FC<GamePickerProps> = () => null;
export const GameCard: React.FC<GameCardProps> = () => null;
export const FocusTimer: React.FC<FocusTimerProps> = () => null;
export const FocusModeSelector: React.FC<FocusModeSelectorProps> = () => null;
export const BreakActivities: React.FC<BreakActivitiesProps> = () => null;
export const SubjectCard: React.FC<SubjectCardProps> = () => null;
export const ProgressDashboard: React.FC<ProgressDashboardProps> = () => null;
export const GoalProgress: React.FC<GoalProgressProps> = () => null;
export const LearningCard: React.FC<LearningCardProps> = () => null;
export const AchievementBadge: React.FC<AchievementBadgeProps> = () => null;
export const StreakDisplay: React.FC<StreakDisplayProps> = () => null;
export const AssessmentFlow: React.FC<AssessmentFlowProps> = () => null;
export const AssessmentCard: React.FC<AssessmentCardProps> = () => null;
export const QuestionRenderer: React.FC<QuestionRendererProps> = () => null;
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = () => null;
export const GameBreak: React.FC<GameBreakProps> = () => null;
