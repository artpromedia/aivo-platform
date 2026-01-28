/**
 * Curriculum Alignment Service
 * 
 * Provides international curriculum framework management including:
 * - Curriculum framework CRUD operations
 * - Grade level equivalency mapping across frameworks
 * - Subject area standardization
 * - Learning standard management
 * - Content-to-curriculum alignment
 * - Cross-framework standard equivalency mapping
 */

import { PrismaClient, CurriculumFrameworkCode, StandardizedSubject, Prisma } from '../../generated/prisma-client/index.js';

const prisma = new PrismaClient();

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface GradeEquivalencyInput {
  frameworkId: string;
  gradeLevel: number;
  gradeLabel: string;
  gradeCode: string;
  typicalAgeMin: number;
  typicalAgeMax: number;
  standardizedLevel: number;
  educationStage: string;
  description?: string;
}

export interface SubjectMappingInput {
  frameworkId: string;
  standardizedSubject: StandardizedSubject;
  localSubjectCode: string;
  localSubjectName: string;
  localSubjectNameNative?: string;
  gradeMin?: number;
  gradeMax?: number;
  isCore?: boolean;
  priority?: number;
}

export interface LearningStandardInput {
  frameworkId: string;
  subjectMappingId?: string;
  standardCode: string;
  fullCode: string;
  parentStandardId?: string;
  hierarchyLevel: number;
  hierarchyPath: string;
  title: string;
  description: string;
  keywords?: string[];
  gradeLevel?: number;
  gradeBand?: string;
  crossCuttingConcepts?: string[];
  relatedStandardCodes?: string[];
  cognitiveLevel?: string;
}

export interface ContentAlignmentInput {
  learningObjectId: string;
  learningObjectVersionId?: string;
  frameworkId: string;
  alignedGradeLevel?: number;
  alignedGradeBand?: string;
  alignmentScore?: number;
  isPrimary?: boolean;
  alignedBy?: string;
  standardAlignments?: {
    standardId: string;
    alignmentStrength: 'PRIMARY' | 'SUPPORTING' | 'PREREQUISITE' | 'EXTENSION';
    coveragePercent?: number;
    alignmentNotes?: string;
  }[];
}

export interface StandardEquivalencyInput {
  sourceStandardId: string;
  targetStandardId: string;
  equivalencyType: 'EXACT' | 'PARTIAL' | 'BROADER' | 'NARROWER' | 'RELATED';
  confidenceScore: number;
  notes?: string;
  mappingSource: 'MANUAL' | 'AI_GENERATED' | 'OFFICIAL';
}

// ══════════════════════════════════════════════════════════════════════════════
// Curriculum Framework Operations
// ══════════════════════════════════════════════════════════════════════════════

