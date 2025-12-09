import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Goal, SessionPlan, ProgressNote } from '../../../../../../lib/teacher-planning-api';
import { LearnerProfileProvider, type LearnerProfileContextValue } from '../context';
import { PlansNotesTab } from '../plans-notes-tab';

// Mock the API module
vi.mock('../../../../../../lib/teacher-planning-api', async () => {
  const actual = await vi.importActual('../../../../../../lib/teacher-planning-api');
  return {
    ...actual,
    createSessionPlan: vi.fn(),
    updateSessionPlan: vi.fn(),
    createProgressNote: vi.fn(),
  };
});

const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    tenantId: 'tenant-1',
    learnerId: 'learner-1',
    createdByUserId: 'user-1',
    title: 'Improve reading fluency',
    description: null,
    domain: 'ELA',
    skillId: null,
    startDate: '2025-01-01',
    targetDate: '2025-06-01',
    status: 'ACTIVE',
    progressRating: 2,
    metadataJson: null,
    visibility: 'ALL_EDUCATORS',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
];

const mockSessionPlans: SessionPlan[] = [
  {
    id: 'plan-1',
    tenantId: 'tenant-1',
    learnerId: 'learner-1',
    createdByUserId: 'user-1',
    sessionTemplateName: 'Reading Fluency Session',
    scheduledFor: '2025-12-10T10:00:00Z',
    estimatedDurationMinutes: 45,
    sessionType: 'LEARNING',
    status: 'PLANNED',
    sessionId: null,
    metadataJson: null,
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
  },
  {
    id: 'plan-2',
    tenantId: 'tenant-1',
    learnerId: 'learner-1',
    createdByUserId: 'user-1',
    sessionTemplateName: 'Math Practice',
    scheduledFor: '2025-12-12T14:00:00Z',
    estimatedDurationMinutes: 30,
    sessionType: 'PRACTICE',
    status: 'DRAFT',
    sessionId: null,
    metadataJson: null,
    createdAt: '2025-12-02T00:00:00Z',
    updatedAt: '2025-12-02T00:00:00Z',
  },
];

