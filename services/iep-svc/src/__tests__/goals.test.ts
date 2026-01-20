/**
 * AIVO IEP Service - Goals Tests
 * Tests IEP goal management, objectives, and progress tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { mockPrisma, resetMocks, testData } from './setup.js';

// Import service after mocking
import * as iepService from '../services/iepService.js';

describe('IEP Service - Goal Management', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADD GOAL
  // ════════════════════════════════════════════════════════════════════════════

  describe('addGoal', () => {
    it('should create a new goal with sequential numbering', async () => {
      const goalInput = {
        domain: 'READING',
        description: 'Student will improve reading comprehension',
        baseline: 'Currently at 2nd grade reading level',
        targetCriteria: '80% accuracy on grade-level passages',
        measurementMethod: 'Weekly comprehension assessments',
        targetDate: '2024-12-15',
        standardsAligned: ['ELA.RI.3.1', 'ELA.RI.3.2'],
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.iEPGoal.count.mockResolvedValue(2); // Already has 2 goals
      mockPrisma.iEPGoal.create.mockResolvedValue({
        ...testData.goal,
        ...goalInput,
        goalNumber: 3,
      });
      mockPrisma.iEPGoal.findUnique.mockResolvedValue({
        ...testData.goal,
        ...goalInput,
        goalNumber: 3,
        objectives: [],
      });

      const result = await iepService.addGoal(testData.tenantId, testData.iep.id, goalInput);

      expect(mockPrisma.iEPGoal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          iepId: testData.iep.id,
          goalNumber: 3,
          domain: 'READING',
          description: goalInput.description,
          baseline: goalInput.baseline,
          targetCriteria: goalInput.targetCriteria,
          measurementMethod: goalInput.measurementMethod,
          status: 'NOT_STARTED',
        }),
      });
      expect(result.goalNumber).toBe(3);
    });

    it('should create first goal with goalNumber 1', async () => {
      const goalInput = {
        domain: 'MATH',
        description: 'Student will improve math calculation skills',
        baseline: 'Currently solves single-digit addition',
        targetCriteria: '90% accuracy on double-digit addition',
        measurementMethod: 'Daily math probes',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.iEPGoal.count.mockResolvedValue(0); // No existing goals
      mockPrisma.iEPGoal.create.mockResolvedValue({
        ...testData.goal,
        ...goalInput,
        goalNumber: 1,
      });
      mockPrisma.iEPGoal.findUnique.mockResolvedValue({
        ...testData.goal,
        goalNumber: 1,
        objectives: [],
      });

      const result = await iepService.addGoal(testData.tenantId, testData.iep.id, goalInput);

      expect(mockPrisma.iEPGoal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          goalNumber: 1,
        }),
      });
      expect(result.goalNumber).toBe(1);
    });

    it('should create goal with objectives', async () => {
      const goalInput = {
        domain: 'COMMUNICATION',
        description: 'Student will improve expressive language',
        baseline: 'Uses 2-3 word sentences',
        targetCriteria: 'Uses 5+ word sentences',
        measurementMethod: 'Language samples',
        objectives: [
          {
            description: 'Use 3-word sentences consistently',
            criteria: '80% of utterances',
          },
          {
            description: 'Use 4-word sentences',
            criteria: '70% of utterances',
          },
          {
            description: 'Use 5+ word sentences',
            criteria: '60% of utterances',
          },
        ],
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.iEPGoal.count.mockResolvedValue(0);
      mockPrisma.iEPGoal.create.mockResolvedValue({
        ...testData.goal,
        id: 'new-goal-id',
      });
      mockPrisma.objective.createMany.mockResolvedValue({ count: 3 });
      mockPrisma.iEPGoal.findUnique.mockResolvedValue({
        ...testData.goal,
        objectives: goalInput.objectives.map((obj, i) => ({
          ...obj,
          id: `obj-${i}`,
          objectiveNumber: i + 1,
          status: 'NOT_STARTED',
        })),
      });

      await iepService.addGoal(testData.tenantId, testData.iep.id, goalInput);

      expect(mockPrisma.objective.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            goalId: 'new-goal-id',
            objectiveNumber: 1,
            description: 'Use 3-word sentences consistently',
            criteria: '80% of utterances',
            status: 'NOT_STARTED',
          }),
          expect.objectContaining({
            objectiveNumber: 2,
          }),
          expect.objectContaining({
            objectiveNumber: 3,
          }),
        ],
      });
    });

    it('should throw error if IEP not found', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(null);

      await expect(
        iepService.addGoal(testData.tenantId, 'non-existent-iep', {
          domain: 'READING',
          description: 'Test goal',
          baseline: 'Test baseline',
          targetCriteria: 'Test criteria',
          measurementMethod: 'Test method',
        })
      ).rejects.toThrow('IEP not found');
    });

    it('should handle all goal domains', async () => {
      const domains = [
        'READING',
        'WRITING',
        'MATH',
        'COMMUNICATION',
        'SOCIAL_EMOTIONAL',
        'ADAPTIVE_BEHAVIOR',
        'MOTOR',
        'VOCATIONAL',
        'TRANSITION',
        'OTHER',
      ];

      for (const domain of domains) {
        resetMocks();
        mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
        mockPrisma.iEPGoal.count.mockResolvedValue(0);
        mockPrisma.iEPGoal.create.mockResolvedValue({
          ...testData.goal,
          domain,
        });
        mockPrisma.iEPGoal.findUnique.mockResolvedValue({
          ...testData.goal,
          domain,
          objectives: [],
        });

        await iepService.addGoal(testData.tenantId, testData.iep.id, {
          domain,
          description: `Goal for ${domain}`,
          baseline: 'Baseline',
          targetCriteria: 'Target',
          measurementMethod: 'Method',
        });

        expect(mockPrisma.iEPGoal.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ domain }),
        });
      }
    });

    it('should set default standards aligned as empty array', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.iEPGoal.count.mockResolvedValue(0);
      mockPrisma.iEPGoal.create.mockResolvedValue(testData.goal);
      mockPrisma.iEPGoal.findUnique.mockResolvedValue({
        ...testData.goal,
        objectives: [],
      });

      await iepService.addGoal(testData.tenantId, testData.iep.id, {
        domain: 'READING',
        description: 'Test',
        baseline: 'Test',
        targetCriteria: 'Test',
        measurementMethod: 'Test',
        // No standardsAligned provided
      });

      expect(mockPrisma.iEPGoal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          standardsAligned: [],
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // UPDATE GOAL
  // ════════════════════════════════════════════════════════════════════════════

  describe('updateGoal', () => {
    it('should update goal fields', async () => {
      const updates = {
        description: 'Updated goal description',
        targetCriteria: '90% accuracy',
        status: 'IN_PROGRESS',
      };

      mockPrisma.iEPGoal.findFirst.mockResolvedValue({
        ...testData.goal,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.iEPGoal.update.mockResolvedValue({
        ...testData.goal,
        ...updates,
        objectives: [],
      });

      const result = await iepService.updateGoal(testData.tenantId, testData.goal.id, updates);

      expect(mockPrisma.iEPGoal.update).toHaveBeenCalledWith({
        where: { id: testData.goal.id },
        data: expect.objectContaining({
          description: updates.description,
          targetCriteria: updates.targetCriteria,
          status: updates.status,
        }),
        include: { objectives: true },
      });
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should update goal status to MASTERED', async () => {
      mockPrisma.iEPGoal.findFirst.mockResolvedValue({
        ...testData.goal,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.iEPGoal.update.mockResolvedValue({
        ...testData.goal,
        status: 'MASTERED',
        objectives: [],
      });

      const result = await iepService.updateGoal(testData.tenantId, testData.goal.id, {
        status: 'MASTERED',
      });

      expect(result.status).toBe('MASTERED');
    });

    it('should enforce tenant isolation', async () => {
      mockPrisma.iEPGoal.findFirst.mockResolvedValue({
        ...testData.goal,
        iep: { tenantId: 'other-tenant' },
      });

      await expect(
        iepService.updateGoal(testData.tenantId, testData.goal.id, { status: 'IN_PROGRESS' })
      ).rejects.toThrow('Goal not found');
    });

    it('should throw error if goal not found', async () => {
      mockPrisma.iEPGoal.findFirst.mockResolvedValue(null);

      await expect(
        iepService.updateGoal(testData.tenantId, 'non-existent', { status: 'IN_PROGRESS' })
      ).rejects.toThrow('Goal not found');
    });

    it('should update target date', async () => {
      mockPrisma.iEPGoal.findFirst.mockResolvedValue({
        ...testData.goal,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.iEPGoal.update.mockResolvedValue({
        ...testData.goal,
        targetDate: new Date('2025-06-15'),
        objectives: [],
      });

      await iepService.updateGoal(testData.tenantId, testData.goal.id, {
        targetDate: '2025-06-15',
      });

      expect(mockPrisma.iEPGoal.update).toHaveBeenCalledWith({
        where: { id: testData.goal.id },
        data: expect.objectContaining({
          targetDate: expect.any(Date),
        }),
        include: { objectives: true },
      });
    });

    it('should handle all goal statuses', async () => {
      const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'MASTERED', 'DISCONTINUED', 'MODIFIED'];

      for (const status of statuses) {
        resetMocks();
        mockPrisma.iEPGoal.findFirst.mockResolvedValue({
          ...testData.goal,
          iep: { tenantId: testData.tenantId },
        });
        mockPrisma.iEPGoal.update.mockResolvedValue({
          ...testData.goal,
          status,
          objectives: [],
        });

        const result = await iepService.updateGoal(testData.tenantId, testData.goal.id, {
          status,
        });

        expect(result.status).toBe(status);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // RECORD PROGRESS
  // ════════════════════════════════════════════════════════════════════════════

  describe('recordProgress', () => {
    it('should record progress data for a goal', async () => {
      const progressInput = {
        recordDate: '2024-02-15',
        progressLevel: 'SOME_PROGRESS',
        measurementType: 'WPM',
        measurementValue: 55,
        notes: 'Student showing improvement',
        recordedBy: testData.userId,
      };

      mockPrisma.iEPGoal.findFirst.mockResolvedValue({
        ...testData.goal,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.progressData.create.mockResolvedValue({
        ...testData.progressData,
        ...progressInput,
      });

      const result = await iepService.recordProgress(
        testData.tenantId,
        testData.goal.id,
        progressInput
      );

      expect(mockPrisma.progressData.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          goalId: testData.goal.id,
          progressLevel: 'SOME_PROGRESS',
          measurementType: 'WPM',
          measurementValue: 55,
          notes: 'Student showing improvement',
          recordedBy: testData.userId,
        }),
      });
      expect(result.progressLevel).toBe('SOME_PROGRESS');
    });

    it('should use current date if recordDate not provided', async () => {
      mockPrisma.iEPGoal.findFirst.mockResolvedValue({
        ...testData.goal,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.progressData.create.mockResolvedValue(testData.progressData);

      await iepService.recordProgress(testData.tenantId, testData.goal.id, {
        progressLevel: 'ADEQUATE_PROGRESS',
        recordedBy: testData.userId,
      });

      expect(mockPrisma.progressData.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recordDate: expect.any(Date),
        }),
      });
    });

    it('should enforce tenant isolation', async () => {
      mockPrisma.iEPGoal.findFirst.mockResolvedValue({
        ...testData.goal,
        iep: { tenantId: 'other-tenant' },
      });

      await expect(
        iepService.recordProgress(testData.tenantId, testData.goal.id, {
          progressLevel: 'SOME_PROGRESS',
          recordedBy: testData.userId,
        })
      ).rejects.toThrow('Goal not found');
    });

    it('should throw error if goal not found', async () => {
      mockPrisma.iEPGoal.findFirst.mockResolvedValue(null);

      await expect(
        iepService.recordProgress(testData.tenantId, 'non-existent', {
          progressLevel: 'SOME_PROGRESS',
          recordedBy: testData.userId,
        })
      ).rejects.toThrow('Goal not found');
    });

    it('should handle all progress levels', async () => {
      const progressLevels = [
        'NO_PROGRESS',
        'MINIMAL_PROGRESS',
        'SOME_PROGRESS',
        'ADEQUATE_PROGRESS',
        'SIGNIFICANT_PROGRESS',
        'MASTERED',
        'REGRESSION',
      ];

      for (const progressLevel of progressLevels) {
        resetMocks();
        mockPrisma.iEPGoal.findFirst.mockResolvedValue({
          ...testData.goal,
          iep: { tenantId: testData.tenantId },
        });
        mockPrisma.progressData.create.mockResolvedValue({
          ...testData.progressData,
          progressLevel,
        });

        const result = await iepService.recordProgress(testData.tenantId, testData.goal.id, {
          progressLevel,
          recordedBy: testData.userId,
        });

        expect(result.progressLevel).toBe(progressLevel);
      }
    });

    it('should record numeric measurement values', async () => {
      mockPrisma.iEPGoal.findFirst.mockResolvedValue({
        ...testData.goal,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.progressData.create.mockResolvedValue({
        ...testData.progressData,
        measurementType: 'Percentage',
        measurementValue: 85.5,
      });

      await iepService.recordProgress(testData.tenantId, testData.goal.id, {
        progressLevel: 'ADEQUATE_PROGRESS',
        measurementType: 'Percentage',
        measurementValue: 85.5,
        recordedBy: testData.userId,
      });

      expect(mockPrisma.progressData.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          measurementType: 'Percentage',
          measurementValue: 85.5,
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GOAL TRACKING SCENARIOS
  // ════════════════════════════════════════════════════════════════════════════

  describe('Goal Tracking Scenarios', () => {
    it('should support tracking academic goals with standards alignment', async () => {
      const academicGoal = {
        domain: 'READING',
        description: 'Given grade-level text, student will identify main idea and supporting details',
        baseline: 'Student currently identifies main idea in 2/10 passages',
        targetCriteria: 'Student will identify main idea in 8/10 passages',
        measurementMethod: 'Weekly reading comprehension assessments',
        standardsAligned: ['CCSS.ELA-LITERACY.RI.3.2', 'CCSS.ELA-LITERACY.RI.3.1'],
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.iEPGoal.count.mockResolvedValue(0);
      mockPrisma.iEPGoal.create.mockResolvedValue({
        ...testData.goal,
        ...academicGoal,
      });
      mockPrisma.iEPGoal.findUnique.mockResolvedValue({
        ...testData.goal,
        ...academicGoal,
        objectives: [],
      });

      const result = await iepService.addGoal(testData.tenantId, testData.iep.id, academicGoal);

      expect(result.standardsAligned).toContain('CCSS.ELA-LITERACY.RI.3.2');
    });

    it('should support tracking behavioral/social-emotional goals', async () => {
      const behavioralGoal = {
        domain: 'SOCIAL_EMOTIONAL',
        description: 'Student will use coping strategies when frustrated',
        baseline: 'Student currently uses physical responses (hitting, throwing) when frustrated',
        targetCriteria: 'Student will use taught coping strategy in 4/5 observed instances',
        measurementMethod: 'Daily behavior observation log',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.iEPGoal.count.mockResolvedValue(0);
      mockPrisma.iEPGoal.create.mockResolvedValue({
        ...testData.goal,
        ...behavioralGoal,
      });
      mockPrisma.iEPGoal.findUnique.mockResolvedValue({
        ...testData.goal,
        ...behavioralGoal,
        objectives: [],
      });

      const result = await iepService.addGoal(testData.tenantId, testData.iep.id, behavioralGoal);

      expect(result.domain).toBe('SOCIAL_EMOTIONAL');
    });

    it('should support tracking transition goals for older students', async () => {
      const transitionGoal = {
        domain: 'TRANSITION',
        description: 'Student will research and identify 3 post-secondary education options',
        baseline: 'Student has not explored post-secondary options',
        targetCriteria: 'Student will complete research and present findings',
        measurementMethod: 'Portfolio review and presentation rubric',
        targetDate: '2024-05-15',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.iEPGoal.count.mockResolvedValue(0);
      mockPrisma.iEPGoal.create.mockResolvedValue({
        ...testData.goal,
        ...transitionGoal,
      });
      mockPrisma.iEPGoal.findUnique.mockResolvedValue({
        ...testData.goal,
        ...transitionGoal,
        objectives: [],
      });

      const result = await iepService.addGoal(testData.tenantId, testData.iep.id, transitionGoal);

      expect(result.domain).toBe('TRANSITION');
    });

    it('should support tracking motor/physical therapy goals', async () => {
      const motorGoal = {
        domain: 'MOTOR',
        description: 'Student will improve fine motor control for handwriting',
        baseline: 'Student currently writes 5 legible letters per minute',
        targetCriteria: 'Student will write 15 legible letters per minute',
        measurementMethod: 'Timed writing samples',
        objectives: [
          {
            description: 'Write 8 legible letters per minute',
            criteria: '3 consecutive sessions',
          },
          {
            description: 'Write 12 legible letters per minute',
            criteria: '3 consecutive sessions',
          },
        ],
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.iEPGoal.count.mockResolvedValue(0);
      mockPrisma.iEPGoal.create.mockResolvedValue({
        ...testData.goal,
        id: 'motor-goal-id',
        ...motorGoal,
      });
      mockPrisma.objective.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.iEPGoal.findUnique.mockResolvedValue({
        ...testData.goal,
        ...motorGoal,
        objectives: [
          { ...testData.objective, objectiveNumber: 1 },
          { ...testData.objective, objectiveNumber: 2 },
        ],
      });

      const result = await iepService.addGoal(testData.tenantId, testData.iep.id, motorGoal);

      expect(result.domain).toBe('MOTOR');
      expect(mockPrisma.objective.createMany).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PROGRESS TRACKING OVER TIME
  // ════════════════════════════════════════════════════════════════════════════

  describe('Progress Tracking Over Time', () => {
    it('should track progress improvement over multiple entries', async () => {
      const progressEntries = [
        { progressLevel: 'MINIMAL_PROGRESS', measurementValue: 50 },
        { progressLevel: 'SOME_PROGRESS', measurementValue: 60 },
        { progressLevel: 'ADEQUATE_PROGRESS', measurementValue: 70 },
        { progressLevel: 'SIGNIFICANT_PROGRESS', measurementValue: 80 },
      ];

      for (const entry of progressEntries) {
        resetMocks();
        mockPrisma.iEPGoal.findFirst.mockResolvedValue({
          ...testData.goal,
          iep: { tenantId: testData.tenantId },
        });
        mockPrisma.progressData.create.mockResolvedValue({
          ...testData.progressData,
          ...entry,
        });

        const result = await iepService.recordProgress(testData.tenantId, testData.goal.id, {
          progressLevel: entry.progressLevel,
          measurementType: 'WPM',
          measurementValue: entry.measurementValue,
          recordedBy: testData.userId,
        });

        expect(result.measurementValue).toBe(entry.measurementValue);
      }
    });

    it('should record regression when student loses skills', async () => {
      mockPrisma.iEPGoal.findFirst.mockResolvedValue({
        ...testData.goal,
        iep: { tenantId: testData.tenantId },
      });
      mockPrisma.progressData.create.mockResolvedValue({
        ...testData.progressData,
        progressLevel: 'REGRESSION',
        notes: 'Student showed regression after extended absence',
      });

      const result = await iepService.recordProgress(testData.tenantId, testData.goal.id, {
        progressLevel: 'REGRESSION',
        notes: 'Student showed regression after extended absence',
        recordedBy: testData.userId,
      });

      expect(result.progressLevel).toBe('REGRESSION');
    });
  });
});
