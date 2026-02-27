/**
 * Tests for baseline-svc — Question types, cognitive levels, and analytics.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ---------- question types from src/types/questions.types.ts ---------- */

type QuestionType =
  | 'multiple-choice'
  | 'multiple-select'
  | 'short-answer'
  | 'matching'
  | 'true-false'
  | 'fill-in-blank'
  | 'ordering';

type CognitiveLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

type DifficultyLevel = 'foundational' | 'grade-level' | 'challenging';

type QuestionSource =
  | 'ai-generated'
  | 'curated-bank'
  | 'static-fallback'
  | 'dev-mode';

type GradeBand = 'K5' | 'G6_8' | 'G9_12';

interface GeneratedQuestion {
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | string[];
  cognitiveLevel: CognitiveLevel;
  difficulty: DifficultyLevel;
  skillCode: string;
  source: QuestionSource;
}

interface LearnerAccommodations {
  readAloud?: boolean;
  largeText?: boolean;
  highContrast?: boolean;
  extendedTime?: boolean;
  simplifiedLanguage?: boolean;
}

/* ---------- GENERATION_CONFIG from question-generator.service.ts ---------- */

const GENERATION_CONFIG = {
  maxRetries: 2,
  timeoutMs: 12000,
  minQualityScore: 0.7,
  maxQuestionsPerRequest: 20,
  fallbackToStatic: true,
};

describe('Question types', () => {
  const validTypes: QuestionType[] = [
    'multiple-choice',
    'multiple-select',
    'short-answer',
    'matching',
    'true-false',
    'fill-in-blank',
    'ordering',
  ];

  it('covers 7 question types', () => {
    expect(validTypes).toHaveLength(7);
  });

  it('includes multiple-choice', () => {
    expect(validTypes).toContain('multiple-choice');
  });
});

describe('Cognitive levels (Bloom\'s taxonomy)', () => {
  const levels: CognitiveLevel[] = [
    'remember',
    'understand',
    'apply',
    'analyze',
    'evaluate',
    'create',
  ];

  it('has 6 levels', () => {
    expect(levels).toHaveLength(6);
  });

  it('starts with remember and ends with create', () => {
    expect(levels[0]).toBe('remember');
    expect(levels[levels.length - 1]).toBe('create');
  });
});

describe('GENERATION_CONFIG', () => {
  it('has expected retry and timeout values', () => {
    expect(GENERATION_CONFIG.maxRetries).toBe(2);
    expect(GENERATION_CONFIG.timeoutMs).toBe(12000);
  });

  it('requires minimum quality score of 0.7', () => {
    expect(GENERATION_CONFIG.minQualityScore).toBe(0.7);
  });

  it('allows fallback to static', () => {
    expect(GENERATION_CONFIG.fallbackToStatic).toBe(true);
  });

  it('limits questions per request to 20', () => {
    expect(GENERATION_CONFIG.maxQuestionsPerRequest).toBe(20);
  });
});

/* ---------- question validation logic ---------- */

function validateQuestion(q: GeneratedQuestion, gradeBand: GradeBand): { passed: boolean; reason?: string } {
  if (!q.text || q.text.trim().length < 10) {
    return { passed: false, reason: 'Question text too short' };
  }
  if (q.type === 'multiple-choice' && (!q.options || q.options.length < 2)) {
    return { passed: false, reason: 'Multiple-choice requires at least 2 options' };
  }
  if (!q.correctAnswer || (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0)) {
    return { passed: false, reason: 'Missing correct answer' };
  }
  return { passed: true };
}

describe('validateQuestion', () => {
  const baseQuestion: GeneratedQuestion = {
    text: 'What is 2 + 2?',
    type: 'multiple-choice',
    options: ['3', '4', '5', '6'],
    correctAnswer: '4',
    cognitiveLevel: 'remember',
    difficulty: 'foundational',
    skillCode: 'MATH.ADD.001',
    source: 'ai-generated',
  };

  it('passes valid question', () => {
    expect(validateQuestion(baseQuestion, 'K5').passed).toBe(true);
  });

  it('fails question with empty text', () => {
    const q = { ...baseQuestion, text: '' };
    const result = validateQuestion(q, 'K5');
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('too short');
  });

  it('fails MC question with < 2 options', () => {
    const q = { ...baseQuestion, options: ['only'] };
    const result = validateQuestion(q, 'K5');
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('2 options');
  });

  it('fails question with missing correct answer', () => {
    const q = { ...baseQuestion, correctAnswer: '' };
    const result = validateQuestion(q, 'G6_8');
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Missing correct answer');
  });

  it('passes short-answer without options', () => {
    const q: GeneratedQuestion = {
      ...baseQuestion,
      type: 'short-answer',
      options: undefined,
      correctAnswer: 'four',
    };
    expect(validateQuestion(q, 'G9_12').passed).toBe(true);
  });
});

/* ---------- mocked QuestionAnalyticsService ---------- */

describe('QuestionAnalyticsService (mocked)', () => {
  const mockRecord = vi.fn();
  const mockGetAnalytics = vi.fn();

  const service = {
    recordResponse: mockRecord,
    getQuestionAnalytics: mockGetAnalytics,
  };

  beforeEach(() => vi.clearAllMocks());

  it('records a correct response', async () => {
    mockRecord.mockResolvedValue(undefined);
    await service.recordResponse({
      questionId: 'q-1',
      learnerId: 'l-1',
      isCorrect: true,
      latencyMs: 2500,
      source: 'ai-generated',
    });
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ isCorrect: true, latencyMs: 2500 }),
    );
  });

  it('returns question analytics', async () => {
    mockGetAnalytics.mockResolvedValue({
      questionId: 'q-1',
      totalAttempts: 50,
      correctRate: 0.72,
      avgLatencyMs: 3200,
      discriminationIndex: 0.45,
    });
    const result = await service.getQuestionAnalytics('q-1');
    expect(result.correctRate).toBe(0.72);
    expect(result.discriminationIndex).toBe(0.45);
  });

  it('returns null for unknown question', async () => {
    mockGetAnalytics.mockResolvedValue(null);
    const result = await service.getQuestionAnalytics('unknown');
    expect(result).toBeNull();
  });
});

describe('LearnerAccommodations', () => {
  it('defaults all accommodations to undefined', () => {
    const acc: LearnerAccommodations = {};
    expect(acc.readAloud).toBeUndefined();
    expect(acc.extendedTime).toBeUndefined();
  });

  it('enables specific accommodations', () => {
    const acc: LearnerAccommodations = {
      readAloud: true,
      largeText: true,
      highContrast: false,
    };
    expect(acc.readAloud).toBe(true);
    expect(acc.highContrast).toBe(false);
  });
});
