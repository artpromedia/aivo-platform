/**
 * Standards Alignment Tests
 * Tests for standards alignment functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma client
const mockPrisma = {
  curriculum: {
    findUnique: vi.fn(),
  },
  curriculumUnit: {
    findUnique: vi.fn(),
  },
  lesson: {
    findUnique: vi.fn(),
  },
  standardAlignment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
};

vi.mock('../../db.js', () => ({
  prisma: mockPrisma,
}));

// Import after mock
const { CurriculumService } = await import('../../services/curriculum.service.js');

describe('CurriculumService - Standards Alignment', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('addStandardAlignment', () => {
    it('should align a standard to a curriculum', async () => {
      const alignmentData = {
        standardCode: 'CCSS.MATH.CONTENT.5.NBT.A.1',
        description:
          'Recognize that in a multi-digit number, a digit in one place represents 10 times as much as it represents in the place to its right.',
        category: 'Number & Operations in Base Ten',
        alignmentType: 'PRIMARY' as const,
        curriculumId: 'curr-1',
      };

      mockPrisma.standardAlignment.create.mockResolvedValue({
        id: 'align-1',
        ...alignmentData,
        unitId: null,
        lessonId: null,
      });

      const result = await service.addStandardAlignment(alignmentData);

      expect(mockPrisma.standardAlignment.create).toHaveBeenCalledWith({
        data: {
          standardCode: alignmentData.standardCode,
          description: alignmentData.description,
          category: alignmentData.category,
          alignmentType: 'PRIMARY',
          curriculumId: 'curr-1',
          unitId: undefined,
          lessonId: undefined,
        },
      });
      expect(result.id).toBe('align-1');
      expect(result.standardCode).toBe('CCSS.MATH.CONTENT.5.NBT.A.1');
    });

    it('should align a standard to a unit', async () => {
      const alignmentData = {
        standardCode: 'CCSS.ELA-LITERACY.RL.5.1',
        description:
          'Quote accurately from a text when explaining what the text says explicitly and when drawing inferences.',
        category: 'Reading: Literature',
        alignmentType: 'PRIMARY' as const,
        unitId: 'unit-1',
      };

      mockPrisma.standardAlignment.create.mockResolvedValue({
        id: 'align-2',
        ...alignmentData,
        curriculumId: null,
        lessonId: null,
      });

      const result = await service.addStandardAlignment(alignmentData);

      expect(mockPrisma.standardAlignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          unitId: 'unit-1',
          curriculumId: undefined,
          lessonId: undefined,
        }),
      });
      expect(result.unitId).toBe('unit-1');
    });

    it('should align a standard to a lesson', async () => {
      const alignmentData = {
        standardCode: 'NGSS.5-PS1-1',
        description:
          'Develop a model to describe that matter is made of particles too small to be seen.',
        category: 'Physical Science',
        alignmentType: 'SUPPORTING' as const,
        lessonId: 'lesson-1',
      };

      mockPrisma.standardAlignment.create.mockResolvedValue({
        id: 'align-3',
        ...alignmentData,
        curriculumId: null,
        unitId: null,
      });

      const result = await service.addStandardAlignment(alignmentData);

      expect(mockPrisma.standardAlignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lessonId: 'lesson-1',
          alignmentType: 'SUPPORTING',
        }),
      });
      expect(result.lessonId).toBe('lesson-1');
      expect(result.alignmentType).toBe('SUPPORTING');
    });

    it('should default alignment type to PRIMARY', async () => {
      const alignmentData = {
        standardCode: 'C3.D2.Civ.1.3-5',
        description: 'Distinguish the responsibilities of citizens.',
        curriculumId: 'curr-1',
      };

      mockPrisma.standardAlignment.create.mockResolvedValue({
        id: 'align-4',
        ...alignmentData,
        alignmentType: 'PRIMARY',
      });

      const result = await service.addStandardAlignment(alignmentData);

      expect(mockPrisma.standardAlignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          alignmentType: 'PRIMARY',
        }),
      });
      expect(result.alignmentType).toBe('PRIMARY');
    });

    it('should handle standard with optional category', async () => {
      const alignmentData = {
        standardCode: 'CUSTOM.1.2.3',
        description: 'Custom standard description',
        curriculumId: 'curr-1',
      };

      mockPrisma.standardAlignment.create.mockResolvedValue({
        id: 'align-5',
        ...alignmentData,
        category: null,
        alignmentType: 'PRIMARY',
      });

      const result = await service.addStandardAlignment(alignmentData);

      expect(result.category).toBeNull();
    });
  });

  describe('getStandards', () => {
    it('should get standards for a curriculum', async () => {
      const mockStandards = [
        {
          id: 'align-1',
          standardCode: 'CCSS.MATH.5.1',
          description: 'Math standard 1',
          category: 'Number Operations',
          alignmentType: 'PRIMARY',
          curriculumId: 'curr-1',
        },
        {
          id: 'align-2',
          standardCode: 'CCSS.MATH.5.2',
          description: 'Math standard 2',
          category: 'Number Operations',
          alignmentType: 'SUPPORTING',
          curriculumId: 'curr-1',
        },
      ];

      mockPrisma.standardAlignment.findMany.mockResolvedValue(mockStandards);

      const result = await service.getStandards({ curriculumId: 'curr-1' });

      expect(mockPrisma.standardAlignment.findMany).toHaveBeenCalledWith({
        where: { curriculumId: 'curr-1' },
        orderBy: { standardCode: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].standardCode).toBe('CCSS.MATH.5.1');
    });

    it('should get standards for a unit', async () => {
      mockPrisma.standardAlignment.findMany.mockResolvedValue([
        {
          id: 'align-1',
          standardCode: 'CCSS.ELA.5.1',
          description: 'ELA standard',
          unitId: 'unit-1',
        },
      ]);

      const result = await service.getStandards({ unitId: 'unit-1' });

      expect(mockPrisma.standardAlignment.findMany).toHaveBeenCalledWith({
        where: { unitId: 'unit-1' },
        orderBy: { standardCode: 'asc' },
      });
      expect(result).toHaveLength(1);
    });

    it('should get standards for a lesson', async () => {
      mockPrisma.standardAlignment.findMany.mockResolvedValue([
        {
          id: 'align-1',
          standardCode: 'NGSS.5.1',
          description: 'Science standard',
          lessonId: 'lesson-1',
        },
      ]);

      const result = await service.getStandards({ lessonId: 'lesson-1' });

      expect(mockPrisma.standardAlignment.findMany).toHaveBeenCalledWith({
        where: { lessonId: 'lesson-1' },
        orderBy: { standardCode: 'asc' },
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no standards found', async () => {
      mockPrisma.standardAlignment.findMany.mockResolvedValue([]);

      const result = await service.getStandards({ curriculumId: 'curr-no-standards' });

      expect(result).toHaveLength(0);
    });

    it('should order standards by standard code', async () => {
      const mockStandards = [
        { id: 'align-1', standardCode: 'CCSS.MATH.5.10' },
        { id: 'align-2', standardCode: 'CCSS.MATH.5.1' },
        { id: 'align-3', standardCode: 'CCSS.MATH.5.2' },
      ];

      mockPrisma.standardAlignment.findMany.mockResolvedValue(mockStandards);

      await service.getStandards({ curriculumId: 'curr-1' });

      expect(mockPrisma.standardAlignment.findMany).toHaveBeenCalledWith({
        where: { curriculumId: 'curr-1' },
        orderBy: { standardCode: 'asc' },
      });
    });
  });

  describe('searchStandards', () => {
    it('should search standards by code', async () => {
      const mockStandards = [
        { id: 'align-1', standardCode: 'CCSS.MATH.5.NBT.1', description: 'NBT standard' },
        { id: 'align-2', standardCode: 'CCSS.MATH.5.NBT.2', description: 'Another NBT standard' },
      ];

      mockPrisma.standardAlignment.findMany.mockResolvedValue(mockStandards);

      const result = await service.searchStandards('NBT');

      expect(mockPrisma.standardAlignment.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { standardCode: { contains: 'NBT', mode: 'insensitive' } },
            { description: { contains: 'NBT', mode: 'insensitive' } },
          ],
        },
        distinct: ['standardCode'],
        take: 20,
      });
      expect(result).toHaveLength(2);
    });

    it('should search standards by description', async () => {
      mockPrisma.standardAlignment.findMany.mockResolvedValue([
        { id: 'align-1', standardCode: 'CCSS.1', description: 'Understand fractions' },
      ]);

      const result = await service.searchStandards('fractions');

      expect(mockPrisma.standardAlignment.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { standardCode: { contains: 'fractions', mode: 'insensitive' } },
            { description: { contains: 'fractions', mode: 'insensitive' } },
          ],
        },
        distinct: ['standardCode'],
        take: 20,
      });
      expect(result).toHaveLength(1);
    });

    it('should limit results to specified count', async () => {
      mockPrisma.standardAlignment.findMany.mockResolvedValue([]);

      await service.searchStandards('math', 10);

      expect(mockPrisma.standardAlignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should default limit to 20', async () => {
      mockPrisma.standardAlignment.findMany.mockResolvedValue([]);

      await service.searchStandards('test');

      expect(mockPrisma.standardAlignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });

    it('should return distinct standard codes', async () => {
      mockPrisma.standardAlignment.findMany.mockResolvedValue([
        { id: 'align-1', standardCode: 'CCSS.MATH.5.1' },
      ]);

      await service.searchStandards('MATH');

      expect(mockPrisma.standardAlignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          distinct: ['standardCode'],
        })
      );
    });
  });

  describe('removeStandardAlignment', () => {
    it('should remove a standard alignment', async () => {
      mockPrisma.standardAlignment.delete.mockResolvedValue({
        id: 'align-1',
        standardCode: 'CCSS.MATH.5.1',
      });

      const result = await service.removeStandardAlignment('align-1');

      expect(mockPrisma.standardAlignment.delete).toHaveBeenCalledWith({
        where: { id: 'align-1' },
      });
      expect(result.id).toBe('align-1');
    });
  });
});

describe('Standards Alignment Types', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  it('should support PRIMARY alignment type', async () => {
    mockPrisma.standardAlignment.create.mockResolvedValue({
      id: 'align-1',
      alignmentType: 'PRIMARY',
    });

    const result = await service.addStandardAlignment({
      standardCode: 'TEST.1',
      description: 'Test standard',
      alignmentType: 'PRIMARY',
      curriculumId: 'curr-1',
    });

    expect(result.alignmentType).toBe('PRIMARY');
  });

  it('should support SUPPORTING alignment type', async () => {
    mockPrisma.standardAlignment.create.mockResolvedValue({
      id: 'align-1',
      alignmentType: 'SUPPORTING',
    });

    const result = await service.addStandardAlignment({
      standardCode: 'TEST.2',
      description: 'Test standard',
      alignmentType: 'SUPPORTING',
      curriculumId: 'curr-1',
    });

    expect(result.alignmentType).toBe('SUPPORTING');
  });
});

describe('Standards Framework Support', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  it('should handle Common Core (CCSS) standards', async () => {
    mockPrisma.standardAlignment.create.mockResolvedValue({
      id: 'align-ccss',
      standardCode: 'CCSS.ELA-LITERACY.RL.5.1',
      description: 'Quote accurately from a text',
      category: 'Reading: Literature',
    });

    const result = await service.addStandardAlignment({
      standardCode: 'CCSS.ELA-LITERACY.RL.5.1',
      description: 'Quote accurately from a text',
      category: 'Reading: Literature',
      curriculumId: 'curr-1',
    });

    expect(result.standardCode).toContain('CCSS');
  });

  it('should handle Next Generation Science Standards (NGSS)', async () => {
    mockPrisma.standardAlignment.create.mockResolvedValue({
      id: 'align-ngss',
      standardCode: 'NGSS.5-PS1-1',
      description: 'Develop a model to describe that matter is made of particles',
      category: 'Physical Science',
    });

    const result = await service.addStandardAlignment({
      standardCode: 'NGSS.5-PS1-1',
      description: 'Develop a model to describe that matter is made of particles',
      category: 'Physical Science',
      curriculumId: 'curr-1',
    });

    expect(result.standardCode).toContain('NGSS');
  });

  it('should handle C3 Social Studies standards', async () => {
    mockPrisma.standardAlignment.create.mockResolvedValue({
      id: 'align-c3',
      standardCode: 'C3.D2.Civ.1.3-5',
      description: 'Distinguish the responsibilities and powers of citizens',
      category: 'Civics',
    });

    const result = await service.addStandardAlignment({
      standardCode: 'C3.D2.Civ.1.3-5',
      description: 'Distinguish the responsibilities and powers of citizens',
      category: 'Civics',
      curriculumId: 'curr-1',
    });

    expect(result.standardCode).toContain('C3');
  });

  it('should handle state-specific standards', async () => {
    mockPrisma.standardAlignment.create.mockResolvedValue({
      id: 'align-state',
      standardCode: 'TX.TEKS.MATH.5.1.A',
      description: 'Texas state math standard',
      category: 'Mathematics',
    });

    const result = await service.addStandardAlignment({
      standardCode: 'TX.TEKS.MATH.5.1.A',
      description: 'Texas state math standard',
      category: 'Mathematics',
      curriculumId: 'curr-1',
    });

    expect(result.standardCode).toContain('TX.TEKS');
  });

  it('should handle custom standards', async () => {
    mockPrisma.standardAlignment.create.mockResolvedValue({
      id: 'align-custom',
      standardCode: 'CUSTOM.DISTRICT.1.2.3',
      description: 'District-specific learning objective',
      category: 'Custom',
    });

    const result = await service.addStandardAlignment({
      standardCode: 'CUSTOM.DISTRICT.1.2.3',
      description: 'District-specific learning objective',
      category: 'Custom',
      curriculumId: 'curr-1',
    });

    expect(result.standardCode).toContain('CUSTOM');
  });
});

describe('Standards Hierarchy', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  it('should align standards at curriculum level', async () => {
    mockPrisma.standardAlignment.create.mockResolvedValue({
      id: 'align-1',
      curriculumId: 'curr-1',
      unitId: null,
      lessonId: null,
    });

    const result = await service.addStandardAlignment({
      standardCode: 'CCSS.MATH.5',
      description: 'Grade 5 Math Overview',
      curriculumId: 'curr-1',
    });

    expect(result.curriculumId).toBe('curr-1');
    expect(result.unitId).toBeNull();
    expect(result.lessonId).toBeNull();
  });

  it('should align standards at unit level', async () => {
    mockPrisma.standardAlignment.create.mockResolvedValue({
      id: 'align-2',
      curriculumId: null,
      unitId: 'unit-1',
      lessonId: null,
    });

    const result = await service.addStandardAlignment({
      standardCode: 'CCSS.MATH.5.NBT',
      description: 'Number & Operations in Base Ten',
      unitId: 'unit-1',
    });

    expect(result.curriculumId).toBeNull();
    expect(result.unitId).toBe('unit-1');
    expect(result.lessonId).toBeNull();
  });

  it('should align standards at lesson level', async () => {
    mockPrisma.standardAlignment.create.mockResolvedValue({
      id: 'align-3',
      curriculumId: null,
      unitId: null,
      lessonId: 'lesson-1',
    });

    const result = await service.addStandardAlignment({
      standardCode: 'CCSS.MATH.5.NBT.A.1',
      description: 'Specific place value concept',
      lessonId: 'lesson-1',
    });

    expect(result.curriculumId).toBeNull();
    expect(result.unitId).toBeNull();
    expect(result.lessonId).toBe('lesson-1');
  });
});

describe('Standards Coverage Analysis', () => {
  let service: InstanceType<typeof CurriculumService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService(mockPrisma as any);
  });

  it('should retrieve all standards for coverage report', async () => {
    const comprehensiveStandards = [
      { id: 'align-1', standardCode: 'CCSS.MATH.5.NBT.A.1', curriculumId: 'curr-1' },
      { id: 'align-2', standardCode: 'CCSS.MATH.5.NBT.A.2', unitId: 'unit-1' },
      { id: 'align-3', standardCode: 'CCSS.MATH.5.NBT.A.3', lessonId: 'lesson-1' },
    ];

    mockPrisma.standardAlignment.findMany.mockResolvedValue(comprehensiveStandards);

    const result = await service.getStandards({ curriculumId: 'curr-1' });

    expect(result).toHaveLength(3);
  });

  it('should identify primary vs supporting alignments', async () => {
    const mixedAlignments = [
      { id: 'align-1', standardCode: 'CCSS.1', alignmentType: 'PRIMARY' },
      { id: 'align-2', standardCode: 'CCSS.2', alignmentType: 'SUPPORTING' },
      { id: 'align-3', standardCode: 'CCSS.3', alignmentType: 'PRIMARY' },
    ];

    mockPrisma.standardAlignment.findMany.mockResolvedValue(mixedAlignments);

    const result = await service.getStandards({ curriculumId: 'curr-1' });

    const primary = result.filter((s) => s.alignmentType === 'PRIMARY');
    const supporting = result.filter((s) => s.alignmentType === 'SUPPORTING');

    expect(primary).toHaveLength(2);
    expect(supporting).toHaveLength(1);
  });
});
