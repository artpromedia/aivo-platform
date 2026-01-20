'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useIdleDetection } from '../hooks/use-idle-detection';

import {
  getBreakRecommendation,
  reportBreakComplete,
  reportBreakStarted,
  reportMoodChange,
  sendFocusPing,
  type RegulationActivity,
  type SelfReportedMood,
} from './focus-api';
import { useFocusContext } from './focus-context';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/** Interval between focus pings in milliseconds (30 seconds) */
const PING_INTERVAL_MS = 30000;

/** Idle threshold for detection in milliseconds (60 seconds) */
const IDLE_THRESHOLD_MS = 60000;

// ══════════════════════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Hook for focus monitoring functionality.
 * Handles periodic pings, focus loss detection, and break management.
 *
 * @example
 * ```tsx
 * const {
 *   isMonitoring,
 *   requiresBreak,
 *   pendingActivity,
 *   startMonitoring,
 *   stopMonitoring,
 *   startBreak,
 *   completeBreak,
 * } = useFocusMonitoring();
 * ```
 */
export function useFocusMonitoring() {
  const { state, config, actions } = useFocusContext();
  const { idleMs, isDocumentVisible, recordInteraction } = useIdleDetection({
    idleThresholdMs: IDLE_THRESHOLD_MS,
    enabled: state.isMonitoring,
  });

  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Track rapid exit attempts
  const rapidExitRef = useRef(false);

  // Send a focus ping to the backend
  const sendPing = useCallback(async () => {
    if (!config || !isMountedRef.current) return;

    try {
      const result = await sendFocusPing(config.sessionId, config.learnerId, config.activityId, {
        idleMs,
        appInBackground: !isDocumentVisible,
        selfReportedMood: state.currentMood ?? undefined,
        rapidExit: rapidExitRef.current,
      });

      // Reset rapid exit flag after sending
      rapidExitRef.current = false;

      if (!isMountedRef.current) return;

      actions.recordPingSent();

      // Handle focus loss detection from backend
      if (result.detection.focusLossDetected) {
        actions.handleFocusLossDetection(
          result.detection.reasons,
          result.detection.confidence,
          result.detection.suggestedIntervention
        );

        // If regulation break is suggested, fetch a recommendation
        if (result.detection.suggestedIntervention === 'regulation_break') {
          try {
            const recommendation = await getBreakRecommendation(
              config.sessionId,
              config.learnerId,
              {
                currentActivityId: config.activityId,
                gradeBand: config.gradeBand,
                mood: state.currentMood ?? undefined,
                focusLossReasons: result.detection.reasons,
              }
            );

            if (isMountedRef.current) {
              actions.setPendingActivity(recommendation);
            }
          } catch (err) {
            console.error('Failed to get break recommendation:', err);
          }
        }
      } else if (state.focusLossReasons.length > 0) {
        // Focus has been restored
        actions.restoreFocus();
      }
    } catch (err) {
      console.error('Focus ping failed:', err);
      if (isMountedRef.current) {
        actions.setError(err instanceof Error ? err.message : 'Focus ping failed');
      }
    }
  }, [config, idleMs, isDocumentVisible, state.currentMood, state.focusLossReasons.length, actions]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!config) {
      console.warn('Cannot start monitoring without configuration');
      return;
    }

    actions.startMonitoring();

    // Send initial ping
    sendPing();

    // Start periodic pinging
    pingIntervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);
  }, [config, actions, sendPing]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    actions.stopMonitoring();

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, [actions]);

  // Report mood change
  const reportMood = useCallback(
    async (mood: SelfReportedMood) => {
      if (!config) return;

      actions.setMood(mood);

      try {
        await reportMoodChange(config.sessionId, config.learnerId, mood, {
          activityId: config.activityId,
          triggeredBy: 'user',
        });
      } catch (err) {
        console.error('Failed to report mood:', err);
      }
    },
    [config, actions]
  );

  // Start a break activity
  const startBreak = useCallback(
    async (activity: RegulationActivity) => {
      if (!config) return;

      try {
        await reportBreakStarted(config.sessionId, config.learnerId, activity.activityType);
        actions.startBreak(activity);
      } catch (err) {
        console.error('Failed to report break started:', err);
        // Still start the break locally even if reporting fails
        actions.startBreak(activity);
      }
    },
    [config, actions]
  );

  // Complete a break activity
  const completeBreak = useCallback(
    async (completedFully: boolean, helpfulnessRating?: number) => {
      if (!config || !state.currentBreakActivity || !state.breakStartTime) return;

      const durationSeconds = Math.round(
        (Date.now() - state.breakStartTime.getTime()) / 1000
      );

      try {
        await reportBreakComplete(
          config.sessionId,
          config.learnerId,
          state.currentBreakActivity.activityType,
          durationSeconds,
          completedFully,
          helpfulnessRating
        );
      } catch (err) {
        console.error('Failed to report break complete:', err);
      }

      actions.completeBreak();
    },
    [config, state.currentBreakActivity, state.breakStartTime, actions]
  );

  // Dismiss break recommendation
  const dismissBreak = useCallback(() => {
    actions.dismissBreakRecommendation();
  }, [actions]);

  // Request a new recommendation manually
  const requestRecommendation = useCallback(async () => {
    if (!config) return null;

    try {
      const recommendation = await getBreakRecommendation(config.sessionId, config.learnerId, {
        currentActivityId: config.activityId,
        gradeBand: config.gradeBand,
        mood: state.currentMood ?? undefined,
        focusLossReasons: state.focusLossReasons,
      });

      actions.setPendingActivity(recommendation);
      return recommendation;
    } catch (err) {
      console.error('Failed to get recommendation:', err);
      actions.setError(err instanceof Error ? err.message : 'Failed to get recommendation');
      return null;
    }
  }, [config, state.currentMood, state.focusLossReasons, actions]);

  // Record rapid exit attempt (e.g., back button pressed)
  const recordRapidExit = useCallback(() => {
    rapidExitRef.current = true;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  // Auto-start monitoring when config is set (if not already monitoring)
  useEffect(() => {
    if (config && !state.isMonitoring && !pingIntervalRef.current) {
      // Don't auto-start, let the component decide when to start
    }
  }, [config, state.isMonitoring]);

  return {
    // State
    isMonitoring: state.isMonitoring,
    lastPingTime: state.lastPingTime,
    requiresBreak: state.requiresBreak,
    focusLossReasons: state.focusLossReasons,
    focusLossConfidence: state.focusLossConfidence,
    suggestedIntervention: state.suggestedIntervention,
    pendingActivity: state.pendingActivity,
    isOnBreak: state.isOnBreak,
    breakStartTime: state.breakStartTime,
    currentBreakActivity: state.currentBreakActivity,
    currentMood: state.currentMood,
    error: state.error,

    // Idle state
    idleMs,
    isDocumentVisible,

    // Actions
    startMonitoring,
    stopMonitoring,
    recordInteraction,
    recordRapidExit,
    reportMood,
    startBreak,
    completeBreak,
    dismissBreak,
    requestRecommendation,
    clearError: actions.clearError,
    reset: actions.reset,
  };
}
