import type { Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  getAdaptiveEngine,
  clearAdaptiveEngine,
  DIFFICULTY_LEVELS,
} from '../lib/adaptiveDifficulty.js';
import { generateBaselineQuestions, scoreResponse } from '../lib/aiOrchestrator.js';
import { publishBaselineAccepted } from '../lib/eventPublisher.js';
import { prisma } from '../prisma.js';
import { ALL_DOMAINS, DOMAIN_SKILL_CODES, type GeneratedQuestion } from '../types/baseline.js';

// --- Type definitions for JSON fields ---
interface PromptJson {
  skillCode: string;
  questionType: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
  questionText: string;
  options?: string[];
  difficulty?: number;
}

interface CorrectAnswerJson {
  correctAnswer: number | string;
  rubric?: string;
}

interface ResponseJson {
  selectedOption?: number;
  openResponse?: string;
}

// Extended user type from JWT
interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
}

// --- Zod Schemas ---

const CreateProfileSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  gradeBand: z.enum(['K5', 'G6_8', 'G9_12']),
});

const AnswerItemSchema = z.object({
  response: z.any(), // Flexible JSON response
  latencyMs: z.number().int().min(0).optional(),
});

const RetestSchema = z.object({
  reason: z.enum(['DISTRACTED', 'ANXIETY', 'TECHNICAL_ISSUE', 'OTHER']),
  notes: z.string().max(1000).optional(),
});

// --- Helpers ---

function getUserFromRequest(
  request: FastifyRequest
): { sub: string; tenantId: string; role: string } | null {
  const user = (request as unknown as { user?: JwtUser }).user;
  if (!user) return null;
  return {
    sub: user.sub,
    tenantId: user.tenantId ?? user.tenant_id ?? '',
    role: user.role,
  };
}

function canManageProfile(
  user: { sub: string; tenantId: string; role: string },
  profile: { tenantId: string; learnerId: string }
): boolean {
  // Admins can manage any profile in their tenant
  if (user.role === 'admin' && user.tenantId === profile.tenantId) return true;
  // Parents can manage their own learners (learner's parent is stored elsewhere, simplify: same tenant check for now)
  // In production: check parent-learner relationship
  if (user.role === 'parent' && user.tenantId === profile.tenantId) return true;
  // Teachers have read-only access
  return false;
}

function canReadProfile(
  user: { sub: string; tenantId: string; role: string },
  profile: { tenantId: string }
): boolean {
  return user.tenantId === profile.tenantId;
}

// --- Routes ---

