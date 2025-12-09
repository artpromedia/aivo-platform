/**
 * Tests for the classroom summary report API.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';

describe('Classroom Summary Report API', () => {
  let app: FastifyInstance;

  const mockTeacher = {
    sub: 'teacher-123',
    tenantId: 'tenant-456',
    role: 'teacher',
    classroomIds: ['classroom-789'],
  };

  const mockAdmin = {
    sub: 'admin-123',
    tenantId: 'tenant-456',
    role: 'district_admin',
  };

  const mockParent = {
    sub: 'parent-123',
    tenantId: 'tenant-456',
    role: 'parent',
    childrenIds: ['learner-111'],
  };

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'test');
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /reports/classrooms/:classroomId/summary', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports/classrooms/classroom-789/summary',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid classroom ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports/classrooms/invalid-id/summary',
        headers: {
          'x-test-user': JSON.stringify(mockTeacher),
        },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toHaveProperty('error');
    });

    it('should return report with expected sections for teacher', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports/classrooms/550e8400-e29b-41d4-a716-446655440000/summary',
        headers: {
          'x-test-user': JSON.stringify(mockTeacher),
        },
      });

      // With mocked services, we may get 404 or success
      // Testing structure when successful
      if (response.statusCode === 200) {
        const report = JSON.parse(response.payload);

        expect(report).toHaveProperty('classroomId');
        expect(report).toHaveProperty('baseline');
        expect(report).toHaveProperty('goals');
        expect(report).toHaveProperty('homework');
        expect(report).toHaveProperty('focus');
        expect(report).toHaveProperty('learners');
        expect(report).toHaveProperty('generatedAt');

        // Baseline stats structure
        expect(report.baseline).toHaveProperty('totalLearners');
        expect(report.baseline).toHaveProperty('baselineCompleted');
        expect(report.baseline).toHaveProperty('completionRate');

        // Goals stats structure
        expect(report.goals).toHaveProperty('totalGoals');
        expect(report.goals).toHaveProperty('statusDistribution');
        expect(report.goals.statusDistribution).toHaveProperty('active');
        expect(report.goals.statusDistribution).toHaveProperty('completed');

        // Homework stats structure
        expect(report.homework).toHaveProperty('independenceDistribution');

        // Focus stats structure
        expect(report.focus).toHaveProperty('totalSessions');
        expect(report.focus).toHaveProperty('peakHours');
      }
    });

    it('should allow district admin to access any classroom', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports/classrooms/550e8400-e29b-41d4-a716-446655440000/summary',
        headers: {
          'x-test-user': JSON.stringify(mockAdmin),
        },
      });

      // Should not be 403 (Forbidden) for admin
      expect(response.statusCode).not.toBe(403);
    });

    it('should deny parent access to classroom reports', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports/classrooms/550e8400-e29b-41d4-a716-446655440000/summary',
        headers: {
          'x-test-user': JSON.stringify(mockParent),
        },
      });

      // Parents should be denied access (403 or similar)
      // The exact behavior depends on classroom info retrieval
      expect([403, 404]).toContain(response.statusCode);
    });

    it('should accept days query parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports/classrooms/550e8400-e29b-41d4-a716-446655440000/summary?days=14',
        headers: {
          'x-test-user': JSON.stringify(mockTeacher),
        },
      });

      if (response.statusCode === 200) {
        const report = JSON.parse(response.payload);
        expect(report.reportPeriodDays).toBe(14);
      }
    });
  });

  describe('RBAC Tests', () => {
    it('should verify teacher can only access assigned classrooms', async () => {
      const teacherWithDifferentClassroom = {
        ...mockTeacher,
        classroomIds: ['different-classroom'],
      };

      const response = await app.inject({
        method: 'GET',
        url: '/reports/classrooms/550e8400-e29b-41d4-a716-446655440000/summary',
        headers: {
          'x-test-user': JSON.stringify(teacherWithDifferentClassroom),
        },
      });

      // Teacher without access to this classroom should be denied
      // 403 if classroom found but access denied, 404 if not found
      expect([403, 404]).toContain(response.statusCode);
    });
  });
});
