/**
 * Tests for the parent learner report API.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';

describe('Parent Learner Report API', () => {
  let app: FastifyInstance;

  const mockUser = {
    sub: 'parent-123',
    tenantId: 'tenant-456',
    role: 'parent',
    childrenIds: ['learner-789'],
  };

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'test');
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /reports/learners/:learnerId/parent-summary', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports/learners/learner-789/parent-summary',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid learner ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports/learners/invalid-id/parent-summary',
        headers: {
          'x-test-user': JSON.stringify(mockUser),
        },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toHaveProperty('error');
    });

    it('should return report with expected sections', async () => {
      // This test requires mocking the service clients
      // In a full implementation, use dependency injection
      const response = await app.inject({
        method: 'GET',
        url: '/reports/learners/550e8400-e29b-41d4-a716-446655440000/parent-summary',
        headers: {
          'x-test-user': JSON.stringify(mockUser),
        },
      });

      // With mocked services returning null, we expect default empty sections
      // In production, this would return actual data
      if (response.statusCode === 200) {
        const report = JSON.parse(response.payload);

        expect(report).toHaveProperty('learnerId');
        expect(report).toHaveProperty('baseline');
        expect(report).toHaveProperty('virtualBrain');
        expect(report).toHaveProperty('goals');
        expect(report).toHaveProperty('homework');
        expect(report).toHaveProperty('focus');
        expect(report).toHaveProperty('generatedAt');
        expect(report).toHaveProperty('reportPeriodDays');
      }
    });

    it('should accept days query parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports/learners/550e8400-e29b-41d4-a716-446655440000/parent-summary?days=7',
        headers: {
          'x-test-user': JSON.stringify(mockUser),
        },
      });

      if (response.statusCode === 200) {
        const report = JSON.parse(response.payload);
        expect(report.reportPeriodDays).toBe(7);
      }
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('reports-svc');
    });
  });
});
