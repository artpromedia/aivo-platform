/**
 * PatternGame - Simon Says style pattern recognition game
 *
 * Features:
 * - Watch and repeat color sequences
 * - Progressive difficulty (sequence gets longer)
 * - Visual and optional audio feedback
 * - Configurable sequence length and speed
 * - Encouraging messages on mistakes
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { PatternGameConfig } from '../../../lib/games/game-types';

export interface PatternGameProps {
  config: PatternGameConfig;
  onComplete: (score: number, maxScore: number) => void;
  onProgress?: (progress: number) => void;
  isPaused?: boolean;
}

type GameState = 'ready' | 'showing' | 'input' | 'correct' | 'wrong' | 'complete';

const COLORS = [
  { name: 'red', bg: 'bg-red-500', active: 'bg-red-300', border: 'border-red-600' },
  { name: 'blue', bg: 'bg-blue-500', active: 'bg-blue-300', border: 'border-blue-600' },
  { name: 'green', bg: 'bg-green-500', active: 'bg-green-300', border: 'border-green-600' },
  { name: 'yellow', bg: 'bg-yellow-500', active: 'bg-yellow-300', border: 'border-yellow-600' },
];

const SPEED_DELAYS = {
  slow: 1000,
  medium: 700,
  fast: 450,
};

// Audio frequencies for each color (musical notes)
const COLOR_FREQUENCIES = [262, 330, 392, 523]; // C4, E4, G4, C5

export function PatternGame({
  config,
  onComplete,
  onProgress,
  isPaused = false,
}: PatternGameProps) {
  const { sequenceLength, speed, patternType } = config;

  // State
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>('ready');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [message, setMessage] = useState('Watch the pattern!');
  const [score, setScore] = useState(0);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const showingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (showingTimeoutRef.current) {
        clearTimeout(showingTimeoutRef.current);
      }
    };
  }, []);

  // Play tone for a color
  const playTone = useCallback((colorIndex: number, duration = 200) => {
    if (patternType === 'visual') return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = COLOR_FREQUENCIES[colorIndex];
      gainNode.gain.value = 0.3;

      // Fade out
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch {
      // Audio not available
    }
  }, [patternType]);

  // Generate a new sequence
  const generateSequence = useCallback((length: number): number[] => {
    const newSequence: number[] = [];
    for (let i = 0; i < length; i++) {
      newSequence.push(Math.floor(Math.random() * COLORS.length));
    }
    return newSequence;
  }, []);

  // Start the game
  const startGame = useCallback(() => {
    const newSequence = generateSequence(1);
    setSequence(newSequence);
    setPlayerInput([]);
    setCurrentLevel(1);
    setScore(0);
    setGameState('showing');
    setMessage('Watch carefully!');
  }, [generateSequence]);

  // Start next level
  const nextLevel = useCallback(() => {
    const nextLevelNum = currentLevel + 1;

    if (nextLevelNum > sequenceLength) {
      // Game complete!
      setGameState('complete');
      setMessage('Amazing! You completed all levels!');
      const finalScore = score + 10;
      setScore(finalScore);
      onComplete(finalScore, sequenceLength * 10);
      return;
    }

    // Add one more to sequence
    const newSequence = [...sequence, Math.floor(Math.random() * COLORS.length)];
    setSequence(newSequence);
    setPlayerInput([]);
    setCurrentLevel(nextLevelNum);
    setGameState('showing');
    setMessage(`Level ${nextLevelNum} - Watch the pattern!`);
  }, [currentLevel, sequenceLength, sequence, score, onComplete]);

  // Show the sequence to the player
  useEffect(() => {
    if (gameState !== 'showing' || isPaused || sequence.length === 0) return;

    let currentIndex = 0;
    const delay = SPEED_DELAYS[speed];

    const showNext = () => {
      if (currentIndex < sequence.length) {
        setActiveIndex(sequence[currentIndex]);
        playTone(sequence[currentIndex], delay * 0.7);

        showingTimeoutRef.current = setTimeout(() => {
          setActiveIndex(null);

          showingTimeoutRef.current = setTimeout(() => {
            currentIndex++;
            showNext();
          }, delay * 0.3);
        }, delay * 0.7);
      } else {
        // Done showing, player's turn
        setGameState('input');
        setMessage('Your turn! Repeat the pattern');
      }
    };

    // Small delay before starting
    showingTimeoutRef.current = setTimeout(showNext, 500);

    return () => {
      if (showingTimeoutRef.current) {
        clearTimeout(showingTimeoutRef.current);
      }
    };
  }, [gameState, sequence, speed, isPaused, playTone]);

  // Handle player input
  const handleColorClick = useCallback((colorIndex: number) => {
    if (gameState !== 'input' || isPaused) return;

    // Flash the color
    setActiveIndex(colorIndex);
    playTone(colorIndex);

    setTimeout(() => setActiveIndex(null), 200);

    const newInput = [...playerInput, colorIndex];
    setPlayerInput(newInput);

    const currentPosition = newInput.length - 1;

    // Check if input is correct
    if (newInput[currentPosition] !== sequence[currentPosition]) {
      // Wrong!
      setGameState('wrong');
      setMessage("Oops! That's okay, let's try again!");

      // After a moment, start over at current level
      setTimeout(() => {
        if (currentLevel === 1) {
          // Restart from beginning
          startGame();
        } else {
          // Go back one level
          const prevSequence = sequence.slice(0, currentLevel);
          setSequence(prevSequence);
          setPlayerInput([]);
          setGameState('showing');
          setMessage(`Let's try level ${currentLevel} again!`);
        }
      }, 1500);
      return;
    }

    // Check if sequence is complete
    if (newInput.length === sequence.length) {
      setGameState('correct');
      setMessage('Great job!');
      setScore((s) => s + 10);

      // Update progress
      onProgress?.(currentLevel / sequenceLength);

      // Move to next level after a moment
      setTimeout(nextLevel, 1000);
    }
  }, [gameState, isPaused, playerInput, sequence, currentLevel, playTone, startGame, nextLevel, onProgress, sequenceLength]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'ready') {
        if (e.key === ' ' || e.key === 'Enter') {
          startGame();
        }
        return;
      }

      if (gameState !== 'input' || isPaused) return;

      // Arrow keys or number keys 1-4
      const keyMap: Record<string, number> = {
        'ArrowUp': 0,
        'ArrowRight': 1,
        'ArrowDown': 2,
        'ArrowLeft': 3,
        '1': 0,
        '2': 1,
        '3': 2,
        '4': 3,
      };

      const colorIndex = keyMap[e.key];
      if (colorIndex !== undefined) {
        handleColorClick(colorIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused, startGame, handleColorClick]);

  // Auto-start
  useEffect(() => {
    if (gameState === 'ready') {
      const timer = setTimeout(startGame, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, startGame]);

  return (
    <div className="flex flex-col items-center p-6">
      {/* Level & Score */}
      <div className="flex gap-8 mb-4">
        <div className="text-center">
          <span className="text-sm text-gray-500">Level</span>
          <p className="text-2xl font-bold text-gray-800">
            {currentLevel}/{sequenceLength}
          </p>
        </div>
        <div className="text-center">
          <span className="text-sm text-gray-500">Score</span>
          <p className="text-2xl font-bold text-blue-600">{score}</p>
        </div>
      </div>

      {/* Message */}
      <div
        className={`
          mb-6 px-4 py-2 rounded-lg text-center font-medium
          ${gameState === 'correct' ? 'bg-green-100 text-green-700' : ''}
          ${gameState === 'wrong' ? 'bg-red-100 text-red-700' : ''}
          ${gameState === 'complete' ? 'bg-yellow-100 text-yellow-700' : ''}
          ${gameState === 'showing' || gameState === 'input' ? 'bg-blue-100 text-blue-700' : ''}
          ${gameState === 'ready' ? 'bg-gray-100 text-gray-700' : ''}
        `}
      >
        {message}
      </div>

      {/* Color buttons - 2x2 grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {COLORS.map((color, index) => (
          <button
            key={color.name}
            onClick={() => handleColorClick(index)}
            disabled={gameState !== 'input' || isPaused}
            className={`
              w-24 h-24 md:w-32 md:h-32
              rounded-2xl border-4
              transition-all duration-150
              ${color.border}
              ${activeIndex === index ? color.active : color.bg}
              ${activeIndex === index ? 'scale-95 shadow-lg' : 'shadow-md'}
              ${gameState === 'input' && !isPaused ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}
              disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400
            `}
            aria-label={`${color.name} button`}
          />
        ))}
      </div>

      {/* Progress indicator */}
      {gameState === 'input' && (
        <div className="flex gap-2 mb-4">
          {sequence.map((_, index) => (
            <div
              key={index}
              className={`
                w-3 h-3 rounded-full transition-colors
                ${index < playerInput.length ? 'bg-green-500' : 'bg-gray-300'}
              `}
            />
          ))}
        </div>
      )}

      {/* Showing indicator */}
      {gameState === 'showing' && (
        <div className="flex items-center gap-2 text-gray-500">
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Watch closely...</span>
        </div>
      )}

      {/* Completion celebration */}
      {gameState === 'complete' && (
        <div className="text-center animate-bounce">
          <span className="text-6xl">🎉</span>
          <p className="text-xl font-bold text-gray-800 mt-2">
            Pattern Master!
          </p>
          <p className="text-gray-600">
            Final Score: {score}/{sequenceLength * 10}
          </p>
        </div>
      )}

      {/* Pause indicator */}
      {isPaused && gameState !== 'complete' && (
        <div className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
          Game Paused
        </div>
      )}

      {/* Keyboard hint */}
      <p className="mt-4 text-xs text-gray-400">
        Use arrow keys or number keys 1-4 to play
      </p>
    </div>
  );
}

export default PatternGame;
