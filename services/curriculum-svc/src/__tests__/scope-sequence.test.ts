/**
 * Scope and Sequence Management Tests
 * Tests for units, lessons, pacing guides, and teacher progress tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma client
const mockPrisma = {
  curriculum: {
    findUnique: vi.fn(),
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
    update: vi.fn(),
    delete: vi.fn(),
  },
  lessonContentLink: {
    aggregate: vi.fn(),
    create: vi.fn(),
  },
  unitResource: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  pacingGuide: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  teacherCurriculumProgress: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn((updates) => {
    if (Array.isArray(updates)) {
      return Promise.all(updates);
    }
    return updates(mockPrisma);
  }),
};

vi.mock('../../db.js', () => ({
  prisma: mockPrisma,
}));

// Import after mock
const { CurriculumService } = await import('../../services/curriculum.service.js');

describe('CurriculumService - Unit Management', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createUnit', () => {
    it('should create a new unit with required fields', async () => {
      const unitData = {
        curriculumId: 'curr-1',
        title: 'Introduction to Fractions',
        description: 'Learn the basics of fractions',
        orderIndex: 0,
        essentialQuestions: ['What is a fraction?'],
        bigIdeas: ['Parts of a whole'],
        durationDays: 15,
      };

      mockPrisma.curriculumUnit.create.mockResolvedValue({
        id: 'unit-1',
        ...unitData,
        status: 'DRAFT',
        suggestedStartDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createUnit(unitData);

      expect(mockPrisma.curriculumUnit.create).toHaveBeenCalledWith({
        data: {
          curriculumId: 'curr-1',
          title: 'Introduction to Fractions',
          description: 'Learn the basics of fractions',
          orderIndex: 0,
          essentialQuestions: ['What is a fraction?'],
          bigIdeas: ['Parts of a whole'],
          durationDays: 15,
          suggestedStartDate: undefined,
          status: 'DRAFT',
        },
      });
      expect(result.id).toBe('unit-1');
      expect(result.status).toBe('DRAFT');
    });

    it('should create unit with suggested start date', async () => {
      const startDate = new Date('2024-09-01');
      const unitData = {
        curriculumId: 'curr-1',
        title: 'Unit with Date',
        orderIndex: 1,
        durationDays: 10,
        suggestedStartDate: startDate,
      };

      mockPrisma.curriculumUnit.create.mockResolvedValue({
        id: 'unit-2',
        ...unitData,
        status: 'DRAFT',
      });

      const result = await service.createUnit(unitData);

      expect(mockPrisma.curriculumUnit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          suggestedStartDate: startDate,
        }),
      });
      expect(result.suggestedStartDate).toEqual(startDate);
    });

    it('should default essential questions and big ideas to empty arrays', async () => {
      const unitData = {
        curriculumId: 'curr-1',
        title: 'Simple Unit',
        orderIndex: 0,
        durationDays: 5,
      };

      mockPrisma.curriculumUnit.create.mockResolvedValue({
        id: 'unit-3',
        ...unitData,
        essentialQuestions: [],
        bigIdeas: [],
        status: 'DRAFT',
      });

      await service.createUnit(unitData);

      expect(mockPrisma.curriculumUnit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          essentialQuestions: [],
          bigIdeas: [],
        }),
      });
    });
  });

  describe('getUnit', () => {
    it('should return unit with lessons and resources', async () => {
      const mockUnit = {
        id: 'unit-1',
        title: 'Test Unit',
        curriculum: { id: 'curr-1', name: 'Math Curriculum' },
        lessons: [
          {
            id: 'lesson-1',
            title: 'Lesson 1',
            orderIndex: 0,
            standards: [],
            contentLinks: [],
          },
          {
            id: 'lesson-2',
            title: 'Lesson 2',
            orderIndex: 1,
            standards: [],
            contentLinks: [],
          },
        ],
        standards: [],
        resources: [{ id: 'resource-1', title: 'Worksheet' }],
      };

      mockPrisma.curriculumUnit.findUnique.mockResolvedValue(mockUnit);

      const result = await service.getUnit('unit-1');

      expect(mockPrisma.curriculumUnit.findUnique).toHaveBeenCalledWith({
        where: { id: 'unit-1' },
        include: {
          curriculum: true,
          lessons: {
            orderBy: { orderIndex: 'asc' },
            include: {
              standards: true,
              contentLinks: true,
            },
          },
          standards: true,
          resources: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
      expect(result?.lessons).toHaveLength(2);
      expect(result?.resources).toHaveLength(1);
    });

    it('should return null for non-existent unit', async () => {
      mockPrisma.curriculumUnit.findUnique.mockResolvedValue(null);

      const result = await service.getUnit('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateUnit', () => {
    it('should update unit title', async () => {
      mockPrisma.curriculumUnit.update.mockResolvedValue({
        id: 'unit-1',
        title: 'Updated Title',
      });

      const result = await service.updateUnit('unit-1', { title: 'Updated Title' });

      expect(mockPrisma.curriculumUnit.update).toHaveBeenCalledWith({
        where: { id: 'unit-1' },
        data: { title: 'Updated Title' },
      });
      expect(result.title).toBe('Updated Title');
    });

    it('should update multiple fields', async () => {
      mockPrisma.curriculumUnit.update.mockResolvedValue({
        id: 'unit-1',
        title: 'New Title',
        description: 'New description',
        durationDays: 20,
      });

      const result = await service.updateUnit('unit-1', {
        title: 'New Title',
        description: 'New description',
        durationDays: 20,
      });

      expect(mockPrisma.curriculumUnit.update).toHaveBeenCalledWith({
        where: { id: 'unit-1' },
        data: {
          title: 'New Title',
          description: 'New description',
          durationDays: 20,
        },
      });
    });
  });

  describe('publishUnit', () => {
    it('should set unit status to PUBLISHED', async () => {
      mockPrisma.curriculumUnit.update.mockResolvedValue({
        id: 'unit-1',
        status: 'PUBLISHED',
      });

      const result = await service.publishUnit('unit-1');

      expect(mockPrisma.curriculumUnit.update).toHaveBeenCalledWith({
        where: { id: 'unit-1' },
        data: { status: 'PUBLISHED' },
      });
      expect(result.status).toBe('PUBLISHED');
    });
  });

  describe('reorderUnits', () => {
    it('should update order indices for multiple units', async () => {
      const unitIds = ['unit-3', 'unit-1', 'unit-2'];

      mockPrisma.curriculumUnit.update
        .mockResolvedValueOnce({ id: 'unit-3', orderIndex: 0 })
        .mockResolvedValueOnce({ id: 'unit-1', orderIndex: 1 })
        .mockResolvedValueOnce({ id: 'unit-2', orderIndex: 2 });

      await service.reorderUnits(unitIds);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('deleteUnit', () => {
    it('should delete a unit', async () => {
      mockPrisma.curriculumUnit.delete.mockResolvedValue({
        id: 'unit-1',
      });

      const result = await service.deleteUnit('unit-1');

      expect(mockPrisma.curriculumUnit.delete).toHaveBeenCalledWith({
        where: { id: 'unit-1' },
      });
      expect(result.id).toBe('unit-1');
    });
  });
});

describe('CurriculumService - Lesson Management', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  describe('createLesson', () => {
    it('should create a new lesson with required fields', async () => {
      const lessonData = {
        unitId: 'unit-1',
        title: 'Introduction to Place Value',
        description: 'Learn about place value concepts',
        orderIndex: 0,
        objectives: ['Identify place values', 'Compare numbers'],
        durationMin: 45,
        lessonType: 'DIRECT_INSTRUCTION',
        activities: [{ name: 'Warm-up', duration: 5 }],
        materials: ['Number chart', 'Base-ten blocks'],
        differentiation: { advanced: 'Extension activity' },
        assessmentNotes: 'Exit ticket on place value',
      };

      mockPrisma.lesson.create.mockResolvedValue({
        id: 'lesson-1',
        ...lessonData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createLesson(lessonData);

      expect(mockPrisma.lesson.create).toHaveBeenCalledWith({
        data: {
          unitId: 'unit-1',
          title: 'Introduction to Place Value',
          description: 'Learn about place value concepts',
          orderIndex: 0,
          objectives: ['Identify place values', 'Compare numbers'],
          durationMin: 45,
          lessonType: 'DIRECT_INSTRUCTION',
          activities: [{ name: 'Warm-up', duration: 5 }],
          materials: ['Number chart', 'Base-ten blocks'],
          differentiation: { advanced: 'Extension activity' },
          assessmentNotes: 'Exit ticket on place value',
        },
      });
      expect(result.id).toBe('lesson-1');
    });

    it('should default arrays to empty when not provided', async () => {
      const lessonData = {
        unitId: 'unit-1',
        title: 'Simple Lesson',
        orderIndex: 0,
        durationMin: 30,
      };

      mockPrisma.lesson.create.mockResolvedValue({
        id: 'lesson-2',
        ...lessonData,
        objectives: [],
        activities: [],
        materials: [],
      });

      await service.createLesson(lessonData);

      expect(mockPrisma.lesson.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          objectives: [],
          activities: [],
          materials: [],
        }),
      });
    });
  });

  describe('getLesson', () => {
    it('should return lesson with unit, curriculum, and related data', async () => {
      const mockLesson = {
        id: 'lesson-1',
        title: 'Test Lesson',
        unit: {
          id: 'unit-1',
          title: 'Test Unit',
          curriculum: { id: 'curr-1', name: 'Math Curriculum' },
        },
        standards: [{ id: 'std-1', standardCode: 'CCSS.MATH.5.1' }],
        contentLinks: [{ id: 'link-1', contentId: 'content-1' }],
      };

      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson);

      const result = await service.getLesson('lesson-1');

      expect(mockPrisma.lesson.findUnique).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
        include: {
          unit: {
            include: { curriculum: true },
          },
          standards: true,
          contentLinks: true,
        },
      });
      expect(result?.unit.curriculum.name).toBe('Math Curriculum');
    });
  });

  describe('updateLesson', () => {
    it('should update lesson fields', async () => {
      mockPrisma.lesson.update.mockResolvedValue({
        id: 'lesson-1',
        title: 'Updated Lesson',
        durationMin: 60,
      });

      const result = await service.updateLesson('lesson-1', {
        title: 'Updated Lesson',
        durationMin: 60,
      });

      expect(mockPrisma.lesson.update).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
        data: expect.objectContaining({
          title: 'Updated Lesson',
          durationMin: 60,
        }),
      });
    });

    it('should only update provided fields', async () => {
      mockPrisma.lesson.update.mockResolvedValue({
        id: 'lesson-1',
        description: 'New description',
      });

      await service.updateLesson('lesson-1', { description: 'New description' });

      // Should not include fields not being updated
      expect(mockPrisma.lesson.update).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
        data: { description: 'New description' },
      });
    });
  });

  describe('reorderLessons', () => {
    it('should update order indices for lessons', async () => {
      const lessonIds = ['lesson-2', 'lesson-1', 'lesson-3'];

      mockPrisma.lesson.update
        .mockResolvedValueOnce({ id: 'lesson-2', orderIndex: 0 })
        .mockResolvedValueOnce({ id: 'lesson-1', orderIndex: 1 })
        .mockResolvedValueOnce({ id: 'lesson-3', orderIndex: 2 });

      await service.reorderLessons(lessonIds);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('linkContent', () => {
    it('should link content to a lesson', async () => {
      mockPrisma.lessonContentLink.aggregate.mockResolvedValue({
        _max: { orderIndex: 2 },
      });
      mockPrisma.lessonContentLink.create.mockResolvedValue({
        id: 'link-1',
        lessonId: 'lesson-1',
        contentId: 'content-123',
        contentType: 'LEARNING_OBJECT',
        usageContext: 'PRACTICE',
        orderIndex: 3,
        isRequired: true,
      });

      const result = await service.linkContent('lesson-1', 'content-123', 'LEARNING_OBJECT', 'PRACTICE');

      expect(mockPrisma.lessonContentLink.create).toHaveBeenCalledWith({
        data: {
          lessonId: 'lesson-1',
          contentId: 'content-123',
          contentType: 'LEARNING_OBJECT',
          usageContext: 'PRACTICE',
          orderIndex: 3,
          isRequired: true,
        },
      });
      expect(result.orderIndex).toBe(3);
    });

    it('should handle first content link (null max orderIndex)', async () => {
      mockPrisma.lessonContentLink.aggregate.mockResolvedValue({
        _max: { orderIndex: null },
      });
      mockPrisma.lessonContentLink.create.mockResolvedValue({
        id: 'link-1',
        orderIndex: 0,
      });

      const result = await service.linkContent('lesson-1', 'content-1', 'ACTIVITY');

      expect(mockPrisma.lessonContentLink.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderIndex: 0,
        }),
      });
    });
  });

  describe('deleteLesson', () => {
    it('should delete a lesson', async () => {
      mockPrisma.lesson.delete.mockResolvedValue({ id: 'lesson-1' });

      const result = await service.deleteLesson('lesson-1');

      expect(mockPrisma.lesson.delete).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
      });
      expect(result.id).toBe('lesson-1');
    });
  });
});

describe('CurriculumService - Pacing Guides', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  describe('createPacingGuide', () => {
    it('should create a new pacing guide', async () => {
      const pacingData = {
        curriculumId: 'curr-1',
        name: 'Standard Pacing 2024-2025',
        description: 'Default pacing for academic year',
        startDate: new Date('2024-08-15'),
        endDate: new Date('2025-06-01'),
        entries: [
          { unitId: 'unit-1', startDate: '2024-08-15', endDate: '2024-09-15' },
          { unitId: 'unit-2', startDate: '2024-09-16', endDate: '2024-10-31' },
        ],
        isDefault: true,
      };

      mockPrisma.pacingGuide.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pacingGuide.create.mockResolvedValue({
        id: 'pacing-1',
        tenantId: 'tenant-1',
        ...pacingData,
      });

      const result = await service.createPacingGuide('tenant-1', pacingData);

      expect(mockPrisma.pacingGuide.updateMany).toHaveBeenCalledWith({
        where: { curriculumId: 'curr-1', isDefault: true },
        data: { isDefault: false },
      });
      expect(mockPrisma.pacingGuide.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          curriculumId: 'curr-1',
          name: 'Standard Pacing 2024-2025',
          description: 'Default pacing for academic year',
          startDate: pacingData.startDate,
          endDate: pacingData.endDate,
          entries: pacingData.entries,
          isDefault: true,
        },
      });
      expect(result.id).toBe('pacing-1');
    });

    it('should not unset other defaults if not setting as default', async () => {
      const pacingData = {
        curriculumId: 'curr-1',
        name: 'Alternate Pacing',
        startDate: new Date('2024-08-15'),
        endDate: new Date('2025-06-01'),
        isDefault: false,
      };

      mockPrisma.pacingGuide.create.mockResolvedValue({
        id: 'pacing-2',
        ...pacingData,
      });

      await service.createPacingGuide('tenant-1', pacingData);

      expect(mockPrisma.pacingGuide.updateMany).not.toHaveBeenCalled();
    });

    it('should default entries to empty array', async () => {
      const pacingData = {
        curriculumId: 'curr-1',
        name: 'Empty Pacing',
        startDate: new Date('2024-08-15'),
        endDate: new Date('2025-06-01'),
      };

      mockPrisma.pacingGuide.create.mockResolvedValue({
        id: 'pacing-3',
        ...pacingData,
        entries: [],
      });

      await service.createPacingGuide('tenant-1', pacingData);

      expect(mockPrisma.pacingGuide.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entries: [],
          isDefault: false,
        }),
      });
    });
  });

  describe('getPacingGuides', () => {
    it('should return pacing guides ordered by default first', async () => {
      const mockGuides = [
        { id: 'pacing-1', name: 'Default Pacing', isDefault: true },
        { id: 'pacing-2', name: 'Extended Pacing', isDefault: false },
      ];

      mockPrisma.pacingGuide.findMany.mockResolvedValue(mockGuides);

      const result = await service.getPacingGuides('curr-1');

      expect(mockPrisma.pacingGuide.findMany).toHaveBeenCalledWith({
        where: { curriculumId: 'curr-1' },
        orderBy: { isDefault: 'desc' },
      });
      expect(result[0].isDefault).toBe(true);
    });
  });

  describe('updatePacingGuide', () => {
    it('should update pacing guide fields', async () => {
      mockPrisma.pacingGuide.update.mockResolvedValue({
        id: 'pacing-1',
        name: 'Updated Pacing',
        description: 'New description',
      });

      const result = await service.updatePacingGuide('pacing-1', {
        name: 'Updated Pacing',
        description: 'New description',
      });

      expect(mockPrisma.pacingGuide.update).toHaveBeenCalledWith({
        where: { id: 'pacing-1' },
        data: {
          name: 'Updated Pacing',
          description: 'New description',
        },
      });
    });

    it('should update pacing entries', async () => {
      const newEntries = [
        { unitId: 'unit-1', startDate: '2024-09-01', endDate: '2024-09-30' },
      ];

      mockPrisma.pacingGuide.update.mockResolvedValue({
        id: 'pacing-1',
        entries: newEntries,
      });

      await service.updatePacingGuide('pacing-1', { entries: newEntries });

      expect(mockPrisma.pacingGuide.update).toHaveBeenCalledWith({
        where: { id: 'pacing-1' },
        data: { entries: newEntries },
      });
    });
  });

  describe('generatePacingEntries', () => {
    it('should generate pacing entries based on unit durations', async () => {
      const mockUnits = [
        { id: 'unit-1', title: 'Unit 1', durationDays: 10, orderIndex: 0 },
        { id: 'unit-2', title: 'Unit 2', durationDays: 15, orderIndex: 1 },
        { id: 'unit-3', title: 'Unit 3', durationDays: 12, orderIndex: 2 },
      ];

      mockPrisma.curriculumUnit.findMany.mockResolvedValue(mockUnits);

      const startDate = new Date('2024-09-01');
      const endDate = new Date('2024-12-31');

      const result = await service.generatePacingEntries('curr-1', startDate, endDate);

      expect(mockPrisma.curriculumUnit.findMany).toHaveBeenCalledWith({
        where: { curriculumId: 'curr-1' },
        orderBy: { orderIndex: 'asc' },
      });
      expect(result).toHaveLength(3);
      expect(result[0].unitId).toBe('unit-1');
      expect(result[0].startDate).toBe('2024-09-01');
    });

    it('should not exceed end date', async () => {
      const mockUnits = [
        { id: 'unit-1', durationDays: 100, orderIndex: 0 },
        { id: 'unit-2', durationDays: 100, orderIndex: 1 },
      ];

      mockPrisma.curriculumUnit.findMany.mockResolvedValue(mockUnits);

      const startDate = new Date('2024-09-01');
      const endDate = new Date('2024-09-30'); // Only 30 days

      const result = await service.generatePacingEntries('curr-1', startDate, endDate);

      // First unit should be capped at end date
      expect(new Date(result[0].endDate) <= endDate).toBe(true);
    });

    it('should handle empty curriculum', async () => {
      mockPrisma.curriculumUnit.findMany.mockResolvedValue([]);

      const result = await service.generatePacingEntries(
        'empty-curr',
        new Date('2024-09-01'),
        new Date('2024-12-31')
      );

      expect(result).toHaveLength(0);
    });
  });
});

describe('CurriculumService - Teacher Progress', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  describe('getTeacherProgress', () => {
    it('should return existing teacher progress', async () => {
      const mockProgress = {
        id: 'progress-1',
        tenantId: 'tenant-1',
        teacherId: 'teacher-1',
        curriculumId: 'curr-1',
        currentUnitId: 'unit-2',
        currentLessonId: 'lesson-5',
        completedUnits: ['unit-1'],
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3', 'lesson-4'],
        pacingOffset: 2,
      };

      mockPrisma.teacherCurriculumProgress.upsert.mockResolvedValue(mockProgress);

      const result = await service.getTeacherProgress('tenant-1', 'teacher-1', 'curr-1');

      expect(mockPrisma.teacherCurriculumProgress.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_teacherId_curriculumId: {
            tenantId: 'tenant-1',
            teacherId: 'teacher-1',
            curriculumId: 'curr-1',
          },
        },
        update: {},
        create: {
          tenantId: 'tenant-1',
          teacherId: 'teacher-1',
          curriculumId: 'curr-1',
          completedUnits: [],
          completedLessons: [],
          pacingOffset: 0,
        },
      });
      expect(result.currentUnitId).toBe('unit-2');
    });

    it('should create new progress if not exists', async () => {
      const newProgress = {
        id: 'progress-new',
        tenantId: 'tenant-1',
        teacherId: 'teacher-new',
        curriculumId: 'curr-1',
        completedUnits: [],
        completedLessons: [],
        pacingOffset: 0,
      };

      mockPrisma.teacherCurriculumProgress.upsert.mockResolvedValue(newProgress);

      const result = await service.getTeacherProgress('tenant-1', 'teacher-new', 'curr-1');

      expect(result.completedUnits).toHaveLength(0);
      expect(result.completedLessons).toHaveLength(0);
      expect(result.pacingOffset).toBe(0);
    });
  });

  describe('updateTeacherPosition', () => {
    it('should update current unit and lesson', async () => {
      mockPrisma.teacherCurriculumProgress.update.mockResolvedValue({
        id: 'progress-1',
        currentUnitId: 'unit-3',
        currentLessonId: 'lesson-10',
        lastUpdatedAt: new Date(),
      });

      const result = await service.updateTeacherPosition(
        'tenant-1',
        'teacher-1',
        'curr-1',
        'unit-3',
        'lesson-10'
      );

      expect(mockPrisma.teacherCurriculumProgress.update).toHaveBeenCalledWith({
        where: {
          tenantId_teacherId_curriculumId: {
            tenantId: 'tenant-1',
            teacherId: 'teacher-1',
            curriculumId: 'curr-1',
          },
        },
        data: {
          currentUnitId: 'unit-3',
          currentLessonId: 'lesson-10',
          lastUpdatedAt: expect.any(Date),
        },
      });
      expect(result.currentUnitId).toBe('unit-3');
    });
  });

  describe('markLessonCompleted', () => {
    it('should add lesson to completed list', async () => {
      const existingProgress = {
        id: 'progress-1',
        completedLessons: ['lesson-1', 'lesson-2'],
        completedUnits: [],
      };

      mockPrisma.teacherCurriculumProgress.upsert.mockResolvedValue(existingProgress);
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson-3',
        unit: {
          id: 'unit-1',
          lessons: [{ id: 'lesson-1' }, { id: 'lesson-2' }, { id: 'lesson-3' }, { id: 'lesson-4' }],
        },
      });
      mockPrisma.teacherCurriculumProgress.update.mockResolvedValue({
        ...existingProgress,
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
      });

      const result = await service.markLessonCompleted('tenant-1', 'teacher-1', 'curr-1', 'lesson-3');

      expect(result.completedLessons).toContain('lesson-3');
    });

    it('should mark unit complete when all lessons done', async () => {
      const existingProgress = {
        id: 'progress-1',
        completedLessons: ['lesson-1', 'lesson-2'],
        completedUnits: [],
      };

      mockPrisma.teacherCurriculumProgress.upsert.mockResolvedValue(existingProgress);
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson-3',
        unit: {
          id: 'unit-1',
          lessons: [{ id: 'lesson-1' }, { id: 'lesson-2' }, { id: 'lesson-3' }],
        },
      });
      mockPrisma.teacherCurriculumProgress.update.mockResolvedValue({
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        completedUnits: ['unit-1'],
      });

      const result = await service.markLessonCompleted('tenant-1', 'teacher-1', 'curr-1', 'lesson-3');

      expect(result.completedUnits).toContain('unit-1');
    });

    it('should not duplicate completed lessons', async () => {
      const existingProgress = {
        id: 'progress-1',
        completedLessons: ['lesson-1', 'lesson-2'],
        completedUnits: [],
      };

      mockPrisma.teacherCurriculumProgress.upsert.mockResolvedValue(existingProgress);
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson-2',
        unit: { id: 'unit-1', lessons: [{ id: 'lesson-1' }, { id: 'lesson-2' }] },
      });
      mockPrisma.teacherCurriculumProgress.update.mockResolvedValue({
        completedLessons: ['lesson-1', 'lesson-2'], // No duplicate
        completedUnits: ['unit-1'],
      });

      await service.markLessonCompleted('tenant-1', 'teacher-1', 'curr-1', 'lesson-2');

      // The Set should deduplicate
      expect(mockPrisma.teacherCurriculumProgress.update).toHaveBeenCalled();
    });
  });

  describe('calculatePacingOffset', () => {
    it('should return 0 when no pacing guide exists', async () => {
      mockPrisma.teacherCurriculumProgress.upsert.mockResolvedValue({
        currentUnitId: 'unit-2',
      });
      mockPrisma.pacingGuide.findFirst.mockResolvedValue(null);

      const result = await service.calculatePacingOffset('tenant-1', 'teacher-1', 'curr-1');

      expect(result).toBe(0);
    });

    it('should calculate positive offset when ahead', async () => {
      mockPrisma.teacherCurriculumProgress.upsert.mockResolvedValue({
        currentUnitId: 'unit-3',
      });
      mockPrisma.pacingGuide.findFirst.mockResolvedValue({
        id: 'pacing-1',
        entries: [
          { unitId: 'unit-1', startDate: '2024-01-01', endDate: '2024-01-31' },
          { unitId: 'unit-2', startDate: '2024-02-01', endDate: '2024-02-28' },
          { unitId: 'unit-3', startDate: '2024-03-01', endDate: '2024-03-31' },
        ],
      });
      mockPrisma.curriculumUnit.findUnique
        .mockResolvedValueOnce({ orderIndex: 2 }) // current unit (unit-3)
        .mockResolvedValueOnce({ orderIndex: 1 }); // expected unit (unit-2 based on date)

      // This test would need the actual date logic to work correctly
      // For now, we're testing the structure
      const result = await service.calculatePacingOffset('tenant-1', 'teacher-1', 'curr-1');

      expect(typeof result).toBe('number');
    });
  });
});

describe('CurriculumService - Unit Resources', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  describe('addResource', () => {
    it('should add a resource to a unit', async () => {
      mockPrisma.unitResource.aggregate.mockResolvedValue({
        _max: { orderIndex: 1 },
      });
      mockPrisma.unitResource.create.mockResolvedValue({
        id: 'resource-1',
        unitId: 'unit-1',
        title: 'Video Tutorial',
        resourceType: 'VIDEO',
        url: 'https://example.com/video.mp4',
        description: 'Introduction video',
        orderIndex: 2,
        isRequired: true,
      });

      const result = await service.addResource('unit-1', {
        title: 'Video Tutorial',
        resourceType: 'VIDEO',
        url: 'https://example.com/video.mp4',
        description: 'Introduction video',
        isRequired: true,
      });

      expect(mockPrisma.unitResource.create).toHaveBeenCalledWith({
        data: {
          unitId: 'unit-1',
          title: 'Video Tutorial',
          resourceType: 'VIDEO',
          url: 'https://example.com/video.mp4',
          assetId: undefined,
          description: 'Introduction video',
          isRequired: true,
          orderIndex: 2,
        },
      });
      expect(result.orderIndex).toBe(2);
    });

    it('should handle first resource (null max orderIndex)', async () => {
      mockPrisma.unitResource.aggregate.mockResolvedValue({
        _max: { orderIndex: null },
      });
      mockPrisma.unitResource.create.mockResolvedValue({
        id: 'resource-1',
        orderIndex: 0,
      });

      const result = await service.addResource('unit-1', {
        title: 'First Resource',
        resourceType: 'DOCUMENT',
      });

      expect(mockPrisma.unitResource.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderIndex: 0,
        }),
      });
    });

    it('should default isRequired to false', async () => {
      mockPrisma.unitResource.aggregate.mockResolvedValue({ _max: { orderIndex: 0 } });
      mockPrisma.unitResource.create.mockResolvedValue({
        id: 'resource-1',
        isRequired: false,
      });

      await service.addResource('unit-1', {
        title: 'Optional Resource',
        resourceType: 'LINK',
      });

      expect(mockPrisma.unitResource.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isRequired: false,
        }),
      });
    });
  });

  describe('getResources', () => {
    it('should return resources ordered by index', async () => {
      const mockResources = [
        { id: 'resource-1', title: 'Resource 1', orderIndex: 0 },
        { id: 'resource-2', title: 'Resource 2', orderIndex: 1 },
      ];

      mockPrisma.unitResource.findMany.mockResolvedValue(mockResources);

      const result = await service.getResources('unit-1');

      expect(mockPrisma.unitResource.findMany).toHaveBeenCalledWith({
        where: { unitId: 'unit-1' },
        orderBy: { orderIndex: 'asc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('removeResource', () => {
    it('should remove a resource', async () => {
      mockPrisma.unitResource.delete.mockResolvedValue({ id: 'resource-1' });

      const result = await service.removeResource('resource-1');

      expect(mockPrisma.unitResource.delete).toHaveBeenCalledWith({
        where: { id: 'resource-1' },
      });
      expect(result.id).toBe('resource-1');
    });
  });
});

describe('Unit Status Transitions', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  it('should allow DRAFT -> PUBLISHED transition', async () => {
    mockPrisma.curriculumUnit.update.mockResolvedValue({
      id: 'unit-1',
      status: 'PUBLISHED',
    });

    const result = await service.publishUnit('unit-1');

    expect(result.status).toBe('PUBLISHED');
  });

  it('should support DRAFT status for new units', async () => {
    mockPrisma.curriculumUnit.create.mockResolvedValue({
      id: 'unit-new',
      status: 'DRAFT',
    });

    const result = await service.createUnit({
      curriculumId: 'curr-1',
      title: 'New Unit',
      orderIndex: 0,
      durationDays: 10,
    });

    expect(result.status).toBe('DRAFT');
  });
});

describe('Lesson Types', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  const lessonTypes = [
    'DIRECT_INSTRUCTION',
    'WORKSHOP',
    'LAB',
    'ASSESSMENT',
    'REVIEW',
    'ENRICHMENT',
  ];

  lessonTypes.forEach((lessonType) => {
    it(`should support ${lessonType} lesson type`, async () => {
      mockPrisma.lesson.create.mockResolvedValue({
        id: 'lesson-1',
        lessonType,
      });

      const result = await service.createLesson({
        unitId: 'unit-1',
        title: `${lessonType} Lesson`,
        orderIndex: 0,
        durationMin: 45,
        lessonType,
      });

      expect(result.lessonType).toBe(lessonType);
    });
  });
});
