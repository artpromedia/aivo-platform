import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdaptiveService } from '../../src/services/adaptive.service.js';
import type { Difficulty, Question } from '../../generated/prisma-client/index.js';

// Mock prisma
const mockPrisma = {
  question: {
    findMany: vi.fn(),
  },
  attempt: {
    findUnique: vi.fn(),
  },
  questionPool: {
    findUnique: vi.fn(),
  },
  questionResponse: {
    findMany: vi.fn(),
  },
};

vi.mock('../../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

describe('AdaptiveService', () => {
  let adaptiveService: AdaptiveService;

  beforeEach(() => {
    adaptiveService = new AdaptiveService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('selectQuestions', () => {
    it('should select questions at the requested difficulty', async () => {
      const mockQuestions = [
        createMockQuestion('q1', 'MEDIUM'),
        createMockQuestion('q2', 'MEDIUM'),
        createMockQuestion('q3', 'MEDIUM'),
      ];

      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);

      const result = await adaptiveService.selectQuestions({
        tenantId: 'tenant-1',
        difficulty: 'MEDIUM',
        count: 3,
      });

      expect(result).toHaveLength(3);
      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            difficulty: 'MEDIUM',
          }),
        })
      );
    });

    it('should exclude specified question IDs', async () => {
      mockPrisma.question.findMany.mockResolvedValue([createMockQuestion('q3', 'MEDIUM')]);

      await adaptiveService.selectQuestions({
        tenantId: 'tenant-1',
        difficulty: 'MEDIUM',
        count: 3,
        excludeQuestionIds: ['q1', 'q2'],
      });

      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: ['q1', 'q2'] },
          }),
        })
      );
    });

    it('should filter by subject and topics when provided', async () => {
      mockPrisma.question.findMany.mockResolvedValue([createMockQuestion('q1', 'MEDIUM')]);

      await adaptiveService.selectQuestions({
        tenantId: 'tenant-1',
        subjectId: 'subject-1',
        topicIds: ['topic-1', 'topic-2'],
        difficulty: 'MEDIUM',
        count: 5,
      });

      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subjectId: 'subject-1',
            topicId: { in: ['topic-1', 'topic-2'] },
          }),
        })
      );
    });
  });

  describe('getNextQuestion', () => {
    it('should return null when all questions are answered', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        status: 'IN_PROGRESS',
        responses: [
          { questionId: 'q1', isCorrect: true },
          { questionId: 'q2', isCorrect: true },
        ],
        assessment: {
          difficulty: 'MEDIUM',
          settings: {},
          questions: [
            { questionId: 'q1', question: createMockQuestion('q1', 'MEDIUM') },
            { questionId: 'q2', question: createMockQuestion('q2', 'MEDIUM') },
          ],
        },
      });

      const result = await adaptiveService.getNextQuestion('attempt-1');

      expect(result).toBeNull();
    });

    it('should return next question in order for non-adaptive assessment', async () => {
      const q1 = createMockQuestion('q1', 'MEDIUM');
      const q2 = createMockQuestion('q2', 'MEDIUM');
      const q3 = createMockQuestion('q3', 'MEDIUM');

      mockPrisma.attempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        status: 'IN_PROGRESS',
        responses: [{ questionId: 'q1', isCorrect: true, question: q1 }],
        assessment: {
          difficulty: 'MEDIUM',
          settings: { adaptiveDifficulty: false },
          questions: [
            { questionId: 'q1', question: q1 },
            { questionId: 'q2', question: q2 },
            { questionId: 'q3', question: q3 },
          ],
        },
      });

      const result = await adaptiveService.getNextQuestion('attempt-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('q2');
    });

    it('should throw error for non-existent attempt', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue(null);

      await expect(adaptiveService.getNextQuestion('non-existent')).rejects.toThrow(
        'Attempt not found'
      );
    });
  });

  describe('selectFromPool', () => {
    it('should select questions matching pool criteria', async () => {
      mockPrisma.questionPool.findUnique.mockResolvedValue({
        id: 'pool-1',
        tenantId: 'tenant-1',
        criteria: {
          difficulties: ['EASY', 'MEDIUM'],
          tags: ['math'],
        },
      });

      const mockQuestions = [
        createMockQuestion('q1', 'EASY'),
        createMockQuestion('q2', 'MEDIUM'),
        createMockQuestion('q3', 'EASY'),
      ];
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);

      const result = await adaptiveService.selectFromPool({
        poolId: 'pool-1',
        count: 2,
      });

      expect(result).toHaveLength(2);
      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            difficulty: { in: ['EASY', 'MEDIUM'] },
            tags: { hasSome: ['math'] },
          }),
        })
      );
    });

    it('should throw error for non-existent pool', async () => {
      mockPrisma.questionPool.findUnique.mockResolvedValue(null);

      await expect(
        adaptiveService.selectFromPool({
          poolId: 'non-existent',
          count: 5,
        })
      ).rejects.toThrow('Question pool not found');
    });
  });

  describe('estimateAbility', () => {
    it('should return default values when no responses', async () => {
      mockPrisma.questionResponse.findMany.mockResolvedValue([]);

      const result = await adaptiveService.estimateAbility('tenant-1', 'user-1');

      expect(result.ability).toBe(0.5);
      expect(result.confidence).toBe(0);
    });

    it('should calculate ability based on response history', async () => {
      const responses = [
        { isCorrect: true, question: createMockQuestion('q1', 'MEDIUM') },
        { isCorrect: true, question: createMockQuestion('q2', 'MEDIUM') },
        { isCorrect: true, question: createMockQuestion('q3', 'EASY') },
        { isCorrect: false, question: createMockQuestion('q4', 'HARD') },
      ];
      mockPrisma.questionResponse.findMany.mockResolvedValue(responses);

      const result = await adaptiveService.estimateAbility('tenant-1', 'user-1');

      expect(result.ability).toBeGreaterThan(0);
      expect(result.ability).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});

// Helper to create mock questions
function createMockQuestion(id: string, difficulty: Difficulty): Partial<Question> {
  return {
    id,
    tenantId: 'tenant-1',
    type: 'MULTIPLE_CHOICE',
    stem: `Question ${id}`,
    difficulty,
    points: 1,
    stats: {
      timesAnswered: 50,
      correctRate: 60,
      averageTimeSeconds: 30,
      discriminationIndex: 0.4,
    },
  };
}