const mockProgressNotes: ProgressNote[] = [
  {
    id: 'note-1',
    tenantId: 'tenant-1',
    learnerId: 'learner-1',
    createdByUserId: 'user-1',
    sessionId: null,
    sessionPlanId: 'plan-1',
    goalId: 'goal-1',
    goalObjectiveId: null,
    noteText: 'Student read 68 WPM today with 2 errors. Showing improvement in expression.',
    rating: 3,
    evidenceUri: null,
    visibility: 'ALL_EDUCATORS',
    tags: [],
    createdAt: '2025-12-05T15:30:00Z',
    updatedAt: '2025-12-05T15:30:00Z',
  },
  {
    id: 'note-2',
    tenantId: 'tenant-1',
    learnerId: 'learner-1',
    createdByUserId: 'user-1',
    sessionId: null,
    sessionPlanId: null,
    goalId: null,
    goalObjectiveId: null,
    noteText: 'Great session! Student showed improved confidence when reading aloud.',
    rating: 4,
    evidenceUri: null,
    visibility: 'ALL_EDUCATORS',
    tags: [],
    createdAt: '2025-12-02T10:00:00Z',
    updatedAt: '2025-12-02T10:00:00Z',
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
    sessionPlans: mockSessionPlans,
    progressNotes: mockProgressNotes,
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

describe('PlansNotesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session Plans Section', () => {
    it('displays session plans list by default', async () => {
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Reading Fluency Session')).toBeInTheDocument();
        expect(screen.getByText('Math Practice')).toBeInTheDocument();
      });
    });

    it('displays session type badges', async () => {
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Learning')).toBeInTheDocument();
        expect(screen.getByText('Practice')).toBeInTheDocument();
      });
    });

    it('displays session status badges', async () => {
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Planned')).toBeInTheDocument();
        expect(screen.getByText('Draft')).toBeInTheDocument();
      });
    });

    it('displays scheduled date and duration', async () => {
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('45 min')).toBeInTheDocument();
        expect(screen.getByText('30 min')).toBeInTheDocument();
      });
    });

    it('shows empty state when no session plans exist', async () => {
      const context = createMockContext({ sessionPlans: [] });

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No session plans have been created yet.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create First Plan' })).toBeInTheDocument();
      });
    });

    it('opens create plan modal when clicking Create Plan button', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      const createButton = screen.getByRole('button', { name: '+ Create Plan' });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Create Session Plan')).toBeInTheDocument();
        expect(screen.getByLabelText(/Session Type/)).toBeInTheDocument();
      });
    });

    it('calls createSessionPlan when submitting new plan', async () => {
      const user = userEvent.setup();
      const refetchSessionPlans = vi.fn();
      const context = createMockContext({ refetchSessionPlans });

      const { createSessionPlan } = await import('../../../../../../lib/teacher-planning-api');
      const mockCreateSessionPlan = vi.mocked(createSessionPlan);
      mockCreateSessionPlan.mockResolvedValueOnce({
        id: 'plan-3',
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        createdByUserId: 'user-1',
        sessionTemplateName: 'New Session',
        scheduledFor: null,
        estimatedDurationMinutes: null,
        sessionType: 'THERAPY',
        status: 'DRAFT',
        sessionId: null,
        metadataJson: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      });

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      // Open modal
      const createButton = screen.getByRole('button', { name: '+ Create Plan' });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill form
      const typeSelect = screen.getByLabelText(/Session Type/);
      await user.selectOptions(typeSelect, 'THERAPY');

      const nameInput = screen.getByLabelText(/Session Name/);
      await user.type(nameInput, 'New Session');

      // Submit
      const submitButton = screen.getByRole('button', { name: 'Create Plan' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSessionPlan).toHaveBeenCalledWith(
          'learner-1',
          expect.objectContaining({
            sessionType: 'THERAPY',
            templateName: 'New Session',
          })
        );
        expect(refetchSessionPlans).toHaveBeenCalled();
      });
    });
  });

  describe('Progress Notes Section', () => {
    it('switches to notes view when clicking Progress Notes toggle', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      const notesToggle = screen.getByRole('button', { name: /Progress Notes/i });
      await user.click(notesToggle);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Progress Notes' })).toBeInTheDocument();
      });
    });

    it('notes timeline renders from mocked API', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      // Switch to notes view
      const notesToggle = screen.getByRole('button', { name: /Progress Notes/i });
      await user.click(notesToggle);

      await waitFor(() => {
        expect(
          screen.getByText(
            'Student read 68 WPM today with 2 errors. Showing improvement in expression.'
          )
        ).toBeInTheDocument();
        expect(
          screen.getByText('Great session! Student showed improved confidence when reading aloud.')
        ).toBeInTheDocument();
      });
    });

    it('displays goal badges for notes linked to goals', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      // Switch to notes view
      const notesToggle = screen.getByRole('button', { name: /Progress Notes/i });
      await user.click(notesToggle);

      await waitFor(() => {
        expect(screen.getByText('Improve reading fluency')).toBeInTheDocument();
      });
    });

    it('shows empty state when no notes exist', async () => {
      const user = userEvent.setup();
      const context = createMockContext({ progressNotes: [] });

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      // Switch to notes view
      const notesToggle = screen.getByRole('button', { name: /Progress Notes/i });
      await user.click(notesToggle);

      await waitFor(() => {
        expect(screen.getByText('No progress notes have been recorded yet.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add First Note' })).toBeInTheDocument();
      });
    });

    it('opens add note modal when clicking Add Note button', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      // Switch to notes view
      const notesToggle = screen.getByRole('button', { name: /Progress Notes/i });
      await user.click(notesToggle);

      const addButton = screen.getByRole('button', { name: '+ Add Note' });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Add Progress Note')).toBeInTheDocument();
        expect(screen.getByLabelText(/Note/)).toBeInTheDocument();
      });
    });

    it('calls createProgressNote when submitting new note', async () => {
      const user = userEvent.setup();
      const refetchProgressNotes = vi.fn();
      const context = createMockContext({ refetchProgressNotes });

      const { createProgressNote } = await import('../../../../../../lib/teacher-planning-api');
      const mockCreateProgressNote = vi.mocked(createProgressNote);
      mockCreateProgressNote.mockResolvedValueOnce({
        id: 'note-3',
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        createdByUserId: 'user-1',
        sessionId: null,
        sessionPlanId: null,
        goalId: null,
        goalObjectiveId: null,
        noteText: 'New progress note text',
        rating: null,
        evidenceUri: null,
        visibility: 'ALL_EDUCATORS',
        tags: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      });

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      // Switch to notes view
      const notesToggle = screen.getByRole('button', { name: /Progress Notes/i });
      await user.click(notesToggle);

      // Open modal
      const addButton = screen.getByRole('button', { name: '+ Add Note' });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill form
      const noteInput = screen.getByLabelText(/Note/);
      await user.type(noteInput, 'New progress note text');

      // Submit
      const submitButton = screen.getByRole('button', { name: 'Add Note' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateProgressNote).toHaveBeenCalledWith(
          expect.objectContaining({
            learnerId: 'learner-1',
            noteText: 'New progress note text',
          })
        );
        expect(refetchProgressNotes).toHaveBeenCalled();
      });
    });

    it('disables submit button when note text is empty', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      // Switch to notes view
      const notesToggle = screen.getByRole('button', { name: /Progress Notes/i });
      await user.click(notesToggle);

      // Open modal
      const addButton = screen.getByRole('button', { name: '+ Add Note' });
      await user.click(addButton);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Add Note' });
        expect(submitButton).toBeDisabled();
      });
    });

    it('allows selecting rating when adding note', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      // Switch to notes view
      const notesToggle = screen.getByRole('button', { name: /Progress Notes/i });
      await user.click(notesToggle);

      // Open modal
      const addButton = screen.getByRole('button', { name: '+ Add Note' });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click rating button
      const ratingButton = screen.getByRole('button', { name: 'Rating 3' });
      await user.click(ratingButton);

      await waitFor(() => {
        expect(screen.getByText('Good')).toBeInTheDocument();
      });
    });

    it('displays notes sorted by date (newest first)', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      // Switch to notes view
      const notesToggle = screen.getByRole('button', { name: /Progress Notes/i });
      await user.click(notesToggle);

      await waitFor(() => {
        const noteCards =
          screen.getAllByRole('article', { hidden: true }).length > 0
            ? screen.getAllByRole('article', { hidden: true })
            : document.querySelectorAll('[class*="Card"]');

        // The first note should be the most recent (note-1 from Dec 5)
        const allText = document.body.textContent || '';
        const dec5Index = allText.indexOf('Student read 68 WPM');
        const dec2Index = allText.indexOf('Great session!');

        // Dec 5 note should appear before Dec 2 note
        expect(dec5Index).toBeLessThan(dec2Index);
      });
    });
  });

  describe('Section Toggle', () => {
    it('shows correct counts in toggle buttons', async () => {
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Session Plans \(2\)/)).toBeInTheDocument();
        expect(screen.getByText(/Progress Notes \(2\)/)).toBeInTheDocument();
      });
    });

    it('highlights active section toggle', async () => {
      const user = userEvent.setup();
      const context = createMockContext();

      render(
        <TestWrapper contextValue={context}>
          <PlansNotesTab />
        </TestWrapper>
      );

      // Plans should be active by default
      const plansButton = screen.getByRole('button', { name: /Session Plans/i });
      expect(plansButton).toHaveClass('bg-primary');

      // Switch to notes
      const notesButton = screen.getByRole('button', { name: /Progress Notes/i });
      await user.click(notesButton);

      await waitFor(() => {
        expect(notesButton).toHaveClass('bg-primary');
        expect(plansButton).not.toHaveClass('bg-primary');
      });
    });
  });
});
