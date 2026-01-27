'use client';

/**
 * BreathingExercise Component
 * Guided breathing with animated visuals and multiple patterns
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BREATHING_PATTERNS,
  type BreathingPattern,
  type BreathPhase,
  type GradeBand,
} from '@/lib/self-regulation/regulation-types';

// ============================================================================
// Types
// ============================================================================

interface BreathingExerciseProps {
  gradeBand: GradeBand;
  pattern?: BreathingPattern;
  onComplete: () => void;
  onCancel?: () => void;
  showAudioGuidance?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PHASE_INSTRUCTIONS: Record<BreathPhase, Record<GradeBand, string>> = {
  inhale: {
    K5: 'Breathe IN',
    G6_8: 'Breathe in slowly',
    G9_12: 'Inhale through your nose',
  },
  holdIn: {
    K5: 'Hold it!',
    G6_8: 'Hold your breath',
    G9_12: 'Hold',
  },
  exhale: {
    K5: 'Breathe OUT',
    G6_8: 'Breathe out slowly',
    G9_12: 'Exhale through your mouth',
  },
  holdOut: {
    K5: 'Wait...',
    G6_8: 'Pause',
    G9_12: 'Hold empty',
  },
};

// ============================================================================
// Component
// ============================================================================

export function BreathingExercise({
  gradeBand,
  pattern,
  onComplete,
  onCancel,
  showAudioGuidance = false,
}: Readonly<BreathingExerciseProps>) {
  // Get available patterns for this grade band
  const availablePatterns = BREATHING_PATTERNS.filter((p) =>
    p.gradeBands.includes(gradeBand)
  );

  // State
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern>(
    pattern || availablePatterns[0]
  );
  const [phase, setPhase] = useState<'selecting' | 'breathing' | 'complete'>('selecting');
  const [currentPhase, setCurrentPhase] = useState<BreathPhase>('inhale');
  const [phaseTimeLeft, setPhaseTimeLeft] = useState<number>(0);
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [circleScale, setCircleScale] = useState<number>(0.6);

  // Refs for animation
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate total duration for a pattern
  const getTotalDuration = (p: BreathingPattern): number => {
    const cycleDuration =
      p.inhaleSeconds + p.holdInSeconds + p.exhaleSeconds + p.holdOutSeconds;
    return cycleDuration * p.cycles;
  };

  // Get the next phase in the cycle
  const getNextPhase = useCallback((): { phase: BreathPhase; duration: number } | null => {
    const p = selectedPattern;
    const phases: Array<{ phase: BreathPhase; duration: number }> = [
      { phase: 'inhale' as const, duration: p.inhaleSeconds },
      { phase: 'holdIn' as const, duration: p.holdInSeconds },
      { phase: 'exhale' as const, duration: p.exhaleSeconds },
      { phase: 'holdOut' as const, duration: p.holdOutSeconds },
    ].filter((item) => item.duration > 0);

    const currentIndex = phases.findIndex((item) => item.phase === currentPhase);
    const nextIndex = (currentIndex + 1) % phases.length;

    // Check if we completed a cycle
    if (nextIndex === 0) {
      if (currentCycle >= selectedPattern.cycles) {
        return null; // Exercise complete
      }
      setCurrentCycle((prev) => prev + 1);
    }

    return phases[nextIndex];
  }, [currentPhase, currentCycle, selectedPattern]);

  // Update circle scale based on phase
  useEffect(() => {
    if (phase !== 'breathing') return;

    switch (currentPhase) {
      case 'inhale':
        setCircleScale(1.0);
        break;
      case 'holdIn':
        setCircleScale(1.0);
        break;
      case 'exhale':
        setCircleScale(0.6);
        break;
      case 'holdOut':
        setCircleScale(0.6);
        break;
    }
  }, [currentPhase, phase]);

  // Main breathing timer
  useEffect(() => {
    if (phase !== 'breathing' || isPaused) return;

    if (phaseTimeLeft > 0) {
      animationRef.current = setTimeout(() => {
        setPhaseTimeLeft((prev) => prev - 1);
      }, 1000);
    } else {
      // Move to next phase
      const next = getNextPhase();
      if (next) {
        setCurrentPhase(next.phase);
        setPhaseTimeLeft(next.duration);
      } else {
        // Exercise complete
        setPhase('complete');
      }
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [phase, phaseTimeLeft, isPaused, getNextPhase]);

  // Start breathing exercise
  const startExercise = useCallback(() => {
    setPhase('breathing');
    setCurrentPhase('inhale');
    setPhaseTimeLeft(selectedPattern.inhaleSeconds);
    setCurrentCycle(1);
    setIsPaused(false);
  }, [selectedPattern]);

  // Handle complete
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Get phase color
  const getPhaseColor = (): string => {
    switch (currentPhase) {
      case 'inhale':
        return 'from-blue-400 to-indigo-500';
      case 'holdIn':
        return 'from-indigo-400 to-purple-500';
      case 'exhale':
        return 'from-purple-400 to-pink-500';
      case 'holdOut':
        return 'from-pink-400 to-rose-500';
      default:
        return 'from-blue-400 to-indigo-500';
    }
  };

  // ============================================================================
  // Render - Pattern Selection
  // ============================================================================

  if (phase === 'selecting') {
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
          <h2 className="text-xl font-semibold text-slate-900">
            {gradeBand === 'K5' ? 'Breathing Time' : 'Breathing Exercise'}
          </h2>
          <div className="w-12" />
        </div>

        {/* Pattern selection */}
        <div className="space-y-3 mb-6">
          <p className="text-sm text-slate-600 mb-3">
            {gradeBand === 'K5'
              ? 'Choose how you want to breathe:'
              : 'Select a breathing pattern:'}
          </p>

          {availablePatterns.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPattern(p)}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                selectedPattern.id === p.id
                  ? 'bg-indigo-50 border-2 border-indigo-400'
                  : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-sm text-slate-600 mt-1">{p.description}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{Math.round(getTotalDuration(p) / 60)} min</p>
                  <p>{p.cycles} cycles</p>
                </div>
              </div>

              {/* Pattern visualization */}
              <div className="flex items-center gap-1 mt-3">
                <span className="text-xs text-blue-600">
                  In: {p.inhaleSeconds}s
                </span>
                {p.holdInSeconds > 0 && (
                  <span className="text-xs text-purple-600">
                    Hold: {p.holdInSeconds}s
                  </span>
                )}
                <span className="text-xs text-pink-600">
                  Out: {p.exhaleSeconds}s
                </span>
                {p.holdOutSeconds > 0 && (
                  <span className="text-xs text-rose-600">
                    Pause: {p.holdOutSeconds}s
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Start button */}
        <button
          onClick={startExercise}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          {gradeBand === 'K5' ? "Let's breathe!" : 'Start Exercise'}
        </button>
      </div>
    );
  }

  // ============================================================================
  // Render - Breathing Phase
  // ============================================================================

  if (phase === 'breathing') {
    const progress =
      ((currentCycle - 1) * 100 + ((selectedPattern.inhaleSeconds - phaseTimeLeft) / selectedPattern.inhaleSeconds) * 100 / selectedPattern.cycles) /
      selectedPattern.cycles;

    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 max-w-md mx-auto min-h-[500px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onCancel}
            className="text-slate-600 hover:text-slate-900 text-sm"
          >
            Exit
          </button>
          <p className="text-sm text-slate-600">
            Cycle {currentCycle} of {selectedPattern.cycles}
          </p>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="text-slate-600 hover:text-slate-900 text-sm"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-200 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-1000"
            style={{ width: `${(currentCycle / selectedPattern.cycles) * 100}%` }}
          />
        </div>

        {/* Breathing circle */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            {/* Animated circle */}
            <div
              className={`w-48 h-48 rounded-full bg-gradient-to-br ${getPhaseColor()} transition-transform duration-1000 ease-in-out flex items-center justify-center shadow-lg`}
              style={{ transform: `scale(${circleScale})` }}
            >
              {/* Inner content */}
              <div className="text-center text-white">
                <p className="text-3xl font-bold">{phaseTimeLeft}</p>
              </div>
            </div>

            {/* Outer ring */}
            <div
              className={`absolute inset-0 rounded-full border-4 transition-all duration-1000 ${
                currentPhase === 'inhale' || currentPhase === 'holdIn'
                  ? 'border-indigo-300 scale-110'
                  : 'border-purple-300 scale-100'
              }`}
              style={{ transform: `scale(${circleScale * 1.1})` }}
            />
          </div>
        </div>

        {/* Instruction */}
        <div className="text-center mt-8">
          <p className="text-2xl font-semibold text-slate-900">
            {PHASE_INSTRUCTIONS[currentPhase][gradeBand]}
          </p>
          <p className="text-slate-600 mt-2">
            {selectedPattern.name}
          </p>
        </div>

        {/* Audio guidance indicator */}
        {showAudioGuidance && (
          <div className="text-center mt-4">
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              <span className="animate-pulse">🔊</span>
              Audio guidance active
            </span>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // Render - Complete Phase
  // ============================================================================

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 max-w-md mx-auto text-center">
      <span className="text-6xl block mb-4">🌟</span>
      <h2 className="text-2xl font-semibold text-slate-900 mb-2">
        {gradeBand === 'K5' ? 'Great breathing!' : 'Exercise Complete!'}
      </h2>
      <p className="text-slate-600 mb-2">
        You completed {selectedPattern.cycles} cycles of {selectedPattern.name}.
      </p>
      <p className="text-sm text-slate-500 mb-6">
        {gradeBand === 'K5'
          ? 'Your body feels calmer now!'
          : 'Take a moment to notice how your body feels.'}
      </p>

      <button
        onClick={handleComplete}
        className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
      >
        {gradeBand === 'K5' ? 'Done!' : 'Continue'}
      </button>
    </div>
  );
}

export default BreathingExercise;
