'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type { FocusState, FocusMonitorProps, FocusEvent, FocusSession } from './types';
import { FocusIndicator } from './FocusIndicator';
import { BreakSuggestion } from './BreakSuggestion';

export function FocusMonitor({
  learnerId,
  enabled = true,
  idleThreshold = 30, // 30 seconds until wandering
  distractedThreshold = 60, // 60 seconds until distracted
  trackingInterval = 30000, // Track to backend every 30 seconds
  showIndicator = true,
  onStateChange,
  onBreakSuggested,
}: FocusMonitorProps) {
  const [focusState, setFocusState] = useState<FocusState>('focused');
  const [idleTime, setIdleTime] = useState(0);
  const [showBreakSuggestion, setShowBreakSuggestion] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [focusedSeconds, setFocusedSeconds] = useState(0);
  const [currentStretch, setCurrentStretch] = useState(0);
  const [longestStretch, setLongestStretch] = useState(0);

  const lastActivityRef = useRef<number>(Date.now());
  const eventsRef = useRef<FocusEvent[]>([]);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session
  useEffect(() => {
    if (!enabled) return;

    const initSession = async () => {
      const id = `focus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(id);

      await supabase.from('focus_sessions').insert({
        id,
        learner_id: learnerId,
        started_at: new Date().toISOString(),
        focused_time: 0,
        wandering_time: 0,
        distracted_time: 0,
        breaks_taken: 0,
      });
    };

    initSession();

    return () => {
      // End session on unmount
      if (sessionId) {
        endSession();
      }
    };
  }, [enabled, learnerId]);

  // Reset activity on user interaction
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleTime(0);

    // If was distracted, becoming focused again
    if (focusState !== 'focused' && focusState !== 'taking_break') {
      setFocusState('focused');
      recordEvent('focused');
    }
  }, [focusState]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'mousemove', 'click'];

    events.forEach(event => {
      document.addEventListener(event, resetActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetActivity);
      });
    };
  }, [enabled, resetActivity]);

  // Check focus state every 5 seconds
  useEffect(() => {
    if (!enabled) return;

    checkIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      setIdleTime(elapsed);

      // Determine focus state
      let newState: FocusState = 'focused';

      if (elapsed >= distractedThreshold) {
        newState = 'distracted';
        setShowBreakSuggestion(true);
        onBreakSuggested?.();
      } else if (elapsed >= idleThreshold) {
        newState = 'wandering';
      }

      // Update state if changed
      if (newState !== focusState && focusState !== 'taking_break') {
        setFocusState(newState);
        recordEvent(newState);
        onStateChange?.(newState, elapsed);
      }

      // Track focused time and stretch
      if (focusState === 'focused') {
        setFocusedSeconds(prev => prev + 5);
        setCurrentStretch(prev => {
          const newStretch = prev + 5;
          if (newStretch > longestStretch) {
            setLongestStretch(newStretch);
          }
          return newStretch;
        });
      } else {
        setCurrentStretch(0);
      }
    }, 5000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, focusState, idleThreshold, distractedThreshold, longestStretch, onStateChange, onBreakSuggested]);

  // Track to backend periodically
  useEffect(() => {
    if (!enabled || !sessionId) return;

    trackIntervalRef.current = setInterval(async () => {
      await supabase.from('focus_tracking').insert({
        session_id: sessionId,
        learner_id: learnerId,
        state: focusState,
        timestamp: new Date().toISOString(),
        idle_time: idleTime,
      });
    }, trackingInterval);

    return () => {
      if (trackIntervalRef.current) {
        clearInterval(trackIntervalRef.current);
      }
    };
  }, [enabled, sessionId, learnerId, focusState, idleTime, trackingInterval]);

  // Record focus event
  const recordEvent = (state: FocusState) => {
    const event: FocusEvent = {
      timestamp: new Date().toISOString(),
      state,
      idleTime,
    };
    eventsRef.current.push(event);
  };

  // End focus session
  const endSession = async () => {
    if (!sessionId) return;

    // Calculate session stats
    const wanderingTime = eventsRef.current
      .filter(e => e.state === 'wandering')
      .reduce((sum, e) => sum + e.idleTime, 0);

    const distractedTime = eventsRef.current
      .filter(e => e.state === 'distracted')
      .reduce((sum, e) => sum + e.idleTime, 0);

    const breaksTaken = eventsRef.current
      .filter(e => e.state === 'taking_break')
      .length;

    await supabase
      .from('focus_sessions')
      .update({
        ended_at: new Date().toISOString(),
        focused_time: focusedSeconds,
        wandering_time: wanderingTime,
        distracted_time: distractedTime,
        breaks_taken: breaksTaken,
        longest_focus_stretch: longestStretch,
        events: eventsRef.current,
      })
      .eq('id', sessionId);
  };

  // Handle take break
  const handleTakeBreak = () => {
    setFocusState('taking_break');
    setShowBreakSuggestion(false);
    recordEvent('taking_break');

    // Navigate to game picker or breathing exercise
    window.location.href = '/games/picker';
  };

  // Handle dismiss break suggestion
  const handleDismissBreak = () => {
    setShowBreakSuggestion(false);
    // Reset activity to give them more time
    resetActivity();
  };

  if (!enabled) return null;

  return (
    <>
      {/* Focus indicator */}
      {showIndicator && (
        <FocusIndicator state={focusState} idleTime={idleTime} />
      )}

      {/* Break suggestion modal */}
      <AnimatePresence>
        {showBreakSuggestion && (
          <BreakSuggestion
            onTakeBreak={handleTakeBreak}
            onDismiss={handleDismissBreak}
          />
        )}
      </AnimatePresence>
    </>
  );
}
