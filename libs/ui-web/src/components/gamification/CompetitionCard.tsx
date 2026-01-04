'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import type { CompetitionCardProps } from './types';

/**
 * CompetitionCard Component
 *
 * Displays a competition/challenge card with status and join action.
 */
export function CompetitionCard({
  competition,
  hasJoined = false,
  onJoin,
  onViewDetails,
  className,
}: CompetitionCardProps) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    upcoming: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-200',
      label: 'Upcoming',
    },
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-200',
      label: 'Active',
    },
    completed: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-600 dark:text-gray-300',
      label: 'Completed',
    },
  };

  const config = statusConfig[competition.status];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const end = new Date(competition.endDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
        {/* Status badge */}
        <span
          className={cn(
            'absolute right-4 top-4 rounded-full px-2 py-0.5 text-xs font-medium',
            config.bg,
            config.text
          )}
        >
          {config.label}
        </span>

        {/* Type indicator */}
        <span className="mb-2 inline-flex items-center gap-1 text-sm text-white/80">
          {competition.type === 'team' ? '👥 Team' : '👤 Individual'} Competition
        </span>

        <h3 className="text-xl font-bold">{competition.title}</h3>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="mb-4 text-gray-600 dark:text-gray-300">{competition.description}</p>

        {/* Timeline */}
        <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Starts</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {formatDate(competition.startDate)}
            </div>
          </div>
          <div className="text-2xl text-gray-300 dark:text-gray-600">→</div>
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400">Ends</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {formatDate(competition.endDate)}
            </div>
          </div>
        </div>

        {/* Time remaining for active competitions */}
        {competition.status === 'active' && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-amber-50 p-2 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <span>⏰</span>
            <span className="font-medium">{getTimeRemaining()}</span>
          </div>
        )}

        {/* Teams preview */}
        {competition.teams.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              {competition.teams.length} teams competing
            </div>
            <div className="flex -space-x-2">
              {competition.teams.slice(0, 5).map((team) => (
                <div
                  key={team.id}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white dark:border-gray-800"
                  style={{ backgroundColor: team.color }}
                  title={team.name}
                >
                  <span className="text-sm">{team.iconEmoji}</span>
                </div>
              ))}
              {competition.teams.length > 5 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-700 dark:text-gray-300">
                  +{competition.teams.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prizes */}
        {competition.prizes && competition.prizes.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Prizes</div>
            <div className="flex gap-2">
              {competition.prizes.slice(0, 3).map((prize) => (
                <div
                  key={prize.rank}
                  className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-sm dark:bg-gray-700"
                >
                  <span>{prize.iconEmoji}</span>
                  <span className="text-gray-700 dark:text-gray-300">{prize.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {competition.status !== 'completed' && (
            <button
              onClick={onJoin}
              disabled={hasJoined}
              className={cn(
                'flex-1 rounded-lg px-4 py-2 font-medium transition-colors',
                hasJoined
                  ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  : 'bg-primary-500 text-white hover:bg-primary-600'
              )}
            >
              {hasJoined ? '✓ Joined' : 'Join Competition'}
            </button>
          )}
          <button
            onClick={onViewDetails}
            className="rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
