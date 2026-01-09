/**
 * Reports API client for web-district app.
 * Fetches classroom summary reports from reports-svc.
 */

const REPORTS_BASE_URL = process.env.NEXT_PUBLIC_REPORTS_URL || 'http://localhost:4050';

// Production-safe mock mode check
// CRITICAL: This pattern ensures mock data is NEVER returned in production
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const MOCK_REQUESTED = process.env.NEXT_PUBLIC_USE_REPORTS_MOCK === 'true';
const USE_MOCK = IS_DEVELOPMENT && MOCK_REQUESTED;

// Warn if mock mode is requested in production (but don't enable it)
if (process.env.NODE_ENV === 'production' && MOCK_REQUESTED) {
  console.warn('[Classroom Reports API] USE_MOCK ignored in production - using real API');
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ClassroomBaselineStats {
  totalLearners: number;
  baselineCompleted: number;
  baselineInProgress: number;
  baselineNotStarted: number;
  completionRate: number;
}

export interface ClassroomGoalStats {
  totalGoals: number;
  statusDistribution: {
    active: number;
    completed: number;
    onHold: number;
    draft: number;
  };
  avgGoalsPerLearner: number;
}

export interface ClassroomHomeworkStats {
  learnersWithHomework: number;
  avgSessionsPerWeekPerLearner: number;
  independenceDistribution: {
    needsSupport: number;
    buildingIndependence: number;
    mostlyIndependent: number;
  };
}

export interface ClassroomFocusStats {
  totalSessions: number;
  avgBreaksPerSession: number;
  focusLossPercentage: number;
  peakHours: number[];
}

export interface ClassroomLearnerRow {
  learnerId: string;
  learnerName: string;
  baselineStatus: string;
  activeGoalsCount: number;
  homeworkSessionsThisWeek: number;
  independenceLabel: string;
}

export interface ClassroomSummaryReport {
  classroomId: string;
  classroomName: string;
  tenantId: string;
  generatedAt: string;
  reportPeriodDays: number;
  baseline: ClassroomBaselineStats;
  goals: ClassroomGoalStats;
  homework: ClassroomHomeworkStats;
  focus: ClassroomFocusStats;
  learners: ClassroomLearnerRow[];
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchClassroomSummary(
  classroomId: string,
  accessToken: string,
  days = 28
): Promise<ClassroomSummaryReport> {
  // Mock mode for development
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (USE_MOCK) {
    return mockClassroomSummary(classroomId, days);
  }

  const res = await fetch(
    `${REPORTS_BASE_URL}/reports/classrooms/${classroomId}/summary?days=${days}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch classroom summary: ${res.status}`);
  }

  return res.json() as Promise<ClassroomSummaryReport>;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

function mockClassroomSummary(classroomId: string, days: number): ClassroomSummaryReport {
  const hash = classroomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const totalLearners = 18 + (hash % 8);
  const baselineCompleted = Math.floor(totalLearners * 0.7);
  const baselineInProgress = Math.floor(totalLearners * 0.2);

  return {
    classroomId,
    classroomName: "Ms. Johnson's Class",
    tenantId: 'demo-tenant',
    generatedAt: new Date().toISOString(),
    reportPeriodDays: days,
    baseline: {
      totalLearners,
      baselineCompleted,
      baselineInProgress,
      baselineNotStarted: totalLearners - baselineCompleted - baselineInProgress,
      completionRate: Math.round((baselineCompleted / totalLearners) * 100),
    },
    goals: {
      totalGoals: totalLearners * 2 + (hash % 10),
      statusDistribution: {
        active: Math.floor(totalLearners * 1.5),
        completed: Math.floor(totalLearners * 0.3),
        onHold: 2,
        draft: 3,
      },
      avgGoalsPerLearner: 2.1 + (hash % 5) / 10,
    },
    homework: {
      learnersWithHomework: Math.floor(totalLearners * 0.85),
      avgSessionsPerWeekPerLearner: 2.8 + (hash % 3) / 10,
      independenceDistribution: {
        needsSupport: 4,
        buildingIndependence: Math.floor(totalLearners * 0.5),
        mostlyIndependent: Math.floor(totalLearners * 0.3),
      },
    },
    focus: {
      totalSessions: totalLearners * 12 + hash,
      avgBreaksPerSession: 1.2 + (hash % 10) / 10,
      focusLossPercentage: 8 + (hash % 7),
      peakHours: [9, 10, 14],
    },
    learners: Array.from({ length: totalLearners }, (_, i) => ({
      learnerId: `learner-${i + 1}`,
      learnerName: `Student ${i + 1}`,
      baselineStatus:
        i < baselineCompleted
          ? 'Completed'
          : i < baselineCompleted + baselineInProgress
            ? 'In Progress'
            : 'Not Started',
      activeGoalsCount: 1 + (i % 3),
      homeworkSessionsThisWeek: Math.round((1 + (i % 4)) * 10) / 10,
      independenceLabel:
        i % 5 === 0
          ? 'needs_support'
          : i % 3 === 0
            ? 'mostly_independent'
            : 'building_independence',
    })),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export function getIndependenceLabelText(label: string): string {
  switch (label) {
    case 'needs_support':
      return 'Needs Support';
    case 'building_independence':
      return 'Building Independence';
    case 'mostly_independent':
      return 'Mostly Independent';
    default:
      return 'N/A';
  }
}

export function getIndependenceLabelColor(label: string): string {
  switch (label) {
    case 'needs_support':
      return 'bg-orange-100 text-orange-800';
    case 'building_independence':
      return 'bg-blue-100 text-blue-800';
    case 'mostly_independent':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getBaselineStatusColor(status: string): string {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'In Progress':
      return 'bg-blue-100 text-blue-800';
    case 'Not Started':
    default:
      return 'bg-gray-100 text-gray-600';
  }
}
