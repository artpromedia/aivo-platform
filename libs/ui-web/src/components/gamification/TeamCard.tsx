'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import type { TeamCardProps } from './types';

/**
 * TeamCard Component
 *
 * Displays a team card with members and score.
 */
export function TeamCard({
  team,
  isUserTeam = false,
  showMembers = true,
  onClick,
  className,
}: TeamCardProps) {
  const rankBadges: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border-2 bg-white p-4 text-left shadow-sm transition-all',
        'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500',
        'dark:bg-gray-800',
        isUserTeam
          ? 'border-primary-400 ring-2 ring-primary-200 dark:ring-primary-800'
          : 'border-gray-200 dark:border-gray-700',
        className
      )}
      style={{ borderLeftColor: team.color, borderLeftWidth: '4px' }}
    >
      {/* Rank badge */}
      {team.rank <= 3 && (
        <span className="absolute right-2 top-2 text-2xl">{rankBadges[team.rank]}</span>
      )}

      {/* Team header */}
      <div className="mb-3 flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
          style={{ backgroundColor: team.color + '20' }}
        >
          {team.iconEmoji}
        </span>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{team.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Rank #{team.rank}</span>
            {team.streakDays > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-orange-500">🔥</span>
                {team.streakDays} day streak
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Score */}
      <div className="mb-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
        <div className="text-sm text-gray-500 dark:text-gray-400">Total Score</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {team.totalScore.toLocaleString()}
        </div>
      </div>

      {/* Members */}
      {showMembers && team.members.length > 0 && (
        <div className="mt-auto">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Members ({team.members.length})
          </div>
          <div className="flex -space-x-2">
            {team.members.slice(0, 5).map((member) => (
              <div
                key={member.id}
                className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white dark:border-gray-800"
                title={member.name}
              >
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-200 text-sm font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                    {member.name.charAt(0)}
                  </div>
                )}
                {member.role === 'leader' && (
                  <span className="absolute -bottom-1 -right-1 text-xs">👑</span>
                )}
              </div>
            ))}
            {team.members.length > 5 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-600 dark:text-gray-300">
                +{team.members.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User team indicator */}
      {isUserTeam && (
        <div className="mt-3 rounded-full bg-primary-100 px-3 py-1 text-center text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
          Your Team
        </div>
      )}
    </button>
  );
}
