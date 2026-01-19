'use client';

import { cn } from '../../utils';
import type { FocusModeSelectorProps } from './types';
import type { FocusMode } from '../../types';

interface ModeOption {
  mode: FocusMode;
  emoji: string;
  title: string;
  getDescription: (prefs: { pomodoroWorkMinutes: number; pomodoroBreakMinutes: number; customWorkMinutes: number; customBreakMinutes: number }) => string;
  gradientClass: string;
}

const MODES: ModeOption[] = [
  {
    mode: 'pomodoro',
    emoji: '🍅',
    title: 'Pomodoro',
    getDescription: (p) => `${p.pomodoroWorkMinutes} min work, ${p.pomodoroBreakMinutes} min break`,
    gradientClass: 'from-red-500 to-orange-500',
  },
  {
    mode: 'custom',
    emoji: '⚙️',
    title: 'Custom',
    getDescription: (p) => `${p.customWorkMinutes} min work, ${p.customBreakMinutes} min break`,
    gradientClass: 'from-blue-500 to-purple-500',
  },
  {
    mode: 'deep-work',
    emoji: '🎯',
    title: 'Deep Work',
    getDescription: () => '90 min intensive focus',
    gradientClass: 'from-purple-600 to-pink-600',
  },
];

/**
 * FocusModeSelector Component
 *
 * Allows users to select between Pomodoro, Custom, and Deep Work modes.
 */
export function FocusModeSelector({
  selectedMode,
  preferences,
  onSelectMode,
  className,
}: FocusModeSelectorProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      {MODES.map(({ mode, emoji, title, getDescription, gradientClass }) => {
        const isSelected = selectedMode === mode;

        return (
          <button
            key={mode}
            onClick={() => onSelectMode(mode)}
            className={cn(
              'rounded-xl p-6 text-left transition',
              isSelected
                ? `bg-gradient-to-br ${gradientClass} text-white shadow-lg`
                : 'bg-white text-slate-900 shadow hover:shadow-md'
            )}
          >
            <div className="text-3xl">{emoji}</div>
            <h3 className="mt-3 font-bold">{title}</h3>
            <p
              className={cn(
                'mt-1 text-sm',
                isSelected ? 'text-white/90' : 'text-slate-600'
              )}
            >
              {getDescription(preferences)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
