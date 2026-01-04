'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import type { TeamProgressWidgetProps } from './types';

/**
 * TeamProgressWidget Component
 *
 * Displays team progress towards a goal with member contributions.
 */
export function TeamProgressWidget({
  team,
  goalScore,
  timeRemainingHours,
  showContributions = true,
  className,
}: TeamProgressWidgetProps) {
  const progressPercentage = Math.min((team.totalScore / goalScore) * 100, 100);
  const isComplete = team.totalScore >= goalScore;

  // Sort members by contribution
  const sortedMembers = React.useMemo(() => {
    return [...team.members].sort((a, b) => b.score - a.score);
  }, [team.members]);

  const formatTimeRemaining = () => {
    if (!timeRemainingHours) return null;
    if (timeRemainingHours < 1) {
      return `${Math.round(timeRemainingHours * 60)} min left`;
    }
    if (timeRemainingHours < 24) {
      return `${Math.round(timeRemainingHours)} hours left`;
    }
    return `${Math.round(timeRemainingHours / 24)} days left`;
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
            style={{ backgroundColor: team.color + '30' }}
          >
            {team.iconEmoji}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{team.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {team.members.length} members
            </p>
          </div>
        </div>
        {timeRemainingHours && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            ⏰ {formatTimeRemaining()}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">Progress to Goal</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {team.totalScore.toLocaleString()} / {goalScore.toLocaleString()}
          </span>
        </div>
        <div className="relative h-4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isComplete
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-primary-400 to-primary-500'
            )}
            style={{ width: `${progressPercentage}%` }}
          />
          {isComplete && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white drop-shadow">Goal Reached! 🎉</span>
            </div>
          )}
        </div>
        <div className="mt-1 text-right text-sm text-gray-500 dark:text-gray-400">
          {progressPercentage.toFixed(0)}% complete
        </div>
      </div>

      {/* Member contributions */}
      {showContributions && sortedMembers.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">
            Top Contributors
          </div>
          <div className="space-y-2">
            {sortedMembers.slice(0, 5).map((member, index) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50"
              >
                {/* Rank */}
                <span className="flex h-6 w-6 items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                  {index === 0 ? '👑' : `#${index + 1}`}
                </span>

                {/* Avatar */}
                <div className="relative h-8 w-8 overflow-hidden rounded-full">
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
                </div>

                {/* Name and contribution bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {member.score.toLocaleString()} pts
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                    <div
                      className="h-full rounded-full bg-primary-400"
                      style={{ width: `${member.contributionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {sortedMembers.length > 5 && (
            <button className="mt-2 w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
              View all {sortedMembers.length} members
            </button>
          )}
        </div>
      )}
    </div>
  );
}
