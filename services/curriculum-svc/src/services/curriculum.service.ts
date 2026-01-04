/**
 * Curriculum Service - Core business logic
 * Provides curriculum management, unit/lesson organization,
 * standards alignment, and pacing guide functionality.
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type CurriculumStandard = 'COMMON_CORE' | 'NGSS' | 'C3' | 'STATE_SPECIFIC' | 'CUSTOM';
export type GradeBand = 'PRE_K' | 'K_2' | 'G3_5' | 'G6_8' | 'G9_12';
export type SubjectArea = 'ELA' | 'MATH' | 'SCIENCE' | 'SOCIAL_STUDIES' | 'SEL' | 'ARTS' | 'WORLD_LANGUAGE' | 'PHYSICAL_ED' | 'TECHNOLOGY' | 'CAREER_TECH';
export type UnitStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CreateCurriculumRequest {
  name: string;
  description?: string;
  standard: CurriculumStandard;
  subject: SubjectArea;
  gradeBand: GradeBand;
  academicYear: string;
}

export interface CreateUnitRequest {
  curriculumId: string;
  title: string;
  description?: string;
  orderIndex: number;
  essentialQuestions?: string[];
  bigIdeas?: string[];
  durationDays: number;
  suggestedStartDate?: Date;
}

export interface CreateLessonRequest {
  unitId: string;
  title: string;
  description?: string;
  orderIndex: number;
  objectives?: string[];
  durationMin: number;
  lessonType?: string;
  activities?: any[];
  materials?: string[];
  differentiation?: any;
  assessmentNotes?: string;
}

export interface CreatePacingGuideRequest {
  curriculumId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  entries?: PacingEntry[];
  isDefault?: boolean;
}

export interface PacingEntry {
  unitId: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface StandardAlignmentRequest {
  standardCode: string;
  description: string;
  category?: string;
  alignmentType?: 'PRIMARY' | 'SUPPORTING';
  curriculumId?: string;
  unitId?: string;
  lessonId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CURRICULUM SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class CurriculumService {
  constructor(private prisma: PrismaClient) {}

  // ════════════════════════════════════════════════════════════════════════════
  // CURRICULA
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new curriculum
   */
  async createCurriculum(tenantId: string, request: CreateCurriculumRequest, createdBy?: string) {
    return this.prisma.curriculum.create({
      data: {
        tenantId,
        name: request.name,
        description: request.description,
        standard: request.standard,
        subject: request.subject,
        gradeBand: request.gradeBand,
        academicYear: request.academicYear,
        createdBy,
        isActive: true,
        version: 1,
      },
    });
  }

  /**
   * Get all curricula for a tenant
   */
  async getCurricula(tenantId: string, options?: {
    subject?: SubjectArea;
    gradeBand?: GradeBand;
    academicYear?: string;
    isActive?: boolean;
  }) {
    return this.prisma.curriculum.findMany({
      where: {
        tenantId,
        ...(options?.subject && { subject: options.subject }),
        ...(options?.gradeBand && { gradeBand: options.gradeBand }),
        ...(options?.academicYear && { academicYear: options.academicYear }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      include: {
        _count: {
          select: { units: true },
        },
      },
      orderBy: [{ subject: 'asc' }, { gradeBand: 'asc' }],
    });
  }

  /**
   * Get a single curriculum with full details
   */
  async getCurriculum(curriculumId: string) {
    return this.prisma.curriculum.findUnique({
      where: { id: curriculumId },
      include: {
        units: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
            },
            standards: true,
            _count: {
              select: { lessons: true, resources: true },
            },
          },
        },
        standards: true,
        pacingGuides: {
          orderBy: { isDefault: 'desc' },
        },
      },
    });
  }

  /**
   * Update a curriculum
   */
  async updateCurriculum(curriculumId: string, updates: Partial<CreateCurriculumRequest>) {
    // Increment version on update
    const current = await this.prisma.curriculum.findUnique({
      where: { id: curriculumId },
    });

    return this.prisma.curriculum.update({
      where: { id: curriculumId },
      data: {
        ...updates,
        version: (current?.version ?? 0) + 1,
      },
    });
  }

  /**
   * Archive a curriculum
   */
  async archiveCurriculum(curriculumId: string) {
    return this.prisma.curriculum.update({
      where: { id: curriculumId },
      data: { isActive: false },
    });
  }

  /**
   * Duplicate a curriculum for a new academic year
   */
  async duplicateCurriculum(curriculumId: string, newAcademicYear: string) {
    const source = await this.getCurriculum(curriculumId);
    if (!source) throw new Error('Curriculum not found');

    // Create new curriculum
    const newCurriculum = await this.prisma.curriculum.create({
      data: {
        tenantId: source.tenantId,
        name: source.name,
        description: source.description,
        standard: source.standard,
        subject: source.subject,
        gradeBand: source.gradeBand,
        academicYear: newAcademicYear,
        createdBy: source.createdBy,
        isActive: true,
        version: 1,
      },
    });

    // Duplicate units and lessons
    for (const unit of source.units) {
      const newUnit = await this.prisma.curriculumUnit.create({
        data: {
          curriculumId: newCurriculum.id,
          title: unit.title,
          description: unit.description,
          orderIndex: unit.orderIndex,
          essentialQuestions: unit.essentialQuestions,
          bigIdeas: unit.bigIdeas,
          durationDays: unit.durationDays,
          status: 'DRAFT',
        },
      });

      // Duplicate lessons
      for (const lesson of unit.lessons) {
        await this.prisma.lesson.create({
          data: {
            unitId: newUnit.id,
            title: lesson.title,
            description: lesson.description,
            orderIndex: lesson.orderIndex,
            objectives: lesson.objectives,
            durationMin: lesson.durationMin,
            lessonType: lesson.lessonType,
            activities: lesson.activities as any,
            materials: lesson.materials,
            differentiation: lesson.differentiation as any,
            assessmentNotes: lesson.assessmentNotes,
          },
        });
      }

      // Duplicate standards alignments
      for (const std of unit.standards) {
        await this.prisma.standardAlignment.create({
          data: {
            standardCode: std.standardCode,
            description: std.description,
            category: std.category,
            alignmentType: std.alignmentType,
            unitId: newUnit.id,
          },
        });
      }
    }

    return this.getCurriculum(newCurriculum.id);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UNITS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new unit
   */
  async createUnit(request: CreateUnitRequest) {
    return this.prisma.curriculumUnit.create({
      data: {
        curriculumId: request.curriculumId,
        title: request.title,
        description: request.description,
        orderIndex: request.orderIndex,
        essentialQuestions: request.essentialQuestions ?? [],
        bigIdeas: request.bigIdeas ?? [],
        durationDays: request.durationDays,
        suggestedStartDate: request.suggestedStartDate,
        status: 'DRAFT',
      },
    });
  }

  /**
   * Get a unit with lessons
   */
  async getUnit(unitId: string) {
    return this.prisma.curriculumUnit.findUnique({
      where: { id: unitId },
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
  }

  /**
   * Update a unit
   */
  async updateUnit(unitId: string, updates: Partial<Omit<CreateUnitRequest, 'curriculumId'>>) {
    return this.prisma.curriculumUnit.update({
      where: { id: unitId },
      data: updates,
    });
  }

  /**
   * Publish a unit
   */
  async publishUnit(unitId: string) {
    return this.prisma.curriculumUnit.update({
      where: { id: unitId },
      data: { status: 'PUBLISHED' },
    });
  }

  /**
   * Reorder units
   */
  async reorderUnits(unitIds: string[]) {
    const updates = unitIds.map((id, index) =>
      this.prisma.curriculumUnit.update({
        where: { id },
        data: { orderIndex: index },
      })
    );

    await this.prisma.$transaction(updates);
  }

  /**
   * Delete a unit
   */
  async deleteUnit(unitId: string) {
    return this.prisma.curriculumUnit.delete({
      where: { id: unitId },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LESSONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new lesson
   */
  async createLesson(request: CreateLessonRequest) {
    return this.prisma.lesson.create({
      data: {
        unitId: request.unitId,
        title: request.title,
        description: request.description,
        orderIndex: request.orderIndex,
        objectives: request.objectives ?? [],
        durationMin: request.durationMin,
        lessonType: request.lessonType,
        activities: (request.activities as any) ?? [],
        materials: request.materials ?? [],
        differentiation: request.differentiation as any,
        assessmentNotes: request.assessmentNotes,
      },
    });
  }

  /**
   * Get a lesson with details
   */
  async getLesson(lessonId: string) {
    return this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        unit: {
          include: { curriculum: true },
        },
        standards: true,
        contentLinks: true,
      },
    });
  }

  /**
   * Update a lesson
   */
  async updateLesson(lessonId: string, updates: Partial<Omit<CreateLessonRequest, 'unitId'>>) {
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.orderIndex !== undefined && { orderIndex: updates.orderIndex }),
        ...(updates.objectives && { objectives: updates.objectives }),
        ...(updates.durationMin !== undefined && { durationMin: updates.durationMin }),
        ...(updates.lessonType !== undefined && { lessonType: updates.lessonType }),
        ...(updates.activities && { activities: updates.activities as any }),
        ...(updates.materials && { materials: updates.materials }),
        ...(updates.differentiation !== undefined && { differentiation: updates.differentiation as any }),
        ...(updates.assessmentNotes !== undefined && { assessmentNotes: updates.assessmentNotes }),
      },
    });
  }

  /**
   * Reorder lessons within a unit
   */
  async reorderLessons(lessonIds: string[]) {
    const updates = lessonIds.map((id, index) =>
      this.prisma.lesson.update({
        where: { id },
        data: { orderIndex: index },
      })
    );

    await this.prisma.$transaction(updates);
  }

  /**
   * Link content to a lesson
   */
  async linkContent(lessonId: string, contentId: string, contentType: string, usageContext?: string) {
    const maxOrder = await this.prisma.lessonContentLink.aggregate({
      where: { lessonId },
      _max: { orderIndex: true },
    });

    return this.prisma.lessonContentLink.create({
      data: {
        lessonId,
        contentId,
        contentType,
        usageContext,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
        isRequired: true,
      },
    });
  }

  /**
   * Delete a lesson
   */
  async deleteLesson(lessonId: string) {
    return this.prisma.lesson.delete({
      where: { id: lessonId },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STANDARDS ALIGNMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Add a standard alignment
   */
  async addStandardAlignment(request: StandardAlignmentRequest) {
    return this.prisma.standardAlignment.create({
      data: {
        standardCode: request.standardCode,
        description: request.description,
        category: request.category,
        alignmentType: request.alignmentType ?? 'PRIMARY',
        curriculumId: request.curriculumId,
        unitId: request.unitId,
        lessonId: request.lessonId,
      },
    });
  }

  /**
   * Get standards for a curriculum item
   */
  async getStandards(options: { curriculumId?: string; unitId?: string; lessonId?: string }) {
    return this.prisma.standardAlignment.findMany({
      where: {
        ...(options.curriculumId && { curriculumId: options.curriculumId }),
        ...(options.unitId && { unitId: options.unitId }),
        ...(options.lessonId && { lessonId: options.lessonId }),
      },
      orderBy: { standardCode: 'asc' },
    });
  }

  /**
   * Search for standards
   */
  async searchStandards(query: string, limit = 20) {
    return this.prisma.standardAlignment.findMany({
      where: {
        OR: [
          { standardCode: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      distinct: ['standardCode'],
      take: limit,
    });
  }

  /**
   * Remove a standard alignment
   */
  async removeStandardAlignment(alignmentId: string) {
    return this.prisma.standardAlignment.delete({
      where: { id: alignmentId },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PACING GUIDES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a pacing guide
   */
  async createPacingGuide(tenantId: string, request: CreatePacingGuideRequest) {
    // If setting as default, unset other defaults
    if (request.isDefault) {
      await this.prisma.pacingGuide.updateMany({
        where: {
          curriculumId: request.curriculumId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.pacingGuide.create({
      data: {
        tenantId,
        curriculumId: request.curriculumId,
        name: request.name,
        description: request.description,
        startDate: request.startDate,
        endDate: request.endDate,
        entries: (request.entries as any) ?? [],
        isDefault: request.isDefault ?? false,
      },
    });
  }

  /**
   * Get pacing guides for a curriculum
   */
  async getPacingGuides(curriculumId: string) {
    return this.prisma.pacingGuide.findMany({
      where: { curriculumId },
      orderBy: { isDefault: 'desc' },
    });
  }

  /**
   * Update a pacing guide
   */
  async updatePacingGuide(pacingGuideId: string, updates: Partial<Omit<CreatePacingGuideRequest, 'curriculumId'>>) {
    return this.prisma.pacingGuide.update({
      where: { id: pacingGuideId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.startDate && { startDate: updates.startDate }),
        ...(updates.endDate && { endDate: updates.endDate }),
        ...(updates.entries && { entries: updates.entries as any }),
        ...(updates.isDefault !== undefined && { isDefault: updates.isDefault }),
      },
    });
  }

  /**
   * Auto-generate pacing entries based on unit durations
   */
  async generatePacingEntries(curriculumId: string, startDate: Date, endDate: Date): Promise<PacingEntry[]> {
    const units = await this.prisma.curriculumUnit.findMany({
      where: { curriculumId },
      orderBy: { orderIndex: 'asc' },
    });

    const entries: PacingEntry[] = [];
    let currentDate = new Date(startDate);

    for (const unit of units) {
      const unitEndDate = new Date(currentDate);
      unitEndDate.setDate(unitEndDate.getDate() + unit.durationDays);

      // Don't go past end date
      if (unitEndDate > endDate) {
        unitEndDate.setTime(endDate.getTime());
      }

      entries.push({
        unitId: unit.id,
        startDate: currentDate.toISOString().split('T')[0],
        endDate: unitEndDate.toISOString().split('T')[0],
      });

      currentDate = new Date(unitEndDate);
      currentDate.setDate(currentDate.getDate() + 1);

      if (currentDate > endDate) break;
    }

    return entries;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TEACHER PROGRESS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get or create teacher progress
   */
  async getTeacherProgress(tenantId: string, teacherId: string, curriculumId: string) {
    return this.prisma.teacherCurriculumProgress.upsert({
      where: {
        tenantId_teacherId_curriculumId: {
          tenantId,
          teacherId,
          curriculumId,
        },
      },
      update: {},
      create: {
        tenantId,
        teacherId,
        curriculumId,
        completedUnits: [],
        completedLessons: [],
        pacingOffset: 0,
      },
    });
  }

  /**
   * Update teacher's current position
   */
  async updateTeacherPosition(tenantId: string, teacherId: string, curriculumId: string, unitId?: string, lessonId?: string) {
    return this.prisma.teacherCurriculumProgress.update({
      where: {
        tenantId_teacherId_curriculumId: {
          tenantId,
          teacherId,
          curriculumId,
        },
      },
      data: {
        currentUnitId: unitId,
        currentLessonId: lessonId,
        lastUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Mark a lesson as completed
   */
  async markLessonCompleted(tenantId: string, teacherId: string, curriculumId: string, lessonId: string) {
    const progress = await this.getTeacherProgress(tenantId, teacherId, curriculumId);

    const completedLessons = [...new Set([...progress.completedLessons, lessonId])];

    // Check if this completes the unit
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        unit: {
          include: { lessons: { select: { id: true } } },
        },
      },
    });

    let completedUnits = progress.completedUnits;
    if (lesson) {
      const unitLessonIds = lesson.unit.lessons.map(l => l.id);
      const allLessonsCompleted = unitLessonIds.every(id => completedLessons.includes(id));
      if (allLessonsCompleted) {
        completedUnits = [...new Set([...completedUnits, lesson.unit.id])];
      }
    }

    return this.prisma.teacherCurriculumProgress.update({
      where: {
        tenantId_teacherId_curriculumId: {
          tenantId,
          teacherId,
          curriculumId,
        },
      },
      data: {
        completedLessons,
        completedUnits,
        lastUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Calculate pacing offset (days ahead/behind)
   */
  async calculatePacingOffset(tenantId: string, teacherId: string, curriculumId: string): Promise<number> {
    const progress = await this.getTeacherProgress(tenantId, teacherId, curriculumId);

    // Get default pacing guide
    const pacingGuide = await this.prisma.pacingGuide.findFirst({
      where: { curriculumId, isDefault: true },
    });

    if (!pacingGuide) return 0;

    const entries = pacingGuide.entries as PacingEntry[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find where we should be according to pacing
    let expectedUnitId: string | null = null;
    for (const entry of entries) {
      const entryStart = new Date(entry.startDate);
      const entryEnd = new Date(entry.endDate);
      if (today >= entryStart && today <= entryEnd) {
        expectedUnitId = entry.unitId;
        break;
      }
    }

    // Calculate offset based on current vs expected position
    // This is a simplified calculation
    const currentUnitIndex = progress.currentUnitId
      ? await this.getUnitIndex(progress.currentUnitId)
      : -1;
    const expectedUnitIndex = expectedUnitId
      ? await this.getUnitIndex(expectedUnitId)
      : 0;

    // Positive = ahead, negative = behind
    return currentUnitIndex - expectedUnitIndex;
  }

  private async getUnitIndex(unitId: string): Promise<number> {
    const unit = await this.prisma.curriculumUnit.findUnique({
      where: { id: unitId },
    });
    return unit?.orderIndex ?? 0;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RESOURCES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Add resource to a unit
   */
  async addResource(unitId: string, resource: {
    title: string;
    resourceType: string;
    url?: string;
    assetId?: string;
    description?: string;
    isRequired?: boolean;
  }) {
    const maxOrder = await this.prisma.unitResource.aggregate({
      where: { unitId },
      _max: { orderIndex: true },
    });

    return this.prisma.unitResource.create({
      data: {
        unitId,
        title: resource.title,
        resourceType: resource.resourceType,
        url: resource.url,
        assetId: resource.assetId,
        description: resource.description,
        isRequired: resource.isRequired ?? false,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
    });
  }

  /**
   * Get resources for a unit
   */
  async getResources(unitId: string) {
    return this.prisma.unitResource.findMany({
      where: { unitId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  /**
   * Remove a resource
   */
  async removeResource(resourceId: string) {
    return this.prisma.unitResource.delete({
      where: { id: resourceId },
    });
  }
}
