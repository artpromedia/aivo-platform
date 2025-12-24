/**
 * StudentDetailView Component Tests
 *
 * Tests for the comprehensive student detail view including:
 * - Loading states
 * - Skill mastery display
 * - Time-on-task metrics
 * - Activity history
 * - Struggle patterns
 * - Recommendations
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock student detail data
const mockStudentDetail = {
  studentId: 'student-123',
  studentName: 'Alex Johnson',
  currentMastery: 72,
  masteryTrend: 5,
  engagementScore: 85,
  engagementTrend: -2,
  totalTimeMinutes: 450,
  avgSessionMinutes: 25,
  skillsMastered: 12,
  skillsInProgress: 8,
  skillsNotStarted: 5,
  skillBreakdown: [
    {
      skillId: 'skill-1',
      skillName: 'Algebra Basics',
      category: 'Math',
      mastery: 95,
      status: 'mastered' as const,
      lastPracticed: new Date('2025-12-20'),
      practiceCount: 15,
      masteryHistory: [
        { date: new Date('2025-12-01'), mastery: 60 },
        { date: new Date('2025-12-10'), mastery: 80 },
        { date: new Date('2025-12-20'), mastery: 95 },
      ],
    },
    {
      skillId: 'skill-2',
      skillName: 'Fractions',
      category: 'Math',
      mastery: 45,
      status: 'struggling' as const,
      lastPracticed: new Date('2025-12-18'),
      practiceCount: 8,
      strugglingPatterns: ['Mixed number conversion', 'Cross multiplication'],
      masteryHistory: [
        { date: new Date('2025-12-01'), mastery: 30 },
        { date: new Date('2025-12-18'), mastery: 45 },
      ],
    },
    {
      skillId: 'skill-3',
      skillName: 'Geometry Basics',
      category: 'Math',
      mastery: 0,
      status: 'not-started' as const,
      lastPracticed: null,
      practiceCount: 0,
      masteryHistory: [],
    },
  ],
  recentActivity: [
    {
      date: new Date('2025-12-20'),
      activityType: 'practice' as const,
      skillName: 'Algebra Basics',
      duration: 15,
      score: 90,
    },
    {
      date: new Date('2025-12-20'),
      activityType: 'assessment' as const,
      skillName: 'Fractions',
      duration: 20,
      score: 65,
    },
    {
      date: new Date('2025-12-19'),
      activityType: 'lesson' as const,
      skillName: 'Fractions',
      duration: 30,
      score: null,
    },
  ],
  struggleAreas: [
    {
      skillName: 'Fractions',
      specificPatterns: ['Mixed number conversion', 'Cross multiplication'],
      suggestedInterventions: ['Visual fraction tools', 'One-on-one practice'],
    },
  ],
  recommendations: [
    {
      type: 'intervention' as const,
      title: 'Focus on Fractions',
      description: 'Student shows consistent struggle with fraction operations',
      priority: 'high' as const,
    },
    {
      type: 'extension' as const,
      title: 'Advance to Pre-Algebra',
      description: 'Strong algebra foundation suggests readiness for advanced concepts',
      priority: 'medium' as const,
    },
  ],
};

vi.mock('@/lib/api/analytics', () => ({
  analyticsApi: {
    getStudentDetail: vi.fn(() => Promise.resolve(mockStudentDetail)),
  },
}));

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Line: () => null,
  Bar: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  ReferenceLine: () => null,
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="trending-up-icon">↑</span>,
  TrendingDown: () => <span data-testid="trending-down-icon">↓</span>,
  AlertTriangle: () => <span data-testid="alert-icon">⚠</span>,
  CheckCircle: () => <span data-testid="check-icon">✓</span>,
  Clock: () => <span data-testid="clock-icon">🕐</span>,
  Target: () => <span data-testid="target-icon">🎯</span>,
  BookOpen: () => <span data-testid="book-icon">📖</span>,
  ArrowLeft: () => <span data-testid="arrow-left">←</span>,
}));

// Import component after mocks
import { StudentDetailView } from '@/components/analytics/StudentDetailView';

describe('StudentDetailView', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays student name and overview metrics', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
      expect(screen.getByText('72%')).toBeInTheDocument(); // Mastery
      expect(screen.getByText('85')).toBeInTheDocument(); // Engagement
    });
  });

  it('shows mastery trend indicator', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      expect(screen.getByText('+5%')).toBeInTheDocument();
    });
  });

  it('shows negative engagement trend', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('trending-down-icon')).toBeInTheDocument();
      expect(screen.getByText('-2')).toBeInTheDocument();
    });
  });

  it('displays skill summary counts', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument(); // Mastered
      expect(screen.getByText('8')).toBeInTheDocument(); // In Progress
      expect(screen.getByText('5')).toBeInTheDocument(); // Not Started
    });
  });

  it('shows skill breakdown cards', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Algebra Basics')).toBeInTheDocument();
      expect(screen.getByText('Fractions')).toBeInTheDocument();
      expect(screen.getByText('Geometry Basics')).toBeInTheDocument();
    });
  });

  it('displays skill status badges', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText(/mastered/i)).toBeInTheDocument();
      expect(screen.getByText(/struggling/i)).toBeInTheDocument();
      expect(screen.getByText(/not started/i)).toBeInTheDocument();
    });
  });

  it('shows recent activity feed', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
      expect(screen.getByText(/practice/i)).toBeInTheDocument();
      expect(screen.getByText(/assessment/i)).toBeInTheDocument();
      expect(screen.getByText(/lesson/i)).toBeInTheDocument();
    });
  });

  it('displays activity scores when available', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('90%')).toBeInTheDocument(); // Practice score
      expect(screen.getByText('65%')).toBeInTheDocument(); // Assessment score
    });
  });

  it('shows struggle patterns for struggling skills', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText(/struggle areas/i)).toBeInTheDocument();
      expect(screen.getByText('Mixed number conversion')).toBeInTheDocument();
      expect(screen.getByText('Cross multiplication')).toBeInTheDocument();
    });
  });

  it('displays intervention suggestions', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Visual fraction tools')).toBeInTheDocument();
      expect(screen.getByText('One-on-one practice')).toBeInTheDocument();
    });
  });

  it('shows recommendations with priority', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Focus on Fractions')).toBeInTheDocument();
      expect(screen.getByText('Advance to Pre-Algebra')).toBeInTheDocument();
      expect(screen.getByText(/high priority/i)).toBeInTheDocument();
    });
  });

  it('calls onBack when back button clicked', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('displays time metrics', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText(/450/)).toBeInTheDocument(); // Total minutes
      expect(screen.getByText(/25/)).toBeInTheDocument(); // Avg session
    });
  });

  it('expands skill to show mastery history', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Algebra Basics')).toBeInTheDocument();
    });

    // Click to expand skill
    const skillCard = screen.getByText('Algebra Basics');
    fireEvent.click(skillCard);

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('handles empty skill breakdown', async () => {
    const { analyticsApi } = await import('@/lib/api/analytics');
    vi.mocked(analyticsApi.getStudentDetail).mockResolvedValueOnce({
      ...mockStudentDetail,
      skillBreakdown: [],
    });

    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText(/no skills data/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const { analyticsApi } = await import('@/lib/api/analytics');
    vi.mocked(analyticsApi.getStudentDetail).mockRejectedValueOnce(new Error('API Error'));

    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText(/error loading student data/i)).toBeInTheDocument();
    });
  });

  it('has proper accessibility structure', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      // Check for heading structure
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

      // Check for navigation
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Check for sections
      expect(screen.getAllByRole('region').length).toBeGreaterThan(0);
    });
  });

  it('shows practice count for skills', async () => {
    render(<StudentDetailView studentId="student-123" onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText(/15 practices/i)).toBeInTheDocument();
      expect(screen.getByText(/8 practices/i)).toBeInTheDocument();
    });
  });
});
