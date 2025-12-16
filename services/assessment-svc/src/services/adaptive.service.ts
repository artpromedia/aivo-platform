import type { Question, Difficulty } from '../../generated/prisma-client/index.js';
import { prisma } from '../prisma.js';
import type { PrismaTransactionClient } from '../prisma.js';

export interface AdaptiveSelectionOptions {
  tenantId: string;
  subjectId?: string;
  topicIds?: string[];
  difficulty: Difficulty;
  count: number;
  excludeQuestionIds?: string[];
  userId?: string; // For personalized selection
}

export interface QuestionPoolSelectionOptions {
  poolId: string;
  count: number;
  excludeQuestionIds?: string[];
}

interface QuestionStats {
  timesAnswered?: number;
  correctRate?: number;
  averageTimeSeconds?: number;
  discriminationIndex?: number;
}

const DIFFICULTY_ORDER: Difficulty[] = ['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'];

export class AdaptiveService {
  /**
   * Select questions adaptively based on performance and difficulty
   */
  async selectQuestions(
    options: AdaptiveSelectionOptions,
    tx?: PrismaTransactionClient
  ): Promise<Question[]> {
    const client = tx ?? prisma;
    const { tenantId, subjectId, topicIds, difficulty, count, excludeQuestionIds, userId } =
      options;

    // Get user's performance history if userId provided
    let targetDifficulty = difficulty;
    if (userId) {
      const adjustedDifficulty = await this.getAdjustedDifficulty(
        tenantId,
        userId,
        subjectId,
        topicIds,
        difficulty,
        client
      );
      targetDifficulty = adjustedDifficulty;
    }

    // Build query for questions at target difficulty
    const questions = await client.question.findMany({
      where: {
        tenantId,
        ...(subjectId && { subjectId }),
        ...(topicIds && topicIds.length > 0 && { topicId: { in: topicIds } }),
        difficulty: targetDifficulty,
        ...(excludeQuestionIds &&
          excludeQuestionIds.length > 0 && {
            id: { notIn: excludeQuestionIds },
          }),
      },
      orderBy: [
        // Prefer questions with good discrimination (not too easy, not too hard)
        { stats: 'asc' }, // Will be overridden by post-processing
      ],
    });

    // If not enough questions at target difficulty, expand search
    if (questions.length < count) {
      const additionalQuestions = await this.expandDifficultySearch(
        client,
        tenantId,
        subjectId,
        topicIds,
        targetDifficulty,
        count - questions.length,
        [...(excludeQuestionIds ?? []), ...questions.map((q) => q.id)]
      );
      questions.push(...additionalQuestions);
    }

    // Score and sort questions for optimal selection
    const scoredQuestions = this.scoreQuestionsForSelection(questions);

    // Select top N questions
    return scoredQuestions.slice(0, count);
  }

