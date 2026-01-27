'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn, formatTime } from '../../utils';
import { FocusModeSelector } from './FocusModeSelector';
import { BreakActivities } from './BreakActivities';
import type { FocusTimerProps } from './types';
import type { FocusMode, TimerState, FocusBreak } from '../../types';

/**
 * FocusTimer Component
 *
 * A comprehensive focus timer with multiple modes (Pomodoro, Custom, Deep Work),
 * distraction tracking, and break activities.
 */
export function FocusTimer({
  learnerId: _learnerId,
  activeSession,
  preferences,
  onSessionUpdate,
  onStartSession,
  onEndSession,
  onRecordDistraction,
  onStartBreak,
  onEndBreak,
  className,
}: FocusTimerProps) {
  const [state, setState] = useState<TimerState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedMode, setSelectedMode] = useState<FocusMode>(preferences.defaultMode);
  const [currentBreak, setCurrentBreak] = useState<FocusBreak | null>(null);
  const [showBreakActivities, setShowBreakActivities] = useState(false);
  const [distractionCount, setDistractionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
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
      const elapsed = Math.floor(
        (Date.now() - new Date(activeSession.startTime).getTime()) / 1000
      );
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
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state]);

  const handleTimerComplete = useCallback(() => {
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
    if (preferences.notificationsEnabled && typeof Notification !== 'undefined') {
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
  }, [state, preferences.soundEnabled, preferences.notificationsEnabled]);

  const getSessionDuration = useCallback((): number => {
    switch (selectedMode) {
      case 'pomodoro':
        return preferences.pomodoroWorkMinutes * 60;
      case 'custom':
        return preferences.customWorkMinutes * 60;
      case 'deep-work':
        return 90 * 60;
      default:
        return 25 * 60;
    }
  }, [selectedMode, preferences]);

  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      const duration = getSessionDuration();
      if (onStartSession) {
        const session = await onStartSession(selectedMode, duration);
        onSessionUpdate?.(session);
      }
      setState('focusing');
      setTimeRemaining(duration);
      setDistractionCount(0);
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      if (onEndSession) {
        await onEndSession(activeSession.id);
      }
      onSessionUpdate?.(null);
      setState('idle');
      setTimeRemaining(0);
    } catch (error) {
      console.error('Failed to end session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordDistraction = async () => {
    if (!activeSession) return;
    try {
      if (onRecordDistraction) {
        await onRecordDistraction(activeSession.id);
      }
      setDistractionCount((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to record distraction:', error);
    }
  };

  const handleStartBreakActivity = async (activityType: string) => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      const breakDuration =
        selectedMode === 'pomodoro'
          ? preferences.pomodoroBreakMinutes * 60
          : preferences.customBreakMinutes * 60;

      if (onStartBreak) {
        await onStartBreak(activeSession.id, activityType);
      }
      setCurrentBreak({ id: 'temp', startTime: new Date().toISOString(), activityType });
      setState('break');
      setTimeRemaining(breakDuration);
      setShowBreakActivities(false);
    } catch (error) {
      console.error('Failed to start break:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!activeSession || !currentBreak) return;
    setIsLoading(true);
    try {
      if (onEndBreak) {
        await onEndBreak(activeSession.id, currentBreak.id);
      }
      setCurrentBreak(null);
      setState('idle');
      setTimeRemaining(0);
      onSessionUpdate?.(null);
    } catch (error) {
      console.error('Failed to end break:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBackgroundClass = () => {
    if (state === 'focusing') return 'bg-gradient-to-br from-blue-500 to-purple-500';
    if (state === 'break') return 'bg-gradient-to-br from-green-500 to-teal-500';
    return 'bg-gradient-to-br from-slate-100 to-slate-200';
  };

  const displayTime = timeRemaining || getSessionDuration();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Mode Selection (only when idle) */}
      {state === 'idle' && (
        <FocusModeSelector
          selectedMode={selectedMode}
          preferences={preferences}
          onSelectMode={setSelectedMode}
        />
      )}

      {/* Timer Display */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className={cn('p-8 text-center', getBackgroundClass())}>
          <div
            className={cn(
              'text-7xl font-bold',
              state === 'idle' ? 'text-slate-600' : 'text-white'
            )}
          >
            {formatTime(displayTime)}
          </div>
          <p
            className={cn(
              'mt-4 text-lg font-medium',
              state === 'idle' ? 'text-slate-600' : 'text-white/90'
            )}
          >
            {state === 'idle' && 'Ready to focus?'}
            {state === 'focusing' && "Stay focused! You're doing great."}
            {state === 'break' && 'Enjoy your break!'}
          </p>
        </div>

        {/* Controls */}
        <div className="p-6">
          {state === 'idle' && (
            <button
              onClick={handleStartSession}
              disabled={isLoading}
              className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Starting...' : 'Start Focus Session'}
            </button>
          )}

          {state === 'focusing' && (
            <div className="space-y-3">
              <button
                onClick={handleEndSession}
                disabled={isLoading}
                className="w-full rounded-lg bg-red-600 px-6 py-4 text-lg font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                End Session
              </button>
              <button
                onClick={handleRecordDistraction}
                className="w-full rounded-lg border-2 border-orange-400 bg-white px-6 py-3 text-sm font-medium text-orange-700 transition hover:bg-orange-50"
              >
                I Got Distracted ({distractionCount})
              </button>
            </div>
          )}

          {state === 'break' && (
            <button
              onClick={handleEndBreak}
              disabled={isLoading}
              className="w-full rounded-lg bg-green-600 px-6 py-4 text-lg font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              End Break
            </button>
          )}
        </div>
      </div>

      {/* Break Activities Modal */}
      {showBreakActivities && (
        <BreakActivities
          onSelect={handleStartBreakActivity}
          onSkip={() => {
            setShowBreakActivities(false);
            setState('idle');
            onSessionUpdate?.(null);
          }}
        />
      )}
    </div>
  );
}
