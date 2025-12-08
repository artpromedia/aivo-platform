import { AccessibilityProvider } from '@aivo/ui-web';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { VirtualBrainClient } from '../view-client';

import type { VirtualBrainSummary, SkillStateView } from '@/lib/learner-insights';

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}

const mockSkills: SkillStateView[] = [
  {
    id: 'ss-ela-1',
    skillCode: 'ELA_PHONEMIC_AWARENESS',
    displayName: 'Phonemic Awareness',
    domain: 'ELA',
    masteryLevel: 0.82,
    practiceCount: 22,
    correctStreak: 5,
  },
  {
    id: 'ss-ela-2',
    skillCode: 'ELA_READING_FLUENCY',
    displayName: 'Reading Fluency',
    domain: 'ELA',
    masteryLevel: 0.44,
    practiceCount: 14,
    correctStreak: 2,
  },
  {
    id: 'ss-math-1',
    skillCode: 'MATH_COUNTING',
    displayName: 'Counting and Cardinality',
    domain: 'MATH',
    masteryLevel: 0.91,
    practiceCount: 30,
    correctStreak: 7,
  },
  {
    id: 'ss-math-2',
    skillCode: 'MATH_ADDITION',
    displayName: 'Addition Within 20',
    domain: 'MATH',
    masteryLevel: 0.36,
    practiceCount: 10,
    correctStreak: 1,
  },
  {
    id: 'ss-speech-1',
    skillCode: 'SPEECH_ARTICULATION',
    displayName: 'Articulation',
    domain: 'SPEECH',
    masteryLevel: 0.41,
    practiceCount: 6,
    correctStreak: 1,
  },
  {
    id: 'ss-sel-1',
    skillCode: 'SEL_SELF_AWARENESS',
    displayName: 'Self-Awareness',
    domain: 'SEL',
    masteryLevel: 0.64,
    practiceCount: 9,
    correctStreak: 3,
  },
];

const mockBrain: VirtualBrainSummary = {
  id: 'vb-learner-1',
  learnerId: 'learner-1',
  gradeBand: 'K5',
  tenantId: 'tenant-1',
  summary: {
    byDomain: {
      ELA: { count: 2, avgMastery: 0.63 },
      MATH: { count: 2, avgMastery: 0.64 },
      SPEECH: { count: 1, avgMastery: 0.41 },
      SEL: { count: 1, avgMastery: 0.64 },
    },
  },
  skillStates: mockSkills,
};

describe('VirtualBrainClient', () => {
  it('renders strengths (top 3 highest mastery)', async () => {
    render(
      <TestWrapper>
        <VirtualBrainClient
          classroomId="class-1"
          learnerId="learner-1"
          brain={mockBrain}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    await waitFor(() => {
      // Top 3: Counting and Cardinality (0.91), Phonemic Awareness (0.82), Self-Awareness (0.64)
      const strengthsList = screen.getByRole('list', { name: /Highest mastery skills/i });
      expect(strengthsList).toBeInTheDocument();
      expect(screen.getAllByText('Counting and Cardinality').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Phonemic Awareness').length).toBeGreaterThan(0);
    });
  });

  it('renders focus areas (bottom 3 lowest mastery)', async () => {
    render(
      <TestWrapper>
        <VirtualBrainClient
          classroomId="class-1"
          learnerId="learner-1"
          brain={mockBrain}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    await waitFor(() => {
      // Bottom 3: Addition Within 20 (0.36), Articulation (0.41), Reading Fluency (0.44)
      const focusList = screen.getByRole('list', { name: /Skills needing support/i });
      expect(focusList).toBeInTheDocument();
      expect(screen.getAllByText('Addition Within 20').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Articulation').length).toBeGreaterThan(0);
    });
  });

  it('renders domain summary cards', async () => {
    render(
      <TestWrapper>
        <VirtualBrainClient
          classroomId="class-1"
          learnerId="learner-1"
          brain={mockBrain}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('ELA').length).toBeGreaterThan(0);
      expect(screen.getAllByText('MATH').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SPEECH').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SEL').length).toBeGreaterThan(0);
    });
  });

  it('renders skill cards with mastery bars', async () => {
    render(
      <TestWrapper>
        <VirtualBrainClient
          classroomId="class-1"
          learnerId="learner-1"
          brain={mockBrain}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    await waitFor(() => {
      // Each skill should have a card
      mockSkills.forEach((skill) => {
        expect(screen.getAllByText(skill.displayName).length).toBeGreaterThan(0);
      });
    });
  });

  it('renders CTA to Baseline Results', async () => {
    render(
      <TestWrapper>
        <VirtualBrainClient
          classroomId="class-1"
          learnerId="learner-1"
          brain={mockBrain}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /View Baseline/i });
      expect(link).toHaveAttribute('href', '/classrooms/class-1/learners/learner-1/baseline');
    });
  });

  it('export brain triggers download', async () => {
    const user = userEvent.setup();
    const mockCreateObjectURL = vi.fn(() => 'blob:test');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    render(
      <TestWrapper>
        <VirtualBrainClient
          classroomId="class-1"
          learnerId="learner-1"
          brain={mockBrain}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    const exportBtn = screen.getByRole('button', { name: /Export Brain/i });
    await user.click(exportBtn);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('renders skill graph with domain groupings', async () => {
    render(
      <TestWrapper>
        <VirtualBrainClient
          classroomId="class-1"
          learnerId="learner-1"
          brain={mockBrain}
          gradeBand="K5"
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const skillGraph = screen.getByRole('list', { name: /Skills grouped by domain/i });
      expect(skillGraph).toBeInTheDocument();
    });
  });
});
