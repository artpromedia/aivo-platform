'use client';

/**
 * MovementBreak Component
 * Physical movement prompts with animations and accessibility alternatives
 */

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_MOVEMENTS, type GradeBand, type MovementStep } from '@/lib/self-regulation/regulation-types';

// ============================================================================
// Types
// ============================================================================

interface MovementBreakProps {
  gradeBand: GradeBand;
  movements?: MovementStep[];
  onComplete: () => void;
  onCancel?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ANIMATION_CLASSES: Record<string, string> = {
  bounce: 'animate-bounce',
  stretch: 'animate-pulse',
  shake: 'animate-ping',
  rotate: 'animate-spin',
  breathe: 'animate-pulse',
};

const MOVEMENT_EMOJIS: Record<string, string> = {
  'shoulder-roll': '🔄',
  'neck-stretch': '😌',
  'arm-stretch': '🙆',
  'shake-it-out': '💃',
  'toe-touches': '🙇',
  'march-in-place': '🚶',
};

// ============================================================================
// Component
// ============================================================================

export function MovementBreak({
  gradeBand,
  movements = DEFAULT_MOVEMENTS,
  onComplete,
  onCancel,
}: Readonly<MovementBreakProps>) {
  // State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [phase, setPhase] = useState<'intro' | 'moving' | 'rest' | 'complete'>('intro');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [useSeatedOption, setUseSeatedOption] = useState<boolean>(false);
  const [completedCount, setCompletedCount] = useState<number>(0);

  // Get current movement
  const currentMovement = movements[currentIndex];
  const isLastMovement = currentIndex === movements.length - 1;
  const totalDuration = movements.reduce((sum, m) => sum + m.durationSeconds, 0);

  // Timer effect
  useEffect(() => {
    if (phase !== 'moving' || isPaused) return;

    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Movement complete
      setCompletedCount((prev) => prev + 1);
      if (isLastMovement) {
        setPhase('complete');
      } else {
        setPhase('rest');
      }
    }
  }, [phase, timeLeft, isPaused, isLastMovement]);

  // Start movement
  const startMovement = useCallback(() => {
    setTimeLeft(currentMovement.durationSeconds);
    setPhase('moving');
    setIsPaused(false);
  }, [currentMovement]);

