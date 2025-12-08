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

describe('learner-model-svc API', () => {
  let app: FastifyInstance;

  const testTenantId = 'a0000000-0000-0000-0000-000000000001';
  const testLearnerId = 'b0000000-0000-0000-0000-000000000001';
  const testProfileId = 'c0000000-0000-0000-0000-000000000001';
  const testAttemptId = 'd0000000-0000-0000-0000-000000000001';

  const parentUser = {
    sub: 'parent-user-id',
    tenantId: testTenantId,
    role: 'parent',
  };

  const otherTenantUser = {
    sub: 'other-user-id',
    tenantId: 'other-tenant-id',
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

    // Seed test skills
    await seedTestSkills();
  });

  afterAll(async () => {
    await app.close();
    // Cleanup test data
    await prisma.learnerSkillState.deleteMany({
      where: { virtualBrain: { tenantId: testTenantId } },
    });
    await prisma.virtualBrain.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.skillPrerequisite.deleteMany({});
    await prisma.skill.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /health', () => {
    it('should return health status without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('learner-model-svc');
    });
  });

  describe('POST /virtual-brains/initialize', () => {
    it('should initialize virtual brain from baseline skill estimates', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/virtual-brains/initialize',
        headers: {
          'x-test-user': JSON.stringify(serviceUser),
          'content-type': 'application/json',
        },
        payload: {
          tenantId: testTenantId,
          learnerId: testLearnerId,
          baselineProfileId: testProfileId,
          baselineAttemptId: testAttemptId,
          gradeBand: 'K5',
          skillEstimates: [
            {
              skillCode: 'ELA_PHONEMIC_AWARENESS',
              domain: 'ELA',
              estimatedLevel: 2.5,
              confidence: 0.8,
            },
            { skillCode: 'ELA_FLUENCY', domain: 'ELA', estimatedLevel: 3.0, confidence: 0.75 },
            {
              skillCode: 'MATH_NUMBER_SENSE',
              domain: 'MATH',
              estimatedLevel: 4.0,
              confidence: 0.9,
            },
            { skillCode: 'UNKNOWN_SKILL', domain: 'MATH', estimatedLevel: 1.0, confidence: 0.5 },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.virtualBrainId).toBeDefined();
      expect(body.learnerId).toBe(testLearnerId);
      expect(body.skillsInitialized).toBe(3); // 3 valid skills
      expect(body.skillsMissing).toContain('UNKNOWN_SKILL');
    });

    it('should reject duplicate initialization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/virtual-brains/initialize',
        headers: {
          'x-test-user': JSON.stringify(serviceUser),
          'content-type': 'application/json',
        },
        payload: {
          tenantId: testTenantId,
          learnerId: testLearnerId,
          baselineProfileId: testProfileId,
          baselineAttemptId: testAttemptId,
          gradeBand: 'K5',
          skillEstimates: [],
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.payload);
      expect(body.error).toContain('already exists');
    });

    it('should reject request from wrong tenant', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/virtual-brains/initialize',
        headers: {
          'x-test-user': JSON.stringify(otherTenantUser),
          'content-type': 'application/json',
        },
        payload: {
          tenantId: testTenantId, // Trying to access different tenant
          learnerId: 'another-learner',
          baselineProfileId: testProfileId,
          baselineAttemptId: testAttemptId,
          gradeBand: 'K5',
          skillEstimates: [],
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/virtual-brains/initialize',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          tenantId: testTenantId,
          learnerId: testLearnerId,
          baselineProfileId: testProfileId,
          baselineAttemptId: testAttemptId,
          gradeBand: 'K5',
          skillEstimates: [],
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /virtual-brains/:learnerId', () => {
    it('should return virtual brain with skill states', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/virtual-brains/${testLearnerId}`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.id).toBeDefined();
      expect(body.learnerId).toBe(testLearnerId);
      expect(body.gradeBand).toBe('K5');
      expect(body.skillStates).toBeInstanceOf(Array);
      expect(body.skillStates.length).toBeGreaterThan(0);
      expect(body.summary).toBeDefined();
      expect(body.summary.totalSkills).toBe(3);
    });

    it('should include skill details in response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/virtual-brains/${testLearnerId}`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
        },
      });

      const body = JSON.parse(response.payload);
      const elaSkill = body.skillStates.find(
        (s: { skillCode: string }) => s.skillCode === 'ELA_PHONEMIC_AWARENESS'
      );
      expect(elaSkill).toBeDefined();
      expect(elaSkill.displayName).toBe('Phonemic Awareness');
      expect(elaSkill.domain).toBe('ELA');
      expect(elaSkill.masteryLevel).toBe(2.5);
      expect(elaSkill.confidence).toBe(0.8);
    });

    it('should return 404 for non-existent learner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/virtual-brains/e0000000-0000-0000-0000-000000000099',
        headers: {
          'x-test-user': JSON.stringify(parentUser),
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should not allow access from other tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/virtual-brains/${testLearnerId}`,
        headers: {
          'x-test-user': JSON.stringify(otherTenantUser),
        },
      });

      // Returns 404 because query filters by tenant
      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /virtual-brains/:learnerId/skill-graph', () => {
    it('should return skill graph with prerequisites', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/virtual-brains/${testLearnerId}/skill-graph`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.learnerId).toBe(testLearnerId);
      expect(body.skillGraph).toBeInstanceOf(Array);
      expect(body.stats).toBeDefined();
      expect(body.stats.totalSkills).toBe(3);
    });

    it('should identify mastered and ready skills', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/virtual-brains/${testLearnerId}/skill-graph`,
        headers: {
          'x-test-user': JSON.stringify(parentUser),
        },
      });

      const body = JSON.parse(response.payload);
      // MATH_NUMBER_SENSE has 4.0 mastery (> 0.7 threshold)
      const mathSkill = body.skillGraph.find(
        (s: { skillCode: string }) => s.skillCode === 'MATH_NUMBER_SENSE'
      );
      expect(mathSkill.isMastered).toBe(true);
    });
  });
});

// Helper to seed test skills
async function seedTestSkills() {
  const skills = [
    {
      skillCode: 'ELA_PHONEMIC_AWARENESS',
      domain: 'ELA' as const,
      gradeBand: 'K5' as const,
      displayName: 'Phonemic Awareness',
      description: 'Understanding phonemes',
    },
    {
      skillCode: 'ELA_FLUENCY',
      domain: 'ELA' as const,
      gradeBand: 'K5' as const,
      displayName: 'Reading Fluency',
      description: 'Reading fluently',
    },
    {
      skillCode: 'MATH_NUMBER_SENSE',
      domain: 'MATH' as const,
      gradeBand: 'K5' as const,
      displayName: 'Number Sense',
      description: 'Understanding numbers',
    },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { skillCode: skill.skillCode },
      update: skill,
      create: skill,
    });
  }

  // Create prerequisite: ELA_FLUENCY requires ELA_PHONEMIC_AWARENESS
  const phonemic = await prisma.skill.findUnique({
    where: { skillCode: 'ELA_PHONEMIC_AWARENESS' },
  });
  const fluency = await prisma.skill.findUnique({
    where: { skillCode: 'ELA_FLUENCY' },
  });

  if (phonemic && fluency) {
    await prisma.skillPrerequisite.upsert({
      where: {
        prerequisiteSkillId_dependentSkillId: {
          prerequisiteSkillId: phonemic.id,
          dependentSkillId: fluency.id,
        },
      },
      update: {},
      create: {
        prerequisiteSkillId: phonemic.id,
        dependentSkillId: fluency.id,
      },
    });
  }
}
