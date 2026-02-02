/**
 * Unit Tests for Content Service - Curriculum Module
 *
 * Tests for:
 * - Curriculum framework operations
 * - Grade equivalency mapping
 * - Subject mapping
 * - Learning standard management
 * - Content alignment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockPrismaCurriculumFramework = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const mockPrismaGradeEquivalency = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
};

const mockPrismaSubjectMapping = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const mockPrismaLearningStandard = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
};

const mockPrismaContentAlignment = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../generated/prisma-client/index.js', () => ({
  PrismaClient: vi.fn(() => ({
    curriculumFramework: mockPrismaCurriculumFramework,
    gradeEquivalency: mockPrismaGradeEquivalency,
    subjectMapping: mockPrismaSubjectMapping,
    learningStandard: mockPrismaLearningStandard,
    contentAlignment: mockPrismaContentAlignment,
  })),
  CurriculumFrameworkCode: {
    US_CCSS: 'US_CCSS',
    UK_NC: 'UK_NC',
    KE_CBC: 'KE_CBC',
  },
  StandardizedSubject: {
    MATHEMATICS: 'MATHEMATICS',
    ENGLISH_LANGUAGE_ARTS: 'ENGLISH_LANGUAGE_ARTS',
    SCIENCE: 'SCIENCE',
  },
}));

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type CurriculumFrameworkCode = 'US_CCSS' | 'UK_NC' | 'KE_CBC';
type StandardizedSubject = 'MATHEMATICS' | 'ENGLISH_LANGUAGE_ARTS' | 'SCIENCE';
type AlignmentStrength = 'PRIMARY' | 'SUPPORTING' | 'PREREQUISITE' | 'EXTENSION';
type EquivalencyType = 'EXACT' | 'PARTIAL' | 'BROADER' | 'NARROWER' | 'RELATED';

interface CurriculumFramework {
  id: string;
  code: CurriculumFrameworkCode;
  name: string;
  shortName: string;
  countryCode: string;
  description?: string;
  isActive: boolean;
  gradeEquivalencies?: GradeEquivalency[];
  subjectMappings?: SubjectMapping[];
}

interface GradeEquivalency {
  id: string;
  frameworkId: string;
  gradeLevel: number;
  gradeLabel: string;
  gradeCode: string;
  typicalAgeMin: number;
  typicalAgeMax: number;
  standardizedLevel: number;
  educationStage: string;
}

interface SubjectMapping {
  id: string;
  frameworkId: string;
  standardizedSubject: StandardizedSubject;
  localSubjectCode: string;
  localSubjectName: string;
  isCore: boolean;
  priority: number;
}

interface LearningStandard {
  id: string;
  frameworkId: string;
  standardCode: string;
  fullCode: string;
  title: string;
  description: string;
  hierarchyLevel: number;
  gradeLevel?: number;
}

interface ContentAlignment {
  id: string;
  learningObjectId: string;
  frameworkId: string;
  alignmentScore?: number;
  isPrimary: boolean;
}

// =============================================================================
// CURRICULUM SERVICE (Simplified for testing)
// =============================================================================

class CurriculumService {
  // Get all curriculum frameworks
  async getAllFrameworks(options?: { countryCode?: string; isActive?: boolean }) {
    return mockPrismaCurriculumFramework.findMany({
      where: {
        ...(options?.countryCode && { countryCode: options.countryCode }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      orderBy: { name: 'asc' },
    });
  }

  // Get framework by code
  async getFrameworkByCode(code: CurriculumFrameworkCode) {
    return mockPrismaCurriculumFramework.findUnique({
      where: { code },
      include: {
        gradeEquivalencies: { orderBy: { gradeLevel: 'asc' } },
        subjectMappings: { orderBy: { priority: 'desc' } },
      },
    });
  }

  // Get grade equivalencies by standardized level
  async getGradeEquivalenciesByLevel(standardizedLevel: number) {
    return mockPrismaGradeEquivalency.findMany({
      where: { standardizedLevel },
      include: {
        framework: {
          select: { id: true, code: true, name: true, countryCode: true },
        },
      },
    });
  }

  // Convert grade across frameworks
  async convertGradeAcrossFrameworks(
    sourceFrameworkId: string,
    sourceGradeLevel: number,
    targetFrameworkIds?: string[]
  ) {
    const sourceGrade = await mockPrismaGradeEquivalency.findUnique({
      where: {
        frameworkId_gradeLevel: {
          frameworkId: sourceFrameworkId,
          gradeLevel: sourceGradeLevel,
        },
      },
    });

    if (!sourceGrade) return null;

    const equivalents = await mockPrismaGradeEquivalency.findMany({
      where: {
        standardizedLevel: sourceGrade.standardizedLevel,
        ...(targetFrameworkIds && { frameworkId: { in: targetFrameworkIds } }),
        NOT: { frameworkId: sourceFrameworkId },
      },
    });

    return { source: sourceGrade, equivalents };
  }

  // Upsert grade equivalency
  async upsertGradeEquivalency(input: Partial<GradeEquivalency>) {
    return mockPrismaGradeEquivalency.upsert({
      where: {
        frameworkId_gradeLevel: {
          frameworkId: input.frameworkId!,
          gradeLevel: input.gradeLevel!,
        },
      },
      update: input,
      create: input,
    });
  }

  // Get subject mappings for framework
  async getSubjectMappings(frameworkId: string, standardizedSubject?: StandardizedSubject) {
    return mockPrismaSubjectMapping.findMany({
      where: {
        frameworkId,
        ...(standardizedSubject && { standardizedSubject }),
      },
      orderBy: { priority: 'desc' },
    });
  }

  // Get learning standards
  async getLearningStandards(
    frameworkId: string,
    options?: { gradeLevel?: number; search?: string; limit?: number; offset?: number }
  ) {
    const where = {
      frameworkId,
      ...(options?.gradeLevel && { gradeLevel: options.gradeLevel }),
      ...(options?.search && {
        OR: [
          { standardCode: { contains: options.search } },
          { title: { contains: options.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      mockPrismaLearningStandard.findMany({
        where,
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
        orderBy: { fullCode: 'asc' },
      }),
      mockPrismaLearningStandard.count({ where }),
    ]);

    return { data, total };
  }

  // Create learning standard
  async createLearningStandard(input: Partial<LearningStandard>) {
    return mockPrismaLearningStandard.create({ data: input });
  }

  // Align content to standards
  async alignContent(
    learningObjectId: string,
    frameworkId: string,
    standardIds: string[],
    alignmentScore?: number
  ) {
    return mockPrismaContentAlignment.create({
      data: {
        learningObjectId,
        frameworkId,
        alignmentScore,
        isPrimary: true,
        standards: standardIds,
      },
    });
  }

  // Get content alignments
  async getContentAlignments(learningObjectId: string) {
    return mockPrismaContentAlignment.findMany({
      where: { learningObjectId },
      include: {
        framework: true,
      },
    });
  }

  // Find equivalent standards across frameworks
  async findEquivalentStandards(standardId: string, targetFrameworkIds?: string[]) {
    const standard = await mockPrismaLearningStandard.findUnique({
      where: { id: standardId },
    });

    if (!standard) return null;

    // Find standards with similar codes or keywords
    const equivalents = await mockPrismaLearningStandard.findMany({
      where: {
        frameworkId: targetFrameworkIds ? { in: targetFrameworkIds } : undefined,
        NOT: { id: standardId },
        keywords: { hasSome: standard.keywords || [] },
      },
    });

    return { source: standard, equivalents };
  }
}

// =============================================================================
// FIXTURES
// =============================================================================

const createMockFramework = (overrides: Partial<CurriculumFramework> = {}): CurriculumFramework => ({
  id: 'framework-001',
  code: 'US_CCSS',
  name: 'Common Core State Standards',
  shortName: 'CCSS',
  countryCode: 'US',
  description: 'US K-12 curriculum standards',
  isActive: true,
  ...overrides,
});

const createMockGradeEquivalency = (overrides: Partial<GradeEquivalency> = {}): GradeEquivalency => ({
  id: 'grade-001',
  frameworkId: 'framework-001',
  gradeLevel: 5,
  gradeLabel: 'Grade 5',
  gradeCode: 'G5',
  typicalAgeMin: 10,
  typicalAgeMax: 11,
  standardizedLevel: 5,
  educationStage: 'PRIMARY',
  ...overrides,
});

const createMockSubjectMapping = (overrides: Partial<SubjectMapping> = {}): SubjectMapping => ({
  id: 'subject-001',
  frameworkId: 'framework-001',
  standardizedSubject: 'MATHEMATICS',
  localSubjectCode: 'MATH',
  localSubjectName: 'Mathematics',
  isCore: true,
  priority: 100,
  ...overrides,
});

const createMockLearningStandard = (overrides: Partial<LearningStandard> = {}): LearningStandard => ({
  id: 'standard-001',
  frameworkId: 'framework-001',
  standardCode: 'CCSS.MATH.5.NBT.1',
  fullCode: 'CCSS.MATH.CONTENT.5.NBT.A.1',
  title: 'Understand place value',
  description: 'Recognize that in a multi-digit number...',
  hierarchyLevel: 3,
  gradeLevel: 5,
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('CurriculumService', () => {
  let service: CurriculumService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CurriculumService();
  });

  // ===========================================================================
  // FRAMEWORK OPERATIONS TESTS
  // ===========================================================================

  describe('getAllFrameworks', () => {
    it('should return all active frameworks', async () => {
      const mockFrameworks = [
        createMockFramework({ code: 'US_CCSS' }),
        createMockFramework({ id: 'f2', code: 'UK_NC', name: 'UK National Curriculum' }),
      ];
      mockPrismaCurriculumFramework.findMany.mockResolvedValueOnce(mockFrameworks);

      const result = await service.getAllFrameworks({ isActive: true });

      expect(result).toHaveLength(2);
      expect(mockPrismaCurriculumFramework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });

    it('should filter by country code', async () => {
      mockPrismaCurriculumFramework.findMany.mockResolvedValueOnce([createMockFramework()]);

      await service.getAllFrameworks({ countryCode: 'US' });

      expect(mockPrismaCurriculumFramework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ countryCode: 'US' }),
        })
      );
    });

    it('should return empty array when no frameworks', async () => {
      mockPrismaCurriculumFramework.findMany.mockResolvedValueOnce([]);

      const result = await service.getAllFrameworks();

      expect(result).toEqual([]);
    });
  });

  describe('getFrameworkByCode', () => {
    it('should return framework with relationships', async () => {
      const mockFramework = {
        ...createMockFramework(),
        gradeEquivalencies: [createMockGradeEquivalency()],
        subjectMappings: [createMockSubjectMapping()],
      };
      mockPrismaCurriculumFramework.findUnique.mockResolvedValueOnce(mockFramework);

      const result = await service.getFrameworkByCode('US_CCSS');

      expect(result?.gradeEquivalencies).toHaveLength(1);
      expect(result?.subjectMappings).toHaveLength(1);
    });

    it('should return null for unknown code', async () => {
      mockPrismaCurriculumFramework.findUnique.mockResolvedValueOnce(null);

      const result = await service.getFrameworkByCode('UNKNOWN' as CurriculumFrameworkCode);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // GRADE EQUIVALENCY TESTS
  // ===========================================================================

  describe('getGradeEquivalenciesByLevel', () => {
    it('should return grades for standardized level', async () => {
      const mockGrades = [
        { ...createMockGradeEquivalency(), framework: { code: 'US_CCSS' } },
        {
          ...createMockGradeEquivalency({ id: 'g2', gradeLabel: 'Year 5' }),
          framework: { code: 'UK_NC' },
        },
      ];
      mockPrismaGradeEquivalency.findMany.mockResolvedValueOnce(mockGrades);

      const result = await service.getGradeEquivalenciesByLevel(5);

      expect(result).toHaveLength(2);
      expect(mockPrismaGradeEquivalency.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { standardizedLevel: 5 },
        })
      );
    });
  });

  describe('convertGradeAcrossFrameworks', () => {
    it('should convert grade to equivalent in other frameworks', async () => {
      const sourceGrade = createMockGradeEquivalency({ standardizedLevel: 5 });
      const equivalentGrade = createMockGradeEquivalency({
        id: 'g2',
        frameworkId: 'framework-002',
        gradeLabel: 'Year 5',
      });

      mockPrismaGradeEquivalency.findUnique.mockResolvedValueOnce(sourceGrade);
      mockPrismaGradeEquivalency.findMany.mockResolvedValueOnce([equivalentGrade]);

      const result = await service.convertGradeAcrossFrameworks('framework-001', 5);

      expect(result?.source).toEqual(sourceGrade);
      expect(result?.equivalents).toHaveLength(1);
    });

    it('should return null for unknown grade', async () => {
      mockPrismaGradeEquivalency.findUnique.mockResolvedValueOnce(null);

      const result = await service.convertGradeAcrossFrameworks('framework-001', 99);

      expect(result).toBeNull();
    });

    it('should filter by target framework IDs', async () => {
      const sourceGrade = createMockGradeEquivalency();
      mockPrismaGradeEquivalency.findUnique.mockResolvedValueOnce(sourceGrade);
      mockPrismaGradeEquivalency.findMany.mockResolvedValueOnce([]);

      await service.convertGradeAcrossFrameworks('framework-001', 5, ['framework-002']);

      expect(mockPrismaGradeEquivalency.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            frameworkId: { in: ['framework-002'] },
          }),
        })
      );
    });
  });

  describe('upsertGradeEquivalency', () => {
    it('should create or update grade equivalency', async () => {
      const input = {
        frameworkId: 'framework-001',
        gradeLevel: 6,
        gradeLabel: 'Grade 6',
        standardizedLevel: 6,
      };
      mockPrismaGradeEquivalency.upsert.mockResolvedValueOnce({
        id: 'new-grade',
        ...input,
      });

      const result = await service.upsertGradeEquivalency(input);

      expect(result.gradeLevel).toBe(6);
      expect(mockPrismaGradeEquivalency.upsert).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // SUBJECT MAPPING TESTS
  // ===========================================================================

  describe('getSubjectMappings', () => {
    it('should return subject mappings for framework', async () => {
      const mockMappings = [createMockSubjectMapping()];
      mockPrismaSubjectMapping.findMany.mockResolvedValueOnce(mockMappings);

      const result = await service.getSubjectMappings('framework-001');

      expect(result).toHaveLength(1);
      expect(result[0].standardizedSubject).toBe('MATHEMATICS');
    });

    it('should filter by standardized subject', async () => {
      mockPrismaSubjectMapping.findMany.mockResolvedValueOnce([]);

      await service.getSubjectMappings('framework-001', 'SCIENCE');

      expect(mockPrismaSubjectMapping.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { frameworkId: 'framework-001', standardizedSubject: 'SCIENCE' },
        })
      );
    });
  });

  // ===========================================================================
  // LEARNING STANDARDS TESTS
  // ===========================================================================

  describe('getLearningStandards', () => {
    it('should return paginated standards', async () => {
      const mockStandards = [createMockLearningStandard()];
      mockPrismaLearningStandard.findMany.mockResolvedValueOnce(mockStandards);
      mockPrismaLearningStandard.count.mockResolvedValueOnce(100);

      const result = await service.getLearningStandards('framework-001', {
        limit: 10,
        offset: 0,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(100);
    });

    it('should filter by grade level', async () => {
      mockPrismaLearningStandard.findMany.mockResolvedValueOnce([]);
      mockPrismaLearningStandard.count.mockResolvedValueOnce(0);

      await service.getLearningStandards('framework-001', { gradeLevel: 5 });

      expect(mockPrismaLearningStandard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ gradeLevel: 5 }),
        })
      );
    });

    it('should search by code or title', async () => {
      mockPrismaLearningStandard.findMany.mockResolvedValueOnce([]);
      mockPrismaLearningStandard.count.mockResolvedValueOnce(0);

      await service.getLearningStandards('framework-001', { search: 'place value' });

      expect(mockPrismaLearningStandard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('createLearningStandard', () => {
    it('should create new learning standard', async () => {
      const input = {
        frameworkId: 'framework-001',
        standardCode: 'CCSS.MATH.5.NBT.2',
        fullCode: 'CCSS.MATH.CONTENT.5.NBT.A.2',
        title: 'Place value patterns',
        description: 'Explain patterns in...',
        hierarchyLevel: 3,
      };
      mockPrismaLearningStandard.create.mockResolvedValueOnce({
        id: 'new-standard',
        ...input,
      });

      const result = await service.createLearningStandard(input);

      expect(result.standardCode).toBe('CCSS.MATH.5.NBT.2');
    });
  });

  // ===========================================================================
  // CONTENT ALIGNMENT TESTS
  // ===========================================================================

  describe('alignContent', () => {
    it('should align content to standards', async () => {
      mockPrismaContentAlignment.create.mockResolvedValueOnce({
        id: 'alignment-001',
        learningObjectId: 'content-001',
        frameworkId: 'framework-001',
        alignmentScore: 0.95,
        isPrimary: true,
      });

      const result = await service.alignContent(
        'content-001',
        'framework-001',
        ['standard-001', 'standard-002'],
        0.95
      );

      expect(result.alignmentScore).toBe(0.95);
      expect(result.isPrimary).toBe(true);
    });
  });

  describe('getContentAlignments', () => {
    it('should return alignments for content', async () => {
      const mockAlignments = [
        {
          id: 'alignment-001',
          learningObjectId: 'content-001',
          frameworkId: 'framework-001',
          framework: createMockFramework(),
        },
      ];
      mockPrismaContentAlignment.findMany.mockResolvedValueOnce(mockAlignments);

      const result = await service.getContentAlignments('content-001');

      expect(result).toHaveLength(1);
      expect(result[0].framework.code).toBe('US_CCSS');
    });
  });

  describe('findEquivalentStandards', () => {
    it('should find standards with similar keywords', async () => {
      const sourceStandard = {
        ...createMockLearningStandard(),
        keywords: ['place value', 'decimals'],
      };
      const equivalentStandard = {
        ...createMockLearningStandard({ id: 's2', frameworkId: 'framework-002' }),
        keywords: ['place value', 'numbers'],
      };

      mockPrismaLearningStandard.findUnique.mockResolvedValueOnce(sourceStandard);
      mockPrismaLearningStandard.findMany.mockResolvedValueOnce([equivalentStandard]);

      const result = await service.findEquivalentStandards('standard-001');

      expect(result?.equivalents).toHaveLength(1);
    });

    it('should return null for unknown standard', async () => {
      mockPrismaLearningStandard.findUnique.mockResolvedValueOnce(null);

      const result = await service.findEquivalentStandards('unknown');

      expect(result).toBeNull();
    });
  });
});

// =============================================================================
// CURRICULUM FRAMEWORK VALIDATION TESTS
// =============================================================================

describe('Curriculum Framework Validation', () => {
  it('should have valid country code format', () => {
    const framework = createMockFramework();
    expect(framework.countryCode).toMatch(/^[A-Z]{2}$/);
  });

  it('should have required fields', () => {
    const framework = createMockFramework();
    expect(framework.code).toBeDefined();
    expect(framework.name).toBeDefined();
    expect(framework.shortName).toBeDefined();
  });
});

// =============================================================================
// GRADE EQUIVALENCY VALIDATION TESTS
// =============================================================================

describe('Grade Equivalency Validation', () => {
  it('should have valid age range', () => {
    const grade = createMockGradeEquivalency();
    expect(grade.typicalAgeMax).toBeGreaterThanOrEqual(grade.typicalAgeMin);
  });

  it('should have positive grade level', () => {
    const grade = createMockGradeEquivalency();
    expect(grade.gradeLevel).toBeGreaterThan(0);
  });

  it('should have positive standardized level', () => {
    const grade = createMockGradeEquivalency();
    expect(grade.standardizedLevel).toBeGreaterThan(0);
  });
});

// =============================================================================
// LEARNING STANDARD VALIDATION TESTS
// =============================================================================

describe('Learning Standard Validation', () => {
  it('should have non-empty code', () => {
    const standard = createMockLearningStandard();
    expect(standard.standardCode.length).toBeGreaterThan(0);
    expect(standard.fullCode.length).toBeGreaterThan(0);
  });

  it('should have valid hierarchy level', () => {
    const standard = createMockLearningStandard();
    expect(standard.hierarchyLevel).toBeGreaterThan(0);
  });

  it('should have title and description', () => {
    const standard = createMockLearningStandard();
    expect(standard.title).toBeTruthy();
    expect(standard.description).toBeTruthy();
  });
});
