import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Goal, GoalObjective } from '../../../../../../lib/teacher-planning-api';
import { LearnerProfileProvider, type LearnerProfileContextValue } from '../context';
import { GoalsTab } from '../goals-tab';

// Mock the API module
vi.mock('../../../../../../lib/teacher-planning-api', async () => {
  const actual = await vi.importActual('../../../../../../lib/teacher-planning-api');
  return {
    ...actual,
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    createObjective: vi.fn(),
    updateObjective: vi.fn(),
  };
});

const mockObjectives: GoalObjective[] = [
  {
    id: 'obj-1',
    goalId: 'goal-1',
    description: 'Read 50 WPM with less than 3 errors',
    successCriteria: '3 consecutive sessions meeting criteria',
    status: 'MET',
    progressRating: 4,
    orderIndex: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'obj-2',
    goalId: 'goal-1',
    description: 'Read 75 WPM with less than 3 errors',
    successCriteria: '3 consecutive sessions meeting criteria',
    status: 'IN_PROGRESS',
    progressRating: 2,
    orderIndex: 1,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-02-15T00:00:00Z',
  },
];

const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    tenantId: 'tenant-1',
    learnerId: 'learner-1',
    createdByUserId: 'user-1',
    title: 'Improve reading fluency to grade level',
    description: 'Student will read grade-level text with 95% accuracy',
    domain: 'ELA',
    skillId: 'skill-reading-fluency',
    startDate: '2025-01-01',
    targetDate: '2025-06-01',
    status: 'ACTIVE',
    progressRating: 2,
    metadataJson: null,
    visibility: 'ALL_EDUCATORS',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    objectives: mockObjectives,
    skill: { id: 'skill-reading-fluency', name: 'Reading Fluency' },
  },
  {
    id: 'goal-2',
    tenantId: 'tenant-1',
    learnerId: 'learner-1',
    createdByUserId: 'user-1',
    title: 'Master multiplication facts 1-12',
    description: 'Student will recall multiplication facts within 3 seconds',
    domain: 'MATH',
    skillId: 'skill-mult-facts',
    startDate: '2025-01-15',
    targetDate: '2025-05-15',
    status: 'DRAFT',
    progressRating: 1,
    metadataJson: null,
    visibility: 'ALL_EDUCATORS',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-20T00:00:00Z',
    objectives: [],
    skill: { id: 'skill-mult-facts', name: 'Multiplication Facts' },
  },
];

function createMockContext(
  overrides: Partial<LearnerProfileContextValue> = {}
): LearnerProfileContextValue {
  return {
    learner: {
      id: 'learner-1',
      name: 'Jordan Rivers',
      grade: 4,
      tenantId: 'tenant-1',
    },
    classroomId: 'class-1',
    baseline: null,
    virtualBrain: null,
    goals: mockGoals,
    sessionPlans: [],
    progressNotes: [],
    refetchGoals: vi.fn(),
    refetchSessionPlans: vi.fn(),
    refetchProgressNotes: vi.fn(),
    ...overrides,
  };
}

function TestWrapper({
  children,
  contextValue,
}: {
  children: React.ReactNode;
  contextValue: LearnerProfileContextValue;
}) {
  return <LearnerProfileProvider value={contextValue}>{children}</LearnerProfileProvider>;
}

