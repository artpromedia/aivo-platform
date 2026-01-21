/**
 * Game Generation Service Unit Tests
 * Tests for game template management, AI content generation, and game lifecycle
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCK TYPES
// ══════════════════════════════════════════════════════════════════════════════

type GameType = 'QUIZ' | 'MATCHING' | 'FLASHCARDS' | 'WORD_SEARCH' | 'CROSSWORD' | 'MEMORY' | 'DRAG_DROP';
type GenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'ADAPTIVE';
type ContentSource = 'LESSON' | 'STANDARD' | 'CUSTOM_TEXT' | 'DOCUMENT';

interface MockGameTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  gameType: GameType;
  category?: string;
  tags: string[];
  configSchema: Record<string, unknown>;
  defaultConfig?: Record<string, unknown>;
  isPublic: boolean;
  createdBy: string;
}

interface MockGameGeneration {
  id: string;
  tenantId: string;
  templateId?: string;
  gameType: GameType;
  title: string;
  description?: string;
  sourceType: ContentSource;
  sourceId?: string;
  sourceContent?: string;
  learningObjectives: string[];
  targetAudience?: string;
  difficulty: DifficultyLevel;
  config?: Record<string, unknown>;
  status: GenerationStatus;
  generatedContent?: Record<string, unknown>;
  error?: string;
  generatedBy: string;
  createdAt: Date;
  completedAt?: Date;
}

interface MockGameInstance {
  id: string;
  tenantId: string;
  generationId: string;
  title: string;
  gameData: Record<string, unknown>;
  isPublished: boolean;
  playCount: number;
  avgScore?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK PRISMA
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  gameTemplate: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  gameGeneration: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  generationJob: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  gameInstance: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  gamePlaySession: {
    create: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
  },
};

// Mock AI client for content generation
const mockAIClient = {
  generateQuizQuestions: vi.fn(),
  generateMatchingPairs: vi.fn(),
  generateFlashcards: vi.fn(),
  generateWordSearch: vi.fn(),
  extractKeyTerms: vi.fn(),
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function createMockTemplate(overrides: Partial<MockGameTemplate> = {}): MockGameTemplate {
  return {
    id: 'tpl-001',
    tenantId: 'tenant-001',
    name: 'Basic Quiz Template',
    gameType: 'QUIZ',
    tags: ['assessment', 'quiz'],
    configSchema: {
      type: 'object',
      properties: {
        questionCount: { type: 'number', default: 10 },
        timeLimit: { type: 'number' },
        shuffleQuestions: { type: 'boolean', default: true },
      },
    },
    isPublic: false,
    createdBy: 'user-001',
    ...overrides,
  };
}

function createMockGeneration(overrides: Partial<MockGameGeneration> = {}): MockGameGeneration {
  return {
    id: 'gen-001',
    tenantId: 'tenant-001',
    gameType: 'QUIZ',
    title: 'Math Quiz - Fractions',
    sourceType: 'LESSON',
    sourceId: 'lesson-001',
    learningObjectives: ['Understand fraction concepts', 'Perform basic operations'],
    difficulty: 'MEDIUM',
    status: 'PENDING',
    generatedBy: 'user-001',
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockGameInstance(overrides: Partial<MockGameInstance> = {}): MockGameInstance {
  return {
    id: 'game-001',
    tenantId: 'tenant-001',
    generationId: 'gen-001',
    title: 'Math Quiz - Fractions',
    gameData: {
      questions: [],
      settings: {},
    },
    isPublished: false,
    playCount: 0,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GAME GENERATION SERVICE LOGIC
// ══════════════════════════════════════════════════════════════════════════════

class GameGenService {
  constructor(
    private prisma: typeof mockPrisma,
    private aiClient: typeof mockAIClient
  ) {}

  // Template Management
  async createTemplate(tenantId: string, data: {
    name: string;
    description?: string;
    gameType: GameType;
    configSchema: Record<string, unknown>;
    defaultConfig?: Record<string, unknown>;
    isPublic?: boolean;
    createdBy: string;
  }): Promise<MockGameTemplate> {
    return this.prisma.gameTemplate.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        gameType: data.gameType,
        tags: [],
        configSchema: data.configSchema,
        defaultConfig: data.defaultConfig,
        isPublic: data.isPublic || false,
        createdBy: data.createdBy,
      },
    }) as Promise<MockGameTemplate>;
  }

  async getTemplate(tenantId: string, templateId: string): Promise<MockGameTemplate | null> {
    return this.prisma.gameTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ tenantId }, { isPublic: true }],
      },
    }) as Promise<MockGameTemplate | null>;
  }

  async listTemplates(tenantId: string, filters?: {
    gameType?: GameType;
    includePublic?: boolean;
  }): Promise<MockGameTemplate[]> {
    return this.prisma.gameTemplate.findMany({
      where: {
        OR: [
          { tenantId },
          ...(filters?.includePublic !== false ? [{ isPublic: true }] : []),
        ],
        ...(filters?.gameType && { gameType: filters.gameType }),
      },
    }) as Promise<MockGameTemplate[]>;
  }

  // Generation Management
  async startGeneration(tenantId: string, data: {
    gameType: GameType;
    title: string;
    sourceType: ContentSource;
    sourceContent?: string;
    learningObjectives?: string[];
    difficulty?: DifficultyLevel;
    config?: Record<string, unknown>;
    generatedBy: string;
  }): Promise<MockGameGeneration> {
    // Validate source content
    if (!data.sourceContent && data.sourceType === 'CUSTOM_TEXT') {
      throw new Error('Source content required for custom text');
    }

    const generation = await this.prisma.gameGeneration.create({
      data: {
        tenantId,
        gameType: data.gameType,
        title: data.title,
        sourceType: data.sourceType,
        sourceContent: data.sourceContent,
        learningObjectives: data.learningObjectives || [],
        difficulty: data.difficulty || 'MEDIUM',
        config: data.config,
        generatedBy: data.generatedBy,
        status: 'PENDING',
      },
    }) as MockGameGeneration;

    // Queue generation job
    await this.prisma.generationJob.create({
      data: {
        tenantId,
        generationId: generation.id,
        status: 'PENDING',
      },
    });

    return generation;
  }

  async processGeneration(generationId: string): Promise<MockGameGeneration> {
    const generation = await this.prisma.gameGeneration.findFirst({
      where: { id: generationId },
    }) as MockGameGeneration | null;

    if (!generation) throw new Error('Generation not found');
    if (generation.status !== 'PENDING') throw new Error('Generation already processed');

    // Update status to processing
    await this.prisma.gameGeneration.update({
      where: { id: generationId },
      data: { status: 'PROCESSING' },
    });

    try {
      const content = await this.generateContent(generation);

      return this.prisma.gameGeneration.update({
        where: { id: generationId },
        data: {
          status: 'COMPLETED',
          generatedContent: content,
          completedAt: new Date(),
        },
      }) as Promise<MockGameGeneration>;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.prisma.gameGeneration.update({
        where: { id: generationId },
        data: {
          status: 'FAILED',
          error: errorMessage,
          completedAt: new Date(),
        },
      }) as Promise<MockGameGeneration>;
    }
  }

  private async generateContent(generation: MockGameGeneration): Promise<Record<string, unknown>> {
    const { gameType, sourceContent, learningObjectives, difficulty } = generation;

    switch (gameType) {
      case 'QUIZ':
        return this.aiClient.generateQuizQuestions({
          content: sourceContent,
          objectives: learningObjectives,
          difficulty,
          count: 10,
        });
      case 'MATCHING':
        return this.aiClient.generateMatchingPairs({
          content: sourceContent,
          objectives: learningObjectives,
          count: 8,
        });
      case 'FLASHCARDS':
        return this.aiClient.generateFlashcards({
          content: sourceContent,
          objectives: learningObjectives,
          count: 15,
        });
      case 'WORD_SEARCH':
        const terms = await this.aiClient.extractKeyTerms({
          content: sourceContent,
          count: 12,
        });
        return this.aiClient.generateWordSearch({
          terms,
          gridSize: 15,
        });
      default:
        return { type: gameType, items: [] };
    }
  }

  // Game Instance Management
  async createGameInstance(tenantId: string, generationId: string): Promise<MockGameInstance> {
    const generation = await this.prisma.gameGeneration.findFirst({
      where: { id: generationId, tenantId, status: 'COMPLETED' },
    }) as MockGameGeneration | null;

    if (!generation) throw new Error('Completed generation not found');

    return this.prisma.gameInstance.create({
      data: {
        tenantId,
        generationId,
        title: generation.title,
        gameData: generation.generatedContent || {},
        isPublished: false,
        playCount: 0,
      },
    }) as Promise<MockGameInstance>;
  }

  async publishGame(tenantId: string, gameId: string): Promise<MockGameInstance> {
    const game = await this.prisma.gameInstance.findFirst({
      where: { id: gameId, tenantId },
    }) as MockGameInstance | null;

    if (!game) throw new Error('Game not found');

    return this.prisma.gameInstance.update({
      where: { id: gameId },
      data: { isPublished: true },
    }) as Promise<MockGameInstance>;
  }

  async recordPlaySession(tenantId: string, gameId: string, data: {
    playerId: string;
    score: number;
    timeSpent: number;
    completed: boolean;
  }): Promise<void> {
    await this.prisma.gamePlaySession.create({
      data: {
        tenantId,
        gameId,
        playerId: data.playerId,
        score: data.score,
        timeSpent: data.timeSpent,
        completed: data.completed,
      },
    });

    // Update game stats
    const stats = await this.prisma.gamePlaySession.aggregate({
      where: { gameId },
      _avg: { score: true },
      _count: true,
    });

    await this.prisma.gameInstance.update({
      where: { id: gameId },
      data: {
        playCount: stats._count,
        avgScore: stats._avg.score,
      },
    });
  }

  // Validation helpers
  validateDifficulty(difficulty: DifficultyLevel, targetGrade?: number): boolean {
    if (!targetGrade) return true;
    
    const difficultyRanges: Record<DifficultyLevel, [number, number]> = {
      EASY: [1, 4],
      MEDIUM: [3, 8],
      HARD: [6, 12],
      ADAPTIVE: [1, 12],
    };
    
    const [min, max] = difficultyRanges[difficulty];
    return targetGrade >= min && targetGrade <= max;
  }

  calculateQuestionCount(contentLength: number, gameType: GameType): number {
    const baseCount: Record<GameType, number> = {
      QUIZ: 10,
      MATCHING: 8,
      FLASHCARDS: 15,
      WORD_SEARCH: 12,
      CROSSWORD: 15,
      MEMORY: 8,
      DRAG_DROP: 6,
    };

    const base = baseCount[gameType] || 10;
    
    // Scale based on content length (characters)
    if (contentLength < 500) return Math.ceil(base * 0.6);
    if (contentLength < 1500) return base;
    if (contentLength < 3000) return Math.ceil(base * 1.3);
    return Math.ceil(base * 1.5);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('GameGenService', () => {
  let service: GameGenService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GameGenService(mockPrisma, mockAIClient);
  });

  describe('Template Management', () => {
    describe('createTemplate', () => {
      it('should create template with default public=false', async () => {
        const expectedTemplate = createMockTemplate({ isPublic: false });
        mockPrisma.gameTemplate.create.mockResolvedValue(expectedTemplate);

        const result = await service.createTemplate('tenant-001', {
          name: 'Quiz Template',
          gameType: 'QUIZ',
          configSchema: { type: 'object' },
          createdBy: 'user-001',
        });

        expect(result.isPublic).toBe(false);
      });

      it('should create public template when specified', async () => {
        const expectedTemplate = createMockTemplate({ isPublic: true });
        mockPrisma.gameTemplate.create.mockResolvedValue(expectedTemplate);

        const result = await service.createTemplate('tenant-001', {
          name: 'Public Quiz Template',
          gameType: 'QUIZ',
          configSchema: { type: 'object' },
          isPublic: true,
          createdBy: 'user-001',
        });

        expect(result.isPublic).toBe(true);
      });
    });

    describe('getTemplate', () => {
      it('should return tenant template', async () => {
        const template = createMockTemplate({ tenantId: 'tenant-001' });
        mockPrisma.gameTemplate.findFirst.mockResolvedValue(template);

        const result = await service.getTemplate('tenant-001', 'tpl-001');

        expect(result).toBeDefined();
        expect(result?.tenantId).toBe('tenant-001');
      });

      it('should return public template from other tenant', async () => {
        const template = createMockTemplate({ tenantId: 'tenant-002', isPublic: true });
        mockPrisma.gameTemplate.findFirst.mockResolvedValue(template);

        const result = await service.getTemplate('tenant-001', 'tpl-001');

        expect(result).toBeDefined();
        expect(result?.isPublic).toBe(true);
      });
    });
  });

  describe('Generation Management', () => {
    describe('startGeneration', () => {
      it('should create generation with PENDING status', async () => {
        const expectedGeneration = createMockGeneration({ status: 'PENDING' });
        mockPrisma.gameGeneration.create.mockResolvedValue(expectedGeneration);
        mockPrisma.generationJob.create.mockResolvedValue({});

        const result = await service.startGeneration('tenant-001', {
          gameType: 'QUIZ',
          title: 'Math Quiz',
          sourceType: 'LESSON',
          generatedBy: 'user-001',
        });

        expect(result.status).toBe('PENDING');
        expect(mockPrisma.generationJob.create).toHaveBeenCalled();
      });

      it('should throw error for custom text without content', async () => {
        await expect(service.startGeneration('tenant-001', {
          gameType: 'QUIZ',
          title: 'Quiz',
          sourceType: 'CUSTOM_TEXT',
          generatedBy: 'user-001',
        })).rejects.toThrow('Source content required for custom text');
      });

      it('should set default difficulty to MEDIUM', async () => {
        const expectedGeneration = createMockGeneration({ difficulty: 'MEDIUM' });
        mockPrisma.gameGeneration.create.mockResolvedValue(expectedGeneration);
        mockPrisma.generationJob.create.mockResolvedValue({});

        const result = await service.startGeneration('tenant-001', {
          gameType: 'FLASHCARDS',
          title: 'Vocab Cards',
          sourceType: 'LESSON',
          generatedBy: 'user-001',
        });

        expect(result.difficulty).toBe('MEDIUM');
      });
    });

    describe('processGeneration', () => {
      it('should generate quiz questions', async () => {
        const generation = createMockGeneration({
          gameType: 'QUIZ',
          sourceContent: 'Test content',
        });
        mockPrisma.gameGeneration.findFirst.mockResolvedValue(generation);
        mockPrisma.gameGeneration.update.mockImplementation((args) =>
          Promise.resolve({ ...generation, ...args.data })
        );
        mockAIClient.generateQuizQuestions.mockResolvedValue({
          questions: [{ id: 'q1', text: 'Test question', options: [] }],
        });

        const result = await service.processGeneration('gen-001');

        expect(result.status).toBe('COMPLETED');
        expect(mockAIClient.generateQuizQuestions).toHaveBeenCalled();
      });

      it('should generate matching pairs', async () => {
        const generation = createMockGeneration({
          gameType: 'MATCHING',
          sourceContent: 'Test content',
        });
        mockPrisma.gameGeneration.findFirst.mockResolvedValue(generation);
        mockPrisma.gameGeneration.update.mockImplementation((args) =>
          Promise.resolve({ ...generation, ...args.data })
        );
        mockAIClient.generateMatchingPairs.mockResolvedValue({
          pairs: [{ left: 'Term', right: 'Definition' }],
        });

        const result = await service.processGeneration('gen-001');

        expect(result.status).toBe('COMPLETED');
        expect(mockAIClient.generateMatchingPairs).toHaveBeenCalled();
      });

      it('should handle generation failure', async () => {
        const generation = createMockGeneration({ gameType: 'QUIZ' });
        mockPrisma.gameGeneration.findFirst.mockResolvedValue(generation);
        mockPrisma.gameGeneration.update.mockImplementation((args) =>
          Promise.resolve({ ...generation, ...args.data })
        );
        mockAIClient.generateQuizQuestions.mockRejectedValue(new Error('AI service unavailable'));

        const result = await service.processGeneration('gen-001');

        expect(result.status).toBe('FAILED');
        expect(result.error).toBe('AI service unavailable');
      });

      it('should throw error if generation not found', async () => {
        mockPrisma.gameGeneration.findFirst.mockResolvedValue(null);

        await expect(service.processGeneration('gen-999'))
          .rejects.toThrow('Generation not found');
      });

      it('should throw error if already processed', async () => {
        const generation = createMockGeneration({ status: 'COMPLETED' });
        mockPrisma.gameGeneration.findFirst.mockResolvedValue(generation);

        await expect(service.processGeneration('gen-001'))
          .rejects.toThrow('Generation already processed');
      });
    });
  });

  describe('Game Instance Management', () => {
    describe('createGameInstance', () => {
      it('should create game from completed generation', async () => {
        const generation = createMockGeneration({
          status: 'COMPLETED',
          generatedContent: { questions: [] },
        });
        const expectedGame = createMockGameInstance();
        mockPrisma.gameGeneration.findFirst.mockResolvedValue(generation);
        mockPrisma.gameInstance.create.mockResolvedValue(expectedGame);

        const result = await service.createGameInstance('tenant-001', 'gen-001');

        expect(result.isPublished).toBe(false);
        expect(result.playCount).toBe(0);
      });

      it('should throw error if generation not completed', async () => {
        mockPrisma.gameGeneration.findFirst.mockResolvedValue(null);

        await expect(service.createGameInstance('tenant-001', 'gen-001'))
          .rejects.toThrow('Completed generation not found');
      });
    });

    describe('publishGame', () => {
      it('should publish game', async () => {
        const game = createMockGameInstance({ isPublished: false });
        mockPrisma.gameInstance.findFirst.mockResolvedValue(game);
        mockPrisma.gameInstance.update.mockResolvedValue({ ...game, isPublished: true });

        const result = await service.publishGame('tenant-001', 'game-001');

        expect(result.isPublished).toBe(true);
      });

      it('should throw error if game not found', async () => {
        mockPrisma.gameInstance.findFirst.mockResolvedValue(null);

        await expect(service.publishGame('tenant-001', 'game-999'))
          .rejects.toThrow('Game not found');
      });
    });

    describe('recordPlaySession', () => {
      it('should record session and update stats', async () => {
        mockPrisma.gamePlaySession.create.mockResolvedValue({});
        mockPrisma.gamePlaySession.aggregate.mockResolvedValue({
          _avg: { score: 85 },
          _count: 10,
        });
        mockPrisma.gameInstance.update.mockResolvedValue({});

        await service.recordPlaySession('tenant-001', 'game-001', {
          playerId: 'student-001',
          score: 90,
          timeSpent: 300,
          completed: true,
        });

        expect(mockPrisma.gamePlaySession.create).toHaveBeenCalled();
        expect(mockPrisma.gameInstance.update).toHaveBeenCalledWith({
          where: { id: 'game-001' },
          data: { playCount: 10, avgScore: 85 },
        });
      });
    });
  });

  describe('Validation Helpers', () => {
    describe('validateDifficulty', () => {
      it('should return true when no target grade', () => {
        expect(service.validateDifficulty('HARD')).toBe(true);
      });

      it('should validate EASY for grades 1-4', () => {
        expect(service.validateDifficulty('EASY', 2)).toBe(true);
        expect(service.validateDifficulty('EASY', 4)).toBe(true);
        expect(service.validateDifficulty('EASY', 6)).toBe(false);
      });

      it('should validate MEDIUM for grades 3-8', () => {
        expect(service.validateDifficulty('MEDIUM', 5)).toBe(true);
        expect(service.validateDifficulty('MEDIUM', 8)).toBe(true);
        expect(service.validateDifficulty('MEDIUM', 10)).toBe(false);
      });

      it('should validate HARD for grades 6-12', () => {
        expect(service.validateDifficulty('HARD', 8)).toBe(true);
        expect(service.validateDifficulty('HARD', 12)).toBe(true);
        expect(service.validateDifficulty('HARD', 3)).toBe(false);
      });

      it('should validate ADAPTIVE for all grades', () => {
        expect(service.validateDifficulty('ADAPTIVE', 1)).toBe(true);
        expect(service.validateDifficulty('ADAPTIVE', 12)).toBe(true);
      });
    });

    describe('calculateQuestionCount', () => {
      it('should return reduced count for short content', () => {
        expect(service.calculateQuestionCount(300, 'QUIZ')).toBe(6);
        expect(service.calculateQuestionCount(400, 'FLASHCARDS')).toBe(9);
      });

      it('should return base count for medium content', () => {
        expect(service.calculateQuestionCount(1000, 'QUIZ')).toBe(10);
        expect(service.calculateQuestionCount(1200, 'MATCHING')).toBe(8);
      });

      it('should return increased count for long content', () => {
        expect(service.calculateQuestionCount(2000, 'QUIZ')).toBe(13);
        expect(service.calculateQuestionCount(4000, 'QUIZ')).toBe(15);
      });

      it('should scale by game type base count', () => {
        expect(service.calculateQuestionCount(1000, 'FLASHCARDS')).toBe(15);
        expect(service.calculateQuestionCount(1000, 'DRAG_DROP')).toBe(6);
      });
    });
  });
});
