'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import type { AdaptiveGameCardProps, GameDifficulty } from './types';

/**
 * AdaptiveGameCard Component
 *
 * Displays a card for an adaptive learning game with difficulty indicator
 * and subject/skill badges.
 */
export function AdaptiveGameCard({
  gameId,
  title,
  description,
  type,
  difficulty,
  thumbnailUrl,
  isLocked = false,
  subject,
  skills = [],
  duration,
  onClick,
  className,
}: AdaptiveGameCardProps) {
  const difficultyColors: Record<GameDifficulty, string> = {
    easy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    hard: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    adaptive: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };

  const gameTypeIcons: Record<string, string> = {
    memory: '🧠',
    pattern: '🔷',
    sorting: '📊',
    matching: '🔗',
    sequencing: '🔢',
    focus: '🎯',
    breathing: '💨',
    mindfulness: '🧘',
  };

  return (
    <button
      onClick={isLocked ? undefined : onClick}
      disabled={isLocked}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all',
        'hover:shadow-md hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500',
        'dark:bg-gray-800 dark:border-gray-700',
        isLocked && 'opacity-60 cursor-not-allowed',
        className
      )}
      aria-label={`Play ${title}`}
      data-game-id={gameId}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">
            {gameTypeIcons[type] || '🎮'}
          </div>
        )}

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-3xl">🔒</span>
          </div>
        )}

        {/* Duration badge */}
        {duration && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
            {duration} min
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          {/* Difficulty badge */}
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
              difficultyColors[difficulty]
            )}
          >
            {difficulty}
          </span>

          {/* Subject badge */}
          {subject && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {subject}
            </span>
          )}
        </div>

        <h3 className="mb-1 text-left text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="mb-3 line-clamp-2 text-left text-sm text-gray-600 dark:text-gray-300">
          {description}
        </p>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1">
            {skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                +{skills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
