import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubjectTemplate } from '../SubjectTemplate';
import type { SubjectInfo, Lesson, SubjectProgress } from '../../../systems/subjects/types';

// Mock data
const mockSubject: SubjectInfo = {
  id: 'k5-math',
  name: 'Math',
  emoji: '🔢',
  description: 'Numbers, shapes, and problem-solving',
  color: 'from-blue-400 to-blue-600',
  gradeLevel: 'K5',
  category: 'math',
};

const mockLessons: Lesson[] = [
  {
    id: 'lesson-1',
    subjectId: 'k5-math',
    title: 'Introduction to Numbers',
    description: 'Learn about counting and numbers',
    orderIndex: 0,
    durationMinutes: 15,
    type: 'interactive',
    objectives: ['Count to 10', 'Recognize numbers'],
    content: { type: 'interactive' },
  },
  {
    id: 'lesson-2',
    subjectId: 'k5-math',
    title: 'Addition Basics',
    description: 'Learn how to add numbers',
    orderIndex: 1,
    durationMinutes: 20,
    type: 'video',
    objectives: ['Add single digits', 'Understand sums'],
    content: { type: 'video' },
  },
  {
    id: 'lesson-3',
    subjectId: 'k5-math',
    title: 'Subtraction Basics',
    description: 'Learn how to subtract numbers',
    orderIndex: 2,
    durationMinutes: 20,
    type: 'practice',
    objectives: ['Subtract single digits'],
    content: { type: 'practice' },
  },
];

const mockProgress: SubjectProgress = {
  subjectId: 'k5-math',
  learnerId: 'learner-123',
  lessonsCompleted: 1,
  totalLessons: 3,
  overallProgress: 33,
  currentLessonId: 'lesson-2',
  scores: [
    { lessonId: 'lesson-1', score: 85, completedAt: '2024-01-15T10:00:00Z', attempts: 1 },
  ],
  timeSpentMinutes: 20,
  lastAccessedAt: '2024-01-15T10:30:00Z',
  masteryLevel: 'in_progress',
};

describe('SubjectTemplate', () => {
  it('renders subject information', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        learnerId="learner-123"
      />
    );

    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Numbers, shapes, and problem-solving')).toBeInTheDocument();
    expect(screen.getByText('🔢')).toBeInTheDocument();
  });

  it('displays all lessons', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        learnerId="learner-123"
      />
    );

    expect(screen.getByText('Introduction to Numbers')).toBeInTheDocument();
    expect(screen.getByText('Addition Basics')).toBeInTheDocument();
    expect(screen.getByText('Subtraction Basics')).toBeInTheDocument();
  });

  it('shows lesson duration', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        learnerId="learner-123"
      />
    );

    expect(screen.getByText('⏱️ 15 min')).toBeInTheDocument();
    expect(screen.getAllByText('⏱️ 20 min')).toHaveLength(2);
  });

  it('displays progress statistics when provided', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        progress={mockProgress}
        learnerId="learner-123"
      />
    );

    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('20m')).toBeInTheDocument();
  });

  it('marks completed lessons', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        progress={mockProgress}
        learnerId="learner-123"
      />
    );

    // The first lesson should show a checkmark
    const completedIndicators = screen.getAllByText('✓');
    expect(completedIndicators.length).toBeGreaterThan(0);
  });

  it('highlights current lesson', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        progress={mockProgress}
        learnerId="learner-123"
      />
    );

    expect(screen.getByText('▶️ Continue where you left off')).toBeInTheDocument();
  });

  it('calls onLessonSelect when lesson is clicked', () => {
    const onLessonSelect = vi.fn();

    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        progress={mockProgress}
        learnerId="learner-123"
        onLessonSelect={onLessonSelect}
      />
    );

    // Click on the second lesson (current lesson)
    const lessonCard = screen.getByText('Addition Basics').closest('div');
    if (lessonCard) {
      fireEvent.click(lessonCard);
      expect(onLessonSelect).toHaveBeenCalledWith('lesson-2');
    }
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();

    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        learnerId="learner-123"
        onBack={onBack}
      />
    );

    const backButton = screen.getByRole('button', { name: '' }); // SVG button
    // Find the back button by its container
    const buttons = document.querySelectorAll('button');
    const backBtn = Array.from(buttons).find(btn => btn.innerHTML.includes('M15 19l-7-7 7-7'));
    if (backBtn) {
      fireEvent.click(backBtn);
      expect(onBack).toHaveBeenCalled();
    }
  });

  it('switches between tabs', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        progress={mockProgress}
        learnerId="learner-123"
      />
    );

    // Default tab is lessons
    expect(screen.getByText('Introduction to Numbers')).toBeInTheDocument();

    // Switch to progress tab
    fireEvent.click(screen.getByText('📊 Progress'));
    expect(screen.getByText('📊 Learning Stats')).toBeInTheDocument();

    // Switch to resources tab
    fireEvent.click(screen.getByText('🔗 Resources'));
    expect(screen.getByText('🔗 Additional Resources')).toBeInTheDocument();
  });

  it('toggles focus mode', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        learnerId="learner-123"
      />
    );

    const focusButton = screen.getByText('🧘 Enable Focus');
    fireEvent.click(focusButton);

    expect(screen.getByText('🎯 Focus Mode')).toBeInTheDocument();
  });

  it('displays lesson type badges', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        learnerId="learner-123"
      />
    );

    expect(screen.getByText('🖱️ Interactive')).toBeInTheDocument();
    expect(screen.getByText('🎬 Video')).toBeInTheDocument();
    expect(screen.getByText('📝 Practice')).toBeInTheDocument();
  });

  it('shows score for completed lessons', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        progress={mockProgress}
        learnerId="learner-123"
      />
    );

    expect(screen.getByText('Score: 85%')).toBeInTheDocument();
  });

  it('renders children in content slot', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        learnerId="learner-123"
      >
        <div data-testid="custom-content">Custom Content</div>
      </SubjectTemplate>
    );

    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });

  it('handles empty progress gracefully', () => {
    render(
      <SubjectTemplate
        subject={mockSubject}
        lessons={mockLessons}
        progress={null}
        learnerId="learner-123"
      />
    );

    // Should show 0% progress
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0/3')).toBeInTheDocument();
  });
});
