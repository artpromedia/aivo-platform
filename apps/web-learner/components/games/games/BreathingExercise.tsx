/**
 * BreathingExercise - Guided breathing visualization game
 *
 * Features:
 * - Animated breathing guide (expanding circle/balloon)
 * - Multiple breathing patterns (box, triangle, wave, balloon)
 * - Visual styles (expanding-circle, moving-dot, color-shift)
 * - Cycle counter and progress
 * - Audio cues (optional)
 * - Calm color palette
 * - Grade-appropriate instructions
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { BreathingVisualizerConfig } from '../../../lib/games/game-types';

export interface BreathingExerciseProps {
  config: BreathingVisualizerConfig;
  onComplete: (score: number, maxScore: number) => void;
  onProgress?: (progress: number) => void;
  isPaused?: boolean;
}

type BreathPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

const PHASE_LABELS: Record<BreathPhase, string> = {
  'inhale': 'Breathe In',
  'hold-in': 'Hold',
  'exhale': 'Breathe Out',
  'hold-out': 'Hold',
};

const PHASE_INSTRUCTIONS: Record<BreathPhase, string> = {
  'inhale': 'Slowly breathe in through your nose...',
  'hold-in': 'Gently hold your breath...',
  'exhale': 'Slowly breathe out through your mouth...',
  'hold-out': 'Rest before the next breath...',
};

const CALM_COLORS = {
  inhale: '#4ade80', // green-400
  holdIn: '#60a5fa', // blue-400
  exhale: '#a78bfa', // violet-400
  holdOut: '#f0abfc', // fuchsia-300
  background: '#e0f2fe', // sky-100
};

export function BreathingExercise({
  config,
  onComplete,
  onProgress,
  isPaused = false,
}: BreathingExerciseProps) {
  const {
    pattern,
    inhaleSeconds,
    holdInSeconds,
    exhaleSeconds,
    holdOutSeconds,
    cycles,
    visualStyle,
  } = config;

  // State
  const [currentCycle, setCurrentCycle] = useState(1);
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [circleScale, setCircleScale] = useState(0.3);

  // Refs
  const animationRef = useRef<number | null>(null);
  const phaseStartRef = useRef<number>(Date.now());
  const audioContextRef = useRef<AudioContext | null>(null);

  // Get phase duration in seconds
  const getPhaseDuration = useCallback((p: BreathPhase): number => {
    switch (p) {
      case 'inhale': return inhaleSeconds;
      case 'hold-in': return holdInSeconds;
      case 'exhale': return exhaleSeconds;
      case 'hold-out': return holdOutSeconds;
    }
  }, [inhaleSeconds, holdInSeconds, exhaleSeconds, holdOutSeconds]);

  // Get next phase
  const getNextPhase = useCallback((current: BreathPhase): BreathPhase => {
    switch (current) {
      case 'inhale': return holdInSeconds > 0 ? 'hold-in' : 'exhale';
      case 'hold-in': return 'exhale';
      case 'exhale': return holdOutSeconds > 0 ? 'hold-out' : 'inhale';
      case 'hold-out': return 'inhale';
    }
  }, [holdInSeconds, holdOutSeconds]);

  // Play gentle audio cue
  const playTone = useCallback((frequency: number, duration: number) => {
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
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.1;

      // Fade in/out
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // Audio not available, continue silently
    }
  }, []);

  // Animation loop
  useEffect(() => {
    if (isPaused || isComplete) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      const elapsed = (now - phaseStartRef.current) / 1000;
      const duration = getPhaseDuration(phase);
      const progress = Math.min(1, elapsed / duration);

      setPhaseProgress(progress);

      // Update circle scale based on phase
      if (visualStyle === 'expanding-circle' || pattern === 'balloon') {
        if (phase === 'inhale') {
          setCircleScale(0.3 + progress * 0.7);
        } else if (phase === 'exhale') {
          setCircleScale(1 - progress * 0.7);
        }
        // Hold phases keep current scale
      }

      // Calculate overall progress
      const cycleDuration = inhaleSeconds + holdInSeconds + exhaleSeconds + holdOutSeconds;
      const totalDuration = cycleDuration * cycles;
      const completedCyclesDuration = (currentCycle - 1) * cycleDuration;
      let currentPhaseOffset = 0;
      if (phase === 'hold-in') currentPhaseOffset = inhaleSeconds;
      else if (phase === 'exhale') currentPhaseOffset = inhaleSeconds + holdInSeconds;
      else if (phase === 'hold-out') currentPhaseOffset = inhaleSeconds + holdInSeconds + exhaleSeconds;

      const overallProgress = (completedCyclesDuration + currentPhaseOffset + elapsed) / totalDuration;
      onProgress?.(Math.min(1, overallProgress));

      // Check if phase is complete
      if (progress >= 1) {
        const nextPhase = getNextPhase(phase);

        // Check if cycle is complete
        if (nextPhase === 'inhale') {
          if (currentCycle >= cycles) {
            setIsComplete(true);
            onComplete(cycles, cycles);
            return;
          }
          setCurrentCycle((c) => c + 1);
        }

        setPhase(nextPhase);
        phaseStartRef.current = Date.now();

        // Play tone for phase transition
        playTone(nextPhase === 'inhale' ? 440 : nextPhase === 'exhale' ? 330 : 392, 0.3);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    isPaused,
    isComplete,
    phase,
    currentCycle,
    cycles,
    getPhaseDuration,
    getNextPhase,
    visualStyle,
    pattern,
    inhaleSeconds,
    holdInSeconds,
    exhaleSeconds,
    holdOutSeconds,
    onProgress,
    onComplete,
    playTone,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Get current color based on phase
  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale': return CALM_COLORS.inhale;
      case 'hold-in': return CALM_COLORS.holdIn;
      case 'exhale': return CALM_COLORS.exhale;
      case 'hold-out': return CALM_COLORS.holdOut;
    }
  };

  // Render balloon style
  const renderBalloon = () => (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Balloon body */}
      <div
        className="absolute rounded-full transition-all duration-300"
        style={{
          width: `${circleScale * 200}px`,
          height: `${circleScale * 220}px`,
          backgroundColor: getPhaseColor(),
          boxShadow: `0 0 ${40 * circleScale}px ${getPhaseColor()}40`,
          borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
        }}
      />
      {/* Balloon knot */}
      <div
        className="absolute transition-all duration-300"
        style={{
          bottom: `${30 - circleScale * 20}%`,
          width: '12px',
          height: '12px',
          backgroundColor: getPhaseColor(),
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          filter: 'brightness(0.8)',
        }}
      />
      {/* Balloon string */}
      <div
        className="absolute"
        style={{
          bottom: '10%',
          width: '2px',
          height: '40px',
          backgroundColor: '#9ca3af',
        }}
      />
    </div>
  );

  // Render expanding circle style
  const renderExpandingCircle = () => (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Outer glow */}
      <div
        className="absolute rounded-full transition-all duration-200"
        style={{
          width: `${circleScale * 220}px`,
          height: `${circleScale * 220}px`,
          backgroundColor: `${getPhaseColor()}20`,
          boxShadow: `0 0 ${60 * circleScale}px ${getPhaseColor()}30`,
        }}
      />
      {/* Inner circle */}
      <div
        className="absolute rounded-full transition-all duration-200 flex items-center justify-center"
        style={{
          width: `${circleScale * 180}px`,
          height: `${circleScale * 180}px`,
          backgroundColor: getPhaseColor(),
          boxShadow: `inset 0 0 ${20 * circleScale}px rgba(255,255,255,0.3)`,
        }}
      >
        {/* Phase indicator */}
        <span className="text-white text-xl font-bold">
          {Math.ceil(getPhaseDuration(phase) * (1 - phaseProgress))}
        </span>
      </div>
    </div>
  );

  // Render moving dot style (for patterns like box, triangle)
  const renderMovingDot = () => {
    const getPositionForPattern = () => {
      const totalPhases = 4;
      let phaseIndex = 0;
      switch (phase) {
        case 'inhale': phaseIndex = 0; break;
        case 'hold-in': phaseIndex = 1; break;
        case 'exhale': phaseIndex = 2; break;
        case 'hold-out': phaseIndex = 3; break;
      }
      const progress = phaseIndex / totalPhases + phaseProgress / totalPhases;

      if (pattern === 'box') {
        // Move around a square
        const side = progress * 4;
        if (side < 1) return { x: side * 100, y: 0 };
        if (side < 2) return { x: 100, y: (side - 1) * 100 };
        if (side < 3) return { x: 100 - (side - 2) * 100, y: 100 };
        return { x: 0, y: 100 - (side - 3) * 100 };
      }

      if (pattern === 'triangle') {
        // Move around a triangle
        const side = progress * 3;
        if (side < 1) return { x: 50 + side * 50, y: side * 100 };
        if (side < 2) return { x: 100 - (side - 1) * 100, y: 100 };
        return { x: (side - 2) * 50, y: 100 - (side - 2) * 100 };
      }

      // Default circular
      const angle = progress * Math.PI * 2;
      return {
        x: 50 + Math.cos(angle) * 40,
        y: 50 + Math.sin(angle) * 40,
      };
    };

    const pos = getPositionForPattern();

    return (
      <div className="relative w-64 h-64">
        {/* Pattern guide */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {pattern === 'box' && (
            <rect
              x="10"
              y="10"
              width="80"
              height="80"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
          {pattern === 'triangle' && (
            <polygon
              points="50,10 90,90 10,90"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
        </svg>
        {/* Moving dot */}
        <div
          className="absolute w-8 h-8 rounded-full transition-all duration-100"
          style={{
            left: `calc(${pos.x}% - 16px)`,
            top: `calc(${pos.y}% - 16px)`,
            backgroundColor: getPhaseColor(),
            boxShadow: `0 0 20px ${getPhaseColor()}`,
          }}
        />
      </div>
    );
  };

  // Render wave style
  const renderWave = () => (
    <div className="relative w-64 h-32 overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={getPhaseColor()} stopOpacity="0.8" />
            <stop offset="100%" stopColor={getPhaseColor()} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path
          d={`M0,${20 + (phase === 'inhale' ? -phaseProgress * 15 : phase === 'exhale' ? phaseProgress * 15 - 15 : phase === 'hold-in' ? -15 : 0)}
              Q25,${10 + Math.sin(Date.now() / 500) * 5}
              50,${20 + (phase === 'inhale' ? -phaseProgress * 15 : phase === 'exhale' ? phaseProgress * 15 - 15 : phase === 'hold-in' ? -15 : 0)}
              T100,${20 + (phase === 'inhale' ? -phaseProgress * 15 : phase === 'exhale' ? phaseProgress * 15 - 15 : phase === 'hold-in' ? -15 : 0)}
              V40 H0 Z`}
          fill="url(#waveGradient)"
        />
      </svg>
    </div>
  );

  // Select visualization based on style
  const renderVisualization = () => {
    if (pattern === 'balloon' || visualStyle === 'expanding-circle') {
      return pattern === 'balloon' ? renderBalloon() : renderExpandingCircle();
    }
    if (visualStyle === 'moving-dot') {
      return renderMovingDot();
    }
    if (pattern === 'wave') {
      return renderWave();
    }
    return renderExpandingCircle();
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] p-6"
      style={{ backgroundColor: CALM_COLORS.background }}
    >
      {/* Cycle counter */}
      <div className="mb-4 text-sm text-gray-600">
        Cycle {currentCycle} of {cycles}
      </div>

      {/* Visualization */}
      {renderVisualization()}

      {/* Phase label */}
      <div className="mt-6 text-center">
        <h3
          className="text-2xl font-bold transition-colors duration-300"
          style={{ color: getPhaseColor() }}
        >
          {PHASE_LABELS[phase]}
        </h3>
        <p className="text-gray-600 mt-2">
          {PHASE_INSTRUCTIONS[phase]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mt-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${phaseProgress * 100}%`,
              backgroundColor: getPhaseColor(),
            }}
          />
        </div>
      </div>

      {/* Pause indicator */}
      {isPaused && (
        <div className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
          Paused - Take your time
        </div>
      )}

      {/* Completion message */}
      {isComplete && (
        <div className="mt-4 px-6 py-3 bg-green-100 text-green-800 rounded-xl font-medium animate-pulse">
          Wonderful! You completed all {cycles} breathing cycles.
        </div>
      )}
    </div>
  );
}

export default BreathingExercise;
