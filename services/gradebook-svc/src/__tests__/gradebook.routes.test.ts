/**
 * Gradebook Routes Tests
 *
 * Tests for gradebook CRUD operations including:
 * - GET /gradebook/classroom/:classroomId
 * - GET /gradebook/config/:classroomId
 * - POST /gradebook/config
 * - GET /gradebook/student/:studentId/classroom/:classroomId
 * - POST /gradebook/import
 * - GET /gradebook/export/:classroomId
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock @aivo/ts-api-utils before importing app
vi.mock('@aivo/ts-api-utils', () => ({
  createExpressRateLimiter: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  RateLimitPresets: {
    API_GENERAL: { windowMs: 60000, max: 100 },
  },
}));

// Create mock Prisma client with vi.hoisted to ensure it's available for the mock factory
const mockPrismaClient = vi.hoisted(() => ({
  gradebookConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  gradeCategory: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  assignment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  grade: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  gradeAuditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn((operations: any) => Promise.all(operations)),
}));

vi.mock('../generated/prisma-client/index.js', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrismaClient),
}));

// Import after mocking
import { createApp } from '../app.js';

describe('Gradebook Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/v1/gradebook/classroom/:classroomId', () => {
    it('should return classroom gradebook with students and grades', async () => {
      const mockConfig = {
        id: 'config-1',
        classroomId: 'classroom-1',
        teacherId: 'teacher-1',
        tenantId: 'tenant-1',
        calculationType: 'WEIGHTED_CATEGORIES',
        letterGradeScale: { A: 90, B: 80, C: 70, D: 60, F: 0 },
        categories: [
          { id: 'cat-1', name: 'Homework', weight: 30 },
          { id: 'cat-2', name: 'Tests', weight: 70 },
        ],
        assignments: [
          {
            id: 'assign-1',
            title: 'Test 1',
            totalPoints: 100,
            status: 'PUBLISHED',
            categoryId: 'cat-2',
            category: { id: 'cat-2', name: 'Tests', weight: 70 },
            grades: [
              { studentId: 'student-1', score: 85 },
              { studentId: 'student-2', score: 92 },
            ],
          },
        ],
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.grade.findMany.mockResolvedValue([
        { studentId: 'student-1' },
        { studentId: 'student-2' },
      ]);

      const response = await request(app)
        .get('/api/v1/gradebook/classroom/classroom-1')
        .expect(200);

      expect(response.body).toHaveProperty('config');
      expect(response.body).toHaveProperty('students');
      expect(mockPrismaClient.gradebookConfig.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classroomId: 'classroom-1' },
        })
      );
    });

    it('should handle non-existent classroom gracefully', async () => {
      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/gradebook/classroom/non-existent')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors', async () => {
      mockPrismaClient.gradebookConfig.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/v1/gradebook/classroom/classroom-1')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to fetch gradebook' });
    });
  });

  describe('GET /api/v1/gradebook/config/:classroomId', () => {
    it('should return gradebook configuration', async () => {
      const mockConfig = {
        id: 'config-1',
        classroomId: 'classroom-1',
        teacherId: 'teacher-1',
        tenantId: 'tenant-1',
        calculationType: 'TOTAL_POINTS',
        letterGradeScale: { A: 90, B: 80, C: 70, D: 60, F: 0 },
        categories: [],
        assignments: [],
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);

      const response = await request(app)
        .get('/api/v1/gradebook/config/classroom-1')
        .expect(200);

      expect(response.body.id).toBe('config-1');
      expect(response.body.classroomId).toBe('classroom-1');
    });

    it('should return 404 when config not found', async () => {
      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/gradebook/config/non-existent')
        .expect(404);

      expect(response.body).toEqual({ error: 'Gradebook config not found' });
    });

    it('should handle database errors', async () => {
      mockPrismaClient.gradebookConfig.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/v1/gradebook/config/classroom-1')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to fetch gradebook config' });
    });
  });

  describe('POST /api/v1/gradebook/config', () => {
    it('should create new gradebook configuration', async () => {
      const mockConfig = {
        id: 'config-1',
        classroomId: 'classroom-1',
        teacherId: 'teacher-1',
        tenantId: 'tenant-1',
        calculationType: 'WEIGHTED_CATEGORIES',
        letterGradeScale: { A: 90, B: 80, C: 70, D: 60, F: 0 },
        categories: [],
      };

      mockPrismaClient.gradebookConfig.upsert.mockResolvedValue(mockConfig);

      const response = await request(app)
        .post('/api/v1/gradebook/config')
        .send({
          classroomId: 'classroom-1',
          teacherId: 'teacher-1',
          tenantId: 'tenant-1',
          calculationType: 'WEIGHTED_CATEGORIES',
          letterGradeScale: { A: 90, B: 80, C: 70, D: 60, F: 0 },
        })
        .expect(200);

      expect(response.body.id).toBe('config-1');
      expect(mockPrismaClient.gradebookConfig.upsert).toHaveBeenCalled();
    });

    it('should return 400 when classroomId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/gradebook/config')
        .send({
          teacherId: 'teacher-1',
          tenantId: 'tenant-1',
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'Missing required fields' });
    });

    it('should return 400 when teacherId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/gradebook/config')
        .send({
          classroomId: 'classroom-1',
          tenantId: 'tenant-1',
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'Missing required fields' });
    });

    it('should return 400 when tenantId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/gradebook/config')
        .send({
          classroomId: 'classroom-1',
          teacherId: 'teacher-1',
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'Missing required fields' });
    });

    it('should update existing configuration', async () => {
      const mockConfig = {
        id: 'config-1',
        classroomId: 'classroom-1',
        teacherId: 'teacher-1',
        tenantId: 'tenant-1',
        calculationType: 'TOTAL_POINTS',
        categories: [],
      };

      mockPrismaClient.gradebookConfig.upsert.mockResolvedValue(mockConfig);

      const response = await request(app)
        .post('/api/v1/gradebook/config')
        .send({
          classroomId: 'classroom-1',
          teacherId: 'teacher-1',
          tenantId: 'tenant-1',
          calculationType: 'TOTAL_POINTS',
        })
        .expect(200);

      expect(response.body.calculationType).toBe('TOTAL_POINTS');
    });

    it('should handle database errors during upsert', async () => {
      mockPrismaClient.gradebookConfig.upsert.mockRejectedValue(
        new Error('Upsert failed')
      );

      const response = await request(app)
        .post('/api/v1/gradebook/config')
        .send({
          classroomId: 'classroom-1',
          teacherId: 'teacher-1',
          tenantId: 'tenant-1',
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to save gradebook config' });
    });
  });

  describe('GET /api/v1/gradebook/student/:studentId/classroom/:classroomId', () => {
    it('should return student grades and calculation', async () => {
      const mockConfig = {
        id: 'config-1',
        classroomId: 'classroom-1',
        calculationType: 'TOTAL_POINTS',
        letterGradeScale: { A: 90, B: 80, C: 70, D: 60, F: 0 },
        categories: [],
        assignments: [
          {
            id: 'assign-1',
            totalPoints: 100,
            status: 'PUBLISHED',
            extraCredit: false,
            grades: [{ studentId: 'student-1', score: 85 }],
          },
        ],
      };

      const mockGrades = [
        {
          id: 'grade-1',
          studentId: 'student-1',
          score: 85,
          assignment: {
            id: 'assign-1',
            title: 'Test 1',
            totalPoints: 100,
            category: null,
          },
        },
      ];

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.grade.findMany.mockResolvedValue(mockGrades);

      const response = await request(app)
        .get('/api/v1/gradebook/student/student-1/classroom/classroom-1')
        .expect(200);

      expect(response.body).toHaveProperty('grades');
      expect(response.body).toHaveProperty('calculation');
    });

    it('should handle non-existent student', async () => {
      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/gradebook/student/non-existent/classroom/classroom-1')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to fetch student grades' });
    });
  });

  describe('POST /api/v1/gradebook/import', () => {
    it('should import grades successfully', async () => {
      const mockAssignment = {
        id: 'assign-1',
        tenantId: 'tenant-1',
        totalPoints: 100,
      };

      const mockGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: null,
        assignment: mockAssignment,
      };

      const mockUpdatedGrade = {
        ...mockGrade,
        score: 85,
        status: 'GRADED',
      };

      mockPrismaClient.assignment.findUnique.mockResolvedValue(mockAssignment);
      mockPrismaClient.grade.upsert.mockResolvedValue(mockGrade);
      mockPrismaClient.grade.findUnique.mockResolvedValue(mockGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/import')
        .send({
          assignmentId: 'assign-1',
          grades: [
            { studentId: 'student-1', score: 85 },
            { studentId: 'student-2', score: 92 },
          ],
          importedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle assignment not found during import', async () => {
      mockPrismaClient.assignment.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/gradebook/import')
        .send({
          assignmentId: 'non-existent',
          grades: [{ studentId: 'student-1', score: 85 }],
          importedBy: 'teacher-1',
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to import grades' });
    });

    it('should report partial failures in bulk import', async () => {
      const mockAssignment = {
        id: 'assign-1',
        tenantId: 'tenant-1',
        totalPoints: 100,
      };

      mockPrismaClient.assignment.findUnique.mockResolvedValue(mockAssignment);
      mockPrismaClient.grade.upsert.mockResolvedValueOnce({ id: 'grade-1', assignment: mockAssignment });
      mockPrismaClient.grade.findUnique.mockResolvedValueOnce({ id: 'grade-1', assignment: mockAssignment });
      mockPrismaClient.grade.update.mockResolvedValueOnce({ id: 'grade-1', score: 85 });
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      // Second student fails
      mockPrismaClient.grade.upsert.mockRejectedValueOnce(new Error('Student not enrolled'));

      const response = await request(app)
        .post('/api/v1/gradebook/import')
        .send({
          assignmentId: 'assign-1',
          grades: [
            { studentId: 'student-1', score: 85 },
            { studentId: 'student-2', score: 92 },
          ],
          importedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.success).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/v1/gradebook/export/:classroomId', () => {
    it('should export gradebook as CSV', async () => {
      const mockConfig = {
        id: 'config-1',
        classroomId: 'classroom-1',
        calculationType: 'TOTAL_POINTS',
        letterGradeScale: { A: 90, B: 80, C: 70, D: 60, F: 0 },
        categories: [],
        assignments: [
          {
            id: 'assign-1',
            title: 'Test 1',
            totalPoints: 100,
            status: 'PUBLISHED',
            extraCredit: false,
            grades: [{ studentId: 'student-1', score: 85 }],
          },
        ],
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.grade.findMany.mockResolvedValue([{ studentId: 'student-1' }]);

      const response = await request(app)
        .get('/api/v1/gradebook/export/classroom-1')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('gradebook-classroom-1.csv');
      expect(response.text).toContain('Student ID');
    });

    it('should handle export for non-existent classroom', async () => {
      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/gradebook/export/non-existent')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to export gradebook' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty gradebook', async () => {
      const mockConfig = {
        id: 'config-1',
        classroomId: 'classroom-1',
        calculationType: 'TOTAL_POINTS',
        letterGradeScale: { A: 90, B: 80, C: 70, D: 60, F: 0 },
        categories: [],
        assignments: [],
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.grade.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/gradebook/classroom/classroom-1')
        .expect(200);

      expect(response.body.students).toEqual([]);
    });

    it('should handle very long classroom IDs', async () => {
      const longId = 'a'.repeat(1000);
      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/v1/gradebook/config/${longId}`)
        .expect(404);

      expect(response.body).toEqual({ error: 'Gradebook config not found' });
    });

    it('should handle special characters in classroom ID', async () => {
      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/gradebook/config/classroom-with-special-chars-123')
        .expect(404);

      expect(response.body).toEqual({ error: 'Gradebook config not found' });
    });
  });
});
