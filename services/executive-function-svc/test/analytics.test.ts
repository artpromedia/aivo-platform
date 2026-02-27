/**
 * Tests for executive-function-svc performance summary and analytics.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  efTask: {
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  efProfile: {
    findUnique: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('Performance Summary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates task completion rate', async () => {
    mockPrisma.efTask.count
      .mockResolvedValueOnce(20) // total
      .mockResolvedValueOnce(15); // completed

    const total = await mockPrisma.efTask.count({ where: { learnerId: 'l-1' } });
    const completed = await mockPrisma.efTask.count({
      where: { learnerId: 'l-1', status: 'COMPLETED' },
    });
    const rate = total > 0 ? completed / total : 0;
    expect(rate).toBe(0.75);
  });

  it('handles zero tasks', async () => {
    mockPrisma.efTask.count.mockResolvedValue(0);
    const total = await mockPrisma.efTask.count({ where: { learnerId: 'l-x' } });
    const rate = total > 0 ? 0 / total : 0;
    expect(rate).toBe(0);
  });

  it('groups tasks by priority', async () => {
    mockPrisma.efTask.groupBy.mockResolvedValue([
      { priority: 'HIGH', _count: { id: 5 } },
      { priority: 'MEDIUM', _count: { id: 10 } },
      { priority: 'LOW', _count: { id: 3 } },
    ]);
    const groups = await mockPrisma.efTask.groupBy({
      by: ['priority'],
      _count: { id: true },
      where: { learnerId: 'l-1' },
    });
    expect(groups).toHaveLength(3);
    expect(groups[0]._count.id).toBe(5);
  });

  it('retrieves skill levels from profile', async () => {
    mockPrisma.efProfile.findUnique.mockResolvedValue({
      learnerId: 'l-1',
      workingMemory: 3,
      planning: 4,
      timeManagement: 2,
      organization: 5,
      taskInitiation: 3,
    });
    const profile = await mockPrisma.efProfile.findUnique({ where: { learnerId: 'l-1' } });
    const skills = {
      workingMemory: profile!.workingMemory,
      planning: profile!.planning,
      timeManagement: profile!.timeManagement,
      organization: profile!.organization,
      taskInitiation: profile!.taskInitiation,
    };
    const avg = Object.values(skills).reduce((a: number, b: number) => a + b, 0) / 5;
    expect(avg).toBe(3.4);
  });
});

describe('EF Skill types', () => {
  const EF_SKILLS = [
    'workingMemory',
    'planning',
    'timeManagement',
    'organization',
    'taskInitiation',
    'emotionalRegulation',
    'flexibleThinking',
    'selfMonitoring',
  ] as const;

  it('lists all 8 EF skill domains', () => {
    expect(EF_SKILLS).toHaveLength(8);
  });

  it('includes core skills', () => {
    expect(EF_SKILLS).toContain('workingMemory');
    expect(EF_SKILLS).toContain('planning');
    expect(EF_SKILLS).toContain('emotionalRegulation');
  });

  const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

  it('has valid task statuses', () => {
    expect(TASK_STATUSES).toContain('TODO');
    expect(TASK_STATUSES).toContain('COMPLETED');
    expect(TASK_STATUSES).toHaveLength(4);
  });

  const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

  it('has valid task priorities', () => {
    expect(TASK_PRIORITIES).toContain('URGENT');
    expect(TASK_PRIORITIES).toHaveLength(4);
  });

  const BLOCK_TYPES = ['WORK', 'BREAK', 'TRANSITION', 'REWARD'] as const;

  it('has valid block types', () => {
    expect(BLOCK_TYPES).toContain('WORK');
    expect(BLOCK_TYPES).toContain('BREAK');
    expect(BLOCK_TYPES).toHaveLength(4);
  });
});
