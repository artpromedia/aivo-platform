/**
 * Question Bank Repository
 *
 * Data access layer for curated and generated questions.
 * Provides efficient retrieval, caching, and fallback strategies.
 *
 * Fallback Strategy:
 * 1. Primary: AI-generated questions
 * 2. Fallback 1: Curated question bank (from DB or static)
 * 3. Fallback 2: Validated static questions (last resort)
 *
 * @module question-bank.repository
 */

import {
  getCuratedQuestions,
  getCuratedQuestionsBySkill,
} from '../data/curated-questions/index.js';
import type { BaselineDomain, GradeBand } from '../types/baseline.js';
import type {
  GeneratedQuestion,
  QuestionBankQuery,
  QuestionType,
  CognitiveLevel,
} from '../types/questions.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface QuestionSelectionStrategy {
  /** Prioritize by difficulty match */
  matchDifficulty?: boolean;
  /** Prioritize by skill coverage */
  coverSkills?: boolean;
  /** Randomize selection */
  randomize?: boolean;
  /** Seed for deterministic randomization */
  seed?: number;
}

interface QuestionPoolStats {
  total: number;
  byDomain: Record<BaselineDomain, number>;
  bySkill: Record<string, number>;
  byCognitiveLevel: Record<CognitiveLevel, number>;
  byType: Record<QuestionType, number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION BANK REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════════

export class QuestionBankRepository {
  private recentlyUsed = new Map<string, Set<string>>();
  private readonly maxRecentlyUsed = 100;

  /**
   * Query questions from the curated bank.
   * Applies filtering, sorting, and selection strategies.
   */
  async queryQuestions(query: QuestionBankQuery): Promise<GeneratedQuestion[]> {
    // Get base pool of questions
    let pool: GeneratedQuestion[];

    if (query.skillCodes && query.skillCodes.length > 0) {
      // Get questions for specific skills
      pool = query.skillCodes.flatMap((skillCode) =>
        getCuratedQuestionsBySkill(query.domain, query.gradeBand, skillCode)
      );
    } else {
      // Get all questions for domain
      pool = getCuratedQuestions(query.domain, query.gradeBand);
    }

    // Apply filters
    pool = this.applyFilters(pool, query);

    // Exclude recently used
    if (query.excludeIds && query.excludeIds.length > 0) {
      const excludeSet = new Set(query.excludeIds);
      pool = pool.filter((q) => !excludeSet.has(q.id));
    }

    // Select desired count
    const selected = this.selectQuestions(pool, query.count, {
      matchDifficulty: true,
      coverSkills: true,
      randomize: true,
    });

    return selected;
  }

  /**
   * Get questions by skill codes with fallback chain.
   */
  async getQuestionsBySkills(
    domain: BaselineDomain,
    gradeBand: GradeBand,
    skillCodes: string[],
    countPerSkill = 1
  ): Promise<Map<string, GeneratedQuestion[]>> {
    const result = new Map<string, GeneratedQuestion[]>();

    for (const skillCode of skillCodes) {
      const questions = getCuratedQuestionsBySkill(domain, gradeBand, skillCode);

      // Take requested count, shuffled
      const shuffled = this.shuffleArray([...questions]);
      result.set(skillCode, shuffled.slice(0, countPerSkill));
    }

    return result;
  }

