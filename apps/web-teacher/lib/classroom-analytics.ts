/**
 * Classroom Analytics API Client
 * Types and fetch functions for teacher analytics dashboard.
 */

const ANALYTICS_BASE_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:4030';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_ANALYTICS_MOCK === 'true';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type RiskFlag = 'LOW_ENGAGEMENT' | 'STRUGGLING' | 'AT_RISK_OVERLOAD';

export interface MasteryBucket {
  range: string;
  minScore: number;
  maxScore: number;
  count: number;
  percentage: number;
}

export interface SubjectProgress {
  subjectCode: string;
  subjectName: string;
  avgMastery: number;
  masteryDistribution: MasteryBucket[];
  learnersWithData: number;
}

export interface ClassroomEngagement {
  activeLearnersCount: number;
  inactiveLearnersCount: number;
  totalLearnersCount: number;
  avgSessionsPerLearner: number;
  totalSessions: number;
  totalMinutes: number;
  sessionsPerDay: { date: string; count: number }[];
}

export interface ClassroomLearningProgress {
  bySubject: SubjectProgress[];
  overallAvgMastery: number;
}

export interface ClassroomHomework {
  learnersUsingHomework: number;
  totalLearners: number;
  usagePercentage: number;
  avgSessionsPerUser: number;
}

export interface ClassroomFocus {
  avgBreaksPerSession: number;
  totalSessions: number;
  sessionsWithBreaks: number;
  breakRatePercentage: number;
}

export interface ClassroomOverviewResponse {
  classroomId: string;
  classroomName: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  engagement: ClassroomEngagement;
  learningProgress: ClassroomLearningProgress;
  homework: ClassroomHomework;
  focus: ClassroomFocus;
}

export interface LearnerListItem {
  learnerId: string;
  learnerName: string;
  grade: string;
  sessionsCount: number;
  totalMinutes: number;
  avgMasteryScore: number;
  focusBreaksPerSession: number;
  lastActiveDate: string | null;
  riskFlags: RiskFlag[];
}

export interface ClassroomLearnerListResponse {
  classroomId: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  learners: LearnerListItem[];
  totalCount: number;
  flagCounts: {
    lowEngagement: number;
    struggling: number;
    atRiskOverload: number;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

// Helper to safely format date string
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

function mockClassroomOverview(classroomId: string): ClassroomOverviewResponse {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 28);

  return {
    classroomId,
    classroomName: 'Math 101 - Period 3',
    period: { from: formatDateString(from), to: formatDateString(now) },
    dataFreshAsOf: now.toISOString(),
    engagement: {
      activeLearnersCount: 22,
      inactiveLearnersCount: 3,
      totalLearnersCount: 25,
      avgSessionsPerLearner: 12.4,
      totalSessions: 310,
      totalMinutes: 4650,
      sessionsPerDay: [
        { date: '2024-12-02', count: 18 },
        { date: '2024-12-03', count: 22 },
        { date: '2024-12-04', count: 15 },
        { date: '2024-12-05', count: 24 },
        { date: '2024-12-06', count: 20 },
        { date: '2024-12-09', count: 19 },
      ],
    },
    learningProgress: {
      bySubject: [
        {
          subjectCode: 'MATH',
          subjectName: 'Mathematics',
          avgMastery: 0.68,
          masteryDistribution: [
            { range: '0-20%', minScore: 0, maxScore: 0.2, count: 1, percentage: 4 },
            { range: '20-40%', minScore: 0.2, maxScore: 0.4, count: 3, percentage: 12 },
            { range: '40-60%', minScore: 0.4, maxScore: 0.6, count: 6, percentage: 24 },
            { range: '60-80%', minScore: 0.6, maxScore: 0.8, count: 10, percentage: 40 },
            { range: '80-100%', minScore: 0.8, maxScore: 1.0, count: 5, percentage: 20 },
          ],
          learnersWithData: 25,
        },
        {
          subjectCode: 'ELA',
          subjectName: 'English Language Arts',
          avgMastery: 0.72,
          masteryDistribution: [
            { range: '0-20%', minScore: 0, maxScore: 0.2, count: 0, percentage: 0 },
            { range: '20-40%', minScore: 0.2, maxScore: 0.4, count: 2, percentage: 8 },
            { range: '40-60%', minScore: 0.4, maxScore: 0.6, count: 5, percentage: 20 },
            { range: '60-80%', minScore: 0.6, maxScore: 0.8, count: 12, percentage: 48 },
            { range: '80-100%', minScore: 0.8, maxScore: 1.0, count: 6, percentage: 24 },
          ],
          learnersWithData: 25,
        },
      ],
      overallAvgMastery: 0.7,
    },
    homework: {
      learnersUsingHomework: 18,
      totalLearners: 25,
      usagePercentage: 72,
      avgSessionsPerUser: 4.2,
    },
    focus: {
      avgBreaksPerSession: 1.3,
      totalSessions: 310,
      sessionsWithBreaks: 186,
      breakRatePercentage: 60,
    },
  };
}

function mockLearnerList(classroomId: string): ClassroomLearnerListResponse {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 28);

