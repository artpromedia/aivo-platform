'use client';

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';

import type {
  FocusLossReason,
  GradeBand,
  RegulationActivity,
  SelfReportedMood,
} from './focus-api';

// ══════════════════════════════════════════════════════════════════════════════
// STATE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Focus monitoring state.
 * Tracks all aspects of focus monitoring during a learning session.
 */
export interface FocusState {
  /** Whether monitoring is currently active */
  isMonitoring: boolean;
  /** Timestamp of the last ping sent */
  lastPingTime: Date | null;
  /** Whether a break is recommended based on focus loss detection */
  requiresBreak: boolean;
  /** Reasons why focus loss was detected */
  focusLossReasons: FocusLossReason[];
  /** Confidence score of focus loss detection (0-1) */
  focusLossConfidence: number;
  /** Suggested intervention level */
  suggestedIntervention: 'none' | 'light_prompt' | 'regulation_break';
  /** The current recommended activity (if any) */
  pendingActivity: RegulationActivity | null;
  /** Whether the learner is currently on a break */
  isOnBreak: boolean;
  /** When the current break started */
  breakStartTime: Date | null;
  /** The activity being performed during break */
  currentBreakActivity: RegulationActivity | null;
  /** Current self-reported mood */
  currentMood: SelfReportedMood | null;
  /** Any error message */
  error: string | null;
}

/**
 * Session configuration for focus monitoring.
 */
