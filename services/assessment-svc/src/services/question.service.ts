import type { Question, Prisma } from '../../generated/prisma-client/index.js';
import { publishEvent } from '../events/publisher.js';
import { prisma } from '../prisma.js';
import type { PrismaTransactionClient } from '../prisma.js';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
  QuestionQuery,
} from '../validators/assessment.validator.js';

export interface QuestionStats {
  timesAnswered: number;
  correctRate: number;
  averageTimeSeconds: number;
  discriminationIndex: number;
}

export class QuestionService {
  /**
   * Create a new question
   */
  async create(
    tenantId: string,
    authorId: string,
    input: CreateQuestionInput,
    tx?: PrismaTransactionClient
  ): Promise<Question> {
    const client = tx ?? prisma;

    const question = await client.question.create({
      data: {
        tenantId,
        authorId,
        type: input.type,
        stem: input.stem,
        stemMedia: input.stemMedia ?? undefined,
        options: input.options ?? undefined,
        correctAnswer: input.correctAnswer as Prisma.InputJsonValue,
        explanation: input.explanation,
        hints: input.hints ?? [],
        subjectId: input.subjectId,
        topicId: input.topicId,
        difficulty: input.difficulty ?? 'MEDIUM',
        points: input.points ?? 1,
        tags: input.tags ?? [],
        stats: {
          timesAnswered: 0,
          correctRate: 0,
          averageTimeSeconds: 0,
          discriminationIndex: 0,
        },
      },
    });

    await publishEvent('question.created', {
      questionId: question.id,
      tenantId,
      authorId,
      type: question.type,
    });

    return question;
  }

  /**
   * Get question by ID
   */
  async getById(tenantId: string, questionId: string): Promise<Question | null> {
    return prisma.question.findFirst({
      where: { id: questionId, tenantId },
    });
  }

  /**
   * Get question by ID for display (without correct answer)
   */
  async getByIdForDisplay(
    tenantId: string,
    questionId: string
  ): Promise<Omit<Question, 'correctAnswer'> | null> {
    const question = await prisma.question.findFirst({
      where: { id: questionId, tenantId },
    });

    if (!question) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { correctAnswer, ...rest } = question;
    return rest;
  }

  /**
   * List questions with filters and pagination
   */
  async list(
    tenantId: string,
    query: QuestionQuery
  ): Promise<{ data: Question[]; total: number; page: number; pageSize: number }> {
    const {
      page,
      pageSize,
      type,
      subjectId,
      topicId,
      difficulty,
      tags,
      search,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.QuestionWhereInput = {
      tenantId,
      ...(type && { type }),
      ...(subjectId && { subjectId }),
      ...(topicId && { topicId }),
      ...(difficulty && { difficulty }),
      ...(tags && tags.length > 0 && { tags: { hasEvery: tags } }),
      ...(search && {
        OR: [{ stem: { contains: search, mode: 'insensitive' } }, { tags: { has: search } }],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { [sortBy ?? 'createdAt']: sortOrder ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.question.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  /**
   * Update question
   */
  async update(
    tenantId: string,
    questionId: string,
    input: UpdateQuestionInput,
    tx?: PrismaTransactionClient
  ): Promise<Question> {
    const client = tx ?? prisma;

    const question = await client.question.update({
      where: { id: questionId },
      data: {
        ...(input.type !== undefined && { type: input.type }),
        ...(input.stem !== undefined && { stem: input.stem }),
        ...(input.stemMedia !== undefined && { stemMedia: input.stemMedia }),
        ...(input.options !== undefined && { options: input.options }),
        ...(input.correctAnswer !== undefined && {
          correctAnswer: input.correctAnswer as Prisma.InputJsonValue,
        }),
        ...(input.explanation !== undefined && { explanation: input.explanation }),
        ...(input.hints !== undefined && { hints: input.hints }),
        ...(input.subjectId !== undefined && { subjectId: input.subjectId }),
        ...(input.topicId !== undefined && { topicId: input.topicId }),
        ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
        ...(input.points !== undefined && { points: input.points }),
        ...(input.tags !== undefined && { tags: input.tags }),
      },
    });

    await publishEvent('question.updated', {
      questionId: question.id,
      tenantId,
      changes: Object.keys(input),
    });

    return question;
  }

  /**
   * Delete question
   */
  async delete(tenantId: string, questionId: string, tx?: PrismaTransactionClient): Promise<void> {
    const client = tx ?? prisma;

    // Check if question is used in any assessments
    const usageCount = await client.assessmentQuestion.count({
      where: { questionId },
    });

    if (usageCount > 0) {
      throw new Error(`Cannot delete question: it is used in ${usageCount} assessment(s)`);
    }

    await client.question.delete({ where: { id: questionId } });

    await publishEvent('question.deleted', {
      questionId,
      tenantId,
    });
  }

  /**
   * Update question statistics based on responses
   */
  async updateStats(questionId: string, tx?: PrismaTransactionClient): Promise<void> {
    const client = tx ?? prisma;

    const responses = await client.questionResponse.findMany({
      where: { questionId, isCorrect: { not: null } },
      select: {
        isCorrect: true,
        timeSpentSeconds: true,
      },
    });

    if (responses.length === 0) return;

    const timesAnswered = responses.length;
    const correctCount = responses.filter((r) => r.isCorrect).length;
    const correctRate = (correctCount / timesAnswered) * 100;
    const averageTimeSeconds =
      responses.reduce((sum, r) => sum + r.timeSpentSeconds, 0) / timesAnswered;

    // Simple discrimination index calculation (can be enhanced)
    const discriminationIndex = 0; // Would need more data for proper calculation

    await client.question.update({
      where: { id: questionId },
      data: {
        stats: {
          timesAnswered,
          correctRate: Math.round(correctRate * 100) / 100,
          averageTimeSeconds: Math.round(averageTimeSeconds),
          discriminationIndex,
        },
      },
    });
  }

  /**
   * Get questions by IDs
   */
  async getByIds(tenantId: string, questionIds: string[]): Promise<Question[]> {
    return prisma.question.findMany({
      where: {
        id: { in: questionIds },
        tenantId,
      },
    });
  }

  /**
   * Bulk import questions
   */
  async bulkCreate(
    tenantId: string,
    authorId: string,
    inputs: CreateQuestionInput[]
  ): Promise<Question[]> {
    return prisma.$transaction(async (tx) => {
      const questions = await Promise.all(
        inputs.map((input) => this.create(tenantId, authorId, input, tx))
      );
      return questions;
    });
  }

  /**
   * Clone a question
   */
  async clone(tenantId: string, questionId: string, authorId: string): Promise<Question> {
    const original = await this.getById(tenantId, questionId);

    if (!original) {
      throw new Error('Question not found');
    }

    return this.create(tenantId, authorId, {
      type: original.type,
      stem: `${original.stem} (Copy)`,
      stemMedia: original.stemMedia as CreateQuestionInput['stemMedia'],
      options: original.options as CreateQuestionInput['options'],
      correctAnswer: original.correctAnswer as CreateQuestionInput['correctAnswer'],
      explanation: original.explanation ?? undefined,
      hints: original.hints,
      subjectId: original.subjectId ?? undefined,
      topicId: original.topicId ?? undefined,
      difficulty: original.difficulty,
      points: original.points,
      tags: original.tags,
    });
  }
}

export const questionService = new QuestionService();
