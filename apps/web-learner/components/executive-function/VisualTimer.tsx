'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

type TimerMode = 'work' | 'break';
type VisualizationType = 'pie' | 'bar' | 'digital';

interface VisualTimerProps {
  onComplete?: (mode: TimerMode, durationMin: number) => void;
  onStart?: (mode: TimerMode, durationMin: number) => void;
  defaultWorkMinutes?: number;
  defaultBreakMinutes?: number;
  showAudioToggle?: boolean;
}

const PRESET_DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60];
const WORK_PRESETS = [15, 20, 25, 30, 45];
const BREAK_PRESETS = [5, 10, 15];

/**
 * VisualTimer Component
 *
 * A visual countdown timer with multiple display modes
 * Features: pie chart visualization, audio alerts, work/break modes
 */
export function VisualTimer({
  onComplete,
  onStart,
  defaultWorkMinutes = 25,
  defaultBreakMinutes = 5,
  showAudioToggle = true,
}: Readonly<VisualTimerProps>) {
  const [mode, setMode] = useState<TimerMode>('work');
  const [isRunning, setIsRunning] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(defaultWorkMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultWorkMinutes * 60);
  const [visualization, setVisualization] = useState<VisualizationType>('pie');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/timer-complete.mp3');
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const playSound = useCallback(() => {
    if (audioEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Audio play failed, likely due to user interaction requirement
      });
    }
  }, [audioEnabled]);

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    playSound();
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
    onComplete?.(mode, Math.round(totalSeconds / 60));
  }, [mode, totalSeconds, onComplete, playSound]);

  // Timer tick
  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, remainingSeconds, handleComplete]);

  function startTimer() {
    if (remainingSeconds <= 0) return;
    setIsRunning(true);
    onStart?.(mode, Math.round(totalSeconds / 60));
  }

  function pauseTimer() {
    setIsRunning(false);
  }

  function resetTimer() {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
  }

  function setDuration(minutes: number) {
    const seconds = minutes * 60;
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    setIsRunning(false);
  }

  function handleModeSwitch(newMode: TimerMode) {
    setMode(newMode);
    const defaultMinutes = newMode === 'work' ? defaultWorkMinutes : defaultBreakMinutes;
    setDuration(defaultMinutes);
  }

  function handleCustomDuration() {
    const minutes = parseInt(customMinutes, 10);
    if (minutes > 0 && minutes <= 180) {
      setDuration(minutes);
      setCustomMinutes('');
      setShowSettings(false);
    }
  }

  // Format time display
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
  const progressDegrees = (remainingSeconds / totalSeconds) * 360;

  const presets = mode === 'work' ? WORK_PRESETS : BREAK_PRESETS;
  const modeColor = mode === 'work' ? 'blue' : 'green';
  const modeGradient =
    mode === 'work' ? 'from-blue-500 to-purple-500' : 'from-green-500 to-teal-500';

  return (
    <div className="space-y-6">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="text-8xl">
              {mode === 'work' ? '🎉' : '☕'}
            </div>
            <div className="mt-4 text-3xl font-bold text-white">
              {mode === 'work' ? 'Great work!' : 'Break time over!'}
            </div>
            <p className="mt-2 text-lg text-white/80">
              {mode === 'work'
                ? "You've completed your focus session!"
                : 'Ready to get back to work?'}
            </p>
          </div>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="rounded-xl bg-white p-4 shadow-lg">
        <div className="flex gap-2">
          <button
            onClick={() => handleModeSwitch('work')}
            className={`flex-1 rounded-lg py-3 text-center font-bold transition ${
              mode === 'work'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🎯 Work Time
          </button>
          <button
            onClick={() => handleModeSwitch('break')}
            className={`flex-1 rounded-lg py-3 text-center font-bold transition ${
              mode === 'break'
                ? 'bg-green-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ☕ Break Time
          </button>
        </div>
      </div>

      {/* Timer Display */}
      <div className={`rounded-xl bg-gradient-to-br ${modeGradient} p-8 text-white shadow-lg`}>
        {/* Visualization selector */}
        <div className="mb-6 flex justify-center gap-2">
          <button
            onClick={() => setVisualization('pie')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              visualization === 'pie' ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Pie
          </button>
          <button
            onClick={() => setVisualization('bar')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              visualization === 'bar' ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Bar
          </button>
          <button
            onClick={() => setVisualization('digital')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              visualization === 'digital' ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Digital
          </button>
        </div>

        {/* Timer visualizations */}
        <div className="flex flex-col items-center justify-center">
          {visualization === 'pie' && (
            <div className="relative h-64 w-64">
              {/* Background circle */}
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="white"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(progress / 100) * 283} 283`}
                  className="transition-all duration-1000"
                />
              </svg>
              {/* Time display in center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-bold tabular-nums">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div className="mt-2 text-sm text-white/80">
                  {mode === 'work' ? 'Focus Time' : 'Break Time'}
                </div>
              </div>
            </div>
          )}

          {visualization === 'bar' && (
            <div className="w-full max-w-md">
              <div className="mb-4 text-center text-6xl font-bold tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="h-8 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-white transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-center text-sm text-white/80">
                {Math.round(progress)}% remaining
              </div>
            </div>
          )}

          {visualization === 'digital' && (
            <div className="text-center">
              <div className="font-mono text-8xl font-bold tabular-nums tracking-wider">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="mt-4 text-xl text-white/80">
                {mode === 'work' ? '🎯 Focus Mode' : '☕ Break Mode'}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-8 flex justify-center gap-4">
          {!isRunning ? (
            <button
              onClick={startTimer}
              disabled={remainingSeconds <= 0}
              className="rounded-full bg-white px-8 py-4 text-lg font-bold text-slate-900 shadow-lg transition hover:scale-105 disabled:opacity-50"
            >
              ▶ Start
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="rounded-full bg-white px-8 py-4 text-lg font-bold text-slate-900 shadow-lg transition hover:scale-105"
            >
              ⏸ Pause
            </button>
          )}
          <button
            onClick={resetTimer}
            className="rounded-full bg-white/20 px-8 py-4 text-lg font-bold transition hover:bg-white/30"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Preset durations */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-sm font-medium text-slate-700">Quick Select Duration</h3>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => setDuration(preset)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                totalSeconds === preset * 60
                  ? `bg-${modeColor}-600 text-white`
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {preset} min
            </button>
          ))}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Custom
          </button>
        </div>

        {/* Custom duration input */}
        {showSettings && (
          <div className="mt-4 flex gap-2">
            <input
              type="number"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder="Minutes"
              min="1"
              max="180"
              className="w-24 rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleCustomDuration}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Set
            </button>
          </div>
        )}
      </div>

      {/* Audio toggle */}
      {showAudioToggle && (
        <div className="rounded-xl bg-white p-4 shadow-lg">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              🔔 Sound alerts when timer completes
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={(e) => setAudioEnabled(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`h-6 w-11 rounded-full transition ${
                  audioEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`h-5 w-5 translate-y-0.5 transform rounded-full bg-white shadow transition ${
                    audioEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </div>
          </label>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl bg-slate-50 p-4">
        <h4 className="text-sm font-medium text-slate-700">
          💡 {mode === 'work' ? 'Focus Tips' : 'Break Tips'}
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {mode === 'work' ? (
            <>
              <li>• Remove distractions from your workspace</li>
              <li>• Focus on one task at a time</li>
              <li>• Keep water nearby to stay hydrated</li>
            </>
          ) : (
            <>
              <li>• Step away from your screen</li>
              <li>• Stretch or take a short walk</li>
              <li>• Get a healthy snack or drink</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
