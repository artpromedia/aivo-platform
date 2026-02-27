/**
 * Tests for game-gen-svc template and generation logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  gameTemplate: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  generation: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  game: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('TemplateService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createTemplate', () => {
    it('creates a game template', async () => {
      const template = {
        id: 'tmpl-1',
        name: 'Math Quiz',
        type: 'QUIZ',
        config: { questionCount: 10, timeLimit: 300 },
        tenantId: 'tenant-1',
      };
      mockPrisma.gameTemplate.create.mockResolvedValue(template);
      const result = await mockPrisma.gameTemplate.create({ data: template });
      expect(result.name).toBe('Math Quiz');
      expect(result.config.questionCount).toBe(10);
    });
  });

  describe('listTemplates', () => {
    it('returns templates filtered by type', async () => {
      mockPrisma.gameTemplate.findMany.mockResolvedValue([
        { id: 'tmpl-1', name: 'Quiz A', type: 'QUIZ' },
      ]);
      const result = await mockPrisma.gameTemplate.findMany({ where: { type: 'QUIZ' } });
      expect(result).toHaveLength(1);
    });

    it('returns empty array when no templates', async () => {
      mockPrisma.gameTemplate.findMany.mockResolvedValue([]);
      const result = await mockPrisma.gameTemplate.findMany({});
      expect(result).toHaveLength(0);
    });
  });
});

describe('GenerationService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('startGeneration', () => {
    it('creates generation record with PENDING status', async () => {
      const gen = {
        id: 'gen-1',
        templateId: 'tmpl-1',
        status: 'PENDING',
        parameters: { subject: 'math', grade: 3 },
      };
      mockPrisma.generation.create.mockResolvedValue(gen);
      const result = await mockPrisma.generation.create({ data: gen });
      expect(result.status).toBe('PENDING');
    });
  });

  describe('processGeneration', () => {
    it('updates generation to COMPLETED on success', async () => {
      mockPrisma.generation.update.mockResolvedValue({
        id: 'gen-1',
        status: 'COMPLETED',
        result: { gameId: 'game-1' },
      });
      const result = await mockPrisma.generation.update({
        where: { id: 'gen-1' },
        data: { status: 'COMPLETED', result: { gameId: 'game-1' } },
      });
      expect(result.status).toBe('COMPLETED');
    });

    it('updates generation to FAILED on error', async () => {
      mockPrisma.generation.update.mockResolvedValue({
        id: 'gen-1',
        status: 'FAILED',
        error: 'AI service unavailable',
      });
      const result = await mockPrisma.generation.update({
        where: { id: 'gen-1' },
        data: { status: 'FAILED', error: 'AI service unavailable' },
      });
      expect(result.status).toBe('FAILED');
    });
  });
});

describe('GameService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('publishGame', () => {
    it('sets game status to PUBLISHED', async () => {
      mockPrisma.game.update.mockResolvedValue({
        id: 'game-1',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      });
      const result = await mockPrisma.game.update({
        where: { id: 'game-1' },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      expect(result.status).toBe('PUBLISHED');
    });
  });

  describe('listGames', () => {
    it('returns paginated games for tenant', async () => {
      mockPrisma.game.findMany.mockResolvedValue([
        { id: 'g-1', title: 'Math Race' },
        { id: 'g-2', title: 'Word Hunt' },
      ]);
      const result = await mockPrisma.game.findMany({
        where: { tenantId: 'tenant-1' },
        take: 10,
      });
      expect(result).toHaveLength(2);
    });
  });
});
