import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressDashboard } from './ProgressDashboard';
import { GoalProgress } from './GoalProgress';
import { LearningCard } from './LearningCard';
import { StreakDisplay } from './StreakDisplay';
import type { DailyGoal, LearningLesson, Achievement } from '../../types';

const mockGoals: DailyGoal[] = [
  { id: 'g1', title: 'Complete 2 lessons', current: 1, target: 2, emoji: '📖' },
  { id: 'g2', title: 'Earn 100 XP', current: 75, target: 100, emoji: '⭐' },
];

const mockLessons: LearningLesson[] = [
  {
    id: 'lesson-1',
    courseId: 'math-101',
    title: 'Multiplying Fractions',
    courseName: 'Math 5',
    progress: 65,
    thumbnail: '🧮',
    estimatedTime: '15 min',
  },
];

const mockAchievements: Achievement[] = [
  { id: 'a1', title: 'First Steps', emoji: '👣', earned: true },
  { id: 'a2', title: 'Math Whiz', emoji: '🧠', earned: false },
];

describe('ProgressDashboard', () => {
  it('renders greeting with first name', () => {
    render(
      <ProgressDashboard
        firstName="Alex"
        dailyGoals={mockGoals}
        continueLearning={mockLessons}
        achievements={mockAchievements}
        streak={5}
      />
    );

    expect(screen.getByText(/Alex/)).toBeInTheDocument();
  });

  it('displays daily goals', () => {
    render(
      <ProgressDashboard
        firstName="Alex"
        dailyGoals={mockGoals}
        continueLearning={mockLessons}
        achievements={mockAchievements}
        streak={5}
      />
    );

    expect(screen.getByText('Complete 2 lessons')).toBeInTheDocument();
    expect(screen.getByText('Earn 100 XP')).toBeInTheDocument();
  });

  it('displays continue learning section', () => {
    render(
      <ProgressDashboard
        firstName="Alex"
        dailyGoals={mockGoals}
        continueLearning={mockLessons}
        achievements={mockAchievements}
        streak={5}
      />
    );

    expect(screen.getByText('Continue Learning')).toBeInTheDocument();
    expect(screen.getByText('Multiplying Fractions')).toBeInTheDocument();
  });

  it('calls onLessonClick when lesson is clicked', () => {
    const onLessonClick = vi.fn();
    render(
      <ProgressDashboard
        firstName="Alex"
        dailyGoals={mockGoals}
        continueLearning={mockLessons}
        achievements={mockAchievements}
        streak={5}
        onLessonClick={onLessonClick}
      />
    );

    const lessonCard = screen.getByText('Multiplying Fractions').closest('[role="button"]');
    fireEvent.click(lessonCard!);

    expect(onLessonClick).toHaveBeenCalledWith('lesson-1', 'math-101');
  });

  it('displays streak', () => {
    render(
      <ProgressDashboard
        firstName="Alex"
        dailyGoals={mockGoals}
        continueLearning={mockLessons}
        achievements={mockAchievements}
        streak={5}
      />
    );

    expect(screen.getByText('5 Days')).toBeInTheDocument();
    expect(screen.getByText('Learning Streak!')).toBeInTheDocument();
  });
});

describe('GoalProgress', () => {
  it('renders goal with progress', () => {
    const goal: DailyGoal = {
      id: 'g1',
      title: 'Complete lessons',
      current: 2,
      target: 4,
      emoji: '📖',
    };

    render(<GoalProgress goal={goal} />);

    expect(screen.getByText('Complete lessons')).toBeInTheDocument();
    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.getByText('📖')).toBeInTheDocument();
  });
});

describe('LearningCard', () => {
  it('displays lesson info', () => {
    render(<LearningCard lesson={mockLessons[0]} />);

    expect(screen.getByText('Multiplying Fractions')).toBeInTheDocument();
    expect(screen.getByText('Math 5')).toBeInTheDocument();
    expect(screen.getByText('15 min')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('handles click', () => {
    const onClick = vi.fn();
    render(<LearningCard lesson={mockLessons[0]} onClick={onClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledWith('lesson-1', 'math-101');
  });
});

describe('StreakDisplay', () => {
  it('displays streak count', () => {
    render(<StreakDisplay streak={7} />);

    expect(screen.getByText('7 Days')).toBeInTheDocument();
    expect(screen.getByText('Learning Streak!')).toBeInTheDocument();
  });

  it('shows fire emoji', () => {
    render(<StreakDisplay streak={5} />);

    expect(screen.getByText('🔥')).toBeInTheDocument();
  });
});
