/**
 * Mock Data for Parent Dashboard
 *
 * @deprecated This file is deprecated as of Sprint 1.6.
 * Use the new API layer instead:
 * - API Client: @/lib/api/client.ts
 * - Parent API: @/lib/api/parent.api.ts
 * - React Query Hooks: @/hooks/use-parent-data.ts
 *
 * For isDevMode(), use: import { isDevMode } from '@/lib/api';
 *
 * This file will be removed in a future sprint once all
 * pages have been migrated to the new API layer.
 *
 * PRODUCTION GUARD: This data is ONLY used in development mode.
 * The isDevMode() check ensures mock data never leaks to production.
 */

/**
 * Strict development mode check
 * Returns true ONLY if NODE_ENV is exactly 'development'
 * @deprecated Use isDevMode from '@/lib/api' instead
 */
export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Fail-safe guard that throws in production
 * Use this when accessing mock data to ensure no leakage
 */
export function assertDevMode(context: string): void {
  if (process.env.NODE_ENV !== 'development') {
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

export type MockDailyUsage = MockDailyUsageEntry;

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
      day: 'numeric',
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
        title: "Book Report: Charlotte's Web",
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
          : "Noah is making steady progress. He's been more engaged in reading activities this week.",
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
        earnedAt: isEmma
          ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
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
      preview: "I wanted to share some positive feedback about Emma's work in class...",
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
      preview: "I'd like to schedule a brief conference to discuss progress...",
      unread: false,
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

/**
 * Get mock difficulty recommendations
 */
export function getMockDifficultyRecommendations(
  studentId: string
): MockDifficultyRecommendation[] {
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
      reasonDescription:
        'Emma has consistently scored above 90% on fraction problems. Increasing difficulty will help her continue growing.',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

// ============================================================================
// Sprint 5: New Mock Data Types & Functions
// ============================================================================

export interface MockAIInsight {
  id: string;
  type: 'strength' | 'improvement' | 'concern' | 'celebration';
  title: string;
  description: string;
  actionable?: string;
  actionPath?: string;
  priority: 'high' | 'medium' | 'low';
  subject?: string;
  confidence: number;
  generatedAt: string;
}

export interface MockTimelineActivity {
  id: string;
  type:
    | 'lesson_started'
    | 'lesson_completed'
    | 'quiz_completed'
    | 'achievement_earned'
    | 'milestone_reached'
    | 'game_played'
    | 'practice_session'
    | 'assessment_completed';
  title: string;
  description: string;
  subject?: string;
  subjectColor?: string;
  score?: number;
  duration?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface MockMilestone {
  id: string;
  type:
    | 'lesson_count'
    | 'streak'
    | 'subject_mastery'
    | 'achievement'
    | 'level_up'
    | 'time_goal'
    | 'perfect_score'
    | 'completion';
  title: string;
  description: string;
  progress: number;
  target: number;
  current: number;
  subject?: string;
  reward?: {
    type: 'badge' | 'points' | 'avatar' | 'theme';
    value: string;
    points?: number;
  };
  estimatedCompletion?: string;
  isPriority?: boolean;
}

export interface MockWeeklyReportData {
  weekStart: string;
  weekEnd: string;
  summary: {
    totalMinutes: number;
    previousWeekMinutes: number;
    lessonsCompleted: number;
    previousWeekLessons: number;
    averageScore: number;
    previousWeekScore: number;
    activeDays: number;
    previousWeekActiveDays: number;
  };
  highlights: {
    type: 'achievement' | 'improvement' | 'concern' | 'milestone';
    text: string;
  }[];
  subjectBreakdown: {
    subject: string;
    minutes: number;
    lessons: number;
    averageScore: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  dailyActivity: {
    day: string;
    minutes: number;
    lessons: number;
  }[];
  recommendations: string[];
}

export interface MockChildData {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  gradeLevel: string;
  avatar?: string;
  subjects: string[];
  lastActive: string;
  currentStreak?: number;
  todayProgress?: {
    minutesLearned: number;
    lessonsCompleted: number;
  };
  status?: 'online' | 'offline' | 'learning';
}

/**
 * Get mock AI insights for a student
 */
export function getMockAIInsights(studentId: string): MockAIInsight[] {
  assertDevMode('getMockAIInsights');

  const isEmma = studentId === 'student-mock-001';
  const now = new Date().toISOString();

  if (isEmma) {
    return [
      {
        id: 'insight-1',
        type: 'strength',
        title: 'Math Problem-Solving Excellence',
        description:
          'Emma demonstrates strong analytical thinking in math. She consistently breaks down complex problems into smaller steps and shows above-average performance on multi-step word problems.',
        actionable: 'Consider introducing more challenging math enrichment activities',
        actionPath: '/curriculum/math/advanced',
        priority: 'medium',
        subject: 'Math',
        confidence: 0.92,
        generatedAt: now,
      },
      {
        id: 'insight-2',
        type: 'celebration',
        title: '12-Day Learning Streak!',
        description:
          'Emma has maintained consistent daily learning for 12 days in a row. This dedication is building strong study habits that will benefit her long-term academic success.',
        priority: 'low',
        confidence: 1.0,
        generatedAt: now,
      },
      {
        id: 'insight-3',
        type: 'improvement',
        title: 'Social Studies Engagement Opportunity',
        description:
          "Emma's engagement with Social Studies content is lower than other subjects. She spends less time on these lessons and occasionally skips optional activities.",
        actionable: 'Explore interactive history games to boost engagement',
        actionPath: '/games?subject=social-studies',
        priority: 'medium',
        subject: 'Social Studies',
        confidence: 0.78,
        generatedAt: now,
      },
      {
        id: 'insight-4',
        type: 'strength',
        title: 'Reading Comprehension Above Grade Level',
        description:
          "Emma's reading comprehension scores indicate she's performing 1-2 grade levels above her peers. She excels at inferencing and identifying main ideas.",
        priority: 'low',
        subject: 'Reading',
        confidence: 0.88,
        generatedAt: now,
      },
    ];
  }

  return [
    {
      id: 'insight-1',
      type: 'improvement',
      title: 'Building Math Confidence',
      description:
        'Noah sometimes hesitates on math problems even when he knows the answer. Building his confidence through positive reinforcement could help him perform better.',
      actionable: 'Try the confidence-building math games',
      actionPath: '/games?subject=math&type=confidence',
      priority: 'high',
      subject: 'Math',
      confidence: 0.85,
      generatedAt: now,
    },
    {
      id: 'insight-2',
      type: 'strength',
      title: 'Strong Visual Learning',
      description:
        'Noah learns best through visual content. He shows 30% better retention when lessons include diagrams, videos, and interactive visuals.',
      priority: 'medium',
      confidence: 0.91,
      generatedAt: now,
    },
    {
      id: 'insight-3',
      type: 'concern',
      title: 'Attention Span During Long Sessions',
      description:
        "Noah's performance drops significantly in sessions longer than 15 minutes. Shorter, more frequent learning sessions may be more effective.",
      actionable: 'Adjust session length in learning settings',
      actionPath: '/settings?tab=learning',
      priority: 'high',
      confidence: 0.82,
      generatedAt: now,
    },
  ];
}

/**
 * Get mock activity timeline for a student
 */
export function getMockActivityTimeline(studentId: string): MockTimelineActivity[] {
  assertDevMode('getMockActivityTimeline');

  const isEmma = studentId === 'student-mock-001';
  const now = Date.now();

  return [
    {
      id: 'timeline-1',
      type: 'lesson_completed',
      title: 'Completed: Fractions - Adding & Subtracting',
      description: 'Finished the lesson with excellent understanding',
      subject: 'Math',
      score: isEmma ? 95 : 78,
      duration: 22,
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'timeline-2',
      type: 'quiz_completed',
      title: 'Quiz: Chapter 5 Vocabulary',
      description: 'Completed vocabulary assessment',
      subject: 'Reading',
      score: isEmma ? 100 : 82,
      duration: 15,
      timestamp: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'timeline-3',
      type: 'achievement_earned',
      title: isEmma ? 'Earned: Math Master Badge' : 'Earned: Rising Star Badge',
      description: isEmma ? 'Scored 90%+ on 10 math lessons' : 'Improved score by 15%',
      timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'timeline-4',
      type: 'game_played',
      title: 'Math Quest Adventure',
      description: 'Practiced multiplication through gameplay',
      subject: 'Math',
      duration: 12,
      timestamp: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'timeline-5',
      type: 'lesson_completed',
      title: 'Completed: Plant Life Cycles',
      description: 'Learned about photosynthesis and growth',
      subject: 'Science',
      score: isEmma ? 88 : 75,
      duration: 18,
      timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'timeline-6',
      type: 'practice_session',
      title: 'Writing Practice',
      description: 'Worked on paragraph structure',
      subject: 'Writing',
      duration: 20,
      timestamp: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'timeline-7',
      type: 'lesson_started',
      title: 'Started: American Revolution',
      description: 'Beginning new history unit',
      subject: 'Social Studies',
      timestamp: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'timeline-8',
      type: 'milestone_reached',
      title: 'Milestone: 50 Lessons Completed!',
      description: 'Reached a major learning milestone',
      timestamp: new Date(now - 72 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

/**
 * Get mock milestones for a student
 */
export function getMockMilestones(studentId: string): MockMilestone[] {
  assertDevMode('getMockMilestones');

  const isEmma = studentId === 'student-mock-001';

  return [
    {
      id: 'milestone-1',
      type: 'lesson_count',
      title: '100 Lessons Complete',
      description: 'Complete 100 lessons to earn this milestone',
      progress: isEmma ? 87 : 52,
      target: 100,
      current: isEmma ? 87 : 52,
      reward: {
        type: 'badge',
        value: 'Century Scholar',
        points: 500,
      },
      estimatedCompletion: new Date(
        Date.now() + (isEmma ? 5 : 20) * 24 * 60 * 60 * 1000
      ).toISOString(),
      isPriority: isEmma,
    },
    {
      id: 'milestone-2',
      type: 'streak',
      title: '14-Day Streak',
      description: 'Learn for 14 consecutive days',
      progress: isEmma ? 85.7 : 21.4,
      target: 14,
      current: isEmma ? 12 : 3,
      reward: {
        type: 'badge',
        value: 'Dedicated Learner',
        points: 200,
      },
      isPriority: true,
    },
    {
      id: 'milestone-3',
      type: 'subject_mastery',
      title: 'Math Level 5 Mastery',
      description: 'Complete all Math Level 5 content with 80%+ average',
      progress: isEmma ? 75 : 40,
      target: 100,
      current: isEmma ? 75 : 40,
      subject: 'Math',
      reward: {
        type: 'badge',
        value: 'Math Champion',
        points: 300,
      },
    },
    {
      id: 'milestone-4',
      type: 'perfect_score',
      title: '5 Perfect Quizzes',
      description: 'Score 100% on 5 quizzes',
      progress: isEmma ? 60 : 20,
      target: 5,
      current: isEmma ? 3 : 1,
      reward: {
        type: 'avatar',
        value: 'Star Student Avatar',
      },
    },
    {
      id: 'milestone-5',
      type: 'time_goal',
      title: 'Learning Marathon',
      description: 'Accumulate 500 minutes of learning time',
      progress: isEmma ? 78 : 45,
      target: 500,
      current: isEmma ? 390 : 225,
      reward: {
        type: 'points',
        value: 'Bonus Points',
        points: 150,
      },
    },
  ];
}

/**
 * Get mock weekly report data
 */
export function getMockWeeklyReport(studentId: string): MockWeeklyReportData {
  assertDevMode('getMockWeeklyReport');

  const isEmma = studentId === 'student-mock-001';
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    summary: {
      totalMinutes: isEmma ? 185 : 120,
      previousWeekMinutes: isEmma ? 162 : 115,
      lessonsCompleted: isEmma ? 24 : 16,
      previousWeekLessons: isEmma ? 20 : 14,
      averageScore: isEmma ? 87 : 78,
      previousWeekScore: isEmma ? 84 : 75,
      activeDays: isEmma ? 6 : 4,
      previousWeekActiveDays: isEmma ? 5 : 5,
    },
    highlights: isEmma
      ? [
          { type: 'achievement', text: 'Earned the Math Whiz badge!' },
          { type: 'improvement', text: 'Reading comprehension improved by 8%' },
          { type: 'milestone', text: 'Reached 12-day learning streak' },
          { type: 'achievement', text: 'Scored 100% on vocabulary quiz' },
        ]
      : [
          { type: 'improvement', text: 'Math scores improved by 5%' },
          { type: 'milestone', text: 'Completed first Science unit' },
          { type: 'concern', text: 'Missed 3 days of learning this week' },
        ],
    subjectBreakdown: [
      {
        subject: 'Math',
        minutes: isEmma ? 55 : 35,
        lessons: isEmma ? 8 : 5,
        averageScore: isEmma ? 92 : 75,
        trend: 'up',
      },
      {
        subject: 'Reading',
        minutes: isEmma ? 45 : 30,
        lessons: isEmma ? 6 : 4,
        averageScore: isEmma ? 88 : 82,
        trend: 'up',
      },
      {
        subject: 'Science',
        minutes: isEmma ? 35 : 25,
        lessons: isEmma ? 4 : 3,
        averageScore: isEmma ? 85 : 70,
        trend: 'stable',
      },
      {
        subject: 'Writing',
        minutes: isEmma ? 30 : 18,
        lessons: isEmma ? 4 : 2,
        averageScore: isEmma ? 90 : 72,
        trend: 'up',
      },
      {
        subject: 'Social Studies',
        minutes: isEmma ? 20 : 12,
        lessons: isEmma ? 2 : 2,
        averageScore: isEmma ? 78 : 68,
        trend: 'down',
      },
    ],
    dailyActivity: [
      { day: 'Sunday', minutes: isEmma ? 15 : 0, lessons: isEmma ? 2 : 0 },
      { day: 'Monday', minutes: isEmma ? 35 : 25, lessons: isEmma ? 4 : 3 },
      { day: 'Tuesday', minutes: isEmma ? 28 : 30, lessons: isEmma ? 3 : 4 },
      { day: 'Wednesday', minutes: isEmma ? 32 : 0, lessons: isEmma ? 4 : 0 },
      { day: 'Thursday', minutes: isEmma ? 25 : 35, lessons: isEmma ? 4 : 5 },
      { day: 'Friday', minutes: isEmma ? 30 : 20, lessons: isEmma ? 4 : 2 },
      { day: 'Saturday', minutes: isEmma ? 20 : 10, lessons: isEmma ? 3 : 2 },
    ],
    recommendations: isEmma
      ? [
          'Continue challenging Emma with advanced Math content',
          'Encourage more Social Studies engagement through interactive activities',
          'Consider extending the streak goal to 21 days',
        ]
      : [
          'Set up daily reminders to help Noah maintain consistency',
          'Try shorter 10-minute sessions spread throughout the day',
          'Focus on building Math confidence before introducing harder concepts',
        ],
  };
}

/**
 * Get enhanced mock children data with status and progress
 */
export function getMockChildrenEnhanced(): MockChildData[] {
  assertDevMode('getMockChildrenEnhanced');

  const now = Date.now();

  return [
    {
      id: 'student-mock-001',
      name: 'Emma Johnson',
      firstName: 'Emma',
      lastName: 'Johnson',
      gradeLevel: '4',
      subjects: ['Math', 'Reading', 'Science', 'Writing', 'Social Studies'],
      lastActive: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      currentStreak: 12,
      todayProgress: {
        minutesLearned: 42,
        lessonsCompleted: 4,
      },
      status: 'online',
    },
    {
      id: 'student-mock-002',
      name: 'Noah Johnson',
      firstName: 'Noah',
      lastName: 'Johnson',
      gradeLevel: '2',
      subjects: ['Math', 'Reading', 'Science'],
      lastActive: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      currentStreak: 3,
      todayProgress: {
        minutesLearned: 25,
        lessonsCompleted: 2,
      },
      status: 'offline',
    },
  ];
}

// ============================================================================
// Sprint 7: Progress Reports Mock Data
// ============================================================================

export interface MockProgressReportData {
  progress: MockDetailedProgress;
  assessments: MockAssessmentHistoryData;
  analysis: MockStrengthWeaknessData;
  timeOnTask: MockTimeOnTaskData;
  mastery: MockSubjectMasteryData;
}

export interface MockDetailedProgress {
  overallScore: number;
  overallTrend: 'up' | 'down' | 'stable';
  lessonsCompleted: number;
  totalLessons: number;
  averageSessionTime: number;
  totalLearningTime: number;
  streak: {
    current: number;
    longest: number;
  };
  gradeLevel: {
    current: string;
    progress: number;
  };
  periods: {
    label: string;
    score: number;
    lessonsCompleted: number;
    timeSpent: number;
    startDate: string;
    endDate: string;
  }[];
}

export interface MockAssessmentHistoryData {
  assessments: MockAssessmentEntry[];
  summary: {
    totalAssessments: number;
    averageScore: number;
    passRate: number;
    improvementTrend: 'up' | 'down' | 'stable';
  };
}

export interface MockAssessmentEntry {
  id: string;
  title: string;
  subject: string;
  type: 'quiz' | 'test' | 'practice' | 'benchmark';
  score: number;
  maxScore: number;
  percentile?: number;
  completedAt: string;
  timeSpent: number;
  questionCount: number;
  correctAnswers: number;
  topics: string[];
  grade?: string;
}

export interface MockStrengthWeaknessData {
  strengths: MockSkillAnalysis[];
  weaknesses: MockSkillAnalysis[];
  recommendations: string[];
  learningStyle: {
    primary: string;
    secondary: string;
    description: string;
  };
  skillsProfile: MockSkillProfile[];
}

export interface MockSkillAnalysis {
  skill: string;
  subject: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  evidence: string[];
}

export interface MockSkillProfile {
  category: string;
  score: number;
  maxScore: number;
  subSkills: {
    name: string;
    score: number;
    maxScore: number;
  }[];
}

export interface MockTimeOnTaskData {
  totalMinutes: number;
  dailyAverage: number;
  weeklyAverage: number;
  mostProductiveTime: string;
  sessionStats: {
    averageLength: number;
    longestSession: number;
    sessionsThisWeek: number;
  };
  dailyBreakdown: {
    date: string;
    day: string;
    totalMinutes: number;
    learningMinutes: number;
    practiceMinutes: number;
    assessmentMinutes: number;
  }[];
  subjectBreakdown: {
    subject: string;
    totalMinutes: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  activityBreakdown: {
    activity: string;
    minutes: number;
    percentage: number;
    color: string;
  }[];
}

export interface MockSubjectMasteryData {
  subjects: MockSubjectMasteryEntry[];
  overallMasteryLevel: number;
  masteredSkills: number;
  inProgressSkills: number;
  totalSkills: number;
}

export interface MockSubjectMasteryEntry {
  subject: string;
  masteryLevel: number;
  grade: string;
  trend: 'up' | 'down' | 'stable';
  standards: {
    code: string;
    name: string;
    mastery: 'mastered' | 'proficient' | 'developing' | 'beginning';
    progress: number;
  }[];
  recentLessons: {
    title: string;
    score: number;
    completedAt: string;
  }[];
  nextMilestone: {
    name: string;
    progress: number;
    target: number;
  };
}

/**
 * Get mock progress report data
 */
export function getMockProgressReport(
  studentId: string,
  _dateRange?: { start: string; end: string }
): MockProgressReportData {
  assertDevMode('getMockProgressReport');

  const isEmma = studentId === 'student-mock-001';
  const now = new Date();

  // Generate period data for last 4 weeks
  const periods = [];
  for (let i = 3; i >= 0; i--) {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (i + 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    periods.push({
      label: `Week ${4 - i}`,
      score: isEmma ? 80 + Math.floor(Math.random() * 15) : 65 + Math.floor(Math.random() * 20),
      lessonsCompleted: isEmma
        ? 5 + Math.floor(Math.random() * 4)
        : 3 + Math.floor(Math.random() * 4),
      timeSpent: isEmma
        ? 120 + Math.floor(Math.random() * 60)
        : 80 + Math.floor(Math.random() * 40),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  }

  return {
    progress: {
      overallScore: isEmma ? 87 : 72,
      overallTrend: isEmma ? 'up' : 'stable',
      lessonsCompleted: isEmma ? 156 : 89,
      totalLessons: 200,
      averageSessionTime: isEmma ? 25 : 18,
      totalLearningTime: isEmma ? 3900 : 1800,
      streak: {
        current: isEmma ? 12 : 3,
        longest: isEmma ? 21 : 8,
      },
      gradeLevel: {
        current: isEmma ? 'Grade 4' : 'Grade 2',
        progress: isEmma ? 78 : 45,
      },
      periods,
    },
    assessments: {
      assessments: [
        {
          id: 'assess-1',
          title: 'Fractions Unit Test',
          subject: 'Math',
          type: 'test',
          score: isEmma ? 47 : 38,
          maxScore: 50,
          percentile: isEmma ? 92 : 65,
          completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          timeSpent: 35,
          questionCount: 25,
          correctAnswers: isEmma ? 23 : 18,
          topics: ['Adding Fractions', 'Subtracting Fractions', 'Mixed Numbers'],
          grade: isEmma ? 'A' : 'B-',
        },
        {
          id: 'assess-2',
          title: 'Reading Comprehension Quiz',
          subject: 'Reading',
          type: 'quiz',
          score: isEmma ? 18 : 15,
          maxScore: 20,
          completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          timeSpent: 20,
          questionCount: 10,
          correctAnswers: isEmma ? 9 : 7,
          topics: ['Main Idea', 'Supporting Details', 'Inference'],
        },
        {
          id: 'assess-3',
          title: 'Science Practice: Plant Life',
          subject: 'Science',
          type: 'practice',
          score: isEmma ? 42 : 35,
          maxScore: 50,
          completedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          timeSpent: 25,
          questionCount: 20,
          correctAnswers: isEmma ? 17 : 14,
          topics: ['Photosynthesis', 'Plant Parts', 'Life Cycle'],
        },
        {
          id: 'assess-4',
          title: 'Benchmark: Math Quarterly',
          subject: 'Math',
          type: 'benchmark',
          score: isEmma ? 85 : 70,
          maxScore: 100,
          percentile: isEmma ? 88 : 58,
          completedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          timeSpent: 60,
          questionCount: 50,
          correctAnswers: isEmma ? 43 : 35,
          topics: ['Numbers', 'Operations', 'Geometry', 'Fractions'],
          grade: isEmma ? 'B+' : 'C+',
        },
      ],
      summary: {
        totalAssessments: 12,
        averageScore: isEmma ? 88 : 74,
        passRate: isEmma ? 100 : 83,
        improvementTrend: 'up',
      },
    },
    analysis: {
      strengths: [
        {
          skill: 'Problem Solving',
          subject: 'Math',
          score: isEmma ? 95 : 78,
          trend: 'up',
          description: isEmma
            ? 'Demonstrates excellent analytical thinking and breaks down complex problems effectively'
            : 'Shows good problem-solving skills with visual aids',
          evidence: isEmma
            ? [
                'Scored 95% on word problems',
                'Consistently completes challenge problems',
                'Helps peers with difficult concepts',
              ]
            : [
                'Completes problems when given visual support',
                'Shows improvement in multi-step problems',
              ],
        },
        {
          skill: 'Reading Comprehension',
          subject: 'Reading',
          score: isEmma ? 92 : 72,
          trend: 'up',
          description: isEmma
            ? 'Reads above grade level with strong inference skills'
            : 'Making steady progress in understanding main ideas',
          evidence: isEmma
            ? ['Reading at 6th grade level', 'Excellent inference scores', 'Strong vocabulary']
            : ['Improved main idea identification', 'Enjoys reading activities'],
        },
      ],
      weaknesses: isEmma
        ? [
            {
              skill: 'Social Studies Engagement',
              subject: 'Social Studies',
              score: 68,
              trend: 'stable',
              description: 'Shows less interest and engagement in social studies content',
              evidence: [
                'Lower time spent on lessons',
                'Skips optional activities',
                'Requests to switch subjects',
              ],
            },
          ]
        : [
            {
              skill: 'Sustained Attention',
              subject: 'General',
              score: 55,
              trend: 'down',
              description: 'Struggles with longer lessons and assessments',
              evidence: [
                'Performance drops after 15 minutes',
                'Frequently pauses sessions',
                'Better scores on shorter quizzes',
              ],
            },
            {
              skill: 'Written Expression',
              subject: 'Writing',
              score: 60,
              trend: 'stable',
              description: 'Needs support with organizing written responses',
              evidence: [
                'Inconsistent paragraph structure',
                'Difficulty with transitions',
                'Strong ideas but weak organization',
              ],
            },
          ],
      recommendations: isEmma
        ? [
            'Introduce more challenging math enrichment activities',
            'Explore interactive history games to boost Social Studies engagement',
            'Consider joining the advanced reading group',
          ]
        : [
            'Break lessons into 10-15 minute segments',
            'Use graphic organizers for writing tasks',
            'Incorporate more visual and hands-on learning activities',
            'Celebrate small wins to build confidence',
          ],
      learningStyle: {
        primary: isEmma ? 'Logical-Mathematical' : 'Visual-Spatial',
        secondary: isEmma ? 'Linguistic' : 'Kinesthetic',
        description: isEmma
          ? 'Emma learns best through logical reasoning and pattern recognition. She excels when able to analyze information systematically and enjoys challenging problems.'
          : 'Noah learns best through visual content and hands-on activities. He benefits from diagrams, videos, and interactive exercises.',
      },
      skillsProfile: [
        {
          category: 'Critical Thinking',
          score: isEmma ? 90 : 70,
          maxScore: 100,
          subSkills: [
            { name: 'Analysis', score: isEmma ? 92 : 68, maxScore: 100 },
            { name: 'Evaluation', score: isEmma ? 88 : 72, maxScore: 100 },
            { name: 'Problem Solving', score: isEmma ? 95 : 70, maxScore: 100 },
          ],
        },
        {
          category: 'Communication',
          score: isEmma ? 85 : 65,
          maxScore: 100,
          subSkills: [
            { name: 'Reading', score: isEmma ? 92 : 72, maxScore: 100 },
            { name: 'Writing', score: isEmma ? 80 : 58, maxScore: 100 },
            { name: 'Speaking', score: isEmma ? 85 : 68, maxScore: 100 },
          ],
        },
        {
          category: 'Self-Management',
          score: isEmma ? 88 : 58,
          maxScore: 100,
          subSkills: [
            { name: 'Focus', score: isEmma ? 90 : 50, maxScore: 100 },
            { name: 'Organization', score: isEmma ? 85 : 60, maxScore: 100 },
            { name: 'Time Management', score: isEmma ? 88 : 65, maxScore: 100 },
          ],
        },
      ],
    },
    timeOnTask: {
      totalMinutes: isEmma ? 1250 : 720,
      dailyAverage: isEmma ? 42 : 24,
      weeklyAverage: isEmma ? 290 : 168,
      mostProductiveTime: isEmma ? 'Afternoon' : 'Morning',
      sessionStats: {
        averageLength: isEmma ? 28 : 18,
        longestSession: isEmma ? 55 : 32,
        sessionsThisWeek: isEmma ? 12 : 7,
      },
      dailyBreakdown: [
        {
          date: '2024-01-14',
          day: 'Sunday',
          totalMinutes: isEmma ? 25 : 0,
          learningMinutes: isEmma ? 15 : 0,
          practiceMinutes: isEmma ? 8 : 0,
          assessmentMinutes: isEmma ? 2 : 0,
        },
        {
          date: '2024-01-15',
          day: 'Monday',
          totalMinutes: isEmma ? 45 : 35,
          learningMinutes: isEmma ? 28 : 20,
          practiceMinutes: isEmma ? 12 : 10,
          assessmentMinutes: isEmma ? 5 : 5,
        },
        {
          date: '2024-01-16',
          day: 'Tuesday',
          totalMinutes: isEmma ? 38 : 28,
          learningMinutes: isEmma ? 22 : 18,
          practiceMinutes: isEmma ? 10 : 8,
          assessmentMinutes: isEmma ? 6 : 2,
        },
        {
          date: '2024-01-17',
          day: 'Wednesday',
          totalMinutes: isEmma ? 52 : 0,
          learningMinutes: isEmma ? 30 : 0,
          practiceMinutes: isEmma ? 15 : 0,
          assessmentMinutes: isEmma ? 7 : 0,
        },
        {
          date: '2024-01-18',
          day: 'Thursday',
          totalMinutes: isEmma ? 35 : 32,
          learningMinutes: isEmma ? 20 : 20,
          practiceMinutes: isEmma ? 10 : 8,
          assessmentMinutes: isEmma ? 5 : 4,
        },
        {
          date: '2024-01-19',
          day: 'Friday',
          totalMinutes: isEmma ? 42 : 25,
          learningMinutes: isEmma ? 25 : 15,
          practiceMinutes: isEmma ? 12 : 8,
          assessmentMinutes: isEmma ? 5 : 2,
        },
        {
          date: '2024-01-20',
          day: 'Saturday',
          totalMinutes: isEmma ? 30 : 15,
          learningMinutes: isEmma ? 18 : 10,
          practiceMinutes: isEmma ? 8 : 5,
          assessmentMinutes: isEmma ? 4 : 0,
        },
      ],
      subjectBreakdown: [
        {
          subject: 'Math',
          totalMinutes: isEmma ? 420 : 250,
          percentage: isEmma ? 34 : 35,
          trend: 'up',
        },
        {
          subject: 'Reading',
          totalMinutes: isEmma ? 350 : 200,
          percentage: isEmma ? 28 : 28,
          trend: 'up',
        },
        {
          subject: 'Science',
          totalMinutes: isEmma ? 230 : 150,
          percentage: isEmma ? 18 : 21,
          trend: 'stable',
        },
        {
          subject: 'Writing',
          totalMinutes: isEmma ? 150 : 80,
          percentage: isEmma ? 12 : 11,
          trend: 'up',
        },
        {
          subject: 'Social Studies',
          totalMinutes: isEmma ? 100 : 40,
          percentage: isEmma ? 8 : 5,
          trend: 'down',
        },
      ],
      activityBreakdown: [
        {
          activity: 'Lessons',
          minutes: isEmma ? 625 : 360,
          percentage: isEmma ? 50 : 50,
          color: '#6366f1',
        },
        {
          activity: 'Practice',
          minutes: isEmma ? 375 : 216,
          percentage: isEmma ? 30 : 30,
          color: '#a855f7',
        },
        {
          activity: 'Assessments',
          minutes: isEmma ? 188 : 108,
          percentage: isEmma ? 15 : 15,
          color: '#f59e0b',
        },
        {
          activity: 'Games',
          minutes: isEmma ? 62 : 36,
          percentage: isEmma ? 5 : 5,
          color: '#10b981',
        },
      ],
    },
    mastery: {
      subjects: [
        {
          subject: 'Math',
          masteryLevel: isEmma ? 85 : 68,
          grade: isEmma ? 'A-' : 'C+',
          trend: 'up',
          standards: [
            {
              code: 'CCSS.MATH.4.NF.1',
              name: 'Equivalent Fractions',
              mastery: isEmma ? 'mastered' : 'proficient',
              progress: isEmma ? 100 : 75,
            },
            {
              code: 'CCSS.MATH.4.NF.2',
              name: 'Comparing Fractions',
              mastery: isEmma ? 'mastered' : 'developing',
              progress: isEmma ? 95 : 55,
            },
            {
              code: 'CCSS.MATH.4.OA.1',
              name: 'Multi-Step Problems',
              mastery: isEmma ? 'proficient' : 'developing',
              progress: isEmma ? 78 : 48,
            },
          ],
          recentLessons: [
            {
              title: 'Adding Fractions',
              score: isEmma ? 95 : 75,
              completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              title: 'Subtracting Fractions',
              score: isEmma ? 92 : 70,
              completedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
          nextMilestone: { name: 'Fraction Master', progress: isEmma ? 8 : 5, target: 10 },
        },
        {
          subject: 'Reading',
          masteryLevel: isEmma ? 90 : 72,
          grade: isEmma ? 'A' : 'B-',
          trend: 'up',
          standards: [
            {
              code: 'CCSS.ELA.RI.4.1',
              name: 'Key Details',
              mastery: isEmma ? 'mastered' : 'proficient',
              progress: isEmma ? 100 : 70,
            },
            {
              code: 'CCSS.ELA.RI.4.2',
              name: 'Main Idea',
              mastery: isEmma ? 'mastered' : 'proficient',
              progress: isEmma ? 98 : 72,
            },
            {
              code: 'CCSS.ELA.RI.4.3',
              name: 'Text Structure',
              mastery: isEmma ? 'proficient' : 'developing',
              progress: isEmma ? 82 : 55,
            },
          ],
          recentLessons: [
            {
              title: 'Chapter 5 Comprehension',
              score: isEmma ? 100 : 80,
              completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              title: 'Vocabulary Review',
              score: isEmma ? 95 : 78,
              completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
          nextMilestone: { name: 'Bookworm Badge', progress: isEmma ? 18 : 10, target: 20 },
        },
        {
          subject: 'Science',
          masteryLevel: isEmma ? 78 : 65,
          grade: isEmma ? 'B+' : 'C',
          trend: 'stable',
          standards: [
            {
              code: 'NGSS.4-LS1-1',
              name: 'Plant Structures',
              mastery: isEmma ? 'proficient' : 'developing',
              progress: isEmma ? 80 : 60,
            },
            {
              code: 'NGSS.4-LS1-2',
              name: 'Animal Behavior',
              mastery: isEmma ? 'proficient' : 'developing',
              progress: isEmma ? 75 : 55,
            },
          ],
          recentLessons: [
            {
              title: 'Plant Life Cycles',
              score: isEmma ? 88 : 70,
              completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
          nextMilestone: { name: 'Science Explorer', progress: isEmma ? 6 : 3, target: 10 },
        },
      ],
      overallMasteryLevel: isEmma ? 84 : 68,
      masteredSkills: isEmma ? 24 : 12,
      inProgressSkills: isEmma ? 18 : 22,
      totalSkills: 50,
    },
  };
}

// ============================================================================
// Sprint 8: Billing & Subscription Mock Data
// ============================================================================

import type {
  Plan,
  Subscription,
  PaymentMethod,
  Invoice,
  BillingDetails,
  PlanChangePreview,
  Coupon,
} from './billing-types';

export const MOCK_PLANS: Plan[] = [
  {
    id: 'plan-free',
    sku: 'PARENT_FREE',
    name: 'Free',
    description: 'Get started with basic features',
    priceMonthly: 0,
    priceYearly: 0,
    pricePerSeatMonthly: 0,
    pricePerSeatYearly: 0,
    baseSeats: 1,
    maxSeats: 1,
    modules: ['ELA', 'Math'],
    features: [
      'Core ELA & Math curriculum',
      'Basic progress tracking',
      'Weekly email reports',
      '1 child account',
    ],
    stripeProductId: 'prod_free',
    stripePriceMonthlyId: 'price_free_monthly',
    stripePriceYearlyId: 'price_free_yearly',
  },
  {
    id: 'plan-basic',
    sku: 'PARENT_BASIC',
    name: 'Basic',
    description: 'Essential learning tools for families',
    priceMonthly: 9.99,
    priceYearly: 95.9, // ~20% discount
    pricePerSeatMonthly: 4.99,
    pricePerSeatYearly: 47.9,
    baseSeats: 1,
    maxSeats: 5,
    modules: ['ELA', 'Math', 'Science'],
    features: [
      'Core ELA, Math & Science',
      'Detailed progress tracking',
      'Weekly reports',
      'Parent-teacher messaging',
      'Up to 5 children',
      'Basic parental controls',
    ],
    stripeProductId: 'prod_basic',
    stripePriceMonthlyId: 'price_basic_monthly',
    stripePriceYearlyId: 'price_basic_yearly',
  },
  {
    id: 'plan-premium',
    sku: 'PARENT_PREMIUM',
    name: 'Premium',
    description: 'Full access to all learning modules',
    priceMonthly: 19.99,
    priceYearly: 191.9, // ~20% discount
    pricePerSeatMonthly: 7.99,
    pricePerSeatYearly: 76.7,
    baseSeats: 2,
    maxSeats: 10,
    modules: ['ELA', 'Math', 'Science', 'SEL', 'Speech', 'Coding', 'Writing'],
    features: [
      'Everything in Basic',
      'Social-Emotional Learning',
      'Speech therapy exercises',
      'Coding fundamentals',
      'Writing workshop',
      'AI-powered insights',
      'Advanced analytics',
      'Priority support',
      'PDF report exports',
      'Up to 10 children',
    ],
    popular: true,
    stripeProductId: 'prod_premium',
    stripePriceMonthlyId: 'price_premium_monthly',
    stripePriceYearlyId: 'price_premium_yearly',
  },
  {
    id: 'plan-family',
    sku: 'PARENT_FAMILY',
    name: 'Family',
    description: 'Best value for larger families',
    priceMonthly: 29.99,
    priceYearly: 287.9, // ~20% discount
    pricePerSeatMonthly: 0, // Unlimited at this tier
    pricePerSeatYearly: 0,
    baseSeats: 5,
    maxSeats: 99,
    modules: ['ELA', 'Math', 'Science', 'SEL', 'Speech', 'Coding', 'Writing', 'Music', 'Art'],
    features: [
      'Everything in Premium',
      'Music education',
      'Art curriculum',
      'Unlimited children',
      'Family dashboard',
      'Dedicated support',
      'Early access to new features',
      'Custom learning paths',
    ],
    stripeProductId: 'prod_family',
    stripePriceMonthlyId: 'price_family_monthly',
    stripePriceYearlyId: 'price_family_yearly',
  },
];

/**
 * Get mock plans
 */
export function getMockPlans(): Plan[] {
  assertDevMode('getMockPlans');
  return MOCK_PLANS;
}

/**
 * Get mock subscription
 */
export function getMockSubscription(): Subscription {
  assertDevMode('getMockSubscription');

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(1);
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(0);

  return {
    id: 'sub-mock-001',
    stripeSubscriptionId: 'sub_1234567890',
    stripeCustomerId: 'cus_1234567890',
    planId: 'plan-premium',
    plan: MOCK_PLANS.find((p) => p.id === 'plan-premium'),
    status: 'active',
    billingPeriod: 'MONTHLY',
    currentPeriodStart: periodStart.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
    totalSeats: 3,
    usedSeats: 2,
    seats: [
      {
        id: 'seat-001',
        childId: 'student-mock-001',
        childName: 'Emma Johnson',
        grade: 4,
        assignedAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
      },
      {
        id: 'seat-002',
        childId: 'student-mock-002',
        childName: 'Noah Johnson',
        grade: 2,
        assignedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
      },
    ],
    pricePerPeriod: 27.98, // Base 19.99 + 1 extra seat at 7.99
    nextBillingAmount: 27.98,
    createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Get mock payment methods
 */
export function getMockPaymentMethods(): PaymentMethod[] {
  assertDevMode('getMockPaymentMethods');

  return [
    {
      id: 'pm-001',
      stripePaymentMethodId: 'pm_1234567890',
      type: 'card',
      brand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: true,
      billingAddress: {
        name: 'Sarah Johnson',
        line1: '123 Main Street',
        line2: 'Apt 4B',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'US',
      },
    },
    {
      id: 'pm-002',
      stripePaymentMethodId: 'pm_0987654321',
      type: 'card',
      brand: 'mastercard',
      last4: '5555',
      expiryMonth: 3,
      expiryYear: 2026,
      isDefault: false,
      isExpiring: true,
    },
  ];
}

/**
 * Get mock invoices/payment history
 */
export function getMockInvoices(): Invoice[] {
  assertDevMode('getMockInvoices');

  const now = new Date();
  const invoices: Invoice[] = [];

  // Generate last 6 months of invoices
  for (let i = 0; i < 6; i++) {
    const invoiceDate = new Date(now);
    invoiceDate.setMonth(invoiceDate.getMonth() - i);
    invoiceDate.setDate(1);

    const periodStart = new Date(invoiceDate);
    const periodEnd = new Date(invoiceDate);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0);

    const monthName = invoiceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    invoices.push({
      id: `inv-${String(i + 1).padStart(3, '0')}`,
      stripeInvoiceId: `in_${Math.random().toString(36).substring(2, 16)}`,
      date: invoiceDate.toISOString(),
      amount: 27.98,
      amountPaid: i === 0 ? 0 : 27.98,
      amountDue: i === 0 ? 27.98 : 0,
      status: i === 0 ? 'open' : 'paid',
      description: `Premium Plan - ${monthName}`,
      lineItems: [
        {
          id: `li-${i}-1`,
          description: 'Premium Plan (Monthly)',
          quantity: 1,
          unitAmount: 19.99,
          amount: 19.99,
          period: {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString(),
          },
        },
        {
          id: `li-${i}-2`,
          description: 'Additional Seat',
          quantity: 1,
          unitAmount: 7.99,
          amount: 7.99,
          period: {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString(),
          },
        },
      ],
      pdfUrl: `/api/billing/invoices/inv-${String(i + 1).padStart(3, '0')}/pdf`,
      hostedInvoiceUrl: `https://invoice.stripe.com/i/${Math.random().toString(36).substring(2, 22)}`,
    });
  }

  return invoices;
}

/**
 * Get mock billing details
 */
export function getMockBillingDetails(): BillingDetails {
  assertDevMode('getMockBillingDetails');

  const subscription = getMockSubscription();
  const paymentMethods = getMockPaymentMethods();
  const defaultPayment = paymentMethods.find((pm) => pm.isDefault) || null;

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);

  return {
    subscription,
    paymentMethods,
    defaultPaymentMethod: defaultPayment,
    billingAddress: defaultPayment?.billingAddress || null,
    nextInvoice: {
      date: nextMonth.toISOString(),
      amount: 27.98,
      items: [
        {
          id: 'preview-1',
          description: 'Premium Plan (Monthly)',
          quantity: 1,
          unitAmount: 19.99,
          amount: 19.99,
        },
        {
          id: 'preview-2',
          description: 'Additional Seat',
          quantity: 1,
          unitAmount: 7.99,
          amount: 7.99,
        },
      ],
    },
  };
}

/**
 * Get mock plan change preview
 */
export function getMockPlanChangePreview(
  currentPlanId: string,
  newPlanId: string
): PlanChangePreview {
  assertDevMode('getMockPlanChangePreview');

  const currentPlan = MOCK_PLANS.find((p) => p.id === currentPlanId) || MOCK_PLANS[2];
  const newPlan = MOCK_PLANS.find((p) => p.id === newPlanId) || MOCK_PLANS[3];

  const now = new Date();
  const daysLeftInPeriod = 15; // Assume 15 days left
  const proratedCredit = (currentPlan.priceMonthly / 30) * daysLeftInPeriod;
  const proratedCharge = (newPlan.priceMonthly / 30) * daysLeftInPeriod;

  return {
    currentPlan,
    newPlan,
    proratedAmount: proratedCharge - proratedCredit,
    newPricePerPeriod: newPlan.priceMonthly,
    effectiveDate: now.toISOString(),
    creditApplied: proratedCredit,
    amountDue: Math.max(0, proratedCharge - proratedCredit),
    lineItems: [
      {
        id: 'prorate-credit',
        description: `Credit for unused time on ${currentPlan.name} Plan`,
        quantity: 1,
        unitAmount: -proratedCredit,
        amount: -proratedCredit,
      },
      {
        id: 'prorate-charge',
        description: `Prorated charge for ${newPlan.name} Plan`,
        quantity: 1,
        unitAmount: proratedCharge,
        amount: proratedCharge,
      },
    ],
  };
}

/**
 * Get mock coupon
 */
export function getMockCoupon(code: string): Coupon | null {
  assertDevMode('getMockCoupon');

  const validCoupons: Record<string, Coupon> = {
    WELCOME20: {
      id: 'coupon-welcome20',
      code: 'WELCOME20',
      name: 'Welcome Discount',
      percentOff: 20,
      duration: 'once',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isValid: true,
    },
    FAMILY50: {
      id: 'coupon-family50',
      code: 'FAMILY50',
      name: 'Family Discount',
      amountOff: 50,
      duration: 'once',
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      isValid: true,
    },
    ANNUAL10: {
      id: 'coupon-annual10',
      code: 'ANNUAL10',
      name: '10% Off Annual Plans',
      percentOff: 10,
      duration: 'forever',
      isValid: true,
    },
  };

  return validCoupons[code.toUpperCase()] ?? null;
}

/**
 * Get mock available children (not yet assigned to subscription)
 */
export function getMockAvailableChildren(): { id: string; name: string; grade: number }[] {
  assertDevMode('getMockAvailableChildren');

  return [
    { id: 'child-new-001', name: 'Olivia Johnson', grade: 1 },
    { id: 'child-new-002', name: 'Liam Johnson', grade: 6 },
  ];
}
