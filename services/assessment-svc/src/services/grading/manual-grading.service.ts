/**
 * Manual Grading Service
 *
 * Handles teacher grading workflow for essays, short answers, and other subjective questions:
 * - Grading queue management
 * - Rubric-based scoring
 * - Feedback and annotations
 * - Grade release workflow
 * - Blind grading support
 */

import { publishEvent } from '../../events/publisher.js';
import { prisma } from '../../prisma.js';
import type { PrismaTransactionClient } from '../../prisma.js';
import type {
  Rubric,
  GradingQueue,
  GradingQueueItem,
  GradingSummary,
  QuestionResponse,
  ResponseStatus,
} from '../../types/assessment.types.js';

import { rubricService } from './rubric.service.js';


// ============================================================================
// TYPES
// ============================================================================

export interface GradeResponseInput {
  responseId: string;
  gradedBy: string;
  pointsAwarded: number;
  feedback?: string;
  rubricScores?: Record<string, number>; // criterionId -> points
  rubricFeedback?: Record<string, string>; // criterionId -> feedback
  annotations?: {
    startOffset: number;
    endOffset: number;
    type: 'highlight' | 'comment' | 'correction';
    text?: string;
    color?: string;
  }[];
  flagged?: boolean;
  flagReason?: string;
}

export interface BatchGradeInput {
  responseIds: string[];
  gradedBy: string;
  pointsAwarded: number;
  feedback?: string;
}

