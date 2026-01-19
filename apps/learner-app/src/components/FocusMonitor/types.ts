export type FocusState = 'focused' | 'wandering' | 'distracted' | 'taking_break';

export interface FocusEvent {
  timestamp: string;
  state: FocusState;
  idleTime: number;
  activityType?: string;
}

export interface FocusSession {
  id: string;
  learnerId: string;
  startedAt: string;
  endedAt?: string;
  focusedTime: number; // seconds
  wanderingTime: number;
  distractedTime: number;
  breaksTaken: number;
  averageFocusStretch: number; // seconds
  longestFocusStretch: number; // seconds
  events: FocusEvent[];
}

export interface FocusMonitorProps {
  learnerId: string;
  enabled?: boolean;
  idleThreshold?: number; // seconds before wandering
  distractedThreshold?: number; // seconds before distracted
  trackingInterval?: number; // ms between tracking calls
  showIndicator?: boolean;
  onStateChange?: (state: FocusState, idleTime: number) => void;
  onBreakSuggested?: () => void;
}

export interface FocusIndicatorProps {
  state: FocusState;
  idleTime: number;
  className?: string;
}

export interface BreakSuggestionProps {
  onTakeBreak: () => void;
  onDismiss: () => void;
  breakType?: 'game' | 'breathing' | 'movement';
}

export interface FocusStatsProps {
  session: FocusSession;
  className?: string;
}

// Focus configuration presets
export interface FocusPreset {
  name: string;
  idleThreshold: number;
  distractedThreshold: number;
  breakInterval: number; // seconds
  breakDuration: number; // seconds
}

export const FOCUS_PRESETS: Record<string, FocusPreset> = {
  relaxed: {
    name: 'Relaxed',
    idleThreshold: 45, // 45 seconds
    distractedThreshold: 90, // 90 seconds
    breakInterval: 30 * 60, // 30 minutes
    breakDuration: 5 * 60, // 5 minutes
  },
  standard: {
    name: 'Standard',
    idleThreshold: 30, // 30 seconds
    distractedThreshold: 60, // 60 seconds
    breakInterval: 25 * 60, // 25 minutes (Pomodoro)
    breakDuration: 5 * 60, // 5 minutes
  },
  intensive: {
    name: 'Intensive',
    idleThreshold: 20, // 20 seconds
    distractedThreshold: 45, // 45 seconds
    breakInterval: 20 * 60, // 20 minutes
    breakDuration: 3 * 60, // 3 minutes
  },
  adhd_friendly: {
    name: 'ADHD Friendly',
    idleThreshold: 60, // 60 seconds - more lenient
    distractedThreshold: 120, // 2 minutes
    breakInterval: 15 * 60, // 15 minutes - shorter work intervals
    breakDuration: 5 * 60, // 5 minutes
  },
};
