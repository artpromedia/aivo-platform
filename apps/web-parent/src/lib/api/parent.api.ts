/**
 * Parent Portal API
 *
 * Type-safe API functions for parent dashboard operations.
 * All functions use the apiClient for consistent error handling.
 */

import { apiClient } from './client';

// ============================================================================
// Type Definitions
// ============================================================================

// Parent & Children
export interface ParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  language?: string;
  students: Child[];
  createdAt: string;
  updatedAt: string;
}

export interface Child {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  grade: string;
  avatar?: string;
  dateOfBirth?: string;
  schoolId?: string;
  schoolName?: string;
}

export interface EnhancedChild extends Child {
  subjects: string[];
  lastActive: string;
  currentStreak?: number;
  todayProgress?: {
    minutesLearned: number;
    lessonsCompleted: number;
  };
  status?: 'online' | 'offline' | 'learning';
}

// Student Summary
export interface StudentSummary {
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
  subjectProgress: SubjectProgress[];
  recentActivity: Activity[];
  upcomingAssignments: Assignment[];
  teacherNotes: TeacherNote[];
  achievements: Achievement[];
  dailyUsage: DailyUsage;
  weeklyUsageHistory: DailyUsage[];
}

export interface SubjectProgress {
  subject: string;
  average: number;
  timeSpent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface Activity {
  id: string;
  type: 'lesson' | 'quiz' | 'assignment' | 'achievement';
  title: string;
  subject: string;
  score?: number;
  completedAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueIn: number;
}

export interface TeacherNote {
  id: string;
  teacherName: string;
  teacherAvatar?: string;
  content: string;
  createdAt: string;
  type: 'positive' | 'concern' | 'info';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'learning' | 'streak' | 'mastery' | 'engagement' | 'special';
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: string;
  progress?: number;
  total?: number;
}

export interface DailyUsage {
  date: string;
  totalMinutes: number;
  learningMinutes: number;
  practiceMinutes: number;
  gameMinutes: number;
  sessionsCompleted: number;
}

// Weekly Summary
export interface WeeklySummary {
  highlights: string[];
  lessonsCompleted: { title: string; subject: string; score: number }[];
  achievements: { name: string; description: string }[];
}

// Weekly Report
export interface WeeklyReport {
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

// Homework Sessions
export interface HomeworkSession {
  id: string;
  subject: string;
  title: string;
  startedAt: string;
  completedAt?: string;
  progress: number;
  stepsCompleted: number;
  totalSteps: number;
  aiHintsUsed?: number;
  problemsAttempted?: number;
  problemsSolved?: number;
}

// Messages
export interface Message {
  id: string;
  teacherName: string;
  teacherAvatar?: string;
  subject: string;
  preview: string;
  unread: boolean;
  timestamp: string;
}

export interface Conversation {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar?: string;
  teacherSubject?: string;
  studentId: string;
  studentName: string;
  subject: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  archived: boolean;
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  senderType: 'parent' | 'teacher';
  senderName: string;
  senderAvatar?: string;
  content: string;
  sentAt: string;
  readAt?: string;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
  }[];
}

// Difficulty Recommendations
export interface DifficultyRecommendation {
  id: string;
  domain: string;
  currentLevel: number;
  recommendedLevel: number;
  reasonTitle: string;
  reasonDescription: string;
  expiresAt: string;
}

// AI Insights
export interface AIInsight {
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

// Activity Timeline
export interface TimelineActivity {
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

// Milestones
export interface Milestone {
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

// Parental Controls
export interface ParentalControls {
  screenTime: {
    dailyLimit: number;
    scheduleEnabled: boolean;
    schedule: Record<string, { start: string; end: string; enabled: boolean }>;
    breakReminders: boolean;
    breakInterval: number;
    breakDuration: number;
  };
  contentFilter: {
    restrictionLevel: 'strict' | 'moderate' | 'minimal';
    blockExternalLinks: boolean;
    safeSearch: boolean;
    hideAchievementLeaderboards: boolean;
    restrictChat: boolean;
    blockedTopics: string[];
    allowedTopics: string[];
  };
  subjectAccess: {
    subjects: Record<string, { enabled: boolean; maxLevel?: number }>;
    requireParentApprovalForNewSubjects: boolean;
    allowAdvancedContent: boolean;
  };
  notifications: NotificationSettings;
  safety: SafetySettings;
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
    achievements: boolean;
    concerns: boolean;
    teacherMessages: boolean;
  };
  push: {
    enabled: boolean;
    achievements: boolean;
    milestones: boolean;
    concerns: boolean;
    teacherMessages: boolean;
    screenTimeAlerts: boolean;
  };
  inApp: {
    enabled: boolean;
    achievements: boolean;
    progress: boolean;
    recommendations: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface SafetySettings {
  privacy: {
    hideFromClassmates: boolean;
    hideProfilePhoto: boolean;
    hideProgress: boolean;
    anonymousMode: boolean;
  };
  data: {
    allowAnalytics: boolean;
    allowPersonalization: boolean;
    allowThirdPartySharing: boolean;
  };
  access: {
    requirePinForSettings: boolean;
    pin?: string;
    allowAccountDeletion: boolean;
    twoFactorEnabled: boolean;
  };
  emergency: {
    emergencyContactEnabled: boolean;
    emergencyEmail?: string;
    emergencyPhone?: string;
  };
}

// Progress Report
export interface ProgressReport {
  studentId: string;
  studentName: string;
  dateRange: { start: string; end: string };
  overview: {
    totalLearningTime: number;
    lessonsCompleted: number;
    averageScore: number;
    streakDays: number;
    achievementsEarned: number;
  };
  subjectPerformance: {
    subject: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
    lessonsCompleted: number;
    timeSpent: number;
    strengths: string[];
    areasForImprovement: string[];
  }[];
  weeklyProgress: {
    week: string;
    minutes: number;
    lessons: number;
    score: number;
  }[];
  recommendations: string[];
  teacherComments: TeacherNote[];
}

// ============================================================================
// API Functions
// ============================================================================

export const parentApi = {
  // =========================================================================
  // Profile & Children
  // =========================================================================

  /**
   * Get parent profile with linked students
   */
  getProfile: () => apiClient.get<ParentProfile>('/parent/profile'),

  /**
   * Update parent profile
   */
  updateProfile: (
    data: Partial<Pick<ParentProfile, 'firstName' | 'lastName' | 'phone' | 'language'>>
  ) => apiClient.put<ParentProfile>('/parent/profile', data),

  /**
   * Get linked students
   */
  getStudents: (options?: { includeRevoked?: boolean }) =>
    apiClient.get<Child[]>(
      `/parent/students${options?.includeRevoked ? '?includeRevoked=true' : ''}`
    ),

  /**
   * Get enhanced children data with status and progress
   */
  getChildrenEnhanced: () =>
    apiClient.get<{ children: EnhancedChild[] }>('/parent/children/enhanced'),

  // =========================================================================
  // Student Summary & Progress
  // =========================================================================

  /**
   * Get student summary for dashboard
   */
  getStudentSummary: (studentId: string) =>
    apiClient.get<StudentSummary>(`/parent/students/${studentId}/summary`),

  /**
   * Get weekly summary
   */
  getWeeklySummary: (studentId: string, weekOf?: Date) => {
    const params = weekOf ? `?weekOf=${weekOf.toISOString()}` : '';
    return apiClient.get<WeeklySummary>(`/parent/students/${studentId}/weekly-summary${params}`);
  },

  /**
   * Get weekly report with detailed breakdown
   */
  getWeeklyReport: (studentId: string, weekStart?: string) => {
    const params = weekStart ? `?weekStart=${weekStart}` : '';
    return apiClient.get<WeeklyReport>(`/parent/students/${studentId}/weekly-report${params}`);
  },

  /**
   * Get activity timeline
   */
  getActivityTimeline: (studentId: string, limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    return apiClient.get<{ activities: TimelineActivity[] }>(
      `/parent/students/${studentId}/activity-timeline${params}`
    );
  },

  /**
   * Get upcoming milestones
   */
  getMilestones: (studentId: string) =>
    apiClient.get<{ milestones: Milestone[] }>(`/parent/students/${studentId}/milestones`),

  /**
   * Get AI-powered insights
   */
  getAIInsights: (studentId: string) =>
    apiClient.get<{ insights: AIInsight[] }>(`/api/ai/parent-insights/${studentId}`),

  /**
   * Dismiss an AI insight
   */
  dismissInsight: (insightId: string, studentId: string) =>
    apiClient.post(`/api/ai/insights/${insightId}/dismiss`, { studentId }),

  // =========================================================================
  // Homework
  // =========================================================================

  /**
   * Get homework sessions for a student
   */
  getHomeworkSessions: (studentId: string) =>
    apiClient.get<HomeworkSession[]>(`/parent/homework/students/${studentId}`),

  // =========================================================================
  // Achievements
  // =========================================================================

  /**
   * Get all achievements for a student
   */
  getAchievements: (studentId: string) =>
    apiClient.get<{ achievements: Achievement[] }>(`/parent/students/${studentId}/achievements`),

  // =========================================================================
  // Difficulty Recommendations
  // =========================================================================

  /**
   * Get pending difficulty recommendations
   */
  getDifficultyRecommendations: (studentId: string) =>
    apiClient.get<{ recommendations: DifficultyRecommendation[] }>(
      `/parent/students/${studentId}/difficulty/recommendations`
    ),

  /**
   * Respond to a recommendation
   */
  respondToRecommendation: (data: {
    recommendationId: string;
    action: 'approve' | 'modify' | 'deny';
    modifiedLevel?: number;
    parentNotes?: string;
  }) => apiClient.post('/parent/difficulty/recommendations/respond', data),

  /**
   * Get current difficulty levels
   */
  getDifficultyLevels: (studentId: string) =>
    apiClient.get(`/parent/students/${studentId}/difficulty/levels`),

  /**
   * Set domain difficulty (parent override)
   */
  setDomainDifficulty: (data: { studentId: string; domain: string; level: number }) =>
    apiClient.post('/parent/difficulty/domain/set', data),

  // =========================================================================
  // Messaging
  // =========================================================================

  /**
   * Get conversations
   */
  getConversations: (includeArchived = false) =>
    apiClient.get<Conversation[]>(`/messages/conversations?includeArchived=${includeArchived}`),

  /**
   * Get conversation messages
   */
  getConversationMessages: (
    conversationId: string,
    options?: { limit?: number; before?: string }
  ) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.before) params.append('before', options.before);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<{ messages: ConversationMessage[]; conversation: Conversation }>(
      `/messages/conversations/${conversationId}${queryString}`
    );
  },

