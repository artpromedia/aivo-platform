import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScoringService } from '../../src/services/scoring.service.js';

// Mock prisma
vi.mock('../../src/prisma.js', () => ({
  prisma: {
    questionResponse: {
      update: vi.fn(),
    },
    attempt: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    question: {
      update: vi.fn(),
    },
  },
}));

// Mock question service
vi.mock('../../src/services/question.service.js', () => ({
  questionService: {
    updateStats: vi.fn(),
  },
}));

describe('ScoringService', () => {
  let scoringService: ScoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
    vi.clearAllMocks();
  });

  describe('scoreResponse', () => {
    describe('MULTIPLE_CHOICE', () => {
      it('should return full points for correct answer', async () => {
        const result = await scoringService.scoreResponse(
          'MULTIPLE_CHOICE',
          { optionId: 'b' },
          { optionId: 'b' },
          10
        );

        expect(result.isCorrect).toBe(true);
        expect(result.pointsEarned).toBe(10);
        expect(result.partialCredit).toBe(false);
      });

      it('should return 0 points for incorrect answer', async () => {
        const result = await scoringService.scoreResponse(
          'MULTIPLE_CHOICE',
          { optionId: 'a' },
          { optionId: 'b' },
          10
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(0);
        expect(result.partialCredit).toBe(false);
      });

      it('should handle missing response', async () => {
        const result = await scoringService.scoreResponse(
          'MULTIPLE_CHOICE',
          {},
          { optionId: 'b' },
          10
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(0);
      });
    });

    describe('MULTIPLE_SELECT', () => {
      it('should return full points for exact match', async () => {
        const result = await scoringService.scoreResponse(
          'MULTIPLE_SELECT',
          { optionIds: ['a', 'c'] },
          { optionIds: ['a', 'c'] },
          10
        );

        expect(result.isCorrect).toBe(true);
        expect(result.pointsEarned).toBe(10);
        expect(result.partialCredit).toBe(false);
      });

      it('should give partial credit for some correct selections', async () => {
        const result = await scoringService.scoreResponse(
          'MULTIPLE_SELECT',
          { optionIds: ['a'] },
          { optionIds: ['a', 'c'] },
          10
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(5); // 1/2 correct
        expect(result.partialCredit).toBe(true);
      });

      it('should penalize incorrect selections', async () => {
        const result = await scoringService.scoreResponse(
          'MULTIPLE_SELECT',
          { optionIds: ['a', 'b'] }, // 'b' is incorrect
          { optionIds: ['a', 'c'] },
          10
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(0); // 1 correct - 1 incorrect = 0
        expect(result.partialCredit).toBe(false);
      });
    });

    describe('TRUE_FALSE', () => {
      it('should return full points for correct true answer', async () => {
        const result = await scoringService.scoreResponse(
          'TRUE_FALSE',
          { value: true },
          { value: true },
          5
        );

        expect(result.isCorrect).toBe(true);
        expect(result.pointsEarned).toBe(5);
      });

      it('should return full points for correct false answer', async () => {
        const result = await scoringService.scoreResponse(
          'TRUE_FALSE',
          { value: false },
          { value: false },
          5
        );

        expect(result.isCorrect).toBe(true);
        expect(result.pointsEarned).toBe(5);
      });

      it('should return 0 points for incorrect answer', async () => {
        const result = await scoringService.scoreResponse(
          'TRUE_FALSE',
          { value: true },
          { value: false },
          5
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(0);
      });
    });

    describe('SHORT_ANSWER', () => {
      it('should accept correct answer', async () => {
        const result = await scoringService.scoreResponse(
          'SHORT_ANSWER',
          { text: 'H2O' },
          { acceptedAnswers: ['H2O', 'water'], caseSensitive: false },
          5
        );

        expect(result.isCorrect).toBe(true);
        expect(result.pointsEarned).toBe(5);
      });

      it('should accept case-insensitive match when configured', async () => {
        const result = await scoringService.scoreResponse(
          'SHORT_ANSWER',
          { text: 'h2o' },
          { acceptedAnswers: ['H2O'], caseSensitive: false },
          5
        );

        expect(result.isCorrect).toBe(true);
        expect(result.pointsEarned).toBe(5);
      });

      it('should reject case mismatch when case sensitive', async () => {
        const result = await scoringService.scoreResponse(
          'SHORT_ANSWER',
          { text: 'h2o' },
          { acceptedAnswers: ['H2O'], caseSensitive: true },
          5
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(0);
      });

      it('should trim whitespace', async () => {
        const result = await scoringService.scoreResponse(
          'SHORT_ANSWER',
          { text: '  H2O  ' },
          { acceptedAnswers: ['H2O'], caseSensitive: false },
          5
        );

        expect(result.isCorrect).toBe(true);
      });
    });

    describe('NUMERIC', () => {
      it('should accept exact numeric answer', async () => {
        const result = await scoringService.scoreResponse(
          'NUMERIC',
          { value: 12 },
          { value: 12, tolerance: 0 },
          5
        );

        expect(result.isCorrect).toBe(true);
        expect(result.pointsEarned).toBe(5);
      });

      it('should accept answer within tolerance', async () => {
        const result = await scoringService.scoreResponse(
          'NUMERIC',
          { value: 3.14 },
          { value: 3.14159, tolerance: 0.01 },
          5
        );

        expect(result.isCorrect).toBe(true);
        expect(result.pointsEarned).toBe(5);
      });

      it('should reject answer outside tolerance', async () => {
        const result = await scoringService.scoreResponse(
          'NUMERIC',
          { value: 3 },
          { value: 3.14159, tolerance: 0.01 },
          5
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(0);
      });

      it('should handle missing value', async () => {
        const result = await scoringService.scoreResponse(
          'NUMERIC',
          {},
          { value: 12, tolerance: 0 },
          5
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(0);
      });
    });

    describe('ORDERING', () => {
      it('should return full points for correct order', async () => {
        const result = await scoringService.scoreResponse(
          'ORDERING',
          { order: ['a', 'b', 'c', 'd'] },
          { correctOrder: ['a', 'b', 'c', 'd'] },
          10
        );

        expect(result.isCorrect).toBe(true);
        expect(result.pointsEarned).toBe(10);
      });

      it('should give partial credit for partially correct order', async () => {
        const result = await scoringService.scoreResponse(
          'ORDERING',
          { order: ['a', 'c', 'b', 'd'] }, // 2 correct (a and d)
          { correctOrder: ['a', 'b', 'c', 'd'] },
          10
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(5); // 2/4 correct
        expect(result.partialCredit).toBe(true);
      });

      it('should return 0 for completely wrong order', async () => {
        const result = await scoringService.scoreResponse(
          'ORDERING',
          { order: ['d', 'c', 'b', 'a'] },
          { correctOrder: ['a', 'b', 'c', 'd'] },
          10
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(0);
      });
    });

    describe('MATCHING', () => {
      it('should return full points for all correct matches', async () => {
        const result = await scoringService.scoreResponse(
          'MATCHING',
          {
            pairs: [
              { left: 'UK', right: 'London' },
              { left: 'France', right: 'Paris' },
            ],
          },
          {
            pairs: [
              { left: 'UK', right: 'London' },
              { left: 'France', right: 'Paris' },
            ],
          },
          10
        );

        expect(result.isCorrect).toBe(true);
        expect(result.pointsEarned).toBe(10);
      });

      it('should give partial credit for some correct matches', async () => {
        const result = await scoringService.scoreResponse(
          'MATCHING',
          {
            pairs: [
              { left: 'UK', right: 'London' },
              { left: 'France', right: 'Berlin' }, // Wrong
            ],
          },
          {
            pairs: [
              { left: 'UK', right: 'London' },
              { left: 'France', right: 'Paris' },
            ],
          },
          10
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(5); // 1/2 correct
        expect(result.partialCredit).toBe(true);
      });
    });

    describe('FILL_BLANK', () => {
      it('should return full points for all blanks correct', async () => {
        const result = await scoringService.scoreResponse(
          'FILL_BLANK',
          {
            blanks: [
              { position: 0, text: 'powerhouse' },
              { position: 1, text: 'energy' },
            ],
          },
          {
            blanks: [
              { position: 0, acceptedAnswers: ['powerhouse'], caseSensitive: false },
              { position: 1, acceptedAnswers: ['energy', 'ATP'], caseSensitive: false },
            ],
          },
          10
        );

        expect(result.isCorrect).toBe(true);
        expect(result.pointsEarned).toBe(10);
      });

      it('should give partial credit for some blanks correct', async () => {
        const result = await scoringService.scoreResponse(
          'FILL_BLANK',
          {
            blanks: [
              { position: 0, text: 'powerhouse' },
              { position: 1, text: 'wrong' },
            ],
          },
          {
            blanks: [
              { position: 0, acceptedAnswers: ['powerhouse'], caseSensitive: false },
              { position: 1, acceptedAnswers: ['energy', 'ATP'], caseSensitive: false },
            ],
          },
          10
        );

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(5); // 1/2 correct
        expect(result.partialCredit).toBe(true);
      });
    });

    describe('ESSAY and manual grading types', () => {
      it('should return pending status for essay', async () => {
        const result = await scoringService.scoreResponse('ESSAY', { text: 'My essay...' }, {}, 10);

        expect(result.isCorrect).toBe(false);
        expect(result.pointsEarned).toBe(0);
        expect(result.feedback).toBe('Awaiting manual grading');
      });
    });
  });
});
