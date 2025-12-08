/**
 * API Integration Tests for Teacher Planning Service
 *
 * Tests goal, objective, session plan, and progress note CRUD operations.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { createApp } from '../src/app.js';

// Mock the auth middleware to bypass JWT verification in tests
vi.mock('../src/middleware/auth.js', () => ({
  authMiddleware: {
    default: async (fastify: { addHook: (event: string, handler: unknown) => void }) => {
      fastify.addHook('preHandler', async (request: { user: unknown }) => {
        // Inject a mock user for all requests
        request.user = {
          userId: '11111111-1111-1111-1111-111111111111',
          email: 'teacher@school.edu',
          tenantId: '22222222-2222-2222-2222-222222222222',
          role: 'TEACHER',
        };
      });
    },
  },
}));

// Mock Prisma client
vi.mock('../src/prisma.js', () => {
  const mockGoals = new Map();
  const mockObjectives = new Map();
  const mockSessionPlans = new Map();
  const mockSessionPlanItems = new Map();
  const mockProgressNotes = new Map();

  return {
    prisma: {
      goal: {
        create: vi.fn(({ data, include }) => {
          const goal = {
            id: crypto.randomUUID(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            objectives: include?.objectives ? [] : undefined,
          };
          mockGoals.set(goal.id, goal);
          return Promise.resolve(goal);
        }),
        findFirst: vi.fn(({ where, include }) => {
          const goal = mockGoals.get(where.id);
          if (!goal) return Promise.resolve(null);
          if (where.tenantId && goal.tenantId !== where.tenantId) return Promise.resolve(null);
          return Promise.resolve({
            ...goal,
            objectives: include?.objectives ? [...mockObjectives.values()].filter(o => o.goalId === goal.id) : undefined,
          });
        }),
        findMany: vi.fn(({ where, skip, take, include }) => {
          const goals = [...mockGoals.values()]
            .filter(g => g.learnerId === where.learnerId)
            .filter(g => !where.tenantId || g.tenantId === where.tenantId)
            .filter(g => !where.status || g.status === where.status)
            .slice(skip || 0, (skip || 0) + (take || 20));
          return Promise.resolve(goals.map(g => ({
            ...g,
            objectives: include?.objectives ? [...mockObjectives.values()].filter(o => o.goalId === g.id) : undefined,
          })));
        }),
        count: vi.fn(({ where }) => {
          const count = [...mockGoals.values()]
            .filter(g => g.learnerId === where.learnerId)
            .filter(g => !where.tenantId || g.tenantId === where.tenantId)
            .length;
          return Promise.resolve(count);
        }),
        update: vi.fn(({ where, data, include }) => {
          const goal = mockGoals.get(where.id);
          if (!goal) throw new Error('Goal not found');
          const updated = { ...goal, ...data, updatedAt: new Date() };
          mockGoals.set(where.id, updated);
          return Promise.resolve({
            ...updated,
            objectives: include?.objectives ? [...mockObjectives.values()].filter(o => o.goalId === updated.id) : undefined,
          });
        }),
      },
      goalObjective: {
        create: vi.fn(({ data }) => {
          const objective = {
            id: crypto.randomUUID(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockObjectives.set(objective.id, objective);
          return Promise.resolve(objective);
        }),
        findUnique: vi.fn(({ where, include }) => {
          const objective = mockObjectives.get(where.id);
          if (!objective) return Promise.resolve(null);
          return Promise.resolve({
            ...objective,
            goal: include?.goal ? mockGoals.get(objective.goalId) : undefined,
          });
        }),
        update: vi.fn(({ where, data }) => {
          const objective = mockObjectives.get(where.id);
          if (!objective) throw new Error('Objective not found');
          const updated = { ...objective, ...data, updatedAt: new Date() };
          mockObjectives.set(where.id, updated);
          return Promise.resolve(updated);
        }),
        aggregate: vi.fn(() => Promise.resolve({ _max: { orderIndex: 0 } })),
      },
      sessionPlan: {
        create: vi.fn(({ data, include }) => {
          const plan = {
            id: crypto.randomUUID(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            items: include?.items ? [] : undefined,
          };
          mockSessionPlans.set(plan.id, plan);
          return Promise.resolve(plan);
        }),
        findFirst: vi.fn(({ where, include }) => {
          const plan = mockSessionPlans.get(where.id);
          if (!plan) return Promise.resolve(null);
          if (where.tenantId && plan.tenantId !== where.tenantId) return Promise.resolve(null);
          return Promise.resolve({
            ...plan,
            items: include?.items ? [...mockSessionPlanItems.values()].filter(i => i.sessionPlanId === plan.id) : undefined,
          });
        }),
        findMany: vi.fn(({ where, skip, take, include }) => {
          const plans = [...mockSessionPlans.values()]
            .filter(p => p.learnerId === where.learnerId)
            .filter(p => !where.tenantId || p.tenantId === where.tenantId)
            .slice(skip || 0, (skip || 0) + (take || 20));
          return Promise.resolve(plans.map(p => ({
            ...p,
            items: include?.items ? [...mockSessionPlanItems.values()].filter(i => i.sessionPlanId === p.id) : undefined,
          })));
        }),
        count: vi.fn(({ where }) => {
          const count = [...mockSessionPlans.values()]
            .filter(p => p.learnerId === where.learnerId)
            .filter(p => !where.tenantId || p.tenantId === where.tenantId)
            .length;
          return Promise.resolve(count);
        }),
        update: vi.fn(({ where, data, include }) => {
          const plan = mockSessionPlans.get(where.id);
          if (!plan) throw new Error('SessionPlan not found');
          const updated = { ...plan, ...data, updatedAt: new Date() };
          mockSessionPlans.set(where.id, updated);
          return Promise.resolve({
            ...updated,
            items: include?.items ? [...mockSessionPlanItems.values()].filter(i => i.sessionPlanId === updated.id) : undefined,
          });
        }),
      },
      sessionPlanItem: {
        create: vi.fn(({ data }) => {
          const item = {
            id: crypto.randomUUID(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockSessionPlanItems.set(item.id, item);
          return Promise.resolve(item);
        }),
        deleteMany: vi.fn(({ where }) => {
          for (const [id, item] of mockSessionPlanItems) {
            if (item.sessionPlanId === where.sessionPlanId) {
              mockSessionPlanItems.delete(id);
            }
          }
          return Promise.resolve({ count: 0 });
        }),
      },
      progressNote: {
        create: vi.fn(({ data }) => {
          const note = {
            id: crypto.randomUUID(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockProgressNotes.set(note.id, note);
          return Promise.resolve(note);
        }),
        findFirst: vi.fn(({ where }) => {
          const note = mockProgressNotes.get(where.id);
          if (!note) return Promise.resolve(null);
          if (where.tenantId && note.tenantId !== where.tenantId) return Promise.resolve(null);
          return Promise.resolve(note);
        }),
        findMany: vi.fn(({ where, skip, take }) => {
          const notes = [...mockProgressNotes.values()]
            .filter(n => n.learnerId === where.learnerId)
            .filter(n => !where.tenantId || n.tenantId === where.tenantId)
            .filter(n => !where.goalId || n.goalId === where.goalId)
            .slice(skip || 0, (skip || 0) + (take || 20));
          return Promise.resolve(notes);
        }),
        count: vi.fn(({ where }) => {
          const count = [...mockProgressNotes.values()]
            .filter(n => n.learnerId === where.learnerId)
            .filter(n => !where.tenantId || n.tenantId === where.tenantId)
            .length;
          return Promise.resolve(count);
        }),
      },
      $transaction: vi.fn(async (callback) => callback({
        sessionPlanItem: {
          deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
          create: vi.fn(({ data }) => {
            const item = {
              id: crypto.randomUUID(),
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockSessionPlanItems.set(item.id, item);
            return Promise.resolve(item);
          }),
        },
      })),
    },
  };
});

// Mock external clients
vi.mock('../src/services/externalClients.js', () => ({
  getSkillById: vi.fn(() => Promise.resolve({ id: 'skill-123', name: 'Reading Fluency', domain: 'ELA' })),
  getSkillsByIds: vi.fn(() => Promise.resolve(new Map())),
  validateSkillId: vi.fn(() => Promise.resolve(true)),
  validateSessionId: vi.fn(() => Promise.resolve(true)),
}));

describe('Teacher Planning API', () => {
  const app = createApp();
  const learnerId = '33333333-3333-3333-3333-333333333333';
  let createdGoalId: string;
  let createdObjectiveId: string;
  let createdPlanId: string;

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /health returns ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        status: 'ok',
        service: 'teacher-planning-svc',
      });
    });
  });

  describe('Goals API', () => {
    it('POST /learners/:learnerId/goals creates a goal', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/learners/${learnerId}/goals`,
        payload: {
          title: 'Improve reading fluency',
          description: 'Read grade-level text with 95% accuracy',
          domain: 'ELA',
          targetDate: '2025-06-01T00:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.title).toBe('Improve reading fluency');
      expect(body.domain).toBe('ELA');
      expect(body.status).toBe('ACTIVE');
      createdGoalId = body.id;
    });

    it('GET /learners/:learnerId/goals lists goals', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/learners/${learnerId}/goals`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
    });

    it('GET /learners/:learnerId/goals filters by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/learners/${learnerId}/goals?status=ACTIVE`,
      });

      expect(response.statusCode).toBe(200);
    });

    it('GET /goals/:goalId returns a specific goal', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/goals/${createdGoalId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(createdGoalId);
    });

    it('PATCH /goals/:goalId updates a goal', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/goals/${createdGoalId}`,
        payload: {
          progressRating: 2,
          status: 'ACTIVE',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.progressRating).toBe(2);
    });
  });

  describe('Objectives API', () => {
    it('POST /goals/:goalId/objectives creates an objective', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/goals/${createdGoalId}/objectives`,
        payload: {
          description: 'Read 50 words per minute with <3 errors',
          successCriteria: '3 consecutive sessions meeting criteria',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.description).toBe('Read 50 words per minute with <3 errors');
      expect(body.status).toBe('NOT_STARTED');
      createdObjectiveId = body.id;
    });

    it('PATCH /goal-objectives/:objectiveId updates an objective', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/goal-objectives/${createdObjectiveId}`,
        payload: {
          status: 'IN_PROGRESS',
          progressRating: 1,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('IN_PROGRESS');
    });
  });

  describe('Session Plans API', () => {
    it('POST /learners/:learnerId/session-plans creates a plan', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/learners/${learnerId}/session-plans`,
        payload: {
          sessionType: 'LEARNING',
          scheduledFor: '2025-01-15T10:00:00.000Z',
          templateName: 'Reading Session',
          estimatedDurationMinutes: 45,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.sessionType).toBe('LEARNING');
      expect(body.status).toBe('DRAFT');
      createdPlanId = body.id;
    });

    it('GET /learners/:learnerId/session-plans lists plans', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/learners/${learnerId}/session-plans`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
    });

    it('POST /session-plans/:planId/items adds items to a plan', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/session-plans/${createdPlanId}/items`,
        payload: [
          {
            orderIndex: 0,
            goalId: createdGoalId,
            activityType: 'reading_passage',
            activityDescription: 'Read "The Giving Tree" aloud',
            estimatedDurationMinutes: 15,
          },
          {
            orderIndex: 1,
            activityType: 'comprehension_questions',
            activityDescription: 'Answer 5 comprehension questions',
            estimatedDurationMinutes: 10,
          },
        ],
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveLength(2);
    });

    it('PATCH /session-plans/:planId updates plan status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/session-plans/${createdPlanId}`,
        payload: {
          status: 'PLANNED',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('PLANNED');
    });
  });

  describe('Progress Notes API', () => {
    it('POST /progress-notes creates a progress note', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/progress-notes',
        payload: {
          learnerId,
          goalId: createdGoalId,
          goalObjectiveId: createdObjectiveId,
          noteText: 'Student read 45 wpm today with 2 errors. Showing improvement.',
          rating: 2,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toBeDefined();
      expect(body.noteText).toContain('45 wpm');
      expect(body.rating).toBe(2);
    });

    it('GET /learners/:learnerId/progress-notes lists notes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/learners/${learnerId}/progress-notes`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
    });

    it('GET /learners/:learnerId/progress-notes filters by goalId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/learners/${learnerId}/progress-notes?goalId=${createdGoalId}`,
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
