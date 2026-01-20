/**
 * GameTimer - Countdown timer component for mini-games
 *
 * Features:
 * - Visual countdown display
 * - Progress ring animation
 * - Color changes as time runs low
 * - Accessible with ARIA labels
 */

'use client';

import React from 'react';

export interface GameTimerProps {
  /** Total duration in seconds */
  totalSeconds: number;
  /** Remaining time in seconds */
  remainingSeconds: number;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show as circular progress */
  variant?: 'linear' | 'circular';
  /** Additional CSS classes */
  className?: string;
  /** Show text label */
  showLabel?: boolean;
  /** Custom label */
  label?: string;
}

export function GameTimer({
  totalSeconds,
  remainingSeconds,
  size = 'md',
  variant = 'circular',
  className = '',
  showLabel = true,
  label,
}: GameTimerProps) {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const percentage = progress * 100;

  // Format time display
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}s`;

  // Determine color based on remaining time
  const getColor = () => {
    if (percentage > 50) return 'text-green-600';
    if (percentage > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStrokeColor = () => {
    if (percentage > 50) return 'stroke-green-500';
    if (percentage > 25) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  const getBgColor = () => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Size configurations
  const sizeConfig = {
    sm: { ring: 48, stroke: 4, text: 'text-sm' },
    md: { ring: 64, stroke: 5, text: 'text-lg' },
    lg: { ring: 80, stroke: 6, text: 'text-2xl' },
  };

  const config = sizeConfig[size];
  const radius = (config.ring - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  if (variant === 'linear') {
    return (
      <div
        className={`flex flex-col gap-1 ${className}`}
        role="timer"
        aria-label={`${remainingSeconds} seconds remaining`}
      >
        {showLabel && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{label || 'Time'}</span>
            <span className={`font-mono font-bold ${config.text} ${getColor()}`}>
              {timeDisplay}
            </span>
          </div>
        )}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${getBgColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      role="timer"
      aria-label={`${remainingSeconds} seconds remaining`}
    >
      <svg
        width={config.ring}
        height={config.ring}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.ring / 2}
          cy={config.ring / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={config.ring / 2}
          cy={config.ring / 2}
          r={radius}
          fill="none"
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`transition-all duration-200 ${getStrokeColor()}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-mono font-bold ${config.text} ${getColor()}`}>
          {timeDisplay}
        </span>
        {showLabel && label && (
          <span className="text-xs text-gray-500">{label}</span>
        )}
      </div>
    </div>
  );
}

/**
 * GameCountup - Count up timer for tracking elapsed time
 */
export interface GameCountupProps {
  /** Elapsed seconds */
  elapsedSeconds: number;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Show label */
  showLabel?: boolean;
  /** Custom label */
  label?: string;
}

export function GameCountup({
  elapsedSeconds,
  size = 'md',
  className = '',
  showLabel = true,
  label = 'Time',
}: GameCountupProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const sizeConfig = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="timer"
      aria-label={`${elapsedSeconds} seconds elapsed`}
    >
      {showLabel && (
        <span className="text-sm text-gray-600">{label}</span>
      )}
      <span className={`font-mono font-bold ${sizeConfig[size]} text-gray-800`}>
        {timeDisplay}
      </span>
    </div>
  );
}

export default GameTimer;
