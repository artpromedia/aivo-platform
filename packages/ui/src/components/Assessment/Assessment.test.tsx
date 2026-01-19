import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssessmentCard } from './AssessmentCard';
import { QuestionRenderer } from './QuestionRenderer';
import { ProgressIndicator } from './ProgressIndicator';
import { GameBreak } from './GameBreak';
import type { DomainInfo, AssessmentQuestion } from '../../types';

const mockDomain: DomainInfo = {
  id: 'MATH',
  name: 'Math',
  emoji: '🧮',
  description: 'Number sense and operations',
  color: 'from-blue-500 to-cyan-500',
};

const mockQuestion: AssessmentQuestion = {
  id: 'math-1',
  domain: 'MATH',
  skillCode: 'MATH_NUMBER_SENSE',
  questionType: 'MULTIPLE_CHOICE',
  questionText: 'What is 7 + 5?',
  options: ['10', '11', '12', '13'],
  difficulty: 2,
  questionNumber: 1,
};

describe('AssessmentCard', () => {
  it('renders domain info', () => {
    render(<AssessmentCard domain={mockDomain} />);

    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('🧮')).toBeInTheDocument();
  });

  it('shows progress for progress variant', () => {
    render(
      <AssessmentCard
        domain={mockDomain}
        variant="progress"
        answeredCount={3}
        totalQuestions={5}
      />
    );

    expect(screen.getByText('3/5 questions')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('shows complete indicator for complete variant', () => {
    render(<AssessmentCard domain={mockDomain} variant="complete" />);

    expect(screen.getByText('✓ Complete')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<AssessmentCard domain={mockDomain} onClick={onClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalled();
  });
});

describe('QuestionRenderer', () => {
  it('renders question text', () => {
    render(
      <QuestionRenderer
        question={mockQuestion}
        domain={mockDomain}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={vi.fn()}
      />
    );

    expect(screen.getByText('What is 7 + 5?')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(
      <QuestionRenderer
        question={mockQuestion}
        domain={mockDomain}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={vi.fn()}
      />
    );

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
  });

  it('shows question progress', () => {
    render(
      <QuestionRenderer
        question={mockQuestion}
        domain={mockDomain}
        questionNumber={3}
        totalQuestions={5}
        onAnswer={vi.fn()}
      />
    );

    expect(screen.getByText(/Question 3 of 5/)).toBeInTheDocument();
  });

  it('calls onAnswer when option is clicked', () => {
    const onAnswer = vi.fn();
    render(
      <QuestionRenderer
        question={mockQuestion}
        domain={mockDomain}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={onAnswer}
      />
    );

    const option = screen.getByText('12').closest('button');
    fireEvent.click(option!);

    expect(onAnswer).toHaveBeenCalledWith(2); // Index of '12'
  });
});

describe('ProgressIndicator', () => {
  it('shows progress percentage', () => {
    render(<ProgressIndicator progress={50} />);

    expect(screen.getByText('50% complete')).toBeInTheDocument();
  });

  it('shows label when provided', () => {
    render(<ProgressIndicator progress={75} label="Getting to know you..." />);

    expect(screen.getByText('Getting to know you...')).toBeInTheDocument();
    expect(screen.getByText('75% complete')).toBeInTheDocument();
  });

  it('hides percentage when showPercentage is false', () => {
    render(<ProgressIndicator progress={50} showPercentage={false} />);

    expect(screen.queryByText('50% complete')).not.toBeInTheDocument();
  });
});

describe('GameBreak', () => {
  it('renders break activity info', () => {
    render(
      <GameBreak
        activity={{
          emoji: '🎈',
          title: 'Balloon Breath!',
          instruction: 'Take a deep breath',
          duration: 8,
        }}
        countdown={5}
        onSkip={vi.fn()}
      />
    );

    expect(screen.getByText('Balloon Breath!')).toBeInTheDocument();
    expect(screen.getByText('Take a deep breath')).toBeInTheDocument();
    expect(screen.getByText('🎈')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows message when provided', () => {
    render(
      <GameBreak
        activity={{
          emoji: '🎈',
          title: 'Balloon Breath!',
          instruction: 'Take a deep breath',
          duration: 8,
        }}
        countdown={5}
        message="You completed Math!"
        onSkip={vi.fn()}
      />
    );

    expect(screen.getByText('You completed Math!')).toBeInTheDocument();
  });

  it('calls onSkip when skip is clicked', () => {
    const onSkip = vi.fn();
    render(
      <GameBreak
        activity={{
          emoji: '🎈',
          title: 'Balloon Breath!',
          instruction: 'Take a deep breath',
          duration: 8,
        }}
        countdown={5}
        onSkip={onSkip}
      />
    );

    const skipButton = screen.getByText('Skip break →');
    fireEvent.click(skipButton);

    expect(onSkip).toHaveBeenCalled();
  });
});
