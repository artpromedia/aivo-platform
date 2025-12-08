import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';

// Learning object types from the schema
type LearningObjectType = 'LESSON' | 'EXERCISE' | 'GAME' | 'VIDEO' | 'READING' | 'ASSESSMENT';

// Mock the auth middleware to inject test users
vi.mock('../src/middleware/authMiddleware.js', () => ({
  authMiddleware: vi.fn().mockImplementation(async (request: unknown, reply: unknown) => {
    const req = request as { headers: Record<string, string>; url: string; user?: unknown };
    const rep = reply as { status: (code: number) => { send: (body: unknown) => unknown } };
    const authHeader = req.headers['x-test-user'];
    if (authHeader) {
      req.user = JSON.parse(authHeader);
    } else if (req.url !== '/health') {
      return rep.status(401).send({ error: 'Unauthorized' });
    }
  }),
}));

describe('Plan Routes', () => {
  let app: FastifyInstance;

  const testTenantId = 'plan-tenant-0000-0000-000000000001';
  const testLearnerId = 'plan-learner-000-0000-000000000001';
  const testLearnerId2 = 'plan-learner-000-0000-000000000002';

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
    app = buildApp();
    await app.ready();

    // Cleanup any existing test data
    await cleanupTestData();

    // Seed test skills
    await seedTestSkills();
    // Seed test learning objects
    await seedTestLearningObjects();
    // Seed test virtual brain with skill states
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
    await prisma.virtualBrain.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.learningObject.deleteMany({});
    await prisma.skillPrerequisite.deleteMany({});
    await prisma.skill.deleteMany({});
  }

  async function seedTestSkills() {
    const skills = [
      // ELA skills
      {
        code: 'ELA_PHONEMIC_AWARENESS',
        name: 'Phonemic Awareness',
        domain: 'ELA',
        gradeBand: 'K5',
        sequence: 1,
        description: 'Sound awareness',
      },
      {
        code: 'ELA_PHONICS',
        name: 'Phonics',
        domain: 'ELA',
        gradeBand: 'K5',
        sequence: 2,
        description: 'Sound-letter connections',
      },
      {
        code: 'ELA_READING_FLUENCY',
        name: 'Reading Fluency',
        domain: 'ELA',
        gradeBand: 'K5',
        sequence: 3,
        description: 'Fluent reading',
      },
      // MATH skills
      {
        code: 'MATH_COUNTING',
        name: 'Counting',
        domain: 'MATH',
        gradeBand: 'K5',
        sequence: 1,
        description: 'Number counting',
      },
      {
        code: 'MATH_ADDITION',
        name: 'Addition',
        domain: 'MATH',
        gradeBand: 'K5',
        sequence: 2,
        description: 'Adding numbers',
      },
      {
        code: 'MATH_SUBTRACTION',
        name: 'Subtraction',
        domain: 'MATH',
        gradeBand: 'K5',
        sequence: 3,
        description: 'Subtracting numbers',
      },
    ];

    await prisma.skill.createMany({ data: skills, skipDuplicates: true });
  }

  async function seedTestLearningObjects() {
    const objects: Array<{
      id: string;
      skillCode: string;
      difficultyLevel: number;
      objectType: LearningObjectType;
      title: string;
      description: string;
      estimatedDurationMinutes: number;
    }> = [];

    // Create learning objects for each skill at different difficulty levels
    const skillCodes = [
      'ELA_PHONEMIC_AWARENESS',
      'ELA_PHONICS',
      'ELA_READING_FLUENCY',
      'MATH_COUNTING',
      'MATH_ADDITION',
      'MATH_SUBTRACTION',
    ];
    const types: LearningObjectType[] = ['LESSON', 'EXERCISE', 'ASSESSMENT', 'GAME'];

    let idCounter = 1;
    for (const skillCode of skillCodes) {
      for (let difficulty = 1; difficulty <= 5; difficulty++) {
        for (const objectType of types) {
          objects.push({
            id: `lo-${idCounter++}-${skillCode.slice(-4)}-${difficulty}-${objectType.slice(0, 2)}`,
            skillCode,
            difficultyLevel: difficulty,
            objectType,
            title: `${skillCode} ${objectType} Level ${difficulty}`,
            description: `Learning object for ${skillCode} at difficulty ${difficulty}`,
            estimatedDurationMinutes: 10 + difficulty * 2,
          });
        }
      }
    }

    await prisma.learningObject.createMany({ data: objects, skipDuplicates: true });
  }

  async function seedTestVirtualBrain() {
    // Create virtual brain for test learner
    await prisma.virtualBrain.create({
      data: {
        tenantId: testTenantId,
        learnerId: testLearnerId,
        gradeBand: 'K5',
        skillStates: {
          create: [
            // ELA skills: varying mastery levels
            {
              skillCode: 'ELA_PHONEMIC_AWARENESS',
              mastery: 0.85,
              confidence: 0.9,
              totalPracticeTime: 300,
              assessmentCount: 5,
            }, // High - challenge
            {
              skillCode: 'ELA_PHONICS',
              mastery: 0.55,
              confidence: 0.7,
              totalPracticeTime: 200,
              assessmentCount: 3,
            }, // Medium - practice
            {
              skillCode: 'ELA_READING_FLUENCY',
              mastery: 0.25,
              confidence: 0.4,
              totalPracticeTime: 100,
              assessmentCount: 2,
            }, // Low - focus area
            // MATH skills: varying mastery levels
            {
              skillCode: 'MATH_COUNTING',
              mastery: 0.9,
              confidence: 0.95,
              totalPracticeTime: 400,
              assessmentCount: 6,
            }, // High - challenge
            {
              skillCode: 'MATH_ADDITION',
              mastery: 0.5,
              confidence: 0.6,
              totalPracticeTime: 150,
              assessmentCount: 3,
            }, // Medium - practice
            {
              skillCode: 'MATH_SUBTRACTION',
              mastery: 0.3,
              confidence: 0.35,
              totalPracticeTime: 80,
              assessmentCount: 2,
            }, // Low - focus area
          ],
        },
      },
    });

    // Create virtual brain for learner without skill states
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
      expect(body).toHaveProperty('activities');
      expect(Array.isArray(body.activities)).toBe(true);
      expect(body.activities.length).toBeGreaterThan(0);
      expect(body).toHaveProperty('totalDurationMinutes');
      expect(typeof body.totalDurationMinutes).toBe('number');
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

      // All activities should be from ELA domain
      for (const activity of body.activities) {
        expect(activity.skillCode).toMatch(/^ELA_/);
      }
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

      // Check each activity has appropriate difficulty based on skill mastery
      for (const activity of body.activities) {
        expect(activity).toHaveProperty('difficultyLevel');
        expect(activity.difficultyLevel).toBeGreaterThanOrEqual(1);
        expect(activity.difficultyLevel).toBeLessThanOrEqual(5);

        // Verify reason aligns with mastery
        expect(activity).toHaveProperty('reason');
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
      expect(activity).toHaveProperty('learningObjectId');
      expect(activity).toHaveProperty('skillCode');
      expect(activity).toHaveProperty('skillName');
      expect(activity).toHaveProperty('title');
      expect(activity).toHaveProperty('objectType');
      expect(activity).toHaveProperty('difficultyLevel');
      expect(activity).toHaveProperty('estimatedDurationMinutes');
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
      expect(body.totalDurationMinutes).toBe(0);
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
      expect(body).toHaveProperty('overall');
      expect(['EASIER', 'SAME', 'HARDER']).toContain(body.overall);
      expect(body).toHaveProperty('currentDifficultyBand');
      expect(body).toHaveProperty('suggestedDifficultyBand');
      expect(body).toHaveProperty('byDomain');
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

      expect(body.byDomain).toBeDefined();
      // Should have at least ELA and MATH based on our test data
      expect(body.byDomain).toHaveProperty('ELA');
      expect(body.byDomain).toHaveProperty('MATH');

      // Check structure of domain recommendation
      const elaRec = body.byDomain.ELA;
      expect(elaRec).toHaveProperty('recommendation');
      expect(elaRec).toHaveProperty('avgMastery');
      expect(elaRec).toHaveProperty('skillsAnalyzed');
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

      // When filtering by domain, byDomain should only have that domain
      // or overall should reflect just that domain
      expect(body.byDomain.ELA).toBeDefined();
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
