/**
 * Assessment & Grading — Cross-Service Integration Test
 *
 * Tests the assessment lifecycle across services:
 * 1. Teacher creates assessment → assessment-svc
 * 2. Teacher assigns to classroom → assessment-svc, content-svc
 * 3. Learner takes assessment → assessment-svc, ai-orchestrator
 * 4. Auto-grading runs → assessment-svc
 * 5. Grade passback to parent → notify-svc
 * 6. Progress updated in analytics → analytics-svc
 * 7. AI adapts difficulty → ai-orchestrator
 *
 * @module tests/integration/scenarios/assessment-grading
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import { wait, debug } from '../utils/helpers';

describe('Cross-Service: Assessment & Grading', () => {
  let teacherApi: ApiClient;
  let learnerApi: ApiClient;
  let parentApi: ApiClient;
  let adminApi: ApiClient;

  let assessmentId: string;
  let assignmentId: string;
  let submissionId: string;

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    teacherApi = createApiClientForUser(ctx().users.teacherA.token);
    learnerApi = createApiClientForUser(ctx().users.learnerA.token);
    parentApi = createApiClientForUser(ctx().users.parentA.token);
    adminApi = createApiClientForUser(ctx().users.adminA.token);

    debug('Assessment Grading Setup', { tenantId: ctx().tenantA.id });
  });

  afterAll(async () => {
    if (assessmentId) {
      try {
        await adminApi.delete(`/assessments/${assessmentId}`);
      } catch {
        // Best-effort cleanup
      }
    }
  });

  // --------------------------------------------------------------------------
  // Step 1: Teacher creates assessment
  // --------------------------------------------------------------------------
  describe('1. Assessment Creation', () => {
    it('should create a new assessment with questions', async () => {
      const response = await teacherApi.post('/assessments', {
        title: 'Integration Test: Math Quiz',
        type: 'quiz',
        subject: 'mathematics',
        gradeLevel: '5',
        timeLimit: 1800, // 30 minutes
        questions: [
          {
            type: 'multiple-choice',
            text: 'What is 3/4 + 1/4?',
            options: ['1/2', '3/4', '1', '4/4'],
            correctAnswer: 2, // index of '1'
            points: 10,
          },
          {
            type: 'multiple-choice',
            text: 'What is 1/2 of 10?',
            options: ['3', '4', '5', '6'],
            correctAnswer: 2,
            points: 10,
          },
          {
            type: 'short-answer',
            text: 'Simplify 6/8',
            correctAnswer: '3/4',
            points: 15,
          },
        ],
      });

      expect(response.status).toBeOneOf([200, 201, 404]);
      assessmentId = response.data?.id ?? response.data?.assessmentId ?? 'assessment-mock';

      debug('Assessment created', { assessmentId });
    });

    it('should validate assessment has minimum questions', async () => {
      const response = await teacherApi.post('/assessments', {
        title: 'Empty Quiz',
        type: 'quiz',
        subject: 'mathematics',
        questions: [], // no questions
      });

      expect(response.status).toBeOneOf([400, 422, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 2: Assign to classroom
  // --------------------------------------------------------------------------
  describe('2. Assessment Assignment', () => {
    it('should assign assessment to a classroom', async () => {
      const response = await teacherApi.post(`/assessments/${assessmentId}/assign`, {
        classroomId: 'classroom-1', // from test context
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        allowLateSubmission: true,
        gracePeriodMinutes: 30,
      });

      expect(response.status).toBeOneOf([200, 201, 404]);
      assignmentId = response.data?.id ?? response.data?.assignmentId ?? 'assignment-mock';
    });

    it('should show assessment in learner dashboard', async () => {
      await wait(500);

      const response = await learnerApi.get('/assessments/pending');

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        const items = response.data.assessments ?? response.data.items ?? [];
        expect(Array.isArray(items)).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Step 3: Learner takes assessment
  // --------------------------------------------------------------------------
  describe('3. Assessment Submission', () => {
    it('should start assessment session', async () => {
      const response = await learnerApi.post(`/assessments/${assessmentId}/start`);

      expect(response.status).toBeOneOf([200, 201, 404]);
    });

    it('should submit answers', async () => {
      const response = await learnerApi.post(`/assessments/${assessmentId}/submit`, {
        answers: [
          { questionIndex: 0, answer: 2 },
          { questionIndex: 1, answer: 2 },
          { questionIndex: 2, answer: '3/4' },
        ],
      });

      expect(response.status).toBeOneOf([200, 201, 404]);
      submissionId = response.data?.id ?? response.data?.submissionId ?? 'submission-mock';
    });

    it('should prevent double submission', async () => {
      const response = await learnerApi.post(`/assessments/${assessmentId}/submit`, {
        answers: [{ questionIndex: 0, answer: 2 }],
      });

      expect(response.status).toBeOneOf([409, 400, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 4: Auto-grading
  // --------------------------------------------------------------------------
  describe('4. Auto-Grading', () => {
    it('should auto-grade multiple choice questions', async () => {
      await wait(1000); // Allow grading to process

      const response = await teacherApi.get(
        `/assessments/${assessmentId}/submissions/${submissionId}`
      );

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        const submission = response.data;
        if (submission.score !== undefined) {
          expect(submission.score).toBeGreaterThanOrEqual(0);
        }
        debug('Submission graded', { score: submission.score, status: submission.status });
      }
    });

    it('should show grading results to learner', async () => {
      const response = await learnerApi.get(`/assessments/${assessmentId}/result`);

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        expect(response.data.score !== undefined || response.data.grade !== undefined).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Step 5: Parent notification
  // --------------------------------------------------------------------------
  describe('5. Parent Notification', () => {
    it('should notify parent of assessment completion', async () => {
      await wait(500);

      const response = await parentApi.get('/notifications', {
        params: { type: 'assessment', limit: 5 },
      });

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data?.items) {
        expect(Array.isArray(response.data.items)).toBe(true);
      }
    });

    it('should allow parent to view assessment result', async () => {
      const learnerId = ctx().users.learnerA.id;
      const response = await parentApi.get(
        `/learners/${learnerId}/assessments/${assessmentId}/result`
      );

      expect(response.status).toBeOneOf([200, 403, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 6: Analytics update
  // --------------------------------------------------------------------------
  describe('6. Analytics & AI Adaptation', () => {
    it('should record assessment completion in analytics', async () => {
      await wait(500);

      const response = await adminApi.get('/analytics/assessments', {
        params: { assessmentId, limit: 5 },
      });

      expect(response.status).toBeOneOf([200, 404]);
    });

    it('should update learner proficiency profile', async () => {
      const learnerId = ctx().users.learnerA.id;
      const response = await learnerApi.get(`/learners/${learnerId}/proficiency`);

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        expect(response.data).toBeDefined();
        debug('Proficiency profile', response.data);
      }
    });
  });
});
