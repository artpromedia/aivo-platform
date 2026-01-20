'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Idle detection state.
 */
export interface IdleState {
  /** Whether the user is currently idle (exceeds threshold) */
  isIdle: boolean;
  /** Milliseconds since last user interaction */
  idleMs: number;
  /** Whether the document/tab is currently visible */
  isDocumentVisible: boolean;
  /** Timestamp of last user interaction */
  lastInteractionTime: Date | null;
}

/**
 * Options for the idle detection hook.
 */
export interface UseIdleDetectionOptions {
  /** Time in ms before user is considered idle (default: 60000 = 1 minute) */
  idleThresholdMs?: number;
  /** Interval in ms to check idle time (default: 1000 = 1 second) */
  checkIntervalMs?: number;
  /** Whether to start monitoring immediately (default: true) */
  enabled?: boolean;
}

const DEFAULT_IDLE_THRESHOLD_MS = 60000; // 1 minute
const DEFAULT_CHECK_INTERVAL_MS = 1000; // 1 second

/**
 * Hook to detect user idle time and document visibility.
 * Tracks time since last user interaction (mouse move, key press, touch, scroll).
 *
 * @example
 * ```tsx
 * const { isIdle, idleMs, isDocumentVisible, recordInteraction } = useIdleDetection({
 *   idleThresholdMs: 30000, // 30 seconds
 * });
 * ```
 */
export function useIdleDetection(options: UseIdleDetectionOptions = {}): IdleState & {
  recordInteraction: () => void;
  reset: () => void;
} {
  const {
    idleThresholdMs = DEFAULT_IDLE_THRESHOLD_MS,
    checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS,
    enabled = true,
  } = options;

  const [idleState, setIdleState] = useState<IdleState>({
    isIdle: false,
    idleMs: 0,
    isDocumentVisible: true,
    lastInteractionTime: null,
  });

  const lastInteractionRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Record a user interaction
  const recordInteraction = useCallback(() => {
    const now = Date.now();
    lastInteractionRef.current = now;
    setIdleState((prev) => ({
      ...prev,
      isIdle: false,
      idleMs: 0,
      lastInteractionTime: new Date(now),
    }));
  }, []);

  // Reset the idle detection state
  const reset = useCallback(() => {
    const now = Date.now();
    lastInteractionRef.current = now;
    setIdleState({
      isIdle: false,
      idleMs: 0,
      isDocumentVisible: typeof document !== 'undefined' ? !document.hidden : true,
      lastInteractionTime: new Date(now),
    });
  }, []);

  // Check current idle time
  const checkIdleTime = useCallback(() => {
    const now = Date.now();
    const idleMs = now - lastInteractionRef.current;
    const isIdle = idleMs >= idleThresholdMs;

    setIdleState((prev) => ({
      ...prev,
      idleMs,
      isIdle,
    }));
  }, [idleThresholdMs]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    setIdleState((prev) => ({
      ...prev,
      isDocumentVisible: isVisible,
    }));

    // If becoming visible again, record as interaction
    if (isVisible) {
      recordInteraction();
    }
  }, [recordInteraction]);

  // Set up event listeners and interval
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    // Initialize last interaction time
    recordInteraction();

    // User interaction events
    const interactionEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
      'click',
    ];

    // Throttle interaction recording to avoid excessive updates
    let lastRecordedTime = 0;
    const throttledRecordInteraction = () => {
      const now = Date.now();
      if (now - lastRecordedTime > 100) {
        // Throttle to 100ms
        lastRecordedTime = now;
        recordInteraction();
      }
    };

    // Add event listeners
    interactionEvents.forEach((event) => {
      window.addEventListener(event, throttledRecordInteraction, { passive: true });
    });

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start idle check interval
    checkIntervalRef.current = setInterval(checkIdleTime, checkIntervalMs);

    // Cleanup
    return () => {
      interactionEvents.forEach((event) => {
        window.removeEventListener(event, throttledRecordInteraction);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, checkIntervalMs, recordInteraction, handleVisibilityChange, checkIdleTime]);

  return {
    ...idleState,
    recordInteraction,
    reset,
  };
}
