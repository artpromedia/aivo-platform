'use client';

import * as React from 'react';
import { cn } from '@aivo/ui-web';

import type { BaseGameProps, GameMetrics, GameResult } from '../types';

type GamePhase = 'idle' | 'showing' | 'input' | 'success' | 'failure' | 'complete';
type ColorButton = 'red' | 'blue' | 'green' | 'yellow';

const COLORS: ColorButton[] = ['red', 'blue', 'green', 'yellow'];

const COLOR_STYLES: Record<ColorButton, { base: string; active: string; ring: string }> = {
  red: {
    base: 'bg-red-500',
    active: 'bg-red-300 shadow-[0_0_30px_rgba(239,68,68,0.8)]',
    ring: 'ring-red-400',
  },
  blue: {
    base: 'bg-blue-500',
    active: 'bg-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.8)]',
    ring: 'ring-blue-400',
  },
  green: {
    base: 'bg-green-500',
    active: 'bg-green-300 shadow-[0_0_30px_rgba(34,197,94,0.8)]',
    ring: 'ring-green-400',
  },
  yellow: {
    base: 'bg-yellow-400',
    active: 'bg-yellow-200 shadow-[0_0_30px_rgba(250,204,21,0.8)]',
    ring: 'ring-yellow-400',
  },
};

// Simple audio frequencies for each color
const COLOR_FREQUENCIES: Record<ColorButton, number> = {
  red: 261.63, // C4
  blue: 329.63, // E4
  green: 392.0, // G4
  yellow: 523.25, // C5
};

