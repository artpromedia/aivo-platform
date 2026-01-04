'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import type { GameProgressTrackerProps } from './types';

/**
 * GameProgressTracker Component
 *
 * Displays progress and metrics for a game session.
 */
export function GameProgressTracker({
  session,
  showDetails = true,
  className,
}: GameProgressTrackerProps) {
  const progressPercentage = (session.score / session.maxScore) * 100;
  const accuracyPercentage =
    session.attemptsCount > 0 ? (session.correctAnswers / session.attemptsCount) * 100 : 0;

  const formatDuration = () => {
    if (!session.endTime) return 'In progress';
    const duration = session.endTime.getTime() - session.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      {/* Score and progress bar */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Score</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {session.score}/{session.maxScore}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-4">
          {/* Accuracy */}
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Accuracy
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {accuracyPercentage.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {session.correctAnswers}/{session.attemptsCount} correct
            </div>
          </div>

          {/* Duration */}
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Duration
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {formatDuration()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Time spent</div>
          </div>

          {/* Focus metrics if available */}
          {session.focusMetrics && (
            <>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Engagement
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {session.focusMetrics.engagementScore}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Focus score</div>
              </div>

              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Response
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {(session.focusMetrics.averageResponseTime / 1000).toFixed(1)}s
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Avg response time</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
