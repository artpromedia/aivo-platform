/**
 * IEPProgressDashboard Component Tests
 *
 * Tests for the IEP progress tracking dashboard including:
 * - Loading states
 * - Summary statistics
 * - Student progress cards
 * - Goal progress tracking
 * - Progress logging
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

// Mock IEP report data
const mockIEPReport = {
  classId: 'class-123',
  className: 'Math 101',
  totalStudentsWithIEP: 5,
  totalGoals: 12,
  goalsOnTrack: 8,
  goalsAtRisk: 4,
  students: [
    {
      studentId: 'student-1',
      studentName: 'Jordan Smith',
      goals: [
        {
          goalId: 'goal-1',
          description: 'Improve reading comprehension by 20%',
          category: 'Reading',
          targetDate: new Date('2025-05-15'),
          currentProgress: 65,
          expectedProgress: 60,
          status: 'on-track' as const,
          recentProgress: [
            { date: new Date('2025-12-20'), value: 65, notes: 'Good progress' },
            { date: new Date('2025-12-13'), value: 55 },
          ],
          relatedSkill: 'Reading Comprehension',
        },
        {
          goalId: 'goal-2',
          description: 'Complete math problems independently',
          category: 'Math',
          targetDate: new Date('2025-04-01'),
          currentProgress: 30,
          expectedProgress: 55,
          status: 'behind' as const,
          recentProgress: [{ date: new Date('2025-12-18'), value: 30 }],
        },
      ],
      accommodations: [
        { type: 'Extended Time', description: '1.5x on tests', isActive: true },
        { type: 'Preferential Seating', description: 'Front row', isActive: true },
      ],
      overallProgress: 47.5,
      goalsAtRisk: 1,
    },
  ],
  upcomingReviewDates: [
    {
      studentId: 'student-1',
      studentName: 'Jordan Smith',
      reviewDate: new Date('2025-01-15'),
      daysUntil: 23,
    },
  ],
};

vi.mock('@/lib/api/analytics', () => ({
  analyticsApi: {
    getIEPProgressReport: vi.fn(() => Promise.resolve(mockIEPReport)),
    logIEPProgress: vi.fn(() => Promise.resolve()),
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
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}));

// Import component after mocks
import { IEPProgressDashboard } from '@/components/analytics/IEPProgressDashboard';

describe('IEPProgressDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<IEPProgressDashboard classId="class-123" />);

    // Should show loading indicators
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays summary statistics after loading', async () => {
    render(<IEPProgressDashboard classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Students with IEP
      expect(screen.getByText('12')).toBeInTheDocument(); // Total goals
      expect(screen.getByText('8')).toBeInTheDocument(); // Goals on track
      expect(screen.getByText('4')).toBeInTheDocument(); // Goals at risk
    });
  });

  it('shows student progress cards', async () => {
    render(<IEPProgressDashboard classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText('Jordan Smith')).toBeInTheDocument();
    });
  });

  it('displays goal status badges', async () => {
    render(<IEPProgressDashboard classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText(/on-track/i)).toBeInTheDocument();
      expect(screen.getByText(/behind/i)).toBeInTheDocument();
    });
  });

  it('shows accommodations for students', async () => {
    render(<IEPProgressDashboard classId="class-123" />);

    await waitFor(() => {
      // Expand student card
      const studentCard = screen.getByText('Jordan Smith');
      fireEvent.click(studentCard);
    });

    await waitFor(() => {
      expect(screen.getByText('Extended Time')).toBeInTheDocument();
    });
  });

  it('displays upcoming review dates', async () => {
    render(<IEPProgressDashboard classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText(/upcoming iep reviews/i)).toBeInTheDocument();
      expect(screen.getByText('Jordan Smith')).toBeInTheDocument();
    });
  });

  it('opens progress logging dialog', async () => {
    const user = userEvent.setup();
    render(<IEPProgressDashboard classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText('Jordan Smith')).toBeInTheDocument();
    });

    // Expand student card
    await user.click(screen.getByText('Jordan Smith'));

    // Find and click log progress button
    const logButton = screen.getAllByText(/log progress/i)[0];
    await user.click(logButton);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/progress value/i)).toBeInTheDocument();
    });
  });

  it('submits progress entry', async () => {
    const user = userEvent.setup();
    const { analyticsApi } = await import('@/lib/api/analytics');

    render(<IEPProgressDashboard classId="class-123" />);

    // Wait for load and expand
    await waitFor(() => {
      expect(screen.getByText('Jordan Smith')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Jordan Smith'));

    // Open dialog
    const logButton = screen.getAllByText(/log progress/i)[0];
    await user.click(logButton);

    // Fill in progress
    const input = screen.getByLabelText(/progress value/i);
    await user.type(input, '75');

    const notesInput = screen.getByLabelText(/notes/i);
    await user.type(notesInput, 'Student showed improvement');

    // Submit
    const saveButton = screen.getByText(/save progress/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(analyticsApi.logIEPProgress).toHaveBeenCalledWith(
        'goal-1',
        expect.objectContaining({
          value: 75,
          notes: 'Student showed improvement',
        })
      );
    });
  });

  it('handles empty IEP data', async () => {
    const { analyticsApi } = await import('@/lib/api/analytics');
    vi.mocked(analyticsApi.getIEPProgressReport).mockResolvedValueOnce({
      ...mockIEPReport,
      totalStudentsWithIEP: 0,
      students: [],
    });

    render(<IEPProgressDashboard classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText(/no iep students/i)).toBeInTheDocument();
    });
  });

  it('shows progress bar with expected progress marker', async () => {
    render(<IEPProgressDashboard classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText('Jordan Smith')).toBeInTheDocument();
    });

    // Expand to see progress bars
    fireEvent.click(screen.getByText('Jordan Smith'));

    await waitFor(() => {
      // Should show progress percentages
      expect(screen.getByText(/65%/)).toBeInTheDocument();
      expect(screen.getByText(/expected: 60%/i)).toBeInTheDocument();
    });
  });

  it('displays recent progress notes', async () => {
    render(<IEPProgressDashboard classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText('Jordan Smith')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jordan Smith'));

    await waitFor(() => {
      expect(screen.getByText('Good progress')).toBeInTheDocument();
    });
  });

  it('has accessible structure', async () => {
    render(<IEPProgressDashboard classId="class-123" />);

    await waitFor(() => {
      // Check for heading structure
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

      // Check for expandable sections
      const expandButtons = screen.getAllByRole('button', { expanded: false });
      expect(expandButtons.length).toBeGreaterThan(0);
    });
  });
});
