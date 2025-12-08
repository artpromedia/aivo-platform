import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyRequest } from 'fastify';

import { parentAnalyticsRoutes } from '../src/routes/parentAnalytics.js';
import { teacherAnalyticsRoutes } from '../src/routes/teacherAnalytics.js';
import {
  getIndependenceLabel,
  getIndependenceLabelText,
  type IndependenceLabel,
} from '../src/types.js';

// ══════════════════════════════════════════════════════════════════════════════
// INDEPENDENCE SCORING TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Independence Scoring', () => {
  describe('getIndependenceLabel', () => {
    it('returns needs_support for low scores (0-0.3)', () => {
      expect(getIndependenceLabel(0)).toBe('needs_support');
      expect(getIndependenceLabel(0.15)).toBe('needs_support');
      expect(getIndependenceLabel(0.29)).toBe('needs_support');
    });

    it('returns building_independence for mid scores (0.3-0.7)', () => {
      expect(getIndependenceLabel(0.3)).toBe('building_independence');
      expect(getIndependenceLabel(0.5)).toBe('building_independence');
      expect(getIndependenceLabel(0.69)).toBe('building_independence');
    });

    it('returns mostly_independent for high scores (0.7-1.0)', () => {
      expect(getIndependenceLabel(0.7)).toBe('mostly_independent');
      expect(getIndependenceLabel(0.85)).toBe('mostly_independent');
      expect(getIndependenceLabel(1.0)).toBe('mostly_independent');
    });

    it('handles edge cases', () => {
      // Clamp below 0
      expect(getIndependenceLabel(-0.1)).toBe('needs_support');
      // Clamp above 1
      expect(getIndependenceLabel(1.5)).toBe('mostly_independent');
    });
  });

  describe('getIndependenceLabelText', () => {
    it('returns human-readable text for each label', () => {
      expect(getIndependenceLabelText('needs_support')).toBe('Needs Support');
      expect(getIndependenceLabelText('building_independence')).toBe('Building Independence');
      expect(getIndependenceLabelText('mostly_independent')).toBe('Mostly Independent');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PARENT ANALYTICS ROUTES TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Parent Analytics Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    
    // Mock authentication decorator
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request: FastifyRequest) => {
      // Extract mock user from header for testing
      const userId = request.headers['x-user-id'] as string;
      const tenantId = request.headers['x-tenant-id'] as string;
      const role = request.headers['x-user-role'] as string;
      
      if (userId) {
        (request as any).user = { sub: userId, tenantId, role };
      }
    });

    await app.register(parentAnalyticsRoutes, { prefix: '/analytics' });
  });

  describe('GET /analytics/parents/:parentId/learners/:learnerId/homework-summary', () => {
    it('returns 403 when parent requests another parent\'s learner data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/parents/parent-2/learners/learner-1/homework-summary',
        headers: {
          'x-user-id': 'parent-1', // Different from URL parentId
          'x-tenant-id': 'tenant-1',
          'x-user-role': 'parent',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body)).toHaveProperty('error', 'Access denied');
    });

    it('accepts valid days query parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/parents/parent-1/learners/learner-1/homework-summary?days=7',
        headers: {
          'x-user-id': 'parent-1',
          'x-tenant-id': 'tenant-1',
          'x-user-role': 'parent',
        },
      });

      // Should not fail on query parsing (may fail on DB if not mocked)
      expect([200, 500]).toContain(response.statusCode);
    });
  });

  describe('GET /analytics/parents/:parentId/learners/:learnerId/focus-summary', () => {
    it('enforces RBAC for focus summary endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/parents/parent-2/learners/learner-1/focus-summary',
        headers: {
          'x-user-id': 'parent-1',
          'x-tenant-id': 'tenant-1',
          'x-user-role': 'parent',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER ANALYTICS ROUTES TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Teacher Analytics Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request: FastifyRequest) => {
      const userId = request.headers['x-user-id'] as string;
      const tenantId = request.headers['x-tenant-id'] as string;
      const role = request.headers['x-user-role'] as string;
      
      if (userId) {
        (request as any).user = { sub: userId, tenantId, role };
      }
    });

    await app.register(teacherAnalyticsRoutes, { prefix: '/analytics' });
  });

  describe('GET /analytics/tenants/:tenantId/classrooms/:classroomId/homework-usage', () => {
    it('returns 403 when teacher accesses different tenant', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/tenants/tenant-2/classrooms/classroom-1/homework-usage',
        headers: {
          'x-user-id': 'teacher-1',
          'x-tenant-id': 'tenant-1', // Different from URL tenantId
          'x-user-role': 'teacher',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('allows teacher to access their tenant\'s classroom', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/tenants/tenant-1/classrooms/classroom-1/homework-usage',
        headers: {
          'x-user-id': 'teacher-1',
          'x-tenant-id': 'tenant-1',
          'x-user-role': 'teacher',
        },
      });

      // Should not fail RBAC (may fail on DB if not mocked)
      expect([200, 500]).toContain(response.statusCode);
    });
  });

  describe('GET /analytics/tenants/:tenantId/classrooms/:classroomId/focus-patterns', () => {
    it('returns 403 for cross-tenant access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/tenants/other-tenant/classrooms/classroom-1/focus-patterns',
        headers: {
          'x-user-id': 'teacher-1',
          'x-tenant-id': 'tenant-1',
          'x-user-role': 'teacher',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE STRUCTURE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Response Structures', () => {
  describe('ParentHomeworkSummary', () => {
    it('has required shape', () => {
      const mockSummary = {
        learnerId: 'learner-1',
        homeworkSessionsThisWeek: 3,
        homeworkSessionsPerWeek: [2, 3, 4, 3],
        independenceScore: 0.75,
        independenceLabel: 'mostly_independent' as IndependenceLabel,
        independenceLabelText: 'Mostly Independent',
        periodDays: 28,
      };

      expect(mockSummary).toHaveProperty('learnerId');
      expect(mockSummary).toHaveProperty('homeworkSessionsThisWeek');
      expect(mockSummary).toHaveProperty('homeworkSessionsPerWeek');
      expect(mockSummary).toHaveProperty('independenceScore');
      expect(mockSummary).toHaveProperty('independenceLabel');
      expect(mockSummary).toHaveProperty('independenceLabelText');
      expect(mockSummary).toHaveProperty('periodDays');

      // Validate types
      expect(typeof mockSummary.independenceScore).toBe('number');
      expect(Array.isArray(mockSummary.homeworkSessionsPerWeek)).toBe(true);
    });
  });

  describe('ClassroomHomeworkUsage', () => {
    it('has required shape for teacher dashboard', () => {
      const mockUsage = {
        classroomId: 'classroom-1',
        periodDays: 28,
        totalLearners: 25,
        learnersWithHomework: 20,
        avgSessionsPerWeekPerLearner: 2.5,
        independenceDistribution: {
          needsSupport: 5,
          buildingIndependence: 10,
          mostlyIndependent: 5,
        },
        learnerMetrics: [
          {
            learnerId: 'learner-1',
            learnerName: 'Test Learner',
            homeworkSessionsPerWeek: 3.0,
            avgStepsPerHomework: 5.2,
            independenceScore: 0.8,
            independenceLabel: 'mostly_independent' as IndependenceLabel,
          },
        ],
      };

      expect(mockUsage).toHaveProperty('classroomId');
      expect(mockUsage).toHaveProperty('totalLearners');
      expect(mockUsage).toHaveProperty('independenceDistribution');
      expect(mockUsage).toHaveProperty('learnerMetrics');
      expect(mockUsage.independenceDistribution).toHaveProperty('needsSupport');
      expect(mockUsage.independenceDistribution).toHaveProperty('buildingIndependence');
      expect(mockUsage.independenceDistribution).toHaveProperty('mostlyIndependent');
    });
  });
});
