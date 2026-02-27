/**
 * Tests for baseline-svc — AdaptiveDifficultyEngine logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';

/* ---------- constants matching src/lib/adaptiveDifficulty.ts ---------- */

const DIFFICULTY_LEVELS = {
  VERY_EASY: 1,
  EASY: 2,
  MEDIUM: 3,
  HARD: 4,
  VERY_HARD: 5,
} as const;

const DEFAULT_DOMAINS = ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'] as const;

/* ---------- replicate AdaptiveDifficultyEngine ---------- */

interface DomainState {
  difficulty: number;
  correct: number;
  incorrect: number;
  streak: number;
  peaked: number;
  lowest: number;
}

class AdaptiveDifficultyEngine {
  private domains: Record<string, DomainState> = {};

  constructor() {
    for (const d of DEFAULT_DOMAINS) {
      this.domains[d] = {
        difficulty: DIFFICULTY_LEVELS.MEDIUM,
        correct: 0,
        incorrect: 0,
        streak: 0,
        peaked: DIFFICULTY_LEVELS.MEDIUM,
        lowest: DIFFICULTY_LEVELS.MEDIUM,
      };
    }
  }

  getDifficulty(domain: string): number {
    return this.domains[domain]?.difficulty ?? DIFFICULTY_LEVELS.MEDIUM;
  }

  recordResponse(params: {
    domain: string;
    skillCode: string;
    isCorrect: boolean;
    score: number | null;
    difficulty: number;
  }): void {
    let state = this.domains[params.domain];
    if (!state) {
      state = {
        difficulty: DIFFICULTY_LEVELS.MEDIUM,
        correct: 0,
        incorrect: 0,
        streak: 0,
        peaked: DIFFICULTY_LEVELS.MEDIUM,
        lowest: DIFFICULTY_LEVELS.MEDIUM,
      };
      this.domains[params.domain] = state;
    }

    if (params.isCorrect) {
      state.correct++;
      state.streak = state.streak >= 0 ? state.streak + 1 : 1;
      // Increase difficulty after 3 correct in a row
      if (state.streak >= 3 && state.difficulty < DIFFICULTY_LEVELS.VERY_HARD) {
        state.difficulty++;
        state.streak = 0;
      }
    } else {
      state.incorrect++;
      state.streak = state.streak <= 0 ? state.streak - 1 : -1;
      // Decrease difficulty after 2 incorrect in a row
      if (state.streak <= -2 && state.difficulty > DIFFICULTY_LEVELS.VERY_EASY) {
        state.difficulty--;
        state.streak = 0;
      }
    }

    state.peaked = Math.max(state.peaked, state.difficulty);
    state.lowest = Math.min(state.lowest, state.difficulty);
  }

  getDomainSummary(domain: string) {
    const state = this.domains[domain];
    if (!state) return null;
    return {
      currentDifficulty: state.difficulty,
      totalCorrect: state.correct,
      totalIncorrect: state.incorrect,
      peakDifficulty: state.peaked,
      lowestDifficulty: state.lowest,
      accuracy: state.correct + state.incorrect > 0
        ? state.correct / (state.correct + state.incorrect)
        : 0,
    };
  }

  getAllDomainSummaries() {
    const result: Record<string, ReturnType<typeof this.getDomainSummary>> = {};
    for (const domain of Object.keys(this.domains)) {
      result[domain] = this.getDomainSummary(domain);
    }
    return result;
  }

  serialize(): string {
    return JSON.stringify(this.domains);
  }

  static deserialize(data: string): AdaptiveDifficultyEngine {
    const engine = new AdaptiveDifficultyEngine();
    engine.domains = JSON.parse(data);
    return engine;
  }
}

