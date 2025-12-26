/**
 * Randomization Service
 * 
 * Handles question and answer randomization for assessments:
 * - Question order shuffling
 * - Answer option shuffling
 * - Question pool selection
 * - Maintaining consistent randomization per attempt
 */

import { prisma } from '../../prisma.js';
import type { PrismaTransactionClient } from '../../prisma.js';
import type { Question, Assessment, AssessmentSettings } from '../../types/assessment.types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RandomizationConfig {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questionPools?: QuestionPoolConfig[];
  seed?: string; // For reproducible randomization
}

export interface QuestionPoolConfig {
  poolId: string;
  poolName?: string;
  questionIds: string[];
  selectCount: number;
  points: number;
}

export interface RandomizedAssessment {
  questionOrder: string[]; // Ordered question IDs
  answerOrders: Record<string, number[]>; // questionId -> shuffled option indices
  poolSelections: Record<string, string[]>; // poolId -> selected questionIds
}

export interface RandomizationSeed {
  attemptId: string;
  timestamp: number;
  userId: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class RandomizationService {
  /**
   * Generate randomized question/answer order for an attempt
   */
  generateRandomization(
    assessment: Assessment,
    questions: Question[],
    config: RandomizationConfig,
    seed?: RandomizationSeed
  ): RandomizedAssessment {
    // Create seeded random function for reproducibility
    const random = this.createSeededRandom(seed);

    let selectedQuestions = [...questions];
    const poolSelections: Record<string, string[]> = {};

    // Handle question pools
    if (config.questionPools?.length) {
      const poolQuestions: Question[] = [];
      
      for (const pool of config.questionPools) {
        const availableIds = new Set(pool.questionIds);
        const poolCandidates = questions.filter(q => availableIds.has(q.id));
        
        // Randomly select questions from pool
        const selected = this.selectFromPool(
          poolCandidates,
          pool.selectCount,
          random
        );
        
        poolSelections[pool.poolId] = selected.map(q => q.id);
        poolQuestions.push(...selected);
      }

      // Add non-pool questions
      const pooledIds = new Set(
        config.questionPools.flatMap(p => p.questionIds)
      );
      const nonPoolQuestions = questions.filter(q => !pooledIds.has(q.id));
      
      selectedQuestions = [...nonPoolQuestions, ...poolQuestions];
    }

    // Shuffle question order if enabled
    let questionOrder = selectedQuestions.map(q => q.id);
    if (config.shuffleQuestions) {
      questionOrder = this.shuffleArray(questionOrder, random);
    }

    // Shuffle answer options if enabled
    const answerOrders: Record<string, number[]> = {};
    if (config.shuffleOptions) {
      for (const question of selectedQuestions) {
        if (this.canShuffleOptions(question)) {
          const optionCount = this.getOptionCount(question);
          answerOrders[question.id] = this.shuffleArray(
            Array.from({ length: optionCount }, (_, i) => i),
            random
          );
        }
      }
    }

    return {
      questionOrder,
      answerOrders,
      poolSelections,
    };
  }

  /**
   * Apply randomization to questions for display
   */
  applyRandomization(
    questions: Question[],
    randomization: RandomizedAssessment
  ): Question[] {
    // Order questions
    const questionMap = new Map(questions.map(q => [q.id, q]));
    const orderedQuestions = randomization.questionOrder
      .map(id => questionMap.get(id))
      .filter((q): q is Question => q !== undefined);

    // Shuffle options within each question
    return orderedQuestions.map(question => {
      const optionOrder = randomization.answerOrders[question.id];
      if (!optionOrder || !question.options?.length) {
        return question;
      }

      // Reorder options based on shuffle
      const shuffledOptions = optionOrder.map(i => question.options![i]);
      
      return {
        ...question,
        options: shuffledOptions,
        // Store original indices for answer mapping
        _optionMapping: optionOrder,
      } as Question;
    });
  }

  /**
   * Map student answer back to original option indices
   */
  mapAnswerToOriginal(
    questionId: string,
    answer: any,
    randomization: RandomizedAssessment
  ): any {
    const optionOrder = randomization.answerOrders[questionId];
    if (!optionOrder) return answer;

    // Handle different answer types
    if (typeof answer === 'number') {
      // Single option index
      return optionOrder[answer];
    } else if (Array.isArray(answer)) {
      // Multiple option indices
      return answer.map(i => 
        typeof i === 'number' ? optionOrder[i] : i
      );
    } else if (typeof answer === 'object' && answer.selectedOption !== undefined) {
      // Object with selectedOption
      return {
        ...answer,
        selectedOption: optionOrder[answer.selectedOption],
      };
    }

    return answer;
  }

  /**
   * Store randomization for an attempt
   */
  async storeRandomization(
    attemptId: string,
    randomization: RandomizedAssessment,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;

    await client.attempt.update({
      where: { id: attemptId },
      data: {
        questionOrder: randomization.questionOrder,
        answerOrders: randomization.answerOrders,
      },
    });
  }

  /**
   * Retrieve stored randomization for an attempt
   */
  async getStoredRandomization(
    attemptId: string
  ): Promise<RandomizedAssessment | null> {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        questionOrder: true,
        answerOrders: true,
      },
    });

    if (!attempt || !attempt.questionOrder) return null;

    return {
      questionOrder: attempt.questionOrder as string[],
      answerOrders: (attempt.answerOrders as Record<string, number[]>) ?? {},
      poolSelections: {}, // Pool selections not stored after creation
    };
  }

  /**
   * Generate question pools for an assessment
   */
  async createQuestionPools(
    assessmentId: string,
    pools: Array<{
      name: string;
      questionIds: string[];
      selectCount: number;
      points: number;
    }>,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;

    // Delete existing pools
    await client.assessmentQuestionPool.deleteMany({
      where: { assessmentId },
    });

    // Create new pools
    for (let i = 0; i < pools.length; i++) {
      const pool = pools[i];
      await client.assessmentQuestionPool.create({
        data: {
          assessmentId,
          name: pool.name,
          questionIds: pool.questionIds,
          selectCount: pool.selectCount,
          orderIndex: i,
          points: pool.points,
        },
      });
    }
  }

  /**
   * Get question pools for an assessment
   */
  async getQuestionPools(
    assessmentId: string
  ): Promise<QuestionPoolConfig[]> {
    const pools = await prisma.assessmentQuestionPool.findMany({
      where: { assessmentId },
      orderBy: { orderIndex: 'asc' },
    });

    return pools.map(pool => ({
      poolId: pool.id,
      poolName: pool.name,
      questionIds: pool.questionIds as string[],
      selectCount: pool.selectCount,
      points: pool.points,
    }));
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Create a seeded random number generator
   */
  private createSeededRandom(seed?: RandomizationSeed): () => number {
    if (!seed) {
      return Math.random;
    }

    // Simple mulberry32 PRNG
    const seedValue = this.hashString(
      `${seed.attemptId}-${seed.timestamp}-${seed.userId}`
    );
    
    let state = seedValue;
    return () => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Hash a string to a number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Fisher-Yates shuffle with custom random function
   */
  private shuffleArray<T>(array: T[], random: () => number): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Randomly select items from a pool
   */
  private selectFromPool<T>(
    items: T[],
    count: number,
    random: () => number
  ): T[] {
    if (count >= items.length) return [...items];
    
    const shuffled = this.shuffleArray(items, random);
    return shuffled.slice(0, count);
  }

  /**
   * Check if question type supports option shuffling
   */
  private canShuffleOptions(question: Question): boolean {
    const shuffleableTypes = [
      'MULTIPLE_CHOICE',
      'MULTIPLE_SELECT',
      'MATCHING',
    ];
    return shuffleableTypes.includes(question.type);
  }

  /**
   * Get the number of options for a question
   */
  private getOptionCount(question: Question): number {
    if (question.options?.length) {
      return question.options.length;
    }
    if (question.type === 'MATCHING' && question.pairs?.length) {
      return question.pairs.length;
    }
    return 0;
  }
}

export const randomizationService = new RandomizationService();
