import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutoGradingService } from '../src/services/grading/auto-grading.service';

describe('AutoGradingService', () => {
  let autoGradingService: AutoGradingService;

  beforeEach(() => {
    autoGradingService = new AutoGradingService();
  });

  describe('gradeResponse', () => {
    describe('Multiple Choice', () => {
      const question = {
        id: 'q1',
        type: 'MULTIPLE_CHOICE' as const,
        stem: 'What is 2+2?',
        points: 10,
        options: [
          { id: 'a', text: '3', isCorrect: false },
          { id: 'b', text: '4', isCorrect: true },
          { id: 'c', text: '5', isCorrect: false },
        ],
      };

      it('should award full points for correct answer', () => {
        const result = autoGradingService.gradeResponse(question, 'b');
        expect(result.score).toBe(10);
        expect(result.isCorrect).toBe(true);
      });

      it('should award zero points for incorrect answer', () => {
        const result = autoGradingService.gradeResponse(question, 'a');
        expect(result.score).toBe(0);
        expect(result.isCorrect).toBe(false);
      });

      it('should handle missing response', () => {
        const result = autoGradingService.gradeResponse(question, null);
        expect(result.score).toBe(0);
        expect(result.isCorrect).toBe(false);
      });
    });

    describe('Multiple Select', () => {
      const question = {
        id: 'q2',
        type: 'MULTIPLE_SELECT' as const,
        stem: 'Select all prime numbers',
        points: 12,
        options: [
          { id: 'a', text: '2', isCorrect: true },
          { id: 'b', text: '3', isCorrect: true },
          { id: 'c', text: '4', isCorrect: false },
          { id: 'd', text: '5', isCorrect: true },
        ],
        partialCredit: true,
      };

      it('should award full points for all correct selections', () => {
        const result = autoGradingService.gradeResponse(question, ['a', 'b', 'd']);
        expect(result.score).toBe(12);
        expect(result.isCorrect).toBe(true);
      });

      it('should award partial credit', () => {
        const result = autoGradingService.gradeResponse(question, ['a', 'b']);
        expect(result.score).toBe(8); // 2/3 of 12 = 8
        expect(result.isCorrect).toBe(false);
      });

      it('should deduct for wrong selections', () => {
        const result = autoGradingService.gradeResponse(question, ['a', 'c']);
        expect(result.score).toBe(4); // 1 correct, 1 wrong = 1/3 * 12 = 4
        expect(result.isCorrect).toBe(false);
      });

      it('should not go below zero', () => {
        const result = autoGradingService.gradeResponse(question, ['c']);
        expect(result.score).toBe(0);
        expect(result.isCorrect).toBe(false);
      });
    });

    describe('True/False', () => {
      const question = {
        id: 'q3',
        type: 'TRUE_FALSE' as const,
        stem: 'The sky is blue',
        points: 5,
        correctAnswer: true,
      };

      it('should award full points for correct answer', () => {
        const result = autoGradingService.gradeResponse(question, true);
        expect(result.score).toBe(5);
        expect(result.isCorrect).toBe(true);
      });

      it('should handle string "true"', () => {
        const result = autoGradingService.gradeResponse(question, 'true');
        expect(result.score).toBe(5);
        expect(result.isCorrect).toBe(true);
      });

      it('should award zero for incorrect answer', () => {
        const result = autoGradingService.gradeResponse(question, false);
        expect(result.score).toBe(0);
        expect(result.isCorrect).toBe(false);
      });
    });

    describe('Short Answer', () => {
      const question = {
        id: 'q4',
        type: 'SHORT_ANSWER' as const,
        stem: 'Capital of France?',
        points: 5,
        correctAnswer: 'Paris',
        caseSensitive: false,
      };

      it('should be case insensitive by default', () => {
        const result = autoGradingService.gradeResponse(question, 'paris');
        expect(result.score).toBe(5);
        expect(result.isCorrect).toBe(true);
      });

      it('should trim whitespace', () => {
        const result = autoGradingService.gradeResponse(question, '  Paris  ');
        expect(result.score).toBe(5);
        expect(result.isCorrect).toBe(true);
      });

      it('should handle case sensitive mode', () => {
        const caseSensitiveQ = { ...question, caseSensitive: true };
        const result = autoGradingService.gradeResponse(caseSensitiveQ, 'paris');
        expect(result.score).toBe(0);
        expect(result.isCorrect).toBe(false);
      });

      it('should accept alternative answers', () => {
        const qWithAlts = {
          ...question,
          alternativeAnswers: ['City of Light', 'Paris, France'],
        };
        const result = autoGradingService.gradeResponse(qWithAlts, 'City of Light');
        expect(result.score).toBe(5);
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('Numeric', () => {
      const question = {
        id: 'q5',
        type: 'NUMERIC' as const,
        stem: 'What is pi to 2 decimal places?',
        points: 10,
        correctAnswer: 3.14,
        tolerance: 0.01,
      };

      it('should accept exact answer', () => {
        const result = autoGradingService.gradeResponse(question, 3.14);
        expect(result.score).toBe(10);
        expect(result.isCorrect).toBe(true);
      });

      it('should accept answer within tolerance', () => {
        const result = autoGradingService.gradeResponse(question, 3.145);
        expect(result.score).toBe(10);
        expect(result.isCorrect).toBe(true);
      });

      it('should reject answer outside tolerance', () => {
        const result = autoGradingService.gradeResponse(question, 3.2);
        expect(result.score).toBe(0);
        expect(result.isCorrect).toBe(false);
      });

      it('should handle string numeric input', () => {
        const result = autoGradingService.gradeResponse(question, '3.14');
        expect(result.score).toBe(10);
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('Fill in the Blank', () => {
      const question = {
        id: 'q6',
        type: 'FILL_BLANK' as const,
        stem: 'The {{b1}} is the capital of {{b2}}.',
        points: 10,
        blanks: [
          { id: 'b1', position: 0, correctAnswers: ['Paris'], caseSensitive: false },
          { id: 'b2', position: 1, correctAnswers: ['France', 'French Republic'], caseSensitive: false },
        ],
        partialCredit: true,
      };

      it('should award full points for all correct', () => {
        const result = autoGradingService.gradeResponse(question, { b1: 'Paris', b2: 'France' });
        expect(result.score).toBe(10);
        expect(result.isCorrect).toBe(true);
      });

      it('should award partial credit', () => {
        const result = autoGradingService.gradeResponse(question, { b1: 'Paris', b2: 'Germany' });
        expect(result.score).toBe(5);
        expect(result.isCorrect).toBe(false);
      });

      it('should accept alternative answers', () => {
        const result = autoGradingService.gradeResponse(question, { b1: 'paris', b2: 'French Republic' });
        expect(result.score).toBe(10);
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('Matching', () => {
      const question = {
        id: 'q7',
        type: 'MATCHING' as const,
        stem: 'Match the countries with their capitals',
        points: 12,
        pairs: [
          { id: 'p1', left: 'France', right: 'Paris' },
          { id: 'p2', left: 'Germany', right: 'Berlin' },
          { id: 'p3', left: 'Spain', right: 'Madrid' },
        ],
        partialCredit: true,
      };

      it('should award full points for all correct matches', () => {
        const result = autoGradingService.gradeResponse(question, { p1: 'p1', p2: 'p2', p3: 'p3' });
        expect(result.score).toBe(12);
        expect(result.isCorrect).toBe(true);
      });

      it('should award partial credit', () => {
        const result = autoGradingService.gradeResponse(question, { p1: 'p1', p2: 'p3', p3: 'p2' });
        expect(result.score).toBe(4); // 1/3 of 12
        expect(result.isCorrect).toBe(false);
      });
    });

    describe('Ordering', () => {
      const question = {
        id: 'q8',
        type: 'ORDERING' as const,
        stem: 'Put in order from smallest to largest',
        points: 10,
        options: [
          { id: 'a', text: '1', isCorrect: false },
          { id: 'b', text: '2', isCorrect: false },
          { id: 'c', text: '3', isCorrect: false },
        ],
        correctOrder: ['a', 'b', 'c'],
        partialCredit: true,
      };

      it('should award full points for correct order', () => {
        const result = autoGradingService.gradeResponse(question, ['a', 'b', 'c']);
        expect(result.score).toBe(10);
        expect(result.isCorrect).toBe(true);
      });

      it('should award partial credit based on position', () => {
        // a is correct, b and c are swapped
        const result = autoGradingService.gradeResponse(question, ['a', 'c', 'b']);
        // Only 'a' is in correct position = 1/3 * 10 = 3.33
        expect(result.score).toBeCloseTo(3.33, 1);
        expect(result.isCorrect).toBe(false);
      });

      it('should award zero for completely wrong order', () => {
        const result = autoGradingService.gradeResponse(question, ['c', 'b', 'a']);
        // No items in correct position
        expect(result.score).toBe(0);
        expect(result.isCorrect).toBe(false);
      });
    });
  });

  describe('gradeAttempt', () => {
    it('should grade all responses in an attempt', () => {
      const questions = [
        {
          id: 'q1',
          type: 'MULTIPLE_CHOICE' as const,
          stem: 'Q1',
          points: 10,
          options: [
            { id: 'a', text: 'A', isCorrect: true },
            { id: 'b', text: 'B', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          type: 'TRUE_FALSE' as const,
          stem: 'Q2',
          points: 5,
          correctAnswer: true,
        },
      ];

      const responses = [
        { questionId: 'q1', response: 'a' },
        { questionId: 'q2', response: true },
      ];

      const result = autoGradingService.gradeAttempt(questions, responses);
      
      expect(result.totalScore).toBe(15);
      expect(result.maxScore).toBe(15);
      expect(result.percentage).toBe(100);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].isCorrect).toBe(true);
      expect(result.results[1].isCorrect).toBe(true);
    });

    it('should handle missing responses', () => {
      const questions = [
        {
          id: 'q1',
          type: 'MULTIPLE_CHOICE' as const,
          stem: 'Q1',
          points: 10,
          options: [
            { id: 'a', text: 'A', isCorrect: true },
          ],
        },
        {
          id: 'q2',
          type: 'TRUE_FALSE' as const,
          stem: 'Q2',
          points: 5,
          correctAnswer: true,
        },
      ];

      const responses = [
        { questionId: 'q1', response: 'a' },
        // q2 not answered
      ];

      const result = autoGradingService.gradeAttempt(questions, responses);
      
      expect(result.totalScore).toBe(10);
      expect(result.maxScore).toBe(15);
      expect(result.percentage).toBeCloseTo(66.67, 1);
    });
  });
});
