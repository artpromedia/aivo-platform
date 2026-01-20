/**
 * ColorMatchGame - Color matching puzzle game
 *
 * Features:
 * - Match colors shown at the top with options below
 * - Multiple rounds with increasing difficulty
 * - Visual feedback for correct/incorrect
 * - Score tracking
 * - Timer per round (optional)
 * - Stroop-style variant for harder difficulty
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ColorMatchConfig } from '../../../lib/games/game-types';

export interface ColorMatchGameProps {
  config: ColorMatchConfig;
  onComplete: (score: number, maxScore: number) => void;
  onProgress?: (progress: number) => void;
  isPaused?: boolean;
}

interface ColorOption {
  name: string;
  hex: string;
  textColor: string;
}

type RoundResult = 'pending' | 'correct' | 'incorrect';

const ALL_COLORS: ColorOption[] = [
  { name: 'Red', hex: '#ef4444', textColor: 'text-white' },
  { name: 'Blue', hex: '#3b82f6', textColor: 'text-white' },
  { name: 'Green', hex: '#22c55e', textColor: 'text-white' },
  { name: 'Yellow', hex: '#eab308', textColor: 'text-gray-800' },
  { name: 'Purple', hex: '#a855f7', textColor: 'text-white' },
  { name: 'Orange', hex: '#f97316', textColor: 'text-white' },
  { name: 'Pink', hex: '#ec4899', textColor: 'text-white' },
  { name: 'Teal', hex: '#14b8a6', textColor: 'text-white' },
];

// Difficulty settings
const DIFFICULTY_CONFIG = {
  easy: {
    timePerRound: 0, // No timer
    showColorName: true,
    stroopEffect: false,
  },
  medium: {
    timePerRound: 5000, // 5 seconds
    showColorName: true,
    stroopEffect: false,
  },
  hard: {
    timePerRound: 3000, // 3 seconds
    showColorName: true,
    stroopEffect: true, // Color names may not match their color
  },
};

export function ColorMatchGame({
  config,
  onComplete,
  onProgress,
  isPaused = false,
}: ColorMatchGameProps) {
  const { colorCount, rounds, difficulty } = config;
  const difficultySettings = DIFFICULTY_CONFIG[difficulty];

  // Get available colors
  const availableColors = useMemo(
    () => ALL_COLORS.slice(0, colorCount),
    [colorCount]
  );

  // State
  const [currentRound, setCurrentRound] = useState(1);
  const [targetColor, setTargetColor] = useState<ColorOption | null>(null);
  const [options, setOptions] = useState<ColorOption[]>([]);
  const [result, setResult] = useState<RoundResult>('pending');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [stroopText, setStroopText] = useState<string | null>(null);

  // Generate a new round
  const generateRound = useCallback(() => {
    // Select random target color
    const targetIndex = Math.floor(Math.random() * availableColors.length);
    const target = availableColors[targetIndex];

    // Shuffle colors for options
    const shuffled = [...availableColors].sort(() => Math.random() - 0.5);

    // For stroop effect, show a different color name
    let stroop: string | null = null;
    if (difficultySettings.stroopEffect && Math.random() > 0.5) {
      const otherColors = availableColors.filter((c) => c.name !== target.name);
      stroop = otherColors[Math.floor(Math.random() * otherColors.length)].name;
    }

    setTargetColor(target);
    setOptions(shuffled);
    setStroopText(stroop);
    setResult('pending');

    if (difficultySettings.timePerRound > 0) {
      setTimeRemaining(difficultySettings.timePerRound / 1000);
    }
  }, [availableColors, difficultySettings]);

  // Initialize first round
  useEffect(() => {
    generateRound();
  }, [generateRound]);

  // Timer countdown
  useEffect(() => {
    if (
      timeRemaining === null ||
      timeRemaining <= 0 ||
      isPaused ||
      result !== 'pending'
    ) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) return null;
        if (prev <= 1) {
          // Time's up!
          handleSelection(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isPaused, result]);

  // Handle color selection
  const handleSelection = useCallback((selected: ColorOption | null) => {
    if (result !== 'pending' || isPaused) return;

    const isCorrect = selected?.name === targetColor?.name;

    setResult(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      // Calculate points with streak bonus
      const basePoints = 10;
      const streakBonus = Math.min(streak * 2, 10);
      setScore((s) => s + basePoints + streakBonus);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }

    // Move to next round after delay
    setTimeout(() => {
      const nextRound = currentRound + 1;

      if (nextRound > rounds) {
        // Game complete
        setIsComplete(true);
        const finalScore = score + (isCorrect ? 10 + Math.min(streak * 2, 10) : 0);
        onComplete(finalScore, rounds * 20);
      } else {
        setCurrentRound(nextRound);
        generateRound();
        onProgress?.(nextRound / rounds);
      }
    }, 1000);
  }, [result, isPaused, targetColor, streak, score, currentRound, rounds, generateRound, onComplete, onProgress]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (result !== 'pending' || isPaused) return;

      // Number keys 1-5 for options
      const num = parseInt(e.key);
      if (num >= 1 && num <= options.length) {
        handleSelection(options[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, isPaused, options, handleSelection]);

  if (!targetColor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6">
      {/* Header stats */}
      <div className="flex gap-6 mb-4">
        <div className="text-center">
          <span className="text-sm text-gray-500">Round</span>
          <p className="text-xl font-bold text-gray-800">
            {currentRound}/{rounds}
          </p>
        </div>
        <div className="text-center">
          <span className="text-sm text-gray-500">Score</span>
          <p className="text-xl font-bold text-blue-600">{score}</p>
        </div>
        {streak > 1 && (
          <div className="text-center">
            <span className="text-sm text-gray-500">Streak</span>
            <p className="text-xl font-bold text-orange-500">{streak}🔥</p>
          </div>
        )}
      </div>

      {/* Timer (if applicable) */}
      {timeRemaining !== null && result === 'pending' && (
        <div className="mb-4">
          <div
            className={`
              text-2xl font-bold
              ${timeRemaining <= 2 ? 'text-red-500 animate-pulse' : 'text-gray-600'}
            `}
          >
            {timeRemaining}s
          </div>
        </div>
      )}

      {/* Target color display */}
      <div className="mb-8">
        <p className="text-sm text-gray-500 mb-2 text-center">Match this color:</p>
        <div
          className={`
            w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-lg
            flex items-center justify-center
            transition-transform duration-200
            ${result === 'correct' ? 'ring-4 ring-green-400 scale-105' : ''}
            ${result === 'incorrect' ? 'ring-4 ring-red-400 shake' : ''}
          `}
          style={{ backgroundColor: targetColor.hex }}
        >
          {difficultySettings.showColorName && (
            <span
              className={`text-2xl font-bold ${targetColor.textColor}`}
              style={
                stroopText
                  ? { color: availableColors.find((c) => c.name === stroopText)?.hex }
                  : undefined
              }
            >
              {stroopText || targetColor.name}
            </span>
          )}
        </div>
        {stroopText && difficulty === 'hard' && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            Match the COLOR, not the word!
          </p>
        )}
      </div>

      {/* Result feedback */}
      {result !== 'pending' && (
        <div
          className={`
            mb-4 px-4 py-2 rounded-lg font-medium animate-bounce-in
            ${result === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
          `}
        >
          {result === 'correct' ? (
            <>
              Correct! {streak > 1 && `+${10 + Math.min((streak - 1) * 2, 10)} points`}
            </>
          ) : (
            <>
              {timeRemaining === null && difficultySettings.timePerRound > 0
                ? "Time's up!"
                : "Not quite!"} The answer was {targetColor.name}
            </>
          )}
        </div>
      )}

      {/* Color options */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {options.map((color, index) => (
          <button
            key={color.name}
            onClick={() => handleSelection(color)}
            disabled={result !== 'pending' || isPaused}
            className={`
              w-20 h-20 md:w-24 md:h-24 rounded-xl
              shadow-md transition-all duration-150
              flex items-center justify-center
              ${result === 'pending' && !isPaused ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}
              disabled:opacity-50
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400
              ${result !== 'pending' && color.name === targetColor.name ? 'ring-4 ring-green-400' : ''}
            `}
            style={{ backgroundColor: color.hex }}
            aria-label={`Select ${color.name}`}
          >
            <span className={`text-sm font-medium ${color.textColor}`}>
              {index + 1}
            </span>
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mt-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(currentRound / rounds) * 100}%` }}
          />
        </div>
      </div>

      {/* Completion celebration */}
      {isComplete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl animate-bounce-in">
            <div className="text-6xl mb-4">
              {score >= rounds * 15 ? '🌟' : score >= rounds * 10 ? '🎉' : '👍'}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {score >= rounds * 15
                ? 'Amazing!'
                : score >= rounds * 10
                  ? 'Great Job!'
                  : 'Good Effort!'}
            </h2>
            <p className="text-gray-600">
              Final Score: {score}/{rounds * 20}
            </p>
          </div>
        </div>
      )}

      {/* Pause indicator */}
      {isPaused && !isComplete && (
        <div className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
          Game Paused
        </div>
      )}

      {/* Keyboard hint */}
      <p className="mt-4 text-xs text-gray-400">
        Press 1-{options.length} to select a color
      </p>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default ColorMatchGame;
