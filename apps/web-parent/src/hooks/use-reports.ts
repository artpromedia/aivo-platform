/**
 * Reports Data Hooks
 * Sprint 1.7: Connect Web Parent Reports to Real APIs
 *
 * React Query hooks for fetching and managing report data.
 * Implements caching, optimistic updates, and proper error handling.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { isDevMode } from '@/lib/api/client';
import {
  reportsApi,
  downloadBlob,
  generateReportFilename,
  generateMockProgressSummary,
  type DateRange,
  type ReportOptions,
  type ProgressSummary,
  type SubjectReport,
  type ActivityTimeline,
  type AssessmentHistory,
  type TimeOnTaskReport,
  type StrengthWeaknessAnalysis,
  type ExportFormat,
  type ExportOptions,
} from '@/lib/api/reports.api';

// ============================================================================
// Query Keys
// ============================================================================

export const reportQueryKeys = {
  all: ['reports'] as const,
  progressSummary: (learnerId: string, dateRange?: DateRange) =>
    [...reportQueryKeys.all, 'progress-summary', learnerId, dateRange?.start, dateRange?.end] as const,
  subjectReport: (learnerId: string, subject: string, dateRange?: DateRange) =>
    [...reportQueryKeys.all, 'subject', learnerId, subject, dateRange?.start, dateRange?.end] as const,
  activityTimeline: (learnerId: string, options?: { dateRange?: DateRange }) =>
    [...reportQueryKeys.all, 'timeline', learnerId, options?.dateRange?.start, options?.dateRange?.end] as const,
  assessmentHistory: (learnerId: string, dateRange?: DateRange) =>
    [...reportQueryKeys.all, 'assessments', learnerId, dateRange?.start, dateRange?.end] as const,
  timeOnTask: (learnerId: string, dateRange?: DateRange) =>
    [...reportQueryKeys.all, 'time-on-task', learnerId, dateRange?.start, dateRange?.end] as const,
  analysis: (learnerId: string, dateRange?: DateRange) =>
    [...reportQueryKeys.all, 'analysis', learnerId, dateRange?.start, dateRange?.end] as const,
  comprehensive: (learnerId: string, dateRange?: DateRange) =>
    [...reportQueryKeys.all, 'comprehensive', learnerId, dateRange?.start, dateRange?.end] as const,
  comparison: (learnerId: string) =>
    [...reportQueryKeys.all, 'comparison', learnerId] as const,
};

// ============================================================================
// Progress Summary Hook
// ============================================================================

/**
 * Hook to fetch progress summary for a learner
 * Primary hook for the progress reports dashboard
 */
