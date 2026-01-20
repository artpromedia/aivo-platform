/**
 * GameInstructions - Instructions overlay component for mini-games
 *
 * Features:
 * - Numbered instruction steps
 * - Animated appearance
 * - Play button
 * - Keyboard accessible
 * - Optional skip functionality
 */

'use client';

import React, { useEffect, useRef } from 'react';

export interface GameInstructionsProps {
  /** Game title */
  title: string;
  /** Game description */
  description?: string;
  /** List of instruction steps */
  instructions: string[];
  /** Estimated duration in seconds */
  durationSeconds?: number;
  /** Callback when user starts the game */
  onStart: () => void;
  /** Optional callback for skipping instructions */
  onSkip?: () => void;
  /** Whether the start button is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Category for styling */
  category?: 'cognitive' | 'relaxation' | 'physical' | 'creative';
}

export function GameInstructions({
  title,
  description,
  instructions,
  durationSeconds,
  onStart,
  onSkip,
  isLoading = false,
  className = '',
  category = 'cognitive',
}: GameInstructionsProps) {
  const startButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the start button when component mounts
  useEffect(() => {
    startButtonRef.current?.focus();
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        onStart();
      }
      if (e.key === 'Escape' && onSkip) {
        onSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart, onSkip, isLoading]);

  // Category colors
  const categoryColors = {
    cognitive: 'bg-blue-500 hover:bg-blue-600',
    relaxation: 'bg-green-500 hover:bg-green-600',
    physical: 'bg-orange-500 hover:bg-orange-600',
    creative: 'bg-purple-500 hover:bg-purple-600',
  };

  const categoryBadgeColors = {
    cognitive: 'bg-blue-100 text-blue-700',
    relaxation: 'bg-green-100 text-green-700',
    physical: 'bg-orange-100 text-orange-700',
    creative: 'bg-purple-100 text-purple-700',
  };

  const categoryIcons = {
    cognitive: '🧠',
    relaxation: '🧘',
    physical: '💪',
    creative: '🎨',
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}min`;
  };

  return (
    <div
      className={`
        flex flex-col items-center justify-center p-6 text-center
        animate-fadeIn ${className}
      `}
      role="dialog"
      aria-labelledby="game-title"
      aria-describedby="game-description"
    >
      {/* Category badge */}
      <span
        className={`
          inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium mb-4
          ${categoryBadgeColors[category]}
        `}
      >
        <span>{categoryIcons[category]}</span>
        <span className="capitalize">{category}</span>
      </span>

      {/* Title */}
      <h2
        id="game-title"
        className="text-2xl md:text-3xl font-bold text-gray-800 mb-2"
      >
        {title}
      </h2>

      {/* Description */}
      {description && (
        <p
          id="game-description"
          className="text-gray-600 mb-4 max-w-md"
        >
          {description}
        </p>
      )}

      {/* Duration */}
      {durationSeconds && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>About {formatDuration(durationSeconds)}</span>
        </div>
      )}

      {/* Instructions */}
      <div className="w-full max-w-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 text-left">
          How to Play:
        </h3>
        <ol className="space-y-2 text-left">
          {instructions.map((instruction, index) => (
            <li
              key={index}
              className="flex items-start gap-3 text-gray-600"
            >
              <span
                className={`
                  flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                  text-xs font-bold text-white ${categoryColors[category]}
                `}
              >
                {index + 1}
              </span>
              <span className="text-sm pt-0.5">{instruction}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button
          ref={startButtonRef}
          onClick={onStart}
          disabled={isLoading}
          className={`
            flex-1 py-3 px-6 rounded-xl font-semibold text-white
            ${categoryColors[category]}
            disabled:opacity-50 disabled:cursor-not-allowed
            transform transition-all duration-200
            hover:scale-105 active:scale-95
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          `}
          aria-label="Start playing"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Starting...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              Play Now
            </span>
          )}
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            className="
              py-3 px-6 rounded-xl font-medium text-gray-600
              bg-gray-100 hover:bg-gray-200
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
            "
            aria-label="Skip this game"
          >
            Skip
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-gray-400 mt-4">
        Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> to start
        {onSkip && (
          <span>
            {' '}or <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to skip
          </span>
        )}
      </p>
    </div>
  );
}

/**
 * InGameInstructions - Compact instructions shown during gameplay
 */
export interface InGameInstructionsProps {
  instruction: string;
  subInstruction?: string;
  variant?: 'top' | 'bottom' | 'floating';
  className?: string;
}

export function InGameInstructions({
  instruction,
  subInstruction,
  variant = 'top',
  className = '',
}: InGameInstructionsProps) {
  const positionClasses = {
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0',
    floating: 'top-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`
        ${variant === 'floating' ? 'absolute' : 'relative'}
        ${positionClasses[variant]}
        bg-white/90 backdrop-blur-sm rounded-lg shadow-md
        px-4 py-2 text-center
        ${className}
      `}
    >
      <p className="font-medium text-gray-800">{instruction}</p>
      {subInstruction && (
        <p className="text-sm text-gray-500">{subInstruction}</p>
      )}
    </div>
  );
}

export default GameInstructions;
