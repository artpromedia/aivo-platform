/**
 * Analytics API client and types for classroom homework & focus analytics.
 */

const ANALYTICS_BASE_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:4030';

// Production-safe mock mode check
// CRITICAL: This pattern ensures mock data is NEVER returned in production
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const MOCK_REQUESTED = process.env.NEXT_PUBLIC_USE_ANALYTICS_MOCK === 'true';
const USE_MOCK = IS_DEVELOPMENT && MOCK_REQUESTED;

// Warn if mock mode is requested in production (but don't enable it)
if (process.env.NODE_ENV === 'production' && MOCK_REQUESTED) {
  console.warn('[Classroom Analytics API] USE_MOCK ignored in production - using real API');
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type IndependenceLabel = 'needs_support' | 'building_independence' | 'mostly_independent';

export interface LearnerHomeworkUsage {
  learnerId: string;
  learnerName?: string;
  homeworkSessionsPerWeek: number;
  avgStepsPerHomework: number;
  independenceScore: number;
  independenceLabel: IndependenceLabel;
  totalHomeworkSessions: number;
}

export interface ClassroomHomeworkUsage {
  classroomId: string;
  period: { days: number; startDate: string; endDate: string };
  totalLearners: number;
  learnersWithHomework: number;
  avgSessionsPerWeekPerLearner: number;
  learnerMetrics: LearnerHomeworkUsage[];
  independenceDistribution: {
    needsSupport: number;
    buildingIndependence: number;
    mostlyIndependent: number;
  };
}

export interface LearnerFocusData {
  learnerId: string;
  learnerName?: string;
  totalSessions: number;
  avgBreaksPerSession: number;
  avgSessionDurationMinutes: number;
  sessionsWithFocusLoss: number;
}

export interface FocusPatternsByTime {
  hour: number;
  sessionsCount: number;
  avgBreaks: number;
  focusLossCount: number;
}

export interface ClassroomFocusPatterns {
  classroomId: string;
  period: { days: number; startDate: string; endDate: string };
  totalSessions: number;
  sessionsWithFocusLoss: number;
  focusLossPercentage: number;
  avgBreaksPerSession: number;
  learnerMetrics: LearnerFocusData[];
  patternsByTime: FocusPatternsByTime[];
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchClassroomHomeworkUsage(
  tenantId: string,
  classroomId: string,
  accessToken: string,
  days = 28
): Promise<ClassroomHomeworkUsage> {
  if (USE_MOCK) {
    return mockClassroomHomeworkUsage(classroomId, days);
  }

  const res = await fetch(
    `${ANALYTICS_BASE_URL}/analytics/tenants/${tenantId}/classrooms/${classroomId}/homework-usage?days=${days}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch homework usage: ${res.status}`);
  }

  return res.json();
}

export async function fetchClassroomFocusPatterns(
  tenantId: string,
  classroomId: string,
  accessToken: string,
  days = 28
): Promise<ClassroomFocusPatterns> {
  if (USE_MOCK) {
    return mockClassroomFocusPatterns(classroomId, days);
  }

  const res = await fetch(
    `${ANALYTICS_BASE_URL}/analytics/tenants/${tenantId}/classrooms/${classroomId}/focus-patterns?days=${days}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch focus patterns: ${res.status}`);
  }

  return res.json();
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export function getIndependenceLabelText(label: IndependenceLabel): string {
  switch (label) {
    case 'needs_support':
      return 'Needs Support';
    case 'building_independence':
      return 'Building Independence';
    case 'mostly_independent':
      return 'Mostly Independent';
  }
}

export function getIndependenceLabelColor(label: IndependenceLabel): string {
  switch (label) {
    case 'needs_support':
      return 'text-orange-600 bg-orange-100';
    case 'building_independence':
      return 'text-blue-600 bg-blue-100';
    case 'mostly_independent':
      return 'text-green-600 bg-green-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

export function mockClassroomHomeworkUsage(classroomId: string, days: number = 28): ClassroomHomeworkUsage {
  const mockLearners: LearnerHomeworkUsage[] = [
    { learnerId: 'l1', learnerName: 'Alex Johnson', homeworkSessionsPerWeek: 3.5, avgStepsPerHomework: 4.2, independenceScore: 0.75, independenceLabel: 'mostly_independent', totalHomeworkSessions: 14 },
    { learnerId: 'l2', learnerName: 'Sam Williams', homeworkSessionsPerWeek: 2.0, avgStepsPerHomework: 3.8, independenceScore: 0.45, independenceLabel: 'building_independence', totalHomeworkSessions: 8 },
    { learnerId: 'l3', learnerName: 'Jordan Davis', homeworkSessionsPerWeek: 4.0, avgStepsPerHomework: 5.0, independenceScore: 0.82, independenceLabel: 'mostly_independent', totalHomeworkSessions: 16 },
    { learnerId: 'l4', learnerName: 'Taylor Brown', homeworkSessionsPerWeek: 1.5, avgStepsPerHomework: 3.2, independenceScore: 0.25, independenceLabel: 'needs_support', totalHomeworkSessions: 6 },
    { learnerId: 'l5', learnerName: 'Morgan Miller', homeworkSessionsPerWeek: 2.8, avgStepsPerHomework: 4.0, independenceScore: 0.55, independenceLabel: 'building_independence', totalHomeworkSessions: 11 },
    { learnerId: 'l6', learnerName: 'Casey Wilson', homeworkSessionsPerWeek: 3.2, avgStepsPerHomework: 4.5, independenceScore: 0.68, independenceLabel: 'building_independence', totalHomeworkSessions: 13 },
  ];

  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return {
    classroomId,
    period: {
      days,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    totalLearners: mockLearners.length,
    learnersWithHomework: mockLearners.length,
    avgSessionsPerWeekPerLearner: 2.8,
    learnerMetrics: mockLearners,
    independenceDistribution: {
      needsSupport: 1,
      buildingIndependence: 3,
      mostlyIndependent: 2,
    },
  };
}

export function mockClassroomFocusPatterns(classroomId: string, days: number = 28): ClassroomFocusPatterns {
  const mockLearners: LearnerFocusData[] = [
    { learnerId: 'l1', learnerName: 'Alex Johnson', totalSessions: 12, avgBreaksPerSession: 0.8, avgSessionDurationMinutes: 18, sessionsWithFocusLoss: 3 },
    { learnerId: 'l2', learnerName: 'Sam Williams', totalSessions: 8, avgBreaksPerSession: 1.5, avgSessionDurationMinutes: 22, sessionsWithFocusLoss: 5 },
    { learnerId: 'l3', learnerName: 'Jordan Davis', totalSessions: 15, avgBreaksPerSession: 0.4, avgSessionDurationMinutes: 15, sessionsWithFocusLoss: 2 },
    { learnerId: 'l4', learnerName: 'Taylor Brown', totalSessions: 6, avgBreaksPerSession: 2.0, avgSessionDurationMinutes: 25, sessionsWithFocusLoss: 4 },
    { learnerId: 'l5', learnerName: 'Morgan Miller', totalSessions: 10, avgBreaksPerSession: 1.2, avgSessionDurationMinutes: 20, sessionsWithFocusLoss: 4 },
    { learnerId: 'l6', learnerName: 'Casey Wilson', totalSessions: 11, avgBreaksPerSession: 0.9, avgSessionDurationMinutes: 17, sessionsWithFocusLoss: 3 },
  ];

  const mockTimePatterns: FocusPatternsByTime[] = [
    { hour: 8, sessionsCount: 5, avgBreaks: 0.6, focusLossCount: 1 },
    { hour: 9, sessionsCount: 12, avgBreaks: 0.8, focusLossCount: 3 },
    { hour: 10, sessionsCount: 15, avgBreaks: 1.0, focusLossCount: 4 },
    { hour: 11, sessionsCount: 10, avgBreaks: 1.2, focusLossCount: 4 },
    { hour: 13, sessionsCount: 8, avgBreaks: 1.5, focusLossCount: 5 },
    { hour: 14, sessionsCount: 12, avgBreaks: 1.3, focusLossCount: 4 },
    { hour: 15, sessionsCount: 6, avgBreaks: 0.9, focusLossCount: 2 },
  ];

  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const totalSessions = mockLearners.reduce((sum, l) => sum + l.totalSessions, 0);
  const sessionsWithFocusLoss = mockLearners.reduce((sum, l) => sum + l.sessionsWithFocusLoss, 0);

  return {
    classroomId,
    period: {
      days,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    totalSessions,
    sessionsWithFocusLoss,
    focusLossPercentage: Math.round((sessionsWithFocusLoss / totalSessions) * 100),
    avgBreaksPerSession: 1.1,
    learnerMetrics: mockLearners,
    patternsByTime: mockTimePatterns,
  };
}
