import { AccessibilityProvider } from '@aivo/ui-web';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BaselineInsightsClient } from '../view-client';

import type { BaselineProfileView } from '@/lib/learner-insights';

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}

const mockBaseline: BaselineProfileView = {
  profileId: 'bp-1',
  learnerId: 'learner-1',
  learnerName: 'Jordan Rivers',
  grade: 4,
  gradeBand: 'K5',
  status: 'COMPLETED',
  domainScores: [
    { domain: 'ELA', score: 0.72, label: 'Strong comprehension' },
    { domain: 'MATH', score: 0.58, label: 'Growing arithmetic' },
    { domain: 'SCIENCE', score: 0.66, label: 'Curious thinker' },
  ],
  attempts: [
    {
      attemptId: 'attempt-1',
      attemptNumber: 1,
      status: 'COMPLETED',
      startedAt: '2025-12-01T10:00:00Z',
      completedAt: '2025-12-01T11:00:00Z',
      score: 0.54,
    },
    {
      attemptId: 'attempt-2',
      attemptNumber: 2,
      status: 'COMPLETED',
      startedAt: '2025-12-02T10:00:00Z',
      completedAt: '2025-12-02T11:00:00Z',
      score: 0.68,
      retestReason: 'DISTRACTED',
    },
  ],
  latestAttemptId: 'attempt-2',
};

describe('BaselineInsightsClient', () => {
  it('renders domain cards for each domain', async () => {
    render(
      <TestWrapper>
        <BaselineInsightsClient
          classroomId="class-1"
          learnerId="learner-1"
          baseline={mockBaseline}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/ELA · 72%/)).toBeInTheDocument();
      expect(screen.getByText(/MATH · 58%/)).toBeInTheDocument();
      expect(screen.getByText(/SCIENCE · 66%/)).toBeInTheDocument();
    });
  });

  it('renders attempt timeline with retest reason', async () => {
    render(
      <TestWrapper>
        <BaselineInsightsClient
          classroomId="class-1"
          learnerId="learner-1"
          baseline={mockBaseline}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Attempt 1')).toBeInTheDocument();
      expect(screen.getByText('Attempt 2')).toBeInTheDocument();
      expect(screen.getByText(/Retest reason: DISTRACTED/)).toBeInTheDocument();
    });
  });

  it('renders learner name and grade band', async () => {
    render(
      <TestWrapper>
        <BaselineInsightsClient
          classroomId="class-1"
          learnerId="learner-1"
          baseline={mockBaseline}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Jordan Rivers/)).toBeInTheDocument();
      expect(screen.getByText(/Grade band: K5/)).toBeInTheDocument();
    });
  });

  it('renders CTA to Virtual Brain', async () => {
    render(
      <TestWrapper>
        <BaselineInsightsClient
          classroomId="class-1"
          learnerId="learner-1"
          baseline={mockBaseline}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /View Virtual Brain/i });
      expect(link).toHaveAttribute('href', '/classrooms/class-1/learners/learner-1/brain');
    });
  });

  it('export summary triggers download', async () => {
    const user = userEvent.setup();
    const mockCreateObjectURL = vi.fn(() => 'blob:test');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    render(
      <TestWrapper>
        <BaselineInsightsClient
          classroomId="class-1"
          learnerId="learner-1"
          baseline={mockBaseline}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    const exportBtn = screen.getByRole('button', { name: /Export Summary/i });
    await user.click(exportBtn);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });
});
