import type {
  Assessment,
  AssessmentQuestion,
  Prisma,
} from '../../generated/prisma-client/index.js';
import { publishEvent } from '../events/publisher.js';
import { prisma } from '../prisma.js';
import type { PrismaTransactionClient } from '../prisma.js';
import type {
  CreateAssessmentInput,
  UpdateAssessmentInput,
  AssessmentQuery,
  AddQuestionToAssessmentInput,
  ReorderQuestionsInput,
} from '../validators/assessment.validator.js';

export interface AssessmentWithQuestions extends Assessment {
  questions: (AssessmentQuestion & {
    question: {
      id: string;
      stem: string;
      type: string;
      difficulty: string;
      points: number;
    };
  })[];
}

export class AssessmentService {
  /**
   * Create a new assessment
   */
  async create(
    tenantId: string,
    authorId: string,
    input: CreateAssessmentInput,
    tx?: PrismaTransactionClient
  ): Promise<Assessment> {
    const client = tx ?? prisma;

    const assessment = await client.assessment.create({
      data: {
        tenantId,
        authorId,
        title: input.title,
        description: input.description,
        type: input.type,
        settings: input.settings ?? {},
        subjectId: input.subjectId,
        topicIds: input.topicIds ?? [],
        difficulty: input.difficulty ?? 'MEDIUM',
        estimatedMinutes: input.estimatedMinutes ?? 15,
        status: 'DRAFT',
        totalPoints: 0,
      },
    });

    await publishEvent('assessment.created', {
      assessmentId: assessment.id,
      tenantId,
      authorId,
      type: assessment.type,
    });

    return assessment;
  }