  /**
   * Get a specific question by ID.
   */
  async getQuestionById(questionId: string): Promise<GeneratedQuestion | null> {
    // Search all grade bands and domains
    const domains: BaselineDomain[] = ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'];
    const gradeBands: GradeBand[] = ['K5', 'G6_8', 'G9_12'];

    for (const domain of domains) {
      for (const gradeBand of gradeBands) {
        const questions = getCuratedQuestions(domain, gradeBand);
        const found = questions.find((q) => q.id === questionId);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Get pool statistics for a given domain and grade band.
   */
  async getPoolStats(domain: BaselineDomain, gradeBand: GradeBand): Promise<QuestionPoolStats> {
    const questions = getCuratedQuestions(domain, gradeBand);

    const bySkill: Record<string, number> = {};
    const byCognitiveLevel: Record<CognitiveLevel, number> = {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0,
    };
    const byType: Record<QuestionType, number> = {
      'multiple-choice': 0,
      'multiple-select': 0,
      'short-answer': 0,
      matching: 0,
      ordering: 0,
      'fill-blank': 0,
      'true-false': 0,
      'constructed-response': 0,
    };

    for (const q of questions) {
      bySkill[q.skillCode] = (bySkill[q.skillCode] || 0) + 1;
      byCognitiveLevel[q.cognitiveLevel]++;
      byType[q.type]++;
    }

    return {
      total: questions.length,
      byDomain: { [domain]: questions.length } as Record<BaselineDomain, number>,
      bySkill,
      byCognitiveLevel,
      byType,
    };
  }

  /**
   * Check availability of questions for assessment.
   */
  async checkAvailability(
    domain: BaselineDomain,
    gradeBand: GradeBand,
    skillCodes: string[],
    requiredCount: number
  ): Promise<{
    available: boolean;
    totalAvailable: number;
    bySkill: Record<string, number>;
    shortfall: number;
  }> {
    const bySkill: Record<string, number> = {};
    let totalAvailable = 0;

    for (const skillCode of skillCodes) {
      const count = getCuratedQuestionsBySkill(domain, gradeBand, skillCode).length;
      bySkill[skillCode] = count;
      totalAvailable += count;
    }

    const shortfall = Math.max(0, requiredCount - totalAvailable);

    return {
      available: totalAvailable >= requiredCount,
      totalAvailable,
      bySkill,
      shortfall,
    };
  }

  /**
   * Mark questions as recently used for a learner.
   */
  markAsUsed(learnerId: string, questionIds: string[]): void {
    let used = this.recentlyUsed.get(learnerId);
    if (!used) {
      used = new Set();
      this.recentlyUsed.set(learnerId, used);
    }
    for (const id of questionIds) {
      used.add(id);
    }

    // Limit size
    if (used.size > this.maxRecentlyUsed) {
      const arr = [...used];
      this.recentlyUsed.set(learnerId, new Set(arr.slice(-this.maxRecentlyUsed)));
    }
  }

  /**
   * Get recently used question IDs for a learner.
   */
  getRecentlyUsed(learnerId: string): string[] {
    return [...(this.recentlyUsed.get(learnerId) || [])];
  }

  /**
   * Clear recently used cache for a learner.
   */
  clearRecentlyUsed(learnerId: string): void {
    this.recentlyUsed.delete(learnerId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Apply query filters to question pool.
   */
  private applyFilters(pool: GeneratedQuestion[], query: QuestionBankQuery): GeneratedQuestion[] {
    let filtered = [...pool];

    // Filter by difficulty range
    if (query.difficultyRange) {
      filtered = filtered.filter(
        (q) =>
          q.difficulty >= query.difficultyRange!.min && q.difficulty <= query.difficultyRange!.max
      );
    }

    // Filter by question types
    if (query.questionTypes && query.questionTypes.length > 0) {
      const typeSet = new Set(query.questionTypes);
      filtered = filtered.filter((q) => typeSet.has(q.type));
    }

    // Filter by cognitive level
    if (query.cognitiveLevel) {
      filtered = filtered.filter((q) => q.cognitiveLevel === query.cognitiveLevel);
    }

    // Filter by standards
    if (query.standards && query.standards.length > 0) {
      const standardSet = new Set(query.standards);
      filtered = filtered.filter((q) => q.standardsAlignment.some((s) => standardSet.has(s)));
    }

    return filtered;
  }

  /**
   * Select questions from pool using strategy.
   */
  private selectQuestions(
    pool: GeneratedQuestion[],
    count: number,
    strategy: QuestionSelectionStrategy
  ): GeneratedQuestion[] {
    if (pool.length <= count) {
      return pool;
    }

    let candidates = [...pool];

    // Shuffle if randomizing
    if (strategy.randomize) {
      candidates = this.shuffleArray(candidates, strategy.seed);
    }

    // If covering skills, ensure diversity
    if (strategy.coverSkills) {
      candidates = this.diversifyBySkill(candidates, count);
    }

    return candidates.slice(0, count);
  }

  /**
   * Ensure skill diversity in selection.
   */
  private diversifyBySkill(
    questions: GeneratedQuestion[],
    targetCount: number
  ): GeneratedQuestion[] {
    const bySkill = new Map<string, GeneratedQuestion[]>();

    for (const q of questions) {
      let skillQuestions = bySkill.get(q.skillCode);
      if (!skillQuestions) {
        skillQuestions = [];
        bySkill.set(q.skillCode, skillQuestions);
      }
      skillQuestions.push(q);
    }

    const result: GeneratedQuestion[] = [];
    const skills = [...bySkill.keys()];
    let round = 0;

    // Round-robin selection from each skill
    while (result.length < targetCount && round < 100) {
      for (const skill of skills) {
        if (result.length >= targetCount) break;

        const skillQuestions = bySkill.get(skill) ?? [];
        if (skillQuestions.length > round) {
          result.push(skillQuestions[round]);
        }
      }
      round++;
    }

    return result;
  }

  /**
   * Shuffle array with optional deterministic seed.
   */
  private shuffleArray<T>(array: T[], seed?: number): T[] {
    const shuffled = [...array];
    const random = seed ? this.seededRandom(seed) : Math.random;

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Create seeded random number generator.
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const questionBankRepository = new QuestionBankRepository();

export default questionBankRepository;
