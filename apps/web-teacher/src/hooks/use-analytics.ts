/**
 * React hooks for analytics data fetching
 */

import { useQuery } from '@tanstack/react-query';
import {
  getClassPerformanceMetrics,
  getClassAnalytics,
  getStudentSubjectPerformance,
  getStudentProgress,
  getStudentComparison,
  getTimeSeriesData,
  getEngagementAnalytics,
  type AnalyticsFilters,
} from '@/lib/api/analytics-api';

/**
 * Hook to fetch class performance metrics
 */
export function useClassPerformanceMetrics(classId: string, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['class-performance-metrics', classId, filters],
    queryFn: () => getClassPerformanceMetrics(classId, filters),
    enabled: !!classId,
  });
}

/**
 * Hook to fetch detailed class analytics
 */
export function useClassAnalytics(classId: string, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['class-analytics', classId, filters],
    queryFn: () => getClassAnalytics(classId, filters),
    enabled: !!classId,
  });
}

/**
 * Hook to fetch student subject performance
 */
export function useStudentSubjectPerformance(studentId: string, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['student-subject-performance', studentId, filters],
    queryFn: () => getStudentSubjectPerformance(studentId, filters),
    enabled: !!studentId,
  });
}

/**
 * Hook to fetch student progress timeline
 */
export function useStudentProgress(studentId: string, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['student-progress', studentId, filters],
    queryFn: () => getStudentProgress(studentId, filters),
    enabled: !!studentId,
  });
}

/**
 * Hook to fetch student comparison data
 */
export function useStudentComparison(studentId: string, classId: string) {
  return useQuery({
    queryKey: ['student-comparison', studentId, classId],
    queryFn: () => getStudentComparison(studentId, classId),
    enabled: !!studentId && !!classId,
  });
}

/**
 * Hook to fetch time series data
 */
export function useTimeSeriesData(
  classId: string,
  metricType: string,
  filters?: AnalyticsFilters
) {
  return useQuery({
    queryKey: ['time-series', classId, metricType, filters],
    queryFn: () => getTimeSeriesData(classId, metricType, filters),
    enabled: !!classId && !!metricType,
  });
}

/**
 * Hook to fetch engagement analytics
 */
export function useEngagementAnalytics(classId: string, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['engagement-analytics', classId, filters],
    queryFn: () => getEngagementAnalytics(classId, filters),
    enabled: !!classId,
  });
}
