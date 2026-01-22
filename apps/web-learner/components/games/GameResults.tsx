/**
 * GameResults - Post-game results display component
 *
 * Features:
 * - Score and stats display
 * - Star rating based on performance
 * - XP and reward display
 * - Encouraging message
 * - Helpfulness rating input
 * - Actions: Play again, Return to game list
 */

'use client';

import React, { useState, useCallback } from 'react';

import { GameStars } from './shared/GameScore';
import type { GameResultsProps, GameResult } from './types';

// Calculate stars from result
function calculateStars(result: GameResult): number {
  const { metrics } = result;
  if (metrics.score === undefined || metrics.maxScore === undefined) return 0;
  const percentage = (metrics.score / metrics.maxScore) * 100;
  if (percentage >= 90) return 3;
  if (percentage >= 70) return 2;
  if (percentage >= 50) return 1;
  return 0;
}

// Format duration from seconds
function formatDuration(seconds?: number): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get performance message based on stars
function getPerformanceMessage(stars: number): string {
  if (stars === 3) return 'Outstanding!';
  if (stars === 2) return 'Great job!';
  if (stars === 1) return 'Good effort!';
  return 'Keep practicing!';
}

// Get emoji based on performance
function getPerformanceEmoji(completed: boolean, stars: number): string {
  if (!completed) return '👋';
  if (stars === 3) return '🌟';
  if (stars === 2) return '🎉';
  if (stars === 1) return '👍';
  return '💪';
}

export function GameResults({
  result,
  gameId: _gameId,
  gameTitle,
  onPlayAgain,
  onReturn,
  onRate,
  className = '',
}: GameResultsProps) {
  const [hasRated, setHasRated] = useState(false);

  const stars = calculateStars(result);
  const { metrics, xpEarned, coinsEarned, isPersonalBest, completed } = result;

  // Handle rating submission
  const handleRating = useCallback(
    (helpful: boolean) => {
      setHasRated(true);
      onRate?.(helpful);
    },
    [onRate]
  );

  return (
    <div className={`flex flex-col items-center p-6 max-w-md mx-auto ${className}`}>
      {/* Performance emoji */}
      <div className="text-6xl mb-4 animate-bounce">{getPerformanceEmoji(completed, stars)}</div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-800 mb-1">
        {completed ? getPerformanceMessage(stars) : 'Game Ended'}
      </h2>

      {/* Game title */}
      <p className="text-gray-500 mb-4">{gameTitle}</p>

      {/* Personal best indicator */}
      {isPersonalBest && (
        <div className="mb-4 px-4 py-2 bg-yellow-100 rounded-full text-yellow-800 text-sm font-medium flex items-center gap-2">
          <span>🏆</span> New Personal Best!
        </div>
      )}

      {/* Stars */}
      {completed && metrics.score !== undefined && (
        <div className="mb-6">
          <GameStars stars={stars} maxStars={3} size="lg" />
        </div>
      )}

      {/* Stats card */}
      <div className="w-full bg-gray-50 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Score */}
          {metrics.score !== undefined && (
            <div className="text-center">
              <p className="text-sm text-gray-500">Score</p>
              <p className="text-2xl font-bold text-gray-800">
                {metrics.score}
                {metrics.maxScore && (
                  <span className="text-sm text-gray-400">/{metrics.maxScore}</span>
                )}
              </p>
            </div>
          )}

          {/* Time */}
          <div className="text-center">
            <p className="text-sm text-gray-500">Time</p>
            <p className="text-2xl font-bold text-gray-800">{formatDuration(metrics.duration)}</p>
          </div>

          {/* Accuracy */}
          {metrics.totalAttempts > 0 && (
            <div className="text-center">
              <p className="text-sm text-gray-500">Accuracy</p>
              <p className="text-lg font-medium text-gray-700">
                {Math.round((metrics.correctAnswers / metrics.totalAttempts) * 100)}%
              </p>
            </div>
          )}

          {/* Attempts */}
          {metrics.totalAttempts > 0 && (
            <div className="text-center">
              <p className="text-sm text-gray-500">Attempts</p>
              <p className="text-lg font-medium text-gray-700">{metrics.totalAttempts}</p>
            </div>
          )}
        </div>
      </div>

      {/* Rewards */}
      {(xpEarned > 0 || coinsEarned > 0) && (
        <div className="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <span>🏆</span>
            Rewards Earned
          </h3>
          <div className="flex justify-center gap-6">
            {xpEarned > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-700">+{xpEarned}</p>
                <p className="text-xs text-yellow-600">XP</p>
              </div>
            )}
            {coinsEarned > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-700">+{coinsEarned}</p>
                <p className="text-xs text-yellow-600">Coins</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Helpfulness rating */}
      {!hasRated && onRate && (
        <div className="w-full bg-blue-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700 text-center mb-3">
            Did this break help you feel better?
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                handleRating(true);
              }}
              className="px-6 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <span>👍</span> Yes!
            </button>
            <button
              onClick={() => {
                handleRating(false);
              }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <span>👎</span> Not really
            </button>
          </div>
        </div>
      )}

      {/* Thank you message after rating */}
      {hasRated && (
        <div className="w-full bg-green-50 rounded-xl p-4 mb-6 text-center">
          <p className="text-green-700">Thanks for your feedback! 💚</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="w-full space-y-3">
        <button
          onClick={onPlayAgain}
          className="w-full py-3 px-6 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Play Again
        </button>

        <button
          onClick={onReturn}
          className="w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Choose Another Game
        </button>
      </div>
    </div>
  );
}

export type { GameResultsProps } from './types';
export default GameResults;
