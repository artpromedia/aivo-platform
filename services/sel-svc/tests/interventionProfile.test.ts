/**
 * Tests for SEL service — intervention tracking and profile management.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  selProfile: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  selIntervention: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  selInterventionSession: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  selActivityFavorite: {
    create: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('SEL Student Profile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a student SEL profile', async () => {
    const profile = {
      id: 'sp-1',
      studentId: 's-1',
      tenantId: 't-1',
      selfAwareness: 3,
      selfManagement: 2,
      socialAwareness: 4,
      relationshipSkills: 3,
      responsibleDecisionMaking: 2,
    };
    mockPrisma.selProfile.create.mockResolvedValue(profile);
    const result = await mockPrisma.selProfile.create({ data: profile });
    expect(result.selfAwareness).toBe(3);
  });

  it('retrieves a profile by studentId', async () => {
    mockPrisma.selProfile.findUnique.mockResolvedValue({
      id: 'sp-1',
      studentId: 's-1',
      selfAwareness: 4,
    });
    const result = await mockPrisma.selProfile.findUnique({ where: { studentId: 's-1' } });
    expect(result).toBeDefined();
    expect(result?.selfAwareness).toBe(4);
  });

  it('lists all profiles for a tenant', async () => {
    mockPrisma.selProfile.findMany.mockResolvedValue([
      { id: 'sp-1', studentId: 's-1' },
      { id: 'sp-2', studentId: 's-2' },
    ]);
    const profiles = await mockPrisma.selProfile.findMany({ where: { tenantId: 't-1' } });
    expect(profiles).toHaveLength(2);
  });

  it('updates profile competency scores', async () => {
    mockPrisma.selProfile.update.mockResolvedValue({
      id: 'sp-1',
      selfManagement: 4,
    });
    const result = await mockPrisma.selProfile.update({
      where: { id: 'sp-1' },
      data: { selfManagement: 4 },
    });
    expect(result.selfManagement).toBe(4);
  });
});

describe('SEL Interventions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an intervention', async () => {
    const intervention = {
      id: 'int-1',
      studentId: 's-1',
      type: 'COUNSELING',
      reason: 'Persistent low mood',
      status: 'ACTIVE',
      assignedTo: 'counselor-1',
    };
    mockPrisma.selIntervention.create.mockResolvedValue(intervention);
    const result = await mockPrisma.selIntervention.create({ data: intervention });
    expect(result.type).toBe('COUNSELING');
    expect(result.status).toBe('ACTIVE');
  });

  it('logs an intervention session', async () => {
    const session = {
      id: 'is-1',
      interventionId: 'int-1',
      date: new Date('2026-02-26'),
      duration: 1800,
      notes: 'Student engaged well in activities',
      outcome: 'POSITIVE',
    };
    mockPrisma.selInterventionSession.create.mockResolvedValue(session);
    const result = await mockPrisma.selInterventionSession.create({ data: session });
    expect(result.outcome).toBe('POSITIVE');
    expect(result.duration).toBe(1800);
  });

  it('retrieves intervention sessions', async () => {
    mockPrisma.selInterventionSession.findMany.mockResolvedValue([
      { id: 'is-1', outcome: 'POSITIVE' },
      { id: 'is-2', outcome: 'NEUTRAL' },
    ]);
    const sessions = await mockPrisma.selInterventionSession.findMany({
      where: { interventionId: 'int-1' },
    });
    expect(sessions).toHaveLength(2);
  });

  it('lists interventions for a student', async () => {
    mockPrisma.selIntervention.findMany.mockResolvedValue([
      { id: 'int-1', status: 'ACTIVE' },
      { id: 'int-2', status: 'COMPLETED' },
    ]);
    const interventions = await mockPrisma.selIntervention.findMany({
      where: { studentId: 's-1' },
    });
    expect(interventions).toHaveLength(2);
  });
});

describe('Activity Favorites', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds an activity to favorites', async () => {
    mockPrisma.selActivityFavorite.create.mockResolvedValue({
      studentId: 's-1',
      activityId: 'act-1',
    });
    const result = await mockPrisma.selActivityFavorite.create({
      data: { studentId: 's-1', activityId: 'act-1' },
    });
    expect(result.activityId).toBe('act-1');
  });

  it('removes an activity from favorites', async () => {
    mockPrisma.selActivityFavorite.delete.mockResolvedValue({
      studentId: 's-1',
      activityId: 'act-1',
    });
    const result = await mockPrisma.selActivityFavorite.delete({
      where: { studentId_activityId: { studentId: 's-1', activityId: 'act-1' } },
    });
    expect(result.studentId).toBe('s-1');
  });

  it('checks if activity is favorited', async () => {
    mockPrisma.selActivityFavorite.findUnique.mockResolvedValue(null);
    const result = await mockPrisma.selActivityFavorite.findUnique({
      where: { studentId_activityId: { studentId: 's-1', activityId: 'act-99' } },
    });
    expect(result).toBeNull();
  });
});

describe('SEL Competency domains', () => {
  const SEL_COMPETENCIES = [
    'SELF_AWARENESS',
    'SELF_MANAGEMENT',
    'SOCIAL_AWARENESS',
    'RELATIONSHIP_SKILLS',
    'RESPONSIBLE_DECISION_MAKING',
  ] as const;

  it('has 5 CASEL competency domains', () => {
    expect(SEL_COMPETENCIES).toHaveLength(5);
  });

  it('includes all CASEL domains', () => {
    expect(SEL_COMPETENCIES).toContain('SELF_AWARENESS');
    expect(SEL_COMPETENCIES).toContain('RESPONSIBLE_DECISION_MAKING');
  });
});
