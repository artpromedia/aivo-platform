/**
 * Rubric Service
 * 
 * Manages rubrics for subjective grading:
 * - Rubric CRUD operations
 * - Rubric templates
 * - Rubric cloning and sharing
 */

import { prisma } from '../../prisma.js';
import type { PrismaTransactionClient } from '../../prisma.js';
import { publishEvent } from '../../events/publisher.js';
import type {
  Rubric,
  RubricCriterion,
  RubricLevel,
  RubricType,
} from '../../types/assessment.types.js';
import type {
  CreateRubricInput,
  UpdateRubricInput,
} from '../../validators/schemas.js';

export class RubricService {
  /**
   * Create a new rubric
   */
  async create(
    tenantId: string,
    createdBy: string,
    input: CreateRubricInput,
    tx?: PrismaTransactionClient
  ): Promise<Rubric> {
    const client = tx ?? prisma;

    // Validate rubric structure
    this.validateRubricStructure(input);

    // Calculate max points
    const maxPoints = input.criteria.reduce((sum, c) => sum + c.maxPoints, 0);

    const rubric = await client.rubric.create({
      data: {
        tenantId,
        createdBy,
        name: input.name,
        description: input.description,
        type: input.type ?? 'ANALYTIC',
        maxPoints,
        isPublic: input.isPublic ?? false,
        criteria: {
          create: input.criteria.map((criterion, criterionIndex) => ({
            name: criterion.name,
            description: criterion.description,
            orderIndex: criterionIndex,
            maxPoints: criterion.maxPoints,
            weight: criterion.weight ?? 1,
            levels: {
              create: criterion.levels.map((level, levelIndex) => ({
                name: level.name,
                description: level.description,
                points: level.points,
                orderIndex: levelIndex,
                feedback: level.feedback,
              })),
            },
          })),
        },
      },
      include: {
        criteria: {
          include: { levels: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    await publishEvent('rubric.created', {
      rubricId: rubric.id,
      tenantId,
      createdBy,
    });

    return this.toRubric(rubric);
  }

  /**
   * Get rubric by ID
   */
  async getById(rubricId: string): Promise<Rubric | null> {
    const rubric = await prisma.rubric.findUnique({
      where: { id: rubricId },
      include: {
        criteria: {
          include: { levels: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return rubric ? this.toRubric(rubric) : null;
  }

  /**
   * List rubrics
   */
  async list(
    tenantId: string,
    userId: string,
    options?: {
      includePublic?: boolean;
      type?: RubricType;
      search?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ data: Rubric[]; total: number; page: number; pageSize: number }> {
    const { includePublic = true, type, search, page = 1, pageSize = 20 } = options ?? {};

    const where: any = {
      OR: [
        { tenantId, createdBy: userId },
        ...(includePublic ? [{ isPublic: true }] : []),
      ],
    };

    if (type) {
      where.type = type;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [rubrics, total] = await Promise.all([
      prisma.rubric.findMany({
        where,
        include: {
          criteria: {
            include: { levels: { orderBy: { orderIndex: 'asc' } } },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.rubric.count({ where }),
    ]);

    return {
      data: rubrics.map(r => this.toRubric(r)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Update rubric
   */
  async update(
    rubricId: string,
    userId: string,
    input: UpdateRubricInput,
    tx?: PrismaTransactionClient
  ): Promise<Rubric> {
    const client = tx ?? prisma;

    const existing = await client.rubric.findUnique({
      where: { id: rubricId },
    });

    if (!existing) {
      throw new Error('Rubric not found');
    }

    if (existing.createdBy !== userId) {
      throw new Error('Not authorized to update this rubric');
    }

    // If criteria are being updated, replace them entirely
    if (input.criteria) {
      // Delete existing criteria (cascades to levels)
      await client.rubricCriterion.deleteMany({
        where: { rubricId },
      });

      // Create new criteria
      for (let i = 0; i < input.criteria.length; i++) {
        const criterion = input.criteria[i];
        await client.rubricCriterion.create({
          data: {
            rubricId,
            name: criterion.name,
            description: criterion.description,
            orderIndex: i,
            maxPoints: criterion.maxPoints,
            weight: criterion.weight ?? 1,
            levels: {
              create: criterion.levels.map((level, levelIndex) => ({
                name: level.name,
                description: level.description,
                points: level.points,
                orderIndex: levelIndex,
                feedback: level.feedback,
              })),
            },
          },
        });
      }
    }

    // Calculate new max points if criteria changed
    const maxPoints = input.criteria
      ? input.criteria.reduce((sum, c) => sum + c.maxPoints, 0)
      : undefined;

    const updated = await client.rubric.update({
      where: { id: rubricId },
      data: {
        name: input.name,
        description: input.description,
        type: input.type,
        maxPoints,
        isPublic: input.isPublic,
      },
      include: {
        criteria: {
          include: { levels: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return this.toRubric(updated);
  }

  /**
   * Clone rubric
   */
  async clone(
    rubricId: string,
    userId: string,
    tenantId: string,
    options?: { name?: string }
  ): Promise<Rubric> {
    const original = await prisma.rubric.findUnique({
      where: { id: rubricId },
      include: {
        criteria: {
          include: { levels: true },
        },
      },
    });

    if (!original) {
      throw new Error('Rubric not found');
    }

    const cloned = await prisma.rubric.create({
      data: {
        tenantId,
        createdBy: userId,
        name: options?.name ?? `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        maxPoints: original.maxPoints,
        isPublic: false,
        clonedFrom: rubricId,
        criteria: {
          create: original.criteria.map((criterion, criterionIndex) => ({
            name: criterion.name,
            description: criterion.description,
            orderIndex: criterionIndex,
            maxPoints: criterion.maxPoints,
            weight: criterion.weight,
            levels: {
              create: criterion.levels.map((level, levelIndex) => ({
                name: level.name,
                description: level.description,
                points: level.points,
                orderIndex: levelIndex,
                feedback: level.feedback,
              })),
            },
          })),
        },
      },
      include: {
        criteria: {
          include: { levels: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return this.toRubric(cloned);
  }

  /**
   * Delete rubric
   */
  async delete(rubricId: string, userId: string): Promise<void> {
    const rubric = await prisma.rubric.findUnique({
      where: { id: rubricId },
    });

    if (!rubric) {
      throw new Error('Rubric not found');
    }

    if (rubric.createdBy !== userId) {
      throw new Error('Not authorized to delete this rubric');
    }

    // Check if rubric is in use
    const questionsUsingRubric = await prisma.question.count({
      where: { rubricId },
    });

    if (questionsUsingRubric > 0) {
      throw new Error(`Cannot delete rubric: it is used by ${questionsUsingRubric} questions`);
    }

    await prisma.rubric.delete({
      where: { id: rubricId },
    });
  }

  /**
   * Get rubric templates (common rubric patterns)
   */
  getRubricTemplates(): Array<Omit<CreateRubricInput, 'isPublic'>> {
    return [
      {
        name: '4-Point Scale',
        description: 'Standard 4-point rubric for essays and short answers',
        type: 'ANALYTIC',
        criteria: [
          {
            name: 'Content & Understanding',
            description: 'Demonstrates understanding of the topic',
            maxPoints: 4,
            weight: 1,
            levels: [
              { name: 'Exemplary', points: 4, description: 'Demonstrates thorough understanding with insightful analysis' },
              { name: 'Proficient', points: 3, description: 'Demonstrates solid understanding with clear analysis' },
              { name: 'Developing', points: 2, description: 'Demonstrates partial understanding with some analysis' },
              { name: 'Beginning', points: 1, description: 'Demonstrates limited understanding' },
            ],
          },
          {
            name: 'Organization',
            description: 'Structure and logical flow of ideas',
            maxPoints: 4,
            weight: 1,
            levels: [
              { name: 'Exemplary', points: 4, description: 'Well-organized with clear introduction, body, and conclusion' },
              { name: 'Proficient', points: 3, description: 'Organized with identifiable structure' },
              { name: 'Developing', points: 2, description: 'Some organization but lacking clarity' },
              { name: 'Beginning', points: 1, description: 'Lacks clear organization' },
            ],
          },
          {
            name: 'Language & Mechanics',
            description: 'Grammar, spelling, and sentence structure',
            maxPoints: 4,
            weight: 1,
            levels: [
              { name: 'Exemplary', points: 4, description: 'Near-perfect grammar and mechanics' },
              { name: 'Proficient', points: 3, description: 'Minor errors that don\'t impede understanding' },
              { name: 'Developing', points: 2, description: 'Several errors that sometimes impede understanding' },
              { name: 'Beginning', points: 1, description: 'Frequent errors that impede understanding' },
            ],
          },
        ],
      },
      {
        name: 'Single-Point Rubric',
        description: 'Simple pass/fail rubric with feedback focus',
        type: 'SINGLE_POINT',
        criteria: [
          {
            name: 'Meets Standard',
            description: 'Student demonstrates required competency',
            maxPoints: 1,
            weight: 1,
            levels: [
              { name: 'Meets', points: 1, description: 'Demonstrates the expected competency' },
              { name: 'Does Not Meet', points: 0, description: 'Does not yet demonstrate the expected competency' },
            ],
          },
        ],
      },
      {
        name: 'Holistic 5-Point',
        description: 'Overall assessment on a 5-point scale',
        type: 'HOLISTIC',
        criteria: [
          {
            name: 'Overall Quality',
            description: 'Holistic assessment of the work',
            maxPoints: 5,
            weight: 1,
            levels: [
              { name: 'Exceptional', points: 5, description: 'Exceeds all expectations with exceptional quality' },
              { name: 'Excellent', points: 4, description: 'Meets all expectations with high quality' },
              { name: 'Satisfactory', points: 3, description: 'Meets most expectations adequately' },
              { name: 'Needs Improvement', points: 2, description: 'Partially meets expectations' },
              { name: 'Unsatisfactory', points: 1, description: 'Does not meet expectations' },
            ],
          },
        ],
      },
    ];
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  private validateRubricStructure(input: CreateRubricInput): void {
    const errors: string[] = [];

    if (!input.criteria?.length) {
      errors.push('Rubric must have at least one criterion');
    }

    for (const criterion of input.criteria) {
      if (!criterion.levels?.length || criterion.levels.length < 2) {
        errors.push(`Criterion "${criterion.name}" must have at least 2 levels`);
      }

      // Verify max level points matches criterion max points
      const maxLevelPoints = Math.max(...criterion.levels.map(l => l.points));
      if (maxLevelPoints !== criterion.maxPoints) {
        errors.push(
          `Criterion "${criterion.name}" maxPoints (${criterion.maxPoints}) must match highest level points (${maxLevelPoints})`
        );
      }

      // Verify lowest level has 0 points (optional but recommended)
      const minLevelPoints = Math.min(...criterion.levels.map(l => l.points));
      if (minLevelPoints < 0) {
        errors.push(`Criterion "${criterion.name}" has a level with negative points`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid rubric structure: ${errors.join('; ')}`);
    }
  }

  // ============================================================================
  // MAPPING
  // ============================================================================

  private toRubric(data: any): Rubric {
    return {
      id: data.id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      maxPoints: data.maxPoints,
      isPublic: data.isPublic,
      criteria: data.criteria?.map((c: any) => this.toCriterion(c)) ?? [],
      createdBy: data.createdBy,
      clonedFrom: data.clonedFrom,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private toCriterion(data: any): RubricCriterion {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      orderIndex: data.orderIndex,
      maxPoints: data.maxPoints,
      weight: data.weight,
      levels: data.levels?.map((l: any) => this.toLevel(l)) ?? [],
    };
  }

  private toLevel(data: any): RubricLevel {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      points: data.points,
      orderIndex: data.orderIndex,
      feedback: data.feedback,
    };
  }
}

export const rubricService = new RubricService();
