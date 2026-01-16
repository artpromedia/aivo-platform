import { prisma } from '../prisma.js';
import { GameType, GenerationStatus, DifficultyLevel, ContentSource } from '@prisma/client';
import { config } from '../config.js';

// Template Management
export async function createTemplate(tenantId: string, data: {
  name: string;
  description?: string;
  gameType: GameType;
  category?: string;
  tags?: string[];
  configSchema: Record<string, any>;
  defaultConfig?: Record<string, any>;
  previewImage?: string;
  isPublic?: boolean;
  createdBy: string;
}) {
  return prisma.gameTemplate.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      gameType: data.gameType,
      category: data.category,
      tags: data.tags || [],
      configSchema: data.configSchema,
      defaultConfig: data.defaultConfig,
      previewImage: data.previewImage,
      isPublic: data.isPublic || false,
      createdBy: data.createdBy,
    },
  });
}

export async function getTemplate(tenantId: string, templateId: string) {
  return prisma.gameTemplate.findFirst({
    where: {
      id: templateId,
      OR: [{ tenantId }, { isPublic: true }],
    },
  });
}

export async function listTemplates(tenantId: string, filters?: {
  gameType?: GameType;
  category?: string;
  includePublic?: boolean;
}) {
  return prisma.gameTemplate.findMany({
    where: {
      OR: [
        { tenantId },
        ...(filters?.includePublic !== false ? [{ isPublic: true }] : []),
      ],
      ...(filters?.gameType && { gameType: filters.gameType }),
      ...(filters?.category && { category: filters.category }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

// Game Generation
export async function startGeneration(tenantId: string, data: {
  templateId?: string;
  gameType: GameType;
  title: string;
  description?: string;
  sourceType: ContentSource;
  sourceId?: string;
  sourceContent?: string;
  learningObjectives?: string[];
  targetAudience?: string;
  difficulty?: DifficultyLevel;
  config?: Record<string, any>;
  generatedBy: string;
}) {
  const generation = await prisma.gameGeneration.create({
    data: {
      tenantId,
      templateId: data.templateId,
      gameType: data.gameType,
      title: data.title,
      description: data.description,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      sourceContent: data.sourceContent,
      learningObjectives: data.learningObjectives || [],
      targetAudience: data.targetAudience,
      difficulty: data.difficulty || 'MEDIUM',
      config: data.config,
      generatedBy: data.generatedBy,
      status: 'PENDING',
    },
  });

  // Queue generation job
  await prisma.generationJob.create({
    data: {
      tenantId,
      generationId: generation.id,
      status: 'pending',
    },
  });

  return generation;
}

export async function getGeneration(tenantId: string, generationId: string) {
  return prisma.gameGeneration.findFirst({
    where: { id: generationId, tenantId },
    include: { template: true, game: true },
  });
}

export async function listGenerations(tenantId: string, filters?: {
  status?: GenerationStatus;
  gameType?: GameType;
  limit?: number;
}) {
  return prisma.gameGeneration.findMany({
    where: {
      tenantId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.gameType && { gameType: filters.gameType }),
    },
    include: { template: true, game: true },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
  });
}

export async function processGeneration(generationId: string) {
  const generation = await prisma.gameGeneration.findUnique({
    where: { id: generationId },
    include: { template: true },
  });

  if (!generation) throw new Error('Generation not found');

  await prisma.gameGeneration.update({
    where: { id: generationId },
    data: { status: 'GENERATING', startedAt: new Date() },
  });

  try {
    const prompt = buildGenerationPrompt(generation);
    const generatedContent = await generateWithAI(prompt, generation.gameType);

    await prisma.gameGeneration.update({
      where: { id: generationId },
      data: {
        status: 'COMPLETED',
        aiPrompt: prompt,
        aiModel: config.openaiModel,
        generatedContent,
        completedAt: new Date(),
      },
    });

    // Create the game
    const game = await prisma.game.create({
      data: {
        tenantId: generation.tenantId,
        generationId: generation.id,
        title: generation.title,
        description: generation.description,
        gameType: generation.gameType,
        content: generatedContent,
        difficulty: generation.difficulty,
        estimatedTime: estimatePlayTime(generation.gameType, generatedContent),
        maxScore: calculateMaxScore(generatedContent),
        createdBy: generation.generatedBy,
      },
    });

    return game;
  } catch (error: any) {
    await prisma.gameGeneration.update({
      where: { id: generationId },
      data: {
        status: 'FAILED',
        error: error.message,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

// Game Management
export async function getGame(tenantId: string, gameId: string) {
  return prisma.game.findFirst({
    where: { id: gameId, tenantId },
    include: { generation: true },
  });
}

export async function listGames(tenantId: string, filters?: {
  gameType?: GameType;
  isPublished?: boolean;
  tags?: string[];
  limit?: number;
}) {
  return prisma.game.findMany({
    where: {
      tenantId,
      ...(filters?.gameType && { gameType: filters.gameType }),
      ...(filters?.isPublished !== undefined && { isPublished: filters.isPublished }),
      ...(filters?.tags && { tags: { hasSome: filters.tags } }),
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
  });
}

export async function updateGame(tenantId: string, gameId: string, data: {
  title?: string;
  description?: string;
  content?: Record<string, any>;
  settings?: Record<string, any>;
  tags?: string[];
}) {
  return prisma.game.update({
    where: { id: gameId, tenantId },
    data: {
      ...data,
      version: { increment: 1 },
    },
  });
}

export async function publishGame(tenantId: string, gameId: string) {
  return prisma.game.update({
    where: { id: gameId, tenantId },
    data: {
      isPublished: true,
      publishedAt: new Date(),
    },
  });
}

// Game Sessions
export async function startSession(tenantId: string, gameId: string, learnerId: string) {
  const game = await prisma.game.findFirst({
    where: { id: gameId, tenantId, isPublished: true },
  });

  if (!game) throw new Error('Published game not found');

  return prisma.gameSession.create({
    data: {
      tenantId,
      gameId,
      learnerId,
      maxScore: game.maxScore,
    },
  });
}

export async function updateSession(tenantId: string, sessionId: string, data: {
  progress?: Record<string, any>;
  responses?: Record<string, any>;
  hintsUsed?: number;
}) {
  return prisma.gameSession.update({
    where: { id: sessionId, tenantId },
    data,
  });
}

export async function completeSession(tenantId: string, sessionId: string, data: {
  score: number;
  responses?: Record<string, any>;
  timeSpent: number;
}) {
  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, tenantId },
    include: { game: true },
  });

  if (!session) throw new Error('Session not found');

  const passed = session.game.passingScore
    ? data.score >= session.game.passingScore
    : data.score >= (session.maxScore || 0) * 0.7;

  const completed = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      score: data.score,
      responses: data.responses,
      timeSpent: data.timeSpent,
      completedAt: new Date(),
      passed,
    },
  });

  // Update analytics
  await updateAnalytics(tenantId, session.gameId, {
    score: data.score,
    timeSpent: data.timeSpent,
    passed,
  });

  return completed;
}

export async function getSessionHistory(tenantId: string, learnerId: string, gameId?: string) {
  return prisma.gameSession.findMany({
    where: {
      tenantId,
      learnerId,
      ...(gameId && { gameId }),
    },
    include: { game: { select: { title: true, gameType: true } } },
    orderBy: { startedAt: 'desc' },
  });
}

// Question Bank
export async function addToQuestionBank(tenantId: string, data: {
  subject: string;
  topic: string;
  difficulty: DifficultyLevel;
  questionType: string;
  question: string;
  options?: Record<string, any>;
  correctAnswer: Record<string, any>;
  explanation?: string;
  hints?: string[];
  tags?: string[];
  sourceId?: string;
  aiGenerated?: boolean;
  createdBy: string;
}) {
  return prisma.questionBank.create({
    data: {
      tenantId,
      subject: data.subject,
      topic: data.topic,
      difficulty: data.difficulty,
      questionType: data.questionType,
      question: data.question,
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      hints: data.hints || [],
      tags: data.tags || [],
      sourceId: data.sourceId,
      aiGenerated: data.aiGenerated || false,
      createdBy: data.createdBy,
    },
  });
}

export async function getQuestionsFromBank(tenantId: string, filters: {
  subject?: string;
  topic?: string;
  difficulty?: DifficultyLevel;
  questionType?: string;
  count?: number;
  excludeIds?: string[];
}) {
  return prisma.questionBank.findMany({
    where: {
      tenantId,
      ...(filters.subject && { subject: filters.subject }),
      ...(filters.topic && { topic: filters.topic }),
      ...(filters.difficulty && { difficulty: filters.difficulty }),
      ...(filters.questionType && { questionType: filters.questionType }),
      ...(filters.excludeIds && { id: { notIn: filters.excludeIds } }),
    },
    take: filters.count || 10,
    orderBy: { usageCount: 'asc' }, // Prefer less used questions
  });
}

// Feedback
export async function submitFeedback(tenantId: string, gameId: string, data: {
  learnerId: string;
  rating: number;
  comment?: string;
  tags?: string[];
}) {
  return prisma.gameFeedback.create({
    data: {
      tenantId,
      gameId,
      learnerId: data.learnerId,
      rating: data.rating,
      comment: data.comment,
      tags: data.tags || [],
    },
  });
}

// Analytics
export async function getGameAnalytics(tenantId: string, gameId: string, startDate: Date, endDate: Date) {
  const analytics = await prisma.gameAnalytics.findMany({
    where: {
      tenantId,
      gameId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

  const sessions = await prisma.gameSession.aggregate({
    where: {
      tenantId,
      gameId,
      startedAt: { gte: startDate, lte: endDate },
    },
    _count: true,
    _avg: { score: true, timeSpent: true },
  });

  const feedback = await prisma.gameFeedback.aggregate({
    where: {
      tenantId,
      gameId,
      createdAt: { gte: startDate, lte: endDate },
    },
    _avg: { rating: true },
    _count: true,
  });

  return {
    daily: analytics,
    summary: {
      totalSessions: sessions._count,
      avgScore: sessions._avg.score,
      avgTimeSpent: sessions._avg.timeSpent,
      avgRating: feedback._avg.rating,
      feedbackCount: feedback._count,
    },
  };
}

async function updateAnalytics(tenantId: string, gameId: string, data: {
  score: number;
  timeSpent: number;
  passed: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.gameAnalytics.findUnique({
    where: { gameId_date: { gameId, date: today } },
  });

  if (existing) {
    const newTotal = existing.totalSessions + 1;
    const newCompletions = existing.completions + 1;
    const newAvgScore = ((existing.avgScore || 0) * existing.completions + data.score) / newCompletions;
    const newAvgTime = ((existing.avgTimeSpent || 0) * existing.completions + data.timeSpent) / newCompletions;
    const passCount = data.passed ? (existing.passRate || 0) * existing.completions + 1 : (existing.passRate || 0) * existing.completions;

    await prisma.gameAnalytics.update({
      where: { gameId_date: { gameId, date: today } },
      data: {
        totalSessions: newTotal,
        completions: newCompletions,
        avgScore: newAvgScore,
        avgTimeSpent: newAvgTime,
        passRate: passCount / newCompletions,
      },
    });
  } else {
    await prisma.gameAnalytics.create({
      data: {
        tenantId,
        gameId,
        date: today,
        totalSessions: 1,
        completions: 1,
        avgScore: data.score,
        avgTimeSpent: data.timeSpent,
        passRate: data.passed ? 1 : 0,
      },
    });
  }
}

// Helper functions
function buildGenerationPrompt(generation: any): string {
  const gameTypePrompts: Record<GameType, string> = {
    QUIZ: 'Generate a multiple-choice quiz with questions, options, and correct answers.',
    MATCHING: 'Generate a matching game with pairs of related items.',
    FLASHCARDS: 'Generate flashcards with terms and definitions.',
    WORD_SEARCH: 'Generate a word search puzzle with a grid and hidden words.',
    CROSSWORD: 'Generate a crossword puzzle with clues and answers.',
    FILL_BLANK: 'Generate fill-in-the-blank exercises with sentences and missing words.',
    DRAG_DROP: 'Generate a drag-and-drop sorting activity.',
    SORTING: 'Generate a sorting/categorization activity.',
    MEMORY: 'Generate pairs for a memory matching game.',
    PUZZLE: 'Generate an interactive puzzle or problem-solving activity.',
    SIMULATION: 'Generate a scenario-based simulation activity.',
    ADVENTURE: 'Generate a story-based learning adventure with choices.',
  };

  return `
Create an educational ${generation.gameType.toLowerCase().replace('_', ' ')} game.

Title: ${generation.title}
${generation.description ? `Description: ${generation.description}` : ''}
Difficulty: ${generation.difficulty}
${generation.targetAudience ? `Target Audience: ${generation.targetAudience}` : ''}
${generation.learningObjectives?.length ? `Learning Objectives:\n${generation.learningObjectives.map((o: string) => `- ${o}`).join('\n')}` : ''}

${generation.sourceContent ? `Source Content:\n${generation.sourceContent}` : ''}

${gameTypePrompts[generation.gameType as GameType]}

Return the game content as JSON with the appropriate structure for the game type.
`;
}

async function generateWithAI(prompt: string, gameType: GameType): Promise<Record<string, any>> {
  // Simplified - in real impl would call OpenAI API
  const mockContent: Record<GameType, any> = {
    QUIZ: {
      questions: [
        {
          id: '1',
          question: 'Sample question?',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          explanation: 'This is why A is correct.',
        },
      ],
    },
    MATCHING: { pairs: [{ left: 'Term', right: 'Definition' }] },
    FLASHCARDS: { cards: [{ front: 'Term', back: 'Definition' }] },
    WORD_SEARCH: { grid: [], words: [] },
    CROSSWORD: { across: [], down: [], grid: [] },
    FILL_BLANK: { sentences: [] },
    DRAG_DROP: { items: [], targets: [] },
    SORTING: { items: [], categories: [] },
    MEMORY: { pairs: [] },
    PUZZLE: { pieces: [], solution: {} },
    SIMULATION: { scenarios: [], outcomes: {} },
    ADVENTURE: { nodes: [], choices: {} },
  };

  return mockContent[gameType] || {};
}

function estimatePlayTime(gameType: GameType, content: any): number {
  const baseTime: Record<GameType, number> = {
    QUIZ: 5,
    MATCHING: 3,
    FLASHCARDS: 5,
    WORD_SEARCH: 10,
    CROSSWORD: 15,
    FILL_BLANK: 5,
    DRAG_DROP: 5,
    SORTING: 5,
    MEMORY: 5,
    PUZZLE: 10,
    SIMULATION: 15,
    ADVENTURE: 20,
  };
  return baseTime[gameType] || 10;
}

function calculateMaxScore(content: any): number {
  if (content.questions) return content.questions.length * 10;
  if (content.pairs) return content.pairs.length * 10;
  if (content.cards) return content.cards.length * 10;
  return 100;
}
