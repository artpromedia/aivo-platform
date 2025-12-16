import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { Express } from 'express';

// Integration tests - requires running database
// Skip if DATABASE_URL is not set
const skipIfNoDb = process.env.DATABASE_URL ? describe : describe.skip;

skipIfNoDb('Assessment Routes Integration', () => {
  let app: Express;
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-1000-000000000001';

  beforeAll(() => {
    app = createApp();
  });

  describe('Health Check', () => {
    it('GET /health should return ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok', service: 'assessment-svc' });
    });
  });

  describe('POST /api/v1/assessments', () => {
    it('should create a new assessment', async () => {
      const response = await request(app)
        .post('/api/v1/assessments')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .send({
          title: 'Integration Test Quiz',
          description: 'A quiz for integration testing',
          type: 'QUIZ',
          settings: {
            timeLimit: 15,
            passingScore: 70,
          },
          difficulty: 'EASY',
          estimatedMinutes: 10,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Integration Test Quiz');
      expect(response.body.type).toBe('QUIZ');
      expect(response.body.status).toBe('DRAFT');
    });

    it('should reject assessment without title', async () => {
      const response = await request(app)
        .post('/api/v1/assessments')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .send({
          type: 'QUIZ',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should reject request without tenant context', async () => {
      const response = await request(app).post('/api/v1/assessments').send({
        title: 'Test',
        type: 'QUIZ',
      });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/v1/assessments', () => {
    it('should list assessments with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/assessments')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('pageSize', 10);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/v1/assessments')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .query({ type: 'QUIZ' });

      expect(response.status).toBe(200);
      for (const assessment of response.body.data) {
        expect(assessment.type).toBe('QUIZ');
      }
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/assessments')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .query({ status: 'PUBLISHED' });

      expect(response.status).toBe(200);
      for (const assessment of response.body.data) {
        expect(assessment.status).toBe('PUBLISHED');
      }
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/v1/assessments')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .query({ search: 'Math' });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/questions', () => {
    it('should create a multiple choice question', async () => {
      const response = await request(app)
        .post('/api/v1/questions')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .send({
          type: 'MULTIPLE_CHOICE',
          stem: 'What is 1 + 1?',
          options: [
            { id: 'a', text: '1' },
            { id: 'b', text: '2' },
            { id: 'c', text: '3' },
          ],
          correctAnswer: { optionId: 'b' },
          difficulty: 'BEGINNER',
          points: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('MULTIPLE_CHOICE');
      expect(response.body.stem).toBe('What is 1 + 1?');
    });

    it('should create a true/false question', async () => {
      const response = await request(app)
        .post('/api/v1/questions')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .send({
          type: 'TRUE_FALSE',
          stem: 'The Earth is round.',
          correctAnswer: { value: true },
          explanation: 'The Earth is approximately spherical.',
        });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('TRUE_FALSE');
    });
  });

  describe('GET /api/v1/questions/:id', () => {
    it('should get question without correct answer by default', async () => {
      // First create a question
      const createResponse = await request(app)
        .post('/api/v1/questions')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .send({
          type: 'MULTIPLE_CHOICE',
          stem: 'Test question',
          correctAnswer: { optionId: 'a' },
        });

      const questionId = createResponse.body.id;

      // Get without answer
      const response = await request(app)
        .get(`/api/v1/questions/${questionId}`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('correctAnswer');
    });

    it('should include correct answer when requested', async () => {
      // First create a question
      const createResponse = await request(app)
        .post('/api/v1/questions')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .send({
          type: 'MULTIPLE_CHOICE',
          stem: 'Test question',
          correctAnswer: { optionId: 'a' },
        });

      const questionId = createResponse.body.id;

      // Get with answer
      const response = await request(app)
        .get(`/api/v1/questions/${questionId}`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .query({ includeAnswer: 'true' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('correctAnswer');
    });
  });

  describe('Attempt Flow', () => {
    let assessmentId: string;
    let questionId: string;
    let attemptId: string;

    beforeAll(async () => {
      // Create assessment
      const assessmentResponse = await request(app)
        .post('/api/v1/assessments')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .send({
          title: 'Attempt Flow Test',
          type: 'QUIZ',
          settings: { maxAttempts: 3 },
        });
      assessmentId = assessmentResponse.body.id;

      // Create question
      const questionResponse = await request(app)
        .post('/api/v1/questions')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .send({
          type: 'TRUE_FALSE',
          stem: 'Test question',
          correctAnswer: { value: true },
        });
      questionId = questionResponse.body.id;

      // Add question to assessment
      await request(app)
        .post(`/api/v1/assessments/${assessmentId}/questions`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .send({ questionId });

      // Publish assessment
      await request(app)
        .post(`/api/v1/assessments/${assessmentId}/publish`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId);
    });

    it('should start an attempt', async () => {
      const response = await request(app)
        .post('/api/v1/attempts')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .send({ assessmentId });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('IN_PROGRESS');
      attemptId = response.body.id;
    });

    it('should submit a response', async () => {
      const response = await request(app)
        .post(`/api/v1/attempts/${attemptId}/responses`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .send({
          questionId,
          response: { value: true },
          timeSpentSeconds: 15,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should submit the attempt', async () => {
      const response = await request(app)
        .post(`/api/v1/attempts/${attemptId}/submit`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.status).toMatch(/GRADED|GRADING/);
      expect(response.body).toHaveProperty('score');
    });

    it('should get attempt with responses', async () => {
      const response = await request(app)
        .get(`/api/v1/attempts/${attemptId}`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', userId)
        .query({ includeResponses: 'true' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('responses');
      expect(Array.isArray(response.body.responses)).toBe(true);
    });
  });
});
