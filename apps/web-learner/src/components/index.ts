// =============================================================================
// Re-export shared components from @aivo/ui-web
// =============================================================================

// This file re-exports components and creates minimal implementations
// for components not yet available in the shared @aivo/ui-web package.

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

// ─────────────────────────────────────────────────────────────
// Component prop types
// ─────────────────────────────────────────────────────────────

export interface GamePickerProps {
  readonly games?: { id: string; title: string; emoji: string; category: string }[];
  readonly onSelect?: (gameId: string) => void;
}

export interface GameCardProps {
  readonly title: string;
  readonly description?: string;
  readonly emoji?: string;
  readonly difficulty?: string;
}

export interface FocusTimerProps {
  readonly minutes?: number;
  readonly label?: string;
}

export interface FocusModeSelectorProps {
  readonly modes?: string[];
  readonly selected?: string;
  readonly onSelect?: (mode: string) => void;
}

export interface BreakActivitiesProps {
  readonly activities?: { id: string; title: string; emoji: string }[];
  readonly onSelect?: (id: string) => void;
}

export interface SubjectCardProps {
  readonly subject: string;
  readonly progress?: number;
  readonly emoji?: string;
  readonly color?: string;
}

export interface ProgressDashboardProps {
  readonly streakDays?: number;
  readonly totalXp?: number;
  readonly lessonsCompleted?: number;
}

export interface GoalProgressProps {
  readonly title: string;
  readonly progress: number;
  readonly emoji?: string;
}

export interface LearningCardProps {
  readonly title: string;
  readonly courseName?: string;
  readonly progress?: number;
  readonly emoji?: string;
}

export interface AchievementBadgeProps {
  readonly title: string;
  readonly emoji?: string;
  readonly earned?: boolean;
}

export interface StreakDisplayProps {
  readonly days?: number;
  readonly weekDays?: boolean[];
}

export interface AssessmentFlowProps {
  readonly title?: string;
  readonly totalQuestions?: number;
  readonly currentQuestion?: number;
}

export interface AssessmentCardProps {
  readonly title: string;
  readonly type?: string;
  readonly subject?: string;
  readonly emoji?: string;
  readonly dueDate?: string;
}

export interface QuestionRendererProps {
  readonly question?: string;
  readonly options?: string[];
  readonly onAnswer?: (answer: string) => void;
}

export interface ProgressIndicatorProps {
  readonly current: number;
  readonly total: number;
  readonly label?: string;
}

export interface GameBreakProps {
  readonly durationSeconds?: number;
  readonly onResume?: () => void;
  readonly activity?: string;
}

export type FocusSession = Record<string, unknown>;
export type FocusPreferences = Record<string, unknown>;
export type AssessmentQuestion = Record<string, unknown>;
export type DomainInfo = Record<string, unknown>;
export type DailyGoal = Record<string, unknown>;
export type LearningLesson = Record<string, unknown>;
export type Achievement = Record<string, unknown>;
export type SubjectInfo = Record<string, unknown>;

// ─────────────────────────────────────────────────────────────
// Minimal component implementations
// ─────────────────────────────────────────────────────────────

export const GamePicker: React.FC<GamePickerProps> = ({ games = [], onSelect }) =>
  React.createElement('div', { className: 'grid grid-cols-2 gap-3 sm:grid-cols-3' },
    games.map(g =>
      React.createElement('button', {
        key: g.id,
        onClick: () => onSelect?.(g.id),
        className: 'flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-blue-300 hover:shadow-md',
      },
        React.createElement('span', { className: 'text-3xl' }, g.emoji),
        React.createElement('span', { className: 'text-sm font-medium text-slate-700' }, g.title),
        React.createElement('span', { className: 'text-xs text-slate-400' }, g.category),
      ),
    ),
  );

