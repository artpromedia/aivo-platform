/**
 * Analytics Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import analyticsRoutes from '../../src/routes/analytics.routes.js';
import eventsRoutes from '../../src/routes/events.routes.js';
import dashboardRoutes from '../../src/routes/dashboards.routes.js';

// Mock the prisma module
const mockPrisma = {
  learningEvent: {
    findMany: async () => [],
    findUnique: async () => null,
    create: async (data: any) => ({ id: 'event-001', ...data.data }),
    createMany: async (data: any) => ({ count: data.data.length }),
    count: async () => 0,
    groupBy: async () => [],
  },
  dailyUserMetrics: {
    findMany: async () => [],
    findUnique: async () => null,
    aggregate: async () => ({
      _sum: {
        totalTimeSeconds: 0,
        contentCompleted: 0,
        assessmentsCompleted: 0,
        sessionsCount: 0,
      },
      _count: { userId: 0 },
    }),
    groupBy: async () => [],
  },
  dailyContentMetrics: {
    findMany: async () => [],
    groupBy: async () => [],
  },
  topicProgress: {
    findMany: async () => [],
  },
  periodMetrics: {
    findMany: async () => [],
  },
};

// Mock the prisma import
vi.mock('../../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { vi } from 'vitest';

describe('Analytics API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    
    await app.register(analyticsRoutes, { prefix: '/analytics' });
    await app.register(eventsRoutes, { prefix: '/events' });
    await app.register(dashboardRoutes, { prefix: '/dashboards' });
    
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /analytics/learners/:userId/progress', () => {
    it('should return learner progress', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/learners/user-001/progress',
        query: {
          tenantId: 'tenant-001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should accept date range parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/learners/user-001/progress',
        query: {
          tenantId: 'tenant-001',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should require tenantId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/learners/user-001/progress',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /analytics/learners/batch/progress', () => {
    it('should return batch learner progress', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/analytics/learners/batch/progress',
        payload: {
          tenantId: 'tenant-001',
          userIds: ['user-001', 'user-002'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /analytics/content', () => {
    it('should return content analytics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/content',
        query: {
          tenantId: 'tenant-001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should filter by content type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/content',
        query: {
          tenantId: 'tenant-001',
          contentType: 'video',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /analytics/tenant/overview', () => {
    it('should return tenant overview', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/tenant/overview',
        query: {
          tenantId: 'tenant-001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.tenantId).toBe('tenant-001');
    });
  });

  describe('GET /analytics/competency/heatmap', () => {
    it('should return competency heatmap', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/competency/heatmap',
        query: {
          tenantId: 'tenant-001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should filter by user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/analytics/competency/heatmap',
        query: {
          tenantId: 'tenant-001',
          userId: 'user-001',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /events', () => {
    it('should return events list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events',
        query: {
          tenantId: 'tenant-001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events',
        query: {
          tenantId: 'tenant-001',
          limit: '10',
          offset: '0',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.offset).toBe(0);
    });
  });

  describe('POST /events', () => {
    it('should create a new event', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload: {
          tenantId: 'tenant-001',
          userId: 'user-001',
          eventType: 'CONTENT_VIEWED',
          eventCategory: 'LEARNING',
          contentId: 'content-001',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should require required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload: {
          tenantId: 'tenant-001',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /events/batch', () => {
    it('should create multiple events', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/events/batch',
        payload: {
          events: [
            {
              tenantId: 'tenant-001',
              userId: 'user-001',
              eventType: 'CONTENT_VIEWED',
              eventCategory: 'LEARNING',
            },
            {
              tenantId: 'tenant-001',
              userId: 'user-002',
              eventType: 'SESSION_STARTED',
              eventCategory: 'LEARNING',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.created).toBe(2);
    });
  });

  describe('GET /events/stats', () => {
    it('should return event statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events/stats',
        query: {
          tenantId: 'tenant-001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.totalEvents).toBeDefined();
    });
  });

  describe('GET /dashboards/admin', () => {
    it('should return admin dashboard data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/dashboards/admin',
        query: {
          tenantId: 'tenant-001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.summary).toBeDefined();
    });

    it('should accept period parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/dashboards/admin',
        query: {
          tenantId: 'tenant-001',
          period: 'last30Days',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /dashboards/learner/:userId', () => {
    it('should return learner dashboard data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/dashboards/learner/user-001',
        query: {
          tenantId: 'tenant-001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.today).toBeDefined();
      expect(body.data.week).toBeDefined();
    });
  });

  describe('GET /dashboards/teacher', () => {
    it('should return teacher dashboard data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/dashboards/teacher',
        query: {
          tenantId: 'tenant-001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.classStats).toBeDefined();
    });
  });

  describe('GET /dashboards/realtime', () => {
    it('should return real-time metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/dashboards/realtime',
        query: {
          tenantId: 'tenant-001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.timestamp).toBeDefined();
    });
  });
});