export interface FocusSessionConfig {
  sessionId: string;
  learnerId: string;
  activityId: string;
  gradeBand: GradeBand;
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════════════════════════════════════════

type FocusAction =
  | { type: 'START_MONITORING' }
  | { type: 'STOP_MONITORING' }
  | { type: 'PING_SENT'; timestamp: Date }
  | {
      type: 'FOCUS_LOSS_DETECTED';
      reasons: FocusLossReason[];
      confidence: number;
      intervention: 'none' | 'light_prompt' | 'regulation_break';
    }
  | { type: 'FOCUS_RESTORED' }
  | { type: 'SET_PENDING_ACTIVITY'; activity: RegulationActivity }
  | { type: 'DISMISS_BREAK_RECOMMENDATION' }
  | { type: 'START_BREAK'; activity: RegulationActivity }
  | { type: 'COMPLETE_BREAK' }
  | { type: 'SET_MOOD'; mood: SelfReportedMood }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

// ══════════════════════════════════════════════════════════════════════════════
// REDUCER
// ══════════════════════════════════════════════════════════════════════════════

const initialState: FocusState = {
  isMonitoring: false,
  lastPingTime: null,
  requiresBreak: false,
  focusLossReasons: [],
  focusLossConfidence: 0,
  suggestedIntervention: 'none',
  pendingActivity: null,
  isOnBreak: false,
  breakStartTime: null,
  currentBreakActivity: null,
  currentMood: null,
  error: null,
};

function focusReducer(state: FocusState, action: FocusAction): FocusState {
  switch (action.type) {
    case 'START_MONITORING':
      return {
        ...state,
        isMonitoring: true,
        error: null,
      };

    case 'STOP_MONITORING':
      return {
        ...state,
        isMonitoring: false,
      };

    case 'PING_SENT':
      return {
        ...state,
        lastPingTime: action.timestamp,
      };

    case 'FOCUS_LOSS_DETECTED':
      return {
        ...state,
        requiresBreak: action.intervention === 'regulation_break',
        focusLossReasons: action.reasons,
        focusLossConfidence: action.confidence,
        suggestedIntervention: action.intervention,
      };

    case 'FOCUS_RESTORED':
      return {
        ...state,
        requiresBreak: false,
        focusLossReasons: [],
        focusLossConfidence: 0,
        suggestedIntervention: 'none',
        pendingActivity: null,
      };

    case 'SET_PENDING_ACTIVITY':
      return {
        ...state,
        pendingActivity: action.activity,
      };

    case 'DISMISS_BREAK_RECOMMENDATION':
      return {
        ...state,
        requiresBreak: false,
        pendingActivity: null,
        // Keep reasons for analytics but reset intervention
        suggestedIntervention: 'none',
      };

    case 'START_BREAK':
      return {
        ...state,
        isOnBreak: true,
        breakStartTime: new Date(),
        currentBreakActivity: action.activity,
        requiresBreak: false,
        pendingActivity: null,
      };

    case 'COMPLETE_BREAK':
      return {
        ...state,
        isOnBreak: false,
        breakStartTime: null,
        currentBreakActivity: null,
        // Reset focus loss state after break
        focusLossReasons: [],
        focusLossConfidence: 0,
        suggestedIntervention: 'none',
      };

    case 'SET_MOOD':
      return {
        ...state,
        currentMood: action.mood,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ══════════════════════════════════════════════════════════════════════════════

interface FocusContextValue {
  state: FocusState;
  config: FocusSessionConfig | null;
  actions: {
    startMonitoring: () => void;
    stopMonitoring: () => void;
    recordPingSent: () => void;
    handleFocusLossDetection: (
      reasons: FocusLossReason[],
      confidence: number,
      intervention: 'none' | 'light_prompt' | 'regulation_break'
    ) => void;
    restoreFocus: () => void;
    setPendingActivity: (activity: RegulationActivity) => void;
    dismissBreakRecommendation: () => void;
    startBreak: (activity: RegulationActivity) => void;
    completeBreak: () => void;
    setMood: (mood: SelfReportedMood) => void;
    setError: (error: string) => void;
    clearError: () => void;
    reset: () => void;
  };
  setConfig: (config: FocusSessionConfig) => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

interface FocusProviderProps {
  children: ReactNode;
  initialConfig?: FocusSessionConfig;
}

export function FocusProvider({ children, initialConfig }: FocusProviderProps) {
  const [state, dispatch] = useReducer(focusReducer, initialState);
  const [config, setConfigState] = useReducer(
    (_: FocusSessionConfig | null, newConfig: FocusSessionConfig) => newConfig,
    initialConfig ?? null
  );

  const actions = useMemo(
    () => ({
      startMonitoring: () => dispatch({ type: 'START_MONITORING' }),
      stopMonitoring: () => dispatch({ type: 'STOP_MONITORING' }),
      recordPingSent: () => dispatch({ type: 'PING_SENT', timestamp: new Date() }),
      handleFocusLossDetection: (
        reasons: FocusLossReason[],
        confidence: number,
        intervention: 'none' | 'light_prompt' | 'regulation_break'
      ) => dispatch({ type: 'FOCUS_LOSS_DETECTED', reasons, confidence, intervention }),
      restoreFocus: () => dispatch({ type: 'FOCUS_RESTORED' }),
      setPendingActivity: (activity: RegulationActivity) =>
        dispatch({ type: 'SET_PENDING_ACTIVITY', activity }),
      dismissBreakRecommendation: () => dispatch({ type: 'DISMISS_BREAK_RECOMMENDATION' }),
      startBreak: (activity: RegulationActivity) => dispatch({ type: 'START_BREAK', activity }),
      completeBreak: () => dispatch({ type: 'COMPLETE_BREAK' }),
      setMood: (mood: SelfReportedMood) => dispatch({ type: 'SET_MOOD', mood }),
      setError: (error: string) => dispatch({ type: 'SET_ERROR', error }),
      clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
      reset: () => dispatch({ type: 'RESET' }),
    }),
    []
  );

  const setConfig = useCallback((newConfig: FocusSessionConfig) => {
    setConfigState(newConfig);
  }, []);

  const value = useMemo(
    () => ({
      state,
      config,
      actions,
      setConfig,
    }),
    [state, config, actions, setConfig]
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Hook to access focus monitoring context.
 * Must be used within a FocusProvider.
 */
export function useFocusContext(): FocusContextValue {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocusContext must be used within a FocusProvider');
  }
  return context;
}
