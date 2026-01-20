/**
 * GamePlayer - Main game container component
 *
 * Features:
 * - Shows instructions before game
 * - Renders the appropriate game based on config
 * - Handles game state transitions
 * - Shows timer and controls during gameplay
 * - Displays results on completion
 */

'use client';

import React, { useState, useCallback } from 'react';
import type {
  GameDefinition,
  GamePhase,
  GameResult,
  BreathingVisualizerConfig,
  MemoryGameConfig,
  PatternGameConfig,
  ColorMatchConfig,
  SequenceGameConfig,
} from '../../lib/games/game-types';
import { GameInstructions } from './shared/GameInstructions';
import { GameTimer, GameCountup } from './shared/GameTimer';
import { BreathingExercise } from './games/BreathingExercise';
import { MemoryMatchGame } from './games/MemoryMatchGame';
import { PatternGame } from './games/PatternGame';
import { ColorMatchGame } from './games/ColorMatchGame';
import { CountingGame } from './games/CountingGame';

export interface GamePlayerProps {
  game: GameDefinition;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
  showTimer?: boolean;
}

export function GamePlayer({
  game,
  onComplete,
  onExit,
  showTimer = true,
}: GamePlayerProps) {
  const [phase, setPhase] = useState<GamePhase>('instructions');
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [progress, setProgress] = useState(0);

  // Start the game
  const handleStart = useCallback(() => {
    setPhase('playing');
    setElapsedSeconds(0);
  }, []);

  // Handle game completion
  const handleGameComplete = useCallback((score: number, maxScore: number) => {
    setPhase('completed');
    onComplete({
      completed: true,
      score,
      maxScore,
      durationSeconds: elapsedSeconds,
    });
  }, [elapsedSeconds, onComplete]);

  // Handle progress update
  const handleProgress = useCallback((p: number) => {
    setProgress(p);
  }, []);

  // Handle pause/resume
  const togglePause = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  // Timer tick
  React.useEffect(() => {
    if (phase !== 'playing' || isPaused) return;

    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, isPaused]);

  // Render the appropriate game component
  const renderGame = () => {
    const gameId = game.id;
    const config = game.config;

    // Breathing exercises
    if (gameId.includes('breathing') || 'pattern' in config && 'inhaleSeconds' in config) {
      return (
        <BreathingExercise
          config={config as BreathingVisualizerConfig}
          onComplete={handleGameComplete}
          onProgress={handleProgress}
          isPaused={isPaused}
        />
      );
    }

    // Memory games
    if (gameId.includes('memory') || 'cardPairs' in config) {
      return (
        <MemoryMatchGame
          config={config as MemoryGameConfig}
          onComplete={handleGameComplete}
          onProgress={handleProgress}
          isPaused={isPaused}
        />
      );
    }

    // Pattern games
    if (gameId.includes('pattern') || ('sequenceLength' in config && 'speed' in config)) {
      return (
        <PatternGame
          config={config as PatternGameConfig}
          onComplete={handleGameComplete}
          onProgress={handleProgress}
          isPaused={isPaused}
        />
      );
    }

    // Color match games
    if (gameId.includes('color') || 'colorCount' in config) {
      return (
        <ColorMatchGame
          config={config as ColorMatchConfig}
          onComplete={handleGameComplete}
          onProgress={handleProgress}
          isPaused={isPaused}
        />
      );
    }

    // Sequence/counting games
    if (gameId.includes('sequence') || gameId.includes('counting') || 'sequenceType' in config) {
      return (
        <CountingGame
          config={config as SequenceGameConfig}
          onComplete={handleGameComplete}
          onProgress={handleProgress}
          isPaused={isPaused}
        />
      );
    }

    // Fallback for unsupported games
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p>Game type not yet implemented</p>
        <button
          onClick={onExit}
          className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Go Back
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-[500px] bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Exit game"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <h2 className="font-semibold text-gray-800">{game.title}</h2>
        </div>

        {/* Timer and controls (visible during gameplay) */}
        {phase === 'playing' && showTimer && (
          <div className="flex items-center gap-4">
            {game.durationSeconds > 0 ? (
              <GameTimer
                totalSeconds={game.durationSeconds}
                remainingSeconds={Math.max(0, game.durationSeconds - elapsedSeconds)}
                size="sm"
                variant="circular"
              />
            ) : (
              <GameCountup
                elapsedSeconds={elapsedSeconds}
                size="sm"
              />
            )}

            <button
              onClick={togglePause}
              className={`
                p-2 rounded-lg transition-colors
                ${isPaused
                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
              aria-label={isPaused ? 'Resume game' : 'Pause game'}
            >
              {isPaused ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Progress bar (visible during gameplay) */}
      {phase === 'playing' && progress > 0 && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {phase === 'instructions' && (
          <GameInstructions
            title={game.title}
            description={game.description}
            instructions={game.instructions}
            durationSeconds={game.durationSeconds}
            category={game.category}
            onStart={handleStart}
            onSkip={onExit}
          />
        )}

        {(phase === 'playing' || phase === 'paused') && (
          <div className="relative">
            {renderGame()}

            {/* Pause overlay */}
            {isPaused && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-gray-700 mb-4">
                  Game Paused
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={togglePause}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                  >
                    Resume
                  </button>
                  <button
                    onClick={onExit}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {phase === 'completed' && (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Game Complete!
            </h2>
            <p className="text-gray-600 mb-6">
              Time: {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
            </p>
            <button
              onClick={onExit}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GamePlayer;
