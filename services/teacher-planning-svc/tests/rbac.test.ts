/**
 * RBAC Tests for Teacher Planning Service
 *
 * Tests role-based access control for different user types.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { createApp } from '../src/app.js';

// We'll use a modified approach - set up different users per test
const mockUser = {
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'teacher@school.edu',
  tenantId: '22222222-2222-2222-2222-222222222222',
  role: 'TEACHER' as const,
};

// Track the current mock user for each test
let currentMockUser = { ...mockUser };

// Mock auth to inject current mock user
vi.mock('../src/middleware/auth.js', () => ({
  authMiddleware: {
    default: async (fastify: { addHook: (event: string, handler: unknown) => void }) => {
      fastify.addHook('preHandler', async (request: { user: unknown }) => {
        request.user = currentMockUser;
      });
    },
  },
}));

// Track access check results
let teacherHasAccessResult = true;

// Mock RBAC middleware
vi.mock('../src/middleware/rbac.js', async () => {
  const actual = await vi.importActual('../src/middleware/rbac.js');
  return {
    ...actual,
    teacherHasAccessToLearner: vi.fn(() => Promise.resolve(teacherHasAccessResult)),
  };
});

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    goal: {
      create: vi.fn(() =>
        Promise.resolve({
          id: 'goal-1',
          tenantId: '22222222-2222-2222-2222-222222222222',
          learnerId: '33333333-3333-3333-3333-333333333333',
          createdByUserId: '11111111-1111-1111-1111-111111111111',
          title: 'Test Goal',
          description: null,
          domain: 'ELA',
          skillId: null,
          startDate: new Date(),
          targetDate: null,
          status: 'ACTIVE',
          progressRating: null,
          metadataJson: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          objectives: [],
        })
      ),
      findFirst: vi.fn(() =>
        Promise.resolve({
          id: 'goal-1',
          tenantId: '22222222-2222-2222-2222-222222222222',
          learnerId: '33333333-3333-3333-3333-333333333333',
          createdByUserId: '11111111-1111-1111-1111-111111111111',
          title: 'Test Goal',
          description: null,
          domain: 'ELA',
          skillId: null,
          startDate: new Date(),
          targetDate: null,
          status: 'ACTIVE',
          progressRating: null,
          metadataJson: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          objectives: [],
        })
      ),
      findMany: vi.fn(() => Promise.resolve([])),
      count: vi.fn(() => Promise.resolve(0)),
      update: vi.fn(() =>
        Promise.resolve({
          id: 'goal-1',
          tenantId: '22222222-2222-2222-2222-222222222222',
          learnerId: '33333333-3333-3333-3333-333333333333',
          title: 'Updated Goal',
          status: 'ACTIVE',
          objectives: [],
        })
      ),
    },
    goalObjective: {
      aggregate: vi.fn(() => Promise.resolve({ _max: { orderIndex: 0 } })),
    },
    progressNote: {
      create: vi.fn(() =>
        Promise.resolve({
          id: 'note-1',
          tenantId: '22222222-2222-2222-2222-222222222222',
          learnerId: '33333333-3333-3333-3333-333333333333',
          noteText: 'Test note',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      findMany: vi.fn(() => Promise.resolve([])),
      count: vi.fn(() => Promise.resolve(0)),
    },
  },
}));

// Mock external clients
vi.mock('../src/services/externalClients.js', () => ({
  getSkillById: vi.fn(() => Promise.resolve(null)),
  getSkillsByIds: vi.fn(() => Promise.resolve(new Map())),
  validateSkillId: vi.fn(() => Promise.resolve(true)),
  validateSessionId: vi.fn(() => Promise.resolve(true)),
}));

describe('RBAC Access Control', () => {
  let app: FastifyInstance;
  const learnerId = '33333333-3333-3333-3333-333333333333';

  beforeAll(async () => {
    app = createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Teacher Role', () => {
    it('Teacher with access can create goals', async () => {
      currentMockUser = { ...mockUser, role: 'TEACHER' };
      teacherHasAccessResult = true;

      const response = await app.inject({
        method: 'POST',
        url: `/learners/${learnerId}/goals`,
        payload: {
          title: 'Test Goal',
          domain: 'ELA',
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('Teacher with access can read goals', async () => {
      currentMockUser = { ...mockUser, role: 'TEACHER' };
      teacherHasAccessResult = true;

      const response = await app.inject({
        method: 'GET',
        url: `/learners/${learnerId}/goals`,
      });

      expect(response.statusCode).toBe(200);
    });

    it('Teacher with access can create progress notes', async () => {
      currentMockUser = { ...mockUser, role: 'TEACHER' };
      teacherHasAccessResult = true;

      const response = await app.inject({
        method: 'POST',
        url: '/progress-notes',
        payload: {
          learnerId,
          noteText: 'Great progress today!',
          rating: 3,
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('Therapist Role', () => {
    it('Therapist with access can create goals', async () => {
      currentMockUser = { ...mockUser, role: 'THERAPIST' };
      teacherHasAccessResult = true;

      const response = await app.inject({
        method: 'POST',
        url: `/learners/${learnerId}/goals`,
        payload: {
          title: 'Speech Goal',
          domain: 'SPEECH',
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('District Admin Role', () => {
    it('District admin can read goals (read-only)', async () => {
      currentMockUser = { ...mockUser, role: 'DISTRICT_ADMIN' };

      const response = await app.inject({
        method: 'GET',
        url: `/learners/${learnerId}/goals`,
      });

      expect(response.statusCode).toBe(200);
    });

    // Note: In a full implementation, this would test that district admins
    // get 403 when trying to create/update. The current stub allows all educators.
    // This is a placeholder for when the full RBAC is implemented.
  });
});

describe('Validation Tests', () => {
  let app: FastifyInstance;
  const learnerId = '33333333-3333-3333-3333-333333333333';

  beforeAll(async () => {
    app = createApp();
    await app.ready();
    currentMockUser = { ...mockUser };
    teacherHasAccessResult = true;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Rejects invalid domain enum', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/learners/${learnerId}/goals`,
      payload: {
        title: 'Test Goal',
        domain: 'INVALID_DOMAIN',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('Rejects empty title', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/learners/${learnerId}/goals`,
      payload: {
        title: '',
        domain: 'ELA',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('Rejects invalid progress rating (out of range)', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/goals/goal-1',
      payload: {
        progressRating: 10,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('Rejects invalid UUID for learnerId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/learners/not-a-uuid/goals',
      payload: {
        title: 'Test Goal',
        domain: 'ELA',
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
