import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSyntheticData } from '../src/data/generator';

// Mock PrismaClient
const mockPrisma = {
  sandboxSyntheticTeacher: {
    create: vi.fn().mockResolvedValue({ id: 'teacher-1' }),
  },
  sandboxSyntheticClass: {
    create: vi.fn().mockResolvedValue({ id: 'class-1' }),
  },
  sandboxSyntheticLearner: {
    create: vi.fn().mockResolvedValue({ id: 'learner-1' }),
  },
  sandboxSyntheticEnrollment: {
    create: vi.fn().mockResolvedValue({ id: 'enrollment-1' }),
  },
  sandboxSyntheticSession: {
    create: vi.fn().mockResolvedValue({ id: 'session-1' }),
  },
  sandboxSyntheticLearnerProgress: {
    create: vi.fn().mockResolvedValue({ id: 'progress-1' }),
  },
};

describe('Synthetic Data Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates the correct number of teachers', async () => {
    const result = await generateSyntheticData(mockPrisma as any, 'tenant-123', {
      learnerCount: 5,
      teacherCount: 3,
      classCount: 2,
    });

    expect(result.teachers).toBe(3);
    expect(mockPrisma.sandboxSyntheticTeacher.create).toHaveBeenCalledTimes(3);
  });

  it('generates the correct number of classes', async () => {
    const result = await generateSyntheticData(mockPrisma as any, 'tenant-123', {
      learnerCount: 5,
      teacherCount: 2,
      classCount: 4,
    });

    expect(result.classes).toBe(4);
    expect(mockPrisma.sandboxSyntheticClass.create).toHaveBeenCalledTimes(4);
  });

  it('generates the correct number of learners', async () => {
    const result = await generateSyntheticData(mockPrisma as any, 'tenant-123', {
      learnerCount: 10,
      teacherCount: 2,
      classCount: 3,
    });

    expect(result.learners).toBe(10);
    expect(mockPrisma.sandboxSyntheticLearner.create).toHaveBeenCalledTimes(10);
  });

  it('creates enrollments for learners', async () => {
    const result = await generateSyntheticData(mockPrisma as any, 'tenant-123', {
      learnerCount: 5,
      teacherCount: 1,
      classCount: 2,
    });

    // Each learner should have 2-4 enrollments (up to classCount)
    expect(result.enrollments).toBeGreaterThan(0);
    expect(mockPrisma.sandboxSyntheticEnrollment.create).toHaveBeenCalled();
  });

  it('creates sessions for learners', async () => {
    const result = await generateSyntheticData(mockPrisma as any, 'tenant-123', {
      learnerCount: 3,
      teacherCount: 1,
      classCount: 2,
    });

    // Each learner gets 5-30 sessions
    expect(result.sessions).toBeGreaterThanOrEqual(15); // 3 learners * 5 min sessions
    expect(mockPrisma.sandboxSyntheticSession.create).toHaveBeenCalled();
  });

  it('creates progress records for learners', async () => {
    const result = await generateSyntheticData(mockPrisma as any, 'tenant-123', {
      learnerCount: 2,
      teacherCount: 1,
      classCount: 1,
    });

    expect(result.progressRecords).toBeGreaterThan(0);
    expect(mockPrisma.sandboxSyntheticLearnerProgress.create).toHaveBeenCalled();
  });

  it('uses the correct tenant ID', async () => {
    await generateSyntheticData(mockPrisma as any, 'my-tenant-id', {
      learnerCount: 1,
      teacherCount: 1,
      classCount: 1,
    });

    expect(mockPrisma.sandboxSyntheticTeacher.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'my-tenant-id',
        }),
      })
    );

    expect(mockPrisma.sandboxSyntheticLearner.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'my-tenant-id',
        }),
      })
    );
  });
});