  /**
   * Send a message
   */
  sendMessage: (conversationId: string, content: string) =>
    apiClient.post<ConversationMessage>(`/messages/conversations/${conversationId}/messages`, {
      content,
    }),

  /**
   * Create a new conversation
   */
  createConversation: (data: {
    teacherId: string;
    studentId: string;
    subject: string;
    message?: string;
  }) => apiClient.post<Conversation>('/messages/conversations', data),

  /**
   * Mark conversation as read
   */
  markConversationRead: (conversationId: string) =>
    apiClient.put(`/messages/conversations/${conversationId}/read`, {}),

  /**
   * Get legacy messages preview (for dashboard)
   */
  getMessages: () => apiClient.get<{ conversations: Message[] }>('/parent/messages/conversations'),

  // =========================================================================
  // Parental Controls
  // =========================================================================

  /**
   * Get parental controls for a child
   */
  getParentalControls: (childId: string) =>
    apiClient.get<ParentalControls>(`/parent/children/${childId}/controls`),

  /**
   * Update parental controls section
   */
  updateParentalControls: <K extends keyof ParentalControls>(
    childId: string,
    section: K,
    settings: ParentalControls[K]
  ) => apiClient.put(`/parent/children/${childId}/controls/${section}`, settings),

  /**
   * Get children with their teachers
   */
  getChildrenWithTeachers: () =>
    apiClient.get<{
      children: (Child & { teachers: { id: string; name: string; subject: string }[] })[];
    }>('/parent/children/with-teachers'),

