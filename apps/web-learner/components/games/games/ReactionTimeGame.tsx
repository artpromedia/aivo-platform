'use client';

import * as React from 'react';
import { cn } from '@aivo/ui-web';

import type { BaseGameProps, GameMetrics, GameResult } from '../types';

type GameState = 'waiting' | 'ready' | 'stimulus' | 'clicked' | 'too_early' | 'round_complete';

interface ReactionRound {
  reactionTime: number;
  tooEarly: boolean;
}

const TOTAL_ROUNDS = 5;
const MIN_WAIT_TIME = 2000; // 2 seconds minimum wait
const MAX_WAIT_TIME = 5000; // 5 seconds maximum wait

const ENCOURAGEMENT_MESSAGES = {
  excellent: ['Lightning fast!', 'Incredible reflexes!', 'You\'re on fire!'],
  good: ['Great reaction!', 'Nice speed!', 'Well done!'],
  average: ['Good effort!', 'Keep practicing!', 'Getting better!'],
  slow: ['Stay focused!', 'Watch carefully!', 'You can do it!'],
};

function getEncouragement(reactionTime: number): string {
  const messages =
    reactionTime < 200
      ? ENCOURAGEMENT_MESSAGES.excellent
      : reactionTime < 300
        ? ENCOURAGEMENT_MESSAGES.good
        : reactionTime < 400
          ? ENCOURAGEMENT_MESSAGES.average
          : ENCOURAGEMENT_MESSAGES.slow;
  return messages[Math.floor(Math.random() * messages.length)];
}

function calculateStars(avgReactionTime: number, difficulty: string): number {
  const thresholds = {
    easy: { three: 350, two: 450 },
    medium: { three: 300, two: 400 },
    hard: { three: 250, two: 350 },
  };
  const { three, two } = thresholds[difficulty as keyof typeof thresholds] || thresholds.medium;

  if (avgReactionTime <= three) return 3;
  if (avgReactionTime <= two) return 2;
  return 1;
}