export async function getAllCurriculumFrameworks(options?: {
  countryCode?: string;
  isActive?: boolean;
}) {
  return prisma.curriculumFramework.findMany({
    where: {
      ...(options?.countryCode && { countryCode: options.countryCode }),
      ...(options?.isActive !== undefined && { isActive: options.isActive }),
    },
    include: {
      _count: {
        select: {
          gradeEquivalencies: true,
          learningStandards: true,
          subjectMappings: true,
          contentAlignments: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getCurriculumFrameworkByCode(code: CurriculumFrameworkCode) {
  return prisma.curriculumFramework.findUnique({
    where: { code },
    include: {
      gradeEquivalencies: {
        orderBy: { gradeLevel: 'asc' },
      },
      subjectMappings: {
        orderBy: { priority: 'desc' },
      },
    },
  });
}

export async function getCurriculumFrameworkById(id: string) {
  return prisma.curriculumFramework.findUnique({
    where: { id },
    include: {
      gradeEquivalencies: {
        orderBy: { gradeLevel: 'asc' },
      },
      subjectMappings: {
        orderBy: { priority: 'desc' },
      },
      _count: {
        select: {
          learningStandards: true,
          contentAlignments: true,
        },
      },
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Grade Equivalency Operations
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get grade equivalencies across frameworks for a given standardized level
 * Enables: "Show me what US Grade 5 is equivalent to in other curricula"
 */
export async function getGradeEquivalenciesByLevel(standardizedLevel: number) {
  return prisma.gradeEquivalency.findMany({
    where: { standardizedLevel },
    include: {
      framework: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          countryCode: true,
        },
      },
    },
    orderBy: {
      framework: { name: 'asc' },
    },
  });
}

/**
 * Get all grade equivalencies for a framework
 */
export async function getGradeEquivalenciesForFramework(frameworkId: string) {
  return prisma.gradeEquivalency.findMany({
    where: { frameworkId },
    orderBy: { gradeLevel: 'asc' },
  });
}

/**
 * Convert a grade from one framework to equivalent grades in other frameworks
 */
export async function convertGradeAcrossFrameworks(
  sourceFrameworkId: string,
  sourceGradeLevel: number,
  targetFrameworkIds?: string[]
) {
  // First, find the standardized level for the source grade
  const sourceGrade = await prisma.gradeEquivalency.findUnique({
    where: {
      frameworkId_gradeLevel: {
        frameworkId: sourceFrameworkId,
        gradeLevel: sourceGradeLevel,
      },
    },
  });

  if (!sourceGrade) {
    return null;
  }

  // Find equivalent grades in other frameworks
  const equivalentGrades = await prisma.gradeEquivalency.findMany({
    where: {
      standardizedLevel: sourceGrade.standardizedLevel,
      ...(targetFrameworkIds && {
        frameworkId: { in: targetFrameworkIds },
      }),
      NOT: {
        frameworkId: sourceFrameworkId,
      },
    },
    include: {
      framework: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          countryCode: true,
        },
      },
    },
  });

  return {
    source: sourceGrade,
    equivalents: equivalentGrades,
  };
}

/**
 * Create or update grade equivalency
 */
export async function upsertGradeEquivalency(input: GradeEquivalencyInput) {
  return prisma.gradeEquivalency.upsert({
    where: {
      frameworkId_gradeLevel: {
        frameworkId: input.frameworkId,
        gradeLevel: input.gradeLevel,
      },
    },
    update: {
      gradeLabel: input.gradeLabel,
      gradeCode: input.gradeCode,
      typicalAgeMin: input.typicalAgeMin,
      typicalAgeMax: input.typicalAgeMax,
      standardizedLevel: input.standardizedLevel,
      educationStage: input.educationStage,
      description: input.description,
    },
    create: input,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Subject Mapping Operations
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get subject mappings for a standardized subject across frameworks
 */
export async function getSubjectMappingsForStandardizedSubject(
  standardizedSubject: StandardizedSubject,
  frameworkIds?: string[]
) {
  return prisma.subjectMapping.findMany({
    where: {
      standardizedSubject,
      ...(frameworkIds && { frameworkId: { in: frameworkIds } }),
    },
    include: {
      framework: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          countryCode: true,
        },
      },
    },
  });
}

/**
 * Get all subject mappings for a framework
 */
export async function getSubjectMappingsForFramework(frameworkId: string) {
  return prisma.subjectMapping.findMany({
    where: { frameworkId },
    orderBy: [{ isCore: 'desc' }, { priority: 'desc' }],
  });
}

/**
 * Create or update subject mapping
 */
export async function upsertSubjectMapping(input: SubjectMappingInput) {
  return prisma.subjectMapping.upsert({
    where: {
      frameworkId_standardizedSubject: {
        frameworkId: input.frameworkId,
        standardizedSubject: input.standardizedSubject,
      },
    },
    update: {
      localSubjectCode: input.localSubjectCode,
      localSubjectName: input.localSubjectName,
      localSubjectNameNative: input.localSubjectNameNative,
      gradeMin: input.gradeMin,
      gradeMax: input.gradeMax,
      isCore: input.isCore ?? true,
      priority: input.priority ?? 0,
    },
    create: {
      ...input,
      isCore: input.isCore ?? true,
      priority: input.priority ?? 0,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Learning Standard Operations
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get learning standards for a framework, optionally filtered
 */
export async function getLearningStandards(options: {
  frameworkId: string;
  subjectMappingId?: string;
  gradeLevel?: number;
  gradeBand?: string;
  hierarchyLevel?: number;
  parentStandardId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.LearningStandardWhereInput = {
    frameworkId: options.frameworkId,
    isActive: true,
    ...(options.subjectMappingId && { subjectMappingId: options.subjectMappingId }),
    ...(options.gradeLevel !== undefined && { gradeLevel: options.gradeLevel }),
    ...(options.gradeBand && { gradeBand: options.gradeBand }),
    ...(options.hierarchyLevel !== undefined && { hierarchyLevel: options.hierarchyLevel }),
    ...(options.parentStandardId && { parentStandardId: options.parentStandardId }),
    ...(options.search && {
      OR: [
        { title: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
        { standardCode: { contains: options.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [standards, total] = await Promise.all([
    prisma.learningStandard.findMany({
      where,
      include: {
        subjectMapping: {
          select: {
            standardizedSubject: true,
            localSubjectName: true,
          },
        },
        _count: {
          select: {
            childStandards: true,
            contentAlignments: true,
          },
        },
      },
      orderBy: [{ hierarchyPath: 'asc' }],
      take: options.limit ?? 100,
      skip: options.offset ?? 0,
    }),
    prisma.learningStandard.count({ where }),
  ]);

  return { standards, total };
}

/**
 * Get a learning standard by ID with full hierarchy
 */
export async function getLearningStandardById(id: string) {
  const standard = await prisma.learningStandard.findUnique({
    where: { id },
    include: {
      framework: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
        },
      },
      subjectMapping: true,
      parentStandard: {
        select: {
          id: true,
          standardCode: true,
          title: true,
        },
      },
      childStandards: {
        orderBy: { hierarchyPath: 'asc' },
      },
      standardEquivalencies: {
        include: {
          targetStandard: {
            include: {
              framework: {
                select: {
                  code: true,
                  shortName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return standard;
}

/**
 * Create a learning standard
 */
export async function createLearningStandard(input: LearningStandardInput) {
  return prisma.learningStandard.create({
    data: {
      frameworkId: input.frameworkId,
      subjectMappingId: input.subjectMappingId,
      standardCode: input.standardCode,
      fullCode: input.fullCode,
      parentStandardId: input.parentStandardId,
      hierarchyLevel: input.hierarchyLevel,
      hierarchyPath: input.hierarchyPath,
      title: input.title,
      description: input.description,
      keywords: input.keywords ?? [],
      gradeLevel: input.gradeLevel,
      gradeBand: input.gradeBand,
      crossCuttingConcepts: input.crossCuttingConcepts ?? [],
      relatedStandardCodes: input.relatedStandardCodes ?? [],
      cognitiveLevel: input.cognitiveLevel,
    },
  });
}

/**
 * Search for standards across frameworks
 */
export async function searchStandards(options: {
  query: string;
  frameworkIds?: string[];
  standardizedSubjects?: StandardizedSubject[];
  gradeLevels?: number[];
  limit?: number;
}) {
  return prisma.learningStandard.findMany({
    where: {
      isActive: true,
      ...(options.frameworkIds && { frameworkId: { in: options.frameworkIds } }),
      ...(options.gradeLevels && { gradeLevel: { in: options.gradeLevels } }),
      ...(options.standardizedSubjects && {
        subjectMapping: {
          standardizedSubject: { in: options.standardizedSubjects },
        },
      }),
      OR: [
        { title: { contains: options.query, mode: 'insensitive' } },
        { description: { contains: options.query, mode: 'insensitive' } },
        { standardCode: { contains: options.query, mode: 'insensitive' } },
        { keywords: { has: options.query.toLowerCase() } },
      ],
    },
    include: {
      framework: {
        select: {
          code: true,
          shortName: true,
          countryCode: true,
        },
      },
      subjectMapping: {
        select: {
          standardizedSubject: true,
          localSubjectName: true,
        },
      },
    },
    take: options.limit ?? 50,
    orderBy: [
      { framework: { name: 'asc' } },
      { hierarchyPath: 'asc' },
    ],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Standard Equivalency Operations
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get equivalent standards for a given standard
 */
export async function getEquivalentStandards(standardId: string) {
  const equivalencies = await prisma.standardEquivalency.findMany({
    where: {
      OR: [
        { sourceStandardId: standardId },
        { targetStandardId: standardId },
      ],
    },
    include: {
      sourceStandard: {
        include: {
          framework: {
            select: {
              code: true,
              shortName: true,
              countryCode: true,
            },
          },
        },
      },
      targetStandard: {
        include: {
          framework: {
            select: {
              code: true,
              shortName: true,
              countryCode: true,
            },
          },
        },
      },
    },
  });

  // Normalize results so the "other" standard is always in a consistent position
  return equivalencies.map(eq => {
    if (eq.sourceStandardId === standardId) {
      return {
        ...eq,
        relatedStandard: eq.targetStandard,
        direction: 'outgoing' as const,
      };
    } else {
      return {
        ...eq,
        relatedStandard: eq.sourceStandard,
        direction: 'incoming' as const,
      };
    }
  });
}

/**
 * Create standard equivalency
 */
export async function createStandardEquivalency(input: StandardEquivalencyInput) {
  return prisma.standardEquivalency.create({
    data: {
      sourceStandardId: input.sourceStandardId,
      targetStandardId: input.targetStandardId,
      equivalencyType: input.equivalencyType,
      confidenceScore: input.confidenceScore,
      notes: input.notes,
      mappingSource: input.mappingSource,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Content Alignment Operations
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get curriculum alignments for a learning object
 */
export async function getContentAlignments(learningObjectId: string) {
  return prisma.contentCurriculumAlignment.findMany({
    where: { learningObjectId },
    include: {
      framework: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          countryCode: true,
        },
      },
      standardAlignments: {
        include: {
          standard: {
            select: {
              id: true,
              standardCode: true,
              title: true,
              gradeLevel: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get content aligned to a specific framework
 */
export async function getContentByFramework(options: {
  frameworkId: string;
  gradeLevel?: number;
  standardId?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.ContentCurriculumAlignmentWhereInput = {
    frameworkId: options.frameworkId,
    isActive: true,
    ...(options.gradeLevel !== undefined && { alignedGradeLevel: options.gradeLevel }),
    ...(options.standardId && {
      standardAlignments: {
        some: { standardId: options.standardId },
      },
    }),
  };

  const [alignments, total] = await Promise.all([
    prisma.contentCurriculumAlignment.findMany({
      where,
      include: {
        standardAlignments: {
          include: {
            standard: {
              select: {
                standardCode: true,
                title: true,
              },
            },
          },
        },
      },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    }),
    prisma.contentCurriculumAlignment.count({ where }),
  ]);

  return { alignments, total };
}

/**
 * Create or update content curriculum alignment with standards
 */
export async function alignContentToCurriculum(input: ContentAlignmentInput) {
  return prisma.$transaction(async (tx) => {
    // Upsert the main alignment
    const alignment = await tx.contentCurriculumAlignment.upsert({
      where: {
        learningObjectId_frameworkId: {
          learningObjectId: input.learningObjectId,
          frameworkId: input.frameworkId,
        },
      },
      update: {
        learningObjectVersionId: input.learningObjectVersionId,
        alignedGradeLevel: input.alignedGradeLevel,
        alignedGradeBand: input.alignedGradeBand,
        alignmentScore: input.alignmentScore,
        isPrimary: input.isPrimary ?? false,
        alignedBy: input.alignedBy,
      },
      create: {
        learningObjectId: input.learningObjectId,
        learningObjectVersionId: input.learningObjectVersionId,
        frameworkId: input.frameworkId,
        alignedGradeLevel: input.alignedGradeLevel,
        alignedGradeBand: input.alignedGradeBand,
        alignmentScore: input.alignmentScore,
        isPrimary: input.isPrimary ?? false,
        alignedBy: input.alignedBy,
      },
    });

    // If standard alignments provided, replace them
    if (input.standardAlignments && input.standardAlignments.length > 0) {
      // Delete existing standard alignments
      await tx.contentStandardAlignment.deleteMany({
        where: { curriculumAlignmentId: alignment.id },
      });

      // Create new standard alignments
      await tx.contentStandardAlignment.createMany({
        data: input.standardAlignments.map(sa => ({
          curriculumAlignmentId: alignment.id,
          standardId: sa.standardId,
          alignmentStrength: sa.alignmentStrength,
          coveragePercent: sa.coveragePercent,
          alignmentNotes: sa.alignmentNotes,
        })),
      });
    }

    return tx.contentCurriculumAlignment.findUnique({
      where: { id: alignment.id },
      include: {
        framework: true,
        standardAlignments: {
          include: {
            standard: true,
          },
        },
      },
    });
  });
}

/**
 * Verify a content alignment
 */
export async function verifyContentAlignment(alignmentId: string, verifiedBy: string) {
  return prisma.contentCurriculumAlignment.update({
    where: { id: alignmentId },
    data: {
      verifiedBy,
      verifiedAt: new Date(),
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Analytics & Reporting
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get curriculum coverage statistics
 */
export async function getCurriculumCoverageStats(frameworkId: string) {
  const [totalStandards, alignedStandards, gradeDistribution] = await Promise.all([
    prisma.learningStandard.count({
      where: { frameworkId, isActive: true },
    }),
    prisma.learningStandard.count({
      where: {
        frameworkId,
        isActive: true,
        contentAlignments: { some: {} },
      },
    }),
    prisma.learningStandard.groupBy({
      by: ['gradeLevel'],
      where: { frameworkId, isActive: true },
      _count: true,
    }),
  ]);

  return {
    totalStandards,
    alignedStandards,
    coveragePercent: totalStandards > 0 
      ? Math.round((alignedStandards / totalStandards) * 100) 
      : 0,
    gradeDistribution: gradeDistribution.map(g => ({
      gradeLevel: g.gradeLevel,
      count: g._count,
    })),
  };
}
