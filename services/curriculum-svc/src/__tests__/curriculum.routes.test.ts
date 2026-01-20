/**
 * Curriculum Routes Tests
 * Tests for CRUD operations on curricula
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma client
const mockPrisma = {
  curriculum: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  curriculumUnit: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  lesson: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  standardAlignment: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  pacingGuide: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
};

vi.mock('../../db.js', () => ({
  prisma: mockPrisma,
}));

// Import after mock
const { CurriculumService } = await import('../../services/curriculum.service.js');

describe('CurriculumService - Curriculum CRUD', () => {
  let service: InstanceType<typeof CurriculumService>;
  const tenantId = 'tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createCurriculum', () => {
    it('should create a new curriculum with required fields', async () => {
      const createData = {
        name: 'Grade 5 Math Curriculum',
        description: 'Comprehensive math curriculum for 5th grade',
        standard: 'COMMON_CORE' as const,
        subject: 'MATH' as const,
        gradeBand: 'G3_5' as const,
        academicYear: '2024-2025',
      };

      const mockCreated = {
        id: 'curr-1',
        tenantId,
        ...createData,
        createdBy: 'user-1',
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.curriculum.create.mockResolvedValue(mockCreated);

      const result = await service.createCurriculum(tenantId, createData, 'user-1');

      expect(mockPrisma.curriculum.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          name: createData.name,
          description: createData.description,
          standard: createData.standard,
          subject: createData.subject,
          gradeBand: createData.gradeBand,
          academicYear: createData.academicYear,
          createdBy: 'user-1',
          isActive: true,
          version: 1,
        },
      });
      expect(result.id).toBe('curr-1');
      expect(result.name).toBe('Grade 5 Math Curriculum');
      expect(result.isActive).toBe(true);
    });

    it('should create curriculum without optional description', async () => {
      const createData = {
        name: 'ELA Curriculum',
        standard: 'COMMON_CORE' as const,
        subject: 'ELA' as const,
        gradeBand: 'G6_8' as const,
        academicYear: '2024-2025',
      };

      mockPrisma.curriculum.create.mockResolvedValue({
        id: 'curr-2',
        tenantId,
        ...createData,
        description: null,
        isActive: true,
        version: 1,
      });

      const result = await service.createCurriculum(tenantId, createData);

      expect(result.id).toBe('curr-2');
      expect(result.description).toBeNull();
    });

    it('should set version to 1 for new curricula', async () => {
      const createData = {
        name: 'Science Curriculum',
        standard: 'NGSS' as const,
        subject: 'SCIENCE' as const,
        gradeBand: 'G9_12' as const,
        academicYear: '2024-2025',
      };

      mockPrisma.curriculum.create.mockResolvedValue({
        id: 'curr-3',
        tenantId,
        ...createData,
        version: 1,
        isActive: true,
      });

      const result = await service.createCurriculum(tenantId, createData);

      expect(mockPrisma.curriculum.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 1 }),
        })
      );
      expect(result.version).toBe(1);
    });
  });

  describe('getCurricula', () => {
    it('should return all curricula for a tenant', async () => {
      const mockCurricula = [
        {
          id: 'curr-1',
          tenantId,
          name: 'Math Curriculum',
          subject: 'MATH',
          gradeBand: 'G3_5',
          academicYear: '2024-2025',
          isActive: true,
          _count: { units: 5 },
        },
        {
          id: 'curr-2',
          tenantId,
          name: 'ELA Curriculum',
          subject: 'ELA',
          gradeBand: 'G3_5',
          academicYear: '2024-2025',
          isActive: true,
          _count: { units: 8 },
        },
      ];

      mockPrisma.curriculum.findMany.mockResolvedValue(mockCurricula);

      const result = await service.getCurricula(tenantId);

      expect(mockPrisma.curriculum.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        include: {
          _count: { select: { units: true } },
        },
        orderBy: [{ subject: 'asc' }, { gradeBand: 'asc' }],
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Math Curriculum');
    });

    it('should filter curricula by subject', async () => {
      mockPrisma.curriculum.findMany.mockResolvedValue([
        {
          id: 'curr-1',
          tenantId,
          name: 'Math Curriculum',
          subject: 'MATH',
          gradeBand: 'G3_5',
          _count: { units: 5 },
        },
      ]);

      const result = await service.getCurricula(tenantId, { subject: 'MATH' });

      expect(mockPrisma.curriculum.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, subject: 'MATH' },
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should filter curricula by grade band', async () => {
      mockPrisma.curriculum.findMany.mockResolvedValue([]);

      await service.getCurricula(tenantId, { gradeBand: 'G9_12' });

      expect(mockPrisma.curriculum.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, gradeBand: 'G9_12' },
        })
      );
    });

    it('should filter curricula by academic year', async () => {
      mockPrisma.curriculum.findMany.mockResolvedValue([]);

      await service.getCurricula(tenantId, { academicYear: '2024-2025' });

      expect(mockPrisma.curriculum.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, academicYear: '2024-2025' },
        })
      );
    });

    it('should filter by active status', async () => {
      mockPrisma.curriculum.findMany.mockResolvedValue([]);

      await service.getCurricula(tenantId, { isActive: true });

      expect(mockPrisma.curriculum.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, isActive: true },
        })
      );
    });

    it('should combine multiple filters', async () => {
      mockPrisma.curriculum.findMany.mockResolvedValue([]);

      await service.getCurricula(tenantId, {
        subject: 'MATH',
        gradeBand: 'G6_8',
        academicYear: '2024-2025',
        isActive: true,
      });

      expect(mockPrisma.curriculum.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId,
            subject: 'MATH',
            gradeBand: 'G6_8',
            academicYear: '2024-2025',
            isActive: true,
          },
        })
      );
    });
  });

  describe('getCurriculum', () => {
    it('should return curriculum with units and lessons', async () => {
      const mockCurriculum = {
        id: 'curr-1',
        tenantId,
        name: 'Math Curriculum',
        subject: 'MATH',
        gradeBand: 'G3_5',
        academicYear: '2024-2025',
        units: [
          {
            id: 'unit-1',
            title: 'Addition and Subtraction',
            orderIndex: 0,
            lessons: [
              { id: 'lesson-1', title: 'Basic Addition', orderIndex: 0 },
              { id: 'lesson-2', title: 'Basic Subtraction', orderIndex: 1 },
            ],
            standards: [],
            _count: { lessons: 2, resources: 3 },
          },
        ],
        standards: [],
        pacingGuides: [],
      };

      mockPrisma.curriculum.findUnique.mockResolvedValue(mockCurriculum);

      const result = await service.getCurriculum('curr-1');

      expect(mockPrisma.curriculum.findUnique).toHaveBeenCalledWith({
        where: { id: 'curr-1' },
        include: {
          units: {
            orderBy: { orderIndex: 'asc' },
            include: {
              lessons: { orderBy: { orderIndex: 'asc' } },
              standards: true,
              _count: { select: { lessons: true, resources: true } },
            },
          },
          standards: true,
          pacingGuides: { orderBy: { isDefault: 'desc' } },
        },
      });
      expect(result?.name).toBe('Math Curriculum');
      expect(result?.units).toHaveLength(1);
      expect(result?.units[0].lessons).toHaveLength(2);
    });

    it('should return null for non-existent curriculum', async () => {
      mockPrisma.curriculum.findUnique.mockResolvedValue(null);

      const result = await service.getCurriculum('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateCurriculum', () => {
    it('should update curriculum and increment version', async () => {
      const currentCurriculum = {
        id: 'curr-1',
        name: 'Old Name',
        version: 1,
      };

      mockPrisma.curriculum.findUnique.mockResolvedValue(currentCurriculum);
      mockPrisma.curriculum.update.mockResolvedValue({
        ...currentCurriculum,
        name: 'New Name',
        version: 2,
      });

      const result = await service.updateCurriculum('curr-1', { name: 'New Name' });

      expect(mockPrisma.curriculum.update).toHaveBeenCalledWith({
        where: { id: 'curr-1' },
        data: {
          name: 'New Name',
          version: 2,
        },
      });
      expect(result.name).toBe('New Name');
      expect(result.version).toBe(2);
    });

    it('should update multiple fields', async () => {
      mockPrisma.curriculum.findUnique.mockResolvedValue({ id: 'curr-1', version: 3 });
      mockPrisma.curriculum.update.mockResolvedValue({
        id: 'curr-1',
        name: 'Updated Curriculum',
        description: 'New description',
        version: 4,
      });

      const result = await service.updateCurriculum('curr-1', {
        name: 'Updated Curriculum',
        description: 'New description',
      });

      expect(result.name).toBe('Updated Curriculum');
      expect(result.description).toBe('New description');
    });

    it('should handle version increment from null', async () => {
      mockPrisma.curriculum.findUnique.mockResolvedValue({ id: 'curr-1', version: null });
      mockPrisma.curriculum.update.mockResolvedValue({ id: 'curr-1', version: 1 });

      await service.updateCurriculum('curr-1', { name: 'Test' });

      expect(mockPrisma.curriculum.update).toHaveBeenCalledWith({
        where: { id: 'curr-1' },
        data: expect.objectContaining({ version: 1 }),
      });
    });
  });

  describe('archiveCurriculum', () => {
    it('should set isActive to false', async () => {
      mockPrisma.curriculum.update.mockResolvedValue({
        id: 'curr-1',
        isActive: false,
      });

      const result = await service.archiveCurriculum('curr-1');

      expect(mockPrisma.curriculum.update).toHaveBeenCalledWith({
        where: { id: 'curr-1' },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });
  });

  describe('duplicateCurriculum', () => {
    it('should duplicate curriculum with all units and lessons', async () => {
      const sourceCurriculum = {
        id: 'curr-1',
        tenantId,
        name: 'Original Curriculum',
        description: 'Original description',
        standard: 'COMMON_CORE',
        subject: 'MATH',
        gradeBand: 'G3_5',
        academicYear: '2023-2024',
        createdBy: 'user-1',
        units: [
          {
            id: 'unit-1',
            title: 'Unit 1',
            description: 'Unit description',
            orderIndex: 0,
            essentialQuestions: ['What is math?'],
            bigIdeas: ['Numbers are fundamental'],
            durationDays: 10,
            lessons: [
              {
                id: 'lesson-1',
                title: 'Lesson 1',
                description: 'Lesson desc',
                orderIndex: 0,
                objectives: ['Learn basics'],
                durationMin: 45,
                lessonType: 'DIRECT_INSTRUCTION',
                activities: [],
                materials: ['textbook'],
                differentiation: null,
                assessmentNotes: 'Quiz at end',
              },
            ],
            standards: [
              {
                id: 'std-1',
                standardCode: 'CCSS.MATH.5.1',
                description: 'Standard description',
                category: 'Number Operations',
                alignmentType: 'PRIMARY',
              },
            ],
          },
        ],
        standards: [],
        pacingGuides: [],
      };

      mockPrisma.curriculum.findUnique.mockResolvedValue(sourceCurriculum);
      mockPrisma.curriculum.create.mockResolvedValue({
        ...sourceCurriculum,
        id: 'curr-2',
        academicYear: '2024-2025',
        version: 1,
      });
      mockPrisma.curriculumUnit.create.mockResolvedValue({
        id: 'unit-2',
        title: 'Unit 1',
      });
      mockPrisma.lesson.create.mockResolvedValue({ id: 'lesson-2' });
      mockPrisma.standardAlignment.create.mockResolvedValue({ id: 'std-2' });

      // Mock the final get call
      mockPrisma.curriculum.findUnique.mockResolvedValueOnce(sourceCurriculum);
      mockPrisma.curriculum.findUnique.mockResolvedValueOnce({
        ...sourceCurriculum,
        id: 'curr-2',
        academicYear: '2024-2025',
      });

      const result = await service.duplicateCurriculum('curr-1', '2024-2025');

      expect(mockPrisma.curriculum.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          name: 'Original Curriculum',
          academicYear: '2024-2025',
          version: 1,
          isActive: true,
        }),
      });
      expect(mockPrisma.curriculumUnit.create).toHaveBeenCalled();
      expect(mockPrisma.lesson.create).toHaveBeenCalled();
      expect(mockPrisma.standardAlignment.create).toHaveBeenCalled();
    });

    it('should throw error for non-existent curriculum', async () => {
      mockPrisma.curriculum.findUnique.mockResolvedValue(null);

      await expect(service.duplicateCurriculum('non-existent', '2024-2025')).rejects.toThrow(
        'Curriculum not found'
      );
    });
  });
});

describe('CurriculumService - Validation', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  it('should accept valid CurriculumStandard values', async () => {
    const standards = ['COMMON_CORE', 'NGSS', 'C3', 'STATE_SPECIFIC', 'CUSTOM'];

    for (const standard of standards) {
      mockPrisma.curriculum.create.mockResolvedValue({
        id: `curr-${standard}`,
        standard,
      });

      const result = await service.createCurriculum('tenant-1', {
        name: 'Test',
        standard: standard as any,
        subject: 'MATH',
        gradeBand: 'G3_5',
        academicYear: '2024-2025',
      });

      expect(result.standard).toBe(standard);
    }
  });

  it('should accept valid SubjectArea values', async () => {
    const subjects = [
      'ELA',
      'MATH',
      'SCIENCE',
      'SOCIAL_STUDIES',
      'SEL',
      'ARTS',
      'WORLD_LANGUAGE',
      'PHYSICAL_ED',
      'TECHNOLOGY',
      'CAREER_TECH',
    ];

    for (const subject of subjects) {
      mockPrisma.curriculum.create.mockResolvedValue({
        id: `curr-${subject}`,
        subject,
      });

      const result = await service.createCurriculum('tenant-1', {
        name: 'Test',
        standard: 'COMMON_CORE',
        subject: subject as any,
        gradeBand: 'G3_5',
        academicYear: '2024-2025',
      });

      expect(result.subject).toBe(subject);
    }
  });

  it('should accept valid GradeBand values', async () => {
    const gradeBands = ['PRE_K', 'K_2', 'G3_5', 'G6_8', 'G9_12'];

    for (const gradeBand of gradeBands) {
      mockPrisma.curriculum.create.mockResolvedValue({
        id: `curr-${gradeBand}`,
        gradeBand,
      });

      const result = await service.createCurriculum('tenant-1', {
        name: 'Test',
        standard: 'COMMON_CORE',
        subject: 'MATH',
        gradeBand: gradeBand as any,
        academicYear: '2024-2025',
      });

      expect(result.gradeBand).toBe(gradeBand);
    }
  });
});

describe('CurriculumService - Multi-tenant Isolation', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  it('should only return curricula for the specified tenant', async () => {
    mockPrisma.curriculum.findMany.mockResolvedValue([
      { id: 'curr-1', tenantId: 'tenant-A', name: 'Tenant A Curriculum' },
    ]);

    await service.getCurricula('tenant-A');

    expect(mockPrisma.curriculum.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-A' },
      })
    );
  });

  it('should create curriculum with correct tenant association', async () => {
    mockPrisma.curriculum.create.mockResolvedValue({
      id: 'curr-1',
      tenantId: 'tenant-B',
    });

    await service.createCurriculum('tenant-B', {
      name: 'Test',
      standard: 'COMMON_CORE',
      subject: 'MATH',
      gradeBand: 'G3_5',
      academicYear: '2024-2025',
    });

    expect(mockPrisma.curriculum.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-B',
      }),
    });
  });
});