export function useProgressSummary(
  learnerId: string | null,
  options?: ReportOptions
) {
  const dateRange = options?.dateRange;
  
  return useQuery({
    queryKey: reportQueryKeys.progressSummary(learnerId || '', dateRange),
    queryFn: async (): Promise<ProgressSummary> => {
      if (!learnerId) {
        throw new Error('No learner selected');
      }

      try {
        return await reportsApi.getProgressSummary(learnerId, options);
      } catch (error) {
        // In development, fall back to mock data if API fails
        if (isDevMode()) {
          console.warn('[DEV] Using mock progress summary data');
          return generateMockProgressSummary(learnerId, dateRange);
        }
        throw error;
      }
    },
    enabled: !!learnerId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 10 * 60 * 1000, // 10 minutes - reports don't change frequently
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

// ============================================================================
// Subject Report Hook
// ============================================================================

/**
 * Hook to fetch detailed subject report
 */
export function useSubjectReport(
  learnerId: string | null,
  subject: string | null,
  dateRange?: DateRange
) {
  return useQuery({
    queryKey: reportQueryKeys.subjectReport(learnerId || '', subject || '', dateRange),
    queryFn: async (): Promise<SubjectReport> => {
      if (!learnerId || !subject) {
        throw new Error('Learner and subject are required');
      }

      try {
        return await reportsApi.getSubjectReport(learnerId, subject, dateRange);
      } catch (error) {
        // In development, generate mock subject report
        if (isDevMode()) {
          console.warn('[DEV] Using mock subject report data');
          return generateMockSubjectReport(learnerId, subject, dateRange);
        }
        throw error;
      }
    },
    enabled: !!learnerId && !!subject,
    retry: isDevMode() ? 0 : 3,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Activity Timeline Hook
// ============================================================================

/**
 * Hook to fetch activity timeline
 */
export function useActivityTimeline(
  learnerId: string | null,
  options?: {
    dateRange?: DateRange;
    types?: ('lesson' | 'quiz' | 'assignment' | 'achievement' | 'practice')[];
    subjects?: string[];
    limit?: number;
  }
) {
  return useQuery({
    queryKey: reportQueryKeys.activityTimeline(learnerId || '', options),
    queryFn: async (): Promise<ActivityTimeline> => {
      if (!learnerId) {
        throw new Error('No learner selected');
      }

      try {
        return await reportsApi.getActivityTimeline(learnerId, options);
      } catch (error) {
        // In development, generate mock timeline
        if (isDevMode()) {
          console.warn('[DEV] Using mock activity timeline data');
          return generateMockActivityTimeline(learnerId, options?.dateRange);
        }
        throw error;
      }
    },
    enabled: !!learnerId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 5 * 60 * 1000, // 5 minutes - activities update more frequently
  });
}

// ============================================================================
// Assessment History Hook
// ============================================================================

/**
 * Hook to fetch assessment history
 */
export function useAssessmentHistory(
  learnerId: string | null,
  options?: {
    dateRange?: DateRange;
    subjects?: string[];
    types?: ('quiz' | 'test' | 'practice' | 'benchmark')[];
    limit?: number;
  }
) {
  return useQuery({
    queryKey: reportQueryKeys.assessmentHistory(learnerId || '', options?.dateRange),
    queryFn: async (): Promise<AssessmentHistory> => {
      if (!learnerId) {
        throw new Error('No learner selected');
      }

      try {
        return await reportsApi.getAssessmentHistory(learnerId, options);
      } catch (error) {
        // In development, generate mock assessments
        if (isDevMode()) {
          console.warn('[DEV] Using mock assessment history data');
          return generateMockAssessmentHistory(learnerId, options?.dateRange);
        }
        throw error;
      }
    },
    enabled: !!learnerId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Time on Task Hook
// ============================================================================

/**
 * Hook to fetch time on task report
 */
export function useTimeOnTaskReport(
  learnerId: string | null,
  dateRange?: DateRange
) {
  return useQuery({
    queryKey: reportQueryKeys.timeOnTask(learnerId || '', dateRange),
    queryFn: async (): Promise<TimeOnTaskReport> => {
      if (!learnerId) {
        throw new Error('No learner selected');
      }

      try {
        return await reportsApi.getTimeOnTaskReport(learnerId, dateRange);
      } catch (error) {
        // In development, generate mock time data
        if (isDevMode()) {
          console.warn('[DEV] Using mock time on task data');
          return generateMockTimeOnTaskReport(learnerId, dateRange);
        }
        throw error;
      }
    },
    enabled: !!learnerId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Strength/Weakness Analysis Hook
// ============================================================================

/**
 * Hook to fetch strength and weakness analysis
 */
export function useStrengthWeaknessAnalysis(
  learnerId: string | null,
  dateRange?: DateRange
) {
  return useQuery({
    queryKey: reportQueryKeys.analysis(learnerId || '', dateRange),
    queryFn: async (): Promise<StrengthWeaknessAnalysis> => {
      if (!learnerId) {
        throw new Error('No learner selected');
      }

      try {
        return await reportsApi.getStrengthWeaknessAnalysis(learnerId, dateRange);
      } catch (error) {
        // In development, generate mock analysis
        if (isDevMode()) {
          console.warn('[DEV] Using mock strength/weakness analysis data');
          return generateMockStrengthWeaknessAnalysis(learnerId, dateRange);
        }
        throw error;
      }
    },
    enabled: !!learnerId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 15 * 60 * 1000, // Analysis changes less frequently
  });
}

// ============================================================================
// Comprehensive Report Hook
// ============================================================================

/**
 * Hook to fetch all report sections at once
 * Useful for generating full PDF exports
 */
export function useComprehensiveReport(
  learnerId: string | null,
  dateRange?: DateRange
) {
  return useQuery({
    queryKey: reportQueryKeys.comprehensive(learnerId || '', dateRange),
    queryFn: async () => {
      if (!learnerId) {
        throw new Error('No learner selected');
      }

      try {
        return await reportsApi.generateComprehensiveReport(learnerId, { dateRange });
      } catch (error) {
        // In development, generate mock comprehensive report
        if (isDevMode()) {
          console.warn('[DEV] Using mock comprehensive report data');
          return {
            summary: generateMockProgressSummary(learnerId, dateRange),
            assessments: generateMockAssessmentHistory(learnerId, dateRange),
            timeOnTask: generateMockTimeOnTaskReport(learnerId, dateRange),
            analysis: generateMockStrengthWeaknessAnalysis(learnerId, dateRange),
          };
        }
        throw error;
      }
    },
    enabled: !!learnerId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Report Export Hook
// ============================================================================

/**
 * Hook to export reports in various formats
 */
export function useReportExport() {
  const _queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      learnerId,
      learnerName,
      format,
      dateRange,
      options,
    }: {
      learnerId: string;
      learnerName: string;
      format: ExportFormat;
      dateRange?: DateRange;
      options?: Omit<ExportOptions, 'format'>;
    }) => {
      const exportOptions: ExportOptions & { dateRange?: DateRange } = {
        format,
        dateRange,
        ...options,
      };

      const blob = await reportsApi.exportReport(learnerId, exportOptions);
      const filename = generateReportFilename(learnerName, format, dateRange);
      downloadBlob(blob, filename);
      
      return { success: true, filename };
    },
    onSuccess: () => {
      // Optionally invalidate queries after export
      // This could trigger a refresh of report data
    },
    onError: (error) => {
      console.error('Report export failed:', error);
    },
  });
}

/**
 * Hook to generate and download PDF report
 * Convenience wrapper around useReportExport for PDFs
 */
export function usePDFExport() {
  const exportMutation = useReportExport();

  return {
    ...exportMutation,
    exportPDF: (params: {
      learnerId: string;
      learnerName: string;
      dateRange?: DateRange;
      includeCharts?: boolean;
    }) =>
      exportMutation.mutateAsync({
        learnerId: params.learnerId,
        learnerName: params.learnerName,
        format: 'pdf',
        dateRange: params.dateRange,
        options: {
          includeCharts: params.includeCharts ?? true,
          includeSummary: true,
          includeDetails: true,
        },
      }),
  };
}

/**
 * Hook to generate and download CSV report
 * Convenience wrapper around useReportExport for CSVs
 */
export function useCSVExport() {
  const exportMutation = useReportExport();

  return {
    ...exportMutation,
    exportCSV: (params: {
      learnerId: string;
      learnerName: string;
      dateRange?: DateRange;
      sections?: ('progress' | 'assessments' | 'time' | 'analysis' | 'subjects')[];
    }) =>
      exportMutation.mutateAsync({
        learnerId: params.learnerId,
        learnerName: params.learnerName,
        format: 'csv',
        dateRange: params.dateRange,
        options: {
          sections: params.sections,
        },
      }),
  };
}

// ============================================================================
// Prefetch Utilities
// ============================================================================

/**
 * Prefetch progress summary for faster navigation
 */
export function usePrefetchProgressSummary() {
  const queryClient = useQueryClient();

  return (learnerId: string, dateRange?: DateRange) => {
    return queryClient.prefetchQuery({
      queryKey: reportQueryKeys.progressSummary(learnerId, dateRange),
      queryFn: () => reportsApi.getProgressSummary(learnerId, { dateRange }),
      staleTime: 10 * 60 * 1000,
    });
  };
}

// ============================================================================
// Mock Data Generators (Development Only)
// ============================================================================

function generateMockSubjectReport(
  learnerId: string,
  subject: string,
  dateRange?: DateRange
): SubjectReport {
  const now = new Date();
  const start = dateRange?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = dateRange?.end || now.toISOString().split('T')[0];

  return {
    learnerId,
    subject,
    dateRange: { start, end },
    generatedAt: now.toISOString(),
    overallMastery: 85,
    masteryLevel: 'proficient',
    trend: 'up',
    lessonsCompleted: 45,
    totalLessons: 60,
    averageScore: 87,
    timeSpent: 1200,
    standards: [
      { code: '4.NF.A.1', name: 'Equivalent Fractions', mastery: 'mastered', progress: 100, lessonsCompleted: 8, assessmentScore: 95 },
      { code: '4.NF.A.2', name: 'Comparing Fractions', mastery: 'proficient', progress: 85, lessonsCompleted: 6, assessmentScore: 88 },
      { code: '4.NF.B.3', name: 'Adding Fractions', mastery: 'proficient', progress: 80, lessonsCompleted: 10, assessmentScore: 82 },
      { code: '4.NF.B.4', name: 'Multiplying Fractions', mastery: 'developing', progress: 60, lessonsCompleted: 4, assessmentScore: 72 },
    ],
    recentLessons: [
      { id: 'l1', title: 'Adding Mixed Numbers', score: 92, completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), timeSpent: 25, standardsCovered: ['4.NF.B.3'] },
      { id: 'l2', title: 'Equivalent Fractions Practice', score: 100, completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), timeSpent: 20, standardsCovered: ['4.NF.A.1'] },
      { id: 'l3', title: 'Comparing Fractions Quiz', score: 88, completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), timeSpent: 30, standardsCovered: ['4.NF.A.2'] },
    ],
    strengths: [
      { skill: 'Visual Fraction Models', score: 95, trend: 'up', description: 'Excellent understanding of fraction representations', evidence: ['Perfect scores on visual problems', 'Helps peers with diagrams'] },
    ],
    areasForImprovement: [
      { skill: 'Word Problems', score: 72, trend: 'stable', description: 'Needs more practice with fraction word problems', evidence: ['Struggles with multi-step problems', 'Improves with scaffolding'] },
    ],
    recommendations: [
      'Continue daily practice with fraction word problems',
      'Use manipulatives for multiplying fractions',
      'Review benchmark fractions for faster mental math',
    ],
    nextMilestone: {
      name: 'Fraction Operations Mastery',
      description: 'Complete all fraction standards at proficient level',
      progress: 75,
      target: 100,
    },
  };
}

function generateMockActivityTimeline(
  learnerId: string,
  dateRange?: DateRange
): ActivityTimeline {
  const now = new Date();
  const start = dateRange?.start || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = dateRange?.end || now.toISOString().split('T')[0];

  const activities = [];
  const types = ['lesson', 'quiz', 'practice', 'achievement'] as const;
  const subjects = ['Math', 'Reading', 'Science', 'Writing'];

  for (let i = 0; i < 20; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const timestamp = new Date(now.getTime() - i * 4 * 60 * 60 * 1000);

    activities.push({
      id: `activity-${i}`,
      type,
      title: `${type === 'achievement' ? 'Earned' : 'Completed'} ${subject} ${type}`,
      subject,
      score: type !== 'achievement' ? 70 + Math.floor(Math.random() * 30) : undefined,
      maxScore: type !== 'achievement' ? 100 : undefined,
      duration: type !== 'achievement' ? 15 + Math.floor(Math.random() * 30) : undefined,
      timestamp: timestamp.toISOString(),
    });
  }

  const dailySummary = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dailySummary.push({
      date: date.toISOString().split('T')[0],
      totalTime: 30 + Math.floor(Math.random() * 60),
      lessonsCompleted: 1 + Math.floor(Math.random() * 4),
      quizzesTaken: Math.floor(Math.random() * 2),
      averageScore: 75 + Math.floor(Math.random() * 20),
      streakActive: i < 5,
    });
  }

  return {
    learnerId,
    dateRange: { start, end },
    totalActivities: activities.length,
    activities,
    dailySummary,
  };
}

function generateMockAssessmentHistory(
  learnerId: string,
  dateRange?: DateRange
): AssessmentHistory {
  const now = new Date();
  const start = dateRange?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = dateRange?.end || now.toISOString().split('T')[0];

  return {
    learnerId,
    dateRange: { start, end },
    assessments: [
      {
        id: 'a1', title: 'Fractions Unit Test', subject: 'Math', type: 'test',
        score: 47, maxScore: 50, percentage: 94, percentile: 92, grade: 'A',
        completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        timeSpent: 35, questionCount: 25, correctAnswers: 23,
        topics: ['Adding Fractions', 'Subtracting Fractions', 'Mixed Numbers'],
      },
      {
        id: 'a2', title: 'Reading Comprehension Quiz', subject: 'Reading', type: 'quiz',
        score: 18, maxScore: 20, percentage: 90, grade: 'A-',
        completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        timeSpent: 20, questionCount: 10, correctAnswers: 9,
        topics: ['Main Idea', 'Supporting Details', 'Inference'],
      },
      {
        id: 'a3', title: 'Science Practice: Plant Life', subject: 'Science', type: 'practice',
        score: 42, maxScore: 50, percentage: 84,
        completedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        timeSpent: 25, questionCount: 20, correctAnswers: 17,
        topics: ['Photosynthesis', 'Plant Parts', 'Life Cycle'],
      },
      {
        id: 'a4', title: 'Math Quarterly Benchmark', subject: 'Math', type: 'benchmark',
        score: 85, maxScore: 100, percentage: 85, percentile: 88, grade: 'B+',
        completedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        timeSpent: 60, questionCount: 50, correctAnswers: 43,
        topics: ['Numbers', 'Operations', 'Geometry', 'Fractions'],
      },
    ],
    summary: {
      totalAssessments: 12,
      averageScore: 88,
      averagePercentage: 88,
      passRate: 100,
      improvementTrend: 'up',
      bySubject: [
        { subject: 'Math', count: 6, averageScore: 90 },
        { subject: 'Reading', count: 3, averageScore: 88 },
        { subject: 'Science', count: 2, averageScore: 82 },
        { subject: 'Writing', count: 1, averageScore: 78 },
      ],
    },
  };
}

function generateMockTimeOnTaskReport(
  learnerId: string,
  dateRange?: DateRange
): TimeOnTaskReport {
  const now = new Date();
  const start = dateRange?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = dateRange?.end || now.toISOString().split('T')[0];

  const dailyBreakdown = [];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const totalMinutes = 30 + Math.floor(Math.random() * 60);
    dailyBreakdown.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: days[date.getDay()],
      totalMinutes,
      learningMinutes: Math.floor(totalMinutes * 0.6),
      practiceMinutes: Math.floor(totalMinutes * 0.3),
      assessmentMinutes: Math.floor(totalMinutes * 0.1),
    });
  }

  return {
    learnerId,
    dateRange: { start, end },
    totalMinutes: 3900,
    dailyAverage: 45,
    weeklyAverage: 315,
    mostProductiveTime: '4:00 PM - 6:00 PM',
    mostProductiveDay: 'Wednesday',
    sessionStats: {
      totalSessions: 156,
      averageLength: 25,
      longestSession: 65,
      shortestSession: 8,
    },
    dailyBreakdown,
    subjectBreakdown: [
      { subject: 'Math', totalMinutes: 1200, percentage: 31, trend: 'up', averageSessionLength: 28 },
      { subject: 'Reading', totalMinutes: 980, percentage: 25, trend: 'stable', averageSessionLength: 22 },
      { subject: 'Science', totalMinutes: 850, percentage: 22, trend: 'up', averageSessionLength: 25 },
      { subject: 'Writing', totalMinutes: 720, percentage: 18, trend: 'stable', averageSessionLength: 20 },
      { subject: 'Social Studies', totalMinutes: 150, percentage: 4, trend: 'down', averageSessionLength: 15 },
    ],
    activityBreakdown: [
      { activity: 'Lessons', minutes: 2340, percentage: 60, color: '#6366f1' },
      { activity: 'Practice', minutes: 1170, percentage: 30, color: '#22c55e' },
      { activity: 'Assessments', minutes: 390, percentage: 10, color: '#f59e0b' },
    ],
  };
}

function generateMockStrengthWeaknessAnalysis(
  learnerId: string,
  dateRange?: DateRange
): StrengthWeaknessAnalysis {
  const now = new Date();
  const start = dateRange?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = dateRange?.end || now.toISOString().split('T')[0];

  return {
    learnerId,
    dateRange: { start, end },
    strengths: [
      {
        skill: 'Problem Solving',
        score: 95,
        trend: 'up',
        description: 'Demonstrates excellent analytical thinking and breaks down complex problems effectively',
        evidence: ['Scored 95% on word problems', 'Consistently completes challenge problems', 'Helps peers with difficult concepts'],
      },
      {
        skill: 'Reading Comprehension',
        score: 92,
        trend: 'up',
        description: 'Strong ability to understand and analyze texts across various genres',
        evidence: ['Above grade level reading scores', 'Excellent inference skills', 'Strong vocabulary usage'],
      },
      {
        skill: 'Scientific Inquiry',
        score: 88,
        trend: 'stable',
        description: 'Shows curiosity and follows scientific method well',
        evidence: ['Excellent lab reports', 'Asks insightful questions', 'Makes accurate predictions'],
      },
    ],
    weaknesses: [
      {
        skill: 'Written Expression',
        score: 72,
        trend: 'up',
        description: 'Needs more practice with organizing and expanding written responses',
        evidence: ['Short responses on writing tasks', 'Improving paragraph structure', 'Strong ideas but limited detail'],
      },
      {
        skill: 'Multi-step Problems',
        score: 68,
        trend: 'stable',
        description: 'Sometimes struggles with problems requiring multiple operations',
        evidence: ['Skips steps occasionally', 'Benefits from scaffolding', 'Improving with practice'],
      },
    ],
    recommendations: [
      'Continue daily reading with discussion questions',
      'Practice multi-step math problems with visual organizers',
      'Use writing prompts that encourage detailed responses',
      'Focus on showing all work in problem-solving',
    ],
    learningStyle: {
      primary: 'Visual',
      secondary: 'Kinesthetic',
      description: 'Emma learns best through visual representations and hands-on activities. Charts, diagrams, and manipulatives help reinforce concepts.',
    },
    skillsProfile: [
      {
        category: 'Critical Thinking',
        score: 90,
        maxScore: 100,
        subSkills: [
          { name: 'Analysis', score: 92, maxScore: 100 },
          { name: 'Evaluation', score: 88, maxScore: 100 },
          { name: 'Synthesis', score: 90, maxScore: 100 },
        ],
      },
      {
        category: 'Communication',
        score: 80,
        maxScore: 100,
        subSkills: [
          { name: 'Written', score: 72, maxScore: 100 },
          { name: 'Verbal', score: 90, maxScore: 100 },
          { name: 'Listening', score: 78, maxScore: 100 },
        ],
      },
      {
        category: 'Collaboration',
        score: 85,
        maxScore: 100,
        subSkills: [
          { name: 'Teamwork', score: 88, maxScore: 100 },
          { name: 'Leadership', score: 82, maxScore: 100 },
          { name: 'Adaptability', score: 85, maxScore: 100 },
        ],
      },
    ],
  };
}

// ============================================================================
// Export All
// ============================================================================

export {
  type DateRange,
  type ReportOptions,
  type ProgressSummary,
  type SubjectReport,
  type ActivityTimeline,
  type AssessmentHistory,
  type TimeOnTaskReport,
  type StrengthWeaknessAnalysis,
  type ExportFormat,
  type ExportOptions,
} from '@/lib/api/reports.api';
