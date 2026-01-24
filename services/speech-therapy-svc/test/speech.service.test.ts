/**
 * Speech Therapy Service Tests
 *
 * Tests for core speech therapy functionality:
 * - Goal management
 * - Session management
 * - Activity tracking
 * - Home practice
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SpeechTherapyService,
  type CreateGoalRequest,
  type CreateSessionRequest,
  type CreateActivityRequest,
  type CreateHomePracticeRequest,
} from '../src/services/speech.service.js';

// ============================================================================
// Mocks
// ============================================================================

const mockPrisma = {
  speechGoal: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  goalProgress: {
    create: vi.fn(),
  },
  therapySession: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  therapyActivity: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  speechRecording: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  homePractice: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  speechStimulus: {
    findMany: vi.fn(),
  },
};

vi.mock('../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const TENANT_ID = 'tenant-test-123';
const LEARNER_ID = 'learner-456';
const THERAPIST_ID = 'therapist-789';
const GOAL_ID = 'goal-abc';
const SESSION_ID = 'session-def';
const ACTIVITY_ID = 'activity-ghi';

const mockGoal = {
  id: GOAL_ID,
  tenantId: TENANT_ID,
  learnerId: LEARNER_ID,
  therapistId: THERAPIST_ID,
  description: 'Improve /r/ sound production',
  sessionType: 'ARTICULATION',
  targetSounds: ['r'],
  masteryThreshold: 0.8,
  currentAccuracy: 0.5,
  status: 'IN_PROGRESS',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSession = {
  id: SESSION_ID,
  tenantId: TENANT_ID,
  learnerId: LEARNER_ID,
  therapistId: THERAPIST_ID,
  sessionType: 'ARTICULATION',
  goalId: GOAL_ID,
  status: 'SCHEDULED',
  scheduledAt: new Date(),
  startedAt: null,
  endedAt: null,
  durationMin: null,
  notes: null,
  parentSummary: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockActivity = {
  id: ACTIVITY_ID,
  sessionId: SESSION_ID,
  activityType: 'WORD_REPETITION',
  name: 'R Words Practice',
  targetSounds: ['r'],
  stimuliList: ['rabbit', 'run', 'red', 'rainbow'],
  orderIndex: 0,
  results: [],
  accuracy: null,
  durationSec: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================================================
// Tests
// ============================================================================

describe('SpeechTherapyService', () => {
  let service: SpeechTherapyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SpeechTherapyService(mockPrisma as any);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Goals
  // ──────────────────────────────────────────────────────────────────────────

  describe('createGoal', () => {
    it('should create a goal with default mastery threshold', async () => {
      const request: CreateGoalRequest = {
        learnerId: LEARNER_ID,
        therapistId: THERAPIST_ID,
        description: 'Improve /s/ sound production',
        sessionType: 'ARTICULATION',
        targetSounds: ['s'],
      };

      mockPrisma.speechGoal.create.mockResolvedValue({
        id: 'new-goal-id',
        ...request,
        tenantId: TENANT_ID,
        masteryThreshold: 0.8,
        status: 'NOT_STARTED',
      });

      const result = await service.createGoal(TENANT_ID, request);

      expect(mockPrisma.speechGoal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          learnerId: LEARNER_ID,
          masteryThreshold: 0.8,
          status: 'NOT_STARTED',
        }),
      });
      expect(result.masteryThreshold).toBe(0.8);
    });

    it('should create a goal with custom mastery threshold', async () => {
      const request: CreateGoalRequest = {
        learnerId: LEARNER_ID,
        description: 'Improve fluency',
        sessionType: 'FLUENCY',
        targetSounds: [],
        masteryThreshold: 0.9,
      };

      mockPrisma.speechGoal.create.mockResolvedValue({
        id: 'new-goal-id',
        ...request,
        tenantId: TENANT_ID,
        status: 'NOT_STARTED',
      });

      await service.createGoal(TENANT_ID, request);

      expect(mockPrisma.speechGoal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          masteryThreshold: 0.9,
        }),
      });
    });
  });

  describe('getGoals', () => {
    it('should return goals with progress records and sessions', async () => {
      mockPrisma.speechGoal.findMany.mockResolvedValue([mockGoal]);

      const result = await service.getGoals(TENANT_ID, LEARNER_ID);

      expect(mockPrisma.speechGoal.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, learnerId: LEARNER_ID },
        include: {
          progressRecords: expect.any(Object),
          sessions: expect.any(Object),
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockGoal]);
    });
  });

  describe('updateGoal', () => {
    it('should update goal status', async () => {
      mockPrisma.speechGoal.findFirst.mockResolvedValue(mockGoal);
      mockPrisma.speechGoal.update.mockResolvedValue({
        ...mockGoal,
        status: 'MASTERED',
      });

      const result = await service.updateGoal(TENANT_ID, GOAL_ID, {
        status: 'MASTERED',
      });

      expect(result.status).toBe('MASTERED');
    });

    it('should auto-mark goal as mastered when accuracy exceeds threshold', async () => {
      mockPrisma.speechGoal.findFirst.mockResolvedValue(mockGoal);
      mockPrisma.speechGoal.update.mockResolvedValue({
        ...mockGoal,
        status: 'MASTERED',
        currentAccuracy: 0.85,
      });

      await service.updateGoal(TENANT_ID, GOAL_ID, {
        currentAccuracy: 0.85,
      });

      expect(mockPrisma.speechGoal.update).toHaveBeenCalledWith({
        where: { id: GOAL_ID },
        data: expect.objectContaining({
          status: 'MASTERED',
          currentAccuracy: 0.85,
        }),
      });
    });

    it('should throw error if goal not found', async () => {
      mockPrisma.speechGoal.findFirst.mockResolvedValue(null);

      await expect(
        service.updateGoal(TENANT_ID, 'non-existent', { status: 'MASTERED' })
      ).rejects.toThrow('Goal not found');
    });
  });

  describe('recordProgress', () => {
    it('should create progress record and update goal accuracy', async () => {
      mockPrisma.speechGoal.findFirst.mockResolvedValue(mockGoal);
      mockPrisma.goalProgress.create.mockResolvedValue({
        id: 'progress-123',
        goalId: GOAL_ID,
        accuracy: 0.75,
        trials: 20,
      });
      mockPrisma.speechGoal.update.mockResolvedValue({
        ...mockGoal,
        currentAccuracy: 0.75,
      });

      const result = await service.recordProgress(TENANT_ID, GOAL_ID, {
        accuracy: 0.75,
        trials: 20,
        notes: 'Good session',
      });

      expect(mockPrisma.goalProgress.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          goalId: GOAL_ID,
          accuracy: 0.75,
          trials: 20,
          notes: 'Good session',
        }),
      });
      expect(result.accuracy).toBe(0.75);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Sessions
  // ──────────────────────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('should create a scheduled session', async () => {
      const scheduledAt = new Date();
      const request: CreateSessionRequest = {
        learnerId: LEARNER_ID,
        therapistId: THERAPIST_ID,
        sessionType: 'ARTICULATION',
        goalId: GOAL_ID,
        scheduledAt,
      };

      mockPrisma.therapySession.create.mockResolvedValue({
        id: SESSION_ID,
        ...request,
        tenantId: TENANT_ID,
        status: 'SCHEDULED',
      });

      const result = await service.createSession(TENANT_ID, request);

      expect(mockPrisma.therapySession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'SCHEDULED',
          scheduledAt,
        }),
      });
      expect(result.status).toBe('SCHEDULED');
    });

    it('should create an in-progress session when no schedule provided', async () => {
      const request: CreateSessionRequest = {
        learnerId: LEARNER_ID,
        sessionType: 'FLUENCY',
      };

      mockPrisma.therapySession.create.mockResolvedValue({
        id: SESSION_ID,
        ...request,
        tenantId: TENANT_ID,
        status: 'IN_PROGRESS',
      });

      const result = await service.createSession(TENANT_ID, request);

      expect(mockPrisma.therapySession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
        }),
      });
      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('startSession', () => {
    it('should mark session as in progress with start time', async () => {
      mockPrisma.therapySession.update.mockResolvedValue({
        ...mockSession,
        status: 'IN_PROGRESS',
        startedAt: expect.any(Date),
      });

      const result = await service.startSession(TENANT_ID, SESSION_ID);

      expect(mockPrisma.therapySession.update).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
        data: {
          status: 'IN_PROGRESS',
          startedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('endSession', () => {
    it('should complete session with duration calculated', async () => {
      const startedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      mockPrisma.therapySession.findFirst.mockResolvedValue({
        ...mockSession,
        status: 'IN_PROGRESS',
        startedAt,
        activities: [{ accuracy: 0.8, results: [{}, {}, {}] }],
      });
      mockPrisma.therapySession.update.mockResolvedValue({
        ...mockSession,
        status: 'COMPLETED',
        durationMin: 30,
      });

      const result = await service.endSession(TENANT_ID, SESSION_ID, {
        notes: 'Good progress',
      });

      expect(mockPrisma.therapySession.update).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
        data: expect.objectContaining({
          status: 'COMPLETED',
          endedAt: expect.any(Date),
        }),
      });
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw error if session not found', async () => {
      mockPrisma.therapySession.findFirst.mockResolvedValue(null);

      await expect(
        service.endSession(TENANT_ID, 'non-existent', {})
      ).rejects.toThrow('Session not found');
    });
  });

  describe('cancelSession', () => {
    it('should cancel session with reason', async () => {
      mockPrisma.therapySession.update.mockResolvedValue({
        ...mockSession,
        status: 'CANCELLED',
        notes: 'Student sick',
      });

      const result = await service.cancelSession(
        TENANT_ID,
        SESSION_ID,
        'Student sick'
      );

      expect(mockPrisma.therapySession.update).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
        data: {
          status: 'CANCELLED',
          notes: 'Student sick',
        },
      });
      expect(result.status).toBe('CANCELLED');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Activities
  // ──────────────────────────────────────────────────────────────────────────

  describe('createActivity', () => {
    it('should create activity for valid session', async () => {
      const request: CreateActivityRequest = {
        sessionId: SESSION_ID,
        activityType: 'WORD_REPETITION',
        name: 'R Words Practice',
        targetSounds: ['r'],
        stimuliList: ['rabbit', 'run', 'red'],
        orderIndex: 0,
      };

      mockPrisma.therapySession.findFirst.mockResolvedValue(mockSession);
      mockPrisma.therapyActivity.create.mockResolvedValue({
        id: ACTIVITY_ID,
        ...request,
        results: [],
      });

      const result = await service.createActivity(TENANT_ID, request);

      expect(mockPrisma.therapyActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: SESSION_ID,
          activityType: 'WORD_REPETITION',
          results: [],
        }),
      });
      expect(result.id).toBe(ACTIVITY_ID);
    });

    it('should throw error if session not found', async () => {
      mockPrisma.therapySession.findFirst.mockResolvedValue(null);

      await expect(
        service.createActivity(TENANT_ID, {
          sessionId: 'invalid',
          activityType: 'WORD_REPETITION',
          name: 'Test',
          targetSounds: [],
          stimuliList: [],
          orderIndex: 0,
        })
      ).rejects.toThrow('Session not found');
    });
  });

  describe('recordActivityResult', () => {
    it('should record result and calculate accuracy', async () => {
      mockPrisma.therapyActivity.findUnique.mockResolvedValue({
        ...mockActivity,
        results: [{ isCorrect: true }],
      });
      mockPrisma.therapyActivity.update.mockResolvedValue({
        ...mockActivity,
        results: [{ isCorrect: true }, { isCorrect: true }],
        accuracy: 1.0,
      });

      const result = await service.recordActivityResult(ACTIVITY_ID, 1, {
        isCorrect: true,
        attempts: 1,
      });

      expect(mockPrisma.therapyActivity.update).toHaveBeenCalled();
      expect(result.accuracy).toBe(1.0);
    });

    it('should throw error if activity not found', async () => {
      mockPrisma.therapyActivity.findUnique.mockResolvedValue(null);

      await expect(
        service.recordActivityResult('invalid', 0, {
          isCorrect: true,
          attempts: 1,
        })
      ).rejects.toThrow('Activity not found');
    });
  });

  describe('completeActivity', () => {
    it('should complete activity with final accuracy', async () => {
      mockPrisma.therapyActivity.findUnique.mockResolvedValue({
        ...mockActivity,
        results: [
          { isCorrect: true },
          { isCorrect: true },
          { isCorrect: false },
        ],
      });
      mockPrisma.therapyActivity.update.mockResolvedValue({
        ...mockActivity,
        accuracy: 0.67,
        completedAt: new Date(),
        durationSec: 120,
      });

      const result = await service.completeActivity(ACTIVITY_ID, 120);

      expect(mockPrisma.therapyActivity.update).toHaveBeenCalledWith({
        where: { id: ACTIVITY_ID },
        data: expect.objectContaining({
          durationSec: 120,
          completedAt: expect.any(Date),
        }),
      });
      expect(result.durationSec).toBe(120);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Home Practice
  // ──────────────────────────────────────────────────────────────────────────

  describe('createHomePractice', () => {
    it('should create home practice assignment', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const request: CreateHomePracticeRequest = {
        learnerId: LEARNER_ID,
        therapistId: THERAPIST_ID,
        title: 'R Sound Practice',
        instructions: 'Practice these words 10 minutes daily',
        targetSounds: ['r'],
        practiceItems: ['rabbit', 'run', 'red'],
        dueDate,
      };

      mockPrisma.homePractice.create.mockResolvedValue({
        id: 'practice-123',
        ...request,
        tenantId: TENANT_ID,
        dailyMinutes: 10,
        practiceLogs: [],
        isCompleted: false,
      });

      const result = await service.createHomePractice(TENANT_ID, request);

      expect(mockPrisma.homePractice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          dailyMinutes: 10,
          practiceLogs: [],
        }),
      });
      expect(result.dailyMinutes).toBe(10);
    });
  });

  describe('logPractice', () => {
    it('should add practice log entry', async () => {
      const practiceId = 'practice-123';
      mockPrisma.homePractice.findUnique.mockResolvedValue({
        id: practiceId,
        practiceLogs: [],
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      mockPrisma.homePractice.update.mockResolvedValue({
        id: practiceId,
        practiceLogs: [{ date: '2024-01-15', minutesPracticed: 15 }],
        isCompleted: false,
      });

      const result = await service.logPractice(practiceId, {
        date: '2024-01-15',
        minutesPracticed: 15,
        itemsCompleted: ['rabbit', 'run'],
      });

      expect(mockPrisma.homePractice.update).toHaveBeenCalled();
      expect(result.practiceLogs).toHaveLength(1);
    });

    it('should throw error if practice not found', async () => {
      mockPrisma.homePractice.findUnique.mockResolvedValue(null);

      await expect(
        service.logPractice('invalid', {
          date: '2024-01-15',
          minutesPracticed: 10,
          itemsCompleted: [],
        })
      ).rejects.toThrow('Home practice not found');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Stimuli
  // ──────────────────────────────────────────────────────────────────────────

  describe('getStimuli', () => {
    it('should return stimuli for target sound', async () => {
      mockPrisma.speechStimulus.findMany.mockResolvedValue([
        { id: 's1', text: 'rabbit', targetSounds: ['r'], difficulty: 1 },
        { id: 's2', text: 'run', targetSounds: ['r'], difficulty: 1 },
      ]);

      const result = await service.getStimuli('r', { difficulty: 1 });

      expect(mockPrisma.speechStimulus.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          targetSounds: { has: 'r' },
          isActive: true,
          difficulty: 1,
        }),
        orderBy: { difficulty: 'asc' },
        take: 20,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('generateWordList', () => {
    it('should return shuffled word list', async () => {
      mockPrisma.speechStimulus.findMany.mockResolvedValue([
        { id: 's1', text: 'rabbit' },
        { id: 's2', text: 'run' },
        { id: 's3', text: 'red' },
        { id: 's4', text: 'rainbow' },
        { id: 's5', text: 'race' },
      ]);

      const result = await service.generateWordList(['r'], 2, 3);

      expect(result).toHaveLength(3);
      expect(result.every((word) => typeof word === 'string')).toBe(true);
    });
  });
});
