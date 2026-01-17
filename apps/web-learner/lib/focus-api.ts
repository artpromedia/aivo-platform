/**
 * Focus Service API Client
 * Connects to focus-svc microservice for focus tools functionality
 */

const FOCUS_API_BASE = process.env.NEXT_PUBLIC_FOCUS_API_URL || 'http://localhost:8080/api/focus';

export interface FocusSession {
  id: string;
  learnerId: string;
  startTime: string;
  endTime?: string;
  duration: number; // in seconds
  focusMode: 'pomodoro' | 'custom' | 'deep-work';
  breaks: FocusBreak[];
  distractions: Distraction[];
  completed: boolean;
}

export interface FocusBreak {
  id: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration: number; // in seconds
  activityType: 'breathing' | 'stretching' | 'mindfulness' | 'movement' | 'free';
  completed: boolean;
}

export interface Distraction {
  id: string;
  sessionId: string;
  timestamp: string;
  type: 'manual' | 'auto';
  description?: string;
}

export interface FocusStats {
  learnerId: string;
  totalSessions: number;
  totalFocusTime: number; // in seconds
  averageSessionLength: number;
  longestStreak: number;
  currentStreak: number;
  weeklyProgress: {
    week: string;
    totalMinutes: number;
    sessionsCompleted: number;
  }[];
  distractionRate: number;
}

export interface FocusPreferences {
  learnerId: string;
  defaultMode: 'pomodoro' | 'custom' | 'deep-work';
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  customWorkMinutes: number;
  customBreakMinutes: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  breakReminders: boolean;
}

/**
 * Start a new focus session
 */
export async function startFocusSession(
  learnerId: string,
  mode: 'pomodoro' | 'custom' | 'deep-work',
  duration?: number
): Promise<FocusSession> {
  const response = await fetch(`${FOCUS_API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId, focusMode: mode, duration }),
  });

  if (!response.ok) {
    throw new Error('Failed to start focus session');
  }

  return response.json();
}

/**
 * End an active focus session
 */
export async function endFocusSession(sessionId: string): Promise<FocusSession> {
  const response = await fetch(`${FOCUS_API_BASE}/sessions/${sessionId}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to end focus session');
  }

  return response.json();
}

/**
 * Record a distraction during a session
 */
export async function recordDistraction(
  sessionId: string,
  type: 'manual' | 'auto',
  description?: string
): Promise<Distraction> {
  const response = await fetch(`${FOCUS_API_BASE}/sessions/${sessionId}/distractions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, description }),
  });

  if (!response.ok) {
    throw new Error('Failed to record distraction');
  }

  return response.json();
}

/**
 * Start a break during a focus session
 */
export async function startBreak(
  sessionId: string,
  activityType: string
): Promise<FocusBreak> {
  const response = await fetch(`${FOCUS_API_BASE}/sessions/${sessionId}/breaks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityType }),
  });

  if (!response.ok) {
    throw new Error('Failed to start break');
  }

  return response.json();
}

/**
 * End a break
 */
export async function endBreak(sessionId: string, breakId: string): Promise<FocusBreak> {
  const response = await fetch(`${FOCUS_API_BASE}/sessions/${sessionId}/breaks/${breakId}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to end break');
  }

  return response.json();
}

/**
 * Get focus statistics for a learner
 */
export async function getFocusStats(learnerId: string): Promise<FocusStats> {
  const response = await fetch(`${FOCUS_API_BASE}/stats/${learnerId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch focus stats');
  }

  return response.json();
}

/**
 * Get active focus session for a learner
 */
export async function getActiveSession(learnerId: string): Promise<FocusSession | null> {
  const response = await fetch(`${FOCUS_API_BASE}/sessions/active?learnerId=${learnerId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch active session');
  }

  return response.json();
}

/**
 * Get focus preferences for a learner
 */
export async function getFocusPreferences(learnerId: string): Promise<FocusPreferences> {
  const response = await fetch(`${FOCUS_API_BASE}/preferences/${learnerId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch preferences');
  }

  return response.json();
}

/**
 * Update focus preferences
 */
export async function updateFocusPreferences(
  learnerId: string,
  preferences: Partial<FocusPreferences>
): Promise<FocusPreferences> {
  const response = await fetch(`${FOCUS_API_BASE}/preferences/${learnerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    throw new Error('Failed to update preferences');
  }

  return response.json();
}