function playTone(frequency: number, duration: number = 200) {
  if (typeof window === 'undefined') return;

  try {
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch {
    // Audio not supported, continue silently
  }
}

function calculateStars(maxLevel: number, difficulty: string): number {
  const thresholds = {
    easy: { three: 8, two: 5 },
    medium: { three: 10, two: 7 },
    hard: { three: 12, two: 9 },
  };
  const { three, two } = thresholds[difficulty as keyof typeof thresholds] || thresholds.medium;

  if (maxLevel >= three) return 3;
  if (maxLevel >= two) return 2;
  return 1;
}

export function SimonSaysGame({ config, onComplete, onExit, className }: BaseGameProps) {
  const [phase, setPhase] = React.useState<GamePhase>('idle');
  const [sequence, setSequence] = React.useState<ColorButton[]>([]);
  const [playerInput, setPlayerInput] = React.useState<ColorButton[]>([]);
  const [activeButton, setActiveButton] = React.useState<ColorButton | null>(null);
  const [level, setLevel] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [highestLevel, setHighestLevel] = React.useState(0);
  const [showingIndex, setShowingIndex] = React.useState(0);
  const [feedback, setFeedback] = React.useState<string>('');

  const startTimeRef = React.useRef<number>(Date.now());
  const responseTimes = React.useRef<number[]>([]);
  const inputStartRef = React.useRef<number>(0);

  // Speed based on difficulty and level
  const getShowDelay = () => {
    const baseDelay = config.difficulty === 'easy' ? 800 : config.difficulty === 'medium' ? 600 : 400;
    return Math.max(200, baseDelay - level * 20);
  };

  // Start a new game
  const startGame = () => {
    setSequence([]);
    setPlayerInput([]);
    setLevel(0);
    setScore(0);
    setHighestLevel(0);
    startTimeRef.current = Date.now();
    responseTimes.current = [];
    addToSequence([]);
  };

  // Add a new color to the sequence
  const addToSequence = (currentSequence: ColorButton[]) => {
    const newColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const newSequence = [...currentSequence, newColor];
    setSequence(newSequence);
    setLevel(newSequence.length);
    setHighestLevel((prev) => Math.max(prev, newSequence.length));
    setPlayerInput([]);
    setShowingIndex(0);
    setPhase('showing');
  };

  // Show sequence animation
  React.useEffect(() => {
    if (phase !== 'showing' || sequence.length === 0) return;

    if (showingIndex < sequence.length) {
      const color = sequence[showingIndex];
      setActiveButton(color);
      playTone(COLOR_FREQUENCIES[color], getShowDelay() * 0.8);

      const timeout = setTimeout(() => {
        setActiveButton(null);
        setTimeout(() => {
          setShowingIndex((prev) => prev + 1);
        }, 150);
      }, getShowDelay());

      return () => clearTimeout(timeout);
    } else {
      // Done showing, player's turn
      setPhase('input');
      inputStartRef.current = Date.now();
    }
  }, [phase, showingIndex, sequence]);

  // Handle player button press
  const handleButtonPress = (color: ColorButton) => {
    if (phase !== 'input') return;

    setActiveButton(color);
    playTone(COLOR_FREQUENCIES[color], 150);

    setTimeout(() => setActiveButton(null), 150);

    const newInput = [...playerInput, color];
    setPlayerInput(newInput);

    const currentIndex = newInput.length - 1;
    const isCorrect = sequence[currentIndex] === color;

    if (!isCorrect) {
      // Wrong!
      setPhase('failure');
      setFeedback(`Game Over! You reached level ${level}`);
      responseTimes.current.push(Date.now() - inputStartRef.current);

      setTimeout(() => {
        completeGame();
      }, 2000);
      return;
    }

    // Correct so far
    if (newInput.length === sequence.length) {
      // Completed the sequence!
      responseTimes.current.push(Date.now() - inputStartRef.current);
      const pointsEarned = level * 10;
      setScore((prev) => prev + pointsEarned);
      setPhase('success');
      setFeedback('Great! Get ready for the next level!');

      setTimeout(() => {
        addToSequence(sequence);
      }, 1500);
    }
  };

  const completeGame = () => {
    const avgResponseTime =
      responseTimes.current.length > 0
        ? responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length
        : 0;

    const metrics: GameMetrics = {
      score,
      maxScore: 1000,
      correctAnswers: highestLevel - 1,
      totalAttempts: highestLevel,
      averageResponseTime: Math.round(avgResponseTime),
      duration: Math.round((Date.now() - startTimeRef.current) / 1000),
      levelReached: highestLevel,
    };

    const stars = calculateStars(highestLevel, config.difficulty);

    const result: GameResult = {
      completed: true,
      metrics,
      xpEarned: stars * 25 + score / 5,
      coinsEarned: stars * 5 + Math.floor(score / 20),
      isPersonalBest: false,
      stars,
    };

    setPhase('complete');
    setTimeout(() => onComplete(result), 500);
  };

  const getPhaseMessage = () => {
    switch (phase) {
      case 'idle':
        return 'Press Start to play!';
      case 'showing':
        return 'Watch carefully...';
      case 'input':
        return 'Your turn! Repeat the pattern';
      case 'success':
        return feedback;
      case 'failure':
        return feedback;
      default:
        return '';
    }
  };

  return (
    <div
      className={cn(
        'relative flex min-h-[600px] flex-col rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-white/20 px-4 py-2 font-mono">
            Level {level}
          </div>
          <div className="rounded-full bg-white/20 px-4 py-2 font-mono">
            Score: {score}
          </div>
        </div>

        <button
          onClick={onExit}
          className="rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30"
          aria-label="Exit game"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Simon Says</h2>
        <p className={cn(
          'text-lg transition-all',
          phase === 'showing' ? 'animate-pulse' : ''
        )}>
          {getPhaseMessage()}
        </p>
      </div>

      {/* Game board */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
            {phase === 'idle' ? (
              <button
                onClick={startGame}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 font-bold text-lg hover:from-green-300 hover:to-green-500 transition-all"
              >
                START
              </button>
            ) : (
              <div className="text-center">
                <div className="text-2xl font-bold">{level}</div>
                <div className="text-xs opacity-70">Level</div>
              </div>
            )}
          </div>

          {/* Color buttons in a 2x2 grid */}
          <div className="grid grid-cols-2 gap-4 w-80 h-80">
            {COLORS.map((color) => {
              const styles = COLOR_STYLES[color];
              const isActive = activeButton === color;
              const isDisabled = phase !== 'input';

              return (
                <button
                  key={color}
                  className={cn(
                    'rounded-3xl transition-all duration-150',
                    isActive ? styles.active : styles.base,
                    isDisabled && phase !== 'showing'
                      ? 'opacity-50'
                      : 'hover:brightness-110 active:brightness-125',
                    color === 'red' && 'rounded-tl-[100px]',
                    color === 'blue' && 'rounded-tr-[100px]',
                    color === 'green' && 'rounded-bl-[100px]',
                    color === 'yellow' && 'rounded-br-[100px]'
                  )}
                  onClick={() => handleButtonPress(color)}
                  disabled={isDisabled}
                  aria-label={color}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      {phase === 'input' && (
        <div className="flex justify-center gap-2 mt-6">
          {sequence.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-3 w-3 rounded-full transition-colors',
                index < playerInput.length ? 'bg-green-400' : 'bg-white/30'
              )}
            />
          ))}
        </div>
      )}

      {/* Celebratory message for success */}
      {phase === 'success' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-6xl animate-bounce">
            {level >= 10 ? '🎉' : level >= 5 ? '🌟' : '✨'}
          </div>
        </div>
      )}

      {/* Failure animation */}
      {phase === 'failure' && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-2xl pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">😔</div>
            <div className="text-xl font-bold">{feedback}</div>
            <div className="text-lg mt-2">Score: {score}</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {phase === 'idle' && (
        <div className="text-center text-sm opacity-60 mt-4">
          <p>Watch the sequence of colors and repeat it back!</p>
          <p>The sequence gets longer each round.</p>
        </div>
      )}
    </div>
  );
}
