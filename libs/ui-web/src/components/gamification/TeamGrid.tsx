'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import { TeamCard } from './TeamCard';
import type { TeamGridProps } from './types';

/**
 * TeamGrid Component
 *
 * Displays a grid of team cards.
 */
export function TeamGrid({
  teams,
  isLoading = false,
  userTeamId,
  onTeamSelect,
  className,
}: TeamGridProps) {
  // Sort teams by rank
  const sortedTeams = React.useMemo(() => {
    return [...teams].sort((a, b) => a.rank - b.rank);
  }, [teams]);

  if (isLoading) {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12',
          'border-gray-200 dark:border-gray-700',
          className
        )}
      >
        <span className="mb-2 text-4xl">👥</span>
        <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-white">No teams yet</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Teams will appear here once they are created.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {sortedTeams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          isUserTeam={team.id === userTeamId}
          onClick={() => onTeamSelect?.(team.id)}
        />
      ))}
    </div>
  );
}
