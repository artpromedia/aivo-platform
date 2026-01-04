'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import type { FocusGameCardProps } from './types';

/**
 * FocusGameCard Component
 *
 * Displays a card for focus/regulation activities like breathing exercises.
 */
export function FocusGameCard({
  gameId,
  title,
  description,
  activityType,
  duration,
  thumbnailUrl,
  isRecommended = false,
  onClick,
  className,
}: FocusGameCardProps) {
  const activityIcons: Record<string, string> = {
    breathing: '💨',
    mindfulness: '🧘',
    movement: '🏃',
    grounding: '🌳',
  };

  const activityColors: Record<string, string> = {
    breathing: 'from-blue-400 to-cyan-300',
    mindfulness: 'from-purple-400 to-pink-300',
    movement: 'from-green-400 to-emerald-300',
    grounding: 'from-amber-400 to-orange-300',
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-all',
        'hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary-500',
        'dark:bg-gray-800 dark:border-gray-700',
        isRecommended && 'ring-2 ring-green-400 ring-offset-2 dark:ring-offset-gray-900',
        className
      )}
      aria-label={`Start ${title}`}
      data-game-id={gameId}
    >
      {/* Gradient background */}
      <div
        className={cn(
          'relative flex h-32 items-center justify-center bg-gradient-to-br',
          activityColors[activityType]
        )}
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="h-full w-full object-cover opacity-80" />
        ) : (
          <span className="text-5xl drop-shadow-lg">{activityIcons[activityType]}</span>
        )}

        {/* Recommended badge */}
        {isRecommended && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white shadow-lg">
            <span>✨</span> Recommended
          </span>
        )}

        {/* Duration */}
        <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-800 shadow">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {activityType}
          </span>
        </div>

        <h3 className="mb-1 text-left text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="line-clamp-2 text-left text-sm text-gray-600 dark:text-gray-300">
          {description}
        </p>

        {/* Play button overlay on hover */}
        <div className="mt-auto flex items-center justify-center pt-3">
          <span className="flex items-center gap-2 rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Start
          </span>
        </div>
      </div>
    </button>
  );
}
