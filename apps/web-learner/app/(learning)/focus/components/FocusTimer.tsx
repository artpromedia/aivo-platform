'use client';

import { useEffect, useState, useRef } from 'react';
import { startFocusSession, endFocusSession, recordDistraction, startBreak, endBreak } from '../../../../lib/focus-api';
import type { FocusSession, FocusPreferences, FocusBreak } from '../../../../lib/focus-api';
import { BreakActivities } from './BreakActivities';

interface FocusTimerProps {
  learnerId: string;
  activeSession: FocusSession | null;
  preferences: FocusPreferences;
  onSessionUpdate: (session: FocusSession | null) => void;
}

type TimerState = 'idle' | 'focusing' | 'break';

/**
 * Focus Timer Component
 * 
 * Displays the main focus timer with controls for:
 * - Starting/ending focus sessions
 * - Taking breaks
 * - Recording distractions
 */
export function FocusTimer({ learnerId, activeSession, preferences, onSessionUpdate }: FocusTimerProps) {
  const [state, setState] = useState<TimerState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedMode, setSelectedMode] = useState<'pomodoro' | 'custom' | 'deep-work'>(preferences.defaultMode);
  const [currentBreak, setCurrentBreak] = useState<FocusBreak | null>(null);
  const [showBreakActivities, setShowBreakActivities] = useState(false);
  const [distractionCount, setDistractionCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined' && preferences.soundEnabled) {
      audioRef.current = new Audio('/sounds/focus-complete.mp3');
    }
  }, [preferences.soundEnabled]);

  // Handle active session
  useEffect(() => {
    if (activeSession && !activeSession.completed) {
      setState('focusing');
      const elapsed = Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000);
      const remaining = Math.max(0, activeSession.duration - elapsed);
      setTimeRemaining(remaining);
      setDistractionCount(activeSession.distractions.length);
    }
  }, [activeSession]);

  // Timer countdown
  useEffect(() => {
    if (state === 'focusing' || state === 'break') {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state]);

  function handleTimerComplete() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Play sound
    if (audioRef.current && preferences.soundEnabled) {
      audioRef.current.play().catch(() => {
        // Ignore audio errors
      });
    }

    // Show notification
    if (preferences.notificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Focus Timer Complete!', {
          body: state === 'focusing' ? 'Great job! Time for a break.' : 'Break is over. Ready to focus?',
          icon: '/icons/focus.png',
        });
      }
    }

    if (state === 'focusing') {
      setShowBreakActivities(true);
    } else {
      setState('idle');
    }
  }

  async function handleStartSession() {
    try {
      let duration = 0;

      switch (selectedMode) {
        case 'pomodoro':
          duration = preferences.pomodoroWorkMinutes * 60;
          break;
        case 'custom':
          duration = preferences.customWorkMinutes * 60;
          break;
        case 'deep-work':
          duration = 90 * 60; // 90 minutes
          break;
      }

      const session = await startFocusSession(learnerId, selectedMode, duration);
      onSessionUpdate(session);
      setState('focusing');
      setTimeRemaining(duration);
      setDistractionCount(0);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start focus session. Please try again.');
    }
  }

  async function handleEndSession() {
    if (!activeSession) return;

    try {
      const session = await endFocusSession(activeSession.id);
      onSessionUpdate(null);
      setState('idle');
      setTimeRemaining(0);
    } catch (error) {
      console.error('Failed to end session:', error);
      alert('Failed to end focus session. Please try again.');
    }
  }

  async function handleRecordDistraction() {
    if (!activeSession) return;

    try {
      await recordDistraction(activeSession.id, 'manual');
      setDistractionCount((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to record distraction:', error);
    }
  }

  async function handleStartBreak(activityType: string) {
    if (!activeSession) return;

    try {
      const breakDuration = selectedMode === 'pomodoro' 
        ? preferences.pomodoroBreakMinutes * 60 
        : preferences.customBreakMinutes * 60;

      const breakSession = await startBreak(activeSession.id, activityType);
      setCurrentBreak(breakSession);
      setState('break');
      setTimeRemaining(breakDuration);
      setShowBreakActivities(false);
    } catch (error) {
      console.error('Failed to start break:', error);
      alert('Failed to start break. Please try again.');
    }
  }

  async function handleEndBreak() {
    if (!activeSession || !currentBreak) return;

    try {
      await endBreak(activeSession.id, currentBreak.id);
      setCurrentBreak(null);
      setState('idle');
      setTimeRemaining(0);
      onSessionUpdate(null);
    } catch (error) {
      console.error('Failed to end break:', error);
      alert('Failed to end break. Please try again.');
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function getSessionDuration(): number {
    switch (selectedMode) {
      case 'pomodoro':
        return preferences.pomodoroWorkMinutes;
      case 'custom':
        return preferences.customWorkMinutes;
      case 'deep-work':
        return 90;
      default:
        return 25;
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Selection (only when idle) */}
      {state === 'idle' && (
        <div className="grid gap-4 md:grid-cols-3">
          <button
            onClick={() => setSelectedMode('pomodoro')}
            className={`rounded-xl p-6 text-left transition ${
              selectedMode === 'pomodoro'
                ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg'
                : 'bg-white text-slate-900 shadow hover:shadow-md'
            }`}
          >
            <div className="text-3xl">🍅</div>
            <h3 className="mt-3 font-bold">Pomodoro</h3>
            <p className={`mt-1 text-sm ${selectedMode === 'pomodoro' ? 'text-white/90' : 'text-slate-600'}`}>
              {preferences.pomodoroWorkMinutes} min work, {preferences.pomodoroBreakMinutes} min break
            </p>
          </button>

          <button
            onClick={() => setSelectedMode('custom')}
            className={`rounded-xl p-6 text-left transition ${
              selectedMode === 'custom'
                ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg'
                : 'bg-white text-slate-900 shadow hover:shadow-md'
            }`}
          >
            <div className="text-3xl">⚙️</div>
            <h3 className="mt-3 font-bold">Custom</h3>
            <p className={`mt-1 text-sm ${selectedMode === 'custom' ? 'text-white/90' : 'text-slate-600'}`}>
              {preferences.customWorkMinutes} min work, {preferences.customBreakMinutes} min break
            </p>
          </button>

          <button
            onClick={() => setSelectedMode('deep-work')}
            className={`rounded-xl p-6 text-left transition ${
              selectedMode === 'deep-work'
                ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-white text-slate-900 shadow hover:shadow-md'
            }`}
          >
            <div className="text-3xl">🎯</div>
            <h3 className="mt-3 font-bold">Deep Work</h3>
            <p className={`mt-1 text-sm ${selectedMode === 'deep-work' ? 'text-white/90' : 'text-slate-600'}`}>
              90 min intensive focus
            </p>
          </button>
        </div>
      )}

      {/* Timer Display */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
        <div
          className={`p-8 text-center ${
            state === 'focusing'
              ? 'bg-gradient-to-br from-blue-500 to-purple-500'
              : state === 'break'
                ? 'bg-gradient-to-br from-green-500 to-teal-500'
                : 'bg-gradient-to-br from-slate-100 to-slate-200'
          }`}
        >
          <div className={`text-7xl font-bold ${state !== 'idle' ? 'text-white' : 'text-slate-600'}`}>
            {formatTime(timeRemaining || getSessionDuration() * 60)}
          </div>
          <p className={`mt-4 text-lg font-medium ${state !== 'idle' ? 'text-white/90' : 'text-slate-600'}`}>
            {state === 'idle' && 'Ready to focus?'}
            {state === 'focusing' && 'Stay focused! You\'re doing great.'}
            {state === 'break' && 'Enjoy your break!'}
          </p>
        </div>

        {/* Controls */}
        <div className="p-6">
          {state === 'idle' && (
            <button
              onClick={handleStartSession}
              className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-medium text-white transition hover:bg-blue-700"
            >
              Start Focus Session
            </button>
          )}

          {state === 'focusing' && (
            <div className="space-y-3">
              <button
                onClick={handleEndSession}
                className="w-full rounded-lg bg-red-600 px-6 py-4 text-lg font-medium text-white transition hover:bg-red-700"
              >
                End Session
              </button>
              <button
                onClick={handleRecordDistraction}
                className="w-full rounded-lg border-2 border-orange-400 bg-white px-6 py-3 text-sm font-medium text-orange-700 transition hover:bg-orange-50"
              >
                ⚠️ I Got Distracted ({distractionCount})
              </button>
            </div>
          )}

          {state === 'break' && (
            <button
              onClick={handleEndBreak}
              className="w-full rounded-lg bg-green-600 px-6 py-4 text-lg font-medium text-white transition hover:bg-green-700"
            >
              End Break
            </button>
          )}
        </div>
      </div>

      {/* Break Activities Modal */}
      {showBreakActivities && (
        <BreakActivities
          onSelect={handleStartBreak}
          onSkip={() => {
            setShowBreakActivities(false);
            setState('idle');
          }}
        />
      )}
    </div>
  );
}