describe('AdaptiveDifficultyEngine', () => {
  let engine: AdaptiveDifficultyEngine;

  beforeEach(() => {
    engine = new AdaptiveDifficultyEngine();
  });

  it('initializes all default domains at MEDIUM difficulty', () => {
    for (const domain of DEFAULT_DOMAINS) {
      expect(engine.getDifficulty(domain)).toBe(DIFFICULTY_LEVELS.MEDIUM);
    }
  });

  it('returns MEDIUM for unknown domain', () => {
    expect(engine.getDifficulty('UNKNOWN')).toBe(DIFFICULTY_LEVELS.MEDIUM);
  });

  it('increases difficulty after 3 consecutive correct answers', () => {
    const params = { domain: 'MATH', skillCode: 'ADD', score: null, difficulty: 3 };
    engine.recordResponse({ ...params, isCorrect: true });
    engine.recordResponse({ ...params, isCorrect: true });
    engine.recordResponse({ ...params, isCorrect: true });
    expect(engine.getDifficulty('MATH')).toBe(DIFFICULTY_LEVELS.HARD);
  });

  it('does not exceed VERY_HARD', () => {
    const params = { domain: 'ELA', skillCode: 'READ', score: null, difficulty: 5 };
    // Get to VERY_HARD
    for (let i = 0; i < 9; i++) {
      engine.recordResponse({ ...params, isCorrect: true });
    }
    expect(engine.getDifficulty('ELA')).toBeLessThanOrEqual(DIFFICULTY_LEVELS.VERY_HARD);
  });

  it('decreases difficulty after 2 consecutive incorrect answers', () => {
    const params = { domain: 'SCIENCE', skillCode: 'BIO', score: null, difficulty: 3 };
    engine.recordResponse({ ...params, isCorrect: false });
    engine.recordResponse({ ...params, isCorrect: false });
    expect(engine.getDifficulty('SCIENCE')).toBe(DIFFICULTY_LEVELS.EASY);
  });

  it('does not go below VERY_EASY', () => {
    const params = { domain: 'SPEECH', skillCode: 'PHON', score: null, difficulty: 1 };
    for (let i = 0; i < 10; i++) {
      engine.recordResponse({ ...params, isCorrect: false });
    }
    expect(engine.getDifficulty('SPEECH')).toBeGreaterThanOrEqual(DIFFICULTY_LEVELS.VERY_EASY);
  });

  it('resets streak on answer flip', () => {
    const params = { domain: 'MATH', skillCode: 'ADD', score: null, difficulty: 3 };
    engine.recordResponse({ ...params, isCorrect: true });
    engine.recordResponse({ ...params, isCorrect: true });
    engine.recordResponse({ ...params, isCorrect: false }); // resets streak
    engine.recordResponse({ ...params, isCorrect: true });
    engine.recordResponse({ ...params, isCorrect: true });
    // Should NOT have gone up yet — only 2 correct in a row after the flip
    expect(engine.getDifficulty('MATH')).toBe(DIFFICULTY_LEVELS.MEDIUM);
  });

  it('creates state for new domains on-the-fly', () => {
    engine.recordResponse({
      domain: 'ART',
      skillCode: 'PAINT',
      isCorrect: true,
      score: null,
      difficulty: 3,
    });
    expect(engine.getDomainSummary('ART')).toBeDefined();
    expect(engine.getDomainSummary('ART')!.totalCorrect).toBe(1);
  });
});

describe('Domain summary', () => {
  let engine: AdaptiveDifficultyEngine;

  beforeEach(() => {
    engine = new AdaptiveDifficultyEngine();
  });

  it('returns null for untracked domain', () => {
    expect(engine.getDomainSummary('NONEXISTENT')).toBeNull();
  });

  it('tracks accuracy', () => {
    const params = { domain: 'SEL', skillCode: 'EMO', score: null, difficulty: 3 };
    engine.recordResponse({ ...params, isCorrect: true });
    engine.recordResponse({ ...params, isCorrect: false });
    const summary = engine.getDomainSummary('SEL');
    expect(summary!.accuracy).toBe(0.5);
  });

  it('tracks peak difficulty', () => {
    const params = { domain: 'MATH', skillCode: 'ADD', score: null, difficulty: 3 };
    for (let i = 0; i < 3; i++) engine.recordResponse({ ...params, isCorrect: true });
    // Now at HARD (4), peak should be 4
    expect(engine.getDomainSummary('MATH')!.peakDifficulty).toBe(4);
    // Decrease
    engine.recordResponse({ ...params, isCorrect: false });
    engine.recordResponse({ ...params, isCorrect: false });
    // Difficulty back to 3 but peak still 4
    expect(engine.getDomainSummary('MATH')!.peakDifficulty).toBe(4);
  });

  it('getAllDomainSummaries returns all domains', () => {
    const summaries = engine.getAllDomainSummaries();
    expect(Object.keys(summaries)).toHaveLength(DEFAULT_DOMAINS.length);
  });
});

describe('Serialization', () => {
  it('round-trips through serialize/deserialize', () => {
    const engine = new AdaptiveDifficultyEngine();
    engine.recordResponse({
      domain: 'MATH',
      skillCode: 'ADD',
      isCorrect: true,
      score: null,
      difficulty: 3,
    });
    const serialized = engine.serialize();
    const restored = AdaptiveDifficultyEngine.deserialize(serialized);
    expect(restored.getDomainSummary('MATH')!.totalCorrect).toBe(1);
  });

  it('serializes to valid JSON', () => {
    const json = new AdaptiveDifficultyEngine().serialize();
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