export async function baselineRoutes(fastify: FastifyInstance) {
  /**
   * POST /baseline/profiles
   * Create a new baseline profile for a learner.
   */
  fastify.post('/baseline/profiles', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parseResult = CreateProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send({ error: 'Invalid request body', details: parseResult.error.flatten() });
    }

    const { tenantId, learnerId, gradeBand } = parseResult.data;

    // Tenant check
    if (user.tenantId !== tenantId) {
      return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
    }

    // Check for existing profile
    const existing = await prisma.baselineProfile.findUnique({
      where: { tenantId_learnerId: { tenantId, learnerId } },
    });
    if (existing) {
      return reply
        .status(409)
        .send({ error: 'Profile already exists for this learner', profileId: existing.id });
    }

    const profile = await prisma.baselineProfile.create({
      data: {
        tenantId,
        learnerId,
        gradeBand,
        status: 'NOT_STARTED',
        attemptCount: 0,
      },
    });

    return reply.status(201).send(profile);
  });

  /**
   * POST /baseline/profiles/:profileId/start
   * Start a new baseline attempt (generates 25 questions).
   */
  fastify.post(
    '/baseline/profiles/:profileId/start',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { profileId } = request.params as { profileId: string };

      const profile = await prisma.baselineProfile.findUnique({
        where: { id: profileId },
        include: { attempts: { orderBy: { attemptNumber: 'desc' }, take: 1 } },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      if (!canManageProfile(user, profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // Check if already finalized
      if (profile.status === 'FINAL_ACCEPTED') {
        return reply.status(400).send({ error: 'Profile is already finalized' });
      }

      // Check attempt limit (max 2: initial + 1 retest)
      const lastAttempt = profile.attempts[0];
      if (lastAttempt) {
        if (!lastAttempt.completedAt) {
          return reply
            .status(400)
            .send({ error: 'An attempt is already in progress', attemptId: lastAttempt.id });
        }
        if (profile.status !== 'RETEST_ALLOWED') {
          return reply
            .status(400)
            .send({ error: 'Cannot start new attempt without retest request' });
        }
        if (lastAttempt.attemptNumber >= 2) {
          return reply.status(400).send({ error: 'Maximum attempts reached (2)' });
        }
      }

      const attemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;

      // Initialize adaptive difficulty engine for this attempt
      // (will be retrieved later during answer submission)
      const initialDifficulty = DIFFICULTY_LEVELS.MEDIUM;

      // Generate questions for all domains with initial difficulty
      const allItems: {
        domain: string;
        sequence: number;
        skillCode: string;
        question: GeneratedQuestion;
      }[] = [];

      for (const domain of ALL_DOMAINS) {
        const questions = await generateBaselineQuestions({
          tenantId: profile.tenantId,
          learnerId: profile.learnerId,
          gradeBand: profile.gradeBand,
          domain,
          skillCodes: DOMAIN_SKILL_CODES[domain],
          difficulty: initialDifficulty, // Start at medium difficulty
        });

        questions.forEach((q: GeneratedQuestion, idx: number) => {
          allItems.push({
            domain,
            sequence: idx + 1,
            skillCode: q.skillCode,
            question: q,
          });
        });
      }

      // Create attempt and items in transaction
      const attempt = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const newAttempt = await tx.baselineAttempt.create({
          data: {
            baselineProfileId: profile.id,
            attemptNumber,
            startedAt: new Date(),
          },
        });

        // Create items with difficulty included
        let globalSeq = 0;
        for (const item of allItems) {
          globalSeq++;
          await tx.baselineItem.create({
            data: {
              baselineAttemptId: newAttempt.id,
              domain: item.domain as 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL',
              gradeBand: profile.gradeBand,
              sequenceIndex: globalSeq,
              promptJson: {
                skillCode: item.skillCode,
                questionType: item.question.questionType,
                questionText: item.question.questionText,
                options: item.question.options,
                difficulty: item.question.difficulty ?? initialDifficulty,
              },
              correctAnswerJson: {
                correctAnswer: item.question.correctAnswer,
                rubric: item.question.rubric,
              },
            },
          });
        }

        // Update profile status and attempt count
        await tx.baselineProfile.update({
          where: { id: profile.id },
          data: {
            status: 'IN_PROGRESS',
            attemptCount: { increment: 1 },
          },
        });

        return newAttempt;
      });

      return reply.status(201).send({
        attemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
        totalItems: allItems.length,
        adaptiveEnabled: true,
        initialDifficulty,
      });
    }
  );

  /**
   * GET /baseline/attempts/:attemptId/next
   * Get the next unanswered item for the attempt.
   */
  fastify.get(
    '/baseline/attempts/:attemptId/next',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { attemptId } = request.params as { attemptId: string };

      const attempt = await prisma.baselineAttempt.findUnique({
        where: { id: attemptId },
        include: {
          profile: true,
          items: {
            orderBy: { sequenceIndex: 'asc' },
            include: { responses: true },
          },
        },
      });

      if (!attempt) {
        return reply.status(404).send({ error: 'Attempt not found' });
      }

      if (!canReadProfile(user, attempt.profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      if (attempt.completedAt) {
        return reply.status(400).send({ error: 'Attempt is already completed' });
      }

      // Find first item without a response
      const nextItem = attempt.items.find(
        (item: { responses: unknown[] }) => item.responses.length === 0
      );

      if (!nextItem) {
        return reply.send({
          complete: true,
          message: 'All items answered. Call complete endpoint.',
          attemptId,
        });
      }

      const prompt = nextItem.promptJson as PromptJson;

      return reply.send({
        complete: false,
        item: {
          itemId: nextItem.id,
          sequence: nextItem.sequenceIndex,
          totalItems: attempt.items.length,
          domain: nextItem.domain,
          skillCode: prompt.skillCode,
          questionType: prompt.questionType,
          questionText: prompt.questionText,
          options: prompt.options,
        },
      });
    }
  );

  /**
   * POST /baseline/items/:itemId/answer
   * Submit an answer for a baseline item.
   */
  fastify.post(
    '/baseline/items/:itemId/answer',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { itemId } = request.params as { itemId: string };

      const parseResult = AnswerItemSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: parseResult.error.flatten() });
      }

      const { response: responseData, latencyMs } = parseResult.data as {
        response: ResponseJson;
        latencyMs?: number;
      };

      const item = await prisma.baselineItem.findUnique({
        where: { id: itemId },
        include: {
          attempt: { include: { profile: true } },
          responses: true,
        },
      });

      if (!item) {
        return reply.status(404).send({ error: 'Item not found' });
      }

      if (!canManageProfile(user, item.attempt.profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      if (item.attempt.completedAt) {
        return reply.status(400).send({ error: 'Attempt is not in progress' });
      }

      if (item.responses.length > 0) {
        return reply.status(409).send({ error: 'Item already answered' });
      }

      const prompt = item.promptJson as PromptJson;
      const correctAnswerData = item.correctAnswerJson as CorrectAnswerJson;

      // Score the response
      const scoreResult = await scoreResponse({
        questionType: prompt.questionType,
        correctAnswer: correctAnswerData.correctAnswer,
        selectedOption: responseData.selectedOption,
        openResponse: responseData.openResponse,
        rubric: correctAnswerData.rubric,
      });

      // Record response with adaptive difficulty engine
      const adaptiveEngine = getAdaptiveEngine(item.attempt.id);
      adaptiveEngine.recordResponse({
        domain: item.domain,
        skillCode: prompt.skillCode,
        isCorrect: scoreResult.isCorrect,
        score: scoreResult.partialCredit,
        difficulty: prompt.difficulty ?? DIFFICULTY_LEVELS.MEDIUM,
      });

      // Get adaptive state for this domain (for response)
      const domainSummary = adaptiveEngine.getDomainSummary(item.domain);

      // Create response record
      const responseRecord = await prisma.baselineResponse.create({
        data: {
          baselineItemId: item.id,
          learnerId: item.attempt.profile.learnerId,
          responseJson: responseData,
          isCorrect: scoreResult.isCorrect,
          score: scoreResult.partialCredit,
          latencyMs,
        },
      });

      return reply.status(201).send({
        responseId: responseRecord.id,
        isCorrect: responseRecord.isCorrect,
        score: responseRecord.score,
        // Include adaptive info in response
        adaptive: {
          domain: item.domain,
          currentDifficulty: domainSummary.difficulty,
          estimatedAbility: domainSummary.estimatedAbility,
          accuracy: domainSummary.accuracy,
        },
      });
    }
  );

  /**
   * POST /baseline/attempts/:attemptId/complete
   * Complete and score a baseline attempt.
   */
  fastify.post(
    '/baseline/attempts/:attemptId/complete',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { attemptId } = request.params as { attemptId: string };

      const attempt = await prisma.baselineAttempt.findUnique({
        where: { id: attemptId },
        include: {
          profile: true,
          items: {
            include: { responses: true },
          },
        },
      });

      if (!attempt) {
        return reply.status(404).send({ error: 'Attempt not found' });
      }

      if (!canManageProfile(user, attempt.profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      if (attempt.completedAt) {
        return reply.status(400).send({ error: 'Attempt is already completed' });
      }

      // Check all items are answered
      const unanswered = attempt.items.filter(
        (item: { responses: unknown[] }) => item.responses.length === 0
      );
      if (unanswered.length > 0) {
        return reply.status(400).send({
          error: 'Not all items answered',
          unansweredCount: unanswered.length,
        });
      }

      // Get adaptive engine for this attempt
      const adaptiveEngine = getAdaptiveEngine(attemptId);

      // Calculate scores by domain and skill using adaptive estimates
      const domainScores: Record<string, { correct: number; total: number; adaptiveAbility: number }> = {};
      const skillEstimates: { domain: string; skillCode: string; estimate: number; confidence: number }[] = [];

      for (const item of attempt.items) {
        const domain = item.domain;
        if (!domainScores[domain]) {
          const domainSummary = adaptiveEngine.getDomainSummary(domain);
          domainScores[domain] = {
            correct: 0,
            total: 0,
            adaptiveAbility: domainSummary.estimatedAbility,
          };
        }
        domainScores[domain].total++;

        const response = item.responses[0];
        const responseScore = response?.score;
        const score =
          response?.isCorrect === true
            ? 1
            : responseScore !== null && responseScore !== undefined
              ? Number(responseScore)
              : 0;
        if (response?.isCorrect === true) {
          domainScores[domain].correct++;
        }

        const prompt = item.promptJson as PromptJson;

        // Use adaptive ability estimate (0-1) scaled to (0-10) for this domain
        const domainAbility = adaptiveEngine.getDomainSummary(domain).estimatedAbility;
        const adaptiveEstimate = domainAbility * 10; // Scale to 0-10

        // Blend individual score with adaptive domain estimate
        // Weight: 60% adaptive estimate, 40% individual response
        const blendedEstimate = 0.6 * adaptiveEstimate + 0.4 * (score * 10);

        skillEstimates.push({
          domain,
          skillCode: prompt.skillCode,
          estimate: blendedEstimate,
          confidence: adaptiveEngine.getEstimateConfidence(domain),
        });
      }

      // Calculate overall score using adaptive estimates
      const totalCorrect = Object.values(domainScores).reduce((sum, d) => sum + d.correct, 0);
      const totalItems = attempt.items.length;
      const rawScore = totalCorrect / totalItems;

      // Adaptive overall score (weighted average of domain abilities)
      const domainAbilities = Object.values(domainScores).map((d) => d.adaptiveAbility);
      const adaptiveOverallScore = domainAbilities.length > 0
        ? domainAbilities.reduce((a, b) => a + b, 0) / domainAbilities.length
        : rawScore;

      // Update in transaction
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Update attempt with adaptive data
        const updatedAttempt = await tx.baselineAttempt.update({
          where: { id: attempt.id },
          data: {
            completedAt: new Date(),
            domainScoresJson: domainScores,
            overallEstimateJson: {
              score: rawScore,
              adaptiveScore: adaptiveOverallScore,
              adaptiveSummary: adaptiveEngine.getAllDomainSummaries(),
            },
          },
        });

        // Create skill estimates with adaptive values
        for (const est of skillEstimates) {
          await tx.baselineSkillEstimate.create({
            data: {
              baselineAttemptId: attempt.id,
              domain: est.domain as 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL',
              skillCode: est.skillCode,
              estimatedLevel: est.estimate,
              confidence: est.confidence, // Adaptive confidence
            },
          });
        }

        // Update profile status
        await tx.baselineProfile.update({
          where: { id: attempt.baselineProfileId },
          data: { status: 'COMPLETED' },
        });

        return updatedAttempt;
      });

      // Clean up adaptive engine for this attempt
      clearAdaptiveEngine(attemptId);

      return reply.send({
        attemptId: result.id,
        status: 'COMPLETED',
        score: rawScore,
        adaptiveScore: adaptiveOverallScore,
        domainScores: Object.entries(domainScores).map(([domain, scores]) => ({
          domain,
          correct: scores.correct,
          total: scores.total,
          percentage: scores.correct / scores.total,
          adaptiveAbility: scores.adaptiveAbility,
        })),
      });
    }
  );

  /**
   * POST /baseline/profiles/:profileId/retest
   * Request a retest for a completed profile.
   */
  fastify.post(
    '/baseline/profiles/:profileId/retest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { profileId } = request.params as { profileId: string };

      const parseResult = RetestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: parseResult.error.flatten() });
      }

      const { reason, notes } = parseResult.data;

      const profile = await prisma.baselineProfile.findUnique({
        where: { id: profileId },
        include: { attempts: true },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      if (!canManageProfile(user, profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      if (profile.status !== 'COMPLETED') {
        return reply
          .status(400)
          .send({ error: 'Profile must be in COMPLETED status to request retest' });
      }

      // Check if max attempts already reached
      if (profile.attempts.length >= 2) {
        return reply.status(400).send({ error: 'Maximum attempts (2) already reached' });
      }

      // Store retest info on the last attempt
      const lastAttempt = profile.attempts.sort(
        (a: { attemptNumber: number }, b: { attemptNumber: number }) =>
          b.attemptNumber - a.attemptNumber
      )[0];

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.baselineAttempt.update({
          where: { id: lastAttempt.id },
          data: {
            retestReasonType: reason,
            retestReasonNotes: notes,
          },
        });

        await tx.baselineProfile.update({
          where: { id: profileId },
          data: { status: 'RETEST_ALLOWED' },
        });
      });

      return reply.send({
        profileId,
        status: 'RETEST_ALLOWED',
        retestReason: reason,
      });
    }
  );

  /**
   * POST /baseline/profiles/:profileId/accept-final
   * Accept the latest completed attempt as final.
   */
  fastify.post(
    '/baseline/profiles/:profileId/accept-final',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { profileId } = request.params as { profileId: string };

      const profile = await prisma.baselineProfile.findUnique({
        where: { id: profileId },
        include: {
          attempts: {
            where: { completedAt: { not: null } },
            orderBy: { attemptNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      if (!canManageProfile(user, profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      if (profile.status === 'FINAL_ACCEPTED') {
        return reply.status(400).send({ error: 'Profile is already finalized' });
      }

      if (profile.status !== 'COMPLETED') {
        return reply
          .status(400)
          .send({ error: 'Profile must be in COMPLETED status to accept final' });
      }

      const finalAttempt = profile.attempts[0];
      if (!finalAttempt) {
        return reply.status(400).send({ error: 'No completed attempt found' });
      }

      const updated = await prisma.baselineProfile.update({
        where: { id: profileId },
        data: {
          status: 'FINAL_ACCEPTED',
          finalAttemptId: finalAttempt.id,
        },
      });

      // Publish event for Virtual Brain
      await publishBaselineAccepted({
        tenantId: profile.tenantId,
        learnerId: profile.learnerId,
        profileId: profile.id,
        attemptId: finalAttempt.id,
      });

      return reply.send({
        profileId: updated.id,
        status: updated.status,
        finalAttemptId: updated.finalAttemptId,
      });
    }
  );

  /**
   * GET /baseline/profiles/:profileId
   * Get profile details with attempts.
   */
  fastify.get(
    '/baseline/profiles/:profileId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { profileId } = request.params as { profileId: string };

      const profile = await prisma.baselineProfile.findUnique({
        where: { id: profileId },
        include: {
          attempts: {
            orderBy: { attemptNumber: 'asc' },
            include: {
              skillEstimates: true,
            },
          },
        },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      if (!canReadProfile(user, profile)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      return reply.send(profile);
    }
  );
}
