/**
 * Reports Data Hooks
 * Sprint 3: Session → Reports End-to-End Pipeline
 *
 * React Query hooks for fetching and managing report data.
 * All hooks connect to real analytics-svc endpoints — no mock fallbacks.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  reportsApi,
  downloadBlob,
  generateReportFilename,
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
    [
      ...reportQueryKeys.all,
      'progress-summary',
      learnerId,
      dateRange?.start,
      dateRange?.end,
    ] as const,
  subjectReport: (learnerId: string, subject: string, dateRange?: DateRange) =>
    [
      ...reportQueryKeys.all,
      'subject',
      learnerId,
      subject,
      dateRange?.start,
      dateRange?.end,
    ] as const,
  activityTimeline: (learnerId: string, options?: { dateRange?: DateRange }) =>
    [
      ...reportQueryKeys.all,
      'timeline',
      learnerId,
      options?.dateRange?.start,
      options?.dateRange?.end,
    ] as const,
  assessmentHistory: (learnerId: string, dateRange?: DateRange) =>
    [...reportQueryKeys.all, 'assessments', learnerId, dateRange?.start, dateRange?.end] as const,
  timeOnTask: (learnerId: string, dateRange?: DateRange) =>
    [...reportQueryKeys.all, 'time-on-task', learnerId, dateRange?.start, dateRange?.end] as const,
  analysis: (learnerId: string, dateRange?: DateRange) =>
    [...reportQueryKeys.all, 'analysis', learnerId, dateRange?.start, dateRange?.end] as const,
  comprehensive: (learnerId: string, dateRange?: DateRange) =>
    [...reportQueryKeys.all, 'comprehensive', learnerId, dateRange?.start, dateRange?.end] as const,
  comparison: (learnerId: string) => [...reportQueryKeys.all, 'comparison', learnerId] as const,
};

// ============================================================================
// Progress Summary Hook
// ============================================================================

/**
 * Hook to fetch progress summary for a learner
 * Primary hook for the progress reports dashboard
 */
export function useProgressSummary(learnerId: string | null, options?: ReportOptions) {
  const dateRange = options?.dateRange;

  return useQuery({
    queryKey: reportQueryKeys.progressSummary(learnerId || '', dateRange),
    queryFn: async (): Promise<ProgressSummary> => {
      if (!learnerId) {
        throw new Error('No learner selected');
      }
      return reportsApi.getProgressSummary(learnerId, options);
    },
    enabled: !!learnerId,
    retry: 3,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
      return reportsApi.getSubjectReport(learnerId, subject, dateRange);
    },
    enabled: !!learnerId && !!subject,
    retry: 3,
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
      return reportsApi.getActivityTimeline(learnerId, options);
    },
    enabled: !!learnerId,
    retry: 3,
    staleTime: 5 * 60 * 1000,
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
      return reportsApi.getAssessmentHistory(learnerId, options);
    },
    enabled: !!learnerId,
    retry: 3,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Time on Task Hook
// ============================================================================

/**
 * Hook to fetch time on task report
 */
export function useTimeOnTaskReport(learnerId: string | null, dateRange?: DateRange) {
  return useQuery({
    queryKey: reportQueryKeys.timeOnTask(learnerId || '', dateRange),
    queryFn: async (): Promise<TimeOnTaskReport> => {
      if (!learnerId) {
        throw new Error('No learner selected');
      }
      return reportsApi.getTimeOnTaskReport(learnerId, dateRange);
    },
    enabled: !!learnerId,
    retry: 3,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Strength/Weakness Analysis Hook
// ============================================================================

/**
 * Hook to fetch strength and weakness analysis
 */
export function useStrengthWeaknessAnalysis(learnerId: string | null, dateRange?: DateRange) {
  return useQuery({
    queryKey: reportQueryKeys.analysis(learnerId || '', dateRange),
    queryFn: async (): Promise<StrengthWeaknessAnalysis> => {
      if (!learnerId) {
        throw new Error('No learner selected');
      }
      return reportsApi.getStrengthWeaknessAnalysis(learnerId, dateRange);
    },
    enabled: !!learnerId,
    retry: 3,
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
export function useComprehensiveReport(learnerId: string | null, dateRange?: DateRange) {
  return useQuery({
    queryKey: reportQueryKeys.comprehensive(learnerId || '', dateRange),
    queryFn: async () => {
      if (!learnerId) {
        throw new Error('No learner selected');
      }
      return reportsApi.generateComprehensiveReport(learnerId, { dateRange });
    },
    enabled: !!learnerId,
    retry: 3,
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
