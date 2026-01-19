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
  type: 'lesson_started' | 'lesson_completed' | 'quiz_completed' | 'achievement_earned' | 'milestone_reached' | 'game_played' | 'practice_session' | 'assessment_completed';
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
  type: 'lesson_count' | 'streak' | 'subject_mastery' | 'achievement' | 'level_up' | 'time_goal' | 'perfect_score' | 'completion';
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
        description: 'Emma demonstrates strong analytical thinking in math. She consistently breaks down complex problems into smaller steps and shows above-average performance on multi-step word problems.',
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
        description: 'Emma has maintained consistent daily learning for 12 days in a row. This dedication is building strong study habits that will benefit her long-term academic success.',
        priority: 'low',
        confidence: 1.0,
        generatedAt: now,
      },
      {
        id: 'insight-3',
        type: 'improvement',
        title: 'Social Studies Engagement Opportunity',
        description: 'Emma\'s engagement with Social Studies content is lower than other subjects. She spends less time on these lessons and occasionally skips optional activities.',
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
        description: 'Emma\'s reading comprehension scores indicate she\'s performing 1-2 grade levels above her peers. She excels at inferencing and identifying main ideas.',
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
      description: 'Noah sometimes hesitates on math problems even when he knows the answer. Building his confidence through positive reinforcement could help him perform better.',
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
      description: 'Noah learns best through visual content. He shows 30% better retention when lessons include diagrams, videos, and interactive visuals.',
      priority: 'medium',
      confidence: 0.91,
      generatedAt: now,
    },
    {
      id: 'insight-3',
      type: 'concern',
      title: 'Attention Span During Long Sessions',
      description: 'Noah\'s performance drops significantly in sessions longer than 15 minutes. Shorter, more frequent learning sessions may be more effective.',
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
      estimatedCompletion: new Date(Date.now() + (isEmma ? 5 : 20) * 24 * 60 * 60 * 1000).toISOString(),
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
      { subject: 'Math', minutes: isEmma ? 55 : 35, lessons: isEmma ? 8 : 5, averageScore: isEmma ? 92 : 75, trend: 'up' },
      { subject: 'Reading', minutes: isEmma ? 45 : 30, lessons: isEmma ? 6 : 4, averageScore: isEmma ? 88 : 82, trend: 'up' },
      { subject: 'Science', minutes: isEmma ? 35 : 25, lessons: isEmma ? 4 : 3, averageScore: isEmma ? 85 : 70, trend: 'stable' },
      { subject: 'Writing', minutes: isEmma ? 30 : 18, lessons: isEmma ? 4 : 2, averageScore: isEmma ? 90 : 72, trend: 'up' },
      { subject: 'Social Studies', minutes: isEmma ? 20 : 12, lessons: isEmma ? 2 : 2, averageScore: isEmma ? 78 : 68, trend: 'down' },
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