export interface GradingQueueOptions {
  assessmentId?: string;
  questionId?: string;
  status?: ResponseStatus;
  blindGrading?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ReleaseGradesInput {
  assessmentId?: string;
  attemptIds?: string[];
  releaseAt?: Date;
}

// ============================================================================
// SERVICE
// ============================================================================

export class ManualGradingService {
  /**
   * Get grading queue for a teacher
   */
  async getGradingQueue(
    teacherId: string,
    tenantId: string,
    options?: GradingQueueOptions
  ): Promise<GradingQueue> {
    const {
      assessmentId,
      questionId,
      status = 'PENDING',
      blindGrading = false,
      page = 1,
      pageSize = 50,
    } = options ?? {};

    const where: any = {
      attempt: {
        assessment: { tenantId },
        status: 'SUBMITTED',
      },
      status,
      question: {
        OR: [
          { type: 'ESSAY' },
          { type: 'SHORT_ANSWER' },
        ],
      },
    };

    if (assessmentId) {
      where.attempt = { ...where.attempt, assessmentId };
    }

    if (questionId) {
      where.questionId = questionId;
    }

    const [responses, total] = await Promise.all([
      prisma.questionResponse.findMany({
        where,
        include: {
          question: {
            include: {
              rubric: {
                include: {
                  criteria: {
                    include: { levels: true },
                    orderBy: { orderIndex: 'asc' },
                  },
                },
              },
            },
          },
          attempt: {
            select: blindGrading
              ? {
                id: true,
                assessmentId: true,
                assessment: { select: { id: true, title: true, type: true } },
              }
              : {
                id: true,
                assessmentId: true,
                assessment: { select: { id: true, title: true, type: true } },
                userId: true,
              },
          },
          gradingRecords: {
            orderBy: { gradedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: [
          { startedAt: 'asc' }, // Oldest first (FIFO)
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.questionResponse.count({ where }),
    ]);

    const items: GradingQueueItem[] = responses.map((response) => ({
      responseId: response.id,
      questionId: response.questionId,
      attemptId: response.attemptId,
      assessmentId: response.attempt.assessmentId,
      assessmentName: response.attempt.assessment.title,
      questionType: response.question.type,
      questionStem: response.question.stem,
      answer: response.response,
      maxPoints: response.maxPoints,
      pointsAwarded: response.pointsEarned ?? undefined,
      status: response.status as ResponseStatus,
      studentId: blindGrading ? undefined : response.attempt.userId,
      submittedAt: response.answeredAt ?? response.startedAt,
      rubric: response.question.rubric
        ? this.mapRubric(response.question.rubric)
        : undefined,
    }));

    // Get summary counts
    const [pendingCount, gradedCount, flaggedCount] = await Promise.all([
      prisma.questionResponse.count({ where: { ...where, status: 'PENDING' } }),
      prisma.questionResponse.count({ where: { ...where, status: 'GRADED' } }),
      prisma.questionResponse.count({ where: { ...where, flagged: true } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      summary: {
        pending: pendingCount,
        graded: gradedCount,
        flagged: flaggedCount,
      },
    };
  }

  /**
   * Get a single response for grading
   */
  async getResponseForGrading(
    responseId: string,
    options?: { blindGrading?: boolean }
  ): Promise<GradingQueueItem | null> {
    const blindGrading = options?.blindGrading ?? false;

    const response = await prisma.questionResponse.findUnique({
      where: { id: responseId },
      include: {
        question: {
          include: {
            rubric: {
              include: {
                criteria: {
                  include: { levels: true },
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
        attempt: {
          include: {
            assessment: {
              select: { id: true, title: true, type: true },
            },
          },
        },
        gradingRecords: {
          orderBy: { gradedAt: 'desc' },
        },
      },
    });

    if (!response) return null;

    return {
      responseId: response.id,
      questionId: response.questionId,
      attemptId: response.attemptId,
      assessmentId: response.attempt.assessmentId,
      assessmentName: response.attempt.assessment.title,
      questionType: response.question.type,
      questionStem: response.question.stem,
      answer: response.response,
      maxPoints: response.maxPoints,
      pointsAwarded: response.pointsEarned ?? undefined,
      feedback: response.feedback ?? undefined,
      status: response.status as ResponseStatus,
      studentId: blindGrading ? undefined : response.attempt.userId,
      submittedAt: response.answeredAt ?? response.startedAt,
      rubric: response.question.rubric
        ? this.mapRubric(response.question.rubric)
        : undefined,
      rubricScores: response.rubricScores as Record<string, number> | undefined,
      gradingHistory: response.gradingRecords.map((record) => ({
        gradedBy: record.graderId,
        gradedAt: record.gradedAt,
        pointsAwarded: record.score,
        feedback: record.feedback ?? undefined,
        rubricScores: record.rubricScores as Record<string, number> | undefined,
      })),
    };
  }

  /**
   * Grade a response
   */
  async gradeResponse(
    input: GradeResponseInput,
    tx?: PrismaTransactionClient
  ): Promise<QuestionResponse> {
    const client = tx ?? prisma;

    const response = await client.questionResponse.findUnique({
      where: { id: input.responseId },
      include: {
        question: {
          include: { rubric: { include: { criteria: true } } },
        },
        attempt: true,
      },
    });

    if (!response) {
      throw new Error('Response not found');
    }

    // Validate points
    if (input.pointsAwarded < 0 || input.pointsAwarded > response.maxPoints) {
      throw new Error(
        `Points must be between 0 and ${response.maxPoints}`
      );
    }

    // Validate rubric scores if provided
    if (input.rubricScores && response.question.rubric) {
      this.validateRubricScores(
        input.rubricScores,
        response.question.rubric.criteria
      );
    }

    // Create grading record
    await client.gradingRecord.create({
      data: {
        responseId: input.responseId,
        graderId: input.gradedBy,
        score: input.pointsAwarded,
        maxPoints: response.maxPoints,
        feedback: input.feedback,
        rubricScores: input.rubricScores ?? undefined,
      },
    });

    // Update response
    const updated = await client.questionResponse.update({
      where: { id: input.responseId },
      data: {
        pointsEarned: input.pointsAwarded,
        feedback: input.feedback,
        rubricScores: input.rubricScores ?? undefined,
        status: 'GRADED',
        autoGraded: false,
        gradedBy: input.gradedBy,
        gradedAt: new Date(),
        flagged: input.flagged ?? false,
      },
      include: {
        question: true,
        attempt: true,
      },
    });

    await publishEvent('response.graded', {
      responseId: input.responseId,
      attemptId: response.attemptId,
      questionId: response.questionId,
      pointsAwarded: input.pointsAwarded,
      gradedBy: input.gradedBy,
      autoGraded: false,
    });

    // Check if all responses for attempt are graded
    await this.checkAttemptCompletion(response.attemptId, client);

    return this.mapResponse(updated);
  }

  /**
   * Batch grade multiple responses with same score
   */
  async batchGrade(
    input: BatchGradeInput,
    tx?: PrismaTransactionClient
  ): Promise<{ graded: number; errors: { responseId: string; error: string }[] }> {
    const client = tx ?? prisma;

    const results = {
      graded: 0,
      errors: [] as { responseId: string; error: string }[],
    };

    for (const responseId of input.responseIds) {
      try {
        await this.gradeResponse(
          {
            responseId,
            gradedBy: input.gradedBy,
            pointsAwarded: input.pointsAwarded,
            feedback: input.feedback,
          },
          client
        );
        results.graded++;
      } catch (error) {
        results.errors.push({
          responseId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Flag a response for review
   */
  async flagResponse(
    responseId: string,
    flaggedBy: string,
    reason?: string
  ): Promise<void> {
    await prisma.questionResponse.update({
      where: { id: responseId },
      data: {
        flagged: true,
        feedback: reason ?? 'Flagged for review',
      },
    });

    await publishEvent('response.flagged', {
      responseId,
      flaggedBy,
      reason,
    });
  }

  /**
   * Unflag a response
   */
  async unflagResponse(responseId: string): Promise<void> {
    await prisma.questionResponse.update({
      where: { id: responseId },
      data: {
        flagged: false,
      },
    });
  }

  /**
   * Get grading summary for an assessment
   */
  async getGradingSummary(
    assessmentId: string,
    tenantId: string
  ): Promise<GradingSummary> {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, tenantId },
      include: {
        questions: {
          where: {
            question: {
              OR: [
                { type: 'ESSAY' },
                { type: 'SHORT_ANSWER' },
              ],
            },
          },
          include: {
            question: true,
          },
        },
        attempts: {
          where: { status: 'SUBMITTED' },
          include: {
            responses: {
              where: {
                question: {
                  OR: [
                    { type: 'ESSAY' },
                    { type: 'SHORT_ANSWER' },
                  ],
                },
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const allResponses = assessment.attempts.flatMap((a) => a.responses);
    const pending = allResponses.filter((r) => r.status === 'PENDING').length;
    const graded = allResponses.filter((r) => r.status === 'GRADED').length;
    const total = allResponses.length;

    // Per-question breakdown
    const byQuestion = assessment.questions.map((assessmentQuestion) => {
      const question = assessmentQuestion.question;
      const questionResponses = allResponses.filter(
        (r) => r.questionId === question.id
      );
      return {
        questionId: question.id,
        questionStem: question.stem,
        pending: questionResponses.filter((r) => r.status === 'PENDING').length,
        graded: questionResponses.filter((r) => r.status === 'GRADED').length,
        total: questionResponses.length,
      };
    });

    // Per-grader breakdown
    const graderCounts: Record<string, number> = {};
    for (const response of allResponses) {
      if (response.gradedBy) {
        graderCounts[response.gradedBy] =
          (graderCounts[response.gradedBy] ?? 0) + 1;
      }
    }

    const byGrader = Object.entries(graderCounts).map(([graderId, count]) => ({
      graderId,
      count,
    }));

    return {
      assessmentId,
      assessmentName: assessment.title,
      totalResponses: total,
      pending,
      graded,
      percentComplete: total > 0 ? Math.round((graded / total) * 100) : 100,
      byQuestion,
      byGrader,
    };
  }

  /**
   * Release grades for an assessment or specific attempts
   */
  async releaseGrades(
    input: ReleaseGradesInput,
    releasedBy: string
  ): Promise<{ released: number }> {
    const now = input.releaseAt ?? new Date();
    let releaseCount = 0;

    if (input.attemptIds?.length) {
      // Release specific attempts
      const result = await prisma.attempt.updateMany({
        where: {
          id: { in: input.attemptIds },
          gradesReleasedAt: null,
        },
        data: {
          gradesReleasedAt: now,
        },
      });
      releaseCount = result.count;
    } else if (input.assessmentId) {
      // Release all completed grading for assessment
      const result = await prisma.attempt.updateMany({
        where: {
          assessmentId: input.assessmentId,
          status: 'GRADED',
          gradesReleasedAt: null,
        },
        data: {
          gradesReleasedAt: now,
        },
      });
      releaseCount = result.count;
    }

    if (releaseCount > 0) {
      await publishEvent('grades.released', {
        assessmentId: input.assessmentId,
        attemptIds: input.attemptIds,
        releasedBy,
        releasedAt: now,
        count: releaseCount,
      });
    }

    return { released: releaseCount };
  }

  /**
   * Check if all responses for an attempt are graded and update status
   */
  private async checkAttemptCompletion(
    attemptId: string,
    client: PrismaTransactionClient
  ): Promise<void> {
    const attempt = await client.attempt.findUnique({
      where: { id: attemptId },
      include: {
        responses: true,
      },
    });

    if (!attempt) return;

    const allGraded = attempt.responses.every(
      (r) => r.status === 'GRADED' || r.status === 'SKIPPED'
    );

    if (allGraded && attempt.status === 'SUBMITTED') {
      const pointsEarned = attempt.responses.reduce(
        (sum, r) => sum + (r.pointsEarned ?? 0),
        0
      );
      const pointsPossible = attempt.responses.reduce(
        (sum, r) => sum + r.maxPoints,
        0
      );
      const score = pointsPossible > 0 ? (pointsEarned / pointsPossible) * 100 : 0;

      await client.attempt.update({
        where: { id: attemptId },
        data: {
          status: 'GRADED',
          score,
          pointsEarned,
          pointsPossible,
        },
      });

      await publishEvent('attempt.graded', {
        attemptId,
        score,
        pointsEarned,
        pointsPossible,
      });
    }
  }

  /**
   * Validate rubric scores against criteria
   */
  private validateRubricScores(
    scores: Record<string, number>,
    criteria: { id: string; maxPoints: number }[]
  ): void {
    for (const criterion of criteria) {
      const score = scores[criterion.id];
      if (score !== undefined) {
        if (score < 0 || score > criterion.maxPoints) {
          throw new Error(
            `Score for criterion ${criterion.id} must be between 0 and ${criterion.maxPoints}`
          );
        }
      }
    }
  }

  // ============================================================================
  // MAPPING
  // ============================================================================

  private mapRubric(data: any): Rubric {
    return {
      id: data.id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      maxPoints: data.maxPoints,
      isPublic: data.isPublic,
      criteria:
        data.criteria?.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          orderIndex: c.orderIndex,
          maxPoints: c.maxPoints,
          weight: c.weight,
          levels:
            c.levels?.map((l: any) => ({
              id: l.id,
              name: l.name,
              description: l.description,
              points: l.points,
              orderIndex: l.orderIndex,
              feedback: l.feedback,
            })) ?? [],
        })) ?? [],
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapResponse(data: any): QuestionResponse {
    return {
      id: data.id,
      attemptId: data.attemptId,
      questionId: data.questionId,
      answer: data.response ?? undefined,
      response: data.response ?? undefined,
      responseText: data.responseText ?? undefined,
      isCorrect: data.isCorrect ?? undefined,
      pointsAwarded: data.pointsEarned ?? null,
      pointsEarned: data.pointsEarned ?? undefined,
      maxPoints: data.maxPoints,
      partialCredit: data.partialCredit ?? undefined,
      autoGraded: data.autoGraded ?? undefined,
      status: data.status,
      flagged: data.flagged ?? undefined,
      rubricScores: data.rubricScores ?? undefined,
      feedback: data.feedback ?? undefined,
      gradedBy: data.gradedBy ?? undefined,
      gradedAt: data.gradedAt ?? undefined,
      startedAt: data.startedAt ?? undefined,
      answeredAt: data.answeredAt ?? undefined,
      timeSpentSeconds: data.timeSpentSeconds ?? undefined,
      hintsUsed: data.hintsUsed ?? undefined,
    };
  }
}

export const manualGradingService = new ManualGradingService();
