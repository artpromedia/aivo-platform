import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';

// Mock the auth middleware to inject test users
vi.mock('../src/middleware/authMiddleware.js', () => ({
  authMiddleware: vi.fn().mockImplementation(async (request: unknown, reply: unknown) => {
    const req = request as { headers: Record<string, string>; url: string; user?: unknown };
    const rep = reply as { status: (code: number) => { send: (body: unknown) => unknown } };
    // Check for test auth header
    const authHeader = req.headers['x-test-user'];
    if (authHeader) {
      req.user = JSON.parse(authHeader);
    } else if (req.url !== '/health') {
      return rep.status(401).send({ error: 'Unauthorized' });
    }
  }),
}));

// Mock AI orchestrator
vi.mock('../src/lib/aiOrchestrator.js', () => ({
  generateBaselineQuestions: vi
    .fn()
    .mockImplementation(
      async ({ domain, skillCodes }: { domain: string; skillCodes: string[] }) => {
        return skillCodes.map((code: string) => ({
          skillCode: code,
          questionType: 'MULTIPLE_CHOICE',
          questionText: `Test question for ${domain} skill ${code}`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
        }));
      }
    ),
  scoreResponse: vi
    .fn()
    .mockImplementation(
      async ({
        questionType,
        correctAnswer,
        selectedOption,
      }: {
        questionType: string;
        correctAnswer: number;
        selectedOption?: number;
      }) => {
        if (questionType === 'MULTIPLE_CHOICE') {
          return { isCorrect: selectedOption === correctAnswer, partialCredit: null };
        }
        return { isCorrect: false, partialCredit: 0.5 };
      }
    ),
}));

// Mock event publisher
vi.mock('../src/lib/eventPublisher.js', () => ({
  publishBaselineAccepted: vi.fn().mockResolvedValue(undefined),
}));