  /**
   * Get next question based on current attempt progress
   */
  async getNextQuestion(attemptId: string, tx?: PrismaTransactionClient): Promise<Question | null> {
    const client = tx ?? prisma;

    const attempt = await client.attempt.findUnique({
      where: { id: attemptId },
      include: {
        responses: {
          include: { question: true },
          orderBy: { startedAt: 'desc' },
        },
        assessment: {
          include: {
            questions: {
              include: { question: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const settings = attempt.assessment.settings as { adaptiveDifficulty?: boolean } | null;
    const isAdaptive = settings?.adaptiveDifficulty ?? false;
    const answeredQuestionIds = new Set(attempt.responses.map((r) => r.questionId));

    // Get unanswered questions
    const unansweredQuestions = attempt.assessment.questions.filter(
      (aq) => !answeredQuestionIds.has(aq.questionId)
    );

    if (unansweredQuestions.length === 0) {
      return null; // All questions answered
    }

    if (!isAdaptive) {
      // Non-adaptive: return next question in order
      const firstQuestion = unansweredQuestions[0];
      return firstQuestion ? firstQuestion.question : null;
    }

    // Adaptive selection based on recent performance
    const recentResponses = attempt.responses.slice(0, 5);
    const recentCorrectRate =
      recentResponses.length > 0
        ? recentResponses.filter((r) => r.isCorrect).length / recentResponses.length
        : 0.5;

    // Determine target difficulty based on performance
    const firstResponse = recentResponses[0];
    const lastDifficulty = firstResponse
      ? firstResponse.question.difficulty
      : (attempt.assessment.difficulty ?? 'MEDIUM');

    let targetDifficulty = lastDifficulty;

    if (recentCorrectRate >= 0.8) {
      // Increase difficulty
      targetDifficulty = this.increaseDifficulty(lastDifficulty);
    } else if (recentCorrectRate <= 0.3) {
      // Decrease difficulty
      targetDifficulty = this.decreaseDifficulty(lastDifficulty);
    }

    // Find best matching question
    const availableQuestions = unansweredQuestions.map((aq) => aq.question);

    // Prefer questions at target difficulty
    const atTargetDifficulty = availableQuestions.filter((q) => q.difficulty === targetDifficulty);

    if (atTargetDifficulty.length > 0) {
      return this.selectOptimalQuestion(atTargetDifficulty) ?? null;
    }

    // Fall back to closest difficulty
    return this.selectClosestDifficulty(availableQuestions, targetDifficulty) ?? null;
  }

  /**
   * Select questions from a question pool
   */
  async selectFromPool(
    options: QuestionPoolSelectionOptions,
    tx?: PrismaTransactionClient
  ): Promise<Question[]> {
    const client = tx ?? prisma;

    const pool = await client.questionPool.findUnique({
      where: { id: options.poolId },
    });

    if (!pool) {
      throw new Error('Question pool not found');
    }

    interface PoolCriteria {
      subjectIds?: string[];
      topicIds?: string[];
      difficulties?: Difficulty[];
      types?: string[];
      tags?: string[];
      minCorrectRate?: number;
      maxCorrectRate?: number;
    }

    const criteria = pool.criteria as PoolCriteria;

    // Build query based on pool criteria
    const questions = await client.question.findMany({
      where: {
        tenantId: pool.tenantId,
        ...(criteria.subjectIds &&
          criteria.subjectIds.length > 0 && {
            subjectId: { in: criteria.subjectIds },
          }),
        ...(criteria.topicIds &&
          criteria.topicIds.length > 0 && {
            topicId: { in: criteria.topicIds },
          }),
        ...(criteria.difficulties &&
          criteria.difficulties.length > 0 && {
            difficulty: { in: criteria.difficulties },
          }),
        ...(criteria.types &&
          criteria.types.length > 0 && {
            type: { in: criteria.types as Question['type'][] },
          }),
        ...(criteria.tags &&
          criteria.tags.length > 0 && {
            tags: { hasSome: criteria.tags },
          }),
        ...(options.excludeQuestionIds &&
          options.excludeQuestionIds.length > 0 && {
            id: { notIn: options.excludeQuestionIds },
          }),
      },
    });

    // Filter by correct rate if specified
    let filteredQuestions = questions;
    if (criteria.minCorrectRate !== undefined || criteria.maxCorrectRate !== undefined) {
      filteredQuestions = questions.filter((q) => {
        const stats = q.stats as QuestionStats | null;
        const correctRate = stats?.correctRate ?? 50;
        const min = criteria.minCorrectRate ?? 0;
        const max = criteria.maxCorrectRate ?? 100;
        return correctRate >= min && correctRate <= max;
      });
    }

    // Randomly select requested count
    return this.randomSelect(filteredQuestions, options.count);
  }

  /**
   * Calculate estimated ability level from responses
   */
  async estimateAbility(
    tenantId: string,
    userId: string,
    subjectId?: string,
    topicIds?: string[],
    tx?: PrismaTransactionClient
  ): Promise<{ ability: number; confidence: number }> {
    const client = tx ?? prisma;

    // Get user's response history
    const responses = await client.questionResponse.findMany({
      where: {
        attempt: {
          userId,
          tenantId,
          status: { in: ['GRADED', 'SUBMITTED'] },
        },
        question: {
          ...(subjectId && { subjectId }),
          ...(topicIds && topicIds.length > 0 && { topicId: { in: topicIds } }),
        },
        isCorrect: { not: null },
      },
      include: { question: true },
      orderBy: { answeredAt: 'desc' },
      take: 100, // Last 100 responses
    });

    if (responses.length === 0) {
      return { ability: 0.5, confidence: 0 }; // No data, assume average
    }

    // Simple ability estimation using weighted correct rate
    // Weight recent responses more heavily
    let weightedCorrect = 0;
    let totalWeight = 0;

    responses.forEach((response, index) => {
      const weight = 1 / (1 + index * 0.1); // Decay factor
      const difficultyWeight = this.getDifficultyWeight(response.question.difficulty);
      totalWeight += weight;
      if (response.isCorrect) {
        weightedCorrect += weight * difficultyWeight;
      }
    });

    const ability = totalWeight > 0 ? weightedCorrect / totalWeight : 0.5;
    const confidence = Math.min(1, responses.length / 20); // Confidence based on sample size

    return {
      ability: Math.round(ability * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  // Private helper methods

  private async getAdjustedDifficulty(
    tenantId: string,
    userId: string,
    subjectId: string | undefined,
    topicIds: string[] | undefined,
    baseDifficulty: Difficulty,
    client: PrismaTransactionClient
  ): Promise<Difficulty> {
    const { ability, confidence } = await this.estimateAbility(
      tenantId,
      userId,
      subjectId,
      topicIds,
      client
    );

    if (confidence < 0.3) {
      return baseDifficulty; // Not enough data
    }

    // Map ability to difficulty
    if (ability >= 0.85) return 'EXPERT';
    if (ability >= 0.7) return 'HARD';
    if (ability >= 0.5) return 'MEDIUM';
    if (ability >= 0.3) return 'EASY';
    return 'BEGINNER';
  }

  private async expandDifficultySearch(
    client: PrismaTransactionClient,
    tenantId: string,
    subjectId: string | undefined,
    topicIds: string[] | undefined,
    targetDifficulty: Difficulty,
    count: number,
    excludeIds: string[]
  ): Promise<Question[]> {
    const targetIndex = DIFFICULTY_ORDER.indexOf(targetDifficulty);
    const nearbyDifficulties: Difficulty[] = [];

    // Add difficulties in order of distance from target
    for (let distance = 1; distance < DIFFICULTY_ORDER.length; distance++) {
      const lowerDifficulty = DIFFICULTY_ORDER[targetIndex - distance];
      const higherDifficulty = DIFFICULTY_ORDER[targetIndex + distance];

      if (targetIndex - distance >= 0 && lowerDifficulty) {
        nearbyDifficulties.push(lowerDifficulty);
      }
      if (targetIndex + distance < DIFFICULTY_ORDER.length && higherDifficulty) {
        nearbyDifficulties.push(higherDifficulty);
      }
    }

    return client.question.findMany({
      where: {
        tenantId,
        ...(subjectId && { subjectId }),
        ...(topicIds && topicIds.length > 0 && { topicId: { in: topicIds } }),
        difficulty: { in: nearbyDifficulties },
        id: { notIn: excludeIds },
      },
      take: count,
    });
  }

  private scoreQuestionsForSelection(questions: Question[]): Question[] {
    return questions
      .map((q) => {
        const stats = q.stats as QuestionStats | null;
        // Prefer questions with:
        // 1. Good discrimination (correct rate between 40-80%)
        // 2. Enough data (timesAnswered > 10)
        const correctRate = stats?.correctRate ?? 50;
        const timesAnswered = stats?.timesAnswered ?? 0;

        let score = 0;

        // Discrimination score (peak at 60% correct rate)
        const discriminationScore = 1 - Math.abs(correctRate - 60) / 60;
        score += discriminationScore * 0.4;

        // Data reliability score
        const reliabilityScore = Math.min(1, timesAnswered / 20);
        score += reliabilityScore * 0.3;

        // Add some randomness for variety
        score += Math.random() * 0.3;

        return { question: q, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => item.question);
  }

  private increaseDifficulty(current: Difficulty): Difficulty {
    const index = DIFFICULTY_ORDER.indexOf(current);
    const next = DIFFICULTY_ORDER[index + 1];
    return index < DIFFICULTY_ORDER.length - 1 && next ? next : current;
  }

  private decreaseDifficulty(current: Difficulty): Difficulty {
    const index = DIFFICULTY_ORDER.indexOf(current);
    const prev = DIFFICULTY_ORDER[index - 1];
    return index > 0 && prev ? prev : current;
  }

  private selectOptimalQuestion(questions: Question[]): Question | undefined {
    // Select based on stats for variety
    const scored = this.scoreQuestionsForSelection(questions);
    return scored[0];
  }

  private selectClosestDifficulty(
    questions: Question[],
    targetDifficulty: Difficulty
  ): Question | undefined {
    const targetIndex = DIFFICULTY_ORDER.indexOf(targetDifficulty);

    const sorted = [...questions].sort((a, b) => {
      const aDistance = Math.abs(DIFFICULTY_ORDER.indexOf(a.difficulty) - targetIndex);
      const bDistance = Math.abs(DIFFICULTY_ORDER.indexOf(b.difficulty) - targetIndex);
      return aDistance - bDistance;
    });

    return sorted[0];
  }

  private getDifficultyWeight(difficulty: Difficulty): number {
    switch (difficulty) {
      case 'BEGINNER':
        return 0.5;
      case 'EASY':
        return 0.7;
      case 'MEDIUM':
        return 1;
      case 'HARD':
        return 1.3;
      case 'EXPERT':
        return 1.5;
      default:
        return 1;
    }
  }

  private randomSelect<T>(items: T[], count: number): T[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

export const adaptiveService = new AdaptiveService();
