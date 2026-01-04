'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import type { TeamLeaderboardProps, Team } from './types';

/**
 * TeamLeaderboard Component
 *
 * Displays a ranked leaderboard of teams.
 */
export function TeamLeaderboard({
  teams,
  highlightTop = 3,
  userTeamId,
  animated = true,
  className,
}: TeamLeaderboardProps) {
  const rankBadges: Record<number, { emoji: string; bg: string; text: string }> = {
    1: {
      emoji: '🥇',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-200',
    },
    2: {
      emoji: '🥈',
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-800 dark:text-gray-200',
    },
    3: {
      emoji: '🥉',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-200',
    },
  };

  // Sort teams by score
  const sortedTeams = React.useMemo(() => {
    return [...teams].sort((a, b) => b.totalScore - a.totalScore);
  }, [teams]);

  return (
    <div
      className={cn(
        'rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      {/* Header */}
      <div className="border-b px-4 py-3 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Leaderboard</h3>
      </div>

      {/* List */}
      <div className="divide-y dark:divide-gray-700">
        {sortedTeams.map((team, index) => {
          const rank = index + 1;
          const isTopRank = rank <= highlightTop;
          const isUserTeam = team.id === userTeamId;
          const badge = rankBadges[rank];

          return (
            <div
              key={team.id}
              className={cn(
                'flex items-center gap-4 px-4 py-3 transition-colors',
                isUserTeam && 'bg-primary-50 dark:bg-primary-900/20',
                animated && 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              {/* Rank */}
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold',
                  isTopRank && badge ? badge.bg : 'bg-gray-100 dark:bg-gray-700',
                  isTopRank && badge ? badge.text : 'text-gray-600 dark:text-gray-300'
                )}
              >
                {isTopRank && badge ? badge.emoji : rank}
              </div>

              {/* Team info */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl"
                  style={{ backgroundColor: team.color + '20' }}
                >
                  {team.iconEmoji}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-gray-900 dark:text-white">
                      {team.name}
                    </span>
                    {isUserTeam && (
                      <span className="flex-shrink-0 rounded bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{team.members.length} members</span>
                    {team.streakDays > 0 && (
                      <span className="flex items-center gap-0.5">
                        <span className="text-orange-500">🔥</span>
                        {team.streakDays}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="font-bold text-gray-900 dark:text-white">
                  {team.totalScore.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">points</div>
              </div>
            </div>
          );
        })}
      </div>

      {teams.length === 0 && (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">No teams to display</div>
      )}
    </div>
  );
}
