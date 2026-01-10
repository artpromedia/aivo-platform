/**
 * Mock Data for Parent Dashboard
 *
 * PRODUCTION GUARD: This data is ONLY used in development mode.
 * The isDevMode() check ensures mock data never leaks to production.
 */

/**
 * Strict development mode check
 * Returns true ONLY if NODE_ENV is exactly 'development'
 */
export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Fail-safe guard that throws in production
 * Use this when accessing mock data to ensure no leakage
 */
export function assertDevMode(context: string): void {
  if (!isDevMode()) {
    throw new Error(
      `SECURITY: Attempted to access mock data in production. Context: ${context}. ` +
        'This is a critical error that must be fixed.'
    );
  }
}

// Types for mock data
export interface MockChild {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  grade: string;
  avatar?: string;
}

export interface MockParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  students: MockChild[];
}

export interface MockStudentSummary {
  id: string;
  name: string;
  weeklyTimeSpent: number;
  timeTrend: 'up' | 'down' | 'stable';
  activeDays: number;
  averageScore: number;
  scoreTrend: 'up' | 'down' | 'stable';
  activitiesCompleted: number;
  currentStreak: number;
  longestStreak: number;
  weeklyActivity: boolean[];
  lastActiveDate: string;
  subjectProgress: MockSubjectProgress[];
  recentActivity: MockActivity[];
  upcomingAssignments: MockAssignment[];
  teacherNotes: MockTeacherNote[];
  achievements: MockAchievement[];
  dailyUsage: MockDailyUsage;
  weeklyUsageHistory: MockDailyUsageEntry[];
}

export interface MockSubjectProgress {
  subject: string;
  average: number;
  timeSpent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MockActivity {
  id: string;
  type: 'lesson' | 'quiz' | 'assignment' | 'achievement';
  title: string;
  subject: string;
  score?: number;
  completedAt: string;
}

export interface MockAssignment {
  id: string;
  title: string;
  subject: string;
  dueIn: number;
}

export interface MockTeacherNote {
  id: string;
  teacherName: string;
  teacherAvatar?: string;
  content: string;
  createdAt: string;
  type: 'positive' | 'concern' | 'info';
}

export interface MockAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'learning' | 'streak' | 'mastery' | 'engagement' | 'special';
  earnedAt?: string;
  progress?: number;
  total?: number;
}

export interface MockDailyUsageEntry {
  date: string;
  totalMinutes: number;
  learningMinutes: number;
  practiceMinutes: number;
  gameMinutes: number;
  sessionsCompleted: number;
}

export interface MockDailyUsage extends MockDailyUsageEntry {}

export interface MockWeeklySummary {
  highlights: string[];
  lessonsCompleted: { title: string; subject: string; score: number }[];
  achievements: { name: string; description: string }[];
}

export interface MockHomeworkSession {
  id: string;
  subject: string;
  title: string;
  startedAt: string;
  completedAt?: string;
  progress: number;
  stepsCompleted: number;
  totalSteps: number;
}

export interface MockMessage {
  id: string;
  teacherName: string;
  teacherAvatar?: string;
  subject: string;
  preview: string;
  unread: boolean;
  timestamp: string;
}

export interface MockDifficultyRecommendation {
  id: string;
  domain: string;
  currentLevel: number;
  recommendedLevel: number;
  reasonTitle: string;
  reasonDescription: string;
  expiresAt: string;
}

/**
 * Get mock parent profile
 */
export function getMockParentProfile(): MockParentProfile {
  assertDevMode('getMockParentProfile');

  return {
    id: 'parent-mock-001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@example.com',
    students: [
      {
        id: 'student-mock-001',
        name: 'Emma Johnson',
        firstName: 'Emma',
        lastName: 'Johnson',
        grade: '4',
        avatar: undefined,
      },
      {
        id: 'student-mock-002',
        name: 'Noah Johnson',
        firstName: 'Noah',
        lastName: 'Johnson',
        grade: '2',
        avatar: undefined,
      },
    ],
  };
}

/**
 * Get mock student summary
 */
