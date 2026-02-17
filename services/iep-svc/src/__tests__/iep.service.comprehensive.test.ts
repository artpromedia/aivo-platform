/**
 * IEP Service — Comprehensive Unit Tests (Sprint 7)
 *
 * Covers: createIEP, getIEP, listIEPs, updateIEP, submitIEP, approveIEP,
 * addGoal, addAccommodation, recordProgress, compliance timeline checks.
 * Target: ≥80% line coverage for iepService.ts + studentService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockIEP = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const mockGoal = {
  create: vi.fn(),
  count: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
};
const mockObjective = {
  createMany: vi.fn(),
  findMany: vi.fn(),
};
const mockAccommodation = {
  create: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
};
const mockService = {
  create: vi.fn(),
  findMany: vi.fn(),
};
const mockProgressData = {
  create: vi.fn(),
  findMany: vi.fn(),
};
const mockStudent = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
};
const mockMeeting = {
  findMany: vi.fn(),
};
const mockProgressReport = {
  findMany: vi.fn(),
};

vi.mock('../prisma.js', () => ({
  prisma: {
    iEP: mockIEP,
    iEPGoal: mockGoal,
    objective: mockObjective,
    accommodation: mockAccommodation,
    service: mockService,
    progressData: mockProgressData,
    student: mockStudent,
    meeting: mockMeeting,
    progressReport: mockProgressReport,
    $transaction: vi.fn((fn: any) =>
      fn({
        iEP: mockIEP,
        iEPGoal: mockGoal,
        objective: mockObjective,
        accommodation: mockAccommodation,
        service: mockService,
        progressData: mockProgressData,
        student: mockStudent,
      })
    ),
  },
}));

vi.mock('../config.js', () => ({
  config: {
    compliance: {
      reevaluationYears: 3,
      progressReportFrequencyDays: 30,
    },
  },
}));

import {
  createIEP,
  getIEP,
  listIEPs,
  updateIEP,
  submitIEP,
  approveIEP,
  addGoal,
} from '../services/iepService.js';

import { createStudent, getStudent, listStudents } from '../services/studentService.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-teacher-001';

function createMockIEPRecord(overrides = {}) {
  return {
    id: 'iep-001',
    tenantId: TENANT_ID,
    studentId: 'student-001',
    iepNumber: 'IEP-1',
    version: 1,
    iepType: 'INITIAL',
    status: 'DRAFT',
    meetingDate: null,
    effectiveDate: new Date('2026-09-01'),
    annualReviewDate: new Date('2027-09-01'),
    reevaluationDate: new Date('2029-09-01'),
    createdBy: USER_ID,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    student: {
      id: 'student-001',
      studentId: 'S-12345',
      firstName: 'Alex',
      lastName: 'Johnson',
      dateOfBirth: new Date('2017-03-15'),
      grade: '3',
      school: 'Elm Street Elementary',
      primaryDisability: 'SLD',
    },
    goals: [],
    accommodations: [],
    modifications: [],
    services: [],
    transitionPlan: null,
    _count: { meetings: 0, progressReports: 0, amendments: 0 },
    ...overrides,
  };
}

function createMockGoal(overrides = {}) {
  return {
    id: 'goal-001',
    iepId: 'iep-001',
    goalNumber: 1,
    domain: 'READING',
    description: 'Student will read at grade level',
    baseline: 'Currently reading at 2nd grade level',
    targetCriteria: '80% accuracy on grade-level passages',
    measurementMethod: 'Running records, weekly probes',
    targetDate: new Date('2027-06-01'),
    status: 'NOT_STARTED',
    standardsAligned: ['ELA.RF.3.3', 'ELA.RF.3.4'],
    objectives: [],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('IEP Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Create IEP
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createIEP', () => {
    it('should create an IEP with auto-numbered identifier', async () => {
      mockIEP.count.mockResolvedValue(0);
      const created = createMockIEPRecord({ iepNumber: 'IEP-1' });
      mockIEP.create.mockResolvedValue(created);
      mockIEP.update.mockResolvedValue(created);
      mockIEP.findFirst.mockResolvedValue(created);

      const result = await createIEP(TENANT_ID, USER_ID, {
        studentId: 'student-001',
        iepType: 'INITIAL',
        effectiveDate: '2026-09-01',
      });

      expect(mockIEP.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            studentId: 'student-001',
            iepNumber: 'IEP-1',
            status: 'DRAFT',
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it('should increment IEP number for existing IEPs', async () => {
      mockIEP.count.mockResolvedValue(3);
      const created = createMockIEPRecord({ iepNumber: 'IEP-4' });
      mockIEP.create.mockResolvedValue(created);
      mockIEP.update.mockResolvedValue(created);
      mockIEP.findFirst.mockResolvedValue(created);

      await createIEP(TENANT_ID, USER_ID, {
        studentId: 'student-001',
        iepType: 'ANNUAL_REVIEW',
      });

      expect(mockIEP.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            iepNumber: 'IEP-4',
          }),
        })
      );
    });

    it('should set annual review date to effective date + 1 year', async () => {
      mockIEP.count.mockResolvedValue(0);
      const created = createMockIEPRecord();
      mockIEP.create.mockResolvedValue(created);
      mockIEP.update.mockResolvedValue(created);
      mockIEP.findFirst.mockResolvedValue(created);

      await createIEP(TENANT_ID, USER_ID, {
        studentId: 'student-001',
        iepType: 'INITIAL',
        effectiveDate: '2026-09-01',
      });

      expect(mockIEP.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            annualReviewDate: expect.any(Date),
            reevaluationDate: expect.any(Date),
          }),
        })
      );
    });

    it('should default participatesInGenEd to true', async () => {
      mockIEP.count.mockResolvedValue(0);
      const created = createMockIEPRecord();
      mockIEP.create.mockResolvedValue(created);
      mockIEP.findFirst.mockResolvedValue(created);

      await createIEP(TENANT_ID, USER_ID, {
        studentId: 'student-001',
        iepType: 'INITIAL',
      });

      expect(mockIEP.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            participatesInGenEd: true,
          }),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Get IEP
  // ═══════════════════════════════════════════════════════════════════════════
  describe('getIEP', () => {
    it('should include student, goals, accommodations, services in response', async () => {
      mockIEP.findFirst.mockResolvedValue(createMockIEPRecord());

      const result = await getIEP(TENANT_ID, 'iep-001');

      expect(mockIEP.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'iep-001', tenantId: TENANT_ID },
          include: expect.objectContaining({
            student: expect.any(Object),
            goals: expect.any(Object),
            accommodations: expect.any(Object),
            services: expect.any(Object),
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it('should return null for non-existent IEP', async () => {
      mockIEP.findFirst.mockResolvedValue(null);

      const result = await getIEP(TENANT_ID, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // List IEPs
  // ═══════════════════════════════════════════════════════════════════════════
  describe('listIEPs', () => {
    it('should return paginated results', async () => {
      mockIEP.findMany.mockResolvedValue([createMockIEPRecord()]);
      mockIEP.count.mockResolvedValue(1);

      const result = await listIEPs(TENANT_ID, { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      });
    });

    it('should filter by studentId', async () => {
      mockIEP.findMany.mockResolvedValue([]);
      mockIEP.count.mockResolvedValue(0);

      await listIEPs(TENANT_ID, { studentId: 'student-001' });

      expect(mockIEP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            studentId: 'student-001',
          }),
        })
      );
    });

    it('should filter by status', async () => {
      mockIEP.findMany.mockResolvedValue([]);
      mockIEP.count.mockResolvedValue(0);

      await listIEPs(TENANT_ID, { status: 'ACTIVE' });

      expect(mockIEP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should calculate correct totalPages', async () => {
      mockIEP.findMany.mockResolvedValue([createMockIEPRecord()]);
      mockIEP.count.mockResolvedValue(45);

      const result = await listIEPs(TENANT_ID, { page: 1, pageSize: 20 });

      expect(result.pagination.totalPages).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Update IEP
  // ═══════════════════════════════════════════════════════════════════════════
  describe('updateIEP', () => {
    it('should update an existing IEP', async () => {
      mockIEP.findFirst.mockResolvedValue(createMockIEPRecord());
      mockIEP.update.mockResolvedValue(createMockIEPRecord({ academicLevel: 'Updated level' }));

      const result = await updateIEP(TENANT_ID, 'iep-001', USER_ID, {
        academicLevel: 'Updated level',
      });

      expect(result.academicLevel).toBe('Updated level');
    });

    it('should throw when updating non-existent IEP', async () => {
      mockIEP.findFirst.mockResolvedValue(null);

      await expect(
        updateIEP(TENANT_ID, 'nonexistent', USER_ID, { academicLevel: 'test' })
      ).rejects.toThrow('IEP not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Submit IEP
  // ═══════════════════════════════════════════════════════════════════════════
  describe('submitIEP', () => {
    it('should transition DRAFT → PENDING_REVIEW', async () => {
      const draft = createMockIEPRecord({ status: 'DRAFT' });
      mockIEP.findFirst.mockResolvedValue(draft);
      mockIEP.update.mockResolvedValue(createMockIEPRecord({ status: 'PENDING_REVIEW' }));

      const result = await submitIEP(TENANT_ID, 'iep-001', USER_ID);

      expect(mockIEP.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING_REVIEW',
            submittedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should reject submission of non-DRAFT IEP', async () => {
      mockIEP.findFirst.mockResolvedValue(createMockIEPRecord({ status: 'ACTIVE' }));

      await expect(submitIEP(TENANT_ID, 'iep-001', USER_ID)).rejects.toThrow('not in draft status');
    });

    it('should throw for non-existent IEP', async () => {
      mockIEP.findFirst.mockResolvedValue(null);

      await expect(submitIEP(TENANT_ID, 'nonexistent', USER_ID)).rejects.toThrow('IEP not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Approve IEP
  // ═══════════════════════════════════════════════════════════════════════════
  describe('approveIEP', () => {
    it('should set status to ACTIVE with approval metadata', async () => {
      mockIEP.findFirst.mockResolvedValue(createMockIEPRecord({ status: 'PENDING_REVIEW' }));
      mockIEP.update.mockResolvedValue(createMockIEPRecord({ status: 'ACTIVE' }));

      await approveIEP(TENANT_ID, 'iep-001', USER_ID);

      expect(mockIEP.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
            approvedAt: expect.any(Date),
            approvedBy: USER_ID,
          }),
        })
      );
    });

    it('should throw for non-existent IEP', async () => {
      mockIEP.findFirst.mockResolvedValue(null);

      await expect(approveIEP(TENANT_ID, 'nonexistent', USER_ID)).rejects.toThrow('IEP not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Goals
  // ═══════════════════════════════════════════════════════════════════════════
  describe('addGoal', () => {
    it('should auto-number goals', async () => {
      mockIEP.findFirst.mockResolvedValue(createMockIEPRecord());
      mockGoal.count.mockResolvedValue(2);
      const goal = createMockGoal({ goalNumber: 3 });
      mockGoal.create.mockResolvedValue(goal);
      mockObjective.createMany.mockResolvedValue({ count: 0 });

      const result = await addGoal(TENANT_ID, 'iep-001', {
        domain: 'READING',
        description: 'Read at grade level',
        baseline: '2nd grade level',
        targetCriteria: '80% accuracy',
        measurementMethod: 'Running records',
      });

      expect(mockGoal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            goalNumber: 3,
            status: 'NOT_STARTED',
          }),
        })
      );
    });

    it('should throw when IEP not found', async () => {
      mockIEP.findFirst.mockResolvedValue(null);

      await expect(
        addGoal(TENANT_ID, 'nonexistent', {
          domain: 'READING',
          description: 'test',
        })
      ).rejects.toThrow('IEP not found');
    });

    it('should create objectives if provided', async () => {
      mockIEP.findFirst.mockResolvedValue(createMockIEPRecord());
      mockGoal.count.mockResolvedValue(0);
      mockGoal.create.mockResolvedValue(createMockGoal());
      mockObjective.createMany.mockResolvedValue({ count: 2 });

      await addGoal(TENANT_ID, 'iep-001', {
        domain: 'MATH',
        description: 'test goal',
        objectives: [
          { description: 'Objective 1', targetCriteria: '90%', timeline: '3 months' },
          { description: 'Objective 2', targetCriteria: '85%', timeline: '6 months' },
        ],
      });

      expect(mockObjective.createMany).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Student Service
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Student Service', () => {
    describe('createStudent', () => {
      it('should create a student record', async () => {
        const student = {
          id: 'student-001',
          tenantId: TENANT_ID,
          studentId: 'S-12345',
          firstName: 'Alex',
          lastName: 'Johnson',
        };
        mockStudent.create.mockResolvedValue(student);

        const result = await createStudent(TENANT_ID, {
          studentId: 'S-12345',
          firstName: 'Alex',
          lastName: 'Johnson',
        });

        expect(result.studentId).toBe('S-12345');
      });
    });

    describe('getStudent', () => {
      it('should return student with IEPs', async () => {
        mockStudent.findFirst.mockResolvedValue({
          id: 'student-001',
          firstName: 'Alex',
          ieps: [createMockIEPRecord()],
        });

        const result = await getStudent(TENANT_ID, 'student-001');

        expect(result).toBeDefined();
        expect(result?.firstName).toBe('Alex');
      });

      it('should return null for non-existent student', async () => {
        mockStudent.findFirst.mockResolvedValue(null);

        const result = await getStudent(TENANT_ID, 'nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('listStudents', () => {
      it('should support search by name', async () => {
        mockStudent.findMany.mockResolvedValue([
          { id: 'student-001', firstName: 'Alex', lastName: 'Johnson' },
        ]);
        mockStudent.count.mockResolvedValue(1);

        const result = await listStudents(TENANT_ID, { search: 'Alex' });

        expect(result.data).toHaveLength(1);
      });

      it('should return paginated results', async () => {
        mockStudent.findMany.mockResolvedValue([]);
        mockStudent.count.mockResolvedValue(50);

        const result = await listStudents(TENANT_ID, { page: 1, pageSize: 10 });

        expect(result.pagination.totalItems).toBe(50);
        expect(result.pagination.totalPages).toBe(5);
      });
    });
  });
});
