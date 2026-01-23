/**
 * Reports API Client
 * Sprint 1.7: Connect Web Parent Reports to Real APIs
 *
 * Type-safe API functions for report generation and data fetching.
 * Implements proper pagination, filtering, and export functionality.
 */

import { apiClient, isDevMode } from './client';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Date range for filtering report data
 */
export interface DateRange {
  start: string; // ISO date string YYYY-MM-DD
  end: string; // ISO date string YYYY-MM-DD
}

/**
 * Report options for customizing report generation
 */
export interface ReportOptions {
  dateRange?: DateRange;
  subjects?: string[];
  includeAssessments?: boolean;
  includeTimeAnalysis?: boolean;
  includeStrengthsWeaknesses?: boolean;
  compareToClassAverage?: boolean;
}

/**
 * Progress summary overview
 */
export interface ProgressSummary {
  learnerId: string;
  learnerName: string;
  dateRange: DateRange;
  generatedAt: string;

  // Overall metrics
  overallScore: number;
  overallTrend: 'up' | 'down' | 'stable';
  percentileRank?: number;

  // Completion stats
  lessonsCompleted: number;
  totalLessons: number;
  completionRate: number;

  // Time metrics
  totalLearningTime: number; // in minutes
  averageSessionTime: number;
  averageDailyTime: number;

  // Engagement
  streak: {
    current: number;
    longest: number;
    lastActiveDate: string;
  };

  // Grade level progress
  gradeLevel: {
    current: string;
    expectedByEndOfYear: string;
    progress: number; // 0-100
    onTrack: boolean;
  };

  // Period breakdown for charting
  periods: ProgressPeriod[];

  // Subject summary
  subjectSummaries: SubjectSummary[];
}

/**
 * A time period in the progress chart
 */
export interface ProgressPeriod {
  label: string;
  startDate: string;
  endDate: string;
  score: number;
  lessonsCompleted: number;
  timeSpent: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Summary of progress in a subject
 */
export interface SubjectSummary {
  subject: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  lessonsCompleted: number;
  timeSpent: number;
  masteryLevel: 'mastered' | 'proficient' | 'developing' | 'beginning';
}

/**
 * Detailed subject report with standards mastery
 */
export interface SubjectReport {
  learnerId: string;
  subject: string;
  dateRange: DateRange;
  generatedAt: string;

  // Overall subject performance
  overallMastery: number;
  masteryLevel: 'mastered' | 'proficient' | 'developing' | 'beginning';
  trend: 'up' | 'down' | 'stable';

  // Lessons and activities
  lessonsCompleted: number;
  totalLessons: number;
  averageScore: number;
  timeSpent: number;

  // Standards breakdown
  standards: StandardMastery[];

  // Recent activities
  recentLessons: RecentLesson[];

  // Skills analysis
  strengths: SkillAnalysis[];
  areasForImprovement: SkillAnalysis[];

  // Next steps
  recommendations: string[];
  nextMilestone: {
    name: string;
    description: string;
    progress: number;
    target: number;
  };
}

/**
 * Mastery of a learning standard
 */
export interface StandardMastery {
  code: string;
  name: string;
  description?: string;
  mastery: 'mastered' | 'proficient' | 'developing' | 'beginning';
  progress: number; // 0-100
  lessonsCompleted: number;
  assessmentScore?: number;
}

/**
 * A recently completed lesson
 */
export interface RecentLesson {
  id: string;
  title: string;
  score: number;
  completedAt: string;
  timeSpent: number;
  standardsCovered: string[];
}

/**
 * Analysis of a skill
 */
export interface SkillAnalysis {
  skill: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  evidence: string[];
}

/**
 * Activity timeline with filtering
 */
export interface ActivityTimeline {
  learnerId: string;
  dateRange: DateRange;
  totalActivities: number;
  activities: TimelineActivity[];
  dailySummary: DailySummary[];
}

/**
 * A single activity in the timeline
 */
export interface TimelineActivity {
  id: string;
  type: 'lesson' | 'quiz' | 'assignment' | 'achievement' | 'practice';
  title: string;
  subject: string;
  score?: number;
  maxScore?: number;
  duration?: number;
  timestamp: string;
  details?: string;
}

/**
 * Daily activity summary
 */
export interface DailySummary {
  date: string;
  totalTime: number;
  lessonsCompleted: number;
  quizzesTaken: number;
  averageScore?: number;
  streakActive: boolean;
}

/**
 * Assessment history with filtering
 */
export interface AssessmentHistory {
  learnerId: string;
  dateRange: DateRange;
  assessments: Assessment[];
  summary: AssessmentSummary;
}

/**
 * A single assessment record
 */
export interface Assessment {
  id: string;
  title: string;
  subject: string;
  type: 'quiz' | 'test' | 'practice' | 'benchmark';
  score: number;
  maxScore: number;
  percentage: number;
  percentile?: number;
  grade?: string;
  completedAt: string;
  timeSpent: number;
  questionCount: number;
  correctAnswers: number;
  topics: string[];
}

/**
 * Summary of assessment performance
 */
export interface AssessmentSummary {
  totalAssessments: number;
  averageScore: number;
  averagePercentage: number;
  passRate: number;
  improvementTrend: 'up' | 'down' | 'stable';
  bySubject: {
    subject: string;
    count: number;
    averageScore: number;
  }[];
}

/**
 * Time on task analysis
 */
export interface TimeOnTaskReport {
  learnerId: string;
  dateRange: DateRange;

