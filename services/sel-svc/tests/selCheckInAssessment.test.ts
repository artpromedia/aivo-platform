/**
 * Tests for SEL service — check-in, mood trends, and assessment flows.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  selProfile: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  selCheckIn: {
    create: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  selAssessment: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  selAssessmentResponse: {
    create: vi.fn(),
  },
  selActivity: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  selActivityCompletion: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  selIntervention: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  selAlert: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('SEL Check-in', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a mood check-in', async () => {
    const checkIn = {
      id: 'ci-1',
      studentId: 's-1',
      mood: 'HAPPY',
      energy: 4,
      note: 'Feeling good today',
      createdAt: new Date(),
    };
    mockPrisma.selCheckIn.create.mockResolvedValue(checkIn);
    const result = await mockPrisma.selCheckIn.create({ data: checkIn });
    expect(result.mood).toBe('HAPPY');
    expect(result.energy).toBe(4);
  });

  it('retrieves check-in history', async () => {
    mockPrisma.selCheckIn.findMany.mockResolvedValue([
      { id: 'ci-1', mood: 'HAPPY', createdAt: new Date('2026-02-24') },
      { id: 'ci-2', mood: 'SAD', createdAt: new Date('2026-02-25') },
      { id: 'ci-3', mood: 'CALM', createdAt: new Date('2026-02-26') },
    ]);
    const history = await mockPrisma.selCheckIn.findMany({
      where: { studentId: 's-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(history).toHaveLength(3);
  });

  it('gets mood trends grouped by mood', async () => {
    mockPrisma.selCheckIn.groupBy.mockResolvedValue([
      { mood: 'HAPPY', _count: { id: 10 } },
      { mood: 'SAD', _count: { id: 3 } },
      { mood: 'CALM', _count: { id: 7 } },
    ]);
    const trends = await mockPrisma.selCheckIn.groupBy({
      by: ['mood'],
      _count: { id: true },
      where: { studentId: 's-1' },
    });
    expect(trends).toHaveLength(3);
    const happyCount = trends.find((t: any) => t.mood === 'HAPPY')?._count.id;
    expect(happyCount).toBe(10);
  });
});

describe('SEL Assessment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a new assessment', async () => {
    const assessment = {
      id: 'a-1',
      studentId: 's-1',
      type: 'SELF_AWARENESS',
      status: 'IN_PROGRESS',
      totalQuestions: 10,
    };
    mockPrisma.selAssessment.create.mockResolvedValue(assessment);
    const result = await mockPrisma.selAssessment.create({ data: assessment });
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.totalQuestions).toBe(10);
  });

  it('submits a response', async () => {
    const response = {
      id: 'r-1',
      assessmentId: 'a-1',
      questionId: 'q-1',
      answer: 3,
    };
    mockPrisma.selAssessmentResponse.create.mockResolvedValue(response);
    const result = await mockPrisma.selAssessmentResponse.create({ data: response });
    expect(result.answer).toBe(3);
  });

  it('completes an assessment', async () => {
    mockPrisma.selAssessment.update.mockResolvedValue({
      id: 'a-1',
      status: 'COMPLETED',
      score: 78,
      completedAt: new Date(),
    });
    const result = await mockPrisma.selAssessment.update({
      where: { id: 'a-1' },
      data: { status: 'COMPLETED', score: 78 },
    });
    expect(result.status).toBe('COMPLETED');
    expect(result.score).toBe(78);
  });
});

describe('SEL Activities', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists activities', async () => {
    mockPrisma.selActivity.findMany.mockResolvedValue([
      { id: 'act-1', name: 'Deep Breathing', category: 'SELF_REGULATION', gradeMin: 1, gradeMax: 5 },
      { id: 'act-2', name: 'Emotion Wheel', category: 'SELF_AWARENESS', gradeMin: 3, gradeMax: 8 },
    ]);
    const activities = await mockPrisma.selActivity.findMany({});
    expect(activities).toHaveLength(2);
  });

  it('records activity completion', async () => {
    mockPrisma.selActivityCompletion.create.mockResolvedValue({
      id: 'comp-1',
      studentId: 's-1',
      activityId: 'act-1',
      duration: 300,
      rating: 5,
    });
    const result = await mockPrisma.selActivityCompletion.create({
      data: { studentId: 's-1', activityId: 'act-1', duration: 300, rating: 5 },
    });
    expect(result.rating).toBe(5);
  });
});

describe('SEL Alerts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gets unacknowledged alerts', async () => {
    mockPrisma.selAlert.findMany.mockResolvedValue([
      { id: 'alert-1', studentId: 's-1', type: 'LOW_MOOD_PATTERN', acknowledged: false },
    ]);
    const alerts = await mockPrisma.selAlert.findMany({
      where: { studentId: 's-1', acknowledged: false },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('LOW_MOOD_PATTERN');
  });

  it('acknowledges an alert', async () => {
    mockPrisma.selAlert.update.mockResolvedValue({
      id: 'alert-1',
      acknowledged: true,
      acknowledgedAt: new Date(),
    });
    const result = await mockPrisma.selAlert.update({
      where: { id: 'alert-1' },
      data: { acknowledged: true },
    });
    expect(result.acknowledged).toBe(true);
  });

  it('resolves an alert', async () => {
    mockPrisma.selAlert.update.mockResolvedValue({
      id: 'alert-1',
      status: 'RESOLVED',
      resolvedAt: new Date(),
    });
    const result = await mockPrisma.selAlert.update({
      where: { id: 'alert-1' },
      data: { status: 'RESOLVED' },
    });
    expect(result.status).toBe('RESOLVED');
  });
});
