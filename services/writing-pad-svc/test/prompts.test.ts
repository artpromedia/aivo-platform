/**
 * Tests for writing-pad-svc prompts and writing assistance.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAIProvider = {
  generateAssistance: vi.fn(),
};

const mockPrisma = {
  writingPrompt: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  writingSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('WritingPromptService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getWritingPrompts', () => {
    it('returns prompts filtered by grade and genre', async () => {
      mockPrisma.writingPrompt.findMany.mockResolvedValue([
        {
          id: 'wp-1',
          title: 'My Favorite Animal',
          genre: 'NARRATIVE',
          gradeLevel: 'K-2',
          prompt: 'Write about your favorite animal and why you like it.',
        },
        {
          id: 'wp-2',
          title: 'A Magic Day',
          genre: 'NARRATIVE',
          gradeLevel: 'K-2',
          prompt: 'What would happen if you had magic powers for one day?',
        },
      ]);
      const prompts = await mockPrisma.writingPrompt.findMany({
        where: { gradeLevel: 'K-2', genre: 'NARRATIVE' },
      });
      expect(prompts).toHaveLength(2);
      expect(prompts[0].genre).toBe('NARRATIVE');
    });

    it('returns prompts for various genres', async () => {
      mockPrisma.writingPrompt.findMany.mockResolvedValue([
        { id: 'wp-3', genre: 'PERSUASIVE' },
        { id: 'wp-4', genre: 'INFORMATIONAL' },
        { id: 'wp-5', genre: 'POETRY' },
      ]);
      const prompts = await mockPrisma.writingPrompt.findMany({
        where: { gradeLevel: '3-5' },
      });
      const genres = prompts.map((p: { genre: string }) => p.genre);
      expect(genres).toContain('PERSUASIVE');
      expect(genres).toContain('POETRY');
    });
  });

  describe('createPrompt', () => {
    it('creates custom prompt for class', async () => {
      mockPrisma.writingPrompt.create.mockResolvedValue({
        id: 'wp-6',
        title: 'Book Report: Charlotte\'s Web',
        genre: 'INFORMATIONAL',
        gradeLevel: '3-5',
        custom: true,
        createdBy: 'teacher-1',
      });
      const result = await mockPrisma.writingPrompt.create({
        data: {
          title: 'Book Report: Charlotte\'s Web',
          genre: 'INFORMATIONAL',
          gradeLevel: '3-5',
          createdBy: 'teacher-1',
        },
      });
      expect(result.custom).toBe(true);
    });
  });
});

describe('WritingAssistanceService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getWritingAssistance', () => {
    it('provides grammar suggestions', async () => {
      mockAIProvider.generateAssistance.mockResolvedValue({
        suggestions: [
          {
            type: 'GRAMMAR',
            position: { start: 15, end: 20 },
            original: 'their',
            replacement: 'there',
            explanation: 'Use "there" for location, "their" for possession.',
          },
        ],
        overallScore: 75,
      });
      const result = await mockAIProvider.generateAssistance({
        text: 'I want to go their.',
        type: 'GRAMMAR',
      });
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('GRAMMAR');
    });

    it('provides vocabulary enhancement suggestions', async () => {
      mockAIProvider.generateAssistance.mockResolvedValue({
        suggestions: [
          {
            type: 'VOCABULARY',
            original: 'good',
            replacements: ['excellent', 'wonderful', 'outstanding'],
            explanation: 'Try using more specific and descriptive words.',
          },
        ],
      });
      const result = await mockAIProvider.generateAssistance({
        text: 'It was a good day.',
        type: 'VOCABULARY',
      });
      expect(result.suggestions[0].replacements).toContain('excellent');
    });

    it('provides structure feedback', async () => {
      mockAIProvider.generateAssistance.mockResolvedValue({
        suggestions: [
          {
            type: 'STRUCTURE',
            issue: 'MISSING_CONCLUSION',
            explanation: 'Your essay needs a concluding paragraph.',
          },
        ],
      });
      const result = await mockAIProvider.generateAssistance({
        text: 'Dogs are great pets. They are loyal and fun.',
        type: 'STRUCTURE',
      });
      expect(result.suggestions[0].issue).toBe('MISSING_CONCLUSION');
    });
  });
});

describe('WritingSessionService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('session management', () => {
    it('creates a writing session', async () => {
      mockPrisma.writingSession.create.mockResolvedValue({
        id: 'ws-1',
        studentId: 'stu-1',
        promptId: 'wp-1',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      });
      const session = await mockPrisma.writingSession.create({
        data: { studentId: 'stu-1', promptId: 'wp-1' },
      });
      expect(session.status).toBe('IN_PROGRESS');
    });

    it('submits a writing session', async () => {
      mockPrisma.writingSession.update.mockResolvedValue({
        id: 'ws-1',
        status: 'SUBMITTED',
        submittedAt: new Date(),
        wordCount: 250,
        timeSpentMinutes: 30,
      });
      const result = await mockPrisma.writingSession.update({
        where: { id: 'ws-1' },
        data: { status: 'SUBMITTED', wordCount: 250, timeSpentMinutes: 30 },
      });
      expect(result.status).toBe('SUBMITTED');
      expect(result.wordCount).toBe(250);
    });
  });
});
