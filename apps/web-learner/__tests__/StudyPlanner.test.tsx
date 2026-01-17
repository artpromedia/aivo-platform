import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudyPlanner } from '../app/(learning)/executive-function/components/StudyPlanner';
import type { StudyPlan } from '../lib/executive-function-api';

describe('StudyPlanner', () => {
  const mockPlans: StudyPlan[] = [
    {
      id: 'plan-1',
      learnerId: 'learner-1',
      title: 'Algebra Final Prep',
      description: 'Comprehensive study plan for algebra final',
      startDate: '2026-01-16',
      endDate: '2026-02-01',
      sessions: [
        {
          id: 'session-1',
          planId: 'plan-1',
          title: 'Review Chapter 1',
          date: '2026-01-18',
          startTime: '14:00',
          endTime: '16:00',
          subject: 'Math',
          topics: ['Linear equations', 'Graphing'],
          materials: [],
          completed: false,
        },
        {
          id: 'session-2',
          planId: 'plan-1',
          title: 'Review Chapter 2',
          date: '2026-01-20',
          startTime: '14:00',
          endTime: '16:00',
          subject: 'Math',
          topics: ['Quadratics'],
          materials: [],
          completed: true,
        },
      ],
      goals: ['Master quadratic equations', 'Score above 90%'],
      status: 'active',
    },
    {
      id: 'plan-2',
      learnerId: 'learner-1',
      title: 'Science Project',
      startDate: '2026-01-20',
      endDate: '2026-02-15',
      sessions: [],
      goals: [],
      status: 'draft',
    },
  ];

  const mockOnUpdate = vi.fn();

  it('should display study plan statistics', () => {
    render(<StudyPlanner learnerId="learner-1" plans={mockPlans} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Active Plans')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
  });

  it('should display active plans', () => {
    render(<StudyPlanner learnerId="learner-1" plans={mockPlans} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Algebra Final Prep')).toBeInTheDocument();
    expect(screen.getByText(/Comprehensive study plan/)).toBeInTheDocument();
  });

  it('should show progress percentage', () => {
    render(<StudyPlanner learnerId="learner-1" plans={mockPlans} onUpdate={mockOnUpdate} />);

    // 1 of 2 sessions completed = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should display draft plans', () => {
    render(<StudyPlanner learnerId="learner-1" plans={mockPlans} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Science Project')).toBeInTheDocument();
    expect(screen.getByText(/0 sessions planned/)).toBeInTheDocument();
  });

  it('should show activate button for drafts', () => {
    render(<StudyPlanner learnerId="learner-1" plans={mockPlans} onUpdate={mockOnUpdate} />);

    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
  });

  it('should open create plan form', () => {
    render(<StudyPlanner learnerId="learner-1" plans={mockPlans} onUpdate={mockOnUpdate} />);

    const createButton = screen.getAllByText('+ New Study Plan')[0];
    fireEvent.click(createButton);

    expect(screen.getByText('New Study Plan')).toBeInTheDocument();
  });

  it('should show next upcoming session', () => {
    render(<StudyPlanner learnerId="learner-1" plans={mockPlans} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Next Session')).toBeInTheDocument();
    expect(screen.getByText('Review Chapter 1')).toBeInTheDocument();
  });

  it('should display plan goals', () => {
    render(<StudyPlanner learnerId="learner-1" plans={mockPlans} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Master quadratic equations')).toBeInTheDocument();
  });

  it('should open plan details when clicked', () => {
    render(<StudyPlanner learnerId="learner-1" plans={mockPlans} onUpdate={mockOnUpdate} />);

    const planCard = screen.getByText('Algebra Final Prep').closest('div');
    if (planCard) {
      fireEvent.click(planCard);
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    }
  });

  it('should show empty state when no plans', () => {
    render(<StudyPlanner learnerId="learner-1" plans={[]} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('No study plans yet')).toBeInTheDocument();
    expect(screen.getByText(/Create a study plan to organize/)).toBeInTheDocument();
  });
});
