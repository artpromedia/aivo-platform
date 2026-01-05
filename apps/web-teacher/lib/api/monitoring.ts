/**
 * Monitoring API Client
 * Types and fetch functions for real-time student monitoring.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

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

  const params = new URLSearchParams();
  if (classId) params.set('classId', classId);

  const res = await fetch(`${API_BASE_URL}/api/v1/monitoring/sessions?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch active sessions: ${res.status}`);
  }

  return res.json() as Promise<StudentSession[]>;
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

  const params = new URLSearchParams();
  if (classId) params.set('classId', classId);

  const res = await fetch(`${API_BASE_URL}/api/v1/monitoring/stats?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch monitoring stats: ${res.status}`);
  }

  return res.json() as Promise<MonitoringStats>;
}

export async function fetchHelpRequests(accessToken: string): Promise<HelpRequest[]> {
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

  const res = await fetch(`${API_BASE_URL}/api/v1/monitoring/help-requests`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch help requests: ${res.status}`);
  }

  return res.json() as Promise<HelpRequest[]>;
}

export async function acknowledgeHelpRequest(
  requestId: string,
  accessToken: string
): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  const res = await fetch(
    `${API_BASE_URL}/api/v1/monitoring/help-requests/${requestId}/acknowledge`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to acknowledge help request: ${res.status}`);
  }
}

export async function resolveHelpRequest(requestId: string, accessToken: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/monitoring/help-requests/${requestId}/resolve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to resolve help request: ${res.status}`);
  }
}

export async function sendNudge(
  studentId: string,
  message: string,
  accessToken: string
): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/monitoring/nudge`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ studentId, message }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send nudge: ${res.status}`);
  }
}
