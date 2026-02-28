/**
 * GameResults - Post-game results display component
 *
 * Features:
 * - Score and stats display
 * - Star rating based on performance
 * - XP and reward display
 * - Encouraging message
 * - Helpfulness rating input
 * - Actions: Play again, Return to focus, Exit
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameSession, GameDefinition, EndGameResponse } from '../../lib/games/game-types';
import { GameStars } from './shared/GameScore';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../lib/games/game-types';

export interface GameResultsProps {
  gameSession: GameSession;
  game: GameDefinition;
  rewards?: EndGameResponse['rewards'];
  encouragement: string;
  onPlayAgain: () => void;
  onReturnToFocus: () => void;
  onExit: () => void;
  onRateGame?: (rating: number) => void;
}

export function GameResults({
  gameSession,
  game,
  rewards,
  encouragement,
  onPlayAgain,
  onReturnToFocus,
  onExit,
  onRateGame,
}: GameResultsProps) {
  const { t } = useTranslation('learner');
  const [helpfulnessRating, setHelpfulnessRating] = useState<number | null>(null);
  const [hasRated, setHasRated] = useState(false);

  // Calculate stars based on score
  const calculateStars = (): number => {
    if (!gameSession.score || !gameSession.maxScore) return 0;
    const percentage = (gameSession.score / gameSession.maxScore) * 100;
    if (percentage >= 90) return 3;
    if (percentage >= 70) return 2;
    if (percentage >= 50) return 1;
    return 0;
  };

  const stars = calculateStars();

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle rating submission
  const handleRating = useCallback((rating: number) => {
    setHelpfulnessRating(rating);
    setHasRated(true);
    onRateGame?.(rating);
  }, [onRateGame]);

  // Get performance message
  const getPerformanceMessage = () => {
    if (stars === 3) return t('games.results.performanceOutstanding');
    if (stars === 2) return t('games.results.performanceGreat');
    if (stars === 1) return t('games.results.performanceGood');
    return t('games.results.performanceKeepPracticing');
  };

  // Get emoji based on performance
  const getPerformanceEmoji = () => {
    if (!gameSession.completed) return '👋';
    if (stars === 3) return '🌟';
    if (stars === 2) return '🎉';
    if (stars === 1) return '👍';
    return '💪';
  };

  return (
    <div className="flex flex-col items-center p-6 max-w-md mx-auto">
      {/* Performance emoji */}
      <div className="text-6xl mb-4 animate-bounce">
        {getPerformanceEmoji()}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-800 mb-1">
        {gameSession.completed ? getPerformanceMessage() : t('games.results.gameEnded')}
      </h2>

      {/* Game title */}
      <p className="text-gray-500 mb-4">
        {game.title}
      </p>

      {/* Stars */}
      {gameSession.completed && gameSession.score !== undefined && (
        <div className="mb-6">
          <GameStars stars={stars} maxStars={3} size="lg" />
        </div>
      )}

      {/* Stats card */}
      <div className="w-full bg-gray-50 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Score */}
          {gameSession.score !== undefined && (
            <div className="text-center">
              <p className="text-sm text-gray-500">{t('games.results.score')}</p>
              <p className="text-2xl font-bold text-gray-800">
                {gameSession.score}
                {gameSession.maxScore && (
                  <span className="text-sm text-gray-400">/{gameSession.maxScore}</span>
                )}
              </p>
            </div>
          )}

          {/* Time */}
          <div className="text-center">
            <p className="text-sm text-gray-500">{t('games.results.time')}</p>
            <p className="text-2xl font-bold text-gray-800">
              {formatDuration(gameSession.durationSeconds)}
            </p>
          </div>

          {/* Category */}
          <div className="text-center">
            <p className="text-sm text-gray-500">{t('games.results.category')}</p>
            <p className="text-lg font-medium text-gray-700 flex items-center justify-center gap-1">
              <span>{CATEGORY_ICONS[game.category]}</span>
              {CATEGORY_LABELS[game.category]}
            </p>
          </div>

          {/* Status */}
          <div className="text-center">
            <p className="text-sm text-gray-500">{t('games.results.status')}</p>
            <p
              className={`text-lg font-medium ${
                gameSession.completed ? 'text-green-600' : 'text-gray-600'
              }`}
            >
              {gameSession.completed ? t('games.results.completed') : t('games.results.notFinished')}
            </p>
          </div>
        </div>
      </div>

      {/* Rewards (if any) */}
      {rewards && (
        <div className="w-full bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <span>🏆</span>
            {t('games.results.rewardsEarned')}
          </h3>
          <div className="flex justify-center gap-6">
            {rewards.xpEarned > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-700">
                  +{rewards.xpEarned}
                </p>
                <p className="text-xs text-yellow-600">{t('games.results.xp')}</p>
              </div>
            )}
            {rewards.coinsEarned > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-700">
                  +{rewards.coinsEarned}
                </p>
                <p className="text-xs text-yellow-600">{t('games.results.coins')}</p>
              </div>
            )}
            {rewards.streakBonus !== undefined && rewards.streakBonus > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  +{rewards.streakBonus}
                </p>
                <p className="text-xs text-orange-500">{t('games.results.streakBonus')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Encouragement message */}
      <p className="text-center text-gray-600 mb-6 italic">
        &ldquo;{encouragement}&rdquo;
      </p>

      {/* Helpfulness rating */}
      {!hasRated && onRateGame && (
        <div className="w-full bg-blue-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700 text-center mb-3">
            {t('games.results.helpfulnessQuestion')}
          </p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleRating(rating)}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  text-lg transition-all duration-200
                  ${helpfulnessRating === rating
                    ? 'bg-blue-500 text-white scale-110'
                    : 'bg-white text-gray-600 hover:bg-blue-100'
                  }
                  shadow-sm border border-blue-200
                `}
                aria-label={t('games.results.rateAriaLabel', { rating })}
              >
                {rating <= 2 ? '😐' : rating === 3 ? '🙂' : rating === 4 ? '😊' : '😄'}
              </button>
            ))}
          </div>
          <p className="text-xs text-blue-600 text-center mt-2">
            {t('games.results.ratingScale')}
          </p>
        </div>
      )}

      {/* Thank you message after rating */}
      {hasRated && (
        <div className="w-full bg-green-50 rounded-xl p-4 mb-6 text-center">
          <p className="text-green-700">{t('games.results.thanksFeedback')}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="w-full space-y-3">
        <button
          onClick={onReturnToFocus}
          className="w-full py-3 px-6 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {t('games.results.readyToFocus')}
        </button>

        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t('games.results.playAgain')}
          </button>

          <button
            onClick={onExit}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            {t('games.results.chooseAnother')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameResults;
