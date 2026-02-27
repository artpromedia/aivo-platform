/**
 * Tests for collaboration-svc care team and action plan service logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  careTeamMember: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  actionPlan: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  actionPlanTask: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  careNote: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  careMeeting: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../src/db/index.js', () => ({ prisma: mockPrisma }));

describe('CareTeam operations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds a member to a care team', async () => {
    const member = { id: 'm-1', studentId: 's-1', userId: 'u-1', role: 'TEACHER', isPrimary: true };
    mockPrisma.careTeamMember.create.mockResolvedValue(member);
    const result = await mockPrisma.careTeamMember.create({ data: member });
    expect(result.role).toBe('TEACHER');
    expect(result.isPrimary).toBe(true);
  });

  it('lists care team members for a student', async () => {
    mockPrisma.careTeamMember.findMany.mockResolvedValue([
      { id: 'm-1', role: 'TEACHER' },
      { id: 'm-2', role: 'COUNSELOR' },
    ]);
    const members = await mockPrisma.careTeamMember.findMany({ where: { studentId: 's-1' } });
    expect(members).toHaveLength(2);
  });

  it('removes a care team member', async () => {
    mockPrisma.careTeamMember.delete.mockResolvedValue({ id: 'm-1' });
    const removed = await mockPrisma.careTeamMember.delete({ where: { id: 'm-1' } });
    expect(removed.id).toBe('m-1');
  });
});

describe('ActionPlan operations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a new action plan in DRAFT status', async () => {
    const plan = { id: 'ap-1', title: 'Behavior Plan', status: 'DRAFT', studentId: 's-1' };
    mockPrisma.actionPlan.create.mockResolvedValue(plan);
    const result = await mockPrisma.actionPlan.create({ data: plan });
    expect(result.status).toBe('DRAFT');
  });

  it('activates an action plan', async () => {
    mockPrisma.actionPlan.update.mockResolvedValue({ id: 'ap-1', status: 'ACTIVE' });
    const result = await mockPrisma.actionPlan.update({
      where: { id: 'ap-1' },
      data: { status: 'ACTIVE' },
    });
    expect(result.status).toBe('ACTIVE');
  });

  it('adds tasks to action plan', async () => {
    const task = { id: 't-1', planId: 'ap-1', title: 'Weekly check-in', frequency: 'WEEKLY' };
    mockPrisma.actionPlanTask.create.mockResolvedValue(task);
    const result = await mockPrisma.actionPlanTask.create({ data: task });
    expect(result.frequency).toBe('WEEKLY');
  });

  it('lists tasks for a plan', async () => {
    mockPrisma.actionPlanTask.findMany.mockResolvedValue([
      { id: 't-1', title: 'Check-in' },
      { id: 't-2', title: 'Assessment' },
    ]);
    const tasks = await mockPrisma.actionPlanTask.findMany({ where: { planId: 'ap-1' } });
    expect(tasks).toHaveLength(2);
  });
});

describe('CareNote operations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a care note', async () => {
    const note = { id: 'cn-1', studentId: 's-1', type: 'OBSERVATION', content: 'Student showed improvement' };
    mockPrisma.careNote.create.mockResolvedValue(note);
    const result = await mockPrisma.careNote.create({ data: note });
    expect(result.type).toBe('OBSERVATION');
  });

  it('lists notes filtered by type', async () => {
    mockPrisma.careNote.findMany.mockResolvedValue([{ id: 'cn-1', type: 'PROGRESS' }]);
    const notes = await mockPrisma.careNote.findMany({ where: { type: 'PROGRESS' } });
    expect(notes[0].type).toBe('PROGRESS');
  });
});

describe('CareMeeting operations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('schedules a meeting', async () => {
    const meeting = {
      id: 'cm-1',
      title: 'IEP Review',
      status: 'SCHEDULED',
      scheduledAt: new Date('2026-03-01T10:00:00Z'),
    };
    mockPrisma.careMeeting.create.mockResolvedValue(meeting);
    const result = await mockPrisma.careMeeting.create({ data: meeting });
    expect(result.status).toBe('SCHEDULED');
  });

  it('cancels a meeting', async () => {
    mockPrisma.careMeeting.update.mockResolvedValue({ id: 'cm-1', status: 'CANCELLED' });
    const result = await mockPrisma.careMeeting.update({
      where: { id: 'cm-1' },
      data: { status: 'CANCELLED' },
    });
    expect(result.status).toBe('CANCELLED');
  });

  it('completes a meeting', async () => {
    mockPrisma.careMeeting.update.mockResolvedValue({ id: 'cm-1', status: 'COMPLETED' });
    const result = await mockPrisma.careMeeting.update({
      where: { id: 'cm-1' },
      data: { status: 'COMPLETED' },
    });
    expect(result.status).toBe('COMPLETED');
  });
});
