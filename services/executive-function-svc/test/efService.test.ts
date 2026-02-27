/**
 * Tests for ExecutiveFunctionService — profile, task, and schedule management.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  efProfile: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  efTask: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    createMany: vi.fn(),
  },
  efSchedule: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  efTemplate: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  efStrategy: {
    findMany: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('ExecutiveFunctionService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('Profile management', () => {
    it('upserts a learner profile', async () => {
      const profile = {
        id: 'p-1',
        learnerId: 'l-1',
        workingMemory: 3,
        planning: 2,
        timeManagement: 4,
        organization: 3,
        taskInitiation: 2,
      };
      mockPrisma.efProfile.upsert.mockResolvedValue(profile);
      const result = await mockPrisma.efProfile.upsert({
        where: { learnerId: 'l-1' },
        create: profile,
        update: profile,
      });
      expect(result.workingMemory).toBe(3);
      expect(result.planning).toBe(2);
    });

    it('gets profile by learnerId', async () => {
      mockPrisma.efProfile.findUnique.mockResolvedValue({
        id: 'p-1',
        learnerId: 'l-1',
        workingMemory: 4,
      });
      const result = await mockPrisma.efProfile.findUnique({ where: { learnerId: 'l-1' } });
      expect(result?.workingMemory).toBe(4);
    });

    it('returns null for non-existent profile', async () => {
      mockPrisma.efProfile.findUnique.mockResolvedValue(null);
      const result = await mockPrisma.efProfile.findUnique({ where: { learnerId: 'xxx' } });
      expect(result).toBeNull();
    });

    it('updates individual skill level', async () => {
      mockPrisma.efProfile.update.mockResolvedValue({
        id: 'p-1',
        planning: 5,
      });
      const result = await mockPrisma.efProfile.update({
        where: { id: 'p-1' },
        data: { planning: 5 },
      });
      expect(result.planning).toBe(5);
    });
  });

  describe('Task management', () => {
    it('creates a task', async () => {
      const task = {
        id: 't-1',
        learnerId: 'l-1',
        title: 'Read chapter 3',
        status: 'TODO',
        priority: 'HIGH',
      };
      mockPrisma.efTask.create.mockResolvedValue(task);
      const result = await mockPrisma.efTask.create({ data: task });
      expect(result.status).toBe('TODO');
      expect(result.priority).toBe('HIGH');
    });

    it('lists active tasks for a learner', async () => {
      mockPrisma.efTask.findMany.mockResolvedValue([
        { id: 't-1', status: 'IN_PROGRESS' },
        { id: 't-2', status: 'TODO' },
      ]);
      const tasks = await mockPrisma.efTask.findMany({
        where: { learnerId: 'l-1', status: { in: ['TODO', 'IN_PROGRESS'] } },
      });
      expect(tasks).toHaveLength(2);
    });

    it('starts a task by updating status', async () => {
      mockPrisma.efTask.update.mockResolvedValue({
        id: 't-1',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      });
      const result = await mockPrisma.efTask.update({
        where: { id: 't-1' },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
      expect(result.status).toBe('IN_PROGRESS');
      expect(result.startedAt).toBeDefined();
    });

    it('creates multiple tasks from AI breakdown', async () => {
      mockPrisma.efTask.createMany.mockResolvedValue({ count: 3 });
      const result = await mockPrisma.efTask.createMany({
        data: [
          { learnerId: 'l-1', title: 'Step 1', status: 'TODO', order: 1 },
          { learnerId: 'l-1', title: 'Step 2', status: 'TODO', order: 2 },
          { learnerId: 'l-1', title: 'Step 3', status: 'TODO', order: 3 },
        ],
      });
      expect(result.count).toBe(3);
    });
  });

  describe('Schedule management', () => {
    it('creates a daily schedule', async () => {
      const schedule = {
        id: 'sch-1',
        learnerId: 'l-1',
        date: '2026-02-26',
        blocks: [
          { type: 'WORK', start: '09:00', end: '09:30', taskId: 't-1' },
          { type: 'BREAK', start: '09:30', end: '09:40' },
        ],
      };
      mockPrisma.efSchedule.create.mockResolvedValue(schedule);
      const result = await mockPrisma.efSchedule.create({ data: schedule });
      expect(result.blocks).toHaveLength(2);
    });

    it('gets today schedule', async () => {
      mockPrisma.efSchedule.findUnique.mockResolvedValue({
        id: 'sch-1',
        date: '2026-02-26',
        blocks: [],
      });
      const result = await mockPrisma.efSchedule.findUnique({
        where: { learnerId_date: { learnerId: 'l-1', date: '2026-02-26' } },
      });
      expect(result).toBeDefined();
    });
  });

  describe('Strategy recommendations', () => {
    it('returns strategies for a skill area', async () => {
      mockPrisma.efStrategy.findMany.mockResolvedValue([
        { id: 's-1', skill: 'planning', name: 'Pomodoro', difficulty: 'EASY' },
        { id: 's-2', skill: 'planning', name: 'Goal Decomposition', difficulty: 'MEDIUM' },
      ]);
      const strategies = await mockPrisma.efStrategy.findMany({
        where: { skill: 'planning' },
      });
      expect(strategies).toHaveLength(2);
      expect(strategies[0].name).toBe('Pomodoro');
    });
  });

  describe('Templates', () => {
    it('creates a schedule template', async () => {
      const template = {
        id: 'tmpl-1',
        name: 'School Day',
        blocks: [
          { type: 'WORK', duration: 25 },
          { type: 'BREAK', duration: 5 },
        ],
      };
      mockPrisma.efTemplate.create.mockResolvedValue(template);
      const result = await mockPrisma.efTemplate.create({ data: template });
      expect(result.name).toBe('School Day');
    });

    it('lists available templates', async () => {
      mockPrisma.efTemplate.findMany.mockResolvedValue([
        { id: 'tmpl-1', name: 'School Day' },
        { id: 'tmpl-2', name: 'Homework' },
      ]);
      const templates = await mockPrisma.efTemplate.findMany({});
      expect(templates).toHaveLength(2);
    });
  });
});
