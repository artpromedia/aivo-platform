import type { FocusMode, FocusSession, FocusPreferences, TimerState } from '../../types';

export interface FocusTimerProps {
  /** Learner ID for session tracking */
  learnerId: string;
  /** Current active session if any */
  activeSession?: FocusSession | null;
  /** Focus preferences */
  preferences: FocusPreferences;
  /** Callback when session state changes */
  onSessionUpdate?: (session: FocusSession | null) => void;
  /** Callback to start a session */
  onStartSession?: (mode: FocusMode, duration: number) => Promise<FocusSession>;
  /** Callback to end a session */
  onEndSession?: (sessionId: string) => Promise<void>;
  /** Callback to record distraction */
  onRecordDistraction?: (sessionId: string) => Promise<void>;
  /** Callback to start break */
  onStartBreak?: (sessionId: string, activityType: string) => Promise<void>;
  /** Callback to end break */
  onEndBreak?: (sessionId: string, breakId: string) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

export interface FocusModeSelectorProps {
  /** Currently selected mode */
  selectedMode: FocusMode;
  /** Focus preferences for duration info */
  preferences: FocusPreferences;
  /** Callback when mode is selected */
  onSelectMode: (mode: FocusMode) => void;
  /** Additional CSS classes */
  className?: string;
}

export interface BreakActivitiesProps {
  /** Callback when activity is selected */
  onSelect: (activityType: string) => void;
  /** Callback when break is skipped */
  onSkip: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface BreakActivity {
  id: string;
  type: 'breathing' | 'movement' | 'mindful' | 'quick';
  title: string;
  emoji: string;
  description: string;
}