describe('baseline-svc API', () => {
  let app: FastifyInstance;

  const testTenant = 'test-tenant-' + Date.now();
  const testLearner = 'test-learner-' + Date.now();

  const parentUser = {
    sub: 'parent-user-id',
    tenantId: testTenant,
    role: 'parent',
  };

  const teacherUser = {
    sub: 'teacher-user-id',
    tenantId: testTenant,
    role: 'teacher',
  };

  const otherTenantUser = {
    sub: 'other-user-id',
    tenantId: 'other-tenant',
    role: 'parent',
  };

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    // Cleanup test data
    await prisma.baselineSkillEstimate.deleteMany({
      where: { attempt: { profile: { tenantId: testTenant } } },
    });
    await prisma.baselineResponse.deleteMany({
      where: { item: { attempt: { profile: { tenantId: testTenant } } } },
    });
    await prisma.baselineItem.deleteMany({
      where: { attempt: { profile: { tenantId: testTenant } } },
    });
    await prisma.baselineAttempt.deleteMany({
      where: { profile: { tenantId: testTenant } },
    });
    await prisma.baselineProfile.deleteMany({
      where: { tenantId: testTenant },
    });
    await prisma.$disconnect();
  });

  describe('Health Check', () => {
    it('GET /health returns ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ok');
      expect(body.service).toBe('baseline-svc');
    });
  });

  describe('Profile Creation', () => {
    it('creates a new profile', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/baseline/profiles',
        headers: { 'x-test-user': JSON.stringify(parentUser) },
        payload: {
          tenantId: testTenant,
          learnerId: testLearner,
          gradeBand: 'K5',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.tenantId).toBe(testTenant);
      expect(body.learnerId).toBe(testLearner);
      expect(body.gradeBand).toBe('K5');
      expect(body.status).toBe('NOT_STARTED');
    });

    it('returns 409 for duplicate profile', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/baseline/profiles',
        headers: { 'x-test-user': JSON.stringify(parentUser) },
        payload: {
          tenantId: testTenant,
          learnerId: testLearner,
          gradeBand: 'K5',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('returns 403 for tenant mismatch', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/baseline/profiles',
        headers: { 'x-test-user': JSON.stringify(otherTenantUser) },
        payload: {
          tenantId: testTenant,
          learnerId: 'new-learner',
          gradeBand: 'K5',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/baseline/profiles',
        payload: {
          tenantId: testTenant,
          learnerId: 'new-learner',
          gradeBand: 'K5',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Full Baseline Flow', () => {
    let profileId: string;
    let attemptId: string;
    let itemIds: string[] = [];

    beforeAll(async () => {
      // Get the profile created above
      const profile = await prisma.baselineProfile.findFirst({
        where: { tenantId: testTenant, learnerId: testLearner },
      });
      profileId = profile!.id;
    });

    it('starts a new attempt', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/baseline/profiles/${profileId}/start`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.attemptNumber).toBe(1);
      expect(body.totalItems).toBe(25); // 5 domains × 5 items
      attemptId = body.attemptId;
    });

    it('cannot start another attempt while one is in progress', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/baseline/profiles/${profileId}/start`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('in progress');
    });

    it('gets the first item', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/baseline/attempts/${attemptId}/next`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.complete).toBe(false);
      expect(body.item.sequence).toBe(1);
      expect(body.item.totalItems).toBe(25);
      expect(body.item.options).toHaveLength(4);
      itemIds.push(body.item.itemId);
    });

    it('teacher can read items (read-only access)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/baseline/attempts/${attemptId}/next`,
        headers: { 'x-test-user': JSON.stringify(teacherUser) },
      });

      expect(response.statusCode).toBe(200);
    });

    it('other tenant cannot access items', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/baseline/attempts/${attemptId}/next`,
        headers: { 'x-test-user': JSON.stringify(otherTenantUser) },
      });

      expect(response.statusCode).toBe(403);
    });

    it('answers all 25 items and completes attempt', async () => {
      // Get all items
      const items = await prisma.baselineItem.findMany({
        where: { baselineAttemptId: attemptId },
        orderBy: { sequenceIndex: 'asc' },
      });

      expect(items).toHaveLength(25);

      // Answer each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const correctAnswer = (item.correctAnswerJson as any).correctAnswer;

        // Answer correctly for even items, incorrectly for odd
        const selectedOption = i % 2 === 0 ? correctAnswer : (correctAnswer + 1) % 4;

        const response = await app.inject({
          method: 'POST',
          url: `/baseline/items/${item.id}/answer`,
          headers: { 'x-test-user': JSON.stringify(parentUser) },
          payload: { response: { selectedOption } },
        });

        expect(response.statusCode).toBe(201);
        const body = response.json();
        expect(body.isCorrect).toBe(i % 2 === 0);
      }

      // Complete the attempt
      const completeResponse = await app.inject({
        method: 'POST',
        url: `/baseline/attempts/${attemptId}/complete`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
      });

      expect(completeResponse.statusCode).toBe(200);
      const completeBody = completeResponse.json();
      expect(completeBody.status).toBe('COMPLETED');
      expect(completeBody.score).toBeCloseTo(0.52, 1); // 13/25 correct (even indices: 0,2,4...24 = 13 items)
      expect(completeBody.domainScores).toHaveLength(5);
    });

    it('cannot answer item after attempt completed', async () => {
      const items = await prisma.baselineItem.findMany({
        where: { baselineAttemptId: attemptId },
        take: 1,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/baseline/items/${items[0].id}/answer`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
        payload: { response: { selectedOption: 0 } },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('not in progress');
    });

    it('gets profile details with attempt', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/baseline/profiles/${profileId}`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('COMPLETED');
      expect(body.attempts).toHaveLength(1);
      expect(body.attempts[0].skillEstimates).toHaveLength(25);
    });
  });

  describe('Retest Flow', () => {
    let profileId: string;
    let firstAttemptId: string;
    let retestAttemptId: string;

    beforeAll(async () => {
      const profile = await prisma.baselineProfile.findFirst({
        where: { tenantId: testTenant, learnerId: testLearner },
      });
      profileId = profile!.id;
      const attempt = await prisma.baselineAttempt.findFirst({
        where: { profileId },
      });
      firstAttemptId = attempt!.id;
    });

    it('requests a retest', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/baseline/profiles/${profileId}/retest`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
        payload: {
          reason: 'DISTRACTED',
          notes: 'Child was tired during first attempt',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('RETEST_ALLOWED');
      expect(body.retestReason).toBe('DISTRACTED');
    });

    it('cannot request another retest when already requested', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/baseline/profiles/${profileId}/retest`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
        payload: {
          reason: 'DISTRACTED',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('starts retest attempt', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/baseline/profiles/${profileId}/start`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.attemptNumber).toBe(2);
      retestAttemptId = body.attemptId;
    });

    it('completes retest and accepts final', async () => {
      // Answer all items for retest
      const items = await prisma.baselineItem.findMany({
        where: { baselineAttemptId: retestAttemptId },
        orderBy: { sequenceIndex: 'asc' },
      });

      for (const item of items) {
        const correctAnswer = (item.correctAnswerJson as any).correctAnswer;
        await app.inject({
          method: 'POST',
          url: `/baseline/items/${item.id}/answer`,
          headers: { 'x-test-user': JSON.stringify(parentUser) },
          payload: { response: { selectedOption: correctAnswer } }, // All correct this time
        });
      }

      // Complete attempt
      const completeResponse = await app.inject({
        method: 'POST',
        url: `/baseline/attempts/${retestAttemptId}/complete`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
      });

      expect(completeResponse.statusCode).toBe(200);
      expect(completeResponse.json().score).toBe(1); // Perfect score

      // Accept final
      const acceptResponse = await app.inject({
        method: 'POST',
        url: `/baseline/profiles/${profileId}/accept-final`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
      });

      expect(acceptResponse.statusCode).toBe(200);
      const acceptBody = acceptResponse.json();
      expect(acceptBody.status).toBe('FINAL_ACCEPTED');
      expect(acceptBody.finalAttemptId).toBe(retestAttemptId);
    });

    it('cannot start third attempt (max 2)', async () => {
      // First update status to allow checking the limit
      await prisma.baselineProfile.update({
        where: { id: profileId },
        data: { status: 'RETEST_ALLOWED' },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/baseline/profiles/${profileId}/start`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('Maximum attempts');
    });

    it('cannot retest after finalized', async () => {
      await prisma.baselineProfile.update({
        where: { id: profileId },
        data: { status: 'FINAL_ACCEPTED' },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/baseline/profiles/${profileId}/retest`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
        payload: { reason: 'DISTRACTED' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Edge Cases', () => {
    it('returns 404 for non-existent profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/baseline/profiles/00000000-0000-0000-0000-000000000000',
        headers: { 'x-test-user': JSON.stringify(parentUser) },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 404 for non-existent attempt', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/baseline/attempts/00000000-0000-0000-0000-000000000000/next',
        headers: { 'x-test-user': JSON.stringify(parentUser) },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 400 for invalid grade band', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/baseline/profiles',
        headers: { 'x-test-user': JSON.stringify(parentUser) },
        payload: {
          tenantId: testTenant,
          learnerId: 'another-learner',
          gradeBand: 'INVALID',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid retest reason', async () => {
      const learner2 = 'learner-2-' + Date.now();

      // Create and complete a profile first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/baseline/profiles',
        headers: { 'x-test-user': JSON.stringify(parentUser) },
        payload: {
          tenantId: testTenant,
          learnerId: learner2,
          gradeBand: 'G6_8',
        },
      });

      const profile2Id = createResponse.json().id;

      // Set to completed status directly for test
      await prisma.baselineProfile.update({
        where: { id: profile2Id },
        data: { status: 'COMPLETED' },
      });

      const response = await app.inject({
        method: 'POST',
        url: `/baseline/profiles/${profile2Id}/retest`,
        headers: { 'x-test-user': JSON.stringify(parentUser) },
        payload: {
          reason: 'INVALID_REASON',
        },
      });

      expect(response.statusCode).toBe(400);

      // Cleanup
      await prisma.baselineProfile.delete({ where: { id: profile2Id } });
    });
  });
});
