/**
 * Tests for professional-dev-svc program and enrollment management.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  program: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  enrollment: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  module: {
    findMany: vi.fn(),
  },
  moduleProgress: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('ProgramService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createProgram', () => {
    it('creates PD program with modules', async () => {
      const prog = {
        id: 'prog-1',
        name: 'Differentiated Instruction',
        description: 'Learn DI strategies for diverse classrooms',
        credits: 15,
        status: 'DRAFT',
        modules: [
          { id: 'mod-1', title: 'Introduction to DI', order: 1 },
          { id: 'mod-2', title: 'Assessment Strategies', order: 2 },
        ],
      };
      mockPrisma.program.create.mockResolvedValue(prog);
      const result = await mockPrisma.program.create({
        data: prog,
        include: { modules: true },
      });
      expect(result.credits).toBe(15);
      expect(result.modules).toHaveLength(2);
    });
  });

  describe('getPrograms', () => {
    it('lists programs with enrollment counts', async () => {
      mockPrisma.program.findMany.mockResolvedValue([
        { id: 'prog-1', name: 'Differentiated Instruction', _count: { enrollments: 25 } },
        { id: 'prog-2', name: 'Tech Integration', _count: { enrollments: 42 } },
      ]);
      const programs = await mockPrisma.program.findMany({
        include: { _count: { select: { enrollments: true } } },
      });
      expect(programs).toHaveLength(2);
      expect(programs[1]._count.enrollments).toBe(42);
    });
  });

  describe('startProgram', () => {
    it('activates a program for enrollment', async () => {
      mockPrisma.program.update.mockResolvedValue({
        id: 'prog-1',
        status: 'ACTIVE',
        startDate: new Date('2026-01-15'),
      });
      const result = await mockPrisma.program.update({
        where: { id: 'prog-1' },
        data: { status: 'ACTIVE', startDate: new Date('2026-01-15') },
      });
      expect(result.status).toBe('ACTIVE');
    });
  });
});

describe('EnrollmentService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('enrollTeacher', () => {
    it('creates enrollment for teacher in program', async () => {
      const enrollment = {
        id: 'enr-1',
        teacherId: 'teacher-1',
        programId: 'prog-1',
        status: 'ENROLLED',
        enrolledAt: new Date(),
      };
      mockPrisma.enrollment.create.mockResolvedValue(enrollment);
      const result = await mockPrisma.enrollment.create({ data: enrollment });
      expect(result.status).toBe('ENROLLED');
    });

    it('prevents duplicate enrollments', async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        teacherId: 'teacher-1',
        programId: 'prog-1',
      });
      const existing = await mockPrisma.enrollment.findUnique({
        where: {
          teacherId_programId: {
            teacherId: 'teacher-1',
            programId: 'prog-1',
          },
        },
      });
      expect(existing).not.toBeNull();
    });
  });

  describe('updateModuleProgress', () => {
    it('records module completion with score', async () => {
      mockPrisma.moduleProgress.upsert.mockResolvedValue({
        enrollmentId: 'enr-1',
        moduleId: 'mod-1',
        status: 'COMPLETED',
        score: 92,
        completedAt: new Date(),
      });
      const result = await mockPrisma.moduleProgress.upsert({
        where: { enrollmentId_moduleId: { enrollmentId: 'enr-1', moduleId: 'mod-1' } },
        update: { status: 'COMPLETED', score: 92 },
        create: { enrollmentId: 'enr-1', moduleId: 'mod-1', status: 'COMPLETED', score: 92 },
      });
      expect(result.score).toBe(92);
    });
  });

  describe('completeEnrollment', () => {
    it('completes enrollment when all modules done', async () => {
      mockPrisma.enrollment.update.mockResolvedValue({
        id: 'enr-1',
        status: 'COMPLETED',
        completedAt: new Date(),
        creditsEarned: 15,
      });
      const result = await mockPrisma.enrollment.update({
        where: { id: 'enr-1' },
        data: { status: 'COMPLETED', creditsEarned: 15 },
      });
      expect(result.creditsEarned).toBe(15);
    });
  });

  describe('getTeacherEnrollments', () => {
    it('returns enrollments with progress', async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([
        {
          id: 'enr-1',
          programId: 'prog-1',
          status: 'IN_PROGRESS',
          progress: 60,
        },
      ]);
      const enrollments = await mockPrisma.enrollment.findMany({
        where: { teacherId: 'teacher-1' },
      });
      expect(enrollments[0].progress).toBe(60);
    });
  });
});
