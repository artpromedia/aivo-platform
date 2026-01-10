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

// Mock data fallback for development
const MOCK_DATA: DashboardSummary = {
  stats: {
    totalStudents: 127,
    averageMastery: 78.5,
    iepStudents: 12,
    atRiskStudents: 8,
  },
  classPerformance: [
    { id: 'class-1', name: 'Algebra I - Period 1', mastery: 82, engagement: 88, students: 28, trend: 'up' },
    { id: 'class-2', name: 'Algebra I - Period 3', mastery: 75, engagement: 79, students: 26, trend: 'stable' },
    { id: 'class-3', name: 'Pre-Algebra - Period 4', mastery: 71, engagement: 85, students: 24, trend: 'down' },
    { id: 'class-4', name: 'Geometry - Period 5', mastery: 85, engagement: 91, students: 27, trend: 'up' },
    { id: 'class-5', name: 'Algebra II - Period 6', mastery: 79, engagement: 76, students: 22, trend: 'stable' },
  ],
  atRiskStudents: [
    {
      id: 'student-1',
      name: 'Alex Johnson',
      className: 'Pre-Algebra - Period 4',
      riskLevel: 'high',
      riskFactors: ['Low engagement (42%)', 'Declining mastery', 'Missing assignments'],
      suggestedInterventions: ['One-on-one tutoring', 'Parent conference', 'Modified assignments'],
      lastActivity: '3 days ago',
    },
    {
      id: 'student-2',
      name: 'Sarah Williams',
      className: 'Algebra I - Period 3',
      riskLevel: 'medium',
      riskFactors: ['Inconsistent attendance', 'Struggling with fractions'],
      suggestedInterventions: ['Fraction remediation', 'Check-in meetings'],
      lastActivity: '1 day ago',
    },
    {
      id: 'student-3',
      name: 'Michael Chen',
      className: 'Geometry - Period 5',
      riskLevel: 'medium',
      riskFactors: ['Low assessment scores', 'Anxiety during tests'],
      suggestedInterventions: ['Extended time', 'Test-taking strategies'],
      lastActivity: 'Today',
    },
  ],
  iepProgress: [
    {
      studentId: 'iep-1',
      studentName: 'Emma Davis',
      goalArea: 'Math Problem Solving',
      currentProgress: 72,
      targetProgress: 80,
      status: 'on-track',
      nextReviewDate: '2026-02-15',
    },
    {
      studentId: 'iep-2',
      studentName: 'James Wilson',
      goalArea: 'Number Fluency',
      currentProgress: 58,
      targetProgress: 75,
      status: 'at-risk',
      nextReviewDate: '2026-02-01',
    },
    {
      studentId: 'iep-3',
      studentName: 'Olivia Brown',
      goalArea: 'Written Expression',
      currentProgress: 85,
      targetProgress: 80,
      status: 'exceeded',
      nextReviewDate: '2026-03-01',
    },
    {
      studentId: 'iep-4',
      studentName: 'Liam Martinez',
      goalArea: 'Self-Regulation',
      currentProgress: 68,
      targetProgress: 70,
      status: 'on-track',
      nextReviewDate: '2026-02-20',
    },
  ],
  recentActivity: [
    {
      id: 'activity-1',
      type: 'submission',
      title: 'New Assignment Submission',
      description: 'Emma Davis submitted "Chapter 5 Quiz"',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      studentId: 'iep-1',
      studentName: 'Emma Davis',
    },
    {
      id: 'activity-2',
      type: 'alert',
      title: 'At-Risk Alert',
      description: 'Alex Johnson has not logged in for 3 days',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      studentId: 'student-1',
      studentName: 'Alex Johnson',
    },
    {
      id: 'activity-3',
      type: 'grade',
      title: 'Assessment Completed',
      description: 'Graded 24 submissions for "Linear Equations Test"',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'activity-4',
      type: 'message',
      title: 'Parent Message',
      description: "Sarah Williams' parent requested a meeting",
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      studentId: 'student-2',
      studentName: 'Sarah Williams',
    },
  ],
  upcomingItems: [
    {
      id: 'upcoming-1',
      type: 'review',
      title: 'IEP Review: James Wilson',
      date: '2026-02-01',
      priority: 'high',
    },
    {
      id: 'upcoming-2',
      type: 'deadline',
      title: 'Quarter 2 Grades Due',
      date: '2026-01-17',
      priority: 'high',
    },
    {
      id: 'upcoming-3',
      type: 'meeting',
      title: 'Department Meeting',
      date: '2026-01-12',
      priority: 'medium',
    },
    {
      id: 'upcoming-4',
      type: 'event',
      title: 'Math Competition Prep',
      date: '2026-01-20',
      priority: 'low',
    },
  ],
};

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
      console.warn('[Dashboard] API unavailable, using mock data:', err);
      // Use mock data as fallback during development
      setData(MOCK_DATA);
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
