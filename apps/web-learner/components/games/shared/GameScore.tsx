/**
 * GameScore - Score display component for mini-games
 *
 * Features:
 * - Current score display
 * - Optional max score
 * - Move/attempt counter
 * - Progress bar variant
 * - Animated score changes
 */

'use client';

import React, { useEffect, useState } from 'react';

export interface GameScoreProps {
  /** Current score */
  score: number;
  /** Maximum possible score */
  maxScore?: number;
  /** Number of moves/attempts */
  moves?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Display variant */
  variant?: 'simple' | 'detailed' | 'progress';
  /** Additional CSS classes */
  className?: string;
  /** Custom label */
  label?: string;
  /** Show animation on score change */
  animate?: boolean;
}

export function GameScore({
  score,
  maxScore,
  moves,
  size = 'md',
  variant = 'simple',
  className = '',
  label = 'Score',
  animate = true,
}: GameScoreProps) {
  const [displayScore, setDisplayScore] = useState(score);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate score changes
  useEffect(() => {
    if (animate && score !== displayScore) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayScore(score);
        setIsAnimating(false);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setDisplayScore(score);
    }
  }, [score, displayScore, animate]);

  const percentage = maxScore && maxScore > 0 ? (score / maxScore) * 100 : 0;

  // Size configurations
  const sizeConfig = {
    sm: { text: 'text-lg', label: 'text-xs' },
    md: { text: 'text-2xl', label: 'text-sm' },
    lg: { text: 'text-4xl', label: 'text-base' },
  };

  const config = sizeConfig[size];

  if (variant === 'progress' && maxScore) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex justify-between items-center">
          <span className={`${config.label} text-gray-600`}>{label}</span>
          <span className={`font-bold ${config.text} text-gray-800`}>
            {displayScore}
            <span className="text-gray-400 text-lg">/{maxScore}</span>
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {moves !== undefined && (
          <span className={`${config.label} text-gray-500`}>
            {moves} {moves === 1 ? 'move' : 'moves'}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="flex flex-col items-center">
          <span className={`${config.label} text-gray-600`}>{label}</span>
          <span
            className={`
              font-bold ${config.text} text-gray-800
              ${isAnimating ? 'scale-125 text-green-600' : ''}
              transition-all duration-150
            `}
          >
            {displayScore}
            {maxScore && (
              <span className="text-gray-400 text-lg">/{maxScore}</span>
            )}
          </span>
        </div>
        {moves !== undefined && (
          <div className="flex flex-col items-center">
            <span className={`${config.label} text-gray-600`}>Moves</span>
            <span className={`font-bold ${config.text} text-gray-800`}>
              {moves}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Simple variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`${config.label} text-gray-600`}>{label}:</span>
      <span
        className={`
          font-bold ${config.text} text-gray-800
          ${isAnimating ? 'scale-125 text-green-600' : ''}
          transition-all duration-150
        `}
      >
        {displayScore}
      </span>
      {maxScore && (
        <span className={`${config.label} text-gray-400`}>/ {maxScore}</span>
      )}
    </div>
  );
}

/**
 * GameMoves - Simple move counter component
 */
export interface GameMovesProps {
  moves: number;
  maxMoves?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function GameMoves({
  moves,
  maxMoves,
  size = 'md',
  className = '',
  label = 'Moves',
}: GameMovesProps) {
  const sizeConfig = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const isWarning = maxMoves && moves >= maxMoves * 0.8;
  const isError = maxMoves && moves >= maxMoves;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600">{label}:</span>
      <span
        className={`
          font-bold ${sizeConfig[size]}
          ${isError ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-gray-800'}
        `}
      >
        {moves}
        {maxMoves && (
          <span className="text-gray-400">/{maxMoves}</span>
        )}
      </span>
    </div>
  );
}

/**
 * GameStars - Star rating display
 */
export interface GameStarsProps {
  stars: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GameStars({
  stars,
  maxStars = 3,
  size = 'md',
  className = '',
}: GameStarsProps) {
  const sizeConfig = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div
      className={`flex gap-1 ${className}`}
      role="img"
      aria-label={`${stars} out of ${maxStars} stars`}
    >
      {Array.from({ length: maxStars }).map((_, index) => (
        <span
          key={index}
          className={`
            ${sizeConfig[size]}
            ${index < stars ? 'text-yellow-400' : 'text-gray-300'}
            transition-colors duration-300
          `}
        >
          {index < stars ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

export default GameScore;
