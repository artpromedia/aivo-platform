'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import { AdaptiveGameCard } from './AdaptiveGameCard';
import type { AdaptiveGameGridProps } from './types';

/**
 * AdaptiveGameGrid Component
 *
 * Displays a filterable grid of adaptive learning games.
 */
export function AdaptiveGameGrid({
  games,
  isLoading = false,
  subjectFilter,
  typeFilter,
  onGameSelect,
  className,
}: AdaptiveGameGridProps) {
  // Filter games based on filters
  const filteredGames = React.useMemo(() => {
    return games.filter((game) => {
      if (subjectFilter && game.subject !== subjectFilter) return false;
      if (typeFilter && game.type !== typeFilter) return false;
      return true;
    });
  }, [games, subjectFilter, typeFilter]);

  if (isLoading) {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    );
  }

  if (filteredGames.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12',
          'border-gray-200 dark:border-gray-700',
          className
        )}
      >
        <span className="mb-2 text-4xl">🎮</span>
        <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-white">No games found</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Try adjusting your filters or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
      {filteredGames.map((game) => (
        <AdaptiveGameCard key={game.gameId} {...game} onClick={() => onGameSelect?.(game.gameId)} />
      ))}
    </div>
  );
}
