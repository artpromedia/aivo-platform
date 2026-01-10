/**
 * Analytics API Client
 *
 * API client for teacher analytics endpoints including:
 * - Class overview metrics
 * - Student analytics
 * - Skill mastery matrix
 * - Early warning system
 * - IEP progress tracking
 * - Report generation
 */

import { api } from './client';

import type {
  ClassOverviewMetrics,
  StudentAnalytics,
  SkillMasteryMatrix,
  EarlyWarningReport,
  IEPClassReport,
  ClassEngagementAnalytics,
  ClassComparisonResult,
  TrendDataPoint,
  TimePeriod,
  ReportFormat,
  ReportGenerationOptions,
  GeneratedReport,
  LogIEPProgressRequest,
  LogTeacherContactRequest,
} from '@/lib/types';

/**
 * Analytics API endpoints
 */
export const analyticsApi = {
  /**
   * Get class overview metrics
   * Main dashboard view for teachers - at-a-glance class health
   */
  getClassOverview: async (
    classId: string,
    period: TimePeriod = 'week'
  ): Promise<ClassOverviewMetrics> => {
    return api.get<ClassOverviewMetrics>(`/analytics/classes/${classId}/overview`, { period });
  },

  /**
   * Get detailed student analytics
   * Deep dive into individual student progress
   */
  getStudentAnalytics: async (
    studentId: string,
    period: TimePeriod = 'month'
  ): Promise<StudentAnalytics> => {
    return api.get<StudentAnalytics>(`/analytics/students/${studentId}`, { period });
  },

  /**
   * Get skill mastery matrix for a class
   * Visual skill gap analysis across all students
   */
  getSkillMasteryMatrix: async (
    classId: string,
    domainFilter?: string
  ): Promise<SkillMasteryMatrix> => {
    return api.get<SkillMasteryMatrix>(`/analytics/classes/${classId}/skill-matrix`, {
      domain: domainFilter,
    });
  },

  /**
   * Get early warning report for a class
   * Students at risk of falling behind
   */
  getEarlyWarningReport: async (classId: string): Promise<EarlyWarningReport> => {
    return api.get<EarlyWarningReport>(`/analytics/classes/${classId}/early-warning`);
  },

  /**
   * Get IEP progress report for a class
   * Overview of all IEP students and goal progress
   */
  getIEPProgressReport: async (classId: string): Promise<IEPClassReport> => {
    return api.get<IEPClassReport>(`/analytics/classes/${classId}/iep-progress`);
  },

  /**
   * Log IEP goal progress
   * Record progress toward an IEP goal
   */
  logIEPProgress: async (goalId: string, data: LogIEPProgressRequest): Promise<void> => {
    await api.post(`/iep/goals/${goalId}/progress`, data);
  },

  /**
   * Get engagement analytics for a class
   * Detailed engagement patterns and trends
   */
  getEngagementAnalytics: async (
    classId: string,
    period: TimePeriod = 'week'
  ): Promise<ClassEngagementAnalytics> => {
    return api.get<ClassEngagementAnalytics>(`/analytics/classes/${classId}/engagement`, {
      period,
    });
  },

  /**
   * Generate exportable report
   * Create PDF, CSV, or Excel reports for parent conferences, admin reviews
   */
  generateReport: async (
    classId: string,
    reportType: 'class-summary' | 'student-progress' | 'skill-mastery' | 'iep-progress',
    format: ReportFormat,
    options?: ReportGenerationOptions
  ): Promise<GeneratedReport> => {
    return api.post<GeneratedReport>(`/analytics/classes/${classId}/reports`, {
      reportType,
      format,
      ...options,
    });
  },

  /**
   * Log teacher contact with student
   * Record interactions for at-risk student tracking
   */
  logTeacherContact: async (studentId: string, data: LogTeacherContactRequest): Promise<void> => {
    await api.post(`/students/${studentId}/contacts`, data);
  },

  /**
   * Get class comparison analytics
   * Compare metrics across multiple classes
   */
  getClassComparison: async (
    classIds: string[],
    period: TimePeriod = 'month'
  ): Promise<ClassComparisonResult> => {
    return api.post<ClassComparisonResult>('/analytics/compare', {
      classIds,
      period,
    });
  },

  /**
   * Get trend data for specific metrics
   * Historical data for charts and visualizations
   */
  getTrendData: async (
    classId: string,
    metric: 'mastery' | 'engagement' | 'time',
    period: TimePeriod = 'month',
    granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<TrendDataPoint[]> => {
    return api.get<TrendDataPoint[]>(`/analytics/classes/${classId}/trends/${metric}`, {
      period,
      granularity,
    });
  },

  /**
   * Invalidate analytics cache
   * Force refresh of cached analytics data
   */
  invalidateCache: async (classId: string): Promise<void> => {
    await api.post(`/analytics/classes/${classId}/invalidate-cache`);
  },

  /**
   * Get student risk history
   * Historical risk level changes for a student
   */
  getStudentRiskHistory: async (
    studentId: string,
    period: TimePeriod = 'month'
  ): Promise<{ date: string; riskLevel: string; riskScore: number }[]> => {
    return api.get(`/analytics/students/${studentId}/risk-history`, { period });
  },

  /**
   * Get skill recommendations for a class
   * AI-powered skill focus recommendations
   */
  getSkillRecommendations: async (
    classId: string
  ): Promise<{ skillId: string; skillName: string; reason: string; priority: number }[]> => {
    return api.get(`/analytics/classes/${classId}/skill-recommendations`);
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Dashboard Summary Endpoints
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get complete dashboard summary
   * Aggregated data for the teacher dashboard
   */
  getDashboardSummary: async (period: TimePeriod = 'week'): Promise<DashboardSummary> => {
    return api.get<DashboardSummary>('/v2/dashboard/summary', { period });
  },

  /**
   * Get dashboard stats only
   * Quick metrics for dashboard header
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    return api.get<DashboardStats>('/v2/dashboard/stats');
  },

  /**
   * Get at-risk students
   * Students who need intervention
   */
  getAtRiskStudents: async (limit: number = 10): Promise<AtRiskStudentsResponse> => {
    return api.get<AtRiskStudentsResponse>('/v2/dashboard/at-risk', { limit });
  },

  /**
   * Get IEP progress summary
   * Progress for students with IEPs
   */
  getIEPProgressSummary: async (): Promise<IEPProgressSummaryResponse> => {
    return api.get<IEPProgressSummaryResponse>('/v2/dashboard/iep-progress');
  },

  /**
   * Get recent activity
   * Activity feed for the teacher
   */
  getRecentActivity: async (limit: number = 20, type?: string): Promise<ActivityResponse> => {
    return api.get<ActivityResponse>('/v2/dashboard/activity', { limit, type });
  },

  /**
   * Get upcoming items
   * Deadlines, meetings, and events
   */
  getUpcomingItems: async (days: number = 14): Promise<UpcomingItemsResponse> => {
    return api.get<UpcomingItemsResponse>('/v2/dashboard/upcoming', { days });
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Dashboard Types
// ────────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalStudents: number;
  averageMastery: number;
  iepStudents: number;
  atRiskStudents: number;
}

export interface ClassPerformanceItem {
  id: string;
  name: string;
  mastery: number;
  engagement: number;
  students: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AtRiskStudent {
  id: string;
  name: string;
  className: string;
  riskLevel: 'high' | 'medium' | 'low';
  riskFactors: string[];
  suggestedInterventions: string[];
  lastActivity: string;
}

export interface IEPProgressEntry {
  studentId: string;
  studentName: string;
  goalArea: string;
  currentProgress: number;
  targetProgress: number;
  status: 'on-track' | 'at-risk' | 'exceeded';
  nextReviewDate: string;
}

export interface ActivityItem {
  id: string;
  type: 'submission' | 'grade' | 'message' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  studentId?: string;
  studentName?: string;
}

export interface UpcomingItem {
  id: string;
  type: 'deadline' | 'meeting' | 'review' | 'event';
  title: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DashboardSummary {
  stats: DashboardStats;
  classPerformance: ClassPerformanceItem[];
  atRiskStudents: AtRiskStudent[];
  iepProgress: IEPProgressEntry[];
  recentActivity: ActivityItem[];
  upcomingItems: UpcomingItem[];
}

export interface AtRiskStudentsResponse {
  students: AtRiskStudent[];
  total: number;
}

export interface IEPProgressSummaryResponse {
  entries: IEPProgressEntry[];
  summary: {
    total: number;
    'on-track': number;
    'at-risk': number;
    exceeded: number;
  };
}

export interface ActivityResponse {
  items: ActivityItem[];
  hasMore: boolean;
}

export interface UpcomingItemsResponse {
  items: UpcomingItem[];
}
