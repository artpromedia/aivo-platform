/**
 * Professional Development Service - Core business logic
 * Provides comprehensive PD program management, enrollment tracking,
 * compliance monitoring, and certification management.
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ProgramType = 'COURSE' | 'WORKSHOP' | 'CERTIFICATION' | 'SELF_PACED' | 'CONFERENCE' | 'COACHING' | 'COMMUNITY';
export type PDCategory = 'INSTRUCTION' | 'TECHNOLOGY' | 'SEL' | 'SPECIAL_ED' | 'CONTENT_AREA' | 'LEADERSHIP' | 'EQUITY' | 'SAFETY' | 'NEURODIVERSE' | 'ASSESSMENT';
export type EnrollmentStatus = 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'WITHDRAWN' | 'EXPIRED';
export type RequirementStatus = 'PENDING' | 'IN_PROGRESS' | 'SATISFIED' | 'OVERDUE' | 'WAIVED';

export interface CreateProgramRequest {
  title: string;
  description: string;
  type: ProgramType;
  category: PDCategory;
  creditHours: number;
  durationDays?: number;
  provider?: string;
  externalUrl?: string;
  cost?: number;
  hasCertificate?: boolean;
  modules?: ProgramModule[];
  prerequisites?: string[];
  tags?: string[];
}

export interface ProgramModule {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  order: number;
  contentUrl?: string;
}

export interface CreateEnrollmentRequest {
  teacherId: string;
  programId: string;
  expiresAt?: Date;
}

export interface CreateRequirementRequest {
  title: string;
  description?: string;
  category: PDCategory;
  hoursRequired: number;
  deadline: Date;
  isRecurring?: boolean;
  recurrenceMonths?: number;
  applicableRoles?: string[];
  applicableSchools?: string[];
  programIds?: string[];
}

export interface LogActivityRequest {
  teacherId: string;
  enrollmentId?: string;
  activityType: string;
  description: string;
  hours: number;
  activityDate: Date;
  evidenceUrl?: string;
}

export interface CreateCertificationRequest {
  teacherId: string;
  name: string;
  issuingOrg: string;
  issuedAt: Date;
  expiresAt?: Date;
  credentialId?: string;
  verificationUrl?: string;
  certificateUrl?: string;
  category?: PDCategory;
  creditHours?: number;
}

export interface ComplianceReport {
  teacherId: string;
  teacherName?: string;
  requirements: RequirementProgress[];
  overallStatus: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
  totalHoursRequired: number;
  totalHoursCompleted: number;
  upcomingDeadlines: DeadlineInfo[];
}

export interface RequirementProgress {
  requirementId: string;
  title: string;
  category: PDCategory;
  hoursRequired: number;
  hoursCompleted: number;
  status: RequirementStatus;
  deadline: Date;
  percentComplete: number;
}

export interface DeadlineInfo {
  requirementId: string;
  title: string;
  deadline: Date;
  daysRemaining: number;
  hoursRemaining: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL DEVELOPMENT SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class ProfessionalDevService {
  constructor(private prisma: PrismaClient) {}

  // ════════════════════════════════════════════════════════════════════════════
  // PROGRAMS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new PD program
   */
  async createProgram(tenantId: string, request: CreateProgramRequest) {
    return this.prisma.pDProgram.create({
      data: {
        tenantId,
        title: request.title,
        description: request.description,
        type: request.type,
        category: request.category,
        creditHours: request.creditHours,
        durationDays: request.durationDays,
        provider: request.provider,
        externalUrl: request.externalUrl,
        cost: request.cost ?? 0,
        hasCertificate: request.hasCertificate ?? false,
        modules: (request.modules as any) ?? [],
        prerequisites: request.prerequisites ?? [],
        tags: request.tags ?? [],
        isActive: true,
      },
    });
  }

  /**
   * Get all programs for a tenant
   */
  async getPrograms(tenantId: string, options?: { category?: PDCategory; type?: ProgramType; isActive?: boolean }) {
    return this.prisma.pDProgram.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }], // Include global programs
        ...(options?.category && { category: options.category }),
        ...(options?.type && { type: options.type }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { title: 'asc' },
    });
  }

  /**
   * Get a single program with details
   */
  async getProgram(programId: string) {
    return this.prisma.pDProgram.findUnique({
      where: { id: programId },
      include: {
        enrollments: {
          take: 10,
          orderBy: { enrolledAt: 'desc' },
        },
        requirements: {
          include: {
            requirement: true,
          },
        },
      },
    });
  }

  /**
   * Update a program
   */
  async updateProgram(programId: string, updates: Partial<CreateProgramRequest>) {
    return this.prisma.pDProgram.update({
      where: { id: programId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.description && { description: updates.description }),
        ...(updates.type && { type: updates.type }),
        ...(updates.category && { category: updates.category }),
        ...(updates.creditHours !== undefined && { creditHours: updates.creditHours }),
        ...(updates.durationDays !== undefined && { durationDays: updates.durationDays }),
        ...(updates.provider !== undefined && { provider: updates.provider }),
        ...(updates.externalUrl !== undefined && { externalUrl: updates.externalUrl }),
        ...(updates.cost !== undefined && { cost: updates.cost }),
        ...(updates.hasCertificate !== undefined && { hasCertificate: updates.hasCertificate }),
        ...(updates.modules && { modules: updates.modules as any }),
        ...(updates.prerequisites && { prerequisites: updates.prerequisites }),
        ...(updates.tags && { tags: updates.tags }),
      },
    });
  }

  /**
   * Deactivate a program
   */
  async deactivateProgram(programId: string) {
    return this.prisma.pDProgram.update({
      where: { id: programId },
      data: { isActive: false },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ENROLLMENTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Enroll a teacher in a program
   */
  async enrollTeacher(tenantId: string, request: CreateEnrollmentRequest) {
    // Check if already enrolled
    const existing = await this.prisma.pDEnrollment.findFirst({
      where: {
        tenantId,
        teacherId: request.teacherId,
        programId: request.programId,
        status: { in: ['ENROLLED', 'IN_PROGRESS'] },
      },
    });

    if (existing) {
      throw new Error('Teacher is already enrolled in this program');
    }

    return this.prisma.pDEnrollment.create({
      data: {
        tenantId,
        teacherId: request.teacherId,
        programId: request.programId,
        status: 'ENROLLED',
        expiresAt: request.expiresAt,
        hoursCompleted: 0,
        moduleProgress: {},
      },
      include: {
        program: true,
      },
    });
  }

  /**
   * Get enrollments for a teacher
   */
  async getTeacherEnrollments(tenantId: string, teacherId: string, options?: { status?: EnrollmentStatus }) {
    return this.prisma.pDEnrollment.findMany({
      where: {
        tenantId,
        teacherId,
        ...(options?.status && { status: options.status }),
      },
      include: {
        program: true,
        activities: {
          orderBy: { activityDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  /**
   * Start a program (mark as in progress)
   */
  async startProgram(enrollmentId: string) {
    return this.prisma.pDEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  /**
   * Update module progress
   */
  async updateModuleProgress(enrollmentId: string, moduleId: string, progress: number) {
    const enrollment = await this.prisma.pDEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { program: true },
    });

    if (!enrollment) throw new Error('Enrollment not found');

    const moduleProgress = (enrollment.moduleProgress as Record<string, number>) || {};
    moduleProgress[moduleId] = progress;

    // Calculate hours completed based on module completion
    const modules = (enrollment.program.modules as ProgramModule[]) || [];
    let hoursCompleted = 0;
    for (const mod of modules) {
      const modProgress = moduleProgress[mod.id] || 0;
      hoursCompleted += (modProgress / 100) * (mod.durationMinutes / 60);
    }

    return this.prisma.pDEnrollment.update({
      where: { id: enrollmentId },
      data: {
        moduleProgress,
        hoursCompleted,
        status: hoursCompleted >= enrollment.program.creditHours ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: hoursCompleted >= enrollment.program.creditHours ? new Date() : null,
      },
    });
  }

  /**
   * Complete a program enrollment
   */
  async completeEnrollment(enrollmentId: string, certificateUrl?: string) {
    const enrollment = await this.prisma.pDEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { program: true },
    });

    if (!enrollment) throw new Error('Enrollment not found');

    const updated = await this.prisma.pDEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        hoursCompleted: enrollment.program.creditHours,
        certificateUrl,
      },
    });

    // Update requirement progress
    await this.updateRequirementProgressForEnrollment(enrollment.tenantId, enrollment.teacherId, enrollment.programId);

    return updated;
  }

  /**
   * Withdraw from a program
   */
  async withdrawEnrollment(enrollmentId: string, notes?: string) {
    return this.prisma.pDEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'WITHDRAWN',
        notes,
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REQUIREMENTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create a PD requirement
   */
  async createRequirement(tenantId: string, request: CreateRequirementRequest) {
    const requirement = await this.prisma.pDRequirement.create({
      data: {
        tenantId,
        title: request.title,
        description: request.description,
        category: request.category,
        hoursRequired: request.hoursRequired,
        deadline: request.deadline,
        isRecurring: request.isRecurring ?? false,
        recurrenceMonths: request.recurrenceMonths,
        applicableRoles: request.applicableRoles ?? [],
        applicableSchools: request.applicableSchools ?? [],
        isActive: true,
      },
    });

    // Link programs that satisfy this requirement
    if (request.programIds && request.programIds.length > 0) {
      await this.prisma.pDRequirementProgram.createMany({
        data: request.programIds.map((programId) => ({
          requirementId: requirement.id,
          programId,
        })),
      });
    }

    return requirement;
  }

  /**
   * Get all requirements for a tenant
   */
  async getRequirements(tenantId: string, options?: { category?: PDCategory; isActive?: boolean }) {
    return this.prisma.pDRequirement.findMany({
      where: {
        tenantId,
        ...(options?.category && { category: options.category }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      include: {
        programs: {
          include: {
            program: true,
          },
        },
        _count: {
          select: { teacherProgress: true },
        },
      },
      orderBy: { deadline: 'asc' },
    });
  }

  /**
   * Get teacher's progress on requirements
   */
  async getTeacherRequirementProgress(tenantId: string, teacherId: string) {
    const requirements = await this.prisma.pDRequirement.findMany({
      where: { tenantId, isActive: true },
      include: {
        teacherProgress: {
          where: { teacherId },
        },
      },
    });

    return requirements.map((req) => {
      const progress = req.teacherProgress[0];
      return {
        requirementId: req.id,
        title: req.title,
        category: req.category,
        hoursRequired: req.hoursRequired,
        hoursCompleted: progress?.hoursCompleted ?? 0,
        status: progress?.status ?? 'PENDING',
        deadline: req.deadline,
        percentComplete: Math.min(100, ((progress?.hoursCompleted ?? 0) / req.hoursRequired) * 100),
      };
    });
  }

  /**
   * Update requirement progress for a teacher after completing an enrollment
   */
  private async updateRequirementProgressForEnrollment(tenantId: string, teacherId: string, programId: string) {
    // Find requirements that this program satisfies
    const programRequirements = await this.prisma.pDRequirementProgram.findMany({
      where: { programId },
      include: {
        requirement: true,
      },
    });

    const enrollment = await this.prisma.pDEnrollment.findFirst({
      where: { tenantId, teacherId, programId, status: 'COMPLETED' },
      include: { program: true },
    });

    if (!enrollment) return;

    for (const pr of programRequirements) {
      const req = pr.requirement;

      // Get or create progress record
      let progress = await this.prisma.teacherRequirementProgress.findFirst({
        where: { tenantId, teacherId, requirementId: req.id },
      });

      const newHours = (progress?.hoursCompleted ?? 0) + enrollment.program.creditHours;
      const isSatisfied = newHours >= req.hoursRequired;

      if (progress) {
        await this.prisma.teacherRequirementProgress.update({
          where: { id: progress.id },
          data: {
            hoursCompleted: newHours,
            status: isSatisfied ? 'SATISFIED' : 'IN_PROGRESS',
            satisfiedAt: isSatisfied ? new Date() : null,
          },
        });
      } else {
        await this.prisma.teacherRequirementProgress.create({
          data: {
            tenantId,
            teacherId,
            requirementId: req.id,
            hoursCompleted: newHours,
            status: isSatisfied ? 'SATISFIED' : 'IN_PROGRESS',
            satisfiedAt: isSatisfied ? new Date() : null,
          },
        });
      }
    }
  }

  /**
   * Waive a requirement for a teacher
   */
  async waiveRequirement(tenantId: string, teacherId: string, requirementId: string, waivedBy: string, reason: string) {
    return this.prisma.teacherRequirementProgress.upsert({
      where: {
        tenantId_teacherId_requirementId: {
          tenantId,
          teacherId,
          requirementId,
        },
      },
      update: {
        status: 'WAIVED',
        waiverReason: reason,
        waivedBy,
        waivedAt: new Date(),
      },
      create: {
        tenantId,
        teacherId,
        requirementId,
        status: 'WAIVED',
        hoursCompleted: 0,
        waiverReason: reason,
        waivedBy,
        waivedAt: new Date(),
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Log a PD activity
   */
  async logActivity(tenantId: string, request: LogActivityRequest) {
    const activity = await this.prisma.pDActivity.create({
      data: {
        tenantId,
        teacherId: request.teacherId,
        enrollmentId: request.enrollmentId,
        activityType: request.activityType,
        description: request.description,
        hours: request.hours,
        activityDate: request.activityDate,
        evidenceUrl: request.evidenceUrl,
        isVerified: false,
      },
    });

    // If linked to enrollment, update hours
    if (request.enrollmentId) {
      const enrollment = await this.prisma.pDEnrollment.findUnique({
        where: { id: request.enrollmentId },
      });

      if (enrollment) {
        await this.prisma.pDEnrollment.update({
          where: { id: request.enrollmentId },
          data: {
            hoursCompleted: enrollment.hoursCompleted + request.hours,
          },
        });
      }
    }

    return activity;
  }

  /**
   * Get activities for a teacher
   */
  async getTeacherActivities(tenantId: string, teacherId: string, options?: { startDate?: Date; endDate?: Date; limit?: number }) {
    return this.prisma.pDActivity.findMany({
      where: {
        tenantId,
        teacherId,
        ...(options?.startDate && {
          activityDate: {
            gte: options.startDate,
            ...(options.endDate && { lte: options.endDate }),
          },
        }),
      },
      include: {
        enrollment: {
          include: { program: true },
        },
      },
      orderBy: { activityDate: 'desc' },
      take: options?.limit ?? 50,
    });
  }

  /**
   * Verify an activity
   */
  async verifyActivity(activityId: string, verifiedBy: string) {
    return this.prisma.pDActivity.update({
      where: { id: activityId },
      data: {
        isVerified: true,
        verifiedBy,
        verifiedAt: new Date(),
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CERTIFICATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Add a certification
   */
  async addCertification(tenantId: string, request: CreateCertificationRequest) {
    return this.prisma.pDCertification.create({
      data: {
        tenantId,
        teacherId: request.teacherId,
        name: request.name,
        issuingOrg: request.issuingOrg,
        issuedAt: request.issuedAt,
        expiresAt: request.expiresAt,
        credentialId: request.credentialId,
        verificationUrl: request.verificationUrl,
        certificateUrl: request.certificateUrl,
        category: request.category,
        creditHours: request.creditHours,
        isVerified: false,
      },
    });
  }

  /**
   * Get certifications for a teacher
   */
  async getTeacherCertifications(tenantId: string, teacherId: string) {
    return this.prisma.pDCertification.findMany({
      where: { tenantId, teacherId },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /**
   * Verify a certification
   */
  async verifyCertification(certificationId: string) {
    return this.prisma.pDCertification.update({
      where: { id: certificationId },
      data: { isVerified: true },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COMPLIANCE DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get compliance report for a teacher
   */
  async getTeacherComplianceReport(tenantId: string, teacherId: string): Promise<ComplianceReport> {
    const requirements = await this.getTeacherRequirementProgress(tenantId, teacherId);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingDeadlines: DeadlineInfo[] = requirements
      .filter((r) => r.status !== 'SATISFIED' && r.status !== 'WAIVED' && new Date(r.deadline) <= thirtyDaysFromNow)
      .map((r) => ({
        requirementId: r.requirementId,
        title: r.title,
        deadline: r.deadline,
        daysRemaining: Math.ceil((new Date(r.deadline).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        hoursRemaining: Math.max(0, r.hoursRequired - r.hoursCompleted),
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const overdueCount = requirements.filter((r) => r.status === 'OVERDUE' || (r.status !== 'SATISFIED' && r.status !== 'WAIVED' && new Date(r.deadline) < now)).length;
    const atRiskCount = upcomingDeadlines.filter((d) => d.daysRemaining <= 14 && d.hoursRemaining > 0).length;

    let overallStatus: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT' = 'COMPLIANT';
    if (overdueCount > 0) overallStatus = 'NON_COMPLIANT';
    else if (atRiskCount > 0) overallStatus = 'AT_RISK';

    return {
      teacherId,
      requirements,
      overallStatus,
      totalHoursRequired: requirements.reduce((sum, r) => sum + r.hoursRequired, 0),
      totalHoursCompleted: requirements.reduce((sum, r) => sum + r.hoursCompleted, 0),
      upcomingDeadlines,
    };
  }

  /**
   * Get district-wide compliance summary
   */
  async getDistrictComplianceSummary(tenantId: string) {
    const requirements = await this.prisma.pDRequirement.findMany({
      where: { tenantId, isActive: true },
      include: {
        teacherProgress: true,
      },
    });

    // Get all teachers in the district (would need to integrate with auth service)
    // For now, get unique teachers from enrollments
    const enrollments = await this.prisma.pDEnrollment.findMany({
      where: { tenantId },
      select: { teacherId: true },
      distinct: ['teacherId'],
    });

    const totalTeachers = enrollments.length;
    const now = new Date();

    const requirementStats = requirements.map((req) => {
      const satisfied = req.teacherProgress.filter((p) => p.status === 'SATISFIED' || p.status === 'WAIVED').length;
      const inProgress = req.teacherProgress.filter((p) => p.status === 'IN_PROGRESS').length;
      const overdue = new Date(req.deadline) < now ? totalTeachers - satisfied : 0;

      return {
        requirementId: req.id,
        title: req.title,
        category: req.category,
        deadline: req.deadline,
        totalTeachers,
        satisfied,
        inProgress,
        notStarted: totalTeachers - satisfied - inProgress,
        complianceRate: totalTeachers > 0 ? (satisfied / totalTeachers) * 100 : 0,
        isOverdue: new Date(req.deadline) < now,
        overdueCount: overdue,
      };
    });

    const overallCompliance = requirementStats.length > 0
      ? requirementStats.reduce((sum, r) => sum + r.complianceRate, 0) / requirementStats.length
      : 100;

    return {
      totalTeachers,
      totalRequirements: requirements.length,
      overallComplianceRate: overallCompliance,
      requirementStats,
      atRiskTeachers: this.countAtRiskTeachers(requirements),
    };
  }

  private countAtRiskTeachers(requirements: any[]): number {
    const now = new Date();
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const atRiskTeacherIds = new Set<string>();

    for (const req of requirements) {
      if (new Date(req.deadline) <= fourteenDaysFromNow) {
        for (const progress of req.teacherProgress) {
          if (progress.status !== 'SATISFIED' && progress.status !== 'WAIVED') {
            atRiskTeacherIds.add(progress.teacherId);
          }
        }
      }
    }

    return atRiskTeacherIds.size;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Generate PD hours report
   */
  async generateHoursReport(tenantId: string, startDate: Date, endDate: Date) {
    const activities = await this.prisma.pDActivity.groupBy({
      by: ['teacherId'],
      where: {
        tenantId,
        activityDate: { gte: startDate, lte: endDate },
      },
      _sum: { hours: true },
      _count: { id: true },
    });

    const enrollments = await this.prisma.pDEnrollment.findMany({
      where: {
        tenantId,
        completedAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      include: { program: true },
    });

    const byCategory = await this.prisma.pDEnrollment.groupBy({
      by: ['programId'],
      where: {
        tenantId,
        completedAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      _count: { id: true },
    });

    return {
      period: { startDate, endDate },
      summary: {
        totalTeachersWithActivity: activities.length,
        totalHoursLogged: activities.reduce((sum, a) => sum + (a._sum.hours ?? 0), 0),
        totalActivities: activities.reduce((sum, a) => sum + a._count.id, 0),
        totalCompletedPrograms: enrollments.length,
        totalProgramHours: enrollments.reduce((sum, e) => sum + e.program.creditHours, 0),
      },
      teacherBreakdown: activities.map((a) => ({
        teacherId: a.teacherId,
        hoursLogged: a._sum.hours ?? 0,
        activityCount: a._count.id,
      })),
    };
  }

  /**
   * Generate completion report
   */
  async generateCompletionReport(tenantId: string, startDate: Date, endDate: Date) {
    const completions = await this.prisma.pDEnrollment.findMany({
      where: {
        tenantId,
        completedAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      include: {
        program: true,
      },
    });

    const byProgram = completions.reduce((acc, c) => {
      const programId = c.programId;
      if (!acc[programId]) {
        acc[programId] = {
          programId,
          programTitle: c.program.title,
          category: c.program.category,
          completions: 0,
          totalHours: 0,
        };
      }
      acc[programId].completions++;
      acc[programId].totalHours += c.program.creditHours;
      return acc;
    }, {} as Record<string, any>);

    const byCategory = completions.reduce((acc, c) => {
      const category = c.program.category;
      if (!acc[category]) {
        acc[category] = { category, completions: 0, totalHours: 0 };
      }
      acc[category].completions++;
      acc[category].totalHours += c.program.creditHours;
      return acc;
    }, {} as Record<string, any>);

    return {
      period: { startDate, endDate },
      summary: {
        totalCompletions: completions.length,
        totalHours: completions.reduce((sum, c) => sum + c.program.creditHours, 0),
        uniqueTeachers: new Set(completions.map((c) => c.teacherId)).size,
        uniquePrograms: new Set(completions.map((c) => c.programId)).size,
      },
      byProgram: Object.values(byProgram).sort((a: any, b: any) => b.completions - a.completions),
      byCategory: Object.values(byCategory).sort((a: any, b: any) => b.completions - a.completions),
    };
  }
}
