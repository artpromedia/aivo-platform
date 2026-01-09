/**
 * Monitoring API Client
 * Types and fetch functions for real-time student monitoring.
 *
 * Backend Service: realtime-svc (port 3003)
 * Note: Real-time updates are handled via WebSocket (see use-websocket.ts hook)
 * This API provides REST endpoints for initial data loading and actions.
 */

const REALTIME_SVC_URL = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3003';

// Production-safe mock mode check
// CRITICAL: This pattern ensures mock data is NEVER returned in production
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const MOCK_REQUESTED = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const USE_MOCK = IS_DEVELOPMENT && MOCK_REQUESTED;

// Warn if mock mode is requested in production (but don't enable it)
if (process.env.NODE_ENV === 'production' && MOCK_REQUESTED) {
  console.warn('[Monitoring API] USE_MOCK ignored in production - using real API');
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type FocusState = 'focused' | 'distracted' | 'idle' | 'break';

export interface StudentSession {
  id: string;
  studentId: string;
  studentName: string;
  avatarUrl?: string;
  currentActivity: string;
  activityType: 'game' | 'quiz' | 'reading' | 'video' | 'break' | 'homework';
  subject: string;
  startTime: string;
  duration: number;
  progress: number;
  focusState: FocusState;
  needsHelp: boolean;
  helpRequestTime?: string;
  recentScore?: number;
  streakCount?: number;
}

export interface MonitoringStats {
  totalActive: number;
  focusedCount: number;
  distractedCount: number;
  idleCount: number;
  onBreakCount: number;
  needsHelpCount: number;
  avgProgress: number;
}

export interface HelpRequest {
  id: string;
  studentId: string;
  studentName: string;
  activity: string;
  subject: string;
  requestTime: string;
  status: 'pending' | 'acknowledged' | 'resolved';
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

function mockActiveSessions(): StudentSession[] {
  return [
    {
      id: '1',
      studentId: 's1',
      studentName: 'Emma Wilson',
      currentActivity: 'Fraction Addition Practice',
      activityType: 'game',
      subject: 'Math',
      startTime: '10:15 AM',
      duration: 18,
      progress: 65,
      focusState: 'focused',
      needsHelp: false,
      recentScore: 92,
      streakCount: 5,
    },
    {
      id: '2',
      studentId: 's2',
      studentName: 'Michael Chen',
      currentActivity: 'Reading Comprehension Quiz',
      activityType: 'quiz',
      subject: 'Reading',
      startTime: '10:20 AM',
      duration: 13,
      progress: 40,
      focusState: 'focused',
      needsHelp: false,
      recentScore: 85,
    },
    {
      id: '3',
      studentId: 's3',
      studentName: 'Olivia Brown',
      currentActivity: 'Multiplication Facts',
      activityType: 'game',
      subject: 'Math',
      startTime: '10:12 AM',
      duration: 21,
      progress: 80,
      focusState: 'distracted',
      needsHelp: true,
      helpRequestTime: '10:30 AM',
    },
    {
      id: '4',
      studentId: 's4',
      studentName: 'Alex Smith',
      currentActivity: 'Vocabulary Matching',
      activityType: 'game',
      subject: 'Reading',
      startTime: '10:25 AM',
      duration: 8,
      progress: 25,
      focusState: 'focused',
      needsHelp: false,
      recentScore: 78,
    },
    {
      id: '5',
      studentId: 's5',
      studentName: 'Sarah Johnson',
      currentActivity: 'Breathing Exercise',
      activityType: 'break',
      subject: 'Focus Break',
      startTime: '10:28 AM',
      duration: 2,
      progress: 50,
      focusState: 'break',
      needsHelp: false,
    },
    {
      id: '6',
      studentId: 's6',
      studentName: 'James Miller',
      currentActivity: 'Word Problems',
      activityType: 'homework',
      subject: 'Math',
      startTime: '10:10 AM',
      duration: 23,
      progress: 55,
      focusState: 'idle',
      needsHelp: true,
      helpRequestTime: '10:28 AM',
    },
  ];
}

function mockMonitoringStats(sessions: StudentSession[]): MonitoringStats {
  return {
    totalActive: sessions.length,
    focusedCount: sessions.filter((s) => s.focusState === 'focused').length,
    distractedCount: sessions.filter((s) => s.focusState === 'distracted').length,
    idleCount: sessions.filter((s) => s.focusState === 'idle').length,
    onBreakCount: sessions.filter((s) => s.focusState === 'break').length,
    needsHelpCount: sessions.filter((s) => s.needsHelp).length,
    avgProgress: Math.round(sessions.reduce((sum, s) => sum + s.progress, 0) / sessions.length),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchActiveSessions(
  classId: string | undefined,
  accessToken: string
): Promise<StudentSession[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockActiveSessions();
  }

  if (!classId) {
    throw new Error('classId is required for fetching active sessions');
  }

  const res = await fetch(`${REALTIME_SVC_URL}/monitor/classroom/${classId}/students`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch active sessions: ${res.status}`);
  }

  const data = await res.json();
  // realtime-svc returns { success: true, data: [...] }
  const students = data.data ?? data;
  return students.map(transformStudentSession);
}

// Helper to transform backend student data to frontend StudentSession interface
function transformStudentSession(student: any): StudentSession {
  return {
    id: student.sessionId ?? student.id,
    studentId: student.studentId ?? student.id,
    studentName: student.name ?? student.studentName,
    avatarUrl: student.avatarUrl,
    currentActivity: student.currentActivity?.name ?? student.activity ?? 'Unknown Activity',
    activityType: mapActivityType(student.currentActivity?.type ?? student.activityType),
    subject: student.currentActivity?.subject ?? student.subject ?? 'General',
    startTime: formatTime(student.sessionStartTime ?? student.startTime),
    duration: calculateDuration(student.sessionStartTime ?? student.startTime),
    progress: student.progress ?? student.currentActivity?.progress ?? 0,
    focusState: mapFocusState(student.focusState ?? student.engagement?.state),
    needsHelp: student.needsHelp ?? student.hasActiveHelpRequest ?? false,
    helpRequestTime: student.helpRequestTime ? formatTime(student.helpRequestTime) : undefined,
    recentScore: student.recentScore ?? student.lastScore,
    streakCount: student.streakCount ?? student.streak,
  };
}

// Helper to map backend activity types to frontend types
function mapActivityType(type: string): StudentSession['activityType'] {
  const typeMap: Record<string, StudentSession['activityType']> = {
    'GAME': 'game',
    'QUIZ': 'quiz',
    'READING': 'reading',
    'VIDEO': 'video',
    'BREAK': 'break',
    'HOMEWORK': 'homework',
    'game': 'game',
    'quiz': 'quiz',
    'reading': 'reading',
    'video': 'video',
    'break': 'break',
    'homework': 'homework',
  };
  return typeMap[type] ?? 'game';
}

// Helper to map backend focus states to frontend states
function mapFocusState(state: string): FocusState {
  const stateMap: Record<string, FocusState> = {
    'FOCUSED': 'focused',
    'DISTRACTED': 'distracted',
    'IDLE': 'idle',
    'BREAK': 'break',
    'focused': 'focused',
    'distracted': 'distracted',
    'idle': 'idle',
    'break': 'break',
  };
  return stateMap[state] ?? 'focused';
}

// Helper to format time for display
function formatTime(timestamp: string | Date | undefined): string {
  if (!timestamp) return '';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Helper to calculate duration in minutes
function calculateDuration(startTime: string | Date | undefined): number {
  if (!startTime) return 0;
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
}

export async function fetchMonitoringStats(
  classId: string | undefined,
  accessToken: string
): Promise<MonitoringStats> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const sessions = mockActiveSessions();
    return mockMonitoringStats(sessions);
  }

  if (!classId) {
    throw new Error('classId is required for fetching monitoring stats');
  }

  const res = await fetch(`${REALTIME_SVC_URL}/monitor/classroom/${classId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch monitoring stats: ${res.status}`);
  }

  const data = await res.json();
  // realtime-svc returns { success: true, data: { metrics: {...}, students: [...] } }
  const classroom = data.data ?? data;
  const metrics = classroom.metrics ?? classroom;

  return {
    totalActive: metrics.totalActive ?? metrics.activeStudents ?? 0,
    focusedCount: metrics.focusedCount ?? metrics.focused ?? 0,
    distractedCount: metrics.distractedCount ?? metrics.distracted ?? 0,
    idleCount: metrics.idleCount ?? metrics.idle ?? 0,
    onBreakCount: metrics.onBreakCount ?? metrics.onBreak ?? 0,
    needsHelpCount: metrics.needsHelpCount ?? metrics.needingHelp ?? 0,
    avgProgress: metrics.avgProgress ?? metrics.averageProgress ?? 0,
  };
}

export async function fetchHelpRequests(
  accessToken: string,
  classId?: string
): Promise<HelpRequest[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const sessions = mockActiveSessions().filter((s) => s.needsHelp);
    return sessions.map((s) => ({
      id: `help-${s.id}`,
      studentId: s.studentId,
      studentName: s.studentName,
      activity: s.currentActivity,
      subject: s.subject,
      requestTime: s.helpRequestTime ?? s.startTime,
      status: 'pending' as const,
    }));
  }

  if (!classId) {
    throw new Error('classId is required for fetching help requests');
  }

  const res = await fetch(`${REALTIME_SVC_URL}/monitor/classroom/${classId}/alerts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch help requests: ${res.status}`);
  }

  const data = await res.json();
  // realtime-svc returns alerts which include help requests
  const alerts = data.data ?? data;
  return alerts
    .filter((alert: any) => alert.type === 'HELP_REQUEST' || alert.type === 'help_request')
    .map(transformHelpRequest);
}

// Helper to transform backend alert to frontend HelpRequest
function transformHelpRequest(alert: any): HelpRequest {
  return {
    id: alert.id,
    studentId: alert.studentId,
    studentName: alert.studentName ?? alert.student?.name,
    activity: alert.activity ?? alert.context?.activity,
    subject: alert.subject ?? alert.context?.subject ?? 'General',
    requestTime: formatTime(alert.createdAt ?? alert.timestamp),
    status: mapHelpRequestStatus(alert.status),
  };
}

// Helper to map backend status to frontend status
function mapHelpRequestStatus(status: string): HelpRequest['status'] {
  const statusMap: Record<string, HelpRequest['status']> = {
    'PENDING': 'pending',
    'ACKNOWLEDGED': 'acknowledged',
    'RESOLVED': 'resolved',
    'pending': 'pending',
    'acknowledged': 'acknowledged',
    'resolved': 'resolved',
  };
  return statusMap[status] ?? 'pending';
}

export async function acknowledgeHelpRequest(
  requestId: string,
  accessToken: string,
  classId?: string
): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  // realtime-svc uses intervention endpoint for acknowledging
  // We need the classId to construct the proper URL
  if (!classId) {
    throw new Error('classId is required for acknowledging help request');
  }

  const res = await fetch(
    `${REALTIME_SVC_URL}/monitor/classroom/${classId}/intervention`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: requestId.replace('help-', ''), // Extract student ID from help request ID
        type: 'help',
        triggeredByAlert: requestId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to acknowledge help request: ${res.status}`);
  }
}

export async function resolveHelpRequest(
  requestId: string,
  accessToken: string,
  classId?: string
): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  if (!classId) {
    throw new Error('classId is required for resolving help request');
  }

  // Use intervention endpoint to mark as resolved
  const res = await fetch(`${REALTIME_SVC_URL}/monitor/classroom/${classId}/intervention`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      studentId: requestId.replace('help-', ''),
      type: 'help',
      message: 'Help request resolved',
      triggeredByAlert: requestId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to resolve help request: ${res.status}`);
  }
}

export async function sendNudge(
  studentId: string,
  message: string,
  accessToken: string,
  classId?: string
): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return;
  }

  if (!classId) {
    throw new Error('classId is required for sending nudge');
  }

  // Use intervention endpoint to send nudge/encouragement
  const res = await fetch(`${REALTIME_SVC_URL}/monitor/classroom/${classId}/intervention`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      studentId,
      type: 'encouragement',
      message,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send nudge: ${res.status}`);
  }
}