  // Move to next
  const nextMovement = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
    setPhase('moving');
    setTimeLeft(movements[currentIndex + 1].durationSeconds);
  }, [currentIndex, movements]);

  // Skip current movement
  const skipMovement = useCallback(() => {
    if (isLastMovement) {
      setPhase('complete');
    } else {
      setCurrentIndex((prev) => prev + 1);
      setPhase('rest');
    }
  }, [isLastMovement]);

  // Get age-appropriate text
  const getText = useCallback(
    (key: string): string => {
      const texts: Record<string, Record<GradeBand, string>> = {
        introTitle: {
          K5: "Let's Move!",
          G6_8: 'Movement Break',
          G9_12: 'Movement Break',
        },
        introDesc: {
          K5: 'Time to stretch and move your body!',
          G6_8: 'Take a quick break to move and stretch.',
          G9_12: 'Physical movement helps release tension and improves focus.',
        },
        startBtn: {
          K5: "Let's go!",
          G6_8: 'Start',
          G9_12: 'Begin',
        },
        completeTitle: {
          K5: 'Great moving!',
          G6_8: 'Well done!',
          G9_12: 'Movement Complete',
        },
        completeDesc: {
          K5: 'You moved your body! How does it feel?',
          G6_8: 'Nice work getting your body moving!',
          G9_12: 'Movement helps regulate your nervous system and improve focus.',
        },
      };
      return texts[key]?.[gradeBand] || texts[key]?.G6_8 || '';
    },
    [gradeBand]
  );

  // Get animation for current movement
  const getAnimationClass = (): string => {
    if (isPaused || phase !== 'moving') return '';
    return ANIMATION_CLASSES[currentMovement.animationType] || '';
  };

  // ============================================================================
  // Render - Intro
  // ============================================================================

  if (phase === 'intro') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-slate-600 hover:text-slate-900"
            >
              ← Back
            </button>
          )}
          <div className="w-12" />
        </div>

        {/* Content */}
        <div className="text-center">
          <span className="text-6xl block mb-4">🏃</span>
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            {getText('introTitle')}
          </h2>
          <p className="text-slate-600 mb-4">{getText('introDesc')}</p>

          {/* Movement preview */}
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            {movements.slice(0, 4).map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-2xl"
              >
                {MOVEMENT_EMOJIS[movement.id] || '🏃'}
              </div>
            ))}
            {movements.length > 4 && (
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-sm text-slate-600">
                +{movements.length - 4}
              </div>
            )}
          </div>

          <p className="text-sm text-slate-500 mb-4">
            {movements.length} movements • About {Math.round(totalDuration / 60)} minutes
          </p>

          {/* Seated option toggle */}
          <label className="flex items-center justify-center gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={useSeatedOption}
              onChange={(e) => setUseSeatedOption(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-600">
              {gradeBand === 'K5'
                ? 'I want to stay sitting'
                : 'Use seated alternatives'}
            </span>
          </label>

          <button
            onClick={startMovement}
            className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600"
          >
            {getText('startBtn')}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render - Complete
  // ============================================================================

  if (phase === 'complete') {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl shadow-lg p-6 max-w-md mx-auto text-center">
        <span className="text-6xl block mb-4">🌟</span>
        <h2 className="text-2xl font-semibold text-slate-900 mb-3">
          {getText('completeTitle')}
        </h2>
        <p className="text-slate-600 mb-4">{getText('completeDesc')}</p>

        <div className="p-4 bg-white rounded-lg mb-6">
          <p className="text-sm text-slate-600">
            {gradeBand === 'K5'
              ? `You did ${completedCount} movements!`
              : `Completed ${completedCount} of ${movements.length} movements`}
          </p>
        </div>

        <button
          onClick={onComplete}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
        >
          {gradeBand === 'K5' ? 'Done!' : 'Continue'}
        </button>
      </div>
    );
  }

  // ============================================================================
  // Render - Rest between movements
  // ============================================================================

  if (phase === 'rest') {
    const nextMovement = movements[currentIndex + 1];

    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 max-w-md mx-auto text-center">
        <span className="text-5xl block mb-4">✅</span>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {gradeBand === 'K5' ? 'Good job!' : 'Nice work!'}
        </h2>
        <p className="text-slate-600 mb-6">
          {gradeBand === 'K5' ? 'Ready for the next one?' : 'Take a breath before the next movement.'}
        </p>

        {/* Next movement preview */}
        {nextMovement && (
          <div className="p-4 bg-white rounded-lg mb-6">
            <p className="text-sm text-slate-500 mb-2">Up next:</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">
                {MOVEMENT_EMOJIS[nextMovement.id] || '🏃'}
              </span>
              <div className="text-left">
                <p className="font-medium text-slate-900">{nextMovement.name}</p>
                <p className="text-sm text-slate-600">{nextMovement.durationSeconds}s</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={skipMovement}
            className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
          >
            Skip
          </button>
          <button
            onClick={nextMovement ? nextMovement : onComplete}
            className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600"
          >
            {gradeBand === 'K5' ? 'Go!' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render - Moving
  // ============================================================================

  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onCancel}
          className="text-slate-600 hover:text-slate-900 text-sm"
        >
          Exit
        </button>
        <span className="text-sm text-slate-600">
          {currentIndex + 1} of {movements.length}
        </span>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="text-slate-600 hover:text-slate-900 text-sm"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/50 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-orange-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / movements.length) * 100}%` }}
        />
      </div>

      {/* Movement display */}
      <div className="text-center mb-6">
        {/* Animated icon */}
        <div
          className={`text-8xl mb-4 inline-block ${getAnimationClass()}`}
          style={{
            animationDuration: '1s',
            animationIterationCount: 'infinite',
          }}
        >
          {MOVEMENT_EMOJIS[currentMovement.id] || '🏃'}
        </div>

        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {currentMovement.name}
        </h2>

        <p className="text-slate-600 mb-2">
          {useSeatedOption && currentMovement.seatedAlternative
            ? currentMovement.seatedAlternative
            : currentMovement.instruction}
        </p>
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-md">
          <span className="text-4xl font-bold text-orange-600">{timeLeft}</span>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          {gradeBand === 'K5' ? 'seconds left' : 'seconds remaining'}
        </p>
      </div>

      {/* Timer progress ring */}
      <div className="w-full h-3 bg-white/50 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-orange-400 transition-all duration-1000"
          style={{
            width: `${(timeLeft / currentMovement.durationSeconds) * 100}%`,
          }}
        />
      </div>

      {/* Skip button */}
      <button
        onClick={skipMovement}
        className="w-full py-3 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
      >
        {gradeBand === 'K5' ? "I'm done with this one" : 'Skip this movement'}
      </button>

      {/* Paused overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <span className="text-4xl block mb-2">⏸️</span>
            <p className="text-slate-600">Paused</p>
            <button
              onClick={() => setIsPaused(false)}
              className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600"
            >
              Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MovementBreak;