  // Overview
  totalMinutes: number;
  dailyAverage: number;
  weeklyAverage: number;
  mostProductiveTime: string;
  mostProductiveDay: string;

  // Session stats
  sessionStats: {
    totalSessions: number;
    averageLength: number;
    longestSession: number;
    shortestSession: number;
  };

  // Breakdowns
  dailyBreakdown: DailyTimeEntry[];
  subjectBreakdown: SubjectTimeEntry[];
  activityBreakdown: ActivityTimeEntry[];
}

/**
 * Daily time entry
 */
export interface DailyTimeEntry {
  date: string;
  dayOfWeek: string;
  totalMinutes: number;
  learningMinutes: number;
  practiceMinutes: number;
  assessmentMinutes: number;
}

/**
 * Time spent by subject
 */
export interface SubjectTimeEntry {
  subject: string;
  totalMinutes: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  averageSessionLength: number;
}

/**
 * Time spent by activity type
 */
export interface ActivityTimeEntry {
  activity: string;
  minutes: number;
  percentage: number;
  color: string;
}

/**
 * Strength and weakness analysis
 */
export interface StrengthWeaknessAnalysis {
  learnerId: string;
  dateRange: DateRange;
  strengths: SkillAnalysis[];
  weaknesses: SkillAnalysis[];
  recommendations: string[];
  learningStyle: {
    primary: string;
    secondary: string;
    description: string;
  };
  skillsProfile: SkillProfile[];
}

/**
 * Skill profile category
 */
export interface SkillProfile {
  category: string;
  score: number;
  maxScore: number;
  description?: string;
  subSkills: {
    name: string;
    score: number;
    maxScore: number;
  }[];
}

/**
 * Export format options
 */
export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  includeCharts?: boolean;
  includeSummary?: boolean;
  includeDetails?: boolean;
  sections?: ('progress' | 'assessments' | 'time' | 'analysis' | 'subjects')[];
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Reports API client with type-safe methods
 */
export const reportsApi = {
  /**
   * Get progress summary for a learner
   * Primary endpoint for the progress reports dashboard
   */
  async getProgressSummary(
    learnerId: string,
    options?: ReportOptions
  ): Promise<ProgressSummary> {
    const params = new URLSearchParams();
    
    if (options?.dateRange) {
      params.append('startDate', options.dateRange.start);
      params.append('endDate', options.dateRange.end);
    }
    if (options?.subjects?.length) {
      params.append('subjects', options.subjects.join(','));
    }
    if (options?.includeAssessments !== undefined) {
      params.append('includeAssessments', String(options.includeAssessments));
    }
    if (options?.compareToClassAverage !== undefined) {
      params.append('compareToClass', String(options.compareToClassAverage));
    }

    const queryString = params.toString();
    const url = `/reports/learners/${learnerId}/parent-summary${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<ProgressSummary>(url);
  },

  /**
   * Get detailed subject report
   */
  async getSubjectReport(
    learnerId: string,
    subject: string,
    dateRange?: DateRange
  ): Promise<SubjectReport> {
    const params = new URLSearchParams();
    
    if (dateRange) {
      params.append('startDate', dateRange.start);
      params.append('endDate', dateRange.end);
    }

    const queryString = params.toString();
    const encodedSubject = encodeURIComponent(subject);
    const url = `/reports/learners/${learnerId}/subjects/${encodedSubject}${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<SubjectReport>(url);
  },

  /**
   * Get activity timeline with filtering
   */
  async getActivityTimeline(
    learnerId: string,
    options?: {
      dateRange?: DateRange;
      types?: ('lesson' | 'quiz' | 'assignment' | 'achievement' | 'practice')[];
      subjects?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<ActivityTimeline> {
    const params = new URLSearchParams();
    
    if (options?.dateRange) {
      params.append('startDate', options.dateRange.start);
      params.append('endDate', options.dateRange.end);
    }
    if (options?.types?.length) {
      params.append('types', options.types.join(','));
    }
    if (options?.subjects?.length) {
      params.append('subjects', options.subjects.join(','));
    }
    if (options?.limit !== undefined) {
      params.append('limit', String(options.limit));
    }
    if (options?.offset !== undefined) {
      params.append('offset', String(options.offset));
    }

    const queryString = params.toString();
    const url = `/reports/learners/${learnerId}/timeline${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<ActivityTimeline>(url);
  },

  /**
   * Get assessment history
   */
  async getAssessmentHistory(
    learnerId: string,
    options?: {
      dateRange?: DateRange;
      subjects?: string[];
      types?: ('quiz' | 'test' | 'practice' | 'benchmark')[];
      limit?: number;
      offset?: number;
    }
  ): Promise<AssessmentHistory> {
    const params = new URLSearchParams();
    
    if (options?.dateRange) {
      params.append('startDate', options.dateRange.start);
      params.append('endDate', options.dateRange.end);
    }
    if (options?.subjects?.length) {
      params.append('subjects', options.subjects.join(','));
    }
    if (options?.types?.length) {
      params.append('types', options.types.join(','));
    }
    if (options?.limit !== undefined) {
      params.append('limit', String(options.limit));
    }
    if (options?.offset !== undefined) {
      params.append('offset', String(options.offset));
    }

    const queryString = params.toString();
    const url = `/reports/learners/${learnerId}/assessments${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<AssessmentHistory>(url);
  },

  /**
   * Get time on task report
   */
  async getTimeOnTaskReport(
    learnerId: string,
    dateRange?: DateRange
  ): Promise<TimeOnTaskReport> {
    const params = new URLSearchParams();
    
    if (dateRange) {
      params.append('startDate', dateRange.start);
      params.append('endDate', dateRange.end);
    }

    const queryString = params.toString();
    const url = `/reports/learners/${learnerId}/time-on-task${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<TimeOnTaskReport>(url);
  },

  /**
   * Get strength and weakness analysis
   */
  async getStrengthWeaknessAnalysis(
    learnerId: string,
    dateRange?: DateRange
  ): Promise<StrengthWeaknessAnalysis> {
    const params = new URLSearchParams();
    
    if (dateRange) {
      params.append('startDate', dateRange.start);
      params.append('endDate', dateRange.end);
    }

    const queryString = params.toString();
    const url = `/reports/learners/${learnerId}/analysis${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<StrengthWeaknessAnalysis>(url);
  },

  /**
   * Export report as PDF, CSV, or XLSX
   * Returns a Blob that can be downloaded
   */
  async exportReport(
    learnerId: string,
    options: ExportOptions & { dateRange?: DateRange }
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', options.format);
    
    if (options.dateRange) {
      params.append('startDate', options.dateRange.start);
      params.append('endDate', options.dateRange.end);
    }
    if (options.includeCharts !== undefined) {
      params.append('includeCharts', String(options.includeCharts));
    }
    if (options.includeSummary !== undefined) {
      params.append('includeSummary', String(options.includeSummary));
    }
    if (options.includeDetails !== undefined) {
      params.append('includeDetails', String(options.includeDetails));
    }
    if (options.sections?.length) {
      params.append('sections', options.sections.join(','));
    }

    const url = `/reports/learners/${learnerId}/export?${params.toString()}`;
    
    // Use fetch directly for blob responses
    const response = await fetch(`${getApiBaseUrl()}${url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  },

  /**
   * Generate a comprehensive report (all sections)
   * This may take longer as it compiles all data
   */
  async generateComprehensiveReport(
    learnerId: string,
    options?: ReportOptions
  ): Promise<{
    summary: ProgressSummary;
    assessments: AssessmentHistory;
    timeOnTask: TimeOnTaskReport;
    analysis: StrengthWeaknessAnalysis;
  }> {
    const params = new URLSearchParams();
    
    if (options?.dateRange) {
      params.append('startDate', options.dateRange.start);
      params.append('endDate', options.dateRange.end);
    }

    const queryString = params.toString();
    const url = `/reports/learners/${learnerId}/comprehensive${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },

  /**
   * Compare learner progress to benchmarks
   */
  async getProgressComparison(
    learnerId: string,
    options?: {
      dateRange?: DateRange;
      compareTo?: 'class' | 'grade' | 'school' | 'district';
    }
  ): Promise<{
    learnerScore: number;
    comparisonScore: number;
    percentile: number;
    trend: 'up' | 'down' | 'stable';
    bySubject: {
      subject: string;
      learnerScore: number;
      comparisonScore: number;
      percentile: number;
    }[];
  }> {
    const params = new URLSearchParams();
    
    if (options?.dateRange) {
      params.append('startDate', options.dateRange.start);
      params.append('endDate', options.dateRange.end);
    }
    if (options?.compareTo) {
      params.append('compareTo', options.compareTo);
    }

    const queryString = params.toString();
    const url = `/reports/learners/${learnerId}/comparison${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get API base URL from environment
 */
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || '/api';
  }
  return process.env.API_URL || 'http://localhost:3001/api';
}

/**
 * Get auth token from storage
 */
function getAuthToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || '';
  }
  return '';
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename for exported reports
 */
export function generateReportFilename(
  learnerName: string,
  format: ExportFormat,
  dateRange?: DateRange
): string {
  const sanitizedName = learnerName.toLowerCase().replace(/\s+/g, '-');
  const dateStr = dateRange
    ? `${dateRange.start}-to-${dateRange.end}`
    : new Date().toISOString().split('T')[0];
  
  return `progress-report-${sanitizedName}-${dateStr}.${format}`;
}

// ============================================================================
// Mock Data Generator (for development)
// ============================================================================

/**
 * Generate mock progress summary for development
 */
export function generateMockProgressSummary(
  learnerId: string,
  dateRange?: DateRange
): ProgressSummary {
  if (!isDevMode()) {
    throw new Error('Mock data only available in development mode');
  }

  const now = new Date();
  const start = dateRange?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = dateRange?.end || now.toISOString().split('T')[0];

  // Generate 4 weeks of period data
  const periods: ProgressPeriod[] = [];
  for (let i = 3; i >= 0; i--) {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (i + 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    periods.push({
      label: `Week ${4 - i}`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      score: 75 + Math.floor(Math.random() * 20),
      lessonsCompleted: 4 + Math.floor(Math.random() * 6),
      timeSpent: 100 + Math.floor(Math.random() * 80),
      trend: ['up', 'stable', 'down'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
    });
  }

  return {
    learnerId,
    learnerName: 'Emma Thompson',
    dateRange: { start, end },
    generatedAt: now.toISOString(),
    overallScore: 87,
    overallTrend: 'up',
    percentileRank: 85,
    lessonsCompleted: 156,
    totalLessons: 200,
    completionRate: 78,
    totalLearningTime: 3900,
    averageSessionTime: 25,
    averageDailyTime: 45,
    streak: {
      current: 12,
      longest: 21,
      lastActiveDate: now.toISOString().split('T')[0],
    },
    gradeLevel: {
      current: 'Grade 4',
      expectedByEndOfYear: 'Grade 5',
      progress: 78,
      onTrack: true,
    },
    periods,
    subjectSummaries: [
      { subject: 'Math', score: 92, trend: 'up', lessonsCompleted: 45, timeSpent: 1200, masteryLevel: 'proficient' },
      { subject: 'Reading', score: 88, trend: 'stable', lessonsCompleted: 38, timeSpent: 980, masteryLevel: 'proficient' },
      { subject: 'Science', score: 85, trend: 'up', lessonsCompleted: 32, timeSpent: 850, masteryLevel: 'developing' },
      { subject: 'Writing', score: 78, trend: 'up', lessonsCompleted: 28, timeSpent: 720, masteryLevel: 'developing' },
      { subject: 'Social Studies', score: 82, trend: 'stable', lessonsCompleted: 13, timeSpent: 150, masteryLevel: 'developing' },
    ],
  };
}

export default reportsApi;
