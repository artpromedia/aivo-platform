import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import * as analyticsHooks from '@/hooks/use-analytics';

// Mock the hooks
vi.mock('@/hooks/use-analytics');

const mockClassAnalytics = {
  classId: 'class-1',
  className: 'Math 101',
  totalStudents: 25,
  averageScore: 82.5,
  completionRate: 88.0,
  engagementRate: 75.5,
  atRiskStudents: 3,
  topPerformers: 5,
  subjectBreakdown: [
    {
      subject: 'Algebra',
      averageScore: 85.0,
      assignmentsCompleted: 20,
      assignmentsTotal: 25,
      skillAreas: [],
      trend: [75, 78, 80, 82, 85],
    },
  ],
  performanceDistribution: {
    excellent: 5,
    good: 10,
    satisfactory: 7,
    needsImprovement: 3,
  },
};

const mockPerformanceMetrics = [
  {
    studentId: 'student-1',
    studentName: 'John Doe',
    overallScore: 92.5,
    assignmentsCompleted: 8,
    assignmentsTotal: 10,
    averageGrade: 91.0,
    attendanceRate: 95.0,
    engagementScore: 88.0,
    improvementTrend: 'up' as const,
    lastUpdated: '2026-01-15T10:00:00Z',
  },
];

const mockEngagementData = {
  averageEngagement: 75.5,
  participationRate: 82.0,
  activeStudents: 22,
  inactiveStudents: 3,
  engagementByDay: [
    { day: 'Mon', engagement: 78 },
    { day: 'Tue', engagement: 82 },
    { day: 'Wed', engagement: 75 },
  ],
  topEngagedStudents: [],
};

describe('AnalyticsDashboard', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders analytics dashboard with class data', async () => {
    vi.spyOn(analyticsHooks, 'useClassAnalytics').mockReturnValue({
      data: mockClassAnalytics,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(analyticsHooks, 'useClassPerformanceMetrics').mockReturnValue({
      data: mockPerformanceMetrics,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(analyticsHooks, 'useEngagementAnalytics').mockReturnValue({
      data: mockEngagementData,
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard classId="class-1" className="Math 101" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Math 101')).toBeInTheDocument();
    });

    // Check overview cards
    expect(screen.getByText('Class Average')).toBeInTheDocument();
    expect(screen.getByText('82.5%')).toBeInTheDocument();
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('88.0%')).toBeInTheDocument();
  });

  it('shows loading state while fetching data', () => {
    vi.spyOn(analyticsHooks, 'useClassAnalytics').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    vi.spyOn(analyticsHooks, 'useClassPerformanceMetrics').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    vi.spyOn(analyticsHooks, 'useEngagementAnalytics').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard classId="class-1" className="Math 101" />
      </QueryClientProvider>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays at-risk students alert', async () => {
    vi.spyOn(analyticsHooks, 'useClassAnalytics').mockReturnValue({
      data: mockClassAnalytics,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(analyticsHooks, 'useClassPerformanceMetrics').mockReturnValue({
      data: mockPerformanceMetrics,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(analyticsHooks, 'useEngagementAnalytics').mockReturnValue({
      data: mockEngagementData,
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard classId="class-1" className="Math 101" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('At Risk')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});

describe('PerformanceMetrics API', () => {
  it('fetches class performance metrics', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPerformanceMetrics),
      })
    );
    global.fetch = mockFetch as any;

    const { getClassPerformanceMetrics } = await import('@/lib/api/analytics-api');
    const result = await getClassPerformanceMetrics('class-1');

    expect(result).toEqual(mockPerformanceMetrics);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/teacher/analytics/class-performance')
    );
  });

  it('handles API errors gracefully', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Internal Server Error',
      })
    );
    global.fetch = mockFetch as any;

    const { getClassPerformanceMetrics } = await import('@/lib/api/analytics-api');

    await expect(getClassPerformanceMetrics('class-1')).rejects.toThrow(
      'Failed to fetch class performance metrics'
    );
  });
});
