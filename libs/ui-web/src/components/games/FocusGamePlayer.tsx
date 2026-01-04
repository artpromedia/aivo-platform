'use client';

import * as React from 'react';

import { cn } from '../../utils/cn';

import type { FocusGamePlayerProps, FocusMetrics } from './types';

/**
 * FocusGamePlayer Component
 *
 * Interactive player for focus/regulation activities with
 * animations and guided instructions.
 */
export function FocusGamePlayer({
  gameId,
  activityType,
  instructions,
  duration,
  audioUrl,
  animationType = 'breathing',
  onComplete,
  onExit,
  className,
}: FocusGamePlayerProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [timeRemaining, setTimeRemaining] = React.useState(duration);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const [breathPhase, setBreathPhase] = React.useState<'inhale' | 'hold' | 'exhale'>('inhale');

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const startTimeRef = React.useRef<number>(Date.now());

  // Timer effect
  React.useEffect(() => {
    if (isPaused || isComplete) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsComplete(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isPaused, isComplete]);

  // Breathing animation phase
  React.useEffect(() => {
    if (animationType !== 'breathing' || isPaused || isComplete) return;

    const breathCycle = () => {
      setBreathPhase('inhale');
      setTimeout(() => {
        setBreathPhase('hold');
      }, 4000);
      setTimeout(() => {
        setBreathPhase('exhale');
      }, 6000);
    };

    breathCycle();
    const interval = setInterval(breathCycle, 10000);
    return () => {
      clearInterval(interval);
    };
  }, [animationType, isPaused, isComplete]);

  // Step progression
  React.useEffect(() => {
    if (isPaused || isComplete || instructions.length <= 1) return;

    const stepDuration = duration / instructions.length;
    const elapsed = duration - timeRemaining;
    const newStep = Math.min(Math.floor(elapsed / stepDuration), instructions.length - 1);

    if (newStep !== currentStep) {
      setCurrentStep(newStep);
    }
  }, [timeRemaining, duration, instructions.length, currentStep, isPaused, isComplete]);

  // Handle completion
  React.useEffect(() => {
    if (isComplete && onComplete) {
      const metrics: FocusMetrics = {
        averageResponseTime: 0,
        focusDuration: duration - timeRemaining,
        distractionCount: 0,
        engagementScore: Math.round(((duration - timeRemaining) / duration) * 100),
      };
      onComplete(metrics);
    }
  }, [isComplete, onComplete, duration, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnimationClass = () => {
    switch (animationType) {
      case 'breathing':
        return breathPhase === 'inhale'
          ? 'scale-100 opacity-100'
          : breathPhase === 'hold'
            ? 'scale-110 opacity-100'
            : 'scale-90 opacity-70';
      case 'waves':
        return 'animate-wave';
      case 'pulse':
        return 'animate-pulse';
      default:
        return '';
    }
  };

  const getBreathText = () => {
    switch (breathPhase) {
      case 'inhale':
        return 'Breathe in...';
      case 'hold':
        return 'Hold...';
      case 'exhale':
        return 'Breathe out...';
    }
  };

  if (isComplete) {
    return (
      <div
        className={cn(
          'flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 p-8 text-white',
          className
        )}
      >
        <span className="mb-4 text-6xl">🎉</span>
        <h2 className="mb-2 text-2xl font-bold">Great Job!</h2>
        <p className="mb-6 text-lg opacity-90">You completed the activity</p>
        <button
          onClick={onExit}
          className="rounded-full bg-white px-6 py-3 font-medium text-green-600 shadow-lg transition-transform hover:scale-105"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white',
        className
      )}
      data-game-id={gameId}
    >
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute right-4 top-4 rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30"
        aria-label="Exit activity"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Timer */}
      <div className="absolute left-4 top-4 rounded-full bg-white/20 px-4 py-2 font-mono text-lg">
        {formatTime(timeRemaining)}
      </div>

      {/* Animation circle */}
      <div
        className={cn(
          'mb-8 flex h-48 w-48 items-center justify-center rounded-full bg-white/20 transition-all duration-[4000ms] ease-in-out',
          getAnimationClass()
        )}
      >
        {animationType === 'breathing' && (
          <span className="text-xl font-medium">{getBreathText()}</span>
        )}
      </div>

      {/* Current instruction */}
      <p className="mb-6 max-w-md text-center text-xl font-medium">{instructions[currentStep]}</p>

      {/* Progress dots */}
      {instructions.length > 1 && (
        <div className="flex gap-2">
          {instructions.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                i <= currentStep ? 'bg-white' : 'bg-white/30'
              )}
            />
          ))}
        </div>
      )}

      {/* Pause button */}
      <button
        onClick={() => {
          setIsPaused(!isPaused);
        }}
        className="absolute bottom-4 rounded-full bg-white/20 px-6 py-3 font-medium transition-colors hover:bg-white/30"
      >
        {isPaused ? '▶ Resume' : '⏸ Pause'}
      </button>

      {/* Audio element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} autoPlay={!isPaused} />}
    </div>
  );
}