export const GameCard: React.FC<GameCardProps> = ({ title, description, emoji = '🎮', difficulty }) =>
  React.createElement('div', { className: 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm' },
    React.createElement('div', { className: 'mb-2 flex items-center gap-3' },
      React.createElement('span', { className: 'text-2xl' }, emoji),
      React.createElement('div', null,
        React.createElement('h3', { className: 'font-semibold text-slate-900' }, title),
        difficulty && React.createElement('span', { className: 'text-xs text-slate-500' }, difficulty),
      ),
    ),
    description && React.createElement('p', { className: 'text-sm text-slate-600' }, description),
  );

export const FocusTimer: React.FC<FocusTimerProps> = ({ minutes = 25, label = 'Focus Time' }) =>
  React.createElement('div', { className: 'flex flex-col items-center gap-2 rounded-2xl bg-indigo-50 p-6' },
    React.createElement('span', { className: 'text-4xl font-bold text-indigo-600' }, `${minutes}:00`),
    React.createElement('span', { className: 'text-sm text-indigo-500' }, label),
  );

export const FocusModeSelector: React.FC<FocusModeSelectorProps> = ({ modes = ['Pomodoro', 'Deep Focus', 'Short Burst'], selected, onSelect }) =>
  React.createElement('div', { className: 'flex gap-2' },
    modes.map(m =>
      React.createElement('button', {
        key: m,
        onClick: () => onSelect?.(m),
        className: `rounded-full px-4 py-2 text-sm font-medium transition ${m === selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`,
      }, m),
    ),
  );

export const BreakActivities: React.FC<BreakActivitiesProps> = ({ activities = [], onSelect }) =>
  React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
    activities.map(a =>
      React.createElement('button', {
        key: a.id,
        onClick: () => onSelect?.(a.id),
        className: 'flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm transition hover:bg-green-100',
      },
        React.createElement('span', null, a.emoji),
        React.createElement('span', { className: 'text-green-700' }, a.title),
      ),
    ),
  );

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject, progress = 0, emoji = '📚', color = 'bg-blue-500' }) =>
  React.createElement('div', { className: 'rounded-xl border border-slate-200 bg-white p-4' },
    React.createElement('div', { className: 'mb-3 flex items-center gap-2' },
      React.createElement('span', { className: 'text-xl' }, emoji),
      React.createElement('span', { className: 'font-medium text-slate-900' }, subject),
    ),
    React.createElement('div', { className: 'h-2 rounded-full bg-slate-100' },
      React.createElement('div', { className: `h-full rounded-full ${color}`, style: { width: `${progress}%` } }),
    ),
    React.createElement('span', { className: 'mt-1 block text-xs text-slate-500' }, `${progress}%`),
  );

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ streakDays = 0, totalXp = 0, lessonsCompleted = 0 }) =>
  React.createElement('div', { className: 'grid grid-cols-3 gap-4' },
    React.createElement('div', { className: 'rounded-xl bg-orange-50 p-4 text-center' },
      React.createElement('div', { className: 'text-2xl font-bold text-orange-600' }, `🔥 ${streakDays}`),
      React.createElement('div', { className: 'text-xs text-orange-500' }, 'Day Streak'),
    ),
    React.createElement('div', { className: 'rounded-xl bg-purple-50 p-4 text-center' },
      React.createElement('div', { className: 'text-2xl font-bold text-purple-600' }, `⭐ ${totalXp}`),
      React.createElement('div', { className: 'text-xs text-purple-500' }, 'Total XP'),
    ),
    React.createElement('div', { className: 'rounded-xl bg-green-50 p-4 text-center' },
      React.createElement('div', { className: 'text-2xl font-bold text-green-600' }, `📚 ${lessonsCompleted}`),
      React.createElement('div', { className: 'text-xs text-green-500' }, 'Lessons Done'),
    ),
  );

export const GoalProgress: React.FC<GoalProgressProps> = ({ title, progress, emoji = '🎯' }) =>
  React.createElement('div', { className: 'rounded-xl border border-slate-200 bg-white p-3' },
    React.createElement('div', { className: 'mb-2 flex items-center justify-between' },
      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('span', null, emoji),
        React.createElement('span', { className: 'text-sm font-medium text-slate-700' }, title),
      ),
      React.createElement('span', { className: 'text-sm font-medium text-indigo-600' }, `${progress}%`),
    ),
    React.createElement('div', { className: 'h-2 rounded-full bg-slate-100' },
      React.createElement('div', { className: 'h-full rounded-full bg-indigo-500', style: { width: `${progress}%` } }),
    ),
  );

export const LearningCard: React.FC<LearningCardProps> = ({ title, courseName, progress = 0, emoji = '📖' }) =>
  React.createElement('div', { className: 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm' },
    React.createElement('div', { className: 'mb-2 flex items-center gap-3' },
      React.createElement('div', { className: 'flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-xl' }, emoji),
      React.createElement('div', null,
        React.createElement('h4', { className: 'font-medium text-slate-900' }, title),
        courseName && React.createElement('p', { className: 'text-xs text-slate-500' }, courseName),
      ),
    ),
    React.createElement('div', { className: 'h-2 rounded-full bg-slate-100' },
      React.createElement('div', { className: 'h-full rounded-full bg-blue-500', style: { width: `${progress}%` } }),
    ),
  );

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({ title, emoji = '🏆', earned = false }) =>
  React.createElement('div', {
    className: `flex flex-col items-center gap-1 rounded-xl p-3 ${earned ? 'bg-yellow-50' : 'bg-slate-100 opacity-50'}`,
    title,
  },
    React.createElement('span', { className: 'text-2xl' }, emoji),
    React.createElement('span', { className: 'text-xs text-slate-600' }, earned ? '✓' : '?'),
  );

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ days = 0, weekDays = [] }) =>
  React.createElement('div', { className: 'flex items-center gap-3 rounded-xl bg-orange-50 p-4' },
    React.createElement('div', { className: 'flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-2xl text-white' }, '🔥'),
    React.createElement('div', null,
      React.createElement('div', { className: 'text-2xl font-bold text-orange-700' }, `${days} Days`),
      React.createElement('div', { className: 'text-sm text-orange-600' }, 'Learning Streak!'),
    ),
    weekDays.length > 0 && React.createElement('div', { className: 'ml-auto flex gap-1' },
      // eslint-disable-next-line react/no-array-index-key
      weekDays.map((done, i) =>
        React.createElement('div', {
          key: `${done ? 'done' : 'todo'}-${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i] ?? i}`,
          className: `h-6 w-6 rounded-full ${done ? 'bg-orange-500' : 'bg-slate-200'}`,
        }),
      ),
    ),
  );