export function getMockStudentSummary(studentId: string): MockStudentSummary {
  assertDevMode('getMockStudentSummary');

  const isEmma = studentId === 'student-mock-001';
  const today = new Date();

  const baseData: MockStudentSummary = {
    id: studentId,
    name: isEmma ? 'Emma Johnson' : 'Noah Johnson',
    weeklyTimeSpent: isEmma ? 185 : 120,
    timeTrend: isEmma ? 'up' : 'stable',
    activeDays: isEmma ? 6 : 4,
    averageScore: isEmma ? 87 : 78,
    scoreTrend: isEmma ? 'up' : 'up',
    activitiesCompleted: isEmma ? 24 : 16,
    currentStreak: isEmma ? 12 : 3,
    longestStreak: isEmma ? 14 : 7,
    weeklyActivity: isEmma
      ? [true, true, true, false, true, true, true]
      : [true, false, true, false, true, false, true],
    lastActiveDate: today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    subjectProgress: [
      { subject: 'Math', average: isEmma ? 92 : 75, timeSpent: 45, trend: 'up' },
      { subject: 'Reading', average: isEmma ? 88 : 82, timeSpent: 38, trend: 'up' },
      { subject: 'Science', average: isEmma ? 85 : 70, timeSpent: 32, trend: 'stable' },
      { subject: 'Social Studies', average: isEmma ? 78 : 68, timeSpent: 28, trend: 'down' },
      { subject: 'Writing', average: isEmma ? 90 : 72, timeSpent: 25, trend: 'up' },
    ],
    recentActivity: [
      {
        id: 'act-1',
        type: 'lesson',
        title: 'Fractions: Adding & Subtracting',
        subject: 'Math',
        score: isEmma ? 95 : 80,
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-2',
        type: 'quiz',
        title: 'Chapter 5 Reading Comprehension',
        subject: 'Reading',
        score: isEmma ? 88 : 75,
        completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-3',
        type: 'achievement',
        title: isEmma ? 'Math Master Badge' : 'Reading Star Badge',
        subject: isEmma ? 'Math' : 'Reading',
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-4',
        type: 'lesson',
        title: 'Plant Life Cycles',
        subject: 'Science',
        score: isEmma ? 90 : 72,
        completedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'act-5',
        type: 'assignment',
        title: 'Weekly Writing Journal',
        subject: 'Writing',
        score: isEmma ? 92 : 78,
        completedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
    ],
    upcomingAssignments: [
      {
        id: 'assign-1',
        title: 'Multiplication Practice Set',
        subject: 'Math',
        dueIn: 1,
      },
      {
        id: 'assign-2',
        title: 'Book Report: Charlotte\'s Web',
        subject: 'Reading',
        dueIn: 3,
      },
      {
        id: 'assign-3',
        title: 'Science Project Proposal',
        subject: 'Science',
        dueIn: 5,
      },
    ],
    teacherNotes: [
      {
        id: 'note-1',
        teacherName: 'Mrs. Anderson',
        content: isEmma
          ? 'Emma has been showing excellent progress in math! She helped other students understand fractions today.'
          : 'Noah is making steady progress. He\'s been more engaged in reading activities this week.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'positive',
      },
      {
        id: 'note-2',
        teacherName: 'Mr. Chen',
        content: isEmma
          ? 'Great participation in science discussions. Emma asks thoughtful questions!'
          : 'Noah completed his science experiment with enthusiasm. Keep encouraging him!',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'info',
      },
    ],
    achievements: [
      {
        id: 'ach-1',
        title: 'Math Whiz',
        description: 'Score 90%+ on 10 math lessons',
        icon: 'brain',
        category: 'mastery',
        earnedAt: isEmma ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        progress: isEmma ? 10 : 6,
        total: 10,
      },
      {
        id: 'ach-2',
        title: 'Bookworm',
        description: 'Complete 20 reading activities',
        icon: 'book',
        category: 'learning',
        earnedAt: isEmma ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        progress: isEmma ? 20 : 12,
        total: 20,
      },
      {
        id: 'ach-3',
        title: 'Week Warrior',
        description: 'Learn for 7 days in a row',
        icon: 'zap',
        category: 'streak',
        earnedAt: isEmma ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        progress: isEmma ? 7 : 3,
        total: 7,
      },
      {
        id: 'ach-4',
        title: 'Science Explorer',
        description: 'Complete all science modules for the month',
        icon: 'target',
        category: 'learning',
        earnedAt: undefined,
        progress: isEmma ? 8 : 4,
        total: 12,
      },
      {
        id: 'ach-5',
        title: 'Helper Hero',
        description: 'Help 5 classmates with questions',
        icon: 'heart',
        category: 'engagement',
        earnedAt: isEmma ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        progress: isEmma ? 5 : 2,
        total: 5,
      },
      {
        id: 'ach-6',
        title: 'Perfect Score',
        description: 'Get 100% on any quiz',
        icon: 'star',
        category: 'mastery',
        earnedAt: isEmma ? new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        progress: isEmma ? 1 : 0,
        total: 1,
      },
    ],
    dailyUsage: {
      date: today.toISOString().split('T')[0],
      totalMinutes: isEmma ? 42 : 25,
      learningMinutes: isEmma ? 25 : 15,
      practiceMinutes: isEmma ? 12 : 8,
      gameMinutes: isEmma ? 5 : 2,
      sessionsCompleted: isEmma ? 4 : 2,
    },
    weeklyUsageHistory: generateWeeklyUsage(isEmma),
  };

  return baseData;
}

/**
 * Generate weekly usage history
 */
function generateWeeklyUsage(isHighPerformer: boolean): MockDailyUsageEntry[] {
  const result: MockDailyUsageEntry[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const base = isHighPerformer ? 35 : 20;
    const variance = Math.floor(Math.random() * 20) - 10;
    const total = Math.max(10, base + variance);

    result.push({
      date: date.toISOString().split('T')[0],
      totalMinutes: total,
      learningMinutes: Math.floor(total * 0.6),
      practiceMinutes: Math.floor(total * 0.3),
      gameMinutes: Math.floor(total * 0.1),
      sessionsCompleted: Math.floor(total / 15),
    });
  }

  return result;
}

/**
 * Get mock weekly summary
 */
export function getMockWeeklySummary(studentId: string): MockWeeklySummary {
  assertDevMode('getMockWeeklySummary');

  const isEmma = studentId === 'student-mock-001';

  return {
    highlights: isEmma
      ? [
          'Completed 24 activities this week!',
          'Scored 95% on the fractions quiz',
          'Maintained a 12-day learning streak',
          'Earned the Math Whiz badge',
        ]
      : [
          'Completed 16 activities this week!',
          'Improved reading score by 8%',
          'Started a new science unit',
        ],
    lessonsCompleted: [
      { title: 'Fractions: Adding & Subtracting', subject: 'Math', score: isEmma ? 95 : 80 },
      { title: 'Reading Comprehension', subject: 'Reading', score: isEmma ? 88 : 75 },
      { title: 'Plant Life Cycles', subject: 'Science', score: isEmma ? 90 : 72 },
    ],
    achievements: isEmma
      ? [
          { name: 'Math Whiz', description: 'Score 90%+ on 10 math lessons' },
          { name: 'Perfect Score', description: 'Get 100% on any quiz' },
        ]
      : [],
  };
}

/**
 * Get mock homework sessions
 */
export function getMockHomeworkSessions(studentId: string): MockHomeworkSession[] {
  assertDevMode('getMockHomeworkSessions');

  const isEmma = studentId === 'student-mock-001';

  return [
    {
      id: 'hw-1',
      subject: 'Math',
      title: 'Long Division Practice',
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      progress: 100,
      stepsCompleted: 5,
      totalSteps: 5,
    },
    {
      id: 'hw-2',
      subject: 'Reading',
      title: 'Chapter Summary Writing',
      startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      completedAt: undefined,
      progress: isEmma ? 60 : 40,
      stepsCompleted: isEmma ? 3 : 2,
      totalSteps: 5,
    },
    {
      id: 'hw-3',
      subject: 'Science',
      title: 'Experiment Report',
      startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
      progress: 100,
      stepsCompleted: 4,
      totalSteps: 4,
    },
  ];
}

/**
 * Get mock messages
 */
export function getMockMessages(): MockMessage[] {
  assertDevMode('getMockMessages');

  return [
    {
      id: 'msg-1',
      teacherName: 'Mrs. Anderson',
      subject: 'Great progress this week!',
      preview: 'I wanted to share some positive feedback about Emma\'s work in class...',
      unread: true,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-2',
      teacherName: 'Mr. Chen',
      subject: 'Science Fair Project',
      preview: 'Just a reminder that the science fair project proposals are due next week...',
      unread: false,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-3',
      teacherName: 'Mrs. Anderson',
      subject: 'Parent-Teacher Conference',
      preview: 'I\'d like to schedule a brief conference to discuss progress...',
      unread: false,
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

/**
 * Get mock difficulty recommendations
 */
export function getMockDifficultyRecommendations(studentId: string): MockDifficultyRecommendation[] {
  assertDevMode('getMockDifficultyRecommendations');

  const isEmma = studentId === 'student-mock-001';

  if (!isEmma) {
    return [];
  }

  return [
    {
      id: 'rec-1',
      domain: 'Math - Fractions',
      currentLevel: 3,
      recommendedLevel: 4,
      reasonTitle: 'Ready for more challenge',
      reasonDescription: 'Emma has consistently scored above 90% on fraction problems. Increasing difficulty will help her continue growing.',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}
