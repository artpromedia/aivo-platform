'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import type { GameDifficultySelectorProps, GameDifficulty } from './types';

/**
 * GameDifficultySelector Component
 *
 * Allows users to select game difficulty level.
 */
export function GameDifficultySelector({
  value,
  onChange,
  availableLevels = ['easy', 'medium', 'hard', 'adaptive'],
  disableAdaptive = false,
  className,
}: GameDifficultySelectorProps) {
  const levels: { key: GameDifficulty; label: string; icon: string; description: string }[] = [
    { key: 'easy', label: 'Easy', icon: '🌱', description: 'Great for getting started' },
    { key: 'medium', label: 'Medium', icon: '🌿', description: 'A balanced challenge' },
    { key: 'hard', label: 'Hard', icon: '🌳', description: 'For advanced learners' },
    { key: 'adaptive', label: 'Adaptive', icon: '🤖', description: 'AI-adjusted difficulty' },
  ];

  const filteredLevels = levels.filter(
    (level) => availableLevels.includes(level.key) && !(disableAdaptive && level.key === 'adaptive')
  );

  return (
    <div className={cn('space-y-2', className)} role="radiogroup" aria-label="Select difficulty">
      {filteredLevels.map((level) => (
        <button
          key={level.key}
          type="button"
          role="radio"
          aria-checked={value === level.key}
          onClick={() => onChange(level.key)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-all',
            value === level.key
              ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
          )}
        >
          <span className="text-2xl">{level.icon}</span>
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white">{level.label}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{level.description}</div>
          </div>
          {value === level.key && (
            <svg className="h-5 w-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}
