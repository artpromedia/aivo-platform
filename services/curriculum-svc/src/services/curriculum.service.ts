/**
 * Curriculum Service - Core business logic
 * Provides curriculum management, unit/lesson organization,
 * standards alignment, and pacing guide functionality.
 */

import type { PrismaClient, CurriculumStandard, GradeBand, SubjectArea, UnitStatus } from '../prisma.js';

// Re-export enums for consumers of this service
export type { CurriculumStandard, GradeBand, SubjectArea, UnitStatus } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

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
    standard?: CurriculumStandard;
    standards?: CurriculumStandard[];
  }) {
    // Build standard filter: prefer explicit array, then single value
    const standardFilter = options?.standards?.length
      ? { standard: { in: options.standards } }
      : options?.standard
        ? { standard: options.standard }
        : {};

    return this.prisma.curriculum.findMany({
      where: {
        tenantId,
        ...(options?.subject && { subject: options.subject }),
        ...(options?.gradeBand && { gradeBand: options.gradeBand }),
        ...(options?.academicYear && { academicYear: options.academicYear }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
        ...standardFilter,
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
        differentiation: request.differentiation,
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
        ...(updates.differentiation !== undefined && { differentiation: updates.differentiation }),
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

    const entries = pacingGuide.entries as unknown as PacingEntry[];
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

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTE HANDLER METHODS
  // These methods provide the API interface, wrapping core service methods
  // ════════════════════════════════════════════════════════════════════════════

  // --- Curricula Methods ---

  async listCurricula(tenantId: string, filters?: {
    subjectArea?: string;
    gradeLevel?: string;
    status?: string;
    standard?: string;
    standards?: string[];
  }) {
    // Map route-level filter names to getCurricula option names
    return this.getCurricula(tenantId, {
      ...(filters?.subjectArea && { subject: filters.subjectArea as SubjectArea }),
      ...(filters?.gradeLevel && { gradeBand: filters.gradeLevel as GradeBand }),
      ...(filters?.status === 'active' ? { isActive: true } : filters?.status === 'archived' ? { isActive: false } : {}),
      ...(filters?.standard && { standard: filters.standard as CurriculumStandard }),
      ...(filters?.standards?.length && { standards: filters.standards as CurriculumStandard[] }),
    });
  }

  async getCurriculumById(id: string, _tenantId: string) {
    return this.getCurriculum(id);
  }

  async deleteCurriculum(id: string, _tenantId: string) {
    return this.prisma.curriculum.delete({ where: { id } });
  }

  async publishCurriculum(id: string, _tenantId: string) {
    return this.prisma.curriculum.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async cloneCurriculum(id: string, _tenantId: string, _createdBy: string, newName: string) {
    const source = await this.getCurriculum(id);
    if (!source) throw new Error('Curriculum not found');
    return this.duplicateCurriculum(id, newName);
  }

  // --- Lessons Methods ---

  async listLessons(unitId: string, _tenantId: string) {
    return this.prisma.lesson.findMany({
      where: { unitId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async getLessonById(id: string, _tenantId: string) {
    return this.getLesson(id);
  }

  async addResourceToLesson(lessonId: string, _tenantId: string, resourceId: string, resourceType: string) {
    return this.linkContent(lessonId, resourceId, resourceType);
  }

  async removeResourceFromLesson(lessonId: string, _tenantId: string, resourceId: string) {
    return this.prisma.lessonContentLink.deleteMany({
      where: { lessonId, contentId: resourceId },
    });
  }

  // --- Standards Methods ---

  async getStandardsAlignment(curriculumId: string, _tenantId: string, _framework?: string) {
    return this.getStandards({ curriculumId });
  }

  async getUnitStandardsAlignment(unitId: string, _tenantId: string) {
    return this.getStandards({ unitId });
  }

  async getLessonStandardsAlignment(lessonId: string, _tenantId: string) {
    return this.getStandards({ lessonId });
  }

  async alignStandardToCurriculum(curriculumId: string, _tenantId: string, data: any) {
    return this.addStandardAlignment({
      standardCode: data.standardCode,
      description: data.standardDescription || data.description,
      category: data.framework,
      alignmentType: data.alignmentLevel === 'secondary' ? 'SUPPORTING' : 'PRIMARY',
      curriculumId,
    });
  }

  async bulkAlignStandards(curriculumId: string, _tenantId: string, standards: any[]) {
    const results = [];
    for (const std of standards) {
      const result = await this.alignStandardToCurriculum(curriculumId, _tenantId, std);
      results.push(result);
    }
    return results;
  }

  async alignStandardToUnit(unitId: string, _tenantId: string, data: any) {
    return this.addStandardAlignment({
      standardCode: data.standardCode,
      description: data.standardDescription || data.description,
      category: data.framework,
      alignmentType: data.alignmentLevel === 'secondary' ? 'SUPPORTING' : 'PRIMARY',
      unitId,
    });
  }

  async alignStandardToLesson(lessonId: string, _tenantId: string, data: any) {
    return this.addStandardAlignment({
      standardCode: data.standardCode,
      description: data.standardDescription || data.description,
      category: data.framework,
      alignmentType: data.alignmentLevel === 'secondary' ? 'SUPPORTING' : 'PRIMARY',
      lessonId,
    });
  }

  async getStandardsCoverageReport(curriculumId: string, _tenantId: string, _framework?: string) {
    const standards = await this.getStandards({ curriculumId });
    return {
      curriculumId,
      totalStandards: standards.length,
      coveredStandards: standards.length,
      coveragePercentage: 100,
      standards,
    };
  }

  // --- Pacing Methods ---

  async listPacingGuides(curriculumId: string, _tenantId: string, _schoolYear?: string) {
    return this.getPacingGuides(curriculumId);
  }

  async getPacingGuideById(id: string, _tenantId: string) {
    return this.prisma.pacingGuide.findUnique({ where: { id } });
  }

  async deletePacingGuide(id: string, _tenantId: string) {
    return this.prisma.pacingGuide.delete({ where: { id } });
  }

  async adjustUnitPacing(pacingGuideId: string, _tenantId: string, data: { unitId: string; newStartWeek: number; newEndWeek: number; reason?: string }) {
    const guide = await this.prisma.pacingGuide.findUnique({ where: { id: pacingGuideId } });
    if (!guide) throw new Error('Pacing guide not found');

    const entries = (guide.entries as any[]) || [];
    const updatedEntries = entries.map((entry: any) => {
      if (entry.unitId === data.unitId) {
        return { ...entry, startWeek: data.newStartWeek, endWeek: data.newEndWeek };
      }
      return entry;
    });

    return this.prisma.pacingGuide.update({
      where: { id: pacingGuideId },
      data: { entries: updatedEntries },
    });
  }

  async getCurrentWeekContent(pacingGuideId: string, _tenantId: string, _targetDate: Date) {
    const guide = await this.prisma.pacingGuide.findUnique({ where: { id: pacingGuideId } });
    return { pacingGuide: guide, currentUnit: null, currentLesson: null };
  }

  async getPacingStatus(pacingGuideId: string, _tenantId: string, _teacherId?: string) {
    const guide = await this.prisma.pacingGuide.findUnique({ where: { id: pacingGuideId } });
    return { pacingGuide: guide, status: 'on_track', daysAhead: 0 };
  }

  async clonePacingGuide(id: string, tenantId: string, _createdBy: string, options: { schoolYear: string; startDate: Date; endDate: Date }) {
    const source = await this.prisma.pacingGuide.findUnique({ where: { id } });
    if (!source) throw new Error('Pacing guide not found');

    return this.prisma.pacingGuide.create({
      data: {
        tenantId,
        curriculumId: source.curriculumId,
        name: `${source.name} - ${options.schoolYear}`,
        description: source.description,
        startDate: options.startDate,
        endDate: options.endDate,
        entries: source.entries as any,
        isDefault: false,
      },
    });
  }

  async generateSuggestedPacing(curriculumId: string, tenantId: string, _createdBy: string, options: { schoolYear: string; startDate: Date; endDate: Date; instructionalDaysPerWeek: number }) {
    const entries = await this.generatePacingEntries(curriculumId, options.startDate, options.endDate);

    return this.prisma.pacingGuide.create({
      data: {
        tenantId,
        curriculumId,
        name: `Suggested Pacing - ${options.schoolYear}`,
        startDate: options.startDate,
        endDate: options.endDate,
        entries: entries as any,
        isDefault: false,
      },
    });
  }

  // --- Progress Methods ---

  async getCurriculumProgressSummary(curriculumId: string, tenantId: string, _schoolId?: string) {
    const progress = await this.prisma.teacherCurriculumProgress.findMany({
      where: { curriculumId, tenantId },
    });
    return {
      curriculumId,
      totalTeachers: progress.length,
      averageCompletion: 0,
      progressByTeacher: progress,
    };
  }

  async updateTeacherProgress(teacherId: string, tenantId: string, data: { lessonId: string; status: string; classId?: string }) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: data.lessonId },
      include: { unit: { include: { curriculum: true } } },
    });
    if (!lesson) throw new Error('Lesson not found');

    if (data.status === 'completed') {
      return this.markLessonCompleted(tenantId, teacherId, lesson.unit.curriculumId, data.lessonId);
    }
    return this.getTeacherProgress(tenantId, teacherId, lesson.unit.curriculumId);
  }

  async bulkUpdateProgress(teacherId: string, tenantId: string, _classId: string | undefined, updates: any[]) {
    const results = [];
    for (const update of updates) {
      const result = await this.updateTeacherProgress(teacherId, tenantId, update);
      results.push(result);
    }
    return results;
  }

  async markLessonSkipped(_teacherId: string, lessonId: string, _tenantId: string, _options: { classId?: string; reason: string }) {
    // For now, just return the lesson - skipping could be tracked separately
    return this.getLesson(lessonId);
  }

  async getProgressAnalytics(teacherId: string, tenantId: string, _options: { curriculumId?: string; startDate?: Date; endDate?: Date }) {
    const progress = await this.prisma.teacherCurriculumProgress.findMany({
      where: { teacherId, tenantId },
    });
    return {
      teacherId,
      totalCurricula: progress.length,
      completedLessons: progress.reduce((sum, p) => sum + p.completedLessons.length, 0),
      completedUnits: progress.reduce((sum, p) => sum + p.completedUnits.length, 0),
    };
  }

  async getPacingComparison(teacherId: string, pacingGuideId: string, tenantId: string, _classId?: string) {
    const guide = await this.prisma.pacingGuide.findUnique({ where: { id: pacingGuideId } });
    if (!guide) throw new Error('Pacing guide not found');

    const progress = await this.getTeacherProgress(tenantId, teacherId, guide.curriculumId);
    const offset = await this.calculatePacingOffset(tenantId, teacherId, guide.curriculumId);

    return {
      pacingGuide: guide,
      teacherProgress: progress,
      status: offset > 0 ? 'ahead' : offset < 0 ? 'behind' : 'on_track',
      daysOffset: offset,
    };
  }

  async getReteachingRecommendations(teacherId: string, curriculumId: string, tenantId: string, _classId?: string) {
    const progress = await this.getTeacherProgress(tenantId, teacherId, curriculumId);
    return {
      teacherId,
      curriculumId,
      recommendations: [],
      completedLessons: progress.completedLessons.length,
    };
  }
}
