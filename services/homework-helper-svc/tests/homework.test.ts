import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

// Mock the Prisma client
vi.mock('../src/prisma.js', () => ({
  prisma: {
    homeworkSubmission: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    homeworkStep: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    homeworkStepResponse: {
      create: vi.fn(),
    },
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

// Mock the service clients
vi.mock('../src/services/aiOrchestratorClient.js', () => ({
  aiOrchestratorClient: {
    generateScaffolding: vi.fn(),
    generateFeedback: vi.fn(),
  },
}));

vi.mock('../src/services/sessionServiceClient.js', () => ({
  sessionServiceClient: {
    createSession: vi.fn(),
    emitEvent: vi.fn(),
    endSession: vi.fn(),
  },
}));

import { prisma } from '../src/prisma.js';
import { aiOrchestratorClient } from '../src/services/aiOrchestratorClient.js';
import { sessionServiceClient } from '../src/services/sessionServiceClient.js';
import type {
  Subject,
  GradeBand,
  SourceType,
  SubmissionStatus,
} from '../generated/prisma-client/index.js';

describe('Homework API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await supertest(app.server).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok', service: 'homework-helper-svc' });
    });
  });

  describe('POST /homework/start', () => {
    it('should create a new homework submission with scaffolding', async () => {
      // Setup mocks
      const mockSubmission = {
        id: 'submission-123',
        tenantId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        sessionId: 'session-123',
        subject: 'MATH' as Subject,
        gradeBand: 'G6_8' as GradeBand,
        sourceType: 'TEXT' as SourceType,
        sourceUrl: null,
        rawText: 'Solve for x: 2x + 5 = 15',
        status: 'RECEIVED' as SubmissionStatus,
        stepCount: 0,
        stepsCompleted: 0,
        aiCorrelationId: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSession = {
        id: 'session-123',
        tenantId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        sessionType: 'HOMEWORK' as const,
        origin: 'HOMEWORK_HELPER' as const,
        startedAt: new Date().toISOString(),
      };

      const mockAiResponse = {
        content: {
          steps: [
            {
              stepOrder: 1,
              promptText: 'What is the first thing you should do to isolate x?',
              hintText: 'Think about moving constants to one side.',
              expectedConcept: 'Subtract from both sides',
            },
            {
              stepOrder: 2,
              promptText: 'Now that you have 2x = 10, what operation will give you x?',
              hintText: 'What is the inverse of multiplication?',
              expectedConcept: 'Divide both sides by coefficient',
            },
          ],
          problemType: 'linear-equation',
        },
        tokensUsed: 150,
      };

      const mockSteps = mockAiResponse.content.steps.map((step, index) => ({
        id: `step-${index + 1}`,
        submissionId: 'submission-123',
        stepOrder: step.stepOrder,
        promptText: step.promptText,
        hintText: step.hintText,
        expectedConcept: step.expectedConcept,
        isStarted: false,
        isCompleted: false,
        hintRevealed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      vi.mocked(sessionServiceClient.createSession).mockResolvedValue(mockSession);
      vi.mocked(sessionServiceClient.emitEvent).mockResolvedValue({
        id: 'event-123',
        sessionId: 'session-123',
        eventType: 'HOMEWORK_CAPTURED',
        occurredAt: new Date().toISOString(),
      });
      vi.mocked(prisma.homeworkSubmission.create).mockResolvedValue(mockSubmission);
      vi.mocked(aiOrchestratorClient.generateScaffolding).mockResolvedValue(mockAiResponse);
      vi.mocked(prisma.homeworkStep.create)
        .mockResolvedValueOnce(mockSteps[0])
        .mockResolvedValueOnce(mockSteps[1]);
      vi.mocked(prisma.homeworkSubmission.update).mockResolvedValue({
        ...mockSubmission,
        status: 'SCAFFOLDED' as SubmissionStatus,
        stepCount: 2,
      });

      const response = await supertest(app.server).post('/homework/start').send({
        subject: 'MATH',
        gradeBand: 'G6_8',
        sourceType: 'TEXT',
        rawText: 'Solve for x: 2x + 5 = 15',
        maxSteps: 5,
      });

      expect(response.status).toBe(201);
      expect(response.body.submission).toMatchObject({
        id: 'submission-123',
        sessionId: 'session-123',
        subject: 'MATH',
        gradeBand: 'G6_8',
        status: 'SCAFFOLDED',
        stepCount: 2,
      });
      expect(response.body.steps).toHaveLength(2);
      expect(response.body.steps[0]).toMatchObject({
        stepOrder: 1,
        isStarted: false,
        isCompleted: false,
      });
    });

    it('should return 400 for invalid request', async () => {
      const response = await supertest(app.server).post('/homework/start').send({
        subject: 'INVALID',
        gradeBand: 'G6_8',
        sourceType: 'TEXT',
        rawText: 'Test problem',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
    });

    it('should return 400 for missing rawText', async () => {
      const response = await supertest(app.server).post('/homework/start').send({
        subject: 'MATH',
        gradeBand: 'G6_8',
        sourceType: 'TEXT',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /homework/:homeworkId/steps', () => {
    it('should return steps for a submission', async () => {
      const mockSubmission = {
        id: 'submission-123',
        tenantId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        sessionId: 'session-123',
        subject: 'MATH',
        gradeBand: 'G6_8',
        status: 'SCAFFOLDED',
        stepCount: 2,
        stepsCompleted: 0,
        steps: [
          {
            id: 'step-1',
            stepOrder: 1,
            promptText: 'What is the first step?',
            hintText: 'Think about it.',
            isStarted: false,
            isCompleted: false,
            hintRevealed: false,
            responses: [],
          },
          {
            id: 'step-2',
            stepOrder: 2,
            promptText: 'What is the next step?',
            hintText: null,
            isStarted: false,
            isCompleted: false,
            hintRevealed: false,
            responses: [],
          },
        ],
      };

      vi.mocked(prisma.homeworkSubmission.findFirst).mockResolvedValue(mockSubmission as never);

      const response = await supertest(app.server).get('/homework/submission-123/steps');

      expect(response.status).toBe(200);
      expect(response.body.submission).toMatchObject({
        id: 'submission-123',
        stepCount: 2,
        stepsCompleted: 0,
      });
      expect(response.body.steps).toHaveLength(2);
      // Hint should not be included when not revealed
      expect(response.body.steps[0].hintText).toBeUndefined();
    });

    it('should return 404 for non-existent submission', async () => {
      vi.mocked(prisma.homeworkSubmission.findFirst).mockResolvedValue(null);

      const response = await supertest(app.server).get('/homework/nonexistent-id/steps');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Homework submission not found');
    });
  });

  describe('POST /homework/steps/:stepId/answer', () => {
    it('should record a step response and get AI feedback', async () => {
      const mockStep = {
        id: 'step-1',
        submissionId: 'submission-123',
        stepOrder: 1,
        promptText: 'What operation do you use?',
        expectedConcept: 'subtraction',
        isStarted: false,
        isCompleted: false,
        hintRevealed: false,
        submission: {
          id: 'submission-123',
          tenantId: '11111111-1111-1111-1111-111111111111',
          learnerId: '22222222-2222-2222-2222-222222222222',
          sessionId: 'session-123',
          rawText: '2x + 5 = 15',
          subject: 'MATH',
          gradeBand: 'G6_8',
        },
      };

      const mockFeedbackResponse = {
        content: {
          feedback: 'Great thinking! Subtraction is indeed the right approach here.',
          demonstratesUnderstanding: true,
          nextAction: 'proceed' as const,
        },
        tokensUsed: 50,
      };

      const mockStepResponse = {
        id: 'response-1',
        stepId: 'step-1',
        responseText: 'I would subtract 5 from both sides.',
        aiFeedback: mockFeedbackResponse.content.feedback,
        isCorrect: true,
        aiCorrelationId: 'step-1',
        createdAt: new Date(),
      };

      vi.mocked(prisma.homeworkStep.findUnique).mockResolvedValue(mockStep as never);
      vi.mocked(prisma.homeworkStep.update).mockResolvedValue({
        ...mockStep,
        isStarted: true,
        isCompleted: true,
      } as never);
      vi.mocked(aiOrchestratorClient.generateFeedback).mockResolvedValue(mockFeedbackResponse);
      vi.mocked(prisma.homeworkStepResponse.create).mockResolvedValue(mockStepResponse);
      vi.mocked(prisma.homeworkSubmission.update).mockResolvedValue({} as never);
      vi.mocked(sessionServiceClient.emitEvent).mockResolvedValue({
        id: 'event-123',
        sessionId: 'session-123',
        eventType: 'HOMEWORK_STEP_COMPLETED',
        occurredAt: new Date().toISOString(),
      });

      const response = await supertest(app.server).post('/homework/steps/step-1/answer').send({
        responseText: 'I would subtract 5 from both sides.',
        requestFeedback: true,
      });

      expect(response.status).toBe(200);
      expect(response.body.response).toMatchObject({
        id: 'response-1',
        responseText: 'I would subtract 5 from both sides.',
        isCorrect: true,
      });
      expect(response.body.step.isCompleted).toBe(true);
    });

    it('should return 400 for missing response text', async () => {
      const response = await supertest(app.server).post('/homework/steps/step-1/answer').send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent step', async () => {
      vi.mocked(prisma.homeworkStep.findUnique).mockResolvedValue(null);

      const response = await supertest(app.server).post('/homework/steps/nonexistent/answer').send({
        responseText: 'My answer',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /homework/steps/:stepId/hint', () => {
    it('should reveal a hint for a step', async () => {
      const mockStep = {
        id: 'step-1',
        submissionId: 'submission-123',
        stepOrder: 1,
        promptText: 'What operation do you use?',
        hintText: 'Think about inverse operations.',
        isStarted: true,
        isCompleted: false,
        hintRevealed: false,
        submission: {
          id: 'submission-123',
          tenantId: '11111111-1111-1111-1111-111111111111',
          learnerId: '22222222-2222-2222-2222-222222222222',
          sessionId: 'session-123',
        },
      };

      vi.mocked(prisma.homeworkStep.findUnique).mockResolvedValue(mockStep as never);
      vi.mocked(prisma.homeworkStep.update).mockResolvedValue({
        ...mockStep,
        hintRevealed: true,
      } as never);
      vi.mocked(sessionServiceClient.emitEvent).mockResolvedValue({
        id: 'event-123',
        sessionId: 'session-123',
        eventType: 'HOMEWORK_HINT_REQUESTED',
        occurredAt: new Date().toISOString(),
      });

      const response = await supertest(app.server).post('/homework/steps/step-1/hint');

      expect(response.status).toBe(200);
      expect(response.body.step.hintText).toBe('Think about inverse operations.');
      expect(response.body.step.hintRevealed).toBe(true);
    });

    it('should return 400 if no hint available', async () => {
      const mockStep = {
        id: 'step-1',
        submissionId: 'submission-123',
        hintText: null,
        submission: {
          tenantId: '11111111-1111-1111-1111-111111111111',
          learnerId: '22222222-2222-2222-2222-222222222222',
        },
      };

      vi.mocked(prisma.homeworkStep.findUnique).mockResolvedValue(mockStep as never);

      const response = await supertest(app.server).post('/homework/steps/step-1/hint');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No hint available for this step');
    });
  });

  describe('POST /homework/:homeworkId/complete', () => {
    it('should mark homework as completed and end session', async () => {
      const mockSubmission = {
        id: 'submission-123',
        tenantId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        sessionId: 'session-123',
        subject: 'MATH',
        gradeBand: 'G6_8',
        status: 'SCAFFOLDED',
        stepCount: 2,
        stepsCompleted: 1,
        steps: [
          { id: 'step-1', isCompleted: true },
          { id: 'step-2', isCompleted: false },
        ],
      };

      vi.mocked(prisma.homeworkSubmission.findFirst).mockResolvedValue(mockSubmission as never);
      vi.mocked(prisma.homeworkSubmission.update).mockResolvedValue({
        ...mockSubmission,
        status: 'COMPLETED',
        stepsCompleted: 1,
      } as never);
      vi.mocked(sessionServiceClient.endSession).mockResolvedValue({
        id: 'session-123',
        endedAt: new Date().toISOString(),
        durationMs: 300000,
      });

      const response = await supertest(app.server).post('/homework/submission-123/complete');

      expect(response.status).toBe(200);
      expect(response.body.submission).toMatchObject({
        id: 'submission-123',
        status: 'COMPLETED',
        stepCount: 2,
        stepsCompleted: 1,
        completionRate: 0.5,
      });
    });

    it('should return 400 if already completed', async () => {
      const mockSubmission = {
        id: 'submission-123',
        tenantId: '11111111-1111-1111-1111-111111111111',
        learnerId: '22222222-2222-2222-2222-222222222222',
        status: 'COMPLETED',
        steps: [],
      };

      vi.mocked(prisma.homeworkSubmission.findFirst).mockResolvedValue(mockSubmission as never);

      const response = await supertest(app.server).post('/homework/submission-123/complete');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Homework already completed');
    });
  });

  describe('GET /homework/submissions', () => {
    it('should list submissions for the current learner', async () => {
      const mockSubmissions = [
        {
          id: 'submission-1',
          tenantId: '11111111-1111-1111-1111-111111111111',
          learnerId: '22222222-2222-2222-2222-222222222222',
          sessionId: 'session-1',
          subject: 'MATH' as Subject,
          gradeBand: 'G6_8' as GradeBand,
          sourceType: 'TEXT' as SourceType,
          sourceUrl: null,
          rawText: 'Test problem 1',
          status: 'COMPLETED' as SubmissionStatus,
          stepCount: 3,
          stepsCompleted: 3,
          aiCorrelationId: null,
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'submission-2',
          tenantId: '11111111-1111-1111-1111-111111111111',
          learnerId: '22222222-2222-2222-2222-222222222222',
          sessionId: 'session-2',
          subject: 'ELA' as Subject,
          gradeBand: 'G6_8' as GradeBand,
          sourceType: 'IMAGE' as SourceType,
          sourceUrl: 'https://example.com/image.jpg',
          rawText: 'Test problem 2',
          status: 'SCAFFOLDED' as SubmissionStatus,
          stepCount: 2,
          stepsCompleted: 0,
          aiCorrelationId: null,
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.homeworkSubmission.findMany).mockResolvedValue(mockSubmissions);

      const response = await supertest(app.server).get('/homework/submissions');

      expect(response.status).toBe(200);
      expect(response.body.submissions).toHaveLength(2);
      expect(response.body.submissions[0].subject).toBe('MATH');
    });
  });
});