describe('GoalsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('displays list of goals from mocked API', () => {
    it('renders all goals with their titles', async () => {
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Improve reading fluency to grade level')).toBeInTheDocument();
        expect(screen.getByText('Master multiplication facts 1-12')).toBeInTheDocument();
      });
    });

    it('displays goals grouped by status', async () => {
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Active Goals (1)')).toBeInTheDocument();
        expect(screen.getByText('Draft Goals (1)')).toBeInTheDocument();
      });
    });

    it('displays domain badges for each goal', async () => {
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      await waitFor(() => {
        const elaBadges = screen.getAllByText('ELA');
        const mathBadges = screen.getAllByText('MATH');
        expect(elaBadges.length).toBeGreaterThan(0);
        expect(mathBadges.length).toBeGreaterThan(0);
      });
    });

    it('shows empty state when no goals exist', async () => {
      const context = createMockContext({ goals: [] });

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.getByText('No goals have been created for this learner yet.')
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create First Goal' })).toBeInTheDocument();
      });
    });

    it('displays objective count for goals with objectives', async () => {
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('1/2 objectives met')).toBeInTheDocument();
      });
    });
  });

  describe('expand/collapse objectives', () => {
    it('expands objectives when clicking expand button', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      // Initially objectives should not be visible
      expect(screen.queryByText('Read 50 WPM with less than 3 errors')).not.toBeInTheDocument();

      // Click expand button
      const expandButtons = screen.getAllByRole('button', { name: /expand objectives/i });
      const expandButton = expandButtons[0];
      expect(expandButton).toBeDefined();
      await user.click(expandButton!);

      // Objectives should now be visible
      await waitFor(() => {
        expect(screen.getByText('Read 50 WPM with less than 3 errors')).toBeInTheDocument();
        expect(screen.getByText('Read 75 WPM with less than 3 errors')).toBeInTheDocument();
      });
    });

    it('collapses objectives when clicking collapse button', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      // Expand first
      const expandButtons = screen.getAllByRole('button', { name: /expand objectives/i });
      await user.click(expandButtons[0]!);

      await waitFor(() => {
        expect(screen.getByText('Read 50 WPM with less than 3 errors')).toBeInTheDocument();
      });

      // Collapse
      const collapseButtons = screen.getAllByRole('button', { name: /collapse objectives/i });
      await user.click(collapseButtons[0]!);

      await waitFor(() => {
        expect(screen.queryByText('Read 50 WPM with less than 3 errors')).not.toBeInTheDocument();
      });
    });

    it('shows objective status badges when expanded', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      const expandButtons = screen.getAllByRole('button', { name: /expand objectives/i });
      await user.click(expandButtons[0]!);

      await waitFor(() => {
        expect(screen.getByText('Met')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });
  });

  describe('adding a goal updates the list', () => {
    it('opens add goal modal when clicking Add Goal button', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      const addButton = screen.getByRole('button', { name: '+ Add Goal' });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Add New Goal')).toBeInTheDocument();
        expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Domain/)).toBeInTheDocument();
      });
    });

    it('closes modal when clicking Cancel', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      // Open modal
      const addButton = screen.getByRole('button', { name: '+ Add Goal' });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('calls createGoal and refetchGoals when submitting new goal', async () => {
      const user = userEvent.setup();
      const refetchGoals = vi.fn();
      const context = createMockContext({ refetchGoals });

      const { createGoal } = await import('../../../../../../lib/teacher-planning-api');
      const mockCreateGoal = vi.mocked(createGoal);
      mockCreateGoal.mockResolvedValueOnce({
        id: 'goal-3',
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        createdByUserId: 'user-1',
        title: 'New Test Goal',
        description: null,
        domain: 'SCIENCE',
        skillId: null,
        startDate: '2025-01-01',
        targetDate: null,
        status: 'DRAFT',
        progressRating: null,
        metadataJson: null,
        visibility: 'ALL_EDUCATORS',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      });

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      // Open modal
      const addButton = screen.getByRole('button', { name: '+ Add Goal' });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill form
      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, 'New Test Goal');

      const domainSelect = screen.getByLabelText(/Domain/);
      await user.selectOptions(domainSelect, 'SCIENCE');

      // Submit
      const submitButton = screen.getByRole('button', { name: 'Create Goal' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateGoal).toHaveBeenCalledWith(
          'learner-1',
          expect.objectContaining({
            title: 'New Test Goal',
            domain: 'SCIENCE',
          })
        );
        expect(refetchGoals).toHaveBeenCalled();
      });
    });

    it('disables submit button when title is empty', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      // Open modal
      const addButton = screen.getByRole('button', { name: '+ Add Goal' });
      await user.click(addButton);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Create Goal' });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('editing goals', () => {
    it('opens edit modal when clicking Edit Goal button', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      // Expand goal to see edit button
      const expandButtons = screen.getAllByRole('button', { name: /expand objectives/i });
      await user.click(expandButtons[0]!);

      const editButton = screen.getByRole('button', { name: 'Edit Goal' });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Edit Goal')).toBeInTheDocument();
      });
    });
  });

  describe('adding objectives', () => {
    it('opens add objective modal when clicking Add Objective button', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      // Expand goal to see add objective button
      const expandButtons = screen.getAllByRole('button', { name: /expand objectives/i });
      await user.click(expandButtons[0]!);

      const addObjectiveButton = screen.getByRole('button', { name: '+ Add Objective' });
      await user.click(addObjectiveButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Add Objective')).toBeInTheDocument();
      });
    });

    it('calls createObjective when submitting new objective', async () => {
      const user = userEvent.setup();
      const refetchGoals = vi.fn();
      const context = createMockContext({ refetchGoals });

      const { createObjective } = await import('../../../../../../lib/teacher-planning-api');
      const mockCreateObjective = vi.mocked(createObjective);
      mockCreateObjective.mockResolvedValueOnce({
        id: 'obj-3',
        goalId: 'goal-1',
        description: 'New objective description',
        successCriteria: null,
        status: 'NOT_STARTED',
        progressRating: null,
        orderIndex: 2,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      });

      render(
        <TestWrapper contextValue={context}>
          <GoalsTab />
        </TestWrapper>
      );

      // Expand goal
      const expandButtons = screen.getAllByRole('button', { name: /expand objectives/i });
      await user.click(expandButtons[0]!);

      // Open add objective modal
      const addObjectiveButton = screen.getByRole('button', { name: '+ Add Objective' });
      await user.click(addObjectiveButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill form
      const descriptionInput = screen.getByLabelText(/Description/);
      await user.type(descriptionInput, 'New objective description');

      // Submit
      const submitButton = screen.getByRole('button', { name: 'Add Objective' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateObjective).toHaveBeenCalledWith(
          'goal-1',
          expect.objectContaining({
            description: 'New objective description',
          })
        );
        expect(refetchGoals).toHaveBeenCalled();
      });
    });
  });
});