export function ReactionTimeGame({ config, onComplete, onExit, className }: BaseGameProps) {
  const [gameState, setGameState] = React.useState<GameState>('waiting');
  const [currentRound, setCurrentRound] = React.useState(0);
  const [rounds, setRounds] = React.useState<ReactionRound[]>([]);
  const [currentReactionTime, setCurrentReactionTime] = React.useState<number | null>(null);
  const [encouragement, setEncouragement] = React.useState('');

  const stimulusTimeRef = React.useRef<number>(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = React.useRef<number>(Date.now());

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const startRound = React.useCallback(() => {
    setGameState('ready');
    setCurrentReactionTime(null);
    setEncouragement('');

    // Random wait time before showing stimulus
    const waitTime = MIN_WAIT_TIME + Math.random() * (MAX_WAIT_TIME - MIN_WAIT_TIME);

    timerRef.current = setTimeout(() => {
      setGameState('stimulus');
      stimulusTimeRef.current = Date.now();
    }, waitTime);
  }, []);

  const handleClick = React.useCallback(() => {
    if (gameState === 'waiting') {
      startTimeRef.current = Date.now();
      startRound();
      return;
    }

    if (gameState === 'ready') {
      // Clicked too early!
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setGameState('too_early');
      setRounds((prev) => [...prev, { reactionTime: 0, tooEarly: true }]);
      setEncouragement('Too early! Wait for the green signal.');

      setTimeout(() => {
        if (currentRound + 1 >= TOTAL_ROUNDS) {
          setGameState('round_complete');
        } else {
          setCurrentRound((prev) => prev + 1);
          startRound();
        }
      }, 1500);
      return;
    }

    if (gameState === 'stimulus') {
      const reactionTime = Date.now() - stimulusTimeRef.current;
      setCurrentReactionTime(reactionTime);
      setGameState('clicked');
      setRounds((prev) => [...prev, { reactionTime, tooEarly: false }]);
      setEncouragement(getEncouragement(reactionTime));

      setTimeout(() => {
        if (currentRound + 1 >= TOTAL_ROUNDS) {
          setGameState('round_complete');
        } else {
          setCurrentRound((prev) => prev + 1);
          startRound();
        }
      }, 1500);
    }
  }, [gameState, currentRound, startRound]);

  // Complete game
  React.useEffect(() => {
    if (gameState === 'round_complete' && rounds.length === TOTAL_ROUNDS) {
      const validRounds = rounds.filter((r) => !r.tooEarly);
      const avgReactionTime =
        validRounds.length > 0
          ? validRounds.reduce((sum, r) => sum + r.reactionTime, 0) / validRounds.length
          : 999;
      const bestReactionTime =
        validRounds.length > 0 ? Math.min(...validRounds.map((r) => r.reactionTime)) : 0;

      const metrics: GameMetrics = {
        score: Math.max(0, Math.round(1000 - avgReactionTime * 2)),
        maxScore: 1000,
        correctAnswers: validRounds.length,
        totalAttempts: TOTAL_ROUNDS,
        averageResponseTime: Math.round(avgReactionTime),
        bestResponseTime: bestReactionTime,
        duration: Math.round((Date.now() - startTimeRef.current) / 1000),
      };

      const stars = calculateStars(avgReactionTime, config.difficulty);

      const result: GameResult = {
        completed: true,
        metrics,
        xpEarned: stars * 25 + validRounds.length * 10,
        coinsEarned: stars * 5,
        isPersonalBest: false, // Would be determined by comparing to stored data
        stars,
      };

      // Small delay before completing to show final state
      setTimeout(() => {
        onComplete(result);
      }, 500);
    }
  }, [gameState, rounds, config.difficulty, onComplete]);

  const getBackgroundColor = () => {
    switch (gameState) {
      case 'waiting':
        return 'from-slate-600 to-slate-800';
      case 'ready':
        return 'from-red-500 to-red-700';
      case 'stimulus':
        return 'from-green-400 to-green-600';
      case 'clicked':
        return 'from-blue-500 to-blue-700';
      case 'too_early':
        return 'from-orange-500 to-orange-700';
      case 'round_complete':
        return 'from-purple-500 to-purple-700';
      default:
        return 'from-slate-600 to-slate-800';
    }
  };

  const getInstructions = () => {
    switch (gameState) {
      case 'waiting':
        return 'Click anywhere to start!';
      case 'ready':
        return 'Wait for green...';
      case 'stimulus':
        return 'CLICK NOW!';
      case 'clicked':
        return `${currentReactionTime}ms`;
      case 'too_early':
        return 'Too early!';
      case 'round_complete':
        return 'Complete!';
      default:
        return '';
    }
  };

  // Calculate current average
  const validRounds = rounds.filter((r) => !r.tooEarly);
  const currentAverage =
    validRounds.length > 0
      ? Math.round(validRounds.reduce((sum, r) => sum + r.reactionTime, 0) / validRounds.length)
      : null;

  return (
    <div
      className={cn(
        'relative flex min-h-[500px] cursor-pointer select-none flex-col items-center justify-center rounded-2xl p-8 text-white transition-all duration-300',
        `bg-gradient-to-br ${getBackgroundColor()}`,
        className
      )}
      onClick={handleClick}
    >
      {/* Exit button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        className="absolute right-4 top-4 rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30"
        aria-label="Exit game"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Round counter */}
      <div className="absolute left-4 top-4 rounded-full bg-white/20 px-4 py-2 font-mono">
        Round {currentRound + 1}/{TOTAL_ROUNDS}
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center">
        {/* Visual target */}
        <div
          className={cn(
            'mb-8 flex h-48 w-48 items-center justify-center rounded-full transition-all duration-200',
            gameState === 'stimulus' ? 'scale-110 bg-white/30' : 'bg-white/20'
          )}
        >
          <span className="text-6xl">
            {gameState === 'stimulus' ? '!' : gameState === 'too_early' ? 'X' : '?'}
          </span>
        </div>

        {/* Instructions */}
        <h2 className="mb-4 text-4xl font-bold">{getInstructions()}</h2>

        {/* Encouragement message */}
        {encouragement && (
          <p className="mb-4 text-xl font-medium opacity-90">{encouragement}</p>
        )}

        {/* Current average */}
        {currentAverage !== null && (
          <div className="mt-4 rounded-xl bg-white/20 px-6 py-3">
            <p className="text-sm opacity-80">Average Reaction Time</p>
            <p className="text-2xl font-bold">{currentAverage}ms</p>
          </div>
        )}

        {/* Round indicators */}
        <div className="mt-6 flex gap-2">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
            const round = rounds[i];
            return (
              <div
                key={i}
                className={cn(
                  'h-3 w-3 rounded-full transition-colors',
                  i < rounds.length
                    ? round?.tooEarly
                      ? 'bg-orange-400'
                      : 'bg-green-400'
                    : i === currentRound
                      ? 'bg-white animate-pulse'
                      : 'bg-white/30'
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Instructions overlay for first time */}
      {gameState === 'waiting' && (
        <div className="absolute bottom-8 text-center opacity-70">
          <p className="text-sm">
            Test your reflexes! Click as fast as you can when the screen turns green.
          </p>
          <p className="mt-1 text-xs">But don&apos;t click too early!</p>
        </div>
      )}
    </div>
  );
}
