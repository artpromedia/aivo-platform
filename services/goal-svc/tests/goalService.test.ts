/**
 * Goal Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    goal: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    goalObjective: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
  },
  GoalStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    ON_HOLD: 'ON_HOLD',
    COMPLETED: 'COMPLETED',
    ARCHIVED: 'ARCHIVED',
  },
  ObjectiveStatus: {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    MET: 'MET',
    NOT_MET: 'NOT_MET',
  },
}));

import { prisma } from '../src/prisma.js';
import * as goalService from '../src/services/goalService.js';

describe('Goal Service', () => {
  const tenantId = 'tenant-123';
  const learnerId = 'learner-456';
  const userId = 'user-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGoal', () => {
    it('should create a goal with default status DRAFT', async () => {
      const input = {
        tenantId,
        learnerId,
        createdByUserId: userId,
        title: 'Improve reading comprehension',
        description: 'Focus on inference skills',
        domain: 'ELA' as const,
      };

      const mockGoal = {
        id: 'goal-001',
        ...input,
        status: 'DRAFT',
        startDate: new Date(),
        objectives: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.goal.create).mockResolvedValue(mockGoal as any);

      const result = await goalService.createGoal(input);

      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          learnerId,
          createdByUserId: userId,
          title: 'Improve reading comprehension',
          domain: 'ELA',
          status: 'DRAFT',
        }),
        include: { objectives: true },
      });

      expect(result.id).toBe('goal-001');
      expect(result.status).toBe('DRAFT');
    });

    it('should create a goal with specified status', async () => {
      const input = {
        tenantId,
        learnerId,
        createdByUserId: userId,
        title: 'Math fluency',
        domain: 'MATH' as const,
        status: 'ACTIVE' as const,
      };

      const mockGoal = {
        id: 'goal-002',
        ...input,
        objectives: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.goal.create).mockResolvedValue(mockGoal as any);

      const result = await goalService.createGoal(input);

      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'ACTIVE',
        }),
        include: { objectives: true },
      });

      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('getGoalById', () => {
    it('should return goal with objectives', async () => {
      const mockGoal = {
        id: 'goal-001',
        tenantId,
        learnerId,
        title: 'Test Goal',
        domain: 'ELA',
        status: 'ACTIVE',
        objectives: [
          { id: 'obj-001', description: 'Objective 1', orderIndex: 0 },
          { id: 'obj-002', description: 'Objective 2', orderIndex: 1 },
        ],
      };

      vi.mocked(prisma.goal.findFirst).mockResolvedValue(mockGoal as any);

      const result = await goalService.getGoalById('goal-001', tenantId);

      expect(prisma.goal.findFirst).toHaveBeenCalledWith({
        where: { id: 'goal-001', tenantId },
        include: {
          objectives: { orderBy: { orderIndex: 'asc' } },
        },
      });

      expect(result).toBeDefined();
      expect(result?.objectives).toHaveLength(2);
    });

    it('should return null for non-existent goal', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue(null);

      const result = await goalService.getGoalById('nonexistent', tenantId);

      expect(result).toBeNull();
    });
  });

  describe('listGoals', () => {
    it('should list goals with pagination', async () => {
      const mockGoals = [
        { id: 'goal-001', title: 'Goal 1', objectives: [] },
        { id: 'goal-002', title: 'Goal 2', objectives: [] },
      ];

      vi.mocked(prisma.goal.findMany).mockResolvedValue(mockGoals as any);
      vi.mocked(prisma.goal.count).mockResolvedValue(10);

      const result = await goalService.listGoals(
        { tenantId, learnerId },
        { page: 1, pageSize: 2 }
      );

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.totalPages).toBe(5);
    });

    it('should filter by status', async () => {
      vi.mocked(prisma.goal.findMany).mockResolvedValue([]);
      vi.mocked(prisma.goal.count).mockResolvedValue(0);

      await goalService.listGoals({ tenantId, status: 'ACTIVE' as any });

      expect(prisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter by multiple statuses', async () => {
      vi.mocked(prisma.goal.findMany).mockResolvedValue([]);
      vi.mocked(prisma.goal.count).mockResolvedValue(0);

      await goalService.listGoals({
        tenantId,
        status: ['ACTIVE', 'DRAFT'] as any,
      });

      expect(prisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            status: { in: ['ACTIVE', 'DRAFT'] },
          }),
        })
      );
    });
  });

  describe('updateGoal', () => {
    it('should update goal fields', async () => {
      const existingGoal = {
        id: 'goal-001',
        tenantId,
        title: 'Old Title',
      };

      const updatedGoal = {
        ...existingGoal,
        title: 'New Title',
        status: 'ACTIVE',
        objectives: [],
      };

      vi.mocked(prisma.goal.findFirst).mockResolvedValue(existingGoal as any);
      vi.mocked(prisma.goal.update).mockResolvedValue(updatedGoal as any);

      const result = await goalService.updateGoal('goal-001', tenantId, {
        title: 'New Title',
        status: 'ACTIVE' as const,
      });

      expect(result?.title).toBe('New Title');
      expect(result?.status).toBe('ACTIVE');
    });

    it('should return null for non-existent goal', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue(null);

      const result = await goalService.updateGoal('nonexistent', tenantId, {
        title: 'New Title',
      });

      expect(result).toBeNull();
      expect(prisma.goal.update).not.toHaveBeenCalled();
    });
  });

  describe('completeGoal', () => {
    it('should mark goal as completed with rating 4', async () => {
      const existingGoal = { id: 'goal-001', tenantId, status: 'ACTIVE' };
      const completedGoal = {
        ...existingGoal,
        status: 'COMPLETED',
        progressRating: 4,
        objectives: [],
      };

      vi.mocked(prisma.goal.findFirst).mockResolvedValue(existingGoal as any);
      vi.mocked(prisma.goal.update).mockResolvedValue(completedGoal as any);

      const result = await goalService.completeGoal('goal-001', tenantId);

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-001' },
        data: {
          status: 'COMPLETED',
          progressRating: 4,
        },
        include: { objectives: true },
      });

      expect(result?.status).toBe('COMPLETED');
      expect(result?.progressRating).toBe(4);
    });
  });

  describe('deleteGoal', () => {
    it('should delete existing goal', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue({ id: 'goal-001', tenantId } as any);
      vi.mocked(prisma.goal.delete).mockResolvedValue({} as any);

      const result = await goalService.deleteGoal('goal-001', tenantId);

      expect(result).toBe(true);
      expect(prisma.goal.delete).toHaveBeenCalledWith({ where: { id: 'goal-001' } });
    });

    it('should return false for non-existent goal', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue(null);

      const result = await goalService.deleteGoal('nonexistent', tenantId);

      expect(result).toBe(false);
      expect(prisma.goal.delete).not.toHaveBeenCalled();
    });
  });
});

describe('Objective Service', () => {
  const tenantId = 'tenant-123';
  const goalId = 'goal-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createObjective', () => {
    it('should create objective for valid goal', async () => {
      const mockGoal = { id: goalId, tenantId };
      const mockObjective = {
        id: 'obj-001',
        goalId,
        description: 'Test objective',
        status: 'NOT_STARTED',
        orderIndex: 1,
      };

      vi.mocked(prisma.goal.findFirst).mockResolvedValue(mockGoal as any);
      vi.mocked(prisma.goalObjective.aggregate).mockResolvedValue({ _max: { orderIndex: 0 } } as any);
      vi.mocked(prisma.goalObjective.create).mockResolvedValue(mockObjective as any);

      const result = await goalService.createObjective(
        {
          goalId,
          description: 'Test objective',
        },
        tenantId
      );

      expect(result).toBeDefined();
      expect(result?.description).toBe('Test objective');
      expect(result?.status).toBe('NOT_STARTED');
    });

    it('should return null for non-existent goal', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue(null);

      const result = await goalService.createObjective(
        {
          goalId: 'nonexistent',
          description: 'Test objective',
        },
        tenantId
      );

      expect(result).toBeNull();
    });
  });

  describe('markObjectiveMet', () => {
    it('should mark objective as met with rating 4', async () => {
      const mockObjective = {
        id: 'obj-001',
        goalId,
        status: 'IN_PROGRESS',
        goal: { tenantId },
      };

      const updatedObjective = {
        ...mockObjective,
        status: 'MET',
        progressRating: 4,
      };

      vi.mocked(prisma.goalObjective.findFirst).mockResolvedValue(mockObjective as any);
      vi.mocked(prisma.goalObjective.update).mockResolvedValue(updatedObjective as any);

      const result = await goalService.markObjectiveMet('obj-001', tenantId);

      expect(prisma.goalObjective.update).toHaveBeenCalledWith({
        where: { id: 'obj-001' },
        data: {
          status: 'MET',
          progressRating: 4,
        },
      });

      expect(result?.status).toBe('MET');
    });

    it('should return null for objective from different tenant', async () => {
      const mockObjective = {
        id: 'obj-001',
        goalId,
        goal: { tenantId: 'different-tenant' },
      };

      vi.mocked(prisma.goalObjective.findFirst).mockResolvedValue(mockObjective as any);

      const result = await goalService.markObjectiveMet('obj-001', tenantId);

      expect(result).toBeNull();
      expect(prisma.goalObjective.update).not.toHaveBeenCalled();
    });
  });
});

describe('Learner Goal Summary', () => {
  const tenantId = 'tenant-123';
  const learnerId = 'learner-456';

  it('should aggregate goal and objective stats', async () => {
    vi.mocked(prisma.goal.groupBy).mockResolvedValue([
      { status: 'ACTIVE', _count: { id: 3 } },
      { status: 'COMPLETED', _count: { id: 2 } },
      { status: 'DRAFT', _count: { id: 1 } },
    ] as any);

    vi.mocked(prisma.goalObjective.groupBy).mockResolvedValue([
      { status: 'MET', _count: { id: 5 } },
      { status: 'IN_PROGRESS', _count: { id: 3 } },
      { status: 'NOT_STARTED', _count: { id: 2 } },
    ] as any);

    const result = await goalService.getLearnerGoalSummary(tenantId, learnerId);

    expect(result.goals.total).toBe(6);
    expect(result.goals.byStatus).toEqual({
      ACTIVE: 3,
      COMPLETED: 2,
      DRAFT: 1,
    });

    expect(result.objectives.total).toBe(10);
    expect(result.objectives.byStatus).toEqual({
      MET: 5,
      IN_PROGRESS: 3,
      NOT_STARTED: 2,
    });
  });
});
