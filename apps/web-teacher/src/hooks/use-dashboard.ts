/**
 * Dashboard Data Hook
 *
 * React hook for fetching and managing teacher dashboard data.
 * Provides loading states, error handling, and data refresh.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  analyticsApi,
  type DashboardSummary,
  type DashboardStats,
  type AtRiskStudent,
  type IEPProgressEntry,
  type ActivityItem,
  type UpcomingItem,
  type ClassPerformanceItem,
} from '@/lib/api/analytics';

export interface UseDashboardOptions {
  autoFetch?: boolean;
  refreshInterval?: number; // in milliseconds
}

export interface UseDashboardReturn {
  data: DashboardSummary | null;
  stats: DashboardStats | null;
  classPerformance: ClassPerformanceItem[];
  atRiskStudents: AtRiskStudent[];
  iepProgress: IEPProgressEntry[];
  recentActivity: ActivityItem[];
  upcomingItems: UpcomingItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching teacher dashboard data
 */
export function useDashboard(options: UseDashboardOptions = {}): UseDashboardReturn {
  const { autoFetch = true, refreshInterval } = options;

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const summary = await analyticsApi.getDashboardSummary();
      setData(summary);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch dashboard data:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  // Refresh interval
  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(fetchData, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  return {
    data,
    stats: data?.stats ?? null,
    classPerformance: data?.classPerformance ?? [],
    atRiskStudents: data?.atRiskStudents ?? [],
    iepProgress: data?.iepProgress ?? [],
    recentActivity: data?.recentActivity ?? [],
    upcomingItems: data?.upcomingItems ?? [],
    isLoading,
    error,
    refresh: fetchData,
  };
}

export default useDashboard;
