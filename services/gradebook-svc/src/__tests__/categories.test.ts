/**
 * Grade Categories Tests
 *
 * Tests for grade category operations including:
 * - POST /gradebook/categories - Create category
 * - PUT /gradebook/categories/weights - Update weights
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
    findUnique: vi.fn(),
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

describe('Grade Categories', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('POST /api/v1/gradebook/categories', () => {
    it('should create a new category', async () => {
      const mockCategory = {
        id: 'cat-1',
        gradebookConfigId: 'config-1',
        name: 'Homework',
        weight: 30,
        color: '#4CAF50',
        dropLowest: 1,
        orderIndex: 0,
      };

      mockPrismaClient.gradeCategory.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: 'Homework',
          weight: 30,
          color: '#4CAF50',
          dropLowest: 1,
          orderIndex: 0,
        })
        .expect(200);

      expect(response.body.id).toBe('cat-1');
      expect(response.body.name).toBe('Homework');
      expect(response.body.weight).toBe(30);
      expect(mockPrismaClient.gradeCategory.create).toHaveBeenCalledWith({
        data: {
          gradebookConfigId: 'config-1',
          name: 'Homework',
          weight: 30,
          color: '#4CAF50',
          dropLowest: 1,
          orderIndex: 0,
        },
      });
    });

    it('should create category with minimal required fields', async () => {
      const mockCategory = {
        id: 'cat-1',
        gradebookConfigId: 'config-1',
        name: 'Tests',
        weight: 70,
        color: null,
        dropLowest: 0,
        orderIndex: 0,
      };

      mockPrismaClient.gradeCategory.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: 'Tests',
          weight: 70,
        })
        .expect(200);

      expect(response.body.name).toBe('Tests');
      expect(response.body.weight).toBe(70);
    });

    it('should return 400 when gradebookConfigId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          name: 'Homework',
          weight: 30,
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'Missing required fields' });
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          weight: 30,
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'Missing required fields' });
    });

    it('should return 400 when weight is missing', async () => {
      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: 'Homework',
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'Missing required fields' });
    });

    it('should accept weight of 0', async () => {
      const mockCategory = {
        id: 'cat-1',
        gradebookConfigId: 'config-1',
        name: 'Extra Credit',
        weight: 0,
        dropLowest: 0,
        orderIndex: 0,
      };

      mockPrismaClient.gradeCategory.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: 'Extra Credit',
          weight: 0,
        })
        .expect(200);

      expect(response.body.weight).toBe(0);
    });

    it('should handle database errors during category creation', async () => {
      mockPrismaClient.gradeCategory.create.mockRejectedValue(
        new Error('Foreign key constraint failed')
      );

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'non-existent-config',
          name: 'Homework',
          weight: 30,
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to create category' });
    });

    it('should handle duplicate category names gracefully', async () => {
      mockPrismaClient.gradeCategory.create.mockRejectedValue(
        new Error('Unique constraint violation')
      );

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: 'Homework',
          weight: 30,
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to create category' });
    });
  });

  describe('PUT /api/v1/gradebook/categories/weights', () => {
    it('should update category weights', async () => {
      mockPrismaClient.gradeCategory.update
        .mockResolvedValueOnce({ id: 'cat-1', weight: 40 })
        .mockResolvedValueOnce({ id: 'cat-2', weight: 60 });
      mockPrismaClient.$transaction.mockImplementation((operations) => Promise.all(operations));

      const response = await request(app)
        .put('/api/v1/gradebook/categories/weights')
        .send({
          categories: [
            { id: 'cat-1', weight: 40 },
            { id: 'cat-2', weight: 60 },
          ],
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should return 400 when categories is not an array', async () => {
      const response = await request(app)
        .put('/api/v1/gradebook/categories/weights')
        .send({
          categories: 'invalid',
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'Categories must be an array' });
    });

    it('should return 400 when categories is null', async () => {
      const response = await request(app)
        .put('/api/v1/gradebook/categories/weights')
        .send({
          categories: null,
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'Categories must be an array' });
    });

    it('should return 400 when categories is an object', async () => {
      const response = await request(app)
        .put('/api/v1/gradebook/categories/weights')
        .send({
          categories: { id: 'cat-1', weight: 40 },
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'Categories must be an array' });
    });

    it('should handle empty categories array', async () => {
      mockPrismaClient.$transaction.mockResolvedValue([]);

      const response = await request(app)
        .put('/api/v1/gradebook/categories/weights')
        .send({
          categories: [],
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should handle single category update', async () => {
      mockPrismaClient.gradeCategory.update.mockResolvedValue({ id: 'cat-1', weight: 100 });
      mockPrismaClient.$transaction.mockImplementation((operations) => Promise.all(operations));

      const response = await request(app)
        .put('/api/v1/gradebook/categories/weights')
        .send({
          categories: [{ id: 'cat-1', weight: 100 }],
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should handle database transaction errors', async () => {
      mockPrismaClient.$transaction.mockRejectedValue(
        new Error('Transaction failed')
      );

      const response = await request(app)
        .put('/api/v1/gradebook/categories/weights')
        .send({
          categories: [
            { id: 'cat-1', weight: 40 },
            { id: 'cat-2', weight: 60 },
          ],
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to update category weights' });
    });

    it('should handle non-existent category in batch update', async () => {
      mockPrismaClient.$transaction.mockRejectedValue(
        new Error('Record not found')
      );

      const response = await request(app)
        .put('/api/v1/gradebook/categories/weights')
        .send({
          categories: [
            { id: 'non-existent', weight: 50 },
          ],
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to update category weights' });
    });
  });

  describe('Category Business Logic', () => {
    it('should allow weights that sum to 100', async () => {
      mockPrismaClient.gradeCategory.update
        .mockResolvedValueOnce({ id: 'cat-1', weight: 30 })
        .mockResolvedValueOnce({ id: 'cat-2', weight: 30 })
        .mockResolvedValueOnce({ id: 'cat-3', weight: 40 });
      mockPrismaClient.$transaction.mockImplementation((operations) => Promise.all(operations));

      const response = await request(app)
        .put('/api/v1/gradebook/categories/weights')
        .send({
          categories: [
            { id: 'cat-1', weight: 30 },
            { id: 'cat-2', weight: 30 },
            { id: 'cat-3', weight: 40 },
          ],
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should create category with high order index', async () => {
      const mockCategory = {
        id: 'cat-10',
        gradebookConfigId: 'config-1',
        name: 'New Category',
        weight: 10,
        orderIndex: 999,
        dropLowest: 0,
      };

      mockPrismaClient.gradeCategory.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: 'New Category',
          weight: 10,
          orderIndex: 999,
        })
        .expect(200);

      expect(response.body.orderIndex).toBe(999);
    });

    it('should create category with dropLowest value', async () => {
      const mockCategory = {
        id: 'cat-1',
        gradebookConfigId: 'config-1',
        name: 'Quizzes',
        weight: 20,
        dropLowest: 2,
        orderIndex: 0,
      };

      mockPrismaClient.gradeCategory.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: 'Quizzes',
          weight: 20,
          dropLowest: 2,
        })
        .expect(200);

      expect(response.body.dropLowest).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long category names', async () => {
      const longName = 'A'.repeat(500);
      const mockCategory = {
        id: 'cat-1',
        gradebookConfigId: 'config-1',
        name: longName,
        weight: 10,
        dropLowest: 0,
        orderIndex: 0,
      };

      mockPrismaClient.gradeCategory.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: longName,
          weight: 10,
        })
        .expect(200);

      expect(response.body.name).toBe(longName);
    });

    it('should handle category name with special characters', async () => {
      const specialName = "Homework & Projects (Week 1-4) - Extra Credit!";
      const mockCategory = {
        id: 'cat-1',
        gradebookConfigId: 'config-1',
        name: specialName,
        weight: 25,
        dropLowest: 0,
        orderIndex: 0,
      };

      mockPrismaClient.gradeCategory.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: specialName,
          weight: 25,
        })
        .expect(200);

      expect(response.body.name).toBe(specialName);
    });

    it('should handle decimal weights', async () => {
      const mockCategory = {
        id: 'cat-1',
        gradebookConfigId: 'config-1',
        name: 'Participation',
        weight: 33.33,
        dropLowest: 0,
        orderIndex: 0,
      };

      mockPrismaClient.gradeCategory.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: 'Participation',
          weight: 33.33,
        })
        .expect(200);

      expect(response.body.weight).toBe(33.33);
    });

    it('should handle negative weight (edge case)', async () => {
      const mockCategory = {
        id: 'cat-1',
        gradebookConfigId: 'config-1',
        name: 'Penalty',
        weight: -10,
        dropLowest: 0,
        orderIndex: 0,
      };

      mockPrismaClient.gradeCategory.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: 'Penalty',
          weight: -10,
        })
        .expect(200);

      // Note: Business logic may want to reject this, but currently it's accepted
      expect(response.body.weight).toBe(-10);
    });

    it('should handle large number of categories in batch update', async () => {
      const categories = Array.from({ length: 20 }, (_, i) => ({
        id: `cat-${i}`,
        weight: 5,
      }));

      mockPrismaClient.$transaction.mockResolvedValue(
        categories.map((c) => ({ id: c.id, weight: c.weight }))
      );

      const response = await request(app)
        .put('/api/v1/gradebook/categories/weights')
        .send({ categories })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should handle color code validation', async () => {
      const mockCategory = {
        id: 'cat-1',
        gradebookConfigId: 'config-1',
        name: 'Homework',
        weight: 30,
        color: '#FF5733',
        dropLowest: 0,
        orderIndex: 0,
      };

      mockPrismaClient.gradeCategory.create.mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/api/v1/gradebook/categories')
        .send({
          gradebookConfigId: 'config-1',
          name: 'Homework',
          weight: 30,
          color: '#FF5733',
        })
        .expect(200);

      expect(response.body.color).toBe('#FF5733');
    });
  });
});
