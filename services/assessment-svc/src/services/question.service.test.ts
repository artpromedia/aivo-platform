/**
 * Unit Tests for Question Service
 *
 * Tests for:
 * - Question CRUD operations
 * - Question bank management
 * - Tag-based filtering
 * - Statistics tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockPrismaQuestion = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockPrismaAssessmentQuestion = {
  count: vi.fn(),
};

const mockPrismaQuestionResponse = {
  findMany: vi.fn(),
  aggregate: vi.fn(),
};

vi.mock('../prisma.js', () => ({
  prisma: {
    question: mockPrismaQuestion,
    assessmentQuestion: mockPrismaAssessmentQuestion,
    questionResponse: mockPrismaQuestionResponse,
  },
  Prisma: {},
}));

const mockPublishEvent = vi.fn();
vi.mock('../events/publisher.js', () => ({
  publishEvent: mockPublishEvent,
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
  | 'ESSAY';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface Question {
  id: string;
  tenantId: string;
  authorId: string;
  type: QuestionType;
  stem: string;
  stemMedia?: unknown;
  options?: unknown;
  correctAnswer: unknown;
  explanation?: string;
  hints: string[];
  subjectId?: string;
  topicId?: string;
  difficulty: Difficulty;
  points: number;
  tags: string[];
  stats: QuestionStats;
  createdAt: Date;
  updatedAt: Date;
}

interface QuestionStats {
  timesAnswered: number;
  correctRate: number;
  averageTimeSeconds: number;
  discriminationIndex: number;
}

interface QuestionQuery {
  page: number;
  pageSize: number;
  type?: QuestionType;
  subjectId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  tags?: string[];
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// QUESTION SERVICE (Simplified for testing)
// =============================================================================

class QuestionService {
  async create(tenantId: string, authorId: string, input: Partial<Question>): Promise<Question> {
    const question = await mockPrismaQuestion.create({
      data: {
        tenantId,
        authorId,
        type: input.type,
        stem: input.stem,
        stemMedia: input.stemMedia,
        options: input.options,
        correctAnswer: input.correctAnswer,
        explanation: input.explanation,
        hints: input.hints ?? [],
        subjectId: input.subjectId,
        topicId: input.topicId,
        difficulty: input.difficulty ?? 'MEDIUM',
        points: input.points ?? 1,
        tags: input.tags ?? [],
        stats: {
          timesAnswered: 0,
          correctRate: 0,
          averageTimeSeconds: 0,
          discriminationIndex: 0,
        },
      },
    });

    await mockPublishEvent('question.created', {
      questionId: question.id,
      tenantId,
      authorId,
      type: question.type,
    });

    return question;
  }

  async getById(tenantId: string, questionId: string): Promise<Question | null> {
    return mockPrismaQuestion.findFirst({
      where: { id: questionId, tenantId },
    });
  }

  async getByIdForDisplay(
    tenantId: string,
    questionId: string
  ): Promise<Omit<Question, 'correctAnswer'> | null> {
    const question = await this.getById(tenantId, questionId);
    if (!question) return null;

    const { correctAnswer: _omit, ...rest } = question;
    return rest;
  }

  async list(
    tenantId: string,
    query: QuestionQuery
  ): Promise<{ data: Question[]; total: number; page: number; pageSize: number }> {
    const where = {
      tenantId,
      ...(query.type && { type: query.type }),
      ...(query.subjectId && { subjectId: query.subjectId }),
      ...(query.topicId && { topicId: query.topicId }),
      ...(query.difficulty && { difficulty: query.difficulty }),
      ...(query.tags?.length && { tags: { hasEvery: query.tags } }),
      ...(query.search && {
        OR: [
          { stem: { contains: query.search, mode: 'insensitive' } },
          { tags: { has: query.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      mockPrismaQuestion.findMany({
        where,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      mockPrismaQuestion.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async update(tenantId: string, questionId: string, input: Partial<Question>): Promise<Question> {
    const question = await mockPrismaQuestion.update({
      where: { id: questionId },
      data: input,
    });

    await mockPublishEvent('question.updated', {
      questionId: question.id,
      tenantId,
      changes: Object.keys(input),
    });

    return question;
  }

  async delete(tenantId: string, questionId: string): Promise<void> {
    const usageCount = await mockPrismaAssessmentQuestion.count({
      where: { questionId },
    });

    if (usageCount > 0) {
      throw new Error(`Cannot delete question: it is used in ${usageCount} assessment(s)`);
    }

    await mockPrismaQuestion.delete({ where: { id: questionId } });

    await mockPublishEvent('question.deleted', {
      questionId,
      tenantId,
    });
  }

  async updateStats(questionId: string): Promise<QuestionStats> {
    const responses = await mockPrismaQuestionResponse.findMany({
      where: { questionId },
      select: { isCorrect: true, responseTimeSeconds: true },
    });

    if (responses.length === 0) {
      return {
        timesAnswered: 0,
        correctRate: 0,
        averageTimeSeconds: 0,
        discriminationIndex: 0,
      };
    }

    const correctCount = responses.filter((r: { isCorrect: boolean }) => r.isCorrect).length;
    const totalTime = responses.reduce(
      (sum: number, r: { responseTimeSeconds?: number }) => sum + (r.responseTimeSeconds ?? 0),
      0
    );

    const stats = {
      timesAnswered: responses.length,
      correctRate: Math.round((correctCount / responses.length) * 100),
      averageTimeSeconds: Math.round(totalTime / responses.length),
      discriminationIndex: 0, // Would need more complex calculation
    };

    await mockPrismaQuestion.update({
      where: { id: questionId },
      data: { stats },
    });

    return stats;
  }

  async duplicateQuestion(tenantId: string, questionId: string, authorId: string): Promise<Question> {
    const original = await this.getById(tenantId, questionId);
    if (!original) throw new Error('Question not found');

    return this.create(tenantId, authorId, {
      type: original.type,
      stem: `${original.stem} (Copy)`,
      options: original.options,
      correctAnswer: original.correctAnswer,
      explanation: original.explanation,
      hints: original.hints,
      subjectId: original.subjectId,
      topicId: original.topicId,
      difficulty: original.difficulty,
      points: original.points,
      tags: original.tags,
    });
  }

  async bulkAddTags(tenantId: string, questionIds: string[], tags: string[]): Promise<number> {
    let updated = 0;
    for (const id of questionIds) {
      const question = await this.getById(tenantId, id);
      if (question) {
        const newTags = [...new Set([...question.tags, ...tags])];
        await this.update(tenantId, id, { tags: newTags });
        updated++;
      }
    }
    return updated;
  }
}

// =============================================================================
// FIXTURES
// =============================================================================

const createMockQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 'question-001',
  tenantId: 'tenant-001',
  authorId: 'author-001',
  type: 'MULTIPLE_CHOICE',
  stem: 'What is 2 + 2?',
  options: [
    { id: 'a', text: '3' },
    { id: 'b', text: '4' },
    { id: 'c', text: '5' },
  ],
  correctAnswer: { optionId: 'b' },
  explanation: 'Basic addition',
  hints: ['Think about counting'],
  subjectId: 'math-001',
  topicId: 'arithmetic-001',
  difficulty: 'EASY',
  points: 1,
  tags: ['math', 'addition', 'grade-1'],
  stats: {
    timesAnswered: 100,
    correctRate: 85,
    averageTimeSeconds: 15,
    discriminationIndex: 0.3,
  },
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('QuestionService', () => {
  let service: QuestionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QuestionService();
  });

  // ===========================================================================
  // CREATE TESTS
  // ===========================================================================

  describe('create', () => {
    it('should create question with all fields', async () => {
      const mockCreated = createMockQuestion();
      mockPrismaQuestion.create.mockResolvedValueOnce(mockCreated);

      const result = await service.create('tenant-001', 'author-001', {
        type: 'MULTIPLE_CHOICE',
        stem: 'What is 2 + 2?',
        options: [{ id: 'a', text: '4' }],
        correctAnswer: { optionId: 'a' },
      });

      expect(result.id).toBe('question-001');
      expect(mockPrismaQuestion.create).toHaveBeenCalled();
    });

    it('should set default values', async () => {
      mockPrismaQuestion.create.mockImplementationOnce(({ data }) => Promise.resolve(data));

      await service.create('tenant-001', 'author-001', {
        type: 'TRUE_FALSE',
        stem: 'The sky is blue',
        correctAnswer: { value: true },
      });

      const createArg = mockPrismaQuestion.create.mock.calls[0][0];
      expect(createArg.data.difficulty).toBe('MEDIUM');
      expect(createArg.data.points).toBe(1);
      expect(createArg.data.hints).toEqual([]);
      expect(createArg.data.tags).toEqual([]);
    });

    it('should initialize stats to zero', async () => {
      mockPrismaQuestion.create.mockImplementationOnce(({ data }) => Promise.resolve(data));

      await service.create('tenant-001', 'author-001', {
        type: 'TRUE_FALSE',
        stem: 'Test',
        correctAnswer: { value: true },
      });

      const createArg = mockPrismaQuestion.create.mock.calls[0][0];
      expect(createArg.data.stats.timesAnswered).toBe(0);
      expect(createArg.data.stats.correctRate).toBe(0);
    });

    it('should publish question.created event', async () => {
      mockPrismaQuestion.create.mockResolvedValueOnce(createMockQuestion());

      await service.create('tenant-001', 'author-001', {
        type: 'MULTIPLE_CHOICE',
        stem: 'Test',
        correctAnswer: {},
      });

      expect(mockPublishEvent).toHaveBeenCalledWith('question.created', {
        questionId: 'question-001',
        tenantId: 'tenant-001',
        authorId: 'author-001',
        type: 'MULTIPLE_CHOICE',
      });
    });
  });

  // ===========================================================================
  // GET BY ID TESTS
  // ===========================================================================

  describe('getById', () => {
    it('should return question by ID', async () => {
      const mockQuestion = createMockQuestion();
      mockPrismaQuestion.findFirst.mockResolvedValueOnce(mockQuestion);

      const result = await service.getById('tenant-001', 'question-001');

      expect(result?.id).toBe('question-001');
    });

    it('should return null when not found', async () => {
      mockPrismaQuestion.findFirst.mockResolvedValueOnce(null);

      const result = await service.getById('tenant-001', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByIdForDisplay', () => {
    it('should return question without correct answer', async () => {
      const mockQuestion = createMockQuestion();
      mockPrismaQuestion.findFirst.mockResolvedValueOnce(mockQuestion);

      const result = await service.getByIdForDisplay('tenant-001', 'question-001');

      expect(result?.stem).toBe('What is 2 + 2?');
      expect((result as any).correctAnswer).toBeUndefined();
    });
  });

  // ===========================================================================
  // LIST TESTS
  // ===========================================================================

  describe('list', () => {
    it('should return paginated results', async () => {
      const mockData = [createMockQuestion()];
      mockPrismaQuestion.findMany.mockResolvedValueOnce(mockData);
      mockPrismaQuestion.count.mockResolvedValueOnce(50);

      const result = await service.list('tenant-001', { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
    });

    it('should filter by type', async () => {
      mockPrismaQuestion.findMany.mockResolvedValueOnce([]);
      mockPrismaQuestion.count.mockResolvedValueOnce(0);

      await service.list('tenant-001', { page: 1, pageSize: 10, type: 'ESSAY' });

      const findManyArg = mockPrismaQuestion.findMany.mock.calls[0][0];
      expect(findManyArg.where.type).toBe('ESSAY');
    });

    it('should filter by difficulty', async () => {
      mockPrismaQuestion.findMany.mockResolvedValueOnce([]);
      mockPrismaQuestion.count.mockResolvedValueOnce(0);

      await service.list('tenant-001', { page: 1, pageSize: 10, difficulty: 'HARD' });

      const findManyArg = mockPrismaQuestion.findMany.mock.calls[0][0];
      expect(findManyArg.where.difficulty).toBe('HARD');
    });

    it('should filter by tags', async () => {
      mockPrismaQuestion.findMany.mockResolvedValueOnce([]);
      mockPrismaQuestion.count.mockResolvedValueOnce(0);

      await service.list('tenant-001', {
        page: 1,
        pageSize: 10,
        tags: ['math', 'grade-5'],
      });

      const findManyArg = mockPrismaQuestion.findMany.mock.calls[0][0];
      expect(findManyArg.where.tags.hasEvery).toEqual(['math', 'grade-5']);
    });

    it('should support text search', async () => {
      mockPrismaQuestion.findMany.mockResolvedValueOnce([]);
      mockPrismaQuestion.count.mockResolvedValueOnce(0);

      await service.list('tenant-001', { page: 1, pageSize: 10, search: 'addition' });

      const findManyArg = mockPrismaQuestion.findMany.mock.calls[0][0];
      expect(findManyArg.where.OR).toBeDefined();
    });

    it('should apply pagination correctly', async () => {
      mockPrismaQuestion.findMany.mockResolvedValueOnce([]);
      mockPrismaQuestion.count.mockResolvedValueOnce(100);

      await service.list('tenant-001', { page: 3, pageSize: 20 });

      const findManyArg = mockPrismaQuestion.findMany.mock.calls[0][0];
      expect(findManyArg.skip).toBe(40); // (3-1) * 20
      expect(findManyArg.take).toBe(20);
    });
  });

  // ===========================================================================
  // UPDATE TESTS
  // ===========================================================================

  describe('update', () => {
    it('should update question fields', async () => {
      const updated = createMockQuestion({ stem: 'Updated stem' });
      mockPrismaQuestion.update.mockResolvedValueOnce(updated);

      const result = await service.update('tenant-001', 'question-001', {
        stem: 'Updated stem',
      });

      expect(result.stem).toBe('Updated stem');
    });

    it('should publish question.updated event', async () => {
      mockPrismaQuestion.update.mockResolvedValueOnce(createMockQuestion());

      await service.update('tenant-001', 'question-001', {
        difficulty: 'HARD',
        points: 5,
      });

      expect(mockPublishEvent).toHaveBeenCalledWith('question.updated', {
        questionId: 'question-001',
        tenantId: 'tenant-001',
        changes: ['difficulty', 'points'],
      });
    });
  });

  // ===========================================================================
  // DELETE TESTS
  // ===========================================================================

  describe('delete', () => {
    it('should delete unused question', async () => {
      mockPrismaAssessmentQuestion.count.mockResolvedValueOnce(0);

      await service.delete('tenant-001', 'question-001');

      expect(mockPrismaQuestion.delete).toHaveBeenCalledWith({
        where: { id: 'question-001' },
      });
    });

    it('should throw error when question is in use', async () => {
      mockPrismaAssessmentQuestion.count.mockResolvedValueOnce(3);

      await expect(service.delete('tenant-001', 'question-001')).rejects.toThrow(
        'Cannot delete question: it is used in 3 assessment(s)'
      );
    });

    it('should publish question.deleted event', async () => {
      mockPrismaAssessmentQuestion.count.mockResolvedValueOnce(0);

      await service.delete('tenant-001', 'question-001');

      expect(mockPublishEvent).toHaveBeenCalledWith('question.deleted', {
        questionId: 'question-001',
        tenantId: 'tenant-001',
      });
    });
  });

  // ===========================================================================
  // STATS TESTS
  // ===========================================================================

  describe('updateStats', () => {
    it('should calculate stats from responses', async () => {
      mockPrismaQuestionResponse.findMany.mockResolvedValueOnce([
        { isCorrect: true, responseTimeSeconds: 10 },
        { isCorrect: true, responseTimeSeconds: 15 },
        { isCorrect: false, responseTimeSeconds: 20 },
        { isCorrect: true, responseTimeSeconds: 12 },
      ]);

      const result = await service.updateStats('question-001');

      expect(result.timesAnswered).toBe(4);
      expect(result.correctRate).toBe(75); // 3/4 = 75%
      expect(result.averageTimeSeconds).toBe(14); // (10+15+20+12)/4 = 14.25 rounded
    });

    it('should return zero stats when no responses', async () => {
      mockPrismaQuestionResponse.findMany.mockResolvedValueOnce([]);

      const result = await service.updateStats('question-001');

      expect(result.timesAnswered).toBe(0);
      expect(result.correctRate).toBe(0);
    });

    it('should update question with new stats', async () => {
      mockPrismaQuestionResponse.findMany.mockResolvedValueOnce([
        { isCorrect: true, responseTimeSeconds: 10 },
      ]);

      await service.updateStats('question-001');

      expect(mockPrismaQuestion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'question-001' },
          data: { stats: expect.any(Object) },
        })
      );
    });
  });

  // ===========================================================================
  // DUPLICATE TESTS
  // ===========================================================================

  describe('duplicateQuestion', () => {
    it('should create copy of question', async () => {
      const original = createMockQuestion();
      mockPrismaQuestion.findFirst.mockResolvedValueOnce(original);
      mockPrismaQuestion.create.mockImplementationOnce(({ data }) => ({
        id: 'question-002',
        ...data,
      }));

      const result = await service.duplicateQuestion('tenant-001', 'question-001', 'new-author');

      expect(result.stem).toContain('(Copy)');
    });

    it('should throw error when original not found', async () => {
      mockPrismaQuestion.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.duplicateQuestion('tenant-001', 'nonexistent', 'author')
      ).rejects.toThrow('Question not found');
    });
  });

  // ===========================================================================
  // BULK OPERATIONS TESTS
  // ===========================================================================

  describe('bulkAddTags', () => {
    it('should add tags to multiple questions', async () => {
      const q1 = createMockQuestion({ id: 'q1', tags: ['existing'] });
      const q2 = createMockQuestion({ id: 'q2', tags: ['other'] });

      mockPrismaQuestion.findFirst
        .mockResolvedValueOnce(q1)
        .mockResolvedValueOnce(q2);

      const count = await service.bulkAddTags('tenant-001', ['q1', 'q2'], ['new-tag']);

      expect(count).toBe(2);
      expect(mockPrismaQuestion.update).toHaveBeenCalledTimes(2);
    });

    it('should not duplicate existing tags', async () => {
      const q1 = createMockQuestion({ id: 'q1', tags: ['existing', 'tag1'] });
      mockPrismaQuestion.findFirst.mockResolvedValueOnce(q1);

      await service.bulkAddTags('tenant-001', ['q1'], ['existing', 'new']);

      const updateCall = mockPrismaQuestion.update.mock.calls[0][0];
      expect(updateCall.data.tags).toEqual(['existing', 'tag1', 'new']);
    });
  });
});

// =============================================================================
// QUESTION TYPE VALIDATION TESTS
// =============================================================================

describe('Question Type Handling', () => {
  const questionTypes: QuestionType[] = [
    'MULTIPLE_CHOICE',
    'MULTIPLE_SELECT',
    'TRUE_FALSE',
    'SHORT_ANSWER',
    'NUMERIC',
    'ORDERING',
    'MATCHING',
    'FILL_BLANK',
    'ESSAY',
  ];

  questionTypes.forEach((type) => {
    it(`should create ${type} question`, async () => {
      const service = new QuestionService();
      mockPrismaQuestion.create.mockImplementationOnce(({ data }) => ({
        id: 'test-id',
        ...data,
      }));

      const result = await service.create('tenant', 'author', {
        type,
        stem: 'Test question',
        correctAnswer: {},
      });

      expect(result.type).toBe(type);
    });
  });
});

// =============================================================================
// DIFFICULTY LEVEL TESTS
// =============================================================================

describe('Difficulty Level Handling', () => {
  const difficulties: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

  difficulties.forEach((difficulty) => {
    it(`should handle ${difficulty} difficulty`, async () => {
      const service = new QuestionService();
      const mockQuestion = createMockQuestion({ difficulty });
      mockPrismaQuestion.findMany.mockResolvedValueOnce([mockQuestion]);
      mockPrismaQuestion.count.mockResolvedValueOnce(1);

      const result = await service.list('tenant', { page: 1, pageSize: 10, difficulty });

      expect(result.data[0].difficulty).toBe(difficulty);
    });
  });
});
