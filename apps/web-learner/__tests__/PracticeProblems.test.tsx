import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PracticeProblems } from '../app/(learning)/math-support/components/PracticeProblems';
import * as mathApi from '../lib/math-api';

// Mock the math API
vi.mock('../lib/math-api');

const mockPracticeSet = {
  id: 'set-1',
  name: 'Algebra Practice',
  topic: 'Algebra',
  difficulty: 'medium' as const,
  problems: [
    {
      id: 'prob-1',
      question: 'Solve for x: 2x + 5 = 13',
      topic: 'Algebra',
      difficulty: 'medium' as const,
      correctAnswer: '4',
      explanation: 'Subtract 5 from both sides, then divide by 2',
      hint: 'Start by isolating the variable',
    },
    {
      id: 'prob-2',
      question: 'What is the value of 3x when x = 5?',
      topic: 'Algebra',
      difficulty: 'easy' as const,
      options: ['10', '15', '20', '25'],
      correctAnswer: '15',
      explanation: 'Multiply 3 by 5',
      hint: 'Substitute x with 5',
    },
  ],
};

const mockScore = {
  setId: 'set-1',
  score: 100,
  correctAnswers: 2,
  totalProblems: 2,
  timeSpent: 120,
  feedback: 'Excellent work!',
  recommendedTopics: [],
};

describe('PracticeProblems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mathApi.generatePracticeSet).mockResolvedValue(mockPracticeSet);
    vi.mocked(mathApi.submitPracticeResults).mockResolvedValue(mockScore);
    vi.mocked(mathApi.getPracticeHistory).mockResolvedValue([]);
  });

  it('should render practice problems component', () => {
    render(<PracticeProblems learnerId="learner-123" />);
    
    expect(screen.getByText('Generate Practice Set')).toBeInTheDocument();
  });

  it('should generate practice set', async () => {
    render(<PracticeProblems learnerId="learner-123" />);
    
    const generateButton = screen.getByText(/generate practice set/i);
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mathApi.generatePracticeSet).toHaveBeenCalledWith(
        'Algebra',
        'medium',
        10
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Solve for x: 2x + 5 = 13')).toBeInTheDocument();
    });
  });

  it('should navigate between problems', async () => {
    render(<PracticeProblems learnerId="learner-123" />);
    
    const generateButton = screen.getByText(/generate practice set/i);
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Solve for x: 2x + 5 = 13')).toBeInTheDocument();
    });

    const nextButton = screen.getByText(/next/i);
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('What is the value of 3x when x = 5?')).toBeInTheDocument();
    });
  });

  it('should submit answers', async () => {
    render(<PracticeProblems learnerId="learner-123" />);
    
    const generateButton = screen.getByText(/generate practice set/i);
    fireEvent.click(generateButton);

    await waitFor(() => {
      const answerInput = screen.getByPlaceholderText(/enter your answer/i);
      fireEvent.change(answerInput, { target: { value: '4' } });
    });

    // Navigate to second problem
    const nextButton = screen.getByText(/next/i);
    fireEvent.click(nextButton);

    await waitFor(() => {
      const option = screen.getByLabelText('15');
      fireEvent.click(option);
    });

    // Submit answers
    const submitButton = screen.getByText(/submit answers/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mathApi.submitPracticeResults).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: 'learner-123',
          setId: 'set-1',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Practice Complete!')).toBeInTheDocument();
    });
  });

  it('should show hints when requested', async () => {
    render(<PracticeProblems learnerId="learner-123" />);
    
    const generateButton = screen.getByText(/generate practice set/i);
    fireEvent.click(generateButton);

    await waitFor(() => {
      const hintButton = screen.getByText(/need a hint/i);
      fireEvent.click(hintButton);
    });

    expect(screen.getByText('Start by isolating the variable')).toBeInTheDocument();
  });
});
