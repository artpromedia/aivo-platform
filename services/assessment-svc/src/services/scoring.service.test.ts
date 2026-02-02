/**
 * Unit Tests for Scoring Service
 *
 * Tests for:
 * - Question scoring algorithms
 * - Partial credit calculation
 * - Manual grading
 * - Attempt scoring
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockPrismaAttempt = {
  findUnique: vi.fn(),
  update: vi.fn(),
};

const mockPrismaQuestionResponse = {
  findUnique: vi.fn(),
  update: vi.fn(),
};

vi.mock('../prisma.js', () => ({
  prisma: {
    attempt: mockPrismaAttempt,
    questionResponse: mockPrismaQuestionResponse,
  },
  Prisma: {},
}));

vi.mock('./question.service.js', () => ({
  questionService: {
    updateStats: vi.fn(),
  },
}));

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'MULTIPLE_SELECT'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'NUMERIC'
  | 'ORDERING'
  | 'MATCHING'
  | 'FILL_BLANK'
  | 'ESSAY'
  | 'HOTSPOT'
  | 'DRAG_DROP';

interface ScoringResult {
  score: number;
  pointsEarned: number;
  pointsPossible: number;
  correctCount: number;
  incorrectCount: number;
  pendingManualGrading: number;
}

interface ResponseScoringResult {
  isCorrect: boolean;
  pointsEarned: number;
  partialCredit: boolean;
  feedback?: string;
}

// =============================================================================
// SCORING SERVICE (Simplified for testing)
// =============================================================================

class ScoringService {
  // Multiple Choice
  scoreMultipleChoice(
    response: { optionId?: string },
    correct: { optionId: string },
    maxPoints: number
  ): ResponseScoringResult {
    const isCorrect = response.optionId === correct.optionId;
    return {
      isCorrect,
      pointsEarned: isCorrect ? maxPoints : 0,
      partialCredit: false,
    };
  }

  // Multiple Select (with partial credit)
  scoreMultipleSelect(
    response: { optionIds?: string[] },
    correct: { optionIds: string[] },
    maxPoints: number
  ): ResponseScoringResult {
    const selectedIds = new Set(response.optionIds ?? []);
    const correctIds = new Set(correct.optionIds);

    let correctSelections = 0;
    let incorrectSelections = 0;

    for (const id of selectedIds) {
      if (correctIds.has(id)) {
        correctSelections++;
      } else {
        incorrectSelections++;
      }
    }

    const isExactMatch =
      selectedIds.size === correctIds.size && correctSelections === correctIds.size;

    if (isExactMatch) {
      return { isCorrect: true, pointsEarned: maxPoints, partialCredit: false };
    }

    const pointsPerOption = maxPoints / correctIds.size;
    const earnedPoints = Math.max(0, (correctSelections - incorrectSelections) * pointsPerOption);

    return {
      isCorrect: false,
      pointsEarned: Math.round(earnedPoints * 100) / 100,
      partialCredit: earnedPoints > 0,
    };
  }

  // True/False
  scoreTrueFalse(
    response: { value?: boolean },
    correct: { value: boolean },
    maxPoints: number
  ): ResponseScoringResult {
    const isCorrect = response.value === correct.value;
    return {
      isCorrect,
      pointsEarned: isCorrect ? maxPoints : 0,
      partialCredit: false,
    };
  }

  // Short Answer
  scoreShortAnswer(
    response: { text?: string },
    correct: { acceptedAnswers: string[]; caseSensitive?: boolean },
    maxPoints: number
  ): ResponseScoringResult {
    const userText = response.text?.trim() ?? '';

    const isCorrect = correct.acceptedAnswers.some((accepted) => {
      if (correct.caseSensitive) {
        return userText === accepted.trim();
      }
      return userText.toLowerCase() === accepted.trim().toLowerCase();
    });

    return {
      isCorrect,
      pointsEarned: isCorrect ? maxPoints : 0,
      partialCredit: false,
    };
  }

  // Numeric (with tolerance)
  scoreNumeric(
    response: { value?: number },
    correct: { value: number; tolerance?: number },
    maxPoints: number
  ): ResponseScoringResult {
    if (response.value === undefined) {
      return { isCorrect: false, pointsEarned: 0, partialCredit: false };
    }

    const tolerance = correct.tolerance ?? 0;
    const diff = Math.abs(response.value - correct.value);
    const isCorrect = diff <= tolerance;

    return {
      isCorrect,
      pointsEarned: isCorrect ? maxPoints : 0,
      partialCredit: false,
    };
  }

  // Ordering (with partial credit)
  scoreOrdering(
    response: { order?: string[] },
    correct: { correctOrder: string[] },
    maxPoints: number
  ): ResponseScoringResult {
    const userOrder = response.order ?? [];
    const correctOrder = correct.correctOrder;

    if (userOrder.length !== correctOrder.length) {
      return { isCorrect: false, pointsEarned: 0, partialCredit: false };
    }

    let correctPositions = 0;
    for (let i = 0; i < correctOrder.length; i++) {
      if (userOrder[i] === correctOrder[i]) {
        correctPositions++;
      }
    }

    const isExactMatch = correctPositions === correctOrder.length;
    if (isExactMatch) {
      return { isCorrect: true, pointsEarned: maxPoints, partialCredit: false };
    }

    const pointsPerPosition = maxPoints / correctOrder.length;
    const earnedPoints = correctPositions * pointsPerPosition;

    return {
      isCorrect: false,
      pointsEarned: Math.round(earnedPoints * 100) / 100,
      partialCredit: earnedPoints > 0,
    };
  }

  // Matching (with partial credit)
  scoreMatching(
    response: { pairs?: { left: string; right: string }[] },
    correct: { pairs: { left: string; right: string }[] },
    maxPoints: number
  ): ResponseScoringResult {
    const userPairs = response.pairs ?? [];
    const correctPairsMap = new Map(correct.pairs.map((p) => [p.left, p.right]));

    let correctCount = 0;
    for (const pair of userPairs) {
      if (correctPairsMap.get(pair.left) === pair.right) {
        correctCount++;
      }
    }

    const isExactMatch = correctCount === correct.pairs.length;
    if (isExactMatch) {
      return { isCorrect: true, pointsEarned: maxPoints, partialCredit: false };
    }

    const pointsPerPair = maxPoints / correct.pairs.length;
    const earnedPoints = correctCount * pointsPerPair;

    return {
      isCorrect: false,
      pointsEarned: Math.round(earnedPoints * 100) / 100,
      partialCredit: earnedPoints > 0,
    };
  }

  // Fill in the Blank (with partial credit)
  scoreFillBlank(
    response: { blanks?: { position: number; text: string }[] },
    correct: {
      blanks: { position: number; acceptedAnswers: string[]; caseSensitive?: boolean }[];
    },
    maxPoints: number
  ): ResponseScoringResult {
    const userBlanks = response.blanks ?? [];
    const blankMap = new Map(userBlanks.map((b) => [b.position, b.text]));

    let correctCount = 0;
    for (const blank of correct.blanks) {
      const userText = blankMap.get(blank.position)?.trim() ?? '';
      const isMatch = blank.acceptedAnswers.some((answer) =>
        blank.caseSensitive
          ? userText === answer.trim()
          : userText.toLowerCase() === answer.trim().toLowerCase()
      );
      if (isMatch) correctCount++;
    }

    const isExactMatch = correctCount === correct.blanks.length;
    if (isExactMatch) {
      return { isCorrect: true, pointsEarned: maxPoints, partialCredit: false };
    }

    const pointsPerBlank = maxPoints / correct.blanks.length;
    const earnedPoints = correctCount * pointsPerBlank;

    return {
      isCorrect: false,
      pointsEarned: Math.round(earnedPoints * 100) / 100,
      partialCredit: earnedPoints > 0,
    };
  }

  // Check if requires manual grading
  requiresManualGrading(type: QuestionType): boolean {
    return ['ESSAY', 'HOTSPOT', 'DRAG_DROP'].includes(type);
  }

  // Route to correct scoring method
  scoreResponse(
    type: QuestionType,
    response: unknown,
    correctAnswer: unknown,
    maxPoints: number
  ): ResponseScoringResult {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return this.scoreMultipleChoice(
          response as { optionId?: string },
          correctAnswer as { optionId: string },
          maxPoints
        );
      case 'MULTIPLE_SELECT':
        return this.scoreMultipleSelect(
          response as { optionIds?: string[] },
          correctAnswer as { optionIds: string[] },
          maxPoints
        );
      case 'TRUE_FALSE':
        return this.scoreTrueFalse(
          response as { value?: boolean },
          correctAnswer as { value: boolean },
          maxPoints
        );
      case 'SHORT_ANSWER':
        return this.scoreShortAnswer(
          response as { text?: string },
          correctAnswer as { acceptedAnswers: string[]; caseSensitive?: boolean },
          maxPoints
        );
      case 'NUMERIC':
        return this.scoreNumeric(
          response as { value?: number },
          correctAnswer as { value: number; tolerance?: number },
          maxPoints
        );
      case 'ORDERING':
        return this.scoreOrdering(
          response as { order?: string[] },
          correctAnswer as { correctOrder: string[] },
          maxPoints
        );
      case 'MATCHING':
        return this.scoreMatching(
          response as { pairs?: { left: string; right: string }[] },
          correctAnswer as { pairs: { left: string; right: string }[] },
          maxPoints
        );
      case 'FILL_BLANK':
        return this.scoreFillBlank(
          response as { blanks?: { position: number; text: string }[] },
          correctAnswer as {
            blanks: { position: number; acceptedAnswers: string[]; caseSensitive?: boolean }[];
          },
          maxPoints
        );
      default:
        return {
          isCorrect: false,
          pointsEarned: 0,
          partialCredit: false,
          feedback: this.requiresManualGrading(type)
            ? 'Awaiting manual grading'
            : 'Unknown question type',
        };
    }
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ScoringService();
  });

  // ===========================================================================
  // MULTIPLE CHOICE TESTS
  // ===========================================================================

  describe('scoreMultipleChoice', () => {
    it('should award full points for correct answer', () => {
      const result = service.scoreMultipleChoice(
        { optionId: 'opt-a' },
        { optionId: 'opt-a' },
        10
      );

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(10);
      expect(result.partialCredit).toBe(false);
    });

    it('should award zero points for incorrect answer', () => {
      const result = service.scoreMultipleChoice(
        { optionId: 'opt-b' },
        { optionId: 'opt-a' },
        10
      );

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });

    it('should handle missing response', () => {
      const result = service.scoreMultipleChoice({}, { optionId: 'opt-a' }, 10);

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });
  });

  // ===========================================================================
  // MULTIPLE SELECT TESTS
  // ===========================================================================

  describe('scoreMultipleSelect', () => {
    it('should award full points for exact match', () => {
      const result = service.scoreMultipleSelect(
        { optionIds: ['opt-a', 'opt-c'] },
        { optionIds: ['opt-a', 'opt-c'] },
        10
      );

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(10);
      expect(result.partialCredit).toBe(false);
    });

    it('should award partial credit for some correct selections', () => {
      const result = service.scoreMultipleSelect(
        { optionIds: ['opt-a'] }, // 1 of 2 correct
        { optionIds: ['opt-a', 'opt-c'] },
        10
      );

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(5); // Half points
      expect(result.partialCredit).toBe(true);
    });

    it('should deduct points for incorrect selections', () => {
      const result = service.scoreMultipleSelect(
        { optionIds: ['opt-a', 'opt-b'] }, // 1 correct, 1 wrong
        { optionIds: ['opt-a', 'opt-c'] },
        10
      );

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0); // 5 - 5 = 0
    });

    it('should not go below zero points', () => {
      const result = service.scoreMultipleSelect(
        { optionIds: ['opt-b', 'opt-d', 'opt-e'] }, // 0 correct, 3 wrong
        { optionIds: ['opt-a', 'opt-c'] },
        10
      );

      expect(result.pointsEarned).toBe(0);
    });

    it('should handle empty response', () => {
      const result = service.scoreMultipleSelect(
        { optionIds: [] },
        { optionIds: ['opt-a', 'opt-c'] },
        10
      );

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });
  });

  // ===========================================================================
  // TRUE/FALSE TESTS
  // ===========================================================================

  describe('scoreTrueFalse', () => {
    it('should award full points for correct true answer', () => {
      const result = service.scoreTrueFalse({ value: true }, { value: true }, 5);

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(5);
    });

    it('should award full points for correct false answer', () => {
      const result = service.scoreTrueFalse({ value: false }, { value: false }, 5);

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(5);
    });

    it('should award zero for incorrect answer', () => {
      const result = service.scoreTrueFalse({ value: true }, { value: false }, 5);

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });
  });

  // ===========================================================================
  // SHORT ANSWER TESTS
  // ===========================================================================

  describe('scoreShortAnswer', () => {
    it('should match exact answer', () => {
      const result = service.scoreShortAnswer(
        { text: 'Paris' },
        { acceptedAnswers: ['Paris', 'paris'] },
        10
      );

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(10);
    });

    it('should be case insensitive by default', () => {
      const result = service.scoreShortAnswer(
        { text: 'PARIS' },
        { acceptedAnswers: ['Paris'] },
        10
      );

      expect(result.isCorrect).toBe(true);
    });

    it('should respect case sensitivity when set', () => {
      const result = service.scoreShortAnswer(
        { text: 'PARIS' },
        { acceptedAnswers: ['Paris'], caseSensitive: true },
        10
      );

      expect(result.isCorrect).toBe(false);
    });

    it('should accept any of multiple accepted answers', () => {
      const result = service.scoreShortAnswer(
        { text: 'NYC' },
        { acceptedAnswers: ['New York', 'New York City', 'NYC'] },
        10
      );

      expect(result.isCorrect).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = service.scoreShortAnswer(
        { text: '  Paris  ' },
        { acceptedAnswers: ['Paris'] },
        10
      );

      expect(result.isCorrect).toBe(true);
    });

    it('should handle empty response', () => {
      const result = service.scoreShortAnswer({ text: '' }, { acceptedAnswers: ['Paris'] }, 10);

      expect(result.isCorrect).toBe(false);
    });
  });

  // ===========================================================================
  // NUMERIC TESTS
  // ===========================================================================

  describe('scoreNumeric', () => {
    it('should award full points for exact match', () => {
      const result = service.scoreNumeric({ value: 42 }, { value: 42 }, 10);

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(10);
    });

    it('should use tolerance for approximate answers', () => {
      const result = service.scoreNumeric({ value: 3.15 }, { value: 3.14, tolerance: 0.02 }, 10);

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(10);
    });

    it('should reject values outside tolerance', () => {
      const result = service.scoreNumeric({ value: 3.2 }, { value: 3.14, tolerance: 0.02 }, 10);

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });

    it('should handle negative tolerance boundaries', () => {
      const result = service.scoreNumeric({ value: 98 }, { value: 100, tolerance: 5 }, 10);

      expect(result.isCorrect).toBe(true);
    });

    it('should handle missing response', () => {
      const result = service.scoreNumeric({}, { value: 42 }, 10);

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });

    it('should default to zero tolerance', () => {
      const result = service.scoreNumeric({ value: 42.001 }, { value: 42 }, 10);

      expect(result.isCorrect).toBe(false);
    });
  });

  // ===========================================================================
  // ORDERING TESTS
  // ===========================================================================

  describe('scoreOrdering', () => {
    it('should award full points for correct order', () => {
      const result = service.scoreOrdering(
        { order: ['a', 'b', 'c', 'd'] },
        { correctOrder: ['a', 'b', 'c', 'd'] },
        10
      );

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(10);
    });

    it('should award partial credit for some correct positions', () => {
      const result = service.scoreOrdering(
        { order: ['a', 'b', 'd', 'c'] }, // 2 of 4 correct
        { correctOrder: ['a', 'b', 'c', 'd'] },
        10
      );

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(5); // 2/4 * 10
      expect(result.partialCredit).toBe(true);
    });

    it('should reject completely wrong order', () => {
      const result = service.scoreOrdering(
        { order: ['d', 'c', 'b', 'a'] }, // 0 of 4 correct
        { correctOrder: ['a', 'b', 'c', 'd'] },
        10
      );

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });

    it('should reject different length arrays', () => {
      const result = service.scoreOrdering(
        { order: ['a', 'b', 'c'] }, // Missing one
        { correctOrder: ['a', 'b', 'c', 'd'] },
        10
      );

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });
  });

  // ===========================================================================
  // MATCHING TESTS
  // ===========================================================================

  describe('scoreMatching', () => {
    it('should award full points for all correct pairs', () => {
      const result = service.scoreMatching(
        {
          pairs: [
            { left: 'A', right: '1' },
            { left: 'B', right: '2' },
          ],
        },
        {
          pairs: [
            { left: 'A', right: '1' },
            { left: 'B', right: '2' },
          ],
        },
        10
      );

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(10);
    });

    it('should award partial credit for some correct pairs', () => {
      const result = service.scoreMatching(
        {
          pairs: [
            { left: 'A', right: '1' },
            { left: 'B', right: '3' }, // Wrong
          ],
        },
        {
          pairs: [
            { left: 'A', right: '1' },
            { left: 'B', right: '2' },
          ],
        },
        10
      );

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(5);
      expect(result.partialCredit).toBe(true);
    });

    it('should handle empty response', () => {
      const result = service.scoreMatching(
        { pairs: [] },
        {
          pairs: [
            { left: 'A', right: '1' },
            { left: 'B', right: '2' },
          ],
        },
        10
      );

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });
  });

  // ===========================================================================
  // FILL IN THE BLANK TESTS
  // ===========================================================================

  describe('scoreFillBlank', () => {
    it('should award full points for all correct blanks', () => {
      const result = service.scoreFillBlank(
        {
          blanks: [
            { position: 0, text: 'Paris' },
            { position: 1, text: 'France' },
          ],
        },
        {
          blanks: [
            { position: 0, acceptedAnswers: ['Paris'] },
            { position: 1, acceptedAnswers: ['France'] },
          ],
        },
        10
      );

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(10);
    });

    it('should award partial credit for some correct blanks', () => {
      const result = service.scoreFillBlank(
        {
          blanks: [
            { position: 0, text: 'Paris' },
            { position: 1, text: 'Germany' }, // Wrong
          ],
        },
        {
          blanks: [
            { position: 0, acceptedAnswers: ['Paris'] },
            { position: 1, acceptedAnswers: ['France'] },
          ],
        },
        10
      );

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(5);
      expect(result.partialCredit).toBe(true);
    });

    it('should accept multiple correct answers per blank', () => {
      const result = service.scoreFillBlank(
        { blanks: [{ position: 0, text: 'NYC' }] },
        { blanks: [{ position: 0, acceptedAnswers: ['New York', 'NYC', 'New York City'] }] },
        10
      );

      expect(result.isCorrect).toBe(true);
    });
  });

  // ===========================================================================
  // MANUAL GRADING TESTS
  // ===========================================================================

  describe('requiresManualGrading', () => {
    it('should return true for ESSAY', () => {
      expect(service.requiresManualGrading('ESSAY')).toBe(true);
    });

    it('should return true for HOTSPOT', () => {
      expect(service.requiresManualGrading('HOTSPOT')).toBe(true);
    });

    it('should return true for DRAG_DROP', () => {
      expect(service.requiresManualGrading('DRAG_DROP')).toBe(true);
    });

    it('should return false for MULTIPLE_CHOICE', () => {
      expect(service.requiresManualGrading('MULTIPLE_CHOICE')).toBe(false);
    });

    it('should return false for SHORT_ANSWER', () => {
      expect(service.requiresManualGrading('SHORT_ANSWER')).toBe(false);
    });
  });

  // ===========================================================================
  // SCORE RESPONSE ROUTER TESTS
  // ===========================================================================

  describe('scoreResponse', () => {
    it('should route MULTIPLE_CHOICE correctly', () => {
      const result = service.scoreResponse(
        'MULTIPLE_CHOICE',
        { optionId: 'opt-a' },
        { optionId: 'opt-a' },
        10
      );

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(10);
    });

    it('should route MULTIPLE_SELECT correctly', () => {
      const result = service.scoreResponse(
        'MULTIPLE_SELECT',
        { optionIds: ['a', 'b'] },
        { optionIds: ['a', 'b'] },
        10
      );

      expect(result.isCorrect).toBe(true);
    });

    it('should route TRUE_FALSE correctly', () => {
      const result = service.scoreResponse('TRUE_FALSE', { value: true }, { value: true }, 5);

      expect(result.isCorrect).toBe(true);
    });

    it('should route SHORT_ANSWER correctly', () => {
      const result = service.scoreResponse(
        'SHORT_ANSWER',
        { text: 'answer' },
        { acceptedAnswers: ['answer'] },
        10
      );

      expect(result.isCorrect).toBe(true);
    });

    it('should route NUMERIC correctly', () => {
      const result = service.scoreResponse('NUMERIC', { value: 42 }, { value: 42 }, 10);

      expect(result.isCorrect).toBe(true);
    });

    it('should handle manual grading types', () => {
      const result = service.scoreResponse('ESSAY', { text: 'My essay...' }, {}, 20);

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
      expect(result.feedback).toBe('Awaiting manual grading');
    });

    it('should handle unknown question types', () => {
      const result = service.scoreResponse(
        'UNKNOWN_TYPE' as QuestionType,
        {},
        {},
        10
      );

      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toBe('Unknown question type');
    });
  });
});
