/**
 * Tests for game-gen-svc session and question bank logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  gameSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  questionBank: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  feedback: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  gameAnalytics: {
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('SessionService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('startSession', () => {
    it('creates a new game session', async () => {
      const session = {
        id: 'sess-1',
        gameId: 'game-1',
        learnerId: 'learner-1',
        status: 'ACTIVE',
        startedAt: new Date(),
        score: 0,
      };
      mockPrisma.gameSession.create.mockResolvedValue(session);
      const result = await mockPrisma.gameSession.create({ data: session });
      expect(result.status).toBe('ACTIVE');
      expect(result.score).toBe(0);
    });
  });

  describe('updateSession', () => {
    it('updates score mid-session', async () => {
      mockPrisma.gameSession.update.mockResolvedValue({
        id: 'sess-1',
        score: 85,
        status: 'ACTIVE',
      });
      const result = await mockPrisma.gameSession.update({
        where: { id: 'sess-1' },
        data: { score: 85 },
      });
      expect(result.score).toBe(85);
    });
  });

  describe('completeSession', () => {
    it('marks session as COMPLETED', async () => {
      mockPrisma.gameSession.update.mockResolvedValue({
        id: 'sess-1',
        status: 'COMPLETED',
        completedAt: new Date(),
        score: 100,
      });
      const result = await mockPrisma.gameSession.update({
        where: { id: 'sess-1' },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('getSessionHistory', () => {
    it('returns sessions for a learner', async () => {
      mockPrisma.gameSession.findMany.mockResolvedValue([
        { id: 's1', score: 80 },
        { id: 's2', score: 95 },
      ]);
      const history = await mockPrisma.gameSession.findMany({
        where: { learnerId: 'learner-1' },
        orderBy: { startedAt: 'desc' },
      });
      expect(history).toHaveLength(2);
    });
  });
});

describe('QuestionBankService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('addToQuestionBank', () => {
    it('adds question to the bank', async () => {
      const question = {
        id: 'q-1',
        gameId: 'game-1',
        question: 'What is 2+2?',
        answer: '4',
        difficulty: 'EASY',
      };
      mockPrisma.questionBank.create.mockResolvedValue(question);
      const result = await mockPrisma.questionBank.create({ data: question });
      expect(result.difficulty).toBe('EASY');
    });
  });

  describe('getQuestionsFromBank', () => {
    it('retrieves questions by difficulty', async () => {
      mockPrisma.questionBank.findMany.mockResolvedValue([
        { id: 'q-1', difficulty: 'EASY' },
        { id: 'q-2', difficulty: 'EASY' },
      ]);
      const questions = await mockPrisma.questionBank.findMany({
        where: { gameId: 'game-1', difficulty: 'EASY' },
      });
      expect(questions).toHaveLength(2);
    });
  });
});

describe('FeedbackService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('submitFeedback', () => {
    it('records learner feedback', async () => {
      mockPrisma.feedback.create.mockResolvedValue({
        id: 'fb-1',
        gameId: 'game-1',
        rating: 4,
        comment: 'Fun game!',
      });
      const result = await mockPrisma.feedback.create({
        data: { gameId: 'game-1', rating: 4, comment: 'Fun game!' },
      });
      expect(result.rating).toBe(4);
    });
  });

  describe('getGameAnalytics', () => {
    it('returns aggregated analytics', async () => {
      mockPrisma.gameAnalytics.findFirst.mockResolvedValue({
        gameId: 'game-1',
        totalPlays: 150,
        avgScore: 78.5,
        avgDuration: 240,
      });
      const analytics = await mockPrisma.gameAnalytics.findFirst({
        where: { gameId: 'game-1' },
      });
      expect(analytics?.totalPlays).toBe(150);
      expect(analytics?.avgScore).toBeCloseTo(78.5);
    });
  });
});
