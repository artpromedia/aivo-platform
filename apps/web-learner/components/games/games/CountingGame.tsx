/**
 * CountingGame - Number/letter sequencing game
 *
 * Features:
 * - Tap numbers/letters in correct sequence order
 * - Configurable sequence type (numbers, letters, shapes)
 * - Ascending or descending order
 * - Visual feedback for correct/incorrect
 * - Multiple difficulty levels based on sequence length
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { SequenceGameConfig } from '../../../lib/games/game-types';

export interface CountingGameProps {
  config: SequenceGameConfig;
  onComplete: (score: number, maxScore: number) => void;
  onProgress?: (progress: number) => void;
  isPaused?: boolean;
}

interface SequenceItem {
  id: number;
  value: string;
  displayValue: string;
  order: number;
  isSelected: boolean;
  isCorrect: boolean | null;
  position: { x: number; y: number };
}

type GameState = 'playing' | 'complete';

// Shape emojis for variety
const SHAPES = ['●', '■', '▲', '◆', '★', '♥', '♠', '♣', '◈', '▼'];

export function CountingGame({
  config,
  onComplete,
  onProgress,
  isPaused = false,
}: CountingGameProps) {
  const { sequenceType, length, ascending } = config;

  // Generate sequence items
  const generateSequence = useCallback((): SequenceItem[] => {
    const items: SequenceItem[] = [];

    // Generate values based on type
    let values: string[] = [];
    let displayValues: string[] = [];

    if (sequenceType === 'numbers') {
      // Random starting number
      const start = Math.floor(Math.random() * 10) + 1;
      for (let i = 0; i < length; i++) {
        const num = ascending ? start + i : start + length - 1 - i;
        values.push(num.toString());
        displayValues.push(num.toString());
      }
    } else if (sequenceType === 'letters') {
      // Random starting letter
      const startCode = 65 + Math.floor(Math.random() * (26 - length));
      for (let i = 0; i < length; i++) {
        const code = ascending
          ? startCode + i
          : startCode + length - 1 - i;
        const letter = String.fromCharCode(code);
        values.push(letter);
        displayValues.push(letter);
      }
    } else {
      // Shapes
      const shuffledShapes = [...SHAPES].sort(() => Math.random() - 0.5);
      for (let i = 0; i < length; i++) {
        values.push((i + 1).toString());
        displayValues.push(shuffledShapes[i]);
      }
    }

    // Create items with random positions (avoid overlap)
    const usedPositions: { x: number; y: number }[] = [];
    const minDistance = 15; // Minimum distance between items

    const getRandomPosition = (): { x: number; y: number } => {
      let attempts = 0;
      while (attempts < 50) {
        const x = 10 + Math.random() * 70; // 10-80%
        const y = 10 + Math.random() * 70; // 10-80%

        // Check distance from all used positions
        const tooClose = usedPositions.some(
          (pos) => Math.hypot(pos.x - x, pos.y - y) < minDistance
        );

        if (!tooClose) {
          usedPositions.push({ x, y });
          return { x, y };
        }
        attempts++;
      }
      // Fallback to grid if random fails
      const gridX = (usedPositions.length % 3) * 30 + 15;
      const gridY = Math.floor(usedPositions.length / 3) * 25 + 15;
      usedPositions.push({ x: gridX, y: gridY });
      return { x: gridX, y: gridY };
    };

    // Randomize the display order but keep track of correct order
    const indices = Array.from({ length }, (_, i) => i);
    const shuffledIndices = [...indices].sort(() => Math.random() - 0.5);

    shuffledIndices.forEach((originalIndex, displayIndex) => {
      items.push({
        id: displayIndex,
        value: values[originalIndex],
        displayValue: displayValues[originalIndex],
        order: originalIndex,
        isSelected: false,
        isCorrect: null,
        position: getRandomPosition(),
      });
    });

    return items;
  }, [sequenceType, length, ascending]);

  // State
  const [items, setItems] = useState<SequenceItem[]>([]);
  const [nextExpected, setNextExpected] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [showHint, setShowHint] = useState(false);

  // Initialize game
  useEffect(() => {
    setItems(generateSequence());
  }, [generateSequence]);

  // Get the expected next value for display
  const expectedValue = useMemo(() => {
    const expectedItem = items.find((item) => item.order === nextExpected);
    return expectedItem?.displayValue;
  }, [items, nextExpected]);

  // Handle item selection
  const handleItemClick = useCallback((itemId: number) => {
    if (isPaused || gameState !== 'playing') return;

    const clickedItem = items.find((item) => item.id === itemId);
    if (!clickedItem || clickedItem.isSelected) return;

    const isCorrect = clickedItem.order === nextExpected;

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, isSelected: true, isCorrect }
          : item
      )
    );

    if (isCorrect) {
      const nextOrder = nextExpected + 1;
      setNextExpected(nextOrder);
      setScore((s) => s + 10);
      setShowHint(false);

      // Update progress
      onProgress?.(nextOrder / length);

      // Check if complete
      if (nextOrder >= length) {
        setGameState('complete');
        const finalScore = Math.max(0, 100 - mistakes * 10);
        setTimeout(() => {
          onComplete(finalScore, 100);
        }, 1000);
      }
    } else {
      setMistakes((m) => m + 1);

      // Flash the item as incorrect, then reset
      setTimeout(() => {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, isSelected: false, isCorrect: null }
              : item
          )
        );
      }, 500);
    }
  }, [isPaused, gameState, items, nextExpected, length, mistakes, onProgress, onComplete]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || gameState !== 'playing') return;

      // 'H' for hint
      if (e.key.toLowerCase() === 'h') {
        setShowHint(true);
        setTimeout(() => setShowHint(false), 2000);
      }

      // Number/letter keys to select items
      const key = e.key.toUpperCase();
      const matchingItem = items.find(
        (item) => !item.isSelected && item.displayValue === key
      );
      if (matchingItem) {
        handleItemClick(matchingItem.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, gameState, items, handleItemClick]);

  // Get the sequence type label
  const getSequenceLabel = () => {
    if (sequenceType === 'shapes') {
      return 'shapes from 1 to ' + length;
    }
    const direction = ascending ? 'smallest to largest' : 'largest to smallest';
    return `${sequenceType} from ${direction}`;
  };

  return (
    <div className="flex flex-col items-center p-6">
      {/* Header */}
      <div className="flex gap-6 mb-4">
        <div className="text-center">
          <span className="text-sm text-gray-500">Progress</span>
          <p className="text-xl font-bold text-gray-800">
            {nextExpected}/{length}
          </p>
        </div>
        <div className="text-center">
          <span className="text-sm text-gray-500">Mistakes</span>
          <p className={`text-xl font-bold ${mistakes > 0 ? 'text-red-500' : 'text-gray-800'}`}>
            {mistakes}
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 text-center">
        <p className="text-gray-600">
          Tap the {getSequenceLabel()}
        </p>
        {expectedValue && gameState === 'playing' && (
          <p className="text-lg font-semibold text-blue-600 mt-1">
            Next: <span className="text-2xl">{expectedValue}</span>
          </p>
        )}
      </div>

      {/* Game area */}
      <div
        className="relative w-full max-w-md h-80 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl overflow-hidden"
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            disabled={isPaused || gameState !== 'playing' || item.isSelected}
            className={`
              absolute transform -translate-x-1/2 -translate-y-1/2
              w-14 h-14 md:w-16 md:h-16 rounded-xl
              flex items-center justify-center
              text-2xl md:text-3xl font-bold
              shadow-lg transition-all duration-200
              ${item.isSelected
                ? item.isCorrect
                  ? 'bg-green-500 text-white scale-75 opacity-70'
                  : 'bg-red-500 text-white animate-shake'
                : 'bg-white hover:bg-gray-50 hover:scale-110 cursor-pointer text-gray-800'
              }
              ${showHint && item.order === nextExpected ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
              disabled:cursor-default
              focus:outline-none focus:ring-2 focus:ring-blue-400
            `}
            style={{
              left: `${item.position.x}%`,
              top: `${item.position.y}%`,
            }}
            aria-label={`Select ${item.displayValue}`}
          >
            {item.displayValue}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mt-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${(nextExpected / length) * 100}%` }}
          />
        </div>
      </div>

      {/* Hint button */}
      {gameState === 'playing' && (
        <button
          onClick={() => {
            setShowHint(true);
            setTimeout(() => setShowHint(false), 2000);
          }}
          className="mt-4 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Need a hint? (or press H)
        </button>
      )}

      {/* Completion message */}
      {gameState === 'complete' && (
        <div className="mt-6 text-center animate-bounce-in">
          <div className="text-5xl mb-2">
            {mistakes === 0 ? '🌟' : mistakes <= 2 ? '🎉' : '👍'}
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            {mistakes === 0
              ? 'Perfect!'
              : mistakes <= 2
                ? 'Great job!'
                : 'Well done!'}
          </h2>
          <p className="text-gray-600">
            Completed with {mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}
          </p>
        </div>
      )}

      {/* Pause indicator */}
      {isPaused && gameState !== 'complete' && (
        <div className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
          Game Paused
        </div>
      )}

      {/* CSS for shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%) rotate(0); }
          25% { transform: translate(-50%, -50%) rotate(-5deg); }
          75% { transform: translate(-50%, -50%) rotate(5deg); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default CountingGame;