export const AssessmentFlow: React.FC<AssessmentFlowProps> = ({ title = 'Assessment', totalQuestions = 0, currentQuestion = 0 }) =>
  React.createElement('div', { className: 'rounded-2xl border border-slate-200 bg-white p-6' },
    React.createElement('h2', { className: 'mb-4 text-xl font-bold text-slate-900' }, title),
    React.createElement('div', { className: 'mb-2 flex items-center justify-between text-sm text-slate-500' },
      React.createElement('span', null, `Question ${currentQuestion} of ${totalQuestions}`),
      React.createElement('span', null, `${totalQuestions > 0 ? Math.round((currentQuestion / totalQuestions) * 100) : 0}%`),
    ),
    React.createElement('div', { className: 'h-2 rounded-full bg-slate-100' },
      React.createElement('div', {
        className: 'h-full rounded-full bg-emerald-500',
        style: { width: `${totalQuestions > 0 ? (currentQuestion / totalQuestions) * 100 : 0}%` },
      }),
    ),
  );

export const AssessmentCard: React.FC<AssessmentCardProps> = ({ title, type, subject, emoji = '📝', dueDate }) =>
  React.createElement('div', { className: 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm' },
    React.createElement('div', { className: 'mb-2 flex items-center gap-3' },
      React.createElement('span', { className: 'text-2xl' }, emoji),
      React.createElement('div', null,
        React.createElement('h3', { className: 'font-semibold text-slate-900' }, title),
        React.createElement('div', { className: 'flex items-center gap-2 text-xs text-slate-500' },
          type && React.createElement('span', { className: 'rounded-full bg-blue-100 px-2 py-0.5 text-blue-700' }, type),
          subject && React.createElement('span', null, subject),
        ),
      ),
    ),
    dueDate && React.createElement('p', { className: 'text-xs text-slate-500' }, `Due: ${dueDate}`),
  );

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({ question = '', options = [], onAnswer }) =>
  React.createElement('div', { className: 'space-y-4' },
    React.createElement('p', { className: 'text-lg font-medium text-slate-900' }, question),
    React.createElement('div', { className: 'space-y-2' },
      // eslint-disable-next-line react/no-array-index-key
      options.map((opt, i) =>
        React.createElement('button', {
          key: opt,
          onClick: () => onAnswer?.(opt),
          className: 'block w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm transition hover:border-blue-300 hover:bg-blue-50',
        }, `${String.fromCodePoint(65 + i)}. ${opt}`),
      ),
    ),
  );

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ current, total, label }) =>
  React.createElement('div', { className: 'flex items-center gap-3' },
    React.createElement('div', { className: 'h-2 flex-1 rounded-full bg-slate-100' },
      React.createElement('div', {
        className: 'h-full rounded-full bg-blue-500',
        style: { width: `${total > 0 ? (current / total) * 100 : 0}%` },
      }),
    ),
    React.createElement('span', { className: 'text-sm text-slate-600' }, label || `${current}/${total}`),
  );

export const GameBreak: React.FC<GameBreakProps> = ({ durationSeconds = 60, onResume, activity = 'Take a stretch break!' }) =>
  React.createElement('div', { className: 'flex flex-col items-center gap-4 rounded-2xl bg-green-50 p-8 text-center' },
    React.createElement('span', { className: 'text-4xl' }, '🧘'),
    React.createElement('h3', { className: 'text-lg font-bold text-green-800' }, 'Break Time!'),
    React.createElement('p', { className: 'text-sm text-green-700' }, activity),
    React.createElement('p', { className: 'text-2xl font-bold text-green-600' }, `${durationSeconds}s`),
    onResume && React.createElement('button', {
      onClick: onResume,
      className: 'rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700',
    }, 'Resume'),
  );
