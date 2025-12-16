import type { Attempt, Prisma } from '../../generated/prisma-client/index.js';
import { publishEvent } from '../events/publisher.js';
import { prisma } from '../prisma.js';
import type { PrismaTransactionClient } from '../prisma.js';
import type { AttemptQuery } from '../validators/assessment.validator.js';
import { AttemptMetadataSchema } from '../validators/assessment.validator.js';

import { scoringService } from './scoring.service.js';

export interface AttemptWithResponses extends Attempt {
  responses: {
    id: string;
    questionId: string;
    response: unknown;
    isCorrect: boolean | null;
    pointsEarned: number | null;
    timeSpentSeconds: number;
  }[];
}

export class AttemptService {
  /**
   * Start a new attempt
   */
  async start(
    tenantId: string,
    userId: string,
    assessmentId: string,
    metadata?: unknown
  ): Promise<Attempt> {
    // Get assessment and check if attempts are allowed
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, tenantId, status: 'PUBLISHED' },
    });

    if (!assessment) {
      throw new Error('Assessment not found or not published');
    }

    // Check max attempts
    const settings = assessment.settings as { maxAttempts?: number } | null;
    if (settings?.maxAttempts) {
      const existingAttempts = await prisma.attempt.count({
        where: {
          assessmentId,
          userId,
          status: { in: ['SUBMITTED', 'GRADED'] },
        },
      });

      if (existingAttempts >= settings.maxAttempts) {
        throw new Error('Maximum attempts reached');
      }
    }

    // Check for in-progress attempt
    const inProgressAttempt = await prisma.attempt.findFirst({
      where: {
        assessmentId,
        userId,
        status: 'IN_PROGRESS',
      },
    });

    if (inProgressAttempt) {
      return inProgressAttempt; // Resume existing attempt
    }

    // Get attempt number
    const attemptCount = await prisma.attempt.count({
      where: { assessmentId, userId },
    });

    const parsedMetadata = metadata ? AttemptMetadataSchema.safeParse(metadata) : null;

    const attempt = await prisma.attempt.create({
      data: {
        assessmentId,
        userId,
        tenantId,
        attemptNumber: attemptCount + 1,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        pointsPossible: assessment.totalPoints,
        metadata: parsedMetadata?.success ? parsedMetadata.data : {},
      },
    });

    await publishEvent('attempt.started', {
      attemptId: attempt.id,
      assessmentId,
      userId,
      tenantId,
      attemptNumber: attempt.attemptNumber,
    });

    return attempt;
  }

  /**
   * Get attempt by ID
   */
  async getById(
    tenantId: string,
    attemptId: string,
    includeResponses = false
  ): Promise<Attempt | AttemptWithResponses | null> {
    return prisma.attempt.findFirst({
      where: { id: attemptId, tenantId },
      include: includeResponses
        ? {
            responses: {
              select: {
                id: true,
                questionId: true,
                response: true,
                isCorrect: true,
                pointsEarned: true,
                timeSpentSeconds: true,
              },
            },
          }
        : undefined,
    });
  }

  /**
   * List attempts with filters
   */
  async list(
    tenantId: string,
    query: AttemptQuery
  ): Promise<{ data: Attempt[]; total: number; page: number; pageSize: number }> {
    const {
      page,
      pageSize,
      assessmentId,
      userId,
      status,
      startedAfter,
      startedBefore,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.AttemptWhereInput = {
      tenantId,
      ...(assessmentId && { assessmentId }),
      ...(userId && { userId }),
      ...(status && { status }),
      ...(startedAfter && { startedAt: { gte: startedAfter } }),
      ...(startedBefore && { startedAt: { lte: startedBefore } }),
    };

    const [data, total] = await Promise.all([
      prisma.attempt.findMany({
        where,
        orderBy: { [sortBy ?? 'startedAt']: sortOrder ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.attempt.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  /**
   * Submit attempt for grading
   */
  async submit(
    tenantId: string,
    attemptId: string,
    tx?: PrismaTransactionClient
  ): Promise<Attempt> {
    const client = tx ?? prisma;

    const attempt = await client.attempt.findFirst({
      where: { id: attemptId, tenantId },
      include: { assessment: true },
    });

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new Error('Attempt is not in progress');
    }

    // Calculate time spent
    const timeSpentSeconds = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);

    // Score the attempt
    const scoringResult = await scoringService.scoreAttempt(attemptId, client);

    // Determine if needs manual grading
    const needsManualGrading = scoringResult.pendingManualGrading > 0;
    const settings = attempt.assessment.settings as { passingScore?: number } | null;
    const passed = settings?.passingScore ? scoringResult.score >= settings.passingScore : null;

    const updatedAttempt = await client.attempt.update({
      where: { id: attemptId },
      data: {
        status: needsManualGrading ? 'GRADING' : 'GRADED',
        submittedAt: new Date(),
        timeSpentSeconds,
        score: scoringResult.score,
        pointsEarned: scoringResult.pointsEarned,
        passed,
        ...(needsManualGrading ? {} : { gradedAt: new Date() }),
      },
    });

    await publishEvent('attempt.submitted', {
      attemptId,
      assessmentId: attempt.assessmentId,
      userId: attempt.userId,
      tenantId,
      score: scoringResult.score,
      passed,
      needsManualGrading,
    });

    return updatedAttempt;
  }

  /**
   * Expire an attempt that has exceeded time limit
   */
  async expire(attemptId: string, tx?: PrismaTransactionClient): Promise<Attempt> {
    const client = tx ?? prisma;

    const attempt = await client.attempt.findUnique({
      where: { id: attemptId },
    });

    if (attempt?.status !== 'IN_PROGRESS') {
      throw new Error('Cannot expire attempt');
    }

    const timeSpentSeconds = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);

    // Score whatever was answered
    const scoringResult = await scoringService.scoreAttempt(attemptId, client);

    const updatedAttempt = await client.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'EXPIRED',
        submittedAt: new Date(),
        timeSpentSeconds,
        score: scoringResult.score,
        pointsEarned: scoringResult.pointsEarned,
        gradedAt: new Date(),
      },
    });

    await publishEvent('attempt.expired', {
      attemptId,
      assessmentId: attempt.assessmentId,
      userId: attempt.userId,
      tenantId: attempt.tenantId,
      score: scoringResult.score,
    });

    return updatedAttempt;
  }

  /**
   * Abandon an attempt
   */
  async abandon(
    tenantId: string,
    attemptId: string,
    tx?: PrismaTransactionClient
  ): Promise<Attempt> {
    const client = tx ?? prisma;

    const attempt = await client.attempt.findFirst({
      where: { id: attemptId, tenantId, status: 'IN_PROGRESS' },
    });

    if (!attempt) {
      throw new Error('Attempt not found or not in progress');
    }

    const timeSpentSeconds = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);

    const updatedAttempt = await client.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'ABANDONED',
        timeSpentSeconds,
      },
    });

    await publishEvent('attempt.abandoned', {
      attemptId,
      assessmentId: attempt.assessmentId,
      userId: attempt.userId,
      tenantId,
    });

    return updatedAttempt;
  }

  /**
   * Get attempts by user and assessment
   */
  async getByUserAndAssessment(
    tenantId: string,
    userId: string,
    assessmentId: string
  ): Promise<Attempt[]> {
    return prisma.attempt.findMany({
      where: { tenantId, userId, assessmentId },
      orderBy: { attemptNumber: 'desc' },
    });
  }

  /**
   * Get best attempt for user and assessment
   */
  async getBestAttempt(
    tenantId: string,
    userId: string,
    assessmentId: string
  ): Promise<Attempt | null> {
    return prisma.attempt.findFirst({
      where: {
        tenantId,
        userId,
        assessmentId,
        status: { in: ['GRADED', 'SUBMITTED'] },
      },
      orderBy: { score: 'desc' },
    });
  }

  /**
   * Check if attempt time limit exceeded
   */
  async checkTimeLimit(attemptId: string): Promise<boolean> {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true },
    });

    if (attempt?.status !== 'IN_PROGRESS') {
      return false;
    }

    const settings = attempt.assessment.settings as { timeLimit?: number } | null;
    if (!settings?.timeLimit) {
      return false;
    }

    const elapsedMinutes = (Date.now() - attempt.startedAt.getTime()) / 1000 / 60;
    return elapsedMinutes >= settings.timeLimit;
  }
}

export const attemptService = new AttemptService();
