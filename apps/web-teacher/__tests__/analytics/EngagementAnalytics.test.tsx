/**
 * EngagementAnalytics Component Tests
 *
 * Tests for the engagement analytics dashboard component including:
 * - Loading states
 * - Error handling
 * - Metric display
 * - Trend indicators
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock the analytics API
const mockEngagementData = {
  classId: 'class-123',
  period: 'week' as const,
  totalStudents: 30,
  activeStudents: 25,
  averageTimeOnTask: 28,
  completionRate: 0.78,
  averageSessionsPerWeek: 4.5,
  overallEngagement: 72,
  engagementDistribution: {
    highlyEngaged: 8,
    engaged: 12,
    passive: 6,
    disengaged: 3,
    absent: 1,
  },
  weeklyActivity: [
    { day: 'Mon', sessions: 45, minutes: 1350 },
    { day: 'Tue', sessions: 52, minutes: 1560 },
    { day: 'Wed', sessions: 48, minutes: 1440 },
    { day: 'Thu', sessions: 55, minutes: 1650 },
    { day: 'Fri', sessions: 40, minutes: 1200 },
  ],
  lowEngagementStudents: [
    {
      studentId: 'student-1',
      studentName: 'Alex Johnson',
      engagementLevel: 'disengaged' as const,
      lastActiveDate: new Date('2025-12-20'),
      sessionCount: 1,
    },
  ],
  timeOnTaskTrend: {
    direction: 'up' as const,
    percentChange: 8,
    dataPoints: [
      { date: '2025-12-16', value: 0.24 },
      { date: '2025-12-17', value: 0.26 },
      { date: '2025-12-18', value: 0.28 },
    ],
  },
  completionRateTrend: {
    direction: 'stable' as const,
    percentChange: 1,
    dataPoints: [
      { date: '2025-12-16', value: 0.77 },
      { date: '2025-12-17', value: 0.78 },
      { date: '2025-12-18', value: 0.78 },
    ],
  },
};

vi.mock('@/lib/api/analytics', () => ({
  analyticsApi: {
    getEngagementAnalytics: vi.fn(() => Promise.resolve(mockEngagementData)),
  },
}));

// Mock Recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}));

// Import component after mocks
import { EngagementAnalytics } from '@/components/analytics/EngagementAnalytics';

describe('EngagementAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<EngagementAnalytics classId="class-123" />);

    // Should show loading skeleton
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders engagement metrics after loading', async () => {
    render(<EngagementAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText(/engagement overview/i)).toBeInTheDocument();
    });
  });

  it('displays key engagement metrics', async () => {
    render(<EngagementAnalytics classId="class-123" />);

    await waitFor(() => {
      // Check for metric values
      expect(screen.getByText('72%')).toBeInTheDocument(); // Overall engagement
      expect(screen.getByText('28 min')).toBeInTheDocument(); // Avg time on task
      expect(screen.getByText('78%')).toBeInTheDocument(); // Completion rate
    });
  });

  it('shows trend indicators', async () => {
    render(<EngagementAnalytics classId="class-123" />);

    await waitFor(() => {
      // Look for trend icons or text
      expect(screen.getByText(/\+8%/)).toBeInTheDocument();
    });
  });

  it('displays engagement distribution', async () => {
    render(<EngagementAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText(/highly engaged/i)).toBeInTheDocument();
      expect(screen.getByText(/disengaged/i)).toBeInTheDocument();
    });
  });

  it('shows low engagement students list', async () => {
    render(<EngagementAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
    });
  });

  it('has accessible labels', async () => {
    render(<EngagementAnalytics classId="class-123" />);

    await waitFor(() => {
      // Check for aria labels
      const charts = screen.getAllByRole('figure');
      expect(charts.length).toBeGreaterThan(0);
    });
  });

  it('handles empty data gracefully', async () => {
    const { analyticsApi } = await import('@/lib/api/analytics');
    vi.mocked(analyticsApi.getEngagementAnalytics).mockResolvedValueOnce({
      ...mockEngagementData,
      totalStudents: 0,
    });

    render(<EngagementAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText(/no engagement data/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const { analyticsApi } = await import('@/lib/api/analytics');
    vi.mocked(analyticsApi.getEngagementAnalytics).mockRejectedValueOnce(new Error('API Error'));

    render(<EngagementAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText(/error loading/i)).toBeInTheDocument();
    });
  });
});