  /**
   * Get assessment by ID
   */
  async getById(
    tenantId: string,
    assessmentId: string,
    includeQuestions = false
  ): Promise<Assessment | AssessmentWithQuestions | null> {
    return prisma.assessment.findFirst({
      where: { id: assessmentId, tenantId },
      include: includeQuestions
        ? {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                question: {
                  select: {
                    id: true,
                    stem: true,
                    type: true,
                    difficulty: true,
                    points: true,
                  },
                },
              },
            },
          }
        : undefined,
    });
  }

  /**
   * List assessments with filters and pagination
   */
  async list(
    tenantId: string,
    query: AssessmentQuery
  ): Promise<{ data: Assessment[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, type, status, subjectId, difficulty, search, sortBy, sortOrder } =
      query;

    const where: Prisma.AssessmentWhereInput = {
      tenantId,
      ...(type && { type }),
      ...(status && { status }),
      ...(subjectId && { subjectId }),
      ...(difficulty && { difficulty }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        orderBy: { [sortBy ?? 'createdAt']: sortOrder ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.assessment.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  /**
   * Update assessment
   */
  async update(
    tenantId: string,
    assessmentId: string,
    input: UpdateAssessmentInput,
    tx?: PrismaTransactionClient
  ): Promise<Assessment> {
    const client = tx ?? prisma;

    const assessment = await client.assessment.update({
      where: { id: assessmentId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.settings !== undefined && { settings: input.settings }),
        ...(input.subjectId !== undefined && { subjectId: input.subjectId }),
        ...(input.topicIds !== undefined && { topicIds: input.topicIds }),
        ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
        ...(input.estimatedMinutes !== undefined && { estimatedMinutes: input.estimatedMinutes }),
      },
    });

    await publishEvent('assessment.updated', {
      assessmentId: assessment.id,
      tenantId,
      changes: Object.keys(input),
    });

    return assessment;
  }

  /**
   * Publish assessment
   */
  async publish(
    tenantId: string,
    assessmentId: string,
    tx?: PrismaTransactionClient
  ): Promise<Assessment> {
    const client = tx ?? prisma;

    // Validate assessment has questions
    const questionCount = await client.assessmentQuestion.count({
      where: { assessmentId },
    });

    if (questionCount === 0) {
      throw new Error('Cannot publish assessment without questions');
    }

    const assessment = await client.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    await publishEvent('assessment.published', {
      assessmentId: assessment.id,
      tenantId,
      questionCount,
    });

    return assessment;
  }

  /**
   * Archive assessment
   */
  async archive(
    tenantId: string,
    assessmentId: string,
    tx?: PrismaTransactionClient
  ): Promise<Assessment> {
    const client = tx ?? prisma;

    const assessment = await client.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    await publishEvent('assessment.archived', {
      assessmentId: assessment.id,
      tenantId,
    });

    return assessment;
  }

  /**
   * Delete assessment (soft delete via archive, or hard delete if draft)
   */
  async delete(
    tenantId: string,
    assessmentId: string,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;

    const assessment = await client.assessment.findFirst({
      where: { id: assessmentId, tenantId },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (assessment.status === 'DRAFT') {
      await client.assessment.delete({ where: { id: assessmentId } });
    } else {
      await this.archive(tenantId, assessmentId, client);
    }

    await publishEvent('assessment.deleted', {
      assessmentId,
      tenantId,
      hardDelete: assessment.status === 'DRAFT',
    });
  }

  /**
   * Add question to assessment
   */
  async addQuestion(
    tenantId: string,
    assessmentId: string,
    input: AddQuestionToAssessmentInput,
    tx?: PrismaTransactionClient
  ): Promise<AssessmentQuestion> {
    const client = tx ?? prisma;

    // Get the next order index if not provided
    let orderIndex = input.orderIndex;
    if (orderIndex === undefined) {
      const lastQuestion = await client.assessmentQuestion.findFirst({
        where: { assessmentId },
        orderBy: { orderIndex: 'desc' },
      });
      orderIndex = (lastQuestion?.orderIndex ?? -1) + 1;
    }

    const assessmentQuestion = await client.assessmentQuestion.create({
      data: {
        assessmentId,
        questionId: input.questionId,
        orderIndex,
        points: input.points,
        required: input.required ?? true,
      },
    });

    // Update total points
    await this.recalculateTotalPoints(assessmentId, client);

    return assessmentQuestion;
  }

  /**
   * Remove question from assessment
   */
  async removeQuestion(
    assessmentId: string,
    questionId: string,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;

    await client.assessmentQuestion.delete({
      where: {
        assessmentId_questionId: { assessmentId, questionId },
      },
    });

    // Reorder remaining questions
    const remainingQuestions = await client.assessmentQuestion.findMany({
      where: { assessmentId },
      orderBy: { orderIndex: 'asc' },
    });

    await Promise.all(
      remainingQuestions.map((q, idx) =>
        client.assessmentQuestion.update({
          where: { id: q.id },
          data: { orderIndex: idx },
        })
      )
    );

    await this.recalculateTotalPoints(assessmentId, client);
  }

  /**
   * Reorder questions in assessment
   */
  async reorderQuestions(
    assessmentId: string,
    input: ReorderQuestionsInput,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;

    await Promise.all(
      input.questions.map((q) =>
        client.assessmentQuestion.update({
          where: {
            assessmentId_questionId: { assessmentId, questionId: q.questionId },
          },
          data: { orderIndex: q.orderIndex },
        })
      )
    );
  }

  /**
   * Get questions for assessment
   */
  async getQuestions(assessmentId: string): Promise<AssessmentQuestion[]> {
    return prisma.assessmentQuestion.findMany({
      where: { assessmentId },
      orderBy: { orderIndex: 'asc' },
      include: {
        question: true,
      },
    });
  }

  /**
   * Recalculate total points for assessment
   */
  private async recalculateTotalPoints(
    assessmentId: string,
    client: PrismaTransactionClient
  ): Promise<void> {
    const questions = await client.assessmentQuestion.findMany({
      where: { assessmentId },
      include: { question: { select: { points: true } } },
    });

    const totalPoints = questions.reduce((sum, aq) => sum + (aq.points ?? aq.question.points), 0);

    await client.assessment.update({
      where: { id: assessmentId },
      data: { totalPoints },
    });
  }

  /**
   * Clone an assessment
   */
  async clone(
    tenantId: string,
    assessmentId: string,
    authorId: string,
    newTitle?: string
  ): Promise<Assessment> {
    return prisma.$transaction(async (tx) => {
      const original = await tx.assessment.findFirst({
        where: { id: assessmentId, tenantId },
        include: { questions: true },
      });

      if (!original) {
        throw new Error('Assessment not found');
      }

      const cloned = await tx.assessment.create({
        data: {
          tenantId,
          authorId,
          title: newTitle ?? `${original.title} (Copy)`,
          description: original.description,
          type: original.type,
          settings: original.settings ?? {},
          subjectId: original.subjectId,
          topicIds: original.topicIds,
          difficulty: original.difficulty,
          estimatedMinutes: original.estimatedMinutes,
          status: 'DRAFT',
          totalPoints: original.totalPoints,
        },
      });

      // Clone questions
      await Promise.all(
        original.questions.map((q) =>
          tx.assessmentQuestion.create({
            data: {
              assessmentId: cloned.id,
              questionId: q.questionId,
              orderIndex: q.orderIndex,
              points: q.points,
              required: q.required,
            },
          })
        )
      );

      await publishEvent('assessment.cloned', {
        originalAssessmentId: assessmentId,
        clonedAssessmentId: cloned.id,
        tenantId,
        authorId,
      });

      return cloned;
    });
  }
}

export const assessmentService = new AssessmentService();
