/**
 * Assignments Tests
 *
 * Tests for assignment operations including:
 * - POST /gradebook/assignments - Create assignment
 * - GET /gradebook/assignments/:id - Get assignment
 * - PUT /gradebook/assignments/:id - Update assignment
 * - POST /gradebook/assignments/:id/publish - Publish assignment
 * - DELETE /gradebook/assignments/:id - Delete assignment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock Prisma client
const mockPrismaClient = {
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
  $transaction: vi.fn((operations) => Promise.all(operations)),
};

vi.mock('../generated/prisma-client/index.js', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrismaClient),
}));

// Import after mocking
import { createApp } from '../app.js';

describe('Assignments', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('POST /api/v1/gradebook/assignments', () => {
    it('should create a new assignment', async () => {
      const mockConfig = {
        id: 'config-1',
        tenantId: 'tenant-1',
      };

      const mockAssignment = {
        id: 'assign-1',
        tenantId: 'tenant-1',
        gradebookConfigId: 'config-1',
        categoryId: 'cat-1',
        title: 'Chapter 1 Quiz',
        description: 'Quiz on Chapter 1 material',
        type: 'QUIZ',
        totalPoints: 50,
        extraCredit: false,
        dueDate: new Date('2025-02-01'),
        status: 'DRAFT',
        createdBy: 'teacher-1',
        category: { id: 'cat-1', name: 'Quizzes' },
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.assignment.create.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'config-1',
          categoryId: 'cat-1',
          title: 'Chapter 1 Quiz',
          description: 'Quiz on Chapter 1 material',
          type: 'QUIZ',
          totalPoints: 50,
          dueDate: '2025-02-01',
          createdBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.id).toBe('assign-1');
      expect(response.body.title).toBe('Chapter 1 Quiz');
      expect(response.body.status).toBe('DRAFT');
    });

    it('should create assignment without category', async () => {
      const mockConfig = {
        id: 'config-1',
        tenantId: 'tenant-1',
      };

      const mockAssignment = {
        id: 'assign-1',
        tenantId: 'tenant-1',
        gradebookConfigId: 'config-1',
        categoryId: null,
        title: 'Extra Assignment',
        type: 'HOMEWORK',
        totalPoints: 100,
        status: 'DRAFT',
        category: null,
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.assignment.create.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'config-1',
          title: 'Extra Assignment',
          type: 'HOMEWORK',
          totalPoints: 100,
          createdBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.categoryId).toBeNull();
    });

    it('should create extra credit assignment', async () => {
      const mockConfig = {
        id: 'config-1',
        tenantId: 'tenant-1',
      };

      const mockAssignment = {
        id: 'assign-1',
        gradebookConfigId: 'config-1',
        title: 'Bonus Quiz',
        type: 'QUIZ',
        totalPoints: 10,
        extraCredit: true,
        status: 'DRAFT',
        category: null,
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.assignment.create.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'config-1',
          title: 'Bonus Quiz',
          type: 'QUIZ',
          totalPoints: 10,
          extraCredit: true,
          createdBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.extraCredit).toBe(true);
    });

    it('should create assignment with late submission settings', async () => {
      const mockConfig = {
        id: 'config-1',
        tenantId: 'tenant-1',
      };

      const mockAssignment = {
        id: 'assign-1',
        gradebookConfigId: 'config-1',
        title: 'Essay',
        type: 'PROJECT',
        totalPoints: 100,
        allowLateSubmissions: true,
        latePenaltyPercent: 10,
        status: 'DRAFT',
        category: null,
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.assignment.create.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'config-1',
          title: 'Essay',
          type: 'PROJECT',
          totalPoints: 100,
          allowLateSubmissions: true,
          latePenaltyPercent: 10,
          createdBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.allowLateSubmissions).toBe(true);
      expect(response.body.latePenaltyPercent).toBe(10);
    });

    it('should fail when gradebook config not found', async () => {
      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'non-existent',
          title: 'Test',
          type: 'QUIZ',
          totalPoints: 50,
          createdBy: 'teacher-1',
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to create assignment' });
    });

    it('should handle database errors during creation', async () => {
      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        tenantId: 'tenant-1',
      });
      mockPrismaClient.assignment.create.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'config-1',
          title: 'Test',
          type: 'QUIZ',
          totalPoints: 50,
          createdBy: 'teacher-1',
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to create assignment' });
    });
  });

  describe('GET /api/v1/gradebook/assignments/:id', () => {
    it('should return assignment details', async () => {
      const mockAssignment = {
        id: 'assign-1',
        title: 'Chapter 1 Quiz',
        type: 'QUIZ',
        totalPoints: 50,
        status: 'PUBLISHED',
        category: { id: 'cat-1', name: 'Quizzes' },
        grades: [],
      };

      mockPrismaClient.assignment.update.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .get('/api/v1/gradebook/assignments/assign-1')
        .expect(200);

      expect(response.body.id).toBe('assign-1');
      expect(response.body.title).toBe('Chapter 1 Quiz');
    });

    it('should return 404 when assignment not found', async () => {
      mockPrismaClient.assignment.update.mockRejectedValue(
        new Error('Record not found')
      );

      const response = await request(app)
        .get('/api/v1/gradebook/assignments/non-existent')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to fetch assignment' });
    });
  });

  describe('PUT /api/v1/gradebook/assignments/:id', () => {
    it('should update assignment title', async () => {
      const mockAssignment = {
        id: 'assign-1',
        title: 'Updated Quiz Title',
        type: 'QUIZ',
        totalPoints: 50,
        status: 'DRAFT',
        category: null,
        grades: [],
      };

      mockPrismaClient.assignment.update.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .put('/api/v1/gradebook/assignments/assign-1')
        .send({ title: 'Updated Quiz Title' })
        .expect(200);

      expect(response.body.title).toBe('Updated Quiz Title');
    });

    it('should update assignment points', async () => {
      const mockAssignment = {
        id: 'assign-1',
        title: 'Quiz',
        totalPoints: 100,
        status: 'DRAFT',
        category: null,
        grades: [],
      };

      mockPrismaClient.assignment.update.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .put('/api/v1/gradebook/assignments/assign-1')
        .send({ totalPoints: 100 })
        .expect(200);

      expect(response.body.totalPoints).toBe(100);
    });

    it('should update assignment due date', async () => {
      const dueDate = new Date('2025-03-01');
      const mockAssignment = {
        id: 'assign-1',
        title: 'Quiz',
        totalPoints: 50,
        dueDate,
        status: 'DRAFT',
        category: null,
        grades: [],
      };

      mockPrismaClient.assignment.update.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .put('/api/v1/gradebook/assignments/assign-1')
        .send({ dueDate: '2025-03-01' })
        .expect(200);

      expect(response.body.dueDate).toBeDefined();
    });

    it('should update assignment category', async () => {
      const mockAssignment = {
        id: 'assign-1',
        title: 'Quiz',
        categoryId: 'cat-2',
        status: 'DRAFT',
        category: { id: 'cat-2', name: 'Tests' },
        grades: [],
      };

      mockPrismaClient.assignment.update.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .put('/api/v1/gradebook/assignments/assign-1')
        .send({ categoryId: 'cat-2' })
        .expect(200);

      expect(response.body.categoryId).toBe('cat-2');
    });

    it('should handle update of non-existent assignment', async () => {
      mockPrismaClient.assignment.update.mockRejectedValue(
        new Error('Record not found')
      );

      const response = await request(app)
        .put('/api/v1/gradebook/assignments/non-existent')
        .send({ title: 'New Title' })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to update assignment' });
    });
  });

  describe('POST /api/v1/gradebook/assignments/:id/publish', () => {
    it('should publish assignment', async () => {
      const mockAssignment = {
        id: 'assign-1',
        title: 'Quiz',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };

      mockPrismaClient.assignment.update.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments/assign-1/publish')
        .expect(200);

      expect(response.body.status).toBe('PUBLISHED');
      expect(response.body.publishedAt).toBeDefined();
    });

    it('should handle publishing non-existent assignment', async () => {
      mockPrismaClient.assignment.update.mockRejectedValue(
        new Error('Record not found')
      );

      const response = await request(app)
        .post('/api/v1/gradebook/assignments/non-existent/publish')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to publish assignment' });
    });

    it('should set publishedAt timestamp on publish', async () => {
      const publishTime = new Date();
      const mockAssignment = {
        id: 'assign-1',
        status: 'PUBLISHED',
        publishedAt: publishTime,
      };

      mockPrismaClient.assignment.update.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments/assign-1/publish')
        .expect(200);

      expect(mockPrismaClient.assignment.update).toHaveBeenCalledWith({
        where: { id: 'assign-1' },
        data: {
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
        },
      });
    });
  });

  describe('DELETE /api/v1/gradebook/assignments/:id', () => {
    it('should delete assignment', async () => {
      mockPrismaClient.assignment.delete.mockResolvedValue({ id: 'assign-1' });

      const response = await request(app)
        .delete('/api/v1/gradebook/assignments/assign-1')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockPrismaClient.assignment.delete).toHaveBeenCalledWith({
        where: { id: 'assign-1' },
      });
    });

    it('should handle deleting non-existent assignment', async () => {
      mockPrismaClient.assignment.delete.mockRejectedValue(
        new Error('Record not found')
      );

      const response = await request(app)
        .delete('/api/v1/gradebook/assignments/non-existent')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to delete assignment' });
    });

    it('should handle deletion with related grades', async () => {
      // Some databases cascade delete, some fail
      mockPrismaClient.assignment.delete.mockRejectedValue(
        new Error('Foreign key constraint failed')
      );

      const response = await request(app)
        .delete('/api/v1/gradebook/assignments/assign-with-grades')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to delete assignment' });
    });
  });

  describe('Assignment Types', () => {
    const assignmentTypes = [
      'HOMEWORK',
      'QUIZ',
      'TEST',
      'EXAM',
      'PROJECT',
      'LAB',
      'PARTICIPATION',
      'DISCUSSION',
      'OTHER',
    ];

    assignmentTypes.forEach((type) => {
      it(`should create ${type} type assignment`, async () => {
        const mockConfig = { id: 'config-1', tenantId: 'tenant-1' };
        const mockAssignment = {
          id: 'assign-1',
          type,
          title: `${type} Assignment`,
          totalPoints: 100,
          status: 'DRAFT',
          category: null,
        };

        mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
        mockPrismaClient.assignment.create.mockResolvedValue(mockAssignment);

        const response = await request(app)
          .post('/api/v1/gradebook/assignments')
          .send({
            gradebookConfigId: 'config-1',
            title: `${type} Assignment`,
            type,
            totalPoints: 100,
            createdBy: 'teacher-1',
          })
          .expect(200);

        expect(response.body.type).toBe(type);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long assignment titles', async () => {
      const longTitle = 'A'.repeat(500);
      const mockConfig = { id: 'config-1', tenantId: 'tenant-1' };
      const mockAssignment = {
        id: 'assign-1',
        title: longTitle,
        type: 'HOMEWORK',
        totalPoints: 100,
        status: 'DRAFT',
        category: null,
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.assignment.create.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'config-1',
          title: longTitle,
          type: 'HOMEWORK',
          totalPoints: 100,
          createdBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.title).toBe(longTitle);
    });

    it('should handle assignment with 0 total points', async () => {
      const mockConfig = { id: 'config-1', tenantId: 'tenant-1' };
      const mockAssignment = {
        id: 'assign-1',
        title: 'Participation',
        type: 'PARTICIPATION',
        totalPoints: 0,
        status: 'DRAFT',
        category: null,
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.assignment.create.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'config-1',
          title: 'Participation',
          type: 'PARTICIPATION',
          totalPoints: 0,
          createdBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.totalPoints).toBe(0);
    });

    it('should handle assignment with very high points', async () => {
      const mockConfig = { id: 'config-1', tenantId: 'tenant-1' };
      const mockAssignment = {
        id: 'assign-1',
        title: 'Final Exam',
        type: 'EXAM',
        totalPoints: 10000,
        status: 'DRAFT',
        category: null,
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.assignment.create.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'config-1',
          title: 'Final Exam',
          type: 'EXAM',
          totalPoints: 10000,
          createdBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.totalPoints).toBe(10000);
    });

    it('should handle assignment with date range', async () => {
      const mockConfig = { id: 'config-1', tenantId: 'tenant-1' };
      const mockAssignment = {
        id: 'assign-1',
        title: 'Week 1 Homework',
        type: 'HOMEWORK',
        totalPoints: 50,
        availableFrom: new Date('2025-01-15'),
        availableUntil: new Date('2025-01-22'),
        dueDate: new Date('2025-01-20'),
        status: 'DRAFT',
        category: null,
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.assignment.create.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'config-1',
          title: 'Week 1 Homework',
          type: 'HOMEWORK',
          totalPoints: 50,
          availableFrom: '2025-01-15',
          availableUntil: '2025-01-22',
          dueDate: '2025-01-20',
          createdBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.availableFrom).toBeDefined();
      expect(response.body.availableUntil).toBeDefined();
    });

    it('should handle special characters in assignment title', async () => {
      const specialTitle = "Chapter 5 Quiz: The \"Great\" Gatsby & More!";
      const mockConfig = { id: 'config-1', tenantId: 'tenant-1' };
      const mockAssignment = {
        id: 'assign-1',
        title: specialTitle,
        type: 'QUIZ',
        totalPoints: 50,
        status: 'DRAFT',
        category: null,
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.assignment.create.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'config-1',
          title: specialTitle,
          type: 'QUIZ',
          totalPoints: 50,
          createdBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.title).toBe(specialTitle);
    });

    it('should handle assignment linked to assessment', async () => {
      const mockConfig = { id: 'config-1', tenantId: 'tenant-1' };
      const mockAssignment = {
        id: 'assign-1',
        title: 'Online Quiz',
        type: 'QUIZ',
        totalPoints: 50,
        assessmentId: 'assessment-123',
        status: 'DRAFT',
        category: null,
      };

      mockPrismaClient.gradebookConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrismaClient.assignment.create.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post('/api/v1/gradebook/assignments')
        .send({
          gradebookConfigId: 'config-1',
          title: 'Online Quiz',
          type: 'QUIZ',
          totalPoints: 50,
          assessmentId: 'assessment-123',
          createdBy: 'teacher-1',
        })
        .expect(200);

      expect(response.body.assessmentId).toBe('assessment-123');
    });
  });
});