  // =========================================================================
  // Student Settings
  // =========================================================================

  /**
   * Update student settings (e.g., daily goal)
   */
  updateStudentSettings: (studentId: string, settings: { dailyGoalMinutes?: number }) =>
    apiClient.put(`/parent/students/${studentId}/settings`, settings),

  // =========================================================================
  // Reports
  // =========================================================================

  /**
   * Get comprehensive progress report
   */
  getProgressReport: (studentId: string, dateRange?: { start: string; end: string }) => {
    const params = new URLSearchParams();
    if (dateRange?.start) params.append('start', dateRange.start);
    if (dateRange?.end) params.append('end', dateRange.end);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<ProgressReport>(`/reports/students/${studentId}/progress${queryString}`);
  },

  /**
   * Download progress report as PDF
   */
  downloadProgressReportPDF: async (
    studentId: string,
    studentName: string,
    dateRange?: { start: string; end: string }
  ) => {
    const params = new URLSearchParams();
    if (dateRange?.start) params.append('start', dateRange.start);
    if (dateRange?.end) params.append('end', dateRange.end);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const blob = await apiClient.getBlob(
      `/reports/students/${studentId}/progress.pdf${queryString}`
    );
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-report-${studentName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    globalThis.URL.revokeObjectURL(url);
  },

  /**
   * Share weekly report via email
   */
  shareWeeklyReport: (studentId: string, weekStart: string, recipientEmail?: string) =>
    apiClient.post(`/parent/students/${studentId}/weekly-report/share`, {
      weekStart,
      recipientEmail,
    }),

  // =========================================================================
  // Notifications
  // =========================================================================

  /**
   * Get notifications
   */
  getNotifications: (options?: { unreadOnly?: boolean; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.append('unreadOnly', 'true');
    if (options?.limit) params.append('limit', String(options.limit));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/parent/notifications${queryString}`);
  },

  /**
   * Mark notifications as read
   */
  markNotificationsRead: (notificationIds: string[]) =>
    apiClient.put('/parent/notifications/read', { notificationIds }),

  /**
   * Update notification preferences
   */
  updateNotificationPreferences: (preferences: Record<string, boolean>) =>
    apiClient.put('/parent/notification-preferences', preferences),
};

export default parentApi;
