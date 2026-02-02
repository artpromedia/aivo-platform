/**
 * Unit Tests for Assessment Service
 *
 * Tests for:
 * - Assessment CRUD operations
 * - Question bank operations
 * - Status management
 * - Event publishing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockPrismaAssessment = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockPrismaQuestion = {
  findFirst: vi.fn(),
  findMany: vi.fn(),
};

const mockPrismaAssessmentQuestion = {
  create: vi.fn(),
  delete: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
  findFirst: vi.fn(),
};

vi.mock('../prisma.js', () => ({
  prisma: {
    assessment: mockPrismaAssessment,
    question: mockPrismaQuestion,
    assessmentQuestion: mockPrismaAssessmentQuestion,
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

type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type AssessmentType = 'QUIZ' | 'TEST' | 'PRACTICE' | 'DIAGNOSTIC';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface Assessment {
  id: string;
  tenantId: string;
  authorId: string;
  title: string;
  description?: string;
  type: AssessmentType;
  settings: Record<string, unknown>;
  subjectId?: string;
  topicIds: string[];
  difficulty: Difficulty;
  estimatedMinutes: number;
  status: AssessmentStatus;
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateAssessmentInput {
  title: string;
  description?: string;
  type: AssessmentType;
  settings?: Record<string, unknown>;
  subjectId?: string;
  topicIds?: string[];
  difficulty?: Difficulty;
  estimatedMinutes?: number;
}

interface AssessmentQuery {
  page: number;
  pageSize: number;
  type?: AssessmentType;
  status?: AssessmentStatus;
  subjectId?: string;
  difficulty?: Difficulty;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// SERVICE IMPLEMENTATION (Simplified for testing)
// =============================================================================

class AssessmentService {
  async create(
    tenantId: string,
    authorId: string,
    input: CreateAssessmentInput
  ): Promise<Assessment> {
    const assessment = await mockPrismaAssessment.create({
      data: {
        tenantId,
        authorId,
        title: input.title,
        description: input.description,
        type: input.type,
        settings: input.settings ?? {},
        subjectId: input.subjectId,
        topicIds: input.topicIds ?? [],
        difficulty: input.difficulty ?? 'MEDIUM',
        estimatedMinutes: input.estimatedMinutes ?? 15,
        status: 'DRAFT',
        totalPoints: 0,
      },
    });

    await mockPublishEvent('assessment.created', {
      assessmentId: assessment.id,
      tenantId,
      authorId,
      type: assessment.type,
    });

    return assessment;
  }

  async getById(
    tenantId: string,
    assessmentId: string,
    includeQuestions = false
  ): Promise<Assessment | null> {
    return mockPrismaAssessment.findFirst({
      where: { id: assessmentId, tenantId },
      include: includeQuestions
        ? {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: { question: true },
            },
          }
        : undefined,
    });
  }

  async list(tenantId: string, query: AssessmentQuery) {
    const where = {
      tenantId,
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
      ...(query.subjectId && { subjectId: query.subjectId }),
      ...(query.difficulty && { difficulty: query.difficulty }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      mockPrismaAssessment.findMany({
        where,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      mockPrismaAssessment.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async update(tenantId: string, assessmentId: string, input: Partial<CreateAssessmentInput>) {
    const existing = await this.getById(tenantId, assessmentId);
    if (!existing) throw new Error('Assessment not found');
    if (existing.status === 'PUBLISHED') throw new Error('Cannot modify published assessment');

    return mockPrismaAssessment.update({
      where: { id: assessmentId },
      data: input,
    });
  }

  async delete(tenantId: string, assessmentId: string) {
    const existing = await this.getById(tenantId, assessmentId);
    if (!existing) throw new Error('Assessment not found');
    if (existing.status === 'PUBLISHED') throw new Error('Cannot delete published assessment');

    await mockPrismaAssessment.delete({ where: { id: assessmentId } });

    await mockPublishEvent('assessment.deleted', {
      assessmentId,
      tenantId,
    });
  }

  async publish(tenantId: string, assessmentId: string) {
    const assessment = await this.getById(tenantId, assessmentId, true);
    if (!assessment) throw new Error('Assessment not found');
    if ((assessment as any).questions?.length === 0) {
      throw new Error('Cannot publish assessment with no questions');
    }

    const updated = await mockPrismaAssessment.update({
      where: { id: assessmentId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    await mockPublishEvent('assessment.published', {
      assessmentId,
      tenantId,
    });

    return updated;
  }

  async addQuestion(tenantId: string, assessmentId: string, questionId: string, points?: number) {
    const assessment = await this.getById(tenantId, assessmentId);
    if (!assessment) throw new Error('Assessment not found');
    if (assessment.status === 'PUBLISHED') {
      throw new Error('Cannot modify published assessment');
    }

    const question = await mockPrismaQuestion.findFirst({
      where: { id: questionId, tenantId },
    });
    if (!question) throw new Error('Question not found');

    const existingQuestions = await mockPrismaAssessmentQuestion.findMany({
      where: { assessmentId },
    });

    const link = await mockPrismaAssessmentQuestion.create({
      data: {
        assessmentId,
        questionId,
        orderIndex: existingQuestions.length,
        points: points ?? question.points,
      },
    });

    // Update total points
    const newTotal = assessment.totalPoints + (points ?? question.points);
    await mockPrismaAssessment.update({
      where: { id: assessmentId },
      data: { totalPoints: newTotal },
    });

    return link;
  }

  async removeQuestion(tenantId: string, assessmentId: string, questionId: string) {
    const assessment = await this.getById(tenantId, assessmentId);
    if (!assessment) throw new Error('Assessment not found');
    if (assessment.status === 'PUBLISHED') {
      throw new Error('Cannot modify published assessment');
    }

    const link = await mockPrismaAssessmentQuestion.findFirst({
      where: { assessmentId, questionId },
    });
    if (!link) throw new Error('Question not in assessment');

    await mockPrismaAssessmentQuestion.delete({
      where: { id: link.id },
    });

    // Update total points
    await mockPrismaAssessment.update({
      where: { id: assessmentId },
      data: { totalPoints: assessment.totalPoints - link.points },
    });
  }
}

// =============================================================================
// FIXTURES
// =============================================================================

const createMockAssessment = (overrides: Partial<Assessment> = {}): Assessment => ({
  id: 'assessment-001',
  tenantId: 'tenant-001',
  authorId: 'author-001',
  title: 'Math Quiz',
  description: 'Basic algebra quiz',
  type: 'QUIZ',
  settings: { shuffleQuestions: true },
  subjectId: 'subject-math',
  topicIds: ['topic-algebra'],
  difficulty: 'MEDIUM',
  estimatedMinutes: 15,
  status: 'DRAFT',
  totalPoints: 100,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

const createMockQuestion = (overrides = {}) => ({
  id: 'question-001',
  tenantId: 'tenant-001',
  stem: 'What is 2+2?',
  type: 'MULTIPLE_CHOICE',
  points: 10,
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('AssessmentService', () => {
  let service: AssessmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AssessmentService();
  });

  // ===========================================================================
  // CREATE TESTS
  // ===========================================================================

  describe('create', () => {
    it('should create assessment with required fields', async () => {
      const mockCreated = createMockAssessment();
      mockPrismaAssessment.create.mockResolvedValueOnce(mockCreated);

      const result = await service.create('tenant-001', 'author-001', {
        title: 'Math Quiz',
        type: 'QUIZ',
      });

      expect(result.id).toBe('assessment-001');
      expect(mockPrismaAssessment.create).toHaveBeenCalled();
    });

    it('should set default values', async () => {
      mockPrismaAssessment.create.mockImplementationOnce(({ data }) => Promise.resolve(data));

      await service.create('tenant-001', 'author-001', {
        title: 'Test',
        type: 'QUIZ',
      });

      const createArg = mockPrismaAssessment.create.mock.calls[0][0];
      expect(createArg.data.status).toBe('DRAFT');
      expect(createArg.data.totalPoints).toBe(0);
      expect(createArg.data.difficulty).toBe('MEDIUM');
      expect(createArg.data.estimatedMinutes).toBe(15);
    });

    it('should publish assessment.created event', async () => {
      const mockCreated = createMockAssessment();
      mockPrismaAssessment.create.mockResolvedValueOnce(mockCreated);

      await service.create('tenant-001', 'author-001', {
        title: 'Test',
        type: 'QUIZ',
      });

      expect(mockPublishEvent).toHaveBeenCalledWith('assessment.created', {
        assessmentId: 'assessment-001',
        tenantId: 'tenant-001',
        authorId: 'author-001',
        type: 'QUIZ',
      });
    });

    it('should accept optional fields', async () => {
      mockPrismaAssessment.create.mockImplementationOnce(({ data }) => Promise.resolve(data));

      await service.create('tenant-001', 'author-001', {
        title: 'Full Test',
        type: 'TEST',
        description: 'A complete test',
        difficulty: 'HARD',
        estimatedMinutes: 60,
        subjectId: 'subject-001',
        topicIds: ['topic-1', 'topic-2'],
        settings: { timeLimit: 3600 },
      });

      const data = mockPrismaAssessment.create.mock.calls[0][0].data;
      expect(data.description).toBe('A complete test');
      expect(data.difficulty).toBe('HARD');
      expect(data.estimatedMinutes).toBe(60);
    });
  });

  // ===========================================================================
  // GET BY ID TESTS
  // ===========================================================================

  describe('getById', () => {
    it('should return assessment by ID', async () => {
      const mockAssessment = createMockAssessment();
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);

      const result = await service.getById('tenant-001', 'assessment-001');

      expect(result?.id).toBe('assessment-001');
      expect(mockPrismaAssessment.findFirst).toHaveBeenCalledWith({
        where: { id: 'assessment-001', tenantId: 'tenant-001' },
        include: undefined,
      });
    });

    it('should return null when not found', async () => {
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(null);

      const result = await service.getById('tenant-001', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should include questions when requested', async () => {
      const mockWithQuestions = {
        ...createMockAssessment(),
        questions: [{ questionId: 'q1', question: createMockQuestion() }],
      };
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockWithQuestions);

      await service.getById('tenant-001', 'assessment-001', true);

      expect(mockPrismaAssessment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            questions: expect.any(Object),
          }),
        })
      );
    });
  });

  // ===========================================================================
  // LIST TESTS
  // ===========================================================================

  describe('list', () => {
    it('should return paginated results', async () => {
      const mockData = [createMockAssessment()];
      mockPrismaAssessment.findMany.mockResolvedValueOnce(mockData);
      mockPrismaAssessment.count.mockResolvedValueOnce(1);

      const result = await service.list('tenant-001', {
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should filter by type', async () => {
      mockPrismaAssessment.findMany.mockResolvedValueOnce([]);
      mockPrismaAssessment.count.mockResolvedValueOnce(0);

      await service.list('tenant-001', {
        page: 1,
        pageSize: 10,
        type: 'QUIZ',
      });

      const findManyArg = mockPrismaAssessment.findMany.mock.calls[0][0];
      expect(findManyArg.where.type).toBe('QUIZ');
    });

    it('should filter by status', async () => {
      mockPrismaAssessment.findMany.mockResolvedValueOnce([]);
      mockPrismaAssessment.count.mockResolvedValueOnce(0);

      await service.list('tenant-001', {
        page: 1,
        pageSize: 10,
        status: 'PUBLISHED',
      });

      const findManyArg = mockPrismaAssessment.findMany.mock.calls[0][0];
      expect(findManyArg.where.status).toBe('PUBLISHED');
    });

    it('should filter by difficulty', async () => {
      mockPrismaAssessment.findMany.mockResolvedValueOnce([]);
      mockPrismaAssessment.count.mockResolvedValueOnce(0);

      await service.list('tenant-001', {
        page: 1,
        pageSize: 10,
        difficulty: 'HARD',
      });

      const findManyArg = mockPrismaAssessment.findMany.mock.calls[0][0];
      expect(findManyArg.where.difficulty).toBe('HARD');
    });

    it('should support text search', async () => {
      mockPrismaAssessment.findMany.mockResolvedValueOnce([]);
      mockPrismaAssessment.count.mockResolvedValueOnce(0);

      await service.list('tenant-001', {
        page: 1,
        pageSize: 10,
        search: 'algebra',
      });

      const findManyArg = mockPrismaAssessment.findMany.mock.calls[0][0];
      expect(findManyArg.where.OR).toBeDefined();
    });

    it('should apply pagination correctly', async () => {
      mockPrismaAssessment.findMany.mockResolvedValueOnce([]);
      mockPrismaAssessment.count.mockResolvedValueOnce(100);

      await service.list('tenant-001', {
        page: 3,
        pageSize: 20,
      });

      const findManyArg = mockPrismaAssessment.findMany.mock.calls[0][0];
      expect(findManyArg.skip).toBe(40); // (3-1) * 20
      expect(findManyArg.take).toBe(20);
    });

    it('should sort by specified field', async () => {
      mockPrismaAssessment.findMany.mockResolvedValueOnce([]);
      mockPrismaAssessment.count.mockResolvedValueOnce(0);

      await service.list('tenant-001', {
        page: 1,
        pageSize: 10,
        sortBy: 'title',
        sortOrder: 'asc',
      });

      const findManyArg = mockPrismaAssessment.findMany.mock.calls[0][0];
      expect(findManyArg.orderBy).toEqual({ title: 'asc' });
    });
  });

  // ===========================================================================
  // UPDATE TESTS
  // ===========================================================================

  describe('update', () => {
    it('should update assessment fields', async () => {
      const mockAssessment = createMockAssessment({ status: 'DRAFT' });
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);
      mockPrismaAssessment.update.mockResolvedValueOnce({
        ...mockAssessment,
        title: 'Updated Title',
      });

      const result = await service.update('tenant-001', 'assessment-001', {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw error when assessment not found', async () => {
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.update('tenant-001', 'nonexistent', { title: 'Test' })
      ).rejects.toThrow('Assessment not found');
    });

    it('should throw error when assessment is published', async () => {
      const mockAssessment = createMockAssessment({ status: 'PUBLISHED' });
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);

      await expect(
        service.update('tenant-001', 'assessment-001', { title: 'Test' })
      ).rejects.toThrow('Cannot modify published assessment');
    });
  });

  // ===========================================================================
  // DELETE TESTS
  // ===========================================================================

  describe('delete', () => {
    it('should delete draft assessment', async () => {
      const mockAssessment = createMockAssessment({ status: 'DRAFT' });
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);

      await service.delete('tenant-001', 'assessment-001');

      expect(mockPrismaAssessment.delete).toHaveBeenCalledWith({
        where: { id: 'assessment-001' },
      });
    });

    it('should publish assessment.deleted event', async () => {
      const mockAssessment = createMockAssessment({ status: 'DRAFT' });
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);

      await service.delete('tenant-001', 'assessment-001');

      expect(mockPublishEvent).toHaveBeenCalledWith('assessment.deleted', {
        assessmentId: 'assessment-001',
        tenantId: 'tenant-001',
      });
    });

    it('should throw error when assessment not found', async () => {
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(null);

      await expect(service.delete('tenant-001', 'nonexistent')).rejects.toThrow(
        'Assessment not found'
      );
    });

    it('should throw error when assessment is published', async () => {
      const mockAssessment = createMockAssessment({ status: 'PUBLISHED' });
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);

      await expect(service.delete('tenant-001', 'assessment-001')).rejects.toThrow(
        'Cannot delete published assessment'
      );
    });
  });

  // ===========================================================================
  // PUBLISH TESTS
  // ===========================================================================

  describe('publish', () => {
    it('should publish assessment with questions', async () => {
      const mockAssessment = {
        ...createMockAssessment({ status: 'DRAFT' }),
        questions: [{ questionId: 'q1' }],
      };
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);
      mockPrismaAssessment.update.mockResolvedValueOnce({
        ...mockAssessment,
        status: 'PUBLISHED',
      });

      const result = await service.publish('tenant-001', 'assessment-001');

      expect(result.status).toBe('PUBLISHED');
    });

    it('should throw error when no questions', async () => {
      const mockAssessment = {
        ...createMockAssessment({ status: 'DRAFT' }),
        questions: [],
      };
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);

      await expect(service.publish('tenant-001', 'assessment-001')).rejects.toThrow(
        'Cannot publish assessment with no questions'
      );
    });

    it('should publish assessment.published event', async () => {
      const mockAssessment = {
        ...createMockAssessment({ status: 'DRAFT' }),
        questions: [{ questionId: 'q1' }],
      };
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);
      mockPrismaAssessment.update.mockResolvedValueOnce({
        ...mockAssessment,
        status: 'PUBLISHED',
      });

      await service.publish('tenant-001', 'assessment-001');

      expect(mockPublishEvent).toHaveBeenCalledWith('assessment.published', {
        assessmentId: 'assessment-001',
        tenantId: 'tenant-001',
      });
    });
  });

  // ===========================================================================
  // ADD QUESTION TESTS
  // ===========================================================================

  describe('addQuestion', () => {
    it('should add question to assessment', async () => {
      const mockAssessment = createMockAssessment({ status: 'DRAFT', totalPoints: 50 });
      const mockQuestion = createMockQuestion({ points: 10 });

      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);
      mockPrismaQuestion.findFirst.mockResolvedValueOnce(mockQuestion);
      mockPrismaAssessmentQuestion.findMany.mockResolvedValueOnce([]);
      mockPrismaAssessmentQuestion.create.mockResolvedValueOnce({
        id: 'link-001',
        assessmentId: 'assessment-001',
        questionId: 'question-001',
        orderIndex: 0,
        points: 10,
      });

      const result = await service.addQuestion('tenant-001', 'assessment-001', 'question-001');

      expect(result.questionId).toBe('question-001');
    });

    it('should use custom points when provided', async () => {
      const mockAssessment = createMockAssessment({ status: 'DRAFT', totalPoints: 50 });
      const mockQuestion = createMockQuestion({ points: 10 });

      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);
      mockPrismaQuestion.findFirst.mockResolvedValueOnce(mockQuestion);
      mockPrismaAssessmentQuestion.findMany.mockResolvedValueOnce([]);
      mockPrismaAssessmentQuestion.create.mockImplementationOnce(({ data }) =>
        Promise.resolve(data)
      );

      await service.addQuestion('tenant-001', 'assessment-001', 'question-001', 25);

      const createArg = mockPrismaAssessmentQuestion.create.mock.calls[0][0];
      expect(createArg.data.points).toBe(25);
    });

    it('should set correct order index', async () => {
      const mockAssessment = createMockAssessment({ status: 'DRAFT' });
      const mockQuestion = createMockQuestion();

      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);
      mockPrismaQuestion.findFirst.mockResolvedValueOnce(mockQuestion);
      mockPrismaAssessmentQuestion.findMany.mockResolvedValueOnce([{}, {}, {}]); // 3 existing
      mockPrismaAssessmentQuestion.create.mockImplementationOnce(({ data }) =>
        Promise.resolve(data)
      );

      await service.addQuestion('tenant-001', 'assessment-001', 'question-001');

      const createArg = mockPrismaAssessmentQuestion.create.mock.calls[0][0];
      expect(createArg.data.orderIndex).toBe(3);
    });

    it('should update total points', async () => {
      const mockAssessment = createMockAssessment({ status: 'DRAFT', totalPoints: 50 });
      const mockQuestion = createMockQuestion({ points: 10 });

      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);
      mockPrismaQuestion.findFirst.mockResolvedValueOnce(mockQuestion);
      mockPrismaAssessmentQuestion.findMany.mockResolvedValueOnce([]);
      mockPrismaAssessmentQuestion.create.mockResolvedValueOnce({});

      await service.addQuestion('tenant-001', 'assessment-001', 'question-001');

      expect(mockPrismaAssessment.update).toHaveBeenCalledWith({
        where: { id: 'assessment-001' },
        data: { totalPoints: 60 },
      });
    });

    it('should throw error when assessment not found', async () => {
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.addQuestion('tenant-001', 'assessment-001', 'question-001')
      ).rejects.toThrow('Assessment not found');
    });

    it('should throw error when question not found', async () => {
      const mockAssessment = createMockAssessment({ status: 'DRAFT' });
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);
      mockPrismaQuestion.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.addQuestion('tenant-001', 'assessment-001', 'question-001')
      ).rejects.toThrow('Question not found');
    });

    it('should throw error when assessment is published', async () => {
      const mockAssessment = createMockAssessment({ status: 'PUBLISHED' });
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);

      await expect(
        service.addQuestion('tenant-001', 'assessment-001', 'question-001')
      ).rejects.toThrow('Cannot modify published assessment');
    });
  });

  // ===========================================================================
  // REMOVE QUESTION TESTS
  // ===========================================================================

  describe('removeQuestion', () => {
    it('should remove question from assessment', async () => {
      const mockAssessment = createMockAssessment({ status: 'DRAFT', totalPoints: 100 });
      const mockLink = {
        id: 'link-001',
        assessmentId: 'assessment-001',
        questionId: 'question-001',
        points: 10,
      };

      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);
      mockPrismaAssessmentQuestion.findFirst.mockResolvedValueOnce(mockLink);

      await service.removeQuestion('tenant-001', 'assessment-001', 'question-001');

      expect(mockPrismaAssessmentQuestion.delete).toHaveBeenCalledWith({
        where: { id: 'link-001' },
      });
    });

    it('should update total points', async () => {
      const mockAssessment = createMockAssessment({ status: 'DRAFT', totalPoints: 100 });
      const mockLink = { id: 'link-001', points: 25 };

      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);
      mockPrismaAssessmentQuestion.findFirst.mockResolvedValueOnce(mockLink);

      await service.removeQuestion('tenant-001', 'assessment-001', 'question-001');

      expect(mockPrismaAssessment.update).toHaveBeenCalledWith({
        where: { id: 'assessment-001' },
        data: { totalPoints: 75 },
      });
    });

    it('should throw error when question not in assessment', async () => {
      const mockAssessment = createMockAssessment({ status: 'DRAFT' });
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);
      mockPrismaAssessmentQuestion.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.removeQuestion('tenant-001', 'assessment-001', 'question-001')
      ).rejects.toThrow('Question not in assessment');
    });

    it('should throw error when assessment is published', async () => {
      const mockAssessment = createMockAssessment({ status: 'PUBLISHED' });
      mockPrismaAssessment.findFirst.mockResolvedValueOnce(mockAssessment);

      await expect(
        service.removeQuestion('tenant-001', 'assessment-001', 'question-001')
      ).rejects.toThrow('Cannot modify published assessment');
    });
  });
});
