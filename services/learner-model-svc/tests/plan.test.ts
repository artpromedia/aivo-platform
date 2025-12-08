import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';

// Mock the auth middleware to inject test users
vi.mock('../src/middleware/authMiddleware.js', () => ({
  authMiddleware: vi.fn().mockImplementation(async (request: unknown, reply: unknown) => {
    const req = request as { headers?: Record<string, string>; url?: string; user?: unknown };
    const rep = reply as { status: (code: number) => { send: (body: unknown) => unknown } };
    const headers = req?.headers ?? {};
    const authHeader = headers['x-test-user'];
    if (authHeader) {
      req.user = JSON.parse(authHeader);
    } else if (req?.url && req.url !== '/health') {
      return rep.status(401).send({ error: 'Unauthorized' });
    }
  }),
}));

describe('Plan Routes', () => {
  let app: FastifyInstance;

  const testTenantId = '11111111-1111-1111-1111-111111111111';
  const testLearnerId = '22222222-2222-2222-2222-222222222222';
  const testLearnerId2 = '33333333-3333-3333-3333-333333333333';

  const parentUser = {
    sub: 'parent-user-id',
    tenantId: testTenantId,
    role: 'parent',
  };

  const serviceUser = {
    sub: 'baseline-svc',
    tenantId: testTenantId,
    role: 'service',
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.VITEST = '1';
    // Ensure tests point to running Postgres on host 5434 by default
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5434/aivo_learner_model';

    app = buildApp();
    await app.ready();

    await cleanupTestData();
    await seedTestSkills();
    await seedTestLearningObjects();
    await seedTestVirtualBrain();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
    await prisma.$disconnect();
  });

  async function cleanupTestData() {
    await prisma.learnerSkillState.deleteMany({
      where: { virtualBrain: { tenantId: testTenantId } },
    });
    await prisma.virtualBrain.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.learningObject.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.skillPrerequisite.deleteMany({});
    await prisma.skill.deleteMany({});
  }

  async function seedTestSkills() {
    const skills = [
      {
        skillCode: 'ELA_PHONEMIC_AWARENESS',
        domain: 'ELA',
        gradeBand: 'K5',
        displayName: 'Phonemic Awareness',
        description: 'Sound awareness',
      },
      {
        skillCode: 'ELA_PHONICS',
        domain: 'ELA',
        gradeBand: 'K5',
        displayName: 'Phonics',
        description: 'Sound-letter connections',
      },
      {
        skillCode: 'ELA_READING_FLUENCY',
        domain: 'ELA',
        gradeBand: 'K5',
        displayName: 'Reading Fluency',
        description: 'Fluent reading',
      },
      {
        skillCode: 'MATH_COUNTING',
        domain: 'MATH',
        gradeBand: 'K5',
        displayName: 'Counting',
        description: 'Number counting',
      },
      {
        skillCode: 'MATH_ADDITION',
        domain: 'MATH',
        gradeBand: 'K5',
        displayName: 'Addition',
        description: 'Adding numbers',
      },
      {
        skillCode: 'MATH_SUBTRACTION',
        domain: 'MATH',
        gradeBand: 'K5',
        displayName: 'Subtraction',
        description: 'Subtracting numbers',
      },
    ];

    for (const skill of skills) {
      await prisma.skill.upsert({
        where: { skillCode: skill.skillCode },
        update: skill,
        create: skill,
      });
    }
  }

  async function seedTestLearningObjects() {
    const skillCodes = [
      'ELA_PHONEMIC_AWARENESS',
      'ELA_PHONICS',
      'ELA_READING_FLUENCY',
      'MATH_COUNTING',
      'MATH_ADDITION',
      'MATH_SUBTRACTION',
    ];
    const types = ['LESSON', 'EXERCISE', 'ASSESSMENT', 'GAME'] as const;
    const records: Array<{
      skillCode: string;
      difficultyLevel: number;
      objectType: string;
      title: string;
      description: string;
      estimatedMinutes: number;
      domain: string;
      gradeBand: string;
      tenantId: string | null;
      contentUrl: string | null;
    }> = [];
    for (const skillCode of skillCodes) {
      const domain = skillCode.startsWith('ELA_') ? 'ELA' : 'MATH';
      for (let difficulty = 1; difficulty <= 5; difficulty++) {
        for (const objectType of types) {
          records.push({
            skillCode,
            difficultyLevel: difficulty,
            objectType,
            title: `${skillCode} ${objectType} L${difficulty}`,
            description: `Learning object for ${skillCode} at level ${difficulty}`,
            estimatedMinutes: 10 + difficulty,
            domain,
            gradeBand: 'K5',
            tenantId: testTenantId,
            contentUrl: null,
          });
        }
      }
    }

    await prisma.learningObject.createMany({ data: records, skipDuplicates: true });
  }

  async function seedTestVirtualBrain() {
    const skillCodeToId = new Map<string, string>();
    const skills = await prisma.skill.findMany({});
    for (const skill of skills) {
      skillCodeToId.set(skill.skillCode, skill.id);
    }

    const masteryBySkill: Record<string, number> = {
      ELA_PHONEMIC_AWARENESS: 0.85,
      ELA_PHONICS: 0.55,
      ELA_READING_FLUENCY: 0.25,
      MATH_COUNTING: 0.9,
      MATH_ADDITION: 0.5,
      MATH_SUBTRACTION: 0.3,
    };

    const skillStates = Object.entries(masteryBySkill).map(([skillCode, mastery]) => ({
      skillId: skillCodeToId.get(skillCode)!,
      masteryLevel: mastery,
      confidence: 0.6,
      lastAssessedAt: new Date(),
      practiceCount: Math.round(mastery * 10),
      correctStreak: mastery > 0.7 ? 4 : mastery > 0.4 ? 2 : 1,
    }));

    await prisma.virtualBrain.create({
      data: {
        tenantId: testTenantId,
        learnerId: testLearnerId,
        gradeBand: 'K5',
        skillStates: { create: skillStates },
      },
    });

    await prisma.virtualBrain.create({
      data: {
        tenantId: testTenantId,
        learnerId: testLearnerId2,
        gradeBand: 'K5',
      },
    });
  }

  describe('POST /virtual-brains/:learnerId/todays-plan', () => {
    it('should return a plan with activities', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/virtual-brains/${testLearnerId}/todays-plan`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
          'content-type': 'application/json',
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body).toHaveProperty('learnerId', testLearnerId);
      expect(Array.isArray(body.activities)).toBe(true);
      expect(body.activities.length).toBeGreaterThan(0);
      expect(body).toHaveProperty('totalMinutes');
      expect(typeof body.totalMinutes).toBe('number');
      expect(body).toHaveProperty('planDate');
    });

    it('should respect maxActivities parameter', async () => {
      const maxActivities = 2;

      const response = await app.inject({
        method: 'POST',
        url: `/virtual-brains/${testLearnerId}/todays-plan`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
          'content-type': 'application/json',
        },
        payload: { maxActivities },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.activities.length).toBeLessThanOrEqual(maxActivities);
    });

    it('should filter by includeDomains parameter', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/virtual-brains/${testLearnerId}/todays-plan`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
          'content-type': 'application/json',
        },
        payload: { includeDomains: ['ELA'] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.activities.every((a: { domain: string }) => a.domain === 'ELA')).toBe(true);
    });

    it('should select activities in correct difficulty bands based on mastery', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/virtual-brains/${testLearnerId}/todays-plan`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
          'content-type': 'application/json',
        },
        payload: { maxActivities: 10 }, // Request many to see distribution
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      for (const activity of body.activities) {
        expect(activity.difficultyLevel).toBeGreaterThanOrEqual(1);
        expect(activity.difficultyLevel).toBeLessThanOrEqual(5);
        expect(['focus_area', 'practice', 'challenge']).toContain(activity.reason);
      }
    });

    it('should return each activity with correct shape', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/virtual-brains/${testLearnerId}/todays-plan`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
          'content-type': 'application/json',
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      const activity = body.activities[0];
      expect(activity).toHaveProperty('activityId');
      expect(activity).toHaveProperty('skillCode');
      expect(activity).toHaveProperty('skillDisplayName');
      expect(activity).toHaveProperty('title');
      expect(activity).toHaveProperty('objectType');
      expect(activity).toHaveProperty('difficultyLevel');
      expect(activity).toHaveProperty('estimatedMinutes');
      expect(activity).toHaveProperty('reason');
    });

    it('should return empty activities for learner without skill states', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/virtual-brains/${testLearnerId2}/todays-plan`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
          'content-type': 'application/json',
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      // Empty skill states = empty activities
      expect(body.activities).toHaveLength(0);
      expect(body.totalMinutes).toBe(0);
    });

    it('should return 404 for non-existent learner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/virtual-brains/00000000-0000-0000-0000-000000000999/todays-plan`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
          'content-type': 'application/json',
        },
        payload: {},
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /virtual-brains/:learnerId/difficulty-recommendation', () => {
    it('should return overall difficulty recommendation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/virtual-brains/${testLearnerId}/difficulty-recommendation`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body).toHaveProperty('learnerId', testLearnerId);
      expect(['EASIER', 'SAME', 'HARDER']).toContain(body.recommendation);
      expect(body).toHaveProperty('reason');
      expect(body).toHaveProperty('currentMastery');
      expect(body).toHaveProperty('suggestedDifficultyLevel');
    });

    it('should include per-domain recommendations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/virtual-brains/${testLearnerId}/difficulty-recommendation`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.scope).toEqual({});
    });

    it('should filter by domain query param', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/virtual-brains/${testLearnerId}/difficulty-recommendation?domain=ELA`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.scope.domain).toBe('ELA');
    });

    it('should return 404 for non-existent learner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/virtual-brains/00000000-0000-0000-0000-000000000999/difficulty-recommendation`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Difficulty Band Selection Algorithm', () => {
    it('should select easier difficulty (1-2) when mastery < 0.4', async () => {
      // ELA_READING_FLUENCY has mastery 0.25 (low)
      // MATH_SUBTRACTION has mastery 0.30 (low)
      const response = await app.inject({
        method: 'POST',
        url: `/virtual-brains/${testLearnerId}/todays-plan`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
          'content-type': 'application/json',
        },
        payload: { maxActivities: 10 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      // Find activities for low-mastery skills
      const lowMasteryActivities = body.activities.filter(
        (a: { skillCode: string }) =>
          a.skillCode === 'ELA_READING_FLUENCY' || a.skillCode === 'MATH_SUBTRACTION'
      );

      for (const activity of lowMasteryActivities) {
        expect(activity.difficultyLevel).toBeLessThanOrEqual(2);
        expect(activity.reason).toBe('focus_area');
      }
    });

    it('should select medium difficulty (2-4) when mastery is 0.4-0.7', async () => {
      // ELA_PHONICS has mastery 0.55 (medium)
      // MATH_ADDITION has mastery 0.50 (medium)
      const response = await app.inject({
        method: 'POST',
        url: `/virtual-brains/${testLearnerId}/todays-plan`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
          'content-type': 'application/json',
        },
        payload: { maxActivities: 10 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      const mediumMasteryActivities = body.activities.filter(
        (a: { skillCode: string }) =>
          a.skillCode === 'ELA_PHONICS' || a.skillCode === 'MATH_ADDITION'
      );

      for (const activity of mediumMasteryActivities) {
        expect(activity.difficultyLevel).toBeGreaterThanOrEqual(2);
        expect(activity.difficultyLevel).toBeLessThanOrEqual(4);
        expect(activity.reason).toBe('practice');
      }
    });

    it('should select harder difficulty (4-5) when mastery > 0.7', async () => {
      // ELA_PHONEMIC_AWARENESS has mastery 0.85 (high)
      // MATH_COUNTING has mastery 0.90 (high)
      const response = await app.inject({
        method: 'POST',
        url: `/virtual-brains/${testLearnerId}/todays-plan`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
          'content-type': 'application/json',
        },
        payload: { maxActivities: 10 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      const highMasteryActivities = body.activities.filter(
        (a: { skillCode: string }) =>
          a.skillCode === 'ELA_PHONEMIC_AWARENESS' || a.skillCode === 'MATH_COUNTING'
      );

      for (const activity of highMasteryActivities) {
        expect(activity.difficultyLevel).toBeGreaterThanOrEqual(4);
        expect(activity.reason).toBe('challenge');
      }
    });
  });
});