  return {
    classroomId,
    period: { from: formatDateString(from), to: formatDateString(now) },
    dataFreshAsOf: now.toISOString(),
    learners: [
      {
        learnerId: 'learner-1',
        learnerName: 'Alex Johnson',
        grade: '5',
        sessionsCount: 2,
        totalMinutes: 30,
        avgMasteryScore: 0.35,
        focusBreaksPerSession: 4.5,
        lastActiveDate: '2024-12-01',
        riskFlags: ['LOW_ENGAGEMENT', 'STRUGGLING', 'AT_RISK_OVERLOAD'],
      },
      {
        learnerId: 'learner-2',
        learnerName: 'Bailey Smith',
        grade: '5',
        sessionsCount: 3,
        totalMinutes: 45,
        avgMasteryScore: 0.38,
        focusBreaksPerSession: 2.1,
        lastActiveDate: '2024-12-05',
        riskFlags: ['LOW_ENGAGEMENT', 'STRUGGLING'],
      },
      {
        learnerId: 'learner-3',
        learnerName: 'Casey Williams',
        grade: '5',
        sessionsCount: 15,
        totalMinutes: 225,
        avgMasteryScore: 0.82,
        focusBreaksPerSession: 0.8,
        lastActiveDate: '2024-12-09',
        riskFlags: [],
      },
      {
        learnerId: 'learner-4',
        learnerName: 'Drew Martinez',
        grade: '5',
        sessionsCount: 12,
        totalMinutes: 180,
        avgMasteryScore: 0.65,
        focusBreaksPerSession: 3.5,
        lastActiveDate: '2024-12-08',
        riskFlags: ['AT_RISK_OVERLOAD'],
      },
      {
        learnerId: 'learner-5',
        learnerName: 'Emery Brown',
        grade: '5',
        sessionsCount: 18,
        totalMinutes: 270,
        avgMasteryScore: 0.91,
        focusBreaksPerSession: 0.4,
        lastActiveDate: '2024-12-09',
        riskFlags: [],
      },
    ],
    totalCount: 25,
    flagCounts: {
      lowEngagement: 5,
      struggling: 3,
      atRiskOverload: 4,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchClassroomOverview(
  classroomId: string,
  accessToken: string,
  options?: { from?: string; to?: string }
): Promise<ClassroomOverviewResponse> {
  if (USE_MOCK) {
    return mockClassroomOverview(classroomId);
  }

  const params = new URLSearchParams();
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);

  const url = `${ANALYTICS_BASE_URL}/analytics/classrooms/${classroomId}/overview?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch classroom overview: ${res.status}`);
  }

  return res.json() as Promise<ClassroomOverviewResponse>;
}

export async function fetchClassroomLearnerList(
  classroomId: string,
  accessToken: string,
  options?: { from?: string; to?: string }
): Promise<ClassroomLearnerListResponse> {
  if (USE_MOCK) {
    return mockLearnerList(classroomId);
  }

  const params = new URLSearchParams();
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);

  const url = `${ANALYTICS_BASE_URL}/analytics/classrooms/${classroomId}/learner-list?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch learner list: ${res.status}`);
  }

  return res.json() as Promise<ClassroomLearnerListResponse>;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export function getRiskFlagLabel(flag: RiskFlag): string {
  switch (flag) {
    case 'LOW_ENGAGEMENT':
      return 'Low Engagement';
    case 'STRUGGLING':
      return 'Needs Support';
    case 'AT_RISK_OVERLOAD':
      return 'Focus Challenges';
  }
}

export function getRiskFlagColor(flag: RiskFlag): 'warning' | 'error' | 'info' {
  switch (flag) {
    case 'LOW_ENGAGEMENT':
      return 'warning';
    case 'STRUGGLING':
      return 'error';
    case 'AT_RISK_OVERLOAD':
      return 'info';
  }
}

export function getMasteryLabel(distribution: MasteryBucket[]): string {
  // Find the bucket with the most learners
  const maxBucket = distribution.reduce((max, bucket) => (bucket.count > max.count ? bucket : max));

  if (maxBucket.percentage >= 40) {
    return `Most learners are in the ${maxBucket.range} mastery range.`;
  }

  // Find top 2 buckets
  const sorted = [...distribution].sort((a, b) => b.count - a.count);
  if (sorted[0].count > 0 && sorted[1]?.count > 0) {
    return `Learners are spread between ${sorted[0].range} and ${sorted[1].range} mastery.`;
  }

  return 'Not enough data to summarize mastery distribution.';
}
