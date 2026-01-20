/**
 * Grades Tests
 *
 * Tests for grade submission and update operations including:
 * - POST /gradebook/grades - Submit grade
 * - PUT /gradebook/grades/:id - Update grade
 * - GET /gradebook/grades/:id/history - Get grade history
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('Grades', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('POST /api/v1/gradebook/grades', () => {
    it('should submit a new grade', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: null,
        originalScore: null,
        status: 'NOT_SUBMITTED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 85,
        maxPoints: 100,
        percentage: 85,
        status: 'GRADED',
        gradedBy: 'teacher-1',
        gradedAt: new Date(),
        isOverride: false,
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 85,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.score).toBe(85);
      expect(response.body.percentage).toBe(85);
      expect(response.body.status).toBe('GRADED');
    });

    it('should submit grade with feedback', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: null,
        status: 'NOT_SUBMITTED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 90,
        feedback: 'Great work!',
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 90,
          feedback: 'Great work!',
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.feedback).toBe('Great work!');
    });

    it('should submit grade with private notes', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: null,
        status: 'NOT_SUBMITTED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 75,
        privateNotes: 'Student struggled with section 3',
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 75,
          privateNotes: 'Student struggled with section 3',
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.privateNotes).toBe('Student struggled with section 3');
    });

    it('should handle grade override with reason', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 70,
        originalScore: null,
        status: 'GRADED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 85,
        originalScore: 70,
        isOverride: true,
        overrideReason: 'Late submission accepted due to illness',
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 85,
          overrideReason: 'Late submission accepted due to illness',
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.isOverride).toBe(true);
      expect(response.body.originalScore).toBe(70);
    });

    it('should handle null score (ungrade)', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 85,
        status: 'GRADED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: null,
        percentage: null,
        status: 'NOT_SUBMITTED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: null,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.score).toBeNull();
    });

    it('should fail when grade not found', async () => {
      mockPrismaClient.grade.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'non-existent',
          score: 85,
          gradedBy: 'teacher-1',
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to submit grade' });
    });

    it('should submit grade with rubric scores', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: null,
        status: 'NOT_SUBMITTED',
        assignment: { totalPoints: 100 },
      };

      const rubricScores = {
        'criterion-1': { score: 4, feedback: 'Excellent analysis' },
        'criterion-2': { score: 3, feedback: 'Good structure' },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 87,
        rubricScores,
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 87,
          rubricScores,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.rubricScores).toEqual(rubricScores);
    });

    it('should update grade status', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 85,
        status: 'GRADED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 85,
        status: 'EXCUSED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          status: 'EXCUSED',
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.status).toBe('EXCUSED');
    });
  });

  describe('PUT /api/v1/gradebook/grades/:id', () => {
    it('should update grade by ID', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 75,
        status: 'GRADED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 80,
        percentage: 80,
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .put('/api/v1/gradebook/grades/grade-1')
        .send({
          score: 80,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.score).toBe(80);
    });

    it('should update grade feedback', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 85,
        feedback: 'Good job',
        status: 'GRADED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 85,
        feedback: 'Updated feedback: Excellent improvement!',
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .put('/api/v1/gradebook/grades/grade-1')
        .send({
          feedback: 'Updated feedback: Excellent improvement!',
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.feedback).toBe('Updated feedback: Excellent improvement!');
    });

    it('should handle update of non-existent grade', async () => {
      mockPrismaClient.grade.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/v1/gradebook/grades/non-existent')
        .send({
          score: 85,
          gradedBy: 'teacher-1',
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to update grade' });
    });
  });

  describe('GET /api/v1/gradebook/grades/:id/history', () => {
    it('should return grade history', async () => {
      const mockHistory = [
        {
          id: 'log-1',
          gradeId: 'grade-1',
          action: 'updated',
          fieldChanged: 'score',
          oldValue: '70',
          newValue: '85',
          changedBy: 'teacher-1',
          changedAt: new Date('2025-01-15'),
        },
        {
          id: 'log-2',
          gradeId: 'grade-1',
          action: 'created',
          fieldChanged: null,
          oldValue: null,
          newValue: '70',
          changedBy: 'teacher-1',
          changedAt: new Date('2025-01-10'),
        },
      ];

      mockPrismaClient.gradeAuditLog.findMany.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/v1/gradebook/grades/grade-1/history')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].action).toBe('updated');
      expect(response.body[0].oldValue).toBe('70');
      expect(response.body[0].newValue).toBe('85');
    });

    it('should return empty array for grade with no history', async () => {
      mockPrismaClient.gradeAuditLog.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/gradebook/grades/grade-1/history')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return history sorted by date descending', async () => {
      const mockHistory = [
        { id: 'log-1', changedAt: new Date('2025-01-20') },
        { id: 'log-2', changedAt: new Date('2025-01-15') },
        { id: 'log-3', changedAt: new Date('2025-01-10') },
      ];

      mockPrismaClient.gradeAuditLog.findMany.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/v1/gradebook/grades/grade-1/history')
        .expect(200);

      expect(mockPrismaClient.gradeAuditLog.findMany).toHaveBeenCalledWith({
        where: { gradeId: 'grade-1' },
        orderBy: { changedAt: 'desc' },
      });
    });

    it('should include override history', async () => {
      const mockHistory = [
        {
          id: 'log-1',
          gradeId: 'grade-1',
          action: 'override_applied',
          fieldChanged: 'score',
          oldValue: '70',
          newValue: '85',
          reason: 'Medical extension granted',
          changedBy: 'teacher-1',
          changedAt: new Date('2025-01-15'),
        },
      ];

      mockPrismaClient.gradeAuditLog.findMany.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/v1/gradebook/grades/grade-1/history')
        .expect(200);

      expect(response.body[0].action).toBe('override_applied');
      expect(response.body[0].reason).toBe('Medical extension granted');
    });

    it('should handle database errors when fetching history', async () => {
      mockPrismaClient.gradeAuditLog.findMany.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/v1/gradebook/grades/grade-1/history')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to fetch grade history' });
    });
  });

  describe('Grade Calculations', () => {
    it('should calculate percentage correctly for full marks', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: null,
        status: 'NOT_SUBMITTED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 100,
        maxPoints: 100,
        percentage: 100,
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 100,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.percentage).toBe(100);
    });

    it('should calculate percentage correctly for partial marks', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: null,
        status: 'NOT_SUBMITTED',
        assignment: { totalPoints: 50 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 35,
        maxPoints: 50,
        percentage: 70,
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 35,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.percentage).toBe(70);
    });

    it('should handle zero score', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: null,
        status: 'NOT_SUBMITTED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 0,
        maxPoints: 100,
        percentage: 0,
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 0,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.score).toBe(0);
      expect(response.body.percentage).toBe(0);
    });

    it('should handle extra credit (score > maxPoints)', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: null,
        status: 'NOT_SUBMITTED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 110,
        maxPoints: 100,
        percentage: 110,
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 110,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.score).toBe(110);
      expect(response.body.percentage).toBe(110);
    });
  });

  describe('Grade Status Transitions', () => {
    const statuses = [
      'NOT_SUBMITTED',
      'SUBMITTED',
      'GRADED',
      'RETURNED',
      'MISSING',
      'EXCUSED',
      'INCOMPLETE',
    ];

    statuses.forEach((status) => {
      it(`should allow setting status to ${status}`, async () => {
        const mockExistingGrade = {
          id: 'grade-1',
          assignmentId: 'assign-1',
          studentId: 'student-1',
          score: 85,
          status: 'GRADED',
          assignment: { totalPoints: 100 },
        };

        const mockUpdatedGrade = {
          id: 'grade-1',
          score: 85,
          status,
        };

        mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
        mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
        mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

        const response = await request(app)
          .post('/api/v1/gradebook/grades')
          .send({
            gradeId: 'grade-1',
            status,
            gradedBy: 'teacher-1',
          })
          .expect(200);

        expect(response.body.status).toBe(status);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long feedback text', async () => {
      const longFeedback = 'A'.repeat(5000);
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 85,
        status: 'GRADED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 85,
        feedback: longFeedback,
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          feedback: longFeedback,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.feedback.length).toBe(5000);
    });

    it('should handle decimal scores', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: null,
        status: 'NOT_SUBMITTED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 87.5,
        maxPoints: 100,
        percentage: 87.5,
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 87.5,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.score).toBe(87.5);
    });

    it('should handle special characters in feedback', async () => {
      const specialFeedback = "Great work! Keep it up! <script>alert('xss')</script>";
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 90,
        status: 'GRADED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 90,
        feedback: specialFeedback,
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          feedback: specialFeedback,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      // Should store as-is, sanitization should happen on display
      expect(response.body.feedback).toBe(specialFeedback);
    });

    it('should handle unicode in feedback', async () => {
      const unicodeFeedback = 'Excellent! Great job! Muy bien!';
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 95,
        status: 'GRADED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: 95,
        feedback: unicodeFeedback,
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          feedback: unicodeFeedback,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.feedback).toBe(unicodeFeedback);
    });

    it('should handle concurrent grade updates gracefully', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 80,
        status: 'GRADED',
        assignment: { totalPoints: 100 },
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockRejectedValue(
        new Error('Concurrent modification detected')
      );

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 85,
          gradedBy: 'teacher-1',
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to submit grade' });
    });

    it('should handle negative scores (penalty case)', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: null,
        status: 'NOT_SUBMITTED',
        assignment: { totalPoints: 100 },
      };

      const mockUpdatedGrade = {
        id: 'grade-1',
        score: -10,
        maxPoints: 100,
        percentage: -10,
        status: 'GRADED',
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue(mockUpdatedGrade);
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: -10,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      // Note: Business logic may want to reject this
      expect(response.body.score).toBe(-10);
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log on grade update', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 70,
        status: 'GRADED',
        assignment: { totalPoints: 100 },
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue({
        id: 'grade-1',
        score: 85,
        status: 'GRADED',
      });
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({
        id: 'log-1',
        gradeId: 'grade-1',
        action: 'updated',
      });

      await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 85,
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(mockPrismaClient.gradeAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          gradeId: 'grade-1',
          assignmentId: 'assign-1',
          studentId: 'student-1',
          action: 'updated',
          fieldChanged: 'score',
          oldValue: '70',
          newValue: '85',
          changedBy: 'teacher-1',
        }),
      });
    });

    it('should create audit log with override reason', async () => {
      const mockExistingGrade = {
        id: 'grade-1',
        assignmentId: 'assign-1',
        studentId: 'student-1',
        score: 70,
        status: 'GRADED',
        assignment: { totalPoints: 100 },
      };

      mockPrismaClient.grade.findUnique.mockResolvedValue(mockExistingGrade);
      mockPrismaClient.grade.update.mockResolvedValue({
        id: 'grade-1',
        score: 85,
        isOverride: true,
        status: 'GRADED',
      });
      mockPrismaClient.gradeAuditLog.create.mockResolvedValue({});

      await request(app)
        .post('/api/v1/gradebook/grades')
        .send({
          gradeId: 'grade-1',
          score: 85,
          overrideReason: 'Disability accommodation',
          gradedBy: 'teacher-1',
        })
        .expect(200);

      expect(mockPrismaClient.gradeAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'override_applied',
          reason: 'Disability accommodation',
        }),
      });
    });
  });
});
